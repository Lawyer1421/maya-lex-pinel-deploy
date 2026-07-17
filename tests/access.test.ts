import { describe, it, expect, vi } from 'vitest';

function fakeSupabase(subRow: unknown, usageRow: unknown) {
  const from = vi.fn((table: string) => {
    const chain: any = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.maybeSingle = vi.fn().mockResolvedValue({
      data: table === 'subscriptions' ? subRow : usageRow,
      error: null,
    });
    return chain;
  });
  return { from } as any;
}

async function freshAccess(subRow: unknown, usageRow: unknown) {
  vi.resetModules();
  vi.doMock('@/lib/supabase', () => ({
    createServerSupabaseClient: () => fakeSupabase(subRow, usageRow),
  }));
  return import('@/lib/paypal/access');
}

describe('resolveCurrentAccess — precedencia de fuentes', () => {
  it('accessGranted viene de queries_log, nunca de subscriptions.status', async () => {
    const { resolveCurrentAccess } = await freshAccess(
      { tier: 'pro', status: 'cancelled' }, // billing dice cancelado
      { tier: 'pro' } // pero el gate real todavía dice pro (desincronizado)
    );
    const access = await resolveCurrentAccess('email:x@y.com');
    expect(access.accessGranted).toBe(true);
    expect(access.tier).toBe('pro');
    expect(access.reasonCode).toBe('active_subscription');
  });

  // El caso que motivó este fix: billing dice 'active' pero el gate real
  // todavía no lo refleja — NUNCA debe verse como "free_tier"/paywall.
  it('billing=active + gate=free → billing_state_inconsistent, nunca free_tier', async () => {
    const { resolveCurrentAccess } = await freshAccess(
      { tier: 'pro', status: 'active' },
      null // queries_log aún no sincronizado
    );
    const access = await resolveCurrentAccess('email:x@y.com');
    expect(access.accessGranted).toBe(false);
    expect(access.reasonCode).toBe('billing_state_inconsistent');
    expect(access.verificationPending).toBe(true);
    expect(access.pendingTier).toBe('pro');
  });

  it('billing=trialing + gate=free → verification_pending', async () => {
    const { resolveCurrentAccess } = await freshAccess(
      { tier: 'academico', status: 'trialing' },
      null
    );
    const access = await resolveCurrentAccess('email:x@y.com');
    expect(access.reasonCode).toBe('verification_pending');
    expect(access.verificationPending).toBe(true);
  });

  it('billing=past_due + gate=free → payment_failed (no se trata como inconsistente)', async () => {
    const { resolveCurrentAccess } = await freshAccess(
      { tier: 'pro', status: 'past_due' },
      null
    );
    const access = await resolveCurrentAccess('email:x@y.com');
    expect(access.reasonCode).toBe('payment_failed');
    expect(access.verificationPending).toBe(false);
  });

  it('sin ninguna fuente → no_subscription', async () => {
    const { resolveCurrentAccess } = await freshAccess(null, null);
    const access = await resolveCurrentAccess('email:x@y.com');
    expect(access.reasonCode).toBe('no_subscription');
    expect(access.accessGranted).toBe(false);
  });
});
