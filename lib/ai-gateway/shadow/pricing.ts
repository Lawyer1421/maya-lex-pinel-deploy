/**
 * Estimación de costo del modo sombra. Las tarifas NO viven aquí: se leen de shadow-model-config.ts,
 * la única fuente (con su fecha de verificación y su URL documental).
 */
import { SHADOW_MODEL_CONFIG } from './shadow-model-config';

export type ModoTarifa = 'standard' | 'batch';

/**
 * Costo estimado en USD. `cachedInputTokens` es un subconjunto de `inputTokens` (así lo reporta la API):
 * se cobra a la tarifa de entrada en caché.
 */
export function estimarCostoUsd(inputTokens: number, outputTokens: number, modo: ModoTarifa = 'standard', cachedInputTokens = 0): number {
  if (![inputTokens, outputTokens, cachedInputTokens].every((n) => Number.isFinite(n) && n >= 0)) {
    throw new Error('tokens inválidos para estimar costo');
  }
  if (cachedInputTokens > inputTokens) throw new Error('tokens en caché mayores que los de entrada');
  const t = SHADOW_MODEL_CONFIG.pricing[modo];
  const tarifaCache = t.cachedInputUsdPerMillion;
  const sinCache = inputTokens - cachedInputTokens;
  return (sinCache * t.inputUsdPerMillion + cachedInputTokens * tarifaCache + outputTokens * t.outputUsdPerMillion) / 1_000_000;
}

/**
 * COTA SUPERIOR del costo de una solicitud, para reservar presupuesto y liquidar sin subestimar.
 * - Toda la entrada que podría escribirse en caché (≥ minCacheableTokens) se cobra a la tarifa de ESCRITURA (1.25×).
 * - Una entrada por encima del umbral de contexto largo no se despacha: devuelve Infinity y el presupuesto la rechaza.
 */
export function estimarCostoConservadorUsd(inputTokens: number, outputTokens: number): number {
  if (![inputTokens, outputTokens].every((n) => Number.isFinite(n) && n >= 0)) throw new Error('tokens inválidos para estimar costo');
  const { standard, minCacheableTokens } = SHADOW_MODEL_CONFIG.pricing;
  if (inputTokens > SHADOW_MODEL_CONFIG.maxInputTokens) return Number.POSITIVE_INFINITY;
  const tarifaEntrada = inputTokens >= minCacheableTokens ? Math.max(standard.inputUsdPerMillion, standard.cacheWrite30mUsdPerMillion) : standard.inputUsdPerMillion;
  return (inputTokens * tarifaEntrada + outputTokens * standard.outputUsdPerMillion) / 1_000_000;
}
