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

function statefulSupabase(opts?: {
  readError?: { code: string; message: string };
  subs?: Record<string, { tier: string; status: string }>;
  authEmail?: string | null;
}) {
  const rows = new Map<string, { query_count: number; tier: string }>();
  let writeLock = Promise.resolve();
  function withLock<T>(fn: () => T): Promise<T> {
    const run = writeLock.then(fn);
    writeLock = run.then(() => undefined, () => undefined);
    return run;
  }
  const upsert = vi.fn();
  const from = vi.fn((table: string) => {
    const filtros: Record<string, unknown> = {};
    let patch: { query_count?: number; tier?: string } | null = null;
    let upsertRow: { user_identifier: string; query_date: string; query_count: number; tier: string } | null = null;
    let ignoreDuplicates = false;
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn(() => {
      if (patch) {
        const applied = patch;
        return withLock(() => {
          const key = `${filtros.user_identifier}|${filtros.query_date}`;
          const row = rows.get(key);
          if (!row) return { data: [], error: null };
          if (filtros.query_count !== undefined && row.query_count !== filtros.query_count) {
            return { data: [], error: null };
          }
          if (typeof applied.query_count === 'number') row.query_count = applied.query_count;
          if (typeof applied.tier === 'string') row.tier = applied.tier;
          return { data: [{ query_count: row.query_count, tier: row.tier }], error: null };
        });
      }
      if (upsertRow) {
        const row = upsertRow;
        upsert(row);
        return withLock(() => {
          const key = `${row.user_identifier}|${row.query_date}`;
          if (rows.has(key) && ignoreDuplicates) return { data: [], error: null };
          rows.set(key, { query_count: row.query_count, tier: row.tier });
          return { data: [rows.get(key)], error: null };
        });
      }
      return chain;
    });
    chain.eq = vi.fn((col: string, val: unknown) => {
      filtros[col] = val;
      return chain;
    });
    chain.single = vi.fn(async () => {
      if (opts?.readError && table === 'queries_log') {
        return { data: null, error: opts.readError };
      }
      if (table !== 'queries_log') return { data: null, error: null };
      const key = `${filtros.user_identifier}|${filtros.query_date}`;
      const data = rows.get(key) ?? null;
      return { data, error: data ? null : { code: 'PGRST116' } };
    });
    chain.maybeSingle = vi.fn(async () => ({
      data: table === 'subscriptions'
        ? opts?.subs?.[String(filtros.user_identifier)] ?? null
        : null,
      error: null,
    }));
    chain.update = vi.fn((p: { query_count?: number; tier?: string }) => {
      patch = p;
      return chain;
    });
    chain.upsert = vi.fn((row: typeof upsertRow, extra?: { ignoreDuplicates?: boolean }) => {
      upsertRow = row;
      ignoreDuplicates = Boolean(extra?.ignoreDuplicates);
      return chain;
    });
    return chain;
  });
  return {
    from,
    upsert,
    rows,
    auth: {
      getUser: async () => (
        opts?.authEmail
          ? { data: { user: { email: opts.authEmail } }, error: null }
          : { data: { user: null }, error: { message: 'no session' } }
      ),
    },
  };
}

