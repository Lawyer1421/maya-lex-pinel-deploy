import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AccessTier, CurrentAccess } from '@/lib/paypal/access';
import { existsSync, readFileSync } from 'node:fs';

// Regresión de Slice 1: Slice 2 (currículo, adaptador, rutas /exequatur/modulos/*)
// no debe alterar la semántica de autorización ya establecida y probada en
// tests/exequatur-access.test.ts (que permanece intacto y sigue corriendo).
// Este archivo re-verifica los 4 puntos de política más críticos desde cero,
// como evidencia explícita de no-regresión para esta slice.
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

describe('Regresión Slice 1 — resolveExequaturAccess sin cambios tras Slice 2', () => {
  it('[R1] pro + flag ON -> ALLOW', async () => {
    mockResolveCurrentAccess.mockResolvedValue(accessFixture('pro'));
    mockIsFlagEnabled.mockResolvedValue(true);
    const r = await resolveExequaturAccess('email:x@test.com', 'x@test.com');
    expect(r.authorization).toBe('ALLOW');
    expect(r.granted).toBe(true);
  });

  it('[R2] admin + flag ON -> ALLOW_INTERNAL (nunca ALLOW, nunca se mapea a pro)', async () => {
    mockResolveCurrentAccess.mockResolvedValue(accessFixture('admin'));
    mockIsFlagEnabled.mockResolvedValue(true);
    const r = await resolveExequaturAccess('email:x@test.com', 'x@test.com');
    expect(r.authorization).toBe('ALLOW_INTERNAL');
    expect(r.tier).toBe('admin');
  });

  it('[R3] free/académico + flag ON -> DENY', async () => {
    for (const tier of ['free', 'academico'] as const) {
      mockResolveCurrentAccess.mockResolvedValue(accessFixture(tier));
      mockIsFlagEnabled.mockResolvedValue(true);
      const r = await resolveExequaturAccess('email:x@test.com', 'x@test.com');
      expect(r.authorization).toBe('DENY');
    }
  });

  it('[R4] tier elegible (pro o admin) + flag OFF -> DENY (el flag sigue siendo obligatorio)', async () => {
    for (const tier of ['pro', 'admin'] as const) {
      mockResolveCurrentAccess.mockResolvedValue(accessFixture(tier));
      mockIsFlagEnabled.mockResolvedValue(false);
      const r = await resolveExequaturAccess('email:x@test.com', 'x@test.com');
      expect(r.authorization).toBe('DENY');
    }
  });
});

describe('Regresión Slice 1 — las rutas nuevas de Slice 2 heredan el gate existente, no crean uno propio', () => {
  it('no existe ningún layout.tsx nuevo bajo app/exequatur/(protegido)/modulos -- el único gate sigue siendo app/exequatur/(protegido)/layout.tsx', () => {
    expect(existsSync('app/exequatur/(protegido)/modulos/layout.tsx')).toBe(false);
    expect(existsSync('app/exequatur/(protegido)/modulos/[moduloSlug]/layout.tsx')).toBe(false);
    expect(existsSync('app/exequatur/(protegido)/modulos/[moduloSlug]/[leccionSlug]/layout.tsx')).toBe(false);
  });

  it('la página de lección usa resolverReferenciaLegal -- nunca fabrica contenido legal localmente', () => {
    const contenido = readFileSync('app/exequatur/(protegido)/modulos/[moduloSlug]/[leccionSlug]/page.tsx', 'utf8');
    expect(contenido).toMatch(/resolverReferenciaLegal/);
  });
});
