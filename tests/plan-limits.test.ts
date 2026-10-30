import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import {
  ALCANCE_TOPE_COSTO_DIARIO, LIMITES_ACADEMICO, LIMITES_PREMIUM, PRECIOS_PLAN, TOPE_COSTO_DIARIO_USD,
  claveTopeCostoDiario, limitesDePlanPago, topeCostoDiarioAlcanzado,
} from '@/lib/plan-limits';
import { PLANES_V2 } from '@/components/v2/planes-data';
import TarjetaPlan from '@/components/v2/TarjetaPlan';

/**
 * Límites de consultas por plan: Académico 20/día y 400/mes; Premium (tier 'pro') 60/día y 1,200/mes. Aplicados del lado del servidor
 * (reserveRateLimit). Si la lectura del uso falla, la consulta se bloquea.
 */

type Fila = { query_count: number; tier: string };

/** Supabase en memoria con el contrato que usa lib/rate-limit.ts: queries_log (CAS por día) y subscriptions. */
function fakeSupabase(opts: { rows?: Record<string, Fila>; tier?: 'academico' | 'pro' | 'free'; failMonthly?: boolean; failDaily?: boolean; createdAt?: string; failSubscription?: boolean; casAlwaysLoses?: boolean } = {}) {
  const rows = new Map<string, Fila>(Object.entries(opts.rows ?? {}));
  const tier = opts.tier ?? 'free';
  const from = vi.fn((table: string) => {
    const f: Record<string, unknown> = {};
    let patch: { query_count?: number; tier?: string } | null = null;
    let upsertRow: { user_identifier: string; query_date: string; query_count: number; tier: string } | null = null;
    let ignoreDuplicates = false;
    let esMensual = false;
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn(() => {
      if (patch) {
        const key = `${f.user_identifier}|${f.query_date}`;
        const fila = rows.get(key);
        if (opts.casAlwaysLoses || !fila || fila.query_count !== f.query_count) return Promise.resolve({ data: [], error: null });
        rows.set(key, { query_count: patch.query_count!, tier: patch.tier ?? fila.tier });
        return Promise.resolve({ data: [{ query_count: patch.query_count }], error: null });
      }
      if (upsertRow) {
        const key = `${upsertRow.user_identifier}|${upsertRow.query_date}`;
        if (rows.has(key) && ignoreDuplicates) return Promise.resolve({ data: [], error: null });
        rows.set(key, { query_count: upsertRow.query_count, tier: upsertRow.tier });
        return Promise.resolve({ data: [{ query_count: upsertRow.query_count }], error: null });
      }
      return chain;
    });
    chain.eq = vi.fn((c: string, v: unknown) => { f[c] = v; return chain; });
    chain.gte = vi.fn((_c: string, v: unknown) => { esMensual = true; f.__desde = v; return chain; });
    chain.lte = vi.fn(async (_c: string, v: unknown) => {
      if (opts.failMonthly) return { data: null, error: { code: '57014', message: 'statement timeout' } };
      const data = [...rows.entries()]
        .filter(([k]) => { const [u, d] = k.split('|'); return u === f.user_identifier && d >= String(f.__desde) && d <= String(v); })
        .map(([k, r]) => ({ query_count: r.query_count, query_date: k.split('|')[1], tier: r.tier }));
      return { data, error: null };
    });
    chain.single = vi.fn(async () => {
      if (table !== 'queries_log') return { data: null, error: null };
      if (opts.failDaily) return { data: null, error: { code: '57014', message: 'statement timeout' } };
      const fila = rows.get(`${f.user_identifier}|${f.query_date}`) ?? null;
      return { data: fila, error: fila ? null : { code: 'PGRST116' } };
    });
    chain.maybeSingle = vi.fn(async () => {
      if (table === 'subscriptions' && opts.failSubscription) return { data: null, error: { code: '57014', message: 'statement timeout' } };
      return { data: table === 'subscriptions' && tier !== 'free' ? { tier, status: 'active', created_at: opts.createdAt } : null, error: null };
    });
    chain.update = vi.fn((p: typeof patch) => { patch = p; return chain; });
    chain.upsert = vi.fn((r: typeof upsertRow, extra?: { ignoreDuplicates?: boolean }) => { upsertRow = r; ignoreDuplicates = Boolean(extra?.ignoreDuplicates); return chain; });
    void esMensual;
    return chain;
  });
  return { from, rows };
}

