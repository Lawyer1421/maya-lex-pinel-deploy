/**
 * POST /api/stripe/cancel-subscription — el usuario cancela su propia suscripción de Stripe desde /cuenta. APAGADA por defecto
 * (lib/stripe/config.ts). Par de /api/paypal/cancel-subscription, con la misma semántica:
 *
 *  - Identidad: SOLO la sesión (cookie de Supabase validada en el servidor), nunca el cuerpo. El id de suscripción sale de la fila del
 *    propio usuario (provider='stripe'); jamás se acepta uno del cliente.
 *  - Cancelación INMEDIATA en Stripe (DELETE /v1/subscriptions/:id): sin cobros futuros y el acceso se revoca en este momento, igual que
 *    con PayPal (decisión del Titular, 2026-11-15; período de gracia = mejora futura, ver lib/billing/proveedor.ts).
 *  - Estado canónico: tras cancelar se vuelve a leer la suscripción en Stripe; solo si Stripe la reporta cancelada se sincroniza la fila
 *    con stripe_apply_event (la misma puerta atómica que el webhook). Si la sincronización local falla, el webhook
 *    customer.subscription.deleted la completa.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-ssr';
import { createServerSupabaseClient } from '@/lib/supabase';
import { buildUserIdentifierFromEmail } from '@/lib/rate-limit';
import { isKnownTier } from '@/lib/paypal/plans';
import { puedeCancelar } from '@/lib/billing/proveedor';
import { stripeHabilitado } from '@/lib/stripe/config';
import { cancelarSuscripcionStripe, obtenerSuscripcion } from '@/lib/stripe/client';
import { mapearEstadoStripe } from '@/lib/stripe/estados';
import { aplicarEventoStripe } from '@/lib/stripe/apply';

const sanitizar = (err: unknown) => (err instanceof Error ? err.message : 'error').slice(0, 200);

export async function POST(req: NextRequest) {
  void req;
  if (!stripeHabilitado()) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const supabaseAuth = await createSupabaseServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'Sesión requerida' }, { status: 401 });

  const userIdentifier = buildUserIdentifierFromEmail(user.email);
  const supabase = createServerSupabaseClient();
  const { data: fila } = await supabase
    .from('subscriptions')
    .select('provider, provider_subscription_id, provider_customer_id, status, tier')
    .eq('user_identifier', userIdentifier)
    .maybeSingle();

  if (fila?.provider !== 'stripe' || !fila.provider_subscription_id) {
    return NextResponse.json({ error: 'No tiene una suscripción con tarjeta vinculada a su cuenta.' }, { status: 404 });
  }
  if (!puedeCancelar(fila)) {
    return NextResponse.json(
      { error: 'Su suscripción no está activa — no hay ningún cobro recurrente que cancelar.', status: fila.status },
      { status: 409 },
    );
  }

  const subId: string = fila.provider_subscription_id;
  let cancelada = false;
  try {
    // Si Stripe ya la tenía cancelada, el DELETE falla; lo que decide es el estado releído, no la respuesta del DELETE.
    try { await cancelarSuscripcionStripe(subId); } catch (err) { console.warn('[Stripe Cancel] DELETE no confirmado:', sanitizar(err)); }
    cancelada = mapearEstadoStripe((await obtenerSuscripcion(subId)).status) === 'cancelled';
  } catch (err) {
    console.error('[Stripe Cancel] No se pudo consultar Stripe:', sanitizar(err));
    return NextResponse.json({ error: 'No pudimos comunicarnos con el procesador de pagos. Intente de nuevo en unos minutos.' }, { status: 502 });
  }
  if (!cancelada) {
    return NextResponse.json({ error: 'El procesador de pagos no confirmó la cancelación. Intente de nuevo o contáctenos.' }, { status: 502 });
  }

  // La cancelación en Stripe ya es real. Un fallo aquí es de sincronización, no de la cancelación: el webhook la completa.
  if (isKnownTier(fila.tier)) {
    try {
      const r = await aplicarEventoStripe(supabase, {
        userIdentifier,
        customerId: fila.provider_customer_id ?? null,
        subscriptionId: subId,
        email: user.email.trim().toLowerCase(),
        tier: fila.tier,
        nuevoEstado: 'cancelled',
        tipoEvento: 'USER_INITIATED_CANCEL',
      });
      console.log(`[Stripe Cancel] Suscripción cancelada por el usuario | sub=${subId} | ${r.reason}`);
    } catch (err) {
      console.error('[Stripe Cancel] Cancelada en Stripe pero falló la sincronización local:', sanitizar(err));
    }
  }

  return NextResponse.json({ cancelado: true });
}
