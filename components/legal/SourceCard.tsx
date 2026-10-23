import type { SourceCard as TarjetaFuente } from '@/lib/legal-os/ux/source-cards';

const COLOR: Record<TarjetaFuente['validity'], string> = {
  VERIFICADA: 'bg-jade/15 text-jade',
  PRESUMIDA: 'bg-amber-500/15 text-amber-200',
  NO_VIGENTE: 'bg-red-500/15 text-red-300',
  NO_VERIFICADA: 'bg-amber-500/15 text-amber-200',
  DOCTRINAL: 'bg-white/10 text-white/70',
};
const TIPO: Record<TarjetaFuente['kind'], string> = { LAW: 'Ley', ARTICLE: 'Artículo', GACETA: 'Gaceta', JUDGMENT: 'Sentencia' };

/** Tarjeta de fuente. Presentacional: sin estado de servidor ni red. El enlace solo aparece si la URL es oficial verificada. */
export function SourceCard({ tarjeta }: { tarjeta: TarjetaFuente }) {
  return (
    <details className="glass-card px-3 py-2 text-xs group">
      <summary className="cursor-pointer flex flex-wrap items-center gap-2 text-white/70 select-none rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade">
        <span className="text-white/40">{TIPO[tarjeta.kind]}</span>
        <span className="text-jade font-semibold">{tarjeta.title}</span>
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${COLOR[tarjeta.validity]}`}>{tarjeta.validityLabel}</span>
        <span className="text-white/50">{tarjeta.versionLabel}</span>
        {tarjeta.hash && <span className="ml-auto text-white/25 font-mono">#{tarjeta.hash}</span>}
      </summary>
      {tarjeta.excerpt && <p className="text-white/60 mt-2 leading-relaxed whitespace-pre-wrap">{tarjeta.excerpt}</p>}
      {tarjeta.warnings.length > 0 && (
        <ul className="mt-2 list-disc pl-4 text-amber-200/90" aria-label="Advertencias de la fuente">
          {tarjeta.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      {tarjeta.officialUrl && (
        <a
          href={tarjeta.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-jade underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian"
        >
          Ver en la fuente oficial (nivel {tarjeta.tier})
        </a>
      )}
    </details>
  );
}
