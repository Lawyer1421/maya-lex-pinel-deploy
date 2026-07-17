/**
 * scripts/backfill-report-identity-uuid.ts — Fase 3, reporte SOLO LECTURA
 *
 * Compara subscriptions.user_identifier (email:{correo}) contra
 * auth.users.email real, y reporta matches únicos / sin match /
 * ambiguos / duplicados. NO escribe nada — ni siquiera llena la columna
 * user_id agregada por la migración EXPAND. Es insumo para decidir,
 * en una fase posterior, cómo backfillear con seguridad.
 *
 * "Ambiguo" nunca se resuelve automáticamente aquí — solo se reporta.
 *
 * Uso: npx tsx scripts/backfill-report-identity-uuid.ts
 */
import { resolve } from 'path';
import { config } from 'dotenv';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

function redactEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  return `${user.slice(0, 2)}***@${domain}`;
}

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  const { rows: users } = await pg.query(`select id, lower(trim(email)) as email_norm from auth.users`);
  const { rows: subs } = await pg.query(`select user_identifier, tier, status from subscriptions`);

  const usersByEmail = new Map<string, string[]>(); // email_norm -> [auth.users.id, ...]
  for (const u of users) {
    if (!u.email_norm) continue;
    const list = usersByEmail.get(u.email_norm) ?? [];
    list.push(u.id);
    usersByEmail.set(u.email_norm, list);
  }

  let uniqueMatches = 0, noMatch = 0, ambiguous = 0;
  const resolvedUserIds = new Map<string, string[]>(); // auth.users.id -> [subscription user_identifiers matched to it]
  const report: string[] = [];
  report.push('| # | subscription (correo redactado) | email normalizado coincide con auth.users | resultado |');
  report.push('|---|---|---|---|');

  subs.forEach((s, i) => {
    const alias = `CLIENTE_${String.fromCharCode(65 + i)}`;
    const m = String(s.user_identifier).match(/^email:(.+)$/);
    const emailNorm = m ? m[1].trim().toLowerCase() : null;
    const matches = emailNorm ? (usersByEmail.get(emailNorm) ?? []) : [];

    let resultado: string;
    if (!emailNorm) {
      resultado = 'user_identifier no tiene formato email: — revisar manualmente';
      noMatch++;
    } else if (matches.length === 0) {
      resultado = 'SIN MATCH — no existe auth.users con ese correo (¿cuenta borrada? ¿correo distinto?)';
      noMatch++;
    } else if (matches.length === 1) {
      resultado = 'match único';
      uniqueMatches++;
      const list = resolvedUserIds.get(matches[0]) ?? [];
      list.push(String(s.user_identifier));
      resolvedUserIds.set(matches[0], list);
    } else {
      resultado = `AMBIGUO — ${matches.length} usuarios de auth.users comparten ese correo normalizado`;
      ambiguous++;
    }

    report.push(`| ${i + 1} | ${alias} (${redactEmail(emailNorm ?? '(sin correo)')}) | ${emailNorm ? 'sí, ' + matches.length + ' fila(s)' : 'n/a'} | ${resultado} |`);
  });

  // Duplicados: un mismo auth.users.id resuelto por MÁS DE UNA fila de subscriptions
  const duplicates = [...resolvedUserIds.entries()].filter(([, subIds]) => subIds.length > 1);

  await pg.end();

  console.log(report.join('\n'));
  console.log('\n--- Resumen ---');
  console.log(`Matches únicos: ${uniqueMatches}`);
  console.log(`Sin match: ${noMatch}`);
  console.log(`Ambiguos: ${ambiguous}`);
  console.log(`Duplicados (mismo auth.users.id resuelto por >1 fila de subscriptions): ${duplicates.length}`);
  if (duplicates.length > 0) {
    console.log('Detalle de duplicados (auth.users.id → cuántas filas de subscriptions apuntan a él):');
    duplicates.forEach(([uid, subIds]) => console.log(`  ${uid.slice(0, 8)}...: ${subIds.length} filas`));
  }
  console.log('\nNinguna fila fue modificada. Este es un reporte de solo lectura.');
}

main().catch((e) => { console.error('Error:', e instanceof Error ? e.message : e); process.exit(1); });
