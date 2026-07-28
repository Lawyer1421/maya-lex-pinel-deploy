import Link from 'next/link';
import { PLANES_V2 } from './planes-data';
import TarjetaPlan from './TarjetaPlan';

export default function SeccionPreciosResumen() {
  return (
    <section aria-labelledby="precios-resumen-titulo" className="bg-obsidian-light/40 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <h2 id="precios-resumen-titulo" className="text-center font-serif text-3xl font-bold text-ivory sm:text-4xl">
          Un plan para cada etapa
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PLANES_V2.slice(0, 3).map((p) => (
            <TarjetaPlan key={p.id} plan={p} compacta />
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/pricing" className="text-sm font-semibold text-jade-light hover:underline focus-visible:ring-2 focus-visible:ring-jade rounded">
            Ver todos los planes, incluyendo Bufete y Universidad →
          </Link>
        </div>
      </div>
    </section>
  );
}
