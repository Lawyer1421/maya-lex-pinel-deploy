import type { PlanV2 } from './planes-data';
import PayPalSubscribeButton from '@/app/components/PayPalSubscribeButton';

export default function TarjetaPlan({
  plan,
  compacta = false,
  // Nivel del encabezado del plan según la jerarquía de la página anfitriona:
  // en la portada las tarjetas viven bajo un h2 de sección (→ h3); en /pricing
  // cuelgan directamente del h1 (→ h2, evita saltos h1→h3 en el outline).
  nivelTitulo = 'h3',
}: {
  plan: PlanV2;
  compacta?: boolean;
  nivelTitulo?: 'h2' | 'h3';
}) {
  const Titulo = nivelTitulo;
  return (
    <div
      className={`flex h-full flex-col rounded-2xl border bg-obsidian-light p-6 ${
        plan.destacado ? 'border-2 border-jade shadow-xl shadow-jade/10' : 'border-obsidian-medium'
      }`}
    >
      {plan.destacado && (
        <span className="mb-3 inline-block w-fit rounded-full bg-jade/15 px-3 py-1 text-xs font-semibold text-jade-light">
          Más elegido
        </span>
      )}
      <Titulo className="font-serif text-xl font-bold text-ivory">{plan.nombre}</Titulo>
      <p className="mt-1 text-sm text-ivory-muted">{plan.descripcion}</p>
      {/* Valores largos no numéricos ("Personalizado") reducen un paso el
          tamaño tipográfico en las tarjetas angostas de la grilla de 5
          columnas (lg) — legible siempre, sin desbordar el borde de la
          tarjeta. min-w-0 permite que el flex encoja en vez de desbordar. */}
      <p className="mt-4 flex min-w-0 flex-wrap items-baseline gap-1">
        <span
          className={`font-serif font-bold text-ivory ${
            plan.precio.length > 8 ? 'text-3xl lg:text-xl' : 'text-3xl'
          }`}
        >
          {plan.precio}
        </span>
        {plan.periodo && <span className="text-sm text-ivory-muted">{plan.periodo}</span>}
      </p>

      {!compacta && (
        <ul className="mt-5 flex-1 space-y-2.5">
          {plan.caracteristicas.map((c) => (
            <li key={c} className="flex items-start gap-2 text-sm text-ivory-dim">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mt-0.5 shrink-0 text-jade" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              {c}
            </li>
          ))}
        </ul>
      )}

      {plan.notaUsoRazonable && (
        <p className="mt-3 text-xs text-ivory-muted">{plan.notaUsoRazonable}</p>
      )}

      {plan.ctaEstado === 'checkout' ? (
        <PayPalSubscribeButton
          plan={plan.paypalTier!}
          label={plan.ctaLabel}
          className="mt-6 bg-jade text-white hover:bg-jade/90 focus-visible:ring-2 focus-visible:ring-jade"
        />
      ) : (
        <a
          href={plan.ctaHref}
          className="mt-6 block w-full rounded-xl border border-obsidian-medium bg-obsidian px-4 py-3 text-center text-sm font-semibold text-ivory-muted transition hover:border-jade/40 hover:text-ivory focus-visible:ring-2 focus-visible:ring-jade"
        >
          {plan.ctaLabel}
        </a>
      )}
    </div>
  );
}
