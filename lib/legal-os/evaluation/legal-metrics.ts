/**
 * lib/legal-os/evaluation/legal-metrics.ts
 * Compuerta de las métricas de CORRECCIÓN JURÍDICA. Corrección jurídica, exactitud de artículo, exactitud de versión, corrección de
 * citas contra lo esperado, recall y precisión de recuperación se calculan SOLO sobre casos LEGAL_CLO_APPROVED.
 * Un caso DESIGN_FIXED o pendiente de CLO se RECHAZA (lanza): nunca se puntúa derecho contra una expectativa no aprobada.
 */
import { articleAccuracy, citationCorrectness, legalCorrectness, retrievalPrecision, retrievalRecall, versionAccuracy, type MetricResult, type Par } from './metrics';
import { suiteDeCaso } from './golden/suites';

export class SuiteNoAprobadaError extends Error {
  constructor(readonly casoId: string, readonly suite: string) {
    super(`caso ${casoId} (${suite}) no es LEGAL_CLO_APPROVED: no se puntúa corrección jurídica contra una expectativa no aprobada`);
    this.name = 'SuiteNoAprobadaError';
  }
}

/** Lanza si algún par no es LEGAL_CLO_APPROVED. */
export function exigirSoloAprobadosCLO(pares: readonly Par[]): void {
  for (const p of pares) {
    const s = suiteDeCaso(p.caso);
    if (s !== 'LEGAL_CLO_APPROVED') throw new SuiteNoAprobadaError(p.caso.id, s);
  }
}

export interface MetricasJuridicas {
  legalCorrectness: MetricResult;
  citationCorrectness: MetricResult;
  articleAccuracy: MetricResult;
  versionAccuracy: MetricResult;
  retrievalRecall: MetricResult;
  retrievalPrecision: MetricResult;
}

/** Única vía autorizada para calcular las métricas jurídicas. Con 0 pares devuelve null con motivo (sin 100 % de relleno). */
export function metricasJuridicas(pares: readonly Par[]): MetricasJuridicas {
  exigirSoloAprobadosCLO(pares);
  return {
    legalCorrectness: legalCorrectness(pares),
    citationCorrectness: citationCorrectness(pares),
    articleAccuracy: articleAccuracy(pares),
    versionAccuracy: versionAccuracy(pares),
    retrievalRecall: retrievalRecall(pares),
    retrievalPrecision: retrievalPrecision(pares),
  };
}
