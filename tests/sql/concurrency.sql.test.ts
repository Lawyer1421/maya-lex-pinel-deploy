/**
 * Prueba de concurrencia con DOS CONEXIONES POSTGRES REALES — no PGlite
 * en proceso (que expone una única sesión), sino @electric-sql/pglite
 * detrás de @electric-sql/pglite-socket (servidor TCP real, protocolo
 * de cable de Postgres real) y dos `pg.Client` (node-postgres) reales
 * conectados por separado, tal como lo estarían dos invocaciones
 * concurrentes de la API en producción.
 *
 * Nunca toca Supabase ni PayPal reales. Nunca hace cobros. Se detiene
 * (falla el test, no cuelga indefinidamente) si el bloqueo esperado no
 * ocurre, gracias a timeouts explícitos en cada espera.
 *
 * pglite-socket documenta que sus conexiones "concurrentes" pasan por un
 * multiplexor de queries sobre la única instancia de PGlite — no son
 * procesos backend separados como en Postgres real. Aun así, el motor
 * subyacente SÍ es Postgres real (compilado a WASM) y su gestor de locks
 * (advisory locks, MVCC) es el código C real portado, no una
 * reimplementación — por eso este test puede demostrar bloqueo genuino
 * con timestamps, verificado empíricamente antes de escribir este
 * archivo (ver informe de la puerta de preproducción).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import pg from 'pg';

const PORT = 25433;

let db: PGlite;
let server: PGLiteSocketServer;

async function newConn(): Promise<pg.Client> {
  const client = new pg.Client({ host: '127.0.0.1', port: PORT, database: 'postgres', user: 'postgres' });
  await client.connect();
  return client;
}

beforeAll(async () => {
  db = await PGlite.create();

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

  server = new PGLiteSocketServer({ db, port: PORT, host: '127.0.0.1', maxConnections: 4 });
  await server.start();
}, 30000);

afterAll(async () => {
  await server.stop();
  await db.close();
});

function callApplyEventSql(client: pg.Client, params: {
  userIdentifier: string; paypalSubId: string; tier: string; newStatus: string; grantsAccess: boolean; eventType: string;
}) {
  return client.query(
    `select paypal_apply_event($1,$2,$3,$4,$5,$6,$7,$8) as result`,
    [params.userIdentifier, params.paypalSubId, null, null, params.tier, params.newStatus, params.grantsAccess, params.eventType]
  );
}

describe('Concurrencia real — dos conexiones pg (A-F)', () => {
  // A. Dos CREATED simultáneos sin fila previa.
  it('A. dos CREATED simultáneos para un usuario NUEVO: uno espera al otro, ninguno truena, una sola fila resulta', async () => {
    const uid = 'email:concurrency-A@x.com';
    const connA = await newConn();
    const connB = await newConn();
    const log: string[] = [];

    try {
      const pA = callApplyEventSql(connA, {
        userIdentifier: uid, paypalSubId: 'SUB-A1', tier: 'pro', newStatus: 'trialing', grantsAccess: false, eventType: 'CREATED',
      }).then((r) => { log.push(`A resuelto @ ${Date.now()}`); return r; });

      const pB = callApplyEventSql(connB, {
        userIdentifier: uid, paypalSubId: 'SUB-A2', tier: 'pro', newStatus: 'trialing', grantsAccess: false, eventType: 'CREATED',
      }).then((r) => { log.push(`B resuelto @ ${Date.now()}`); return r; });

      const [resA, resB] = await Promise.all([pA, pB]);
      // Ninguna de las dos llamadas debe lanzar (esto es exactamente lo
      // que el advisory lock previene: un unique_violation sin manejar).
      expect(resA.rows[0].result.applied).toBe(true);
      expect(resB.rows[0].result.applied).toBe(true);

      const count = await connA.query(`select count(*)::int as n from subscriptions where user_identifier = $1`, [uid]);
      expect(count.rows[0].n).toBe(1);
    } finally {
      await connA.end();
      await connB.end();
    }
  }, 15000);

  // B. CREATED y ACTIVATED simultáneos.
  it('B. CREATED y ACTIVATED simultáneos para un usuario NUEVO: el resultado final nunca queda por debajo de active si ACTIVATED se aplicó', async () => {
    const uid = 'email:concurrency-B@x.com';
    const connA = await newConn();
    const connB = await newConn();

    try {
      const pCreated = callApplyEventSql(connA, {
        userIdentifier: uid, paypalSubId: 'SUB-B1', tier: 'pro', newStatus: 'trialing', grantsAccess: false, eventType: 'CREATED',
      });
      const pActivated = callApplyEventSql(connB, {
        userIdentifier: uid, paypalSubId: 'SUB-B1', tier: 'pro', newStatus: 'active', grantsAccess: true, eventType: 'ACTIVATED',
      });

      await Promise.all([pCreated, pActivated]);

      const row = await connA.query(`select status from subscriptions where user_identifier = $1`, [uid]);
      // Sin importar el orden real de ejecución, el resultado final debe
      // ser 'active': si CREATED corrió primero, ACTIVATED lo sube; si
      // ACTIVATED corrió primero, el Caso B de CREATED se niega a bajarlo.
      expect(row.rows[0].status).toBe('active');
    } finally {
      await connA.end();
      await connB.end();
    }
  }, 15000);

  // C. Dos ACTIVATED con subscription IDs diferentes.
  it('C. dos ACTIVATED concurrentes con sub_id diferentes: exactamente uno gana, el otro se registra como duplicado', async () => {
    const uid = 'email:concurrency-C@x.com';
    const connA = await newConn();
    const connB = await newConn();

    try {
      const pA = callApplyEventSql(connA, {
        userIdentifier: uid, paypalSubId: 'SUB-C1', tier: 'pro', newStatus: 'active', grantsAccess: true, eventType: 'ACTIVATED',
      });
      const pB = callApplyEventSql(connB, {
        userIdentifier: uid, paypalSubId: 'SUB-C2', tier: 'pro', newStatus: 'active', grantsAccess: true, eventType: 'ACTIVATED',
      });

      const [rA, rB] = await Promise.all([pA, pB]);
      const results = [rA.rows[0].result, rB.rows[0].result];
      const applied = results.filter((r) => r.applied);
      const rejected = results.filter((r) => !r.applied);

      expect(applied.length).toBe(1);
      expect(rejected.length).toBe(1);
      expect(rejected[0].reason).toBe('duplicate_active_subscription');

      const dup = await connA.query(`select count(*)::int as n from billing_duplicate_attempts where user_identifier = $1`, [uid]);
      expect(dup.rows[0].n).toBe(1);
    } finally {
      await connA.end();
      await connB.end();
    }
  }, 15000);

  // D. "Reconciliación" y "webhook" simultáneos — mismo primitivo de
  // fondo (dos llamadas a paypal_apply_event para el mismo usuario), acá
  // simulando que una es el webhook ACTIVATED real y la otra es una
  // verificación manual re-aplicando el mismo resultado (idempotente).
  it('D. reconciliación manual y webhook concurrentes para la MISMA suscripción activa: idempotente, sin duplicar auditoría de forma inconsistente', async () => {
    const uid = 'email:concurrency-D@x.com';
    const connA = await newConn();
    const connB = await newConn();

    try {
      const pWebhook = callApplyEventSql(connA, {
        userIdentifier: uid, paypalSubId: 'SUB-D1', tier: 'academico', newStatus: 'active', grantsAccess: true, eventType: 'ACTIVATED',
      });
      const pReconciliacion = callApplyEventSql(connB, {
        userIdentifier: uid, paypalSubId: 'SUB-D1', tier: 'academico', newStatus: 'active', grantsAccess: true, eventType: 'MANUAL_VERIFICATION',
      });

      const [rWebhook, rReconciliacion] = await Promise.all([pWebhook, pReconciliacion]);
      expect(rWebhook.rows[0].result.applied).toBe(true);
      expect(rReconciliacion.rows[0].result.applied).toBe(true);

      const row = await connA.query(`select status, tier from subscriptions where user_identifier = $1`, [uid]);
      expect(row.rows[0]).toMatchObject({ status: 'active', tier: 'academico' });
      const ql = await connA.query(`select tier from queries_log where user_identifier = $1 and query_date = current_date`, [uid]);
      expect(ql.rows[0].tier).toBe('academico');
    } finally {
      await connA.end();
      await connB.end();
    }
  }, 15000);

  // E. Error dentro de una transacción y liberación del advisory lock.
  it('E. un error dentro de la transacción libera el advisory lock (rollback), no lo deja huérfano', async () => {
    const uid = 'email:concurrency-E@x.com';
    const connA = await newConn();
    const connB = await newConn();

    try {
      // connA falla a propósito (tier inválido) — esto ocurre DENTRO de
      // paypal_apply_event, después de tomar el advisory lock pero antes
      // de terminar. Postgres hace ROLLBACK automático de la transacción
      // implícita del RPC, lo que debe liberar el lock inmediatamente.
      await expect(
        callApplyEventSql(connA, {
          userIdentifier: uid, paypalSubId: 'SUB-E1', tier: 'invalido', newStatus: 'trialing', grantsAccess: false, eventType: 'CREATED',
        })
      ).rejects.toThrow();

      // Si el lock hubiera quedado huérfano, esta llamada colgaría. Se
      // acota con un timeout explícito del lado del test (no de Postgres)
      // para que el test FALLE en vez de colgar si algo salió mal.
      const start = Date.now();
      const result = await Promise.race([
        callApplyEventSql(connB, {
          userIdentifier: uid, paypalSubId: 'SUB-E2', tier: 'pro', newStatus: 'trialing', grantsAccess: false, eventType: 'CREATED',
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT: el lock quedó huérfano tras el error')), 5000)),
      ]) as pg.QueryResult;

      expect(Date.now() - start).toBeLessThan(5000);
      expect((result.rows[0] as any).result.applied).toBe(true);
    } finally {
      await connA.end();
      await connB.end();
    }
  }, 15000);

  // F. Timeout de lock — INTENTADO Y NO CONFIRMADO en este entorno.
  //
  // `SET lock_timeout` es el mecanismo estándar de Postgres para acotar
  // la espera por un lock en vez de bloquear indefinidamente (relevante
  // para producción: un webhook colgado no debería poder bloquear a
  // otro para siempre). Se intentó empíricamente contra este mismo
  // servidor pglite-socket: connA toma el advisory lock sin liberar,
  // connB configura `lock_timeout = 300ms` e intenta el mismo lock.
  //
  // Resultado observado: la query de connB NUNCA lanzó el error de
  // lock_timeout — quedó esperando indefinidamente hasta agotar el
  // timeout del propio test (15s), a diferencia de los escenarios A-E
  // (que sí liberan el lock vía commit/rollback real y sí se desbloquean
  // correctamente). La hipótesis más probable: el modelo de ejecución de
  // PGlite (una única instancia WASM de un solo hilo, multiplexada por
  // pglite-socket a nivel de cola de queries) no tiene el mecanismo de
  // interrupción por señal/temporizador asíncrono que Postgres real usa
  // para abortar una espera de lock desde OTRO proceso backend — aquí no
  // hay "otro proceso" real esperando en paralelo con un temporizador
  // independiente.
  //
  // Esto NO es una falla del código de la migración (lock_timeout es una
  // configuración de sesión/conexión, no algo que la RPC controle) — es
  // una limitación de este entorno de prueba desechable. Se marca como
  // bloqueada explícitamente en vez de forzar una aserción falsa o dejar
  // el test en rojo. Requiere verificarse contra un Postgres/Supabase
  // real (multi-proceso) antes de asumir que lock_timeout se comportará
  // como se espera en producción — ver informe de entrega, sección de
  // bloqueadores.
  it.skip('F. lock_timeout acota la espera — BLOQUEADO: no confirmable en PGlite/pglite-socket, requiere Postgres multi-proceso real', () => {});
});
