/**
 * scripts/migrate-analytics.ts
 * Ejecuta supabase/analytics.sql en la base de datos de Supabase.
 *
 * Requiere en .env.local:
 *   DATABASE_URL        → URI de PostgreSQL (ver Supabase → Settings → Database → URI)
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Uso: npm run migrate:analytics
 *
 * Por qué usa 'pg' y no solo supabase-js:
 *   @supabase/supabase-js expone PostgREST (DML únicamente).
 *   DDL (CREATE TABLE, ALTER TABLE, CREATE POLICY) requiere
 *   conexión directa a PostgreSQL vía el driver nativo.
 */

import { readFileSync } from 'fs';
import { resolve }      from 'path';
import { config }       from 'dotenv';
import { Client }       from 'pg';
import { createClient } from '@supabase/supabase-js';

// Cargar .env.local primero (mayor prioridad), luego .env
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

// ── Colores ANSI ──────────────────────────────────────────────────────────
const ok   = (m: string) => console.log(`\x1b[32m✅ ${m}\x1b[0m`);
const fail = (m: string) => console.error(`\x1b[31m❌ ${m}\x1b[0m`);
const warn = (m: string) => console.log(`\x1b[33m⚠️  ${m}\x1b[0m`);
const step = (m: string) => console.log(`\x1b[36m\n${m}\x1b[0m`);
const dim  = (m: string) => `\x1b[2m${m}\x1b[0m`;

// Archivos SQL a ejecutar, en orden
const SQL_FILES = ['analytics.sql', 'subscriptions.sql'] as const;

// Tablas esperadas tras la migración
const TABLES = [
  'consultas', 'feedback',                        // analytics.sql
  'subscriptions', 'paypal_events', 'queries_log', // subscriptions.sql
] as const;

async function main(): Promise<void> {
  console.log('\x1b[1m\n🚀 Migrando analítica a Supabase...\x1b[0m\n');

  // ── 1. Verificar variables de entorno ──────────────────────────────────
  const dbUrl       = process.env.DATABASE_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!dbUrl) {
    fail('DATABASE_URL no está configurada en .env.local');
    console.log(`   Obtén la URI en: Supabase Dashboard → Settings → Database → URI`);
    console.log(`   Formato: postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres`);
    console.log(`   También disponible como "Transaction pooler" (puerto 6543)\n`);
    process.exit(1);
  }
  if (!supabaseUrl || !serviceKey) {
    fail('Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
    process.exit(1);
  }

  // Mostrar URL ocultando el password
  const safeUrl = dbUrl.replace(/:([^@:\/]+)@/, ':***@');
  console.log(`📡 Conectando a: ${dim(safeUrl)}`);

  // ── 2. Conectar a PostgreSQL ───────────────────────────────────────────
  const pg = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }, // necesario para Supabase en producción
  });

  try {
    await pg.connect();
    ok('Conexión PostgreSQL exitosa');
  } catch (e) {
    fail(`Error de conexión: ${(e as Error).message}`);
    console.log(`   Verifica que DATABASE_URL sea correcta y la IP esté habilitada en`);
    console.log(`   Supabase → Settings → Database → Network → Allowed IPs\n`);
    process.exit(1);
  }

  try {
    // ── 3. Leer SQL ──────────────────────────────────────────────────────
    step('📄 Leyendo archivos SQL...');
    const sqlScripts: { nombre: string; sql: string }[] = [];
    for (const nombre of SQL_FILES) {
      const sqlPath = resolve(process.cwd(), 'supabase', nombre);
      try {
        const sql = readFileSync(sqlPath, 'utf-8');
        const lineas = sql.split('\n').filter(l => l.trim() && !l.trim().startsWith('--')).length;
        ok(`   ${nombre} (${lineas} líneas de código)`);
        sqlScripts.push({ nombre, sql });
      } catch {
        fail(`No se encontró supabase/${nombre}`);
        process.exit(1);
      }
    }

    // ── 4. Estado previo ─────────────────────────────────────────────────
    step('🔍 Verificando tablas existentes...');
    for (const table of TABLES) {
      const { rows } = await pg.query(
        `SELECT to_regclass('public."${table}"') IS NOT NULL AS exists`
      );
      rows[0]?.exists
        ? ok(`   ${table}: ya existe`)
        : warn(`   ${table}: no existe (se creará)`);
    }

    // ── 5. Ejecutar migración ─────────────────────────────────────────────
    step('▶️  Ejecutando migración...');
    for (const { nombre, sql } of sqlScripts) {
      await pg.query(sql);
      ok(`   ${nombre} ejecutado`);
    }

    // ── 6. Verificar con supabase-js (service_role bypasa RLS) ───────────
    step('📊 Verificando resultado...');
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    let allOk = true;
    for (const table of TABLES) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        warn(`   ${table}: ${error.message}`);
        allOk = false;
      } else {
        ok(`   Tabla '${table}' disponible (${count ?? 0} registros)`);
      }
    }

    console.log('');
    if (allOk) {
      console.log('\x1b[1m\x1b[32m🎉 Migración completada exitosamente\x1b[0m');
      console.log(dim('   Las tablas analytics están listas. El logging de consultas está activo.\n'));
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
