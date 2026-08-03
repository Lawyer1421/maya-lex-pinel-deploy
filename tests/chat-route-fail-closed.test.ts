import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * WAR ROOM FINAL — Tarea 1: fail-closed EN CÓDIGO, no solo en el system
 * prompt. Antes de este cambio, cuando la recuperación devolvía cero
 * fragmentos válidos, el chat igual invocaba al LLM sin contexto RAG — el
 * modelo podía (y lo hizo, en la Prueba 3 del hotfix anterior) responder con
 * un análisis jurídico detallado desde su propio conocimiento paramétrico,
 * sin ningún respaldo documental. Estas pruebas verifican la decisión
 * determinista en app/api/chat/route.ts: si la consulta exige evidencia del
 * corpus y no hay fragmentos válidos, el LLM NUNCA se invoca.
 */

const ORIGINAL_ENV = { ...process.env };

function fakeClaudeStream(text: string) {
  async function* gen() {
    yield { type: 'message_start', message: { usage: { input_tokens: 42 } } };
    yield { type: 'content_block_start', content_block: { type: 'text' } };
    yield { type: 'content_block_delta', delta: { type: 'text_delta', text } };
    yield { type: 'content_block_stop' };
    yield { type: 'message_delta', usage: { output_tokens: 7 } };
    yield { type: 'message_stop' };
  }
  return gen();
}

let anthropicCreateMock: (...args: unknown[]) => Promise<unknown>;

function mockDependenciasComunes() {
  vi.doMock('next/server', async () => {
    const actual = await vi.importActual<typeof import('next/server')>('next/server');
    // after() requiere contexto de request real de Next.js — fuera de eso
    // lanza. En la prueba unitaria basta con ejecutar el callback en línea.
    return { ...actual, after: (fn: () => unknown) => { fn(); } };
  });

  vi.doMock('@/lib/rate-limit', () => ({
    checkAndIncrementRateLimit: vi.fn().mockResolvedValue({
      allowed: true, remaining: 2, tier: 'free', resetAt: new Date().toISOString(),
    }),
    getUserIdentifierVerificado: vi.fn().mockResolvedValue('ip:test'),
  }));

  vi.doMock('@/lib/analytics/logger', () => ({
    logConsulta: vi.fn().mockResolvedValue(undefined),
    hashUsuario: vi.fn().mockReturnValue('hashed'),
  }));

  vi.doMock('@/lib/websearch/tavily', () => ({
    buscarWeb: vi.fn(),
    formatearContextoWeb: vi.fn().mockReturnValue(''),
    AVISO_BUSQUEDA_FALLIDA: '',
  }));

  vi.doMock('@/lib/self-learning/buscar-plantilla', () => ({
    buscarPlantilla: vi.fn().mockResolvedValue([]),
    formatearContextoPlantilla: vi.fn().mockReturnValue(''),
  }));

  anthropicCreateMock = vi.fn().mockImplementation(async () => fakeClaudeStream('Respuesta simulada del modelo.'));
  vi.doMock('@anthropic-ai/sdk', () => {
    class MockAPIError extends Error {}
    class MockAnthropic {
      messages = { create: (...args: unknown[]) => anthropicCreateMock(...args) };
      static APIError = MockAPIError;
    }
    return { default: MockAnthropic };
  });
}

async function mockBuscarRAG(resultado: {
  fragmentos: unknown[]; articulos_encontrados: string[]; backend: 'supabase'; ambiguo?: boolean;
}) {
  vi.doMock('@/lib/rag/search', async () => {
    const actual = await vi.importActual<typeof import('@/lib/rag/search')>('@/lib/rag/search');
    return { ...actual, buscarRAG: vi.fn().mockResolvedValue(resultado) };
  });
}

function fakeSupabaseVacio() {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null }),
  };
  return { from: vi.fn(() => chain) };
}

function fakeReq(body: unknown) {
  return { json: async () => body } as any;
}

