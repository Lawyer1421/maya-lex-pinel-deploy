import Link from 'next/link';

export default function HeroV2() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-40"
        style={{ background: 'radial-gradient(60% 50% at 50% 0%, rgba(45,155,138,0.18), transparent)' }}
        aria-hidden="true"
      />
      <div className="mx-auto max-w-4xl text-center">
        <span className="mode-badge border-jade/30 bg-jade/10 text-jade-light">
          Honduras · Derecho asistido por IA
        </span>
        <h1 className="mt-6 font-serif text-4xl font-bold leading-tight text-ivory sm:text-5xl lg:text-6xl">
          Inteligencia jurídica hondureña para investigar, analizar y actuar con mayor seguridad.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-ivory-dim">
          Consulte fuentes jurídicas, analice documentos, organice estrategias procesales y utilice herramientas
          especializadas para la práctica, la enseñanza y la investigación del derecho hondureño.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/chat"
            className="w-full rounded-xl bg-jade-deep px-6 py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-jade/20 transition hover:bg-jade-dark focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian sm:w-auto"
          >
            Probar gratis
          </Link>
          <Link
            href="/herramientas"
            className="w-full rounded-xl border border-obsidian-medium px-6 py-3.5 text-center text-sm font-semibold text-ivory-dim transition hover:border-jade/40 hover:text-ivory focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian sm:w-auto"
          >
            Explorar herramientas
          </Link>
        </div>
        <Link
          href="/cobertura-juridica"
          className="mt-5 inline-block text-sm text-ivory-muted underline decoration-obsidian-medium underline-offset-4 hover:text-ivory-dim focus-visible:ring-2 focus-visible:ring-jade rounded"
        >
          Ver cobertura jurídica
        </Link>
      </div>
    </section>
  );
}
