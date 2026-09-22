import Link from 'next/link';

const MODULOS = [
  { titulo: 'Derecho Notarial y Forma Documental', detalle: 'Instrumentos públicos, autorización y fe pública.' },
  { titulo: 'Jurisdicción Voluntaria', detalle: 'Sede notarial conforme al Código Procesal Civil (CPC).' },
  { titulo: 'Práctica Registral y Mercantil', detalle: 'Calificación registral, sociedades y actos de comercio.' },
  { titulo: 'Régimen Disciplinario', detalle: 'Responsabilidad notarial y régimen sancionatorio.' },
];

const CARACTERISTICAS = [
  {
    titulo: 'Cero alucinaciones',
    descripcion: 'Cada reactivo y su fundamentación jurídica se auditan contra el corpus legislativo hondureño vigente — ninguna respuesta sin artículo citable.',
  },
  {
    titulo: 'Simulador de examen',
    descripcion: 'Tiempo cronometrado, retroalimentación inmediata y fundamentación por artículo de ley en cada respuesta.',
  },
  {
    titulo: 'Métricas de rendimiento',
    descripcion: 'Historial de avance y desempeño por eje temático, para saber exactamente dónde reforzar.',
  },
];

const ICONO_CHECK = 'm4.5 12.75 6 6 9-13.5';

export default function OfertaExequatur({ eligibleTier = false }: { eligibleTier?: boolean }) {
  return (
    <main className="min-h-screen bg-obsidian px-4 pb-20 pt-16 text-ivory sm:px-6">
      <div className="mx-auto max-w-4xl text-center">
        <span className="mode-badge border-gold/30 bg-gold/10 text-gold-light">Programa Premium · Plan Profesional</span>
        <h1 className="mt-6 font-serif text-3xl font-bold leading-tight text-ivory sm:text-4xl lg:text-5xl">
          Programa de Preparación para el Exequátur de Notario ante la Corte Suprema de Justicia
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-ivory-dim">
          Concebido, validado y dirigido por un Abogado y Notario con <strong className="font-semibold text-ivory">34 años de ejercicio profesional</strong> y{' '}
          <strong className="font-semibold text-ivory">24 años de docencia universitaria en la UNAH</strong> — para que
          su preparación se apoye en fuentes verificadas, no en resúmenes genéricos.
        </p>

        {eligibleTier && (
          <p className="mx-auto mt-6 max-w-xl rounded-xl border border-gold/25 bg-gold/10 px-4 py-3 text-sm text-gold-light">
            Su plan ya califica para Exequátur — el acceso se está activando por grupos y estará disponible pronto.
          </p>
        )}
      </div>

      <div className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-3xl border border-jade/25 bg-gradient-to-br from-obsidian-light via-obsidian-light to-jade/5 p-8 sm:p-10">
        <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="font-serif text-xl font-bold text-ivory">Plan Notarial</p>
            <p className="mt-1 text-sm text-ivory-muted">Facturado como Plan Profesional — 1000 consultas/día incluidas en toda la plataforma.</p>
          </div>
          <p className="flex items-baseline gap-1">
            <span className="font-serif text-4xl font-bold text-ivory">USD 15</span>
            <span className="text-sm text-ivory-muted">/mes</span>
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-ivory-muted">Los 4 ejes formativos</p>
            <ul className="mt-4 space-y-3">
              {MODULOS.map((m) => (
                <li key={m.titulo} className="flex items-start gap-2.5 text-sm text-ivory-dim">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mt-0.5 shrink-0 text-jade" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d={ICONO_CHECK} />
                  </svg>
                  <span>
                    <span className="font-medium text-ivory">{m.titulo}</span>
                    <span className="block text-xs text-ivory-muted">{m.detalle}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            {CARACTERISTICAS.map((c) => (
              <div key={c.titulo} className="rounded-2xl border border-obsidian-medium bg-obsidian/60 p-4">
                <p className="font-serif text-sm font-semibold text-gold-light">{c.titulo}</p>
                <p className="mt-1 text-xs text-ivory-dim">{c.descripcion}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 border-t border-obsidian-medium pt-8 sm:flex-row sm:justify-center">
          <Link
            href="/pricing?plan=pro"
            className="w-full rounded-xl bg-jade-deep px-6 py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-jade/20 transition hover:bg-jade-dark focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian sm:w-auto"
          >
            Suscribirme al Plan Notarial — $15/mes
          </Link>
          <Link
            href="/exequatur/diagnostico-demo"
            className="w-full rounded-xl border border-obsidian-medium px-6 py-3.5 text-center text-sm font-semibold text-ivory-dim transition hover:border-jade/40 hover:text-ivory focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian sm:w-auto"
          >
            Comenzar Diagnóstico de Colocación de Demostración
          </Link>
        </div>
        <p className="mt-4 text-center text-xs text-ivory-muted">
          El diagnóstico de demostración es gratuito y no requiere suscripción. Maya Lex es una herramienta de apoyo
          a la preparación — no sustituye el estudio del texto legal ni garantiza el resultado del examen.
        </p>
      </div>
    </main>
  );
}
