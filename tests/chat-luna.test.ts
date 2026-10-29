import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * P26 Luna — integración en POST /api/chat con datos sintéticos y SDK simulados (sin red, sin credenciales reales).
 * Cubre: apagada por defecto (no regresión), doble llave (entorno + bandera), respuesta Luna con referencias,
 * y degradación al proveedor vigente cuando Luna falla.
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
let openaiCreateMock: (...args: unknown[]) => Promise<unknown>;

function mockDependenciasComunes(flagsHabilitados: string[] = []) {
  vi.doMock('openai', () => ({ default: class { responses = { create: (...a: unknown[]) => openaiCreateMock(...a) }; models = { retrieve: async (id: string) => ({ id }) }; } }));
  vi.doMock('next/server', async () => {
    const actual = await vi.importActual<typeof import('next/server')>('next/server');
    // after() requiere contexto de request real de Next.js — fuera de eso
    // lanza. En la prueba unitaria basta con ejecutar el callback en línea.
    return { ...actual, after: (fn: () => unknown) => { fn(); } };
  });

  vi.doMock('@/lib/rate-limit', () => ({
    checkRateLimit: vi.fn().mockResolvedValue({
      allowed: true, remaining: 2, tier: 'free', resetAt: new Date().toISOString(),
    }),
    reserveRateLimit: vi.fn().mockResolvedValue({
      allowed: true, remaining: 2, tier: 'free', resetAt: new Date().toISOString(),
    }),
    incrementRateLimit: vi.fn().mockResolvedValue(undefined),
    releaseRateLimit: vi.fn().mockResolvedValue(undefined),
    checkAndIncrementRateLimit: vi.fn().mockResolvedValue({
      allowed: true, remaining: 2, tier: 'free', resetAt: new Date().toISOString(),
    }),
    RateLimitStoreError: class RateLimitStoreError extends Error { code = 'STORE_ERROR'; },
    esFalloProveedorQueDevuelveCuota: () => false,
    esFalloOpenRouterQueDevuelveCuota: () => false,
    getUserIdentifierVerificado: vi.fn().mockResolvedValue('ip:test'),
    getVerifiedEmail: vi.fn().mockResolvedValue(null),
    getUserIdentifier: vi.fn().mockReturnValue('ip:test'),
    buildUserIdentifierFromEmail: (e: string) => `email:${e.trim().toLowerCase()}`,
  }));

  // flag_rerank OFF por default (Decisión C) — el chat corta por similitud
  // pgvector. Fase 1E.2: `flagsHabilitados` permite que un test específico
  // active flag_official_source_fallback sin afectar el default OFF de todos
  // los demás tests (y de Production/Preview reales -- ver lib/flags.ts).
  vi.doMock('@/lib/flags', () => ({
    isFlagEnabledForUser: vi.fn().mockImplementation(async (flagName: string) => flagsHabilitados.includes(flagName)),
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
  fragmentos: unknown[]; articulos_encontrados: string[]; backend: 'supabase' | 'disabled'; ambiguo?: boolean;
  error?: string; outcome?: Record<string, unknown>;
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


const FRAGMENTO = {
  id: 'mayalex_normativos:cpp_a173', contenido: 'ARTICULO 173.- Texto sintético de prueba sobre medidas cautelares.', num_articulo: '173',
  fuente: 'Codigo Procesal Penal', relevancia: 0.9, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, hash: 'abcd1234',
};
const RAG_OK = {
  fragmentos: [FRAGMENTO], articulos_encontrados: ['173'], backend: 'supabase' as const,
  outcome: { state: 'SEMANTIC_SUCCESS', evidenceCount: 1, exactAttempted: false, semanticAttempted: true, degraded: false },
};
const PREGUNTA = 'Explica el artículo 173 del Código Procesal Penal sobre las medidas cautelares personales.';
const LUNA_OK = { decision: 'ANSWER', abstention_reason: null, claims: [{ claim_id: 'c1', text: 'El artículo 173 regula las medidas cautelares.', citations: [{ chunk_id: FRAGMENTO.id, support: 'DIRECT' }] }] };

async function correr(flags: string[]) {
  mockDependenciasComunes(flags);
  await mockBuscarRAG(RAG_OK);
  const { POST } = await import('@/app/api/chat/route');
  const res = await POST(fakeReq({ messages: [{ role: 'user', content: PREGUNTA }], mode: 'analisis_penal' }));
  const eventos = await leerSSE(res);
  return { eventos, texto: eventos.filter((e) => e.type === 'text').map((e) => e.text).join(''), done: eventos.find((e) => e.type === 'done') };
}

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  process.env.ANTHROPIC_API_KEY = 'fake-key';
  process.env.LLM_PROVIDER = 'anthropic';
  delete process.env.LUNA_ENABLED;
  delete process.env.OPENAI_API_KEY;
  openaiCreateMock = vi.fn().mockResolvedValue({ output_text: JSON.stringify(LUNA_OK), usage: { input_tokens: 800, output_tokens: 90 } });
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

describe('POST /api/chat — Luna (P26)', () => {
  it('apagada por defecto: responde el proveedor vigente y OpenAI no se toca (no regresión)', async () => {
    const { texto, done } = await correr(['flag_luna_responses']);
    expect(texto).toContain('Respuesta simulada del modelo.');
    expect(done.model).not.toBe('gpt-6-luna');
    expect(anthropicCreateMock).toHaveBeenCalled();
    expect(openaiCreateMock).not.toHaveBeenCalled();
  });

  it('entorno encendido pero sin la bandera del usuario: sigue el proveedor vigente', async () => {
    process.env.LUNA_ENABLED = '1'; process.env.OPENAI_API_KEY = 'sk-test-fake';
    const { texto } = await correr([]);
    expect(texto).toContain('Respuesta simulada del modelo.');
    expect(openaiCreateMock).not.toHaveBeenCalled();
  });

  it('doble llave encendida: responde Luna con referencia verificable y sin invocar al proveedor vigente', async () => {
    process.env.LUNA_ENABLED = '1'; process.env.OPENAI_API_KEY = 'sk-test-fake';
    const { texto, done } = await correr(['flag_luna_responses']);
    expect(texto).toContain('Codigo Procesal Penal, art. 173');
    expect(done.model).toBe('gpt-6-luna');
    expect(done.usage).toEqual({ inputTokens: 800, outputTokens: 90 });
    expect(done.citas.length).toBe(1);
    expect(anthropicCreateMock).not.toHaveBeenCalled();
    expect((openaiCreateMock as unknown as { mock: { calls: any[][] } }).mock.calls[0][0].store).toBe(false);
  });

  it('Luna falla (proveedor caído): se degrada al proveedor vigente y el usuario recibe respuesta', async () => {
    process.env.LUNA_ENABLED = '1'; process.env.OPENAI_API_KEY = 'sk-test-fake';
    openaiCreateMock = vi.fn().mockRejectedValue(new Error('upstream down'));
    mockDependenciasComunes(['flag_luna_responses']);
    await mockBuscarRAG(RAG_OK);
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(fakeReq({ messages: [{ role: 'user', content: PREGUNTA }], mode: 'analisis_penal' }));
    const eventos = await leerSSE(res);
    expect(eventos.filter((e) => e.type === 'text').map((e) => e.text).join('')).toContain('Respuesta simulada del modelo.');
    expect(openaiCreateMock as unknown as { mock: unknown }).toBeDefined();
  });
});
