/**
 * app/exequatur/plan/page.tsx — Plan de estudio persistido (Slice 3B).
 * Autoridad: intento propio re-evaluado. Query objetivos/aciertos/total se ignora.
 * Solo acepta lecciones que existen en el currículo. No fabrica lecciones.
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { localizarObjetivo } from '@/lib/exequatur/curriculum/localizar';
import {
  cargarIntentoPropio,
  cargarUltimoIntentoPropio,
  parsearIntentoQuery,
  resolverSesionExequatur,
} from '@/lib/exequatur/diagnostico/persistencia';

export const metadata: Metadata = {
  title: 'Plan de estudio · Exequátur · MAYA LEX IA PINEL HN',
};

export default async function PlanEstudioPage({
  searchParams,
}: {
  searchParams: Promise<{ intento?: string }>;
}) {
  const params = await searchParams;
  const sesion = await resolverSesionExequatur();
  if (!sesion) {
    redirect('/login?next=/exequatur/plan');
  }

  const intentoId = parsearIntentoQuery(params.intento);
  const guardado = intentoId
    ? await cargarIntentoPropio(sesion, intentoId)
    : await cargarUltimoIntentoPropio(sesion);

  const resultado = guardado?.resultado ?? null;
  const lecciones = resultado?.leccionesRecomendadas ?? [];

  return (
    <main className="min-h-screen bg-navy pt-12 pb-20 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/exequatur/diagnostico" className="text-white/40 hover:text-white/60 text-sm mb-6 inline-block">
          ← Diagnóstico
        </Link>
        <h1 className="font-serif text-3xl font-bold text-gradient-maya mb-2">Plan de estudio</h1>
        {resultado ? (
          <p className="text-white/50 text-sm mb-6">
            {resultado.aciertos.length} de {resultado.total} ítems alineados con el
            objetivo. Las lecciones abajo cubren lo pendiente. El texto legal se
            abre en la lección (evidencia de corpus, no vigencia verificada de
            forma independiente).
          </p>
        ) : (
          <p className="text-white/50 text-sm mb-6">
            No hay un diagnóstico persistido para esta sesión. Completa el
            diagnóstico para generar tu plan. El puntaje no se lee de la URL.
          </p>
        )}

        {!resultado ? (
          <div className="glass-card p-5">
            <p className="text-white/80 text-sm mb-3">
              {intentoId
                ? 'Ese intento no existe o no te pertenece. Vuelve a diagnosticarte o abre tu último plan.'
                : 'Aún no hay un plan guardado. El diagnóstico escribe el intento en servidor con tu sesión.'}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/exequatur/diagnostico" className="btn-jade inline-block text-sm py-2 px-4">
                Ir al diagnóstico →
              </Link>
              {intentoId && (
                <Link href="/exequatur/plan" className="btn-jade inline-block text-sm py-2 px-4">
                  Ver último plan →
                </Link>
              )}
            </div>
          </div>
        ) : lecciones.length === 0 ? (
          <div className="glass-card p-5">
            <p className="text-white/80 text-sm mb-3">
              No hay objetivos pendientes. Puedes recorrer los módulos o repetir el diagnóstico.
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
