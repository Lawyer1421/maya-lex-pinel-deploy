/**
 * POST /api/paypal/verificar-estado
 *
 * Respaldo para cuando el webhook de PayPal se demora (normal: unos
 * segundos a minutos) o el usuario aterriza en /cuenta antes de que
 * llegue. Consulta el estado REAL de la suscripción directamente en
 * PayPal y sincroniza subscriptions/queries_log si ya está activa.
 *
 * NO fabrica un "activo" falso: si PayPal dice APPROVAL_PENDING, la
 * respuesta lo refleja tal cual — el usuario nunca ve más de lo que
 * PayPal confirma.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-ssr';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getAccessToken, getPayPalBaseUrl } from '@/lib/paypal/client';

export async function POST(req: NextRequest) {
  const supabaseAuth = await createSupabaseServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Sesión requerida' }, { status: 401 });
  }

  const userIdentifier = `email:${user.email}`;
  const supabase = createServerSupabaseClient();

  const { data: suscripcion } = await supabase
    .from('subscriptions')
    .select('paypal_sub_id, tier, status')
    .eq('user_identifier', userIdentifier)
    .single();

  if (!suscripcion?.paypal_sub_id) {
    return NextResponse.json({ estadoPaypal: null, tier: 'free', sincronizado: false });
  }

  // Si ya está activa localmente, no hace falta consultar PayPal
  if (suscripcion.status === 'active') {
    return NextResponse.json({ estadoPaypal: 'ACTIVE', tier: suscripcion.tier, sincronizado: false });
  }

  try {
    const accessToken = await getAccessToken();
    const res = await fetch(
      `${getPayPalBaseUrl()}/v1/billing/subscriptions/${suscripcion.paypal_sub_id}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) {
      return NextResponse.json({ estadoPaypal: 'DESCONOCIDO', tier: suscripcion.tier, sincronizado: false });
    }
    const data = (await res.json()) as { status: string };

    if (data.status === 'ACTIVE' && suscripcion.status !== 'active') {
      // PayPal ya la activó pero el webhook aún no llegó (o se perdió) — sincronizar ahora
      await supabase.from('subscriptions').update({
        status: 'active',
        updated_at: new Date().toISOString(),
      }).eq('user_identifier', userIdentifier);

      const today = new Date().toISOString().split('T')[0];
      await supabase.from('queries_log').upsert({
        user_identifier: userIdentifier,
        query_date: today,
        query_count: 0,
        tier: suscripcion.tier,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_identifier,query_date' });

      console.log(`[Verificar Estado] Reconciliado manualmente: ${userIdentifier} → active (webhook no había llegado)`);
      return NextResponse.json({ estadoPaypal: 'ACTIVE', tier: suscripcion.tier, sincronizado: true });
    }

    return NextResponse.json({ estadoPaypal: data.status, tier: suscripcion.tier, sincronizado: false });
  } catch (err) {
    console.error('[Verificar Estado] Error consultando PayPal:', err instanceof Error ? err.message : err);
    return NextResponse.json({ estadoPaypal: 'DESCONOCIDO', tier: suscripcion.tier, sincronizado: false });
  }
}
