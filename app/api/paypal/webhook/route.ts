/**
 * POST /api/paypal/webhook
 *
 * Recibe y procesa eventos de ciclo de vida de suscripciones PayPal.
 *
 * Seguridad implementada (OWASP):
 *   1. Verificación de firma via postback oficial (api-m.paypal.com)
 *   2. Validación SSRF del cert_url (allowlist de orígenes PayPal)
 *   3. Idempotencia via tabla paypal_events, clave = webhookEvent.id
 *      (event.id del body) — NUNCA transmission_id. PayPal reenvía la
 *      MISMA notificación lógica con un PAYPAL-TRANSMISSION-ID nuevo en
 *      cada intento de entrega; solo event.id se mantiene constante
 *      entre reintentos. transmission_id se conserva como columna de
 *      auditoría/firma, no como clave de deduplicación.
 *   4. Sin bypass silencioso: PAYPAL_WEBHOOK_ID ausente → error 500 explícito
 *   5. Dev bypass SOLO disponible si PAYPAL_MODE !== 'live'
 *   6. Transición de subscriptions vía RPC atómica (paypal_apply_event/
 *      paypal_apply_downgrade) — nunca SELECT+UPSERT separados desde esta
 *      API (ver lib/paypal/state-machine.ts). La RPC también escribe
 *      queries_log y la auditoría dentro de la MISMA transacción.
 *   7. ACTIVATED y PAYMENT.SALE.COMPLETED se verifican contra el recurso
 *      canónico de PayPal antes de conceder acceso — nunca se confía
 *      únicamente en el payload del webhook para eso.
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
 *   → supabase/subscriptions.sql (subscriptions + paypal_events + queries_log)
 *   → supabase/migrations/20260717010000_paypal_state_machine.sql (RPC paypal_apply_event + billing_duplicate_attempts)
 *   → supabase/migrations/20260717020000_paypal_event_id_and_atomic_access.sql
 *     (event_id como PK de idempotencia, escritura atómica, paypal_apply_downgrade)
 *   Automatizado: npm run migrate:analytics && npm run migrate:paypal-state-machine
 *
 * Vínculo usuario ↔ pago:
 *   create-subscription empaqueta {p: plan, u: user_identifier} en custom_id.
 *   Este webhook lo desempaqueta (parseCustomId) y activa al usuario con el
 *   MISMO identificador que usa lib/rate-limit.ts — nunca el email de PayPal.
 *   Fallback: fila 'pending' por paypal_sub_id → identidad legada email/payer.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import {
  verifyWebhookSignature,
  isLiveMode,
  type WebhookSigHeaders,
} from '@/lib/paypal/client';
import type { SubscriptionTier } from '@/lib/paypal/plans';
import {
  parseCustomId,
  resolverUserIdentifier,
  applySubscriptionEvent,
  applySubscriptionDowngrade,
  verifyCanonicalSubscription,
} from '@/lib/paypal/state-machine';

export const dynamic = 'force-dynamic';

// ── Tipos ──────────────────────────────────────────────────────────────────

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
  /** webhookEvent.id — clave real de idempotencia, distinta del header PAYPAL-TRANSMISSION-ID */
  id?:          string;
  event_type:   string;
  create_time?: string;
  resource:     PayPalResource;
}

