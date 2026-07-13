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
import { getAccessToken, getPayPalBaseUrl } from '@/lib/paypal/client';
import { getUserIdentifierVerificado } from '@/lib/rate-limit';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Empaqueta plan + identificador de usuario en el custom_id de PayPal.
 * PayPal limita custom_id a 127 caracteres — el uid se trunca con margen.
 * El webhook desempaqueta esto para activar al usuario CORRECTO
 * (el mismo identificador que usa el rate-limiter), no al email de PayPal.
 */
function buildCustomId(plan: string, uid: string): string {
  return JSON.stringify({ p: plan, u: uid.slice(0, 100) });
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

  // Identidad VERIFICADA — email:{correo} si hay sesión (estable entre IPs y
  // dispositivos; coincide con /cuenta), ip: como último recurso.
  // Viaja dentro de custom_id para que el webhook active a este usuario exacto.
  const userIdentifier = await getUserIdentifierVerificado(req);

  // Suscribirse SIN correo deja el pago huérfano de identidad estable:
  // exigir sesión activa (el frontend redirige a /login antes de llegar aquí).
  if (userIdentifier.startsWith('ip:')) {
    return NextResponse.json(
      {
        error: 'Debe iniciar sesión con su correo antes de suscribirse.',
        loginUrl: '/login?next=/pricing',
      },
      { status: 401 }
    );
  }

  try {
    const accessToken = await getAccessToken();
    const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const PAYPAL_BASE = getPayPalBaseUrl();

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
        custom_id: buildCustomId(plan, userIdentifier),
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

    // Segunda capa de vínculo: fila 'pending' en subscriptions con el uid real
    // y el paypal_sub_id recién creado. Si custom_id se perdiera en algún evento,
    // el webhook puede resolver el usuario buscando por paypal_sub_id.
    // Fire-and-forget: un fallo aquí NUNCA bloquea el checkout.
    try {
      const supabase = createServerSupabaseClient();
      await supabase.from('subscriptions').upsert(
        {
          user_identifier: userIdentifier,
          paypal_sub_id:   subscription.id,
          tier:            plan,
          status:          'pending',
          updated_at:      new Date().toISOString(),
        },
        { onConflict: 'user_identifier' }
      );
    } catch (e) {
      console.warn(
        '[PayPal Create Subscription] No se registró fila pending (no crítico):',
        e instanceof Error ? e.message : e
      );
    }

    return NextResponse.json({ subscriptionId: subscription.id, approvalUrl });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[PayPal Create Subscription]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
