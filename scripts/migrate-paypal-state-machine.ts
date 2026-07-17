/**
 * scripts/migrate-paypal-state-machine.ts
 * Ejecuta, EN ORDEN, ambas migraciones de la máquina de estados PayPal:
 *   1. 20260717010000_paypal_state_machine.sql
 *   2. 20260717020000_paypal_event_id_and_atomic_access.sql
 *
 * Requiere en .env.local: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Prerequisito: supabase/subscriptions.sql ya aplicado (npm run migrate:analytics).
 *
 * Uso: npm run migrate:paypal-state-machine
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
const dim  = (m: string) => `\x1b[2m${m}\x1b[0m`;

const MIGRATION_FILES = [
  '20260717010000_paypal_state_machine.sql',
  '20260717020000_paypal_event_id_and_atomic_access.sql',
] as const;
const NEW_TABLES = ['billing_duplicate_attempts', 'billing_verification_attempts', 'billing_state_transitions'] as const;

async function main(): Promise<void> {
  console.log('\x1b[1m\n🚀 Migrando máquina de estados PayPal a Supabase...\x1b[0m\n');

  const dbUrl       = process.env.DATABASE_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!dbUrl || !supabaseUrl || !serviceKey) {
    fail('Falta DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
    process.exit(1);
  }

  const pg = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  try {
    await pg.connect();
    ok('Conexión PostgreSQL exitosa');
  } catch (e) {
    fail(`Error de conexión: ${(e as Error).message}`);
    process.exit(1);
  }

  try {
    step('🔍 Verificando prerrequisito (tabla subscriptions)...');
    const { rows: pre } = await pg.query(`select to_regclass('public.subscriptions') is not null as exists`);
    if (!pre[0]?.exists) {
      fail('La tabla subscriptions no existe — ejecuta primero npm run migrate:analytics');
      process.exit(1);
    }
    ok('  subscriptions: existe');

    for (const migrationFile of MIGRATION_FILES) {
      step(`📄 Leyendo ${migrationFile}...`);
      const sqlPath = resolve(process.cwd(), 'supabase', 'migrations', migrationFile);
      const sql = readFileSync(sqlPath, 'utf-8');
      ok(`   ${migrationFile} (${sql.split('\n').length} líneas)`);

      step(`▶️  Ejecutando ${migrationFile} (100% aditiva)...`);
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

    for (const fn of ['paypal_apply_event', 'paypal_apply_downgrade']) {
      const { rows: perms } = await pg.query(
        `select grantee from information_schema.routine_privileges where routine_name = $1`, [fn]
      );
      const grantees = perms.map((r) => r.grantee);
      if (grantees.includes('service_role') && !grantees.includes('PUBLIC') && !grantees.includes('anon') && !grantees.includes('authenticated')) {
        ok(`   Permisos de ${fn}: solo service_role ✓`);
      } else {
        warn(`   Permisos de ${fn} inesperados: ${dim(JSON.stringify(grantees))}`);
        allOk = false;
      }
    }

    const { rows: pkRows } = await pg.query(`
      select a.attname from pg_constraint c
      join pg_attribute a on a.attnum = any(c.conkey) and a.attrelid = c.conrelid
      where c.conrelid = 'paypal_events'::regclass and c.contype = 'p'
    `);
    if (pkRows.length === 1 && pkRows[0].attname === 'event_id') {
      ok('   paypal_events.event_id es PRIMARY KEY ✓');
    } else {
      warn(`   PK inesperada en paypal_events: ${dim(JSON.stringify(pkRows))}`);
      allOk = false;
    }

    console.log('');
    if (allOk) {
      console.log('\x1b[1m\x1b[32m🎉 Migración completada exitosamente\x1b[0m\n');
    } else {
      warn('Migración ejecutada con advertencias — revisa los errores arriba.');
    }
  } finally {
    await pg.end();
  }
}

main().catch((e) => {
  fail(`Error fatal: ${(e as Error).message}`);
  process.exit(1);
});
