/**
 * Base de facturación agnóstica de proveedor (Fase Stripe, 2026-11-12) — pruebas contra PostgreSQL REAL (PGlite, sin red ni Supabase).
 *
 * Aplica el esquema base y las migraciones de PayPal TAL CUAL, inserta filas PayPal como las 13 de producción, y DESPUÉS aplica
 * 20261112000000_stripe_billing_foundation.sql. Cubre: backfill sin romper filas existentes, CHECK de estados, trigger de columnas neutras
 * e historial, la guarda nueva en paypal_apply_event, la matriz de stripe_apply_event, el espejo de acceso en queries_log, la idempotencia
 * de stripe_events y los permisos.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let db: PGlite;
const leer = (...p: string[]) => readFileSync(resolve(process.cwd(), ...p), 'utf-8');

type Res = { applied: boolean; reason: string; resulting_status: string; resulting_tier: string; resulting_sub_id: string };

async function stripeApply(p: {
  user: string; customer?: string | null; sub: string; email?: string | null; tier?: 'pro' | 'academico'; status: string; event?: string;
}): Promise<Res> {
  const r = await db.query(`select stripe_apply_event($1,$2,$3,$4,$5,$6,$7) as result`, [
    p.user, p.customer ?? 'cus_1', p.sub, p.email ?? null, p.tier ?? 'pro', p.status, p.event ?? 'customer.subscription.updated',
  ]);
  return (r.rows[0] as { result: Res }).result;
}

async function paypalApply(p: { user: string; sub: string; payer?: string | null; tier?: 'pro' | 'academico'; status: string; grants: boolean }): Promise<Res> {
  const r = await db.query(`select paypal_apply_event($1,$2,$3,$4,$5,$6,$7,$8) as result`, [
    p.user, p.sub, p.payer ?? null, null, p.tier ?? 'pro', p.status, p.grants, 'BILLING.SUBSCRIPTION.ACTIVATED',
  ]);
  return (r.rows[0] as { result: Res }).result;
}

async function fila(user: string) {
  const r = await db.query(`select * from subscriptions where user_identifier = $1`, [user]);
  return r.rows[0] as Record<string, unknown> | undefined;
}

async function tierHoy(user: string): Promise<string | null> {
  const r = await db.query(`select tier from queries_log where user_identifier = $1 and query_date = current_date`, [user]);
  return r.rows.length ? (r.rows[0] as { tier: string }).tier : null;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    create schema if not exists auth;
    create or replace function auth.role() returns text language sql stable as $$ select current_setting('myapp.mock_role', true) $$;
  `);
  await db.exec(`select set_config('myapp.mock_role', 'service_role', false)`);
  await db.exec(leer('supabase', 'subscriptions.sql'));
  await db.exec(leer('supabase', 'migrations', '20260717010000_paypal_state_machine.sql'));
  await db.exec(leer('supabase', 'migrations', '20260717020000_paypal_event_id_and_atomic_access.sql'));
  // Filas como las de producción ANTES de la migración: PayPal con y sin payer, varios estados.
  await db.exec(`
    insert into subscriptions (user_identifier, paypal_sub_id, paypal_payer_id, email, tier, status) values
      ('email:legado-activo@x.com',    'I-LEG-1', 'PAYER-1', 'legado-activo@x.com',    'pro',       'past_due'),
      ('email:legado-sin-payer@x.com', 'I-LEG-2', null,      'legado-sin-payer@x.com', 'academico', 'trialing'),
      ('email:legado-cancelado@x.com', 'I-LEG-3', 'PAYER-3', 'legado-cancelado@x.com', 'free',      'cancelled');
  `);
  await db.exec(leer('supabase', 'migrations', '20261112000000_stripe_billing_foundation.sql'));
});

afterAll(async () => {
  await db.close();
});

describe('migración: backfill y restricciones', () => {
  it('las filas existentes quedan como PayPal con sus ids neutros, sin tocar tier ni status', async () => {
    const a = await fila('email:legado-activo@x.com');
    expect(a).toMatchObject({ provider: 'paypal', provider_subscription_id: 'I-LEG-1', provider_customer_id: 'PAYER-1', tier: 'pro', status: 'past_due' });
    const b = await fila('email:legado-sin-payer@x.com');
    expect(b).toMatchObject({ provider: 'paypal', provider_subscription_id: 'I-LEG-2', provider_customer_id: null, tier: 'academico', status: 'trialing' });
  });

  it('es idempotente: aplicarla dos veces no cambia nada ni falla', async () => {
    const antes = await db.query(`select * from subscriptions order by user_identifier`);
    await db.exec(leer('supabase', 'migrations', '20261112000000_stripe_billing_foundation.sql'));
    const despues = await db.query(`select * from subscriptions order by user_identifier`);
    expect(despues.rows).toEqual(antes.rows);
  });

  it('status: acepta «pending» (lo escribe create-subscription) y rechaza valores desconocidos', async () => {
    await db.exec(`insert into subscriptions (user_identifier, tier, status) values ('email:pend@x.com', 'pro', 'pending')`);
    await expect(db.exec(`insert into subscriptions (user_identifier, tier, status) values ('email:raro@x.com', 'pro', 'paused')`)).rejects.toThrow(/subscriptions_status_check/);
  });

  it('provider: solo paypal o stripe', async () => {
    await expect(db.exec(`insert into subscriptions (user_identifier, tier, status, provider) values ('email:prov@x.com', 'pro', 'pending', 'otro')`)).rejects.toThrow(/subscriptions_provider_check/);
  });

  it('una misma suscripción del proveedor no puede ligarse a dos usuarios', async () => {
    await expect(db.exec(`insert into subscriptions (user_identifier, tier, status, provider, provider_subscription_id) values ('email:dup@x.com', 'pro', 'pending', 'paypal', 'I-LEG-1')`)).rejects.toThrow(/idx_subs_provider_subscription/);
  });
});

describe('PayPal sin cambios de código: el trigger mantiene las columnas neutras', () => {
  it('una suscripción PayPal nueva por paypal_apply_event llena provider_* sola', async () => {
    const r = await paypalApply({ user: 'email:pp-nuevo@x.com', sub: 'I-PP-NUEVO', payer: 'PAYER-N', status: 'trialing', grants: false });
    expect(r.reason).toBe('created');
    expect(await fila('email:pp-nuevo@x.com')).toMatchObject({ provider: 'paypal', provider_subscription_id: 'I-PP-NUEVO', provider_customer_id: 'PAYER-N' });
  });

  it('activar PayPal sigue escribiendo el espejo de acceso en queries_log', async () => {
    const r = await paypalApply({ user: 'email:pp-nuevo@x.com', sub: 'I-PP-NUEVO', status: 'active', grants: true });
    expect(r).toMatchObject({ applied: true, reason: 'updated' });
    expect(await tierHoy('email:pp-nuevo@x.com')).toBe('pro');
  });
});

describe('stripe_apply_event: matriz', () => {
  it('sin fila: crea la suscripción Stripe; activa → queries_log con el tier', async () => {
    expect((await stripeApply({ user: 'email:st1@x.com', sub: 'sub_A', status: 'trialing' })).reason).toBe('created');
    const r = await stripeApply({ user: 'email:st1@x.com', sub: 'sub_A', status: 'active' });
    expect(r).toMatchObject({ applied: true, reason: 'updated', resulting_status: 'active' });
    expect(await fila('email:st1@x.com')).toMatchObject({ provider: 'stripe', provider_subscription_id: 'sub_A', provider_customer_id: 'cus_1', paypal_sub_id: null });
    expect(await tierHoy('email:st1@x.com')).toBe('pro');
  });

  it('trialing tardío sobre active de la misma suscripción no degrada', async () => {
    const r = await stripeApply({ user: 'email:st1@x.com', sub: 'sub_A', status: 'trialing' });
    expect(r).toMatchObject({ applied: false, reason: 'ignored_no_downgrade', resulting_status: 'active' });
  });

  it('otra suscripción Stripe mientras la vigente está activa: no se pisa y queda registrado el duplicado', async () => {
    const r = await stripeApply({ user: 'email:st1@x.com', sub: 'sub_B', status: 'active' });
    expect(r).toMatchObject({ applied: false, reason: 'duplicate_active_subscription', resulting_sub_id: 'sub_A' });
    const d = await db.query(`select * from billing_duplicate_attempts where user_identifier = 'email:st1@x.com'`);
    expect(d.rows).toHaveLength(1);
  });

  it('cancelación de OTRA suscripción no toca la vigente', async () => {
    const r = await stripeApply({ user: 'email:st1@x.com', sub: 'sub_VIEJA', status: 'cancelled' });
    expect(r).toMatchObject({ applied: false, reason: 'stale_event_ignored', resulting_status: 'active' });
    expect(await tierHoy('email:st1@x.com')).toBe('pro');
  });

  it('cancelación de la suscripción vigente: tier free en subscriptions Y en queries_log, atómicamente', async () => {
    const r = await stripeApply({ user: 'email:st1@x.com', sub: 'sub_A', status: 'cancelled' });
    expect(r).toMatchObject({ applied: true, reason: 'downgraded', resulting_tier: 'free' });
    expect(await fila('email:st1@x.com')).toMatchObject({ tier: 'free', status: 'cancelled' });
    expect(await tierHoy('email:st1@x.com')).toBe('free');
  });

  it('nueva suscripción tras cancelar: reemplaza y guarda la anterior en el historial', async () => {
    const r = await stripeApply({ user: 'email:st1@x.com', sub: 'sub_C', status: 'active' });
    expect(r.reason).toBe('reactivated_new_subscription');
    const h = await db.query(`select * from subscription_provider_history where user_identifier = 'email:st1@x.com'`);
    expect(h.rows).toHaveLength(1);
    expect(h.rows[0]).toMatchObject({ provider: 'stripe', provider_subscription_id: 'sub_A', status: 'cancelled', replaced_by_subscription: 'sub_C', reason: 'subscription_replaced' });
  });

  it('cancelación sin fila previa: no crea nada', async () => {
    const r = await stripeApply({ user: 'email:fantasma@x.com', sub: 'sub_Z', status: 'cancelled' });
    expect(r).toMatchObject({ applied: false, reason: 'stale_event_ignored' });
    expect(await fila('email:fantasma@x.com')).toBeUndefined();
  });

  it('rechaza tier, estado, suscripción o identificador inválidos sin escribir nada', async () => {
    const antes = (await db.query(`select count(*)::int as n from billing_state_transitions`)).rows[0] as { n: number };
    await expect(stripeApply({ user: 'email:x@x.com', sub: 'sub_1', status: 'active', tier: 'gratis' as never })).rejects.toThrow(/tier inválido/);
    await expect(stripeApply({ user: 'email:x@x.com', sub: 'sub_1', status: 'paused' })).rejects.toThrow(/status inválido/);
    await expect(stripeApply({ user: 'email:x@x.com', sub: '', status: 'active' })).rejects.toThrow(/id de suscripción/);
    await expect(stripeApply({ user: 'ip:1.2.3.4', sub: 'sub_1', status: 'active' })).rejects.toThrow(/identificador/);
    const despues = (await db.query(`select count(*)::int as n from billing_state_transitions`)).rows[0] as { n: number };
    expect(despues.n).toBe(antes.n);
  });

  it('audita cada llamada con el prefijo stripe:', async () => {
    const r = await db.query(`select count(*)::int as n from billing_state_transitions where user_identifier = 'email:st1@x.com' and event_type like 'stripe:%'`);
    expect((r.rows[0] as { n: number }).n).toBeGreaterThanOrEqual(7);
  });
});

describe('cambio de proveedor sin perder historial', () => {
  it('PayPal ACTIVO → intento Stripe: NO se pisa (no se puede cancelar el cobro de PayPal automáticamente)', async () => {
    await paypalApply({ user: 'email:cambio@x.com', sub: 'I-CAMBIO', payer: 'PAYER-C', status: 'active', grants: true });
    const r = await stripeApply({ user: 'email:cambio@x.com', sub: 'sub_CAMBIO', status: 'active' });
    expect(r).toMatchObject({ applied: false, reason: 'duplicate_active_subscription', resulting_sub_id: 'I-CAMBIO' });
    expect(await fila('email:cambio@x.com')).toMatchObject({ provider: 'paypal', paypal_sub_id: 'I-CAMBIO' });
  });

  it('PayPal CANCELADO → Stripe: provider_switched; la fila PayPal queda en el historial y paypal_* se limpian', async () => {
    await db.query(`select paypal_apply_downgrade($1,$2,$3)`, ['I-CAMBIO', 'cancelled', 'BILLING.SUBSCRIPTION.CANCELLED']);
    const r = await stripeApply({ user: 'email:cambio@x.com', sub: 'sub_CAMBIO', customer: 'cus_C', status: 'active', tier: 'academico' });
    expect(r).toMatchObject({ applied: true, reason: 'provider_switched', resulting_tier: 'academico' });
    expect(await fila('email:cambio@x.com')).toMatchObject({
      provider: 'stripe', provider_subscription_id: 'sub_CAMBIO', provider_customer_id: 'cus_C', paypal_sub_id: null, paypal_payer_id: null, tier: 'academico', status: 'active',
    });
    expect(await tierHoy('email:cambio@x.com')).toBe('academico');
    const h = await db.query(`select * from subscription_provider_history where user_identifier = 'email:cambio@x.com'`);
    expect(h.rows).toHaveLength(1);
    expect(h.rows[0]).toMatchObject({ provider: 'paypal', paypal_sub_id: 'I-CAMBIO', paypal_payer_id: 'PAYER-C', status: 'cancelled', replaced_by_provider: 'stripe', reason: 'provider_switch' });
  });

  it('un ACTIVATED tardío de la suscripción PayPal anterior NO pisa la suscripción Stripe vigente', async () => {
    const r = await paypalApply({ user: 'email:cambio@x.com', sub: 'I-CAMBIO', status: 'active', grants: true });
    expect(r).toMatchObject({ applied: false, reason: 'duplicate_active_subscription', resulting_sub_id: 'sub_CAMBIO' });
    expect(await fila('email:cambio@x.com')).toMatchObject({ provider: 'stripe', provider_subscription_id: 'sub_CAMBIO' });
  });

  it('una cancelación tardía de la suscripción PayPal anterior no encuentra fila y no degrada a Stripe', async () => {
    const r = await db.query(`select paypal_apply_downgrade($1,$2,$3) as result`, ['I-CAMBIO', 'cancelled', 'BILLING.SUBSCRIPTION.CANCELLED']);
    expect((r.rows[0] as { result: Res }).result).toMatchObject({ applied: false, reason: 'no_matching_subscription' });
    expect(await fila('email:cambio@x.com')).toMatchObject({ provider: 'stripe', status: 'active', tier: 'academico' });
  });

  it('Stripe CANCELADO → nueva suscripción PayPal (código PayPal sin cambios): el trigger vuelve a PayPal y guarda la fila Stripe', async () => {
    await stripeApply({ user: 'email:cambio@x.com', sub: 'sub_CAMBIO', status: 'cancelled' });
    const r = await paypalApply({ user: 'email:cambio@x.com', sub: 'I-CAMBIO-2', payer: 'PAYER-C2', status: 'active', grants: true });
    expect(r.applied).toBe(true);
    expect(await fila('email:cambio@x.com')).toMatchObject({ provider: 'paypal', provider_subscription_id: 'I-CAMBIO-2', provider_customer_id: 'PAYER-C2' });
    const h = await db.query(`select * from subscription_provider_history where user_identifier = 'email:cambio@x.com' order by recorded_at, id`);
    expect(h.rows.map((x) => (x as { provider: string }).provider)).toEqual(expect.arrayContaining(['paypal', 'stripe']));
  });
});

describe('stripe_events y permisos', () => {
  it('event_id es único: un reintento de Stripe con el mismo id se rechaza', async () => {
    await db.exec(`insert into stripe_events (event_id, event_type) values ('evt_1', 'customer.subscription.updated')`);
    await expect(db.exec(`insert into stripe_events (event_id, event_type) values ('evt_1', 'customer.subscription.updated')`)).rejects.toThrow(/duplicate key/);
  });

  it('stripe_apply_event es SECURITY INVOKER', async () => {
    const r = await db.query(`select prosecdef from pg_proc where proname = 'stripe_apply_event'`);
    expect((r.rows[0] as { prosecdef: boolean }).prosecdef).toBe(false);
  });

  it('anon y authenticated: EXECUTE denegado; service_role: permitido', async () => {
    for (const rol of ['anon', 'authenticated']) {
      await db.exec(`set role ${rol}`);
      await expect(db.query(`select stripe_apply_event($1,$2,$3,$4,$5,$6,$7)`, ['email:p@x.com', 'cus', 'sub_P', null, 'pro', 'trialing', 'T'])).rejects.toThrow(/permission denied/i);
      await db.exec(`reset role`);
    }
    await db.exec(`set role service_role`);
    const r = await db.query(`select stripe_apply_event($1,$2,$3,$4,$5,$6,$7) as result`, ['email:p@x.com', 'cus', 'sub_P', null, 'pro', 'trialing', 'T']);
    expect((r.rows[0] as { result: Res }).result.applied).toBe(true);
    await db.exec(`reset role`);
  });

  it('anon no puede leer stripe_events ni el historial', async () => {
    await db.exec(`set role anon`);
    await expect(db.query(`select * from stripe_events limit 1`)).rejects.toThrow(/permission denied/i);
    await expect(db.query(`select * from subscription_provider_history limit 1`)).rejects.toThrow(/permission denied/i);
    await db.exec(`reset role`);
  });
});
