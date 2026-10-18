import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * PLAN-MCP-SLICE-1 §3.3 (espejo de Exequátur). El tier se resuelve con un
 * Supabase falso, sin mockear el resolvedor (Auditor @ e1c0c40, P1-1): sólo se
 * mockean el cliente de Supabase y el flag. El 401 por token inválido o ausente
 * lo resuelve el handler antes de llamar a resolveMcpAccess.
 */

interface Opciones {
  /** Fila de hoy en queries_log por user_identifier. */
  usage?: Record<string, { tier: string }>;
  /** Suscripciones por user_identifier. */
  subs?: Record<string, { tier: string; status: string }>;
  /** Simula un error de Supabase en esta tabla. */
  errorEn?: 'queries_log' | 'subscriptions' | 'cliente';
}

function fakeSupabase(opts: Opciones) {
  const eqs: { table: string; col: string; val: unknown }[] = [];
  const from = vi.fn((table: string) => {
    const filtros: Record<string, unknown> = {};
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn((col: string, val: unknown) => {
      filtros[col] = val;
      eqs.push({ table, col, val });
      return chain;
    });
    chain.maybeSingle = vi.fn(async () => {
      if (opts.errorEn === table) return { data: null, error: { message: 'supabase caído' } };
      const id = String(filtros.user_identifier);
      const data = table === 'queries_log' ? opts.usage?.[id] ?? null : opts.subs?.[id] ?? null;
      return { data, error: null };
    });
    chain.upsert = vi.fn();
    return chain;
  });
  return { from, eqs };
}

const isFlagEnabledForUser = vi.fn();

async function freshAccess(sb: ReturnType<typeof fakeSupabase>, opts: Opciones = {}) {
  vi.resetModules();
  vi.doMock('@/lib/supabase', () => ({
    createServerSupabaseClient: () => {
      if (opts.errorEn === 'cliente') throw new Error('sin conexión');
      return sb;
    },
  }));
  vi.doMock('@/lib/flags', () => ({ isFlagEnabledForUser }));
  return import('@/lib/mcp/access');
}

const EMAIL = 'abogado@ejemplo.com';
const SUB_ID = `email:${EMAIL}`;

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  isFlagEnabledForUser.mockReset();
});

describe('resolveMcpAccess — matriz de autorización MCP v1 (suscripción activa, sin fila hoy)', () => {
  it.each([
    ['pro', true, 'ALLOW'],
    ['admin', true, 'ALLOW_INTERNAL'],
    ['free', true, 'DENY'],
    ['academico', true, 'DENY'],
    ['pro', false, 'DENY'],
    ['admin', false, 'DENY'],
  ] as const)('%s activo + flag %s -> %s', async (tier, flag, esperado) => {
    const sb = fakeSupabase({ subs: { [SUB_ID]: { tier, status: 'active' } } });
    isFlagEnabledForUser.mockResolvedValue(flag);
    const { resolveMcpAccess } = await freshAccess(sb);
    const r = await resolveMcpAccess(EMAIL);
    expect(r.authorization).toBe(esperado);
    expect(r.granted).toBe(esperado !== 'DENY');
    expect(r.tier).toBe(tier);
    expect(r.flagEnabled).toBe(flag);
  });
});

