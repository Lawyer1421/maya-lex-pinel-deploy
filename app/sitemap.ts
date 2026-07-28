import type { MetadataRoute } from 'next';
import { listarNumerosArticulo } from '@/lib/seo/articulos-vigentes';
import { filtrarLimpios } from '@/lib/seo/estado-editorial';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mayalexhn.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const todos = await listarNumerosArticulo();
  // Contención SEO: artículos contaminados (artefactos de anonimización sin
  // limpiar) se excluyen del sitemap hasta su limpieza — la URL sigue viva
  // (no se elimina ni redirige), solo deja de anunciarse para indexación.
  // Ver lib/seo/estado-editorial.ts y MAYALEX_SEO_CONTAINMENT_PLAN.md.
  const numeros = filtrarLimpios(todos);

  const estaticas: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/pricing`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/login`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  // /consultas queda deliberadamente fuera del sitemap: siempre declara
  // /leyes/{numero} como canonical (nunca a sí misma), por lo que anunciarla
  // aquí serían señales contradictorias sin beneficio de rastreo adicional.
  // Decisión aprobada — ver MAYALEX_BUILD_ROUTE_DELTA.md sección 6.
  const leyes: MetadataRoute.Sitemap = numeros.map((numero) => ({
    url: `${BASE_URL}/leyes/${numero}`,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...estaticas, ...leyes];
}
