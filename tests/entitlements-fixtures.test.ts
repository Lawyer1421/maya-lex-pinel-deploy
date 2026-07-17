import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * 8 fixtures pedidas para la prueba cerrada — demuestra que
 * resolveAccessWithEntitlements() (la función que deben consultar
 * chat, Mi Cuenta, header, facturación y AccessBadge por igual) da la
 * MISMA decisión consistente para cada tipo de entitlement.
 *
 * resolveCurrentAccess() (el adaptador legado) crea su PROPIO cliente
 * Supabase internamente — no acepta uno inyectado — así que para
 * probar el fallback (escenarios E-H) se mockea ese módulo completo,
 * igual que en tests/entitlements.test.ts. El filtro real de Postgres
 * que excluye expired/revoked de la consulta de entitlements ya está
 * verificado contra Postgres real en tests/sql/entitlements.sql.test.ts.
 */

function fakeSupabaseEntitlement(rowsByKey: Record<string, unknown>) {
  const from = vi.fn(() => {
    const chain: any = {};
    let requestedKey: string | undefined;
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn((col: string, val: string) => {
      if (col === 'entitlement_key') requestedKey = val;
      return chain;
    });
    chain.or = vi.fn().mockReturnValue(chain);
    chain.maybeSingle = vi.fn(() => Promise.resolve({ data: requestedKey ? (rowsByKey[requestedKey] ?? null) : null, error: null }));
    return chain;
  });
  return { from } as any;
}

async function resolveWithEntitlement(rowsByKey: Record<string, unknown>, userId: string | null) {
  vi.resetModules();
  const { resolveAccessWithEntitlements } = await import('@/lib/entitlements');
  const supabase = fakeSupabaseEntitlement(rowsByKey);
  return resolveAccessWithEntitlements({ supabase, userId, userIdentifier: 'email:x@y.com' });
}

async function resolveWithLegacyFallback(legacy: {
  accessGranted: boolean; tier: string; subscriptionStatus: string | null;
  verificationPending: boolean; reasonCode: string;
}) {
  vi.resetModules();
  vi.doMock('@/lib/paypal/access', () => ({ resolveCurrentAccess: vi.fn().mockResolvedValue({ ...legacy, pendingTier: null, source: 'queries_log' }) }));
  const { resolveAccessWithEntitlements } = await import('@/lib/entitlements');
  const supabase = fakeSupabaseEntitlement({}); // sin ningún entitlement
  return resolveAccessWithEntitlements({ supabase, userId: 'u1', userIdentifier: 'email:x@y.com' });
}

beforeEach(() => vi.resetModules());

describe('Fixtures de entitlements — decisión consistente', () => {
  it('A. paypal_subscription ACTIVE → Usuario Pro', async () => {
    const r = await resolveWithEntitlement({
      pro_access: { id: 'e1', user_id: 'u1', entitlement_key: 'pro_access', source_type: 'paypal_subscription', source_reference: 'SUB-1', status: 'active', active_from: '2026-01-01', active_until: null, reason: null },
    }, 'u1');
    expect(r).toMatchObject({ accessGranted: true, accessLabel: 'Usuario Pro', sourceType: 'paypal_subscription', plan: 'pro' });
  });

  it('B. paypal_one_time_payment vigente → Usuario Pro', async () => {
    const r = await resolveWithEntitlement({
      pro_access: { id: 'e2', user_id: 'u1', entitlement_key: 'pro_access', source_type: 'paypal_one_time_payment', source_reference: 'ORDER-1', status: 'active', active_from: '2026-01-01', active_until: '2026-12-31T00:00:00Z', reason: null },
    }, 'u1');
    expect(r).toMatchObject({ accessGranted: true, accessLabel: 'Usuario Pro', sourceType: 'paypal_one_time_payment', activeUntil: '2026-12-31T00:00:00Z' });
  });

  it('C. manual_beta → Acceso beta', async () => {
    const r = await resolveWithEntitlement({
      pro_access: { id: 'e3', user_id: 'u1', entitlement_key: 'pro_access', source_type: 'manual_beta', source_reference: null, status: 'active', active_from: '2026-01-01', active_until: null, reason: 'beta tester' },
    }, 'u1');
    expect(r).toMatchObject({ accessGranted: true, accessLabel: 'Acceso beta', sourceType: 'manual_beta', plan: 'pro' });
  });

  it('D. manual_comped (plan académico) → Acceso de cortesía', async () => {
    const r = await resolveWithEntitlement({
      academico_access: { id: 'e4', user_id: 'u1', entitlement_key: 'academico_access', source_type: 'manual_comped', source_reference: null, status: 'active', active_from: '2026-01-01', active_until: null, reason: 'cortesía' },
    }, 'u1');
    expect(r).toMatchObject({ accessGranted: true, accessLabel: 'Acceso de cortesía', sourceType: 'manual_comped', plan: 'academico' });
  });

  // E/F: el filtro real de Postgres (verificado en tests/sql/entitlements.sql.test.ts)
  // ya excluye expired/revoked de la consulta (devuelve 0 filas) — acá se
  // simula ese resultado (ningún entitlement encontrado) y se confirma
  // que la función cae correctamente al fallback legado.
  it('E. expired (Postgres ya lo excluye) → cae a legado, sin suscripción → Conocer plan Pro', async () => {
    const r = await resolveWithLegacyFallback({
      accessGranted: false, tier: 'free', subscriptionStatus: 'cancelled', verificationPending: false, reasonCode: 'cancelled',
    });
    expect(r.accessGranted).toBe(false);
    expect(r.sourceType).toBe('none');
    expect(r.accessLabel).toBe('Conocer plan Pro');
  });

  it('F. revoked (Postgres ya lo excluye) → cae a legado', async () => {
    const r = await resolveWithLegacyFallback({
      accessGranted: false, tier: 'free', subscriptionStatus: null, verificationPending: false, reasonCode: 'no_subscription',
    });
    expect(r.accessGranted).toBe(false);
  });

  it('G. verification_pending (legado) → "Verificando tu suscripción", nunca "Usuario Pro"', async () => {
    const r = await resolveWithLegacyFallback({
      accessGranted: false, tier: 'free', subscriptionStatus: 'active', verificationPending: true, reasonCode: 'billing_state_inconsistent',
    });
    expect(r.accessGranted).toBe(false);
    expect(r.verificationPending).toBe(true);
    expect(r.accessLabel).toBe('Verificando tu suscripción');
    expect(r.accessLabel).not.toBe('Usuario Pro');
  });

  it('H. sin entitlement, sin suscripción → "Conocer plan Pro"', async () => {
    const r = await resolveWithLegacyFallback({
      accessGranted: false, tier: 'free', subscriptionStatus: null, verificationPending: false, reasonCode: 'no_subscription',
    });
    expect(r.accessGranted).toBe(false);
    expect(r.accessLabel).toBe('Conocer plan Pro');
    expect(r.sourceType).toBe('none');
  });

  it('acceso legado otorgado (tier pagado en queries_log sin entitlement) → NUNCA "Usuario Pro", sourceType=legacy', async () => {
    const r = await resolveWithLegacyFallback({
      accessGranted: true, tier: 'pro', subscriptionStatus: 'active', verificationPending: false, reasonCode: 'active_subscription',
    });
    expect(r.accessGranted).toBe(true);
    expect(r.accessLabel).not.toBe('Usuario Pro');
    expect(r.sourceType).toBe('legacy');
  });
});
