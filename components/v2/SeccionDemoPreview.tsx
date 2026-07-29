import Link from 'next/link';
import BadgeVerificacion from './BadgeVerificacion';

export default function SeccionDemoPreview() {
  return (
    <section aria-labelledby="demo-preview-titulo" className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <h2 id="demo-preview-titulo" className="text-center font-serif text-3xl font-bold text-ivory sm:text-4xl">
        Así se ve una respuesta de Maya Lex
      </h2>
      <div className="mt-10 rounded-2xl border border-obsidian-medium bg-obsidian-light p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-obsidian-medium pb-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-ivory-muted">Ejemplo ilustrativo — caso ficticio</span>
          <BadgeVerificacion nivel="V4" />
        </div>
        <dl className="mt-5 space-y-4 text-sm">
          <div>
            <dt className="font-semibold text-gold-light">Materia</dt>
            <dd className="text-ivory-dim">Derecho Civil — Obligaciones contractuales</dd>
          </div>
          <div>
            <dt className="font-semibold text-gold-light">Cuestión jurídica</dt>
            <dd className="text-ivory-dim">¿Procede la resolución del contrato por incumplimiento parcial?</dd>
          </div>
          <div>
            <dt className="font-semibold text-gold-light">Análisis breve</dt>
            <dd className="text-ivory-dim">
              El incumplimiento parcial puede fundar resolución si afecta la finalidad esencial del contrato,
              conforme al principio de proporcionalidad contractual.
            </dd>
          </div>
        </dl>
      </div>
      <div className="mt-6 text-center">
        <Link
          href="/demo"
          className="inline-block rounded-xl bg-jade-deep px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-jade/20 hover:bg-jade-dark focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian"
        >
          Probar la demostración interactiva →
        </Link>
      </div>
    </section>
  );
}
