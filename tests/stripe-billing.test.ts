/**
 * Fase Stripe (2026-11-12): lib/stripe/* y las rutas /api/stripe/checkout y /api/stripe/webhook. Sin red ni credenciales reales: fetch y
 * Supabase simulados. La lógica de base de datos (stripe_apply_event) se prueba contra Postgres real en tests/sql/stripe-billing.sql.test.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mapearEstadoStripe } from '@/lib/stripe/estados';
import { firmaStripe, verificarFirmaStripe } from '@/lib/stripe/firma';
import { codificarFormularioStripe } from '@/lib/stripe/client';

const ENV = { ...process.env };
const SECRETO = 'whsec_prueba';

function activarStripe() {
  process.env.STRIPE_ENABLED = '1';
  process.env.STRIPE_SECRET_KEY = 'sk_test_falsa';
  process.env.STRIPE_WEBHOOK_SECRET = SECRETO;
  process.env.STRIPE_PRICE_PRO = 'price_pro';
  process.env.STRIPE_PRICE_ACADEMICO = 'price_acad';
}

afterEach(() => {
  process.env = { ...ENV };
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('mapeo de estados de Stripe', () => {
  it.each([
    ['trialing', 'trialing'], ['active', 'active'], ['past_due', 'past_due'], ['unpaid', 'past_due'],
    ['canceled', 'cancelled'], ['incomplete_expired', 'cancelled'], ['paused', 'cancelled'],
  ])('%s → %s', (stripe, interno) => expect(mapearEstadoStripe(stripe)).toBe(interno));

  it.each(['incomplete', 'desconocido', '', null, undefined])('%s → sin cambio (null)', (s) => expect(mapearEstadoStripe(s as string)).toBeNull());
});

describe('firma Stripe-Signature', () => {
  const cuerpo = '{"id":"evt_1"}';
  const t = 1_800_000_000;
  const cabecera = (c = cuerpo, tt = t) => `t=${tt},v1=${firmaStripe(c, SECRETO, tt)}`;

  it('acepta una firma válida dentro de la tolerancia', () => expect(verificarFirmaStripe(cuerpo, cabecera(), SECRETO, t + 10)).toBe(true));
  it('acepta si alguna de varias v1 coincide (rotación de secretos)', () =>
    expect(verificarFirmaStripe(cuerpo, `t=${t},v1=${'0'.repeat(64)},v1=${firmaStripe(cuerpo, SECRETO, t)}`, SECRETO, t)).toBe(true));
  it('rechaza un cuerpo alterado', () => expect(verificarFirmaStripe('{"id":"evt_2"}', cabecera(), SECRETO, t)).toBe(false));
  it('rechaza otro secreto', () => expect(verificarFirmaStripe(cuerpo, cabecera(), 'whsec_otro', t)).toBe(false));
  it('rechaza una firma fuera de la tolerancia (reenvío)', () => expect(verificarFirmaStripe(cuerpo, cabecera(), SECRETO, t + 301)).toBe(false));
  it.each([null, '', 'v1=abc', `t=${t}`, 't=x,v1=zz'])('rechaza una cabecera mal formada: %s', (h) => expect(verificarFirmaStripe(cuerpo, h, SECRETO, t)).toBe(false));
});

describe('formulario de la API de Stripe', () => {
  it('codifica parámetros anidados y listas', () => {
    const s = codificarFormularioStripe({ mode: 'subscription', line_items: [{ price: 'price_pro', quantity: 1 }], metadata: { tier: 'pro' }, x: undefined });
    expect(decodeURIComponent(s)).toBe('mode=subscription&line_items[0][price]=price_pro&line_items[0][quantity]=1&metadata[tier]=pro');
  });
});

describe('catálogo de precios', () => {
  it('solo acepta el precio exacto del tier', async () => {
    activarStripe();
    const { isStripePriceValidForTier } = await import('@/lib/stripe/plans');
    expect(isStripePriceValidForTier('price_pro', 'pro')).toBe(true);
    expect(isStripePriceValidForTier('price_acad', 'pro')).toBe(false);
    expect(isStripePriceValidForTier(null, 'pro')).toBe(false);
  });
});

// ── Rutas ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
interface Simulacion {
  usuario?: string;
  filaExistente?: { status: string; provider: string } | null;
  insertEventoError?: { code: string } | null;
  estadoPrevioEvento?: string | null;
}

function simular(s: Simulacion) {
  const rpc = vi.fn(async () => ({ data: { applied: true, reason: 'updated', resulting_status: 'active', resulting_tier: 'pro', resulting_sub_id: 'sub_1' }, error: null }));
  const updates: unknown[] = [];
  const inserts: unknown[] = [];
  vi.doMock('@/lib/rate-limit', () => ({ getUserIdentifierVerificado: vi.fn(async () => s.usuario ?? 'email:cliente@x.com') }));
  vi.doMock('@/lib/supabase', () => ({
    createServerSupabaseClient: () => ({
      rpc,
      from: (tabla: string) => {
        const chain: Record<string, unknown> = {};
        Object.assign(chain, {
          select: () => chain,
          eq: () => chain,
          maybeSingle: async () => ({ data: tabla === 'subscriptions' ? s.filaExistente ?? null : { processing_status: s.estadoPrevioEvento ?? null }, error: null }),
          insert: async (v: unknown) => { inserts.push(v); return { error: s.insertEventoError ?? null }; },
          update: (v: unknown) => { updates.push(v); return { eq: async () => ({ error: null }) }; },
        });
        return chain;
      },
    }),
  }));
  return { rpc, updates, inserts };
}

const req = (url: string, cuerpo: string, cabeceras: Record<string, string> = {}) =>
  new Request(url, { method: 'POST', body: cuerpo, headers: { 'content-type': 'application/json', ...cabeceras } }) as never;

describe('POST /api/stripe/checkout', () => {
  beforeEach(() => vi.resetModules());

  it('apagado por defecto: 404 sin tocar nada', async () => {
    const { rpc } = simular({});
    const { POST } = await import('@/app/api/stripe/checkout/route');
    expect((await POST(req('http://x/api/stripe/checkout', '{"plan":"pro"}'))).status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('sin sesión verificada: 401', async () => {
    activarStripe();
    simular({ usuario: 'ip:1.2.3.4' });
    const { POST } = await import('@/app/api/stripe/checkout/route');
    expect((await POST(req('http://x/api/stripe/checkout', '{"plan":"pro"}'))).status).toBe(401);
  });

  it('suscripción PayPal activa: 409 PROVIDER_SWITCH_REQUIRES_CANCEL y no llama a Stripe', async () => {
    activarStripe();
    simular({ filaExistente: { status: 'active', provider: 'paypal' } });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { POST } = await import('@/app/api/stripe/checkout/route');
    const res = await POST(req('http://x/api/stripe/checkout', '{"plan":"pro"}'));
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('PROVIDER_SWITCH_REQUIRES_CANCEL');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('crea la sesión con el usuario VERIFICADO en la metadata (nunca el del cuerpo) y devuelve la URL', async () => {
    activarStripe();
    simular({ filaExistente: { status: 'cancelled', provider: 'paypal' } });
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: 'cs_1', url: 'https://checkout.stripe.com/c/cs_1' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { POST } = await import('@/app/api/stripe/checkout/route');
    const res = await POST(req('http://x/api/stripe/checkout', '{"plan":"academico","user_identifier":"email:otro@x.com"}'));
    expect(res.status).toBe(200);
    expect((await res.json()).url).toBe('https://checkout.stripe.com/c/cs_1');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.stripe.com/v1/checkout/sessions');
    const form = decodeURIComponent(String(init.body));
    expect(form).toContain('line_items[0][price]=price_acad');
    expect(form).toContain('subscription_data[metadata][user_identifier]=email:cliente@x.com');
    expect(form).toContain('subscription_data[metadata][tier]=academico');
    expect(form).not.toContain('otro@x.com');
    expect(form).toContain('success_url=https://mayalexhn.com/cuenta?stripe=ok');
  });
});

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => vi.resetModules());

  const evento = (tipo: string, objeto: Record<string, unknown>) => JSON.stringify({ id: 'evt_1', type: tipo, created: 1_800_000_000, data: { object: objeto } });
  const firmado = (cuerpo: string) => {
    const t = Math.floor(Date.now() / 1000);
    return { 'stripe-signature': `t=${t},v1=${firmaStripe(cuerpo, SECRETO, t)}` };
  };
  const suscripcion = (extra: Record<string, unknown> = {}) => ({
    id: 'sub_1', status: 'active', customer: 'cus_1',
    metadata: { user_identifier: 'email:cliente@x.com', tier: 'pro' },
    items: { data: [{ price: { id: 'price_pro' } }] },
    ...extra,
  });

  it('apagado por defecto: 404', async () => {
    simular({});
    const { POST } = await import('@/app/api/stripe/webhook/route');
    expect((await POST(req('http://x/w', '{}'))).status).toBe(404);
  });

  it('firma inválida: 400 y nada se escribe', async () => {
    activarStripe();
    const { rpc, inserts } = simular({});
    const { POST } = await import('@/app/api/stripe/webhook/route');
    const res = await POST(req('http://x/w', evento('customer.subscription.updated', { id: 'sub_1', object: 'subscription' }), { 'stripe-signature': 't=1,v1=' + '0'.repeat(64) }));
    expect(res.status).toBe(400);
    expect(inserts).toHaveLength(0);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('reintento de un evento ya procesado: 200 duplicate sin volver a aplicar', async () => {
    activarStripe();
    const { rpc } = simular({ insertEventoError: { code: '23505' }, estadoPrevioEvento: 'processed' });
    const { POST } = await import('@/app/api/stripe/webhook/route');
    const cuerpo = evento('customer.subscription.updated', { id: 'sub_1', object: 'subscription' });
    const res = await POST(req('http://x/w', cuerpo, firmado(cuerpo)));
    expect(await res.json()).toMatchObject({ duplicate: true });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('usa el estado CANÓNICO de la API (no el del evento) y aplica con la metadata de nuestro servidor', async () => {
    activarStripe();
    const { rpc } = simular({});
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(suscripcion({ status: 'past_due' })), { status: 200 })));
    const { POST } = await import('@/app/api/stripe/webhook/route');
    // El evento dice «active», pero la API dice «past_due»: manda la API.
    const cuerpo = evento('customer.subscription.updated', { id: 'sub_1', object: 'subscription', status: 'active' });
    const res = await POST(req('http://x/w', cuerpo, firmado(cuerpo)));
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('stripe_apply_event', expect.objectContaining({
      p_user_identifier: 'email:cliente@x.com', p_subscription_id: 'sub_1', p_customer_id: 'cus_1', p_tier: 'pro', p_new_status: 'past_due',
    }));
  });

  it('checkout.session.completed toma el id de suscripción de la sesión', async () => {
    activarStripe();
    const { rpc } = simular({});
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(suscripcion()), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { POST } = await import('@/app/api/stripe/webhook/route');
    const cuerpo = evento('checkout.session.completed', { id: 'cs_1', object: 'checkout.session', mode: 'subscription', subscription: 'sub_1' });
    await POST(req('http://x/w', cuerpo, firmado(cuerpo)));
    expect(String((fetchMock.mock.calls[0] as unknown as [string])[0])).toBe('https://api.stripe.com/v1/subscriptions/sub_1');
    expect(rpc).toHaveBeenCalledWith('stripe_apply_event', expect.objectContaining({ p_new_status: 'active' }));
  });

  it.each([
    ['precio fuera del catálogo', suscripcion({ items: { data: [{ price: { id: 'price_falso' } }] } })],
    ['precio de otro tier', suscripcion({ items: { data: [{ price: { id: 'price_acad' } }] } })],
    ['usuario no verificado', suscripcion({ metadata: { user_identifier: 'ip:1.2.3.4', tier: 'pro' } })],
    ['tier desconocido', suscripcion({ metadata: { user_identifier: 'email:cliente@x.com', tier: 'gratis' } })],
  ])('rechaza sin conceder nada: %s', async (_n, sub) => {
    activarStripe();
    const { rpc, updates } = simular({});
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(sub), { status: 200 })));
    const { POST } = await import('@/app/api/stripe/webhook/route');
    const cuerpo = evento('customer.subscription.updated', { id: 'sub_1', object: 'subscription' });
    const res = await POST(req('http://x/w', cuerpo, firmado(cuerpo)));
    expect(await res.json()).toMatchObject({ rejected: true });
    expect(rpc).not.toHaveBeenCalled();
    expect(updates).toContainEqual(expect.objectContaining({ processing_status: 'rejected' }));
  });

  it('estado incompleto: ignorado, sin cambios', async () => {
    activarStripe();
    const { rpc } = simular({});
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(suscripcion({ status: 'incomplete' })), { status: 200 })));
    const { POST } = await import('@/app/api/stripe/webhook/route');
    const cuerpo = evento('customer.subscription.created', { id: 'sub_1', object: 'subscription' });
    expect(await (await POST(req('http://x/w', cuerpo, firmado(cuerpo)))).json()).toMatchObject({ ignored: true });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('evento que no es de suscripción: ignorado', async () => {
    activarStripe();
    const { rpc } = simular({});
    const { POST } = await import('@/app/api/stripe/webhook/route');
    const cuerpo = evento('invoice.paid', { id: 'in_1', object: 'invoice' });
    expect(await (await POST(req('http://x/w', cuerpo, firmado(cuerpo)))).json()).toMatchObject({ ignored: true });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('fallo de la API de Stripe: 500 (Stripe reintenta) y el evento queda como failed', async () => {
    activarStripe();
    const { rpc, updates } = simular({});
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })));
    const { POST } = await import('@/app/api/stripe/webhook/route');
    const cuerpo = evento('customer.subscription.updated', { id: 'sub_1', object: 'subscription' });
    expect((await POST(req('http://x/w', cuerpo, firmado(cuerpo)))).status).toBe(500);
    expect(rpc).not.toHaveBeenCalled();
    expect(updates).toContainEqual(expect.objectContaining({ processing_status: 'failed' }));
  });
});
