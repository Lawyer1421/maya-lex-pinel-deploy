/**
 * lib/luna/pricing.ts
 * Costo de una consulta Luna. Cota superior para reservar presupuesto y costo real para liquidar. Las tarifas salen de
 * shadow-model-config.ts; un modelo sin tarifa devuelve Infinity (el presupuesto lo rechaza) o lanza al liquidar.
 */
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

export type ModalidadTarifa = 'standard' | 'batch';

/** Tarifa (USD por millón de tokens) de un modelo en una modalidad. Una combinación no registrada NO tiene tarifa: no se estima ni se adivina. */
export function tarifaDeModelo(modelId: string, modalidad: ModalidadTarifa = 'standard'): { inputUsdPerMillion: number; outputUsdPerMillion: number; cachedInputUsdPerMillion: number } {
  // Fuente única: shadow-model-config.ts. Hoy solo gpt-6-luna tiene tarifas registradas (Standard y Batch; Fast y regional NO están registradas).
  if (modelId !== SHADOW_MODEL_CONFIG.modelId || !MODELOS_CON_TARIFA.has(modelId)) throw new Error(`sin tarifa registrada para el modelo ${modelId}`);
  if (modalidad !== 'standard' && modalidad !== 'batch') throw new Error(`modalidad sin tarifa registrada: ${String(modalidad)}`);
  const t = SHADOW_MODEL_CONFIG.pricing[modalidad];
  return { inputUsdPerMillion: t.inputUsdPerMillion, outputUsdPerMillion: t.outputUsdPerMillion, cachedInputUsdPerMillion: t.cachedInputUsdPerMillion };
}

/**
 * Costo real estimado con el uso reportado, con la tarifa del MODELO y la MODALIDAD indicados (los tokens de razonamiento ya vienen dentro de
 * output_tokens). Lanza si el modelo o la modalidad no tienen tarifa registrada.
 */
export function costoRealUsd(modelId: string, inputTokens: number, outputTokens: number, cachedInputTokens = 0, modalidad: ModalidadTarifa = 'standard'): number {
  if (![inputTokens, outputTokens, cachedInputTokens].every((n) => Number.isFinite(n) && n >= 0)) throw new Error('tokens inválidos para estimar costo');
  if (cachedInputTokens > inputTokens) throw new Error('tokens en caché mayores que los de entrada');
  const t = tarifaDeModelo(modelId, modalidad);
  return ((inputTokens - cachedInputTokens) * t.inputUsdPerMillion + cachedInputTokens * t.cachedInputUsdPerMillion + outputTokens * t.outputUsdPerMillion) / 1_000_000;
}
