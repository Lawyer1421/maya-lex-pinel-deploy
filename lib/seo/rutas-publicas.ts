/**
 * Rutas públicas de marketing y aliases históricos en español.
 * Fuente única para next.config redirects y sitemap.xml — sin red, sin env.
 */

export const ALIAS_REDIRECTS: ReadonlyArray<{
  source: string;
  destination: string;
  permanent: boolean;
}> = [
  { source: '/precios', destination: '/pricing', permanent: true },
  { source: '/planes', destination: '/pricing', permanent: true },
  { source: '/cobertura', destination: '/cobertura-juridica', permanent: true },
];

/** URLs reales que deben anunciarse en sitemap.xml (200). */
export const RUTAS_MARKETING_PUBLICAS: readonly string[] = [
  '/',
  '/pricing',
  '/cobertura-juridica',
  '/producto',
  '/herramientas',
  '/seguridad',
  '/fundador',
  '/recursos',
  '/login',
  '/soluciones/abogados',
  '/soluciones/notarios',
  '/soluciones/estudiantes',
  '/soluciones/docentes',
  '/soluciones/bufetes',
  '/soluciones/universidades',
  '/soluciones/empresas',
];
