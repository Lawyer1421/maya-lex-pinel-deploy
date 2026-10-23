import type { AnswerPanelModel } from '@/lib/legal-os/ux/source-cards';
import { SourceCard } from './SourceCard';

/** Panel «por qué respondió»: no repite el texto de la respuesta (ya está en la burbuja); muestra las secciones con contenido. */
export function AnswerPanel({ modelo }: { modelo: AnswerPanelModel }) {
  const visible = (id: string): boolean => modelo.secciones.find((s) => s.id === id)?.vacio === false;
  return (
    <section aria-label="Por qué respondió Maya Lex" className="mt-2 space-y-3 text-xs text-white/70">
      {visible('LEGAL_BASIS') && (
        <div>
          <h3 className="text-white/80 font-semibold mb-1">Fundamento legal</h3>
          <div className="space-y-1.5">
            {modelo.legalBasis.map((t) => (
              <SourceCard key={t.id} tarjeta={t} />
            ))}
          </div>
        </div>
      )}
      {visible('VALIDITY_VERSION') && (
        <div>
          <h3 className="text-white/80 font-semibold mb-1">Vigencia y versión</h3>
          <ul className="list-disc pl-4">
            {modelo.validityVersion.map((v) => (
              <li key={v.id}>
                {v.titulo}: {v.validityLabel} · {v.versionLabel}
              </li>
            ))}
          </ul>
        </div>
      )}
      {visible('WARNINGS') && (
        <div role="note">
          <h3 className="text-amber-200 font-semibold mb-1">Advertencias</h3>
          <ul className="list-disc pl-4 text-amber-200/90">
            {modelo.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      {visible('RELATED_LAW') && (
        <div>
          <h3 className="text-white/80 font-semibold mb-1">Normativa relacionada</h3>
          <div className="space-y-1.5">
            {modelo.relatedLaw.map((t) => (
              <SourceCard key={t.id} tarjeta={t} />
            ))}
          </div>
        </div>
      )}
      <p className="text-white/40">{modelo.deepAnalysis.etiqueta}</p>
    </section>
  );
}
