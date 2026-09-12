import type { Metadata } from 'next';
import NavV2 from '@/components/v2/NavV2';
import FooterV2 from '@/components/v2/FooterV2';

export const metadata: Metadata = {
  title: 'Términos de uso — MAYA LEX IA',
  description:
    'Condiciones de Maya Lex: herramienta de apoyo, no asesoría jurídica. Planes, cuota diaria y uso aceptable.',
  alternates: { canonical: '/terminos' },
};

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-obsidian text-ivory">
      <NavV2 />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-jade-light">Legal</p>
        <h1 className="mt-3 font-serif text-4xl font-bold">Términos de uso</h1>
        <p className="mt-3 text-sm text-ivory-muted">Última actualización: 12 de septiembre de 2026. Borrador operativo — el titular puede pulirlo como abogado.</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-ivory-dim">
          <section>
            <h2 className="font-serif text-2xl font-semibold text-ivory">1. El servicio</h2>
            <p className="mt-3">
              Maya Lex es una plataforma de investigación y análisis jurídico hondureño (consulta normativa, análisis de
              documentos y generación de borradores). Al crear una cuenta o usar el sitio acepta estos términos.
            </p>
          </section>

          <section className="rounded-2xl border border-gold/30 bg-gold/5 p-6">
            <h2 className="font-serif text-2xl font-semibold text-ivory">2. No constituye asesoría jurídica</h2>
            <p className="mt-3 text-ivory">
              Maya Lex es una herramienta de apoyo a la investigación. <strong>No sustituye el criterio profesional de un
              abogado colegiado, no crea relación abogado-cliente y no constituye asesoría legal formal.</strong> Usted
              es responsable de verificar normas, plazos y escritos antes de presentarlos o aconsejar a un cliente.
              Las respuestas pueden abstenerse cuando no hay fragmento verificable en el corpus.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-ivory">3. Cuentas y planes</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Plan Explorar: cuenta gratuita, 3 consultas por día, sin tarjeta.</li>
              <li>Académico (USD 9/mes) y Profesional (USD 15/mes): la misma función de chat; cambia la cuota diaria (20 y 1.000, uso razonable). Cobro y renovación vía PayPal.</li>
              <li>Bufete y Universidad: contratación directa, no self-serve.</li>
              <li>Una consulta con documento adjunto cuenta como una consulta de la cuota.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-ivory">4. Uso aceptable</h2>
            <p className="mt-3">
              Queda prohibido usar Maya Lex para fines ilícitos, fraude, evasión, simulación ilegal, o para eludir
              investigaciones en curso. Tampoco se permite extraer masivamente el corpus, compartir una cuenta de pago
              para evadir la cuota, ni intentar reidentificar documentos de terceros.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-ivory">5. Propiedad intelectual</h2>
            <p className="mt-3">
              La plataforma, la marca MAYA LEX y el Banco Jurídico curado son del titular. El texto de las leyes
              hondureñas no es de nuestra autoría. Los borradores que usted genere son para su uso profesional; usted
              responde por su contenido final.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-ivory">6. Limitación</h2>
            <p className="mt-3">
              El servicio se ofrece “tal cual”. No garantizamos cobertura total de la legislación hondureña ni un
              resultado judicial. En la medida que permita el derecho hondureño, la responsabilidad por el uso del
              servicio se limita a lo pagado en los últimos 12 meses por la cuenta afectada.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-ivory">7. Ley aplicable</h2>
            <p className="mt-3">Estos términos se rigen por las leyes de la República de Honduras. Foro: tribunales de Choluteca, salvo norma imperativa distinta.</p>
          </section>
        </div>
      </main>
      <FooterV2 />
    </div>
  );
}