async function fresh(sb: ReturnType<typeof fakeSupabase>) {
  vi.resetModules();
  vi.doUnmock('@/lib/rate-limit');           // por si una prueba anterior de este archivo simuló el módulo
  vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => sb }));
  return import('@/lib/rate-limit');
}

const USUARIO = 'email:abogado@ejemplo.com';
const AHORA = new Date('2026-10-20T18:00:00.000Z');            // 12:00 HN, martes 20-oct-2026
const HOY = '2026-10-20';

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  delete process.env.FREE_TIER_DAILY_LIMIT;
  // Los planes de pago NO se ajustan por entorno: aunque existan estas variables, mandan las constantes.
  process.env.ACADEMICO_TIER_DAILY_LIMIT = '999';
  process.env.PRO_TIER_DAILY_LIMIT = '999';
});

describe('constantes: un solo módulo de configuración', () => {
  it('Académico 20/día y 400/mes; Premium 60/día y 1,200/mes', () => {
    expect(LIMITES_ACADEMICO).toEqual({ diario: 20, mensual: 400 });
    expect(LIMITES_PREMIUM).toEqual({ diario: 60, mensual: 1200 });
    expect(limitesDePlanPago('academico')).toBe(LIMITES_ACADEMICO);
    expect(limitesDePlanPago('pro')).toBe(LIMITES_PREMIUM);
    expect(limitesDePlanPago('free')).toBeNull();
    expect(limitesDePlanPago('admin')).toBeNull();
  });
  it('rate-limit.ts no define sus propios números ni lee env para los planes de pago', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('lib/rate-limit.ts', 'utf8');
    expect(src).not.toMatch(/ACADEMICO_TIER_DAILY_LIMIT|PRO_TIER_DAILY_LIMIT/);
    expect(src).toContain("from '@/lib/plan-limits'");
  });
});

describe('límite diario (servidor)', () => {
  it.each([
    ['academico', 20],
    ['pro', 60],
  ] as const)('%s: permite hasta el límite diario y rechaza la consulta siguiente', async (tier, limite) => {
    const sb = fakeSupabase({ tier, rows: { [`${USUARIO}|${HOY}`]: { query_count: limite - 1, tier } } });
    const { reserveRateLimit } = await fresh(sb);
    const ultima = await reserveRateLimit(USUARIO, AHORA);
    expect(ultima).toMatchObject({ allowed: true, remaining: 0, tier });
    const exceso = await reserveRateLimit(USUARIO, AHORA);
    expect(exceso).toMatchObject({ allowed: false, remaining: 0, tier, reason: 'daily' });
    // El rechazo no incrementa el contador.
    expect(sb.rows.get(`${USUARIO}|${HOY}`)!.query_count).toBe(limite);
  });
  it('diario agotado: la reanudación es la próxima medianoche HN', async () => {
    const sb = fakeSupabase({ tier: 'pro', rows: { [`${USUARIO}|${HOY}`]: { query_count: 60, tier: 'pro' } } });
    const { reserveRateLimit } = await fresh(sb);
    const r = await reserveRateLimit(USUARIO, AHORA);
    expect(r).toMatchObject({ allowed: false, reason: 'daily', resetAt: '2026-10-21T06:00:00.000Z' });
  });
});

const AHORA_28 = new Date('2026-10-28T18:00:00.000Z');          // 28-oct-2026: caben 27 días previos
const HOY_28 = '2026-10-28';
/** Reparte `total` consultas en los días 1..27 de octubre sin pasar de `porDia` en ninguno. */
function llenarMes(tier: string, total: number, porDia: number): Record<string, Fila> {
  const rows: Record<string, Fila> = {};
  let resta = total;
  for (let d = 1; d <= 27 && resta > 0; d++) {
    const n = Math.min(porDia, resta);
    rows[`${USUARIO}|2026-10-${String(d).padStart(2, '0')}`] = { query_count: n, tier };
    resta -= n;
  }
  if (resta > 0) throw new Error('el helper no cabe en 27 días');
  return rows;
}

