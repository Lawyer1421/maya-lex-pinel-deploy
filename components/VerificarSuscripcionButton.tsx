'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  userEmail: string;
}

/**
 * Acción persistente en Mi Cuenta ("Ya pagué — verificar mi suscripción"),
 * disponible en todo momento — no solo cuando PayPal acaba de redirigir
 * con ?pago=exitoso. Cubre el caso de un cliente que pagó, cerró la
 * pestaña antes de volver, y entra a Mi Cuenta directamente más tarde.
 */
export default function VerificarSuscripcionButton({ userEmail }: Props) {
  const router = useRouter();
  const [estado, setEstado] = useState<'idle' | 'verificando' | 'ok' | 'pendiente' | 'error' | 'limitado'>('idle');
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function verificar() {
    setEstado('verificando');
    setReferenceId(null);
    setMensaje(null);

    let subscriptionId: string | undefined;
    try {
      subscriptionId = window.localStorage.getItem(`mlx_pending_sub_${userEmail}`) ?? undefined;
    } catch {
      // no-op
    }

    try {
      const res = await fetch('/api/paypal/verificar-estado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscriptionId ? { subscriptionId } : {}),
      });

      if (res.status === 429) {
        setEstado('limitado');
        return;
      }

      const data = await res.json() as {
        estadoPaypal: string | null;
        sincronizado: boolean;
        referenceId?: string;
        mensaje?: string;
      };

      if (data.sincronizado) {
        try { window.localStorage.removeItem(`mlx_pending_sub_${userEmail}`); } catch { /* no-op */ }
        setEstado('ok');
        router.refresh();
        return;
      }

      if (data.estadoPaypal === 'APPROVAL_PENDING') {
        setEstado('pendiente');
        return;
      }

      if (data.referenceId) setReferenceId(data.referenceId);
      if (data.mensaje) setMensaje(data.mensaje);
      setEstado('error');
    } catch {
      setEstado('error');
    }
  }

  return (
    <div className="pt-2">
      <button
        onClick={verificar}
        disabled={estado === 'verificando'}
        className="w-full btn-ghost text-sm text-center py-2.5 disabled:opacity-60"
      >
        {estado === 'verificando' ? 'Verificando…' : 'Ya pagué — verificar mi suscripción'}
      </button>
      {estado === 'ok' && (
        <p className="text-jade text-xs mt-2 text-center">Suscripción confirmada.</p>
      )}
      {estado === 'pendiente' && (
        <p className="text-gold text-xs mt-2 text-center">
          PayPal aún no reporta la aprobación final. Intente de nuevo en unos minutos.
        </p>
      )}
      {estado === 'limitado' && (
        <p className="text-white/50 text-xs mt-2 text-center">Espere unos segundos antes de reintentar.</p>
      )}
      {estado === 'error' && (
        <p className="text-white/60 text-xs mt-2 text-center">
          {mensaje ?? 'No pudimos confirmar su pago. Contáctenos indicando su correo.'}
          {referenceId && (
            <> Código de referencia: <span className="font-mono text-white/80">{referenceId}</span></>
          )}
        </p>
      )}
    </div>
  );
}
