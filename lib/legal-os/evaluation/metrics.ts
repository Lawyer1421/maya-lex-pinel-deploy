/**
 * lib/legal-os/evaluation/metrics.ts
 * Métricas sobre resultados. Cada una devuelve {value|null, n, denominator, reason?}: con n = 0 el valor es null con motivo,
 * nunca un 100 % de relleno.
 */
import type { GoldenCase, ReferenciaArticulo, RunResult } from './schema';

export interface MetricResult {
  value: number | null;
  /** Elementos que entraron al cálculo. */
  n: number;
  /** Total contra el que se mide (tasas: n; recall/precisión: elementos esperados/recuperados). */
  denominator: number;
  reason?: string;
}

const nulo = (reason: string): MetricResult => ({ value: null, n: 0, denominator: 0, reason });
const tasa = (aciertos: number, n: number): MetricResult => ({ value: n === 0 ? null : aciertos / n, n, denominator: n });

export interface Par { caso: GoldenCase; resultado: RunResult }

const clave = (r: ReferenciaArticulo): string => `${r.instrumento}::${r.articulo}`;
const citadas = (r: RunResult): Set<string> => new Set(r.citations.filter((c) => c.instrumento && c.articulo).map((c) => `${c.instrumento}::${c.articulo}`));

/** Una respuesta cumple sus citas si cita todo lo exigido y nada de lo prohibido. */
function citasCorrectas({ caso, resultado }: Par): boolean {
  if (resultado.decision !== 'ANSWER') return false;
  const c = citadas(resultado);
  const instrumentosCitados = new Set(resultado.citations.map((x) => x.instrumento).filter(Boolean));
  return caso.expected.mustCite.every((m) => c.has(clave(m))) && caso.expected.mustNotCite.every((m) => !instrumentosCitados.has(m.instrumento));
}

/** Casos de los que se espera respuesta y una expectativa de citas. */
const conExpectativaDeCitas = (p: Par): boolean => p.caso.expected.decision === 'ANSWER' && (p.caso.expected.mustCite.length > 0 || p.caso.expected.mustNotCite.length > 0);

export function citationCorrectness(pares: readonly Par[]): MetricResult {
  const a = pares.filter(conExpectativaDeCitas);
  if (!a.length) return nulo('sin casos con expectativa de citas');
  return tasa(a.filter(citasCorrectas).length, a.length);
}

export function articleAccuracy(pares: readonly Par[]): MetricResult {
  const a = pares.filter((p) => p.caso.expected.decision === 'ANSWER' && p.caso.expected.instrument && p.caso.expected.article);
  if (!a.length) return nulo('sin casos con instrumento y artículo esperados');
  const ok = a.filter((p) => citadas(p.resultado).has(`${p.caso.expected.instrument}::${p.caso.expected.article}`)).length;
  return tasa(ok, a.length);
}

export function versionAccuracy(pares: readonly Par[]): MetricResult {
  const a = pares.filter((p) => p.caso.expected.expectedVersionDate);
  if (!a.length) return nulo('sin casos con fecha de versión esperada');
  return tasa(a.filter((p) => p.resultado.versionDate === p.caso.expected.expectedVersionDate).length, a.length);
}

/** Recall: de los artículos exigidos, cuántos aparecen entre los recuperados. */
export function retrievalRecall(pares: readonly Par[]): MetricResult {
  const a = pares.filter((p) => p.caso.expected.mustCite.length > 0);
  if (!a.length) return nulo('sin casos con artículos exigidos');
  let esperados = 0;
  let hallados = 0;
  for (const { caso, resultado } of a) {
    const rec = new Set(resultado.retrieved.filter((r) => r.instrumento && r.articulo).map((r) => `${r.instrumento}::${r.articulo}`));
    for (const m of caso.expected.mustCite) {
      esperados++;
      if (rec.has(clave(m))) hallados++;
    }
  }
  return { value: hallados / esperados, n: a.length, denominator: esperados };
}

