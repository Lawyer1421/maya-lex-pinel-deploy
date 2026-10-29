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
    maxCostoConsultaUsd: 0.02,
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

function numeroEnv(crudo: string | undefined, porDefecto: number, { permitirCero = false } = {}): number {
  if (crudo === undefined || crudo.trim() === '') return porDefecto;
  const n = Number(crudo);
  if (!Number.isFinite(n) || n < 0 || (!permitirCero && n === 0)) return porDefecto;
  return n;
}

/**
 * Kill switch de entorno. Cualquier valor distinto de '1' apaga Luna. En PRODUCCIÓN (VERCEL_ENV=production) además exige una segunda llave
 * explícita, LUNA_ALLOW_PRODUCTION=1: la habilitación por etapas empieza en Preview con la cuenta de prueba y nunca con usuarios de producción.
 */
export function lunaHabilitadaPorEntorno(env: Env = process.env): boolean {
  if (env.LUNA_ENABLED !== '1') return false;
  if (env.VERCEL_ENV === 'production' && env.LUNA_ALLOW_PRODUCTION !== '1') return false;
  return true;
}

/** Presupuesto diario máximo en Preview (USD): estricto por defecto. Sobrescribible con LUNA_PREVIEW_BUDGET_USD (>= 0). */
export const PRESUPUESTO_PREVIEW_USD = 0.05;

/**
 * Configuración efectiva del plan. Un modelo pedido por entorno (LUNA_MODEL_ID / LUNA_MODEL_ID_<PLAN>) solo se acepta
 * si tiene tarifa registrada; si no, se usa el modelo por defecto y `modeloRechazado` lo informa.
 */
export function resolverConfigPlan(plan: PlanLuna, env: Env = process.env): ConfigPlanLuna & { modeloRechazado?: string } {
  const base = BASE[plan];
  const sufijo = ENV_PLAN[plan];
  const pedido = (env[`LUNA_MODEL_ID_${sufijo}`] ?? env.LUNA_MODEL_ID ?? '').trim();
  const modelId = pedido !== '' && MODELOS_CON_TARIFA.has(pedido) ? pedido : DEFAULT_MODEL_ID;
  const presupuesto = numeroEnv(env[`LUNA_BUDGET_USD_${sufijo}`], base.presupuestoDiarioUsd, { permitirCero: true });
  return {
    plan,
    ...base,
    modelId,
    // En Preview el tope diario nunca supera el presupuesto estricto de Preview, aunque el del plan sea mayor.
    presupuestoDiarioUsd: env.VERCEL_ENV === 'preview' ? Math.min(presupuesto, numeroEnv(env.LUNA_PREVIEW_BUDGET_USD, PRESUPUESTO_PREVIEW_USD, { permitirCero: true })) : presupuesto,
    maxCostoConsultaUsd: numeroEnv(env[`LUNA_MAX_QUERY_USD_${sufijo}`], base.maxCostoConsultaUsd),
    ...(pedido !== '' && modelId !== pedido ? { modeloRechazado: pedido } : {}),
  };
}
