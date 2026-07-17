/**
 * lib/paypal/state-machine.ts
 *
 * Máquina de estados de suscripciones PayPal — sprint de emergencia.
 *
 * Reemplaza el patrón previo (SELECT status → comparar en TypeScript →
 * UPSERT separado) por una única llamada atómica a la función SQL
 * paypal_apply_event (supabase/migrations/20260717010000_paypal_state_machine.sql), que hace el
 * SELECT ... FOR UPDATE, la decisión y la escritura dentro de la misma
 * transacción — sin ventana de carrera entre dos webhooks concurrentes
 * para el mismo usuario.
 *
 * También centraliza:
 *   - verifyCanonicalSubscription(): confirma contra PayPal (no solo
 *     contra el payload del webhook) que una suscripción está ACTIVE,
 *     pertenece al usuario esperado (custom_id) y usa un plan permitido.
 *   - applySubscriptionDowngrade(): la contraparte atómica para
 *     CANCELLED/EXPIRED/SUSPENDED (paypal_apply_downgrade).
 *
 * Desde 20260717020000_paypal_event_id_and_atomic_access.sql, la propia
 * RPC paypal_apply_event/paypal_apply_downgrade escribe subscriptions +
 * queries_log + auditoría (billing_state_transitions) en LA MISMA
 * transacción — ya no existe una función TypeScript separada
 * (syncLegacyPaidAccess) para queries_log, porque esa segunda llamada
 * era exactamente la ventana no-atómica que permitía el estado
 * "subscriptions=active, queries_log=free" ante una caída a mitad de
 * camino.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getAccessToken, getPayPalBaseUrl } from './client';
import { isPlanIdValidForTier, type SubscriptionTier } from './plans';

export type SubscriptionStatus = 'trialing' | 'active' | 'cancelled' | 'past_due';

// ── custom_id ────────────────────────────────────────────────────────────

/**
 * Desempaqueta el custom_id enviado por create-subscription.
 *
 * Formato nuevo (JSON): {"p":"pro","u":"email:x@y.com"} — p=plan, u=user_identifier.
 * Formato legado (string plano): "pro" | "academico" — sin uid.
 */
export function parseCustomId(customId: string | undefined | null): {
  tier: SubscriptionTier;
  uid:  string | null;
} {
  if (!customId) return { tier: 'pro', uid: null };

  try {
    const parsed = JSON.parse(customId) as { p?: string; u?: string };
    if (parsed && typeof parsed === 'object') {
      return {
        tier: parsed.p === 'academico' ? 'academico' : 'pro',
        uid:  typeof parsed.u === 'string' && parsed.u.trim() ? parsed.u.trim() : null,
      };
    }
  } catch {
    // No es JSON → formato legado de suscripciones creadas antes del fix
  }
  return { tier: customId === 'academico' ? 'academico' : 'pro', uid: null };
}

/**
 * Fallback LEGADO — deliberadamente NO normaliza (trim/lowercase) el
 * correo, a diferencia de buildUserIdentifierFromEmail() en
 * lib/rate-limit.ts (que sí lo hace y es la que deben usar todos los
 * puntos de entrada NUEVOS). Esta función solo existe para reconstruir
 * el identificador exactamente como lo habría producido el sistema
 * ANTES del fix de custom_id — cambiarla ahora podría dejar de
 * coincidir con filas ya existentes en subscriptions/queries_log que se
 * crearon sin normalizar.
 */
export function buildUserIdentifier(
  email:   string | null,
  payerId: string | null,
  subId:   string
): string {
  if (email) return `email:${email}`;
  if (payerId) return `paypal:${payerId}`;
  return `sub:${subId}`;
}

/**
 * Resuelve el user_identifier definitivo para un evento de suscripción.
 * Prioridad: uid del custom_id → fila 'pending' por paypal_sub_id →
 * identificador derivado de PayPal (solo suscripciones legadas).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resolverUserIdentifier(
  supabase: SupabaseClient<any>,
  uid:      string | null,
  subId:    string,
  email:    string | null,
  payerId:  string | null
): Promise<string> {
  if (uid) return uid;

  if (subId) {
    const { data } = await supabase
      .from('subscriptions')
      .select('user_identifier')
      .eq('paypal_sub_id', subId)
      .maybeSingle();
    if (data?.user_identifier) return data.user_identifier;
  }

  console.warn(
    `[PayPal State Machine] custom_id sin uid y sin fila pending — usando fallback legado | sub=${subId}`
  );
  return buildUserIdentifier(email, payerId, subId);
}

// ── Verificación canónica contra PayPal ─────────────────────────────────

export type CanonicalCheckReason =
  | 'verified_active'
  | 'not_active'
  | 'plan_mismatch'
  | 'custom_id_mismatch'
  | 'sub_id_mismatch'
  | 'not_found'
  | 'paypal_error';

export interface CanonicalCheckResult {
  ok: boolean;
  reason: CanonicalCheckReason;
  status?: string;
}

interface PayPalSubscriptionResource {
  id?:         string;
  status?:     string;
  plan_id?:    string;
  custom_id?:  string;
}

/**
 * Confirma contra el recurso canónico de PayPal (no contra el payload del
 * webhook, que puede estar desactualizado o ser reenviado) que:
 *   - la suscripción existe y su id coincide exactamente;
 *   - status === ACTIVE;
 *   - plan_id es uno de los configurados para el tier esperado;
 *   - custom_id.u coincide con el usuario que se va a acreditar.
 *
 * No confía únicamente en los datos del webhook para conceder acceso.
 */
