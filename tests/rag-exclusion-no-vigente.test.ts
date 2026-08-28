import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { esRegistroNoVigenteExcluido, type FragmentoRAG } from '@/lib/rag/search';

/**
 * D6(b) (Operación "Facultades Completas", 2026-08-28) — exclusión real de
 * artículos de código hondureño confirmados NO vigentes de la búsqueda
 * semántica sin filtro. D6(a) solo etiquetaba; esta prueba confirma que el
 * fragmento ya no llega en absoluto al contexto que se envía al modelo.
 *
 * Pruebas obligatorias del fundador:
 *   1. Consulta de adopción NO incluye chunks 119-B/120 en el contexto.
 *   2. buscarArticuloExacto("120") NO devuelve el artículo derogado.
 */

function fragmento(overrides: Partial<FragmentoRAG>): FragmentoRAG {
  return {
    contenido: 'texto de prueba',
    num_articulo: '1',
    fuente: 'Codigo de Familia',
    relevancia: 0.9,
    fuente_tipo: 'codigo',
    jurisdiccion: 'HN',
    es_norma_vigente: true,
    ...overrides,
  };
}

describe('esRegistroNoVigenteExcluido — predicado puro', () => {
  it('true solo para codigo + HN + es_norma_vigente=false', () => {
    expect(esRegistroNoVigenteExcluido({ es_norma_vigente: false, fuente_tipo: 'codigo', jurisdiccion: 'HN' })).toBe(true);
  });
  it('false si es vigente', () => {
    expect(esRegistroNoVigenteExcluido({ es_norma_vigente: true, fuente_tipo: 'codigo', jurisdiccion: 'HN' })).toBe(false);
  });
  it('false si es de otra jurisdicción (doctrina/jurisprudencia comparada, no se excluye)', () => {
    expect(esRegistroNoVigenteExcluido({ es_norma_vigente: false, fuente_tipo: 'codigo', jurisdiccion: 'ES' })).toBe(false);
  });
  it('false si no es fuente_tipo=codigo (ej. sentencia/doctrina, ya tienen su propia etiqueta)', () => {
    expect(esRegistroNoVigenteExcluido({ es_norma_vigente: false, fuente_tipo: 'sentencia', jurisdiccion: 'HN' })).toBe(false);
  });
});

describe('buscarRAG (backend supabase) — la consulta de adopción NO incluye 119-B/120', () => {
  const RPC_FILA_119B = {
    id: 'row-119b', contenido: 'Derogado.', num_articulo: '119-B', fuente: 'Codigo de Familia',
    fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: false, similarity: 0.91,
  };
  const RPC_FILA_120 = {
    id: 'row-120', contenido: 'Derogado.', num_articulo: '120', fuente: 'Codigo de Familia',
    fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: false, similarity: 0.88,
  };
  const RPC_FILA_VIGENTE_CONTROL = {
    id: 'row-131', contenido: 'La adopción podrá ser simple o plena...', num_articulo: '131', fuente: 'Codigo de Familia',
    fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, similarity: 0.85,
  };

  let prevRagBackend: string | undefined;

  beforeEach(() => {
    vi.resetModules();
    prevRagBackend = process.env.RAG_BACKEND;
    process.env.RAG_BACKEND = 'supabase';

    vi.doMock('@/lib/supabase', () => ({
      createServerSupabaseClient: () => ({
        rpc: (_fn: string, params: { limite: number; solo_norma_vigente?: boolean }) => {
          // Llamada "normal" (sin filtro de vigencia, similitud pura,
          // limite=5) -- la que puede traer un artículo derogado con
          // similitud alta, exactamente el caso que D6(b) corrige.
          if (!params.solo_norma_vigente) {
            return Promise.resolve({ data: [RPC_FILA_119B, RPC_FILA_120, RPC_FILA_VIGENTE_CONTROL], error: null });
          }
          // Llamada paralela filtrada a solo_norma_vigente=true (limite=3).
          return Promise.resolve({ data: [RPC_FILA_VIGENTE_CONTROL], error: null });
        },
      }),
    }));
    vi.doMock('@/lib/rag/embed', () => ({
      embedQuery: async () => Array(384).fill(0.01),
    }));
  });

  afterEach(() => {
    process.env.RAG_BACKEND = prevRagBackend;
    vi.doUnmock('@/lib/supabase');
    vi.doUnmock('@/lib/rag/embed');
  });

  it('el contexto RAG para una consulta de adopción no contiene 119-B ni 120', async () => {
    const { buscarRAG, formatearContextoRAG } = await import('@/lib/rag/search');
    const resultado = await buscarRAG(
      'requisitos y procedimiento para la adopción de un menor en Honduras',
      5,
      'mayalex_normativos',
      '06_FAMILIA',
    );

    const articulosEnContexto = resultado.fragmentos.map((f) => f.num_articulo);
    expect(articulosEnContexto).not.toContain('119-B');
    expect(articulosEnContexto).not.toContain('120');
    expect(articulosEnContexto).toContain('131'); // control: el vigente real sí debe sobrevivir
    expect(resultado.articulos_encontrados).not.toContain('119-B');
    expect(resultado.articulos_encontrados).not.toContain('120');

    // Prueba end-to-end real: ni siquiera como texto plano en el contexto
    // final que se envía al modelo.
    const contexto = formatearContextoRAG(resultado);
    expect(contexto).not.toContain('row-119b');
    expect(contexto).not.toMatch(/Art\. 119-B/);
    expect(contexto).not.toMatch(/Art\. 120[^-\d]/); // "120" pero no "120-A" etc. de otra prueba
  });
});

describe('buscarArticuloExacto("120") — no devuelve el artículo derogado', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock('@/lib/supabase');
  });

  it('la consulta exige es_norma_vigente=true -- un mock que simula el filtro real de Supabase devuelve 0 filas', async () => {
    const eqCalls: Array<[string, unknown]> = [];
    vi.doMock('@/lib/supabase', () => ({
      createServerSupabaseClient: () => ({
        from: () => {
          const chain: any = {
            select: () => chain,
            eq: (campo: string, valor: unknown) => {
              eqCalls.push([campo, valor]);
              return chain;
            },
            // Awaitable: simula lo que Supabase real devolvería -- 0 filas,
            // porque el Art. 120 real en la tabla tiene es_norma_vigente=false
            // y el filtro .eq('es_norma_vigente', true) ya lo excluyó del
            // lado del servidor antes de llegar aquí.
            then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null }),
          };
          return chain;
        },
      }),
    }));

    const { buscarArticuloExacto } = await import('@/lib/rag/search');
    const resultado = await buscarArticuloExacto('120', '06_FAMILIA', 'CODIGO_FAMILIA' as any);

    expect(resultado.fragmentos).toHaveLength(0);
    expect(resultado.ambiguo).toBe(false);
    // Confirma que la consulta SÍ pidió es_norma_vigente=true -- no que
    // el mock "adivinó" devolver vacío por casualidad.
    expect(eqCalls).toContainEqual(['es_norma_vigente', true]);
    expect(eqCalls).toContainEqual(['num_articulo', '120']);
    expect(eqCalls).toContainEqual(['fuente_tipo', 'codigo']);
  });
});
