import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  clasificarIntencionInstrumental,
  evidenciaFinal,
  evidenciaProcedimentalPermitida,
} from '@/lib/legal-retrieval/instrument-gate';

/**
 * Evidencia final: cobertura y artículo se evalúan sobre lo que se envía al
 * LLM. Los mocks de Supabase respetan los filtros reales (materia_filtro,
 * solo_norma_vigente, límite y los eq de la tabla): sin eso, una exclusión por
 * materia pasaría desapercibida.
 */

const FUENTE_PENAL = 'Codigo Penal';
const FUENTE_COMERCIO = 'Codigo de Comercio (Decreto No. 73-1950, Congreso Nacional de Honduras)';
const FUENTE_CODIGO = 'Código del Notariado de Honduras (Decreto 353-2005)';
const MATERIA_PENAL = '01_PENAL';
const MATERIA_COMERCIO = '10_LEYES_REGLAMENTOS';

const frag = (id: string, fuente: string, num: string | null) => ({ id, fuente, num_articulo: num, contenido: id });

describe('evidenciaFinal — comparación con artículos concretos', () => {
  const unArticulo = clasificarIntencionInstrumental('Artículo 173 del Código Penal y del Código de Comercio');
  const variosArticulos = clasificarIntencionInstrumental('Artículo 173 del Código Penal y artículo 12 del Código de Comercio');
  const sinArticulo = clasificarIntencionInstrumental('Compara el Código Penal y el Código de Comercio');

  it('un único artículo: ambos instrumentos con ese artículo, se conservan', () => {
    const f = [frag('p', FUENTE_PENAL, '173'), frag('c', FUENTE_COMERCIO, '173')];
    expect(evidenciaFinal(f, unArticulo)).toEqual(f);
  });

  it('un fragmento de otro artículo no autoriza la comparación: abstención', () => {
    const f = [frag('p', FUENTE_PENAL, '173'), frag('c', FUENTE_COMERCIO, '12')];
    expect(evidenciaFinal(f, unArticulo)).toEqual([]);
  });

  it('varios artículos pedidos: sin correspondencia establecida, abstención', () => {
    const f = [frag('p', FUENTE_PENAL, '173'), frag('c', FUENTE_COMERCIO, '12')];
    expect(evidenciaFinal(f, variosArticulos)).toEqual([]);
  });

  it('sin artículos concretos: cobertura por identidad, sin exigir artículo', () => {
    const f = [frag('p', FUENTE_PENAL, '5'), frag('c', FUENTE_COMERCIO, '9')];
    expect(evidenciaFinal(f, sinArticulo)).toEqual(f);
  });

  it('falta un instrumento: abstención', () => {
    expect(evidenciaFinal([frag('p', FUENTE_PENAL, '173')], unArticulo)).toEqual([]);
  });

  it('NONE no cambia', () => {
    const none = clasificarIntencionInstrumental('¿Qué es la fe pública?');
    const f = [frag('x', FUENTE_CODIGO, '9')];
    expect(evidenciaFinal(f, none)).toEqual(f);
  });
});

