import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { CORREOS_FUNDADOR, PREFIJO_BOLSA_MCP, esCorreoFundador, esIdentificadorFundador } from '@/lib/founder';

/**
 * Exención del fundador (founder bypass): el correo del fundador, verificado en el servidor, se resuelve a 'admin' (acceso activo, sin tope de consultas).
 * Los demás usuarios conservan EXACTAMENTE su lógica de plan, cuota y suscripción.
 */
const FUNDADOR = 'abogadofredypinel.firmalegal@gmail.com';
const ID_FUNDADOR = `email:${FUNDADOR}`;
const AHORA = new Date('2026-11-02T18:00:00.000Z');
const HOY = '2026-11-02';

describe('lib/founder: identificación exacta', () => {
  it('reconoce el correo del fundador sin importar mayúsculas ni espacios', () => {
    expect(CORREOS_FUNDADOR.has(FUNDADOR)).toBe(true);
    expect(esCorreoFundador(FUNDADOR)).toBe(true);
    expect(esCorreoFundador(`  ${FUNDADOR.toUpperCase()}  `)).toBe(true);
  });
  it('reconoce el identificador email:… y el de la bolsa MCP (mcp:email:…)', () => {
    expect(esIdentificadorFundador(ID_FUNDADOR)).toBe(true);
    expect(esIdentificadorFundador(`mcp:${ID_FUNDADOR}`)).toBe(true);
  });
  it.each([
    ['otro correo', 'email:otro@gmail.com'],
    ['mismo dominio, otro usuario', 'email:alguien@gmail.com'],
    ['correo con el del fundador como sufijo', `email:x${FUNDADOR}`],
    ['correo con el del fundador como prefijo', `email:${FUNDADOR}.evil.com`],
    ['correo con el del fundador dentro', `email:${FUNDADOR}@evil.com`],
    ['identidad por IP', 'ip:1.2.3.4'],
    ['correo del fundador sin el prefijo email:', FUNDADOR],
    ['prefijo distinto', `user:${FUNDADOR}`],
    ['vacío', ''],
  ])('NO es fundador: %s', (_n, id) => {
    expect(esIdentificadorFundador(id)).toBe(false);
  });
  it('null, undefined y no-texto nunca son fundador', () => {
    expect(esIdentificadorFundador(null)).toBe(false);
    expect(esIdentificadorFundador(undefined)).toBe(false);
    expect(esCorreoFundador(null)).toBe(false);
    expect(esCorreoFundador(undefined)).toBe(false);
    expect(esIdentificadorFundador(123 as never)).toBe(false);
  });
  it('el prefijo MCP repetido aquí coincide con el de rate-limit (sin ciclo de importación)', async () => {
    const { MCP_BUCKET_PREFIX } = await import('@/lib/rate-limit');
    expect(PREFIJO_BOLSA_MCP).toBe(MCP_BUCKET_PREFIX);
  });
  it('founder.ts no importa rate-limit (evita ciclo) y no lee variables de entorno', () => {
    const src = readFileSync('lib/founder.ts', 'utf8');
    expect(src).not.toMatch(/from ['"].*rate-limit['"]/);
    expect(src).not.toMatch(/process\.env/);
  });
});

/** Supabase mínimo: queries_log (agotado) y subscriptions (cancelada). Registra toda escritura. */
function fakeSupabase(opts: { count: number; tier: string; subStatus: string | null; subTier?: string }) {
  const writes: string[] = [];
  const from = vi.fn((table: string) => {
    const chain: Record<string, unknown> = {};
    const f: Record<string, unknown> = {};
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn((c: string, v: unknown) => { f[c] = v; return chain; });
    chain.gte = vi.fn(() => chain);
    chain.lte = vi.fn(async () => ({ data: [{ query_count: opts.count, query_date: HOY, tier: opts.tier }], error: null }));
    chain.single = vi.fn(async () => (table === 'queries_log' ? { data: { query_count: opts.count, tier: opts.tier }, error: null } : { data: null, error: null }));
    chain.maybeSingle = vi.fn(async () => ({
      data: table === 'subscriptions'
        ? (opts.subStatus ? { tier: opts.subTier ?? 'pro', status: opts.subStatus, created_at: '2026-01-01T00:00:00Z' } : null)
        : (table === 'queries_log' ? { tier: opts.tier } : null),
      error: null,
    }));
    chain.update = vi.fn(() => { writes.push(`update:${table}`); return chain; });
    chain.upsert = vi.fn(() => { writes.push(`upsert:${table}`); return chain; });
    return chain;
  });
  return { from, writes };
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  delete process.env.FREE_TIER_DAILY_LIMIT;
});

async function conSupabase(sb: ReturnType<typeof fakeSupabase>) {
  vi.resetModules();
  vi.doUnmock('@/lib/rate-limit');
  vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => sb }));
  const rl = await import('@/lib/rate-limit');
  const access = await import('@/lib/paypal/access');
  return { ...rl, ...access };
}

