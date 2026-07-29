import Link from 'next/link';

const HERRAMIENTAS = [
  {
    icono: 'M12 6.75a5.25 5.25 0 0 1 5.25 5.25v2.25a5.25 5.25 0 0 1-10.5 0V12A5.25 5.25 0 0 1 12 6.75Zm0 0V3m0 18v-2.25',
    titulo: 'Consulta normativa',
    descripcion: 'Busque artículos y decretos por materia, con citación clara del estado de verificación.',
  },
  {
    icono: 'M9 12h6m-6 3h6m-7.5 6h9a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 16.5 4.5h-9A2.25 2.25 0 0 0 5.25 6.75v12A2.25 2.25 0 0 0 7.5 21Z',
    titulo: 'Análisis de documentos',
    descripcion: 'Suba un documento y obtenga un análisis estructurado de sus puntos jurídicos clave.',
  },
  {
    icono: 'M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5',
    titulo: 'Estrategia procesal',
    descripcion: 'Organice etapas, plazos y argumentos de un caso con apoyo estructurado.',
  },
  {
    icono: 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12h-9m9-3.75h-9M9 4.5H8.25a2.25 2.25 0 0 0-2.25 2.25v11.25a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-.659-1.591L14.25 4.5H9Z',
    titulo: 'Generación de escritos',
    descripcion: 'Genere borradores de escritos y documentos con base en su información del caso.',
  },
];

export default function SeccionHerramientas() {
  return (
    <section aria-labelledby="herramientas-titulo" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <h2 id="herramientas-titulo" className="text-center font-serif text-3xl font-bold text-ivory sm:text-4xl">
        Herramientas para el ejercicio del derecho
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-center text-ivory-dim">
        Diseñadas para acompañar la práctica profesional, no para sustituir el criterio jurídico.
      </p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {HERRAMIENTAS.map((h) => (
          <div key={h.titulo} className="rounded-2xl border border-obsidian-medium bg-obsidian-light p-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-jade" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d={h.icono} />
            </svg>
            <h3 className="mt-4 font-serif text-lg font-semibold text-ivory">{h.titulo}</h3>
            <p className="mt-2 text-sm text-ivory-dim">{h.descripcion}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link href="/herramientas" className="text-sm font-semibold text-jade-light hover:underline focus-visible:ring-2 focus-visible:ring-jade rounded">
          Explorar todas las herramientas →
        </Link>
      </div>
    </section>
  );
}
