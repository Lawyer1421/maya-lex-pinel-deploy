import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * POST /api/paypal/cancel-subscription — autogestión de baja.
 * Reportado por un suscriptor que no encontraba una opción visible para
 * cancelar. Cubre: solo cancela la suscripción vinculada a la sesión
 * propia, nunca llama a PayPal si no hay nada que cancelar localmente, y
 * solo sincroniza Supabase (downgrade) si PayPal confirma la cancelación
 * (o ya la tenía como no cancelable — 422).
 */

vi.mock('@/lib/paypal/client', () => ({
  getAccessToken: vi.fn().mockResolvedValue('fake-token'),
  getPayPalBaseUrl: vi.fn().mockReturnValue('https://fake-paypal.example'),
}));

vi.mock('@/lib/paypal/state-machine', () => ({
  applySubscriptionDowngrade: vi.fn(),
}));

function fakeSupabase(subRow: unknown) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: subRow, error: null }),
  };
  return { from: vi.fn().mockReturnValue(chain) };
}

// Re-registra el mock de supabase-ssr en CADA llamada (no un vi.mock estático
// compartido) para que el estado de sesión de una prueba nunca se filtre a
// la siguiente — vi.doMock() se re-declara fresco después de cada
// vi.resetModules(), a diferencia de un vi.mock() de nivel superior que solo
// se evalúa una vez.
async function freshRoute(subRow: unknown, opts: { autenticado?: boolean } = {}) {
  const { autenticado = true } = opts;
  vi.resetModules();
  vi.doMock('@/lib/supabase-ssr', () => ({
    createSupabaseServerClient: vi.fn().mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue(
          autenticado ? { data: { user: { email: 'x@y.com' } } } : { data: { user: null } }
        ),
      },
    }),
  }));
  vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => fakeSupabase(subRow) }));
  return import('@/app/api/paypal/cancel-subscription/route');
}

function fakeReq() {
  return {} as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

describe('POST /api/paypal/cancel-subscription', () => {
  it('sin sesión → 401, PayPal nunca se llama', async () => {
    const { POST } = await freshRoute(null, { autenticado: false });
    const res = await POST(fakeReq());
    expect(res.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('sin suscripción vinculada a la cuenta → 404, PayPal nunca se llama', async () => {
    const { POST } = await freshRoute(null);
    const res = await POST(fakeReq());
    expect(res.status).toBe(404);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('suscripción no activa (trialing) → 409, PayPal nunca se llama', async () => {
    const { POST } = await freshRoute({ paypal_sub_id: 'SUB-1', status: 'trialing', tier: 'pro' });
    const res = await POST(fakeReq());
    const data = await res.json();
    expect(res.status).toBe(409);
    expect(data.status).toBe('trialing');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('éxito: PayPal confirma cancelación (204) → sincroniza Supabase con status cancelled', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, status: 204 });
    const { POST } = await freshRoute({ paypal_sub_id: 'SUB-1', status: 'active', tier: 'pro' });
    const stateMachine = await import('@/lib/paypal/state-machine');
    (stateMachine.applySubscriptionDowngrade as any).mockResolvedValue({
      applied: true, reason: 'updated', resultingStatus: 'cancelled', resultingTier: 'free', resultingSubId: 'SUB-1',
    });

    const res = await POST(fakeReq());
    const data = await res.json();

    expect(data.cancelado).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/billing/subscriptions/SUB-1/cancel'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(stateMachine.applySubscriptionDowngrade).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ paypalSubId: 'SUB-1', newStatus: 'cancelled' })
    );
  });

  it('PayPal responde 422 (ya no cancelable de su lado) → se trata como éxito, sí sincroniza', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false, status: 422, text: async () => '{"name":"UNPROCESSABLE_ENTITY"}',
    });
    const { POST } = await freshRoute({ paypal_sub_id: 'SUB-2', status: 'active', tier: 'academico' });
    const stateMachine = await import('@/lib/paypal/state-machine');
    (stateMachine.applySubscriptionDowngrade as any).mockResolvedValue({
      applied: true, reason: 'updated', resultingStatus: 'cancelled', resultingTier: 'free', resultingSubId: 'SUB-2',
    });

    const res = await POST(fakeReq());
    const data = await res.json();

    expect(data.cancelado).toBe(true);
    expect(stateMachine.applySubscriptionDowngrade).toHaveBeenCalled();
  });

  it('PayPal responde error real (500) → 502, NUNCA sincroniza (no se finge una cancelación que no ocurrió)', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false, status: 500, text: async () => 'internal error',
    });
    const { POST } = await freshRoute({ paypal_sub_id: 'SUB-3', status: 'active', tier: 'pro' });
    const stateMachine = await import('@/lib/paypal/state-machine');

    const res = await POST(fakeReq());
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.cancelado).toBeUndefined();
    expect(stateMachine.applySubscriptionDowngrade).not.toHaveBeenCalled();
  });
});
