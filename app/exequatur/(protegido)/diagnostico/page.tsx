/**
 * app/exequatur/diagnostico/page.tsx — Colocación (Slice 3).
 * Hija de app/exequatur/layout.tsx. No cita texto legal.
 */
import Link from 'next/link';
import type { Metadata } from 'next';
import { BANCO_DIAGNOSTICO_EXEQUATUR } from '@/lib/exequatur/diagnostico/banco';
import { localizarObjetivo } from '@/lib/exequatur/curriculum/localizar';
import { enviarDiagnostico } from './actions';

export const metadata: Metadata = {
  title: 'Diagnóstico · Exequátur · MAYA LEX IA PINEL HN',
};

export default function DiagnosticoPage() {
  return (
    <main className="min-h-screen bg-navy pt-12 pb-20 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/exequatur" className="text-white/40 hover:text-white/60 text-sm mb-6 inline-block">
          ← Exequátur
        </Link>
        <h1 className="font-serif text-3xl font-bold text-gradient-maya mb-2">
          {BANCO_DIAGNOSTICO_EXEQUATUR.titulo}
        </h1>
        <p className="text-white/50 text-sm mb-8">
          Ítems de colocación sobre los objetivos del currículo. El texto legal
          se verifica en cada lección, no aquí. Una pregunta sin respuesta se
          trata como pendiente.
        </p>

        <form action={enviarDiagnostico} className="space-y-5">
          {BANCO_DIAGNOSTICO_EXEQUATUR.items.map((item, indice) => {
            const localizado = localizarObjetivo(item.objetivoId);
            return (
              <fieldset key={item.id} className="glass-card p-5">
                <legend className="text-white font-semibold mb-3">
                  {indice + 1}. {item.enunciado}
                </legend>
                {localizado && (
                  <p className="text-white/30 text-[11px] mb-3">
                    Objetivo: {localizado.objetivo.descripcion}
                    {localizado.objetivo.referencias[0] && (
                      <>
                        {' · '}
                        {localizado.objetivo.referencias[0].instrumento} art.{' '}
                        {localizado.objetivo.referencias[0].articulo}
                      </>
                    )}
                  </p>
                )}
                <div className="space-y-2">
                  {item.opciones.map((opcion) => (
                    <label key={opcion.id} className="flex items-start gap-3 text-white/80 text-sm">
                      <input
                        type="radio"
                        name={`item:${item.id}`}
                        value={opcion.id}
                        className="mt-1"
                      />
                      <span>{opcion.texto}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          })}

          <button type="submit" className="btn-jade inline-block text-sm py-2 px-4">
            Ver plan de estudio →
          </button>
        </form>
      </div>
    </main>
  );
}