function mockChatDeps(supabase: ReturnType<typeof statefulSupabase>, opts?: {
  anthropicError?: { status: number };
  hangAfterFirstChunk?: boolean;
  emptyCorpus?: boolean;
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
  if (opts?.emptyCorpus) {
    vi.doMock('@/lib/legal-retrieval/retrieval-session', async () => {
      const actual = await vi.importActual<typeof import('@/lib/legal-retrieval/retrieval-session')>(
        '@/lib/legal-retrieval/retrieval-session',
      );
      return {
        ...actual,
        recuperarEvidenciaCorpus: vi.fn().mockResolvedValue({
          texto: '',
          fragmentos: [],
          outcome: { state: 'NO_VERIFIED_EVIDENCE', evidenceCount: 0 },
        }),
      };
    });
  }
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
          if (opts?.hangAfterFirstChunk) {
            return (async function* () {
              yield { type: 'message_start', message: { usage: { input_tokens: 8 } } };
              yield { type: 'content_block_start', content_block: { type: 'text' } };
              yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'hola' } };
              await new Promise(() => { /* cliente aborta; el stream no termina */ });
            })();
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
    expect(sb.rows.size).toBeGreaterThan(0);

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
    const used = [...sb.rows.values()].reduce((n, r) => n + r.query_count, 0);
    expect(used).toBe(0);

    vi.resetModules();
    llamadasAnthropic.length = 0;
    mockChatDeps(sb);
    const { POST: POST2 } = await import('@/app/api/chat/route');
    const ok = await POST2(fakeReq(salaBody, headers));
    expect(ok.status).not.toBe(429);
    await drain(ok as unknown as Response);
    expect(llamadasAnthropic.length).toBe(1);
  });

  it('P1-1: pago nocturno tras gastar free → 200, no 429', async () => {
    const sb = statefulSupabase({
      authEmail: 'pagado@ejemplo.com',
      subs: { 'email:pagado@ejemplo.com': { tier: 'pro', status: 'active' } },
    });
    const { fechaDiaHn } = await import('@/lib/rate-limit');
    sb.rows.set(`email:pagado@ejemplo.com|${fechaDiaHn()}`, { query_count: 1, tier: 'free' });
    mockChatDeps(sb);
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(fakeReq(salaBody, {
      authorization: 'Bearer token',
      'x-forwarded-for': '192.0.2.80',
    }));
    expect(res.status).not.toBe(429);
    await drain(res as unknown as Response);
    expect(llamadasAnthropic.length).toBe(1);
  });

  it('P2-1: 5 POST paralelos misma IP → 1 con 200, 4 con 429, 1 Anthropic', async () => {
    const sb = statefulSupabase();
    mockChatDeps(sb);
    const { POST } = await import('@/app/api/chat/route');
    const headers = { 'x-vercel-forwarded-for': '203.0.113.77' };
    const results = await Promise.all(
      Array.from({ length: 5 }, () => POST(fakeReq(salaBody, headers))),
    );
    const denied = results.filter((r) => r.status === 429);
    const allowed = results.filter((r) => r.status !== 429);
    expect(allowed).toHaveLength(1);
    expect(denied).toHaveLength(4);
    await Promise.all(allowed.map((r) => drain(r as unknown as Response)));
    expect(llamadasAnthropic.length).toBe(1);
  });

  it('P2-2: cliente aborta tras el primer chunk → la siguiente consulta da 429', async () => {
    const sb = statefulSupabase();
    mockChatDeps(sb, { hangAfterFirstChunk: true });
    const { POST } = await import('@/app/api/chat/route');
    const headers = { 'x-forwarded-for': '198.51.100.44' };

    const first = await POST(fakeReq(salaBody, headers));
    expect(first.status).not.toBe(429);
    const reader = (first as unknown as Response).body!.getReader();
    await reader.read();
    await reader.cancel();

    vi.resetModules();
    mockChatDeps(sb);
    const { POST: POST2 } = await import('@/app/api/chat/route');
    const second = await POST2(fakeReq(salaBody, headers));
    expect(second.status).toBe(429);
    const body = await second.json();
    expect(body.code).toBe(FREE_DAILY_LIMIT_CODE);
  });

  it('P2-3: error 57014 en lectura → 503 y 0 llamadas a Anthropic', async () => {
    const sb = statefulSupabase({
      readError: { code: '57014', message: 'canceling statement due to statement timeout' },
    });
    mockChatDeps(sb);
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(fakeReq(salaBody, { 'x-forwarded-for': '192.0.2.14' }));
    expect(res.status).toBe(503);
    expect(llamadasAnthropic.length).toBe(0);
  });

  it('P2-4: aclaración RUTA_D no consume la consulta', async () => {
    const sb = statefulSupabase();
    mockChatDeps(sb);
    const { POST } = await import('@/app/api/chat/route');
    const headers = { 'x-forwarded-for': '203.0.113.8' };
    const aclaracion = { messages: [{ role: 'user', content: 'hola' }], mode: 'analisis' };
    const r1 = await POST(fakeReq(aclaracion, headers));
    expect(r1.status).not.toBe(429);
    await drain(r1 as unknown as Response);
    expect(llamadasAnthropic.length).toBe(0);
    const used = [...sb.rows.values()].reduce((n, r) => n + r.query_count, 0);
    expect(used).toBe(0);

    const r2 = await POST(fakeReq(salaBody, headers));
    expect(r2.status).not.toBe(429);
    await drain(r2 as unknown as Response);
    expect(llamadasAnthropic.length).toBe(1);
  });

  it('P2-4: abstención de corpus no consume la consulta', async () => {
    const sb = statefulSupabase();
    mockChatDeps(sb, { emptyCorpus: true });
    const { POST } = await import('@/app/api/chat/route');
    const headers = { 'x-forwarded-for': '203.0.113.9' };
    const analisis = {
      messages: [{
        role: 'user',
        content: 'Explica las medidas cautelares personales aplicables en el proceso penal hondureño.',
      }],
      mode: 'analisis_penal',
    };
    const r1 = await POST(fakeReq(analisis, headers));
    expect(r1.status).not.toBe(429);
    await drain(r1 as unknown as Response);
    expect(llamadasAnthropic.length).toBe(0);
    const used = [...sb.rows.values()].reduce((n, r) => n + r.query_count, 0);
    expect(used).toBe(0);

    vi.resetModules();
    llamadasAnthropic.length = 0;
    mockChatDeps(sb);
    const { POST: POST2 } = await import('@/app/api/chat/route');
    const r2 = await POST2(fakeReq(salaBody, headers));
    expect(r2.status).not.toBe(429);
    await drain(r2 as unknown as Response);
    expect(llamadasAnthropic.length).toBe(1);
  });
});
