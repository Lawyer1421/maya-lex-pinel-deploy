'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'enviado'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setEstado('enviando');

    const supabase = createSupabaseBrowserClient();
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/reset-password/actualizar')}`,
    });

    // Siempre muestra el mismo mensaje de éxito, exista o no la cuenta
    // — protección contra enumeración de correos registrados.
    setEstado('enviado');
  }

  return (
    <main className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif text-2xl font-bold text-gradient-maya">MAYA LEX</h1>
          <p className="text-white/40 text-sm mt-1">Recuperar contraseña</p>
        </div>

        <div className="glass-card p-7">
          {estado === 'enviado' ? (
            <div className="text-center py-4">
              <h2 className="font-semibold text-white mb-2">Revise su correo</h2>
              <p className="text-white/50 text-sm leading-relaxed">
                Si existe una cuenta con ese correo, enviamos un enlace para restablecer la contraseña.
              </p>
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
              <button type="submit" disabled={estado === 'enviando' || !email.trim()} className="w-full btn-jade text-sm">
                {estado === 'enviando' ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </button>
            </form>
          )}
        </div>

        <div className="mt-5 flex justify-center gap-6 text-xs text-white/30">
          <Link href="/login" className="hover:text-white/50 transition-colors">Volver a iniciar sesión</Link>
        </div>
      </div>
    </main>
  );
}
