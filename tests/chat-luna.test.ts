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

  anthropicCreateMock = vi.fn().mockImplementation(async () => fakeClaudeStream('Respuesta simulada del modelo. Según el artículo 173 del Código Procesal Penal, las medidas cautelares personales proceden cuando existan indicios racionales de participación.'));
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
  id: 'mayalex_normativos:cpp_a173', contenido: 'ARTICULO 173.- Las medidas cautelares personales proceden cuando existan indicios racionales de participación.', num_articulo: '173',
  fuente: 'Codigo Procesal Penal', relevancia: 0.9, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, hash: 'abcd1234',
};
const NO_CITADO = { ...FRAGMENTO, id: 'mayalex_normativos:cpp_a174', num_articulo: '174', hash: 'ffff0000', contenido: 'ARTICULO 174.- Otro texto sintético.' };
const RAG_OK = {
  fragmentos: [FRAGMENTO, NO_CITADO], articulos_encontrados: ['173'], backend: 'supabase' as const,
  outcome: { state: 'SEMANTIC_SUCCESS', evidenceCount: 2, exactAttempted: false, semanticAttempted: true, degraded: false },
};
const PREGUNTA = '¿Qué dispone el artículo 173 del Código Procesal Penal sobre las medidas cautelares personales?';
const LUNA_OK = { decision: 'ANSWER', abstention_reason: null, claims: [{ claim_id: 'c1', text: 'Las medidas cautelares personales proceden cuando existan indicios racionales de participación.', citations: [{ chunk_id: FRAGMENTO.id, support: 'DIRECT' }] }] };
const CONSENTIMIENTO = { modalidad: 'consulta_juridica_general', aceptado: true, aviso_version: '2026-10-29.v1' };

function encender() {
  process.env.LUNA_ENABLED = '1'; process.env.OPENAI_API_KEY = 'sk-test-fake'; process.env.LUNA_COST_COUNTER = 'local_canary_only';
}

async function preparar(flags: string[]) {
  mockDependenciasComunes(flags);
  await mockBuscarRAG(RAG_OK);
  const { POST } = await import('@/app/api/chat/route');
  return POST;
}

async function pedir(POST: (r: any) => Promise<Response>, luna?: unknown, pregunta = PREGUNTA) {
  const res = await POST(fakeReq({ messages: [{ role: 'user', content: pregunta }], mode: 'analisis_penal', ...(luna === undefined ? {} : { luna }) }));
  const eventos = await leerSSE(res);
  return { eventos, texto: eventos.filter((e) => e.type === 'text').map((e) => e.text).join(''), done: eventos.find((e) => e.type === 'done') };
}

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  process.env.ANTHROPIC_API_KEY = 'fake-key';
  process.env.LLM_PROVIDER = 'anthropic';
  delete process.env.LUNA_ENABLED; delete process.env.OPENAI_API_KEY; delete process.env.LUNA_COST_COUNTER;
  openaiCreateMock = vi.fn().mockResolvedValue({ output_text: JSON.stringify(LUNA_OK), usage: { input_tokens: 800, output_tokens: 90 } });
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

