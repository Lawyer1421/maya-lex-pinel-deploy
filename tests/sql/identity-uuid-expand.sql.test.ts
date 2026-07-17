/**
 * Valida contra Postgres real (PGlite) que la migración EXPAND de
 * identidad se aplica limpiamente sobre TODA la cadena de migraciones
 * previas, sin romper nada existente.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    create schema if not exists auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text);
    create or replace function auth.role() returns text
      language sql stable as $$ select current_setting('myapp.mock_role', true) $$;
  `);
  await db.exec(`select set_config('myapp.mock_role', 'service_role', false)`);

  const files = [
    resolve(process.cwd(), 'supabase', 'subscriptions.sql'),
    resolve(process.cwd(), 'supabase', 'migrations', '20260717010000_paypal_state_machine.sql'),
    resolve(process.cwd(), 'supabase', 'migrations', '20260717020000_paypal_event_id_and_atomic_access.sql'),
    resolve(process.cwd(), 'supabase', 'migrations', '20260718000000_entitlements.sql'),
    resolve(process.cwd(), 'supabase', 'migrations', '20260718010000_identity_uuid_expand.sql'),
  ];
  for (const f of files) await db.exec(readFileSync(f, 'utf-8'));
});

afterAll(async () => { await db.close(); });

describe('Migración EXPAND de identidad — aplica limpio sobre toda la cadena', () => {
  it.each([
    ['subscriptions', 'user_id'],
    ['queries_log', 'user_id'],
    ['paypal_events', 'user_id'],
    ['billing_state_transitions', 'user_id'],
    ['billing_duplicate_attempts', 'user_id'],
  ])('%s.%s existe y es nullable', async (table, column) => {
    const r = await db.query(
      `select is_nullable from information_schema.columns where table_name = $1 and column_name = $2`,
      [table, column]
    );
    expect(r.rows.length).toBe(1);
    expect((r.rows[0] as any).is_nullable).toBe('YES');
  });

  it('no rompe una escritura existente vía user_identifier (subscriptions)', async () => {
    await db.query(
      `insert into subscriptions (user_identifier, tier, status) values ($1, 'pro', 'trialing')`,
      ['email:expand-test@x.com']
    );
    const r = await db.query(`select user_id, user_identifier from subscriptions where user_identifier = $1`, ['email:expand-test@x.com']);
    expect(r.rows[0]).toMatchObject({ user_id: null, user_identifier: 'email:expand-test@x.com' });
  });

  it('paypal_apply_event sigue funcionando igual (no requiere user_id)', async () => {
    const r = await db.query(
      `select paypal_apply_event($1,$2,$3,$4,$5,$6,$7,$8) as result`,
      ['email:expand-rpc@x.com', 'SUB-EXPAND', null, null, 'pro', 'trialing', false, 'BILLING.SUBSCRIPTION.CREATED']
    );
    expect((r.rows[0] as any).result.applied).toBe(true);
  });
});
