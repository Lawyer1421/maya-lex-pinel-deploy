import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * GAP 2 (Operación "Facultades Completas", 2026-08-28) fue REEMPLAZADO por la decisión CLO del 28-oct-2026 (Anexo 2.2): se eliminó el segundo
 * paso con es_norma_vigente=false de buscarArticuloExacto. Ninguna fila FALSE produce EXACT_SUCCESS: FALSE significa «excluida».
 * Siguen vigentes las reglas que no chocan: con fila vigente solo se consulta una vez; las etiquetas [NO VIGENTE — NO CITAR COMO NORMA]
 * de formatearContextoRAG para cualquier fragmento FALSE que llegue por otra vía; los tres filtros de resolverArticuloExacto.
 */

function filaDerogada(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'stub-123-a',
    contenido: 'ARTICULO 123-A.- Derogado mediante Decreto 102-2018 del 25 de septiembre de 2018. Publicado en el Diario Oficial La Gaceta No.34,841 de fecha 10 de enero de 2019.',
    num_articulo: '123-A',
    fuente: 'Codigo de Familia',
    fuente_tipo: 'codigo',
    jurisdiccion: 'HN',
    es_norma_vigente: false,
    materia: '06_FAMILIA',
    ...overrides,
  };
}

function mockSupabaseSecuencial(filasVigentes: unknown[], filasNoVigentes: unknown[]) {
  const eqCallsPorConsulta: Array<Array<[string, unknown]>> = [];
  const from = () => {
    const eqCalls: Array<[string, unknown]> = [];
    eqCallsPorConsulta.push(eqCalls);
    const chain: any = {
      select: () => chain,
      eq: (campo: string, valor: unknown) => {
        eqCalls.push([campo, valor]);
        return chain;
      },
      then: (resolve: (v: { data: unknown[]; error: null }) => void) => {
        const pideVigente = eqCalls.some(([c, v]) => c === 'es_norma_vigente' && v === true);
        resolve({ data: pideVigente ? filasVigentes : filasNoVigentes, error: null });
      },
    };
    return chain;
  };
  return { createServerSupabaseClient: () => ({ from }), eqCallsPorConsulta };
}

describe('buscarArticuloExacto — sin segundo paso con es_norma_vigente=false (CLO 28-oct-2026, Anexo 2.2)', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.doUnmock('@/lib/supabase');
  });

  it('123-A sin fila vigente y con fila derogada (FALSE): NO se devuelve; una sola consulta, solo vigentes', async () => {
    const mock = mockSupabaseSecuencial([], [filaDerogada()]);
    vi.doMock('@/lib/supabase', () => mock);

    const { buscarArticuloExacto } = await import('@/lib/rag/search');
    const r = await buscarArticuloExacto('123-A', '06_FAMILIA', 'CODIGO_FAMILIA' as any);

    expect(r.ambiguo).toBe(false);
    expect(r.fragmentos).toHaveLength(0);
    expect(mock.eqCallsPorConsulta).toHaveLength(1);
    expect(mock.eqCallsPorConsulta[0]).toContainEqual(['es_norma_vigente', true]);
    for (const calls of mock.eqCallsPorConsulta) expect(calls).not.toContainEqual(['es_norma_vigente', false]);
  });

  it('ninguna fila FALSE produce EXACT_SUCCESS por buscarRAG', async () => {
    process.env.RAG_BACKEND = 'supabase';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';
    const mock = mockSupabaseSecuencial([], [filaDerogada()]);
    vi.doMock('@/lib/supabase', () => mock);
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));
    const { buscarRAG } = await import('@/lib/rag/search');
    const r = await buscarRAG('Artículo 123-A del Código de Familia', 5, 'mayalex_normativos');
    expect(r.outcome?.state).not.toBe('EXACT_SUCCESS');
    expect(r.outcome?.evidenceCount ?? 0).toBe(0);
    vi.doUnmock('@/lib/rag/embed');
  });

  it('un fragmento FALSE que llegue por otra vía recibe [NO VIGENTE — NO CITAR COMO NORMA] y nunca es PRIMARY', async () => {
    const { resolverArticuloExacto, formatearContextoRAG } = await import('@/lib/rag/search');
    const r = resolverArticuloExacto([filaDerogada()] as any, '123-A', 'CODIGO_FAMILIA' as any);
    expect(r.fragmentos).toHaveLength(1);
    expect(r.fragmentos[0].rol_evidencia).toBe('CONTEXT');
    expect(r.fragmentos[0].bloqueos_clo).toContain('VIGENCIA_FALSE_EXCLUIDA');
    const ctx = formatearContextoRAG({ fragmentos: r.fragmentos, articulos_encontrados: ['123-A'], backend: 'supabase' });
    expect(ctx).toContain('[NO VIGENTE — NO CITAR COMO NORMA]');
  });

  it('si SÍ hay fila vigente, solo se hace UNA consulta y se devuelve la vigente', async () => {
    const filaVigente = {
      id: 'real', contenido: 'ARTICULO 5.- Texto vigente real.', num_articulo: '5',
      fuente: 'Codigo de Familia', fuente_tipo: 'codigo', jurisdiccion: 'HN',
      es_norma_vigente: true, materia: '06_FAMILIA',
    };
    const mock = mockSupabaseSecuencial([filaVigente], [filaDerogada({ num_articulo: '5' })]);
    vi.doMock('@/lib/supabase', () => mock);

    const { buscarArticuloExacto } = await import('@/lib/rag/search');
    const r = await buscarArticuloExacto('5', '06_FAMILIA', 'CODIGO_FAMILIA' as any);

    expect(r.fragmentos).toHaveLength(1);
    expect(r.fragmentos[0].es_norma_vigente).toBe(true);
    expect(mock.eqCallsPorConsulta).toHaveLength(1);
  });

  it('sin fila vigente NI derogada -> no encontrado, una sola consulta', async () => {
    const mock = mockSupabaseSecuencial([], []);
    vi.doMock('@/lib/supabase', () => mock);

    const { buscarArticuloExacto } = await import('@/lib/rag/search');
    const r = await buscarArticuloExacto('999', '06_FAMILIA', 'CODIGO_FAMILIA' as any);

    expect(r.fragmentos).toHaveLength(0);
    expect(r.ambiguo).toBe(false);
    expect(mock.eqCallsPorConsulta).toHaveLength(1);
  });
});
