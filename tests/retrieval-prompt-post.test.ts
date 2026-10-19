import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * POST simulado del chat: el request entra por el handler real de la ruta, el
 * RAG corre de verdad (cliente Supabase simulado con filtros) y se inspecciona el
 * system prompt que la ruta enviaría al modelo. No hay red ni credenciales. Esta
 * prueba verifica el texto enviado, no la conducta de un modelo real.
 */

const ORIGINAL_ENV = { ...process.env };
const FUENTE_CIVIL = 'Código Civil de Honduras (Decreto del Poder Ejecutivo del 8 de febrero de 1906)';

const filaCivilDivorcio = {
  id: 'civil-divorcio',
  contenido: 'Artículo 1. El matrimonio se disuelve por divorcio en los casos que la ley establece.',
  num_articulo: '1', fuente: FUENTE_CIVIL, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true,
  materia: '02_CIVIL', similarity: 0.9,
};

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

const llamadasModelo: unknown[][] = [];

function mockDependencias() {
  vi.doMock('next/server', async () => {
    const actual = await vi.importActual<typeof import('next/server')>('next/server');
    return { ...actual, after: (fn: () => unknown) => { fn(); } };
  });
  vi.doMock('@/lib/rate-limit', () => ({
    checkRateLimit: vi.fn().mockResolvedValue({
      allowed: true, remaining: 2, tier: 'free', resetAt: new Date().toISOString(),
    }),
    incrementRateLimit: vi.fn().mockResolvedValue(undefined),
    checkAndIncrementRateLimit: vi.fn().mockResolvedValue({
      allowed: true, remaining: 2, tier: 'free', resetAt: new Date().toISOString(),
    }),
    getUserIdentifierVerificado: vi.fn().mockResolvedValue('ip:test'),
    getVerifiedEmail: vi.fn().mockResolvedValue(null),
    getUserIdentifier: vi.fn().mockReturnValue('ip:test'),
    buildUserIdentifierFromEmail: (e: string) => `email:${e.trim().toLowerCase()}`,
  }));
  vi.doMock('@/lib/flags', () => ({ isFlagEnabledForUser: vi.fn().mockResolvedValue(false) }));
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
  llamadasModelo.length = 0;
  vi.doMock('@anthropic-ai/sdk', () => {
    class MockAPIError extends Error {}
    class MockAnthropic {
      messages = {
        create: async (...args: unknown[]) => {
          llamadasModelo.push(args);
          return fakeClaudeStream('Respuesta simulada del modelo.');
        },
      };
      static APIError = MockAPIError;
    }
    return { default: MockAnthropic };
  });

  // Cliente Supabase: RPC de búsqueda semántica (filtra materia_filtro) y tabla vacía
  // para el resto de consultas de la ruta.
  const rpc = vi.fn(async (_n: string, params: Record<string, unknown>) => {
    const materia = params.materia_filtro as string | null;
    return { data: [filaCivilDivorcio].filter((f) => materia === null || f.materia === materia), error: null };
  });
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null }),
  };
  vi.doMock('@/lib/supabase', () => ({
    createServerSupabaseClient: () => ({ from: vi.fn(() => chain), rpc }),
  }));
  vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));
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
  return raw.split('\n\n').filter((c) => c.startsWith('data: ')).map((c) => JSON.parse(c.slice('data: '.length)));
}

import { textoDeSystem } from '@/lib/system-prompt';

/** Bloque de contexto RAG dentro del system prompt enviado al modelo. */
function bloqueContexto(system: unknown): string {
  const texto = textoDeSystem(system as never);
  const ini = texto.indexOf('── CONTEXTO RECUPERADO');
  const fin = texto.indexOf('── FIN DEL CONTEXTO RAG ──');
  return ini === -1 ? '' : texto.slice(ini, fin === -1 ? undefined : fin);
}

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  process.env.ANTHROPIC_API_KEY = 'fake-key';
  process.env.LLM_PROVIDER = 'anthropic';
  process.env.RAG_BACKEND = 'supabase';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

describe('POST /api/chat — system prompt final para «ley sobre el divorcio»', () => {
  it('el contexto enviado al modelo presenta la consulta como temática y cita la fuente real', async () => {
    mockDependencias();
    const { POST } = await import('@/app/api/chat/route');

    const res = await POST(fakeReq({
      messages: [{ role: 'user', content: 'Según la ley sobre el divorcio, ¿qué procede?' }],
      mode: 'analisis',
    }));
    await leerSSE(res);

    expect(llamadasModelo.length).toBeGreaterThan(0);
    const system = textoDeSystem((llamadasModelo[0][0] as { system: unknown }).system);
    const contexto = bloqueContexto(system);

    expect(contexto).toContain('CONSULTA TEMÁTICA');
    expect(contexto).toContain(`Fuente documental: ${FUENTE_CIVIL}`);
    // Ninguna fuente toma la expresión temática del usuario como título
    expect(contexto).not.toMatch(/Fuente documental: [^\n]*divorcio/i);
    // Sin relevancia jurídica declarada para el contexto temático
    expect(contexto).not.toContain('relevancia:');
    expect(contexto).toContain('similitud de recuperación:');
    expect(contexto).toContain('sin evaluación de relevancia jurídica');
  });
});
