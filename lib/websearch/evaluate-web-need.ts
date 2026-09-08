/**
 * lib/websearch/evaluate-web-need.ts
 *
 * Función pura, determinista, para evaluar si se necesita búsqueda web oficial
 * después de que RAG haya sido evaluado.
 *
 * Parte de la orquestación secuencial:
 * RAG → await result → evaluateNeedForOfficialWeb() → opcional Tavily → compose
 *
 * NO es una decisión del cliente (webSearch flag): es una decisión del servidor
 * basada en qué recuperó RAG y qué exige la consulta.
 */

import type { FragmentoRAG } from '@/lib/rag/search';

/**
 * Evalúa si una búsqueda web oficial (Tavily, oficialmente restringida) es
 * apropiada después de intentar RAG.
 *
 * Retorna true solo cuando:
 * 1. RAG fue intentado (ragWasAttempted=true), Y
 * 2. La consulta exige evidencia de corpus (requiereCorpusEvidencia=true), Y
 * 3. RAG no recuperó suficiente evidencia verificable:
 *    - Cero fragmentos, O
 *    - Solo fragmentos con provenance no resuelto (fuente=null o doc_*)
 *
 * Retorna false en todos los demás casos:
 * - Si RAG no fue intentado (RUTA_D): never web
 * - Si consulta no exige evidencia: no necesita verificación oficial
 * - Si RAG recuperó evidencia con provenance verificado: confiar en RAG
 */
export function evaluateNeedForOfficialWeb(
  ragFragments: FragmentoRAG[],
  requiereCorpusEvidencia: boolean,
  ragWasAttempted: boolean,
): boolean {
  // RAG no fue intentado (RUTA_D) → sin web
  if (!ragWasAttempted) return false;

  // Consulta no exige evidencia verificable → sin necesidad de web
  if (!requiereCorpusEvidencia) return false;

  // Si RAG recuperó fragmentos, verificar si tienen fuente identificada
  if (ragFragments.length > 0) {
    // Buscar al menos UN fragmento con fuente identificada
    // NOTA: tieneFuenteIdentificada ≠ OFFICIAL_VERIFIED
    // Solo verifica que el origen es identificable, no que es oficialmente verificado
    const tieneFuenteId = ragFragments.some(tieneFuenteIdentificada);
    // Si hay al menos una fuente identificable, confiar en RAG (requiere verificación manual posterior)
    if (tieneFuenteId) return false;

    // Todos los fragmentos sin fuente identificada → web para verificación
    return true;
  }

  // RAG vacío + evidencia exigida → buscar oficial
  return true;
}

/**
 * Determina si un fragmento tiene la FUENTE IDENTIFICADA.
 *
 * IMPORTANTE: Esto NO es equivalente a OFFICIAL_VERIFIED.
 * Solo verifica que existe un origen identificable.
 *
 * Un fragmento tiene "fuente identificada" si:
 * - fuente NO es null/vacío
 * - fuente NO comienza con "doc_" (pendiente de clasificación)
 * - fuente.trim() > 0 (no es string vacío)
 *
 * Para OFFICIAL_VERIFIED, se requiere verificación adicional de la autoridad.
 */
export function tieneFuenteIdentificada(f: FragmentoRAG): boolean {
  return Boolean(
    f.fuente &&
    !f.fuente.startsWith('doc_') &&
    f.fuente.trim().length > 0
  );
}

/**
 * Cuenta cuántos fragmentos tienen fuente identificada.
 */
export function contarFuenteIdentificada(fragmentos: FragmentoRAG[]): number {
  return fragmentos.filter(tieneFuenteIdentificada).length;
}

// Backward compatibility aliases (deprecated)
export const tieneProvenanceResuelto = tieneFuenteIdentificada;
export const contarProvenanceResuelto = contarFuenteIdentificada;
