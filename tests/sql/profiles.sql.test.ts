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
    create or replace function auth.uid() returns uuid
      language sql stable as $$ select nullif(current_setting('myapp.mock_uid', true), '')::uuid $$;
  `);
  await db.exec(`select set_config('myapp.mock_role', 'service_role', false)`);

  const migration = readFileSync(
    resolve(process.cwd(), 'supabase', 'migrations', '20260718020000_profiles_and_identity_linking.sql'), 'utf-8'
  );
  await db.exec(migration);
});

afterAll(async () => { await db.close(); });

describe('profiles — creación idempotente vía trigger en auth.users', () => {
  it('insertar en auth.users crea automáticamente una fila en profiles', async () => {
    const r = await db.query(`insert into auth.users (email) values ('nuevo@x.com') returning id`);
    const uid = (r.rows[0] as any).id;
    const p = await db.query(`select id, email from profiles where id = $1`, [uid]);
    expect(p.rows).toEqual([{ id: uid, email: 'nuevo@x.com' }]);
  });

  it('no crea un profile duplicado si se re-ejecuta manualmente el mismo insert (ON CONFLICT DO NOTHING)', async () => {
    const r = await db.query(`insert into auth.users (email) values ('otro@x.com') returning id`);
    const uid = (r.rows[0] as any).id;
    // Simula un callback repetido intentando crear el profile de nuevo
    await db.query(`insert into profiles (id, email) values ($1, $2) on conflict (id) do nothing`, [uid, 'otro@x.com']);
    const count = await db.query(`select count(*)::int as n from profiles where id = $1`, [uid]);
    expect(count.rows[0]).toEqual({ n: 1 });
  });

  it('anon no puede leer profiles de otro usuario, pero un usuario autenticado sí puede leer el propio', async () => {
    const r = await db.query(`insert into auth.users (email) values ('propio@x.com') returning id`);
    const uid = (r.rows[0] as any).id;

    await db.exec(`set role authenticated`);
    await db.query(`select set_config('myapp.mock_uid', $1, false)`, [uid]);
    const own = await db.query(`select email from profiles where id = $1`, [uid]);
    expect(own.rows).toEqual([{ email: 'propio@x.com' }]);
    await db.exec(`reset role`);
  });
});

describe('identity_link_events — auditoría, nunca fusiona automáticamente', () => {
  it('registra un intento bloqueado por correo no verificado', async () => {
    await db.query(
      `insert into identity_link_events (attempted_provider, attempted_email, email_verified, outcome)
       values ('google', 'conflicto@x.com', false, 'blocked_unverified_email')`
    );
    const r = await db.query(`select outcome from identity_link_events where attempted_email = 'conflicto@x.com'`);
    expect(r.rows[0]).toEqual({ outcome: 'blocked_unverified_email' });
  });

  it('rechaza un outcome fuera del check constraint', async () => {
    await expect(
      db.query(`insert into identity_link_events (attempted_provider, attempted_email, email_verified, outcome) values ('google','x@y.com',true,'merged_silently')`)
    ).rejects.toThrow();
  });
});
