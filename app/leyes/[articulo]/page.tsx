import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { listarNumerosArticulo, obtenerArticuloPorNumero } from '@/lib/seo/articulos-vigentes';
import { esContaminado } from '@/lib/seo/estado-editorial';
import TeaserCTA from '@/components/seo/TeaserCTA';

export const revalidate = 86400; // el corpus normativo no cambia con frecuencia

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mayalexhn.com';
const TEASER_CHARS = 420;

export async function generateStaticParams() {
  const numeros = await listarNumerosArticulo();
  return numeros.map((articulo) => ({ articulo }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ articulo: string }>;
}): Promise<Metadata> {
  const { articulo } = await params;
  const dato = await obtenerArticuloPorNumero(articulo);

  if (!dato) {
    return { title: 'Artículo no encontrado — MAYA LEX IA' };
  }

  const titulo = `Artículo ${dato.numArticulo} — Legislación Penal de Honduras | MAYA LEX IA`;
  const descripcion = `Texto vigente del Artículo ${dato.numArticulo} de la legislación penal hondureña, con análisis jurídico asistido por IA en MAYA LEX.`;
  const contaminado = esContaminado(dato.numArticulo);

  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: `${BASE_URL}/leyes/${dato.numArticulo}` },
    openGraph: { title: titulo, description: descripcion, type: 'article' },
    // Contención SEO: artículos con artefactos de anonimización sin limpiar
    // no se indexan hasta su limpieza — ver lib/seo/estado-editorial.ts
    robots: contaminado ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function ArticuloPage({
  params,
}: {
  params: Promise<{ articulo: string }>;
}) {
  const { articulo } = await params;
  const dato = await obtenerArticuloPorNumero(articulo);

  if (!dato) notFound();

  const contaminado = esContaminado(dato.numArticulo);
  const truncado = dato.contenido.length > TEASER_CHARS;
  const teaser = dato.contenido.slice(0, TEASER_CHARS).trim();

  return (
    <main className="min-h-screen bg-navy px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-white/40 hover:text-white/60 text-sm">
          ← MAYA LEX IA
        </Link>

        <h1 className="font-serif text-3xl font-bold text-gradient-maya mt-4 mb-2">
          Artículo {dato.numArticulo}
        </h1>
        <p className="text-white/50 text-sm mb-6">
          {contaminado
            ? 'Legislación penal de Honduras — en revisión de calidad, no citar como fuente verificada'
            : 'Legislación penal vigente de Honduras — norma verificada'}
        </p>

        <div className="glass-card p-6 mb-6">
          <p className="text-white/80 leading-relaxed whitespace-pre-line">
            {teaser}
            {truncado ? '…' : ''}
          </p>
        </div>

        <TeaserCTA mensaje="Obtenga el análisis jurídico completo de este artículo, con jurisprudencia y aplicación práctica al caso concreto" />
      </div>
    </main>
  );
}
