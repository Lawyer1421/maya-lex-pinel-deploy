import Link from 'next/link';

/**
 * Página raíz — redirige al chat o sirve como splash page mínima.
 * La landing page completa es index.html (estática).
 */
export default function HomePage() {
  return (
    <main className="min-h-screen bg-navy flex items-center justify-center">
      <div className="text-center px-6">
        {/* Logo / símbolo */}
        <div className="w-24 h-24 rounded-full bg-gradient-maya mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-jade/30">
          <svg
            className="w-12 h-12 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
            />
          </svg>
        </div>

        {/* Título */}
        <h1 className="font-serif text-4xl font-bold text-gradient-maya mb-2">
          MAYA LEX
        </h1>
        <p className="text-gold text-sm font-medium tracking-widest uppercase mb-2">
          IA PINEL HN
        </p>
        <p className="text-white/50 text-sm mb-10">
          Asistente Jurídico Inteligente · Honduras
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/chat" className="btn-jade inline-block">
            Iniciar Consulta Jurídica
          </Link>
          <a
            href="../index.html"
            className="btn-ghost inline-block"
          >
            Ver Landing Page
          </a>
        </div>

        {/* Módulos rápidos */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
          {[
            { emoji: '⚖️', label: 'Civil / Procesal' },
            { emoji: '🔒', label: 'Penal' },
            { emoji: '📜', label: 'Notarial' },
            { emoji: '💼', label: 'Laboral' },
          ].map(({ emoji, label }) => (
            <Link
              key={label}
              href={`/chat?tema=${encodeURIComponent(label)}`}
              className="glass-card-hover p-4 text-center cursor-pointer"
            >
              <div className="text-2xl mb-1">{emoji}</div>
              <div className="text-white/70 text-xs">{label}</div>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <p className="mt-12 text-white/30 text-xs">
          © 2026 MAYA LEX IA PINEL HN · Abogado Fredy Omar Pinel Flores · Choluteca, Honduras
        </p>
      </div>
    </main>
  );
}
