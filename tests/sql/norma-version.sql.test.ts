/**
 * Pruebas contra PostgreSQL REAL (PGlite en memoria, no mocks) de la migración
 * supabase/migrations/20261016000000_norma_version.sql: CHECKs, exclusion
 * constraint contra solapes y RLS. Las filas se insertan sólo dentro de este
 * PGlite efímero; no se siembra nada en ninguna base real.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let db: PGlite;

const base = {
  instrumento_id: 'SINT',
  unidad: '1',
  version_id: 'v1',
  vigente_desde: '2020-01-01',
  tipo_evento: 'ORIGINAL',
  nivel_verificacion: 'SECUNDARIA',
  precision_fecha: 'DIA',
};

async function insertar(over: Record<string, unknown> = {}) {
  const row = { ...base, ...over };
  const cols = Object.keys(row);
  const vals = Object.values(row);
  await db.query(
    `insert into public.norma_version (${cols.map((c) => `"${c}"`).join(',')}) values (${cols.map((_, i) => `$${i + 1}`).join(',')})`,
    vals,
  );
}

beforeAll(async () => {
  db = new PGlite({ extensions: { btree_gist } });
  await db.exec(`create role anon; create role authenticated; create role service_role;`);
  await db.exec(readFileSync(resolve(__dirname, '../../supabase/migrations/20261016000000_norma_version.sql'), 'utf8'));
});

afterAll(async () => {
  await db.close();
});

describe('norma_version — CHECKs', () => {
  it('rechaza valores fuera de catálogo', async () => {
    await expect(insertar({ version_id: 'x1', tipo_evento: 'INVENTADO' })).rejects.toThrow();
    await expect(insertar({ version_id: 'x2', estado_vigencia: 'TAL_VEZ' })).rejects.toThrow();
    await expect(insertar({ version_id: 'x3', nivel_verificacion: 'RUMOR' })).rejects.toThrow();
    await expect(insertar({ version_id: 'x4', precision_fecha: 'SEMANA' })).rejects.toThrow();
  });
  it('acepta los valores del catálogo, incluida precision «AÑO»', async () => {
    await insertar({ unidad: 'c1', version_id: 'ok', tipo_evento: 'TEXTO_NUEVO_MISMO_NUMERO', precision_fecha: 'AÑO' });
  });
  it('estado_vigencia es UNKNOWN y elegible_primary false por defecto', async () => {
    await insertar({ unidad: 'c2', version_id: 'def' });
    const r = await db.query<{ estado_vigencia: string; elegible_primary: boolean }>(
      `select estado_vigencia, elegible_primary from public.norma_version where unidad='c2'`,
    );
    expect(r.rows[0]).toEqual({ estado_vigencia: 'UNKNOWN', elegible_primary: false });
  });
  it('elegible_primary exige texto, vigencia TRUE o TRUE_PRESUNTA y fecha que no sea RANGO', async () => {
    const ok = { texto: 'T', estado_vigencia: 'TRUE', nivel_verificacion: 'PRIMARIA_TEXTO', elegible_primary: true };
    await insertar({ unidad: 'e0', version_id: 'ok', ...ok });
    // CLO: TRUE_PRESUNTA es elegible, y la verificación secundaria (p. ej. CEDIJ) no la excluye.
    await insertar({ unidad: 'e3', version_id: 'ok', ...ok, estado_vigencia: 'TRUE_PRESUNTA' });
    await insertar({ unidad: 'e4', version_id: 'ok', ...ok, estado_vigencia: 'TRUE_PRESUNTA', nivel_verificacion: 'SECUNDARIA', fuente: 'CEDIJ' });
    await expect(insertar({ unidad: 'e1', version_id: 'a', ...ok, texto: null })).rejects.toThrow();
    await expect(insertar({ unidad: 'e2', version_id: 'a', ...ok, estado_vigencia: 'UNKNOWN' })).rejects.toThrow();
    await expect(insertar({ unidad: 'e6', version_id: 'a', ...ok, estado_vigencia: 'FALSE' })).rejects.toThrow();
    await expect(
      insertar({ unidad: 'e5', version_id: 'a', ...ok, precision_fecha: 'RANGO', vigente_desde_min: '2020-01-01', vigente_desde_max: '2020-01-03' }),
    ).rejects.toThrow();
  });
  it('RANGO exige ambos extremos y vigente_desde dentro del rango', async () => {
    await expect(insertar({ unidad: 'r1', version_id: 'a', precision_fecha: 'RANGO' })).rejects.toThrow();
    await expect(
      insertar({ unidad: 'r2', version_id: 'a', precision_fecha: 'RANGO', vigente_desde_min: '2020-02-01', vigente_desde_max: '2020-02-03' }),
    ).rejects.toThrow();
    await insertar({ unidad: 'r3', version_id: 'a', precision_fecha: 'RANGO', vigente_desde_min: '2020-01-01', vigente_desde_max: '2020-01-03' });
  });
  it('vigente_hasta debe ser posterior a vigente_desde; la vigencia no precede a la publicación', async () => {
    await expect(insertar({ unidad: 'w1', version_id: 'a', vigente_hasta: '2020-01-01' })).rejects.toThrow();
    await expect(insertar({ unidad: 'w2', version_id: 'a', fecha_publicacion: '2020-06-01' })).rejects.toThrow();
    await insertar({ unidad: 'w3', version_id: 'a', fecha_publicacion: '2019-12-12' });
  });
});

describe('norma_version — sin solapes', () => {
  it('rechaza una segunda versión que se solapa en la misma unidad', async () => {
    await insertar({ unidad: 's1', version_id: 'a', vigente_desde: '2020-01-01', vigente_hasta: '2022-01-01' });
    await expect(insertar({ unidad: 's1', version_id: 'b', vigente_desde: '2021-06-01' })).rejects.toThrow(/sin_solapes|exclusion/i);
  });
  it('acepta versiones contiguas y la misma ventana en otra unidad', async () => {
    await insertar({ unidad: 's1', version_id: 'c', vigente_desde: '2022-01-01' });
    await insertar({ unidad: 's2', version_id: 'a', vigente_desde: '2020-01-01', vigente_hasta: '2022-01-01' });
  });
  it('una versión abierta bloquea otra posterior que se solape con ella', async () => {
    await expect(insertar({ unidad: 's1', version_id: 'd', vigente_desde: '2030-01-01' })).rejects.toThrow();
  });
});

describe('norma_version — RLS', () => {
  it('RLS está activado', async () => {
    const r = await db.query<{ relrowsecurity: boolean }>(`select relrowsecurity from pg_class where oid = 'public.norma_version'::regclass`);
    expect(r.rows[0].relrowsecurity).toBe(true);
  });
  it('authenticated lee; no escribe', async () => {
    await db.exec(`set role authenticated`);
    const r = await db.query(`select count(*)::int as n from public.norma_version`);
    expect((r.rows[0] as { n: number }).n).toBeGreaterThan(0);
    await expect(
      db.query(`insert into public.norma_version (instrumento_id, unidad, version_id, vigente_desde, tipo_evento, nivel_verificacion, precision_fecha) values ('X','1','v','2020-01-01','ORIGINAL','SECUNDARIA','DIA')`),
    ).rejects.toThrow();
    await db.exec(`reset role`);
  });
  it('anon no lee', async () => {
    await db.exec(`set role anon`);
    await expect(db.query(`select * from public.norma_version`)).rejects.toThrow(/permission denied/i);
    await db.exec(`reset role`);
  });
  it('el rollback elimina la tabla', async () => {
    await db.exec(readFileSync(resolve(__dirname, '../../supabase/rollbacks/20261016000000_norma_version_rollback.sql'), 'utf8'));
    const r = await db.query<{ t: string | null }>(`select to_regclass('public.norma_version')::text as t`);
    expect(r.rows[0].t).toBeNull();
  });
});
