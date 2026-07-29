import type { ReactNode } from 'react';
import Link from 'next/link';
import NavV2 from '@/components/v2/NavV2';
import FooterV2 from '@/components/v2/FooterV2';
import type { ConfigPaginaMarketing } from '@/lib/v2/paginas-marketing';

/**
 * Plantilla compartida de página de marketing V2 ("biblioteca jurídica premium").
 * Todas las páginas de producto/soluciones se generan desde una configuración
 * (lib/v2/paginas-marketing.ts) — una sola implementación de layout, trece rutas.
 * `children` permite secciones a medida (tabla de cobertura, biografía) sin
 * duplicar navegación, hero, honestidad de límites ni CTA final.
 */
export default function PaginaMarketing({ config, children }: { config: ConfigPaginaMarketing; children?: ReactNode }) {
  return (
    <div className="min-h-screen bg-obsidian text-ivory">
      <NavV2 />
      <main>
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-4 pb-10 pt-16 text-center sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-jade-light">{config.eyebrow}</p>
          <h1 className="mt-3 font-serif text-4xl font-bold leading-tight text-ivory sm:text-5xl">{config.titulo}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-ivory-dim">{config.propuesta}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={config.ctaPrimario.href}
              className="w-full rounded-xl bg-jade-deep px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-jade/20 transition hover:bg-jade-dark focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian sm:w-auto"
            >
              {config.ctaPrimario.label}
            </Link>
            {config.ctaSecundario && (
              <Link
                href={config.ctaSecundario.href}
                className="w-full rounded-xl border border-obsidian-medium bg-obsidian-light px-6 py-3 text-center text-sm font-semibold text-ivory transition hover:border-jade/40 focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian sm:w-auto"
              >
                {config.ctaSecundario.label}
              </Link>
            )}
          </div>
        </section>

        {/* Funciones relevantes */}
        <section aria-labelledby="funciones-titulo" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <h2 id="funciones-titulo" className="text-center font-serif text-3xl font-bold text-ivory">
            {config.funcionesTitulo}
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {config.funciones.map((f) => (
              <div key={f.titulo} className="rounded-2xl border border-obsidian-medium bg-obsidian-light p-6">
                <h3 className="font-serif text-lg font-semibold text-ivory">{f.titulo}</h3>
                <p className="mt-2 text-sm text-ivory-dim">{f.descripcion}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Caso de uso */}
        <section aria-labelledby="caso-titulo" className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <div className="rounded-2xl border border-obsidian-medium bg-obsidian-light p-8">
            <h2 id="caso-titulo" className="font-serif text-2xl font-bold text-ivory">{config.casoUso.titulo}</h2>
            {config.casoUso.parrafos.map((p) => (
              <p key={p.slice(0, 40)} className="mt-4 leading-relaxed text-ivory-dim">{p}</p>
            ))}
          </div>
        </section>

        {/* Secciones a medida de la página (opcional) */}
        {children}

        {/* Cobertura y límites — siempre presente, siempre honesto */}
        <section aria-labelledby="cobertura-titulo" className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <div className="rounded-2xl border border-gold/30 bg-gold/5 p-8">
            <h2 id="cobertura-titulo" className="font-serif text-2xl font-bold text-ivory">{config.cobertura.titulo}</h2>
            <ul className="mt-4 space-y-3">
              {config.cobertura.puntos.map((punto) => (
                <li key={punto.slice(0, 40)} className="flex items-start gap-3 text-sm leading-relaxed text-ivory-dim">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mt-0.5 shrink-0 text-gold-light" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                  </svg>
                  {punto}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA final */}
        <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <h2 className="font-serif text-3xl font-bold text-ivory">{config.cierreTitulo}</h2>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={config.ctaPrimario.href}
              className="w-full rounded-xl bg-jade-deep px-8 py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-jade/20 transition hover:bg-jade-dark focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian sm:w-auto"
            >
              {config.ctaPrimario.label}
            </Link>
            <Link
              href="/pricing"
              className="w-full rounded-xl border border-obsidian-medium bg-obsidian-light px-8 py-3.5 text-center text-sm font-semibold text-ivory transition hover:border-jade/40 focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian sm:w-auto"
            >
              Ver planes
            </Link>
          </div>
        </section>
      </main>
      <FooterV2 />
    </div>
  );
}
