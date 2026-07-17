/**
 * lib/paypal/state-machine.ts
 *
 * Máquina de estados de suscripciones PayPal — sprint de emergencia.
 *
 * Reemplaza el patrón previo (SELECT status → comparar en TypeScript →
 * UPSERT separado) por una única llamada atómica a la función SQL
 * paypal_apply_event (supabase/paypal_state_machine.sql), que hace el
 * SELECT ... FOR UPDATE, la decisión y la escritura dentro de la misma
 * transacción — sin ventana de carrera entre dos webhooks concurrentes
 * para el mismo usuario.
 *
 * También centraliza:
 *   - verifyCanonicalSubscription(): confirma contra PayPal (no solo
 *     contra el payload del webhook) que una suscripción está ACTIVE,
 *     pertenece al usuario esperado (custom_id) y usa un plan permitido.
 *   - syncLegacyPaidAccess(): único punto que escribe queries_log (lo
 *     que lee lib/rate-limit.ts). Rechaza cualquier status que no sea
 *     'active' — CREATED/trialing/pending JAMÁS deben llegar aquí.
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

// ── Sincronización del gate de acceso legado (queries_log) ──────────────

/** Únicos status que autorizan escribir queries_log.tier. */
const ACCESS_GRANTING_STATUSES: ReadonlySet<string> = new Set(['active']);

/**
 * Sincroniza queries_log — la ÚNICA tabla que lee lib/rate-limit.ts para
 * decidir si un usuario puede consultar el chat.
 *
 * Rechaza (lanza) cualquier verifiedStatus que no otorgue acceso. Esto es
 * intencional: CREATED/APPROVAL_PENDING/trialing/pending NUNCA deben
 * llegar a esta función. Es la defensa en profundidad que evita que un
 * futuro cambio en un handler del webhook vuelva a conceder acceso sin
 * verificación real, incluso si alguien olvida el check en el caller.
 */
export async function syncLegacyPaidAccess(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  params: {
    userIdentifier:  string;
    tier:            SubscriptionTier;
    verifiedStatus:  string;
  }
): Promise<void> {
  if (!ACCESS_GRANTING_STATUSES.has(params.verifiedStatus)) {
    throw new Error(
      `[PayPal State Machine] syncLegacyPaidAccess rechazado: status '${params.verifiedStatus}' ` +
      `no otorga acceso (solo 'active' está permitido) | user=${params.userIdentifier}`
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const { error } = await supabase
    .from('queries_log')
    .upsert(
      {
        user_identifier: params.userIdentifier,
        query_date:      today,
        query_count:     0,
        tier:            params.tier,
        updated_at:      new Date().toISOString(),
      },
      { onConflict: 'user_identifier,query_date', ignoreDuplicates: false }
    );
  if (error) throw error;
}
