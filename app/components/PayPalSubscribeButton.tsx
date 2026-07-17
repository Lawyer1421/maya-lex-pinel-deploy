'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

interface Props {
  plan: 'pro' | 'academico';
  label: string;
  className?: string;
}

export default function PayPalSubscribeButton({ plan, label, className }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      // 1. Exigir sesión: la suscripción DEBE quedar ligada al correo del
      //    cliente (identidad estable), nunca a su IP del momento.
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = '/login?next=/pricing';
        return;
      }

      // 2. Crear la suscripción con el token de sesión — el servidor lo
      //    verifica y empaqueta email:{correo} en el custom_id de PayPal.
      const res = await fetch('/api/paypal/create-subscription', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan, email: session.user.email }),
      });
      const data = await res.json() as {
        approvalUrl?: string;
        subscriptionId?: string;
        error?: string;
        loginUrl?: string;
        code?: string;
        accountUrl?: string;
      };

      if (res.status === 401 && data.loginUrl) {
        window.location.href = data.loginUrl;
        return;
      }
      if (res.status === 409) {
        // Ya activo o intento reciente pendiente — nunca reintentar el pago,
        // mandar a Mi Cuenta a verificar/gestionar en vez de cobrar de nuevo.
        setError(data.error ?? 'Ya existe una suscripción para su cuenta.');
        setLoading(false);
        if (data.accountUrl) {
          window.location.href = data.accountUrl;
        }
        return;
      }
      if (!res.ok || !data.approvalUrl) {
        throw new Error(data.error ?? 'Error al crear suscripción PayPal');
      }

      // Guarda el checkout exacto que se va a intentar — /cuenta lo usa para
      // verificar ESA suscripción puntual al volver, no "la última que haya"
      // en la base de datos (que pudo cambiar si hubo otro intento).
      if (data.subscriptionId) {
        try {
          window.localStorage.setItem(`mlx_pending_sub_${session.user.email}`, data.subscriptionId);
        } catch {
          // localStorage no disponible (modo privado, etc.) — no bloquea el pago
        }
      }

      window.location.href = data.approvalUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`w-full text-center py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${className ?? ''}`}
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Redirigiendo a PayPal…
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="currentColor">
              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z" />
            </svg>
            {label}
          </>
        )}
      </button>
      {error && (
        <p className="text-red-400 text-xs mt-2 text-center">{error}</p>
      )}
    </div>
  );
}
