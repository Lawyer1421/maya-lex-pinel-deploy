/**
 * Estimación de costo del modo sombra. Las tarifas NO viven aquí: se leen de shadow-model-config.ts,
 * la única fuente (con su fecha de verificación y su URL documental).
 */
import { SHADOW_MODEL_CONFIG } from './shadow-model-config';

export type ModoTarifa = 'standard' | 'batch';

/**
 * Costo estimado en USD. `cachedInputTokens` es un subconjunto de `inputTokens` (así lo reporta la API):
 * se cobra a la tarifa de entrada en caché si existe; si el modo no tiene tarifa de caché, se cobra completo.
 */
export function estimarCostoUsd(inputTokens: number, outputTokens: number, modo: ModoTarifa = 'standard', cachedInputTokens = 0): number {
  if (![inputTokens, outputTokens, cachedInputTokens].every((n) => Number.isFinite(n) && n >= 0)) {
    throw new Error('tokens inválidos para estimar costo');
  }
  if (cachedInputTokens > inputTokens) throw new Error('tokens en caché mayores que los de entrada');
  const t = SHADOW_MODEL_CONFIG.pricing[modo];
  const tarifaCache = t.cachedInputUsdPerMillion ?? t.inputUsdPerMillion;
  const sinCache = inputTokens - cachedInputTokens;
  return (sinCache * t.inputUsdPerMillion + cachedInputTokens * tarifaCache + outputTokens * t.outputUsdPerMillion) / 1_000_000;
}