async function leerSSE(res: Response) {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let raw = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    raw += decoder.decode(value);
  }
  return raw
    .split('\n\n')
    .filter((chunk) => chunk.startsWith('data: '))
    .map((chunk) => JSON.parse(chunk.slice('data: '.length)));
}

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  process.env.ANTHROPIC_API_KEY = 'fake-key';
  process.env.LLM_PROVIDER = 'anthropic';
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('POST /api/chat — fail-closed de evidencia de corpus (WAR ROOM FINAL, Tarea 1)', () => {
  it('A. consulta semántica penal + cero fragmentos → abstención determinista, LLM NO invocado', async () => {
    mockDependenciasComunes();
    await mockBuscarRAG({ fragmentos: [], articulos_encontrados: [], backend: 'supabase' });
    const { POST } = await import('@/app/api/chat/route');

    const res = await POST(fakeReq({
      messages: [{ role: 'user', content: 'Explica las medidas cautelares personales aplicables en el proceso penal hondureño.' }],
      mode: 'analisis_penal',
    }));
    const eventos = await leerSSE(res);
    const doneEvt = eventos.find((e) => e.type === 'done');

    expect(doneEvt.citas).toEqual([]);
    expect(doneEvt.codigo).toBe('CORPUS_EVIDENCE_NOT_FOUND');
    expect(anthropicCreateMock).not.toHaveBeenCalled();
  });

  it('B. "según el corpus" + cero fragmentos (modo sala, sin router) → abstención determinista', async () => {
    mockDependenciasComunes();
    await mockBuscarRAG({ fragmentos: [], articulos_encontrados: [], backend: 'supabase' });
    const { POST } = await import('@/app/api/chat/route');

    const res = await POST(fakeReq({
      messages: [{ role: 'user', content: 'Según el corpus, ¿qué garantías tiene el imputado durante la detención?' }],
      mode: 'sala_penal',
    }));
    const eventos = await leerSSE(res);
    const doneEvt = eventos.find((e) => e.type === 'done');

    expect(doneEvt.citas).toEqual([]);
    expect(doneEvt.codigo).toBe('CORPUS_EVIDENCE_NOT_FOUND');
    expect(anthropicCreateMock).not.toHaveBeenCalled();
  });

  it('C. Art. 9999 CPP → abstención, citas vacías, sin embedding semántico posterior', async () => {
    mockDependenciasComunes();
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => fakeSupabaseVacio() }));
    const embedQueryMock = vi.fn().mockResolvedValue(new Array(384).fill(0.01));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: embedQueryMock }));
    process.env.RAG_BACKEND = 'supabase';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';

    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(fakeReq({
      messages: [{ role: 'user', content: 'Cita el artículo 9999 del Código Procesal Penal de Honduras' }],
      mode: 'analisis_penal',
    }));
    const eventos = await leerSSE(res);
    const doneEvt = eventos.find((e) => e.type === 'done');

    expect(doneEvt.citas).toEqual([]);
    expect(doneEvt.codigo).toBe('CORPUS_EVIDENCE_NOT_FOUND');
    expect(embedQueryMock).not.toHaveBeenCalled();
    expect(anthropicCreateMock).not.toHaveBeenCalled();
  });

  it('D. consulta con fragmentos válidos → flujo normal, LLM invocado, citas preservadas', async () => {
    mockDependenciasComunes();
    const fragmentoValido = {
      id: 'f1', contenido: 'ARTICULO 173.- Texto limpio de prueba.', num_articulo: '173',
      fuente: 'Codigo Procesal Penal', relevancia: 0.95, fuente_tipo: 'codigo',
      jurisdiccion: 'HN', es_norma_vigente: true, hash: 'abcd1234',
    };
    await mockBuscarRAG({ fragmentos: [fragmentoValido], articulos_encontrados: ['173'], backend: 'supabase' });
    const { POST } = await import('@/app/api/chat/route');

    const res = await POST(fakeReq({
      messages: [{ role: 'user', content: 'Explica el artículo 173 del Código Procesal Penal de Honduras' }],
      mode: 'analisis_penal',
    }));
    const eventos = await leerSSE(res);
    const doneEvt = eventos.find((e) => e.type === 'done');

    expect(anthropicCreateMock).toHaveBeenCalled();
    expect(doneEvt.citas).toHaveLength(1);
    expect(doneEvt.citas[0].hash).toBe('abcd1234');
    expect(doneEvt.codigo).toBeUndefined();
  });

  it('E. la abstención no expone reglas internas, system prompt ni configuración', async () => {
    mockDependenciasComunes();
    await mockBuscarRAG({ fragmentos: [], articulos_encontrados: [], backend: 'supabase' });
    const { POST } = await import('@/app/api/chat/route');

    const res = await POST(fakeReq({
      messages: [{ role: 'user', content: 'Según el corpus, explica las medidas cautelares personales en el proceso penal.' }],
      mode: 'analisis_penal',
    }));
    const eventos = await leerSSE(res);
    const textoCompleto = eventos.filter((e) => e.type === 'text').map((e) => e.text).join('');

    const TERMINOS_PROHIBIDOS = [
      /system prompt/i, /prohibici[oó]n(es)? absoluta/i, /\bruta_[abcd]\b/i,
      /CLAUDE_CONFIG/i, /coleccionPrincipal/i, /materiaFiltro/i, /ANTHROPIC_API_KEY/i,
    ];
    for (const re of TERMINOS_PROHIBIDOS) {
      expect(textoCompleto).not.toMatch(re);
    }
    expect(textoCompleto).toContain('No se recuperaron fragmentos verificables del corpus');
  });
});
