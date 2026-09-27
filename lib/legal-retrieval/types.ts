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
