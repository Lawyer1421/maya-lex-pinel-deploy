import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MODELO_OPUS, MODELO_SONNET } from '@/lib/model-config';

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
  it('anónimo/free que pide Opus recibe Sonnet y el system cachea el prompt estático', async () => {
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
    expect(params.model).toBe(MODELO_SONNET);
    expect(params.system[0]?.cache_control).toEqual({ type: 'ephemeral' });
  });

  it('Pro puede usar Opus', async () => {
    mockChat('pro');
    const { POST } = await import('@/app/api/chat/route');
    await POST(fakeReq({
      messages: [{ role: 'user', content: 'Hola, una consulta breve de sala.' }],
      mode: 'sala_ia',
      modelOverride: MODELO_OPUS,
    }));
    const params = llamadas[0]?.[0] as { model: string };
    expect(params.model).toBe(MODELO_OPUS);
  });
});
