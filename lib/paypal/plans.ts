/**
 * Catálogo de planes PayPal permitidos.
 *
 * Única fuente de verdad para "qué plan_id de PayPal corresponde a qué
 * tier interno". create-subscription lo usa para construir la
 * suscripción; el webhook lo usa para RECHAZAR un plan_id que PayPal
 * reporte pero que no esté en este catálogo (evita conceder acceso a un
 * plan que nunca configuramos).
 */

export type SubscriptionTier = 'pro' | 'academico';

export const PLAN_IDS: Record<SubscriptionTier, string | undefined> = {
  pro:       process.env.PAYPAL_PRO_PLAN_ID,
  academico: process.env.PAYPAL_ACADEMICO_PLAN_ID,
};

export function isKnownTier(tier: string): tier is SubscriptionTier {
  return tier === 'pro' || tier === 'academico';
}

export function planIdFor(tier: SubscriptionTier): string | undefined {
  return PLAN_IDS[tier];
}

/**
 * Verifica que un plan_id devuelto por PayPal corresponde exactamente al
 * plan_id configurado para el tier esperado. No infiere el tier a partir
 * del plan_id (evitar ambigüedad) — exige que el llamador ya sepa qué
 * tier espera (del custom_id) y solo confirma que PayPal coincide.
 */
export function isPlanIdValidForTier(planId: string | undefined, tier: SubscriptionTier): boolean {
  if (!planId) return false;
  return planId === PLAN_IDS[tier];
}