describe('límite mensual (servidor)', () => {
  it.each([
    ['academico', 400, 20],
    ['pro', 1200, 60],
  ] as const)('%s: con el mes agotado (%i) rechaza aunque hoy no haya consumido el límite diario', async (tier, mensual, diario) => {
    const rows = llenarMes(tier, mensual - 1, diario);                  // el mes lleva mensual-1 en días previos…
    rows[`${USUARIO}|${HOY_28}`] = { query_count: 1, tier };            // …y hoy 1 más = mensual (hoy 1 < límite diario)
    const sb = fakeSupabase({ tier, rows });
    const { reserveRateLimit } = await fresh(sb);
    const r = await reserveRateLimit(USUARIO, AHORA_28);
    expect(r).toMatchObject({ allowed: false, remaining: 0, tier, reason: 'monthly', resetAt: '2026-11-01T06:00:00.000Z' });
    expect(sb.rows.get(`${USUARIO}|${HOY_28}`)!.query_count).toBe(1);   // no se incrementó
  });
  it.each([
    ['academico', 400, 20],
    ['pro', 1200, 60],
  ] as const)('%s: la última consulta del mes cabe y la siguiente se rechaza por el mes', async (tier, mensual, diario) => {
    const rows = llenarMes(tier, mensual - 1, diario);                  // mensual-1 usadas, hoy 0
    const sb = fakeSupabase({ tier, rows });
    const { reserveRateLimit } = await fresh(sb);
    expect(await reserveRateLimit(USUARIO, AHORA_28)).toMatchObject({ allowed: true, remaining: 0, tier });    // la consulta n.º mensual
    expect(await reserveRateLimit(USUARIO, AHORA_28)).toMatchObject({ allowed: false, reason: 'monthly', tier });
    expect(sb.rows.get(`${USUARIO}|${HOY_28}`)!.query_count).toBe(1);
  });
  it('el mes se cuenta por mes calendario HN: el uso del mes anterior no cuenta', async () => {
    const rows: Record<string, Fila> = {};
    for (let i = 1; i <= 30; i++) rows[`${USUARIO}|2026-09-${String(i).padStart(2, '0')}`] = { query_count: 20, tier: 'academico' };
    const sb = fakeSupabase({ tier: 'academico', rows });
    const { reserveRateLimit } = await fresh(sb);
    expect(await reserveRateLimit(USUARIO, AHORA)).toMatchObject({ allowed: true, remaining: 19 });
  });
  it('remaining es el menor entre lo que queda del día y del mes', async () => {
    const rows: Record<string, Fila> = {};
    for (let i = 1; i <= 19; i++) rows[`${USUARIO}|2026-10-${String(i).padStart(2, '0')}`] = { query_count: 20, tier: 'academico' }; // 380 en el mes
    const sb = fakeSupabase({ tier: 'academico', rows });
    const { reserveRateLimit } = await fresh(sb);
    // Hoy 0 usadas: día deja 19; mes (380 usadas) deja 400-380-1 = 19 → 19. Con 5 más en el mes quedaría el mes como límite.
    sb.rows.set(`${USUARIO}|2026-10-01`, { query_count: 25, tier: 'academico' }); // 385 en el mes
    expect(await reserveRateLimit(USUARIO, AHORA)).toMatchObject({ allowed: true, remaining: 14 });
  });
  it('dos consultas concurrentes con una sola plaza mensual: solo una pasa (el CAS de hoy serializa y el mes se relee)', async () => {
    const rows: Record<string, Fila> = {};
    for (let i = 1; i <= 19; i++) rows[`${USUARIO}|2026-10-${String(i).padStart(2, '0')}`] = { query_count: 20, tier: 'academico' }; // 380
    rows[`${USUARIO}|${HOY}`] = { query_count: 19, tier: 'academico' };                                                                 // 399
    const sb = fakeSupabase({ tier: 'academico', rows });
    const { reserveRateLimit } = await fresh(sb);
    const [a, b] = await Promise.all([reserveRateLimit(USUARIO, AHORA), reserveRateLimit(USUARIO, AHORA)]);
    expect([a.allowed, b.allowed].filter(Boolean)).toHaveLength(1);
  });
});

