'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import { buildAuthCallbackUrl } from '@/lib/auth/redirect';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { performGoogleSignIn, performMagicLinkSignIn } from '@/lib/auth/login-actions';

const MENSAJE_ERROR_GENERICO = 'No se pudo completar el inicio de sesión. Intente de nuevo.';

/**
 * Hotfix mínimo (hotfix/google-login-visible): agrega "Continuar con
 * Google" al login existente. Alcance reducido a propósito — sin
 * pestaña de contraseña, sin dependencias de entitlements/profiles/
 * migraciones. El único flujo que ya funcionaba (enlace mágico) se
 * mantiene sin cambios de comportamiento.
 *
 * enviandoEmail/enviandoGoogle son estados independientes (antes un solo
 * `estado` compartido hacía que ambos botones mostraran "cargando" a la
 * vez, y una excepción sin try/catch dejaba la UI congelada para siempre
 * — MAGIC_LINK_STALL, 2026-09-27). La llamada real a Supabase vive en
 * lib/auth/login-actions.ts, con timeout y manejo de errores centralizado.
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [enviandoGoogle, setEnviandoGoogle] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');

  function nextDestino(): string {
    return new URLSearchParams(window.location.search).get('next') ?? '/chat';
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || enviandoEmail) return;
    setEnviandoEmail(true);
    setError('');
    try {
      const supabase = createSupabaseBrowserClient();
      const callbackUrl = buildAuthCallbackUrl(window.location.origin, nextDestino());
      const resultado = await performMagicLinkSignIn(supabase, email.trim(), callbackUrl);
      if (resultado.ok) setEnviado(true);
      else setError(resultado.message ?? MENSAJE_ERROR_GENERICO);
    } finally {
      setEnviandoEmail(false);
    }
  }

  async function handleGoogle() {
    if (enviandoGoogle) return; // evita doble envío del mismo botón
    setError('');
    setEnviandoGoogle(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const callbackUrl = buildAuthCallbackUrl(window.location.origin, nextDestino());
      const resultado = await performGoogleSignIn(supabase, callbackUrl);
      if (!resultado.ok) setError(resultado.message ?? MENSAJE_ERROR_GENERICO);
      // Si resultado.ok, el navegador ya está redirigiendo a Google — el
      // finally de abajo igual limpia el estado por si la redirección no
      // se completa (p.ej. el usuario cancela).
    } finally {
      setEnviandoGoogle(false);
    }
  }

  return (
    <main className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-maya mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
            </svg>
          </div>
          <h1 className="font-serif text-2xl font-bold text-gradient-maya">MAYA LEX</h1>
          <p className="text-white/40 text-sm mt-1">Iniciar sesión</p>
        </div>

        <div className="glass-card p-7">
          {enviado ? (
            <div className="text-center py-4">
              <h2 className="font-semibold text-white mb-2">Revise su correo</h2>
              <p className="text-white/50 text-sm leading-relaxed">
                Enviamos un enlace de acceso a <span className="text-jade">{email}</span>.
              </p>
              <button onClick={() => setEnviado(false)} className="mt-5 text-jade text-sm hover:underline">
                Usar otro correo
              </button>
            </div>
          ) : (
            <>
              {/* Google — visible siempre */}
              <button
                type="button"
                onClick={handleGoogle}
                disabled={enviandoGoogle}
                aria-label="Continuar con Google"
                className="w-full flex items-center justify-center gap-3 bg-white text-navy font-semibold text-sm rounded-xl py-3 mb-5 hover:bg-white/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {enviandoGoogle ? 'Redirigiendo…' : 'Continuar con Google'}
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-white/30 text-xs">o</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <form onSubmit={handleMagicLink} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-white/60 text-sm mb-1.5">Correo electrónico</label>
                  <input
                    id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="abogado@ejemplo.com" required
                    className="w-full bg-navy-light/60 border border-white/15 focus:border-jade/60 rounded-xl px-4 py-3 text-white placeholder-white/25 outline-none transition-colors text-sm"
                  />
                </div>

                {error && (
                  <p role="alert" className="text-red-400 text-xs bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={enviandoEmail || !email.trim()}
                  className="w-full btn-jade text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {enviandoEmail ? 'Enviando...' : 'Enviarme un enlace de acceso'}
                </button>

                <p className="text-white/30 text-xs text-center">
                  Sin contraseñas. Solo su correo electrónico.
                </p>
              </form>
            </>
          )}
        </div>

        <div className="mt-5 flex justify-center gap-6 text-xs text-white/30">
          <Link href="/pricing" className="hover:text-white/50 transition-colors">Planes</Link>
          <Link href="/" className="hover:text-white/50 transition-colors">Inicio</Link>
        </div>
      </div>
    </main>
  );
}
