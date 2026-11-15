/**
 * lib/billing/proveedor.ts — decisiones de facturación independientes del proveedor (PayPal o Stripe). Módulo PURO: sin red, base de datos
 * ni variables de entorno, así que también lo usan componentes de cliente.
 *
 * El proveedor sale de la columna `subscriptions.provider` (migración 20261112000000; default 'paypal'). Cualquier valor distinto de
 * 'stripe' se trata como PayPal, el comportamiento previo a Stripe.
 *
 * Cancelación (decisión del Titular, 2026-11-15): con ambos proveedores el acceso se revoca DE INMEDIATO. Mejora futura: conceder acceso
 * hasta el fin del período pagado exigiría escribir current_period_end y leerlo en resolveCurrentAccess (lib/paypal/access.ts).
 */

export type ProveedorPago = 'paypal' | 'stripe';

export function proveedorDeFila(fila: { provider?: string | null } | null | undefined): ProveedorPago {
  return fila?.provider === 'stripe' ? 'stripe' : 'paypal';
}

const RUTA_CANCELACION: Readonly<Record<ProveedorPago, string>> = Object.freeze({
  paypal: '/api/paypal/cancel-subscription',
  stripe: '/api/stripe/cancel-subscription',
});

export function rutaCancelacion(proveedor: ProveedorPago): string {
  return RUTA_CANCELACION[proveedor];
}

/**
 * ¿Hay un cobro recurrente que el usuario pueda detener desde /cuenta? PayPal: solo 'active' (sin cambios). Stripe: también 'past_due',
 * porque Stripe sigue reintentando el cobro y /api/stripe/checkout bloquea una nueva suscripción mientras la fila esté en 'past_due'.
 */
export function puedeCancelar(fila: { provider?: string | null; status?: string | null } | null | undefined): boolean {
  if (!fila) return false;
  if (proveedorDeFila(fila) === 'stripe') return fila.status === 'active' || fila.status === 'past_due';
  return fila.status === 'active';
}
