/**
 * lib/ai-gateway/shadow/shadow-model-config.ts
 * MAYALEX AI GATEWAY v1 — PR-G3: ÚNICA fuente de configuración del modelo, sus tarifas y su presupuesto.
 *
 * Ningún otro módulo (ni prueba) repite estos números: todos los importan de aquí.
 *
 * TARIFAS — fuente documental: OpenAI API Pricing (https://developers.openai.com/api/docs/pricing) y la página del modelo
 *   (https://developers.openai.com/api/docs/models/gpt-6-luna). GPT-6 Luna, Standard. Revalidadas el 2026-10-23 (G6-A).
 *   Deben REVALIDARSE antes de producción o canary: no se infieren ni se actualizan solas (vigencia máxima: 7 días).
 * Las tarifas sirven para ESTIMAR costo y para el presupuesto fail-closed; nunca autorizan gasto por sí solas.
 */
export const SHADOW_MODEL_CONFIG = {
  modelId: 'gpt-6-luna',
  pricing: {
    sourceUrl: 'https://developers.openai.com/api/docs/pricing',
    modelPageUrl: 'https://developers.openai.com/api/docs/models/gpt-6-luna',
    tier: 'Standard (prompts de hasta 272K tokens de entrada)',
    // G6-A: revalidadas el 2026-10-23 contra las páginas oficiales de precios y del modelo (ver canary/openai-verification.ts).
    verifiedAt: '2026-10-23',
    standard: {
      inputUsdPerMillion: 0.1,
      outputUsdPerMillion: 0.5,
      cachedInputUsdPerMillion: 0.01,
      /** Escritura de caché (30 min): 1.25× la entrada sin caché. La caché implícita escribe prefijos de ≥1,024 tokens. */
      cacheWrite30mUsdPerMillion: 0.125,
    },
    /** Más allá de este umbral de entrada se cobra 2× entrada y caché y 1.5× salida sobre TODA la solicitud. */
    longContext: { thresholdInputTokens: 272_000, inputMultiplier: 2, outputMultiplier: 1.5 },
    /** Tokens mínimos para que un prefijo sea elegible a caché (y, por tanto, a cobro de escritura). */
    minCacheableTokens: 1024,
    batch: { inputUsdPerMillion: 0.05, outputUsdPerMillion: 0.25, cachedInputUsdPerMillion: 0.005, verifiedAt: '2026-10-23' },
  },
  /**
   * Esfuerzo de razonamiento. La documentación oficial indica que GPT-6 Luna razona en `medium` por defecto: los tokens
   * de razonamiento cuentan como salida y consumen `max_output_tokens`. El shadow no necesita razonar (verifica citas
   * contra la evidencia), así que se fija `none`, valor soportado por el modelo.
   */
  reasoningEffort: 'none',
  /** Tope de tokens de salida de cada llamada futura; entra en la reserva de presupuesto del peor caso. */
  maxOutputTokens: 800,
  /** Tope DURO de entrada estimada: una solicitud mayor no se despacha. Muy por debajo del umbral de contexto largo. */
  maxInputTokens: 24_000,
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