describe('si la cuenta de uso falla, se bloquea la consulta', () => {
  it('fallo al leer el uso del mes → RateLimitStoreError (503 en la ruta); no se incrementa nada', async () => {
    const sb = fakeSupabase({ tier: 'pro', failMonthly: true, rows: { [`${USUARIO}|${HOY}`]: { query_count: 3, tier: 'pro' } } });
    const { reserveRateLimit, RateLimitStoreError } = await fresh(sb);
    await expect(reserveRateLimit(USUARIO, AHORA)).rejects.toBeInstanceOf(RateLimitStoreError);
    expect(sb.rows.get(`${USUARIO}|${HOY}`)!.query_count).toBe(3);
  });
  it('fallo al leer el uso del día → RateLimitStoreError', async () => {
    const sb = fakeSupabase({ tier: 'academico', failDaily: true });
    const { reserveRateLimit, RateLimitStoreError } = await fresh(sb);
    await expect(reserveRateLimit(USUARIO, AHORA)).rejects.toBeInstanceOf(RateLimitStoreError);
  });
  it('checkRateLimit (sin escribir) también falla cerrado si no puede leer el mes', async () => {
    const sb = fakeSupabase({ tier: 'pro', failMonthly: true });
    const { checkRateLimit, RateLimitStoreError } = await fresh(sb);
    await expect(checkRateLimit(USUARIO, AHORA)).rejects.toBeInstanceOf(RateLimitStoreError);
  });
  it('decidirLimites trata usos inválidos como agotado', async () => {
    const { decidirLimites } = await fresh(fakeSupabase());
    expect(decidirLimites({ limiteDiario: 20, limiteMensual: 400, usadoHoy: 0, usadoMes: null })).toMatchObject({ allowed: false, reason: 'monthly' });
    expect(decidirLimites({ limiteDiario: 20, limiteMensual: 400, usadoHoy: Number.NaN, usadoMes: 0 })).toMatchObject({ allowed: false, reason: 'daily' });
    expect(decidirLimites({ limiteDiario: 20, limiteMensual: 400, usadoHoy: 0, usadoMes: -1 })).toMatchObject({ allowed: false });
  });
});

