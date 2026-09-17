/**
 * lib/exequatur/canonical-reference-adapter.ts
 *
 * CanonicalLegalReferenceAdapter -- resuelve una CanonicalLegalReference del
 * currículo Exequátur contra la recuperación jurídica real de MayaLex, sin
 * inventar identidad legal permanente y sin duplicar texto legal en el
 * repositorio.
 *
 * Mismo patrón de "adaptador temporal, no solución final" que
 * lib/paypal/access.ts (resolveCurrentAccess): esta función es el único
 * punto que traduce {instrumento, articulo} a evidencia real. Si
 * ADR-001 se implementa físicamente más adelante, solo este archivo debería
 * necesitar cambiar.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * P1 (Cursor, revisión dirigida sobre 0abaf08 -- CANONICAL_BOUNDARY_VERDICT
 * = FAIL_UNIQUENESS): el camino heredado (buscarArticuloExacto /
 * resolverArticuloExacto en lib/rag/search.ts) filtra candidatos válidos
 * pero, cuando sobreviven varias filas de la MISMA materia, hace
 * `limpias.slice(0, 1)` y reporta `ambiguo: false` -- es decir, puede
 * promover una fila dependiente del orden de retorno de la base de datos a
 * "resuelta" sin que el llamador tenga forma de saber que había más de un
 * candidato. Eso viola el límite canónico de Exequátur: ninguna cita debe
 * depender de un orden no garantizado.
 *
 * Ese primitivo compartido (lib/rag/search.ts) es usado por producción para
 * /api/chat y no se modifica aquí -- cambiar su comportamiento expandiría la
 * superficie de regresión más allá de esta slice. En su lugar, este archivo
 * deja de llamar a buscarArticuloExacto/resolverArticuloExacto para el
 * camino de resolución y en su lugar:
 *   1) consulta `biblioteca_vectores` directamente (misma tabla, mismas
 *      columnas, mismo patrón de consulta vigente-primero-luego-no-vigente
 *      que consultarPorVigencia en lib/rag/search.ts -- privada ahí, no
 *      exportada, así que se reimplementa aquí, localmente, sin tocar ese
 *      archivo);
 *   2) filtra candidatos con los MISMOS tres predicados puros ya exportados
 *      por lib/rag/search.ts (contieneArtefactoAnonimizacion,
 *      tieneEncabezadoArticulo/tieneIdentidadSinEncabezado,
 *      identidadDocumentalCoincide) -- se reutiliza su definición de
 *      "candidato válido" tal cual, sin reinterpretarla;
 *   3) antes de descartar nada, decide unicidad sobre el conjunto COMPLETO
 *      de candidatos supervivientes -- ver representanLaMismaAutoridad.
 * Este es el "read-only retrieval extension" más pequeño posible que
 * resuelve el P1 sin alterar lib/rag/search.ts ni su superficie pública.
 *
 * Regla de equivalencia (documentada y probada en
 * tests/exequatur-canonical-reference-adapter.test.ts): dos filas físicas se
 * tratan como la MISMA autoridad legal solo si su contenido normalizado, su
 * `fuente`, y su `es_norma_vigente` son los tres idénticos. Nunca se
 * equiparan por compartir solo número de artículo, materia, patrón de id, o
 * similitud vectorial -- ninguna de esas señales se usa para esto.
 *
 * Resultado de unicidad -> resolución:
 *   0 candidatos válidos                                -> NO_VERIFICADO
 *   1 candidato válido                                  -> RESUELTO
 *   ≥2 candidatos, todos equivalentes entre sí           -> RESUELTO (el primero, da igual cuál -- son la misma autoridad)
 *   ≥2 candidatos, no todos equivalentes (no probado)     -> NO_VERIFICADO
 *   fallo de infraestructura/consulta                     -> NO_VERIFICADO
 * Sin "primera fila gana", sin heurística, sin arbitraje por LLM.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Reglas fail-closed (obligatorias, ninguna se relaja):
 *  - El adaptador NUNCA afirma vigencia por sí mismo: `es_norma_vigente` de
 *    la fila se expone tal cual como dato informativo del corpus
 *    (`vigenciaSegunCorpus`), nunca como una conclusión propia del
 *    adaptador ni de la UI que lo consume. RESUELTO significa "se resolvió
 *    evidencia del corpus legal", NUNCA "la vigencia fue verificada de
 *    forma independiente" -- ver P2, misma revisión.
 *  - El `id`/chunk de la fila de `biblioteca_vectores` nunca se expone ni
 *    se persiste aquí -- no se establece como identidad canónica.
 */
