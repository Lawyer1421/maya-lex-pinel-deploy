import type { MetadataRoute } from 'next';
import { filtrarLimpios } from '@/lib/seo/estado-editorial';
import { RUTAS_MARKETING_PUBLICAS } from '@/lib/seo/rutas-publicas';
import manifest from '@/data/corpus-editorial-status.json';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mayalexhn.com';

function urlAbsoluta(ruta: string): string {
  return ruta === '/' ? BASE_URL : `${BASE_URL}${ruta}`;
}

function urlsMarketing(): MetadataRoute.Sitemap {
  return RUTAS_MARKETING_PUBLICAS.map((ruta) => ({
    url: urlAbsoluta(ruta),
    changeFrequency: ruta === '/' ? 'weekly' : ruta === '/login' ? 'yearly' : 'monthly',
    priority: ruta === '/' ? 1 : ruta === '/login' ? 0.3 : 0.6,
  }));
}

/**
 * /leyes se anuncia desde el manifest editorial local (cero red).
 * No se importa articulos-vigentes: ese módulo carga el cliente de
 * Supabase y un fallo de env no debe tumbar sitemap.xml (500).
 */
function urlsLeyes(): MetadataRoute.Sitemap {
  try {
    const todos = Object.keys(manifest.articulos).sort((a, b) => Number(a) - Number(b));
    const numeros = filtrarLimpios(todos);
    return numeros.map((numero) => ({
      url: `${BASE_URL}/leyes/${numero}`,
      changeFrequency: 'monthly',
      priority: 0.7,
    }));
  } catch (error) {
    console.error('[sitemap] no se pudieron listar /leyes; se anuncian solo rutas de marketing', error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // /consultas queda deliberadamente fuera del sitemap: siempre declara
  // /leyes/{numero} como canonical (nunca a sí misma), por lo que anunciarla
  // aquí serían señales contradictorias sin beneficio de rastreo adicional.
  // Decisión aprobada — ver MAYALEX_BUILD_ROUTE_DELTA.md sección 6.
  return [...urlsMarketing(), ...urlsLeyes()];
}