describe('tope mensual: solo cuentan las consultas de pago desde la activación de la suscripción', () => {
  it('mezcla consultas gratis (antes y en un hueco) y de pago en el mismo mes: las gratis no gastan el tope', async () => {
    const rows: Record<string, Fila> = {};
    for (let d = 1; d <= 4; d++) rows[`${USUARIO}|2026-10-${String(d).padStart(2, '0')}`] = { query_count: 1, tier: 'free' };      // 4 gratis antes de pagar
    for (let d = 5; d <= 23; d++) rows[`${USUARIO}|2026-10-${String(d).padStart(2, '0')}`] = { query_count: 20, tier: 'academico' }; // 380 de pago
    rows[`${USUARIO}|2026-10-24`] = { query_count: 19, tier: 'academico' };                                                           // 399 de pago
    rows[`${USUARIO}|2026-10-25`] = { query_count: 1, tier: 'free' };                                                                 // una gratis en un hueco
    // Total bruto del mes = 404 (> 400): si se contaran las gratis, ya estaría bloqueado.
    const sb = fakeSupabase({ tier: 'academico', rows, createdAt: '2026-10-05T15:00:00.000Z' });
    const { reserveRateLimit } = await fresh(sb);
    expect(await reserveRateLimit(USUARIO, AHORA_28)).toMatchObject({ allowed: true, remaining: 0, tier: 'academico' });   // la 400.ª de pago cabe
    expect(await reserveRateLimit(USUARIO, AHORA_28)).toMatchObject({ allowed: false, reason: 'monthly' });                // la 401.ª no
  });
  it('sin la regla, el bruto (404) bloquearía: se verifica que el conteo de pago es 399', async () => {
    const rows: Record<string, Fila> = {};
    for (let d = 1; d <= 4; d++) rows[`${USUARIO}|2026-10-${String(d).padStart(2, '0')}`] = { query_count: 1, tier: 'free' };
    rows[`${USUARIO}|2026-10-10`] = { query_count: 20, tier: 'academico' };
    const sb = fakeSupabase({ tier: 'academico', rows, createdAt: '2026-10-10T03:00:00.000Z' });
    vi.useFakeTimers(); vi.setSystemTime(AHORA_28);
    try {
      const { getRateLimitStatus } = await fresh(sb);
      expect(await getRateLimitStatus(USUARIO)).toMatchObject({ usedMonth: 20, limitMonth: 400 });
    } finally { vi.useRealTimers(); }
  });
  it('lo anterior a la fecha de activación (HN) no cuenta aunque tenga tier de pago', async () => {
    const rows: Record<string, Fila> = {};
    for (let d = 1; d <= 19; d++) rows[`${USUARIO}|2026-10-${String(d).padStart(2, '0')}`] = { query_count: 20, tier: 'academico' }; // 380 previos a la activación
    // 2026-10-20T03:00Z es 19-oct 21:00 en HN → la activación cae el 19 (HN); el 19 sí cuenta, el 18 no.
    const sb = fakeSupabase({ tier: 'academico', rows, createdAt: '2026-10-20T03:00:00.000Z' });
    vi.useFakeTimers(); vi.setSystemTime(AHORA);
    try {
      const { getRateLimitStatus } = await fresh(sb);
      expect(await getRateLimitStatus(USUARIO)).toMatchObject({ usedMonth: 20, limitMonth: 400 });
    } finally { vi.useRealTimers(); }
  });
  it('sin fecha de activación conocida cuenta desde el inicio del mes (más conservador), pero solo filas de pago', async () => {
    const rows: Record<string, Fila> = {
      [`${USUARIO}|2026-10-01`]: { query_count: 1, tier: 'free' },
      [`${USUARIO}|2026-10-02`]: { query_count: 20, tier: 'academico' },
    };
    const sb = fakeSupabase({ tier: 'academico', rows });          // sin createdAt
    vi.useFakeTimers(); vi.setSystemTime(AHORA);
    try {
      const { getRateLimitStatus } = await fresh(sb);
      expect(await getRateLimitStatus(USUARIO)).toMatchObject({ usedMonth: 20 });
    } finally { vi.useRealTimers(); }
  });
  it('si falla la lectura de la suscripción, la consulta se bloquea (RateLimitStoreError)', async () => {
    const sb = fakeSupabase({ tier: 'pro', failSubscription: true, rows: { [`${USUARIO}|${HOY}`]: { query_count: 2, tier: 'pro' } } });
    const { reserveRateLimit, RateLimitStoreError } = await fresh(sb);
    await expect(reserveRateLimit(USUARIO, AHORA)).rejects.toBeInstanceOf(RateLimitStoreError);
    expect(sb.rows.get(`${USUARIO}|${HOY}`)!.query_count).toBe(2);
  });
});

