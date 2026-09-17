/**
 * app/exequatur/modulos/[moduloSlug]/[leccionSlug]/page.tsx — Detalle de una
 * lección (Slice 2). Ruta hija de app/exequatur/layout.tsx -- ver nota de
 * autorización en app/exequatur/modulos/page.tsx.
 *
 * Cada objetivo de aprendizaje se resuelve en vivo contra el corpus real vía
 * resolverReferenciaLegal -- este componente nunca cita texto legal
 * almacenado en el repositorio. Cuando una referencia no se puede verificar
 * (NO_VERIFICADO), se muestra explícitamente como tal, nunca se omite en
 * silencio ni se sustituye por texto genérico.
 */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { CURRICULUM_EXEQUATUR } from '@/lib/exequatur/curriculum/curriculum';
import { resolverReferenciaLegal } from '@/lib/exequatur/canonical-reference-adapter';
import type { CanonicalLegalReference } from '@/lib/exequatur/curriculum/types';

function encontrarLeccion(moduloSlug: string, leccionSlug: string) {
  const modulo = CURRICULUM_EXEQUATUR.modulos.find((m) => m.slug === moduloSlug);
  if (!modulo) return null;
  const leccion = modulo.lecciones.find((l) => l.slug === leccionSlug);
  if (!leccion) return null;
  return { modulo, leccion };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ moduloSlug: string; leccionSlug: string }>;
}): Promise<Metadata> {
  const { moduloSlug, leccionSlug } = await params;
  const encontrado = encontrarLeccion(moduloSlug, leccionSlug);
  return { title: encontrado ? `${encontrado.leccion.titulo} · Exequátur` : 'Lección no encontrada · Exequátur' };
}

function etiquetaInstrumento(instrumento: CanonicalLegalReference['instrumento']): string {
  const etiquetas: Record<CanonicalLegalReference['instrumento'], string> = {
    CODIGO_PROCESAL_PENAL: 'Código Procesal Penal',
    CODIGO_PENAL: 'Código Penal',
    CODIGO_PROCESAL_CIVIL: 'Código Procesal Civil',
    CODIGO_CIVIL: 'Código Civil',
    CODIGO_TRABAJO: 'Código del Trabajo',
    CODIGO_FAMILIA: 'Código de Familia',
    CODIGO_NOTARIADO: 'Código del Notariado',
    REGLAMENTO_NOTARIADO: 'Reglamento del Código del Notariado',
    CODIGO_TRIBUTARIO: 'Código Tributario',
    LEY_JUSTICIA_CONSTITUCIONAL: 'Ley sobre Justicia Constitucional',
    CONSTITUCION: 'Constitución de la República',
    CODIGO_COMERCIO: 'Código de Comercio',
  };
  return etiquetas[instrumento];
}

export default async function LeccionPage({
  params,
}: {
  params: Promise<{ moduloSlug: string; leccionSlug: string }>;
}) {
  const { moduloSlug, leccionSlug } = await params;
  const encontrado = encontrarLeccion(moduloSlug, leccionSlug);
  if (!encontrado) notFound();
  const { modulo, leccion } = encontrado;

  const objetivosConResolucion = await Promise.all(
    leccion.objetivos.map(async (objetivo) => ({
      objetivo,
      resoluciones: await Promise.all(objetivo.referencias.map(resolverReferenciaLegal)),
    })),
  );

  return (
    <main className="min-h-screen bg-navy pt-12 pb-20 px-4">
      <div className="max-w-2xl mx-auto">
        <Link
          href={`/exequatur/modulos/${modulo.slug}`}
          className="text-white/40 hover:text-white/60 text-sm mb-6 inline-block"
        >
          ← {modulo.titulo}
        </Link>
        <h1 className="font-serif text-3xl font-bold text-gradient-maya mb-2">{leccion.titulo}</h1>
        <p className="text-white/50 text-sm mb-8">{leccion.resumen}</p>

        <div className="space-y-5">
          {objetivosConResolucion.map(({ objetivo, resoluciones }) => (
            <div key={objetivo.id} className="glass-card p-5">
              <h2 className="text-white font-semibold mb-3">{objetivo.descripcion}</h2>
              <div className="space-y-3">
                {resoluciones.map((resolucion, i) => (
                  <div key={i} className="border-t border-white/10 pt-3">
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
                      {etiquetaInstrumento(resolucion.referencia.instrumento)} — Artículo{' '}
                      {resolucion.referencia.articulo}
                    </p>
                    {resolucion.estado === 'RESUELTO' ? (
                      <>
                        <p className="text-white/80 text-sm whitespace-pre-line">{resolucion.contenido}</p>
                        <p className="text-white/30 text-[11px] mt-2">
                          Fuente: {resolucion.fuente}
                          {' · '}
                          {/* RESUELTO significa evidencia del corpus jurídico encontrada y
                              atribuible, NUNCA que la vigencia haya sido verificada de forma
                              independiente -- vigenciaSegunCorpus es un dato heredado de la
                              ingesta, no una conclusión propia del adaptador. Sin insignia
                              "Vigente": ese dato por sí solo no basta para afirmarlo. */}
                          evidencia del corpus jurídico, no verificación independiente de vigencia
                          {resolucion.vigenciaSegunCorpus === false && (
                            <span className="text-gold ml-2">
                              — marcado como no vigente en el corpus, no citar como norma actual
                            </span>
                          )}
                        </p>
                      </>
                    ) : (
                      <p className="text-white/50 text-sm italic">
                        No verificado: {resolucion.motivo}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
