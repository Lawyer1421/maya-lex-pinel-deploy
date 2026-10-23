/**
 * lib/ai-gateway/canary/canary-config.ts
 * G5-C: configuración tipada y CENTRALIZADA de un futuro canary. Es solo un objeto de datos: nada en producción
 * la importa, no lee entorno ni secretos y no habilita tráfico. Los valores reales por defecto son «apagado».
 *
 * Para que un canary pueda correr, esta configuración NO basta: además hace falta el contrato GO/NO-GO (go-no-go.ts),
 * un cambio revisado de las constantes del shadow (kill switch y presupuesto) y la autorización expresa de Fredy.
 */
import { SHADOW_GATEWAY_ENABLED, SHADOW_TIMEOUT_MS } from '../shadow/config';
import { SHADOW_BUDGET_USD, SHADOW_MODEL_CONFIG } from '../shadow/shadow-model-config';

export type EstrategiaMuestreo =
  | { tipo: 'NINGUNA' }
  /** Las primeras N consultas elegibles (N = maxRequests). */
  | { tipo: 'PRIMERAS_N' }
  /** Solo consultas cuyo id está en la lista (p. ej. preguntas del Golden Set). */
  | { tipo: 'LISTA_BLANCA'; queryIds: readonly string[] }
  /** Un porcentaje (0–100) de las consultas elegibles, con semilla fija para reproducibilidad. */
  | { tipo: 'PORCENTAJE'; porcentaje: number; semilla: number };

export interface CanaryConfig {
  enabled: boolean;
  maxRequests: number;
  maxBudgetUsd: number;
  model: string;
  maxOutputTokens: number;
  timeoutMs: number;
  /** Ids de fragmento del manifiesto de procedencia que el canary puede usar. Vacío = ninguno. */
  allowedManifestEntries: readonly string[];
  stopOnFirstPrivacyIncident: boolean;
  stopOnFirstProvenanceMismatch: boolean;
  /** Detener si el costo real supera `unexpectedCostFactor` veces el costo estimado de la llamada. */
  stopOnUnexpectedCost: boolean;
  unexpectedCostFactor: number;
  stopOnSchemaFailure: boolean;
  /** Detener cuando los errores de adaptador (error o timeout) alcanzan este número. 0 = detener al primero. */
  stopOnAdapterErrorThreshold: number;
  sampleStrategy: EstrategiaMuestreo;
}

/** Valores reales por defecto: APAGADO, sin solicitudes y sin presupuesto. */
export const CANARY_CONFIG: Readonly<CanaryConfig> = Object.freeze({
  enabled: false,
  maxRequests: 0,
  maxBudgetUsd: 0,
  model: SHADOW_MODEL_CONFIG.modelId,
  maxOutputTokens: SHADOW_MODEL_CONFIG.maxOutputTokens,
  timeoutMs: SHADOW_TIMEOUT_MS,
  allowedManifestEntries: Object.freeze([]) as readonly string[],
  stopOnFirstPrivacyIncident: true,
  stopOnFirstProvenanceMismatch: true,
  stopOnUnexpectedCost: true,
  unexpectedCostFactor: 2,
  stopOnSchemaFailure: true,
  stopOnAdapterErrorThreshold: 1,
  sampleStrategy: Object.freeze({ tipo: 'NINGUNA' }) as EstrategiaMuestreo,
});

/** Topes duros: una configuración fuera de ellos es inválida aunque el resto sea coherente. */
export const TOPES_CANARY = Object.freeze({ maxRequests: 50, maxBudgetUsd: 1, timeoutMs: 15_000 });