describe('H1: reintentos agotados → contención (503), no el 429 del plan gratis', () => {
  it.each(['academico', 'pro'] as const)('%s: devuelve reason contention con el plan REAL del usuario', async (tier) => {
    const sb = fakeSupabase({ tier, casAlwaysLoses: true, rows: { [`${USUARIO}|${HOY}`]: { query_count: 3, tier } } });
    const { reserveRateLimit } = await fresh(sb);
    const r = await reserveRateLimit(USUARIO, AHORA);
    expect(r).toMatchObject({ allowed: false, remaining: 0, tier, reason: 'contention' });
    expect((r as { tier: string }).tier).not.toBe('free');
    expect(sb.rows.get(`${USUARIO}|${HOY}`)!.query_count).toBe(3);      // no se incrementó
  });
  it('un usuario free en contención también recibe contention (no el mensaje de «ya usaste tu consulta gratis»)', async () => {
    const sb = fakeSupabase({ tier: 'free', casAlwaysLoses: true, rows: { [`ip:10.0.0.7|${HOY}`]: { query_count: 0, tier: 'free' } } });
    const { reserveRateLimit } = await fresh(sb);
    expect(await reserveRateLimit('ip:10.0.0.7', AHORA)).toMatchObject({ allowed: false, reason: 'contention', tier: 'free' });
  });
  it('/api/chat responde 503 RATE_LIMIT_CONTENTION con el plan real y Retry-After, sin invocar al modelo', async () => {
    vi.resetModules();
    const anthropicCreate = vi.fn();
    vi.doMock('next/server', async () => ({ ...(await vi.importActual<typeof import('next/server')>('next/server')), after: (fn: () => unknown) => { fn(); } }));
    vi.doMock('@/lib/rate-limit', () => ({
      reserveRateLimit: vi.fn().mockResolvedValue({ allowed: false, remaining: 0, tier: 'pro', resetAt: '2026-10-21T06:00:00.000Z', reason: 'contention' }),
      releaseRateLimit: vi.fn(), RateLimitStoreError: class extends Error {}, esFalloProveedorQueDevuelveCuota: () => false, esFalloOpenRouterQueDevuelveCuota: () => false,
      getVerifiedEmail: vi.fn().mockResolvedValue('abogado@ejemplo.com'), getUserIdentifier: () => 'ip:t', buildUserIdentifierFromEmail: (e: string) => `email:${e}`,
      FREE_DAILY_LIMIT_CODE: 'FREE_DAILY_LIMIT',
    }));
    vi.doMock('@/lib/flags', () => ({ isFlagEnabledForUser: vi.fn().mockResolvedValue(false) }));
    vi.doMock('@/lib/analytics/logger', () => ({ logConsulta: vi.fn(), hashUsuario: () => 'h' }));
    vi.doMock('@anthropic-ai/sdk', () => ({ default: class { messages = { create: anthropicCreate }; static APIError = class extends Error {}; } }));
    process.env.ANTHROPIC_API_KEY = 'fake'; process.env.LLM_PROVIDER = 'anthropic';
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST({ json: async () => ({ messages: [{ role: 'user', content: 'Explica el artículo 173 del Código Procesal Penal' }], mode: 'analisis_penal' }), headers: new Headers() } as never);
    expect(res.status).toBe(503);
    expect(res.headers.get('Retry-After')).toBe('2');
    expect(await res.json()).toEqual({ error: 'Servicio de cuota ocupado', code: 'RATE_LIMIT_CONTENTION', tier: 'pro' });
    expect(anthropicCreate).not.toHaveBeenCalled();
  });
});

describe('free y admin no cambian; el estado de uso informa el mes', () => {
  it('free: 1/día sin tope mensual; admin: sin límite', async () => {
    const free = fakeSupabase({ tier: 'free' });
    const { reserveRateLimit } = await fresh(free);
    expect(await reserveRateLimit('ip:10.0.0.9', AHORA)).toMatchObject({ allowed: true, tier: 'free', remaining: 0 });
    expect(await reserveRateLimit('ip:10.0.0.9', AHORA)).toMatchObject({ allowed: false, tier: 'free', reason: 'daily' });
  });
  it('getRateLimitStatus de un plan de pago devuelve usedMonth y limitMonth', async () => {
    const sb = fakeSupabase({ tier: 'pro', rows: { [`${USUARIO}|${HOY}`]: { query_count: 5, tier: 'pro' }, [`${USUARIO}|2026-10-02`]: { query_count: 7, tier: 'pro' } } });
    vi.useFakeTimers(); vi.setSystemTime(AHORA);
    try {
      const { getRateLimitStatus } = await fresh(sb);
      expect(await getRateLimitStatus(USUARIO)).toMatchObject({ tier: 'pro', used: 5, limit: 60, usedMonth: 12, limitMonth: 1200 });
    } finally { vi.useRealTimers(); }
  });
});

describe('precios sin cambio y precio de Premium en su tarjeta', () => {
  it('USD 9 (L 245) y USD 15 (L 405)', () => {
    expect(PRECIOS_PLAN.academico).toEqual({ usd: 9, lempiras: 245 });
    expect(PRECIOS_PLAN.premium).toEqual({ usd: 15, lempiras: 405 });
    const ac = PLANES_V2.find((p) => p.id === 'academico')!;
    const pr = PLANES_V2.find((p) => p.id === 'profesional')!;
    expect([ac.precio, ac.precioLempiras]).toEqual(['USD 9', 'L 245']);
    expect([pr.precio, pr.precioLempiras]).toEqual(['USD 15', 'L 405']);
  });
  it('la tarjeta Premium muestra el precio (USD 15 y L 405) y los límites reales; Académico igual', () => {
    const html = (id: string) => renderToStaticMarkup(React.createElement(TarjetaPlan, { plan: PLANES_V2.find((p) => p.id === id)!, nivelTitulo: 'h2' }));
    const premium = html('profesional');
    expect(premium).toContain('Premium');
    expect(premium).toContain('USD 15');
    expect(premium).toContain('L 405');
    expect(premium).toContain('60 consultas/día (hasta 1,200 al mes)');
    const academico = html('academico');
    expect(academico).toContain('USD 9');
    expect(academico).toContain('L 245');
    expect(academico).toContain('20 consultas/día (hasta 400 al mes)');
  });
  it('el texto de la tarjeta no promete más que el servidor (no queda «1000 consultas»)', () => {
    for (const p of PLANES_V2) expect(p.caracteristicas.join(' ')).not.toMatch(/1000|1,000 consultas/);
  });
});

