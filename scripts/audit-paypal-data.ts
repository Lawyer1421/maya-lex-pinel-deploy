/**
 * scripts/audit-paypal-data.ts — FASE 1 de la modernización de identidad
 *
 * Auditoría de solo lectura: para cada usuario conocido en `subscriptions`,
 * compara el estado local contra PayPal Live real y reporta con PII
 * redactada. NUNCA escribe nada — ni reconcile ni upsert.
 *
 * queries_log NUNCA se trata como evidencia de pago (es un espejo del
 * gate de acceso legado, no una fuente de facturación). "Usuario Pro por
 * suscripción" solo se considera confirmado si PayPal responde ACTIVE
 * para el subscription_id local — un 404 nunca se interpreta como éxito.
 *
 * Uso: npx tsx scripts/audit-paypal-data.ts
 */
import { resolve } from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { getAccessToken, getPayPalBaseUrl } from '@/lib/paypal/client';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

function redactEmail(userIdentifier: string): string {
  const m = userIdentifier.match(/^email:(.{2}).*(@.*)$/);
  return m ? `email:${m[1]}***${m[2]}` : '(no-email)';
}
function redactSubId(subId: string | null): string {
  return subId ? `***${subId.slice(-4)}` : '(sin id)';
}

interface PayPalRaw { id?: string; status?: string; plan_id?: string; custom_id?: string; }

async function getPayPalRaw(subId: string): Promise<{ found: boolean; data?: PayPalRaw; error?: string }> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${getPayPalBaseUrl()}/v1/billing/subscriptions/${subId}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
    });
    if (res.status === 404) return { found: false };
    if (!res.ok) return { found: false, error: `HTTP ${res.status}` };
    return { found: true, data: await res.json() as PayPalRaw };
  } catch (e) {
    return { found: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function main() {
  console.log(`Environment PayPal: ${process.env.PAYPAL_MODE ?? 'undefined'}\n`);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('user_identifier, tier, status, paypal_sub_id')
    .order('updated_at', { ascending: false });

  const today = new Date().toISOString().split('T')[0];
  const rows: string[] = [];
  rows.push('| # | internal user | local sub ID | local status | queries_log tier | entitlement | PayPal lookup | environment | operación | acción recomendada |');
  rows.push('|---|---|---|---|---|---|---|---|---|---|');

  for (let i = 0; i < (subs ?? []).length; i++) {
    const s = subs![i];
    const alias = `CLIENTE_${String.fromCharCode(65 + i)}`;

    const { data: ql } = await supabase
      .from('queries_log').select('tier').eq('user_identifier', s.user_identifier).eq('query_date', today).maybeSingle();

    let paypalResult = '(sin sub_id local)';
    let operacion = 'no encontrada';
    let accion = 'sin acción — no hay subscription_id que verificar';

    if (s.paypal_sub_id) {
      const raw = await getPayPalRaw(s.paypal_sub_id);
      if (raw.error) {
        paypalResult = `error de consulta (${raw.error})`;
        accion = 'reintentar consulta más tarde';
      } else if (!raw.found) {
        paypalResult = '404 NOT_FOUND';
        operacion = 'no encontrada';
        accion = 'REQUIERE ID REAL DEL DASHBOARD DE PAYPAL — no reconciliar con este id';
      } else {
        paypalResult = `status=${raw.data!.status}`;
        operacion = 'subscription';
        if (raw.data!.status === 'ACTIVE') {
          accion = s.status === 'active'
            ? 'sin acción — ya coincide'
            : 'candidato a reconcile --apply (PayPal confirma ACTIVE)';
        } else {
          accion = `sin acción automática — PayPal reporta '${raw.data!.status}', no ACTIVE`;
        }
      }
    }

    rows.push([
      i + 1, alias, redactSubId(s.paypal_sub_id), s.status,
      ql?.tier ?? '(sin fila hoy)', '(ninguno — tabla entitlements aún no existe, Fase 2)',
      paypalResult, process.env.PAYPAL_MODE ?? 'undefined', operacion, accion,
    ].join(' | ').replace(/^/, '| ') + ' |');

    console.log(`${alias}: correo=${redactEmail(s.user_identifier)} sub=${redactSubId(s.paypal_sub_id)} → ${paypalResult}`);
  }

  console.log('\n--- Tabla Markdown (para el informe) ---\n');
  console.log(rows.join('\n'));
}

main().catch((e) => { console.error('Error:', e instanceof Error ? e.message : e); process.exit(1); });
