/**
 * POST /api/paypal/cancel-subscription
 *
 * Autogestión: el usuario cancela su propia suscripción activa desde
 * /cuenta. Llama al endpoint canónico de cancelación de PayPal (detiene
 * el cobro recurrente futuro) y, solo si PayPal confirma, sincroniza
 * subscriptions/queries_log mediante applySubscriptionDowngrade — la
 * MISMA función atómica que ya usa el webhook para
 * CANCELLED/EXPIRED/SUSPENDED, sin duplicar lógica de transición.
 *
 * Nota de diseño importante: el acceso se revoca de inmediato, no al
 * final del período ya pagado. Esta plataforma nunca ha poblado
 * current_period_end (la columna existe en el esquema pero ningún flujo
 * escribe en ella) y el resto del sistema, deliberadamente, nunca
 * concede acceso sin un estado verificado vigente contra PayPal —
 * introducir una gracia post-cancelación requeriría rastrear esa fecha
 * y modificar resolveCurrentAccess (la única fuente de decisión de
 * acceso), fuera de alcance de este cambio.
 *
 * Seguridad:
 *   - El usuario sale ÚNICAMENTE de la sesión (cookie), nunca del body.
 *   - Solo puede cancelar la suscripción vinculada a su propio
 *     user_identifier — nunca acepta un paypal_sub_id del cliente.
 *   - Solo procede si el estado local es 'active' (evita llamar a
 *     PayPal para una suscripción que nunca se activó o ya terminó).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-ssr';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getAccessToken, getPayPalBaseUrl } from '@/lib/paypal/client';
import { applySubscriptionDowngrade } from '@/lib/paypal/state-machine';
import { buildUserIdentifierFromEmail } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  void req;
  const supabaseAuth = await createSupabaseServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Sesión requerida' }, { status: 401 });
  }

  const userIdentifier = buildUserIdentifierFromEmail(user.email);
  const supabase = createServerSupabaseClient();

  const { data: suscripcion } = await supabase
    .from('subscriptions')
    .select('paypal_sub_id, status, tier')
    .eq('user_identifier', userIdentifier)
    .maybeSingle();

  if (!suscripcion?.paypal_sub_id) {
    return NextResponse.json(
      { error: 'No tiene una suscripción vinculada a su cuenta.' },
      { status: 404 }
    );
  }

  if (suscripcion.status !== 'active') {
    return NextResponse.json(
      {
        error: 'Su suscripción no está activa — no hay ningún cobro recurrente que cancelar.',
        status: suscripcion.status,
      },
      { status: 409 }
    );
  }

  const subId = suscripcion.paypal_sub_id;

  let cancelRes: Response;
  try {
    const accessToken = await getAccessToken();
    cancelRes = await fetch(`${getPayPalBaseUrl()}/v1/billing/subscriptions/${subId}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: 'Cancelado por el usuario desde mayalexhn.com' }),
    });
  } catch (err) {
    console.error('[PayPal Cancel] Error de red al cancelar:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'No pudimos comunicarnos con PayPal. Intente de nuevo en unos minutos.' },
      { status: 502 }
    );
  }

  // PayPal devuelve 204 sin cuerpo en éxito. 422 (SUBSCRIPTION_STATUS_INVALID)
  // significa que PayPal ya la tenía como no cancelable (cancelada/expirada
  // del lado de PayPal aunque localmente dijera 'active') -- se trata igual
  // que éxito: el resultado que importa (sin cobro futuro) ya es cierto.
  if (!cancelRes.ok && cancelRes.status !== 422) {
    const errBody = await cancelRes.text().catch(() => '');
    console.error(`[PayPal Cancel] HTTP ${cancelRes.status} | sub=${subId} | ${errBody.slice(0, 200)}`);
    return NextResponse.json(
      { error: 'PayPal no pudo procesar la cancelación. Intente de nuevo o contáctenos.' },
      { status: 502 }
    );
  }

  try {
    const result = await applySubscriptionDowngrade(supabase, {
      paypalSubId: subId,
      newStatus: 'cancelled',
      eventType: 'USER_INITIATED_CANCEL',
    });
    console.log(`[PayPal Cancel] Suscripción cancelada por el usuario: ${userIdentifier} | sub=${subId} | ${result.reason}`);
  } catch (err) {
    // La cancelación en PayPal YA es real e irreversible en este punto -- un
    // fallo aquí es un problema de sincronización, no de la cancelación en
    // sí. El webhook BILLING.SUBSCRIPTION.CANCELLED que PayPal enviará de
    // todas formas terminará sincronizando el estado local.
    console.error(
      '[PayPal Cancel] Cancelado en PayPal pero falló la sincronización local:',
      err instanceof Error ? err.message : err
    );
  }

  return NextResponse.json({ cancelado: true });
}
