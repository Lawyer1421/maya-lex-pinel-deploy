import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildMcpIdentifierFromEmail, identificadorDeSuscripcion, MCP_BUCKET_PREFIX } from '@/lib/rate-limit';

/**
 * PLAN-MCP-SLICE-1 §3.2-bis — CONDICIÓN DURA del dictamen: resolveTodayTier
 * debe buscar la suscripción con el correo SIN el prefijo `mcp:`; si no, un pro
 * caería a free. Este archivo es el test que lo demuestra.
 */

/** Supabase falso que registra los .eq() y sólo encuentra la suscripción con el identificador exacto. */
function fakeSupabase(opts: {
  usage: { query_count: number; tier: string } | null;
  subs: Record<string, { tier: string; status: string }>;
}) {
  const upsert = vi.fn();
  const eqs: { table: string; col: string; val: unknown }[] = [];
  const from = vi.fn((table: string) => {
    const filtros: Record<string, unknown> = {};
    let mode: 'read' | 'update' | 'upsert' = 'read';
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn(() => {
      if (mode === 'upsert' || mode === 'update') {
        return Promise.resolve({ data: [{ query_count: 1 }], error: null });
      }
      return chain;
    });
    chain.eq = vi.fn((col: string, val: unknown) => {
      filtros[col] = val;
      eqs.push({ table, col, val });
      return chain;
    });
    chain.gte = vi.fn(() => chain);
    chain.lte = vi.fn(async () => ({ data: opts.usage ? [{ query_count: opts.usage.query_count }] : [], error: null }));
    chain.single = vi.fn(async () => ({ data: table === 'queries_log' ? opts.usage : null, error: null }));
    chain.maybeSingle = vi.fn(async () => ({
      data: table === 'subscriptions' ? opts.subs[String(filtros.user_identifier)] ?? null : null,
      error: null,
    }));
    chain.update = vi.fn(() => {
      mode = 'update';
      return chain;
    });
    chain.upsert = vi.fn((row: unknown, extra?: unknown) => {
      mode = 'upsert';
      upsert(row, extra);
      return chain;
    });
    return chain;
  });
  return { from, upsert, eqs };
}

async function freshRateLimit(supabase: ReturnType<typeof fakeSupabase>) {
  vi.resetModules();
  vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => supabase }));
  return import('@/lib/rate-limit');
}

describe('identificadores de la bolsa MCP', () => {
  it('buildMcpIdentifierFromEmail normaliza el correo y antepone mcp:', () => {
    expect(buildMcpIdentifierFromEmail('  Ana@Ejemplo.COM ')).toBe('mcp:email:ana@ejemplo.com');
    expect(MCP_BUCKET_PREFIX).toBe('mcp:');
  });
  it('identificadorDeSuscripcion quita sólo el prefijo mcp: inicial', () => {
    expect(identificadorDeSuscripcion('mcp:email:ana@ejemplo.com')).toBe('email:ana@ejemplo.com');
    expect(identificadorDeSuscripcion('email:ana@ejemplo.com')).toBe('email:ana@ejemplo.com');
    expect(identificadorDeSuscripcion('ip:1.2.3.4')).toBe('ip:1.2.3.4');
    expect(identificadorDeSuscripcion('email:mcp:raro@ejemplo.com')).toBe('email:mcp:raro@ejemplo.com');
  });
});

describe('checkAndIncrementRateLimit — bolsa mcp:', () => {
  const PRO = { 'email:abogado@ejemplo.com': { tier: 'pro', status: 'active' } };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    delete process.env.MCP_TIER_DAILY_LIMIT;
    delete process.env.PRO_TIER_DAILY_LIMIT;
  });

  it('usuario pro con identificador mcp: conserva pro (no cae a free) y usa la cuota MCP (200)', async () => {
    const sb = fakeSupabase({ usage: null, subs: PRO });
    const { checkAndIncrementRateLimit } = await freshRateLimit(sb);
    const r = await checkAndIncrementRateLimit('mcp:email:abogado@ejemplo.com');
    expect(r).toEqual({ allowed: true, remaining: 199, tier: 'pro' });
    expect(sb.eqs).toContainEqual({ table: 'subscriptions', col: 'user_identifier', val: 'email:abogado@ejemplo.com' });
    expect(sb.eqs).not.toContainEqual({ table: 'subscriptions', col: 'user_identifier', val: 'mcp:email:abogado@ejemplo.com' });
  });

  it('la bolsa MCP cuenta en su propia fila de queries_log (mcp:...), separada del chat', async () => {
    const sb = fakeSupabase({ usage: null, subs: PRO });
    const { checkAndIncrementRateLimit } = await freshRateLimit(sb);
    await checkAndIncrementRateLimit('mcp:email:abogado@ejemplo.com');
    expect(sb.eqs).toContainEqual({ table: 'queries_log', col: 'user_identifier', val: 'mcp:email:abogado@ejemplo.com' });
    expect(sb.upsert.mock.calls[0][0]).toMatchObject({ user_identifier: 'mcp:email:abogado@ejemplo.com', tier: 'pro', query_count: 1 });
  });

  it('MCP_TIER_DAILY_LIMIT ajusta la cuota; agotada -> allowed false con resetAt', async () => {
    process.env.MCP_TIER_DAILY_LIMIT = '2';
    const sb = fakeSupabase({ usage: { query_count: 2, tier: 'pro' }, subs: PRO });
    const { checkAndIncrementRateLimit } = await freshRateLimit(sb);
    const r = await checkAndIncrementRateLimit('mcp:email:abogado@ejemplo.com');
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.resetAt).toEqual(expect.any(String));
    expect(sb.upsert).not.toHaveBeenCalled();
  });

  it('free o academico en la bolsa MCP: cuota 0 (fail-closed)', async () => {
    const sb = fakeSupabase({ usage: null, subs: { 'email:alumno@ejemplo.com': { tier: 'academico', status: 'active' } } });
    const { checkAndIncrementRateLimit } = await freshRateLimit(sb);
    expect((await checkAndIncrementRateLimit('mcp:email:alumno@ejemplo.com')).allowed).toBe(false);
    expect((await checkAndIncrementRateLimit('mcp:email:nadie@ejemplo.com')).allowed).toBe(false);
  });

  it('admin en la bolsa MCP sigue sin límite', async () => {
    const sb = fakeSupabase({ usage: null, subs: { 'email:root@ejemplo.com': { tier: 'admin', status: 'active' } } });
    const { checkAndIncrementRateLimit } = await freshRateLimit(sb);
    expect(await checkAndIncrementRateLimit('mcp:email:root@ejemplo.com')).toEqual({ allowed: true, remaining: 9999, tier: 'admin' });
  });

  it('el chat: email: pro (Premium) tiene cuota 60/día', async () => {
    const sb = fakeSupabase({ usage: null, subs: PRO });
    const { checkAndIncrementRateLimit } = await freshRateLimit(sb);
    expect(await checkAndIncrementRateLimit('email:abogado@ejemplo.com')).toEqual({ allowed: true, remaining: 59, tier: 'pro' });
  });

  it('getRateLimitStatus con mcp: muestra pro y el límite MCP', async () => {
    const sb = fakeSupabase({ usage: null, subs: PRO });
    const { getRateLimitStatus } = await freshRateLimit(sb);
    const s = await getRateLimitStatus('mcp:email:abogado@ejemplo.com');
    expect(s).toMatchObject({ tier: 'pro', limit: 200, used: 0 });
  });
});
