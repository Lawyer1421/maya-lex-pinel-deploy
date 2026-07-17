'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'enviado' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password || !aceptaTerminos) return;

    setEstado('enviando');
    setError('');

    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/chat')}`,
      },
    });

    if (authError) {
      // Mensaje genérico — no confirma ni niega si el correo ya existe
      // (evita enumeración de cuentas registradas).
      setError('No pudimos completar el registro. Verifique los datos e intente de nuevo.');
      setEstado('error');
      return;
    }

    setEstado('enviado');
  }

  return (
    <main className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif text-2xl font-bold text-gradient-maya">MAYA LEX</h1>
          <p className="text-white/40 text-sm mt-1">Crear una cuenta</p>
        </div>

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
                Enviamos un enlace de confirmación a <span className="text-jade">{email}</span>.
                Debe confirmar su correo antes de iniciar sesión.
              </p>
              <ResendConfirmation email={email} />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-white/60 text-sm mb-1.5">Correo electrónico</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="abogado@ejemplo.com" required
                  className="w-full bg-navy-light/60 border border-white/15 focus:border-jade/60 rounded-xl px-4 py-3 text-white placeholder-white/25 outline-none transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-1.5">Contraseña</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres" required minLength={8}
                  className="w-full bg-navy-light/60 border border-white/15 focus:border-jade/60 rounded-xl px-4 py-3 text-white placeholder-white/25 outline-none transition-colors text-sm"
                />
              </div>

              <label className="flex items-start gap-2 text-xs text-white/50">
                <input
                  type="checkbox" checked={aceptaTerminos}
                  onChange={e => setAceptaTerminos(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Acepto los <Link href="/terminos" className="text-jade hover:underline">términos de uso</Link> y
                  {' '}la <Link href="/privacidad" className="text-jade hover:underline">política de privacidad</Link>.
                </span>
              </label>

              {error && (
                <p className="text-red-400 text-xs bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={estado === 'enviando' || !email.trim() || !password || !aceptaTerminos}
                className="w-full btn-jade text-sm"
              >
                {estado === 'enviando' ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>
            </form>
          )}
        </div>

        <div className="mt-5 flex justify-center gap-6 text-xs text-white/30">
          <Link href="/login" className="hover:text-white/50 transition-colors">Ya tengo cuenta</Link>
          <Link href="/" className="hover:text-white/50 transition-colors">Volver al inicio</Link>
        </div>
      </div>
    </main>
  );
}

function ResendConfirmation({ email }: { email: string }) {
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'enviado' | 'limitado' | 'error'>('idle');

  async function reenviar() {
    setEstado('enviando');
    try {
      const res = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.status === 429) { setEstado('limitado'); return; }
      if (!res.ok) { setEstado('error'); return; }
      setEstado('enviado');
    } catch {
      setEstado('error');
    }
  }

  return (
    <div className="mt-4">
      <button onClick={reenviar} disabled={estado === 'enviando'} className="text-jade text-sm hover:underline disabled:opacity-50">
        {estado === 'enviando' ? 'Reenviando...' : 'Reenviar correo de confirmación'}
      </button>
      {estado === 'enviado' && <p className="text-white/40 text-xs mt-2">Reenviado. Revise su bandeja (y spam).</p>}
      {estado === 'limitado' && <p className="text-white/40 text-xs mt-2">Espere unos minutos antes de reenviar de nuevo.</p>}
      {estado === 'error' && <p className="text-red-400 text-xs mt-2">No se pudo reenviar. Intente más tarde.</p>}
    </div>
  );
}
