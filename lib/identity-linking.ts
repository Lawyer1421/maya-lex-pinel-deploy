/**
 * lib/identity-linking.ts
 *
 * Clasificación pura (sin I/O) de qué pasó en un callback de auth, para
 * decidir cómo registrarlo en identity_link_events. Extraída como
 * función pura para poder probarla sin credenciales reales de Google
 * OAuth (ver tests/identity-linking.test.ts).
 *
 * IMPORTANTE — límite real de esta función: la decisión de si Supabase
 * fusiona automáticamente dos identidades (Google + contraseña) para el
 * MISMO correo ya la tomó Supabase Auth ANTES de que este código corra
 * (durante exchangeCodeForSession). Esta función solo CLASIFICA lo que
 * ya ocurrió, para auditoría — no puede, por sí sola, impedir un
 * auto-merge si el proyecto de Supabase tiene "Enable manual linking"
 * desactivado en su dashboard. Ver docs/runbooks/google-oauth-setup.md.
 */

export type IdentityLinkOutcome =
  | 'new_account_created'
  | 'linked_after_reauth'
  | 'blocked_unverified_email'
  | 'flagged_duplicate_for_review';

const NEW_ACCOUNT_WINDOW_MS = 15_000;

export function classifyIdentityLinkOutcome(params: {
  userCreatedAt: string;
  emailVerified: boolean;
  now?: number;
}): IdentityLinkOutcome {
  const now = params.now ?? Date.now();
  const ageMs = now - new Date(params.userCreatedAt).getTime();

  if (ageMs < NEW_ACCOUNT_WINDOW_MS) {
    return 'new_account_created';
  }
  if (!params.emailVerified) {
    return 'blocked_unverified_email';
  }
  return 'linked_after_reauth';
}
