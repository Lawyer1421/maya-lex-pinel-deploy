import Link from 'next/link';
import CtaProbarGratis from '@/components/marketing/CtaProbarGratis';
import MarcoConsulta from './MarcoConsulta';

const SELLOS = [
  '3 consultas gratis, sin tarjeta',
  'No inventa artículos',
  'Verificación V0–V5 visible',
];

export default function HeroV2() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-14 sm:px-6 sm:pt-20">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(70% 55% at 18% 0%, rgba(45,155,138,0.14), transparent 55%), radial-gradient(50% 40% at 90% 10%, rgba(201,168,76,0.06), transparent 50%)',
        }}
        aria-hidden="true"
      />
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-light">
            Honduras · Inteligencia jurídica
          </p>
          <h1 className="mt-5 font-serif text-4xl font-bold leading-[1.15] text-ivory sm:text-5xl lg:text-[3.35rem]">
            El derecho hondureño, citado con criterio y sin ficción.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ivory-dim">
            Investigue normas, analice documentos y redacte borradores con el
            estado de cada fuente a la vista. Construido por un abogado
            colegiado — no por un chatbot genérico.
          </p>
          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <CtaProbarGratis
              source="hero"
              className="rounded-xl bg-jade-deep px-7 py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-jade/20 transition hover:bg-jade-dark focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian"
            >
              Probar gratis
            </CtaProbarGratis>
            <Link
              href="/cobertura-juridica"
              className="rounded-xl border border-white/10 px-7 py-3.5 text-center text-sm font-semibold text-ivory-dim transition hover:border-gold/35 hover:text-ivory focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian"
            >
              Ver cobertura real
            </Link>
          </div>
          <ul className="mt-8 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
            {SELLOS.map((sello) => (
              <li key={sello} className="flex items-center gap-2 text-xs text-ivory-muted">
                <span className="h-px w-4 bg-gold/50" aria-hidden="true" />
                {sello}
              </li>
            ))}
          </ul>
        </div>
        <MarcoConsulta />
      </div>
    </section>
  );
}
