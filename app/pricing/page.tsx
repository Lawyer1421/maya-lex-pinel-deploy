import type { Metadata } from 'next';
import Link from 'next/link';
import PayPalSubscribeButton from '@/app/components/PayPalSubscribeButton';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Planes y Precios — MAYA LEX IA PINEL HN',
  description:
    'Planes de acceso a MAYA LEX e MAYA PENAL: el asistente jurídico inteligente para abogados hondureños. Desde análisis de requerimientos hasta redacción de recursos de apelación.',
};

// ─────────────────────────────────────────────────────────────────────────────
// DATOS DE PLANES
// ─────────────────────────────────────────────────────────────────────────────

const PLANES = [
  {
    id: 'free',
    nombre: 'Gratuito',
    precio: 'L. 0',
    periodo: 'siempre gratis',
    descripcion: 'Para explorar la plataforma y consultas ocasionales.',
    destacado: false,
    badge: null,
    cta: { texto: 'Comenzar gratis', href: '/chat' },
    caracteristicas: [
      { texto: '3 consultas por día', incluido: true },
      { texto: 'MAYA LEX — Módulo Civil y Procesal', incluido: true },
      { texto: 'Sala IA — respuestas rápidas', incluido: true },
      { texto: 'MAYA PENAL — Análisis Penal', incluido: false },
      { texto: 'Análisis profundo con pensamiento adaptativo', incluido: false },
      { texto: 'Redacción de escritos procesales', incluido: false },
      { texto: 'Calculadora de Medidas Cautelares', incluido: false },
      { texto: 'Calculadora de Prescripción Penal', incluido: false },
      { texto: 'Analizador de Requerimiento Fiscal', incluido: false },
      { texto: 'Plantillas de recursos procesales', incluido: false },
      { texto: 'Biblioteca Penal Pinel (jurisprudencia CSJ)', incluido: false },
    ],
  },
  {
    id: 'pro',
    nombre: 'Pro — Abogado',
    precio: 'L. 370',
    periodo: 'por mes',
    descripcion: 'Para defensores penales y abogados litigantes activos.',
    destacado: true,
    badge: 'MÁS POPULAR',
    cta: { texto: 'Activar Plan Pro', href: '/chat?plan=pro' },
    caracteristicas: [
      { texto: 'Consultas ilimitadas', incluido: true },
      { texto: 'MAYA LEX — Módulo Civil y Procesal', incluido: true },
      { texto: 'MAYA PENAL — Análisis Penal completo', incluido: true },
      { texto: 'Análisis profundo con pensamiento adaptativo', incluido: true },
      { texto: 'Redacción de escritos procesales', incluido: true },
      { texto: 'Calculadora de Medidas Cautelares (Arts. 172-185 CPP)', incluido: true },
      { texto: 'Calculadora de Prescripción Penal (Arts. 93-99 CP)', incluido: true },
      { texto: 'Analizador de Requerimiento Fiscal (Art. 294 CPP)', incluido: true },
      { texto: 'Plantillas: apelación, excepciones, sobreseimiento', incluido: true },
      { texto: 'Biblioteca Penal Pinel (jurisprudencia CSJ)', incluido: true },
    ],
  },
  {
    id: 'academico',
    nombre: 'Académico',
    precio: 'L. 222',
    periodo: 'por mes',
    descripcion: 'Para estudiantes de Derecho y docentes universitarios.',
    destacado: false,
    badge: 'EDUCACIÓN',
    cta: { texto: 'Acceso académico', href: '/chat?plan=academico' },
    caracteristicas: [
      { texto: '20 consultas por día', incluido: true },
      { texto: 'MAYA LEX — Módulo Civil y Procesal', incluido: true },
      { texto: 'MAYA PENAL — Análisis Penal', incluido: true },
      { texto: 'Análisis profundo con pensamiento adaptativo', incluido: true },
      { texto: 'Redacción de escritos procesales', incluido: true },
      { texto: 'Calculadora de Medidas Cautelares', incluido: true },
      { texto: 'Calculadora de Prescripción Penal', incluido: true },
      { texto: 'Analizador de Requerimiento Fiscal', incluido: false },
      { texto: 'Plantillas de recursos procesales', incluido: false },
      { texto: 'Biblioteca Penal Pinel (jurisprudencia CSJ)', incluido: true },
    ],
  },
] as const;

