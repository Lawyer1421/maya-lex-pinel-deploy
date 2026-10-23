/**
 * lib/ai-gateway/canary/cost-latency-sim.ts
 * G5-G: simulación OFFLINE de costo y latencia del modo sombra. Determinista (semilla fija) salvo las latencias
 * MEDIDAS de las etapas locales. No cambia el presupuesto real, no abre red y no usa ninguna tarifa propia: el costo
 * sale de `estimarCostoUsd`, que lee las tarifas de shadow-model-config.ts (las mismas que el presupuesto).
 *
 * SUPUESTOS (no son mediciones): tamaño de la evidencia, tokens de salida y latencia del adaptador/recuperación.
 * Están en `SUPUESTOS_SIMULACION` y deben reemplazarse por datos reales del canary. Las latencias de privacidad,
 * evidencia, procedencia y validación SÍ se miden ejecutando el código real.
 */
import { clasificarFragmento } from '../shadow/evidence-classification';
import { validarSalida } from '../shadow/citation-validator';
import { estimarCostoUsd } from '../shadow/pricing';
import { privacyGate } from '../shadow/privacy-gate';
import { evaluarProcedenciaFuerte, proponerEntradaManifiesto } from '../shadow/public-provenance';
import { SHADOW_MODEL_CONFIG } from '../shadow/shadow-model-config';
import type { FragmentoRAG } from '../../legal-retrieval/types';
import type { ShadowGatewayInput } from '../shadow/types';

export const SUPUESTOS_SIMULACION = Object.freeze({
  semilla: 20261023,
  fragmentosPorConsulta: { min: 1, max: 5 },
  caracteresPorFragmento: { mediana: 900, maximo: 4000 },
  caracteresPregunta: { min: 60, max: 200 },
  caracteresInstrucciones: 1500,
  /** Caracteres por token para el caso ESPERADO (español ≈ 3.5–4). El peor caso usa charsPerTokenEstimate de la configuración. */
  caracteresPorTokenEsperado: 3.8,
  tokensSalida: { mediana: 150 },
  fraccionEntradaEnCache: 0,
  latenciaAdaptadorMs: { mediana: 1400, p95: 4000 },
  latenciaRecuperacionMs: { mediana: 250, p95: 700 },
  timeoutMs: 5000,
});
const S = SUPUESTOS_SIMULACION;

// ── Utilidades ───────────────────────────────────────────────────────────────
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const normal = (rnd: () => number) => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
/** Lognormal con mediana y p95 dados. */
const lognormal = (rnd: () => number, mediana: number, p95: number) => mediana * Math.exp((Math.log(p95 / mediana) / 1.645) * normal(rnd));
export function percentil(valores: readonly number[], p: number): number {
  if (valores.length === 0) return 0;
  const o = [...valores].sort((a, b) => a - b);
  return o[Math.min(o.length - 1, Math.max(0, Math.ceil((p / 100) * o.length) - 1))];
}
const resumen = (v: readonly number[]) => ({ media: v.reduce((a, b) => a + b, 0) / (v.length || 1), p50: percentil(v, 50), p95: percentil(v, 95), p99: percentil(v, 99), max: Math.max(0, ...v) });
export type Resumen = ReturnType<typeof resumen>;

// ── Costo ────────────────────────────────────────────────────────────────────
export interface MuestraConsulta { entradaTokens: number; salidaTokens: number; costoUsd: number }

export function simularConsulta(rnd: () => number): MuestraConsulta {
  const n = S.fragmentosPorConsulta.min + Math.floor(rnd() * (S.fragmentosPorConsulta.max - S.fragmentosPorConsulta.min + 1));
  let chars = S.caracteresInstrucciones + S.caracteresPregunta.min + rnd() * (S.caracteresPregunta.max - S.caracteresPregunta.min);
  for (let i = 0; i < n; i++) chars += Math.min(S.caracteresPorFragmento.maximo, lognormal(rnd, S.caracteresPorFragmento.mediana, S.caracteresPorFragmento.mediana * 2.2) + 200);
  const entradaTokens = Math.ceil(chars / S.caracteresPorTokenEsperado);
  const salidaTokens = Math.min(SHADOW_MODEL_CONFIG.maxOutputTokens, Math.max(20, Math.round(lognormal(rnd, S.tokensSalida.mediana, S.tokensSalida.mediana * 2.5))));
  const cached = Math.floor(entradaTokens * S.fraccionEntradaEnCache);
  return { entradaTokens, salidaTokens, costoUsd: estimarCostoUsd(entradaTokens, salidaTokens, 'standard', cached) };
}

/** Peor caso por consulta: máxima evidencia y máxima salida, con la estimación conservadora de tokens de la configuración. */
export function costoPeorCasoUsd(): number {
  const chars = S.caracteresInstrucciones + S.caracteresPregunta.max + S.fragmentosPorConsulta.max * (S.caracteresPorFragmento.maximo + 200);
  return estimarCostoUsd(Math.ceil(chars / SHADOW_MODEL_CONFIG.charsPerTokenEstimate), SHADOW_MODEL_CONFIG.maxOutputTokens);
}

export interface ProyeccionCosto { consultas: number; esperadoUsd: number; simuladoUsd: number; peorCasoUsd: number }

export function simularCosto() {
  const rnd = mulberry32(S.semilla);
  const muestras = Array.from({ length: 10_000 }, () => simularConsulta(rnd));
  const costos = muestras.map((m) => m.costoUsd);
  const porConsulta = resumen(costos);
  const peor = costoPeorCasoUsd();
  const proyecciones: ProyeccionCosto[] = [100, 1000, 10_000].map((n) => {
    const r = mulberry32(S.semilla + n);
    let total = 0;
    for (let i = 0; i < n; i++) total += simularConsulta(r).costoUsd;
    return { consultas: n, esperadoUsd: porConsulta.media * n, simuladoUsd: total, peorCasoUsd: peor * n };
  });
  return { porConsulta, peorCasoPorConsultaUsd: peor, proyecciones };
}

