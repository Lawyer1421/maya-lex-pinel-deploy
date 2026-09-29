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
  /**
   * TYPED DEBT (recorded, not fixed, per Mission LR-K3 §7 — Cursor finding):
   * this should ideally be `InstrumentoNormalizado | null` (lib/rag/search.ts),
   * matching the stricter typing LR-K3's CanonicalLegalReference-based types
   * now use. Left as `string | null` here deliberately, to avoid reopening
   * LR-K2 (already independently reviewed and gated PASS) for a change with
   * no current behavioral effect — CitationTrustRecord has no runtime
   * consumer yet. Tighten this the next time LR-K2 itself is revised for a
   * substantive reason, not as an incidental side effect of LR-K3.
   */
  instrumento: string | null;
  articulo: string | null;
  fuente: string;
  documentVersion: string | null;
  versionStatus: DocumentVersionStatus;
  verificationState: CitationVerificationState;
  /** SHA-256 (or equivalent) of underlying content, when available -- mirrors Cita.hash. */
  hash?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// LR-K3 — LEGAL PROPOSITION + NORMATIVE RULE
// ─────────────────────────────────────────────────────────────────────────────
//
// Binding distinction (see architecture doc, updated for LR-K3):
//   CaseFact != LegalProposition != NormativeRule != Conclusion
// A CanonicalLegalReference is a LOCATOR (instrumento + articulo) -- it is
// NOT automatically a legal rule. ARTICLE != NORMATIVE RULE: one article may
// contain multiple rules; one rule may depend on multiple sources; an
// exception is never the same object as the rule it qualifies.
//
// New constitutional invariants for this phase:
//   VIII. SOURCE VERIFICATION != LEGAL CORRECTNESS.
//   IX.   VALID STRUCTURE != VERIFIED EVIDENCE.
// Neither this file nor its validators ever assert that a proposition's
// INTERPRETATION of a source is legally correct -- only that the source is
// traceable and, where claimed, that citation identity/provenance resolves
// (LR-K2). A PARAPHRASED or INTERPRETIVE proposition can be structurally
// valid and even carry a VERIFIED source while still being a legally
// incorrect reading of that source -- this layer has no way to know that,
// and does not pretend to.
//
// This module does NOT implement automatic article→rule extraction, does
// NOT call an LLM, and does NOT implement Subsumption/ApplicableRule -- see
// docs/architecture/LR-1_LEGAL_REASONING.md §7-8 for what remains
// design-only.

import type { CanonicalLegalReference } from '@/lib/exequatur/curriculum/types';
export type { CanonicalLegalReference };

/** Shared by LegalProposition and NormativeRule -- deliberately no DISCOVERY_ONLY value here (that's a Citation Trust I concept, not a proposition/rule concept). */
export type LegalVerificationStatus = 'VERIFIED' | 'PARTIAL' | 'UNRESOLVED';

/**
 * TEXTUAL: literal quotation of source text. PARAPHRASED: a restatement,
 * not the source's own words. INTERPRETIVE: a reading/inference about what
 * the source means, beyond restating it. These must never collapse into one
 * another -- a PARAPHRASED or INTERPRETIVE proposition remains visibly
 * distinct from literal source text regardless of how confident it sounds.
 */
export type PropositionType = 'TEXTUAL' | 'PARAPHRASED' | 'INTERPRETIVE';

export interface LegalProposition {
  id: string;
  proposition: string;
  /** Never empty -- invariant "no rule may exist without source traceability" applies equally here: a proposition attributed to nothing is not a legal proposition. */
  sources: CanonicalLegalReference[];
  /** Identity/provenance records for the sources above (LR-K2). May be empty only when verificationStatus is UNRESOLVED. */
  citationTrust: CitationTrustRecord[];
  propositionType: PropositionType;
  /**
   * VERIFIED means source support is verified under THIS shadow layer's
   * contract (invariant VIII) -- sources present AND at least one
   * citationTrust entry independently confirmed (see
   * esAutoritativaVerificada, LR-K2). It NEVER means the proposition's
   * interpretation of that source is legally correct.
   */
  verificationStatus: LegalVerificationStatus;
  notes?: string;
}

export type RuleType =
  | 'DEFINITION' | 'REQUIREMENT' | 'PROHIBITION' | 'PERMISSION' | 'OBLIGATION'
  | 'PRESUMPTION' | 'EXCEPTION' | 'DEADLINE' | 'COMPETENCE' | 'PROCEDURAL_RULE' | 'LEGAL_CONSEQUENCE';

export interface RuleElement {
  id: string;
  description: string;
  required: boolean;
  // Deliberately NO satisfied/unsatisfied/missing here -- that is
  // Subsumption's job (LR-K4, not this phase). An element only describes
  // WHAT is required, never whether any case satisfies it.
}

/**
 * An exception is its own object, never merged into the main rule's
 * elements. It may cite a different source entirely (source?) and/or
 * reference a specific LegalProposition (propositionId?) -- both optional,
 * since an exception may be known only by description at this shadow layer.
 */
export interface RuleException {
  id: string;
  description: string;
  source?: CanonicalLegalReference;
  propositionId?: string;
}

export interface NormativeRule {
  id: string;
  /** LegalProposition ids this rule was derived from -- never inline proposition text (avoids duplicating/desyncing from the proposition's own record). */
  propositionIds: string[];
  /** Never empty -- a rule with no source is not traceable (invariant: "no rule may exist without source traceability"). May span multiple sources/instruments -- ARTICLE != RULE is not 1:1. */
  sources: CanonicalLegalReference[];
  ruleType: RuleType;
  /** Always an array, may be empty -- see validarNormativeRule for the explicit contract on what an empty array means per ruleType. */
  elements: RuleElement[];
  exceptions: RuleException[];
  verificationStatus: LegalVerificationStatus;
  // Deliberately NO caseFacts, NO subsumption fields, NO conclusion, NO
  // strategy, NO jurisprudential treatment -- all out of scope for LR-K3.
}
