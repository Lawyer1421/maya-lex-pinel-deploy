/**
 * lib/seo/estado-editorial.ts
 * Fuente única de verdad del estado editorial (limpio/contaminado) de cada
 * artículo servido por /leyes y /consultas.
 *
 * Deliberadamente NO se hardcodea la lista de rutas contaminadas en los
 * componentes de página — todo consumidor (page.tsx, sitemap.ts, RAG) lee
 * de aquí. Hoy la fuente es un manifest JSON versionado en el repo
 * (data/corpus-editorial-status.json), generado desde la auditoría de
 * calidad de datos (ver MAYALEX_SEO_CONTAINMENT_PLAN.md). El día que exista
 * una tabla `corpus_editorial_status` en producción, solo esta función
 * cambia de implementación — los consumidores no se tocan.
 */
import manifest from '@/data/corpus-editorial-status.json';

export type EstadoEditorial = 'contaminado' | 'limpio';

interface EntradaManifest {
  estado: EstadoEditorial;
  motivo: string;
}

const ARTICULOS = manifest.articulos as Record<string, EntradaManifest>;

/**
 * Estado editorial de un artículo. Si el artículo no está en el manifest
 * (no debería ocurrir para los artículos servidos por generateStaticParams,
 * pero una fila nueva en producción podría adelantarse a este manifest),
 * se trata como 'contaminado' por seguridad — nunca se indexa por defecto
 * un artículo sin evidencia de calidad verificada.
 */
export function obtenerEstadoEditorial(numArticulo: string): EstadoEditorial {
  return ARTICULOS[numArticulo]?.estado ?? 'contaminado';
}

export function esContaminado(numArticulo: string): boolean {
  return obtenerEstadoEditorial(numArticulo) === 'contaminado';
}

export function motivoEstado(numArticulo: string): string {
  return ARTICULOS[numArticulo]?.motivo ?? 'artículo sin entrada en el manifest de estado editorial — tratado como contaminado por seguridad';
}

/** Usado por sitemap.ts y por cualquier listado que deba excluir rutas contaminadas. */
export function filtrarLimpios(numeros: string[]): string[] {
  return numeros.filter((n) => !esContaminado(n));
}

export function listarContaminados(numeros: string[]): string[] {
  return numeros.filter((n) => esContaminado(n));
}
