import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Cobertura exacta parcial en comparaciones (ruta Supabase), guardarraíl del
 * artículo inexistente y lenguaje genérico de la clase "ley".
 * Sin red: Supabase y el embedding están mockeados.
 */

const FUENTE_PENAL = 'Codigo Penal';
const FUENTE_COMERCIO = 'Codigo de Comercio (Decreto No. 73-1950, Congreso Nacional de Honduras)';
const FUENTE_CODIGO = 'Código del Notariado de Honduras (Decreto 353-2005)';
const FUENTE_REGLAMENTO = 'Reglamento del Código del Notariado (Resolución PCSJ-17-2012)';

const ORIGINAL_ENV = { ...process.env };

const filaPenal173 = {
  id: 'penal-173',
  contenido: 'ARTICULO 173.- Medidas cautelares del Código Penal.',
  num_articulo: '173',
  fuente: FUENTE_PENAL,
  fuente_tipo: 'codigo',
  jurisdiccion: 'HN',
  es_norma_vigente: true,
  materia: '01_PENAL',
  metadata: null,
};

const filaComercioRPC = {
  id: 'comercio-173',
  contenido: 'Artículo 173. Texto del Código de Comercio.',
  num_articulo: '173',
  fuente: FUENTE_COMERCIO,
  fuente_tipo: 'codigo',
  jurisdiccion: 'HN',
  es_norma_vigente: true,
  similarity: 0.8,
};

const filaPenalRPC = { ...filaPenal173, id: 'penal-173-rpc', similarity: 0.9 };

/** Cliente con tabla (búsqueda exacta) y RPC (semántica). */
function mockearCliente(filasExactas: unknown[], filasRPC: unknown[]) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: filasExactas, error: null }),
  };
  vi.doMock('@/lib/supabase', () => ({
    createServerSupabaseClient: () => ({
      from: vi.fn(() => chain),
      rpc: vi.fn(async () => ({ data: filasRPC, error: null })),
    }),
  }));
  const embedQueryMock = vi.fn().mockResolvedValue(new Array(384).fill(0.01));
  vi.doMock('@/lib/rag/embed', () => ({ embedQuery: embedQueryMock }));
  return { embedQueryMock };
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

describe('comparación exacta parcial → semántica con cobertura final', () => {
  const CONSULTA = 'Artículo 173 del Código Penal y del Código de Comercio';

  it('cobertura semántica completa: la evidencia exacta parcial se combina y ambos instrumentos quedan', async () => {
    const { embedQueryMock } = mockearCliente([filaPenal173], [filaComercioRPC]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG(CONSULTA, 5, 'mayalex_normativos');

    expect(embedQueryMock).toHaveBeenCalled();
    expect(resultado.fragmentos.map((f) => f.fuente).sort()).toEqual([FUENTE_COMERCIO, FUENTE_PENAL].sort());
    expect(resultado.outcome?.state).toBe('SEMANTIC_SUCCESS');
  });

  it('cobertura semántica incompleta: sin evidencia de Comercio no hay respuesta completa', async () => {
    mockearCliente([filaPenal173], [filaPenalRPC]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG(CONSULTA, 5, 'mayalex_normativos');

    expect(resultado.fragmentos).toHaveLength(0);
    expect(resultado.outcome?.state).toBe('OFFICIAL_FALLBACK_REQUIRED');
  });
});

describe('guardarraíl del artículo inexistente (sin cambio)', () => {
  it('Art. 9999 CPP: abstención sin búsqueda semántica', async () => {
    const { embedQueryMock } = mockearCliente([], []);
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG('Cita el artículo 9999 del Código Procesal Penal de Honduras', 5, 'mayalex_normativos');

    expect(resultado.fragmentos).toHaveLength(0);
    expect(resultado.outcome?.state).toBe('NO_VERIFIED_EVIDENCE');
    expect(embedQueryMock).not.toHaveBeenCalled();
  });

  it('artículo inexistente en una comparación: abstención, no semántica', async () => {
    const { embedQueryMock } = mockearCliente([], [filaComercioRPC]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG('Artículo 9999 del Código Penal y del Código de Comercio', 5, 'mayalex_normativos');

    expect(resultado.fragmentos).toHaveLength(0);
    expect(resultado.outcome?.state).toBe('NO_VERIFIED_EVIDENCE');
    expect(embedQueryMock).not.toHaveBeenCalled();
  });

  it('exacta completa en un solo instrumento: EXACT_SUCCESS sin semántica (regresión)', async () => {
    const { embedQueryMock } = mockearCliente([filaPenal173], []);
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG('Artículo 173 del Código Penal', 5, 'mayalex_normativos');

    expect(resultado.fragmentos.map((f) => f.fuente)).toEqual([FUENTE_PENAL]);
    expect(resultado.outcome?.state).toBe('EXACT_SUCCESS');
    expect(embedQueryMock).not.toHaveBeenCalled();
  });
});

describe('lenguaje genérico "ley" (NONE) y referencias específicas (Supabase)', () => {
  it('"ley hondureña aplicable": NONE, la semántica conserva su comportamiento previo', async () => {
    mockearCliente([], [filaRPCCodigo(), filaRPCReglamento()]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG('Conforme a la ley hondureña aplicable, ¿qué procede?', 5, 'mayalex_normativos');

    expect(resultado.fragmentos.map((f) => f.fuente).sort()).toEqual([FUENTE_CODIGO, FUENTE_REGLAMENTO].sort());
    // CLO 28-oct-2026 (Anexo 2.5): la RPC semántica no devuelve materia; un instrumento notarial sin materia verificada es solo CONTEXT.
    expect(resultado.outcome?.state).toBe('OFFICIAL_FALLBACK_REQUIRED');
  });

  it('"ley notarial hondureña": referencia específica, fail-close', async () => {
    mockearCliente([], [filaRPCCodigo(), filaRPCReglamento()]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG('Según la ley notarial hondureña, ¿qué procede?', 5, 'mayalex_normativos');

    expect(resultado.fragmentos).toHaveLength(0);
    expect(resultado.outcome?.state).toBe('OFFICIAL_FALLBACK_REQUIRED');
  });
});

function filaRPCCodigo() {
  return { id: 'codigo-n', contenido: 'Artículo 9. Texto del Código del Notariado.', num_articulo: '9', fuente: FUENTE_CODIGO, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '03_NOTARIAL', similarity: 0.9 };
}

function filaRPCReglamento() {
  return { id: 'reglamento-n', contenido: 'Artículo 9. Texto del Reglamento.', num_articulo: '9', fuente: FUENTE_REGLAMENTO, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '03_NOTARIAL', similarity: 0.8 };
}
