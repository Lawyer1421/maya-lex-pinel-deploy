/**
 * lib/ai-gateway/canary/synthetic-canary.ts
 * G6-J: canary SINTÉTICO de extremo a extremo para Preview/offline. Sin API key, sin red, sin consulta real, sin tráfico de producción.
 *
 * Recorre una secuencia de solicitudes sintéticas con: muestreo por lista blanca, envolvente de privacidad (G6-D), compuertas de privacidad
 * y corpus (G3), procedencia fuerte con un manifiesto SINTÉTICO (G4), presupuesto simulado, adaptador falso con fallos inyectados, ciclo de
 * vida tipo after() (el trabajo corre después de «responder»), control de paradas (G5-C) y rollback (G6-F). Produce métricas y un informe.
 */
import type { FragmentoRAG } from '../../legal-retrieval/types';
import { crearBudgetGuard } from '../shadow/budget-guard';
import { validarSalida, type SalidaCruda } from '../shadow/citation-validator';
import { aEvidencia, peorCasoUsd } from '../shadow/dispatcher';
import { estimarCostoConservadorUsd } from '../shadow/pricing';
import { privacyGate } from '../shadow/privacy-gate';
import { evaluarCorpusPublico } from '../shadow/public-corpus-gate';
import { evaluarProcedenciaFuerte, proponerEntradaManifiesto, type EntradaProcedencia } from '../shadow/public-provenance';
import type { ShadowGatewayInput } from '../shadow/types';
import { crearControlCanary, type CanaryConfig, type EventoCanary } from './canary-config';
import { evaluarEnvolvente } from './first-canary-envelope';
import { aplicarRollback } from './rollback-rehearsal';

export type FalloInyectado = 'NINGUNO' | 'ERROR_ADAPTADOR' | 'ESQUEMA' | 'CITAS' | 'COSTO_INESPERADO';

export interface SolicitudSintetica {
  id: string;
  pregunta: string;
  falloInyectado?: FalloInyectado;
}

const TEXTO = 'Derogar el Decreto No 144-83, de fecha 23 de Agosto de 1983, contentivo del Código Penal y todas sus reformas.';
const FRAGMENTO: FragmentoRAG = {
  id: 'sintetico:cp_d130_a634', contenido: TEXTO, num_articulo: '634', fuente: 'Codigo Penal D130-2017', relevancia: 1,
  fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, hash: 'abcd1234',
};
const OFICIAL = { url: 'https://example.invalid/sintetica.pdf', gaceta: '00,000', pdfSha256: '1'.repeat(64) };
export const MANIFIESTO_SINTETICO: readonly EntradaProcedencia[] = [
  proponerEntradaManifiesto(FRAGMENTO, OFICIAL, { estadoVerificacion: 'V4', aprobadoPor: 'Persona de Prueba', aprobadoEn: '2026-10-23' }),
];

export interface ConfigSintetica extends CanaryConfig {
  /** Presupuesto SIMULADO (no el real). */
  presupuestoSimuladoUsd: number;
}

const respuestaValida = (): SalidaCruda => ({
  rawOutput: { decision: 'ANSWER', claims: [{ claim_id: 'c1', text: 'Deroga el D.144-83.', citations: [{ chunk_id: FRAGMENTO.id, support: 'DIRECT' }] }], abstention_reason: null },
  usage: { inputTokens: 700, outputTokens: 90 }, latencyMs: 900,
});

export interface RegistroSintetico {
  id: string;
  resultado: 'ENVOLVENTE_RECHAZA' | 'PRIVACIDAD_RECHAZA' | 'CORPUS_RECHAZA' | 'PROCEDENCIA_RECHAZA' | 'PRESUPUESTO_RECHAZA' | 'NO_MUESTREADA' | 'COMPLETADA' | 'ERROR' | 'DETENIDO';
  motivo: string | null;
  costoUsd: number;
  tardio: boolean;
}

export interface InformeSintetico {
  registros: RegistroSintetico[];
  solicitudesAdmitidas: number;
  detenidoPor: string | null;
  gastadoSimuladoUsd: number;
  /** El trabajo del shadow corrió DESPUÉS de «responder» (ciclo de vida de after()). */
  todasTardias: boolean;
  respuestasDeProduccion: string[];
  rollback: ReturnType<typeof aplicarRollback>['estado'];
}

