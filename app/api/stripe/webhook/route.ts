/**
 * POST /api/stripe/webhook
 * Maneja eventos de Stripe: pago exitoso, cancelación, fallo de cobro.
 *
 * Configura en Stripe Dashboard → Webhooks → Add endpoint:
 *   URL: https://tu-dominio.vercel.app/api/stripe/webhook
 *   Eventos: checkout.session.completed, customer.subscription.deleted,
 *            invoice.payment_failed, invoice.payment_succeeded
 */
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@/lib/supabase';

// IMPORTANTE: Next.js App Router requiere body raw para verificar firma Stripe
export const dynamic = 'force-dynamic';

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY no configurada');
  return new Stripe(key, { apiVersion: '2026-05-27.dahlia' });
}

async function upsertSubscription(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  data: {
    stripeCustomerId: string;
    stripeSubId: string;
    email: string | null;
    tier: 'free' | 'pro' | 'academico';
    status: 'active' | 'cancelled' | 'past_due';
    currentPeriodEnd: Date | null;
  }
) {
  const userIdentifier = data.email ? `email:${data.email}` : `stripe:${data.stripeCustomerId}`;

  await supabase
    .from('subscriptions')
    .upsert(
      {
        user_identifier:    userIdentifier,
        stripe_customer_id: data.stripeCustomerId,
        stripe_sub_id:      data.stripeSubId,
        tier:               data.tier,
        status:             data.status,
        current_period_end: data.currentPeriodEnd?.toISOString(),
        updated_at:         new Date().toISOString(),
      },
      { onConflict: 'stripe_customer_id' }
    );

  // Actualizar el rate limiting para reflejar el nuevo tier
  if (data.email) {
    const today = new Date().toISOString().split('T')[0];
    await supabase
      .from('queries_log')
      .upsert(
        {
          user_identifier: userIdentifier,
          query_date:      today,
          query_count:     0,
          tier:            data.status === 'active' ? data.tier : 'free',
          updated_at:      new Date().toISOString(),
        },
        { onConflict: 'user_identifier,query_date', ignoreDuplicates: false }
      );
  }
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Stripe Webhook] Firma inválida:', msg);
    return NextResponse.json({ error: `Firma inválida: ${msg}` }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const plan = session.metadata?.plan ?? 'pro';
        const tier = (plan === 'academico' ? 'academico' : 'pro') as 'pro' | 'academico';

        if (session.subscription && session.customer) {
          const stripe = getStripeClient();
          // Stripe v22: use type assertion for fields that changed between API versions
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
          await upsertSubscription(supabase, {
            stripeCustomerId: session.customer as string,
            stripeSubId:      session.subscription as string,
            email:            session.customer_email,
            tier,
            status:           'active',
            currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
          });
          console.log(`[Stripe Webhook] ✓ ${tier} activado para ${session.customer_email}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as unknown as { subscription?: string; customer?: string };
        if (invoice.subscription && invoice.customer) {
          // Renovación exitosa — mantener tier activo
          await supabase
            .from('subscriptions')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('stripe_customer_id', invoice.customer);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.customer) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('stripe_customer_id', invoice.customer as string);
          console.warn(`[Stripe Webhook] ⚠ Pago fallido para customer ${invoice.customer}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from('subscriptions')
          .update({
            tier:       'free',
            status:     'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_sub_id', sub.id);
        console.log(`[Stripe Webhook] Suscripción ${sub.id} cancelada → tier free`);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Evento no manejado: ${event.type}`);
    }
  } catch (err) {
    console.error('[Stripe Webhook] Error procesando evento:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
