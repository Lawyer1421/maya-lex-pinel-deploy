'use client';

interface BankTransferModalProps {
  open: boolean;
  onClose: () => void;
}

export default function BankTransferModal({ open, onClose }: BankTransferModalProps) {
  if (!open) {
    return null;
  }

  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '+50499999999';
  const message = encodeURIComponent('Hola, deseo enviar comprobante de transferencia bancaria para Maya Lex IA.');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-gold/20 bg-navy p-6 shadow-2xl shadow-black/30">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-gold">Pago por transferencia</p>
            <h3 className="font-serif text-xl font-semibold text-white">Depósito bancario directo</h3>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white">✕</button>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          <p className="mb-2"><span className="font-semibold text-white">Banco:</span> BAC / Ficohsa</p>
          <p className="mb-2"><span className="font-semibold text-white">Cuenta:</span> 01-234-567890</p>
          <p className="mb-2"><span className="font-semibold text-white">Titular:</span> Maya Lex IA Pinel HN</p>
          <p><span className="font-semibold text-white">Referencia:</span> Envíe su nombre de organización y plan.</p>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <a
            href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${message}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-xl bg-green-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-green-500"
          >
            Enviar comprobante por WhatsApp
          </a>
          <button onClick={onClose} className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/70 transition hover:bg-white/5">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
