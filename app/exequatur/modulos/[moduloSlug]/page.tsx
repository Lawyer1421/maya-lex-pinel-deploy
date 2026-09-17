/**
 * app/exequatur/modulos/[moduloSlug]/page.tsx — Índice de lecciones de un
 * módulo (Slice 2). Ruta hija de app/exequatur/layout.tsx -- ver nota de
 * autorización en app/exequatur/modulos/page.tsx.
 */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { CURRICULUM_EXEQUATUR } from '@/lib/exequatur/curriculum/curriculum';

function encontrarModulo(slug: string) {
  return CURRICULUM_EXEQUATUR.modulos.find((m) => m.slug === slug) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ moduloSlug: string }>;
}): Promise<Metadata> {
  const { moduloSlug } = await params;
  const modulo = encontrarModulo(moduloSlug);
  return { title: modulo ? `${modulo.titulo} · Exequátur` : 'Módulo no encontrado · Exequátur' };
}

export default async function ModuloPage({
  params,
}: {
  params: Promise<{ moduloSlug: string }>;
}) {
  const { moduloSlug } = await params;
  const modulo = encontrarModulo(moduloSlug);
  if (!modulo) notFound();

  return (
    <main className="min-h-screen bg-navy pt-12 pb-20 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/exequatur/modulos" className="text-white/40 hover:text-white/60 text-sm mb-6 inline-block">
          ← Módulos
        </Link>
        <h1 className="font-serif text-3xl font-bold text-gradient-maya mb-2">{modulo.titulo}</h1>
        <p className="text-white/50 text-sm mb-8">{modulo.descripcion}</p>

        <div className="space-y-3">
          {modulo.lecciones.map((leccion) => (
            <Link
              key={leccion.id}
              href={`/exequatur/modulos/${modulo.slug}/${leccion.slug}`}
              className="glass-card-hover p-5 block"
            >
              <h2 className="text-white font-semibold mb-1">{leccion.titulo}</h2>
              <p className="text-white/50 text-sm">{leccion.resumen}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
