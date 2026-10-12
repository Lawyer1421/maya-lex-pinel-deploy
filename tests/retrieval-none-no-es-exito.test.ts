import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * NONE no garantiza SEMANTIC_SUCCESS: sólo quita el filtro de instrumento. Si no
 * hay evidencia elegible, el resultado es abstención. Un título genérico de otro
 * tipo ("código de ética", "reglamento de la empresa") sigue específico no resuelto
 * y no se recupera por similitud.
 */

const FUENTE_CIVIL = 'Código Civil de Honduras (Decreto del Poder Ejecutivo del 8 de febrero de 1906)';
const ORIGINAL_ENV = { ...process.env };

const filaCivil = {
  id: 'civil-arrendamiento',
  contenido: 'Artículo 1. El arrendamiento es un contrato por el que una parte concede el uso de una cosa.',
  num_articulo: '1', fuente: FUENTE_CIVIL, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true,
  materia: '02_CIVIL', similarity: 0.9,
};

function mockearRPC(filas: unknown[]) {
  const rpc = vi.fn(async () => ({ data: filas, error: null }));
  vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => ({ rpc }) }));
  vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));
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

describe('NONE no garantiza SEMANTIC_SUCCESS', () => {
  it('consulta temática sin evidencia elegible: abstención, aunque intención sea NONE', async () => {
    mockearRPC([]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const r = await buscarRAG('arrendamiento ley civil', 5, 'mayalex_normativos');

    expect(r.intencionInstrumental).toBe('NONE');
    expect(r.fragmentos).toHaveLength(0);
    expect(r.outcome?.state).toBe('OFFICIAL_FALLBACK_REQUIRED');
  });

  it('consulta temática con evidencia elegible: SEMANTIC_SUCCESS con la evidencia pertinente', async () => {
    mockearRPC([filaCivil]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const r = await buscarRAG('arrendamiento ley civil', 5, 'mayalex_normativos');

    expect(r.intencionInstrumental).toBe('NONE');
    expect(r.fragmentos.map((f) => f.id)).toEqual(['civil-arrendamiento']);
    expect(r.outcome?.state).toBe('SEMANTIC_SUCCESS');
  });
});

describe('título genérico de otro tipo no se recupera por similitud', () => {
  it.each([
    '¿Qué establece el código de ética?',
    'Según el reglamento de la empresa, ¿qué procede?',
  ])('%s → abstención aunque haya candidatos disponibles', async (consulta) => {
    mockearRPC([filaCivil]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const r = await buscarRAG(consulta, 5, 'mayalex_normativos');

    expect(r.intencionInstrumental).toBe('SPECIFIC_UNRESOLVED');
    expect(r.fragmentos).toHaveLength(0);
    expect(r.outcome?.state).toBe('OFFICIAL_FALLBACK_REQUIRED');
  });
});

describe('propagación de intencionInstrumental en la ruta exacta', () => {
  it('EXACT_SUCCESS lleva intencionInstrumental SPECIFIC_RESOLVED', async () => {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({
        data: [{
          id: 'civil-1', contenido: 'ARTICULO 1.- Texto del Código Civil.', num_articulo: '1',
          fuente: FUENTE_CIVIL, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '02_CIVIL', metadata: null,
        }],
        error: null,
      }),
    };
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => ({ from: vi.fn(() => chain) }) }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));
    const { buscarRAG } = await import('@/lib/rag/search');

    const r = await buscarRAG('Artículo 1 del Código Civil', 5, 'mayalex_normativos');

    expect(r.outcome?.state).toBe('EXACT_SUCCESS');
    expect(r.intencionInstrumental).toBe('SPECIFIC_RESOLVED');
  });
});
