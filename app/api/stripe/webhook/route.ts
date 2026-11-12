/**
 * POST /api/stripe/webhook — eventos de Stripe. APAGADO por defecto (lib/stripe/config.ts).
 *
 *  1. Firma: Stripe-Signature verificada sobre el cuerpo CRUDO antes de leer nada (lib/stripe/firma.ts). Firma inválida → 400, sin tocar la BD.
 *  2. Idempotencia: stripe_events, clave = event.id. Un reintento de un evento ya procesado → 200 duplicate.
 *  3. Estado canónico: nunca se confía en el objeto del evento; se vuelve a leer la suscripción en la API de Stripe.
 *  4. Identidad y plan: user_identifier y tier de la metadata que puso NUESTRO servidor al crear el Checkout; el precio cobrado debe ser
 *     exactamente el del catálogo para ese tier. Si no, el evento se rechaza (200, sin reintento) y no concede nada.
 *  5. Escritura: stripe_apply_event (atómica; misma auditoría y mismo espejo de acceso en queries_log que PayPal).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { isKnownTier } from '@/lib/paypal/plans';
import { stripeHabilitado } from '@/lib/stripe/config';
import { verificarFirmaStripe } from '@/lib/stripe/firma';
import { obtenerSuscripcion, type SuscripcionStripe } from '@/lib/stripe/client';
import { mapearEstadoStripe } from '@/lib/stripe/estados';
import { isStripePriceValidForTier } from '@/lib/stripe/plans';
import { aplicarEventoStripe } from '@/lib/stripe/apply';

const EVENTOS_DE_SUSCRIPCION = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]);

interface EventoStripe {
  id?: string;
  type?: string;
  created?: number;
  data?: { object?: { id?: string; object?: string; mode?: string; subscription?: string | { id?: string } | null } };
}

function idSuscripcionDelEvento(e: EventoStripe): string | null {
  const o = e.data?.object;
  if (!o) return null;
  if (e.type === 'checkout.session.completed') {
    if (o.mode !== 'subscription') return null;
    return typeof o.subscription === 'string' ? o.subscription : o.subscription?.id ?? null;
  }
  return o.object === 'subscription' && typeof o.id === 'string' ? o.id : null;
}

const sanitizar = (err: unknown) => (err instanceof Error ? err.message : 'error').slice(0, 200);

export async function POST(req: NextRequest) {
  if (!stripeHabilitado()) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const cuerpo = await req.text();
  if (!verificarFirmaStripe(cuerpo, req.headers.get('stripe-signature'), process.env.STRIPE_WEBHOOK_SECRET!.trim())) {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 400 });
  }

  let evento: EventoStripe;
  try {
    evento = JSON.parse(cuerpo) as EventoStripe;
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  if (!evento.id || !evento.type) return NextResponse.json({ error: 'Evento incompleto' }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const marcar = async (estado: string, error?: string) => {
    const { error: e } = await supabase
      .from('stripe_events')
      .update({ processing_status: estado, error_message_sanitized: error ?? null })
      .eq('event_id', evento.id!);
    if (e) console.error('[Stripe Webhook] No se pudo actualizar processing_status');
  };

  const { error: errInsert } = await supabase.from('stripe_events').insert({
    event_id: evento.id,
    event_type: evento.type,
    provider_created_at: typeof evento.created === 'number' ? new Date(evento.created * 1000).toISOString() : null,
    processing_status: 'processing',
  });
  if (errInsert) {
    if (errInsert.code !== '23505') {
      console.error('[Stripe Webhook] No se pudo registrar el evento');
      return NextResponse.json({ error: 'No disponible' }, { status: 500 });
    }
    const { data: previo } = await supabase.from('stripe_events').select('processing_status').eq('event_id', evento.id).maybeSingle();
    if (previo && ['processed', 'ignored', 'rejected'].includes(previo.processing_status)) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    // Un intento anterior falló o quedó a medias: se reprocesa (stripe_apply_event es idempotente para el mismo estado).
  }

  if (!EVENTOS_DE_SUSCRIPCION.has(evento.type)) {
    await marcar('ignored');
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    const subId = idSuscripcionDelEvento(evento);
    if (!subId) {
      await marcar('ignored');
      return NextResponse.json({ received: true, ignored: true });
    }
    const sub: SuscripcionStripe = await obtenerSuscripcion(subId);
    const userIdentifier = sub.metadata?.user_identifier ?? '';
    const tier = sub.metadata?.tier ?? '';
    const precio = sub.items?.data?.[0]?.price?.id ?? null;
    if (!userIdentifier.startsWith('email:') || !isKnownTier(tier) || !isStripePriceValidForTier(precio, tier)) {
      await marcar('rejected', 'metadata o precio fuera del catálogo');
      return NextResponse.json({ received: true, rejected: true });
    }
    const nuevoEstado = mapearEstadoStripe(sub.status);
    if (!nuevoEstado) {
      await marcar('ignored');
      return NextResponse.json({ received: true, ignored: true });
    }
    const r = await aplicarEventoStripe(supabase, {
      userIdentifier,
      customerId: sub.customer,
      subscriptionId: sub.id,
      email: userIdentifier.slice('email:'.length),
      tier,
      nuevoEstado,
      tipoEvento: evento.type,
    });
    await marcar('processed');
    return NextResponse.json({ received: true, applied: r.applied, reason: r.reason });
  } catch (err) {
    await marcar('failed', sanitizar(err));
    console.error('[Stripe Webhook] Error al procesar el evento:', sanitizar(err));
    return NextResponse.json({ error: 'Error al procesar' }, { status: 500 });
  }
}
