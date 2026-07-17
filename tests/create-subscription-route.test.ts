import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/rate-limit', () => ({
  getUserIdentifierVerificado: vi.fn().mockResolvedValue('email:x@y.com'),
}));

function buildFakeSupabase(existingSub: unknown) {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: existingSub, error: null }),
    upsert,
  };
  const from = vi.fn().mockReturnValue(chain);
  return { client: { from } as any, upsert };
}

vi.mock('@/lib/paypal/client', () => ({
  getAccessToken: vi.fn().mockResolvedValue('fake-token'),
  getPayPalBaseUrl: vi.fn().mockReturnValue('https://fake-paypal.example'),
}));

async function freshRoute() {
  vi.resetModules();
  process.env.PAYPAL_PRO_PLAN_ID = 'P-PRO-1';
  process.env.PAYPAL_ACADEMICO_PLAN_ID = 'P-ACAD-1';
  return import('@/app/api/paypal/create-subscription/route');
}

function fakeReq(body: unknown) {
  return { json: async () => body } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

describe('POST /api/paypal/create-subscription — prevención de doble suscripción', () => {
  // Escenario #22: create-subscription NO llama a PayPal para un usuario ya activo
  it('usuario ya activo en el mismo plan: 409 ALREADY_SUBSCRIBED, PayPal nunca se llama', async () => {
    vi.doMock('@/lib/supabase', () => {
      const { client } = buildFakeSupabase({ tier: 'pro', status: 'active', updated_at: new Date().toISOString() });
      return { createServerSupabaseClient: () => client };
    });
    const { POST } = await freshRoute();

    const res = await POST(fakeReq({ plan: 'pro' }));
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.code).toBe('ALREADY_SUBSCRIBED');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('usuario activo en otro plan: 409 PLAN_CHANGE_REQUIRED, PayPal nunca se llama', async () => {
    vi.doMock('@/lib/supabase', () => {
      const { client } = buildFakeSupabase({ tier: 'academico', status: 'active', updated_at: new Date().toISOString() });
      return { createServerSupabaseClient: () => client };
    });
    const { POST } = await freshRoute();

    const res = await POST(fakeReq({ plan: 'pro' }));
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.code).toBe('PLAN_CHANGE_REQUIRED');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('sin suscripción previa: crea la suscripción normalmente y sí llama a PayPal', async () => {
    vi.doMock('@/lib/supabase', () => {
      const { client } = buildFakeSupabase(null);
      return { createServerSupabaseClient: () => client };
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'SUB-NEW', links: [{ rel: 'approve', href: 'https://paypal.example/approve/SUB-NEW' }] }),
    });
    const { POST } = await freshRoute();

    const res = await POST(fakeReq({ plan: 'pro', email: 'x@y.com' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.subscriptionId).toBe('SUB-NEW');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
