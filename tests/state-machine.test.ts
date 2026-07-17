import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/paypal/client', () => ({
  getAccessToken: vi.fn().mockResolvedValue('fake-access-token'),
  getPayPalBaseUrl: vi.fn().mockReturnValue('https://fake-paypal.example'),
}));

async function freshStateMachine() {
  vi.resetModules();
  process.env.PAYPAL_PRO_PLAN_ID = 'P-PRO-1';
  process.env.PAYPAL_ACADEMICO_PLAN_ID = 'P-ACAD-1';
  return import('@/lib/paypal/state-machine');
}

describe('parseCustomId', () => {
  it('parsea el formato nuevo (JSON) con uid', async () => {
    const { parseCustomId } = await freshStateMachine();
    expect(parseCustomId('{"p":"academico","u":"email:x@y.com"}')).toEqual({
      tier: 'academico', uid: 'email:x@y.com',
    });
  });

  it('formato nuevo sin u → uid null', async () => {
    const { parseCustomId } = await freshStateMachine();
    expect(parseCustomId('{"p":"pro"}')).toEqual({ tier: 'pro', uid: null });
  });

  it('formato legado "academico" → sin uid', async () => {
    const { parseCustomId } = await freshStateMachine();
    expect(parseCustomId('academico')).toEqual({ tier: 'academico', uid: null });
  });

  it('formato legado "pro" → sin uid', async () => {
    const { parseCustomId } = await freshStateMachine();
    expect(parseCustomId('pro')).toEqual({ tier: 'pro', uid: null });
  });

  it('undefined/null → default pro sin uid', async () => {
    const { parseCustomId } = await freshStateMachine();
    expect(parseCustomId(undefined)).toEqual({ tier: 'pro', uid: null });
    expect(parseCustomId(null)).toEqual({ tier: 'pro', uid: null });
  });

  it('JSON malformado cae al parseo legado', async () => {
    const { parseCustomId } = await freshStateMachine();
    expect(parseCustomId('{not json')).toEqual({ tier: 'pro', uid: null });
  });
});

describe('buildUserIdentifier', () => {
  it('prioriza email', async () => {
    const { buildUserIdentifier } = await freshStateMachine();
    expect(buildUserIdentifier('x@y.com', 'PAYER1', 'SUB1')).toBe('email:x@y.com');
  });
  it('usa payerId si no hay email', async () => {
    const { buildUserIdentifier } = await freshStateMachine();
    expect(buildUserIdentifier(null, 'PAYER1', 'SUB1')).toBe('paypal:PAYER1');
  });
  it('usa subId como último recurso', async () => {
    const { buildUserIdentifier } = await freshStateMachine();
    expect(buildUserIdentifier(null, null, 'SUB1')).toBe('sub:SUB1');
  });
});

describe('verifyCanonicalSubscription', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('verified_active cuando todo coincide', async () => {
    const { verifyCanonicalSubscription } = await freshStateMachine();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ id: 'SUB1', status: 'ACTIVE', plan_id: 'P-PRO-1', custom_id: '{"p":"pro","u":"email:x@y.com"}' }),
    });
    const result = await verifyCanonicalSubscription({ paypalSubId: 'SUB1', expectedUid: 'email:x@y.com', expectedTier: 'pro' });
    expect(result).toEqual({ ok: true, reason: 'verified_active', status: 'ACTIVE' });
  });

  // Escenario #14: PayPal devuelve 404
  it('not_found cuando PayPal devuelve 404', async () => {
    const { verifyCanonicalSubscription } = await freshStateMachine();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 404 });
    const result = await verifyCanonicalSubscription({ paypalSubId: 'SUB1', expectedUid: 'email:x@y.com', expectedTier: 'pro' });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('not_found');
  });

  // Escenario #15: PayPal no responde (timeout/red)
  it('paypal_error cuando fetch lanza (timeout/red)', async () => {
    const { verifyCanonicalSubscription } = await freshStateMachine();
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network timeout'));
    const result = await verifyCanonicalSubscription({ paypalSubId: 'SUB1', expectedUid: 'email:x@y.com', expectedTier: 'pro' });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('paypal_error');
  });

  // Escenario #13: estado PayPal no ACTIVE
  it('not_active cuando PayPal reporta un status distinto de ACTIVE', async () => {
    const { verifyCanonicalSubscription } = await freshStateMachine();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ id: 'SUB1', status: 'APPROVAL_PENDING', plan_id: 'P-PRO-1', custom_id: '{"p":"pro","u":"email:x@y.com"}' }),
    });
    const result = await verifyCanonicalSubscription({ paypalSubId: 'SUB1', expectedUid: 'email:x@y.com', expectedTier: 'pro' });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('not_active');
    expect(result.status).toBe('APPROVAL_PENDING');
  });

  // Escenario #12: plan_id no permitido
  it('plan_mismatch cuando el plan_id no corresponde al tier esperado', async () => {
    const { verifyCanonicalSubscription } = await freshStateMachine();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ id: 'SUB1', status: 'ACTIVE', plan_id: 'P-DESCONOCIDO', custom_id: '{"p":"pro","u":"email:x@y.com"}' }),
    });
    const result = await verifyCanonicalSubscription({ paypalSubId: 'SUB1', expectedUid: 'email:x@y.com', expectedTier: 'pro' });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('plan_mismatch');
  });

  // Escenario #11: custom_id de otro usuario
  it('custom_id_mismatch cuando el uid no coincide con el usuario esperado', async () => {
    const { verifyCanonicalSubscription } = await freshStateMachine();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ id: 'SUB1', status: 'ACTIVE', plan_id: 'P-PRO-1', custom_id: '{"p":"pro","u":"email:OTRO@y.com"}' }),
    });
    const result = await verifyCanonicalSubscription({ paypalSubId: 'SUB1', expectedUid: 'email:x@y.com', expectedTier: 'pro' });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('custom_id_mismatch');
  });

  it('sub_id_mismatch cuando el id devuelto no coincide con el solicitado', async () => {
    const { verifyCanonicalSubscription } = await freshStateMachine();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ id: 'SUB-OTRO', status: 'ACTIVE', plan_id: 'P-PRO-1', custom_id: '{"p":"pro","u":"email:x@y.com"}' }),
    });
    const result = await verifyCanonicalSubscription({ paypalSubId: 'SUB1', expectedUid: 'email:x@y.com', expectedTier: 'pro' });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('sub_id_mismatch');
  });
});