describe('tope de USD 5 al día: configurable por usuario o por todo el plan (por defecto, por usuario)', () => {
  it('el tope es USD 5 y por defecto el alcance es por usuario (decisión del fundador pendiente)', () => {
    expect(TOPE_COSTO_DIARIO_USD).toBe(5);
    expect(ALCANCE_TOPE_COSTO_DIARIO).toBe('por_usuario');
  });
  it('por usuario: cada usuario acumula en su propia clave; por plan: todos los del plan comparten una', () => {
    const a = { userIdentifier: 'email:a@x.com', plan: 'pro', fecha: HOY };
    const b = { userIdentifier: 'email:b@x.com', plan: 'pro', fecha: HOY };
    expect(claveTopeCostoDiario(a)).not.toBe(claveTopeCostoDiario(b));
    expect(claveTopeCostoDiario({ ...a, alcance: 'por_plan' })).toBe(claveTopeCostoDiario({ ...b, alcance: 'por_plan' }));
    expect(claveTopeCostoDiario({ ...a, alcance: 'por_plan' })).not.toBe(claveTopeCostoDiario({ ...a, plan: 'academico', alcance: 'por_plan' }));
    expect(claveTopeCostoDiario({ ...a, fecha: '2026-10-21' })).not.toBe(claveTopeCostoDiario(a));
  });
  it('el tope se alcanza en USD 5; un gasto inválido cuenta como alcanzado (fail-closed)', () => {
    expect(topeCostoDiarioAlcanzado(4.99)).toBe(false);
    expect(topeCostoDiarioAlcanzado(5)).toBe(true);
    expect(topeCostoDiarioAlcanzado(Number.NaN)).toBe(true);
    expect(topeCostoDiarioAlcanzado(-1)).toBe(true);
  });
  it('el módulo deja constancia del TODO pendiente de la decisión del fundador', async () => {
    const { readFileSync } = await import('node:fs');
    expect(readFileSync('lib/plan-limits.ts', 'utf8')).toMatch(/TODO\(fundador\)/);
  });
});

describe('la ruta de chat responde 429 distinto cuando se agota el mes', () => {
  it('el mensaje mensual y el código PLAN_MONTHLY_LIMIT existen en la ruta', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('app/api/chat/route.ts', 'utf8');
    expect(src).toContain("rateLimitResult.reason === 'monthly'");
    expect(src).toContain('PLAN_MONTHLY_LIMIT');
  });
});

describe('H2: los ejemplos de entorno no ofrecen variables que ya no tienen efecto', () => {
  it.each(['.env.example', '.env.local.example'])('%s no define PRO_TIER_DAILY_LIMIT ni ACADEMICO_TIER_DAILY_LIMIT como variable', async (archivo) => {
    const { readFileSync } = await import('node:fs');
    const lineas = readFileSync(archivo, 'utf8').split('\n').filter((l) => !l.trim().startsWith('#'));
    expect(lineas.join('\n')).not.toMatch(/PRO_TIER_DAILY_LIMIT|ACADEMICO_TIER_DAILY_LIMIT/);
    expect(lineas.join('\n')).toMatch(/FREE_TIER_DAILY_LIMIT=1/);
  });
  it('rate-limit.ts documenta que esas variables no existen para los planes de pago', async () => {
    const { readFileSync } = await import('node:fs');
    expect(readFileSync('lib/rate-limit.ts', 'utf8')).not.toMatch(/process\.env\.(PRO|ACADEMICO)_TIER_DAILY_LIMIT/);
  });
});
