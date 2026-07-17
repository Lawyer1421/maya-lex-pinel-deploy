/**
 * scripts/profiles-backfill.ts
 *
 * Crea profiles para usuarios de auth.users que existían ANTES de la
 * migración 20260718020000 (el trigger on_auth_user_created solo
 * dispara en altas NUEVAS, no retroactivamente).
 *
 * Uso:
 *   npm run profiles-backfill -- --dry-run
 *   npm run profiles-backfill -- --apply --confirm
 *
 * Reglas:
 *   - email siempre se sincroniza al valor actual de auth.users.email
 *     (no es un dato "editado por el usuario", es un espejo de identidad).
 *   - display_name SOLO se toma de raw_user_meta_data (full_name | name)
 *     si existe — nunca se inventa un nombre.
 *   - Si el profile YA EXISTE y ya tiene display_name, NUNCA se
 *     sobrescribe (podría haber sido editado manualmente en el futuro).
 *   - Upsert idempotente: correr dos veces produce el mismo resultado.
 */
import { resolve } from 'path';
import { config } from 'dotenv';
import { Client } from 'pg';

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

function redactEmail(email: string | null): string {
  if (!email) return '(sin correo)';
  const [u, d] = email.split('@');
  return d ? `${u.slice(0, 2)}***@${d}` : '***';
}

export function extractDisplayName(rawUserMetaData: Record<string, unknown> | null): string | null {
  if (!rawUserMetaData) return null;
  const name = rawUserMetaData.full_name ?? rawUserMetaData.name;
  return typeof name === 'string' && name.trim() ? name.trim() : null;
}

async function main() {
  console.log(dim(`Modo: ${DRY_RUN ? 'DRY-RUN' : 'APPLY'}\n`));

  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const { rows: users } = await pg.query(`select id, email, raw_user_meta_data from auth.users`);
  const { rows: existingProfiles } = await pg.query(`select id, email, display_name from profiles`);
  const profilesById = new Map(existingProfiles.map((p) => [p.id, p]));

  let created = 0, emailSynced = 0, displayNameSet = 0, unchanged = 0, missingAfter = 0;

  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    const alias = `USUARIO_${String.fromCharCode(65 + i)}`;
    const existing = profilesById.get(u.id);
    const computedDisplayName = extractDisplayName(u.raw_user_meta_data);

    console.log(`\n${alias} ${dim(`(${redactEmail(u.email)})`)}`);

    if (!existing) {
      ok(`  Profile no existe — se ${DRY_RUN ? 'crearía' : 'crea'} con email sincronizado` + (computedDisplayName ? ` y display_name='${computedDisplayName}'` : ' (sin display_name — no había metadata)'));
      created++;
      if (!DRY_RUN) {
        await pg.query(
          `insert into profiles (id, email, display_name) values ($1, $2, $3) on conflict (id) do nothing`,
          [u.id, u.email, computedDisplayName]
        );
      }
      continue;
    }

    const needsEmailSync = existing.email !== u.email;
    const needsDisplayName = !existing.display_name && computedDisplayName;

    if (!needsEmailSync && !needsDisplayName) {
      ok('  Ya está al día — sin cambios.');
      unchanged++;
      continue;
    }

    if (needsEmailSync) { ok(`  Email desactualizado — se ${DRY_RUN ? 'sincronizaría' : 'sincroniza'}.`); emailSynced++; }
    if (needsDisplayName) { ok(`  display_name faltante, hay metadata disponible — se ${DRY_RUN ? 'agregaría' : 'agrega'} '${computedDisplayName}'.`); displayNameSet++; }
    else if (!existing.display_name) {
      warn('  display_name faltante, sin metadata disponible — se deja vacío (no se inventa).');
    }

    if (!DRY_RUN) {
      await pg.query(
        `update profiles set
           email = $2,
           display_name = coalesce(display_name, $3),
           updated_at = now()
         where id = $1`,
        [u.id, u.email, computedDisplayName]
      );
    }
  }

  // Reporte de faltantes (sanity check — no debería haber ninguno tras aplicar)
  if (!DRY_RUN) {
    const { rows: stillMissing } = await pg.query(`
      select u.id from auth.users u left join profiles p on p.id = u.id where p.id is null
    `);
    missingAfter = stillMissing.length;
  }

  console.log(`\n${dim('─'.repeat(50))}`);
  console.log(`Total usuarios: ${users.length} | Creados: ${created} | Email sincronizado: ${emailSynced} | display_name agregado: ${displayNameSet} | Sin cambios: ${unchanged}`);
  if (!DRY_RUN) console.log(`Faltantes después de aplicar (deberían ser 0): ${missingAfter}`);
  if (DRY_RUN) ok('\nDRY-RUN completo. Ningún profile fue creado ni modificado.');

  await pg.end();
}

main().catch((e) => { fail(`Error fatal: ${e instanceof Error ? e.message : e}`); process.exit(1); });
