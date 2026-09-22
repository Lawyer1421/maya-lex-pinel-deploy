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

const ACCIONES = [
  { href: '/exequatur/diagnostico', label: 'Diagnóstico de colocación →' },
  { href: '/exequatur/plan', label: 'Ver plan de estudio →' },
  { href: '/exequatur/modulos', label: 'Ver módulos disponibles →' },
];

export default function ExequaturEntryPage() {
  return (
    <main className="min-h-screen bg-obsidian px-4 pb-20 pt-12 text-ivory">
      <div className="mx-auto max-w-2xl">
        <span className="mode-badge border-gold/30 bg-gold/10 text-gold-light">Plan Notarial · Acceso activo</span>
        <h1 className="mt-4 font-serif text-3xl font-bold text-ivory">Exequátur</h1>
        <p className="mb-8 mt-3 text-ivory-dim">
          Bienvenido al programa de preparación para el Exequátur de Notario ante la Corte Suprema de Justicia.
          Empiece por el diagnóstico de colocación o recorra los módulos. El texto legal se verifica en cada
          lección contra el corpus; no se cita desde el repositorio.
        </p>
        <div className="flex flex-wrap gap-3">
          {ACCIONES.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="inline-block rounded-xl bg-jade-deep px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-jade/20 transition hover:bg-jade-dark focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian"
            >
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

export const metadata = {
  title: 'Exequátur · MAYA LEX IA PINEL HN',
};
