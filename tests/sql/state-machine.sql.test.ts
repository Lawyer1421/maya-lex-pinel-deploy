/**
 * Pruebas contra PostgreSQL REAL (no mocks) — usa @electric-sql/pglite
 * (Postgres compilado a WASM, corre embebido en Node, sin Docker y sin
 * tocar ninguna base de datos de Supabase real).
 *
 * Aplica AMBAS migraciones TAL CUAL se desplegarían
 * (20260717010000_paypal_state_machine.sql y
 *  20260717020000_paypal_event_id_and_atomic_access.sql), sin
 * modificarlas para el test — lo único que el harness agrega ANTES son
 * los roles anon/authenticated/service_role y un stub de auth.role(),
 * porque esos son primitivos de Supabase que no existen en un Postgres
 * vanilla.
 *
 * Este archivo cubre la CORRECCIÓN LÓGICA de cada rama contra Postgres
 * real (sintaxis, tipos, constraints, RLS, permisos) y la ESCRITURA
 * ATÓMICA subscriptions+queries_log+auditoría. La prueba de bloqueo
 * mutuo entre dos conexiones GENUINAMENTE concurrentes vive en
 * tests/sql/concurrency.sql.test.ts (usa @electric-sql/pglite-socket +
 * dos clientes `pg` reales, no esta instancia de PGlite en proceso).
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

async function queriesLogTier(userIdentifier: string): Promise<string | null> {
  const r = await db.query(
    `select tier from queries_log where user_identifier = $1 and query_date = current_date`,
    [userIdentifier]
  );
  return r.rows.length ? (r.rows[0] as any).tier : null;
}

beforeAll(async () => {
  db = new PGlite();

  // ── Shim de compatibilidad Supabase (roles + auth.role()) ──────────────
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

  const baseSchema = readFileSync(resolve(process.cwd(), 'supabase', 'subscriptions.sql'), 'utf-8');
  await db.exec(baseSchema);

  const migration1 = readFileSync(
    resolve(process.cwd(), 'supabase', 'migrations', '20260717010000_paypal_state_machine.sql'), 'utf-8'
  );
  await db.exec(migration1);

  const migration2 = readFileSync(
    resolve(process.cwd(), 'supabase', 'migrations', '20260717020000_paypal_event_id_and_atomic_access.sql'), 'utf-8'
  );
  await db.exec(migration2);
});

afterAll(async () => {
  await db.close();
});

describe('Validación posterior de las migraciones (real Postgres)', () => {
  it('crea billing_duplicate_attempts, billing_verification_attempts y billing_state_transitions', async () => {
    const r = await db.query(`
      select to_regclass('public.billing_duplicate_attempts') as a,
             to_regclass('public.billing_verification_attempts') as b,
             to_regclass('public.billing_state_transitions') as c
    `);
    expect((r.rows[0] as any).a).toBe('billing_duplicate_attempts');
    expect((r.rows[0] as any).b).toBe('billing_verification_attempts');
    expect((r.rows[0] as any).c).toBe('billing_state_transitions');
  });

  it('paypal_events tiene event_id como PK (no transmission_id)', async () => {
    const r = await db.query(`
      select a.attname from pg_constraint c
      join pg_attribute a on a.attnum = any(c.conkey) and a.attrelid = c.conrelid
      where c.conrelid = 'paypal_events'::regclass and c.contype = 'p'
    `);
    expect(r.rows.map((row: any) => row.attname)).toEqual(['event_id']);
  });

  it('paypal_apply_event y paypal_apply_downgrade son SECURITY INVOKER', async () => {
    const r = await db.query(`select proname, prosecdef from pg_proc where proname in ('paypal_apply_event', 'paypal_apply_downgrade')`);
    expect(r.rows.length).toBe(2);
    for (const row of r.rows as any[]) expect(row.prosecdef).toBe(false);
  });

  it('EXECUTE de ambas RPC está revocado de PUBLIC/anon/authenticated y otorgado solo a service_role', async () => {
    for (const fn of ['paypal_apply_event', 'paypal_apply_downgrade']) {
      const r = await db.query(`select grantee from information_schema.routine_privileges where routine_name = $1`, [fn]);
      const grantees = r.rows.map((row: any) => row.grantee);
      expect(grantees).toContain('service_role');
      expect(grantees).not.toContain('PUBLIC');
      expect(grantees).not.toContain('anon');
      expect(grantees).not.toContain('authenticated');
    }
  });
});

describe('Máquina de estados contra Postgres real', () => {
  it('CREATED sin fila local: crea la fila en trialing, no otorga acceso, no toca queries_log', async () => {
    const uid = 'email:sql-test-1@x.com';
    const r = await callApplyEvent({
      userIdentifier: uid, paypalSubId: 'SUB-1', tier: 'pro',
      newStatus: 'trialing', grantsAccess: false, eventType: 'BILLING.SUBSCRIPTION.CREATED',
    });
    expect(r).toMatchObject({ applied: true, reason: 'created', resulting_status: 'trialing' });
    expect(await queriesLogTier(uid)).toBeNull();
  });

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
    expect(second).toMatchObject({ applied: true, reason: 'updated', resulting_status: 'trialing' });
  });

  // Escenario de acceso atómico: CREATED → ACTIVATED debe dejar
  // subscriptions Y queries_log en 'active'/tier correcto en la MISMA
  // llamada — sin una segunda función aparte.
  it('CREATED seguido de ACTIVATED verificado: pasa a active EN subscriptions Y EN queries_log atómicamente', async () => {
    const uid = 'email:sql-test-3@x.com';
    await callApplyEvent({
      userIdentifier: uid, paypalSubId: 'SUB-3', tier: 'pro',
      newStatus: 'trialing', grantsAccess: false, eventType: 'BILLING.SUBSCRIPTION.CREATED',
    });
    expect(await queriesLogTier(uid)).toBeNull();

    const activated = await callApplyEvent({
      userIdentifier: uid, paypalSubId: 'SUB-3', tier: 'pro',
      newStatus: 'active', grantsAccess: true, eventType: 'BILLING.SUBSCRIPTION.ACTIVATED',
    });
    expect(activated).toMatchObject({ applied: true, reason: 'updated', resulting_status: 'active' });
    expect(await queriesLogTier(uid)).toBe('pro');
  });

  // EL BUG ORIGINAL: ACTIVATED → CREATED tardío de la MISMA suscripción
  // no debe degradar ni subscriptions ni queries_log.
  it('ACTIVATED → CREATED tardío (misma sub): NO degrada ni subscriptions ni queries_log', async () => {
    const uid = 'email:sql-test-4@x.com';
    await callApplyEvent({
      userIdentifier: uid, paypalSubId: 'SUB-4', tier: 'pro',
      newStatus: 'trialing', grantsAccess: false, eventType: 'BILLING.SUBSCRIPTION.CREATED',
    });
    await callApplyEvent({
      userIdentifier: uid, paypalSubId: 'SUB-4', tier: 'pro',
      newStatus: 'active', grantsAccess: true, eventType: 'BILLING.SUBSCRIPTION.ACTIVATED',
    });
    expect(await queriesLogTier(uid)).toBe('pro');

    const lateCreated = await callApplyEvent({
      userIdentifier: uid, paypalSubId: 'SUB-4', tier: 'pro',
      newStatus: 'trialing', grantsAccess: false, eventType: 'BILLING.SUBSCRIPTION.CREATED',
    });
    expect(lateCreated).toMatchObject({ applied: false, reason: 'ignored_no_downgrade', resulting_status: 'active' });

    const row = await db.query(`select status from subscriptions where user_identifier = $1`, [uid]);
    expect((row.rows[0] as any).status).toBe('active');
    expect(await queriesLogTier(uid)).toBe('pro');
  });

  it('dos ACTIVATED con sub_id diferentes: protege la activa, registra el duplicado, no toca queries_log dos veces', async () => {
    const uid = 'email:sql-test-5@x.com';
    await callApplyEvent({
      userIdentifier: uid, paypalSubId: 'SUB-5A', tier: 'pro',
      newStatus: 'active', grantsAccess: true, eventType: 'BILLING.SUBSCRIPTION.ACTIVATED',
    });

    const second = await callApplyEvent({
      userIdentifier: uid, paypalSubId: 'SUB-5B', tier: 'academico', grantsAccess: true,
      newStatus: 'active', eventType: 'BILLING.SUBSCRIPTION.ACTIVATED',
    });
    expect(second).toMatchObject({
      applied: false, reason: 'duplicate_active_subscription',
      resulting_status: 'active', resulting_sub_id: 'SUB-5A',
    });

    const dup = await db.query(
      `select active_sub_id, attempted_sub_id from billing_duplicate_attempts where user_identifier = $1`, [uid]
    );
    expect(dup.rows).toEqual([{ active_sub_id: 'SUB-5A', attempted_sub_id: 'SUB-5B' }]);

    // queries_log debe reflejar el plan de la suscripción PROTEGIDA (pro), no
    // el intento duplicado que se rechazó (academico) — nunca se tocó.
    expect(await queriesLogTier(uid)).toBe('pro');
  });

  // Idempotencia real: mismo event_id, transmission_id distinto (reintento
  // real de PayPal) → rechazado. Mismo event_id + mismo transmission_id
  // (reenvío idéntico) → también rechazado. event_id distinto → aceptado.
  it('evento duplicado: UNIQUE(event_id) rechaza reintentos de PayPal aunque transmission_id cambie', async () => {
    await db.query(
      `insert into paypal_events (event_id, transmission_id, event_type) values ($1, $2, $3)`,
      ['WH-EVT-100', 'tx-attempt-1', 'BILLING.SUBSCRIPTION.CREATED']
    );

    // Mismo event_id, transmission_id NUEVO — este es exactamente el caso
    // real de un reintento de entrega de PayPal. Debe rechazarse.
    await expect(
      db.query(
        `insert into paypal_events (event_id, transmission_id, event_type) values ($1, $2, $3)`,
        ['WH-EVT-100', 'tx-attempt-2-un-reintento-real', 'BILLING.SUBSCRIPTION.CREATED']
      )
    ).rejects.toThrow();

    // event_id distinto: se acepta sin problema.
    const ok = await db.query(
      `insert into paypal_events (event_id, transmission_id, event_type) values ($1, $2, $3) returning event_id`,
      ['WH-EVT-101', 'tx-attempt-3', 'BILLING.SUBSCRIPTION.CREATED']
    );
    expect((ok.rows[0] as any).event_id).toBe('WH-EVT-101');
  });

  it('reenvío después de procesamiento exitoso y después de fallido: ambos siguen deduplicando por event_id', async () => {
    await db.query(
      `insert into paypal_events (event_id, transmission_id, event_type, processing_status, processed_at) values ($1, $2, $3, 'processed', now())`,
      ['WH-EVT-200', 'tx-1', 'BILLING.SUBSCRIPTION.ACTIVATED']
    );
    await expect(
      db.query(`insert into paypal_events (event_id, transmission_id, event_type) values ($1, $2, $3)`, ['WH-EVT-200', 'tx-2', 'BILLING.SUBSCRIPTION.ACTIVATED'])
    ).rejects.toThrow();

    await db.query(
      `insert into paypal_events (event_id, transmission_id, event_type, processing_status, error_message_sanitized) values ($1, $2, $3, 'failed', 'timeout')`,
      ['WH-EVT-201', 'tx-3', 'BILLING.SUBSCRIPTION.ACTIVATED']
    );
    await expect(
      db.query(`insert into paypal_events (event_id, transmission_id, event_type) values ($1, $2, $3)`, ['WH-EVT-201', 'tx-4', 'BILLING.SUBSCRIPTION.ACTIVATED'])
    ).rejects.toThrow();
  });

  it('rollback ante error: tier inválido no escribe nada (ni subscriptions ni auditoría)', async () => {
    const uid = 'email:sql-test-rollback@x.com';
    await expect(
      callApplyEvent({
        userIdentifier: uid, paypalSubId: 'SUB-ROLLBACK', tier: 'inexistente' as any,
        newStatus: 'trialing', grantsAccess: false, eventType: 'BILLING.SUBSCRIPTION.CREATED',
      })
    ).rejects.toThrow();

    const row = await db.query(`select 1 from subscriptions where user_identifier = $1`, [uid]);
    expect(row.rows.length).toBe(0);
    const audit = await db.query(`select 1 from billing_state_transitions where user_identifier = $1`, [uid]);
    expect(audit.rows.length).toBe(0);
  });

  it('auditoría: cada llamada aplicada o no queda registrada en billing_state_transitions', async () => {
    const uid = 'email:sql-test-audit@x.com';
    await callApplyEvent({
      userIdentifier: uid, paypalSubId: 'SUB-AUDIT', tier: 'pro',
      newStatus: 'trialing', grantsAccess: false, eventType: 'BILLING.SUBSCRIPTION.CREATED',
    });
    await callApplyEvent({
      userIdentifier: uid, paypalSubId: 'SUB-AUDIT', tier: 'pro',
      newStatus: 'active', grantsAccess: true, eventType: 'BILLING.SUBSCRIPTION.ACTIVATED',
    });
    const rows = await db.query(
      `select event_type, before_status, after_status, applied from billing_state_transitions where user_identifier = $1 order by created_at`,
      [uid]
    );
    expect(rows.rows).toEqual([
      { event_type: 'BILLING.SUBSCRIPTION.CREATED', before_status: null, after_status: 'trialing', applied: true },
      { event_type: 'BILLING.SUBSCRIPTION.ACTIVATED', before_status: 'trialing', after_status: 'active', applied: true },
    ]);
  });

  it('paypal_apply_downgrade degrada subscriptions Y queries_log atómicamente', async () => {
    const uid = 'email:sql-test-downgrade@x.com';
    await callApplyEvent({
      userIdentifier: uid, paypalSubId: 'SUB-DOWNGRADE', tier: 'academico',
      newStatus: 'active', grantsAccess: true, eventType: 'BILLING.SUBSCRIPTION.ACTIVATED',
    });
    expect(await queriesLogTier(uid)).toBe('academico');

    const r = await db.query(
      `select paypal_apply_downgrade($1, $2, $3) as result`,
      ['SUB-DOWNGRADE', 'cancelled', 'BILLING.SUBSCRIPTION.CANCELLED']
    );
    expect((r.rows[0] as any).result).toMatchObject({ applied: true, reason: 'downgraded', resulting_status: 'cancelled', resulting_tier: 'free' });

    const sub = await db.query(`select tier, status from subscriptions where user_identifier = $1`, [uid]);
    expect(sub.rows[0]).toMatchObject({ tier: 'free', status: 'cancelled' });
    expect(await queriesLogTier(uid)).toBe('free');
  });
});

describe('Permisos — solo el backend (service_role) puede ejecutar las RPC', () => {
  it('anon: EXECUTE denegado en paypal_apply_event y paypal_apply_downgrade', async () => {
    await db.exec(`set role anon`);
    await expect(
      db.query(`select paypal_apply_event($1,$2,$3,$4,$5,$6,$7,$8)`, [
        'email:perm-anon@x.com', 'SUB-PERM-1', null, null, 'pro', 'trialing', false, 'TEST',
      ])
    ).rejects.toThrow(/permission denied/i);
    await expect(
      db.query(`select paypal_apply_downgrade($1,$2,$3)`, ['SUB-X', 'cancelled', 'TEST'])
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

  it('anon no puede leer subscriptions ni billing_state_transitions directamente', async () => {
    await db.exec(`set role anon`);
    await expect(db.query(`select * from subscriptions limit 1`)).rejects.toThrow(/permission denied/i);
    await expect(db.query(`select * from billing_state_transitions limit 1`)).rejects.toThrow(/permission denied/i);
    await db.exec(`reset role`);
  });
});
