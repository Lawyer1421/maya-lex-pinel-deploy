import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resolveTierForNewDay,
  parseDailyLimit,
  fechaDiaHn,
  resetAtMedianocheHn,
  getUserIdentifier,
  esFalloProveedorQueDevuelveCuota,
  esFalloOpenRouterQueDevuelveCuota,
  esAbortDelCliente,
} from '@/lib/rate-limit';

describe('resolveTierForNewDay — no defaultar a free si PayPal está active', () => {
  it('active + academico → academico', () => {
    expect(resolveTierForNewDay({
      subscriptionStatus: 'active',
      subscriptionTier: 'academico',
    })).toBe('academico');
  });

  it('active + pro → pro', () => {
    expect(resolveTierForNewDay({
      subscriptionStatus: 'active',
      subscriptionTier: 'pro',
    })).toBe('pro');
  });

  it('active + admin → admin', () => {
    expect(resolveTierForNewDay({
      subscriptionStatus: 'active',
      subscriptionTier: 'admin',
    })).toBe('admin');
  });

  it('sin suscripción o free → free', () => {
    expect(resolveTierForNewDay({
      subscriptionStatus: null,
      subscriptionTier: null,
    })).toBe('free');
    expect(resolveTierForNewDay({
      subscriptionStatus: 'active',
      subscriptionTier: 'free',
    })).toBe('free');
  });

  it('trialing / past_due / cancelled no heredan el tier de pago', () => {
    expect(resolveTierForNewDay({
      subscriptionStatus: 'trialing',
      subscriptionTier: 'pro',
    })).toBe('free');
    expect(resolveTierForNewDay({
      subscriptionStatus: 'past_due',
      subscriptionTier: 'academico',
    })).toBe('free');
    expect(resolveTierForNewDay({
      subscriptionStatus: 'cancelled',
      subscriptionTier: 'pro',
    })).toBe('free');
  });
});

function fakeSupabase(opts: {
  usage: { query_count: number; tier: string } | null;
  sub: { tier: string; status: string } | null;
  readError?: { code: string; message: string };
  casAlwaysMiss?: boolean;
}) {
  const upsert = vi.fn();
  const update = vi.fn();
  const from = vi.fn((table: string) => {
    let mode: 'read' | 'update' | 'upsert' = 'read';
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    chain.select = vi.fn(() => {
      if (mode === 'update' || mode === 'upsert') {
        if (opts.casAlwaysMiss) {
          return Promise.resolve({ data: [], error: null });
        }
      }
      if (mode === 'update') {
        return Promise.resolve({
          data: opts.usage ? [{ query_count: opts.usage.query_count + 1 }] : [],
          error: null,
        });
      }
      if (mode === 'upsert') {
        return Promise.resolve({ data: [{ query_count: 1 }], error: null });
      }
      return chain;
    });
    chain.eq = vi.fn(self);
    chain.single = vi.fn().mockResolvedValue({
      data: opts.readError ? null : table === 'queries_log' ? opts.usage : opts.sub,
      error: opts.readError ?? (opts.usage || table !== 'queries_log' ? null : { code: 'PGRST116' }),
    });
    chain.maybeSingle = vi.fn().mockResolvedValue({
      data: table === 'subscriptions' ? opts.sub : opts.usage,
      error: null,
    });
    chain.update = vi.fn((patch: unknown) => {
      mode = 'update';
      update(patch);
      return chain;
    });
    chain.upsert = vi.fn((row: unknown, extra?: unknown) => {
      mode = 'upsert';
      upsert(row, extra);
      return chain;
    });
    return chain;
  });
  return { from, upsert, update };
}

async function freshRateLimit(supabase: { from: ReturnType<typeof vi.fn> }) {
  vi.resetModules();
  vi.doMock('@/lib/supabase', () => ({
    createServerSupabaseClient: () => supabase,
  }));
  return import('@/lib/rate-limit');
}

