/**
 * scripts/migrate-identity.ts
 * Ejecuta, EN ORDEN, las 4 migraciones de la fase de identidad:
 *   1. 20260718000000_entitlements.sql
 *   2. 20260718010000_identity_uuid_expand.sql
 *   3. 20260718020000_profiles_and_identity_linking.sql
 *   4. 20260718030000_auth_rate_limits.sql
 *
 * Ver docs/MIGRATIONS_INVENTORY.md para el inventario completo con
 * checksums y dependencias.
 *
 * NO se ejecuta contra producción todavía — requiere autorización
 * explícita adicional. Prerrequisito: 20260717010000/020000 ya
 * aplicadas (npm run migrate:paypal-state-machine).
 *
 * Uso: npx tsx scripts/migrate-identity.ts
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const ok   = (m: string) => console.log(`\x1b[32m✅ ${m}\x1b[0m`);
const fail = (m: string) => console.error(`\x1b[31m❌ ${m}\x1b[0m`);
const warn = (m: string) => console.log(`\x1b[33m⚠️  ${m}\x1b[0m`);
const step = (m: string) => console.log(`\x1b[36m\n${m}\x1b[0m`);

const MIGRATION_FILES = [
  '20260718000000_entitlements.sql',
  '20260718010000_identity_uuid_expand.sql',
  '20260718020000_profiles_and_identity_linking.sql',
  '20260718030000_auth_rate_limits.sql',
] as const;

const NEW_TABLES = [
  'entitlements', 'entitlement_audit_events', 'profiles', 'identity_link_events', 'auth_resend_attempts',
] as const;

async function main(): Promise<void> {
  console.log('\x1b[1m\n🚀 Migrando fase de identidad a Supabase...\x1b[0m\n');

  const dbUrl       = process.env.DATABASE_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!dbUrl || !supabaseUrl || !serviceKey) {
    fail('Falta DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
    process.exit(1);
  }

  const pg = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  ok('Conexión PostgreSQL exitosa');

  try {
    step('🔍 Verificando prerrequisito (paypal_apply_event ya existe)...');
    const { rows: pre } = await pg.query(`select proname from pg_proc where proname = 'paypal_apply_event'`);
    if (pre.length === 0) {
      fail('paypal_apply_event no existe — ejecuta primero npm run migrate:paypal-state-machine');
      process.exit(1);
    }
    ok('  Prerrequisito OK');

    for (const migrationFile of MIGRATION_FILES) {
      step(`▶️  Ejecutando ${migrationFile}...`);
      const sql = readFileSync(resolve(process.cwd(), 'supabase', 'migrations', migrationFile), 'utf-8');
      await pg.query(sql);
      ok(`   ${migrationFile} ejecutada`);
    }

    step('📊 Verificando resultado...');
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    let allOk = true;
    for (const table of NEW_TABLES) {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) { warn(`   ${table}: ${error.message}`); allOk = false; }
      else ok(`   Tabla '${table}' disponible (${count ?? 0} registros)`);
    }

    const { rows: trig } = await pg.query(`select tgname from pg_trigger where tgrelid = 'auth.users'::regclass`);
    if (trig.some((r) => r.tgname === 'on_auth_user_created')) {
      ok('   Trigger on_auth_user_created presente en auth.users ✓');
    } else {
      warn('   Trigger on_auth_user_created NO encontrado en auth.users');
      allOk = false;
    }

    console.log('');
    console.log(allOk
      ? '\x1b[1m\x1b[32m🎉 Migración de identidad completada exitosamente\x1b[0m\n'
      : '\x1b[33m⚠️  Migración ejecutada con advertencias — revisa los errores arriba.\x1b[0m\n');
  } finally {
    await pg.end();
  }
}

main().catch((e) => {
  fail(`Error fatal: ${(e as Error).message}`);
  process.exit(1);
});
