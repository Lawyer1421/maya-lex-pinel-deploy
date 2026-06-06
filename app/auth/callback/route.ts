/**
 * GET /auth/callback
 * Supabase Auth — intercambia el código OTP por una sesión real.
 * Redirige al usuario al chat después del login exitoso.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-ssr';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/chat';

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Login exitoso → redirigir al chat (o a la URL de destino)
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error('[Auth Callback] Error exchanging code:', error.message);
  }

  // Error → redirigir al login con mensaje
  return NextResponse.redirect(`${origin}/login?error=link_invalido`);
}
