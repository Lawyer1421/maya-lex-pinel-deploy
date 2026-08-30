import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * GAP 2 (Operación "Facultades Completas", 2026-08-28) — cuando no hay
 * artículo vigente con ese número, buscarArticuloExacto intenta un segundo
 * paso: solo artículos CONFIRMADOS no vigentes (derogados), reutilizando
 * exactamente los mismos tres filtros de seguridad de resolverArticuloExacto
 * (anonimización, encabezado real, identidad de instrumento) -- ninguno se
 * relaja. Nunca se presenta como vigente: construirCitas() y
 * formatearContextoRAG() ya protegen esto (D6a-bis, D6b), sin cambios aquí.
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

describe('buscarArticuloExacto — fallback a no-vigente (GAP 2)', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.doUnmock('@/lib/supabase');
  });

  it('123-A sin fila vigente pero con fila derogada confirmada -> devuelve la fila derogada', async () => {
    const mock = mockSupabaseSecuencial([], [filaDerogada()]);
    vi.doMock('@/lib/supabase', () => mock);

    const { buscarArticuloExacto } = await import('@/lib/rag/search');
    const r = await buscarArticuloExacto('123-A', '06_FAMILIA', 'CODIGO_FAMILIA' as any);

    expect(r.ambiguo).toBe(false);
    expect(r.fragmentos).toHaveLength(1);
    expect(r.fragmentos[0].num_articulo).toBe('123-A');
    expect(r.fragmentos[0].es_norma_vigente).toBe(false);
  });

  it('123-B misma prueba', async () => {
    const filaB = filaDerogada({
      id: 'stub-123-b',
      num_articulo: '123-B',
      contenido: 'ARTICULO 123-B.- Derogado mediante Decreto 102-2018 del 25 de septiembre de 2018. Publicado en el Diario Oficial La Gaceta No.34,841 de fecha 10 de enero de 2019.',
    });
    const mock = mockSupabaseSecuencial([], [filaB]);
    vi.doMock('@/lib/supabase', () => mock);

    const { buscarArticuloExacto } = await import('@/lib/rag/search');
    const r = await buscarArticuloExacto('123-B', '06_FAMILIA', 'CODIGO_FAMILIA' as any);

    expect(r.fragmentos).toHaveLength(1);
    expect(r.fragmentos[0].num_articulo).toBe('123-B');
  });

  it('el resultado derogado, al pasar por formatearContextoRAG, recibe [NO VIGENTE — NO CITAR COMO NORMA]', async () => {
    const mock = mockSupabaseSecuencial([], [filaDerogada()]);
    vi.doMock('@/lib/supabase', () => mock);

    const { buscarArticuloExacto, formatearContextoRAG } = await import('@/lib/rag/search');
    const r = await buscarArticuloExacto('123-A', '06_FAMILIA', 'CODIGO_FAMILIA' as any);
    const ctx = formatearContextoRAG({ fragmentos: r.fragmentos, articulos_encontrados: ['123-A'], backend: 'supabase' });

    expect(ctx).toContain('[NO VIGENTE — NO CITAR COMO NORMA]');
  });

  it('si SÍ hay fila vigente, nunca se llega al fallback -- se ignora cualquier fila derogada aunque exista', async () => {
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
    // Solo se hizo UNA consulta (la vigente) -- el fallback nunca se disparó.
    expect(mock.eqCallsPorConsulta).toHaveLength(1);
  });

  it('sin fila vigente NI derogada -> no encontrado, ambos caminos intentados', async () => {
    const mock = mockSupabaseSecuencial([], []);
    vi.doMock('@/lib/supabase', () => mock);

    const { buscarArticuloExacto } = await import('@/lib/rag/search');
    const r = await buscarArticuloExacto('999', '06_FAMILIA', 'CODIGO_FAMILIA' as any);

    expect(r.fragmentos).toHaveLength(0);
    expect(r.ambiguo).toBe(false);
    expect(mock.eqCallsPorConsulta).toHaveLength(2); // intentó vigente, luego no-vigente
  });

  it('una fila derogada SIN el encabezado real ("Artículo derogado" genérico) es rechazada -- mismo filtro de calidad de siempre', async () => {
    const filaMalFormada = filaDerogada({ contenido: 'Artículo derogado' }); // sin "ARTICULO 123-A.-"
    const mock = mockSupabaseSecuencial([], [filaMalFormada]);
    vi.doMock('@/lib/supabase', () => mock);

    const { buscarArticuloExacto } = await import('@/lib/rag/search');
    const r = await buscarArticuloExacto('123-A', '06_FAMILIA', 'CODIGO_FAMILIA' as any);

    expect(r.fragmentos).toHaveLength(0);
  });
});
