/**
 * lib/stripe/client.ts — llamadas mínimas a la API REST de Stripe con fetch (sin dependencia nueva).
 * La clave secreta solo vive en el servidor (STRIPE_SECRET_KEY) y nunca se registra.
 */
import type { SubscriptionTier } from '@/lib/paypal/plans';
import { baseRetorno } from './config';
import { stripePriceIds } from './plans';

const STRIPE_API = 'https://api.stripe.com/v1';
const TIMEOUT_MS = 10_000;

/** Codifica parámetros anidados en el formato de formulario de Stripe: a[b][0][c]=v. */
export function codificarFormularioStripe(params: Record<string, unknown>, prefijo = ''): string {
  const partes: string[] = [];
  for (const [clave, valor] of Object.entries(params)) {
    if (valor === undefined || valor === null) continue;
    const nombre = prefijo ? `${prefijo}[${clave}]` : clave;
    if (Array.isArray(valor)) {
      valor.forEach((v, i) => {
        if (v !== null && typeof v === 'object') partes.push(codificarFormularioStripe(v as Record<string, unknown>, `${nombre}[${i}]`));
        else partes.push(`${encodeURIComponent(`${nombre}[${i}]`)}=${encodeURIComponent(String(v))}`);
      });
    } else if (typeof valor === 'object') {
      partes.push(codificarFormularioStripe(valor as Record<string, unknown>, nombre));
    } else {
      partes.push(`${encodeURIComponent(nombre)}=${encodeURIComponent(String(valor))}`);
    }
  }
  return partes.filter(Boolean).join('&');
}

async function stripeRequest<T>(metodo: 'GET' | 'POST', ruta: string, cuerpo?: Record<string, unknown>): Promise<T> {
  const clave = process.env.STRIPE_SECRET_KEY?.trim();
  if (!clave) throw new Error('Stripe no configurado');
  const res = await fetch(`${STRIPE_API}${ruta}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${clave}`,
      ...(cuerpo ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: cuerpo ? codificarFormularioStripe(cuerpo) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    // Solo el código y el tipo de error de Stripe: nunca el cuerpo completo (puede contener datos del cliente).
    let tipo = 'desconocido';
    try { tipo = ((await res.json()) as { error?: { type?: string } }).error?.type ?? tipo; } catch { /* sin cuerpo JSON */ }
    throw new Error(`Stripe ${res.status} (${tipo})`);
  }
  return (await res.json()) as T;
}

export interface SuscripcionStripe {
  id: string;
  status: string;
  customer: string | null;
  metadata?: Record<string, string>;
  items?: { data?: Array<{ price?: { id?: string } }> };
}

export function obtenerSuscripcion(id: string): Promise<SuscripcionStripe> {
  if (!/^sub_[A-Za-z0-9]+$/.test(id)) throw new Error('id de suscripción de Stripe inválido');
  return stripeRequest<SuscripcionStripe>('GET', `/subscriptions/${id}`);
}

/**
 * Crea una sesión de Checkout en modo suscripción. El user_identifier y el tier viajan en la metadata de la SUSCRIPCIÓN (los define este
 * servidor, nunca el navegador) para que el webhook sepa a quién activar.
 */
export async function crearCheckoutSession(p: { tier: SubscriptionTier; userIdentifier: string; email: string | null }): Promise<{ id: string; url: string }> {
  const precio = stripePriceIds()[p.tier];
  if (!precio) throw new Error(`Precio de Stripe no configurado para ${p.tier}`);
  const base = baseRetorno();
  const sesion = await stripeRequest<{ id: string; url: string }>('POST', '/checkout/sessions', {
    mode: 'subscription',
    line_items: [{ price: precio, quantity: 1 }],
    client_reference_id: p.userIdentifier.slice(0, 200),
    customer_email: p.email ?? undefined,
    success_url: `${base}/cuenta?stripe=ok`,
    cancel_url: `${base}/pricing?stripe=cancelado`,
    metadata: { user_identifier: p.userIdentifier, tier: p.tier },
    subscription_data: { metadata: { user_identifier: p.userIdentifier, tier: p.tier } },
  });
  if (!sesion?.url) throw new Error('Stripe no devolvió la URL de Checkout');
  return sesion;
}
