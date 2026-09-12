import type { Metadata } from 'next';
import NavV2 from '@/components/v2/NavV2';
import FooterV2 from '@/components/v2/FooterV2';

export const metadata: Metadata = {
  title: 'Política de privacidad — MAYA LEX IA',
  description:
    'Cómo Maya Lex trata cuentas, documentos, pagos y consultas. Los instrumentos privados no alimentan el corpus público.',
  alternates: { canonical: '/privacidad' },
};

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-obsidian text-ivory">
      <NavV2 />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-jade-light">Legal</p>
        <h1 className="mt-3 font-serif text-4xl font-bold">Política de privacidad</h1>
        <p className="mt-3 text-sm text-ivory-muted">Última actualización: 12 de septiembre de 2026. Borrador operativo para producto de IA jurídica — el titular puede pulirlo como abogado.</p>

        <div className="prose-legal mt-10 space-y-8 text-sm leading-relaxed text-ivory-dim">
          <section>
            <h2 className="font-serif text-2xl font-semibold text-ivory">1. Responsable</h2>
            <p className="mt-3">
              Maya Lex IA Pinel HN, operada por Fredy Omar Pinel Flores, Choluteca, Honduras.
              Contacto: <a className="text-jade-light underline" href="mailto:contacto@abogadofredypinelfirmalegal.com">contacto@abogadofredypinelfirmalegal.com</a>.
              Sitio: https://mayalexhn.com
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-ivory">2. Qué datos tratamos</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Correo electrónico y sesión (Supabase Auth, incluido Google).</li>
              <li>Consultas que usted envía al chat y metadatos de uso (cuota diaria, plan).</li>
              <li>Documentos que usted adjunta (PDF, DOCX, TXT, máximo 4 MB) para extraer texto y analizarlos.</li>
              <li>Datos de facturación que procesa PayPal (no almacenamos el número de tarjeta).</li>
              <li>Identificador técnico (IP) solo cuando usa el sitio sin iniciar sesión, para limitar abuso.</li>
              <li>Medición de audiencia (Google Analytics) y, si se activan, píxeles de Meta o TikTok.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-ivory">3. Para qué los usamos</h2>
            <p className="mt-3">
              Prestar el servicio (chat, documentos, suscripción), prevenir abuso, cobrar planes Académico y Profesional,
              y mejorar la plataforma. No vendemos su expediente ni su lista de clientes.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-ivory">4. Corpus público vs. documentos privados</h2>
            <p className="mt-3">
              El Banco Jurídico (normas hondureñas verificadas) es un corpus de referencia compartido.
              Los instrumentos y documentos que usted sube <strong className="text-ivory">no alimentan respuestas públicas ni el corpus compartido</strong>.
              El aislamiento es de arquitectura, no un anuncio vacío.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-ivory">5. Encargados</h2>
            <p className="mt-3">
              Infraestructura en Vercel; base de datos y autenticación en Supabase; modelo de lenguaje Anthropic (Claude);
              pagos en PayPal; embeddings de consulta vía Hugging Face cuando aplica búsqueda semántica;
              correo transaccional (Resend) si está configurado. Cada proveedor trata datos según su propio encargo y ubicación.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-ivory">6. Conservación y derechos</h2>
            <p className="mt-3">
              Conservamos la cuenta y el registro de uso mientras la suscripción o la cuenta gratuita esté activa y el tiempo
              necesario para obligaciones fiscales o de seguridad. Puede pedir acceso, corrección o eliminación escribiendo al correo de contacto.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold text-ivory">7. Menores</h2>
            <p className="mt-3">El servicio está dirigido a profesionales, estudiantes y organizaciones. No está pensado para menores de 18 años.</p>
          </section>
        </div>
      </main>
      <FooterV2 />
    </div>
  );
}
