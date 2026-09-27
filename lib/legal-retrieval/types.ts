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
 * FragmentoRAG es la definición canónica, movida 1:1 desde lib/rag/search.ts
 * (Fase 1A.1 -- ruptura de dependencia circular: exact-resolver.ts la
 * necesitaba y antes la importaba de vuelta desde search.ts, cerrando un
 * ciclo). Mismo shape exacto, ningún campo agregado/quitado/renombrado.
 * search.ts re-exporta este tipo para mantener la superficie pública histórica.
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
