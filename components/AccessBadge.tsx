'use client';

import { useEffect, useState } from 'react';

interface AccessInfo {
  accessGranted: boolean;
  accessLabel: string;
  verificationPending: boolean;
  activeUntil: string | null;
}

/**
 * Badge reutilizable de estado de acceso — encabezado, Mi Cuenta, área
 * de consultas y facturación deben usar el MISMO componente para nunca
 * mostrar decisiones contradictorias entre sí.
 *
 * El badge NUNCA concede permisos por sí mismo — solo refleja lo que
 * GET /api/me/access (siempre re-consultado en el servidor) devuelve.
 * No confía en localStorage ni en parámetros de la URL.
 */
export default function AccessBadge({ compact = false }: { compact?: boolean }) {
  const [info, setInfo] = useState<AccessInfo | null>(null);

  useEffect(() => {
    let cancelado = false;
    fetch('/api/me/access')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelado) setInfo(data); })
      .catch(() => { /* silencioso: el badge simplemente no se muestra */ });
    return () => { cancelado = true; };
  }, []);

  if (!info) return null;

  const label = info.accessLabel;
  const colorClass = info.verificationPending
    ? 'bg-gold/20 text-gold border-gold/30'
    : info.accessGranted
      ? 'bg-gradient-maya text-white border-transparent'
      : 'bg-white/10 text-white/60 border-white/20';

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${colorClass} ${compact ? '' : 'py-1.5'}`}>
      {label}
      {info.activeUntil && (
        <span className="opacity-70 font-normal">
          {' '}hasta {new Date(info.activeUntil).toLocaleDateString('es-HN', { day: 'numeric', month: 'short' })}
        </span>
      )}
    </span>
  );
}
