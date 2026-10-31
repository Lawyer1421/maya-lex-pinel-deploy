/**
 * lib/luna/pricing.ts
 * Costo de una consulta Luna. Cota superior para reservar presupuesto y costo real para liquidar. Las tarifas salen de
 * shadow-model-config.ts; un modelo sin tarifa devuelve Infinity (el presupuesto lo rechaza) o lanza al liquidar.
 */
import { estimarCostoUsd } from '../ai-gateway/shadow/pricing';
import { SHADOW_MODEL_CONFIG } from '../ai-gateway/shadow/shadow-model-config';
import { MODELOS_CON_TARIFA } from './config';

/** Estimación conservadora de tokens: caracteres / divisor (más bajo = más tokens). */
export function estimarTokensEntrada(caracteres: number): number {
  return Math.ceil(caracteres / SHADOW_MODEL_CONFIG.charsPerTokenEstimate);
}

/** Costo del peor caso en USD (entrada como escritura de caché + tope de salida). Infinity si no hay tarifa o excede el contexto largo. */
export function costoPeorCasoUsd(modelId: string, inputTokens: number, maxOutputTokens: number): number {
  if (!MODELOS_CON_TARIFA.has(modelId)) return Number.POSITIVE_INFINITY;
  if (![inputTokens, maxOutputTokens].every((n) => Number.isFinite(n) && n >= 0)) return Number.POSITIVE_INFINITY;
  const p = SHADOW_MODEL_CONFIG.pricing;
  if (inputTokens > p.longContext.thresholdInputTokens) return Number.POSITIVE_INFINITY;
  const tarifaEntrada = inputTokens >= p.minCacheableTokens
    ? Math.max(p.standard.inputUsdPerMillion, p.standard.cacheWrite30mUsdPerMillion)
    : p.standard.inputUsdPerMillion;
  return (inputTokens * tarifaEntrada + maxOutputTokens * p.standard.outputUsdPerMillion) / 1_000_000;
}

/** Costo real estimado con el uso reportado. Los tokens de razonamiento ya vienen dentro de output_tokens. */
export function costoRealUsd(inputTokens: number, outputTokens: number, cachedInputTokens = 0): number {
  return estimarCostoUsd(inputTokens, outputTokens, 'standard', cachedInputTokens);
}
