import Link from 'next/link';

export default function HeroV2() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-50"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, rgba(45,155,138,0.20), transparent), radial-gradient(40% 35% at 85% 10%, rgba(201,168,76,0.10), transparent)',
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-jade/40 to-transparent"
        aria-hidden="true"
      />
      <div className="mx-auto max-w-4xl text-center">
        <span className="mode-badge inline-flex items-center gap-1.5 border-jade/30 bg-jade/10 text-jade-light">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          Honduras · Derecho asistido por IA
        </span>
        <h1 className="mt-6 font-serif text-4xl font-bold leading-[1.1] tracking-tight text-ivory sm:text-5xl lg:text-6xl">
          Inteligencia jurídica hondureña, con el rigor que exige la práctica profesional.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ivory-dim">
          Consulte fuentes jurídicas, analice documentos, organice estrategias procesales y utilice herramientas
          especializadas para la práctica, la enseñanza y la investigación del derecho hondureño.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/chat"
            className="w-full rounded-xl bg-jade-deep px-6 py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-jade/20 transition hover:-translate-y-0.5 hover:bg-jade-dark hover:shadow-xl hover:shadow-jade/30 focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian sm:w-auto"
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

        <div className="mx-auto mt-12 flex max-w-lg flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-obsidian-medium pt-6 text-xs uppercase tracking-wide text-ivory-muted">
          <span>Penal y Procesal Civil verificados</span>
          <span className="hidden h-3 w-px bg-obsidian-medium sm:block" aria-hidden="true" />
          <span>Cifrado en tránsito y reposo</span>
          <span className="hidden h-3 w-px bg-obsidian-medium sm:block" aria-hidden="true" />
          <span>Sin tarjeta para probar</span>
        </div>
      </div>
    </section>
  );
}
