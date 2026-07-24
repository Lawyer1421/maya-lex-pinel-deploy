import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  listarNumerosArticulo,
  obtenerArticuloPorNumero,
  slugConsultaParaArticulo,
  numeroArticuloDesdeSlug,
} from '@/lib/seo/articulos-vigentes';
import TeaserCTA from '@/components/seo/TeaserCTA';

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mayalexhn.com';
const TEASER_CHARS = 320;

function preguntaParaArticulo(numero: string): string {
  return `¿Qué establece el Artículo ${numero} de la legislación penal hondureña?`;
}

export async function generateStaticParams() {
  const numeros = await listarNumerosArticulo();
  return numeros.map((numero) => ({ slug: slugConsultaParaArticulo(numero) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const numero = numeroArticuloDesdeSlug(slug);
  const dato = numero ? await obtenerArticuloPorNumero(numero) : null;

  if (!dato) {
    return { title: 'Consulta no encontrada — MAYA LEX IA' };
  }

  const pregunta = preguntaParaArticulo(dato.numArticulo);

  return {
    title: `${pregunta} | MAYA LEX IA`,
    description: `Respuesta verificada sobre el Artículo ${dato.numArticulo} de la legislación penal hondureña, con análisis jurídico asistido por IA en MAYA LEX.`,
    alternates: { canonical: `${BASE_URL}/consultas/${slug}` },
  };
}

export default async function ConsultaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const numero = numeroArticuloDesdeSlug(slug);
  const dato = numero ? await obtenerArticuloPorNumero(numero) : null;

  if (!dato) notFound();

  const pregunta = preguntaParaArticulo(dato.numArticulo);
  const truncado = dato.contenido.length > TEASER_CHARS;
  const teaser = dato.contenido.slice(0, TEASER_CHARS).trim();
  const respuestaJsonLd = `${teaser}${truncado ? '… (continúa — consulte con Maya Lex IA para el análisis completo)' : ''}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: pregunta,
        acceptedAnswer: {
          '@type': 'Answer',
          text: respuestaJsonLd,
        },
      },
    ],
  };

  return (
    <main className="min-h-screen bg-navy px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-white/40 hover:text-white/60 text-sm">
          ← MAYA LEX IA
        </Link>

        <h1 className="font-serif text-2xl font-bold text-gradient-maya mt-4 mb-2">
          {pregunta}
        </h1>
        <p className="text-white/50 text-sm mb-6">
          Norma vigente verificada — legislación penal de Honduras
        </p>

        <div className="glass-card p-6 mb-6">
          <p className="text-white/80 leading-relaxed whitespace-pre-line">
            {teaser}
            {truncado ? '…' : ''}
          </p>
        </div>

        <TeaserCTA mensaje="Consulte con Maya Lex IA para un análisis jurídico completo aplicado a su caso" />
      </div>
    </main>
  );
}
