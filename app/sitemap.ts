import type { MetadataRoute } from 'next';
import { listarNumerosArticulo, slugConsultaParaArticulo } from '@/lib/seo/articulos-vigentes';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mayalexhn.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const numeros = await listarNumerosArticulo();

  const estaticas: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/pricing`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/login`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const leyes: MetadataRoute.Sitemap = numeros.map((numero) => ({
    url: `${BASE_URL}/leyes/${numero}`,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  const consultas: MetadataRoute.Sitemap = numeros.map((numero) => ({
    url: `${BASE_URL}/consultas/${slugConsultaParaArticulo(numero)}`,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...estaticas, ...leyes, ...consultas];
}