/** Problemas de coherencia/seguridad de una configuración (vacío = coherente). No lanza. */
export function validarCanaryConfig(c: CanaryConfig): string[] {
  const p: string[] = [];
  const entero = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 0;
  if (!entero(c.maxRequests) || c.maxRequests > TOPES_CANARY.maxRequests) p.push('maxRequests');
  if (typeof c.maxBudgetUsd !== 'number' || !(c.maxBudgetUsd >= 0) || c.maxBudgetUsd > TOPES_CANARY.maxBudgetUsd) p.push('maxBudgetUsd');
  if (c.model !== SHADOW_MODEL_CONFIG.modelId) p.push('model');
  if (!entero(c.maxOutputTokens) || c.maxOutputTokens === 0 || c.maxOutputTokens > SHADOW_MODEL_CONFIG.maxOutputTokens) p.push('maxOutputTokens');
  if (!entero(c.timeoutMs) || c.timeoutMs === 0 || c.timeoutMs > TOPES_CANARY.timeoutMs) p.push('timeoutMs');
  if (!Array.isArray(c.allowedManifestEntries) || c.allowedManifestEntries.some((e) => typeof e !== 'string' || e.trim() === '')) p.push('allowedManifestEntries');
  if (!(c.unexpectedCostFactor >= 1)) p.push('unexpectedCostFactor');
  if (!entero(c.stopOnAdapterErrorThreshold)) p.push('stopOnAdapterErrorThreshold');
  const s = c.sampleStrategy;
  if (!s || !['NINGUNA', 'PRIMERAS_N', 'LISTA_BLANCA', 'PORCENTAJE'].includes(s.tipo)) p.push('sampleStrategy');
  else if (s.tipo === 'PORCENTAJE' && !(s.porcentaje > 0 && s.porcentaje <= 100)) p.push('sampleStrategy.porcentaje');
  else if (s.tipo === 'LISTA_BLANCA' && s.queryIds.length === 0) p.push('sampleStrategy.queryIds');
  if (c.enabled) {
    if (c.maxRequests === 0) p.push('enabled_sin_maxRequests');
    if (c.maxBudgetUsd === 0) p.push('enabled_sin_presupuesto');
    if (c.allowedManifestEntries.length === 0) p.push('enabled_sin_entradas_de_manifiesto');
    if (s?.tipo === 'NINGUNA') p.push('enabled_sin_muestreo');
    if (!c.stopOnFirstPrivacyIncident) p.push('stopOnFirstPrivacyIncident');
    if (!c.stopOnFirstProvenanceMismatch) p.push('stopOnFirstProvenanceMismatch');
    if (!c.stopOnUnexpectedCost) p.push('stopOnUnexpectedCost');
    if (!c.stopOnSchemaFailure) p.push('stopOnSchemaFailure');
  }
  return p;
}

/**
 * Presupuesto realmente usable: el menor entre el del canary y el del modo sombra (constante de código = 0 hoy).
 * Un canary no puede gastar más de lo que el shadow permite.
 */
export const presupuestoEfectivoUsd = (c: CanaryConfig): number => Math.min(c.maxBudgetUsd, SHADOW_BUDGET_USD);

/** ¿Esta configuración, por sí sola, permitiría tráfico? Es condición necesaria, nunca suficiente. */
export function canaryConfigPermiteTrafico(c: CanaryConfig): boolean {
  return c.enabled === true && c.maxRequests > 0 && presupuestoEfectivoUsd(c) > 0 && SHADOW_GATEWAY_ENABLED === true && validarCanaryConfig(c).length === 0;
}

// ── Control de condiciones de parada ───────────────────────────────────────────
export type EventoCanary =
  | { tipo: 'OK'; costoUsd: number; estimadoUsd: number }
  | { tipo: 'INCIDENTE_PRIVACIDAD' }
  | { tipo: 'PROCEDENCIA_NO_COINCIDE' }
  | { tipo: 'FALLO_ESQUEMA' }
  | { tipo: 'ERROR_ADAPTADOR' }
  | { tipo: 'COSTO'; costoUsd: number; estimadoUsd: number };

export type DecisionControl = { accion: 'CONTINUAR' } | { accion: 'DETENER'; razon: string };

/** Máquina de parada: una vez que detiene, NO se reanuda. Puro y en memoria. */
export function crearControlCanary(c: CanaryConfig) {
  let detenido: string | null = null;
  let errores = 0;
  let solicitudes = 0;
  const detener = (razon: string): DecisionControl => { detenido ??= razon; return { accion: 'DETENER', razon: detenido }; };
  return {
    registrar(e: EventoCanary): DecisionControl {
      if (detenido) return { accion: 'DETENER', razon: detenido };
      solicitudes++;
      if (solicitudes > c.maxRequests) return detener('MAX_REQUESTS');
      switch (e.tipo) {
        case 'INCIDENTE_PRIVACIDAD': return c.stopOnFirstPrivacyIncident ? detener('INCIDENTE_PRIVACIDAD') : { accion: 'CONTINUAR' };
        case 'PROCEDENCIA_NO_COINCIDE': return c.stopOnFirstProvenanceMismatch ? detener('PROCEDENCIA_NO_COINCIDE') : { accion: 'CONTINUAR' };
        case 'FALLO_ESQUEMA': return c.stopOnSchemaFailure ? detener('FALLO_ESQUEMA') : { accion: 'CONTINUAR' };
        case 'ERROR_ADAPTADOR':
          errores++;
          return errores >= Math.max(1, c.stopOnAdapterErrorThreshold) ? detener('ERRORES_ADAPTADOR') : { accion: 'CONTINUAR' };
        case 'COSTO':
        case 'OK':
          if (c.stopOnUnexpectedCost && e.costoUsd > e.estimadoUsd * c.unexpectedCostFactor) return detener('COSTO_INESPERADO');
          return { accion: 'CONTINUAR' };
      }
    },
    detenidoPor: () => detenido,
    solicitudes: () => solicitudes,
  };
}
