import { describe, it, expect, vi, beforeEach } from 'vitest';

// Aísla el DISPATCH del webhook (qué handler llama a qué, y cuándo se
// sincroniza queries_log) de la implementación real de la máquina de
// estados — esa parte tiene su propia suite en state-machine.test.ts.
// Ver tests/README.md para la limitación conocida de cobertura del SQL.
vi.mock('@/lib/paypal/state-machine', () => ({
  parseCustomId: vi.fn(),
  resolverUserIdentifier: vi.fn(),
  applySubscriptionEvent: vi.fn(),
  verifyCanonicalSubscription: vi.fn(),
  syncLegacyPaidAccess: vi.fn(),
}));

function buildFakeSupabase() {
  const tables = new Map<string, any>();
  const from = vi.fn((table: string) => {
    if (tables.has(table)) return tables.get(table);
    const chain: any = {
      _config: { maybeSingle: { data: null, error: null }, single: { data: null, error: null }, eqResult: { error: null } },
    };
    chain.select = vi.fn().mockReturnValue(chain);
    chain.update = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.maybeSingle = vi.fn(() => Promise.resolve(chain._config.maybeSingle));
    chain.single = vi.fn(() => Promise.resolve(chain._config.single));
    chain.then = (resolve: any, reject: any) => Promise.resolve(chain._config.eqResult).then(resolve, reject);
    tables.set(table, chain);
    return chain;
  });
  return { client: { from } as any, tables };
}

