import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * 2026-08-28 — Filtro duro de trazabilidad/vigencia en buscarEnSupabase().
 *
 * Hallazgo real: la ruta semántica "normal" de buscarEnSupabase() llama a
 * buscar_biblioteca_v2 SIN solo_norma_vigente=true, así que cualquier fila
 * podía llegar al contexto del prompt por similitud pura -- incluidas filas
 * sin fuente (huérfanas del corpus legacy, ver DECISION_LOG.md 2026-08-28
 * "QUINTO UPDATE", 8,366 filas puestas en es_norma_vigente=false) o
 * artículos de código hondureño confirmados derogados. formatearContextoRAG()
 * no les ponía ninguna etiqueta de advertencia en ese caso concreto
 * (etiqueta=null), así que llegaban al modelo como texto sin marcar.
 *
 * Nota de precisión: un reporte previo describía esto como un fallo de una
 * función "esRegistroNoVigenteExcluido" -- esa función NUNCA existió en
 * este archivo (verificado con grep antes de este fix). El mecanismo real
 * era la ausencia total de filtro en la ruta "normal", documentado arriba.
 *
 * El filtro agregado es deliberadamente MÁS ANGOSTO que "solo
 * es_norma_vigente=true": excluye huérfanas (fuente=null) y código
 * hondureño confirmado derogado (fuente_tipo='codigo' + es_norma_vigente
 * false), pero preserva jurisprudencia/doctrina comparada (fuente_tipo
 * 'sentencia'/'doctrina', es_norma_vigente false/NULL por diseño -- no es
 * norma hondureña vigente, pero sigue siendo contexto legítimo y ya
 * etiquetado como tal). Tampoco excluye código con es_norma_vigente=NULL
 * (deuda de clasificación aparte, no derogación confirmada).
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

// Consulta sin número de artículo detectable -> buscarRAG cae directo a la
// ruta semántica (buscarEnSupabase), no a la búsqueda exacta.
const CONSULTA_SEMANTICA = '¿Cuáles son los requisitos para adoptar en Honduras?';

describe('buscarRAG (ruta semántica) — filtro duro fuente=null / código derogado', () => {
  it('un chunk huérfano (fuente=null) que hace match por similitud es descartado al 100%, nunca llega al resultado', async () => {
    const chunkHuerfano = {
      id: 'huerfano-1',
      contenido: 'Fragmento del corpus legacy sin fuente verificable, relevante por similitud.',
      num_articulo: null,
      fuente: null,
      fuente_tipo: null,
      jurisdiccion: null,
      es_norma_vigente: false, // ya aislado por el QUINTO UPDATE
      similarity: 0.95, // alta relevancia -- el filtro debe excluirlo igual
    };
    const chunkLegitimo = {
      id: 'familia-119',
      contenido: 'Artículo 119. La adopción es una institución jurídica de protección.',
      num_articulo: '119',
      fuente: 'Codigo de Familia',
      fuente_tipo: 'codigo',
      jurisdiccion: 'HN',
      es_norma_vigente: true,
      similarity: 0.9,
    };

    vi.doMock('@/lib/supabase', () => ({
      createServerSupabaseClient: () => fakeSupabaseConFilasRPC([chunkHuerfano, chunkLegitimo]),
    }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));

    const { buscarRAG, formatearContextoRAG } = await import('@/lib/rag/search');
    const resultado = await buscarRAG(CONSULTA_SEMANTICA, 5, 'mayalex_normativos');

    const ids = resultado.fragmentos.map((f) => f.id);
    expect(ids).not.toContain('huerfano-1');
    expect(ids).toContain('familia-119');

    // Verificación explícita de que jamás llega al prompt: el texto
    // construido para el system prompt no debe contener el contenido del
    // chunk huérfano en ninguna forma.
    const contexto = formatearContextoRAG(resultado);
    expect(contexto).not.toContain('corpus legacy sin fuente verificable');
  });

  it('un artículo de código hondureño confirmado derogado (fuente real, es_norma_vigente=false) también se descarta', async () => {
    const articuloDerogado = {
      id: 'familia-120',
      contenido: 'Artículo 120. Derogado mediante Decreto 102-2018.',
      num_articulo: '120',
      fuente: 'Codigo de Familia',
      fuente_tipo: 'codigo',
      jurisdiccion: 'HN',
      es_norma_vigente: false,
      similarity: 0.93,
    };

    vi.doMock('@/lib/supabase', () => ({
      createServerSupabaseClient: () => fakeSupabaseConFilasRPC([articuloDerogado]),
    }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));

    const { buscarRAG } = await import('@/lib/rag/search');
    const resultado = await buscarRAG(CONSULTA_SEMANTICA, 5, 'mayalex_normativos');

    expect(resultado.fragmentos).toHaveLength(0);
  });

  it('regresión: jurisprudencia/doctrina comparada (es_norma_vigente=false por diseño, fuente real) NO se excluye', async () => {
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

    vi.doMock('@/lib/supabase', () => ({
      createServerSupabaseClient: () => fakeSupabaseConFilasRPC([sentenciaComparada]),
    }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));

    const { buscarRAG } = await import('@/lib/rag/search');
    const resultado = await buscarRAG(CONSULTA_SEMANTICA, 5, 'mayalex_normativos');

    const ids = resultado.fragmentos.map((f) => f.id);
    expect(ids).toContain('sentencia-es-1');
  });

  it('regresión: código con es_norma_vigente=NULL (sin clasificar, no derogación confirmada) NO se excluye', async () => {
    const codigoSinClasificar = {
      id: 'cpc-sin-clasificar',
      contenido: 'Artículo 500 CPC — pendiente de clasificación de vigencia.',
      num_articulo: '500',
      fuente: 'CPC_TEXTO_BASE_D211-2006',
      fuente_tipo: 'codigo',
      jurisdiccion: 'HN',
      es_norma_vigente: null,
      similarity: 0.91,
    };

    vi.doMock('@/lib/supabase', () => ({
      createServerSupabaseClient: () => fakeSupabaseConFilasRPC([codigoSinClasificar]),
    }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));

    const { buscarRAG } = await import('@/lib/rag/search');
    const resultado = await buscarRAG(CONSULTA_SEMANTICA, 5, 'mayalex_normativos');

    const ids = resultado.fragmentos.map((f) => f.id);
    expect(ids).toContain('cpc-sin-clasificar');
  });
});
