/**
 * lib/legal-reasoning/types.ts
 *
 * LR-K1 (CaseFact/MissingFact provenance) + LR-K2 (Citation Trust I:
 * identity/provenance only) + LR-K3 (LegalProposition/NormativeRule) +
 * LR-K4 (generic Subsumption contract) + LR-K5 (Conclusion Traceability,
 * LEGAL_CONCLUSION only). See docs/architecture/LR-1_LEGAL_REASONING.md for
 * the full canonical design, invariants, and everything still NOT
 * implemented (TemporalLegalState, Authority, Jurisprudence, Citation Trust
 * II, PROCEDURAL_CONCLUSION/STRATEGIC_ASSESSMENT reasoning — design-only).
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

// ─────────────────────────────────────────────────────────────────────────────
// LR-K4 — GENERIC SUBSUMPTION CONTRACT
// ─────────────────────────────────────────────────────────────────────────────
//
// Answers structurally: "given NormativeRule R, how do supplied CaseFacts map
// against its elements and exceptions?" It NEVER answers whether R legally
// applies, is current, outranks a competing rule, or supports a final
// conclusion -- those are later layers (Authority/Temporal engine, LR-K5+),
// not this one. SUBSUMPTION != LEGAL APPLICABILITY (invariant XII).
//
// New constitutional invariants for this phase:
//   X.    NO ELEMENT ASSESSMENT WITHOUT TRACE.
//   XI.   NO MISSING FACT MAY BE SILENTLY ASSUMED.
//   XII.  SUBSUMPTION != LEGAL APPLICABILITY.
//   XIII. UNKNOWN != UNSATISFIED.
//   XIV.  AN EXCEPTION MUST BE ANALYZED SEPARATELY FROM THE MAIN RULE.
//
// Generic-first (binding, §6 of the LR-K4 directive): ONE contract, usable
// by civil, penal, mercantil, notarial, administrativo, constitucional,
// laboral, tributario or any future matter. There is no PenalSubsumption or
// CivilSubsumption parent type -- MAYA_PENAL_MODULES's six-layer method
// remains a future matter-specific adapter OVER this generic contract, never
// the other way around.
//
// This module does NOT call an LLM, does NOT use embeddings or semantic
// similarity, and does NOT implement automatic fact-to-element mapping --
// see validators.ts for the deterministic, structural-only validation that
// is this phase's entire objective. Fixtures instantiate assessments
// manually; nothing here decides "fact F1 satisfies element E1" on its own.

/**
 * SATISFIED requires an affirmative factual trace (invariant X).
 * UNSATISFIED requires a factual trace showing non-fulfillment or
 * contradiction -- it is NEVER the default for "no fact was supplied"
 * (invariant XIII: UNKNOWN != UNSATISFIED). UNKNOWN is the only honest
 * status when the factual record is insufficient to decide either way; it
 * must never be represented as UNSATISFIED, and never masquerades as
 * resolved.
 */
export type ElementAssessmentStatus = 'SATISFIED' | 'UNSATISFIED' | 'UNKNOWN';

export interface RuleElementAssessment {
  /** Must reference a RuleElement.id belonging to the NormativeRule this Subsumption targets -- never an orphan id. */
  elementId: string;
  status: ElementAssessmentStatus;
  /** Required (non-empty) when status is SATISFIED -- invariant X. Every id must be a CaseFact explicitly declared in this Subsumption's caseFactIds, never borrowed from elsewhere. */
  supportingFactIds: string[];
  /** Required (non-empty) when status is UNSATISFIED -- an affirmative factual basis, never inferred from mere absence of support. */
  contradictingFactIds: string[];
  /** Optional even when status is UNKNOWN -- a gap may be noted without yet being linked to a specific MissingFact. */
  missingFactIds: string[];
  reasoningNote?: string;
}

/**
 * Deliberately separate from ElementAssessmentStatus: an exception is a
 * distinct legal question ("does the exception apply?"), never a fourth
 * element folded into the main rule's checklist (invariant XIV).
 */
export type ExceptionAssessmentStatus = 'APPLIES' | 'DOES_NOT_APPLY' | 'UNKNOWN';

export interface RuleExceptionAssessment {
  /** Must reference a RuleException.id belonging to the NormativeRule this Subsumption targets. */
  exceptionId: string;
  status: ExceptionAssessmentStatus;
  /** Required (non-empty) when status is APPLIES. */
  supportingFactIds: string[];
  /** Required (non-empty) when status is DOES_NOT_APPLY. */
  contradictingFactIds: string[];
  missingFactIds: string[];
}

