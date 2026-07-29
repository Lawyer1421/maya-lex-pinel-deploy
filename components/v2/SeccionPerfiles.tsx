import Link from 'next/link';

const PERFILES = [
  { href: '/soluciones/abogados', label: 'Abogados', desc: 'Investigación y análisis para el litigio diario.' },
  { href: '/soluciones/notarios', label: 'Notarios', desc: 'Referencia rápida para instrumentos y trámites.' },
  { href: '/soluciones/estudiantes', label: 'Estudiantes', desc: 'Aprenda con casos guiados y explicaciones claras.' },
  { href: '/soluciones/docentes', label: 'Docentes', desc: 'Material de apoyo para la enseñanza del derecho.' },
  { href: '/soluciones/bufetes', label: 'Bufetes', desc: 'Colaboración y biblioteca compartida de equipo.' },
  { href: '/soluciones/universidades', label: 'Universidades', desc: 'Licencias académicas para facultades de derecho.' },
  { href: '/soluciones/empresas', label: 'Empresas', desc: 'Investigación jurídica para equipos legales internos.' },
];

export default function SeccionPerfiles() {
  return (
    <section aria-labelledby="perfiles-titulo" className="bg-obsidian-light/40 px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <h2 id="perfiles-titulo" className="text-center font-serif text-3xl font-bold text-ivory sm:text-4xl">
          Hecho para cada rol del ejercicio jurídico
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PERFILES.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="rounded-2xl border border-obsidian-medium bg-obsidian p-5 transition hover:border-jade/40 focus-visible:ring-2 focus-visible:ring-jade"
            >
              <h3 className="font-serif text-base font-semibold text-ivory">{p.label}</h3>
              <p className="mt-1.5 text-xs text-ivory-muted">{p.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
