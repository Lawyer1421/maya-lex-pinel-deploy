import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FilaExactaDB } from '@/lib/legal-retrieval/exact-resolver';
import { esFuenteDocumentalExcluida } from '@/lib/legal-retrieval/semantic-retriever';
import { resolverArticuloExacto } from '@/lib/legal-retrieval/exact-resolver';

/**
 * P1 contención semántica de capa doc_* (E7, EXCLUDED_BY_TYPE).
 *
 * El predicado canónico es `fuente LIKE 'doc_%'` (docs/corpus/hygiene-identity-queries.sql).
 * buscar_biblioteca_v2 no lo aplica (migración 20260925055249), así que la
 * exclusión vive en buscarEnSupabase, antes de la selección final.
 *
 * Limitación conocida, NO resuelta aquí: la RPC devuelve su top-20 SQL sin
 * prefiltro de capa; los doc_* que entran a ese top reducen la recuperación
 * semántica (KNOWN_LIMITATION_SQL_PREFILTER_PENDING).
 */

const ORIGINAL_ENV = { ...process.env };

function fakeSupabaseConFilasRPC(filas: unknown[]) {
  return {
    rpc: vi.fn(async () => ({ data: filas, error: null })),
  };
}

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  process.env.RAG_BACKEND = 'supabase';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

const CONSULTA_SEMANTICA = '¿Cuáles son los requisitos para adoptar en Honduras?';

const docStar = {
  id: 'mayalex_instrumentos:doc_9f2a_p00_c001',
  contenido: 'Documento de la capa doc_ con alta similitud por embedding.',
  num_articulo: null,
  fuente: 'doc_9f2a',
  fuente_tipo: 'instrumento',
  jurisdiccion: 'HN',
  es_norma_vigente: true,
  similarity: 0.97,
};

const codigoVerificado = {
  id: 'familia-119',
  contenido: 'Artículo 119. La adopción es una institución jurídica de protección.',
  num_articulo: '119',
  fuente: 'Codigo de Familia',
  fuente_tipo: 'codigo',
  jurisdiccion: 'HN',
  es_norma_vigente: true,
  similarity: 0.9,
};

const huerfanoFuenteNull = {
  id: 'huerfano-1',
  contenido: 'Fragmento legacy sin fuente verificable, relevante por similitud.',
  num_articulo: null,
  fuente: null,
  fuente_tipo: null,
  jurisdiccion: null,
  es_norma_vigente: false,
  similarity: 0.95,
};

const codigoDerogadoHN = {
  id: 'familia-120',
  contenido: 'Artículo 120. Derogado mediante Decreto 102-2018.',
  num_articulo: '120',
  fuente: 'Codigo de Familia',
  fuente_tipo: 'codigo',
  jurisdiccion: 'HN',
  es_norma_vigente: false,
  similarity: 0.93,
};

const sentenciaComparada = {
  id: 'sentencia-es-1',
  contenido: 'STS 123/2020 — doctrina comparada sobre adopción internacional.',
  num_articulo: null,
  fuente: 'Tribunal Supremo de España',
  fuente_tipo: 'sentencia',
  jurisdiccion: 'ES',
  es_norma_vigente: false,
  similarity: 0.88,
};

function mockearDependencias(filas: unknown[]) {
  vi.doMock('@/lib/supabase', () => ({
    createServerSupabaseClient: () => fakeSupabaseConFilasRPC(filas),
  }));
  vi.doMock('@/lib/rag/embed', () => ({
    embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)),
  }));
}

describe('esFuenteDocumentalExcluida — predicado canónico fuente LIKE \'doc_%\'', () => {
  it('excluye fuentes con prefijo doc_ (caso canónico)', () => {
    expect(esFuenteDocumentalExcluida('doc_9f2a')).toBe(true);
  });

  it('no excluye fuentes normativas ni nulas', () => {
    expect(esFuenteDocumentalExcluida('Codigo de Familia')).toBe(false);
    expect(esFuenteDocumentalExcluida('Código Procesal Penal de Honduras (Decreto 9-99-E)')).toBe(false);
    expect(esFuenteDocumentalExcluida(null)).toBe(false);
  });

  it('replica LIKE: "doc" sin carácter siguiente no coincide, cualquier cadena doc+caracter sí', () => {
    expect(esFuenteDocumentalExcluida('doc')).toBe(false);
    expect(esFuenteDocumentalExcluida('docu')).toBe(true);
  });

  it('es sensible a mayúsculas, igual que LIKE en PostgreSQL', () => {
    expect(esFuenteDocumentalExcluida('DOC_9f2a')).toBe(false);
  });
});

