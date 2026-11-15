'use client';

import { useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

interface Props {
  plan: 'pro' | 'academico';
  label: string;
  className?: string;
}

/** Mensaje genérico — nunca se muestran payloads, tokens ni detalles internos del backend. */
export const MENSAJE_ERROR_TARJETA = 'No pudimos iniciar el pago con tarjeta. Intenta de nuevo en unos segundos o contáctanos si el problema persiste.';

/** Sin reanudación automática tras el login (a diferencia de PayPal): el usuario vuelve a /pricing y elige el método de pago otra vez. */
export const URL_LOGIN_TARJETA = `/login?next=${encodeURIComponent('/pricing')}`;

export type DestinoCheckout =
  | { tipo: 'redirigir'; url: string }
  | { tipo: 'error'; mensaje: string; irA?: string };

/**
 * Decide qué hacer con la respuesta de /api/stripe/checkout. Exportada para prueba unitaria.
 * Solo se redirige a una URL https de checkout.stripe.com: nunca a una URL arbitraria devuelta por la red.
 */
export function decidirDestinoCheckout(status: number, data: { url?: string; error?: string; code?: string; loginUrl?: string }): DestinoCheckout {
  if (status === 401) return { tipo: 'redirigir', url: URL_LOGIN_TARJETA };
  if (status === 409) {
    return {
      tipo: 'error',
      mensaje: data.error ?? 'Ya existe una suscripción para su cuenta.',
      ...(data.code === 'ALREADY_SUBSCRIBED' ? { irA: '/cuenta' } : {}),
    };
  }
  if (status >= 200 && status < 300 && typeof data.url === 'string') {
    try {
      const u = new URL(data.url);
      if (u.protocol === 'https:' && u.hostname === 'checkout.stripe.com') return { tipo: 'redirigir', url: u.toString() };
    } catch {
      // URL inválida: cae al error genérico
    }
  }
  return { tipo: 'error', mensaje: status === 400 && data.error ? data.error : MENSAJE_ERROR_TARJETA };
}

/**
 * Botón «Pagar con tarjeta» (Stripe Checkout). Solo se renderiza cuando el servidor tiene Stripe habilitado y un precio para el plan
 * (lib/billing/tarjeta.ts). La identidad la verifica el servidor con el token de sesión; el cuerpo solo lleva el plan.
 */
export default function StripeCheckoutButton({ plan, label, className }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Candado síncrono contra doble clic (mismo motivo que en PayPalSubscribeButton).
  const enVueloRef = useRef(false);

  async function handleClick() {
    if (enVueloRef.current) return;
    enVueloRef.current = true;
    setLoading(true);
    setError(null);
    const liberar = () => {
      setLoading(false);
      enVueloRef.current = false;
    };
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = URL_LOGIN_TARJETA;
        return;
      }
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string; code?: string };
      const destino = decidirDestinoCheckout(res.status, data);
      if (destino.tipo === 'redirigir') {
        window.location.href = destino.url;
        return;
      }
      setError(destino.mensaje);
      liberar();
      if (destino.irA) window.location.href = destino.irA;
    } catch (err) {
      console.error('[StripeCheckoutButton]', err instanceof Error ? err.message : err);
      setError(MENSAJE_ERROR_TARJETA);
      liberar();
    }
  }

  return (
    <div className="w-full">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`w-full text-center py-3 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${className ?? ''}`}
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Redirigiendo al pago seguro…
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
            </svg>
            {label}
          </>
        )}
      </button>
      {error && <p className="text-red-400 text-xs mt-2 text-center">{error}</p>}
    </div>
  );
}
