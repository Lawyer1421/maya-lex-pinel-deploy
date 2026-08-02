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
 * Construye la URL de callback usando el origin REAL de la solicitud
 * (Preview o producción). Antes forzaba mayalexhn.com para cualquier
 * host *.vercel.app — eso rompía la sesión en Preview porque el
 * magic link se emite contra Supabase Staging (env vars de Preview)
 * pero el canje del código terminaba corriendo contra Supabase
 * Producción en mayalexhn.com — proyectos distintos, el código nunca
 * es válido ahí. AUTH_CALLBACK_REDIRECT_MISMATCH.
 */
export function buildAuthCallbackUrl(origin: string, nextPath: string): string {
  const trimmed = origin?.trim();
  const baseOrigin = trimmed && /^https?:\/\//i.test(trimmed)
    ? trimmed
    : (process.env.NEXT_PUBLIC_APP_URL ?? 'https://mayalexhn.com');

  const next = encodeURIComponent(sanitizeNextPath(nextPath));
  return `${baseOrigin}/auth/callback?next=${next}`;
}
