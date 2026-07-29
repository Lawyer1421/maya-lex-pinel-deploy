const ETIQUETAS: Record<string, string> = {
  V0: 'Capturado',
  V1: 'Fuente identificada',
  V2: 'Integridad comprobada',
  V3: 'Vigencia analizada',
  V4: 'Revisión profesional',
  V5: 'Producción',
};

export default function BadgeVerificacion({ nivel }: { nivel: 'V0' | 'V1' | 'V2' | 'V3' | 'V4' | 'V5' }) {
  const esVerificado = nivel === 'V4' || nivel === 'V5';
  return (
    <span
      className={`mode-badge inline-flex items-center gap-1.5 ${
        esVerificado ? 'border-verify/40 bg-verify/10 text-verify-light' : 'border-gold/30 bg-gold/10 text-gold-light'
      }`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        {esVerificado ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M10.29 3.86 1.82 18a1.5 1.5 0 0 0 1.29 2.25h17.78A1.5 1.5 0 0 0 22.18 18L13.71 3.86a1.5 1.5 0 0 0-2.42 0Z" />
        )}
      </svg>
      {nivel} — {ETIQUETAS[nivel]}
    </span>
  );
}
