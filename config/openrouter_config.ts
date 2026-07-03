/**
 * OpenRouter — Configuración de modelos y selector inteligente
 * Maya Lex IA Pinel HN | rama experimental-openrouter
 *
 * OpenRouter expone una API compatible con OpenAI.
 * Una sola API Key da acceso a DeepSeek, Gemini y cientos de modelos.
 * Docs: https://openrouter.ai/docs
 */

export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * Identificadores oficiales de modelos en OpenRouter.
 * Actualizar cuando OpenRouter publique versiones más recientes.
 */
export const OPENROUTER_MODELS = {
  /** Motor de razonamiento — análisis jurídico profundo, RUTA_C */
  deepseek_r1:  'deepseek/deepseek-r1',
  /** Generación rápida y económica — RUTA_A/B, sala, clarificación */
  deepseek_v3:  'deepseek/deepseek-chat-v3-0324',
  /** Filtro maestro y formateo de alta velocidad */
  gemini_flash: 'google/gemini-2.0-flash-001',
} as const;

export type OpenRouterModel = typeof OPENROUTER_MODELS[keyof typeof OPENROUTER_MODELS];

export type RutaRAG = 'A' | 'B' | 'C' | 'D';

/**
 * Selecciona el modelo óptimo según la ruta RAG y el modo de consulta.
 *
 * RUTA_C + modos de análisis → DeepSeek R1 (razonamiento profundo)
 * RUTA_A/B/D + sala          → DeepSeek V3 (velocidad, bajo costo)
 */
export function seleccionarModeloOpenRouter(
  ruta: RutaRAG,
  mode: string,
): OpenRouterModel {
  const esAnalisisComplejo = [
    'analisis', 'analisis_penal', 'documento', 'escritos_penales',
  ].includes(mode);

  if (ruta === 'C' || esAnalisisComplejo) {
    return OPENROUTER_MODELS.deepseek_r1;
  }
  return OPENROUTER_MODELS.deepseek_v3;
}
