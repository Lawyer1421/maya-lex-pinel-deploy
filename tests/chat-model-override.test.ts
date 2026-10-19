import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MODELO_HAIKU, MODELO_OPUS, MODELO_SONNET } from '@/lib/model-config';

const ORIGINAL_ENV = { ...process.env };

function fakeClaudeStream(text: string) {
  async function* gen() {
    yield { type: 'message_start', message: { usage: { input_tokens: 8 } } };
    yield { type: 'content_block_start', content_block: { type: 'text' } };
    yield { type: 'content_block_delta', delta: { type: 'text_delta', text } };
    yield { type: 'content_block_stop' };
    yield { type: 'message_delta', usage: { output_tokens: 3 } };
    yield { type: 'message_stop' };
  }
  return gen();
}

const llamadas: unknown[][] = [];

function mockChat(tier: string) {
  vi.doMock('next/server', async () => {
    const actual = await vi.importActual<typeof import('next/server')>('next/server');
    return { ...actual, after: (fn: () => unknown) => { fn(); } };
  });
  vi.doMock('@/lib/rate-limit', () => ({
    checkRateLimit: vi.fn().mockResolvedValue({
      allowed: true, remaining: 2, tier, resetAt: new Date().toISOString(),
    }),
    incrementRateLimit: vi.fn().mockResolvedValue(undefined),
    checkAndIncrementRateLimit: vi.fn().mockResolvedValue({
      allowed: true, remaining: 2, tier, resetAt: new Date().toISOString(),
    }),
    getVerifiedEmail: vi.fn().mockResolvedValue(tier === 'pro' ? 'pro@test.com' : null),
    getUserIdentifier: vi.fn().mockReturnValue('ip:test'),
    buildUserIdentifierFromEmail: (e: string) => `email:${e.trim().toLowerCase()}`,
  }));
  vi.doMock('@/lib/flags', () => ({
    isFlagEnabledForUser: vi.fn().mockResolvedValue(false),
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
  vi.doMock('@/lib/legal-retrieval/retrieval-session', () => ({
    recuperarEvidenciaCorpus: vi.fn().mockResolvedValue({
      texto: 'Artículo 1. Texto de prueba.',
      fragmentos: [{
        id: '1',
        contenido: 'Artículo 1. Texto de prueba.',
        fuente: 'Código Civil',
        num_articulo: '1',
        similarity: 0.9,
      }],
      outcome: { state: 'OK', evidenceCount: 1 },
    }),
    decidirAbstencion: vi.fn().mockReturnValue({
      evidenciaInsuficiente: false,
      esFalloDeSistema: false,
      mensajeAbstencion: '',
      codigoAbstencion: '',
    }),
  }));
  llamadas.length = 0;
  vi.doMock('@anthropic-ai/sdk', () => {
    class MockAPIError extends Error {}
    class MockAnthropic {
      messages = {
        create: async (...args: unknown[]) => {
          llamadas.push(args);
          return fakeClaudeStream('ok');
        },
      };
      static APIError = MockAPIError;
    }
    return { default: MockAnthropic };
  });
}

function fakeReq(body: unknown) {
  return { json: async () => body } as never;
}

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  process.env.ANTHROPIC_API_KEY = 'fake-key';
  process.env.LLM_PROVIDER = 'anthropic';
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

describe('POST /api/chat — override de modelo según plan', () => {
  it('anónimo/free que pide Opus en sala recibe Haiku y el system cachea el prompt estático', async () => {
    mockChat('free');
    const { POST } = await import('@/app/api/chat/route');
    await POST(fakeReq({
      messages: [{ role: 'user', content: 'Hola, una consulta breve de sala.' }],
      mode: 'sala_ia',
      modelOverride: MODELO_OPUS,
    }));
    expect(llamadas.length).toBeGreaterThan(0);
    const params = llamadas[0]?.[0] as {
      model: string;
      system: Array<{ text: string; cache_control?: { type: string } }>;
    };
    expect(params.model).toBe(MODELO_HAIKU);
    expect(params.system[0]?.cache_control).toEqual({ type: 'ephemeral' });
  });

  it('Pro que pide Opus en analisis recibe Sonnet', async () => {
    mockChat('pro');
    const { POST } = await import('@/app/api/chat/route');
    await POST(fakeReq({
      messages: [{ role: 'user', content: 'Cuál es el plazo de apelación civil?' }],
      mode: 'analisis',
      modelOverride: MODELO_OPUS,
    }));
    const params = llamadas[0]?.[0] as { model: string };
    expect(params.model).toBe(MODELO_SONNET);
  });

  it('Pro que pide Haiku en analisis no envía thinking', async () => {
    mockChat('pro');
    const { POST } = await import('@/app/api/chat/route');
    await POST(fakeReq({
      messages: [{ role: 'user', content: 'Cuál es el plazo de apelación civil?' }],
      mode: 'analisis',
      modelOverride: MODELO_HAIKU,
    }));
    const params = llamadas[0]?.[0] as { model: string; thinking?: unknown };
    expect(params.model).toBe(MODELO_HAIKU);
    expect(params.thinking).toBeUndefined();
  });

  it('default Sonnet en analisis envía thinking adaptive', async () => {
    mockChat('free');
    const { POST } = await import('@/app/api/chat/route');
    await POST(fakeReq({
      messages: [{ role: 'user', content: 'Cuál es el plazo de apelación civil?' }],
      mode: 'analisis',
    }));
    const params = llamadas[0]?.[0] as {
      model: string;
      thinking?: { type: string; display: string };
    };
    expect(params.model).toBe(MODELO_SONNET);
    expect(params.thinking).toEqual({ type: 'adaptive', display: 'summarized' });
  });

  it('free o Pro que pide Opus o Sonnet en sala recibe Haiku', async () => {
    for (const { tier, override } of [
      { tier: 'free', override: MODELO_OPUS },
      { tier: 'free', override: MODELO_SONNET },
      { tier: 'pro', override: MODELO_OPUS },
      { tier: 'pro', override: MODELO_SONNET },
    ]) {
      vi.resetModules();
      mockChat(tier);
      const { POST } = await import('@/app/api/chat/route');
      await POST(fakeReq({
        messages: [{ role: 'user', content: 'Hola, una consulta breve de sala.' }],
        mode: 'sala_ia',
        modelOverride: override,
      }));
      const params = llamadas[0]?.[0] as { model: string };
      expect(params.model).toBe(MODELO_HAIKU);
    }
  });
});
