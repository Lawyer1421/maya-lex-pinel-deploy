import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-jade font-mono text-6xl font-bold mb-4">404</p>
        <h1 className="font-serif text-2xl font-bold text-white mb-3">
          Página no encontrada
        </h1>
        <p className="text-white/50 text-sm mb-8 leading-relaxed">
          La página que busca no existe o fue movida.
          Si llegó aquí desde un enlace, puede que haya expirado.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/chat" className="btn-jade text-sm">
            Ir al chat
          </Link>
          <Link href="/" className="btn-ghost text-sm">
            Inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
