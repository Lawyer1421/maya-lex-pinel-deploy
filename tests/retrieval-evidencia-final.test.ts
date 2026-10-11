import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  clasificarIntencionInstrumental,
  evidenciaFinal,
  evidenciaProcedimentalPermitida,
} from '@/lib/legal-retrieval/instrument-gate';

/**
 * Evidencia final: cobertura y artículo se evalúan sobre lo que se envía al
 * LLM. Incluye comparaciones con artículos concretos (un único artículo se
 * aplica a todos los instrumentos; varios artículos abstienen), el pase
 * procedimental de RUTA C y buscarRAG completo (Supabase), sin red.
 */

const FUENTE_PENAL = 'Codigo Penal';
const FUENTE_COMERCIO = 'Codigo de Comercio (Decreto No. 73-1950, Congreso Nacional de Honduras)';
const FUENTE_CODIGO = 'Código del Notariado de Honduras (Decreto 353-2005)';

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

  it('NONE y SPECIFIC_RESOLVED no cambian', () => {
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
    const principal: ReturnType<typeof frag>[] = [];
    const proc = [frag('x', FUENTE_PENAL, null)];
    expect(evidenciaProcedimentalPermitida(principal, proc, comparacion)).toEqual([]);
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
// buscarRAG completo (Supabase), artículo concreto en comparación
// ─────────────────────────────────────────────────────────────────────────────

const ORIGINAL_ENV = { ...process.env };

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
  vi.doMock('@/lib/rag/embed', () => ({
    embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)),
  }));
}

const rpcFila = (id: string, fuente: string, num: string, sim: number) => ({
  id,
  contenido: `Artículo ${num}. Texto de ${fuente}.`,
  num_articulo: num,
  fuente,
  fuente_tipo: 'codigo',
  jurisdiccion: 'HN',
  es_norma_vigente: true,
  similarity: sim,
});

describe('buscarRAG — comparación con artículo concreto (Supabase)', () => {
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

  const CONSULTA = 'Artículo 173 del Código Penal y del Código de Comercio';
  const exactaPenal = {
    id: 'penal-173', contenido: 'ARTICULO 173.- Texto del Código Penal.', num_articulo: '173',
    fuente: FUENTE_PENAL, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '01_PENAL', metadata: null,
  };

  it('el mismo artículo en ambos instrumentos: respuesta completa', async () => {
    mockearCliente([exactaPenal], [rpcFila('c-173', FUENTE_COMERCIO, '173', 0.8)]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const r = await buscarRAG(CONSULTA, 5, 'mayalex_normativos');

    expect(r.fragmentos.map((f) => f.fuente).sort()).toEqual([FUENTE_COMERCIO, FUENTE_PENAL].sort());
    expect(r.outcome?.state).toBe('SEMANTIC_SUCCESS');
  });

  it('el otro instrumento sólo trae un fragmento de otro artículo: abstención, no se autoriza', async () => {
    mockearCliente([exactaPenal], [rpcFila('c-12', FUENTE_COMERCIO, '12', 0.8)]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const r = await buscarRAG(CONSULTA, 5, 'mayalex_normativos');

    expect(r.fragmentos).toHaveLength(0);
    expect(r.outcome?.state).toBe('OFFICIAL_FALLBACK_REQUIRED');
  });

  it('varios artículos pedidos en la comparación: abstención aun con ambos instrumentos', async () => {
    mockearCliente([exactaPenal], [rpcFila('c-12', FUENTE_COMERCIO, '12', 0.8)]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const r = await buscarRAG('Artículo 173 del Código Penal y artículo 12 del Código de Comercio', 5, 'mayalex_normativos');

    expect(r.fragmentos).toHaveLength(0);
    expect(r.outcome?.state).toBe('OFFICIAL_FALLBACK_REQUIRED');
  });
});
