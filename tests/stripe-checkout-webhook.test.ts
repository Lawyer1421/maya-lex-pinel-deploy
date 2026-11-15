/**
 * Stripe Checkout + cancelación agnóstica (feat/stripe-checkout-webhook). Sin red ni credenciales: fetch, Supabase y la sesión simulados.
 * Complementa tests/stripe-billing.test.ts (checkout/webhook base) y tests/sql/stripe-billing.sql.test.ts (stripe_apply_event real).
 */
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { proveedorDeFila, puedeCancelar, rutaCancelacion } from '@/lib/billing/proveedor';
import { decidirDestinoCheckout, MENSAJE_ERROR_TARJETA, URL_LOGIN_TARJETA } from '@/app/components/StripeCheckoutButton';
import { firmaStripe } from '@/lib/stripe/firma';

const ENV = { ...process.env };
const SECRETO = 'whsec_prueba';

function activarStripe() {
  process.env.STRIPE_ENABLED = '1';
  process.env.STRIPE_SECRET_KEY = 'sk_test_falsa';
  process.env.STRIPE_WEBHOOK_SECRET = SECRETO;
  process.env.STRIPE_PRICE_PRO = 'price_pro';
}

beforeEach(() => vi.resetModules());
afterEach(() => {
  process.env = { ...ENV };
  vi.unstubAllGlobals();
  for (const m of ['@/lib/supabase', '@/lib/supabase-ssr', '@/lib/rate-limit']) vi.doUnmock(m);
});

describe('lib/billing/proveedor (puro)', () => {
  it('solo provider=stripe es Stripe; ausente, nulo u otro valor = PayPal (comportamiento previo)', () => {
    expect(proveedorDeFila({ provider: 'stripe' })).toBe('stripe');
    for (const f of [{ provider: 'paypal' }, { provider: null }, {}, null, undefined, { provider: 'STRIPE' }]) expect(proveedorDeFila(f)).toBe('paypal');
  });
  it('ruta de cancelación por proveedor', () => {
    expect(rutaCancelacion('paypal')).toBe('/api/paypal/cancel-subscription');
    expect(rutaCancelacion('stripe')).toBe('/api/stripe/cancel-subscription');
  });
  it.each([
    [{ provider: 'paypal', status: 'active' }, true],
    [{ provider: 'paypal', status: 'past_due' }, false],
    [{ provider: 'stripe', status: 'active' }, true],
    [{ provider: 'stripe', status: 'past_due' }, true],
    [{ provider: 'stripe', status: 'cancelled' }, false],
    [{ provider: 'stripe', status: 'trialing' }, false],
    [{ provider: 'stripe', status: 'pending' }, false],
    [null, false],
  ])('puedeCancelar(%j) = %s', (fila, esperado) => expect(puedeCancelar(fila)).toBe(esperado));
});

describe('lib/billing/tarjeta (servidor)', () => {
  it('apagado por defecto: nunca se ofrece tarjeta', async () => {
    const { pagoConTarjetaDisponible } = await import('@/lib/billing/tarjeta');
    expect(pagoConTarjetaDisponible('pro')).toBe(false);
  });
  it('encendido: solo para los planes con precio configurado', async () => {
    activarStripe();
    const { pagoConTarjetaDisponible } = await import('@/lib/billing/tarjeta');
    expect(pagoConTarjetaDisponible('pro')).toBe(true);
    expect(pagoConTarjetaDisponible('academico')).toBe(false);
    expect(pagoConTarjetaDisponible(undefined)).toBe(false);
  });
  it('STRIPE_ENABLED sin claves no basta', async () => {
    process.env.STRIPE_ENABLED = '1';
    process.env.STRIPE_PRICE_PRO = 'price_pro';
    const { pagoConTarjetaDisponible } = await import('@/lib/billing/tarjeta');
    expect(pagoConTarjetaDisponible('pro')).toBe(false);
  });
});

describe('StripeCheckoutButton: decisión sobre la respuesta de /api/stripe/checkout', () => {
  it('401 → login sin reanudar el checkout de PayPal', () => {
    expect(decidirDestinoCheckout(401, {})).toEqual({ tipo: 'redirigir', url: URL_LOGIN_TARJETA });
    expect(URL_LOGIN_TARJETA).not.toContain('plan=');
  });
  it('409 ya suscrito → mensaje y /cuenta; 409 por PayPal activo → solo el mensaje', () => {
    expect(decidirDestinoCheckout(409, { error: 'Ya tiene una suscripción activa.', code: 'ALREADY_SUBSCRIBED' })).toEqual({ tipo: 'error', mensaje: 'Ya tiene una suscripción activa.', irA: '/cuenta' });
    expect(decidirDestinoCheckout(409, { error: 'Cancele PayPal primero.', code: 'PROVIDER_SWITCH_REQUIRES_CANCEL' })).toEqual({ tipo: 'error', mensaje: 'Cancele PayPal primero.' });
  });
  it('200 con URL de checkout.stripe.com → redirige', () => {
    expect(decidirDestinoCheckout(200, { url: 'https://checkout.stripe.com/c/pay/cs_1' })).toEqual({ tipo: 'redirigir', url: 'https://checkout.stripe.com/c/pay/cs_1' });
  });
  it.each(['https://evil.example/c/cs_1', 'http://checkout.stripe.com/c/cs_1', 'https://checkout.stripe.com.evil.example/x', 'javascript:alert(1)', 'no-es-url', undefined])(
    'nunca redirige a %j',
    (url) => expect(decidirDestinoCheckout(200, { url })).toEqual({ tipo: 'error', mensaje: MENSAJE_ERROR_TARJETA }),
  );
  it('502 → mensaje genérico (nunca detalles del backend); 400 muestra el motivo de validación', () => {
    expect(decidirDestinoCheckout(502, { error: 'Stripe 500 (api_error)' })).toEqual({ tipo: 'error', mensaje: MENSAJE_ERROR_TARJETA });
    expect(decidirDestinoCheckout(400, { error: 'Plan no disponible con tarjeta por ahora.' })).toEqual({ tipo: 'error', mensaje: 'Plan no disponible con tarjeta por ahora.' });
  });
});

