import { describe, it, expect } from 'vitest';
import { evaluateDuplicateSubscriptionAttempt } from '@/lib/paypal/duplicate-guard';

const NOW = new Date('2026-07-17T12:00:00.000Z').getTime();

describe('evaluateDuplicateSubscriptionAttempt', () => {
  it('no bloquea cuando no existe suscripción previa', () => {
    expect(evaluateDuplicateSubscriptionAttempt(null, 'pro', NOW)).toBeNull();
  });

  // Escenario #5: usuario activo intenta crear otra suscripción (mismo plan)
  it('bloquea con ALREADY_SUBSCRIBED si ya está activo en el mismo plan', () => {
    const result = evaluateDuplicateSubscriptionAttempt(
      { tier: 'pro', status: 'active', updated_at: new Date(NOW - 1000).toISOString() },
      'pro', NOW
    );
    expect(result?.code).toBe('ALREADY_SUBSCRIBED');
  });

  // Escenario #6: usuario activo intenta crear otro plan
  it('bloquea con PLAN_CHANGE_REQUIRED si está activo en otro plan', () => {
    const result = evaluateDuplicateSubscriptionAttempt(
      { tier: 'academico', status: 'active', updated_at: new Date(NOW - 1000).toISOString() },
      'pro', NOW
    );
    expect(result?.code).toBe('PLAN_CHANGE_REQUIRED');
  });

  it('bloquea con PENDING_ATTEMPT_EXISTS si hay un intento pending reciente (<15min)', () => {
    const result = evaluateDuplicateSubscriptionAttempt(
      { tier: 'pro', status: 'pending', updated_at: new Date(NOW - 5 * 60 * 1000).toISOString() },
      'pro', NOW
    );
    expect(result?.code).toBe('PENDING_ATTEMPT_EXISTS');
    expect(result?.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('bloquea con PENDING_ATTEMPT_EXISTS si hay un intento trialing reciente (<15min)', () => {
    const result = evaluateDuplicateSubscriptionAttempt(
      { tier: 'academico', status: 'trialing', updated_at: new Date(NOW - 60 * 1000).toISOString() },
      'academico', NOW
    );
    expect(result?.code).toBe('PENDING_ATTEMPT_EXISTS');
  });

  it('NO bloquea un intento pending que ya expiró la ventana de 15 minutos', () => {
    const result = evaluateDuplicateSubscriptionAttempt(
      { tier: 'pro', status: 'pending', updated_at: new Date(NOW - 20 * 60 * 1000).toISOString() },
      'pro', NOW
    );
    expect(result).toBeNull();
  });

  it('NO bloquea si la suscripción previa está cancelled (nuevo intento legítimo)', () => {
    const result = evaluateDuplicateSubscriptionAttempt(
      { tier: 'pro', status: 'cancelled', updated_at: new Date(NOW - 1000).toISOString() },
      'pro', NOW
    );
    expect(result).toBeNull();
  });

  it('NO bloquea si la suscripción previa está past_due (no se trata como active)', () => {
    const result = evaluateDuplicateSubscriptionAttempt(
      { tier: 'pro', status: 'past_due', updated_at: new Date(NOW - 1000).toISOString() },
      'pro', NOW
    );
    expect(result).toBeNull();
  });
});
