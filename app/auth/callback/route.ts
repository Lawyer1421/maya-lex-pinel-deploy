/**
 * GET /auth/callback
 * Supabase Auth — intercambia el código (magic link, Google OAuth, o
 * recuperación de contraseña) por una sesión real. Redirige según el
 * destino solicitado.
 *
 * Registra en identity_link_events (auditoría, solo lectura desde la
 * app) qué tipo de resultado produjo el intercambio — nunca decide por
 * su cuenta fusionar cuentas; eso ya lo resolvió Supabase Auth (según su
 * configuración de "manual linking" en el dashboard) antes de llegar
 * aquí. Ver docs/runbooks/google-oauth-setup.md para el límite exacto
 * de lo que este código puede controlar.
 *
 * NOTA (hotfix/google-login-visible): la tabla identity_link_events
 * viene de una migración que NO está aplicada en este hotfix a
 * propósito (ver objetivo del hotfix — sin migraciones). El insert de
 * auditoría de abajo está en un try/catch que NUNCA bloquea el login si
 * la tabla no existe — solo deja de auditar hasta que esa migración se
 * aplique en una fase posterior.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-ssr';
import { createServerSupabaseClient } from '@/lib/supabase';
import { classifyIdentityLinkOutcome } from '@/lib/identity-linking';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/chat';

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const provider = data.user.app_metadata?.provider ?? 'email';

      if (provider === 'google') {
        try {
          const outcome = classifyIdentityLinkOutcome({
            userCreatedAt: data.user.created_at,
            emailVerified: !!data.user.email_confirmed_at,
          });
          const admin = createServerSupabaseClient();
          await admin.from('identity_link_events').insert({
            existing_user_id: data.user.id,
            attempted_provider: 'google',
            attempted_email: data.user.email ?? '(sin correo)',
            email_verified: !!data.user.email_confirmed_at,
            outcome,
          });
        } catch (auditErr) {
          // La auditoría nunca debe bloquear un login exitoso. Incluye el
          // caso esperado en este hotfix: la tabla todavía no existe.
          console.error('[Auth Callback] No se pudo registrar identity_link_events:', auditErr);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error('[Auth Callback] Error exchanging code:', error?.message);
  }

  // Error → redirigir al login con mensaje
  return NextResponse.redirect(`${origin}/login?error=link_invalido`);
}
