/**
 * Destinos de conversión. Fuente única para CTAs de campaña.
 *
 * Fuga #1: "Probar gratis" iba a /chat, que exige sesión y redirige a
 * /login?next=/chat con copy de "Iniciar sesión". El visitante de anuncio
 * cree que necesita una cuenta previa y abandona.
 *
 * Nivel 1: el CTA primario abre el mismo login/OTP/Google, pero con
 * intent=signup y copy de alta (3 consultas, sin tarjeta).
 */
export const SIGNUP_HREF = '/login?next=/chat&intent=signup';
export const LOGIN_HREF = '/login?next=/chat&intent=login';

export type AuthIntent = 'signup' | 'login';

export function resolveAuthIntent(raw: string | null | undefined): AuthIntent {
  return raw === 'login' ? 'login' : 'signup';
}

export function buildLoginHref(nextPath: string, intent: AuthIntent): string {
  const next = nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/chat';
  return `/login?next=${encodeURIComponent(next)}&intent=${intent}`;
}
