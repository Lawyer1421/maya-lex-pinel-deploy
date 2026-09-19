import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AccessTier, CurrentAccess } from '@/lib/paypal/access';
import { existsSync, readFileSync } from 'node:fs';

vi.mock('@/lib/paypal/access', () => ({
  resolveCurrentAccess: vi.fn(),
}));
vi.mock('@/lib/flags', () => ({
  isFlagEnabledForUser: vi.fn(),
}));

import { resolveCurrentAccess } from '@/lib/paypal/access';
import { isFlagEnabledForUser } from '@/lib/flags';
import { resolveExequaturAccess } from '@/lib/exequatur/access';

const mockResolveCurrentAccess = vi.mocked(resolveCurrentAccess);
const mockIsFlagEnabled = vi.mocked(isFlagEnabledForUser);

function accessFixture(tier: AccessTier): CurrentAccess {
  return {
    accessGranted: tier !== 'free',
    tier,
    subscriptionStatus: null,
    pendingTier: null,
    source: 'queries_log',
    verificationPending: false,
    reasonCode: tier === 'free' ? 'free_tier' : 'active_subscription',
    canAnalyzeDocuments: true,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Regresión Slice 1 — auth intacta tras Slice 3', () => {
  it('pro + flag ON -> ALLOW', async () => {
    mockResolveCurrentAccess.mockResolvedValue(accessFixture('pro'));
    mockIsFlagEnabled.mockResolvedValue(true);
    const r = await resolveExequaturAccess('email:x@test.com', 'x@test.com');
    expect(r.authorization).toBe('ALLOW');
  });

  it('admin + flag ON -> ALLOW_INTERNAL', async () => {
    mockResolveCurrentAccess.mockResolvedValue(accessFixture('admin'));
    mockIsFlagEnabled.mockResolvedValue(true);
    const r = await resolveExequaturAccess('email:x@test.com', 'x@test.com');
    expect(r.authorization).toBe('ALLOW_INTERNAL');
  });

  it('free/académico + flag ON -> DENY', async () => {
    for (const tier of ['free', 'academico'] as const) {
      mockResolveCurrentAccess.mockResolvedValue(accessFixture(tier));
      mockIsFlagEnabled.mockResolvedValue(true);
      const r = await resolveExequaturAccess('email:x@test.com', 'x@test.com');
      expect(r.authorization).toBe('DENY');
    }
  });

  it('pro/admin + flag OFF -> DENY', async () => {
    for (const tier of ['pro', 'admin'] as const) {
      mockResolveCurrentAccess.mockResolvedValue(accessFixture(tier));
      mockIsFlagEnabled.mockResolvedValue(false);
      const r = await resolveExequaturAccess('email:x@test.com', 'x@test.com');
      expect(r.authorization).toBe('DENY');
    }
  });
});

describe('Regresión Slice 3 — rutas nuevas heredan el gate, no crean uno propio', () => {
  it('no hay layout.tsx bajo diagnostico ni plan', () => {
    expect(existsSync('app/exequatur/diagnostico/layout.tsx')).toBe(false);
    expect(existsSync('app/exequatur/plan/layout.tsx')).toBe(false);
  });

  it('el único layout de la vertical sigue siendo app/exequatur/layout.tsx', () => {
    expect(existsSync('app/exequatur/layout.tsx')).toBe(true);
    const gate = readFileSync('app/exequatur/layout.tsx', 'utf8');
    expect(gate).toMatch(/resolveExequaturAccess/);
  });

  it('diagnóstico y plan no llaman a buscarArticuloExacto ni fabrican citas', () => {
    const diagnostico = readFileSync('app/exequatur/diagnostico/page.tsx', 'utf8');
    const plan = readFileSync('app/exequatur/plan/page.tsx', 'utf8');
    expect(diagnostico).not.toMatch(/buscarArticuloExacto/);
    expect(plan).not.toMatch(/buscarArticuloExacto/);
    expect(diagnostico).not.toMatch(/use client/);
    expect(plan).not.toMatch(/use client/);
  });
});

describe('Regresión Slice 3B — persistencia no usa query-score ni service_role', () => {
  it('plan no toma autoridad de objetivos/aciertos/total', () => {
    const plan = readFileSync('app/exequatur/plan/page.tsx', 'utf8');
    expect(plan).not.toMatch(/parsearObjetivosQuery/);
    expect(plan).toMatch(/cargarIntentoPropio/);
    expect(plan).toMatch(/cargarUltimoIntentoPropio/);
    expect(plan).not.toMatch(/aciertos\?:/);
    expect(plan).not.toMatch(/objetivos\?:/);
  });

  it('actions no redirige con score en query y exige sesión', () => {
    const actions = readFileSync('app/exequatur/diagnostico/actions.ts', 'utf8');
    expect(actions).toMatch(/resolverSesionExequatur/);
    expect(actions).toMatch(/guardarIntento/);
    expect(actions).not.toMatch(/objetivos=/);
    expect(actions).not.toMatch(/aciertos=/);
    expect(actions).not.toMatch(/createServerSupabaseClient/);
  });

  it('persistencia usa cliente SSR (JWT) y user_id de sesión', () => {
    const persist = readFileSync('lib/exequatur/diagnostico/persistencia.ts', 'utf8');
    expect(persist).toMatch(/createSupabaseServerClient/);
    expect(persist).not.toMatch(/createServerSupabaseClient/);
    expect(persist).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(persist).toMatch(/auth\.getUser/);
    expect(persist).toMatch(/evaluarDiagnostico/);
  });

  it('migración no crea política ni GRANT de service_role', () => {
    const sql = readFileSync(
      'supabase/migrations/20260919000000_exequatur_diagnostico_intentos.sql',
      'utf8',
    );
    expect(sql).not.toMatch(/TO service_role/i);
    expect(sql).not.toMatch(/GRANT .+ TO service_role/i);
    expect(sql).toMatch(/user_id = auth\.uid\(\)/);
    expect(sql).toMatch(/REVOKE ALL ON public\.exequatur_diagnostico_intentos FROM PUBLIC, anon, service_role/);
  });
});
