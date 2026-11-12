/**
 * lib/stripe/estados.ts — mapeo ÚNICO de estados de suscripción de Stripe al estado interno.
 *
 * El acceso al chat no se decide aquí: lo decide stripe_apply_event (escribe queries_log solo en 'active'), igual que PayPal, y
 * resolveCurrentAccess lo lee. Ante un estado desconocido o incompleto no se cambia nada (null).
 */
import type { SubscriptionStatus } from '@/lib/paypal/state-machine';

/** Estado de la fila en `subscriptions`: los de la máquina de estados más «pending» (intento creado, aún sin aprobar). */
export type EstadoFilaSuscripcion = SubscriptionStatus | 'pending';

export const ESTADOS_FILA: readonly EstadoFilaSuscripcion[] = Object.freeze(['pending', 'trialing', 'active', 'cancelled', 'past_due']);

export function mapearEstadoStripe(estado: string | null | undefined): SubscriptionStatus | null {
  switch (estado) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
    case 'incomplete_expired':
    // Una suscripción pausada no cobra: no conserva acceso (fail-closed). Si se reanuda, llega 'active' y se reactiva.
    case 'paused':
      return 'cancelled';
    // 'incomplete': el primer pago no se completó; no hay nada que conceder ni que quitar todavía.
    default:
      return null;
  }
}
