/**
 * app/exequatur/page.tsx — Entry de Exequátur (Slice 1, con enlace a
 * currículo agregado en Slice 2).
 *
 * La autorización real ocurre en app/exequatur/layout.tsx: este
 * componente solo se renderiza cuando el layout ya decidió exequatur.access
 * = true y pasa {children} sin sustituir. Sin progreso simulado, sin texto
 * legal citado aquí -- el contenido curricular vive en /exequatur/modulos y
 * se resuelve contra evidencia real ahí, nunca en esta página estática.
 */
import Link from 'next/link';

export default function ExequaturEntryPage() {
  return (
    <main className="min-h-screen bg-navy pt-12 pb-20 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-serif text-3xl font-bold text-gradient-maya mb-4">Exequátur</h1>
        <p className="text-white/70 mb-6">
          Bienvenido a Exequátur. La preparación estructurada para el examen de
          incorporación notarial está en construcción — el diagnóstico y el plan de
          estudio personalizado llegarán pronto.
        </p>
        <Link href="/exequatur/modulos" className="btn-jade inline-block text-sm py-2 px-4">
          Ver módulos disponibles →
        </Link>
      </div>
    </main>
  );
}

export const metadata = {
  title: 'Exequátur · MAYA LEX IA PINEL HN',
};
