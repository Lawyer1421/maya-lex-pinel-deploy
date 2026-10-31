/**
 * lib/luna/config.ts
 * MAYALEX LUNA (P26): configuración por plan del motor de respuestas sobre la Responses API de OpenAI.
 *
 * Luna es UNA implementación con tres perfiles de configuración (free / académico / premium): cambian el modelo
 * permitido, el esfuerzo de razonamiento, los topes de entrada y salida, la cantidad de evidencia y el presupuesto.
 * Nada aquí abre red ni lee credenciales. APAGADO por defecto: se requiere LUNA_ENABLED=1 Y la bandera `flag_luna_responses`.
 *
 * Tarifas: no viven aquí. Se leen de lib/ai-gateway/shadow/shadow-model-config.ts (única fuente, con fecha de verificación).
 * Un modelo sin tarifa registrada NO se puede usar: el presupuesto fail-closed no puede estimar su costo.
 */
import { SHADOW_MODEL_CONFIG } from '../ai-gateway/shadow/shadow-model-config';
import type { UserTier } from '../rate-limit';

export type PlanLuna = 'free' | 'academico' | 'premium';
export type EsfuerzoRazonamiento = 'none' | 'low' | 'medium';

export interface ConfigPlanLuna {
  plan: PlanLuna;
  modelId: string;
  reasoningEffort: EsfuerzoRazonamiento;
  maxOutputTokens: number;
  /** Tope DURO de entrada estimada (tokens). Una solicitud mayor no se despacha. */
  maxInputTokens: number;
  /** Máximo de fragmentos de evidencia autorizados que se entregan al modelo. */
  maxEvidencias: number;
  /** Tope de costo de UNA consulta en el peor caso (USD). Si el peor caso lo supera no hay llamada. */
  maxCostoConsultaUsd: number;
  /** Presupuesto de la ventana de 24 h por instancia (USD). 0 = ninguna llamada. */
  presupuestoDiarioUsd: number;
  timeoutMs: number;
  /** Instrucción de estilo del plan; no cambia las reglas de evidencia. */
  estilo: string;
}

const DEFAULT_MODEL_ID = SHADOW_MODEL_CONFIG.modelId;

/** MÁXIMOS DUROS en código (CLO 29-oct): ningún valor de entorno puede superarlos; si lo intenta, Luna falla cerrada. */
export const MAX_DURO_CONSULTA_USD = 0.01;
export const MAX_DURO_DIA_USD = 5;

const BASE: Record<PlanLuna, Omit<ConfigPlanLuna, 'plan' | 'modelId'>> = {
  free: {
    reasoningEffort: 'none',
    maxOutputTokens: 600,
    maxInputTokens: 8_000,
    maxEvidencias: 4,
    maxCostoConsultaUsd: 0.003,
    presupuestoDiarioUsd: 1,
    timeoutMs: 20_000,
    estilo: 'Respuesta breve y directa: máximo tres afirmaciones, sin desarrollo doctrinal.',
  },
  academico: {
    reasoningEffort: 'low',
    maxOutputTokens: 1_400,
    maxInputTokens: 16_000,
    maxEvidencias: 8,
    maxCostoConsultaUsd: 0.008,
    presupuestoDiarioUsd: 3,
    timeoutMs: 30_000,
    estilo: 'Explicación didáctica: ordena las afirmaciones del concepto a la regla y cita cada fundamento; útil para enseñanza.',
  },
  premium: {
    reasoningEffort: 'medium',
    maxOutputTokens: 2_500,
    maxInputTokens: 24_000,
    maxEvidencias: 12,
    maxCostoConsultaUsd: 0.01,
    presupuestoDiarioUsd: 5,
    timeoutMs: 45_000,
    estilo: 'Análisis jurídico profesional: distingue regla, excepciones y vacíos probatorios; señala qué falta para concluir.',
  },
};

const ENV_PLAN: Record<PlanLuna, string> = { free: 'FREE', academico: 'ACADEMICO', premium: 'PREMIUM' };

/** Plan de Luna según el tier de cuota existente. pro/admin → premium; academico → académico; cualquier otro → free. */
export function planDesdeTier(tier: UserTier | string | null | undefined): PlanLuna {
  if (tier === 'pro' || tier === 'admin') return 'premium';
  if (tier === 'academico') return 'academico';
  return 'free';
}

/** Tarifas registradas: único modelo con tarifa verificada hoy. Ampliar la tabla exige un cambio revisado. */
export const MODELOS_CON_TARIFA: ReadonlySet<string> = new Set([SHADOW_MODEL_CONFIG.modelId]);

type Env = Readonly<Record<string, string | undefined>>;

/** Valor numérico de entorno. Ausente → predeterminado; presente pero inválido (no numérico, negativo) → NaN, que `resolverConfigPlan` trata como configuración inválida. */
function numeroEnv(crudo: string | undefined, porDefecto: number, { permitirCero = false } = {}): number {
  if (crudo === undefined || crudo.trim() === '') return porDefecto;
  const n = Number(crudo);
  if (!Number.isFinite(n) || n < 0 || (!permitirCero && n === 0)) return Number.NaN;
  return n;
}

