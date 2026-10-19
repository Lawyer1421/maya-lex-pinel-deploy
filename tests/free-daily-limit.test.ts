import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FREE_DAILY_LIMIT_CODE } from '@/lib/rate-limit';

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

const llamadasAnthropic: unknown[][] = [];

function statefulSupabase() {
  const rows = new Map<string, { query_count: number; tier: string }>();
  const upsert = vi.fn(async (row: {
    user_identifier: string;
    query_date: string;
    query_count: number;
    tier: string;
  }) => {
    rows.set(`${row.user_identifier}|${row.query_date}`, {
      query_count: row.query_count,
      tier: row.tier,
    });
    return { error: null };
  });
  const from = vi.fn((table: string) => {
    const filtros: Record<string, unknown> = {};
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn((col: string, val: unknown) => {
      filtros[col] = val;
      return chain;
    });
    chain.single = vi.fn(async () => {
      if (table !== 'queries_log') return { data: null, error: null };
      const key = `${filtros.user_identifier}|${filtros.query_date}`;
      const data = rows.get(key) ?? null;
      return { data, error: data ? null : { code: 'PGRST116' } };
    });
    chain.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    chain.upsert = upsert;
    return chain;
  });
  return {
    from,
    upsert,
    rows,
    auth: {
      getUser: async () => ({ data: { user: null }, error: { message: 'no session' } }),
    },
  };
}

function mockChatDeps(supabase: ReturnType<typeof statefulSupabase>, opts?: {
  anthropicError?: { status: number };
}) {
  vi.doMock('next/server', async () => {
    const actual = await vi.importActual<typeof import('next/server')>('next/server');
    return { ...actual, after: (fn: () => unknown) => { fn(); } };
  });
  vi.doMock('@/lib/supabase', () => ({
    createServerSupabaseClient: () => supabase,
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
  vi.doMock('@anthropic-ai/sdk', () => {
    class MockAPIError extends Error {
      status: number;
      constructor(message: string, status: number) {
        super(message);
        this.status = status;
      }
    }
    class MockAnthropic {
      messages = {
        create: async (...args: unknown[]) => {
          llamadasAnthropic.push(args);
          if (opts?.anthropicError) {
            throw new MockAPIError('fallo del modelo', opts.anthropicError.status);
          }
          return fakeClaudeStream('ok');
        },
      };
      static APIError = MockAPIError;
    }
    return { default: MockAnthropic };
  });
}

function fakeReq(body: unknown, headers?: Record<string, string>) {
  return {
    json: async () => body,
    headers: {
      get: (name: string) => {
        const key = name.toLowerCase();
        const found = Object.entries(headers ?? {}).find(([k]) => k.toLowerCase() === key);
        return found?.[1] ?? null;
      },
    },
  } as never;
}

async function drain(res: Response) {
  if (!res.body) return;
  const reader = res.body.getReader();
  while (!(await reader.read()).done) { /* consume start() */ }
}

const salaBody = {
  messages: [{ role: 'user', content: 'Hola, una consulta breve de sala.' }],
  mode: 'sala_ia',
};

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  llamadasAnthropic.length = 0;
  process.env.ANTHROPIC_API_KEY = 'fake-key';
  process.env.LLM_PROVIDER = 'anthropic';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  delete process.env.FREE_TIER_DAILY_LIMIT;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

describe('POST /api/chat — cuota free 1/día', () => {
  it('FREE: 1.ª consulta 200; 2.ª 429 FREE_DAILY_LIMIT y Anthropic no se invoca', async () => {
    const sb = statefulSupabase();
    mockChatDeps(sb);
    const { POST } = await import('@/app/api/chat/route');
    const headers = { 'x-vercel-forwarded-for': '203.0.113.10' };

    const r1 = await POST(fakeReq(salaBody, headers));
    expect(r1.status).not.toBe(429);
    await drain(r1 as unknown as Response);
    expect(llamadasAnthropic.length).toBe(1);
    expect(sb.upsert).toHaveBeenCalled();

    const r2 = await POST(fakeReq(salaBody, headers));
    expect(r2.status).toBe(429);
    const body = await r2.json();
    expect(body.code).toBe(FREE_DAILY_LIMIT_CODE);
    expect(body.plans).toEqual(['academico', 'premium']);
    expect(body.resetAt).toEqual(expect.any(String));
    expect(llamadasAnthropic.length).toBe(1);
  });

  it('anónimo: dos IPs tienen cuotas independientes', async () => {
    const sb = statefulSupabase();
    mockChatDeps(sb);
    const { POST } = await import('@/app/api/chat/route');

    const a = await POST(fakeReq(salaBody, { 'x-vercel-forwarded-for': '198.51.100.1' }));
    await drain(a as unknown as Response);
    const a2 = await POST(fakeReq(salaBody, { 'x-vercel-forwarded-for': '198.51.100.1' }));
    expect(a2.status).toBe(429);

    const b = await POST(fakeReq(salaBody, { 'x-vercel-forwarded-for': '198.51.100.2' }));
    expect(b.status).not.toBe(429);
    await drain(b as unknown as Response);
    expect(llamadasAnthropic.length).toBe(2);
  });

  it('fallo 5xx del modelo en la 1.ª consulta no consume la cuota', async () => {
    const sb = statefulSupabase();
    mockChatDeps(sb, { anthropicError: { status: 500 } });
    const { POST } = await import('@/app/api/chat/route');
    const headers = { 'x-forwarded-for': '192.0.2.40' };

    const fail = await POST(fakeReq(salaBody, headers));
    await drain(fail as unknown as Response);
    expect(llamadasAnthropic.length).toBe(1);
    expect(sb.upsert).not.toHaveBeenCalled();

    vi.resetModules();
    llamadasAnthropic.length = 0;
    mockChatDeps(sb);
    const { POST: POST2 } = await import('@/app/api/chat/route');
    const ok = await POST2(fakeReq(salaBody, headers));
    expect(ok.status).not.toBe(429);
    await drain(ok as unknown as Response);
    expect(llamadasAnthropic.length).toBe(1);
    expect(sb.upsert).toHaveBeenCalled();
  });
});
