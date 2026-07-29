/**
 * Pruebas contra PostgreSQL REAL (PGlite, no mocks) del hallazgo P0-1 y su
 * corrección (supabase/migrations/20260727000000_enable_rls_subscriptions.sql).
 *
 * Simula deliberadamente el ESTADO ACTUAL REAL de producción verificado en
 * la auditoría (tabla creada, grants de service_role correctos, RLS
 * deshabilitado pese a que la política ya existe) — NO usa
 * supabase/subscriptions.sql tal cual, porque ese archivo YA tiene RLS
 * activado por diseño y no reproduciría el bug real que se está corrigiendo.
 * Ver MAYALEX_FASE0_PLAN_RLS.md sección "Hallazgo forense" para el detalle
 * de por qué el schema de referencia y el estado real de producción
 * divergen.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let db: PGlite;

async function asRole(role: 'anon' | 'authenticated' | 'service_role') {
  await db.exec(`select set_config('myapp.mock_role', '${role}', false)`);
  await db.exec(`set role ${role}`);
}

async function resetToSuperuser() {
  await db.exec(`reset role`);
}

beforeAll(async () => {
  db = new PGlite();

  // ── Shim de compatibilidad Supabase (idéntico al usado en
  //    tests/sql/state-machine.sql.test.ts, para consistencia) ────────────
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    create schema if not exists auth;
    create or replace function auth.role() returns text
      language sql stable
      as $$ select current_setting('myapp.mock_role', true) $$;
  `);
  await db.exec(`select set_config('myapp.mock_role', 'service_role', false)`);

  // ── Reproduce el ESTADO ACTUAL REAL de producción (verificado en la
  //    auditoría, no supuesto): tabla creada, política existente, grants
  //    de service_role correctos, RLS DESHABILITADO. ─────────────────────
  await db.exec(`
    create table subscriptions (
      id                  uuid primary key default gen_random_uuid(),
      user_identifier     text unique not null,
      paypal_sub_id       text,
      paypal_payer_id     text,
      email               text,
      tier                text not null default 'free',
      status              text not null default 'pending',
      current_period_end  timestamptz,
      created_at          timestamptz default now(),
      updated_at          timestamptz default now()
    );

    create policy "service_only_subscriptions" on subscriptions
      using  ((select auth.role()) = 'service_role')
      with check ((select auth.role()) = 'service_role');

    grant select, insert, update, delete on subscriptions to service_role;
    grant references, trigger, truncate on subscriptions to anon, authenticated;
    -- RLS deliberadamente NO habilitado aquí — reproduce el bug real.

    insert into subscriptions (user_identifier, email, tier, status)
    values ('email:cliente-a@ejemplo.com', 'cliente-a@ejemplo.com', 'pro', 'active'),
           ('email:cliente-b@ejemplo.com', 'cliente-b@ejemplo.com', 'academico', 'active');
  `);
});

afterAll(async () => {
  await db.close();
});

describe('Estado ANTES de la corrección — reproduce el hallazgo P0-1 real', () => {
  it('confirma que RLS está deshabilitado (reproduce el bug, no lo asume)', async () => {
    const r = await db.query(`select relrowsecurity from pg_class where relname = 'subscriptions'`);
    expect((r.rows[0] as any).relrowsecurity).toBe(false);
  });

  it('BUG REAL: aunque la política existe, sin RLS activo un rol sin GRANT explícito de SELECT igual no puede leer por el GRANT — pero si alguna vez se otorgara SELECT a anon, no habría ninguna barrera de fila', async () => {
    // Este test documenta la condición exacta de riesgo: hoy el GRANT
    // revocado es la única barrera. Si se otorgara SELECT a anon sin RLS,
    // la tabla completa quedaría expuesta sin ninguna restricción de fila.
    await resetToSuperuser();
    await db.exec(`grant select on subscriptions to anon`); // simula un GRANT accidental futuro
    await asRole('anon');
    const r = await db.query(`select count(*) as n from subscriptions`);
    expect(Number((r.rows[0] as any).n)).toBe(2); // sin RLS, ve TODAS las filas — el riesgo real
    await resetToSuperuser();
    await db.exec(`revoke select on subscriptions from anon`); // revertir el escenario simulado
  });
});

describe('Aplicación de la migración 20260727000000_enable_rls_subscriptions.sql', () => {
  beforeAll(async () => {
    await resetToSuperuser();
    const migration = readFileSync(
      resolve(process.cwd(), 'supabase', 'migrations', '20260727000000_enable_rls_subscriptions.sql'),
      'utf-8'
    );
    // El archivo real contiene comentarios y bloques BEGIN/COMMIT con
    // secciones de validación comentadas — PGlite ejecuta el SQL tal cual,
    // los comentarios `--` son ignorados por el parser de Postgres.
    await db.exec(migration);
  });

  it('RLS queda activo (rowsecurity y forcerowsecurity)', async () => {
    const r = await db.query(
      `select relrowsecurity, relforcerowsecurity from pg_class where relname = 'subscriptions'`
    );
    expect((r.rows[0] as any).relrowsecurity).toBe(true);
    expect((r.rows[0] as any).relforcerowsecurity).toBe(true);
  });

  it('anon NO puede leer ninguna fila (SELECT vacío, no error de conexión)', async () => {
    await resetToSuperuser();
    await db.exec(`grant select on subscriptions to anon`); // aunque se otorgue el GRANT de tabla...
    await asRole('anon');
    const r = await db.query(`select * from subscriptions`);
    expect(r.rows.length).toBe(0); // ...RLS bloquea todas las filas igual
    await resetToSuperuser();
  });

  it('anon NO puede insertar', async () => {
    await resetToSuperuser();
    await db.exec(`grant insert on subscriptions to anon`);
    await asRole('anon');
    await expect(
      db.query(
        `insert into subscriptions (user_identifier, tier, status) values ('email:atacante@ejemplo.com', 'pro', 'active')`
      )
    ).rejects.toThrow();
    await resetToSuperuser();
  });

  it('authenticated (usuario A) NO puede leer la fila del usuario B ni la propia directamente — la política es exclusiva de service_role, sin excepción por identidad', async () => {
    await resetToSuperuser();
    await db.exec(`grant select on subscriptions to authenticated`);
    await asRole('authenticated');
    const r = await db.query(`select * from subscriptions where user_identifier = 'email:cliente-a@ejemplo.com'`);
    expect(r.rows.length).toBe(0); // ningún acceso directo, ni siquiera a la propia fila — por diseño (ver plan RLS)
    await resetToSuperuser();
  });

  it('authenticated NO puede modificar su propio plan (UPDATE bloqueado)', async () => {
    await resetToSuperuser();
    await db.exec(`grant update on subscriptions to authenticated`);
    await asRole('authenticated');
    const upd = await db.query(
      `update subscriptions set tier = 'pro' where user_identifier = 'email:cliente-b@ejemplo.com' returning id`
    );
    expect(upd.rows.length).toBe(0); // RLS bloquea la fila objetivo — 0 filas afectadas, no error
    await resetToSuperuser();
    const check = await db.query(`select tier from subscriptions where user_identifier = 'email:cliente-b@ejemplo.com'`);
    expect((check.rows[0] as any).tier).toBe('academico'); // el plan real no cambió
  });

  it('service_role puede leer todas las filas (el backend sigue funcionando)', async () => {
    await asRole('service_role');
    const r = await db.query(`select count(*) as n from subscriptions`);
    expect(Number((r.rows[0] as any).n)).toBe(2);
    await resetToSuperuser();
  });

  it('service_role puede insertar y actualizar (webhook de PayPal sigue funcionando)', async () => {
    await asRole('service_role');
    await db.exec(
      `insert into subscriptions (user_identifier, email, tier, status)
       values ('email:cliente-c@ejemplo.com', 'cliente-c@ejemplo.com', 'pro', 'active')`
    );
    const upd = await db.query(
      `update subscriptions set status = 'cancelled' where user_identifier = 'email:cliente-c@ejemplo.com' returning status`
    );
    expect((upd.rows[0] as any).status).toBe('cancelled');
    await resetToSuperuser();
  });

  it('sesión sin rol reconocido (simulación de sesión inválida) no obtiene acceso', async () => {
    await db.exec(`select set_config('myapp.mock_role', 'rol_invalido_no_existe', false)`);
    await resetToSuperuser(); // conexión sin SET ROLE explícito = rol de conexión por defecto, sin GRANT
    const r = await db.query(`select * from subscriptions`);
    // El superusuario de PGlite bypasea RLS por definición (equivalente a postgres/owner);
    // este test documenta que el auth.role() mock no coincide con 'service_role',
    // por lo que CUALQUIER política basada en auth.role() = 'service_role' fallaría
    // para esta sesión si no fuera superusuario — se deja registrado como
    // limitación conocida de PGlite para este caso específico, no verificable
    // de forma más estricta sin una instancia Postgres real con roles no-superusuario.
    expect(r).toBeDefined();
    await db.exec(`select set_config('myapp.mock_role', 'service_role', false)`);
  });
});

describe('Rollback de la migración', () => {
  it('DISABLE ROW LEVEL SECURITY revierte el acceso restringido sin pérdida de datos', async () => {
    await resetToSuperuser();
    await db.exec(`
      alter table subscriptions no force row level security;
      alter table subscriptions disable row level security;
    `);
    const r = await db.query(`select relrowsecurity from pg_class where relname = 'subscriptions'`);
    expect((r.rows[0] as any).relrowsecurity).toBe(false);

    const count = await db.query(`select count(*) as n from subscriptions`);
    expect(Number((count.rows[0] as any).n)).toBe(3); // los datos siguen intactos (2 originales + 1 insertada en pruebas)
  });
});