import {
  contieneArtefactoAnonimizacion,
  identidadDocumentalCoincide,
  tieneEncabezadoArticulo,
  tieneIdentidadSinEncabezado,
  type FilaExactaDB,
  type InstrumentoNormalizado,
} from '@/lib/rag/search';
import type { CanonicalLegalReference } from './curriculum/types';

export type CanonicalReferenceResolution =
  | {
      estado: 'RESUELTO';
      referencia: CanonicalLegalReference;
      contenido: string;
      fuente: string;
      numArticulo: string | null;
      /**
       * Dato informativo tal cual del corpus -- el adaptador no infiere ni
       * afirma vigencia. RESUELTO != vigencia verificada de forma
       * independiente; este campo es la única señal de vigencia disponible,
       * heredada de la ingesta, nunca una conclusión propia.
       */
      vigenciaSegunCorpus: boolean | null;
    }
  | {
      estado: 'NO_VERIFICADO';
      referencia: CanonicalLegalReference;
      motivo: string;
    };

/**
 * Reimplementación local, de solo lectura, de la consulta privada
 * `consultarPorVigencia` de lib/rag/search.ts -- mismas columnas, misma
 * tabla, mismos filtros (num_articulo, fuente_tipo='codigo',
 * es_norma_vigente). Se duplica aquí en vez de exportar la función
 * original porque exportarla sería modificar un primitivo compartido
 * (fuera de alcance de este delta) -- ver nota P1 arriba. Sin filtro de
 * materia: a diferencia del chat, el currículo nunca tiene una materia
 * "detectada" que optimizar -- se necesita el conjunto completo de
 * candidatos por instrumento/número para poder decidir unicidad.
 */
async function consultarFilasPorVigencia(numero: string, esNormaVigente: boolean): Promise<FilaExactaDB[]> {
  const { createServerSupabaseClient } = await import('@/lib/supabase');
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('biblioteca_vectores')
    .select('id, contenido, num_articulo, fuente, fuente_tipo, jurisdiccion, es_norma_vigente, materia, metadata')
    .eq('num_articulo', numero)
    .eq('fuente_tipo', 'codigo')
    .eq('es_norma_vigente', esNormaVigente);
  if (error || !data) return [];
  return data as FilaExactaDB[];
}

/** Los mismos tres filtros de resolverArticuloExacto (lib/rag/search.ts), reutilizados tal cual -- ninguno relajado ni reinterpretado. */
function esCandidatoValido(row: FilaExactaDB, numero: string, instrumento: InstrumentoNormalizado): boolean {
  if (contieneArtefactoAnonimizacion(row.contenido)) return false;
  const tieneEvidenciaTextual =
    tieneEncabezadoArticulo(row.contenido, numero) || tieneIdentidadSinEncabezado(row, numero, instrumento);
  if (!tieneEvidenciaTextual) return false;
  return identidadDocumentalCoincide(row, instrumento);
}

function normalizarContenido(contenido: string): string {
  return contenido.trim().replace(/\s+/g, ' ');
}

/**
 * Regla de identidad determinística documentada: dos filas representan la
 * MISMA autoridad legal solo si su contenido normalizado, fuente, y
 * es_norma_vigente son los tres idénticos. Deliberadamente NO se usa: número
 * de artículo (ya es el criterio de búsqueda, no distingue nada), materia,
 * patrón de id/chunk, ni similitud vectorial.
 */
function representanLaMismaAutoridad(a: FilaExactaDB, b: FilaExactaDB): boolean {
  return (
    normalizarContenido(a.contenido) === normalizarContenido(b.contenido) &&
    a.fuente === b.fuente &&
    a.es_norma_vigente === b.es_norma_vigente
  );
}