/** Nunca deja pasar datos personales/secretos a un log o a error_message_sanitized. */
function sanitizeErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return raw
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[correo-redactado]')
    .slice(0, 200);
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

  // 3. Verificación de firma — falla dura (nunca silenciosa), SIEMPRE antes
  //    de tocar paypal_events. Un evento con firma inválida jamás se
  //    registra ni se deduplica — simplemente se rechaza.
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

  // webhookEvent.id es la clave real de idempotencia. En la práctica PayPal
  // siempre lo incluye; si por alguna razón faltara, se deriva uno sintético
  // de transmission_id (prefijado para nunca colisionar con un id real) en
  // vez de romper el procesamiento del evento.
  const eventId = event.id && event.id.trim()
    ? event.id.trim()
    : `no-event-id:${transmissionId || 'unknown'}`;
  if (!event.id) {
    console.warn(`[PayPal Webhook] Evento sin id — usando fallback sintético: ${eventId}`);
  }

  // ── Dev mode stub DB (solo cuando bypass activo + Supabase no configurado) ──
  const isDevBypass = process.env.PAYPAL_DEV_BYPASS_VERIFY === 'true' && !isLiveMode();
  const supabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (isDevBypass && !supabaseConfigured) {
    console.warn('[PayPal Webhook] 🧪 TEST-MODE: Supabase no configurado — stub DB activo');
    console.log(`[PayPal Webhook] 🧪 EVENTO: ${event.event_type} | event_id=${eventId} | tx=${transmissionId}`);
    console.log(`[PayPal Webhook] 🧪 PAYLOAD: ${JSON.stringify(event.resource, null, 2)}`);
    const tierSimulado = (event.resource.custom_id === 'academico') ? 'academico' : 'pro';
    const statusSimulado =
      event.event_type === 'BILLING.SUBSCRIPTION.CREATED'    ? 'trialing'  :
      event.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED'  ? 'active'    :
      event.event_type.includes('CANCELLED') || event.event_type.includes('EXPIRED') ? 'cancelled' :
      event.event_type.includes('FAILED') || event.event_type.includes('DENIED')     ? 'past_due'  : 'active';
    const tierFinal = statusSimulado === 'cancelled' ? 'free' : tierSimulado;
    console.log(`[PayPal Webhook] 🧪 DB-STUB → subscriptions: status=${statusSimulado}, tier=${tierFinal}`);
    console.log(`[PayPal Webhook] 🧪 DB-STUB → paypal_events: INSERT event_id=${eventId} ✓`);
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

  // 5. Idempotencia — dedup por event_id (webhookEvent.id), NO transmission_id.
  //    Si el evento ya fue procesado (mismo event_id, transmission_id igual o
  //    distinto — un reintento real de PayPal trae un transmission_id nuevo),
  //    retornar 200 sin re-procesar.
  try {
    const { error: insertError } = await supabase
      .from('paypal_events')
      .insert({
        event_id:      eventId,
        transmission_id: transmissionId,
        event_type:    event.event_type,
        provider_created_at: event.create_time ?? null,
        processing_status: 'processing',
      });

    if (insertError) {
      if (insertError.code === '23505') {
        // Unique constraint violation → evento duplicado (mismo event_id ya visto)
        console.log(`[PayPal Webhook] Evento duplicado ignorado: event_id=${eventId} (tx actual=${transmissionId})`);
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
    await handlePayPalEvent(supabase, event, eventId, transmissionId);
    await markEventProcessed(supabase, eventId, 'processed', null);
  } catch (err) {
    console.error('[PayPal Webhook] Error procesando evento:', event.event_type, err);
    await markEventProcessed(supabase, eventId, 'failed', sanitizeErrorMessage(err));
    // 500 → PayPal reintentará el evento (correcto para errores de DB transitorios)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function markEventProcessed(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  eventId: string,
  status: 'processed' | 'failed',
  errorMessageSanitized: string | null
) {
  try {
    await supabase
      .from('paypal_events')
      .update({
        processing_status: status,
        processed_at: new Date().toISOString(),
        error_message_sanitized: errorMessageSanitized,
      })
      .eq('event_id', eventId);
  } catch (err) {
    console.error('[PayPal Webhook] No se pudo actualizar processing_status:', err);
  }
}

// ── Dispatcher de eventos ──────────────────────────────────────────────────

// export solo para tests unitarios (tests/webhook-handler.test.ts) — no se
// usa fuera de este archivo en tiempo de ejecución.
export async function handlePayPalEvent(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  event: PayPalEvent,
  eventId: string,
  transmissionId: string
) {
  const { event_type, resource } = event;

  switch (event_type) {

    // Suscripción iniciada (usuario hizo checkout pero aún no pagó la primera
    // cuota). NO otorga acceso. NO toca queries_log. Si el usuario ya tiene
    // una suscripción 'active' (misma u otra), applySubscriptionEvent la
    // protege — ver la migración de la máquina de estados, casos B/C.
    case 'BILLING.SUBSCRIPTION.CREATED': {
      const { tier, uid } = parseCustomId(resource.custom_id);
      const subId      = resource.id ?? '';
      const subscriber = resource.subscriber as PayPalSubscriber | undefined;
      const email      = subscriber?.email_address ?? null;
      const payerId    = subscriber?.payer_id ?? null;
      const userIdentifier = await resolverUserIdentifier(supabase, uid, subId, email, payerId);

      const result = await applySubscriptionEvent(supabase, {
        userIdentifier, paypalSubId: subId, paypalPayerId: payerId, email, tier,
        newStatus: 'trialing', grantsAccess: false, eventType: event_type,
      });

      console.log(
        `[PayPal Webhook] ⏳ SUBSCRIPTION.CREATED ${tier} → ${result.reason} ` +
        `(status local resultante: ${result.resultingStatus}) | ${userIdentifier}`
      );
      break;
    }

    // Suscripción activa — primer pago confirmado. Se verifica contra el
    // recurso canónico de PayPal antes de conceder acceso: nunca basta con
    // que el webhook DIGA "ACTIVATED". applySubscriptionEvent ya escribe
    // subscriptions + queries_log + auditoría atómicamente — no hace falta
    // ninguna llamada adicional después.
    case 'BILLING.SUBSCRIPTION.ACTIVATED': {
      const { tier, uid } = parseCustomId(resource.custom_id);
      const subId      = resource.id ?? '';
      const subscriber = resource.subscriber as PayPalSubscriber | undefined;
      const email      = subscriber?.email_address ?? null;
      const payerId    = subscriber?.payer_id ?? null;

      if (!uid) {
        await flagRequiresReconciliation(
          supabase, eventId,
          `ACTIVATED sin uid en custom_id — no se puede verificar propiedad de forma segura | sub=${subId}`
        );
        break;
      }

      const check = await verifyCanonicalSubscription({ paypalSubId: subId, expectedUid: uid, expectedTier: tier });
      if (!check.ok) {
        console.warn(
          `[PayPal Webhook] ACTIVATED NO verificado (${check.reason}, status PayPal=${check.status ?? 'n/a'}) ` +
          `— NO se concede acceso | sub=${subId} | uid=${uid}`
        );
        break;
      }

      const userIdentifier = await resolverUserIdentifier(supabase, uid, subId, email, payerId);
      const result = await applySubscriptionEvent(supabase, {
        userIdentifier, paypalSubId: subId, paypalPayerId: payerId, email, tier,
        newStatus: 'active', grantsAccess: true, eventType: event_type,
      });

      console.log(
        `[PayPal Webhook] ✅ SUBSCRIPTION.ACTIVATED ${tier} → ${result.reason} ` +
        `(status local resultante: ${result.resultingStatus}) | ${userIdentifier}`
      );
      break;
    }

    // Renovación mensual exitosa. Se identifica la suscripción LOCAL primero
    // (nunca por payer_email) y se verifica contra PayPal antes de tocar
    // subscriptions/queries_log. Si no se puede resolver con seguridad, se
    // marca requires_reconciliation y se genera una alerta — no se concede
    // acceso a ciegas.
    case 'PAYMENT.SALE.COMPLETED':
    case 'INVOICE.PAYMENT_SUCCEEDED': {
      const agreementId = resource.billing_agreement_id ?? resource.id ?? '';
      if (!agreementId) {
        await flagRequiresReconciliation(supabase, eventId, `${event_type} sin billing_agreement_id/id`);
        break;
      }

      const { data: localSub } = await supabase
        .from('subscriptions')
        .select('user_identifier, tier, paypal_payer_id, email')
        .eq('paypal_sub_id', agreementId)
        .maybeSingle();

      if (!localSub?.user_identifier) {
        await flagRequiresReconciliation(
          supabase, eventId, `${event_type} sin fila local para sub=${agreementId}`
        );
        break;
      }

      const tier: SubscriptionTier = localSub.tier === 'academico' ? 'academico' : 'pro';
      const check = await verifyCanonicalSubscription({
        paypalSubId: agreementId, expectedUid: localSub.user_identifier, expectedTier: tier,
      });
      if (!check.ok) {
        console.warn(
          `[PayPal Webhook] ${event_type} NO verificado (${check.reason}, status PayPal=${check.status ?? 'n/a'}) ` +
          `— NO se actualiza acceso | sub=${agreementId}`
        );
        break;
      }

      const result = await applySubscriptionEvent(supabase, {
        userIdentifier:  localSub.user_identifier,
        paypalSubId:     agreementId,
        paypalPayerId:   localSub.paypal_payer_id ?? null,
        email:           localSub.email ?? null,
        tier,
        newStatus:       'active',
        grantsAccess:    true,
        eventType:       event_type,
      });

      console.log(`[PayPal Webhook] 💳 ${event_type} → ${result.reason} | sub ${agreementId}`);
      break;
    }

    // Cancelación / expiración / suspensión → degradar a free. Vía RPC
    // atómica (paypal_apply_downgrade): subscriptions + queries_log +
    // auditoría en una sola transacción. Si la suscripción local ya rotó a
    // otro sub_id, la RPC simplemente no encuentra fila que degradar — no
    // hay carrera que resolver ahí. Sin período de gracia: no existe una
    // política explícita de gracia en el sistema actual y esta auditoría no
    // inventa una nueva.
    case 'BILLING.SUBSCRIPTION.CANCELLED':
    case 'BILLING.SUBSCRIPTION.EXPIRED':
    case 'BILLING.SUBSCRIPTION.SUSPENDED': {
      const subId = resource.id ?? '';
      const result = await applySubscriptionDowngrade(supabase, {
        paypalSubId: subId, newStatus: 'cancelled', eventType: event_type,
      });
      console.log(`[PayPal Webhook] ❌ ${event_type} → ${result.reason} | sub ${subId}`);
      break;
    }

    // Fallo de pago → marcar past_due (no quitar acceso inmediatamente).
    // No se trata past_due como active en ningún punto de este sprint.
    // Sigue siendo un único UPDATE atómico (ya lo era) — no pasa por RPC
    // porque no toca queries_log ni requiere auditoría de doble tabla.
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

  // transmissionId se recibe para trazabilidad/logs futuros aunque ya no
  // sea la clave de idempotencia — evita perder esa correlación.
  void transmissionId;
}

/**
 * Marca un evento como pendiente de revisión manual cuando no se puede
 * resolver con seguridad a qué usuario/suscripción pertenece. Nunca
 * concede acceso en este camino — solo genera alerta operativa.
 */
async function flagRequiresReconciliation(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  eventId: string,
  reason: string
) {
  console.error(`[PayPal Webhook] 🚨 REQUIERE RECONCILIACIÓN MANUAL: ${reason} | event_id=${eventId}`);
  if (!eventId) return;
  const { error } = await supabase
    .from('paypal_events')
    .update({ requires_reconciliation: true })
    .eq('event_id', eventId);
  if (error) {
    console.error('[PayPal Webhook] No se pudo marcar requires_reconciliation:', error);
  }
}
