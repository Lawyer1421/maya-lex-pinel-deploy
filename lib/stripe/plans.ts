/**
 * lib/stripe/plans.ts — catálogo de precios de Stripe por tier. Única fuente de verdad, como lib/paypal/plans.ts.
 * Los ids de precio vienen de variables de entorno (no son secretos). Un precio que no esté en el catálogo nunca concede acceso.
 */
import type { SubscriptionTier } from '@/lib/paypal/plans';

export function stripePriceIds(): Record<SubscriptionTier, string | undefined> {
  return {
    pro: process.env.STRIPE_PRICE_PRO?.trim() || undefined,
    academico: process.env.STRIPE_PRICE_ACADEMICO?.trim() || undefined,
  };
}

/** Exige que el precio cobrado sea EXACTAMENTE el configurado para el tier que la suscripción declara. No infiere el tier del precio. */
export function isStripePriceValidForTier(priceId: string | null | undefined, tier: SubscriptionTier): boolean {
  if (!priceId) return false;
  return stripePriceIds()[tier] === priceId;
}
