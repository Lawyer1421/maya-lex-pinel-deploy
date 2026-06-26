/**
 * POST /api/paypal/create-subscription
 * Crea una suscripción PayPal para Plan Pro o Académico.
 *
 * Body: { plan: 'pro' | 'academico', email?: string }
 * Response: { subscriptionId: string, approvalUrl: string }
 *
 * Prerequisitos en PayPal Developer:
 *   1. Crear planes de suscripción en https://developer.paypal.com/dashboard/
 *   2. Copiar los Plan IDs a las variables de entorno
 */
import { NextRequest, NextResponse } from 'next/server';

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
  if (!res.ok) throw new Error('Error al obtener token PayPal');
  const data = await res.json();
  return data.access_token as string;
}

const PLAN_IDS: Record<string, string | undefined> = {
  pro:       process.env.PAYPAL_PRO_PLAN_ID,
  academico: process.env.PAYPAL_ACADEMICO_PLAN_ID,
};

export async function POST(req: NextRequest) {
  let body: { plan?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { plan = 'pro', email } = body;
  const planId = PLAN_IDS[plan];

  if (!planId) {
    return NextResponse.json(
      { error: `Plan '${plan}' no configurado. Agregar PAYPAL_${plan.toUpperCase()}_PLAN_ID en las variables de entorno.` },
      { status: 400 }
    );
  }

  try {
    const accessToken = await getAccessToken();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        Authorization:       `Bearer ${accessToken}`,
        'Content-Type':      'application/json',
        'PayPal-Request-Id': `maya-${plan}-${Date.now()}`,
        Prefer:              'return=representation',
      },
      body: JSON.stringify({
        plan_id:    planId,
        subscriber: email ? { email_address: email } : undefined,
        application_context: {
          brand_name:          'Maya Lex IA Pinel HN',
          locale:              'es-HN',
          shipping_preference: 'NO_SHIPPING',
          user_action:         'SUBSCRIBE_NOW',
          payment_method: {
            payer_selected:   'PAYPAL',
            payee_preferred:  'IMMEDIATE_PAYMENT_REQUIRED',
          },
          return_url: `${appUrl}/cuenta?pago=exitoso`,
          cancel_url: `${appUrl}/pricing?pago=cancelado`,
        },
        custom_id: plan,
      }),
    });

    if (!res.ok) {
      const err = await res.json() as { message?: string };
      throw new Error(err.message ?? 'Error PayPal');
    }

    const subscription = await res.json() as {
      id: string;
      links?: { rel: string; href: string }[];
    };
    const approvalUrl = subscription.links?.find((l) => l.rel === 'approve')?.href;

    return NextResponse.json({ subscriptionId: subscription.id, approvalUrl });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[PayPal Create Subscription]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
