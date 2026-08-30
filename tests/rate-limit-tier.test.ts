import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveTierForNewDay } from '@/lib/rate-limit';

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
}) {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn((table: string) => {
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    chain.select = vi.fn(self);
    chain.eq = vi.fn(self);
    chain.single = vi.fn().mockResolvedValue({
      data: table === 'queries_log' ? opts.usage : opts.sub,
      error: null,
    });
    chain.maybeSingle = vi.fn().mockResolvedValue({
      data: table === 'subscriptions' ? opts.sub : opts.usage,
      error: null,
    });
    chain.upsert = upsert;
    return chain;
  });
  return { from, upsert };
}

async function freshRateLimit(supabase: ReturnType<typeof fakeSupabase>) {
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

  it('sin queries_log hoy + sin suscripción → free (tope 3)', async () => {
    const sb = fakeSupabase({ usage: null, sub: null });
    const { checkAndIncrementRateLimit } = await freshRateLimit(sb);
    const result = await checkAndIncrementRateLimit('email:free@ejemplo.com');
    expect(result.allowed).toBe(true);
    expect(result.tier).toBe('free');
    if (result.allowed) {
      expect(result.remaining).toBe(2);
    }
    expect(sb.upsert.mock.calls[0][0].tier).toBe('free');
  });

  it('si ya existe fila de hoy, no pisa el tier con la suscripción', async () => {
    const sb = fakeSupabase({
      usage: { query_count: 1, tier: 'free' },
      sub: { tier: 'pro', status: 'active' },
    });
    const { checkAndIncrementRateLimit } = await freshRateLimit(sb);
    const result = await checkAndIncrementRateLimit('email:abogado@ejemplo.com');
    expect(result.tier).toBe('free');
    expect(sb.upsert.mock.calls[0][0].tier).toBe('free');
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