// ── Latencia ─────────────────────────────────────────────────────────────────
export type EtapaLatencia = 'retrieval' | 'evidence' | 'privacy' | 'provenance' | 'adapter' | 'validation';

const FRAG: FragmentoRAG = {
  id: 'sintetico:cpp_a173', contenido: 'ARTICULO 173.- ' + 'Texto de prueba. '.repeat(60), num_articulo: '173', fuente: 'Codigo Procesal Penal',
  relevancia: 0.9, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, hash: 'abcd1234',
};

function medirMs(f: () => void, iteraciones: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < iteraciones; i++) { const t = performance.now(); f(); out.push(performance.now() - t); }
  return out;
}

export function simularLatencia(iteraciones = 300) {
  const pregunta = '¿Qué dice el artículo 173 del Código Procesal Penal sobre la prescripción de la acción penal?';
  const manifiesto = [proponerEntradaManifiesto(FRAG, { url: 'https://example.invalid/g.pdf', gaceta: '00,000', pdfSha256: '0'.repeat(64) }, { estadoVerificacion: 'V4', aprobadoPor: 'Persona de Prueba', aprobadoEn: '2026-10-23' })];
  const input: ShadowGatewayInput = {
    queryId: 'sim', sanitizedQuestion: pregunta, productionOutcome: { decision: 'ANSWER', retrievalState: 'EXACT_SUCCESS' },
    evidence: [{ chunk_id: FRAG.id!, instrumento: FRAG.fuente, articulo: '173', gaceta: null, rol: null, citable: true, texto: FRAG.contenido }],
  };
  const cruda = { rawOutput: { decision: 'ANSWER', claims: [{ claim_id: 'c1', text: 't', citations: [{ chunk_id: FRAG.id, support: 'DIRECT' }] }], abstention_reason: null }, usage: { inputTokens: 900, outputTokens: 100 }, latencyMs: 0 };
  const medidas = {
    evidence: medirMs(() => clasificarFragmento(FRAG), iteraciones),
    privacy: medirMs(() => privacyGate(pregunta), iteraciones),
    provenance: medirMs(() => evaluarProcedenciaFuerte([FRAG], manifiesto), iteraciones),
    validation: medirMs(() => validarSalida(input, cruda), iteraciones),
  };
  const rnd = mulberry32(S.semilla + 7);
  const N = 10_000;
  const adapter = Array.from({ length: N }, () => lognormal(rnd, S.latenciaAdaptadorMs.mediana, S.latenciaAdaptadorMs.p95));
  const retrieval = Array.from({ length: N }, () => lognormal(rnd, S.latenciaRecuperacionMs.mediana, S.latenciaRecuperacionMs.p95));
  const local = (k: keyof typeof medidas) => medidas[k];
  const total = adapter.map((a, i) => a + local('evidence')[i % iteraciones] + local('privacy')[i % iteraciones] + local('provenance')[i % iteraciones] + local('validation')[i % iteraciones]);
  return {
    etapas: {
      retrieval: { ...resumen(retrieval), origen: 'SUPUESTO (recuperación de producción; no suma al shadow)' as const },
      evidence: { ...resumen(medidas.evidence), origen: 'MEDIDO' as const },
      privacy: { ...resumen(medidas.privacy), origen: 'MEDIDO' as const },
      provenance: { ...resumen(medidas.provenance), origen: 'MEDIDO' as const },
      adapter: { ...resumen(adapter), origen: 'SUPUESTO' as const },
      validation: { ...resumen(medidas.validation), origen: 'MEDIDO' as const },
    },
    totalShadow: resumen(total),
    fraccionTimeout: adapter.filter((a) => a > S.timeoutMs).length / N,
  };
}

export function textoCostoLatencia(c = simularCosto(), l = simularLatencia()): string {
  const usd = (n: number) => n.toFixed(6);
  const L = ['SIMULACIÓN OFFLINE DE COSTO Y LATENCIA (presupuesto real sin cambios)', '', 'Costo por consulta (USD, tarifas de shadow-model-config.ts):'];
  L.push(`  media ${usd(c.porConsulta.media)}  p50 ${usd(c.porConsulta.p50)}  p95 ${usd(c.porConsulta.p95)}  p99 ${usd(c.porConsulta.p99)}  peor caso ${usd(c.peorCasoPorConsultaUsd)}`);
  for (const p of c.proyecciones) L.push(`  ${String(p.consultas).padStart(6)} consultas: esperado ${usd(p.esperadoUsd)}  simulado ${usd(p.simuladoUsd)}  peor caso ${usd(p.peorCasoUsd)}`);
  L.push('', 'Latencia (ms):');
  for (const [k, v] of Object.entries(l.etapas)) L.push(`  ${k.padEnd(10)} p50 ${v.p50.toFixed(3)}  p95 ${v.p95.toFixed(3)}  p99 ${v.p99.toFixed(3)}  [${v.origen}]`);
  L.push(`  total shadow p50 ${l.totalShadow.p50.toFixed(1)}  p95 ${l.totalShadow.p95.toFixed(1)}  p99 ${l.totalShadow.p99.toFixed(1)}  max ${l.totalShadow.max.toFixed(1)}`);
  L.push(`  fracción que excedería el timeout de ${S.timeoutMs} ms (supuesto): ${(l.fraccionTimeout * 100).toFixed(2)} %`);
  return L.join('\n');
}