/** ¿Es Preview o desarrollo/pruebas? Todo lo demás (producción de Vercel, producción autoalojada, entorno sin identificar) es «producción». */
export function esPreviewODesarrollo(env: Env = process.env): boolean {
  if (env.VERCEL_ENV === 'preview' || env.VERCEL_ENV === 'development') return true;
  if (env.VERCEL_ENV === undefined && (env.NODE_ENV === 'development' || env.NODE_ENV === 'test')) return true;
  return false;
}

/**
 * Kill switch de entorno. Cualquier valor distinto de '1' apaga Luna. FUERA de Preview y desarrollo (producción de Vercel, producción autoalojada
 * o un entorno que no se pueda identificar) además exige SIEMPRE una segunda llave explícita, LUNA_ALLOW_PRODUCTION=1: la habilitación por etapas
 * empieza en Preview con la cuenta de prueba y nunca con usuarios de producción.
 */
export function lunaHabilitadaPorEntorno(env: Env = process.env): boolean {
  if (env.LUNA_ENABLED !== '1') return false;
  if (!esPreviewODesarrollo(env) && env.LUNA_ALLOW_PRODUCTION !== '1') return false;
  return true;
}

/** `local_canary_only` (contador en memoria, no global) está PROHIBIDO fuera de Preview y desarrollo, aunque exista LUNA_ALLOW_PRODUCTION. */
export function contadorLocalPermitido(env: Env = process.env): boolean {
  return esPreviewODesarrollo(env);
}

/** Presupuesto diario máximo en Preview (USD): estricto por defecto. Sobrescribible con LUNA_PREVIEW_BUDGET_USD (>= 0), nunca por encima de los máximos duros. */
export const PRESUPUESTO_PREVIEW_USD = 0.05;

export type ConfigPlanResuelta = ConfigPlanLuna & { modeloRechazado?: string; invalida?: 'VALOR_DE_ENTORNO_INVALIDO' | 'EXCEDE_TOPE_DURO' };

/**
 * Configuración efectiva del plan. Un modelo pedido por entorno (LUNA_MODEL_ID / LUNA_MODEL_ID_<PLAN>) solo se acepta
 * si tiene tarifa registrada; si no, se usa el modelo por defecto y `modeloRechazado` lo informa.
 * Topes: por consulta ≤ MAX_DURO_CONSULTA_USD y por día ≤ MAX_DURO_DIA_USD por plan. Un valor de entorno que los exceda, o que no sea un número
 * válido, deja la configuración `invalida` y el motor FALLA CERRADO (no recorta en silencio: nadie debe creer que gasta más de lo que se permite).
 */
export function resolverConfigPlan(plan: PlanLuna, env: Env = process.env): ConfigPlanResuelta {
  const base = BASE[plan];
  const sufijo = ENV_PLAN[plan];
  const pedido = (env[`LUNA_MODEL_ID_${sufijo}`] ?? env.LUNA_MODEL_ID ?? '').trim();
  const modelId = pedido !== '' && MODELOS_CON_TARIFA.has(pedido) ? pedido : DEFAULT_MODEL_ID;
  const dia = numeroEnv(env[`LUNA_BUDGET_USD_${sufijo}`], base.presupuestoDiarioUsd, { permitirCero: true });
  const consulta = numeroEnv(env[`LUNA_MAX_QUERY_USD_${sufijo}`], base.maxCostoConsultaUsd);
  const previewEnv = env.VERCEL_ENV === 'preview' ? numeroEnv(env.LUNA_PREVIEW_BUDGET_USD, PRESUPUESTO_PREVIEW_USD, { permitirCero: true }) : Number.POSITIVE_INFINITY;
  const invalida: ConfigPlanResuelta['invalida'] =
    Number.isNaN(dia) || Number.isNaN(consulta) || Number.isNaN(previewEnv) ? 'VALOR_DE_ENTORNO_INVALIDO'
      : dia > MAX_DURO_DIA_USD || consulta > MAX_DURO_CONSULTA_USD || (Number.isFinite(previewEnv) && previewEnv > MAX_DURO_DIA_USD) ? 'EXCEDE_TOPE_DURO'
        : undefined;
  return {
    plan,
    ...base,
    modelId,
    // En Preview el tope diario nunca supera el presupuesto estricto de Preview, aunque el del plan sea mayor.
    presupuestoDiarioUsd: Number.isNaN(dia) ? 0 : Math.min(dia, Number.isFinite(previewEnv) ? previewEnv : dia, MAX_DURO_DIA_USD),
    maxCostoConsultaUsd: Number.isNaN(consulta) ? 0 : Math.min(consulta, MAX_DURO_CONSULTA_USD),
    ...(pedido !== '' && modelId !== pedido ? { modeloRechazado: pedido } : {}),
    ...(invalida ? { invalida } : {}),
  };
}