describe('checkAndIncrementRateLimit — día nuevo hereda billing tier', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    delete process.env.FREE_TIER_DAILY_LIMIT;
    delete process.env.ACADEMICO_TIER_DAILY_LIMIT;
    delete process.env.PRO_TIER_DAILY_LIMIT;
  });

  it('sin queries_log hoy + PayPal academico active → escribe academico, no free (tope 20)', async () => {
    const sb = fakeSupabase({
      usage: null,
      sub: { tier: 'academico', status: 'active' },
    });
    const { checkAndIncrementRateLimit } = await freshRateLimit(sb);
    const result = await checkAndIncrementRateLimit('email:alumno@ejemplo.com');
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('academico');
    if (result.allowed) {
      expect(result.remaining).toBe(19);
    }
    expect(sb.upsert).toHaveBeenCalled();
    const row = sb.upsert.mock.calls[0][0];
    expect(row.tier).toBe('academico');
    expect(row.query_count).toBe(1);
  });

  it('sin queries_log hoy + PayPal pro active → escribe pro, no free (tope 1000)', async () => {
    const sb = fakeSupabase({
      usage: null,
      sub: { tier: 'pro', status: 'active' },
    });
    const { checkAndIncrementRateLimit } = await freshRateLimit(sb);
    const result = await checkAndIncrementRateLimit('email:abogado@ejemplo.com');
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('pro');
    if (result.allowed) {
      expect(result.remaining).toBe(999);
    }
    const row = sb.upsert.mock.calls[0][0];
    expect(row.tier).toBe('pro');
  });

  it('sin queries_log hoy + sin suscripción → free (tope 1)', async () => {
    const sb = fakeSupabase({ usage: null, sub: null });
    const { checkAndIncrementRateLimit } = await freshRateLimit(sb);
    const result = await checkAndIncrementRateLimit('email:free@ejemplo.com');
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('free');
    if (result.allowed) {
      expect(result.remaining).toBe(0);
    }
    expect(sb.upsert.mock.calls[0][0].tier).toBe('free');
  });

  it('fila free de hoy + PayPal pro active → hereda pro (pago nocturno)', async () => {
    const sb = fakeSupabase({
      usage: { query_count: 1, tier: 'free' },
      sub: { tier: 'pro', status: 'active' },
    });
    const { checkAndIncrementRateLimit } = await freshRateLimit(sb);
    const result = await checkAndIncrementRateLimit('email:abogado@ejemplo.com');
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('pro');
    expect(sb.update).toHaveBeenCalled();
    expect(sb.update.mock.calls[0][0].tier).toBe('pro');
  });
});

describe('getRateLimitStatus — día nuevo muestra el tope de facturación', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  });

  it('sin fila hoy + academico active → limit 20, used 0, no incrementa', async () => {
    const sb = fakeSupabase({
      usage: null,
      sub: { tier: 'academico', status: 'active' },
    });
    const { getRateLimitStatus } = await freshRateLimit(sb);
    const status = await getRateLimitStatus('email:alumno@ejemplo.com');
    expect(status.tier).toBe('academico');
    expect(status.used).toBe(0);
    expect(status.limit).toBe(20);
    expect(sb.upsert).not.toHaveBeenCalled();
  });
});

describe('parseDailyLimit — ausente o inválido cae a 1', () => {
  it('undefined, vacío, 0, negativo o NaN → fallback', () => {
    expect(parseDailyLimit(undefined, 1)).toBe(1);
    expect(parseDailyLimit('', 1)).toBe(1);
    expect(parseDailyLimit('0', 1)).toBe(1);
    expect(parseDailyLimit('-3', 1)).toBe(1);
    expect(parseDailyLimit('abc', 1)).toBe(1);
    expect(parseDailyLimit('2', 1)).toBe(2);
  });
});

describe('día America/Tegucigalpa', () => {
  it('fecha y reset usan medianoche HN (UTC-6)', () => {
    const tardeDel19 = new Date('2026-10-20T05:30:00.000Z'); // 19-oct 23:30 HN
    const madrugadaDel20 = new Date('2026-10-20T06:01:00.000Z'); // 20-oct 00:01 HN
    expect(fechaDiaHn(tardeDel19)).toBe('2026-10-19');
    expect(fechaDiaHn(madrugadaDel20)).toBe('2026-10-20');
    expect(resetAtMedianocheHn(tardeDel19)).toBe('2026-10-20T06:00:00.000Z');
  });
});

