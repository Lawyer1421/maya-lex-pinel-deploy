/**
 * Restringe `next` a una ruta interna relativa — nunca a una URL
 * absoluta ni protocolo-relativa. Única fuente de verdad: la usan tanto
 * el login (al construir la URL de callback) como /auth/callback (al
 * procesar la respuesta), para que ambos lados apliquen la misma regla
 * y no diverjan en qué consideran "seguro".
 */
export function sanitizeNextPath(next: string | null | undefined): string {
  if (!next) return '/chat';
  if (!next.startsWith('/')) return '/chat';      // debe ser relativa
  if (next.startsWith('//')) return '/chat';       // protocolo-relativa — rechazada
  if (next.includes('://')) return '/chat';        // esquema embebido — rechazada
  return next;
}

/**
 * Fallback SOLO si el origin del navegador no es una URL http(s).
 * Nunca se usa NEXT_PUBLIC_APP_URL aquí: esa variable puede arrastrar
 * un dominio residual de otro producto y romper Google OAuth.
 */
export const AUTH_CALLBACK_ORIGIN_FALLBACK = 'https://mayalexhn.com';

/**
 * Construye la URL de callback usando el origin REAL de la solicitud
 * (`window.location.origin` en el cliente: localhost en local,
 * https://mayalexhn.com en producción, Preview de Vercel en previews).
 * AUTH_CALLBACK_REDIRECT_MISMATCH: no forzar mayalexhn.com en *.vercel.app.
 */
export function buildAuthCallbackUrl(origin: string, nextPath: string): string {
  const trimmed = origin?.trim().replace(/\/+$/, '');
  const baseOrigin = trimmed && /^https?:\/\//i.test(trimmed)
    ? trimmed
    : AUTH_CALLBACK_ORIGIN_FALLBACK;

  const next = encodeURIComponent(sanitizeNextPath(nextPath));
  return `${baseOrigin}/auth/callback?next=${next}`;
}
