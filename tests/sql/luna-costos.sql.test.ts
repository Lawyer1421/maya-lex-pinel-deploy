/**
 * PROPUESTA_NO_APLICADA — pruebas del DDL propuesto del contador global de Luna (docs/luna/PROPUESTA_NO_APLICADA_luna_costos.sql).
 * Corren en una base Postgres EN MEMORIA (PGlite detrás de un servidor de cable real, varias conexiones pg). Nunca tocan Supabase y el DDL
 * NO se aplica a ninguna base real. Cubren: tope atómico bajo concurrencia, liquidación, validación de argumentos, permisos y reversión.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import pg from 'pg';

const PORT = 25434;
const DDL = readFileSync(resolve(process.cwd(), 'docs/luna/PROPUESTA_NO_APLICADA_luna_costos.sql'), 'utf8');
const ROLLBACK = readFileSync(resolve(process.cwd(), 'docs/luna/PROPUESTA_NO_APLICADA_luna_costos_rollback.sql'), 'utf8');
let db: PGlite;
let server: PGLiteSocketServer;
const clientes: pg.Client[] = [];
const conn = async (): Promise<pg.Client> => clientes[0];

beforeAll(async () => {
  db = await PGlite.create();
  // Roles de Supabase que el DDL referencia (en producción ya existen).
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin;
                 grant usage on schema public to anon, authenticated, service_role;`);
  await db.exec(DDL);
  server = new PGLiteSocketServer({ db, port: PORT, host: '127.0.0.1', maxConnections: 4 });
  await server.start();
  for (let i = 0; i < 4; i++) {
    const c = new pg.Client({ host: '127.0.0.1', port: PORT, database: 'postgres', user: 'postgres' });
    await c.connect();
    clientes.push(c);
  }
}, 60_000);

afterAll(async () => {
  for (const c of clientes) await c.end().catch(() => {});
  await server?.stop();
  await db?.close();
});

const reservar = (c: pg.Client, plan: string, micro: number, tope: number) =>
  c.query('select public.luna_reservar_costo($1::date, $2, $3::bigint, $4::bigint) as ok', ['2026-10-29', plan, micro, tope]).then((r) => r.rows[0].ok as boolean);

describe('contador global de costos (DDL propuesto, base en memoria)', () => {
  it('concurrencia: 60 reservas simultáneas por 4 conexiones nunca superan el tope', async () => {
    const cs = clientes;
    const resultados = await Promise.all(Array.from({ length: 60 }, (_, i) => reservar(cs[i % 4], 'free', 100, 1000)));
    expect(resultados.filter(Boolean)).toHaveLength(10);
    const { rows } = await db.query<{ gastado_micro: string; consultas: string }>("select gastado_micro, consultas from public.luna_costos_diarios where dia='2026-10-29' and plan='free'");
    expect(Number(rows[0].gastado_micro)).toBe(1000);
    expect(Number(rows[0].consultas)).toBe(10);
  });

  it('el tope es por plan y por día', async () => {
    const c = await conn();
    expect(await reservar(c, 'premium', 900, 1000)).toBe(true);
    expect(await reservar(c, 'premium', 200, 1000)).toBe(false);
    expect(await reservar(c, 'academico', 200, 1000)).toBe(true);
    const otroDia = await c.query("select public.luna_reservar_costo('2026-10-30'::date, 'free', 100::bigint, 1000::bigint) as ok");
    expect(otroDia.rows[0].ok).toBe(true);
  });

  it('argumentos inválidos devuelven false sin escribir: plan desconocido, monto negativo, tope 0', async () => {
    const c = await conn();
    expect(await reservar(c, 'platino', 1, 1000)).toBe(false);
    expect(await reservar(c, 'free', -5, 1000)).toBe(false);
    expect(await reservar(c, 'free', 1, 0)).toBe(false);
  });

  it('liquidación: delta negativo libera, y el acumulado no baja de 0', async () => {
    const c = await conn();
    await c.query("select public.luna_liquidar_costo('2026-10-29'::date, 'premium', -300::bigint)");
    const a = await db.query<{ gastado_micro: string }>("select gastado_micro from public.luna_costos_diarios where dia='2026-10-29' and plan='premium'");
    expect(Number(a.rows[0].gastado_micro)).toBe(600);
    await c.query("select public.luna_liquidar_costo('2026-10-29'::date, 'premium', -99999::bigint)");
    const b = await db.query<{ gastado_micro: string }>("select gastado_micro from public.luna_costos_diarios where dia='2026-10-29' and plan='premium'");
    expect(Number(b.rows[0].gastado_micro)).toBe(0);
  });

  it('permisos: anon y authenticated no pueden ejecutar las RPC ni leer la tabla; service_role sí ejecuta', async () => {
    for (const rol of ['anon', 'authenticated']) {
      await db.exec(`set role ${rol}`);
      await expect(db.query("select public.luna_reservar_costo('2026-10-29'::date, 'free', 1::bigint, 1000::bigint)")).rejects.toThrow(/permission denied/i);
      await expect(db.query('select * from public.luna_costos_diarios')).rejects.toThrow(/permission denied/i);
      await db.exec('reset role');
    }
    await db.exec('set role service_role');
    const r = await db.query<{ ok: boolean }>("select public.luna_reservar_costo('2026-10-29'::date, 'free', 0::bigint, 1000::bigint) as ok");
    await db.exec('reset role');
    expect(r.rows[0].ok).toBeDefined();
  });

  it('reversión: el script elimina funciones y tabla', async () => {
    await db.exec(ROLLBACK);
    const { rows } = await db.query<{ n: string }>("select count(*)::text as n from pg_proc where proname like 'luna_%costo'");
    expect(rows[0].n).toBe('0');
    const t = await db.query<{ n: string }>("select count(*)::text as n from information_schema.tables where table_name='luna_costos_diarios'");
    expect(t.rows[0].n).toBe('0');
  });
});
