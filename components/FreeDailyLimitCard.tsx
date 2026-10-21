'use client';

import Link from 'next/link';
import PayPalSubscribeButton from '@/app/components/PayPalSubscribeButton';
import { FREE_DAILY_LIMIT_COPY } from '@/lib/free-daily-limit-ui';

interface Props {
  resetAt?: string;
  isAnonymous: boolean;
}

export default function FreeDailyLimitCard({ resetAt, isAnonymous }: Props) {
  const horaReinicio = resetAt
    ? new Date(resetAt).toLocaleString('es-HN', {
        timeZone: 'America/Tegucigalpa',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <section
      className="max-w-2xl mx-auto glass-card border border-gold/30 rounded-xl p-5 text-sm"
      data-testid="free-daily-limit-card"
    >
      <h2 className="text-lg font-semibold text-gold mb-1">
        {FREE_DAILY_LIMIT_COPY.titulo}
      </h2>
      <p className="text-white/70 mb-4">
        {FREE_DAILY_LIMIT_COPY.reinicio}
        {horaReinicio ? ` · se reinicia a las ${horaReinicio} (hora de Honduras).` : ''}
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        {FREE_DAILY_LIMIT_COPY.planes.map((plan) => (
          <PayPalSubscribeButton
            key={plan.id}
            plan={plan.paypalTier}
            label={`${plan.label} (${plan.precio})`}
            className="flex-1 rounded-xl bg-jade px-4 py-2.5 text-sm font-semibold text-white hover:bg-jade-light"
          />
        ))}
      </div>
      {isAnonymous && (
        <Link
          href={FREE_DAILY_LIMIT_COPY.crearCuentaHref}
          className="mt-3 inline-block text-sm text-gold hover:underline"
        >
          {FREE_DAILY_LIMIT_COPY.crearCuenta}
        </Link>
      )}
    </section>
  );
}