/**
 * COMPLETE/INCOMPLETE/BLOCKED describe STRUCTURAL completeness of the
 * mapping only -- never a legal verdict. See validarSubsumption /
 * derivarAnalysisStatusSubsuncion for the exact, enforced derivation:
 *   COMPLETE   -- every required element AND every exception is resolved
 *                 (not UNKNOWN).
 *   BLOCKED    -- at least one exception is UNKNOWN. An unresolved
 *                 exception is treated as more fundamental than an
 *                 unresolved element: if the rule might not even operate,
 *                 "incomplete" understates the gap.
 *   INCOMPLETE -- no exception is UNKNOWN, but at least one required
 *                 element is UNKNOWN.
 * COMPLETE never means: claim succeeds, offense established, contract
 * valid, plaintiff wins, defendant liable, or any right exists. It means
 * only that this shadow layer's structural bookkeeping is finished.
 */
export type SubsumptionAnalysisStatus = 'COMPLETE' | 'INCOMPLETE' | 'BLOCKED';

export interface Subsumption {
  id: string;
  /** Must equal the NormativeRule.id this Subsumption was built against. */
  ruleId: string;
  /** The full declared fact set for this analysis -- every fact any assessment references must appear here (and be a real CaseFact) or be rejected as orphaned. */
  caseFactIds: string[];
  missingFactIds: string[];
  /** Must cover every REQUIRED RuleElement of the referenced rule -- see validarSubsumption. Optional elements may be omitted. */
  elementAssessments: RuleElementAssessment[];
  /** Must cover every RuleException of the referenced rule, with no exception -- unlike elements, no exception is ever "optional" to assess (invariant XIV). */
  exceptionAssessments: RuleExceptionAssessment[];
  analysisStatus: SubsumptionAnalysisStatus;
  /** Required-element ids whose assessment is UNKNOWN or missing -- derived, cross-checked by the validator, never asserted freely. */
  unresolvedElementIds: string[];
  // Deliberately NO finalConclusion, legalConclusion, proceduralConclusion,
  // strategicAssessment, recommendedAction, probability, or
  // confidenceScore -- all out of scope for LR-K4.
}

// ─────────────────────────────────────────────────────────────────────────────
// LR-K5 — CONCLUSION TRACEABILITY CONTRACT
// ─────────────────────────────────────────────────────────────────────────────
//
// Moves "the model reached conclusion X" to "the system can show exactly why
// X exists, what supports it, what limits it, and what remains unresolved."
// A ConclusionTrace REFERENCES one or more Subsumption records -- it never
// recreates element-level reasoning inside itself (§12 of the directive).
//
// New constitutional invariants for this phase:
//   XV.   NO CONCLUSION WITHOUT TRACE.
//   XVI.  A BLOCKED CONCLUSION IS A VALID RESULT.
//   XVII. NO CONCLUSION MAY HIDE AN UNRESOLVED REQUIRED ELEMENT.
//   XVIII.NO CONCLUSION MAY UPGRADE FACTUAL STATUS.
//   XIX.  NO CONCLUSION MAY UPGRADE SOURCE OR RULE VERIFICATION STATUS.
//   XX.   STRUCTURAL CONCLUSION COMPLETENESS != LEGAL CORRECTNESS.
//
// Only LEGAL_CONCLUSION receives full validator support in this phase.
// PROCEDURAL_CONCLUSION and STRATEGIC_ASSESSMENT exist in the type system
// (so a future phase doesn't need to redesign ConclusionType) but are NOT
// populated, evaluated, or treated as implemented reasoning layers here --
// validarConclusionTrace explicitly refuses to process them (see
// validators.ts), rather than silently half-validating. This is intentional
// design-for-future, not an oversight.

export type ConclusionType = 'LEGAL_CONCLUSION' | 'PROCEDURAL_CONCLUSION' | 'STRATEGIC_ASSESSMENT';

/**
 * Structural completeness of the TRACE, never a legal outcome (invariant
 * XX). SUPPORTED never means legally correct, prevailing, binding, current
 * law, or that a court outcome is guaranteed -- only that every referenced
 * Subsumption is itself COMPLETE and nothing is left unaccounted for.
 * BLOCKED is a fully valid, final result in this contract (invariant XVI) --
 * it is never something to "fix" by forcing SUPPORTED or hiding the
 * blocker. Deliberately excludes WIN/LOSE/GUILTY/NOT_GUILTY/VALID/INVALID/
 * LIABLE/NOT_LIABLE and any synonym of them.
 */