describe('buscarRAG (ruta semántica) — contención doc_*', () => {
  it('un candidato doc_* con alta similitud es excluido y nunca llega al resultado', async () => {
    mockearDependencias([docStar, codigoVerificado]);
    const { buscarRAG, formatearContextoRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG(CONSULTA_SEMANTICA, 5, 'mayalex_normativos');

    const ids = resultado.fragmentos.map((f) => f.id);
    expect(ids).not.toContain(docStar.id);
    expect(formatearContextoRAG(resultado)).not.toContain('capa doc_ con alta similitud');
  });

  it('un fragmento de código verificado vigente permanece en el resultado', async () => {
    mockearDependencias([docStar, codigoVerificado]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG(CONSULTA_SEMANTICA, 5, 'mayalex_normativos');

    expect(resultado.fragmentos.map((f) => f.id)).toContain(codigoVerificado.id);
  });

  it('fuente=NULL sigue excluido', async () => {
    mockearDependencias([huerfanoFuenteNull, codigoVerificado]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG(CONSULTA_SEMANTICA, 5, 'mayalex_normativos');

    expect(resultado.fragmentos.map((f) => f.id)).not.toContain(huerfanoFuenteNull.id);
  });

  it('código HN no vigente (D6b) sigue excluido', async () => {
    mockearDependencias([codigoDerogadoHN]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG(CONSULTA_SEMANTICA, 5, 'mayalex_normativos');

    expect(resultado.fragmentos).toHaveLength(0);
  });

  it('conjunto mixto: sólo sobrevive la evidencia elegible', async () => {
    mockearDependencias([docStar, huerfanoFuenteNull, codigoDerogadoHN, codigoVerificado, sentenciaComparada]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG(CONSULTA_SEMANTICA, 5, 'mayalex_normativos');

    expect(resultado.fragmentos.map((f) => f.id).sort()).toEqual(
      [codigoVerificado.id, sentenciaComparada.id].sort(),
    );
  });

  it('KNOWN_LIMITATION_SQL_PREFILTER_PENDING: doc_* dentro del top-20 de la RPC reduce la recuperación', async () => {
    const dieciochoDocStar = Array.from({ length: 18 }, (_, i) => ({
      ...docStar,
      id: `mayalex_instrumentos:doc_${i}`,
      fuente: `doc_${i}`,
      similarity: 0.99 - i * 0.001,
    }));
    const dosElegibles = [codigoVerificado, sentenciaComparada];
    mockearDependencias([...dieciochoDocStar, ...dosElegibles]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG(CONSULTA_SEMANTICA, 5, 'mayalex_normativos');

    expect(resultado.fragmentos).toHaveLength(2);
    expect(resultado.fragmentos.some((f) => f.fuente.startsWith('doc_'))).toBe(false);
  });
});

describe('resolverArticuloExacto — sin cambios para doc_*', () => {
  it('una fila doc_* sin identidad documental del instrumento nunca se acepta por número de artículo', () => {
    const filaDocStar: FilaExactaDB = {
      id: 'mayalex_instrumentos:doc_9f2a_p00_c001',
      contenido: 'ARTICULO 173.- Texto que coincide en número pero no en identidad.',
      num_articulo: '173',
      fuente: 'doc_9f2a',
      fuente_tipo: 'instrumento',
      jurisdiccion: 'HN',
      es_norma_vigente: true,
      materia: '01_PENAL',
      metadata: {},
    } as FilaExactaDB;

    const r = resolverArticuloExacto([filaDocStar], '173', 'CODIGO_PROCESAL_PENAL');

    expect(r.fragmentos).toHaveLength(0);
    expect(r.ambiguo).toBe(false);
  });
});
