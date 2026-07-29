import Link from 'next/link';

const PUNTOS = [
  'Los instrumentos y documentos privados nunca alimentan respuestas públicas ni el corpus de referencia.',
  'Ninguna respuesta profesional se presenta como norma vigente sin verificación — el estado de cada fuente es siempre visible.',
  'Datos de suscripción y pagos protegidos con control de acceso a nivel de base de datos.',
  'La demostración pública no usa expedientes reales ni información personal.',
];

export default function SeccionSeguridad() {
  return (
    <section aria-labelledby="seguridad-titulo" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-3xl text-center">
        <h2 id="seguridad-titulo" className="font-serif text-3xl font-bold text-ivory sm:text-4xl">
          Seguridad y privacidad, no como promesa vacía
        </h2>
      </div>
      <ul className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
        {PUNTOS.map((p) => (
          <li key={p} className="flex items-start gap-3 rounded-xl border border-obsidian-medium bg-obsidian-light p-4 text-sm text-ivory-dim">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mt-0.5 shrink-0 text-verify" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286Z" />
            </svg>
            {p}
          </li>
        ))}
      </ul>
      <div className="mt-8 text-center">
        <Link href="/seguridad" className="text-sm font-semibold text-jade-light hover:underline focus-visible:ring-2 focus-visible:ring-jade rounded">
          Ver el detalle completo de seguridad →
        </Link>
      </div>
    </section>
  );
}