export async function verifyCanonicalSubscription(params: {
  paypalSubId:  string;
  expectedUid:  string;
  expectedTier: SubscriptionTier;
}): Promise<CanonicalCheckResult> {
  const { paypalSubId, expectedUid, expectedTier } = params;
  if (!paypalSubId) return { ok: false, reason: 'not_found' };

  let res: Response;
  try {
    const accessToken = await getAccessToken();
    res = await fetch(`${getPayPalBaseUrl()}/v1/billing/subscriptions/${paypalSubId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
  } catch (err) {
    console.error(
      '[PayPal State Machine] Error consultando suscripción canónica:',
      err instanceof Error ? err.message : err
    );
    return { ok: false, reason: 'paypal_error' };
  }

  if (res.status === 404) return { ok: false, reason: 'not_found' };
  if (!res.ok) {
    console.error(`[PayPal State Machine] GET subscription HTTP ${res.status} | sub=${paypalSubId}`);
    return { ok: false, reason: 'paypal_error' };
  }

  const data = await res.json() as PayPalSubscriptionResource;

  if (data.id !== paypalSubId) {
    return { ok: false, reason: 'sub_id_mismatch', status: data.status };
  }
  if (data.status !== 'ACTIVE') {
    return { ok: false, reason: 'not_active', status: data.status };
  }
  if (!isPlanIdValidForTier(data.plan_id, expectedTier)) {
    return { ok: false, reason: 'plan_mismatch', status: data.status };
  }

  const { uid } = parseCustomId(data.custom_id);
  if (!uid || uid !== expectedUid) {
    return { ok: false, reason: 'custom_id_mismatch', status: data.status };
  }

  return { ok: true, reason: 'verified_active', status: data.status };
}

// ── Transición atómica de subscriptions ─────────────────────────────────

export type ApplyEventReason =
  | 'created'
  | 'updated'
  | 'ignored_no_downgrade'
  | 'duplicate_active_subscription'
  | 'reactivated_new_subscription'
  | 'new_attempt_registered'
  | 'stale_event_ignored';

export interface ApplyEventParams {
  userIdentifier:  string;
  paypalSubId:     string;
  paypalPayerId:   string | null;
  email:           string | null;
  tier:            SubscriptionTier;
  newStatus:       SubscriptionStatus;
  /** true SOLO si ya se verificó con verifyCanonicalSubscription() */
  grantsAccess:    boolean;
  eventType:       string;
}

export interface ApplyEventResult {
  applied:          boolean;
  reason:           ApplyEventReason;
  resultingStatus:  string;
  resultingTier:    string;
  resultingSubId:   string;
}

/**
 * Única puerta de escritura hacia subscriptions para eventos que otorgan
 * o intentan otorgar acceso (CREATED, ACTIVATED, PAYMENT.SALE.COMPLETED
 * verificado). Delega el check-y-escritura atómico a la función SQL
 * paypal_apply_event — ver ese archivo para la matriz completa de casos.
 */
export async function applySubscriptionEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  params: ApplyEventParams
): Promise<ApplyEventResult> {
  const { data, error } = await supabase.rpc('paypal_apply_event', {
    p_user_identifier:  params.userIdentifier,
    p_paypal_sub_id:    params.paypalSubId,
    p_paypal_payer_id:  params.paypalPayerId,
    p_email:            params.email,
    p_tier:             params.tier,
    p_new_status:       params.newStatus,
    p_grants_access:    params.grantsAccess,
    p_event_type:       params.eventType,
  });

  if (error) throw error;

  const result = data as {
    applied:           boolean;
    reason:            ApplyEventReason;
    resulting_status:  string;
    resulting_tier:    string;
    resulting_sub_id:  string;
  };

  return {
    applied:          result.applied,
    reason:           result.reason,
    resultingStatus:  result.resulting_status,
    resultingTier:    result.resulting_tier,
    resultingSubId:   result.resulting_sub_id,
  };
}

// ── Transición atómica de degradación (CANCELLED/EXPIRED/SUSPENDED) ─────

export interface ApplyDowngradeParams {
  paypalSubId: string;
  newStatus:   'cancelled';
  eventType:   string;
}

export interface ApplyDowngradeResult {
  applied:          boolean;
  reason:           string;
  resultingStatus?: string;
  resultingTier?:   string;
  resultingSubId?:  string;
  userIdentifier?:  string;
}

/**
 * Degrada subscriptions.status/tier Y queries_log.tier a 'free' en una
 * sola transacción (paypal_apply_downgrade), con auditoría. Reemplaza el
 * patrón anterior de dos UPDATE separados desde la API.
 */
export async function applySubscriptionDowngrade(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  params: ApplyDowngradeParams
): Promise<ApplyDowngradeResult> {
  const { data, error } = await supabase.rpc('paypal_apply_downgrade', {
    p_paypal_sub_id: params.paypalSubId,
    p_new_status:    params.newStatus,
    p_event_type:    params.eventType,
  });

  if (error) throw error;

  const result = data as {
    applied:           boolean;
    reason:            string;
    resulting_status?: string;
    resulting_tier?:   string;
    resulting_sub_id?: string;
    user_identifier?:  string;
  };

  return {
    applied:         result.applied,
    reason:          result.reason,
    resultingStatus: result.resulting_status,
    resultingTier:   result.resulting_tier,
    resultingSubId:  result.resulting_sub_id,
    userIdentifier:  result.user_identifier,
  };
}