describe('getUserIdentifier — IP de Vercel y respaldo x-forwarded-for', () => {
  it('prioriza x-vercel-forwarded-for; si no, primer valor de x-forwarded-for', () => {
    expect(getUserIdentifier(new Request('http://x', {
      headers: { 'x-vercel-forwarded-for': '1.1.1.1', 'x-forwarded-for': '9.9.9.9' },
    }))).toBe('ip:1.1.1.1');
    expect(getUserIdentifier(new Request('http://x', {
      headers: { 'x-forwarded-for': '2.2.2.2, 8.8.8.8' },
    }))).toBe('ip:2.2.2.2');
  });
});

function statefulSupabase(subs: Record<string, { tier: string; status: string }> = {}) {
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
      if (table !== 'queries_log') return { data: null, error: null };
      const key = `${filtros.user_identifier}|${filtros.query_date}`;
      const data = rows.get(key) ?? null;
      return { data, error: data ? null : { code: 'PGRST116' } };
    });
    chain.maybeSingle = vi.fn(async () => ({
      data: table === 'subscriptions' ? subs[String(filtros.user_identifier)] ?? null : null,
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
  return { from, upsert, rows };
}

describe('cuota free 1/día — chequeo, reinicio HN y planes de pago', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    delete process.env.FREE_TIER_DAILY_LIMIT;
    delete process.env.ACADEMICO_TIER_DAILY_LIMIT;
    delete process.env.PRO_TIER_DAILY_LIMIT;
  });

  it('segunda consulta free el mismo día HN se deniega; tras medianoche vuelve a 1', async () => {
    const antes = new Date('2026-10-20T05:30:00.000Z');
    const despues = new Date('2026-10-20T06:01:00.000Z');
    const sb = statefulSupabase();
    const { checkRateLimit, incrementRateLimit } = await freshRateLimit(sb);

    const primera = await checkRateLimit('ip:10.0.0.1', antes);
    expect(primera.allowed).toBe(true);
    await incrementRateLimit('ip:10.0.0.1', 'free', antes);

    const segunda = await checkRateLimit('ip:10.0.0.1', antes);
    expect(segunda.allowed).toBe(false);
    if (!segunda.allowed) expect(segunda.resetAt).toBe('2026-10-20T06:00:00.000Z');

    const nuevoDia = await checkRateLimit('ip:10.0.0.1', despues);
    expect(nuevoDia.allowed).toBe(true);
  });

  it('dos IPs tienen cuotas independientes', async () => {
    const sb = statefulSupabase();
    const { checkRateLimit, incrementRateLimit } = await freshRateLimit(sb);
    await incrementRateLimit('ip:1.1.1.1', 'free');
    expect((await checkRateLimit('ip:1.1.1.1')).allowed).toBe(false);
    expect((await checkRateLimit('ip:2.2.2.2')).allowed).toBe(true);
  });

  it('Académico, Premium y PayPal active no reciben 429 por la cuota free', async () => {
    const sbAca = statefulSupabase({
      'email:alumno@ejemplo.com': { tier: 'academico', status: 'active' },
    });
    const { checkRateLimit: checkAca, incrementRateLimit: incAca } = await freshRateLimit(sbAca);
    await incAca('email:alumno@ejemplo.com', 'academico');
    expect((await checkAca('email:alumno@ejemplo.com')).allowed).toBe(true);

    const sbPro = statefulSupabase({
      'email:abogado@ejemplo.com': { tier: 'pro', status: 'active' },
    });
    const { checkRateLimit: checkPro, incrementRateLimit: incPro } = await freshRateLimit(sbPro);
    await incPro('email:abogado@ejemplo.com', 'pro');
    expect((await checkPro('email:abogado@ejemplo.com')).allowed).toBe(true);
  });

  it('pago a las 19:00 HN tras gastar la consulta gratis → permite (no 429)', async () => {
    const at1900Hn = new Date('2026-10-20T01:00:00.000Z'); // 19:00 HN del 19-oct
    const sb = statefulSupabase({
      'email:pagado@ejemplo.com': { tier: 'pro', status: 'active' },
    });
    const { fechaDiaHn: diaHn, reserveRateLimit } = await freshRateLimit(sb);
    sb.rows.set(`email:pagado@ejemplo.com|${diaHn(at1900Hn)}`, {
      query_count: 1,
      tier: 'free',
    });
    const r = await reserveRateLimit('email:pagado@ejemplo.com', at1900Hn);
    expect(r.allowed).toBe(true);
    expect(r.tier).toBe('pro');
  });

  it('8 reintentos CAS agotados → RESERVE_EXHAUSTED, no 429 free', async () => {
    const sb = fakeSupabase({
      usage: { query_count: 0, tier: 'pro' },
      sub: { tier: 'pro', status: 'active' },
      casAlwaysMiss: true,
    });
    const { reserveRateLimit, RESERVE_EXHAUSTED_CODE } = await freshRateLimit(sb);
    await expect(reserveRateLimit('email:abogado@ejemplo.com')).rejects.toMatchObject({
      name: 'RateLimitStoreError',
      code: RESERVE_EXHAUSTED_CODE,
    });
  });

  it('lectura queries_log 57014 lanza RateLimitStoreError', async () => {
    const sb = fakeSupabase({
      usage: null,
      sub: null,
      readError: { code: '57014', message: 'canceling statement due to statement timeout' },
    });
    const { checkRateLimit, RateLimitStoreError } = await freshRateLimit(sb);
    await expect(checkRateLimit('ip:10.0.0.9')).rejects.toMatchObject({
      name: 'RateLimitStoreError',
      code: '57014',
    });
    expect(RateLimitStoreError).toBeDefined();
  });

  it('FREE_TIER_DAILY_LIMIT inválido o ausente → tope 1', async () => {
    process.env.FREE_TIER_DAILY_LIMIT = '0';
    const sb = statefulSupabase();
    const { checkAndIncrementRateLimit } = await freshRateLimit(sb);
    const r = await checkAndIncrementRateLimit('email:free@ejemplo.com');
    expect(r.allowed).toBe(true);
    if (r.allowed) expect(r.remaining).toBe(0);
    const r2 = await checkAndIncrementRateLimit('email:free@ejemplo.com');
    expect(r2.allowed).toBe(false);
  });
});