// ── POST /api/stripe/cancel-subscription ────────────────────────────────────────────────────────────────────────────────────────
interface Fila { provider: string; provider_subscription_id: string | null; provider_customer_id?: string | null; status: string; tier: string }

function simularCancelacion(o: { email?: string | null; fila?: Fila | null; rpcError?: boolean }) {
  const rpc = vi.fn(async () => (o.rpcError
    ? { data: null, error: new Error('db caída') }
    : { data: { applied: true, reason: 'downgraded', resulting_status: 'cancelled', resulting_tier: 'free', resulting_sub_id: 'sub_1' }, error: null }));
  const filtros: Array<[string, unknown]> = [];
  vi.doMock('@/lib/supabase-ssr', () => ({
    createSupabaseServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: o.email === null ? null : { email: o.email ?? 'Cliente@X.com' } } }) } }),
  }));
  vi.doMock('@/lib/rate-limit', () => ({ buildUserIdentifierFromEmail: (e: string) => `email:${e.trim().toLowerCase()}` }));
  vi.doMock('@/lib/supabase', () => ({
    createServerSupabaseClient: () => ({
      rpc,
      from: () => {
        const chain: Record<string, unknown> = {};
        Object.assign(chain, {
          select: () => chain,
          eq: (c: string, v: unknown) => { filtros.push([c, v]); return chain; },
          maybeSingle: async () => ({ data: o.fila ?? null, error: null }),
        });
        return chain;
      },
    }),
  }));
  return { rpc, filtros };
}

