'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CASOS_DEMO, type CasoDemo } from './casos-mock';
import BadgeVerificacion from '@/components/v2/BadgeVerificacion';

export default function DemoInteractiva() {
  const [casoSeleccionado, setCasoSeleccionado] = useState<CasoDemo | null>(null);

  return (
    <div>
      <div
        role="note"
        aria-label="Aviso de demostración"
        className="rounded-xl border border-gold/30 bg-gold/10 p-4 text-sm text-gold-light"
      >
        <strong className="font-semibold">Esto es una demostración con datos 100% ficticios.</strong> No es asesoría
        jurídica ni una fuente vigente — ningún caso, norma o cita aquí corresponde a un expediente real.
      </div>

      {!casoSeleccionado ? (
        <div className="mt-8">
          <h2 className="font-serif text-xl font-semibold text-ivory">Elija un escenario ficticio para ver un ejemplo</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {CASOS_DEMO.map((caso) => (
              <button
                key={caso.id}
                type="button"
                onClick={() => setCasoSeleccionado(caso)}
                className="rounded-2xl border border-obsidian-medium bg-obsidian-light p-5 text-left transition hover:border-jade/40 focus-visible:ring-2 focus-visible:ring-jade"
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-ivory-muted">{caso.materia}</p>
                <p className="mt-2 font-serif text-base font-semibold text-ivory">{caso.etiqueta}</p>
                <p className="mt-2 text-sm text-ivory-dim">{caso.pregunta}</p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setCasoSeleccionado(null)}
            className="text-sm text-ivory-muted hover:text-ivory focus-visible:ring-2 focus-visible:ring-jade rounded"
          >
            ← Elegir otro escenario
          </button>

          <div className="mt-4 rounded-2xl border border-obsidian-medium bg-obsidian-light p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-obsidian-medium pb-4">
              <p className="text-sm font-medium text-ivory-dim">{casoSeleccionado.pregunta}</p>
              <BadgeVerificacion nivel={casoSeleccionado.estadoVerificacion} />
            </div>

            <dl className="mt-5 space-y-5 text-sm">
              <Campo etiqueta="Materia" valor={casoSeleccionado.materia} />
              <Campo etiqueta="Cuestión jurídica" valor={casoSeleccionado.cuestionJuridica} />
              <Campo etiqueta="Análisis breve" valor={casoSeleccionado.analisisBreve} />
              <Campo etiqueta="Acción sugerida" valor={casoSeleccionado.accionSugerida} />
              <Campo etiqueta="Riesgo" valor={casoSeleccionado.riesgo} destacado="riesgo" />
              <Campo etiqueta="Fuente demostrativa" valor={casoSeleccionado.fuenteDemostrativa} />
            </dl>

            <p className="mt-6 rounded-lg bg-obsidian px-4 py-3 text-xs text-ivory-muted">
              Estado de verificación: <strong>{casoSeleccionado.estadoVerificacion}</strong> — en el producto real,
              contenido V3 se muestra siempre con advertencia explícita y V0–V2 nunca se usa como fundamento de una
              respuesta profesional.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/login" className="rounded-xl bg-jade-deep px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-jade/20 hover:bg-jade-dark focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian">
              Crear cuenta gratuita
            </Link>
            <Link href="/producto" className="rounded-xl border border-obsidian-medium px-6 py-3 text-center text-sm font-semibold text-ivory-dim hover:border-jade/40 hover:text-ivory focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian">
              Ver análisis profesional
            </Link>
            <Link href="/pricing" className="rounded-xl border border-obsidian-medium px-6 py-3 text-center text-sm font-semibold text-ivory-dim hover:border-jade/40 hover:text-ivory focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian">
              Explorar planes
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Campo({ etiqueta, valor, destacado }: { etiqueta: string; valor: string; destacado?: 'riesgo' }) {
  return (
    <div>
      <dt className={`font-semibold ${destacado === 'riesgo' ? 'text-gold-light' : 'text-jade-light'}`}>{etiqueta}</dt>
      <dd className="mt-1 text-ivory-dim">{valor}</dd>
    </div>
  );
}
