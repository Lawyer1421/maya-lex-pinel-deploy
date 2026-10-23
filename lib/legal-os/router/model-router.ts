/**
 * lib/legal-os/router/model-router.ts
 * LegalModelRouter — decisión pura y determinista de qué modelo (si alguno) atiende una consulta.
 * Principios: (1) lo determinista no usa LLM; (2) sin evidencia suficiente no se llama al modelo: se abstiene;
 * (3) el modelo caro solo cuando riesgo, profundidad y evidencia lo justifican y el plan lo permite;
 * (4) el techo de coste del plan manda.
 */
import { MODEL_POLICY, TARIFAS_FAST, type ModelPolicy } from '../policies/model-policy';
import type { ModelRoute, RoutingInput } from '../types';

export const UMBRAL_EVIDENCIA_MINIMA = 0.4;
export const UMBRAL_EXACTO = 0.9;
const SALIDA_RAPIDA = 400;
const SALIDA_PROFUNDA = 1_500;

/** Cota superior del coste: la entrada elegible a caché se cobra a la tarifa de escritura. */
export function estimarCostoUsd(entrada: number, salida: number): number {
  if (!Number.isFinite(entrada) || !Number.isFinite(salida) || entrada < 0 || salida < 0 || entrada > TARIFAS_FAST.maxInputTokens) return Number.POSITIVE_INFINITY;
  const t = entrada >= TARIFAS_FAST.minCacheableTokens ? Math.max(TARIFAS_FAST.inputUsdPerMillion, TARIFAS_FAST.cacheWrite30mUsdPerMillion) : TARIFAS_FAST.inputUsdPerMillion;
  return (entrada * t + salida * TARIFAS_FAST.outputUsdPerMillion) / 1_000_000;
}

const ruta = (r: Partial<ModelRoute> & Pick<ModelRoute, 'role' | 'reasons'>): ModelRoute => ({
  modelId: null, reasoningEffort: 'none', stream: false, estimatedCostUsd: 0, deepUnavailable: false, abstain: false, ...r,
});

export function enrutarModelo(entrada: RoutingInput, politica: ModelPolicy = MODEL_POLICY): ModelRoute {
  const { intent: i } = entrada;
  const reasons: string[] = [];

  if (i.task === 'OUT_OF_SCOPE') return ruta({ role: 'NONE', abstain: true, reasons: ['fuera de alcance jurídico'] });

  // Búsqueda exacta resuelta con evidencia sólida: no hay nada que razonar, lo sirve el Exact Resolver.
  if (i.task === 'EXACT_LOOKUP' && entrada.evidenceQuality >= UMBRAL_EXACTO && entrada.evidenceCount > 0) {
    return ruta({ role: 'NONE', reasons: ['consulta exacta con evidencia verificada: sin modelo, latencia mínima'] });
  }

  // Sin evidencia suficiente → abstención (fail-closed), jamás un modelo «a ver qué sale».
  if (i.requiresEvidence && (entrada.evidenceCount === 0 || entrada.evidenceQuality < UMBRAL_EVIDENCIA_MINIMA)) {
    return ruta({ role: 'NONE', abstain: true, reasons: ['evidencia insuficiente: abstención'] });
  }

  const queDeep =
    entrada.depth === 'DEEP' || i.task === 'ANALYSIS' || i.task === 'DRAFTING' || i.task === 'DOCUMENT_REVIEW' || (i.risk === 'HIGH' && entrada.retrievalConfidence < 0.6);
  const planPermiteDeep = politica.deepPermitidoEn.includes(entrada.tier);
  const quiereDeep = queDeep && planPermiteDeep;
  if (queDeep && !planPermiteDeep) reasons.push(`plan ${entrada.tier} sin modelo profundo`);

  let role: 'FAST' | 'DEEP' = quiereDeep ? 'DEEP' : 'FAST';
  let deepUnavailable = false;
  if (role === 'DEEP' && !(politica.deep.verified && politica.deep.modelId)) {
    role = 'FAST';
    deepUnavailable = true;
    reasons.push('modelo profundo no verificado: se usa FAST con esfuerzo de razonamiento mayor');
  }

  const modelId = role === 'DEEP' ? (politica.deep.modelId as string) : politica.fast.modelId;
  const salida = quiereDeep ? SALIDA_PROFUNDA : SALIDA_RAPIDA;
  const costo = estimarCostoUsd(entrada.estimatedInputTokens, salida);
  const techo = politica.maxCostUsdPorConsulta[entrada.tier];
  if (!Number.isFinite(costo) || costo > techo) {
    return ruta({ role: 'NONE', abstain: true, deepUnavailable, estimatedCostUsd: Number.isFinite(costo) ? costo : 0, reasons: [...reasons, `coste estimado supera el techo del plan ${entrada.tier}`] });
  }

  const reasoningEffort = quiereDeep ? (deepUnavailable ? 'medium' : 'high') : 'none';
  reasons.push(role === 'DEEP' ? 'análisis profundo justificado por tarea/riesgo/plan' : 'consulta con evidencia: modelo rápido');
  return ruta({
    role, modelId, reasoningEffort, stream: quiereDeep || entrada.latencyTargetMs >= 3_000, estimatedCostUsd: costo, deepUnavailable, reasons,
  });
}