/** true si TODAS las filas del conjunto son, dos a dos, la misma autoridad legal -- el orden del arreglo nunca importa. */
function todosEquivalentes(filas: FilaExactaDB[]): boolean {
  if (filas.length === 0) return false;
  return filas.every((f) => representanLaMismaAutoridad(filas[0], f));
}

type ResultadoUnicidad =
  | { estado: 'VACIO' }
  | { estado: 'UNICO'; fila: FilaExactaDB }
  | { estado: 'MULTIPLE_NO_PROBADO' };

/**
 * Igual que buscarArticuloExacto: intenta vigente primero, y solo si no hay
 * ningún candidato vigente válido, intenta no-vigente (GAP 2 -- artículos
 * derogados confirmados). La diferencia es que aquí se conserva el
 * CONJUNTO COMPLETO de candidatos válidos antes de decidir, en vez de
 * truncar a 1 antes de que el llamador pueda evaluar unicidad.
 */
async function resolverCandidatosUnicos(
  numero: string,
  instrumento: InstrumentoNormalizado,
): Promise<ResultadoUnicidad> {
  const filasVigentes = await consultarFilasPorVigencia(numero, true);
  const candidatosVigentes = filasVigentes.filter((f) => esCandidatoValido(f, numero, instrumento));

  const candidatos =
    candidatosVigentes.length > 0
      ? candidatosVigentes
      : (await consultarFilasPorVigencia(numero, false)).filter((f) => esCandidatoValido(f, numero, instrumento));

  if (candidatos.length === 0) return { estado: 'VACIO' };
  if (candidatos.length === 1) return { estado: 'UNICO', fila: candidatos[0] };
  if (todosEquivalentes(candidatos)) return { estado: 'UNICO', fila: candidatos[0] };
  return { estado: 'MULTIPLE_NO_PROBADO' };
}

/**
 * Resuelve una única referencia legal del currículo contra evidencia real.
 * Fail-closed: cero candidatos, candidatos múltiples sin identidad probada
 * de forma determinística, o cualquier error de infraestructura producen
 * NO_VERIFICADO -- nunca contenido fabricado, nunca un candidato elegido al
 * azar o por orden de base de datos.
 */
export async function resolverReferenciaLegal(
  referencia: CanonicalLegalReference,
): Promise<CanonicalReferenceResolution> {
  try {
    const resultado = await resolverCandidatosUnicos(referencia.articulo, referencia.instrumento);

    if (resultado.estado === 'VACIO') {
      return {
        estado: 'NO_VERIFICADO',
        referencia,
        motivo: 'No se encontró evidencia de esta referencia en el corpus jurídico actual.',
      };
    }

    if (resultado.estado === 'MULTIPLE_NO_PROBADO') {
      return {
        estado: 'NO_VERIFICADO',
        referencia,
        motivo:
          'Existen múltiples candidatos en el corpus para esta referencia y no se puede probar de forma determinística que representen la misma autoridad legal -- no se elige ninguno por orden ni por heurística.',
      };
    }

    const fila = resultado.fila;
    return {
      estado: 'RESUELTO',
      referencia,
      contenido: fila.contenido,
      fuente: fila.fuente,
      numArticulo: fila.num_articulo,
      vigenciaSegunCorpus: fila.es_norma_vigente ?? null,
    };
  } catch (err) {
    console.error(
      '[exequatur/canonical-reference-adapter] Error resolviendo referencia -- fail-closed (NO_VERIFICADO):',
      err instanceof Error ? err.message : err,
    );
    return {
      estado: 'NO_VERIFICADO',
      referencia,
      motivo: 'No se pudo verificar esta referencia en este momento.',
    };
  }
}

/** Resuelve varias referencias en paralelo -- cada una fail-closed de forma independiente. */
export async function resolverReferenciasLegales(
  referencias: CanonicalLegalReference[],
): Promise<CanonicalReferenceResolution[]> {
  return Promise.all(referencias.map(resolverReferenciaLegal));
}
