/**
 * app/exequatur/page.tsx — Entry de Exequátur (Slice 3: diagnóstico + módulos).
 *
 * La autorización real ocurre en app/exequatur/layout.tsx: este
 * componente solo se renderiza cuando el layout ya decidió exequatur.access
 * = true y pasa {children} sin sustituir. Sin progreso simulado, sin texto
 * legal citado aquí -- el currículo vive en /exequatur/modulos y el
 * diagnóstico/plan en /exequatur/diagnostico y /exequatur/plan.
 */
import Link from 'next/link';

export default function ExequaturEntryPage() {
  return (
    <main className="min-h-screen bg-navy pt-12 pb-20 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-serif text-3xl font-bold text-gradient-maya mb-4">Exequátur</h1>
        <p className="text-white/70 mb-6">
          Bienvenido a Exequátur. Empieza por el diagnóstico de colocación o recorre
          los módulos. El texto legal se verifica en cada lección contra el corpus;
          no se cita desde el repositorio.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/exequatur/diagnostico" className="btn-jade inline-block text-sm py-2 px-4">
            Diagnóstico de colocación →
          </Link>
          <Link href="/exequatur/plan" className="btn-jade inline-block text-sm py-2 px-4">
            Ver plan de estudio →
          </Link>
          <Link href="/exequatur/modulos" className="btn-jade inline-block text-sm py-2 px-4">
            Ver módulos disponibles →
          </Link>
        </div>
      </div>
    </main>
  );
}

export const metadata = {
  title: 'Exequátur · MAYA LEX IA PINEL HN',
};
