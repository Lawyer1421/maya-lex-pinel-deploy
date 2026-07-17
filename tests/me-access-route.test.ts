import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase-ssr', () => ({
  createSupabaseServerClient: vi.fn(),
}));
vi.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: vi.fn().mockReturnValue({}),
}));
vi.mock('@/lib/entitlements', () => ({
  resolveAccessWithEntitlements: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

describe('GET /api/me/access', () => {
  it('401 sin sesión', async () => {
    const ssr = await import('@/lib/supabase-ssr');
    (ssr.createSupabaseServerClient as any).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });
    const { GET } = await import('@/app/api/me/access/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('devuelve exactamente lo que resuelve resolveAccessWithEntitlements — Mi Cuenta y /api/chat consultan la misma fuente', async () => {
    const ssr = await import('@/lib/supabase-ssr');
    (ssr.createSupabaseServerClient as any).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'uuid-1', email: 'X@Y.com' } } }) },
    });
    const entitlements = await import('@/lib/entitlements');
    (entitlements.resolveAccessWithEntitlements as any).mockResolvedValue({
      accessGranted: true, accessLabel: 'Usuario Pro', sourceType: 'paypal_subscription',
      plan: 'pro', subscriptionStatus: 'active', verificationPending: false, activeUntil: null, reasonCode: 'entitlement_active',
    });

    const { GET } = await import('@/app/api/me/access/route');
    const res = await GET();
    const data = await res.json();

    expect(data.accessGranted).toBe(true);
    expect(data.accessLabel).toBe('Usuario Pro');
    // El email pasado a userIdentifier debe normalizarse (trim+lowercase)
    expect(entitlements.resolveAccessWithEntitlements).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'uuid-1', userIdentifier: 'email:x@y.com' })
    );
  });
});
