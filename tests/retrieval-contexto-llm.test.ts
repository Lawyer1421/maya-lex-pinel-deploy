import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Contexto efectivamente enviado al LLM. La ruta de chat construye el contexto
 * con formatearContextoRAG(buscarRAG(...)); esta prueba inspecciona ese texto.
 * Verifica el contexto, no la conducta de un modelo real.
 */

const FUENTE_CIVIL = 'Código Civil de Honduras (Decreto del Poder Ejecutivo del 8 de febrero de 1906)';
const FUENTE_PROCESAL_CIVIL = 'Codigo Procesal Civil';
const FUENTES_REALES = new Set([FUENTE_CIVIL, FUENTE_PROCESAL_CIVIL]);

const ORIGINAL_ENV = { ...process.env };

const filasCorpus = [
  {
    id: 'civil-divorcio', contenido: 'Artículo 1. El matrimonio se disuelve por divorcio en los casos que la ley establece.',
    num_articulo: '1', fuente: FUENTE_CIVIL, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '02_CIVIL', similarity: 0.9,
  },
  {
    id: 'procesal-divorcio', contenido: 'Artículo 5. El procedimiento de divorcio se tramita en juicio oral.',
    num_articulo: '5', fuente: FUENTE_PROCESAL_CIVIL, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '02_CIVIL', similarity: 0.8,
  },
];

function mockearRPC() {
  const rpc = vi.fn(async (_n: string, params: Record<string, unknown>) => {
    const materia = params.materia_filtro as string | null;
    return { data: filasCorpus.filter((f) => materia === null || f.materia === materia), error: null };
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

/** Fuentes reales de fragmento, marcadas como "Fuente documental:" (la cabecera "Fuente:" es el backend). */
function fuentesEnContexto(contexto: string): string[] {
  return [...contexto.matchAll(/^Fuente documental: (.+)$/gm)].map((m) => m[1]);
}

describe('contexto enviado al LLM — «ley sobre el divorcio» (NONE)', () => {
  it('usa nombres reales de fuentes y no presenta la expresión temática como título normativo', async () => {
    mockearRPC();
    const { buscarRAG, formatearContextoRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG('Según la ley sobre el divorcio, ¿qué procede?', 5, 'mayalex_normativos');
    const contexto = formatearContextoRAG(resultado);

    expect(resultado.intencionInstrumental).toBe('NONE');
    expect(resultado.outcome?.state).toBe('SEMANTIC_SUCCESS');
    expect(contexto).toContain('CONSULTA TEMÁTICA');
    // Todas las fuentes citadas son nombres reales del corpus
    const fuentes = fuentesEnContexto(contexto);
    expect(fuentes.length).toBeGreaterThan(0);
    for (const f of fuentes) expect(FUENTES_REALES.has(f)).toBe(true);
    expect(contexto).toContain(`Fuente documental: ${FUENTE_CIVIL}`);
    // Ninguna fuente toma la expresión temática como título
    expect(contexto).not.toMatch(/Fuente documental: .*divorcio/i);
    // No se declara relevancia jurídica no evaluada
    expect(contexto).not.toContain('relevancia:');
    expect(contexto).toContain('sin evaluación de relevancia jurídica');
  });

  it('contexto específico (SPECIFIC_RESOLVED) conserva el formato previo, sin aviso temático', async () => {
    mockearRPC();
    const { buscarRAG, formatearContextoRAG } = await import('@/lib/rag/search');

    const resultado = await buscarRAG('Según el Código Civil, ¿qué dispone sobre el divorcio?', 5, 'mayalex_normativos');
    const contexto = formatearContextoRAG(resultado);

    expect(resultado.intencionInstrumental).toBe('SPECIFIC_RESOLVED');
    expect(contexto).not.toContain('CONSULTA TEMÁTICA');
    expect(contexto).toContain('similitud de recuperación:');
    expect(contexto).not.toContain('sin evaluación de relevancia jurídica');
  });
});
