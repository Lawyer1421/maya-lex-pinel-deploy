/**
 * POST /api/stripe/checkout
 * Crea una sesión de pago Stripe Checkout para el Plan Pro o Académico.
 *
 * Body: { plan: 'pro' | 'academico', email?: string }
 * Response: { url: string } — URL de la página de pago de Stripe
 */
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY no configurada');
  return new Stripe(key, { apiVersion: '2026-05-27.dahlia' });
}

const PRICE_IDS: Record<string, string | undefined> = {
  pro:       process.env.STRIPE_PRO_PRICE_ID,
  academico: process.env.STRIPE_ACADEMICO_PRICE_ID,
};

export async function POST(req: NextRequest) {
  let body: { plan?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const { plan = 'pro', email } = body;
  const priceId = PRICE_IDS[plan];

  if (!priceId) {
    return NextResponse.json(
      { error: `Plan '${plan}' no configurado. Agregar STRIPE_${plan.toUpperCase()}_PRICE_ID en .env.local` },
      { status: 400 }
    );
  }

  try {
    const stripe = getStripeClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      success_url: `${appUrl}/cuenta?pago=exitoso&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/pricing?pago=cancelado`,
      metadata: { plan, app: 'maya-lex-pinel' },
      subscription_data: {
        metadata: { plan, app: 'maya-lex-pinel' },
      },
      locale: 'es',
      currency: 'usd',
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Stripe Checkout]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
