'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Autogestión de baja — reportado por un suscriptor que no encontraba una
 * opción visible para cancelar. Confirmación en dos pasos (nunca cancela
 * con un solo clic accidental). Llama a /api/paypal/cancel-subscription,
 * que detiene el cobro recurrente en PayPal y sincroniza el estado local
 * con la misma función atómica que ya usa el webhook.
 *
 * Importante: el acceso se revoca de inmediato al confirmar, no al final
 * del período ya pagado — ver la nota en la ruta del API para el porqué.
 */
export default function CancelarSuscripcionButton() {
  const router = useRouter();
  const [estado, setEstado] = useState<'idle' | 'confirmando' | 'cancelando' | 'error'>('idle');
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  async function confirmarCancelacion() {
    setEstado('cancelando');
    setMensajeError(null);
    try {
      const res = await fetch('/api/paypal/cancel-subscription', { method: 'POST' });
      const data = await res.json() as { cancelado?: boolean; error?: string };

      if (!res.ok || !data.cancelado) {
        setMensajeError(data.error ?? 'No pudimos procesar la cancelación. Intente de nuevo o contáctenos.');
        setEstado('error');
        return;
      }

      router.refresh();
    } catch {
      setMensajeError('No pudimos procesar la cancelación. Intente de nuevo o contáctenos.');
      setEstado('error');
    }
  }

  if (estado === 'confirmando') {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
        <p className="text-sm font-semibold text-white/90">¿Confirma que desea cancelar su suscripción?</p>
        <p className="mt-1 text-xs text-white/60">
          Se detiene el cobro automático de inmediato y su acceso al plan de pago finaliza en este momento.
          Esta acción no se puede deshacer desde aquí — tendría que suscribirse de nuevo.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={confirmarCancelacion}
            disabled={estado !== 'confirmando'}
            className="flex-1 rounded-lg bg-red-600/90 py-2 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
          >
            Sí, cancelar mi suscripción
          </button>
          <button
            onClick={() => setEstado('idle')}
            className="flex-1 rounded-lg border border-white/15 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/5"
          >
            No, mantener mi plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-2">
      <button
        onClick={() => setEstado('confirmando')}
        disabled={estado === 'cancelando'}
        className="w-full text-center text-xs text-white/40 transition-colors hover:text-red-400 disabled:opacity-60"
      >
        {estado === 'cancelando' ? 'Cancelando…' : 'Cancelar suscripción'}
      </button>
      {estado === 'error' && (
        <p className="mt-2 text-center text-xs text-red-400">{mensajeError}</p>
      )}
    </div>
  );
}
