/**
 * Resolución de modelo Anthropic por modo de chat.
 *
 * Defaults en código. Override opcional `MAYA_MODEL_<MODO>` (allowlist).
 * Valor vacío o inválido → default del modo. Opus nunca entra por env
 * ni por override de cliente (ningún plan, Pro incluido).
 *
 * IDs oficiales (docs Anthropic, Models overview / Model IDs):
 *   claude-sonnet-4-6  — Sonnet 4.6, ID anclado (legacy, activo)
 *   claude-haiku-4-5   — alias oficial → claude-haiku-4-5-20251001
 *
 * Allowlist cerrada a esos dos IDs. Sin ninguna MAYA_MODEL_* la app
 * usa estos defaults.
 */

export const MODELO_SONNET = 'claude-sonnet-4-6';
export const MODELO_HAIKU = 'claude-haiku-4-5';
/** ID de referencia para detectar pedidos bloqueados. No está en la allowlist. */
export const MODELO_OPUS = 'claude-opus-4-8';

export const ALLOWLIST_MODELOS = new Set([
  MODELO_SONNET,
  MODELO_HAIKU,
]);

export type ModoChat =
  | 'sala_ia'
  | 'analisis'
  | 'documento'
  | 'sala_penal'
  | 'analisis_penal'
  | 'escritos_penales';

export type ThinkingConfig =
  | { type: 'adaptive'; display: 'summarized' }
  | undefined;

export interface ConfigModo {
  model: string;
  max_tokens: number;
  thinking: ThinkingConfig;
  /** Por qué estos números — no se envían a la API. */
  nota: string;
}

/**
 * Defaults por modo. Thinking adaptive (API 4.6+): el modelo decide el
 * presupuesto interno; el tope duro de salida es max_tokens (bajado vs Opus).
 */
export const DEFAULTS_MODO: Record<ModoChat, ConfigModo> = {
  sala_ia: {
    model: MODELO_HAIKU,
    max_tokens: 600,
    thinking: undefined,
    nota: 'Antes Haiku 800 / sin thinking. Sala: respuesta corta.',
  },
  analisis: {
    model: MODELO_SONNET,
    max_tokens: 2500,
    thinking: { type: 'adaptive', display: 'summarized' },
    nota: 'Antes Opus 4.8 / 4000 / adaptive. Default del producto.',
  },
  documento: {
    model: MODELO_SONNET,
    max_tokens: 4000,
    thinking: { type: 'adaptive', display: 'summarized' },
    nota: 'Antes Opus 4.8 / 8000 / adaptive.',
  },
  sala_penal: {
    model: MODELO_HAIKU,
    max_tokens: 500,
    thinking: undefined,
    nota: 'Antes Haiku 600 / sin thinking.',
  },
  analisis_penal: {
    model: MODELO_SONNET,
    max_tokens: 3500,
    thinking: { type: 'adaptive', display: 'summarized' },
    nota: 'Antes Opus 4.8 / 6000 / adaptive.',
  },
  escritos_penales: {
    model: MODELO_SONNET,
    max_tokens: 5000,
    thinking: { type: 'adaptive', display: 'summarized' },
    nota: 'Antes Opus 4.8 / 10000 / adaptive.',
  },
};

export const ENV_POR_MODO: Record<ModoChat, string> = {
  sala_ia: 'MAYA_MODEL_SALA_IA',
  analisis: 'MAYA_MODEL_ANALISIS',
  documento: 'MAYA_MODEL_DOCUMENTO',
  sala_penal: 'MAYA_MODEL_SALA_PENAL',
  analisis_penal: 'MAYA_MODEL_ANALISIS_PENAL',
  escritos_penales: 'MAYA_MODEL_ESCRITOS_PENALES',
};

export function esOpus(modelId: string | null | undefined): boolean {
  return typeof modelId === 'string' && modelId.toLowerCase().includes('opus');
}

