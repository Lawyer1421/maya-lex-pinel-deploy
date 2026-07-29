import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PaginaMarketing from '@/components/v2/PaginaMarketing';
import { PERFILES_SOLUCIONES, SLUGS_SOLUCIONES } from '@/lib/v2/paginas-marketing';

// Los 7 perfiles salen de la configuración compartida — determinista, sin red.
export function generateStaticParams() {
  return SLUGS_SOLUCIONES.map((perfil) => ({ perfil }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ perfil: string }>;
}): Promise<Metadata> {
  const { perfil } = await params;
  const config = PERFILES_SOLUCIONES[perfil];
  if (!config) return { title: 'Solución no encontrada — MAYA LEX IA' };
  return { title: config.metaTitle, description: config.metaDescription };
}

export default async function SolucionPage({ params }: { params: Promise<{ perfil: string }> }) {
  const { perfil } = await params;
  const config = PERFILES_SOLUCIONES[perfil];
  if (!config) notFound();
  return <PaginaMarketing config={config} />;
}
