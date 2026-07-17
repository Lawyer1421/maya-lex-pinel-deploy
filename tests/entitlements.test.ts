import { describe, it, expect, vi } from 'vitest';

function fakeSupabaseEntitlement(row: unknown) {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.or = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
  const from = vi.fn().mockReturnValue(chain);
  return { from } as any;
}

describe('resolveEntitlement', () => {
  it('devuelve null si no hay fila', async () => {
    const { resolveEntitlement } = await import('@/lib/entitlements');
    const supabase = fakeSupabaseEntitlement(null);
    const result = await resolveEntitlement(supabase, 'uuid-1', 'pro_access');
    expect(result).toBeNull();
  });

  it('mapea snake_case a camelCase cuando hay fila', async () => {
    const { resolveEntitlement } = await import('@/lib/entitlements');
    const supabase = fakeSupabaseEntitlement({
      id: 'ent-1', user_id: 'uuid-1', entitlement_key: 'pro_access',
      source_type: 'manual_beta', source_reference: null, status: 'active',
      active_from: '2026-01-01T00:00:00Z', active_until: null, reason: 'beta tester',
    });
    const result = await resolveEntitlement(supabase, 'uuid-1', 'pro_access');
    expect(result).toEqual({
      id: 'ent-1', userId: 'uuid-1', entitlementKey: 'pro_access',
      sourceType: 'manual_beta', sourceReference: null, status: 'active',
      activeFrom: '2026-01-01T00:00:00Z', activeUntil: null, reason: 'beta tester',
    });
  });
});

describe('resolveAccessWithEntitlements — entitlement-first, legado como fallback', () => {
  it('usa el entitlement cuando existe, sin tocar el adaptador legado', async () => {
    vi.resetModules();
    vi.doMock('@/lib/paypal/access', () => ({ resolveCurrentAccess: vi.fn() }));
    const { resolveAccessWithEntitlements } = await import('@/lib/entitlements');
    const access = await import('@/lib/paypal/access');

    const supabase = fakeSupabaseEntitlement({
      id: 'ent-1', user_id: 'uuid-1', entitlement_key: 'pro_access',
      source_type: 'manual_comped', source_reference: null, status: 'active',
      active_from: '2026-01-01T00:00:00Z', active_until: null, reason: null,
    });

    const result = await resolveAccessWithEntitlements({ supabase, userId: 'uuid-1', userIdentifier: 'email:x@y.com' });

    expect(result.accessGranted).toBe(true);
    expect(result.accessLabel).toBe('Acceso de cortesía');
    expect(result.sourceType).toBe('manual_comped');
    expect(access.resolveCurrentAccess).not.toHaveBeenCalled();
  });

  it('cae al adaptador legado cuando no hay userId', async () => {
    vi.resetModules();
    vi.doMock('@/lib/paypal/access', () => ({
      resolveCurrentAccess: vi.fn().mockResolvedValue({
        accessGranted: true, tier: 'pro', subscriptionStatus: 'active',
        pendingTier: null, source: 'queries_log', verificationPending: false, reasonCode: 'active_subscription',
      }),
    }));
    const { resolveAccessWithEntitlements } = await import('@/lib/entitlements');
    const supabase = fakeSupabaseEntitlement(null);

    const result = await resolveAccessWithEntitlements({ supabase, userId: null, userIdentifier: 'email:x@y.com' });

    expect(result.accessGranted).toBe(true);
    expect(result.sourceType).toBe('legacy_queries_log');
    expect(result.accessLabel).toBe('Usuario Pro');
  });

  it('billing_state_inconsistent legado nunca muestra "Plan gratuito" engañosamente — usa el label de verificando', async () => {
    vi.resetModules();
    vi.doMock('@/lib/paypal/access', () => ({
      resolveCurrentAccess: vi.fn().mockResolvedValue({
        accessGranted: false, tier: 'free', subscriptionStatus: 'active',
        pendingTier: 'pro', source: 'subscriptions', verificationPending: true, reasonCode: 'billing_state_inconsistent',
      }),
    }));
    const { resolveAccessWithEntitlements } = await import('@/lib/entitlements');
    const supabase = fakeSupabaseEntitlement(null);

    const result = await resolveAccessWithEntitlements({ supabase, userId: 'uuid-1', userIdentifier: 'email:x@y.com' });

    expect(result.accessGranted).toBe(false);
    expect(result.verificationPending).toBe(true);
    expect(result.accessLabel).toBe('Verificando tu suscripción');
  });

  it('sin entitlement ni suscripción: Plan gratuito', async () => {
    vi.resetModules();
    vi.doMock('@/lib/paypal/access', () => ({
      resolveCurrentAccess: vi.fn().mockResolvedValue({
        accessGranted: false, tier: 'free', subscriptionStatus: null,
        pendingTier: null, source: 'none', verificationPending: false, reasonCode: 'no_subscription',
      }),
    }));
    const { resolveAccessWithEntitlements } = await import('@/lib/entitlements');
    const supabase = fakeSupabaseEntitlement(null);

    const result = await resolveAccessWithEntitlements({ supabase, userId: 'uuid-1', userIdentifier: 'email:x@y.com' });
    expect(result.accessGranted).toBe(false);
    expect(result.accessLabel).toBe('Plan gratuito');
  });
});