const PREGUNTAS = [
  {
    q: '¿El sistema predice el resultado de mi caso?',
    r: 'No. MAYA PENAL emite "niveles de acreditación" de los elementos del tipo penal — nunca predicciones judiciales. La decisión estratégica la toma siempre el abogado responsable del caso.',
  },
  {
    q: '¿Las respuestas están basadas en la ley hondureña?',
    r: 'Sí. El sistema aplica exclusivamente el CPP (D.9-99-E) y el CP (D.130-2017). Está prohibido el razonamiento de Common Law o cita de jurisprudencia extranjera sin fundamento normativo hondureño.',
  },
  {
    q: '¿Puedo cancelar en cualquier momento?',
    r: 'Sí. No hay contratos de permanencia. Puede cancelar desde su perfil y el acceso Pro se mantiene hasta el final del período pagado.',
  },
  {
    q: '¿El Plan Académico requiere verificación?',
    r: 'Sí. Se solicita carné universitario vigente o nombramiento docente. Aplica para UNAH, UNICAH, UJCV, UNA, UNITEC y demás universidades hondureñas.',
  },
  {
    q: '¿Mis consultas son confidenciales?',
    r: 'Sí. Las conversaciones no son compartidas con terceros. Para casos con datos sensibles (menores víctimas, testigos protegidos) el sistema aplica anonimización conforme al CP Art. 358-2008.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-navy">
      {/* ── Header ── */}
      <div className="relative overflow-hidden pt-16 pb-12 px-6 text-center">
        {/* Fondo decorativo */}
        <div className="absolute inset-0 bg-gradient-to-b from-jade/5 to-transparent pointer-events-none" />

        {/* Breadcrumb */}
        <div className="flex justify-center mb-6">
          <Link
            href="/"
            className="text-white/40 hover:text-white/70 text-sm transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Inicio
          </Link>
        </div>

        <div className="relative">
          <p className="text-gold text-xs font-medium tracking-[0.3em] uppercase mb-3">
            ACCESO A LA PLATAFORMA
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-gradient-maya mb-4">
            Planes y Precios
          </h1>
          <p className="text-white/60 max-w-xl mx-auto text-base leading-relaxed">
            Asistente jurídico inteligente especializado en derecho hondureño.
            Copiloto penal para defensores — no un chatbot genérico.
          </p>
        </div>
      </div>

      {/* ── Tarjetas de planes ── */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {PLANES.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border transition-all duration-300 ${
                plan.destacado
                  ? 'border-jade/60 bg-jade/5 shadow-2xl shadow-jade/20 scale-105'
                  : 'border-white/10 bg-navy-light/30 hover:border-jade/30'
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span
                    className={`text-xs font-bold tracking-widest px-4 py-1 rounded-full ${
                      plan.destacado
                        ? 'bg-gradient-maya text-white'
                        : 'bg-gold/20 text-gold border border-gold/40'
                    }`}
                  >
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="p-7 flex flex-col flex-1">
                {/* Encabezado del plan */}
                <div className="mb-6">
                  <h2 className="font-serif text-xl font-bold text-white mb-1">
                    {plan.nombre}
                  </h2>
                  <p className="text-white/50 text-sm leading-relaxed">
                    {plan.descripcion}
                  </p>
                </div>

                {/* Precio */}
                <div className="mb-6 pb-6 border-b border-white/10">
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`font-serif text-4xl font-bold ${
                        plan.destacado ? 'text-gradient-maya' : 'text-white'
                      }`}
                    >
                      {plan.precio}
                    </span>
                    <span className="text-white/40 text-sm">/ {plan.periodo}</span>
                  </div>
                  {plan.id === 'pro' && (
                    <p className="text-jade text-xs mt-1">
                      USD $15 · Facturación mensual vía PayPal
                    </p>
                  )}
                  {plan.id === 'academico' && (
                    <p className="text-gold text-xs mt-1">
                      USD $9 · Requiere verificación académica
                    </p>
                  )}
                </div>

                {/* Lista de características */}
                <ul className="space-y-3 flex-1 mb-8">
                  {plan.caracteristicas.map((item, i) => (
                    <li
                      key={i}
                      className={`flex items-start gap-2.5 text-sm ${
                        item.incluido ? 'text-white/80' : 'text-white/25 line-through'
                      }`}
                    >
                      {item.incluido ? (
                        <svg
                          className="w-4 h-4 text-jade flex-shrink-0 mt-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4 text-white/20 flex-shrink-0 mt-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      {item.texto}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {plan.id === 'free' ? (
                  <Link
                    href={plan.cta.href}
                    className="w-full text-center py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/15 hover:border-white/30"
                  >
                    {plan.cta.texto}
                  </Link>
                ) : (
                  <PayPalSubscribeButton
                    plan={plan.id}
                    label={plan.cta.texto}
                    className={
                      plan.destacado
                        ? 'bg-gradient-maya text-white shadow-lg shadow-jade/30 hover:shadow-jade/50'
                        : 'bg-gold/10 hover:bg-gold/20 text-gold border border-gold/30 hover:border-gold/60'
                    }
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Nota de pago ── */}
        <p className="text-center text-white/30 text-xs mt-6">
          Pagos seguros vía PayPal · Lempiras hondureños (HNL) · Tipos de cambio aproximados ·
          <a
            href="mailto:abogadofredypinel.firmalegal@gmail.com"
            className="text-jade/60 hover:text-jade ml-1 transition-colors"
          >
            Contactar para pago local
          </a>
        </p>
      </section>

      {/* ── Módulos incluidos en Pro ── */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="text-center mb-10">
          <p className="text-gold text-xs font-medium tracking-[0.25em] uppercase mb-2">
            LO QUE INCLUYE EL PLAN PRO
          </p>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
            Herramientas de litigación penal
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icono: '🔍',
              titulo: 'Analizador de Requerimiento',
              descripcion: 'Verifica los 7 elementos del Art. 294 CPP. Detecta prueba ilícita (Art. 200 CPP) y vicios formales. Recomienda estrategia procesal.',
              norma: 'Arts. 294, 166, 200 CPP',
            },
            {
              icono: '⚖️',
              titulo: 'Calculadora de Medidas Cautelares',
              descripcion: 'Evalúa Fumus Commissi Delicti y Periculum Libertatis. Detecta prohibiciones absolutas del Art. 183 CPP. Propone medidas sustitutivas.',
              norma: 'Arts. 172-185 CPP',
            },
            {
              icono: '⏱️',
              titulo: 'Calculadora de Prescripción',
              descripcion: 'Calcula si la acción penal ha prescrito según el tipo de delito. Detecta actos interruptivos. Genera excepción procesal automáticamente.',
              norma: 'Arts. 93-99 CP',
            },
            {
              icono: '🎯',
              titulo: 'Constructor de Teoría del Caso',
              descripcion: 'Estructura la versión de la defensa frente a la acusación fiscal. Mapea pruebas disponibles. Genera la línea temática del caso.',
              norma: 'Arts. 337, 338 CPP',
            },
            {
              icono: '📋',
              titulo: 'Plantilla: Recurso de Apelación',
              descripcion: 'Genera el escrito de apelación de autos interlocutorios con la jurisprudencia de la Corte IDH y los artículos del CPP integrados.',
              norma: 'Art. 391 CPP',
            },
            {
              icono: '📚',
              titulo: 'Biblioteca Penal Pinel',
              descripcion: 'Jurisprudencia de la Sala Penal de la CSJ Honduras clasificada por expediente. Acceso semántico a sentencias reales del sistema judicial hondureño.',
              norma: 'CSJ HN · Corte IDH',
            },
          ].map((modulo) => (
            <div key={modulo.titulo} className="glass-card-hover p-5">
              <div className="text-3xl mb-3">{modulo.icono}</div>
              <h3 className="font-semibold text-white text-sm mb-2">{modulo.titulo}</h3>
              <p className="text-white/50 text-xs leading-relaxed mb-3">{modulo.descripcion}</p>
              <span className="text-jade text-xs font-mono">{modulo.norma}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Aviso legal prominente ── */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <div className="glass-card border-gold/20 p-6">
          <div className="flex gap-3">
            <span className="text-gold text-xl flex-shrink-0">⚠️</span>
            <div>
              <p className="text-gold font-semibold text-sm mb-1">Aviso Legal — MAYA PENAL no es un abogado</p>
              <p className="text-white/50 text-xs leading-relaxed">
                MAYA PENAL es un asistente de apoyo profesional. Sus respuestas son análisis heurísticos
                basados en el CPP (D.9-99-E) y el CP (D.130-2017) — no constituyen asesoría jurídica, no
                predicen resultados judiciales y no sustituyen la valoración del abogado responsable del
                caso. El abogado tiene la obligación deontológica de verificar toda la información antes
                de presentarla ante los tribunales. Sistema exclusivo para el sistema jurídico hondureño
                (Romano-Germánico) — no aplica Common Law ni jurisprudencia extranjera sin sustento normativo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <div className="text-center mb-10">
          <h2 className="font-serif text-2xl font-bold text-white">Preguntas frecuentes</h2>
        </div>
        <div className="space-y-4">
          {PREGUNTAS.map((item, i) => (
            <div key={i} className="glass-card p-5">
              <p className="text-jade font-semibold text-sm mb-2">{item.q}</p>
              <p className="text-white/60 text-sm leading-relaxed">{item.r}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="max-w-2xl mx-auto px-4 pb-20 text-center">
        <div className="glass-card border-jade/20 p-10">
          <div className="w-16 h-16 rounded-full bg-gradient-maya mx-auto mb-5 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
            </svg>
          </div>
          <h2 className="font-serif text-2xl font-bold text-gradient-maya mb-2">
            ¿Tiene preguntas?
          </h2>
          <p className="text-white/50 text-sm mb-6 leading-relaxed">
            Contacte directamente al Abogado Fredy Omar Pinel Flores para consultas
            institucionales, capacitaciones para bufetes o universidades.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/chat" className="btn-jade inline-block text-sm">
              Probar gratis ahora
            </Link>
            <a
              href="https://abogadofredypinelfirmalegal.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost inline-block text-sm"
            >
              abogadofredypinelfirmalegal.com
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 py-8 px-4 text-center">
        <p className="text-white/25 text-xs">
          © 2026 MAYA LEX IA PINEL HN · Abogado Fredy Omar Pinel Flores · Choluteca, Honduras
          <span className="mx-2">·</span>
          <Link href="/" className="hover:text-white/50 transition-colors">Inicio</Link>
          <span className="mx-2">·</span>
          <Link href="/chat" className="hover:text-white/50 transition-colors">Consulta IA</Link>
        </p>
      </footer>
    </main>
  );
}
