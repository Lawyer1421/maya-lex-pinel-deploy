/**
 * lib/seo/articulos-vigentes.ts
 * Fuente de datos para las páginas públicas de SEO programático
 * (/leyes/[articulo], /consultas/[slug], sitemap).
 *
 * Alcance deliberadamente angosto: SOLO filas de biblioteca_vectores con
 * es_norma_vigente=true en materia='01_PENAL' — las únicas filas
 * verificadas como legislación hondureña real (no jurisprudencia/doctrina
 * comparada, no artefactos de sobre-anonimización). Ampliar a otras
 * materias requiere primero extender el backfill de esa materia.
 *
 * DETERMINISMO DEL BUILD: la lista de rutas a generar NO depende de la red.
 * Proviene del manifest editorial local y versionado
 * (data/corpus-editorial-status.json), la misma fuente de verdad que ya
 * gobierna noindex/sitemap. Una consulta a Supabase que falle de forma
 * transitoria ya no puede reducir silenciosamente el número de páginas
 * generadas (incidente documentado en MAYALEX_V2_BUILD_DETERMINISM.md).
 * El CONTENIDO de cada artículo sí viene de Supabase, con timeout, reintentos
 * y fallo duro: un error persistente detiene el build en vez de degradarlo.
 */
import { createServerSupabaseClient } from '@/lib/supabase';
import manifest from '@/data/corpus-editorial-status.json';

const COLECCION = 'mayalex_normativos';
const MATERIA = '01_PENAL';

const TIMEOUT_MS = 15_000;
const MAX_INTENTOS = 3;
const BACKOFF_BASE_MS = 750;

export interface ArticuloVigente {
  numArticulo: string;
  contenido: string;
  fuente: string | null;
}

/** Lista determinística de artículos publicables — manifest local, cero red.
 * Se mantiene async por compatibilidad con los llamadores existentes. */
export async function listarNumerosArticulo(): Promise<string[]> {
  return Object.keys(manifest.articulos).sort((a, b) => Number(a) - Number(b));
}

function esperar(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Ejecuta la consulta con timeout explícito y reintentos limitados.
 * - Fila inexistente (sin error) → null: es un estado legítimo (p. ej. el
 *   Preview construye contra el Supabase de staging, todavía vacío).
 * - Error persistente de red/API → throw: el build debe fallar de forma
 *   visible, nunca degradarse en silencio. El log nunca incluye claves,
 *   URLs ni contenido — solo número de artículo, intento y código de error. */
export async function obtenerArticuloPorNumero(numero: string): Promise<ArticuloVigente | null> {
  let ultimoError = 'desconocido';

  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    try {
      const supabase = createServerSupabaseClient();
      const consulta = supabase
        .from('biblioteca_vectores')
        .select('num_articulo, contenido, fuente')
        .eq('coleccion', COLECCION)
        .eq('materia', MATERIA)
        .eq('es_norma_vigente', true)
        .eq('num_articulo', numero)
        .limit(1)
        .maybeSingle();

      const { data, error } = await Promise.race([
        consulta,
        esperar(TIMEOUT_MS).then(() => ({ data: null, error: { code: 'TIMEOUT', message: `sin respuesta en ${TIMEOUT_MS}ms` } })),
      ]);

      if (!error) {
        if (!data || !data.num_articulo) return null; // sin fila: legítimo (staging vacío)
        return { numArticulo: data.num_articulo, contenido: data.contenido, fuente: data.fuente };
      }

      ultimoError = 'code' in error && error.code ? String(error.code) : 'sin_codigo';
      console.warn(`[articulos-vigentes] art=${numero} intento=${intento}/${MAX_INTENTOS} error=${ultimoError}`);
    } catch {
      ultimoError = 'excepcion';
      console.warn(`[articulos-vigentes] art=${numero} intento=${intento}/${MAX_INTENTOS} error=excepcion`);
    }

    if (intento < MAX_INTENTOS) await esperar(BACKOFF_BASE_MS * intento);
  }

  throw new Error(
    `[articulos-vigentes] Consulta de contenido falló de forma persistente (art=${numero}, ultimo_error=${ultimoError}). `
    + 'Fallo duro deliberado: el build no debe completarse con contenido degradado en silencio.'
  );
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
