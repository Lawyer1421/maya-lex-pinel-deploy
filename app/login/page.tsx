'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { buildAuthCallbackUrl } from '@/lib/auth/redirect';
import { resolveAuthIntent, type AuthIntent } from '@/lib/marketing/cta';
import { trackCampaignEvent } from '@/lib/analytics/campaign';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

function LoginForm() {
  const searchParams = useSearchParams();
  const intent: AuthIntent = resolveAuthIntent(searchParams.get('intent'));
  const esAlta = intent === 'signup';

  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'enviado' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    trackCampaignEvent(esAlta ? 'signup_view' : 'login_view');
  }, [esAlta]);

  function nextDestino(): string {
    return searchParams.get('next') ?? '/chat';
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setEstado('enviando');
    setError('');
    trackCampaignEvent('signup_magic_link_submit', { intent });

    const supabase = createSupabaseBrowserClient();
    const callbackUrl = buildAuthCallbackUrl(window.location.origin, nextDestino());
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl },
    });

    if (authError) {
      setError(authError.message);
      setEstado('error');
    } else {
      trackCampaignEvent('signup_magic_link_sent', { intent });
      setEstado('enviado');
    }
  }

  async function handleGoogle() {
    if (estado === 'enviando') return;
    setError('');
    setEstado('enviando');
    trackCampaignEvent('signup_google_click', { intent });
    const supabase = createSupabaseBrowserClient();
    const callbackUrl = buildAuthCallbackUrl(window.location.origin, nextDestino());
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl },
    });
    if (authError) {
      setError(authError.message);
      setEstado('error');
    }
  }

  const titulo = esAlta ? 'Cree su cuenta gratis' : 'Iniciar sesión';
  const subtitulo = esAlta
    ? '3 consultas al día · sin tarjeta · 30 segundos'
    : 'Entre con Google o un enlace a su correo';

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-obsidian px-4">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(50% 40% at 50% 0%, rgba(45,155,138,0.12), transparent 60%)',
        }}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="font-serif text-2xl font-bold tracking-wide text-ivory">
            MAYA <span className="text-jade">LEX</span>
          </Link>
          <p className="mt-5 font-serif text-2xl font-semibold text-ivory">{titulo}</p>
          <p className="mt-2 text-sm text-ivory-muted">{subtitulo}</p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-obsidian-light p-7 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.8)]">
          {estado === 'enviado' ? (
            <div className="text-center py-4">
              <h2 className="mb-2 font-semibold text-ivory">Revise su correo</h2>
              <p className="text-sm leading-relaxed text-ivory-muted">
                Enviamos un enlace de acceso a <span className="text-jade">{email}</span>.
                Ese mismo enlace crea la cuenta si es la primera vez.
              </p>
              <button onClick={() => setEstado('idle')} className="mt-5 text-jade text-sm hover:underline">
                Usar otro correo
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={estado === 'enviando'}
                aria-label={esAlta ? 'Crear cuenta con Google' : 'Continuar con Google'}
                className="w-full flex items-center justify-center gap-3 bg-white text-navy font-semibold text-sm rounded-xl py-3 mb-5 hover:bg-white/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {estado === 'enviando' ? 'Redirigiendo…' : esAlta ? 'Continuar con Google — es gratis' : 'Continuar con Google'}
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-white/30 text-xs">o</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <form onSubmit={handleMagicLink} className="space-y-5">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm text-ivory-dim">Correo electrónico</label>
                  <input
                    id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="abogado@ejemplo.com" required
                    className="w-full rounded-xl border border-white/10 bg-obsidian px-4 py-3 text-sm text-ivory outline-none placeholder-ivory-muted/50 transition-colors focus:border-jade/60"
                  />
                </div>

                {error && (
                  <p role="alert" className="text-red-400 text-xs bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={estado === 'enviando' || !email.trim()}
                  className="w-full btn-jade text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {estado === 'enviando' ? 'Enviando...' : 'Enviarme un enlace de acceso'}
                </button>

                <p className="text-center text-xs text-ivory-muted">
                  Sin contraseñas. El enlace crea la cuenta si es su primera vez.
                </p>
              </form>
            </>
          )}
        </div>

        <p className="mt-5 text-center text-xs text-ivory-muted">
          Al continuar acepta los{' '}
          <Link href="/terminos" className="text-ivory-dim underline hover:text-ivory">Términos</Link>
          {' '}y la{' '}
          <Link href="/privacidad" className="text-ivory-dim underline hover:text-ivory">Privacidad</Link>.
          Maya Lex no es asesoría jurídica.
        </p>

        <div className="mt-5 flex justify-center gap-6 text-xs text-ivory-muted">
          {esAlta ? (
            <Link href={`/login?next=${encodeURIComponent(nextDestino())}&intent=login`} className="transition-colors hover:text-ivory">
              Ya tengo cuenta
            </Link>
          ) : (
            <Link href={`/login?next=${encodeURIComponent(nextDestino())}&intent=signup`} className="transition-colors hover:text-ivory">
              Crear cuenta gratis
            </Link>
          )}
          <Link href="/pricing" className="transition-colors hover:text-ivory">Planes</Link>
          <Link href="/" className="transition-colors hover:text-ivory">Inicio</Link>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-obsidian" />}>
      <LoginForm />
    </Suspense>
  );
}
