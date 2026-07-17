import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase-ssr', () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { email: 'x@y.com' } } }) },
  }),
}));

vi.mock('@/lib/paypal/state-machine', () => ({
  verifyCanonicalSubscription: vi.fn(),
  applySubscriptionEvent: vi.fn(),
  syncLegacyPaidAccess: vi.fn(),
}));

function fakeSupabase(subRow: unknown) {
  const tables: Record<string, any> = {};
  const from = vi.fn((table: string) => {
    if (tables[table]) return tables[table];
    const chain: any = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.upsert = vi.fn().mockResolvedValue({ error: null });
    chain.maybeSingle = vi.fn().mockResolvedValue({
      data: table === 'subscriptions' ? subRow : null, // billing_verification_attempts: sin intento previo
      error: null,
    });
    tables[table] = chain;
    return chain;
  });
  return { from } as any;
}

async function freshRoute(subRow: unknown) {
  vi.resetModules();
  vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => fakeSupabase(subRow) }));
  return import('@/app/api/paypal/verificar-estado/route');
}

function fakeReq(body: unknown) {
  return { json: async () => body } as any;
}

beforeEach(() => vi.clearAllMocks());

describe('POST /api/paypal/verificar-estado — sin fallback ciego', () => {
  // Escenario #18 (variante): subscriptionId del cliente que NO coincide
  // con la única suscripción vinculada localmente → RECONCILIATION_REQUIRED,
  // nunca se verifica el id ajeno contra PayPal.
  it('subscriptionId del cliente distinto al local: RECONCILIATION_REQUIRED, no llama a verifyCanonicalSubscription', async () => {
    const { POST } = await freshRoute({ paypal_sub_id: 'SUB-LOCAL', tier: 'pro', status: 'trialing' });
    const stateMachine = await import('@/lib/paypal/state-machine');

    const res = await POST(fakeReq({ subscriptionId: 'SUB-OTRA-DEL-CLIENTE' }));
    const data = await res.json();

    expect(data.verificacion).toBe('RECONCILIATION_REQUIRED');
    expect(stateMachine.verifyCanonicalSubscription).not.toHaveBeenCalled();
  });

  it('subscriptionId del cliente coincide con el local: procede a verificar', async () => {
    const { POST } = await freshRoute({ paypal_sub_id: 'SUB-LOCAL', tier: 'pro', status: 'trialing' });
    const stateMachine = await import('@/lib/paypal/state-machine');
    (stateMachine.verifyCanonicalSubscription as any).mockResolvedValue({ ok: true, reason: 'verified_active', status: 'ACTIVE' });
    (stateMachine.applySubscriptionEvent as any).mockResolvedValue({
      applied: true, reason: 'updated', resultingStatus: 'active', resultingTier: 'pro', resultingSubId: 'SUB-LOCAL',
    });

    const res = await POST(fakeReq({ subscriptionId: 'SUB-LOCAL' }));
    const data = await res.json();

    expect(stateMachine.verifyCanonicalSubscription).toHaveBeenCalledWith(expect.objectContaining({ paypalSubId: 'SUB-LOCAL' }));
    expect(data.sincronizado).toBe(true);
  });

  it('sin subscriptionId del cliente: usa la única suscripción local vinculada', async () => {
    const { POST } = await freshRoute({ paypal_sub_id: 'SUB-LOCAL', tier: 'pro', status: 'active' });
    const res = await POST(fakeReq({}));
    const data = await res.json();
    expect(data.estadoPaypal).toBe('ACTIVE');
  });

  it('sin ninguna suscripción local: no confía en un subscriptionId del cliente', async () => {
    const { POST } = await freshRoute(null);
    const stateMachine = await import('@/lib/paypal/state-machine');
    const res = await POST(fakeReq({ subscriptionId: 'SUB-INVENTADA' }));
    const data = await res.json();
    expect(data.tier).toBe('free');
    expect(stateMachine.verifyCanonicalSubscription).not.toHaveBeenCalled();
  });
});
