/**
 * lib/paypal/duplicate-guard.ts
 *
 * Decisión pura (sin I/O) de si create-subscription debe bloquear un
 * nuevo intento de pago para un usuario que ya tiene una suscripción
 * activa o un intento reciente sin resolver. Extraído de la ruta para
 * que sea unit-testeable sin mocks de red/DB — ver tests/duplicate-guard.test.ts.
 */

import type { SubscriptionTier } from './plans';

export interface ExistingSubscriptionRow {
  tier:        string | null;
  status:      string | null;
  updated_at:  string | null;
}

export type DuplicateGuardCode = 'ALREADY_SUBSCRIBED' | 'PLAN_CHANGE_REQUIRED' | 'PENDING_ATTEMPT_EXISTS';

export interface DuplicateGuardBlock {
  code:              DuplicateGuardCode;
  error:             string;
  retryAfterSeconds?: number;
}

const PENDING_RETRY_WINDOW_MS = 15 * 60 * 1000; // 15 minutos

/**
 * Devuelve un bloqueo si el intento debe rechazarse, o null si puede
 * proceder a crear la suscripción en PayPal.
 */
export function evaluateDuplicateSubscriptionAttempt(
  existing:       ExistingSubscriptionRow | null | undefined,
  requestedPlan:  SubscriptionTier,
  now:            number = Date.now()
): DuplicateGuardBlock | null {
  if (!existing) return null;

  if (existing.status === 'active') {
    if (existing.tier === requestedPlan) {
      return { code: 'ALREADY_SUBSCRIBED', error: 'Ya tiene una suscripción activa para este plan.' };
    }
    return {
      code: 'PLAN_CHANGE_REQUIRED',
      error: 'Ya tiene una suscripción activa con otro plan. Gestione el cambio desde Mi Cuenta.',
    };
  }

  if ((existing.status === 'pending' || existing.status === 'trialing') && existing.updated_at) {
    const ageMs = now - new Date(existing.updated_at).getTime();
    if (ageMs < PENDING_RETRY_WINDOW_MS) {
      return {
        code: 'PENDING_ATTEMPT_EXISTS',
        error: 'Ya existe un intento de suscripción reciente. Verifique su estado antes de intentar de nuevo.',
        retryAfterSeconds: Math.ceil((PENDING_RETRY_WINDOW_MS - ageMs) / 1000),
      };
    }
  }

  return null;
}
