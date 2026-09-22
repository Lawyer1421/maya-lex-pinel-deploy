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
import { resolveExequaturAccess, hasExequaturAccess, type ExequaturAuthorization } from '@/lib/exequatur/access';

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

// Política final (Control Plane, tras revisión independiente de Cursor --
// SECURITY_VERDICT = PASS_AFTER_ADMIN_DELTA sobre e5e17b0):
//   pro       + flag ON  -> ALLOW
//   admin     + flag ON  -> ALLOW_INTERNAL   ('admin' NO es Premium)
//   free      + flag ON  -> DENY
//   academico + flag ON  -> DENY
//   cualquiera + flag OFF/ausente/error -> DENY
//   fallo al resolver el tier -> DENY
// unauthenticated -> se resuelve en app/exequatur/(protegido)/layout.tsx,
// fuera de esta función -- ver el describe de wiring más abajo.
describe('resolveExequaturAccess / hasExequaturAccess — matriz de autorización', () => {
  function esperarClasificacion(r: { authorization: ExequaturAuthorization; granted: boolean }, esperado: ExequaturAuthorization) {
    expect(r.authorization).toBe(esperado);
    expect(r.granted).toBe(esperado !== 'DENY');
  }

  it('pro + flag ON -> ALLOW', async () => {
    mockResolveCurrentAccess.mockResolvedValue(accessFixture('pro'));
    mockIsFlagEnabled.mockResolvedValue(true);
    const r = await resolveExequaturAccess('email:x@test.com', 'x@test.com');
    esperarClasificacion(r, 'ALLOW');
    expect(await hasExequaturAccess('email:x@test.com', 'x@test.com')).toBe(true);
  });

  // 'admin' es una clasificación de autorización DISTINTA (ALLOW_INTERNAL),
  // nunca se mapea a 'pro' ni se persiste como entitlement de facturación --
  // resolveCurrentAccess (subscriptions/queries_log) permanece intacto.
  it('admin + flag ON -> ALLOW_INTERNAL (acceso interno, NO Premium)', async () => {
    mockResolveCurrentAccess.mockResolvedValue(accessFixture('admin'));
    mockIsFlagEnabled.mockResolvedValue(true);
    const r = await resolveExequaturAccess('email:x@test.com', 'x@test.com');
    esperarClasificacion(r, 'ALLOW_INTERNAL');
    expect(r.authorization).not.toBe('ALLOW'); // distinción explícita de Premium real
    expect(r.tier).toBe('admin'); // nunca reescrito a 'pro'
  });

  it('admin + flag OFF -> DENY (el flag sigue siendo obligatorio incluso para acceso interno)', async () => {
    mockResolveCurrentAccess.mockResolvedValue(accessFixture('admin'));
    mockIsFlagEnabled.mockResolvedValue(false);
    const r = await resolveExequaturAccess('email:x@test.com', 'x@test.com');
    esperarClasificacion(r, 'DENY');
    expect(r.eligibleTier).toBe(true); // el tier calificaría, pero el flag es obligatorio igual
  });

  it('admin + flag no disponible/error -> DENY (isFlagEnabledForUser ya es fail-closed)', async () => {
    mockResolveCurrentAccess.mockResolvedValue(accessFixture('admin'));
    mockIsFlagEnabled.mockResolvedValue(false); // fila ausente o error -> ya colapsa a false en lib/flags.ts
    const r = await resolveExequaturAccess('email:x@test.com', 'x@test.com');
    esperarClasificacion(r, 'DENY');
  });

  it('free + flag ON -> DENY (el flag nunca otorga entitlement por sí solo)', async () => {
    mockResolveCurrentAccess.mockResolvedValue(accessFixture('free'));
    mockIsFlagEnabled.mockResolvedValue(true);
    const r = await resolveExequaturAccess('email:x@test.com', 'x@test.com');
    esperarClasificacion(r, 'DENY');
    expect(r.eligibleTier).toBe(false);
  });

  it('academico + flag ON -> DENY (Exequátur es exclusivo de Premium, no de "cualquier plan pagado")', async () => {
    mockResolveCurrentAccess.mockResolvedValue(accessFixture('academico'));
    mockIsFlagEnabled.mockResolvedValue(true);
    const r = await resolveExequaturAccess('email:x@test.com', 'x@test.com');
    esperarClasificacion(r, 'DENY');
    expect(r.eligibleTier).toBe(false);
  });

  it('pro + flag OFF -> DENY', async () => {
    mockResolveCurrentAccess.mockResolvedValue(accessFixture('pro'));
    mockIsFlagEnabled.mockResolvedValue(false);
    const r = await resolveExequaturAccess('email:x@test.com', 'x@test.com');
    esperarClasificacion(r, 'DENY');
    expect(r.eligibleTier).toBe(true);
  });

  it('pro + flag no disponible/error -> DENY', async () => {
    mockResolveCurrentAccess.mockResolvedValue(accessFixture('pro'));
    mockIsFlagEnabled.mockResolvedValue(false);
    const r = await resolveExequaturAccess('email:x@test.com', 'x@test.com');
    esperarClasificacion(r, 'DENY');
  });

  it('FAIL-CLOSED: si resolveCurrentAccess lanza una excepción, siempre DENY', async () => {
    mockResolveCurrentAccess.mockRejectedValue(new Error('Supabase no disponible'));
    mockIsFlagEnabled.mockResolvedValue(true); // incluso con el flag ya resuelto a ON
    const r = await resolveExequaturAccess('email:x@test.com', 'x@test.com');
    esperarClasificacion(r, 'DENY');
    expect(r.eligibleTier).toBe(false);
    expect(r.tier).toBe('free'); // valor por defecto seguro, nunca se infiere un tier de pago o admin
  });

  it('el flag por sí solo NUNCA es suficiente para free/académico (contrato explícito FLAG != ENTITLEMENT)', async () => {
    for (const tier of ['free', 'academico'] as const) {
      mockResolveCurrentAccess.mockResolvedValue(accessFixture(tier));
      mockIsFlagEnabled.mockResolvedValue(true);
      const r = await resolveExequaturAccess('email:x@test.com', 'x@test.com');
      esperarClasificacion(r, 'DENY');
    }
  });

  it('el tier por sí solo NUNCA es suficiente sin el flag, ni para pro ni para admin', async () => {
    for (const tier of ['pro', 'admin'] as const) {
      mockResolveCurrentAccess.mockResolvedValue(accessFixture(tier));
      mockIsFlagEnabled.mockResolvedValue(false);
      const r = await resolveExequaturAccess('email:x@test.com', 'x@test.com');
      expect(r.eligibleTier).toBe(true);
      esperarClasificacion(r, 'DENY');
    }
  });

  it('"admin" nunca se mapea a "pro" -- tier resuelto se preserva tal cual en ambos casos ALLOW*', async () => {
    mockResolveCurrentAccess.mockResolvedValue(accessFixture('pro'));
    mockIsFlagEnabled.mockResolvedValue(true);
    expect((await resolveExequaturAccess('a', 'a@test.com')).tier).toBe('pro');

    mockResolveCurrentAccess.mockResolvedValue(accessFixture('admin'));
    mockIsFlagEnabled.mockResolvedValue(true);
    expect((await resolveExequaturAccess('b', 'b@test.com')).tier).toBe('admin');
  });
});

