/**
 * app/exequatur/modulos/page.tsx — Índice de módulos del currículo (Slice 2).
 *
 * Ruta hija de app/exequatur/layout.tsx: se renderiza únicamente cuando el
 * gate de acceso (Slice 1, sin cambios) ya autorizó al usuario -- este
 * archivo no repite ni reimplementa ninguna lógica de autorización.
 */
import Link from 'next/link';
import type { Metadata } from 'next';
import { CURRICULUM_EXEQUATUR } from '@/lib/exequatur/curriculum/curriculum';

export const metadata: Metadata = {
  title: 'Módulos · Exequátur · MAYA LEX IA PINEL HN',
};

export default function ModulosPage() {
  return (
    <main className="min-h-screen bg-navy pt-12 pb-20 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/exequatur" className="text-white/40 hover:text-white/60 text-sm mb-6 inline-block">
          ← Exequátur
        </Link>
        <h1 className="font-serif text-3xl font-bold text-gradient-maya mb-2">
          {CURRICULUM_EXEQUATUR.titulo}
        </h1>
        <p className="text-white/50 text-sm mb-8">Módulos disponibles</p>

        <div className="space-y-3">
          {CURRICULUM_EXEQUATUR.modulos.map((modulo) => (
            <Link
              key={modulo.id}
              href={`/exequatur/modulos/${modulo.slug}`}
              className="glass-card-hover p-5 block"
            >
              <h2 className="text-white font-semibold mb-1">{modulo.titulo}</h2>
              <p className="text-white/50 text-sm">{modulo.descripcion}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
