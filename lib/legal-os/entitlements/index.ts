/**
 * lib/legal-os/entitlements/index.ts
 * Modelo PURO de capacidades por plan (Explorar / Académico / Premium) para Legal OS.
 *
 * Regla: solo se escribe un valor cuando el repositorio ya lo define. Donde el repo no define nada el valor es `null` =
 * «INDEFINIDO — lo decide Fredy». Aquí no hay precios ni límites inventados, y no se toca facturación (PayPal/Stripe) ni los
 * módulos de acceso existentes (lib/rate-limit.ts, lib/exequatur/access.ts, lib/mcp/access.ts).
 *
 * Correspondencia con los tiers técnicos de lib/rate-limit.ts (UserTier): free = EXPLORAR, academico = ACADEMICO, pro = PREMIUM.
 * El tier técnico `admin` es acceso interno y no es un plan comercial.
 */
import type { SubscriptionTier } from '../types';

export const CAPACIDADES = ['daily_questions', 'deep_research', 'document_analysis', 'legal_drafting', 'jurisprudence', 'history', 'exports', 'advanced_skills'] as const;
export type Capacidad = (typeof CAPACIDADES)[number];

/**
 * - número: límite diario definido en el repo (lib/rate-limit.ts, valores por defecto; sobreescribibles por variable de entorno);
 * - true / false: permitido / no permitido, SOLO si el repo lo define;
 * - null: INDEFINIDO — decide Fredy.
 */
export type ValorCapacidad = number | boolean | null;

/** Fuente de cada valor definido, para auditoría. */
export interface Entrada {
  valor: ValorCapacidad;
  fuente: string | null;
}

const INDEFINIDO: Entrada = { valor: null, fuente: null };
const RL = 'lib/rate-limit.ts (FREE_LIMIT_DEFAULT) y lib/plan-limits.ts (Académico 20/día, Premium 60/día); una prueba verifica que coinciden';

export const MATRIZ: Readonly<Record<SubscriptionTier, Readonly<Record<Capacidad, Entrada>>>> = Object.freeze({
  EXPLORAR: Object.freeze({
    daily_questions: { valor: 1, fuente: RL },
    deep_research: INDEFINIDO, document_analysis: INDEFINIDO, legal_drafting: INDEFINIDO, jurisprudence: INDEFINIDO, history: INDEFINIDO, exports: INDEFINIDO, advanced_skills: INDEFINIDO,
  }),
  ACADEMICO: Object.freeze({
    daily_questions: { valor: 20, fuente: RL },
    deep_research: INDEFINIDO, document_analysis: INDEFINIDO, legal_drafting: INDEFINIDO, jurisprudence: INDEFINIDO, history: INDEFINIDO, exports: INDEFINIDO, advanced_skills: INDEFINIDO,
  }),
  PREMIUM: Object.freeze({
    daily_questions: { valor: 60, fuente: RL },
    deep_research: INDEFINIDO, document_analysis: INDEFINIDO, legal_drafting: INDEFINIDO, jurisprudence: INDEFINIDO, history: INDEFINIDO, exports: INDEFINIDO, advanced_skills: INDEFINIDO,
  }),
});

/** Límite/valor de una capacidad, o null si el repo no lo define. */
export function limite(tier: SubscriptionTier, capacidad: Capacidad): ValorCapacidad {
  return MATRIZ[tier][capacidad].valor;
}

/**
 * ¿Puede el plan usar la capacidad? Fail-closed: lo INDEFINIDO se trata como NO permitido hasta que Fredy lo defina.
 * Un número cuenta como permitido si es > 0.
 */
export function puede(tier: SubscriptionTier, capacidad: Capacidad): boolean {
  const v = limite(tier, capacidad);
  if (typeof v === 'number') return v > 0;
  return v === true;
}

/** Capacidades que siguen sin definir (la lista de decisiones pendientes de Fredy). */
export function indefinidas(tier?: SubscriptionTier): Array<{ tier: SubscriptionTier; capacidad: Capacidad }> {
  const tiers: SubscriptionTier[] = tier ? [tier] : ['EXPLORAR', 'ACADEMICO', 'PREMIUM'];
  return tiers.flatMap((t) => CAPACIDADES.filter((c) => MATRIZ[t][c].valor === null).map((capacidad) => ({ tier: t, capacidad })));
}

/** Mapeo al tier técnico de lib/rate-limit.ts. */
export const TIER_TECNICO: Readonly<Record<SubscriptionTier, 'free' | 'academico' | 'pro'>> = Object.freeze({ EXPLORAR: 'free', ACADEMICO: 'academico', PREMIUM: 'pro' });

/**
 * Legal OS: ¿qué plan puede usar el rol de modelo DEEP? Sigue la política de modelo (policies/model-policy.ts: deepPermitidoEn),
 * valores PROPUESTOS por ingeniería. No es una decisión comercial: `deep_research` sigue INDEFINIDO.
 */
export function rolDeepPermitido(tier: SubscriptionTier): boolean {
  return tier === 'ACADEMICO' || tier === 'PREMIUM';
}

/** Skills servibles a usuarios: solo ACTIVE (revisadas por el CLO). Hoy todas son DRAFT, así que ninguna se sirve. */
export const ESTADOS_DE_SKILL_SERVIBLES: readonly 'ACTIVE'[] = ['ACTIVE'];
