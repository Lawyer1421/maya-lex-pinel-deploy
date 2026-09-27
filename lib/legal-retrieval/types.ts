/**
 * lib/legal-retrieval/types.ts
 * Retrieval v3 — Fase 1A.
 *
 * Tipos base mínimos, preparados para fases futuras del rediseño descrito en
 * MAYALEX_RETRIEVAL_V3_ARCHITECTURE.md. NO están cableados todavía a ninguna
 * función real -- esta fase es solo extracción del resolver determinista
 * (ver exact-resolver.ts), sin cambio de comportamiento. No sobrearquitecturar:
 * solo los tres tipos mínimos pedidos para esta fase.
 */

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
