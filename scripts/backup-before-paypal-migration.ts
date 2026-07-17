/**
 * scripts/backup-before-paypal-migration.ts
 *
 * Backup lógico (no reemplaza el backup físico de Supabase) de las
 * tablas que la migración de la máquina de estados va a tocar, ANTES de
 * aplicarla. La única tabla con una alteración estructural real sobre
 * datos existentes es paypal_events (cambia su PRIMARY KEY) — el resto
 * son tablas nuevas sin datos previos.
 *
 * Uso: npx tsx scripts/backup-before-paypal-migration.ts
 * Salida: backups/paypal-pre-migration-<timestamp>.json (gitignored)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL no configurada.');
    process.exit(1);
  }

  const pg = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const tables = ['subscriptions', 'queries_log', 'paypal_events'];
  const backup: Record<string, unknown[]> = {};

  for (const table of tables) {
    const { rows: existsRows } = await pg.query(`select to_regclass('public.${table}') is not null as exists`);
    if (!existsRows[0]?.exists) {
      console.log(`(omitida) ${table} no existe todavía`);
      backup[table] = [];
      continue;
    }
    const { rows } = await pg.query(`select * from ${table}`);
    backup[table] = rows;
    console.log(`${table}: ${rows.length} filas respaldadas`);
  }

  await pg.end();

  const dir = resolve(process.cwd(), 'backups');
  if (!existsSync(dir)) mkdirSync(dir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = resolve(dir, `paypal-pre-migration-${timestamp}.json`);
  writeFileSync(outPath, JSON.stringify(backup, null, 2), 'utf-8');
  console.log(`\nBackup escrito en: ${outPath}`);
}

main().catch((err) => {
  console.error('Error en backup:', err instanceof Error ? err.message : err);
  process.exit(1);
});