// El gate real vive en app/exequatur/(protegido)/layout.tsx (Server
// Component), reubicado a un route group para que app/exequatur/diagnostico-
// demo (la demo pública) quede fuera de su alcance. Este repo no tiene
// precedente de renderizar Server Components de página/layout en la suite
// (tampoco existe un test directo de app/chat/page.tsx ni de
// app/cuenta/page.tsx) -- la lógica de decisión que el layout consulta ya
// está cubierta arriba al 100%. Esta prueba estructural confirma que el
// layout real efectivamente usa esa función. Sin sesión ya NO redirige a
// /login: renderiza la Landing de oferta (OfertaExequatur) directamente,
// igual que con sesión pero sin acceso concedido -- el visitante ve la
// propuesta de valor antes de que se le pida iniciar sesión o pagar.
describe('app/exequatur/(protegido)/layout.tsx — wiring del gate server-side', () => {
  it('el layout importa resolveExequaturAccess y muestra la oferta sin sesión, sin redirect a /login', async () => {
    const { readFileSync } = await import('node:fs');
    const contenido = readFileSync('app/exequatur/(protegido)/layout.tsx', 'utf8');
    expect(contenido).toMatch(/resolveExequaturAccess/);
    expect(contenido).toMatch(/auth\.getUser\(\)/);
    expect(contenido).toMatch(/if \(!user\)/);
    expect(contenido).toMatch(/<OfertaExequatur eligibleTier=\{false\}\s*\/>/);
    // Ya no existe ningún redirect a /login en este layout -- el visitante
    // sin sesión ve la oferta, nunca un login desnudo sin contexto.
    expect(contenido).not.toMatch(/redirect\(/);
  });

  it('el layout nunca renderiza {children} sin comprobar access.granted antes', async () => {
    const { readFileSync } = await import('node:fs');
    const contenido = readFileSync('app/exequatur/(protegido)/layout.tsx', 'utf8');
    // lastIndexOf porque el docstring de cabecera menciona "{children}" en
    // prosa antes del código real -- el JSX que efectivamente lo renderiza
    // (return <>{children}</>) es la ÚLTIMA aparición literal en el archivo.
    const indiceChildrenRenderizado = contenido.lastIndexOf('{children}');
    const indiceGranted = contenido.indexOf('access.granted');
    expect(indiceGranted).toBeGreaterThan(-1);
    expect(indiceChildrenRenderizado).toBeGreaterThan(indiceGranted);
  });
});
