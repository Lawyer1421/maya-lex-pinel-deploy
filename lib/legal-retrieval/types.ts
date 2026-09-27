/**
 * lib/legal-retrieval/types.ts
 * Retrieval v3 — Fase 1A / 1A.1.
 *
 * Tipos base mínimos, preparados para fases futuras del rediseño descrito en
 * MAYALEX_RETRIEVAL_V3_ARCHITECTURE.md. LegalInstrument/LegalEvidenceStatus/
 * VerificationStatus NO están cableados todavía a ninguna función real -- esta
 * fase es solo extracción del resolver determinista (ver exact-resolver.ts),
 * sin cambio de comportamiento. No sobrearquitecturar.
 *
 * FragmentoRAG y ResultadoRAG son definiciones canónicas, movidas 1:1 desde
 * lib/rag/search.ts. FragmentoRAG se movió en Fase 1A.1 (exact-resolver.ts la
 * necesitaba y antes la importaba de vuelta desde search.ts, cerrando un
 * ciclo). ResultadoRAG se mueve aquí en Fase 1B por la misma razón exacta:
 * semantic-retriever.ts (buscarEnSupabase) la devuelve como tipo de retorno,
 * y search.ts no puede ser el origen de un tipo que legal-retrieval/* necesita
 * sin reabrir el ciclo que Fase 1A.1 cerró. Mismo shape exacto en ambos casos,
 * ningún campo agregado/quitado/renombrado. search.ts re-exporta ambos tipos
 * para mantener la superficie pública histórica.
 */

export interface FragmentoRAG {
  id?: string;
  contenido: string;
  num_articulo: string | null;
  fuente: string;
  relevancia: number;
  fuente_tipo?: string | null;
  jurisdiccion?: string | null;
  es_norma_vigente?: boolean | null;
  /** SHA-256(contenido+num_articulo+fuente) truncado a 8 hex — integridad verificable sin columna DB nueva (P0-4). */
  hash?: string;
}

export interface ResultadoRAG {
  fragmentos: FragmentoRAG[];
  articulos_encontrados: string[];
  backend: 'python' | 'supabase' | 'disabled';
  error?: string;
  /** true cuando la búsqueda exacta encontró el mismo número de artículo en más de un instrumento/materia — no se citó nada para no adivinar. */
  ambiguo?: boolean;
  /**
   * Fase 1D — MAYALEX_RETRIEVAL_RUNTIME_CONTRACT.md. Campo opcional y
   * aditivo: todo consumidor que ya existía antes de esta fase e ignora
   * `outcome` sigue funcionando exactamente igual (no se retira ni se
   * redefine ningún campo existente de ResultadoRAG).
   */
  outcome?: RetrievalOutcome;
}

// ─────────────────────────────────────────────────────────────────────────────
// RETRIEVAL OUTCOME — Fase 1D (primer cambio de comportamiento autorizado)
// ─────────────────────────────────────────────────────────────────────────────
// Invariante central (MAYALEX_RETRIEVAL_RUNTIME_CONTRACT.md §0/§2):
// NO_VERIFIED_EVIDENCE != RETRIEVAL_FAILED. Antes de esta fase, ambos casos
// colapsaban al mismo `fragmentos: []` sin ninguna forma de distinguirlos
// para el gate fail-closed de route.ts. Ver lib/legal-retrieval/retrieval-outcome.ts
// para la lógica de construcción/clasificación -- este archivo solo declara
// la forma.

/** "¿Qué pasó con la ejecución del retrieval?" -- nunca "¿qué es este material?" (eso es evidence-engine.ts). */
export type RetrievalExecutionState =
  | 'NOT_REQUIRED'
  | 'EXACT_SUCCESS'
  | 'SEMANTIC_SUCCESS'
  | 'OFFICIAL_FALLBACK_REQUIRED'
  | 'NO_VERIFIED_EVIDENCE'
  | 'CONFIGURATION_ERROR'
  | 'RETRIEVAL_ERROR';

export type RetrievalErrorCategory =
  | 'CONFIGURATION'
  | 'EMBEDDING'
  | 'DATABASE'
  | 'NETWORK'
  | 'UNKNOWN';

export interface RetrievalOutcome {
  state: RetrievalExecutionState;
  evidenceCount: number;
  exactAttempted: boolean;
  semanticAttempted: boolean;
  /**
   * true solo cuando una degradación de un componente OPCIONAL (ej. rerank
   * Cohere) fue detectada de forma segura. Fase 1D no instrumenta
   * semantic-retriever.ts/rerank.ts (fuera del alcance de archivos
   * autorizados de esta fase) -- por diseño, este campo permanece `false`
   * hoy incluso cuando el rerank sí degrada internamente (ya lo hacía antes
   * de esta fase, de forma resiliente -- ver rag-rerank.test.ts). Detectarlo
   * seguirá siendo `false` mientras no se autorice instrumentar esos
   * archivos; no es un bug de esta fase, es un límite de alcance explícito.
   */
  degraded: boolean;
  errorCategory?: RetrievalErrorCategory;
  /** Código seguro para telemetría -- nunca texto de query, documentos, URLs con secretos ni PII. */
  errorCode?: string;
}

export type VerificationStatus = 'VERIFIED' | 'UNVERIFIED' | 'QUARANTINED';

export type LegalEvidenceStatus =
  | 'FOUND_EXACT'
  | 'FOUND_SEMANTIC'
  | 'AMBIGUOUS_INSTRUMENT'
  | 'REPEALED_MATCH'
  | 'NOT_FOUND';

export interface LegalInstrument {
  instrumentId: string;
  officialTitle: string;
}
