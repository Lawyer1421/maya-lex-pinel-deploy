/**
 * POST /api/stripe/checkout — crea una sesión de Stripe Checkout para el tier pedido. APAGADA por defecto (lib/stripe/config.ts).
 *
 * Identidad: SIEMPRE la verificada en el servidor (email:{correo}); nunca un usuario o tier tomado del cuerpo para decidir a quién se
 * cobra. Doble suscripción: si el usuario ya tiene una suscripción activa o con pago vencido (de PayPal o de Stripe) se responde 409 y no
 * se crea la sesión — no se puede cancelar automáticamente el cobro del otro proveedor, así que el usuario debe cancelarlo primero.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getUserIdentifierVerificado } from '@/lib/rate-limit';
import { createServerSupabaseClient } from '@/lib/supabase';
import { isKnownTier } from '@/lib/paypal/plans';
import { stripeHabilitado } from '@/lib/stripe/config';
import { stripePriceIds } from '@/lib/stripe/plans';
import { crearCheckoutSession } from '@/lib/stripe/client';

export async function POST(req: NextRequest) {
  if (!stripeHabilitado()) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  let body: { plan?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }
  const plan = typeof body.plan === 'string' ? body.plan : 'pro';
  if (!isKnownTier(plan)) return NextResponse.json({ error: `Plan '${plan}' no reconocido.` }, { status: 400 });
  if (!stripePriceIds()[plan]) return NextResponse.json({ error: 'Plan no disponible con tarjeta por ahora.' }, { status: 400 });

  const userIdentifier = await getUserIdentifierVerificado(req);
  if (!userIdentifier.startsWith('email:')) {
    return NextResponse.json({ error: 'Debe iniciar sesión con su correo antes de suscribirse.', loginUrl: '/login?next=/pricing' }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();
  const { data: existente } = await supabase
    .from('subscriptions')
    .select('status, provider')
    .eq('user_identifier', userIdentifier)
    .maybeSingle();
  if (existente && (existente.status === 'active' || existente.status === 'past_due')) {
    const otroProveedor = existente.provider && existente.provider !== 'stripe';
    return NextResponse.json(
      {
        error: otroProveedor
          ? 'Ya tiene una suscripción activa con PayPal. Cancélela primero para pagar con tarjeta.'
          : 'Ya tiene una suscripción activa.',
        code: otroProveedor ? 'PROVIDER_SWITCH_REQUIRES_CANCEL' : 'ALREADY_SUBSCRIBED',
      },
      { status: 409 },
    );
  }

  try {
    const sesion = await crearCheckoutSession({ tier: plan, userIdentifier, email: userIdentifier.slice('email:'.length) });
    return NextResponse.json({ url: sesion.url });
  } catch (err) {
    console.error('[Stripe Checkout] No se pudo crear la sesión:', err instanceof Error ? err.message : 'error');
    return NextResponse.json({ error: 'No se pudo iniciar el pago. Intente de nuevo.' }, { status: 502 });
  }
}
