/**
 * Pruebas contra PostgreSQL REAL (no mocks) — usa @electric-sql/pglite
 * (Postgres compilado a WASM, corre embebido en Node, sin Docker y sin
 * tocar ninguna base de datos de Supabase real).
 *
 * Aplica el archivo de migración TAL CUAL se desplegaría
 * (supabase/migrations/20260717010000_paypal_state_machine.sql), sin
 * modificarlo para el test — lo único que el harness agrega ANTES son
 * los roles anon/authenticated/service_role y un stub de auth.role(),
 * porque esos son primitivos de Supabase que no existen en un Postgres
 * vanilla; la migración en sí se ejecuta sin cambios.
 *
 * LIMITACIÓN CONOCIDA: PGlite expone una única sesión activa — todas las
 * queries de una instancia se serializan en el mismo hilo/conexión. Esto
 * significa que este archivo puede probar la CORRECCIÓN LÓGICA de cada
 * rama de la matriz contra Postgres real (sintaxis, tipos, constraints,
 * triggers, RLS, permisos), pero NO puede demostrar empíricamente el
 * bloqueo mutuo entre dos transacciones genuinamente concurrentes (dos
 * conexiones reales compitiendo por el mismo advisory lock). Esa prueba
 * requiere un Postgres multi-conexión real (Supabase branch/proyecto
 * temporal o Docker) — ninguno disponible en esta máquina. El caso "dos
 * CREATED concurrentes" se prueba aquí como dos llamadas SECUENCIALES
 * back-to-back para el mismo usuario nuevo, lo cual valida que la
 * segunda llamada NO revienta con un error de unique_violation sin
 * manejar (que es el bug real que el advisory lock + la rama Caso B
 * previenen), pero no valida el bloqueo per se.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let db: PGlite;

async function callApplyEvent(params: {
  userIdentifier: string;
  paypalSubId: string;
  paypalPayerId?: string | null;
  email?: string | null;
  tier: 'pro' | 'academico';
  newStatus: 'trialing' | 'active' | 'cancelled' | 'past_due';
  grantsAccess: boolean;
  eventType: string;
}) {
  const res = await db.query(
    `select paypal_apply_event($1,$2,$3,$4,$5,$6,$7,$8) as result`,
    [
      params.userIdentifier,
      params.paypalSubId,
      params.paypalPayerId ?? null,
      params.email ?? null,
      params.tier,
      params.newStatus,
      params.grantsAccess,
      params.eventType,
    ]
  );
  return (res.rows[0] as any).result as {
    applied: boolean; reason: string;
    resulting_status: string; resulting_tier: string; resulting_sub_id: string;
  };
}

beforeAll(async () => {
  db = new PGlite();

  // ── Shim de compatibilidad Supabase (roles + auth.role()) ──────────────
  // NO forma parte de la migración real — solo emula el entorno mínimo
  // que Supabase ya provee, para poder aplicar la migración sin cambios.
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

  // ── Prerrequisito: schema base (subscriptions, paypal_events, queries_log) ──
  const baseSchema = readFileSync(
    resolve(process.cwd(), 'supabase', 'subscriptions.sql'), 'utf-8'
  );
  await db.exec(baseSchema);

  // ── La migración bajo prueba, SIN modificar ──────────────────────────
  const migration = readFileSync(
    resolve(process.cwd(), 'supabase', 'migrations', '20260717010000_paypal_state_machine.sql'), 'utf-8'
  );
  await db.exec(migration);
});

afterAll(async () => {
  await db.close();
});

describe('Validación posterior de la migración (real Postgres)', () => {
  it('crea billing_duplicate_attempts y billing_verification_attempts', async () => {
    const r = await db.query(`
      select to_regclass('public.billing_duplicate_attempts') as a,
             to_regclass('public.billing_verification_attempts') as b
    `);
    expect((r.rows[0] as any).a).toBe('billing_duplicate_attempts');
    expect((r.rows[0] as any).b).toBe('billing_verification_attempts');
  });

  it('agrega requires_reconciliation a paypal_events', async () => {
    const r = await db.query(`
      select column_name from information_schema.columns
      where table_name = 'paypal_events' and column_name = 'requires_reconciliation'
    `);
    expect(r.rows.length).toBe(1);
  });

  it('paypal_apply_event es SECURITY INVOKER (no DEFINER)', async () => {
    const r = await db.query(`select prosecdef from pg_proc where proname = 'paypal_apply_event'`);
    expect((r.rows[0] as any).prosecdef).toBe(false);
  });

  it('EXECUTE está revocado de PUBLIC/anon/authenticated y otorgado solo a service_role', async () => {
    const r = await db.query(`
      select grantee, privilege_type from information_schema.routine_privileges
      where routine_name = 'paypal_apply_event'
    `);
    const grantees = r.rows.map((row: any) => row.grantee);
    expect(grantees).toContain('service_role');
    expect(grantees).not.toContain('PUBLIC');
    expect(grantees).not.toContain('anon');
    expect(grantees).not.toContain('authenticated');
  });
});

describe('Máquina de estados contra Postgres real', () => {
  // Escenario #1 de la lista: CREATED sin fila (Caso A)
  it('CREATED sin fila local: crea la fila en trialing, no otorga acceso', async () => {
    const r = await callApplyEvent({
      userIdentifier: 'email:sql-test-1@x.com', paypalSubId: 'SUB-1', tier: 'pro',
      newStatus: 'trialing', grantsAccess: false, eventType: 'BILLING.SUBSCRIPTION.CREATED',
    });
    expect(r).toMatchObject({ applied: true, reason: 'created', resulting_status: 'trialing' });
  });

  // Escenario #2: dos CREATED "concurrentes" (secuenciales back-to-back,
  // ver limitación de PGlite en el header) para el mismo usuario nuevo —
  // el segundo NO debe reventar con unique_violation sin manejar.
  it('dos CREATED consecutivos para el mismo usuario NUEVO no truenan (Caso A → Caso B)', async () => {
    const uid = 'email:sql-test-2@x.com';
    const first = await callApplyEvent({
      userIdentifier: uid, paypalSubId: 'SUB-2', tier: 'pro',
      newStatus: 'trialing', grantsAccess: false, eventType: 'BILLING.SUBSCRIPTION.CREATED',
    });
    expect(first.reason).toBe('created');

    const second = await callApplyEvent({
      userIdentifier: uid, paypalSubId: 'SUB-2', tier: 'pro',
      newStatus: 'trialing', grantsAccess: false, eventType: 'BILLING.SUBSCRIPTION.CREATED',
    });
    // Caso B (misma sub_id): se re-aplica sin error, no Caso A duplicado.
    expect(second).toMatchObject({ applied: true, reason: 'updated', resulting_status: 'trialing' });
  });

  // Escenario #3: CREATED → ACTIVATED
  it('CREATED seguido de ACTIVATED verificado: pasa a active', async () => {
    const uid = 'email:sql-test-3@x.com';
    await callApplyEvent({
      userIdentifier: uid, paypalSubId: 'SUB-3', tier: 'pro',
      newStatus: 'trialing', grantsAccess: false, eventType: 'BILLING.SUBSCRIPTION.CREATED',
    });
    const activated = await callApplyEvent({
      userIdentifier: uid, paypalSubId: 'SUB-3', tier: 'pro',
      newStatus: 'active', grantsAccess: true, eventType: 'BILLING.SUBSCRIPTION.ACTIVATED',
    });
    expect(activated).toMatchObject({ applied: true, reason: 'updated', resulting_status: 'active' });
  });

  // Escenario #4 — EL BUG ORIGINAL: ACTIVATED → CREATED tardío de la MISMA
  // suscripción NO debe degradar a trialing.
  it('ACTIVATED → CREATED tardío (misma sub): NO degrada active a trialing', async () => {
    const uid = 'email:sql-test-4@x.com';
    await callApplyEvent({
      userIdentifier: uid, paypalSubId: 'SUB-4', tier: 'pro',
      newStatus: 'trialing', grantsAccess: false, eventType: 'BILLING.SUBSCRIPTION.CREATED',
    });
    await callApplyEvent({
      userIdentifier: uid, paypalSubId: 'SUB-4', tier: 'pro',
      newStatus: 'active', grantsAccess: true, eventType: 'BILLING.SUBSCRIPTION.ACTIVATED',
    });

    const lateCreated = await callApplyEvent({
      userIdentifier: uid, paypalSubId: 'SUB-4', tier: 'pro',
      newStatus: 'trialing', grantsAccess: false, eventType: 'BILLING.SUBSCRIPTION.CREATED',
    });
    expect(lateCreated).toMatchObject({ applied: false, reason: 'ignored_no_downgrade', resulting_status: 'active' });

    const row = await db.query(`select status from subscriptions where user_identifier = $1`, [uid]);
    expect((row.rows[0] as any).status).toBe('active');
  });

  // Escenario #5: dos ACTIVATED con subscription IDs diferentes para el
  // mismo usuario — la activa NUNCA se toca, se registra el duplicado.
  it('dos ACTIVATED con sub_id diferentes: protege la activa, registra el duplicado', async () => {
    const uid = 'email:sql-test-5@x.com';
    await callApplyEvent({
      userIdentifier: uid, paypalSubId: 'SUB-5A', tier: 'pro',
      newStatus: 'active', grantsAccess: true, eventType: 'BILLING.SUBSCRIPTION.ACTIVATED',
    });

    const second = await callApplyEvent({
      userIdentifier: uid, paypalSubId: 'SUB-5B', tier: 'pro',
      newStatus: 'active', grantsAccess: true, eventType: 'BILLING.SUBSCRIPTION.ACTIVATED',
    });
    expect(second).toMatchObject({
      applied: false, reason: 'duplicate_active_subscription',
      resulting_status: 'active', resulting_sub_id: 'SUB-5A',
    });

    const dup = await db.query(
      `select active_sub_id, attempted_sub_id from billing_duplicate_attempts where user_identifier = $1`, [uid]
    );
    expect(dup.rows).toEqual([{ active_sub_id: 'SUB-5A', attempted_sub_id: 'SUB-5B' }]);

    const row = await db.query(`select paypal_sub_id, status from subscriptions where user_identifier = $1`, [uid]);
    expect(row.rows[0]).toMatchObject({ paypal_sub_id: 'SUB-5A', status: 'active' });
  });

  // Escenario #6: evento duplicado — UNIQUE(transmission_id) en paypal_events
  it('evento duplicado: UNIQUE(transmission_id) rechaza el segundo insert', async () => {
    await db.query(`insert into paypal_events (transmission_id, event_type) values ($1, $2)`, ['tx-dup-1', 'BILLING.SUBSCRIPTION.CREATED']);
    await expect(
      db.query(`insert into paypal_events (transmission_id, event_type) values ($1, $2)`, ['tx-dup-1', 'BILLING.SUBSCRIPTION.CREATED'])
    ).rejects.toThrow();
  });

  // Escenario #9: rollback ante error — un tier inválido no debe dejar
  // escritura parcial.
  it('rollback ante error: tier inválido no escribe nada', async () => {
    const uid = 'email:sql-test-rollback@x.com';
    await expect(
      callApplyEvent({
        userIdentifier: uid, paypalSubId: 'SUB-ROLLBACK', tier: 'inexistente' as any,
        newStatus: 'trialing', grantsAccess: false, eventType: 'BILLING.SUBSCRIPTION.CREATED',
      })
    ).rejects.toThrow();

    const row = await db.query(`select 1 from subscriptions where user_identifier = $1`, [uid]);
    expect(row.rows.length).toBe(0);
  });
});

describe('Permisos — solo el backend (service_role) puede ejecutar la RPC', () => {
  it('anon: EXECUTE denegado', async () => {
    await db.exec(`set role anon`);
    await expect(
      db.query(`select paypal_apply_event($1,$2,$3,$4,$5,$6,$7,$8)`, [
        'email:perm-anon@x.com', 'SUB-PERM-1', null, null, 'pro', 'trialing', false, 'TEST',
      ])
    ).rejects.toThrow(/permission denied/i);
    await db.exec(`reset role`);
  });

  it('authenticated: EXECUTE denegado', async () => {
    await db.exec(`set role authenticated`);
    await expect(
      db.query(`select paypal_apply_event($1,$2,$3,$4,$5,$6,$7,$8)`, [
        'email:perm-auth@x.com', 'SUB-PERM-2', null, null, 'pro', 'trialing', false, 'TEST',
      ])
    ).rejects.toThrow(/permission denied/i);
    await db.exec(`reset role`);
  });

  it('service_role: EXECUTE permitido', async () => {
    await db.exec(`set role service_role`);
    const r = await db.query(`select paypal_apply_event($1,$2,$3,$4,$5,$6,$7,$8) as result`, [
      'email:perm-service@x.com', 'SUB-PERM-3', null, null, 'pro', 'trialing', false, 'TEST',
    ]);
    expect((r.rows[0] as any).result.applied).toBe(true);
    await db.exec(`reset role`);
  });

  it('anon no puede leer subscriptions directamente (sin GRANT de tabla)', async () => {
    await db.exec(`set role anon`);
    await expect(db.query(`select * from subscriptions limit 1`)).rejects.toThrow(/permission denied/i);
    await db.exec(`reset role`);
  });
});
