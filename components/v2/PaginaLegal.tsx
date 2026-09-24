import type { ReactNode } from 'react';
import NavV2 from '@/components/v2/NavV2';
import FooterV2 from '@/components/v2/FooterV2';

/**
 * Plantilla compartida para páginas legales (Privacidad, Términos).
 * A diferencia de PaginaMarketing (hero + funciones + CTA), esta plantilla
 * es un artículo de lectura: título, fecha de vigencia y secciones en prosa.
 */
export default function PaginaLegal({
  titulo,
  vigenciaDesde,
  children,
}: {
  titulo: string;
  vigenciaDesde: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-obsidian text-ivory">
      <NavV2 />
      <main>
        <section className="mx-auto max-w-3xl px-4 pb-6 pt-14 sm:px-6">
          <h1 className="font-serif text-3xl font-bold leading-tight text-ivory sm:text-4xl">{titulo}</h1>
          <p className="mt-3 text-sm text-ivory-muted">Vigente desde el {vigenciaDesde}.</p>
        </section>
        <article className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
          <div className="space-y-10 text-ivory-dim [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ivory [&_p]:mt-3 [&_p]:leading-relaxed [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_li]:leading-relaxed [&_a]:text-jade-light [&_a]:underline [&_a]:underline-offset-2">
            {children}
          </div>
        </article>
      </main>
      <FooterV2 />
    </div>
  );
}
