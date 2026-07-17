/**
 * scripts/identity-backfill.ts
 *
 * Backfillea user_id (UUID de auth.users) en subscriptions, queries_log,
 * billing_state_transitions, billing_duplicate_attempts y entitlements,
 * a partir del user_identifier (email:{correo}) existente.
 *
 * Uso:
 *   npm run identity-backfill -- --dry-run
 *   npm run identity-backfill -- --apply --confirm --user=email:x@y.com
 *   npm run identity-backfill -- --apply --confirm --all
 *
 * Requiere: 20260718010000_identity_uuid_expand.sql ya aplicada
 * (columnas user_id existen).
 *
 * Reglas:
 *   - dry-run es el modo por defecto (cualquier invocación sin --apply
 *     Y --confirm cae en dry-run, sin escribir nada).
 *   - --apply exige --confirm además — evita ejecuciones accidentales.
 *   - --all exige una confirmación EXTRA (--yes-i-mean-all) para
 *     backfillear TODOS los usuarios de una sola corrida.
 *   - Nunca sobrescribe un user_id ya establecido si difiere del
 *     calculado — se reporta como conflicto y se omite.
 *   - Cada usuario se procesa en su propia transacción (BEGIN/COMMIT) —
 *     un fallo en un usuario no revierte los ya aplicados antes.
 *   - No resuelve ambigüedades automáticamente (0 o 2+ matches → se
 *     omite y se reporta, igual que el reporte de solo lectura de Fase 3).
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
const ALL = args.includes('--all');
const ALL_CONFIRMED = args.includes('--yes-i-mean-all');
const DRY_RUN = !APPLY || !CONFIRM;
const ONLY_USER = args.find((a) => a.startsWith('--user='))?.split('=').slice(1).join('=');

const TABLES_WITH_USER_ID = [
  'subscriptions', 'queries_log', 'billing_state_transitions', 'billing_duplicate_attempts',
] as const;

function redactEmail(email: string): string {
  const [u, d] = email.split('@');
  return d ? `${u.slice(0, 2)}***@${d}` : '***';
}

export type BackfillDecision =
  | { action: 'apply'; userId: string }
  | { action: 'already_correct'; userId: string }
  | { action: 'skip_no_match' }
  | { action: 'skip_ambiguous'; candidateCount: number }
  | { action: 'skip_conflict'; existingUserId: string; computedUserId: string };

/**
 * Decisión pura (sin I/O) de qué hacer con una fila de subscriptions
 * dado el user_identifier, su user_id actual (si tiene) y los
 * auth.users.id candidatos que matchean su correo normalizado.
 * Extraída para poder probarla sin una base de datos real.
 */
export function decideBackfillAction(params: {
  userIdentifier: string;
  currentUserId: string | null;
  matchingAuthUserIds: string[];
}): BackfillDecision {
  const m = params.userIdentifier.match(/^email:(.+)$/);
  if (!m) return { action: 'skip_no_match' };

  if (params.matchingAuthUserIds.length === 0) return { action: 'skip_no_match' };
  if (params.matchingAuthUserIds.length > 1) {
    return { action: 'skip_ambiguous', candidateCount: params.matchingAuthUserIds.length };
  }

  const computedUserId = params.matchingAuthUserIds[0];

  if (params.currentUserId && params.currentUserId !== computedUserId) {
    return { action: 'skip_conflict', existingUserId: params.currentUserId, computedUserId };
  }
  if (params.currentUserId === computedUserId) {
    return { action: 'already_correct', userId: computedUserId };
  }
  return { action: 'apply', userId: computedUserId };
}

async function ensureAuditTable(pg: Client) {
  await pg.query(`
    create table if not exists identity_backfill_log (
      id               uuid primary key default gen_random_uuid(),
      user_identifier  text not null,
      auth_user_id     uuid,
      table_name       text not null,
      before_user_id   uuid,
      after_user_id    uuid,
      outcome          text not null,
      created_at       timestamptz not null default now()
    )
  `);
}