export type ConclusionStatus = 'SUPPORTED' | 'PARTIAL' | 'BLOCKED' | 'UNRESOLVED';

export type ConclusionBlockerType =
  | 'MISSING_FACT' | 'UNRESOLVED_ELEMENT' | 'UNRESOLVED_EXCEPTION' | 'INCOMPLETE_SUBSUMPTION'
  // These two exist specifically BECAUSE the Authority and Temporal engines
  // are not implemented yet -- not because this phase attempts to evaluate
  // them. Do not repurpose them once those engines exist; they should be
  // retired then, not redefined.
  | 'AUTHORITY_NOT_EVALUATED' | 'TEMPORAL_STATUS_NOT_EVALUATED'
  | 'OTHER';

export interface ConclusionBlocker {
  type: ConclusionBlockerType;
  /** A CaseFact/MissingFact/RuleElement/RuleException id, when the blocker type has one -- validated against the referenced Subsumptions where applicable. */
  referenceId?: string;
  description: string;
}

/** Reused for factCompleteness: whole/partial/none of the required elements across the referenced Subsumptions are resolved. */
export type FactCompletenessStatus = 'COMPLETE' | 'PARTIAL' | 'UNRESOLVED';

/**
 * Deliberately NOT the same literal as LegalVerificationStatus's 'VERIFIED'
 * -- renamed to VERIFIED_SHAPE specifically so a ConclusionTrace can never
 * read as claiming the underlying NormativeRule is legally correct or
 * authoritative (invariant XIX). It only ever means the rule passed
 * validarNormativeRule's shape check.
 */
export type RuleVerificationSummary = 'VERIFIED_SHAPE' | 'PARTIAL' | 'UNRESOLVED';

/** Used for authorityStatus/temporalStatus -- NOT_EVALUATED is enforced as the only legal value in this phase (see validarConclusionTrace); PARTIAL/UNRESOLVED are reserved for whenever those engines actually exist. */
export type EngineNotYetImplementedStatus = 'NOT_EVALUATED' | 'PARTIAL' | 'UNRESOLVED';

export interface ConclusionUncertainty {
  factCompleteness: FactCompletenessStatus;
  ruleVerification: RuleVerificationSummary;
  /** Mirrors SubsumptionAnalysisStatus -- the worst (most restrictive) analysisStatus among the referenced Subsumptions. */
  subsumptionCompleteness: SubsumptionAnalysisStatus;
  /** Always 'NOT_EVALUATED' in this phase -- see validarConclusionTrace. */
  authorityStatus: EngineNotYetImplementedStatus;
  /** Always 'NOT_EVALUATED' in this phase -- see validarConclusionTrace. */
  temporalStatus: EngineNotYetImplementedStatus;
}

export interface ConclusionTrace {
  id: string;
  conclusionType: ConclusionType;
  proposition: string;
  status: ConclusionStatus;
  /** Never empty for LEGAL_CONCLUSION (invariant XV) -- a conclusion with no Subsumption behind it is not a conclusion this contract can vouch for. */
  subsumptionIds: string[];
  /** Every id must both exist as a real NormativeRule AND be the ruleId of one of the referenced Subsumptions -- never a rule the trace merely mentions in passing. */
  ruleIds: string[];
  /** Must be traceable to a supportingFactIds entry inside one of the referenced Subsumptions' assessments -- never a fact introduced fresh at this layer. */
  supportingFactIds: string[];
  /** Same discipline as supportingFactIds, but for contradictingFactIds. */
  contradictingFactIds: string[];
  missingFactIds: string[];
  /** Derived from, and cross-checked against, the referenced Subsumptions' own unresolvedElementIds -- no required element may disappear at this layer (invariant XVII). */
  unresolvedElementIds: string[];
  /** Same discipline as unresolvedElementIds, but derived from exceptionAssessments whose status is UNKNOWN. */
  unresolvedExceptionIds: string[];
  blockedBy: ConclusionBlocker[];
  uncertainty: ConclusionUncertainty;
  notes?: string;
  // Deliberately NO confidenceScore, probability, winningChance,
  // successRate, or recommendedAction -- all out of scope for LR-K5.
}
