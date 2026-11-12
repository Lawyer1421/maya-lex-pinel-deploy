/**
 * lib/stripe/apply.ts — única puerta de escritura de Stripe hacia subscriptions: delega en la función SQL atómica stripe_apply_event
 * (supabase/migrations/20261112000000_stripe_billing_foundation.sql), igual que lib/paypal/state-machine.ts con paypal_apply_event.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SubscriptionTier } from '@/lib/paypal/plans';
import type { SubscriptionStatus } from '@/lib/paypal/state-machine';

export interface ResultadoAplicarStripe {
  applied: boolean;
  reason: string;
  resultingStatus: string;
  resultingTier: string;
  resultingSubId: string;
}

export async function aplicarEventoStripe(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  p: { userIdentifier: string; customerId: string | null; subscriptionId: string; email: string | null; tier: SubscriptionTier; nuevoEstado: SubscriptionStatus; tipoEvento: string },
): Promise<ResultadoAplicarStripe> {
  const { data, error } = await supabase.rpc('stripe_apply_event', {
    p_user_identifier: p.userIdentifier,
    p_customer_id: p.customerId,
    p_subscription_id: p.subscriptionId,
    p_email: p.email,
    p_tier: p.tier,
    p_new_status: p.nuevoEstado,
    p_event_type: p.tipoEvento,
  });
  if (error) throw error;
  const r = data as { applied: boolean; reason: string; resulting_status: string; resulting_tier: string; resulting_sub_id: string };
  return { applied: r.applied, reason: r.reason, resultingStatus: r.resulting_status, resultingTier: r.resulting_tier, resultingSubId: r.resulting_sub_id };
}