async function main() {
  if (!DRY_RUN && ALL && !ALL_CONFIRMED) {
    fail('--all con --apply requiere además --yes-i-mean-all (confirmación explícita para backfillear TODOS los usuarios). Abortando.');
    process.exit(1);
  }
  if (!DRY_RUN && !ONLY_USER && !ALL) {
    fail('Modo --apply requiere --user=<user_identifier> o --all --yes-i-mean-all. Abortando.');
    process.exit(1);
  }

  console.log(dim(`Modo: ${DRY_RUN ? 'DRY-RUN' : 'APPLY'}${ONLY_USER ? ' | usuario único' : ALL ? ' | TODOS los usuarios' : ''}\n`));

  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();
  if (!DRY_RUN) await ensureAuditTable(pg);

  const { rows: users } = await pg.query(`select id, lower(trim(email)) as email_norm from auth.users`);
  const usersByEmail = new Map<string, string[]>();
  for (const u of users) {
    if (!u.email_norm) continue;
    usersByEmail.set(u.email_norm, [...(usersByEmail.get(u.email_norm) ?? []), u.id]);
  }

  let subsQuery = `select user_identifier, user_id from subscriptions where user_identifier is not null`;
  const params: string[] = [];
  if (ONLY_USER) { subsQuery += ` and user_identifier = $1`; params.push(ONLY_USER); }
  const { rows: subs } = await pg.query(subsQuery, params);

  if (ONLY_USER && subs.length === 0) {
    fail('No se encontró ninguna fila de subscriptions con ese user_identifier. Abortando.');
    process.exit(1);
  }

  let applied = 0, skippedAmbiguous = 0, skippedNoMatch = 0, skippedConflict = 0, alreadyCorrect = 0;

  for (let i = 0; i < subs.length; i++) {
    const row = subs[i];
    const alias = `CLIENTE_${String.fromCharCode(65 + i)}`;
    const m = String(row.user_identifier).match(/^email:(.+)$/);
    const emailNorm = m ? m[1].trim().toLowerCase() : null;
    const matches = emailNorm ? (usersByEmail.get(emailNorm) ?? []) : [];

    console.log(`\n${alias} ${dim(`(${redactEmail(emailNorm ?? '(sin correo)')})`)}`);

    const decision = decideBackfillAction({
      userIdentifier: row.user_identifier, currentUserId: row.user_id, matchingAuthUserIds: matches,
    });

    if (decision.action === 'skip_no_match') { warn('  sin match — omitido'); skippedNoMatch++; continue; }
    if (decision.action === 'skip_ambiguous') { warn(`  ambiguo (${decision.candidateCount} candidatos) — omitido`); skippedAmbiguous++; continue; }
    if (decision.action === 'skip_conflict') {
      fail(`  CONFLICTO: user_id ya tiene un valor distinto (${decision.existingUserId.slice(0, 8)}...) al calculado (${decision.computedUserId.slice(0, 8)}...) — NUNCA se sobrescribe. Omitido.`);
      skippedConflict++;
      continue;
    }
    if (decision.action === 'already_correct') {
      ok(`  Ya correcto (user_id=${decision.userId.slice(0, 8)}...) — sin cambios.`);
      alreadyCorrect++;
      continue;
    }

    const computedUserId = decision.userId;
    ok(`  Candidato: user_id=${computedUserId.slice(0, 8)}... (match único)`);

    if (DRY_RUN) continue;

    try {
      await pg.query('begin');
      for (const table of TABLES_WITH_USER_ID) {
        const before = await pg.query(
          `select user_id from ${table} where user_identifier = $1`, [row.user_identifier]
        );
        await pg.query(
          `update ${table} set user_id = $1 where user_identifier = $2 and (user_id is null or user_id = $1)`,
          [computedUserId, row.user_identifier]
        );
        await pg.query(
          `insert into identity_backfill_log (user_identifier, auth_user_id, table_name, before_user_id, after_user_id, outcome)
           values ($1, $2, $3, $4, $5, 'applied')`,
          [row.user_identifier, computedUserId, table, before.rows[0]?.user_id ?? null, computedUserId]
        );
      }
      await pg.query('commit');
      ok(`  ✓ Aplicado en: ${TABLES_WITH_USER_ID.join(', ')}`);
      applied++;
    } catch (err) {
      await pg.query('rollback');
      fail(`  Error aplicando (rollback de este usuario únicamente): ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`\n${dim('─'.repeat(50))}`);
  console.log(`Total: ${subs.length} | Aplicados: ${applied} | Ya correctos: ${alreadyCorrect} | Sin match: ${skippedNoMatch} | Ambiguos: ${skippedAmbiguous} | Conflictos: ${skippedConflict}`);
  if (DRY_RUN) ok('\nDRY-RUN completo. Ninguna fila fue modificada.');

  await pg.end();
}

main().catch((e) => { fail(`Error fatal: ${e instanceof Error ? e.message : e}`); process.exit(1); });
