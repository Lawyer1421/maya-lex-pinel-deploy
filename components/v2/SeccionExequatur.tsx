import Link from 'next/link';

const CARACTERISTICAS = [
  'Diagnóstico de colocación para saber por dónde empezar',
  'Plan de estudio personalizado, con ritmo propio',
  'Módulos verificados contra el corpus jurídico hondureño',
];

export default function SeccionExequatur() {
  return (
    <section aria-labelledby="exequatur-titulo" className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-jade/25 bg-gradient-to-br from-obsidian-light via-obsidian-light to-jade/5 p-8 sm:p-12">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <span className="mode-badge border-gold/30 bg-gold/10 text-gold-light">
              Preparación de Exequátur
            </span>
            <h2 id="exequatur-titulo" className="mt-4 font-serif text-3xl font-bold text-ivory sm:text-4xl">
              Prepare su Exequátur con el mismo corpus que usan los profesionales.
            </h2>
            <p className="mt-4 max-w-xl text-ivory-dim">
              Un diagnóstico inicial ubica su nivel de colocación y arma un plan de estudio a su medida, con
              módulos verificados contra el corpus jurídico hondureño — sin listas genéricas ni resúmenes sin fuente.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/exequatur/diagnostico"
                className="rounded-xl bg-jade-deep px-6 py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-jade/20 transition hover:bg-jade-dark focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian"
              >
                Iniciar diagnóstico gratis
              </Link>
              <Link
                href="/exequatur"
                className="rounded-xl border border-obsidian-medium px-6 py-3.5 text-center text-sm font-semibold text-ivory-dim transition hover:border-jade/40 hover:text-ivory focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian"
              >
                Ver cómo funciona
              </Link>
            </div>
          </div>
          <ul className="space-y-4">
            {CARACTERISTICAS.map((c) => (
              <li key={c} className="flex items-start gap-3 rounded-2xl border border-obsidian-medium bg-obsidian/60 p-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mt-0.5 shrink-0 text-jade" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                <span className="text-sm text-ivory-dim">{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
