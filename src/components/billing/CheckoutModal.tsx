'use client';

import { useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import PayPalSubscribeButton from '@/app/components/PayPalSubscribeButton';

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  plan: 'pro' | 'academico';
}

type PaymentTab = 'card' | 'paypal' | 'transfer';

export default function CheckoutModal({ open, onClose, plan }: CheckoutModalProps) {
  const [activeTab, setActiveTab] = useState<PaymentTab>('card');
  const [transferNote, setTransferNote] = useState('');
  const [submittingTransfer, setSubmittingTransfer] = useState(false);
  const [transferMessage, setTransferMessage] = useState<string | null>(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const planMeta = useMemo(() => {
    if (plan === 'academico') {
      return { label: 'Académico', amount: 222, currency: 'HNL' };
    }
    return { label: 'Profesional', amount: 370, currency: 'HNL' };
  }, [plan]);

  async function handleDirectCard() {
    setCardLoading(true);
    setCardError(null);
    try {
      const response = await fetch('/api/v1/billing/pixelpay/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, amount: planMeta.amount, currency: planMeta.currency, organizationId: 'org-demo' }),
      });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? 'No fue posible abrir el conector PixelPay');
      }
      window.location.assign(data.url);
    } catch (error) {
      setCardLoading(false);
      setCardError(error instanceof Error ? error.message : 'Error inesperado');
    }
  }

  async function handleTransferSubmit() {
    setSubmittingTransfer(true);
    setTransferMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Debe iniciar sesión para notificar la transferencia.');
      }

      const response = await fetch('/api/billing/manual-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          plan,
          amount: planMeta.amount,
          currency: planMeta.currency,
          note: transferNote || 'Sin observaciones adicionales.',
        }),
      });
      const data = await response.json() as { message?: string; error?: string; orderId?: string };
      if (!response.ok) {
        throw new Error(data.error ?? 'No fue posible registrar su transferencia.');
      }
      setTransferMessage(data.message ?? `Solicitud registrada correctamente (${data.orderId ?? 'sin número'}).`);
      setTransferNote('');
    } catch (error) {
      setTransferMessage(error instanceof Error ? error.message : 'Error inesperado');
    } finally {
      setSubmittingTransfer(false);
    }
  }

  const tabs: Array<{ key: PaymentTab; label: string }> = [
    { key: 'card', label: 'Tarjeta Directa' },
    { key: 'paypal', label: 'PayPal / Internacional' },
    { key: 'transfer', label: 'Transferencia Local' },
  ];

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-navy-light/95 p-4 shadow-2xl shadow-black/30 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-gold">Checkout multiproveedor</p>
            <h3 className="font-serif text-xl font-semibold text-white">Pago seguro para organizaciones</h3>
            <p className="mt-1 text-sm text-white/60">Elige una vía compatible con tu operación y con el entorno local de Honduras.</p>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/10 p-2 text-white/60 transition hover:bg-white/5 hover:text-white">✕</button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-3 py-2 text-sm font-medium transition ${activeTab === tab.key ? 'bg-jade text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          {activeTab === 'card' && (
            <div className="space-y-3">
              <p className="text-sm text-white/70">Procesa cargos rápidos en HNL o USD con el conector PixelPay, listo para integrar con la API de pagos del proveedor.</p>
              <div className="rounded-xl border border-jade/20 bg-jade/10 p-3 text-sm text-white/80">
                <p className="font-semibold text-jade">Plan {planMeta.label}</p>
                <p className="mt-1">Monto: {planMeta.amount} {planMeta.currency}</p>
              </div>
              <button onClick={handleDirectCard} disabled={cardLoading} className="w-full rounded-xl bg-jade px-4 py-3 text-sm font-semibold text-white transition hover:bg-jade/90 disabled:opacity-60">
                {cardLoading ? 'Redirigiendo al gateway…' : 'Continuar con tarjeta directa (PixelPay)'}
              </button>
              {cardError && <p className="text-sm text-red-400">{cardError}</p>}
            </div>
          )}

          {activeTab === 'paypal' && (
            <div className="space-y-3">
              <p className="text-sm text-white/70">Utiliza el flujo de PayPal optimizado para guest checkout con compatibilidad internacional.</p>
              <div className="rounded-xl border border-blue-500/20 bg-blue-600/10 p-3 text-sm text-blue-100">
                <p className="font-semibold">Pago internacional</p>
                <p className="mt-1">Vincula la sesión del usuario y continua con la suscripción de forma segura.</p>
              </div>
              <PayPalSubscribeButton plan={plan} label="Continuar con PayPal" className="rounded-xl bg-blue-600 text-white" />
            </div>
          )}

          {activeTab === 'transfer' && (
            <div className="space-y-4">
              <p className="text-sm text-white/70">Para pagos por depósito o transferencia directa en Honduras, registra la notificación y nuestro equipo verifica el comprobante.</p>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">
                  <p className="font-semibold text-white">Ficohsa</p>
                  <p>Cuenta: 01-234-567890</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">
                  <p className="font-semibold text-white">BAC</p>
                  <p>Cuenta: 02-345-678901</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">
                  <p className="font-semibold text-white">Atlántida</p>
                  <p>Cuenta: 03-456-789012</p>
                </div>
              </div>

              <label className="block text-sm text-white/70">
                <span className="mb-1 block text-xs uppercase tracking-[0.3em] text-white/40">Referencia / comprobante</span>
                <textarea
                  value={transferNote}
                  onChange={(event) => setTransferNote(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-navy px-3 py-2 text-sm text-white outline-none ring-0"
                  placeholder="Indique número de referencia, banco y datos del comprobante."
                />
              </label>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button onClick={handleTransferSubmit} disabled={submittingTransfer} className="rounded-xl bg-gold px-4 py-3 text-sm font-semibold text-navy transition hover:bg-gold/90 disabled:opacity-60">
                  {submittingTransfer ? 'Registrando…' : 'Notificar por transferencia'}
                </button>
                <a href={`https://wa.me/${(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '+50499999999').replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Hola, deseo notificar un pago por transferencia para Maya Lex IA.')}`} target="_blank" rel="noreferrer" className="rounded-xl border border-green-500/30 bg-green-600/10 px-4 py-3 text-center text-sm font-semibold text-green-200 transition hover:bg-green-600/20">
                  Notificar por WhatsApp
                </a>
              </div>

              {transferMessage && <p className="text-sm text-jade">{transferMessage}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
