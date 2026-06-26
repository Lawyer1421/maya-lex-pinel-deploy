/**
 * POST /api/paypal/webhook
 * Recibe eventos de PayPal: activación, renovación, cancelación, fallo de pago.
 *
 * Configurar en PayPal Developer → My Apps → Webhooks → Add Webhook:
 *   URL: https://tu-dominio.vercel.app/api/paypal/webhook
 *   Eventos:
 *     BILLING.SUBSCRIPTION.ACTIVATED
 *     BILLING.SUBSCRIPTION.CANCELLED
 *     BILLING.SUBSCRIPTION.EXPIRED
 *     BILLING.SUBSCRIPTION.SUSPENDED
 *     BILLING.SUBSCRIPTION.PAYMENT.FAILED
 *     PAYMENT.SALE.COMPLETED
 *     PAYMENT.SALE.DENIED
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const PAYPAL_BASE =
  process.env.PAYPAL_MODE === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

async function getAccessToken(): Promise<string> {
  const clientId     = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Credenciales PayPal no configuradas');

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization:  `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });
  const data = await res.json();
  return data.access_token as string;
}

async function verifyWebhookSignature(
  body: string,
  headers: Record<string, string>
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.warn('[PayPal Webhook] PAYPAL_WEBHOOK_ID no configurado — omitiendo verificación en desarrollo');
    return true;
  }
  try {
    const accessToken = await getAccessToken();
    const res = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo:          headers['paypal-auth-algo'],
        cert_url:           headers['paypal-cert-url'],
        transmission_id:    headers['paypal-transmission-id'],
        transmission_sig:   headers['paypal-transmission-sig'],
        transmission_time:  headers['paypal-transmission-time'],
        webhook_id:         webhookId,
        webhook_event:      JSON.parse(body),
      }),
    });
    const data = await res.json() as { verification_status: string };
    return data.verification_status === 'SUCCESS';
  } catch {
    return false;
  }
}

type PayPalEvent = {
  event_type: string;
  resource: Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  const body = await req.text();

  const sigHeaders: Record<string, string> = {
    'paypal-auth-algo':         req.headers.get('paypal-auth-algo') ?? '',
    'paypal-cert-url':          req.headers.get('paypal-cert-url') ?? '',
    'paypal-transmission-id':   req.headers.get('paypal-transmission-id') ?? '',
    'paypal-transmission-sig':  req.headers.get('paypal-transmission-sig') ?? '',
    'paypal-transmission-time': req.headers.get('paypal-transmission-time') ?? '',
  };

  const isValid = await verifyWebhookSignature(body, sigHeaders);
  if (!isValid) {
    console.error('[PayPal Webhook] Firma inválida');
    return NextResponse.json({ error: 'Firma inválida' }, { status: 400 });
  }

  let event: PayPalEvent;
  try {
    event = JSON.parse(body) as PayPalEvent;
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  try {
    switch (event.event_type) {

      case 'BILLING.SUBSCRIPTION.ACTIVATED': {
        const sub = event.resource;
        const plan      = (sub.custom_id as string) ?? 'pro';
        const tier      = (plan === 'academico' ? 'academico' : 'pro') as 'pro' | 'academico';
        const subscriber = sub.subscriber as { email_address?: string; payer_id?: string } | undefined;
        const email      = subscriber?.email_address ?? null;
        const payerId    = subscriber?.payer_id ?? '';
        const subId      = sub.id as string;

        await upsertSubscription(supabase, {
          userIdentifier: email ? `email:${email}` : `paypal:${payerId}`,
          paypalSubId:    subId,
          paypalPayerId:  payerId,
          email,
          tier,
          status: 'active',
        });
        console.log(`[PayPal Webhook] ✓ ${tier} activado para ${email ?? subId}`);
        break;
      }

      case 'PAYMENT.SALE.COMPLETED': {
        const sale = event.resource;
        const agreementId = sale.billing_agreement_id as string | undefined;
        if (agreementId) {
          await supabase
            .from('subscriptions')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('paypal_sub_id', agreementId);
        }
        break;
      }

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED': {
        const sub = event.resource;
        await supabase
          .from('subscriptions')
          .update({ tier: 'free', status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('paypal_sub_id', sub.id as string);
        console.log(`[PayPal Webhook] ${event.event_type} → tier free`);
        break;
      }

      case 'PAYMENT.SALE.DENIED':
      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED': {
        const sub   = event.resource;
        const subId = ((sub.billing_agreement_id ?? sub.id) as string);
        await supabase
          .from('subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('paypal_sub_id', subId);
        console.warn(`[PayPal Webhook] ⚠ Pago fallido ${subId}`);
        break;
      }

      default:
        console.log(`[PayPal Webhook] Evento no manejado: ${event.event_type}`);
    }
  } catch (err) {
    console.error('[PayPal Webhook] Error procesando evento:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function upsertSubscription(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  data: {
    userIdentifier: string;
    paypalSubId:    string;
    paypalPayerId:  string;
    email:          string | null;
    tier:           'pro' | 'academico';
    status:         'active' | 'cancelled' | 'past_due';
  }
) {
  await supabase
    .from('subscriptions')
    .upsert(
      {
        user_identifier: data.userIdentifier,
        paypal_sub_id:   data.paypalSubId,
        paypal_payer_id: data.paypalPayerId,
        tier:            data.tier,
        status:          data.status,
        updated_at:      new Date().toISOString(),
      },
      { onConflict: 'user_identifier' }
    );

  if (data.email) {
    const today = new Date().toISOString().split('T')[0];
    await supabase
      .from('queries_log')
      .upsert(
        {
          user_identifier: data.userIdentifier,
          query_date:      today,
          query_count:     0,
          tier:            data.tier,
          updated_at:      new Date().toISOString(),
        },
        { onConflict: 'user_identifier,query_date', ignoreDuplicates: false }
      );
  }
}
