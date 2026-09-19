/**
 * PGlite — RLS Slice 3B (exequatur_diagnostico_intentos / progreso).
 * Identidad = auth.uid() (request.jwt.claim.sub). No aplica SQL en prod.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let db: PGlite;

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';

async function asRole(role: 'anon' | 'authenticated' | 'service_role') {
  await db.exec(`set role ${role}`);
}

async function resetToSuperuser() {
  await db.exec(`reset role`);
}

async function asAuthenticated(userId: string) {
  await resetToSuperuser();
  await db.exec(`select set_config('request.jwt.claim.sub', '${userId}', false)`);
  await asRole('authenticated');
}

beforeAll(async () => {
  db = new PGlite();

  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    alter role service_role bypassrls;

    create schema if not exists auth;
    create table auth.users (
      id uuid primary key,
      email text
    );
    create or replace function auth.uid() returns uuid
      language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
  `);

  await db.exec(`
    insert into auth.users (id, email) values
      ('${USER_A}', 'a@test.com'),
      ('${USER_B}', 'b@test.com');
  `);

  const migration = readFileSync(
    resolve(process.cwd(), 'supabase', 'migrations', '20260919000000_exequatur_diagnostico_intentos.sql'),
    'utf8',
  );
  await db.exec(migration);
});

afterAll(async () => {
  await db.close();
});

function insertIntentoSql(userIdExpr: string) {
  return `
    insert into public.exequatur_diagnostico_intentos (
      user_id, banco_version, curriculum_version, respuestas, aciertos, total
    ) values (
      ${userIdExpr}, 1, 1, '{}'::jsonb, 0, 6
    ) returning id
  `;
}

describe('migración 20260919000000 — RLS forzado', () => {
  it('ambas tablas tienen RLS + FORCE', async () => {
    const r = await db.query<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `select relname, relrowsecurity, relforcerowsecurity
         from pg_class
        where relname in ('exequatur_diagnostico_intentos', 'exequatur_diagnostico_progreso')
        order by relname`,
    );
    expect(r.rows).toHaveLength(2);
    for (const row of r.rows) {
      expect(row.relrowsecurity).toBe(true);
      expect(row.relforcerowsecurity).toBe(true);
    }
  });
});

describe('authenticated — propio vs ajeno (IDOR)', () => {
  let intentoA: string;

  it('A puede insertar su propio intento (user_id = auth.uid())', async () => {
    await asAuthenticated(USER_A);
    const r = await db.query<{ id: string }>(insertIntentoSql('auth.uid()'));
    expect(r.rows[0]?.id).toBeTruthy();
    intentoA = r.rows[0]!.id;
    await resetToSuperuser();
  });

  it('A no puede insertar con user_id de B (WITH CHECK)', async () => {
    await asAuthenticated(USER_A);
    await expect(db.query(insertIntentoSql(`'${USER_B}'::uuid`))).rejects.toThrow();
    await resetToSuperuser();
  });

  it('A lee su fila y no la de B', async () => {
    await resetToSuperuser();
    await asAuthenticated(USER_B);
    const insertedB = await db.query<{ id: string }>(insertIntentoSql('auth.uid()'));
    const intentoB = insertedB.rows[0]!.id;

    await asAuthenticated(USER_A);
    const propias = await db.query<{ id: string }>(
      `select id from public.exequatur_diagnostico_intentos where user_id = auth.uid()`,
    );
    expect(propias.rows.map((row) => row.id)).toEqual([intentoA]);

    const ajena = await db.query(
      `select id from public.exequatur_diagnostico_intentos where id = '${intentoB}'`,
    );
    expect(ajena.rows).toHaveLength(0);
    await resetToSuperuser();
  });

  it('A puede upsert su progreso y no el de B', async () => {
    await asAuthenticated(USER_A);
    await db.exec(`
      insert into public.exequatur_diagnostico_progreso (user_id, ultimo_intento_id, objetivos_pendientes)
      values (auth.uid(), '${intentoA}', '{}')
    `);
    const propio = await db.query(
      `select user_id from public.exequatur_diagnostico_progreso where user_id = auth.uid()`,
    );
    expect(propio.rows).toHaveLength(1);

    const ajeno = await db.query(
      `select user_id from public.exequatur_diagnostico_progreso where user_id = '${USER_B}'`,
    );
    expect(ajeno.rows).toHaveLength(0);

    await expect(
      db.query(`
        insert into public.exequatur_diagnostico_progreso (user_id, objetivos_pendientes)
        values ('${USER_B}', '{}')
      `),
    ).rejects.toThrow();
    await resetToSuperuser();
  });
});

describe('append-only + anon + service_role', () => {
  it('authenticated no tiene UPDATE/DELETE sobre intentos', async () => {
    await asAuthenticated(USER_A);
    await expect(
      db.query(`update public.exequatur_diagnostico_intentos set aciertos = 99 returning id`),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      db.query(`delete from public.exequatur_diagnostico_intentos returning id`),
    ).rejects.toThrow(/permission denied/i);
    await resetToSuperuser();
  });

  it('aunque se otorgue UPDATE, RLS bloquea mutar filas ajenas y propias (sin política UPDATE)', async () => {
    await resetToSuperuser();
    await db.exec(`grant update on public.exequatur_diagnostico_intentos to authenticated`);
    await asAuthenticated(USER_A);
    const upd = await db.query(
      `update public.exequatur_diagnostico_intentos set aciertos = 99 returning id`,
    );
    expect(upd.rows).toHaveLength(0);
    await resetToSuperuser();
    await db.exec(`revoke update on public.exequatur_diagnostico_intentos from authenticated`);
    const check = await db.query<{ aciertos: number }>(
      `select aciertos from public.exequatur_diagnostico_intentos where user_id = '${USER_A}'`,
    );
    expect(check.rows.every((row) => row.aciertos !== 99)).toBe(true);
  });

  it('anon no puede leer ni insertar', async () => {
    await asRole('anon');
    await expect(
      db.query(`select * from public.exequatur_diagnostico_intentos`),
    ).rejects.toThrow(/permission denied/i);
    await expect(db.query(insertIntentoSql(`'${USER_A}'::uuid`))).rejects.toThrow();
    await resetToSuperuser();
  });

  it('service_role lee todas las filas', async () => {
    await asRole('service_role');
    const r = await db.query<{ n: string }>(
      `select count(*)::text as n from public.exequatur_diagnostico_intentos`,
    );
    expect(Number(r.rows[0]?.n)).toBeGreaterThanOrEqual(2);
    await resetToSuperuser();
  });
});
