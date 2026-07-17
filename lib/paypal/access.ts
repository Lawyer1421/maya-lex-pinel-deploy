/**
 * lib/paypal/access.ts
 *
 * Adaptador temporal — única función que /cuenta y /api/chat deberían
 * consultar para saber "¿qué puede hacer este usuario ahora mismo?".
 *
 * Antes de este sprint, /cuenta y /api/chat tomaban decisiones con
 * criterios distintos: /cuenta mostraba subscriptions.tier con fallback a
 * queries_log.tier; /api/chat (vía lib/rate-limit.ts) leía SOLO
 * queries_log.tier. Eso permitía que ambos mostraran/decidieran cosas
 * contradictorias para el mismo usuario en el mismo instante.
 *
 * accessGranted/tier de esta función leen EXACTAMENTE la misma tabla y
 * columna que lib/rate-limit.ts (queries_log.tier) — es la única fuente
 * real de "puede usar el chat". subscriptions solo aporta el detalle de
 * FACTURACIÓN (status crudo, tier al que aspira mientras se verifica) para
 * que la UI pueda explicar POR QUÉ, nunca para decidir el acceso.
 *
 * Esto es un adaptador, no la solución definitiva: cuando exista la tabla
 * entitlements (sección 9 de la auditoría), esta función se reimplementa
 * internamente sobre esa tabla sin cambiar su firma pública.
 */

import { createServerSupabaseClient } from '@/lib/supabase';

export type AccessTier = 'free' | 'pro' | 'academico' | 'admin';
export type AccessSource = 'queries_log' | 'subscriptions' | 'none';
export type AccessReasonCode =
  | 'active_subscription'
  | 'billing_state_inconsistent'
  | 'verification_pending'
  | 'payment_failed'
  | 'cancelled'
  | 'no_subscription'
  | 'free_tier';

export interface CurrentAccess {
  /** true si el usuario puede consultar el chat con un tier de pago ahora mismo. */
  accessGranted:        boolean;
  /** Tier que REALMENTE gobierna el acceso — mismo valor que usa lib/rate-limit.ts. */
  tier:                 AccessTier;
  /** Status crudo de subscriptions, para mensajes de UI (nunca para decidir acceso). */
  subscriptionStatus:   string | null;
  /** Tier al que aspira mientras verificationPending=true (p.ej. 'pro' en trialing). */
  pendingTier:          'pro' | 'academico' | null;
  source:               AccessSource;
  verificationPending:  boolean;
  reasonCode:           AccessReasonCode;
}

export async function resolveCurrentAccess(userIdentifier: string): Promise<CurrentAccess> {
  const supabase = createServerSupabaseClient();
  const today = new Date().toISOString().split('T')[0];

  const [{ data: sub }, { data: usage }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('tier, status')
      .eq('user_identifier', userIdentifier)
      .maybeSingle(),
    supabase
      .from('queries_log')
      .select('tier')
      .eq('user_identifier', userIdentifier)
      .eq('query_date', today)
      .maybeSingle(),
  ]);

  const gateTier = (usage?.tier ?? 'free') as AccessTier;
  const accessGranted = gateTier === 'pro' || gateTier === 'academico' || gateTier === 'admin';

  const billingStatus = sub?.status ?? null;
  const billingTier   = sub?.tier === 'academico' ? 'academico' : sub?.tier === 'pro' ? 'pro' : null;

  // ── Precedencia exacta de fuentes ────────────────────────────────────
  // 1. accessGranted/tier: SIEMPRE queries_log — es la única fuente que
  //    decide si el usuario puede consultar el chat ahora mismo. Nunca se
  //    deriva de subscriptions.status, ni siquiera cuando subscriptions
  //    dice 'active' (ver caso billing_state_inconsistent abajo).
  // 2. subscriptionStatus/billingTier: SIEMPRE subscriptions — es la
  //    única fuente para explicar AL USUARIO por qué, nunca para decidir
  //    acceso. queries_log es un espejo legado del gate, no la fuente de
  //    facturación — nunca se usa para mostrar estado de facturación.
  // 3. Caso especial — billing_state_inconsistent: si subscriptions dice
  //    'active' (PayPal confirmó pago) pero queries_log todavía no
  //    refleja acceso (el webhook aún no sincronizó, o falló a mitad de
  //    camino), NUNCA se debe mostrar "Suscríbete" — sería pedirle a un
  //    cliente que ya pagó que pague de nuevo. Se fuerza
  //    verificationPending=true y reasonCode='billing_state_inconsistent'
  //    para que la UI muestre "verificando", nunca un paywall.
  const billingSaysPaid = billingStatus === 'active';
  const inconsistent = billingSaysPaid && !accessGranted;

  const verificationPending =
    inconsistent || (!accessGranted && (billingStatus === 'trialing' || billingStatus === 'pending'));

  let reasonCode: AccessReasonCode;
  if (accessGranted)                       reasonCode = 'active_subscription';
  else if (inconsistent)                   reasonCode = 'billing_state_inconsistent';
  else if (verificationPending)            reasonCode = 'verification_pending';
  else if (billingStatus === 'past_due')   reasonCode = 'payment_failed';
  else if (billingStatus === 'cancelled')  reasonCode = 'cancelled';
  else if (!sub)                           reasonCode = 'no_subscription';
  else                                      reasonCode = 'free_tier';

  return {
    accessGranted,
    tier: gateTier,
    subscriptionStatus: billingStatus,
    pendingTier: verificationPending ? billingTier : null,
    source: usage ? 'queries_log' : sub ? 'subscriptions' : 'none',
    verificationPending,
    reasonCode,
  };
}
