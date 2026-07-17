/**
 * Valida el inventario definitivo de migraciones (docs/MIGRATIONS_INVENTORY.md)
 * por DOS rutas, sustituyendo un "proyecto Supabase de staging real" con
 * PGlite (Postgres real, sin Docker) — ver limitación honesta más abajo.
 *
 * Ruta A — "esquema vacío": las migraciones que NO dependen de la
 * cadena PayPal (entitlements, profiles_and_identity_linking,
 * auth_rate_limits) deben aplicar limpiamente contra una base que
 * SOLO tiene auth.users — sin subscriptions/queries_log/paypal_events.
 *
 * Ruta B — "esquema anterior" (upgrade): la cadena COMPLETA, en el
 * orden exacto del inventario, sobre una base que empieza con
 * subscriptions.sql (el esquema ya vigente en producción).
 *
 * LIMITACIÓN HONESTA: esto valida el ESQUEMA (DDL, constraints,
 * triggers, permisos) contra Postgres real. NO es un proyecto Supabase
 * completo — no incluye el servidor de Supabase Auth real (OTP, OAuth,
 * confirmación de correo), que es un servicio hospedado, no algo que
 * PGlite pueda emular. Provisionar un proyecto Supabase de staging
 * real requiere `supabase login` (OAuth interactivo) o un
 * SUPABASE_ACCESS_TOKEN — ninguno disponible en este entorno; se
 * intentó y se confirmó el bloqueo (ver informe de entrega).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function migrationPath(file: string) {
  return resolve(process.cwd(), 'supabase', 'migrations', file);
}
function read(file: string) {
  return readFileSync(migrationPath(file), 'utf-8');
}

async function withAuthUsersStub(db: PGlite) {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    create schema if not exists auth;
    create table auth.users (
      id uuid primary key default gen_random_uuid(),
      email text,
      email_confirmed_at timestamptz,
      raw_user_meta_data jsonb default '{}'::jsonb
    );
    create or replace function auth.role() returns text
      language sql stable as $$ select current_setting('myapp.mock_role', true) $$;
    create or replace function auth.uid() returns uuid
      language sql stable as $$ select nullif(current_setting('myapp.mock_uid', true), '')::uuid $$;
  `);
  await db.exec(`select set_config('myapp.mock_role', 'service_role', false)`);
}

describe('Ruta A — esquema vacío (solo auth.users, sin cadena PayPal)', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = new PGlite();
    await withAuthUsersStub(db);
  });
  afterAll(async () => { await db.close(); });

  it('entitlements.sql aplica limpio sin subscriptions/queries_log/paypal_events', async () => {
    await expect(db.exec(read('20260718000000_entitlements.sql'))).resolves.toBeDefined();
    const r = await db.query(`select to_regclass('public.entitlements') as t`);
    expect((r.rows[0] as any).t).toBe('entitlements');
  });

  it('profiles_and_identity_linking.sql aplica limpio sobre el mismo esquema vacío', async () => {
    await expect(db.exec(read('20260718020000_profiles_and_identity_linking.sql'))).resolves.toBeDefined();
    const r = await db.query(`select to_regclass('public.profiles') as t`);
    expect((r.rows[0] as any).t).toBe('profiles');
  });

  it('auth_rate_limits.sql aplica limpio sobre el mismo esquema vacío', async () => {
    await expect(db.exec(read('20260718030000_auth_rate_limits.sql'))).resolves.toBeDefined();
    const r = await db.query(`select to_regclass('public.auth_resend_attempts') as t`);
    expect((r.rows[0] as any).t).toBe('auth_resend_attempts');
  });

  it('identity_uuid_expand.sql FALLA sin la cadena PayPal previa (dependencia real confirmada)', async () => {
    await expect(db.exec(read('20260718010000_identity_uuid_expand.sql'))).rejects.toThrow();
  });
});

describe('Ruta B — esquema anterior (upgrade: cadena completa en orden)', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = new PGlite();
    await withAuthUsersStub(db);
    await db.exec(readFileSync(resolve(process.cwd(), 'supabase', 'subscriptions.sql'), 'utf-8'));
    await db.exec(read('20260717010000_paypal_state_machine.sql'));
    await db.exec(read('20260717020000_paypal_event_id_and_atomic_access.sql'));
  });
  afterAll(async () => { await db.close(); });

  it('las 4 migraciones de identidad aplican en orden sobre el esquema ya vigente en producción', async () => {
    await db.exec(read('20260718000000_entitlements.sql'));
    await db.exec(read('20260718010000_identity_uuid_expand.sql'));
    await db.exec(read('20260718020000_profiles_and_identity_linking.sql'));
    await db.exec(read('20260718030000_auth_rate_limits.sql'));

    const r = await db.query(`
      select to_regclass('public.entitlements') as a, to_regclass('public.profiles') as b,
             to_regclass('public.auth_resend_attempts') as c
    `);
    expect(r.rows[0]).toMatchObject({ a: 'entitlements', b: 'profiles', c: 'auth_resend_attempts' });

    const col = await db.query(`select column_name from information_schema.columns where table_name = 'subscriptions' and column_name = 'user_id'`);
    expect(col.rows.length).toBe(1);
  });
});