/** fetch simulado de la API de Stripe: DELETE y GET de /subscriptions/:id. */
function stripeApi(o: { estadoTrasCancelar?: string; deleteFalla?: boolean; getFalla?: boolean } = {}) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const metodo = init?.method ?? 'GET';
    if (metodo === 'DELETE' && o.deleteFalla) return new Response(JSON.stringify({ error: { type: 'invalid_request_error' } }), { status: 400 });
    if (metodo === 'GET' && o.getFalla) return new Response('{}', { status: 503 });
    return new Response(JSON.stringify({ id: 'sub_1', status: o.estadoTrasCancelar ?? 'canceled', customer: 'cus_1', metadata: {} }), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const FILA_STRIPE: Fila = { provider: 'stripe', provider_subscription_id: 'sub_1', provider_customer_id: 'cus_1', status: 'active', tier: 'pro' };
const cancelar = async () => {
  const { POST } = await import('@/app/api/stripe/cancel-subscription/route');
  return POST(new Request('http://x/api/stripe/cancel-subscription', { method: 'POST', body: '{"subscriptionId":"sub_AJENA"}' }) as never);
};

describe('POST /api/stripe/cancel-subscription', () => {
  it('apagado por defecto: 404 sin tocar Stripe ni la base', async () => {
    const { rpc } = simularCancelacion({ fila: FILA_STRIPE });
    const f = stripeApi();
    expect((await cancelar()).status).toBe(404);
    expect(f).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
  it('sin sesión: 401', async () => {
    activarStripe();
    simularCancelacion({ email: null });
    const f = stripeApi();
    expect((await cancelar()).status).toBe(401);
    expect(f).not.toHaveBeenCalled();
  });
  it('suscripción de PayPal (o ninguna): 404 y no llama a Stripe', async () => {
    activarStripe();
    for (const fila of [{ ...FILA_STRIPE, provider: 'paypal' }, null]) {
      vi.resetModules();
      simularCancelacion({ fila });
      const f = stripeApi();
      expect((await cancelar()).status).toBe(404);
      expect(f).not.toHaveBeenCalled();
    }
  });
  it('suscripción ya cancelada: 409', async () => {
    activarStripe();
    simularCancelacion({ fila: { ...FILA_STRIPE, status: 'cancelled' } });
    const f = stripeApi();
    expect((await cancelar()).status).toBe(409);
    expect(f).not.toHaveBeenCalled();
  });
  it('cancela DE INMEDIATO la suscripción de SU fila (nunca la del cuerpo), relee el estado y revoca con stripe_apply_event', async () => {
    activarStripe();
    const { rpc, filtros } = simularCancelacion({ fila: FILA_STRIPE });
    const f = stripeApi();
    const res = await cancelar();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ cancelado: true });
    expect(filtros).toContainEqual(['user_identifier', 'email:cliente@x.com']);
    const llamadas = f.mock.calls.map(([url, init]) => `${(init as RequestInit | undefined)?.method ?? 'GET'} ${url}`);
    expect(llamadas).toEqual(['DELETE https://api.stripe.com/v1/subscriptions/sub_1', 'GET https://api.stripe.com/v1/subscriptions/sub_1']);
    expect(JSON.stringify(f.mock.calls)).not.toContain('sub_AJENA');
    expect(rpc).toHaveBeenCalledWith('stripe_apply_event', expect.objectContaining({
      p_user_identifier: 'email:cliente@x.com', p_subscription_id: 'sub_1', p_new_status: 'cancelled', p_tier: 'pro', p_event_type: 'USER_INITIATED_CANCEL',
    }));
  });
  it('past_due también se puede cancelar (Stripe sigue reintentando el cobro)', async () => {
    activarStripe();
    const { rpc } = simularCancelacion({ fila: { ...FILA_STRIPE, status: 'past_due' } });
    stripeApi();
    expect((await cancelar()).status).toBe(200);
    expect(rpc).toHaveBeenCalled();
  });
  it('el DELETE falla pero Stripe ya la reporta cancelada: se sincroniza igual', async () => {
    activarStripe();
    const { rpc } = simularCancelacion({ fila: FILA_STRIPE });
    stripeApi({ deleteFalla: true });
    expect((await cancelar()).status).toBe(200);
    expect(rpc).toHaveBeenCalled();
  });
  it('Stripe no confirma la cancelación: 502 y NO se revoca localmente', async () => {
    activarStripe();
    const { rpc } = simularCancelacion({ fila: FILA_STRIPE });
    stripeApi({ estadoTrasCancelar: 'active' });
    expect((await cancelar()).status).toBe(502);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('Stripe no responde: 502 sin cambios locales', async () => {
    activarStripe();
    const { rpc } = simularCancelacion({ fila: FILA_STRIPE });
    stripeApi({ getFalla: true });
    expect((await cancelar()).status).toBe(502);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('cancelada en Stripe pero falla la base: 200 (la cancelación es real; el webhook sincroniza)', async () => {
    activarStripe();
    simularCancelacion({ fila: FILA_STRIPE, rpcError: true });
    stripeApi();
    expect((await cancelar()).status).toBe(200);
  });
});

describe('webhook: customer.subscription.deleted revoca de inmediato (paridad con PayPal)', () => {
  it('aplica cancelled con el estado releído de la API', async () => {
    activarStripe();
    const rpc = vi.fn(async () => ({ data: { applied: true, reason: 'downgraded', resulting_status: 'cancelled', resulting_tier: 'free', resulting_sub_id: 'sub_1' }, error: null }));
    vi.doMock('@/lib/supabase', () => ({
      createServerSupabaseClient: () => ({
        rpc,
        from: () => {
          const chain: Record<string, unknown> = {};
          Object.assign(chain, {
            insert: async () => ({ error: null }),
            update: () => ({ eq: async () => ({ error: null }) }),
            select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: null, error: null }),
          });
          return chain;
        },
      }),
    }));
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      id: 'sub_1', status: 'canceled', customer: 'cus_1', metadata: { user_identifier: 'email:cliente@x.com', tier: 'pro' }, items: { data: [{ price: { id: 'price_pro' } }] },
    }), { status: 200 })));
    const cuerpo = JSON.stringify({ id: 'evt_del', type: 'customer.subscription.deleted', created: 1, data: { object: { id: 'sub_1', object: 'subscription', status: 'canceled' } } });
    const t = Math.floor(Date.now() / 1000);
    const { POST } = await import('@/app/api/stripe/webhook/route');
    const res = await POST(new Request('http://x/api/stripe/webhook', { method: 'POST', body: cuerpo, headers: { 'stripe-signature': `t=${t},v1=${firmaStripe(cuerpo, SECRETO, t)}` } }) as never);
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('stripe_apply_event', expect.objectContaining({ p_new_status: 'cancelled', p_subscription_id: 'sub_1' }));
  });
});

describe('bypass de fundador intacto', () => {
  it('ningún archivo de Stripe ni de lib/billing importa el módulo del fundador (no lo amplían ni lo recortan)', () => {
    for (const f of [
      'app/api/stripe/checkout/route.ts', 'app/api/stripe/webhook/route.ts', 'app/api/stripe/cancel-subscription/route.ts',
      'lib/billing/proveedor.ts', 'lib/billing/tarjeta.ts', 'lib/stripe/apply.ts', 'lib/stripe/client.ts',
    ]) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/lib\/founder/);
    }
  });
});
