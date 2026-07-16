'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  tierActual: string; // el tier que el servidor ya calculó al renderizar
}

/**
 * Se muestra solo cuando PayPal redirige con ?pago=exitoso.
 *
 * Nunca afirma "pago exitoso" solo por el parámetro de la URL — PayPal
 * agrega ese parámetro al redirigir independientemente de si la
 * aprobación terminó de procesarse. Si el tier del servidor ya es de
 * pago, lo confirma directo. Si no, consulta /api/paypal/verificar-estado
 * (que a su vez pregunta a PayPal, no adivina) antes de decir cualquier
 * cosa al usuario.
 */
export default function EstadoPagoBanner({ tierActual }: Props) {
  const router = useRouter();
  const yaEsPago = tierActual === 'pro' || tierActual === 'academico';

  const [estado, setEstado] = useState<'confirmado' | 'verificando' | 'pendiente' | 'error'>(
    yaEsPago ? 'confirmado' : 'verificando'
  );

  useEffect(() => {
    if (yaEsPago) return;

    let cancelado = false;
    fetch('/api/paypal/verificar-estado', { method: 'POST' })
      .then((r) => r.json())
      .then((data: { estadoPaypal: string | null; sincronizado: boolean }) => {
        if (cancelado) return;
        if (data.sincronizado) {
          router.refresh(); // recarga con el tier ya actualizado
        } else if (data.estadoPaypal === 'APPROVAL_PENDING') {
          setEstado('pendiente');
        } else {
          setEstado('error');
        }
      })
      .catch(() => { if (!cancelado) setEstado('error'); });

    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (estado === 'confirmado') {
    return (
      <div className="glass-card border-jade/40 p-4 mb-6 flex items-center gap-3">
        <svg className="w-5 h-5 text-jade flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <div>
          <p className="text-jade font-semibold text-sm">¡Pago exitoso!</p>
          <p className="text-white/60 text-xs">Su plan ha sido activado. Disfrute las consultas ilimitadas.</p>
        </div>
      </div>
    );
  }

  if (estado === 'verificando') {
    return (
      <div className="glass-card border-gold/30 p-4 mb-6 flex items-center gap-3">
        <svg className="w-5 h-5 text-gold flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4V2m0 20v-2m8-8h2M2 12h2m13.657-5.657l1.414-1.414M4.929 19.071l1.414-1.414m0-11.314L4.929 4.929m14.142 14.142l-1.414-1.414" />
        </svg>
        <div>
          <p className="text-gold font-semibold text-sm">Confirmando su pago con PayPal…</p>
          <p className="text-white/60 text-xs">Esto toma unos segundos. No cierre esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card border-white/20 p-4 mb-6 flex items-start gap-3">
      <svg className="w-5 h-5 text-white/50 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
      <div>
        <p className="text-white/80 font-semibold text-sm">
          {estado === 'pendiente' ? 'Su pago aún no fue confirmado por PayPal' : 'No pudimos verificar el estado del pago'}
        </p>
        <p className="text-white/60 text-xs mt-1">
          {estado === 'pendiente'
            ? 'PayPal todavía no reporta la aprobación final. Si usted ya completó el proceso en PayPal, intente de nuevo en unos minutos o contáctenos si persiste.'
            : 'Recargue esta página en un momento. Si el problema continúa, contáctenos indicando su correo.'}
        </p>
      </div>
    </div>
  );
}
