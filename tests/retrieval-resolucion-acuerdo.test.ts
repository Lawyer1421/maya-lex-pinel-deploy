import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { clasificarIntencionInstrumental } from '@/lib/legal-retrieval/instrument-gate';

/**
 * P1-1: resolución y acuerdo con actos jurídicos son NONE, y con evidencia elegible
 * disponible la recuperación devuelve esa evidencia. NONE no garantiza éxito: sin
 * evidencia, abstención. Las consultas son de uso general, no identificadores de
 * pregunta del challenge.
 */

const FUENTE_CIVIL = 'Código Civil de Honduras (Decreto del Poder Ejecutivo del 8 de febrero de 1906)';
const FUENTE_PENAL = 'Código Procesal Penal de Honduras (Decreto 9-99-E)';

type Fila = {
  id: string; contenido: string; num_articulo: string; fuente: string; fuente_tipo: string;
  jurisdiccion: string; es_norma_vigente: boolean; materia: string; similarity: number;
};
const fila = (id: string, fuente: string, materia: string, contenido: string, sim = 0.9): Fila => ({
  id, contenido, num_articulo: '1', fuente, fuente_tipo: 'codigo',
  jurisdiccion: 'HN', es_norma_vigente: true, materia, similarity: sim,
});

const CASOS: { consulta: string; pertinente: Fila }[] = [
  {
    consulta: '¿Cómo apelar una resolución judicial en materia penal?',
    pertinente: fila('cpp-apelacion', FUENTE_PENAL, '01_PENAL', 'Artículo 400. Recurso de apelación contra las resoluciones judiciales penales.'),
  },
  {
    consulta: 'resolución del contrato de arrendamiento',
    pertinente: fila('civil-resolucion', FUENTE_CIVIL, '02_CIVIL', 'Artículo 1. La resolución del contrato de arrendamiento procede por falta de pago.'),
  },
  {
    consulta: '¿un acuerdo de pago extingue la deuda?',
    pertinente: fila('civil-pago', FUENTE_CIVIL, '02_CIVIL', 'Artículo 2. Las obligaciones se extinguen por el pago.'),
  },
  {
    consulta: 'el acuerdo de las partes en un contrato',
    pertinente: fila('civil-partes', FUENTE_CIVIL, '02_CIVIL', 'Artículo 3. El contrato es ley para las partes que lo otorgan.'),
  },
  // Regresión adicional: variante propia del equipo, no es una consulta del dictamen del auditor.
  {
    consulta: '¿Cuándo procede la resolución del contrato de compraventa?',
    pertinente: fila('civil-compraventa', FUENTE_CIVIL, '02_CIVIL', 'Artículo 4. La compraventa puede resolverse por incumplimiento.'),
  },
];

describe('clasificación: resolución y acuerdo con actos jurídicos → NONE', () => {
  it.each(CASOS.map((c) => c.consulta))('%s', (consulta) => {
    expect(clasificarIntencionInstrumental(consulta).estado).toBe('NONE');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Recuperación con evidencia elegible disponible (RPC con materia_filtro)
// ─────────────────────────────────────────────────────────────────────────────

const ORIGINAL_ENV = { ...process.env };

function mockearRPC(filas: Fila[]) {
  const rpc = vi.fn(async (_n: string, params: Record<string, unknown>) => {
    const materia = params.materia_filtro as string | null;
    return { data: filas.filter((f) => materia === null || f.materia === materia), error: null };
  });
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

describe('recuperación: evidencia elegible disponible se devuelve', () => {
  it.each(CASOS.map((c) => [c.consulta, c] as const))('%s', async (consulta, caso) => {
    mockearRPC(CASOS.map((c) => c.pertinente));
    const { buscarRAG } = await import('@/lib/rag/search');

    const r = await buscarRAG(consulta, 5, 'mayalex_normativos');

    expect(r.intencionInstrumental).toBe('NONE');
    expect(r.fragmentos.map((f) => f.id)).toContain(caso.pertinente.id);
    expect(r.outcome?.state).toBe('SEMANTIC_SUCCESS');
  });
});

describe('NONE no garantiza éxito: sin evidencia elegible, abstención', () => {
  it('resolución del contrato sin evidencia en el corpus', async () => {
    mockearRPC([]);
    const { buscarRAG } = await import('@/lib/rag/search');

    const r = await buscarRAG('resolución del contrato de arrendamiento', 5, 'mayalex_normativos');

    expect(r.intencionInstrumental).toBe('NONE');
    expect(r.fragmentos).toHaveLength(0);
    expect(r.outcome?.state).toBe('OFFICIAL_FALLBACK_REQUIRED');
  });
});