describe('resolveMcpAccess — casos del Auditor @ e1c0c40 (P1-1)', () => {
  it('(a) pro activo sin fila en queries_log hoy (no usó el chat) + flag ON -> ALLOW', async () => {
    const sb = fakeSupabase({ usage: {}, subs: { [SUB_ID]: { tier: 'pro', status: 'active' } } });
    isFlagEnabledForUser.mockResolvedValue(true);
    const { resolveMcpAccess } = await freshAccess(sb);
    expect(await resolveMcpAccess(EMAIL)).toMatchObject({ authorization: 'ALLOW', tier: 'pro' });
  });

  it('(a bis) no depende de la fila del chat: un free hoy en el chat sigue pro en MCP', async () => {
    const sb = fakeSupabase({ usage: { [SUB_ID]: { tier: 'free' } }, subs: { [SUB_ID]: { tier: 'pro', status: 'active' } } });
    isFlagEnabledForUser.mockResolvedValue(true);
    const { resolveMcpAccess } = await freshAccess(sb);
    expect((await resolveMcpAccess(EMAIL)).authorization).toBe('ALLOW');
  });

  it('usa la fila de hoy de la bolsa mcp: si existe', async () => {
    const sb = fakeSupabase({ usage: { [`mcp:${SUB_ID}`]: { tier: 'pro' } }, subs: {} });
    isFlagEnabledForUser.mockResolvedValue(true);
    const { resolveMcpAccess } = await freshAccess(sb);
    expect(await resolveMcpAccess(EMAIL)).toMatchObject({ authorization: 'ALLOW', tier: 'pro' });
  });

  it.each(['cancelled', 'past_due', 'trialing'])('(b) pro %s sin fila -> DENY', async (status) => {
    const sb = fakeSupabase({ subs: { [SUB_ID]: { tier: 'pro', status } } });
    isFlagEnabledForUser.mockResolvedValue(true);
    const { resolveMcpAccess } = await freshAccess(sb);
    expect(await resolveMcpAccess(EMAIL)).toMatchObject({ authorization: 'DENY', tier: 'free' });
  });

  it('(c) academico activo + flag ON -> DENY', async () => {
    const sb = fakeSupabase({ subs: { [SUB_ID]: { tier: 'academico', status: 'active' } } });
    isFlagEnabledForUser.mockResolvedValue(true);
    const { resolveMcpAccess } = await freshAccess(sb);
    expect(await resolveMcpAccess(EMAIL)).toMatchObject({ authorization: 'DENY', tier: 'academico', eligibleTier: false });
  });

  it.each(['queries_log', 'subscriptions', 'cliente'] as const)('(d) error de Supabase en %s -> DENY', async (errorEn) => {
    const sb = fakeSupabase({ errorEn, subs: { [SUB_ID]: { tier: 'pro', status: 'active' } } });
    isFlagEnabledForUser.mockResolvedValue(true);
    const { resolveMcpAccess } = await freshAccess(sb, { errorEn });
    expect(await resolveMcpAccess(EMAIL)).toMatchObject({ authorization: 'DENY', tier: 'free' });
  });

  it('(e) la consulta de subscriptions nunca lleva mcp:', async () => {
    const sb = fakeSupabase({ subs: { [SUB_ID]: { tier: 'pro', status: 'active' } } });
    isFlagEnabledForUser.mockResolvedValue(true);
    const { resolveMcpAccess } = await freshAccess(sb);
    await resolveMcpAccess(EMAIL);
    const subsEqs = sb.eqs.filter((e) => e.table === 'subscriptions' && e.col === 'user_identifier');
    expect(subsEqs).toEqual([{ table: 'subscriptions', col: 'user_identifier', val: SUB_ID }]);
    expect(sb.eqs).toContainEqual({ table: 'queries_log', col: 'user_identifier', val: `mcp:${SUB_ID}` });
  });

  it('sin correo verificado -> DENY sin consultar Supabase', async () => {
    const sb = fakeSupabase({});
    isFlagEnabledForUser.mockResolvedValue(true);
    const { resolveMcpAccess } = await freshAccess(sb);
    expect((await resolveMcpAccess(null)).authorization).toBe('DENY');
    expect((await resolveMcpAccess('  ')).authorization).toBe('DENY');
    expect(sb.from).not.toHaveBeenCalled();
  });

  it('sin Supabase configurado -> DENY (fail-closed)', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const sb = fakeSupabase({ subs: { [SUB_ID]: { tier: 'pro', status: 'active' } } });
    isFlagEnabledForUser.mockResolvedValue(true);
    const { resolveMcpAccess } = await freshAccess(sb);
    expect((await resolveMcpAccess(EMAIL)).authorization).toBe('DENY');
  });

  it('consulta flag_mcp_enabled (no el de Exequátur) con el correo', async () => {
    const sb = fakeSupabase({ subs: { [SUB_ID]: { tier: 'pro', status: 'active' } } });
    isFlagEnabledForUser.mockResolvedValue(true);
    const { resolveMcpAccess } = await freshAccess(sb);
    await resolveMcpAccess(EMAIL);
    expect(isFlagEnabledForUser).toHaveBeenCalledWith('flag_mcp_enabled', EMAIL);
  });
});
