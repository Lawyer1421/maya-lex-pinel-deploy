import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AccessTier, CurrentAccess } from '@/lib/paypal/access';

// Mismo patrón de mocking ya usado en tests/chat-route-fail-closed.test.ts
// para @/lib/flags -- aquí además se mockea @/lib/paypal/access, la misma
// fuente de verdad que ya usan /cuenta y /api/chat (lib/rate-limit.ts).
vi.mock('@/lib/paypal/access', () => ({
  resolveCurrentAccess: vi.fn(),
}));
vi.mock('@/lib/flags', () => ({
  isFlagEnabledForUser: vi.fn(),
}));

import { resolveCurrentAccess } from '@/lib/paypal/access';
import { isFlagEnabledForUser } from '@/lib/flags';
import { resolveExequaturAccess, hasExequaturAccess } from '@/lib/exequatur/access';

const mockResolveCurrentAccess = vi.mocked(resolveCurrentAccess);
const mockIsFlagEnabled = vi.mocked(isFlagEnabledForUser);

function accessFixture(tier: AccessTier): CurrentAccess {
  return {
    accessGranted: tier !== 'free',
    tier,
    subscriptionStatus: null,
    pendingTier: null,
    source: 'queries_log',
    verificationPending: false,
    reasonCode: tier === 'free' ? 'free_tier' : 'active_subscription',
    canAnalyzeDocuments: true,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// Matriz exigida por Fase Exequátur Slice 1 (Control Plane):
//   unauthenticated -> denied            (resuelto en app/exequatur/layout.tsx,
//                                          fuera de esta función -- ver más abajo)
//   free + flag on -> denied
//   academico + flag on -> denied
//   pro + flag off -> denied
//   pro + flag unavailable -> denied
//   pro + flag on -> allowed
//   admin -> política explícita, no silenciosa
describe('resolveExequaturAccess / hasExequaturAccess — matriz de autorización', () => {
  it('free + flag ON -> denegado (el flag nunca otorga entitlement por sí solo)', async () => {
    mockResolveCurrentAccess.mockResolvedValue(accessFixture('free'));
    mockIsFlagEnabled.mockResolvedValue(true);
    const r = await resolveExequaturAccess('email:x@test.com', 'x@test.com');
    expect(r.granted).toBe(false);
    expect(r.eligibleTier).toBe(false);
    expect(r.flagEnabled).toBe(true);
  });

  it('academico + flag ON -> denegado (Exequátur es exclusivo de Premium, no de "cualquier plan pagado")', async () => {
    mockResolveCurrentAccess.mockResolvedValue(accessFixture('academico'));
    mockIsFlagEnabled.mockResolvedValue(true);
    const r = await resolveExequaturAccess('email:x@test.com', 'x@test.com');
    expect(r.granted).toBe(false);
    expect(r.eligibleTier).toBe(false);
  });

  it('pro + flag OFF -> denegado', async () => {
    mockResolveCurrentAccess.mockResolvedValue(accessFixture('pro'));
    mockIsFlagEnabled.mockResolvedValue(false);
    const r = await resolveExequaturAccess('email:x@test.com', 'x@test.com');
    expect(r.granted).toBe(false);
    expect(r.eligibleTier).toBe(true);
    expect(r.flagEnabled).toBe(false);
  });

  it('pro + flag no disponible -> denegado (isFlagEnabledForUser ya es fail-closed: fila ausente/error -> false)', async () => {
    mockResolveCurrentAccess.mockResolvedValue(accessFixture('pro'));
    mockIsFlagEnabled.mockResolvedValue(false); // flag_exq_enabled sin fila sembrada hoy -> exactamente este caso
    const r = await resolveExequaturAccess('email:x@test.com', 'x@test.com');
    expect(r.granted).toBe(false);
  });

  it('pro + flag ON -> permitido', async () => {
    mockResolveCurrentAccess.mockResolvedValue(accessFixture('pro'));
    mockIsFlagEnabled.mockResolvedValue(true);
    const r = await resolveExequaturAccess('email:x@test.com', 'x@test.com');
    expect(r.granted).toBe(true);
    expect(await hasExequaturAccess('email:x@test.com', 'x@test.com')).toBe(true);
  });

  // ADMIN_EXQ_POLICY_REQUIRES_CONTROL_PLANE_DECISION -- ver comentario de
  // cabecera en lib/exequatur/access.ts. No hay precedente en el resto del
  // código de una frontera "Premium sí, académico no" aplicada a 'admin';
  // se codifica y se prueba explícitamente como denegado HOY, no se
  // inventa un privilegio nuevo en silencio.
  it('admin + flag ON -> denegado HOY (política pendiente de decisión explícita del Control Plane)', async () => {
    mockResolveCurrentAccess.mockResolvedValue(accessFixture('admin'));
    mockIsFlagEnabled.mockResolvedValue(true);
    const r = await resolveExequaturAccess('email:x@test.com', 'x@test.com');
    expect(r.granted).toBe(false);
    expect(r.eligibleTier).toBe(false);
  });

  it('FAIL-CLOSED: si resolveCurrentAccess lanza una excepción, nunca se concede acceso', async () => {
    mockResolveCurrentAccess.mockRejectedValue(new Error('Supabase no disponible'));
    mockIsFlagEnabled.mockResolvedValue(true); // incluso con el flag ya resuelto a ON
    const r = await resolveExequaturAccess('email:x@test.com', 'x@test.com');
    expect(r.granted).toBe(false);
    expect(r.eligibleTier).toBe(false);
    expect(r.tier).toBe('free'); // valor por defecto seguro, nunca se infiere un tier de pago
  });

  it('el flag por sí solo NUNCA es suficiente, para ningún tier no elegible (contrato explícito FLAG != ENTITLEMENT)', async () => {
    for (const tier of ['free', 'academico'] as const) {
      mockResolveCurrentAccess.mockResolvedValue(accessFixture(tier));
      mockIsFlagEnabled.mockResolvedValue(true);
      const r = await resolveExequaturAccess('email:x@test.com', 'x@test.com');
      expect(r.granted).toBe(false);
    }
  });

  it('el tier por sí solo NUNCA es suficiente sin el flag, incluso para pro', async () => {
    mockResolveCurrentAccess.mockResolvedValue(accessFixture('pro'));
    mockIsFlagEnabled.mockResolvedValue(false);
    const r = await resolveExequaturAccess('email:x@test.com', 'x@test.com');
    expect(r.eligibleTier).toBe(true);
    expect(r.granted).toBe(false);
  });
});

// El gate real vive en app/exequatur/layout.tsx (Server Component). Este
// repo no tiene precedente de renderizar Server Components de página/layout
// en la suite (tampoco existe un test directo de app/chat/page.tsx ni de
// app/cuenta/page.tsx) -- la lógica de decisión que el layout consulta ya
// está cubierta arriba al 100%. Esta prueba estructural confirma que el
// layout real efectivamente usa esa función y el patrón de redirect ya
// validado en /chat, sin necesitar un harness de renderizado de RSC nuevo
// para esta slice.
describe('app/exequatur/layout.tsx — wiring del gate server-side', () => {
  it('el layout importa resolveExequaturAccess y redirige sin sesión, igual que /chat', async () => {
    const { readFileSync } = await import('node:fs');
    const contenido = readFileSync('app/exequatur/layout.tsx', 'utf8');
    expect(contenido).toMatch(/resolveExequaturAccess/);
    expect(contenido).toMatch(/redirect\(['"]\/login\?next=\/exequatur['"]\)/);
    expect(contenido).toMatch(/auth\.getUser\(\)/);
    // Sin URL derivada de request/params -- solo la cadena fija de arriba.
    expect(contenido).not.toMatch(/redirect\(\s*(req|request|searchParams|params)/);
  });

  it('el layout nunca renderiza {children} sin comprobar access.granted antes', async () => {
    const { readFileSync } = await import('node:fs');
    const contenido = readFileSync('app/exequatur/layout.tsx', 'utf8');
    // lastIndexOf porque el docstring de cabecera menciona "{children}" en
    // prosa antes del código real -- el JSX que efectivamente lo renderiza
    // (return <>{children}</>) es la ÚLTIMA aparición literal en el archivo.
    const indiceChildrenRenderizado = contenido.lastIndexOf('{children}');
    const indiceGranted = contenido.indexOf('access.granted');
    expect(indiceGranted).toBeGreaterThan(-1);
    expect(indiceChildrenRenderizado).toBeGreaterThan(indiceGranted);
  });
});