describe('evidenciaProcedimentalPermitida — RUTA C no completa una comparación', () => {
  const comparacion = clasificarIntencionInstrumental('Código Penal y Código de Comercio');

  it('el principal cubre la comparación: el procedimental puede añadir fragmentos elegibles', () => {
    const principal = [frag('p', FUENTE_PENAL, null), frag('c', FUENTE_COMERCIO, null)];
    const proc = [frag('x', FUENTE_PENAL, null)];
    expect(evidenciaProcedimentalPermitida(principal, proc, comparacion)).toEqual(proc);
  });

  it('el principal no cubre y el procedimental tampoco: nada se añade', () => {
    const proc = [frag('x', FUENTE_PENAL, null)];
    expect(evidenciaProcedimentalPermitida([], proc, comparacion)).toEqual([]);
  });

  it('el procedimental puede completar la comparación que el principal no cubría', () => {
    const principal = [frag('p', FUENTE_PENAL, null)];
    const proc = [frag('c', FUENTE_COMERCIO, null)];
    expect(evidenciaProcedimentalPermitida(principal, proc, comparacion)).toEqual(proc);
  });

  it('sin intención instrumental: todo el procedimental pasa (comportamiento previo)', () => {
    const none = clasificarIntencionInstrumental('¿Qué es la fe pública?');
    const proc = [frag('x', FUENTE_CODIGO, '9')];
    expect(evidenciaProcedimentalPermitida([], proc, none)).toEqual(proc);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buscarRAG completo (Supabase) con mocks que aplican los filtros reales
// ─────────────────────────────────────────────────────────────────────────────

const ORIGINAL_ENV = { ...process.env };

type Fila = Record<string, unknown>;

/** true si la fila cumple cada eq; las columnas que la fila no tiene no filtran. */
function cumpleEq(fila: Fila, filtros: [string, unknown][]): boolean {
  return filtros.every(([col, val]) => !(col in fila) || fila[col] === val);
}

/**
 * Cliente con tabla (búsqueda exacta, filtros eq encadenados) y RPC
 * buscar_biblioteca_v2 (materia_filtro, solo_norma_vigente, límite).
 */
function mockearCliente(tabla: Fila[], rpcFilas: Fila[]) {
  const nuevaConsulta = () => {
    const filtros: [string, unknown][] = [];
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn((col: string, val: unknown) => {
        filtros.push([col, val]);
        return chain;
      }),
      then: (resolve: (v: { data: Fila[]; error: null }) => void) =>
        resolve({ data: tabla.filter((f) => cumpleEq(f, filtros)), error: null }),
    };
    return chain;
  };
  const rpc = vi.fn(async (_nombre: string, params: Record<string, unknown>) => {
    const materia = params.materia_filtro as string | null;
    const soloVigente = params.solo_norma_vigente === true;
    const limite = (params.limite as number | undefined) ?? rpcFilas.length;
    const data = rpcFilas
      .filter((f) => materia === null || f.materia === materia)
      .filter((f) => !soloVigente || f.es_norma_vigente === true)
      .slice(0, limite);
    return { data, error: null };
  });
  vi.doMock('@/lib/supabase', () => ({
    createServerSupabaseClient: () => ({ from: vi.fn(() => nuevaConsulta()), rpc }),
  }));
  const embedQueryMock = vi.fn().mockResolvedValue(new Array(384).fill(0.01));
  vi.doMock('@/lib/rag/embed', () => ({ embedQuery: embedQueryMock }));
  return { embedQueryMock, rpc };
}

const rpcFila = (id: string, fuente: string, num: string, materia: string, sim: number) => ({
  id,
  contenido: `Artículo ${num}. Texto de ${fuente}.`,
  num_articulo: num,
  fuente,
  fuente_tipo: 'codigo',
  jurisdiccion: 'HN',
  es_norma_vigente: true,
  materia,
  similarity: sim,
});

const penal173 = {
  id: 'penal-173', contenido: 'ARTICULO 173.- Texto del Código Penal.', num_articulo: '173',
  fuente: FUENTE_PENAL, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: MATERIA_PENAL, metadata: null,
};
const comercio173 = {
  id: 'comercio-173', contenido: 'ARTICULO 173.- Texto del Código de Comercio.', num_articulo: '173',
  fuente: FUENTE_COMERCIO, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: MATERIA_COMERCIO, metadata: null,
};

describe('buscarRAG — comparaciones (Supabase, filtros reales)', () => {
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

  it('comparación sin artículo: la materia de un solo instrumento no excluye al otro', async () => {
    mockearCliente([], [
      rpcFila('penal-rpc', FUENTE_PENAL, '5', MATERIA_PENAL, 0.9),
      rpcFila('comercio-rpc', FUENTE_COMERCIO, '9', MATERIA_COMERCIO, 0.8),
    ]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const r = await buscarRAG('Compara el Código Penal y el Código de Comercio', 5, 'mayalex_normativos');

    expect(r.fragmentos.map((f) => f.fuente).sort()).toEqual([FUENTE_COMERCIO, FUENTE_PENAL].sort());
    expect(r.outcome?.state).toBe('SEMANTIC_SUCCESS');
  });

  it('pareja instrumento–artículo recuperada por búsqueda exacta aunque la semántica no la traiga', async () => {
    const { embedQueryMock } = mockearCliente([penal173, comercio173], []);
    const { buscarRAG } = await import('@/lib/rag/search');

    const r = await buscarRAG('Artículo 173 del Código Penal y del Código de Comercio', 5, 'mayalex_normativos');

    expect(r.fragmentos.map((f) => f.fuente).sort()).toEqual([FUENTE_COMERCIO, FUENTE_PENAL].sort());
    expect(r.outcome?.state).toBe('EXACT_SUCCESS');
    expect(embedQueryMock).not.toHaveBeenCalled();
  });

  it('pareja incompleta: el segundo instrumento sólo trae otro artículo, no hay respuesta completa', async () => {
    mockearCliente([penal173], [rpcFila('comercio-12', FUENTE_COMERCIO, '12', MATERIA_COMERCIO, 0.8)]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const r = await buscarRAG('Artículo 173 del Código Penal y del Código de Comercio', 5, 'mayalex_normativos');

    expect(r.fragmentos).toHaveLength(0);
    expect(r.outcome?.state).toBe('OFFICIAL_FALLBACK_REQUIRED');
  });

  it('varios artículos pedidos: abstención aun con ambos instrumentos disponibles', async () => {
    mockearCliente([penal173], [rpcFila('comercio-12', FUENTE_COMERCIO, '12', MATERIA_COMERCIO, 0.8)]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const r = await buscarRAG('Artículo 173 del Código Penal y artículo 12 del Código de Comercio', 5, 'mayalex_normativos');

    expect(r.fragmentos).toHaveLength(0);
    expect(r.outcome?.state).toBe('OFFICIAL_FALLBACK_REQUIRED');
  });

  it('artículo inexistente en la comparación: abstención, sin semántica', async () => {
    const { embedQueryMock } = mockearCliente([], [rpcFila('comercio-x', FUENTE_COMERCIO, '173', MATERIA_COMERCIO, 0.8)]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const r = await buscarRAG('Artículo 9999 del Código Penal y del Código de Comercio', 5, 'mayalex_normativos');

    expect(r.fragmentos).toHaveLength(0);
    expect(r.outcome?.state).toBe('NO_VERIFIED_EVIDENCE');
    expect(embedQueryMock).not.toHaveBeenCalled();
  });
});
