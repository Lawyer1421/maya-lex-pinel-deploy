/**
 * POST /api/paypal/webhook
 *
 * Recibe y procesa eventos de ciclo de vida de suscripciones PayPal.
 *
 * Seguridad implementada (OWASP):
 *   1. Verificación de firma via postback oficial (api-m.paypal.com)
 *   2. Validación SSRF del cert_url (allowlist de orígenes PayPal)
 *   3. Idempotencia via tabla paypal_events (dedup por transmission_id)
 *   4. Sin bypass silencioso: PAYPAL_WEBHOOK_ID ausente → error 500 explícito
 *   5. Dev bypass SOLO disponible si PAYPAL_MODE !== 'live'
 *
 * Configurar en PayPal Developer → My Apps → Webhooks → Add Webhook:
 *   URL: https://tu-dominio.vercel.app/api/paypal/webhook
 *   Eventos a suscribir:
 *     BILLING.SUBSCRIPTION.CREATED
 *     BILLING.SUBSCRIPTION.ACTIVATED
 *     BILLING.SUBSCRIPTION.CANCELLED
 *     BILLING.SUBSCRIPTION.EXPIRED
 *     BILLING.SUBSCRIPTION.SUSPENDED
 *     BILLING.SUBSCRIPTION.PAYMENT.FAILED
 *     PAYMENT.SALE.COMPLETED
 *     INVOICE.PAYMENT_SUCCEEDED
 *     PAYMENT.SALE.DENIED
 *
 * SQL requerido en Supabase (ejecutar una vez antes de activar live):
 * ─────────────────────────────────────────────────────────────────
 *   CREATE TABLE IF NOT EXISTS subscriptions (
 *     id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *     user_identifier  TEXT UNIQUE NOT NULL,
 *     paypal_sub_id    TEXT,
 *     paypal_payer_id  TEXT,
 *     tier             TEXT NOT NULL DEFAULT 'free',
 *     status           TEXT NOT NULL DEFAULT 'pending',
 *     created_at       TIMESTAMPTZ DEFAULT now(),
 *     updated_at       TIMESTAMPTZ DEFAULT now()
 *   );
 *
 *   CREATE TABLE IF NOT EXISTS paypal_events (
 *     transmission_id  TEXT PRIMARY KEY,
 *     event_type       TEXT NOT NULL,
 *     processed_at     TIMESTAMPTZ DEFAULT now()
 *   );
 *   -- TTL: limpiar eventos con >30 días (PayPal reintentos son por 3 días)
 *   -- CREATE INDEX idx_paypal_events_processed_at ON paypal_events(processed_at);
 * ─────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import {
  verifyWebhookSignature,
  isLiveMode,
  type WebhookSigHeaders,
} from '@/lib/paypal/client';

export const dynamic = 'force-dynamic';

// ── Tipos ──────────────────────────────────────────────────────────────────

type SubscriptionTier   = 'pro' | 'academico';
type SubscriptionStatus = 'trialing' | 'active' | 'cancelled' | 'past_due';

interface PayPalSubscriber {
  email_address?: string;
  payer_id?:      string;
}

interface PayPalResource {
  id?:                   string;
  billing_agreement_id?: string;
  custom_id?:            string;
  subscriber?:           PayPalSubscriber;
  [key: string]: unknown;
}

interface PayPalEvent {
  event_type: string;
  resource:   PayPalResource;
}

// ── Handler principal ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Leer body como texto RAW (necesario para la verificación de firma)
  const rawBody = await req.text();

  // 2. Extraer encabezados de transmisión PayPal
  const sigHeaders: WebhookSigHeaders = {
    'paypal-auth-algo':         req.headers.get('paypal-auth-algo')         ?? '',
    'paypal-cert-url':          req.headers.get('paypal-cert-url')          ?? '',
    'paypal-transmission-id':   req.headers.get('paypal-transmission-id')   ?? '',
    'paypal-transmission-sig':  req.headers.get('paypal-transmission-sig')  ?? '',
    'paypal-transmission-time': req.headers.get('paypal-transmission-time') ?? '',
  };

  const transmissionId = sigHeaders['paypal-transmission-id'];

  // 3. Verificación de firma — falla dura (nunca silenciosa)
  let isValid: boolean;
  try {
    isValid = await verifyWebhookSignature(rawBody, sigHeaders);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[PayPal Webhook] Error en verificación de firma:', msg);
    // 500 → PayPal reintentará (deseado si hay un error de configuración temporal)
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  if (!isValid) {
    console.warn('[PayPal Webhook] Firma inválida — descartando evento:', transmissionId);
    // 400 → PayPal NO reintentará (evento rechazado por seguridad)
    return NextResponse.json({ error: 'Firma inválida' }, { status: 400 });
  }

  // 4. Parsear el evento
  let event: PayPalEvent;
  try {
    event = JSON.parse(rawBody) as PayPalEvent;
  } catch {
    return NextResponse.json({ error: 'Payload JSON malformado' }, { status: 400 });
  }

  // ── Dev mode stub DB (solo cuando bypass activo + Supabase no configurado) ──
  const isDevBypass = process.env.PAYPAL_DEV_BYPASS_VERIFY === 'true' && !isLiveMode();
  const supabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (isDevBypass && !supabaseConfigured) {
    console.warn('[PayPal Webhook] 🧪 TEST-MODE: Supabase no configurado — stub DB activo');
    console.log(`[PayPal Webhook] 🧪 EVENTO: ${event.event_type} | tx=${transmissionId}`);
    console.log(`[PayPal Webhook] 🧪 PAYLOAD: ${JSON.stringify(event.resource, null, 2)}`);
    const tierSimulado = (event.resource.custom_id === 'academico') ? 'academico' : 'pro';
    const statusSimulado =
      event.event_type === 'BILLING.SUBSCRIPTION.CREATED'    ? 'trialing'  :
      event.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED'  ? 'active'    :
      event.event_type.includes('CANCELLED') || event.event_type.includes('EXPIRED') ? 'cancelled' :
      event.event_type.includes('FAILED') || event.event_type.includes('DENIED')     ? 'past_due'  : 'active';
    const tierFinal = statusSimulado === 'cancelled' ? 'free' : tierSimulado;
    console.log(`[PayPal Webhook] 🧪 DB-STUB → subscriptions: status=${statusSimulado}, tier=${tierFinal}`);
    console.log(`[PayPal Webhook] 🧪 DB-STUB → paypal_events: INSERT tx=${transmissionId} ✓`);
    if (statusSimulado === 'active') {
      console.log(`[PayPal Webhook] 🧪 DB-STUB → queries_log: tier=${tierFinal} sincronizado ✓`);
    }
    return NextResponse.json({
      received: true,
      test_mode: true,
      event_type: event.event_type,
      simulated: { status: statusSimulado, tier: tierFinal },
    });
  }

  const supabase = createServerSupabaseClient();

  // 5. Idempotencia — dedup por transmission_id
  //    Si el evento ya fue procesado, retornar 200 sin re-procesar.
  //    Si paypal_events no existe aún, se omite el check con una advertencia.
  try {
    const { error: insertError } = await supabase
      .from('paypal_events')
      .insert({ transmission_id: transmissionId, event_type: event.event_type });

    if (insertError) {
      if (insertError.code === '23505') {
        // Unique constraint violation → evento duplicado (reintento de PayPal)
        console.log(`[PayPal Webhook] Evento duplicado ignorado: ${transmissionId}`);
        return NextResponse.json({ received: true, duplicate: true });
      }
      if (insertError.code === '42P01') {
        // Tabla no existe todavía — advertencia y continúa (no bloquear en pre-producción)
        console.warn('[PayPal Webhook] Tabla paypal_events no existe — idempotencia deshabilitada');
      } else {
        // Otro error de DB — logear pero continuar (no perder el evento)
        console.error('[PayPal Webhook] Error al registrar en paypal_events:', insertError);
      }
    }
  } catch (err) {
    console.error('[PayPal Webhook] Error idempotencia:', err);
    // No bloquear el procesamiento del evento por un error de logging
  }

  // 6. Despachar evento
  try {
    await handlePayPalEvent(supabase, event);
  } catch (err) {
    console.error('[PayPal Webhook] Error procesando evento:', event.event_type, err);
    // 500 → PayPal reintentará el evento (correcto para errores de DB transitorios)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ── Dispatcher de eventos ──────────────────────────────────────────────────

async function handlePayPalEvent(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  event: PayPalEvent
) {
  const { event_type, resource } = event;

  switch (event_type) {

    // Suscripción iniciada (usuario hizo checkout pero aún no pagó la primera cuota)
    case 'BILLING.SUBSCRIPTION.CREATED': {
      const tier     = resolverTier(resource.custom_id);
      const subId    = resource.id ?? '';
      const subscriber = resource.subscriber as PayPalSubscriber | undefined;
      const email    = subscriber?.email_address ?? null;
      const payerId  = subscriber?.payer_id ?? '';

      await upsertSubscription(supabase, {
        userIdentifier: buildUserIdentifier(email, payerId, subId),
        paypalSubId:    subId,
        paypalPayerId:  payerId,
        email,
        tier,
        status: 'trialing',
      });
      console.log(`[PayPal Webhook] ⏳ SUBSCRIPTION.CREATED ${tier} → trialing | ${email ?? subId}`);
      break;
    }

    // Suscripción activa — primer pago confirmado → ACTIVAR acceso premium
    case 'BILLING.SUBSCRIPTION.ACTIVATED': {
      const tier       = resolverTier(resource.custom_id);
      const subId      = resource.id ?? '';
      const subscriber = resource.subscriber as PayPalSubscriber | undefined;
      const email      = subscriber?.email_address ?? null;
      const payerId    = subscriber?.payer_id ?? '';

      await upsertSubscription(supabase, {
        userIdentifier: buildUserIdentifier(email, payerId, subId),
        paypalSubId:    subId,
        paypalPayerId:  payerId,
        email,
        tier,
        status: 'active',
      });
      console.log(`[PayPal Webhook] ✅ SUBSCRIPTION.ACTIVATED ${tier} → active | ${email ?? subId}`);
      break;
    }

    // Renovación mensual exitosa — mantener acceso activo
    case 'PAYMENT.SALE.COMPLETED':
    case 'INVOICE.PAYMENT_SUCCEEDED': {
      const agreementId = resource.billing_agreement_id ?? resource.id;
      if (agreementId) {
        const { error } = await supabase
          .from('subscriptions')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('paypal_sub_id', agreementId);
        if (error) throw error;
        console.log(`[PayPal Webhook] 💳 Pago recibido — sub ${agreementId} → active`);
      }
      break;
    }

    // Cancelación / expiración / suspensión → degradar a free
    case 'BILLING.SUBSCRIPTION.CANCELLED':
    case 'BILLING.SUBSCRIPTION.EXPIRED':
    case 'BILLING.SUBSCRIPTION.SUSPENDED': {
      const subId = resource.id ?? '';
      const { data: sub, error } = await supabase
        .from('subscriptions')
        .update({ tier: 'free', status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('paypal_sub_id', subId)
        .select('user_identifier')
        .single();
      if (error) throw error;

      // Reflejar downgrade en queries_log (queries_log filtra por user_identifier, no por paypal_sub_id)
      if (sub?.user_identifier) {
        await supabase
          .from('queries_log')
          .update({ tier: 'free', updated_at: new Date().toISOString() })
          .eq('user_identifier', sub.user_identifier);
      }

      console.log(`[PayPal Webhook] ❌ ${event_type} → tier free | sub ${subId}`);
      break;
    }

    // Fallo de pago → marcar past_due (no quitar acceso inmediatamente)
    case 'PAYMENT.SALE.DENIED':
    case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED': {
      const subId = resource.billing_agreement_id ?? resource.id ?? '';
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'past_due', updated_at: new Date().toISOString() })
        .eq('paypal_sub_id', subId);
      if (error) throw error;
      console.warn(`[PayPal Webhook] ⚠️  Pago fallido — sub ${subId} → past_due`);
      break;
    }

    default:
      // PayPal puede enviar eventos no listados; aceptar con 200 sin procesar
      console.log(`[PayPal Webhook] Evento no manejado (ignorado): ${event_type}`);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function resolverTier(customId: string | undefined): SubscriptionTier {
  return customId === 'academico' ? 'academico' : 'pro';
}

function buildUserIdentifier(
  email:   string | null,
  payerId: string,
  subId:   string
): string {
  if (email) return `email:${email}`;
  if (payerId) return `paypal:${payerId}`;
  return `sub:${subId}`;
}

async function upsertSubscription(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  data: {
    userIdentifier: string;
    paypalSubId:    string;
    paypalPayerId:  string;
    email:          string | null;
    tier:           SubscriptionTier;
    status:         SubscriptionStatus;
  }
) {
  // Upsert principal — onConflict en user_identifier provee segunda capa de idempotencia
  const { error: subError } = await supabase
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
  if (subError) throw subError;

  // Sincronizar tier en queries_log (lo que lee el rate-limiter)
  if (data.status === 'active') {
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
