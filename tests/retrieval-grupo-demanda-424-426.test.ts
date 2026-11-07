import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { articulosFaltantesDelGrupo } from '@/lib/legal-retrieval/grupos-articulos';

type Fila = Record<string, unknown>;
const FUENTE_CPC = 'Código Procesal Civil de Honduras (Decreto 211-2006)';
const art = (n: string, extra: Fila = {}): Fila => ({
  id: `cpc-${n}`, contenido: `Artículo ${n}. Texto del artículo ${n} sobre la demanda y sus requisitos.`, num_articulo: n, fuente: FUENTE_CPC,
  fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '02_CIVIL', revision_pendiente: false, metadata: null, similarity: 0.9, ...extra,
});
const ORIGINAL_ENV = { ...process.env };

function montar(tabla: Fila[], semanticas: Fila[]) {
  vi.doMock('@/lib/supabase', () => ({
    createServerSupabaseClient: () => ({
      from: () => {
        const filtros: [string, unknown][] = [];
        const chain: any = {
          select: () => chain,
          eq: (c: string, v: unknown) => { filtros.push([c, v]); return chain; },
          then: (res: (v: { data: Fila[]; error: null }) => void) => res({ data: tabla.filter((f) => filtros.every(([c, v]) => !(c in f) || f[c] === v)), error: null }),
        };
        return chain;
      },
      rpc: async () => ({ data: semanticas, error: null }),
    }),
  }));
  vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));
}

beforeEach(() => {
  vi.resetModules();
  process.env.RAG_BACKEND = 'supabase';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';
});
afterEach(() => { process.env = { ...ORIGINAL_ENV }; vi.restoreAllMocks(); });

const ids = (r: { fragmentos: { id?: string }[] }) => r.fragmentos.map((f) => f.id).sort();

describe('grupo 424–426 CPC (demanda)', () => {
  it('«requisitos esenciales de una demanda ordinaria»: con 424 recuperado se completan 425 y 426 como PRIMARY', async () => {
    montar([art('424'), art('425'), art('426'), art('427')], [art('424')]);
    const { buscarRAG } = await import('@/lib/rag/search');
    const r = await buscarRAG('¿Cuáles son los requisitos esenciales de una demanda ordinaria?', 5, 'mayalex_procedimental');
    expect(ids(r)).toEqual(['cpc-424', 'cpc-425', 'cpc-426']);
    expect(r.fragmentos.every((f) => f.rol_evidencia === 'PRIMARY' && f.es_norma_vigente === true)).toBe(true);
  });
  it('no agrega nada si la consulta no trata de la demanda', async () => {
    montar([art('424'), art('425'), art('426')], [art('424')]);
    const { buscarRAG } = await import('@/lib/rag/search');
    const r = await buscarRAG('¿Qué es una cuestión incidental?', 5, 'mayalex_procedimental');
    expect(ids(r)).toEqual(['cpc-424']);
  });
  it('no agrega nada sin ancla: si el 424 no se recuperó, no se inventa el grupo', async () => {
    montar([art('424'), art('425'), art('426')], [art('427')]);
    const { buscarRAG } = await import('@/lib/rag/search');
    const r = await buscarRAG('requisitos de la demanda', 5, 'mayalex_procedimental');
    expect(ids(r)).toEqual(['cpc-427']);
  });
  it('no agrega artículos no vigentes ni con revisión pendiente', async () => {
    montar([art('424'), art('425', { es_norma_vigente: false }), art('426', { revision_pendiente: true })], [art('424')]);
    const { buscarRAG } = await import('@/lib/rag/search');
    const r = await buscarRAG('requisitos de la demanda', 5, 'mayalex_procedimental');
    expect(ids(r)).toEqual(['cpc-424']);
  });
  it('sin 425 ni 426 en el corpus, devuelve solo lo recuperado (sin error)', async () => {
    montar([art('424')], [art('424')]);
    const { buscarRAG } = await import('@/lib/rag/search');
    const r = await buscarRAG('requisitos de la demanda', 5, 'mayalex_procedimental');
    expect(ids(r)).toEqual(['cpc-424']);
  });
  it('la función pura exige tema + ancla PRIMARY vigente', () => {
    const f = { ...art('424'), rol_evidencia: 'PRIMARY' as const } as never;
    const ok = (x: { rol_evidencia?: string }) => x.rol_evidencia === 'PRIMARY';
    expect(articulosFaltantesDelGrupo('requisitos de la demanda', [f], ok)[0].faltantes).toEqual(['425', '426']);
    expect(articulosFaltantesDelGrupo('plazo para apelar', [f], ok)).toEqual([]);
    expect(articulosFaltantesDelGrupo('requisitos de la demanda', [f], () => false)).toEqual([]);
  });
});
