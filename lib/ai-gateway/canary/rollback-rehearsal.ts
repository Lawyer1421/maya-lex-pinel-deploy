/**
 * lib/ai-gateway/canary/rollback-rehearsal.ts
 * G6-F: lógica PURA del ensayo de rollback del canary. Ensaya, sin red ni credenciales, qué pasa cuando salta cada condición de parada
 * y demuestra que el estado al que se vuelve es siempre el mismo estado seguro:
 *   SHADOW_GATEWAY_ENABLED=false · enabled=false · maxRequests=0 · maxBudgetUsd=0 · sampleStrategy=NINGUNA.
 *
 * Límite honesto: hoy el kill switch del shadow es una CONSTANTE DE CÓDIGO (config.ts). Volver a «apagado» en un despliegue real es
 * revertir el cambio y redesplegar (Vercel permite promover el despliegue anterior). Lo que el ensayo prueba es (1) que las paradas
 * dentro del proceso son inmediatas y definitivas, (2) que la configuración de rollback es el estado seguro, y (3) que el rollback no
 * toca el código jurídico de producción (hashes en evidence-integrity.ts).
 */
import { SHADOW_GATEWAY_ENABLED } from '../shadow/config';
import { SHADOW_BUDGET_USD } from '../shadow/shadow-model-config';
import { crearCircuitBreaker } from '../shadow/circuit-breaker';
import {
  CANARY_CONFIG, canaryConfigPermiteTrafico, crearControlCanary, validarCanaryConfig, type CanaryConfig, type EventoCanary,
} from './canary-config';

/** Configuración HIPOTÉTICA de un canary encendido, solo para ensayar la parada. Nunca se exporta como configuración real. */
export const CONFIG_ENSAYO: CanaryConfig = Object.freeze({
  ...CANARY_CONFIG, enabled: true, maxRequests: 8, maxBudgetUsd: 0.04,
  allowedManifestEntries: Object.freeze(['ENSAYO']), sampleStrategy: Object.freeze({ tipo: 'PRIMERAS_N' as const }),
});

export interface EstadoSeguro {
  SHADOW_GATEWAY_ENABLED: false;
  enabled: false;
  maxRequests: 0;
  maxBudgetUsd: 0;
  sampleStrategy: 'NINGUNA';
}

/** Rollback = volver al estado seguro. Puro: ignora la configuración que tenía el canary. */
export function aplicarRollback(_anterior: CanaryConfig): { config: CanaryConfig; estado: EstadoSeguro } {
  return {
    config: { ...CANARY_CONFIG },
    estado: { SHADOW_GATEWAY_ENABLED: false, enabled: false, maxRequests: 0, maxBudgetUsd: 0, sampleStrategy: 'NINGUNA' },
  };
}

export type DisparadorRollback =
  | 'ADAPTER_FAILURE' | 'PRIVACY_INCIDENT' | 'PROVENANCE_MISMATCH' | 'SCHEMA_FAILURE' | 'UNEXPECTED_COST' | 'TIMEOUT' | 'CIRCUIT_BREAKER_OPEN' | 'MANUAL_KILL';

export const DISPARADORES: readonly DisparadorRollback[] = [
  'ADAPTER_FAILURE', 'PRIVACY_INCIDENT', 'PROVENANCE_MISMATCH', 'SCHEMA_FAILURE', 'UNEXPECTED_COST', 'TIMEOUT', 'CIRCUIT_BREAKER_OPEN', 'MANUAL_KILL',
];

export interface ResultadoEnsayo {
  disparador: DisparadorRollback;
  detenidoPor: string | null;
  solicitudesAntesDeParar: number;
  /** Tras la parada, cualquier evento posterior sigue siendo DETENER (no se reanuda). */
  noReanuda: boolean;
  estadoFinal: EstadoSeguro;
  configFinalValida: boolean;
  permiteTraficoDespues: boolean;
}

const NORMAL: EventoCanary = { tipo: 'OK', costoUsd: 0.0001, estimadoUsd: 0.0002 };

const EVENTO: Record<Exclude<DisparadorRollback, 'CIRCUIT_BREAKER_OPEN' | 'MANUAL_KILL' | 'TIMEOUT' | 'ADAPTER_FAILURE'>, EventoCanary> = {
  PRIVACY_INCIDENT: { tipo: 'INCIDENTE_PRIVACIDAD' },
  PROVENANCE_MISMATCH: { tipo: 'PROCEDENCIA_NO_COINCIDE' },
  SCHEMA_FAILURE: { tipo: 'FALLO_ESQUEMA' },
  UNEXPECTED_COST: { tipo: 'COSTO', costoUsd: 0.0021, estimadoUsd: 0.001 },
};

export function ensayar(disparador: DisparadorRollback): ResultadoEnsayo {
  const control = crearControlCanary(CONFIG_ENSAYO);
  // Tres solicitudes normales antes del incidente.
  for (let i = 0; i < 3; i++) control.registrar(NORMAL);
  let detenidoPor: string | null = null;
  const parar = (e: EventoCanary) => {
    const d = control.registrar(e);
    if (d.accion === 'DETENER') detenidoPor = d.razon;
  };
  switch (disparador) {
    case 'ADAPTER_FAILURE':
    case 'TIMEOUT':
      parar({ tipo: 'ERROR_ADAPTADOR' }); // un timeout cuenta como error de adaptador (umbral por defecto: 1)
      break;
    case 'CIRCUIT_BREAKER_OPEN': {
      // El breaker real se abre tras `umbralFallos` fallos; ahí el canary deja de despachar y se registra como parada.
      const breaker = crearCircuitBreaker({ umbralFallos: 3, ventanaMs: 60_000, enfriamientoMs: 30_000 });
      for (let i = 0; i < 3; i++) { breaker.permitir(); breaker.fallo(); }
      if (!breaker.permitir()) parar({ tipo: 'ERROR_ADAPTADOR' });
      break;
    }
    case 'MANUAL_KILL':
      // La parada manual lleva el contador al tope: ninguna solicitud posterior se admite.
      for (let i = control.solicitudes(); i <= CONFIG_ENSAYO.maxRequests; i++) parar(NORMAL);
      break;
    default:
      parar(EVENTO[disparador]);
  }
  const solicitudes = control.solicitudes();
  const noReanuda = control.registrar(NORMAL).accion === 'DETENER';
  const { config, estado } = aplicarRollback(CONFIG_ENSAYO);
  return {
    disparador,
    detenidoPor: detenidoPor ?? control.detenidoPor(),
    solicitudesAntesDeParar: solicitudes,
    noReanuda,
    estadoFinal: estado,
    configFinalValida: validarCanaryConfig(config).length === 0,
    permiteTraficoDespues: canaryConfigPermiteTrafico(config),
  };
}

/** El estado seguro coincide con los valores reales del repositorio. */
export function estadoRealEsSeguro(): boolean {
  return SHADOW_GATEWAY_ENABLED === false && SHADOW_BUDGET_USD === 0 && CANARY_CONFIG.enabled === false && CANARY_CONFIG.maxRequests === 0 && CANARY_CONFIG.maxBudgetUsd === 0 && CANARY_CONFIG.sampleStrategy.tipo === 'NINGUNA';
}
