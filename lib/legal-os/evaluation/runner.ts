/**
 * lib/legal-os/evaluation/runner.ts
 * Ejecutor offline: corre los casos contra un «sistema bajo prueba» inyectado, calcula métricas, genera un informe y
 * compara dos informes para detectar regresiones (compuerta de CI).
 */
import { METRICAS, type MetricResult, type NombreMetrica, type Par } from './metrics';
import { GoldenCase, RunResult } from './schema';

export type SistemaBajoPrueba = (caso: GoldenCase) => Promise<RunResult> | RunResult;

export interface InformeEvaluacion {
  generadoEn: string;
  casos: number;
  casosAprobadosPorCLO: number;
  metricas: Record<NombreMetrica, MetricResult>;
  /** Ids de caso cuya decisión difiere de la esperada. */
  decisionesDistintas: string[];
  errores: { caseId: string; error: string }[];
}

export async function ejecutarEvaluacion(casos: readonly GoldenCase[], sut: SistemaBajoPrueba, ahora: Date = new Date()): Promise<InformeEvaluacion> {
  const pares: Par[] = [];
  const errores: InformeEvaluacion['errores'] = [];
  for (const raw of casos) {
    const caso = GoldenCase.parse(raw);
    try {
      const resultado = RunResult.parse(await sut(caso));
      pares.push({ caso, resultado });
    } catch (e) {
      errores.push({ caseId: caso.id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  const metricas = Object.fromEntries(Object.entries(METRICAS).map(([k, f]) => [k, f(pares)])) as Record<NombreMetrica, MetricResult>;
  return {
    generadoEn: ahora.toISOString(),
    casos: casos.length,
    casosAprobadosPorCLO: pares.filter((p) => p.caso.review_state === 'CLO_APPROVED').length,
    metricas,
    decisionesDistintas: pares.filter((p) => p.resultado.decision !== p.caso.expected.decision).map((p) => p.caso.id),
    errores,
  };
}

const fmt = (m: MetricResult): string => (m.value === null ? `n/d (${m.reason ?? 'sin datos'})` : m.value.toFixed(4));

export function informeMarkdown(r: InformeEvaluacion): string {
  return [
    '# Informe de evaluación',
    '',
    `Generado: ${r.generadoEn} · casos: ${r.casos} · aprobados por el CLO: ${r.casosAprobadosPorCLO} · errores: ${r.errores.length}`,
    '',
    '| Métrica | Valor | n | Denominador |',
    '|---|---:|---:|---:|',
    ...(Object.entries(r.metricas) as [string, MetricResult][]).map(([k, m]) => `| ${k} | ${fmt(m)} | ${m.n} | ${m.denominator} |`),
    '',
    r.decisionesDistintas.length ? `Decisiones distintas de la esperada: ${r.decisionesDistintas.join(', ')}` : 'Todas las decisiones coinciden con la esperada.',
    ...(r.errores.length ? ['', 'Errores:', ...r.errores.map((e) => `- ${e.caseId}: ${e.error}`)] : []),
    '',
  ].join('\n');
}

/** Dirección de cada métrica: «up» = más es mejor; «down» = menos es mejor. */
const DIRECCION: Record<NombreMetrica, 'up' | 'down'> = {
  legalCorrectness: 'up', citationCorrectness: 'up', articleAccuracy: 'up', versionAccuracy: 'up', retrievalRecall: 'up', retrievalPrecision: 'up',
  abstentionAccuracy: 'up', hallucinationRate: 'down', latencyP50: 'down', latencyP95: 'down', costMeanUsd: 'down', userSatisfaction: 'up',
};

/** Empeoramiento máximo tolerado por métrica (absoluto, en la unidad de la métrica). Las ausentes no se comparan. */
export type Umbrales = Partial<Record<NombreMetrica, number>>;
/** Compuerta por defecto: tolerancia cero en abstención, alucinación y corrección jurídica; 2 puntos en el resto de tasas. */
export const UMBRALES_CI: Umbrales = {
  abstentionAccuracy: 0, hallucinationRate: 0, legalCorrectness: 0, citationCorrectness: 0.02, articleAccuracy: 0.02, versionAccuracy: 0.02,
  retrievalRecall: 0.02,
};

export interface Regresion { metrica: NombreMetrica; antes: number | null; despues: number | null; motivo: string }

export function compararInformes(antes: InformeEvaluacion, despues: InformeEvaluacion, umbrales: Umbrales = UMBRALES_CI): { ok: boolean; regresiones: Regresion[] } {
  const regresiones: Regresion[] = [];
  for (const [k, tol] of Object.entries(umbrales) as [NombreMetrica, number][]) {
    const a = antes.metricas[k];
    const d = despues.metricas[k];
    if (a.value === null) continue; // nada con qué comparar
    if (d.value === null) {
      regresiones.push({ metrica: k, antes: a.value, despues: null, motivo: 'la métrica dejó de ser calculable' });
      continue;
    }
    const empeora = DIRECCION[k] === 'up' ? a.value - d.value : d.value - a.value;
    if (empeora > tol + 1e-12) regresiones.push({ metrica: k, antes: a.value, despues: d.value, motivo: `empeoró ${empeora.toFixed(4)} (tolerancia ${tol})` });
  }
  return { ok: regresiones.length === 0, regresiones };
}
