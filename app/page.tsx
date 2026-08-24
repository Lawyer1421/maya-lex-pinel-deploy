import type { Metadata } from 'next';
import Link from 'next/link';
import NavV2 from '@/components/v2/NavV2';
import FooterV2 from '@/components/v2/FooterV2';
import HeroV2 from '@/components/v2/HeroV2';
import SeccionDemoPreview from '@/components/v2/SeccionDemoPreview';
import SeccionHerramientas from '@/components/v2/SeccionHerramientas';
import SeccionPerfiles from '@/components/v2/SeccionPerfiles';
import SeccionBancoJuridico from '@/components/v2/SeccionBancoJuridico';
import SeccionSeguridad from '@/components/v2/SeccionSeguridad';
import SeccionFundador from '@/components/v2/SeccionFundador';
import SeccionPreciosResumen from '@/components/v2/SeccionPreciosResumen';
import FAQV2 from '@/components/v2/FAQV2';

export const metadata: Metadata = {
  title: 'MAYA LEX IA — Inteligencia jurídica hondureña',
  description:
    'Consulte fuentes jurídicas, analice documentos, organice estrategias procesales y utilice herramientas especializadas para la práctica, la enseñanza y la investigación del derecho hondureño.',
};

const PREGUNTAS_FAQ = [
  {
    pregunta: '¿Qué materias del derecho hondureño cubre Maya Lex?',
    respuesta:
      'Penal y Procesal Civil cuentan con la cobertura más profunda y verificada del corpus. Consulte el estado detallado de cada materia en la página de Cobertura Jurídica.',
  },
  {
    pregunta: '¿Las respuestas de Maya Lex son asesoría legal?',
    respuesta:
      'No. Maya Lex es una herramienta de apoyo a la investigación y el análisis jurídico — no sustituye el criterio de un abogado colegiado ni constituye asesoría legal formal.',
  },
  {
    pregunta: '¿Puedo probarlo sin crear una cuenta?',
    respuesta: 'Sí — puede usar Maya Lex en /chat sin crear una cuenta, con hasta 3 consultas reales gratuitas por día.',
  },
  {
    pregunta: '¿Qué pasa con mis suscripciones y datos si cambia el diseño del sitio?',
    respuesta:
      'Nada — cuentas, historial y suscripciones existentes se conservan íntegramente. Los cambios de esta fase son exclusivamente de presentación pública.',
  },
  {
    pregunta: '¿Ofrecen planes ilimitados?',
    respuesta:
      'Los planes con uso amplio están sujetos a una política de uso razonable — evitamos prometer "ilimitado" sin un control técnico y económico real detrás.',
  },
];

export default function HomePageV2() {
  return (
    <div className="min-h-screen bg-obsidian text-ivory">
      <NavV2 />
      <main>
        <HeroV2 />
        <SeccionDemoPreview />
        <SeccionHerramientas />
        <SeccionPerfiles />
        <SeccionBancoJuridico />
        <SeccionSeguridad />
        <SeccionFundador />
        <SeccionPreciosResumen />
        <FAQV2 preguntas={PREGUNTAS_FAQ} />
        <section className="px-4 pb-20 pt-4 text-center sm:px-6">
          <h2 className="font-serif text-2xl font-bold text-ivory sm:text-3xl">
            Comience gratis, sin compromiso.
          </h2>
          <Link
            href="/chat"
            className="mt-6 inline-block rounded-xl bg-jade-deep px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-jade/20 hover:bg-jade-dark focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian"
          >
            Probar gratis
          </Link>
        </section>
      </main>
      <FooterV2 />
    </div>
  );
}
