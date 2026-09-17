/**
 * lib/exequatur/canonical-reference-adapter.ts
 *
 * CanonicalLegalReferenceAdapter -- resuelve una CanonicalLegalReference del
 * currículo Exequátur contra la recuperación jurídica real de MayaLex
 * (lib/rag/search.ts), sin inventar identidad legal permanente y sin
 * duplicar texto legal en el repositorio.
 *
 * Mismo patrón de "adaptador temporal, no solución final" que
 * lib/paypal/access.ts (resolveCurrentAccess): esta función es el único
 * punto que traduce {instrumento, articulo} a evidencia real. Si
 * ADR-001 se implementa físicamente más adelante, solo este archivo debería
 * necesitar cambiar.
 *
 * Reglas fail-closed (obligatorias, ninguna se relaja):
 *  - Resultado ambiguo (`ambiguo === true`) -> NO_VERIFICADO. Nunca se elige
 *    un candidato al azar entre varios posibles.
 *  - Sin fragmentos -> NO_VERIFICADO. Nunca se sintetiza contenido.
 *  - Cualquier excepción (Supabase no disponible, etc.) -> NO_VERIFICADO.
 *  - El adaptador NUNCA afirma vigencia por sí mismo: `es_norma_vigente` de
 *    la fila se expone tal cual como dato informativo del corpus
 *    (`vigenciaSegunCorpus`), nunca como una conclusión propia del
 *    adaptador ni de la UI que lo consume.
 *  - El `id`/chunk de la fila de `biblioteca_vectores` nunca se expone ni
 *    se persiste aquí -- no se establece como identidad canónica.
 */
import { buscarArticuloExacto } from '@/lib/rag/search';
import type { CanonicalLegalReference } from './curriculum/types';

export type CanonicalReferenceResolution =
  | {
      estado: 'RESUELTO';
      referencia: CanonicalLegalReference;
      contenido: string;
      fuente: string;
      numArticulo: string | null;
      /** Dato informativo tal cual del corpus -- el adaptador no infiere ni afirma vigencia. */
      vigenciaSegunCorpus: boolean | null;
    }
  | {
      estado: 'NO_VERIFICADO';
      referencia: CanonicalLegalReference;
      motivo: string;
    };

/**
 * Resuelve una única referencia legal del currículo contra evidencia real.
 * Fail-closed: cualquier ambigüedad, ausencia de evidencia, o error de
 * infraestructura produce NO_VERIFICADO -- nunca contenido fabricado.
 */
export async function resolverReferenciaLegal(
  referencia: CanonicalLegalReference,
): Promise<CanonicalReferenceResolution> {
  try {
    const resultado = await buscarArticuloExacto(referencia.articulo, null, referencia.instrumento);

    if (resultado.ambiguo) {
      return {
        estado: 'NO_VERIFICADO',
        referencia,
        motivo: 'Referencia ambigua en el corpus -- más de un candidato posible, no se puede citar con certeza.',
      };
    }

    const fragmento = resultado.fragmentos[0];
    if (!fragmento) {
      return {
        estado: 'NO_VERIFICADO',
        referencia,
        motivo: 'No se encontró evidencia de esta referencia en el corpus jurídico actual.',
      };
    }

    return {
      estado: 'RESUELTO',
      referencia,
      contenido: fragmento.contenido,
      fuente: fragmento.fuente,
      numArticulo: fragmento.num_articulo,
      vigenciaSegunCorpus: fragmento.es_norma_vigente ?? null,
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