describe('POST /api/chat — Luna (P26, modalidad consulta jurídica general)', () => {
  it('apagada por defecto: aunque el usuario pida la modalidad responde el proveedor vigente y OpenAI no se toca', async () => {
    const POST = await preparar(['flag_luna_responses']);
    const { texto, done } = await pedir(POST, CONSENTIMIENTO);
    expect(texto).toContain('medidas cautelares personales proceden');
    expect(done.model).not.toBe('gpt-6-luna');
    expect(done.luna).toBe('no_aplicada');
    expect(openaiCreateMock).not.toHaveBeenCalled();
  });

  it('sin la modalidad explícita (no hay campo luna) nunca corre Luna, aunque todo esté encendido', async () => {
    encender();
    const POST = await preparar(['flag_luna_responses']);
    const { texto, done } = await pedir(POST);
    expect(texto).toContain('medidas cautelares personales proceden');
    expect(done.luna).toBeUndefined();
    expect(openaiCreateMock).not.toHaveBeenCalled();
  });

  it.each([
    ['aviso no aceptado', { ...CONSENTIMIENTO, aceptado: false }, 'AVISO_NO_ACEPTADO'],
    ['aceptación como texto', { ...CONSENTIMIENTO, aceptado: 'true' }, 'AVISO_NO_ACEPTADO'],
    ['versión de aviso vencida', { ...CONSENTIMIENTO, aviso_version: '2025-01-01' }, 'AVISO_VERSION_DISTINTA'],
  ])('%s: va por el proveedor actual y no se llama a OpenAI', async (_n, luna, motivo) => {
    encender();
    const POST = await preparar(['flag_luna_responses']);
    const { texto, done } = await pedir(POST, luna);
    expect(texto).toContain('medidas cautelares personales proceden');
    expect(done.luna_motivo).toBe(motivo);
    expect(openaiCreateMock).not.toHaveBeenCalled();
  });

  it('modalidad + aviso + doble llave: responde Luna; el SSE trae SOLO la cita validada, en el contrato Cita del frontend', async () => {
    encender();
    const POST = await preparar(['flag_luna_responses']);
    const { texto, done } = await pedir(POST, CONSENTIMIENTO);
    expect(texto).toContain('Codigo Procesal Penal, art. 173');
    expect(done.model).toBe('gpt-6-luna');
    expect(done.luna).toBe('aplicada');
    expect(done.citas).toEqual([{ articulo: '173', texto: FRAGMENTO.contenido, fuente: 'Codigo Procesal Penal', vigente: true, hash: 'abcd1234' }]);
    // El fragmento 174 se recuperó y se envió como evidencia, pero Luna no lo citó: NO aparece.
    expect(JSON.stringify(done.citas)).not.toContain('174');
    expect(anthropicCreateMock).not.toHaveBeenCalled();
    const cuerpo = (openaiCreateMock as unknown as { mock: { calls: any[][] } }).mock.calls[0][0];
    expect(cuerpo.store).toBe(false);
    expect(Object.keys(JSON.parse(cuerpo.input)).sort()).toEqual(['evidence', 'question']);
  });

  it('una cita no validada (cita fuera de la evidencia) no aparece: la respuesta cae al proveedor vigente y las citas son las de producción', async () => {
    encender();
    openaiCreateMock = vi.fn().mockResolvedValue({ output_text: JSON.stringify({ ...LUNA_OK, claims: [{ ...LUNA_OK.claims[0], citations: [{ chunk_id: 'inventado', support: 'DIRECT' }] }] }), usage: { input_tokens: 800, output_tokens: 90 } });
    const POST = await preparar(['flag_luna_responses']);
    const { texto, done } = await pedir(POST, CONSENTIMIENTO);
    expect(texto).toContain('medidas cautelares personales proceden');
    expect(done.luna_motivo).toBe('SALIDA_INVALIDA');
    expect(JSON.stringify(done.citas)).not.toContain('inventado');
  });

  it('consulta con datos de un caso concreto: se deriva al proveedor actual SIN llamar a OpenAI', async () => {
    encender();
    const POST = await preparar(['flag_luna_responses']);
    const { texto, done } = await pedir(POST, CONSENTIMIENTO, 'Mi cliente Juan Pérez fue detenido el 3 de mayo de 2024, ¿qué dice el artículo 173 del Código Procesal Penal?');
    expect(texto).toContain('medidas cautelares personales proceden');
    expect(String(done.luna_motivo)).toMatch(/^PRIVACIDAD_/);
    expect(openaiCreateMock).not.toHaveBeenCalled();
  });

  it('Luna falla (proveedor caído): se degrada al proveedor vigente y el usuario recibe respuesta', async () => {
    encender();
    openaiCreateMock = vi.fn().mockRejectedValue(new Error('upstream down'));
    const POST = await preparar(['flag_luna_responses']);
    const { texto } = await pedir(POST, CONSENTIMIENTO);
    expect(texto).toContain('medidas cautelares personales proceden');
    expect((openaiCreateMock as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(1);
  });

  it('KILL SWITCH: apagar la bandera (fila de feature_flags) corta Luna en la solicitud siguiente, sin redeploy y sin escribir nada', async () => {
    encender();
    const flags = ['flag_luna_responses'];
    mockDependenciasComunes(flags);
    await mockBuscarRAG(RAG_OK);
    const { POST } = await import('@/app/api/chat/route');   // un solo módulo cargado: no hay redeploy ni reinicio entre las dos solicitudes
    const antes = await pedir(POST, CONSENTIMIENTO);
    expect(antes.done.luna).toBe('aplicada');
    flags.length = 0;                                         // el propietario pone enabled=false en la fila
    const despues = await pedir(POST, CONSENTIMIENTO);
    expect(despues.texto).toContain('medidas cautelares personales proceden');
    expect(despues.done.luna).toBe('no_aplicada');
    expect((openaiCreateMock as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(1);
  });
});
