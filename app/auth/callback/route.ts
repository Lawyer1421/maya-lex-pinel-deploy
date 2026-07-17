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

/**
 * Restringe `next` a una ruta interna relativa — nunca a una URL
 * absoluta ni protocolo-relativa. Sin esto, un `next` como
 * `//evil.com` o `https://evil.com` en la query string del callback
 * podría usarse para un open redirect después de un login legítimo.
 */
export function sanitizeNextPath(next: string | null): string {
  if (!next) return '/chat';
  if (!next.startsWith('/')) return '/chat';       // debe ser relativa
  if (next.startsWith('//')) return '/chat';        // protocolo-relativa — rechazada
  if (next.includes('://')) return '/chat';         // esquema embebido — rechazada
  return next;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = sanitizeNextPath(searchParams.get('next'));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    // No se expone el detalle del error al cliente — solo se registra
    // server-side para diagnóstico.
    console.error('[Auth Callback] Error exchanging code:', error.message);
  }

  // Código ausente o inválido → redirigir al login con mensaje genérico
  return NextResponse.redirect(`${origin}/login?error=link_invalido`);
}
