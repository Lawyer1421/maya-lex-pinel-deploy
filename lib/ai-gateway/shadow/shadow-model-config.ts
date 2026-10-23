/**
 * lib/ai-gateway/shadow/shadow-model-config.ts
 * MAYALEX AI GATEWAY v1 — PR-G3: ÚNICA fuente de configuración del modelo, sus tarifas y su presupuesto.
 *
 * Ningún otro módulo (ni prueba) repite estos números: todos los importan de aquí.
 *
 * TARIFAS — fuente documental: OpenAI API Pricing, https://developers.openai.com/api/docs/pricing
 *   GPT-6 Luna, Standard, short-context. Verificadas por el supervisor el 2026-10-22.
 *   Deben REVALIDARSE antes de producción o canary: no se infieren ni se actualizan solas.
 *   Las tarifas batch vienen del dictamen CLO del 21-oct-2026 y NO fueron revalidadas el 22-oct-2026.
 * Las tarifas sirven para ESTIMAR costo y para el presupuesto fail-closed; nunca autorizan gasto por sí solas.
 */
export const SHADOW_MODEL_CONFIG = {
  modelId: 'gpt-6-luna',
  pricing: {
    sourceUrl: 'https://developers.openai.com/api/docs/pricing',
    tier: 'Standard, short-context',
    verifiedAt: '2026-10-22',
    standard: { inputUsdPerMillion: 0.1, outputUsdPerMillion: 0.5, cachedInputUsdPerMillion: 0.01 },
    batch: { inputUsdPerMillion: 0.05, outputUsdPerMillion: 0.25, cachedInputUsdPerMillion: null, verifiedAt: '2026-10-21 (CLO, sin revalidar)' },
  },
  /** Tope de tokens de salida de cada llamada futura; entra en la reserva de presupuesto del peor caso. */
  maxOutputTokens: 800,
  /** Estimación conservadora de tokens de entrada: caracteres / este divisor (más bajo = más tokens). */
  charsPerTokenEstimate: 3,
} as const;

/**
 * Presupuesto del modo sombra en USD por ventana. Por defecto 0: con 0 NINGUNA llamada puede ejecutarse.
 * Es una constante de código: este PR no la sube ni la lee del entorno. Subirla exige un cambio revisado.
 */
export const SHADOW_BUDGET_USD = 0;
/** Ventana del presupuesto (24 h). Cuando vence, el gasto acumulado vuelve a cero. */
export const SHADOW_BUDGET_WINDOW_MS = 24 * 60 * 60 * 1000;