/** Precisión: de lo recuperado, qué parte es un artículo exigido (el contexto complementario la reduce a propósito). */
export function retrievalPrecision(pares: readonly Par[]): MetricResult {
  const a = pares.filter((p) => p.caso.expected.mustCite.length > 0);
  if (!a.length) return nulo('sin casos con artículos exigidos');
  let recuperados = 0;
  let relevantes = 0;
  for (const { caso, resultado } of a) {
    const exigidos = new Set(caso.expected.mustCite.map(clave));
    for (const r of resultado.retrieved) {
      recuperados++;
      if (r.instrumento && r.articulo && exigidos.has(`${r.instrumento}::${r.articulo}`)) relevantes++;
    }
  }
  if (recuperados === 0) return { value: null, n: a.length, denominator: 0, reason: 'no se recuperó nada' };
  return { value: relevantes / recuperados, n: a.length, denominator: recuperados };
}

export function abstentionAccuracy(pares: readonly Par[]): MetricResult {
  if (!pares.length) return nulo('sin casos');
  return tasa(pares.filter((p) => p.resultado.decision === p.caso.expected.decision).length, pares.length);
}

/** Tasa de afirmaciones que citan ids ausentes de la evidencia entregada. */
export function hallucinationRate(pares: readonly Par[]): MetricResult {
  let claims = 0;
  let malas = 0;
  for (const { resultado } of pares) {
    const ev = new Set(resultado.evidenceIds);
    for (const c of resultado.claims) {
      claims++;
      if (c.citedIds.some((id) => !ev.has(id))) malas++;
    }
  }
  if (!claims) return nulo('sin afirmaciones');
  return { value: malas / claims, n: claims, denominator: claims };
}

/** Corrección jurídica: SOLO casos CLO_APPROVED. Decisión correcta y, si se espera respuesta con citas, citas correctas. */
export function legalCorrectness(pares: readonly Par[]): MetricResult {
  const a = pares.filter((p) => p.caso.review_state === 'CLO_APPROVED');
  if (!a.length) return nulo('ningún caso aprobado por el CLO: la corrección jurídica no se calcula');
  const ok = a.filter((p) => p.resultado.decision === p.caso.expected.decision && (p.caso.expected.decision === 'ABSTAIN' || !conExpectativaDeCitas(p) || citasCorrectas(p))).length;
  return tasa(ok, a.length);
}

function percentil(orden: number[], p: number): number {
  const i = Math.min(orden.length - 1, Math.max(0, Math.ceil((p / 100) * orden.length) - 1));
  return orden[i];
}
const latencia = (pares: readonly Par[], p: number): MetricResult => {
  if (!pares.length) return nulo('sin resultados');
  const orden = pares.map((x) => x.resultado.latencyMs).sort((a, b) => a - b);
  return { value: percentil(orden, p), n: pares.length, denominator: pares.length };
};
export const latencyP50 = (pares: readonly Par[]): MetricResult => latencia(pares, 50);
export const latencyP95 = (pares: readonly Par[]): MetricResult => latencia(pares, 95);

export function costMeanUsd(pares: readonly Par[]): MetricResult {
  if (!pares.length) return nulo('sin resultados');
  return { value: pares.reduce((s, p) => s + p.resultado.costUsd, 0) / pares.length, n: pares.length, denominator: pares.length };
}

/** Satisfacción: pulgares arriba / (arriba + abajo); los resultados sin feedback no cuentan. */
export function userSatisfaction(pares: readonly Par[]): MetricResult {
  const con = pares.filter((p) => p.resultado.feedback === 'UP' || p.resultado.feedback === 'DOWN');
  if (!con.length) return nulo('sin feedback de usuarios');
  return tasa(con.filter((p) => p.resultado.feedback === 'UP').length, con.length);
}

export const METRICAS = {
  legalCorrectness, citationCorrectness, articleAccuracy, versionAccuracy, retrievalRecall, retrievalPrecision,
  abstentionAccuracy, hallucinationRate, latencyP50, latencyP95, costMeanUsd, userSatisfaction,
} as const;
export type NombreMetrica = keyof typeof METRICAS;
