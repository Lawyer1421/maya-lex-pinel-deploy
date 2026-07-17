/**
 * scripts/reconcile-paypal-subscriptions.ts
 *
 * Compara subscriptions (local) contra el recurso canónico de PayPal para
 * cada cliente y reporta discrepancias. NUNCA escribe nada en --dry-run
 * (el modo por defecto y el único habilitado en este sprint).
 *
 * Uso:
 *   npm run reconcile:paypal:dry-run
 *   npx tsx scripts/reconcile-paypal-subscriptions.ts --dry-run [--limit=50]
 *
 * Modo --apply (NO ejecutar todavía — requiere autorización explícita
 * fuera de este sprint):
 *   npx tsx scripts/reconcile-paypal-subscriptions.ts --apply --confirm
 *   Requiere además ALLOW_PAYPAL_RECONCILE_APPLY=true en el entorno.
 *   Reutiliza la misma RPC paypal_apply_event (transaccional, idempotente)
 *   que usa el webhook — nunca hace un UPDATE directo.
 *   Nunca actúa si PayPal devuelve 404 para el subscription_id local.
 *   Nunca activa solo por un correo o recibo no verificado — exige que
 *   PayPal confirme status=ACTIVE, plan_id permitido y custom_id.u
 *   coincidente con el user_identifier local antes de tocar nada.
 *
 * Salida: antes/después por cliente, con PII redactada (CLIENTE_A,
 * CLIENTE_B, ... — sin correos, sin subscription IDs completos).
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const ok   = (m: string) => console.log(`\x1b[32m${m}\x1b[0m`);
const warn = (m: string) => console.log(`\x1b[33m${m}\x1b[0m`);
const fail = (m: string) => console.error(`\x1b[31m${m}\x1b[0m`);
const dim  = (m: string) => `\x1b[2m${m}\x1b[0m`;

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const CONFIRM = args.includes('--confirm');
const DRY_RUN = !APPLY || !CONFIRM; // cualquier cosa que no sea --apply --confirm completo es dry-run
const LIMIT = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? '50');

function redactEmail(email: string | null): string {
  if (!email) return '(sin correo)';
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  return `${user.slice(0, 2)}***@${domain}`;
}

function redactSubId(subId: string | null): string {
  if (!subId) return '(sin id)';
  return `***${subId.slice(-4)}`;
}

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const base = process.env.PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  if (!clientId || !clientSecret) throw new Error('PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET no configurados');

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`OAuth PayPal falló: HTTP ${res.status}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

async function getCanonicalSubscription(accessToken: string, subId: string) {
  const base = process.env.PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  const res = await fetch(`${base}/v1/billing/subscriptions/${subId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 404) return { notFound: true as const };
  if (!res.ok) return { error: `HTTP ${res.status}` as const };
  const data = (await res.json()) as { id: string; status: string; plan_id?: string; custom_id?: string };
  return { data };
}

async function main() {
  console.log(dim(`Modo: ${DRY_RUN ? 'DRY-RUN (solo lectura)' : 'APPLY'} | límite: ${LIMIT}\n`));

  if (!DRY_RUN) {
    if (process.env.ALLOW_PAYPAL_RECONCILE_APPLY !== 'true') {
      fail('APPLY bloqueado: falta ALLOW_PAYPAL_RECONCILE_APPLY=true en el entorno. Abortando.');
      process.exit(1);
    }
    warn('⚠️  Modo APPLY solicitado — este sprint NO debe ejecutarlo todavía sin autorización explícita adicional.');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    fail('NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados.');
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: rows, error } = await supabase
    .from('subscriptions')
    .select('user_identifier, paypal_sub_id, tier, status, email')
    .not('paypal_sub_id', 'is', null)
    .limit(LIMIT);

  if (error) {
    fail(`Error leyendo subscriptions: ${error.message}`);
    process.exit(1);
  }
  if (!rows || rows.length === 0) {
    ok('No hay filas con paypal_sub_id para reconciliar.');
    return;
  }

  const accessToken = await getPayPalAccessToken();

  let discrepancias = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const alias = `CLIENTE_${String.fromCharCode(65 + (i % 26))}${i >= 26 ? Math.floor(i / 26) : ''}`;
    const canonical = await getCanonicalSubscription(accessToken, row.paypal_sub_id as string);

    console.log(`\n${alias}  ${dim(`(correo: ${redactEmail(row.email)}, sub: ${redactSubId(row.paypal_sub_id)})`)}`);
    console.log(`  Local:  tier=${row.tier} status=${row.status}`);

    if ('notFound' in canonical) {
      fail(`  PayPal: 404 — el subscription_id local NO existe en PayPal (${process.env.PAYPAL_MODE ?? 'sandbox'}). NUNCA activar a ciegas este caso.`);
      discrepancias++;
      continue;
    }
    if ('error' in canonical) {
      warn(`  PayPal: error de consulta (${canonical.error}) — omitido, reintentar luego.`);
      continue;
    }

    const paypalStatus = canonical.data.status;
    const localIsActive = row.status === 'active';
    const paypalIsActive = paypalStatus === 'ACTIVE';

    console.log(`  PayPal: status=${paypalStatus} plan_id=${dim(canonical.data.plan_id ?? '(n/a)')}`);

    if (localIsActive === paypalIsActive) {
      ok('  ✓ Coincide — sin acción necesaria.');
      continue;
    }

    discrepancias++;
    if (paypalIsActive && !localIsActive) {
      warn(`  ⚠️  DISCREPANCIA: PayPal dice ACTIVE pero local dice '${row.status}'. Candidato a reconciliar → active.`);
    } else {
      warn(`  ⚠️  DISCREPANCIA: local dice 'active' pero PayPal dice '${paypalStatus}'. Requiere revisión manual (no reconciliar automáticamente a la baja).`);
    }

    if (!DRY_RUN) {
      warn('  (modo APPLY no implementado en este sprint — solo reporte)');
    }
  }

  console.log(`\n${dim('─'.repeat(50))}`);
  console.log(`Total revisados: ${rows.length} | Discrepancias encontradas: ${discrepancias}`);
  if (DRY_RUN) {
    ok('\nDRY-RUN completo. Ninguna escritura fue realizada.');
  }
}

main().catch((err) => {
  fail(`Error fatal: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
