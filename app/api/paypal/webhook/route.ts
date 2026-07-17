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
 *   6. Transición de subscriptions vía RPC atómica (paypal_apply_event) —
 *      nunca SELECT+UPSERT separados desde esta API (ver lib/paypal/state-machine.ts)
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
 *   → supabase/paypal_state_machine.sql (RPC paypal_apply_event + billing_duplicate_attempts)
 *   Automatizado: npm run migrate:analytics
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
  verifyCanonicalSubscription,
  syncLegacyPaidAccess,
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
    await handlePayPalEvent(supabase, event, transmissionId);
  } catch (err) {
    console.error('[PayPal Webhook] Error procesando evento:', event.event_type, err);
    // 500 → PayPal reintentará el evento (correcto para errores de DB transitorios)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ── Dispatcher de eventos ──────────────────────────────────────────────────

// export solo para tests unitarios (tests/webhook-handler.test.ts) — no se
// usa fuera de este archivo en tiempo de ejecución.
export async function handlePayPalEvent(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  event: PayPalEvent,
  transmissionId: string
) {
  const { event_type, resource } = event;

  switch (event_type) {

    // Suscripción iniciada (usuario hizo checkout pero aún no pagó la primera
    // cuota). NO otorga acceso. NO toca queries_log. Si el usuario ya tiene
    // una suscripción 'active' (misma u otra), applySubscriptionEvent la
    // protege — ver supabase/paypal_state_machine.sql casos B/C.
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
    // que el webhook DIGA "ACTIVATED".
    case 'BILLING.SUBSCRIPTION.ACTIVATED': {
      const { tier, uid } = parseCustomId(resource.custom_id);
      const subId      = resource.id ?? '';
      const subscriber = resource.subscriber as PayPalSubscriber | undefined;
      const email      = subscriber?.email_address ?? null;
      const payerId    = subscriber?.payer_id ?? null;

      if (!uid) {
        await flagRequiresReconciliation(
          supabase, transmissionId,
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

      if (result.applied && result.resultingStatus === 'active') {
        await syncLegacyPaidAccess(supabase, {
          userIdentifier, tier: result.resultingTier as SubscriptionTier, verifiedStatus: 'active',
        });
      }

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
        await flagRequiresReconciliation(supabase, transmissionId, `${event_type} sin billing_agreement_id/id`);
        break;
      }

      const { data: localSub } = await supabase
        .from('subscriptions')
        .select('user_identifier, tier, paypal_payer_id, email')
        .eq('paypal_sub_id', agreementId)
        .maybeSingle();

      if (!localSub?.user_identifier) {
        await flagRequiresReconciliation(
          supabase, transmissionId, `${event_type} sin fila local para sub=${agreementId}`
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

      if (result.applied && result.resultingStatus === 'active') {
        await syncLegacyPaidAccess(supabase, {
          userIdentifier: localSub.user_identifier,
          tier: result.resultingTier as SubscriptionTier,
          verifiedStatus: 'active',
        });
      }

      console.log(`[PayPal Webhook] 💳 ${event_type} → ${result.reason} | sub ${agreementId}`);
      break;
    }

    // Cancelación / expiración / suspensión → degradar a free.
    // Ya es atómico hoy: filtra por paypal_sub_id en un único UPDATE, así
    // que si la suscripción local ya rotó a otro sub_id, este UPDATE
    // simplemente no matchea ninguna fila (no hay carrera que resolver).
    // Sin período de gracia: no existe una política explícita de gracia en
    // el sistema actual y esta auditoría no inventa una nueva.
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

    // Fallo de pago → marcar past_due (no quitar acceso inmediatamente).
    // No se trata past_due como active en ningún punto de este sprint.
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

/**
 * Marca un evento como pendiente de revisión manual cuando no se puede
 * resolver con seguridad a qué usuario/suscripción pertenece. Nunca
 * concede acceso en este camino — solo genera alerta operativa.
 */
async function flagRequiresReconciliation(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  transmissionId: string,
  reason: string
) {
  console.error(`[PayPal Webhook] 🚨 REQUIERE RECONCILIACIÓN MANUAL: ${reason} | tx=${transmissionId}`);
  if (!transmissionId) return;
  const { error } = await supabase
    .from('paypal_events')
    .update({ requires_reconciliation: true })
    .eq('transmission_id', transmissionId);
  if (error) {
    console.error('[PayPal Webhook] No se pudo marcar requires_reconciliation:', error);
  }
}
