import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * WAR ROOM (hotfix/production-rag-final-gate) — Tarea 3: cuando la consulta
 * identifica instrumento Y número de artículo, y la búsqueda exacta no
 * encuentra ningún candidato citable, buscarRAG() debe abstenerse
 * inmediatamente — NUNCA debe caer a la búsqueda semántica amplia (podría
 * citar un artículo de otro instrumento, o inventar contexto irrelevante).
 * Se verifica espiando embedQuery(): si la ruta semántica se ejecutara,
 * generaría un embedding; si nunca se llama, la abstención fue real.
 */

const ORIGINAL_ENV = { ...process.env };

function fakeSupabaseVacio() {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null }),
  };
  return { from: vi.fn(() => chain) };
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

describe('buscarRAG — Art. 9999 CPP (Tarea 3)', () => {
  it('instrumento+numero identificados, cero exactos -> abstencion limpia, NUNCA llama a la busqueda semantica', async () => {
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => fakeSupabaseVacio() }));
    const embedQueryMock = vi.fn().mockResolvedValue(new Array(384).fill(0.01));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: embedQueryMock }));

    const { buscarRAG } = await import('@/lib/rag/search');
    const resultado = await buscarRAG(
      'Cita el artículo 9999 del Código Procesal Penal de Honduras',
      5,
      'mayalex_normativos'
    );

    expect(resultado.fragmentos).toHaveLength(0);
    expect(resultado.articulos_encontrados).toHaveLength(0);
    // La prueba central: si hubiera caído a semantica, esto se habria llamado.
    expect(embedQueryMock).not.toHaveBeenCalled();
  });

  it('solo numero identificado (instrumento ambiguo) SI permite fallback semantico', async () => {
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => fakeSupabaseVacio() }));
    const embedQueryMock = vi.fn().mockResolvedValue(new Array(384).fill(0.01));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: embedQueryMock }));

    const { buscarRAG } = await import('@/lib/rag/search');
    await buscarRAG('¿Qué dice el artículo 9999?', 5, 'mayalex_normativos');

    expect(embedQueryMock).toHaveBeenCalled();
  });
});
