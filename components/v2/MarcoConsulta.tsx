import BadgeVerificacion from './BadgeVerificacion';

/**
 * Escaparate del producto en el hero: una cita verificada + la regla
 * fail-closed. No usa el expediente (flag OFF) ni un vacío del corpus
 * como primer mensaje — eso se documenta en /cobertura-juridica.
 */
export default function MarcoConsulta() {
  return (
    <aside
      className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-obsidian-light shadow-[0_24px_80px_-32px_rgba(0,0,0,0.85)]"
      aria-label="Ejemplo de consulta en Maya Lex"
    >
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
        <span className="h-2 w-2 rounded-full bg-white/15" aria-hidden="true" />
        <span className="h-2 w-2 rounded-full bg-white/15" aria-hidden="true" />
        <span className="h-2 w-2 rounded-full bg-white/15" aria-hidden="true" />
        <span className="ml-2 text-[11px] uppercase tracking-[0.18em] text-ivory-muted">
          Análisis · Honduras
        </span>
      </div>
      <div className="space-y-4 px-5 py-5 sm:px-6">
        <p className="text-sm text-ivory-dim">
          «¿Qué dispone el Código Penal hondureño sobre el robo?»
        </p>
        <div className="rounded-xl border border-white/[0.06] bg-obsidian/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-light">
              Materia · Penal
            </p>
            <BadgeVerificacion nivel="V4" />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ivory">
            Cita el artículo del corpus con estado de verificación visible.
            Si el número no está, no lo inventa: se abstiene.
          </p>
        </div>
        <p className="text-xs leading-relaxed text-ivory-muted">
          Ilustración de formato. La norma aplicable se confirma en la consulta real.
        </p>
      </div>
    </aside>
  );
}
