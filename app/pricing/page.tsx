import type { Metadata } from 'next';
import NavV2 from '@/components/v2/NavV2';
import FooterV2 from '@/components/v2/FooterV2';
import FAQV2 from '@/components/v2/FAQV2';
import TarjetaPlan from '@/components/v2/TarjetaPlan';
import { PLANES_V2, autoStartTierDesde } from '@/components/v2/planes-data';

export const metadata: Metadata = {
  title: 'Planes y Precios — MAYA LEX IA',
  description: 'Planes para abogados, estudiantes, docentes, bufetes y universidades.',
};

const PREGUNTAS_PRECIOS = [
  {
    pregunta: '¿Puedo pagar ahora mismo?',
    respuesta:
      'Sí — los planes Académico y Profesional se activan de inmediato a través de PayPal. '
      + 'Bufete y Universidad se coordinan directamente con nuestro equipo.',
  },
  {
    pregunta: '¿Qué pasa con mi suscripción actual?',
    respuesta: 'Las suscripciones activas existentes no se ven afectadas por este rediseño de precios.',
  },
  {
    pregunta: '¿Qué significa "sujeto a política de uso razonable"?',
    respuesta:
      'Que el plan no es de volumen verdaderamente ilimitado — existe un límite técnico y económico razonable para '
      + 'evitar abuso, comunicado con claridad antes de suscribirse.',
  },
  {
    pregunta: '¿Puedo cambiar de plan después?',
    respuesta: 'Sí, el cambio de plan estará disponible una vez se habilite el cobro — se documentará antes de activarse.',
  },
];

export default async function PricingPageV2({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const params = await searchParams;
  const autoStartTier = autoStartTierDesde(params.plan);

  return (
    <div className="min-h-screen bg-obsidian text-ivory">
      <NavV2 />
      <main>
        <section className="px-4 pb-8 pt-16 text-center sm:px-6">
          <h1 className="font-serif text-4xl font-bold text-ivory sm:text-5xl">Planes y precios</h1>
          <p className="mx-auto mt-4 max-w-2xl text-ivory-dim">
            Un plan para cada etapa de la práctica jurídica — desde explorar hasta administrar un bufete completo.
          </p>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {PLANES_V2.map((plan) => (
              <TarjetaPlan key={plan.id} plan={plan} nivelTitulo="h2" autoStartTier={autoStartTier} />
            ))}
          </div>
        </section>

        <FAQV2 titulo="Preguntas sobre precios" preguntas={PREGUNTAS_PRECIOS} />
      </main>
      <FooterV2 />
    </div>
  );
}
