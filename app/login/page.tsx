'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'enviado' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setEstado('enviando');
    setError('');

    // Preservar destino de retorno (?next=/pricing) a través del enlace mágico
    const next = new URLSearchParams(window.location.search).get('next') ?? '/chat';

    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo:
          `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (authError) {
      setError(authError.message);
      setEstado('error');
    } else {
      setEstado('enviado');
    }
  }

  return (
    <main className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-maya mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
            </svg>
          </div>
          <h1 className="font-serif text-2xl font-bold text-gradient-maya">MAYA LEX</h1>
          <p className="text-white/40 text-sm mt-1">Acceso con enlace mágico</p>
        </div>

        {/* Card */}
        <div className="glass-card p-7">
          {estado === 'enviado' ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-jade/20 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-7 h-7 text-jade" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="font-semibold text-white mb-2">Revise su correo</h2>
              <p className="text-white/50 text-sm leading-relaxed">
                Enviamos un enlace de acceso a <span className="text-jade">{email}</span>.
                Haga clic en el enlace para ingresar.
              </p>
              <p className="text-white/30 text-xs mt-4">
                ¿No llegó? Revise la carpeta de spam.
              </p>
              <button
                onClick={() => setEstado('idle')}
                className="mt-5 text-jade text-sm hover:underline"
              >
                Usar otro correo
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-white/60 text-sm mb-1.5">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="abogado@ejemplo.com"
                  required
                  className="w-full bg-navy-light/60 border border-white/15 focus:border-jade/60 rounded-xl px-4 py-3 text-white placeholder-white/25 outline-none transition-colors text-sm"
                />
              </div>

              {error && (
                <p className="text-red-400 text-xs bg-red-400/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={estado === 'enviando' || !email.trim()}
                className="w-full btn-jade text-sm"
              >
                {estado === 'enviando' ? 'Enviando enlace...' : 'Enviar enlace de acceso'}
              </button>

              <p className="text-white/30 text-xs text-center">
                Sin contraseñas. Solo su correo electrónico.
              </p>
            </form>
          )}
        </div>

        {/* Links */}
        <div className="mt-5 flex justify-center gap-6 text-xs text-white/30">
          <Link href="/" className="hover:text-white/50 transition-colors">Inicio</Link>
          <Link href="/pricing" className="hover:text-white/50 transition-colors">Planes</Link>
          <Link href="/" className="hover:text-white/50 transition-colors">Volver al inicio</Link>
        </div>
      </div>
    </main>
  );
}
