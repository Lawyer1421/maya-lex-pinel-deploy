/**
 * Fase 2 de latencia (2026-11-12): timeout de Cohere, reutilización del embedding de la pregunta y pasadas de búsqueda en paralelo.
 * Ninguna de estas mejoras cambia qué evidencia se recupera ni las guardas R3/R4.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('timeout de Cohere', () => {
  it('es 2500 ms', async () => {
    const { RERANK_TIMEOUT_MS } = await import('@/lib/rag/rerank');
    expect(RERANK_TIMEOUT_MS).toBe(2500);
  });
});

describe('reutilización del embedding de la pregunta', () => {
  const ORIGINAL = { ...process.env };
  const vector = new Array(384).fill(0.05);
  beforeEach(() => {
    vi.resetModules();
    process.env.HF_API_TOKEN = 'fake';
  });
  afterEach(() => {
    process.env = { ...ORIGINAL };
    vi.unstubAllGlobals();
  });

  it('dos llamadas simultáneas con el mismo texto hacen UNA sola petición a HF', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(vector), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { embedQuery } = await import('@/lib/rag/embed');
    const [a, b] = await Promise.all([embedQuery('requisitos de la demanda'), embedQuery('requisitos de la demanda')]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
  });

  it('una llamada posterior con el mismo texto reutiliza el vector ya calculado', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(vector), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { embedQuery } = await import('@/lib/rag/embed');
    await embedQuery('art 424 cpc');
    await embedQuery('art 424 cpc');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('textos distintos no comparten vector', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(vector), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { embedQuery } = await import('@/lib/rag/embed');
    await Promise.all([embedQuery('pregunta uno'), embedQuery('pregunta dos')]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('un fallo NO se guarda: la siguiente llamada vuelve a intentar', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('caído', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(vector), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { embedQuery } = await import('@/lib/rag/embed');
    await expect(embedQuery('consulta')).rejects.toThrow(/503/);
    await expect(embedQuery('consulta')).resolves.toHaveLength(384);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('pasada procedimental en secuencia', () => {
  beforeEach(() => vi.resetModules());

  it('la pasada principal y la procedimental de la misma pregunta hacen UNA sola llamada de embedding', async () => {
    process.env.HF_API_TOKEN = 'fake';
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(new Array(384).fill(0.05)), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { embedQuery } = await import('@/lib/rag/embed');
    vi.doMock('@/lib/rag/search', () => ({
      buscarRAG: vi.fn(async (q: string) => {
        await embedQuery(q);
        return { fragmentos: [], articulos_encontrados: [], backend: 'supabase', outcome: { state: 'SEMANTIC_SUCCESS', evidenceCount: 0 } };
      }),
      formatearContextoRAG: () => '',
      requiereEvidenciaCorpus: () => true,
      CORPUS_EVIDENCE_NOT_FOUND: 'X', MENSAJE_ABSTENCION_CORPUS: 'X',
    }));
    vi.doMock('@/lib/legal-retrieval/instrument-gate', () => ({
      clasificarIntencionInstrumental: () => ({ estado: 'NONE' }),
      evidenciaProcedimentalPermitida: () => [],
    }));
    const { recuperarEvidenciaCorpus } = await import('@/lib/legal-retrieval/retrieval-session');
    await recuperarEvidenciaCorpus({ pregunta: 'requisitos de la demanda', coleccionPrincipal: 'mayalex_normativos', pasadaProcedimental: true, rerank: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
