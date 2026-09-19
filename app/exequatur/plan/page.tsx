/**
 * app/exequatur/plan/page.tsx — Plan de estudio derivado (Slice 3).
 * Solo acepta objetivo IDs que existen en el currículo. No fabrica lecciones.
 */
import Link from 'next/link';
import type { Metadata } from 'next';
import { parsearObjetivosQuery, recomendarLecciones } from '@/lib/exequatur/diagnostico/evaluar';
import { localizarObjetivo } from '@/lib/exequatur/curriculum/localizar';

export const metadata: Metadata = {
  title: 'Plan de estudio · Exequátur · MAYA LEX IA PINEL HN',
};

export default async function PlanEstudioPage({
  searchParams,
}: {
  searchParams: Promise<{ objetivos?: string; aciertos?: string; total?: string }>;
}) {
  const params = await searchParams;
  const objetivos = parsearObjetivosQuery(params.objetivos);
  const lecciones = recomendarLecciones(objetivos);
  const aciertos = Number.parseInt(params.aciertos ?? '', 10);
  const total = Number.parseInt(params.total ?? '', 10);
  const hayPuntaje = Number.isFinite(aciertos) && Number.isFinite(total) && total > 0;

  return (
    <main className="min-h-screen bg-navy pt-12 pb-20 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/exequatur/diagnostico" className="text-white/40 hover:text-white/60 text-sm mb-6 inline-block">
          ← Diagnóstico
        </Link>
        <h1 className="font-serif text-3xl font-bold text-gradient-maya mb-2">Plan de estudio</h1>
        {hayPuntaje && (
          <p className="text-white/50 text-sm mb-6">
            {aciertos} de {total} ítems alineados con el objetivo. Las lecciones
            abajo cubren lo pendiente. El texto legal se abre en la lección
            (evidencia de corpus, no vigencia verificada de forma independiente).
          </p>
        )}

        {lecciones.length === 0 ? (
          <div className="glass-card p-5">
            <p className="text-white/80 text-sm mb-3">
              {objetivos.length === 0
                ? 'No hay objetivos pendientes. Puedes recorrer los módulos o repetir el diagnóstico.'
                : 'Los identificadores recibidos no corresponden a objetivos del currículo.'}
            </p>
            <Link href="/exequatur/modulos" className="btn-jade inline-block text-sm py-2 px-4">
              Ver módulos →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {lecciones.map((leccion) => (
              <Link
                key={`${leccion.moduloSlug}/${leccion.leccionSlug}`}
                href={`/exequatur/modulos/${leccion.moduloSlug}/${leccion.leccionSlug}`}
                className="glass-card-hover p-5 block"
              >
                <h2 className="text-white font-semibold mb-1">{leccion.titulo}</h2>
                <ul className="text-white/50 text-sm space-y-1">
                  {leccion.objetivoIds.map((objetivoId) => {
                    const localizado = localizarObjetivo(objetivoId);
                    return (
                      <li key={objetivoId}>
                        {localizado?.objetivo.descripcion ?? objetivoId}
                      </li>
                    );
                  })}
                </ul>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