export function esModeloPermitido(modelId: string | null | undefined): boolean {
  return typeof modelId === 'string' && ALLOWLIST_MODELOS.has(modelId);
}

/** Haiku 4.5 rechaza type: "adaptive" con HTTP 400. Solo Sonnet 4.6 lo soporta. */
export function soportaThinkingAdaptive(model: string | null | undefined): boolean {
  return model === MODELO_SONNET;
}

export const THINKING_ADAPTIVE: Exclude<ThinkingConfig, undefined> = {
  type: 'adaptive',
  display: 'summarized',
};

/** Thinking se deriva del modelo efectivo, no del default del modo. */
export function thinkingParaModelo(model: string | null | undefined): ThinkingConfig {
  return soportaThinkingAdaptive(model) ? THINKING_ADAPTIVE : undefined;
}

function leerOverrideEnv(mode: ModoChat): string | undefined {
  const crudo = process.env[ENV_POR_MODO[mode]];
  if (crudo === undefined) return undefined;
  const trimmed = crudo.trim();
  return trimmed === '' ? '' : trimmed;
}

/**
 * Modelo del modo: env allowlisted (nunca Opus) o default.
 * Vacío / inválido / Opus-por-env → default del modo (Sonnet o Haiku).
 */
export function resolverModeloModo(mode: ModoChat): string {
  const override = leerOverrideEnv(mode);
  if (override === undefined) return DEFAULTS_MODO[mode].model;
  if (override === '') return DEFAULTS_MODO[mode].model;
  if (esOpus(override)) return DEFAULTS_MODO[mode].model === MODELO_HAIKU ? MODELO_HAIKU : MODELO_SONNET;
  if (!esModeloPermitido(override)) {
    return DEFAULTS_MODO[mode].model === MODELO_HAIKU ? MODELO_HAIKU : MODELO_SONNET;
  }
  return override;
}

export function resolverConfigModo(mode: ModoChat): ConfigModo {
  const base = DEFAULTS_MODO[mode];
  const model = resolverModeloModo(mode);
  return { ...base, model, thinking: thinkingParaModelo(model) };
}

/**
 * Override que pide el cliente.
 * - Sala (sala_ia / sala_penal): siempre el modelo del modo (Haiku). Nadie sube.
 * - Opus de cualquier plan: modelo del modo (Sonnet en análisis/documento/penal).
 * - Pro en modos no-sala: solo IDs allowlisted (Sonnet / Haiku).
 */
export function resolverModeloCliente(
  mode: ModoChat,
  override: string | null | undefined,
  tier: string | null | undefined,
): string {
  const delModo = resolverModeloModo(mode);
  const esSala = mode === 'sala_ia' || mode === 'sala_penal';
  if (esSala) return delModo;
  if (esOpus(override)) return delModo;
  if (tier === 'pro' && esModeloPermitido(override)) {
    return override!;
  }
  return delModo;
}

export const HISTORY_TURNS_DEFAULT = 10;
export const HISTORY_TURNS_ENV = 'MAYA_HISTORY_TURNS';

export const MODELOS_UI = [
  { id: 'default', label: 'Predeterminado', sub: 'Óptimo según el modo activo' },
  { id: MODELO_SONNET, label: 'Claude Sonnet 4.6', sub: 'Balance velocidad / precisión' },
] as const;

/** Opus no se ofrece a ningún plan. */
export function modelosVisibles(_tier?: string): readonly (typeof MODELOS_UI)[number][] {
  return MODELOS_UI;
}

export function leerHistoryTurns(crudo = process.env[HISTORY_TURNS_ENV]): number {
  if (crudo === undefined || crudo.trim() === '') return HISTORY_TURNS_DEFAULT;
  const n = Number.parseInt(crudo, 10);
  if (!Number.isFinite(n) || n < 1) return HISTORY_TURNS_DEFAULT;
  return n;
}