describe('esFalloProveedorQueDevuelveCuota', () => {
  it('429 / 5xx / 529 / timeout sí; abort del cliente no', () => {
    expect(esFalloProveedorQueDevuelveCuota({ status: 500, name: 'APIError' })).toBe(true);
    expect(esFalloProveedorQueDevuelveCuota({ status: 429, name: 'APIError' })).toBe(true);
    expect(esFalloProveedorQueDevuelveCuota({ status: 529, name: 'APIError' })).toBe(true);
    expect(esFalloProveedorQueDevuelveCuota({ name: 'APIConnectionTimeoutError' })).toBe(true);
    expect(esAbortDelCliente({ name: 'AbortError', message: 'aborted' })).toBe(true);
    expect(esFalloProveedorQueDevuelveCuota({ name: 'AbortError', message: 'aborted' })).toBe(false);
    expect(esFalloProveedorQueDevuelveCuota({ name: 'APIUserAbortError' })).toBe(false);
    expect(esFalloProveedorQueDevuelveCuota({ status: 401, name: 'APIError' })).toBe(false);
    expect(esFalloOpenRouterQueDevuelveCuota('OpenRouter HTTP 429: overloaded')).toBe(true);
    expect(esFalloOpenRouterQueDevuelveCuota('OpenRouter HTTP 503: down')).toBe(true);
    expect(esFalloOpenRouterQueDevuelveCuota('Error de conexión con OpenRouter: timeout')).toBe(true);
    expect(esFalloOpenRouterQueDevuelveCuota('OpenRouter HTTP 401: key')).toBe(false);
  });
});

