import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const fila = (o: Record<string, unknown>) => ({
  id: 'x', contenido: 'texto', num_articulo: null, fuente: null, fuente_tipo: null,
  jurisdiccion: null, es_norma_vigente: false, similarity: 0.9, ...o,
});

describe('pool vigente completo (basura heredada no desplaza al CPC)', () => {
  const llamadas: Array<{ limite: number; solo_norma_vigente?: boolean }> = [];
  let prev: string | undefined;

  beforeEach(() => {
    vi.resetModules();
    llamadas.length = 0;
    prev = process.env.RAG_BACKEND;
    process.env.RAG_BACKEND = 'supabase';
    vi.doMock('@/lib/supabase', () => ({
      createServerSupabaseClient: () => ({
        rpc: (_fn: string, p: { limite: number; solo_norma_vigente?: boolean }) => {
          llamadas.push(p);
          if (!p.solo_norma_vigente) {
            // Top-k normal copado por basura: fuente NULL y doc_*.
            return Promise.resolve({ data: [
              fila({ id: 'a' }), fila({ id: 'b', fuente: 'doc_sentencia_1' }),
            ], error: null });
          }
          return Promise.resolve({ data: [
            fila({ id: 'cpc1', contenido: 'La nulidad de la demanda procede cuando...', num_articulo: '200',
              fuente: 'Codigo Procesal Civil', fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true }),
          ], error: null });
        },
      }),
    }));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: async () => Array(384).fill(0.01) }));
  });

  afterEach(() => {
    process.env.RAG_BACKEND = prev;
    vi.doUnmock('@/lib/supabase');
    vi.doUnmock('@/lib/rag/embed');
  });

  it('pide el pool vigente con el tope del RPC (20) y rescata el CPC', async () => {
    const { buscarRAG } = await import('@/lib/rag/search');
    const r = await buscarRAG('motivos de nulidad de una demanda civil según el código procesal civil', 5, 'mayalex_normativos');
    expect(llamadas.find((c) => c.solo_norma_vigente)?.limite).toBe(20);
    expect(r.fragmentos.map((f) => f.id)).toEqual(['cpc1']);
  });
});