describe('syncLegacyPaidAccess', () => {
  function fakeSupabase(upsertResult: { error: unknown } = { error: null }) {
    const upsert = vi.fn().mockResolvedValue(upsertResult);
    const from = vi.fn().mockReturnValue({ upsert });
    return { client: { from } as any, upsert };
  }

  // Escenario #19: queries_log NO cambia con CREATED/estados no otorgantes
  it.each(['CREATED', 'APPROVAL_PENDING', 'trialing', 'pending', 'past_due', 'cancelled'])(
    'rechaza verifiedStatus=%s (no otorga acceso)',
    async (status) => {
      const { syncLegacyPaidAccess } = await freshStateMachine();
      const { client, upsert } = fakeSupabase();
      await expect(
        syncLegacyPaidAccess(client, { userIdentifier: 'email:x@y.com', tier: 'pro', verifiedStatus: status })
      ).rejects.toThrow();
      expect(upsert).not.toHaveBeenCalled();
    }
  );

  // Escenario #20: queries_log SÍ cambia con ACTIVATED verificado (status='active')
  it("permite y escribe queries_log cuando verifiedStatus='active'", async () => {
    const { syncLegacyPaidAccess } = await freshStateMachine();
    const { client, upsert } = fakeSupabase();
    await syncLegacyPaidAccess(client, { userIdentifier: 'email:x@y.com', tier: 'pro', verifiedStatus: 'active' });
    expect(upsert).toHaveBeenCalledTimes(1);
    const [payload, opts] = upsert.mock.calls[0];
    expect(payload).toMatchObject({ user_identifier: 'email:x@y.com', tier: 'pro' });
    expect(opts).toMatchObject({ onConflict: 'user_identifier,query_date' });
  });

  it('propaga el error si el upsert de Supabase falla', async () => {
    const { syncLegacyPaidAccess } = await freshStateMachine();
    const { client } = fakeSupabase({ error: new Error('db down') });
    await expect(
      syncLegacyPaidAccess(client, { userIdentifier: 'email:x@y.com', tier: 'pro', verifiedStatus: 'active' })
    ).rejects.toThrow();
  });
});

describe('applySubscriptionEvent', () => {
  function fakeSupabaseRpc(data: unknown, error: unknown = null) {
    const rpc = vi.fn().mockResolvedValue({ data, error });
    return { client: { rpc } as any, rpc };
  }

  it('mapea la respuesta jsonb (snake_case) a camelCase', async () => {
    const { applySubscriptionEvent } = await freshStateMachine();
    const { client, rpc } = fakeSupabaseRpc({
      applied: true, reason: 'created',
      resulting_status: 'trialing', resulting_tier: 'pro', resulting_sub_id: 'SUB1',
    });

    const result = await applySubscriptionEvent(client, {
      userIdentifier: 'email:x@y.com', paypalSubId: 'SUB1', paypalPayerId: null, email: 'x@y.com',
      tier: 'pro', newStatus: 'trialing', grantsAccess: false, eventType: 'BILLING.SUBSCRIPTION.CREATED',
    });

    expect(result).toEqual({
      applied: true, reason: 'created',
      resultingStatus: 'trialing', resultingTier: 'pro', resultingSubId: 'SUB1',
    });
    expect(rpc).toHaveBeenCalledWith('paypal_apply_event', expect.objectContaining({
      p_user_identifier: 'email:x@y.com',
      p_paypal_sub_id: 'SUB1',
      p_new_status: 'trialing',
      p_grants_access: false,
      p_event_type: 'BILLING.SUBSCRIPTION.CREATED',
    }));
  });

  it('lanza si la RPC devuelve error', async () => {
    const { applySubscriptionEvent } = await freshStateMachine();
    const { client } = fakeSupabaseRpc(null, new Error('db error'));
    await expect(
      applySubscriptionEvent(client, {
        userIdentifier: 'email:x@y.com', paypalSubId: 'SUB1', paypalPayerId: null, email: null,
        tier: 'pro', newStatus: 'trialing', grantsAccess: false, eventType: 'BILLING.SUBSCRIPTION.CREATED',
      })
    ).rejects.toThrow();
  });
});
