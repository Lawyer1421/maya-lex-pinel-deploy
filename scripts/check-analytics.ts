/**
 * scripts/check-analytics.ts
 * Verifica que las tablas analytics existen en Supabase,
 * muestra conteo de registros y confirma que RLS está activo.
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY  (opcional — para verificar RLS)
 *
 * Uso: npm run check:analytics
 * Solo lee datos — no hace cambios en la base de datos.
 */

import { resolve }      from 'path';
import { config }       from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

// ── Colores ANSI ──────────────────────────────────────────────────────────
const ok   = (m: string) => console.log(`\x1b[32m✅ ${m}\x1b[0m`);
const fail = (m: string) => console.error(`\x1b[31m❌ ${m}\x1b[0m`);
const warn = (m: string) => console.log(`\x1b[33m⚠️  ${m}\x1b[0m`);
const dim  = (m: string) => `\x1b[2m${m}\x1b[0m`;

const TABLES = ['consultas', 'feedback'] as const;

async function main(): Promise<void> {
  console.log('\x1b[1m\n🔍 Verificando analytics en Supabase...\x1b[0m\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !serviceKey) {
    fail('Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
    process.exit(1);
  }

  const proyRef = supabaseUrl.replace(/https?:\/\//, '').split('.')[0];
  console.log(`📡 Proyecto: ${dim(proyRef)}\n`);

  // ── 1. Verificar tablas y conteo (service_role bypasa RLS) ───────────
  console.log('📋 Tablas:');
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  let allTablesOk = true;
  for (const table of TABLES) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      if (error.code === '42P01') {
        fail(`   ${table}: NO EXISTE — ejecuta: npm run migrate:analytics`);
      } else {
        warn(`   ${table}: ${error.message} ${dim(`(código: ${error.code})`)}`);
      }
      allTablesOk = false;
    } else {
      ok(`   ${table}: ${count ?? 0} registros`);
    }
  }

  // ── 2. Verificar RLS (acceso anónimo debe ser denegado) ─────────────
  console.log('\n🔒 RLS (Row Level Security):');
  if (anonKey) {
    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });

    for (const table of TABLES) {
      const { error } = await anonClient.from(table).select('id').limit(1);

      if (!error) {
        warn(`   ${table}: acceso anónimo PERMITIDO — revisar políticas RLS`);
        allTablesOk = false;
      } else if (
        error.code === '42501' ||
        error.message.toLowerCase().includes('row-level security') ||
        error.message.toLowerCase().includes('permission denied')
      ) {
        ok(`   ${table}: RLS activo (anónimo denegado correctamente)`);
      } else {
        warn(`   ${table}: ${error.message}`);
      }
    }
  } else {
    warn('   NEXT_PUBLIC_SUPABASE_ANON_KEY no configurada — RLS no verificado');
    console.log(`   ${dim('Agrega NEXT_PUBLIC_SUPABASE_ANON_KEY a .env.local para verificar RLS.')}`);
  }

  // ── 3. Resumen ──────────────────────────────────────────────────────
  console.log('');
  if (allTablesOk) {
    console.log('\x1b[1m\x1b[32m✅ Analytics OK — sistema listo para producción\x1b[0m\n');
  } else {
    console.log('\x1b[33m⚠️  Hay problemas. Ejecuta: npm run migrate:analytics\x1b[0m\n');
    process.exit(1);
  }
}

main().catch((e) => {
  fail(`Error: ${(e as Error).message}`);
  process.exit(1);
});
