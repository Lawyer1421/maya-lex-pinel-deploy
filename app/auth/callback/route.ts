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
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = sanitizeNextPath(searchParams.get('next'));

  const supabase = await createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    // No se expone el detalle del error al cliente — solo se registra
    // server-side para diagnóstico.
    console.error('[Auth Callback] Error exchanging code:', error.message);
  }

  // El canje falló (p. ej. falta la cookie PKCE porque había cookies viejas o el
  // enlace se abrió en otro navegador) o no vino código. Si el navegador YA trae
  // una sesión válida, se le deja pasar a `next` en vez de mostrar «link inválido».
  // `getUser()` valida el token contra Supabase (no confía en la cookie sin
  // verificar); `next` ya está saneado. Sin sesión válida, sigue el mensaje genérico.
  if (await haySesionValida(supabase)) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Código ausente o inválido y sin sesión → redirigir al login con mensaje genérico
  return NextResponse.redirect(`${origin}/login?error=link_invalido`);
}

async function haySesionValida(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.getUser();
    return !error && Boolean(data.user);
  } catch {
    return false;
  }
}
