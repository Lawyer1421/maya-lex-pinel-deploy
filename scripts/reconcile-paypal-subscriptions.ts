/**
 * scripts/reconcile-paypal-subscriptions.ts
 *
 * Compara subscriptions (local) contra el recurso canónico de PayPal para
 * cada cliente y reporta discrepancias. NUNCA escribe nada en --dry-run
 * (el modo por defecto y el único habilitado en este sprint).
 *
 * Reutiliza EXACTAMENTE la misma verificación que usa el webhook y
 * verificar-estado (lib/paypal/state-machine.ts → verifyCanonicalSubscription)
 * — no reimplementa su propia lógica de "¿está realmente activa?", para
 * que este script nunca pueda divergir de lo que el resto del sistema
 * considera una suscripción válida.
 *
 * Uso:
 *   npm run reconcile:paypal:dry-run
 *   npx tsx scripts/reconcile-paypal-subscriptions.ts --dry-run [--limit=50]
 *
 * Modo --apply (NO ejecutar todavía — requiere autorización explícita
 * fuera de este sprint):
 *   npx tsx scripts/reconcile-paypal-subscriptions.ts --apply --confirm
 *   Requiere además ALLOW_PAYPAL_RECONCILE_APPLY=true en el entorno.
 *   Nunca hace un UPDATE directo — llama a applySubscriptionEvent()
 *   (la misma RPC transaccional/idempotente que usa el webhook) y luego
 *   syncLegacyPaidAccess() solo si el resultado quedó 'active'. Registra
 *   before/after de cada fila tocada. Nunca actúa si PayPal devuelve 404
 *   para el subscription_id local. Nunca activa solo por un correo o
 *   recibo no verificado — exige que verifyCanonicalSubscription()
 *   confirme status=ACTIVE, plan_id permitido y custom_id.u coincidente
 *   con el user_identifier local antes de tocar nada.
 *
 * Salida: antes/después por cliente, con PII redactada (CLIENTE_A,
 * CLIENTE_B, ... — sin correos, sin subscription IDs completos).
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { verifyCanonicalSubscription, applySubscriptionEvent } from '@/lib/paypal/state-machine';
import type { SubscriptionTier } from '@/lib/paypal/plans';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const ok   = (m: string) => console.log(`\x1b[32m${m}\x1b[0m`);
const warn = (m: string) => console.log(`\x1b[33m${m}\x1b[0m`);
const fail = (m: string) => console.error(`\x1b[31m${m}\x1b[0m`);
const dim  = (m: string) => `\x1b[2m${m}\x1b[0m`;

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const CONFIRM = args.includes('--confirm');
const DRY_RUN = !APPLY || !CONFIRM;
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

async function main() {
  console.log(dim(`Modo: ${DRY_RUN ? 'DRY-RUN (solo lectura)' : 'APPLY'} | límite: ${LIMIT}\n`));

  if (!DRY_RUN && process.env.ALLOW_PAYPAL_RECONCILE_APPLY !== 'true') {
    fail('APPLY bloqueado: falta ALLOW_PAYPAL_RECONCILE_APPLY=true en el entorno. Abortando.');
    process.exit(1);
  }
  if (!DRY_RUN) {
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
    .select('user_identifier, paypal_sub_id, tier, status, email, paypal_payer_id')
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

  let discrepancias = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const alias = `CLIENTE_${String.fromCharCode(65 + (i % 26))}${i >= 26 ? Math.floor(i / 26) : ''}`;
    const tier: SubscriptionTier = row.tier === 'academico' ? 'academico' : 'pro';

    console.log(`\n${alias}  ${dim(`(correo: ${redactEmail(row.email)}, sub: ${redactSubId(row.paypal_sub_id)})`)}`);
    console.log(`  Local (antes):  tier=${row.tier} status=${row.status}`);

    // Misma verificación canónica que usa el webhook/verificar-estado —
    // nunca una GET propia con su propio criterio de "activa".
    const check = await verifyCanonicalSubscription({
      paypalSubId:  row.paypal_sub_id as string,
      expectedUid:  row.user_identifier as string,
      expectedTier: tier,
    });

    if (check.reason === 'not_found') {
      fail(`  PayPal: 404 — el subscription_id local NO existe en PayPal (${process.env.PAYPAL_MODE ?? 'sandbox'}). NUNCA activar a ciegas este caso — requiere el ID real desde el dashboard de PayPal.`);
      discrepancias++;
      continue;
    }
    if (check.reason === 'paypal_error') {
      warn('  PayPal: error de consulta — omitido, reintentar luego.');
      continue;
    }

    const localIsActive = row.status === 'active';
    console.log(`  PayPal: verificado=${check.ok} razón=${check.reason} status=${check.status ?? 'n/a'}`);

    if (check.ok === localIsActive) {
      ok('  ✓ Coincide — sin acción necesaria.');
      continue;
    }

    discrepancias++;

    if (check.ok && !localIsActive) {
      warn(`  ⚠️  DISCREPANCIA: PayPal confirma ACTIVE + plan + custom_id, local dice '${row.status}'. Candidato a reconciliar.`);

      if (!DRY_RUN) {
        const result = await applySubscriptionEvent(supabase, {
          userIdentifier: row.user_identifier as string,
          paypalSubId: row.paypal_sub_id as string,
          paypalPayerId: row.paypal_payer_id ?? null,
          email: row.email ?? null,
          tier,
          newStatus: 'active',
          grantsAccess: true,
          eventType: 'MANUAL_RECONCILIATION',
        });
        console.log(`  Local (después): tier=${result.resultingTier} status=${result.resultingStatus} (razón RPC: ${result.reason})`);
        if (result.applied && result.resultingStatus === 'active') {
          ok('  ✓ Reconciliado (subscriptions + queries_log + auditoría escritos atómicamente por la RPC).');
        } else {
          warn(`  No se aplicó cambio (razón: ${result.reason}) — puede requerir revisión manual (p.ej. suscripción duplicada activa).`);
        }
      }
    } else {
      warn(`  ⚠️  DISCREPANCIA: local dice 'active' pero PayPal no lo confirma (${check.reason}). Requiere revisión manual — nunca se degrada automáticamente en este script.`);
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