/** Ejecuta el canary sintético. `responder` devuelve el texto «de producción» de cada consulta y debe ser idéntico con o sin shadow. */
export async function ejecutarCanarySintetico(config: ConfigSintetica, solicitudes: readonly SolicitudSintetica[]): Promise<InformeSintetico> {
  const control = crearControlCanary(config);
  const presupuesto = crearBudgetGuard({ presupuestoUsd: config.presupuestoSimuladoUsd, ventanaMs: 86_400_000 });
  const lista = config.sampleStrategy.tipo === 'LISTA_BLANCA' ? new Set(config.sampleStrategy.queryIds) : null;
  const registros: RegistroSintetico[] = [];
  const respuestasDeProduccion: string[] = [];
  const diferidas: Array<() => Promise<void>> = [];
  let respondidas = 0;
  let admitidas = 0;
  let detenido = false;
  let gastado = 0;

  for (const s of solicitudes) {
    // 1. «Producción» responde SIEMPRE, antes y con independencia de lo que haga el shadow.
    respuestasDeProduccion.push(`respuesta-de-produccion:${s.id}`);
    respondidas++;
    // 2. El shadow se agenda para después de la respuesta (after()).
    diferidas.push(async () => {
      const tardio = respondidas >= 1; // al ejecutarse, la respuesta ya fue entregada
      const reg = (resultado: RegistroSintetico['resultado'], motivo: string | null, costoUsd = 0): void => {
        registros.push({ id: s.id, resultado, motivo, costoUsd, tardio });
      };
      if (detenido) return reg('DETENIDO', 'canary detenido');
      if (lista && !lista.has(s.id)) return reg('NO_MUESTREADA', null);
      if (admitidas >= config.maxRequests) return reg('DETENIDO', 'MAX_REQUESTS');
      const env = evaluarEnvolvente(s.pregunta);
      if (!env.elegible) return reg('ENVOLVENTE_RECHAZA', env.motivo);
      const priv = privacyGate(s.pregunta);
      if (priv.estado !== 'PASS') return reg('PRIVACIDAD_RECHAZA', priv.razon);
      const corpus = evaluarCorpusPublico([FRAGMENTO]);
      if (corpus.estado !== 'PUBLIC_CORPUS_PASS') return reg('CORPUS_RECHAZA', corpus.razon);
      const prov = evaluarProcedenciaFuerte([FRAGMENTO], MANIFIESTO_SINTETICO);
      if (prov.estado !== 'PROVENANCE_PASS') return reg('PROCEDENCIA_RECHAZA', prov.razon);
      const input: ShadowGatewayInput = { queryId: s.id, sanitizedQuestion: s.pregunta, evidence: aEvidencia([FRAGMENTO]), productionOutcome: { decision: 'ANSWER', retrievalState: 'EXACT_SUCCESS' } };
      const reserva = peorCasoUsd(input);
      if (!presupuesto.reservar(reserva)) return reg('PRESUPUESTO_RECHAZA', 'agotado');
      admitidas++;
      let evento: EventoCanary;
      let costo = 0;
      let resultado: RegistroSintetico['resultado'] = 'COMPLETADA';
      let motivo: string | null = null;
      if (s.falloInyectado === 'ERROR_ADAPTADOR') {
        presupuesto.liquidar(reserva, Number.NaN);
        costo = reserva;
        evento = { tipo: 'ERROR_ADAPTADOR' };
        resultado = 'ERROR';
        motivo = 'ERROR_ADAPTADOR';
      } else {
        const cruda = s.falloInyectado === 'ESQUEMA' ? { rawOutput: { foo: 'bar' }, usage: { inputTokens: 700, outputTokens: 20 }, latencyMs: 800 }
          : s.falloInyectado === 'CITAS' ? { ...respuestaValida(), rawOutput: { decision: 'ANSWER', claims: [{ claim_id: 'c1', text: 't', citations: [{ chunk_id: 'inexistente', support: 'DIRECT' }] }], abstention_reason: null } }
          : s.falloInyectado === 'COSTO_INESPERADO' ? { ...respuestaValida(), usage: { inputTokens: 7000, outputTokens: 700 } }
          : respuestaValida();
        const res = validarSalida(input, cruda);
        costo = estimarCostoConservadorUsd(res.usage.inputTokens, res.usage.outputTokens);
        presupuesto.liquidar(reserva, costo);
        if (res.status === 'INVALID') { evento = { tipo: 'FALLO_ESQUEMA' }; resultado = 'ERROR'; motivo = res.invalidReason ?? 'INVALID'; }
        else evento = { tipo: 'OK', costoUsd: costo, estimadoUsd: estimarCostoConservadorUsd(700, 90) };
      }
      gastado += costo;
      const d = control.registrar(evento);
      if (d.accion === 'DETENER') { detenido = true; return reg('DETENIDO', d.razon, costo); }
      return reg(resultado, motivo, costo);
    });
  }
  // 3. Tras entregar TODAS las respuestas, corren las tareas diferidas (como lo haría after() sobre waitUntil).
  for (const tarea of diferidas) await tarea();
  return {
    registros,
    solicitudesAdmitidas: admitidas,
    detenidoPor: control.detenidoPor(),
    gastadoSimuladoUsd: gastado,
    todasTardias: registros.every((r) => r.tardio),
    respuestasDeProduccion,
    rollback: aplicarRollback(config).estado,
  };
}
