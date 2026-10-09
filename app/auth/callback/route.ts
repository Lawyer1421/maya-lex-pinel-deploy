/**
 * GET /auth/callback
 * Supabase Auth — intercambia el código (magic link o Google OAuth) por
 * una sesión real y redirige al destino solicitado.
 *
 * Alcance mínimo a propósito (hotfix/google-login-visible): no escribe
 * en ninguna tabla, no depende de entitlements ni de profiles, no
 * requiere ninguna migración aplicada. Solo intercambia el código y
 * redirige — nada más.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-ssr';
import { sanitizeNextPath } from '@/lib/auth/redirect';

// Re-exportado por compatibilidad — la fuente de verdad es lib/auth/redirect.ts
// (compartida también con buildAuthCallbackUrl en app/login/page.tsx).
export { sanitizeNextPath };

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = sanitizeNextPath(requestUrl.searchParams.get('next'));
  // Destino siempre relativo al origin de ESTA request (localhost / mayalexhn.com
  // / Preview). Nunca NEXT_PUBLIC_APP_URL ni un host absoluto del querystring.
  const destino = new URL(next, requestUrl.origin);
  if (destino.origin !== requestUrl.origin) {
    return NextResponse.redirect(new URL('/login?error=link_invalido', requestUrl.origin));
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(destino);
    }

    // No se expone el detalle del error al cliente — solo se registra
    // server-side para diagnóstico.
    console.error('[Auth Callback] Error exchanging code:', error.message);
  }

  // Código ausente o inválido → redirigir al login con mensaje genérico
  return NextResponse.redirect(new URL('/login?error=link_invalido', requestUrl.origin));
}
