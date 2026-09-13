import type { Metadata } from 'next';
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
import CtaProbarGratis from '@/components/marketing/CtaProbarGratis';
import { PREGUNTAS_FAQ_PORTADA } from '@/lib/marketing/faq';

export const metadata: Metadata = {
  title: 'MAYA LEX IA — Inteligencia jurídica hondureña',
  description:
    'Consulte fuentes jurídicas, analice documentos, organice estrategias procesales y utilice herramientas especializadas para la práctica, la enseñanza y la investigación del derecho hondureño.',
};


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
        <FAQV2 preguntas={PREGUNTAS_FAQ_PORTADA} />
        <section className="px-4 pb-24 pt-8 text-center sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-light">Empiece hoy</p>
          <h2 className="mt-3 font-serif text-2xl font-bold text-ivory sm:text-3xl">
            Tres consultas reales. Sin tarjeta.
          </h2>
          <CtaProbarGratis
            source="home_cierre"
            className="mt-6 inline-block rounded-xl bg-jade-deep px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-jade/20 hover:bg-jade-dark focus-visible:ring-2 focus-visible:ring-jade focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian"
          >
            Probar gratis
          </CtaProbarGratis>
        </section>
      </main>
      <FooterV2 />
    </div>
  );
}
