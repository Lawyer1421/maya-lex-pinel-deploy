import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('lib/paypal/plans', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.PAYPAL_PRO_PLAN_ID = 'P-PRO-123';
    process.env.PAYPAL_ACADEMICO_PLAN_ID = 'P-ACAD-456';
  });

  it('isKnownTier acepta solo pro/academico', async () => {
    const { isKnownTier } = await import('@/lib/paypal/plans');
    expect(isKnownTier('pro')).toBe(true);
    expect(isKnownTier('academico')).toBe(true);
    expect(isKnownTier('free')).toBe(false);
    expect(isKnownTier('admin')).toBe(false);
    expect(isKnownTier('')).toBe(false);
  });

  // Escenario #12 de la lista obligatoria: plan_id no permitido
  it('isPlanIdValidForTier rechaza un plan_id que no coincide con el catálogo', async () => {
    const { isPlanIdValidForTier } = await import('@/lib/paypal/plans');
    expect(isPlanIdValidForTier('P-PRO-123', 'pro')).toBe(true);
    expect(isPlanIdValidForTier('P-PRO-123', 'academico')).toBe(false);
    expect(isPlanIdValidForTier('P-DESCONOCIDO', 'pro')).toBe(false);
    expect(isPlanIdValidForTier(undefined, 'pro')).toBe(false);
  });
});
