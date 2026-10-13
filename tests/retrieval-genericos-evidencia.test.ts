import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Lenguaje temático (B1): las consultas genéricas son NONE y el retrieval debe
 * devolver la evidencia pertinente disponible, no abstenerse. Los mocks aplican
 * materia_filtro, solo_norma_vigente y límite, como buscar_biblioteca_v2.
 */

const FUENTE_CIVIL = 'Código Civil de Honduras (Decreto del Poder Ejecutivo del 8 de febrero de 1906)';
const FUENTE_PENAL = 'Código Procesal Penal de Honduras (Decreto 9-99-E)';

type Fila = {
  id: string;
  contenido: string;
  num_articulo: string;
  fuente: string;
  fuente_tipo: string;
  jurisdiccion: string;
  es_norma_vigente: boolean;
  materia: string;
  similarity: number;
};

const civilArrendamiento: Fila = {
  id: 'civil-arrendamiento', contenido: 'Artículo 1. El arrendamiento es un contrato por el que una parte concede el uso de una cosa.',
  num_articulo: '1', fuente: FUENTE_CIVIL, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '02_CIVIL', similarity: 0.9,
};
const civilDeuda: Fila = {
  id: 'civil-deuda', contenido: 'Artículo 2. Las obligaciones se extinguen por el pago, la compensación y la remisión.',
  num_articulo: '2', fuente: FUENTE_CIVIL, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '02_CIVIL', similarity: 0.85,
};
const penalApelacion: Fila = {
  id: 'penal-apelacion', contenido: 'Artículo 400. Recurso de apelación contra las resoluciones judiciales en materia penal.',
  num_articulo: '400', fuente: FUENTE_PENAL, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '01_PENAL', similarity: 0.88,
};
const CORPUS: Fila[] = [civilArrendamiento, civilDeuda, penalApelacion];

const ORIGINAL_ENV = { ...process.env };

function mockearRPC(filas: Fila[]) {
  const rpc = vi.fn(async (_nombre: string, params: Record<string, unknown>) => {
    const materia = params.materia_filtro as string | null;
    const data = filas
      .filter((f) => materia === null || f.materia === materia)
      .filter((f) => params.solo_norma_vigente !== true || f.es_norma_vigente)
      .slice(0, (params.limite as number | undefined) ?? filas.length);
    return { data, error: null };
  });
  vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => ({ rpc }) }));
  vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));
  return rpc;
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

describe('B1 — consultas temáticas devuelven evidencia pertinente disponible', () => {
  it('"¿Cómo apelar una resolución judicial en materia penal?": la materia penal selecciona la apelación penal', async () => {
    mockearRPC(CORPUS);
    const { buscarRAG } = await import('@/lib/rag/search');

    const r = await buscarRAG('¿Cómo apelar una resolución judicial en materia penal?', 5, 'mayalex_normativos');

    expect(r.fragmentos.map((f) => f.id)).toEqual(['penal-apelacion']);
    expect(r.outcome?.state).toBe('SEMANTIC_SUCCESS');
  });

  it('"arrendamiento ley civil": la materia civil selecciona los artículos civiles', async () => {
    mockearRPC(CORPUS);
    const { buscarRAG } = await import('@/lib/rag/search');

    const r = await buscarRAG('arrendamiento ley civil', 5, 'mayalex_normativos');

    expect(r.fragmentos.map((f) => f.id)).toContain('civil-arrendamiento');
    expect(r.fragmentos.some((f) => f.fuente === FUENTE_PENAL)).toBe(false);
    expect(r.outcome?.state).toBe('SEMANTIC_SUCCESS');
  });

  it.each([
    ['el código dice algo sobre la herencia', 'civil-arrendamiento'],
    ['resolución del contrato de arrendamiento', 'civil-arrendamiento'],
    ['¿un acuerdo de pago extingue la deuda?', 'civil-deuda'],
    ['el acuerdo de las partes en un contrato', 'civil-arrendamiento'],
  ])('%s → conserva la evidencia pertinente (%s)', async (consulta, pertinente) => {
    mockearRPC(CORPUS);
    const { buscarRAG } = await import('@/lib/rag/search');

    const r = await buscarRAG(consulta, 5, 'mayalex_normativos');

    expect(r.fragmentos.map((f) => f.id)).toContain(pertinente);
    expect(r.outcome?.state).toBe('SEMANTIC_SUCCESS');
  });

  it('una referencia específica sin resolver sigue sin evidencia aunque haya candidatos', async () => {
    mockearRPC(CORPUS);
    const { buscarRAG } = await import('@/lib/rag/search');

    const r = await buscarRAG('la resolución 77-2099 del Consejo', 5, 'mayalex_normativos');

    expect(r.fragmentos).toHaveLength(0);
    expect(r.outcome?.state).toBe('OFFICIAL_FALLBACK_REQUIRED');
  });
});
