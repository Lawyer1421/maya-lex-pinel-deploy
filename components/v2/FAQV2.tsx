'use client';

import { useState } from 'react';

interface PreguntaFAQ {
  pregunta: string;
  respuesta: string;
}

export default function FAQV2({ preguntas, titulo = 'Preguntas frecuentes' }: { preguntas: PreguntaFAQ[]; titulo?: string }) {
  const [abierta, setAbierta] = useState<number | null>(0);

  return (
    <section aria-labelledby="faq-titulo" className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h2 id="faq-titulo" className="text-center font-serif text-3xl font-bold text-ivory">{titulo}</h2>
      <div className="mt-8 divide-y divide-obsidian-medium rounded-2xl border border-obsidian-medium bg-obsidian-light">
        {preguntas.map((p, i) => {
          const abiertaAhora = abierta === i;
          return (
            <div key={p.pregunta}>
              <button
                type="button"
                aria-expanded={abiertaAhora}
                aria-controls={`faq-panel-${i}`}
                onClick={() => setAbierta(abiertaAhora ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-ivory focus-visible:ring-2 focus-visible:ring-jade"
              >
                {p.pregunta}
                <svg
                  width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                  className={`shrink-0 text-ivory-muted transition-transform ${abiertaAhora ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              {abiertaAhora && (
                <div id={`faq-panel-${i}`} className="px-5 pb-4 text-sm leading-relaxed text-ivory-dim">
                  {p.respuesta}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
