/**
 * Pruebas contra PostgreSQL REAL (PGlite en memoria) de supabase/migrations/20261115000000_multi_jurisdiction_v3.sql.
 * PGlite no incluye pgvector: se declara un `vector` mínimo (dominio sobre float8[] con `<=>` = distancia coseno) solo
 * dentro de este PGlite efímero, suficiente para ejecutar la función tal cual se aplicará en staging.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const MIGRACION = readFileSync(resolve(__dirname, '../../supabase/migrations/20261115000000_multi_jurisdiction_v3.sql'), 'utf8');
const ROLLBACK = readFileSync(resolve(__dirname, '../../supabase/rollbacks/20261115000000_multi_jurisdiction_v3_rollback.sql'), 'utf8');
const sinComentarios = (s: string) => s.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');

let db: PGlite;

type Fila = { id: string; jurisdiccion: string | null; embedding: number[]; materia?: string; vigente?: boolean; pendiente?: boolean; coleccion?: string };

const Q = [1, 0];
// Las filas extranjeras y nulas son MÁS similares a la consulta que cualquier fila HN.
const FILAS: Fila[] = [
  { id: 'sv-1', jurisdiccion: 'SV', embedding: [1, 0] },
  { id: 'gt-1', jurisdiccion: 'GT', embedding: [1, 0.01] },
  { id: 'cr-1', jurisdiccion: 'CR', embedding: [1, 0.02] },
  { id: 'ni-1', jurisdiccion: 'NI', embedding: [1, 0.03] },
  { id: 'pa-1', jurisdiccion: 'PA', embedding: [1, 0.04] },
  { id: 'null-1', jurisdiccion: null, embedding: [1, 0.05] },
  { id: 'hn-min', jurisdiccion: 'hn', embedding: [1, 0.06] },
  // Regla de la Fase 3: derecho comparado (PE, ES) y tratados (INTERNACION) nunca se mezclan con la norma interna de ningún país.
  { id: 'pe-1', jurisdiccion: 'PE', embedding: [1, 0] },
  { id: 'es-1', jurisdiccion: 'ES', embedding: [1, 0] },
  { id: 'int-1', jurisdiccion: 'INTERNACION', embedding: [1, 0] },
  { id: 'hn-1', jurisdiccion: 'HN', embedding: [1, 0.5], materia: 'CIVIL', vigente: true },
  { id: 'hn-2', jurisdiccion: 'HN', embedding: [1, 1], materia: 'PENAL', vigente: false },
  { id: 'hn-pend', jurisdiccion: 'HN', embedding: [1, 0.1], pendiente: true },
  { id: 'hn-otra-col', jurisdiccion: 'HN', embedding: [1, 0.1], coleccion: 'otra' },
];

async function v3(args: { pais?: string | null; materia?: string | null; limite?: number; vigente?: boolean; q?: number[] } = {}) {
  const conPais = 'pais' in args;
  const r = await db.query<{ id: string; jurisdiccion: string; similarity: number }>(
    `select id, jurisdiccion, similarity from public.buscar_biblioteca_v3($1::float8[]::vector, 'col', $2, $3, $4${conPais ? ', $5' : ''})`,
    [`{${(args.q ?? Q).join(',')}}`, args.materia ?? null, args.limite ?? 20, args.vigente ?? false, ...(conPais ? [args.pais] : [])],
  );
  return r.rows;
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create domain vector as float8[];
    create function vector_cosine_distance(a float8[], b float8[]) returns float8 language sql immutable as $$
      select 1 - (select sum(x * y) from unnest(a, b) as t(x, y))
               / (sqrt((select sum(x * x) from unnest(a) x)) * sqrt((select sum(y * y) from unnest(b) y)))
    $$;
    create operator <=> (leftarg = float8[], rightarg = float8[], function = vector_cosine_distance);
    create table public.biblioteca_vectores (
      id text primary key, coleccion text, materia text, contenido text, num_articulo text, fuente text, fuente_tipo text,
      jurisdiccion text, es_norma_vigente boolean, revision_pendiente boolean not null default false, embedding vector
    );
  `);
  for (const f of FILAS) {
    await db.query(
      `insert into public.biblioteca_vectores (id, coleccion, materia, contenido, jurisdiccion, es_norma_vigente, revision_pendiente, embedding)
       values ($1, $2, $3, 'texto', $4, $5, $6, $7::float8[]::vector)`,
      [f.id, f.coleccion ?? 'col', f.materia ?? null, f.jurisdiccion, f.vigente ?? false, f.pendiente ?? false, `{${f.embedding.join(',')}}`],
    );
  }
  await db.exec(MIGRACION);
});

afterAll(async () => {
  await db.close();
});

describe('buscar_biblioteca_v3 — aislamiento por jurisdicción', () => {
  it('sin argumento de país busca solo HN', async () => {
    expect((await v3()).map((r) => r.id)).toEqual(['hn-1', 'hn-2']);
  });

  it('filtra antes del ranking: filas extranjeras más similares no desplazan a HN con límite 1', async () => {
    expect((await v3({ pais: 'HN', limite: 1 })).map((r) => r.id)).toEqual(['hn-1']);
  });

  it.each([
    ['SV', 'sv-1'],
    ['GT', 'gt-1'],
    ['CR', 'cr-1'],
    ['NI', 'ni-1'],
    ['PA', 'pa-1'],
  ])('%s devuelve solo filas de %s', async (pais, id) => {
    const filas = await v3({ pais });
    expect(filas.map((r) => r.id)).toEqual([id]);
    expect(filas.every((r) => r.jurisdiccion === pais)).toBe(true);
  });

  it('nunca devuelve filas con jurisdicción NULL ni en minúsculas', async () => {
    const todos = (await Promise.all(['HN', 'SV', 'GT', 'CR', 'NI', 'PA'].map((pais) => v3({ pais })))).flat();
    expect(todos.map((r) => r.id)).not.toContain('null-1');
    expect(todos.map((r) => r.id)).not.toContain('hn-min');
  });

  it('PE, ES e INTERNACION nunca aparecen en la búsqueda de ninguno de los seis países', async () => {
    const ids = (await Promise.all(['HN', 'SV', 'GT', 'CR', 'NI', 'PA'].map((pais) => v3({ pais })))).flat().map((r) => r.id);
    for (const id of ['pe-1', 'es-1', 'int-1']) expect(ids).not.toContain(id);
  });

  // Hoy no existe modo de derecho comparado ni de control de convencionalidad: pedirlos es un error, no una búsqueda sin filtro.
  it.each([null, '', 'hn', ' HN', 'Honduras', 'BZ', 'US', 'PE', 'ES', 'INTERNACION'])('rechaza jurisdiccion_filtro %j con error explícito', async (pais) => {
    await expect(v3({ pais })).rejects.toThrow(/jurisdiccion_filtro inválida/);
  });

  it('conserva colección, materia, vigencia y revisión pendiente', async () => {
    expect((await v3({ pais: 'HN', materia: 'PENAL' })).map((r) => r.id)).toEqual(['hn-2']);
    expect((await v3({ pais: 'HN', vigente: true })).map((r) => r.id)).toEqual(['hn-1']);
    const ids = (await v3({ pais: 'HN' })).map((r) => r.id);
    expect(ids).not.toContain('hn-pend');
    expect(ids).not.toContain('hn-otra-col');
  });

  it('respeta el límite máximo de 20', async () => {
    for (let i = 0; i < 25; i++) {
      await db.query(`insert into public.biblioteca_vectores (id, coleccion, jurisdiccion, es_norma_vigente, embedding) values ($1, 'col', 'GT', true, '{1,2}'::float8[]::vector)`, [`gt-x${i}`]);
    }
    expect(await v3({ pais: 'GT', limite: 100 })).toHaveLength(20);
  });

  it('solo service_role puede ejecutarla', async () => {
    const firma = 'public.buscar_biblioteca_v3(vector, text, text, integer, boolean, text)';
    const r = await db.query<{ anon: boolean; auth: boolean; svc: boolean }>(
      `select has_function_privilege('anon', '${firma}', 'execute') anon,
              has_function_privilege('authenticated', '${firma}', 'execute') auth,
              has_function_privilege('service_role', '${firma}', 'execute') svc`,
    );
    expect(r.rows[0]).toEqual({ anon: false, auth: false, svc: true });
  });
});

describe('migración v3 — aditiva', () => {
  it('no modifica ni elimina buscar_biblioteca_v2 ni toca datos/esquema', () => {
    const m = sinComentarios(MIGRACION);
    expect(m).not.toMatch(/buscar_biblioteca_v2/);
    expect(m).not.toMatch(/\b(insert|update|delete|truncate|alter\s+table|create\s+table|create\s+index|drop)\b/i);
  });

  it('el rollback solo elimina v3', () => {
    expect(sinComentarios(ROLLBACK).trim()).toBe('DROP FUNCTION IF EXISTS public.buscar_biblioteca_v3(vector, text, text, integer, boolean, text);');
  });
});
