import Link from 'next/link';
import BadgeVerificacion from './BadgeVerificacion';

export default function SeccionBancoJuridico() {
  return (
    <section aria-labelledby="banco-titulo" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 id="banco-titulo" className="font-serif text-3xl font-bold text-ivory sm:text-4xl">
            El Banco Jurídico Hondureño
          </h2>
          <p className="mt-4 text-ivory-dim">
            Maya Lex construye, de forma transparente, un corpus normativo verificado materia por materia — en vez de
            prometer cobertura total desde el primer día. Cada fuente muestra su estado real de verificación.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <BadgeVerificacion nivel="V4" />
            <BadgeVerificacion nivel="V3" />
            <BadgeVerificacion nivel="V1" />
          </div>
          <p className="mt-4 text-sm text-ivory-muted">
            Hoy, Penal y Procesal Civil cuentan con la mayor cobertura verificada. El resto de materias está en
            construcción activa, con fecha y alcance publicados en la página de cobertura.
          </p>
          <Link href="/cobertura-juridica" className="mt-5 inline-block text-sm font-semibold text-jade-light hover:underline focus-visible:ring-2 focus-visible:ring-jade rounded">
            Ver el estado real de cobertura →
          </Link>
        </div>
        <div className="rounded-2xl border border-obsidian-medium bg-obsidian-light p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-ivory-muted">Ejemplo de ficha normativa</p>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-obsidian-medium pb-3">
              <span className="text-ivory-dim">Código Penal — Art. 173</span>
              <BadgeVerificacion nivel="V4" />
            </div>
            <div className="flex items-center justify-between border-b border-obsidian-medium pb-3">
              <span className="text-ivory-dim">Código Procesal Civil — Art. 45</span>
              <BadgeVerificacion nivel="V3" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ivory-dim">Código de Comercio — en construcción</span>
              <BadgeVerificacion nivel="V1" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
