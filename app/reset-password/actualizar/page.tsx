'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

/**
 * Llega aquí SOLO después de que /auth/callback intercambió el código
 * de recuperación por una sesión temporal real de Supabase — nunca se
 * confía en un parámetro de la URL para decidir si el usuario puede
 * cambiar su contraseña, la sesión ya la valida el propio Supabase.
 */
export default function ActualizarPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [estado, setEstado] = useState<'idle' | 'guardando' | 'guardado' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (password !== confirmar) { setError('Las contraseñas no coinciden.'); return; }

    setEstado('guardando');
    setError('');

    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError('No se pudo actualizar la contraseña. Solicite un nuevo enlace de recuperación.');
      setEstado('error');
      return;
    }

    setEstado('guardado');
    setTimeout(() => router.push('/chat'), 1500);
  }

  return (
    <main className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif text-2xl font-bold text-gradient-maya">MAYA LEX</h1>
          <p className="text-white/40 text-sm mt-1">Nueva contraseña</p>
        </div>

        <div className="glass-card p-7">
          {estado === 'guardado' ? (
            <p className="text-jade text-sm text-center">Contraseña actualizada. Redirigiendo…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-white/60 text-sm mb-1.5">Nueva contraseña</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres" required minLength={8}
                  className="w-full bg-navy-light/60 border border-white/15 focus:border-jade/60 rounded-xl px-4 py-3 text-white placeholder-white/25 outline-none transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-1.5">Confirmar contraseña</label>
                <input
                  type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)}
                  required minLength={8}
                  className="w-full bg-navy-light/60 border border-white/15 focus:border-jade/60 rounded-xl px-4 py-3 text-white placeholder-white/25 outline-none transition-colors text-sm"
                />
              </div>
              {error && <p className="text-red-400 text-xs bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}
              <button type="submit" disabled={estado === 'guardando'} className="w-full btn-jade text-sm">
                {estado === 'guardando' ? 'Guardando...' : 'Actualizar contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
