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
 *
 * Seguridad:
 *   - El usuario sale ÚNICAMENTE de la sesión (cookie), nunca del body.
 *   - Nunca acepta userId, isPremium ni tier del cliente como fuente de
 *     verdad — esos campos, si vinieran en el body, se ignoran.
 *   - subscriptionId (opcional) es solo una PISTA de correlación del
 *     cliente (ver PayPalSubscribeButton/localStorage) — el servidor
 *     JAMÁS la usa a ciegas. Si se envía y coincide con la única
 *     suscripción local vinculada a este user_identifier, se verifica
 *     esa. Si se envía y NO coincide, es evidencia de un intento
 *     distinto al registrado — se responde RECONCILIATION_REQUIRED en
 *     vez de verificar un id que el servidor no puede confirmar que
 *     pertenece a este checkout. Nunca se "adivina" ni se elige por
 *     payer_email.
 *   - Rate limiting: 1 verificación cada 10s por usuario.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createSupabaseServerClient } from '@/lib/supabase-ssr';
import { createServerSupabaseClient } from '@/lib/supabase';
import {
  verifyCanonicalSubscription,
  applySubscriptionEvent,
} from '@/lib/paypal/state-machine';
import type { SubscriptionTier } from '@/lib/paypal/plans';
import { buildUserIdentifierFromEmail } from '@/lib/rate-limit';

const RATE_LIMIT_WINDOW_MS = 10 * 1000;

function buildReferenceId(userIdentifier: string): string {
  const hash = createHash('sha256').update(userIdentifier).digest('hex').slice(0, 8).toUpperCase();
  return `MLX-${Date.now().toString(36).toUpperCase()}-${hash}`;
}

export async function POST(req: NextRequest) {
  const supabaseAuth = await createSupabaseServerClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Sesión requerida' }, { status: 401 });
  }

  const userIdentifier = buildUserIdentifierFromEmail(user.email);
  const supabase = createServerSupabaseClient();

  // ── Rate limiting ────────────────────────────────────────────────────
  const { data: attempt } = await supabase
    .from('billing_verification_attempts')
    .select('last_attempt_at')
    .eq('user_identifier', userIdentifier)
    .maybeSingle();

  if (attempt?.last_attempt_at) {
    const elapsedMs = Date.now() - new Date(attempt.last_attempt_at).getTime();
    if (elapsedMs < RATE_LIMIT_WINDOW_MS) {
      return NextResponse.json(
        { error: 'Espere unos segundos antes de volver a verificar.', code: 'RATE_LIMITED' },
        { status: 429 }
      );
    }
  }
  await supabase.from('billing_verification_attempts').upsert(
    { user_identifier: userIdentifier, last_attempt_at: new Date().toISOString() },
    { onConflict: 'user_identifier' }
  );

  // Solo se usa subscriptionId del body — cualquier otro campo (userId,
  // isPremium, tier) se ignora deliberadamente, no se desestructura.
  let requestedSubId: string | null = null;
  try {
    const body = await req.json() as { subscriptionId?: string };
    if (typeof body.subscriptionId === 'string' && body.subscriptionId.trim()) {
      requestedSubId = body.subscriptionId.trim();
    }
  } catch {
    // Body vacío es válido — cae al comportamiento por defecto
  }

  const { data: suscripcion } = await supabase
    .from('subscriptions')
    .select('paypal_sub_id, tier, status')
    .eq('user_identifier', userIdentifier)
    .maybeSingle();

  if (!suscripcion?.paypal_sub_id) {
    // Sin ninguna suscripción local vinculada a este usuario, no hay nada
    // que el servidor pueda verificar de forma segura — incluso si el
    // cliente mandó un subscriptionId, no se confía en él a ciegas.
    return NextResponse.json({ estadoPaypal: null, tier: 'free', sincronizado: false });
  }

  // El único subscriptionId que este endpoint puede verificar es el que
  // ya está vinculado localmente a este user_identifier (esquema de una
  // fila por usuario — no hay "elegir entre varias" posible). Si el
  // cliente pidió verificar un id DISTINTO al vinculado, es señal de un
  // intento de checkout distinto al que el servidor tiene registrado —
  // nunca se verifica ese id ajeno a ciegas, se pide reconciliación.
  if (requestedSubId && requestedSubId !== suscripcion.paypal_sub_id) {
    return NextResponse.json({
      estadoPaypal: null,
      tier: suscripcion.tier,
      sincronizado: false,
      verificacion: 'RECONCILIATION_REQUIRED',
      mensaje: 'El intento de pago que indica no coincide con el que tenemos registrado para su cuenta. Contáctenos con este código de referencia.',
      referenceId: buildReferenceId(userIdentifier),
    });
  }

  const targetSubId = suscripcion.paypal_sub_id;

  // Ya está activa localmente para la suscripción vinculada
  if (suscripcion.status === 'active') {
    return NextResponse.json({ estadoPaypal: 'ACTIVE', tier: suscripcion.tier, sincronizado: false });
  }

  const tier: SubscriptionTier = suscripcion.tier === 'academico' ? 'academico' : 'pro';

  const check = await verifyCanonicalSubscription({
    paypalSubId:  targetSubId,
    expectedUid:  userIdentifier,
    expectedTier: tier,
  });

  if (!check.ok) {
    return NextResponse.json({
      estadoPaypal: check.status ?? 'DESCONOCIDO',
      tier: suscripcion.tier,
      sincronizado: false,
      verificacion: check.reason,
    });
  }

  const result = await applySubscriptionEvent(supabase, {
    userIdentifier,
    paypalSubId:   targetSubId,
    paypalPayerId: null,
    email:         user.email,
    tier,
    newStatus:     'active',
    grantsAccess:  true,
    eventType:     'MANUAL_VERIFICATION',
  });

  if (result.applied && result.resultingStatus === 'active') {
    // applySubscriptionEvent ya escribió subscriptions + queries_log +
    // auditoría atómicamente — no hace falta una segunda llamada.
    console.log(`[Verificar Estado] Reconciliado manualmente: ${userIdentifier} → active (${result.reason})`);
    return NextResponse.json({
      estadoPaypal: 'ACTIVE',
      tier: result.resultingTier,
      sincronizado: true,
    });
  }

  if (result.reason === 'duplicate_active_subscription') {
    return NextResponse.json({
      estadoPaypal: 'ACTIVE',
      tier: result.resultingTier,
      sincronizado: false,
      verificacion: 'duplicate_active_subscription',
      mensaje: 'Su cuenta ya tiene una suscripción activa distinta a la que intenta verificar. Contáctenos con este código de referencia.',
      referenceId: buildReferenceId(userIdentifier),
    });
  }

  return NextResponse.json({
    estadoPaypal: check.status,
    tier: suscripcion.tier,
    sincronizado: false,
    referenceId: buildReferenceId(userIdentifier),
  });
}
