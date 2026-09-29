/**
 * lib/legal-reasoning/types.ts
 *
 * LR-K1 (CaseFact/MissingFact provenance) + LR-K2 (Citation Trust I:
 * identity/provenance only). See docs/architecture/LR-1_LEGAL_REASONING.md
 * for the full canonical design, invariants, and everything NOT implemented
 * here (TemporalLegalState, Authority, Jurisprudence, NormativeRule,
 * Subsumption, Conclusions — design-only in this phase).
 *
 * SHADOW / STRUCTURAL ONLY: nothing in this module is imported by
 * app/api/chat/route.ts, any system prompt, or any response-formatting
 * code. No user-facing behavior depends on this file.
 */

// ─────────────────────────────────────────────────────────────────────────────
// LR-K1 — CASE FACT
// ─────────────────────────────────────────────────────────────────────────────
//
// Constitutional invariant I (see architecture doc): no fact without
// origin. A CaseFact belongs to the client's matter -- never to the law
// (that's LegalProposition/NormativeRule, design-only, §3/§7 of the doc).
// There is deliberately no 'SOURCE_FACT' origin here.

export type CaseFactOrigin = 'USER_STATEMENT' | 'USER_DOCUMENT' | 'PROCEDURAL_RECORD';

// Deliberately NO 'ASSUMED' value. If the system infers something beyond
// what was stated, it must become an ExplicitInference (below), never a
// CaseFact with a status implying it was established. validarCaseFact()
// additionally rejects the literal "ASSUMED" at runtime, not just via the
// type system, since a status could arrive as an unchecked string (e.g.
// parsed from an LLM extraction) that bypasses static typing.
export type CaseFactStatus = 'ALLEGED' | 'ADMITTED' | 'DISPUTED' | 'DOCUMENTED' | 'PROVEN' | 'UNKNOWN';

export interface CaseFact {
  id: string;
  proposition: string;
  origin: CaseFactOrigin;
  status: CaseFactStatus;
  /** Document/page/record reference, when origin is USER_DOCUMENT or PROCEDURAL_RECORD. */
  locator?: string;
}

export interface MissingFact {
  id: string;
  description: string;
  /**
   * ids (or stable descriptions) of the conclusions this gap blocks. Always
   * an array -- may be empty (a gap noted but not yet linked to a specific
   * conclusion), never absent. A MissingFact that blocks nothing is still a
   * MissingFact, not silently dropped.
   */
  blocksConclusions: string[];
}

/**
 * Design-for-future per the M1.5/LR-K0 directive: if the system infers
 * something beyond what was directly stated, that inference must be an
 * explicit, separately-typed object -- never a hidden CaseFact. Kept
 * minimal (no validator yet) per "do not overbuild unless required by
 * dependencies" -- no current consumer needs more than this shape.
 */
export interface ExplicitInference {
  proposition: string;
  /** CaseFact ids (or, later, NormativeRule ids) this inference derives from. */
  basedOn: string[];
  reason: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// LR-K2 — CITATION TRUST I (identity/provenance verification only)
// ─────────────────────────────────────────────────────────────────────────────
//
// Answers "is this citation's identity/provenance real?" -- NEVER "does the
// source support the proposition attributed to it" (Citation Trust II,
// LR-K6, not started -- see architecture doc §6.3). Extends the existing
// `Cita` (lib/legal-retrieval/evidence-engine.ts) conceptually; does not
// modify or replace it.

export type CitationVerificationState = 'VERIFIED' | 'PARTIAL' | 'UNRESOLVED' | 'DISCOVERY_ONLY';

/**
 * Deliberately separate from CitationVerificationState: `documentVersion`
 * is an IDENTIFIER (which version a citation claims to be), never itself a
 * verification claim. `versionStatus` is whether THAT identified version
 * has actually been confirmed. Conflating them would let a citation "sound
 * precise" (has a version string) while being entirely unverified.
 */
export type DocumentVersionStatus = 'VERIFIED' | 'UNVERIFIED';

export interface CitationTrustRecord {
  /** Legal proposition this citation is attached to -- free text; NOT verified here (Citation Trust II). */
  proposition: string;
  /** InstrumentoNormalizado value where applicable (lib/rag/search.ts) -- reused, not reinvented. */
  instrumento: string | null;
  articulo: string | null;
  fuente: string;
  documentVersion: string | null;
  versionStatus: DocumentVersionStatus;
  verificationState: CitationVerificationState;
  /** SHA-256 (or equivalent) of underlying content, when available -- mirrors Cita.hash. */
  hash?: string;
}
