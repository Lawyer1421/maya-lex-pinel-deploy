/**
 * Tarifas de gpt-6-luna para estimar el costo del modo sombra (USD por millón
 * de tokens). Verificadas el 21-oct-2026 (dictamen CLO). Si cambian, se
 * actualizan aquí con la nueva fecha de verificación; nunca se infieren.
 */
export const TARIFAS_GPT6_LUNA = {
  modelo: 'gpt-6-luna',
  verificadoEl: '2026-10-21',
  standard: { inputUsdPorMillon: 0.1, outputUsdPorMillon: 0.5 },
  batch: { inputUsdPorMillon: 0.05, outputUsdPorMillon: 0.25 },
} as const;

export type ModoTarifa = 'standard' | 'batch';

export function estimarCostoUsd(inputTokens: number, outputTokens: number, modo: ModoTarifa = 'standard'): number {
  if (!Number.isFinite(inputTokens) || !Number.isFinite(outputTokens) || inputTokens < 0 || outputTokens < 0) {
    throw new Error('tokens inválidos para estimar costo');
  }
  const t = TARIFAS_GPT6_LUNA[modo];
  return (inputTokens * t.inputUsdPorMillon + outputTokens * t.outputUsdPorMillon) / 1_000_000;
}
