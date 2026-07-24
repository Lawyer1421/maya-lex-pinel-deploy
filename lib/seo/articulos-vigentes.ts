/**
 * lib/seo/articulos-vigentes.ts
 * Fuente de datos para las páginas públicas de SEO programático
 * (/leyes/[articulo], /consultas/[slug], sitemap).
 *
 * Alcance deliberadamente angosto: SOLO filas de biblioteca_vectores con
 * es_norma_vigente=true en materia='01_PENAL' — las únicas 690 filas
 * verificadas como legislación hondureña real (no jurisprudencia/doctrina
 * comparada, no artefactos de sobre-anonimización). Ampliar a otras
 * materias requiere primero extender el backfill de esa materia.
 */
import { createServerSupabaseClient } from '@/lib/supabase';

const COLECCION = 'mayalex_normativos';
const MATERIA = '01_PENAL';

export interface ArticuloVigente {
  numArticulo: string;
  contenido: string;
  fuente: string | null;
}

export async function listarNumerosArticulo(): Promise<string[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('biblioteca_vectores')
    .select('num_articulo')
    .eq('coleccion', COLECCION)
    .eq('materia', MATERIA)
    .eq('es_norma_vigente', true)
    .not('num_articulo', 'is', null);

  if (error || !data) return [];

  const numeros = data
    .map((r) => r.num_articulo)
    .filter((n): n is string => n !== null);

  return [...new Set(numeros)].sort((a, b) => Number(a) - Number(b));
}

export async function obtenerArticuloPorNumero(numero: string): Promise<ArticuloVigente | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('biblioteca_vectores')
    .select('num_articulo, contenido, fuente')
    .eq('coleccion', COLECCION)
    .eq('materia', MATERIA)
    .eq('es_norma_vigente', true)
    .eq('num_articulo', numero)
    .limit(1)
    .maybeSingle();

  if (error || !data || !data.num_articulo) return null;

  return {
    numArticulo: data.num_articulo,
    contenido: data.contenido,
    fuente: data.fuente,
  };
}

/** Slug estable y determinístico para /consultas — derivado del número de
 * artículo, no de texto libre, para evitar colisiones o slugs inválidos. */
export function slugConsultaParaArticulo(numero: string): string {
  return `articulo-${numero}-legislacion-penal-honduras`;
}

export function numeroArticuloDesdeSlug(slug: string): string | null {
  const m = slug.match(/^articulo-(\d+)-legislacion-penal-honduras$/);
  return m ? m[1] : null;
}
