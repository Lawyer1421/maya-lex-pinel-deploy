import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AccessTier, CurrentAccess } from '@/lib/paypal/access';

// Mismo patrón que tests/exequatur-access.test.ts.
vi.mock('@/lib/paypal/access', () => ({
  resolveCurrentAccess: vi.fn(),
}));
vi.mock('@/lib/flags', () => ({
  isFlagEnabledForUser: vi.fn(),
}));

import { resolveCurrentAccess } from '@/lib/paypal/access';
import { isFlagEnabledForUser } from '@/lib/flags';
import { resolveMcpAccess } from '@/lib/mcp/access';

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

// PLAN-MCP-SLICE-1 §3.3 (espejo de Exequátur). El 401 por token inválido o
// ausente lo resuelve el handler antes de llamar a resolveMcpAccess.
describe('resolveMcpAccess — matriz de autorización MCP v1', () => {
  it.each([
    ['pro', true, 'ALLOW'],
    ['admin', true, 'ALLOW_INTERNAL'],
    ['free', true, 'DENY'],
    ['academico', true, 'DENY'],
    ['pro', false, 'DENY'],
    ['admin', false, 'DENY'],
  ] as const)('%s + flag %s -> %s', async (tier, flag, esperado) => {
    mockResolveCurrentAccess.mockResolvedValue(accessFixture(tier));
    mockIsFlagEnabled.mockResolvedValue(flag);
    const r = await resolveMcpAccess('email:x@ejemplo.com', 'x@ejemplo.com');
    expect(r.authorization).toBe(esperado);
    expect(r.granted).toBe(esperado !== 'DENY');
    expect(r.tier).toBe(tier);
    expect(r.flagEnabled).toBe(flag);
  });

  it('consulta flag_mcp_enabled (no el de Exequátur) con el correo', async () => {
    mockResolveCurrentAccess.mockResolvedValue(accessFixture('pro'));
    mockIsFlagEnabled.mockResolvedValue(true);
    await resolveMcpAccess('email:x@ejemplo.com', 'x@ejemplo.com');
    expect(mockIsFlagEnabled).toHaveBeenCalledWith('flag_mcp_enabled', 'x@ejemplo.com');
  });

  it('fallo al resolver el tier -> DENY aunque el flag esté ON', async () => {
    mockResolveCurrentAccess.mockRejectedValue(new Error('supabase caído'));
    mockIsFlagEnabled.mockResolvedValue(true);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await resolveMcpAccess('email:x@ejemplo.com', 'x@ejemplo.com');
    expect(r).toMatchObject({ authorization: 'DENY', granted: false, tier: 'free', eligibleTier: false });
    errorSpy.mockRestore();
  });

  it('el flag solo nunca otorga acceso: free + flag ON -> DENY, eligibleTier false', async () => {
    mockResolveCurrentAccess.mockResolvedValue(accessFixture('free'));
    mockIsFlagEnabled.mockResolvedValue(true);
    const r = await resolveMcpAccess('email:x@ejemplo.com', 'x@ejemplo.com');
    expect(r.eligibleTier).toBe(false);
    expect(r.granted).toBe(false);
  });

  it('con el identificador de la bolsa mcp: resuelve el tier con el de facturación', async () => {
    mockResolveCurrentAccess.mockResolvedValue(accessFixture('pro'));
    mockIsFlagEnabled.mockResolvedValue(true);
    await resolveMcpAccess('mcp:email:x@ejemplo.com', 'x@ejemplo.com');
    expect(mockResolveCurrentAccess).toHaveBeenCalledWith('email:x@ejemplo.com');
  });
});