async function loadHandler() {
  const mod = await import('@/app/api/paypal/webhook/route');
  const stateMachine = await import('@/lib/paypal/state-machine');
  return { handlePayPalEvent: mod.handlePayPalEvent, stateMachine };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('handlePayPalEvent — BILLING.SUBSCRIPTION.CREATED', () => {
  it('nunca otorga acceso ni sincroniza queries_log', async () => {
    const { handlePayPalEvent, stateMachine } = await loadHandler();
    (stateMachine.parseCustomId as any).mockReturnValue({ tier: 'pro', uid: 'email:x@y.com' });
    (stateMachine.resolverUserIdentifier as any).mockResolvedValue('email:x@y.com');
    (stateMachine.applySubscriptionEvent as any).mockResolvedValue({
      applied: true, reason: 'created', resultingStatus: 'trialing', resultingTier: 'pro', resultingSubId: 'SUB1',
    });

    const { client } = buildFakeSupabase();
    await handlePayPalEvent(client, {
      event_type: 'BILLING.SUBSCRIPTION.CREATED',
      resource: { id: 'SUB1', custom_id: '{"p":"pro","u":"email:x@y.com"}', subscriber: {} },
    } as any, 'tx-1');

    expect(stateMachine.applySubscriptionEvent).toHaveBeenCalledWith(client, expect.objectContaining({
      newStatus: 'trialing', grantsAccess: false,
    }));
    expect(stateMachine.syncLegacyPaidAccess).not.toHaveBeenCalled();
  });
});

describe('handlePayPalEvent — BILLING.SUBSCRIPTION.ACTIVATED', () => {
  it('sin uid en custom_id: marca requires_reconciliation y NO llama a PayPal ni concede acceso', async () => {
    const { handlePayPalEvent, stateMachine } = await loadHandler();
    (stateMachine.parseCustomId as any).mockReturnValue({ tier: 'pro', uid: null });

    const { client, tables } = buildFakeSupabase();
    await handlePayPalEvent(client, {
      event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
      resource: { id: 'SUB1', custom_id: 'pro', subscriber: {} },
    } as any, 'tx-2');

    expect(stateMachine.verifyCanonicalSubscription).not.toHaveBeenCalled();
    expect(stateMachine.applySubscriptionEvent).not.toHaveBeenCalled();
    expect(tables.get('paypal_events').update).toHaveBeenCalledWith(
      expect.objectContaining({ requires_reconciliation: true })
    );
  });

  // Escenario #13/#14/#15 vistos desde el dispatcher: si la verificación
  // canónica falla, nunca se llega a applySubscriptionEvent.
  it('verificación canónica fallida: NO concede acceso', async () => {
    const { handlePayPalEvent, stateMachine } = await loadHandler();
    (stateMachine.parseCustomId as any).mockReturnValue({ tier: 'pro', uid: 'email:x@y.com' });
    (stateMachine.verifyCanonicalSubscription as any).mockResolvedValue({ ok: false, reason: 'not_active', status: 'APPROVAL_PENDING' });

    const { client } = buildFakeSupabase();
    await handlePayPalEvent(client, {
      event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
      resource: { id: 'SUB1', custom_id: '{"p":"pro","u":"email:x@y.com"}', subscriber: {} },
    } as any, 'tx-3');

    expect(stateMachine.applySubscriptionEvent).not.toHaveBeenCalled();
    expect(stateMachine.syncLegacyPaidAccess).not.toHaveBeenCalled();
  });

  it('verificado y aplicado a active: sincroniza queries_log', async () => {
    const { handlePayPalEvent, stateMachine } = await loadHandler();
    (stateMachine.parseCustomId as any).mockReturnValue({ tier: 'pro', uid: 'email:x@y.com' });
    (stateMachine.resolverUserIdentifier as any).mockResolvedValue('email:x@y.com');
    (stateMachine.verifyCanonicalSubscription as any).mockResolvedValue({ ok: true, reason: 'verified_active', status: 'ACTIVE' });
    (stateMachine.applySubscriptionEvent as any).mockResolvedValue({
      applied: true, reason: 'updated', resultingStatus: 'active', resultingTier: 'pro', resultingSubId: 'SUB1',
    });

    const { client } = buildFakeSupabase();
    await handlePayPalEvent(client, {
      event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
      resource: { id: 'SUB1', custom_id: '{"p":"pro","u":"email:x@y.com"}', subscriber: {} },
    } as any, 'tx-4');

    expect(stateMachine.syncLegacyPaidAccess).toHaveBeenCalledWith(client, expect.objectContaining({
      userIdentifier: 'email:x@y.com', tier: 'pro', verifiedStatus: 'active',
    }));
  });

  // Caso C de la matriz: suscripción activa distinta ya existe — nunca se
  // concede acceso a la nueva ni se toca queries_log.
  it('duplicate_active_subscription: NO sincroniza queries_log', async () => {
    const { handlePayPalEvent, stateMachine } = await loadHandler();
    (stateMachine.parseCustomId as any).mockReturnValue({ tier: 'pro', uid: 'email:x@y.com' });
    (stateMachine.resolverUserIdentifier as any).mockResolvedValue('email:x@y.com');
    (stateMachine.verifyCanonicalSubscription as any).mockResolvedValue({ ok: true, reason: 'verified_active', status: 'ACTIVE' });
    (stateMachine.applySubscriptionEvent as any).mockResolvedValue({
      applied: false, reason: 'duplicate_active_subscription', resultingStatus: 'active', resultingTier: 'pro', resultingSubId: 'SUB-VIEJA',
    });

    const { client } = buildFakeSupabase();
    await handlePayPalEvent(client, {
      event_type: 'BILLING.SUBSCRIPTION.ACTIVATED',
      resource: { id: 'SUB-NUEVA', custom_id: '{"p":"pro","u":"email:x@y.com"}', subscriber: {} },
    } as any, 'tx-5');

    expect(stateMachine.syncLegacyPaidAccess).not.toHaveBeenCalled();
  });
});

describe('handlePayPalEvent — PAYMENT.SALE.COMPLETED', () => {
  it('sin fila local para la subscription: marca requires_reconciliation, no llama a PayPal', async () => {
    const { handlePayPalEvent, stateMachine } = await loadHandler();
    const { client, tables } = buildFakeSupabase();
    tables.get('subscriptions'); // fuerza creación con config default
    const subsChain = client.from('subscriptions');
    subsChain._config.maybeSingle = { data: null, error: null };

    await handlePayPalEvent(client, {
      event_type: 'PAYMENT.SALE.COMPLETED',
      resource: { billing_agreement_id: 'SUB1' },
    } as any, 'tx-6');

    expect(stateMachine.verifyCanonicalSubscription).not.toHaveBeenCalled();
    expect(tables.get('paypal_events').update).toHaveBeenCalledWith(
      expect.objectContaining({ requires_reconciliation: true })
    );
  });

  it('con fila local y verificación OK: sincroniza queries_log usando el tier LOCAL, no el payer_email del evento', async () => {
    const { handlePayPalEvent, stateMachine } = await loadHandler();
    const { client, tables } = buildFakeSupabase();
    const subsChain = client.from('subscriptions');
    subsChain._config.maybeSingle = {
      data: { user_identifier: 'email:x@y.com', tier: 'academico', paypal_payer_id: 'PAYER1', email: 'x@y.com' },
      error: null,
    };
    (stateMachine.verifyCanonicalSubscription as any).mockResolvedValue({ ok: true, reason: 'verified_active', status: 'ACTIVE' });
    (stateMachine.applySubscriptionEvent as any).mockResolvedValue({
      applied: true, reason: 'updated', resultingStatus: 'active', resultingTier: 'academico', resultingSubId: 'SUB1',
    });

    await handlePayPalEvent(client, {
      event_type: 'PAYMENT.SALE.COMPLETED',
      resource: { billing_agreement_id: 'SUB1' },
    } as any, 'tx-7');

    expect(stateMachine.verifyCanonicalSubscription).toHaveBeenCalledWith(expect.objectContaining({
      paypalSubId: 'SUB1', expectedUid: 'email:x@y.com', expectedTier: 'academico',
    }));
    expect(stateMachine.syncLegacyPaidAccess).toHaveBeenCalledWith(client, expect.objectContaining({
      userIdentifier: 'email:x@y.com', tier: 'academico', verifiedStatus: 'active',
    }));
  });
});

describe('handlePayPalEvent — degradaciones', () => {
  it('CANCELLED degrada subscriptions a free/cancelled y refleja en queries_log', async () => {
    const { handlePayPalEvent } = await loadHandler();
    const { client, tables } = buildFakeSupabase();
    const subsChain = client.from('subscriptions');
    subsChain._config.single = { data: { user_identifier: 'email:x@y.com' }, error: null };

    await handlePayPalEvent(client, {
      event_type: 'BILLING.SUBSCRIPTION.CANCELLED',
      resource: { id: 'SUB1' },
    } as any, 'tx-8');

    expect(subsChain.update).toHaveBeenCalledWith(expect.objectContaining({ tier: 'free', status: 'cancelled' }));
    const queriesLogChain = tables.get('queries_log');
    expect(queriesLogChain.update).toHaveBeenCalledWith(expect.objectContaining({ tier: 'free' }));
  });

  it('PAYMENT.SALE.DENIED marca past_due sin tocar queries_log', async () => {
    const { handlePayPalEvent } = await loadHandler();
    const { client, tables } = buildFakeSupabase();

    await handlePayPalEvent(client, {
      event_type: 'PAYMENT.SALE.DENIED',
      resource: { billing_agreement_id: 'SUB1' },
    } as any, 'tx-9');

    expect(client.from('subscriptions').update).toHaveBeenCalledWith(expect.objectContaining({ status: 'past_due' }));
    expect(tables.has('queries_log')).toBe(false);
  });
});
