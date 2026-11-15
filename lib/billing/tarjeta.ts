/**
 * lib/billing/tarjeta.ts — ¿se ofrece pago con tarjeta (Stripe) para un plan? SOLO servidor: lee variables de entorno.
 *
 * Exige el interruptor completo de Stripe (STRIPE_ENABLED=1 y ambas claves, lib/stripe/config.ts) Y un precio configurado para ese tier.
 * Si algo falta, la interfaz solo muestra PayPal, como antes de Stripe.
 */
import type { SubscriptionTier } from '@/lib/paypal/plans';
import { stripeHabilitado } from '@/lib/stripe/config';
import { stripePriceIds } from '@/lib/stripe/plans';

export function pagoConTarjetaDisponible(tier: SubscriptionTier | null | undefined): boolean {
  if (!tier || !stripeHabilitado()) return false;
  return Boolean(stripePriceIds()[tier]);
}
