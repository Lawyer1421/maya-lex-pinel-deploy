/**
 * app/exequatur/diagnostico-demo/page.tsx — Diagnóstico de Colocación DEMO.
 *
 * Pública a propósito: es el CTA "prueba de valor" de la Landing de oferta
 * (components/v2/exequatur/OfertaExequatur.tsx), fuera del route group
 * app/exequatur/(protegido) y por lo tanto sin el gate de sesión/suscripción
 * -- no requiere login ni plan Premium. Usa el mismo banco de reactivos que
 * el diagnóstico real (lib/exequatur/diagnostico/banco.ts) pero no persiste
 * nada: el resultado se muestra en memoria vía query string (aciertos/total)
 * y termina en un CTA hacia la suscripción, nunca hacia /exequatur/plan
 * (contenido de pago).
 */
import Link from 'next/link';
import type { Metadata } from 'next';
import { BANCO_DIAGNOSTICO_EXEQUATUR } from '@/lib/exequatur/diagnostico/banco';
import { evaluarDiagnosticoDemo } from './actions';

export const metadata: Metadata = {
  title: 'Diagnóstico de demostración · Exequátur · MAYA LEX IA PINEL HN',
};

function parsearEntero(valor: string | undefined): number | null {
  if (!valor) return null;
  const n = Number.parseInt(valor, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export default async function DiagnosticoDemoPage({
  searchParams,
}: {
  searchParams: Promise<{ aciertos?: string; total?: string }>;
}) {
  const params = await searchParams;
  const aciertos = parsearEntero(params.aciertos);
  const totalDelBanco = BANCO_DIAGNOSTICO_EXEQUATUR.items.length;
  const total = parsearEntero(params.total);
  const mostrarResultado = aciertos !== null && total === totalDelBanco;

  return (
    <main className="min-h-screen bg-obsidian px-4 pb-20 pt-16 text-ivory sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/exequatur" className="mb-6 inline-block text-sm text-ivory-muted hover:text-ivory">
          ← Exequátur
        </Link>
        <span className="mode-badge border-gold/30 bg-gold/10 text-gold-light">Demostración gratuita</span>

        {mostrarResultado ? (
          <>
            <h1 className="mt-4 font-serif text-3xl font-bold text-ivory">Su resultado de colocación</h1>
            <p className="mb-8 mt-3 text-ivory-dim">
              Respondió correctamente <strong className="text-ivory">{aciertos}</strong> de{' '}
              <strong className="text-ivory">{total}</strong> reactivos de muestra. El Plan Notarial completo
              incluye los {`${totalDelBanco}+`} reactivos auditados contra el corpus legislativo hondureño vigente,
              organizados en los 4 ejes formativos, con simulador cronometrado y plan de estudio personalizado.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/pricing?plan=pro"
                className="rounded-xl bg-jade-deep px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-jade/20 transition hover:bg-jade-dark"
              >
                Suscribirme al Plan Notarial — $15/mes
              </Link>
              <Link
                href="/exequatur/diagnostico-demo"
                className="rounded-xl border border-obsidian-medium px-6 py-3 text-sm font-semibold text-ivory-dim transition hover:border-jade/40 hover:text-ivory"
              >
                Repetir demostración
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-4 font-serif text-3xl font-bold text-ivory">{BANCO_DIAGNOSTICO_EXEQUATUR.titulo}</h1>
            <p className="mb-8 mt-3 text-ivory-dim">
              Una muestra de {totalDelBanco} reactivos del banco real de Exequátur, sin necesidad de crear cuenta ni
              suscribirse. El resultado no se guarda -- es solo una prueba de valor del programa completo.
            </p>

            <form action={evaluarDiagnosticoDemo} className="space-y-5">
              {BANCO_DIAGNOSTICO_EXEQUATUR.items.map((item, indice) => (
                <fieldset
                  key={item.id}
                  className="rounded-2xl border border-obsidian-medium bg-obsidian-light p-5"
                >
                  <legend className="mb-3 font-semibold text-ivory">
                    {indice + 1}. {item.enunciado}
                  </legend>
                  <div className="space-y-2">
                    {item.opciones.map((opcion) => (
                      <label key={opcion.id} className="flex items-start gap-3 text-sm text-ivory-dim">
                        <input type="radio" name={`item:${item.id}`} value={opcion.id} className="mt-1" />
                        <span>{opcion.texto}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}

              <button
                type="submit"
                className="rounded-xl bg-jade-deep px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-jade/20 transition hover:bg-jade-dark"
              >
                Ver mi resultado →
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