describe('cuotas: el fundador pasa siempre; el cliente regular sigue limitado', () => {
  it('fundador con consultas agotadas, suscripción cancelada y plan free: reserveRateLimit lo deja pasar como admin y no escribe nada', async () => {
    const sb = fakeSupabase({ count: 50_000, tier: 'free', subStatus: 'cancelled' });
    const { reserveRateLimit, checkRateLimit } = await conSupabase(sb);
    expect(await reserveRateLimit(ID_FUNDADOR, AHORA)).toMatchObject({ allowed: true, tier: 'admin' });
    expect(await checkRateLimit(ID_FUNDADOR, AHORA)).toMatchObject({ allowed: true, tier: 'admin' });
    expect(sb.writes).toEqual([]);
  });
  it('fundador por la bolsa MCP también pasa como admin', async () => {
    const sb = fakeSupabase({ count: 50_000, tier: 'free', subStatus: null });
    const { reserveRateLimit } = await conSupabase(sb);
    expect(await reserveRateLimit(`mcp:${ID_FUNDADOR}`, AHORA)).toMatchObject({ allowed: true, tier: 'admin' });
  });
  it('mismo escenario con un cliente regular free: sigue bloqueado por el límite diario', async () => {
    const sb = fakeSupabase({ count: 1, tier: 'free', subStatus: null });
    const { reserveRateLimit } = await conSupabase(sb);
    expect(await reserveRateLimit('email:cliente@ejemplo.com', AHORA)).toMatchObject({ allowed: false, tier: 'free', reason: 'daily' });
  });
  it('cliente Premium al tope diario: sigue bloqueado (el bypass no se extiende)', async () => {
    const sb = fakeSupabase({ count: 60, tier: 'pro', subStatus: 'active', subTier: 'pro' });
    const { reserveRateLimit } = await conSupabase(sb);
    expect(await reserveRateLimit('email:cliente@ejemplo.com', AHORA)).toMatchObject({ allowed: false, tier: 'pro', reason: 'daily' });
  });
  it('una identidad por IP (petición sin token válido) nunca recibe el bypass', async () => {
    const sb = fakeSupabase({ count: 1, tier: 'free', subStatus: null });
    const { reserveRateLimit } = await conSupabase(sb);
    expect(await reserveRateLimit('ip:1.2.3.4', AHORA)).toMatchObject({ allowed: false, tier: 'free' });
  });
  it('getRateLimitStatus del fundador: tier admin y límite de 9999', async () => {
    const sb = fakeSupabase({ count: 3, tier: 'free', subStatus: null });
    const { getRateLimitStatus } = await conSupabase(sb);
    expect(await getRateLimitStatus(ID_FUNDADOR)).toMatchObject({ tier: 'admin', limit: 9999 });
  });
});

describe('resolveCurrentAccess: el fundador siempre tiene acceso activo; el resto no cambia', () => {
  it('fundador sin suscripción y con plan free: accessGranted, tier admin, active_subscription', async () => {
    const sb = fakeSupabase({ count: 0, tier: 'free', subStatus: null });
    const { resolveCurrentAccess } = await conSupabase(sb);
    const a = await resolveCurrentAccess(ID_FUNDADOR);
    expect(a).toMatchObject({ accessGranted: true, tier: 'admin', reasonCode: 'active_subscription', verificationPending: false, canAnalyzeDocuments: true });
  });
  it('cliente regular free sin suscripción: sigue siendo free_tier / no_subscription y sin acceso', async () => {
    const sb = fakeSupabase({ count: 0, tier: 'free', subStatus: null });
    const { resolveCurrentAccess } = await conSupabase(sb);
    const a = await resolveCurrentAccess('email:cliente@ejemplo.com');
    expect(a).toMatchObject({ accessGranted: false, tier: 'free', reasonCode: 'no_subscription' });
  });
});

describe('lo que el bypass NO exime', () => {
  it('los topes duros de costo de Luna siguen en el código y no consultan al fundador', () => {
    const cfg = readFileSync('lib/luna/config.ts', 'utf8');
    expect(cfg).not.toMatch(/founder|fundador/i);
    expect(cfg).toMatch(/MAX_DURO_CONSULTA_USD|MAX_DURO_DIA_USD/);
  });
  it('la facturación de PayPal no se toca: ningún archivo de app/api/paypal importa el módulo del fundador', () => {
    for (const f of ['app/api/paypal/webhook/route.ts', 'app/api/paypal/verificar-estado/route.ts', 'app/api/paypal/cancel-subscription/route.ts']) {
      expect(readFileSync(f, 'utf8')).not.toMatch(/lib\/founder/);
    }
  });
});
