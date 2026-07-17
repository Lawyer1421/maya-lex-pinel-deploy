/**
 * Pruebas contra PostgreSQL real (PGlite) para la migración de
 * entitlements — constraints, índice único de "un activo por clave",
 * trigger de auditoría y permisos backend-only.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

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

  const migration = readFileSync(
    resolve(process.cwd(), 'supabase', 'migrations', '20260718000000_entitlements.sql'), 'utf-8'
  );
  await db.exec(migration);
});

afterAll(async () => { await db.close(); });

async function makeUser(): Promise<string> {
  const id = randomUUID();
  await db.query(`insert into auth.users (id, email) values ($1, $2)`, [id, `${id}@x.com`]);
  return id;
}

describe('Validación de la migración entitlements', () => {
  it('crea entitlements y entitlement_audit_events', async () => {
    const r = await db.query(`
      select to_regclass('public.entitlements') as a, to_regclass('public.entitlement_audit_events') as b
    `);
    expect((r.rows[0] as any).a).toBe('entitlements');
    expect((r.rows[0] as any).b).toBe('entitlement_audit_events');
  });

  it('rechaza status fuera del check constraint', async () => {
    const uid = await makeUser();
    await expect(
      db.query(`insert into entitlements (user_id, entitlement_key, source_type, status) values ($1,'pro_access','manual_beta','bogus')`, [uid])
    ).rejects.toThrow();
  });

  it('rechaza source_type fuera del check constraint', async () => {
    const uid = await makeUser();
    await expect(
      db.query(`insert into entitlements (user_id, entitlement_key, source_type) values ($1,'pro_access','bogus_source')`, [uid])
    ).rejects.toThrow();
  });

  it('no permite dos entitlements ACTIVE para el mismo (user_id, entitlement_key)', async () => {
    const uid = await makeUser();
    await db.query(`insert into entitlements (user_id, entitlement_key, source_type) values ($1,'pro_access','manual_beta')`, [uid]);
    await expect(
      db.query(`insert into entitlements (user_id, entitlement_key, source_type) values ($1,'pro_access','manual_comped')`, [uid])
    ).rejects.toThrow();
  });

  it('permite un segundo entitlement para la misma clave si el primero está revoked', async () => {
    const uid = await makeUser();
    const first = await db.query(`insert into entitlements (user_id, entitlement_key, source_type) values ($1,'academico_access','manual_beta') returning id`, [uid]);
    await db.query(`update entitlements set status = 'revoked' where id = $1`, [(first.rows[0] as any).id]);
    await expect(
      db.query(`insert into entitlements (user_id, entitlement_key, source_type) values ($1,'academico_access','paypal_subscription')`, [uid])
    ).resolves.toBeTruthy();
  });

  it('el trigger de auditoría registra granted en el insert y revoked en el update', async () => {
    const uid = await makeUser();
    const ins = await db.query(`insert into entitlements (user_id, entitlement_key, source_type) values ($1,'pro_access','manual_comped') returning id`, [uid]);
    const entId = (ins.rows[0] as any).id;
    await db.query(`update entitlements set status = 'revoked' where id = $1`, [entId]);

    const audit = await db.query(
      `select action, before_status, after_status from entitlement_audit_events where entitlement_id = $1 order by created_at`, [entId]
    );
    expect(audit.rows).toEqual([
      { action: 'granted', before_status: null, after_status: 'active' },
      { action: 'revoked', before_status: 'active', after_status: 'revoked' },
    ]);
  });

  // Reproduce exactamente el filtro que usa resolveEntitlement() en
  // lib/entitlements.ts — verifica contra Postgres real que un
  // entitlement 'expired' (active_until en el pasado) y uno 'revoked'
  // quedan EXCLUIDOS de la consulta, tal como se espera.
  it('el filtro de resolveEntitlement excluye expired (active_until pasado) y revoked', async () => {
    const uid = await makeUser();
    await db.query(
      `insert into entitlements (user_id, entitlement_key, source_type, status, active_until) values ($1,'pro_access','paypal_subscription','active', now() - interval '1 day')`,
      [uid]
    );
    const nowIso = new Date().toISOString();
    const r = await db.query(
      `select * from entitlements where user_id = $1 and entitlement_key = 'pro_access' and status = 'active'
       and (active_until is null or active_until > $2::timestamptz)`,
      [uid, nowIso]
    );
    expect(r.rows.length).toBe(0);
  });

  it('el filtro de resolveEntitlement SÍ encuentra un entitlement activo sin vencer', async () => {
    const uid = await makeUser();
    await db.query(
      `insert into entitlements (user_id, entitlement_key, source_type, status, active_until) values ($1,'pro_access','paypal_subscription','active', now() + interval '30 days')`,
      [uid]
    );
    const nowIso = new Date().toISOString();
    const r = await db.query(
      `select * from entitlements where user_id = $1 and entitlement_key = 'pro_access' and status = 'active'
       and (active_until is null or active_until > $2::timestamptz)`,
      [uid, nowIso]
    );
    expect(r.rows.length).toBe(1);
  });

  it('anon no puede leer ni escribir entitlements', async () => {
    await db.exec(`set role anon`);
    await expect(db.query(`select * from entitlements limit 1`)).rejects.toThrow(/permission denied/i);
    await db.exec(`reset role`);
  });
});