// ── Ruta rápida (Fase 2 de latencia, 2026-11-12) ─────────────────────────────────────────────────────────────────────────────────────
// Decisión del Titular: Sonnet con adaptive thinking se mantiene para análisis, dictámenes y toda consulta compleja. Solo dos casos muy
// acotados van por Haiku sin thinking: un saludo, o pedir el TEXTO LITERAL de un artículo («¿Qué dice el artículo 424 del CPC?»). Las guardas
// R3/R4 se aplican igual a la salida: la ruta rápida cambia el modelo que redacta, nunca la validación. Ante la duda, NO es rápida.

export type ConsultaRapida = 'SALUDO' | 'TEXTO_LITERAL';

/** Modos donde aplica: solo análisis (civil y penal). Sala ya usa Haiku; documento y escritos redactan piezas largas y no se tocan. */
const MODOS_RUTA_RAPIDA: ReadonlySet<string> = new Set(['analisis', 'analisis_penal']);
const MAX_TOKENS_RUTA_RAPIDA = 800;

const normalizarConsulta = (s: string): string =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/^[\s¿¡"'«]+/, '').replace(/\s+/g, ' ').trim();

const SALUDO = /^(?:hola|buen(?:os|as)?(?: (?:dias|tardes|noches))?|gracias|muchas gracias|saludos|hey|que tal)(?:[\s,.!?]|$)/;
const TEMA_JURIDICO = /\b(?:art|arts|articulo|ley|codigo|decreto|demanda|contrato|plazo|juez|notari|sentencia|norma)/;
const PIDE_TEXTO_LITERAL =
  /^(?:que dice|que establece|cual es el (?:texto|contenido)(?: literal)? del?|transcrib\w*|cita(?:me)?(?: textualmente)?|dame el (?:texto|contenido)(?: literal)? del?)\s+(?:el\s+)?(?:art\.?|articulo)\s*\d+[a-z]?\b/;
/** Cualquier señal de análisis, aplicación a un caso o comparación saca la consulta de la ruta rápida. */
const SENAL_DE_ANALISIS =
  /\b(?:aplica|caso|puedo|debo|procede|interpret|analiz|compar|diferenc|requisit|plazo|como|por que|porque|mi|mis|significa|explica|conviene|recomiend|y el|y los|y la|ademas|tambien|o el)\b/;

/** Clasifica la consulta. Devuelve null (ruta normal) ante cualquier duda. */
export function clasificarConsultaRapida(pregunta: string): ConsultaRapida | null {
  if (typeof pregunta !== 'string') return null;
  const q = normalizarConsulta(pregunta);
  if (q === '' || q.length > 160) return null;
  const palabras = q.split(' ').length;
  if (palabras <= 6 && SALUDO.test(q) && !TEMA_JURIDICO.test(q)) return 'SALUDO';
  if (PIDE_TEXTO_LITERAL.test(q)) {
    const resto = q.replace(PIDE_TEXTO_LITERAL, '');
    if (!SENAL_DE_ANALISIS.test(resto)) return 'TEXTO_LITERAL';
  }
  return null;
}

export interface GeneracionResuelta {
  modelo: string;
  maxTokens: number;
  rutaRapida: ConsultaRapida | null;
}

/** Modelo y tope de salida con los que se redacta. Sin override del cliente y solo en modos de análisis. */
export function aplicarRutaRapida(p: {
  mode: string;
  overrideCliente: string | null;
  pregunta: string;
  modeloEfectivo: string;
  maxTokens: number;
}): GeneracionResuelta {
  const rutaRapida = MODOS_RUTA_RAPIDA.has(p.mode) && !p.overrideCliente ? clasificarConsultaRapida(p.pregunta) : null;
  if (!rutaRapida) return { modelo: p.modeloEfectivo, maxTokens: p.maxTokens, rutaRapida: null };
  return { modelo: MODELO_HAIKU, maxTokens: Math.min(p.maxTokens, MAX_TOKENS_RUTA_RAPIDA), rutaRapida };
}
