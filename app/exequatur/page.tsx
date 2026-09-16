/**
 * app/exequatur/page.tsx — Entry mínimo de Exequátur (Slice 1).
 *
 * La autorización real ocurre en app/exequatur/layout.tsx: este
 * componente solo se renderiza cuando el layout ya decidió exequatur.access
 * = true y pasa {children} sin sustituir. Contenido deliberadamente
 * estático -- sin currículo, sin progreso simulado, sin texto legal citado
 * (eso es Slice 2/3, fuera de alcance aquí).
 */
export default function ExequaturEntryPage() {
  return (
    <main className="min-h-screen bg-navy pt-12 pb-20 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-serif text-3xl font-bold text-gradient-maya mb-4">Exequátur</h1>
        <p className="text-white/70">
          Bienvenido a Exequátur. La preparación estructurada para el examen de
          incorporación notarial está en construcción — pronto encontrarás aquí tu
          diagnóstico, plan de estudio, módulos y práctica.
        </p>
      </div>
    </main>
  );
}

export const metadata = {
  title: 'Exequátur · MAYA LEX IA PINEL HN',
};
