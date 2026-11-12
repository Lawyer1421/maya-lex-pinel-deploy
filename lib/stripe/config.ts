/**
 * lib/stripe/config.ts — interruptor y configuración de Stripe. APAGADO por defecto.
 *
 * Stripe solo se activa con STRIPE_ENABLED=1 Y las claves presentes. Mientras la migración
 * 20261112000000_stripe_billing_foundation.sql no esté aplicada en producción, STRIPE_ENABLED debe seguir sin definir: las rutas
 * /api/stripe/* responden 404 y no tocan la base de datos. Ningún valor de clave se registra ni se devuelve al cliente.
 */
export function stripeHabilitado(): boolean {
  return (
    process.env.STRIPE_ENABLED === '1' &&
    Boolean(process.env.STRIPE_SECRET_KEY?.trim()) &&
    Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim())
  );
}

/** Base fija de retorno de Checkout. Nunca se deriva del Host de la petición (evita redirecciones abiertas). */
export function baseRetorno(): string {
  const base = process.env.STRIPE_RETURN_BASE_URL?.trim() || 'https://mayalexhn.com';
  return base.replace(/\/+$/, '');
}
