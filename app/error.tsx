'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[MAYA LEX Error]', error);
  }, [error]);

  return (
    <main className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-gold font-mono text-5xl font-bold mb-4">500</p>
        <h1 className="font-serif text-2xl font-bold text-white mb-3">
          Error interno del servidor
        </h1>
        <p className="text-white/50 text-sm mb-2 leading-relaxed">
          Ocurrió un error inesperado. El equipo ha sido notificado.
        </p>
        {error.digest && (
          <p className="text-white/25 font-mono text-xs mb-6">ID: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center mt-6">
          <button onClick={reset} className="btn-jade text-sm">
            Intentar de nuevo
          </button>
          <Link href="/chat" className="btn-ghost text-sm">
            Volver al chat
          </Link>
        </div>
      </div>
    </main>
  );
}
