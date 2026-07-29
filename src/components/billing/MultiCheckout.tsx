'use client';

import { useMemo, useState } from 'react';
import BankTransferModal from '@/src/components/billing/BankTransferModal';

interface MultiCheckoutProps {
  plan: 'pro' | 'academico';
}

export default function MultiCheckout({ plan }: MultiCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBankModal, setShowBankModal] = useState(false);

  const planMeta = useMemo(() => {
    if (plan === 'academico') {
      return { label: 'Académico', amount: 222, currency: 'HNL' };
    }
    return { label: 'Profesional', amount: 370, currency: 'HNL' };
  }, [plan]);

  async function handlePixelPay() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/billing/pixelpay/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, amount: planMeta.amount, currency: planMeta.currency, organizationId: 'demo-org' }),
      });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? 'No fue posible abrir el gateway PixelPay');
      }
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
      setLoading(false);
    }
  }

  function handleBankTransfer() {
    setShowBankModal(true);
  }

  return (
    <div className="rounded-2xl border border-jade/20 bg-navy-light/40 p-6 shadow-2xl shadow-jade/10">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-gold">Checkout multiproveedor</p>
          <h2 className="font-serif text-2xl font-semibold text-white">Pago B2B · {planMeta.label}</h2>
          <p className="text-sm text-white/60">Elige la vía de pago más conveniente para tu organización.</p>
        </div>
        <div className="rounded-full border border-jade/30 px-3 py-1 text-sm text-jade">{planMeta.amount} {planMeta.currency}</div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <button onClick={handlePixelPay} disabled={loading} className="rounded-xl bg-jade px-4 py-3 text-sm font-semibold text-white transition hover:bg-jade/90 disabled:opacity-60">
          {loading ? 'Redirigiendo…' : 'Tarjeta Local Directa (PixelPay)'}
        </button>
        <a href="https://www.paypal.com" target="_blank" rel="noreferrer" className="rounded-xl border border-blue-500/30 bg-blue-600/10 px-4 py-3 text-center text-sm font-semibold text-blue-200 transition hover:bg-blue-600/20">
          PayPal Express
        </a>
        <button onClick={handleBankTransfer} className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm font-semibold text-gold transition hover:bg-gold/20">
          Transferencia Bancaria Local
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <BankTransferModal open={showBankModal} onClose={() => setShowBankModal(false)} />
    </div>
  );
}
