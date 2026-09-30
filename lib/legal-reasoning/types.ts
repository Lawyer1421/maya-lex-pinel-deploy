/**
 * lib/legal-reasoning/types.ts
 *
 * LR-K1 (CaseFact/MissingFact provenance) + LR-K2 (Citation Trust I:
 * identity/provenance only) + LR-K3 (LegalProposition/NormativeRule) +
 * LR-K4 (generic Subsumption contract) + LR-K5 (Conclusion Traceability,
 * LEGAL_CONCLUSION only) + LR-K6A (Citation Trust II: proposition-support
 * classification contract) + LR-K6.1 (evidence-binding/provenance +
 * conflict-aware aggregation) + LR-K7 (Authority/AuthorityRelationship +
 * TemporalLegalState/AmendmentEvent qualification contracts) + LR-K8
 * (RuleQualification/ApplicableRule contract). Semantic adjudication
 * RUNTIME (a model or rule actually reading evidence text and deciding
 * entailment), Jurisprudence, and any automatic rule-selection engine are
 * still NOT implemented -- see docs/architecture/LR-1_LEGAL_REASONING.md
 * §4-8 for the full canonical design, invariants, and everything still NOT
 * implemented (Jurisprudence,
 * PROCEDURAL_CONCLUSION/STRATEGIC_ASSESSMENT reasoning — design-only).
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

// ─────────────────────────────────────────────────────────────────────────────
// LR-K6 — CITATION TRUST II: PROPOSITION SUPPORT CONTRACT
// ─────────────────────────────────────────────────────────────────────────────
//
// Citation Trust I (LR-K2) answers "is this citation's identity/provenance
// real?" This layer answers a different, harder question: "does the
// retrieved evidence actually support the LegalProposition attributed to
// it?" SOURCE IDENTITY != PROPOSITION SUPPORT != LEGAL CORRECTNESS -- a
// CitationTrustRecord can be fully VERIFIED (real document, confirmed
// version, hashed content) while the evidence it points to says nothing
// resembling the proposition, or even contradicts it. Neither this layer
// nor LR-K2 evaluates whether the proposition's underlying legal
// interpretation is ultimately correct, current, or controlling -- that
// remains a future Authority/Temporal layer's question.
//
// New constitutional invariants for this phase:
//   XXI.   TRACEABILITY DOES NOT CURE A FALSE PREMISE.
//   XXII.  NO VERIFIED LEGAL PROPOSITION WITHOUT SUPPORTING EVIDENCE.
//   XXIII. SOURCE IDENTITY != PROPOSITION SUPPORT.
//   XXIV.  SEMANTIC SIMILARITY != PROPOSITION SUPPORT.
//   XXV.   PARTIAL SUPPORT MUST NOT MASQUERADE AS FULL SUPPORT.
//   XXVI.  CONTRADICTORY EVIDENCE MUST NOT BE SILENTLY IGNORED.
//   XXVII. NO SUPPORT STATUS MAY BE UPGRADED BY MODEL EXPECTATION.
//
// This module does NOT call an LLM, does NOT use embeddings/vector
// similarity/reranker scores as evidence of support, and does NOT attempt
// natural-language claim extraction -- propositions are decomposed into
// explicit PropositionClaim units BY THE CALLER (a fixture, and eventually
// a future authorized extraction phase), never inferred here. This module
// only checks whether an ALREADY-DECIDED claim-to-evidence classification is
// internally consistent -- the same "fixtures instantiate explicit
// assessments manually" discipline as LR-K4's Subsumption.

/**
 * Deliberately does NOT nest inside LegalProposition (LR-K3 is not
 * reopened) -- links back via propositionId, the same pattern Subsumption
 * uses for ruleId. A proposition's full claim set is discovered by filtering
 * on this field, never by a field LegalProposition itself carries.
 *
 * `required` (LR-K6.1): mirrors `RuleElement.required` (LR-K3) -- a compound
 * proposition ("Y requires A, B and C") decomposes into claims that must ALL
 * be independently supported for the proposition itself to count as fully
 * supported (invariant XXXIII: partial support exists at claim level, never
 * as a shortcut to whole-proposition validation). A claim marked
 * `required: false` may exist for context without blocking full support if
 * left unaddressed.
 */
export interface PropositionClaim {
  id: string;
  propositionId: string;
  text: string;
  required: boolean;
}

/**
 * RECORDED DEBT (new in LR-K6, not fixed -- same discipline as the
 * `instrumento: string | null` debt recorded in LR-K3): `CitationTrustRecord`
 * (LR-K2) has no `id` field of its own -- it was modeled as a value object,
 * the same way `Cita` in evidence-engine.ts is addressed by array position
 * or its own `hash`, never a stable id. LR-K6 needs to reference specific
 * citations from `PropositionSupportRecord.citationTrustRecordIds` and
 * `EvidenceLocator.citationTrustRecordId`, so this wrapper assigns an id
 * EXTERNALLY, without modifying `CitationTrustRecord` itself or reopening
 * LR-K2. If a future phase gives `CitationTrustRecord` its own id, this
 * wrapper becomes redundant and can be retired then -- not now, as an
 * incidental side effect of LR-K6.
 */
export interface IdentifiedCitationTrustRecord {
  id: string;
  record: CitationTrustRecord;
}

/**
 * SUPPORTED/PARTIALLY_SUPPORTED/CONTRADICTED/NOT_SUPPORTED/UNRESOLVED --
 * never a confidence score, percentage, or probability (invariant XXIV's
 * sibling concern: a number invites exactly the "looks precise, isn't"
 * mistake this whole kernel exists to avoid). CONTRADICTED is never
 * downgraded to PARTIAL/UNRESOLVED when the evidence explicitly conflicts
 * (invariant XXVI) -- it is the single highest-priority derived state.
 */
export type PropositionSupportStatus =
  | 'SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'CONTRADICTED' | 'NOT_SUPPORTED' | 'UNRESOLVED';

/**
 * Where support for a claim actually comes from -- no field is required
 * beyond `citationTrustRecordId` (a locator may legitimately be coarse,
 * e.g. only a fragmentId, never all of page/textRange/hash at once), but at
 * least one EvidenceLocator must exist for SUPPORTED/PARTIALLY_SUPPORTED/
 * CONTRADICTED (see validarPropositionSupportRecord) -- support is never
 * asserted without a resolvable relation to a real CitationTrustRecord.
 */
export interface EvidenceLocator {
  citationTrustRecordId: string;
  fragmentId?: string;
  page?: number;
  textRange?: string;
  hash?: string;
}

export interface PropositionSupportRecord {
  id: string;
  /** Must exist in the supplied LegalProposition context -- no orphan proposition ids. */
  propositionId: string;
  /** Must all exist in the supplied CitationTrustRecord context -- no orphan citation ids. */
  citationTrustRecordIds: string[];
  status: PropositionSupportStatus;
  /** Claim ids (from PropositionClaim, filtered to this propositionId) the evidence directly backs. */
  supportedClaims: string[];
  /** Claim ids the evidence was checked against but does not address -- never conflated with "not yet checked." */
  unsupportedClaims: string[];
  /**
   * Claim ids the evidence AFFIRMATIVELY conflicts with. A claim conflicting
   * with even one source belongs here, never in supportedClaims, even if a
   * different referenced source would otherwise have supported it --
   * conflicting sources are represented as a per-claim contradiction, not a
   * dedicated new status (kept minimal per directive §17).
   */
  contradictoryClaims: string[];
  evidenceLocators: EvidenceLocator[];
  notes?: string;
  // Deliberately NO confidenceScore, probability, or percentage anywhere.
}

// ─────────────────────────────────────────────────────────────────────────────
// LR-K6.1 — EVIDENCE BINDING + CONFLICT-AWARE AGGREGATION
// ─────────────────────────────────────────────────────────────────────────────
//
// LR-K6A (above) validates that a CALLER-PROVIDED claim classification
// (supportedClaims/unsupportedClaims/contradictoryClaims) is internally
// coherent. It never required that classification to be traceable to one
// SPECIFIC, atomic, provenance-tagged decision, and its original
// `esProposicionCompletamenteRespaldada` could let a single SUPPORTED record
// outvote a CONTRADICTED one for the same proposition (a real defect,
// corrected here). LR-K6.1 closes both gaps: `SupportAdjudication` is the
// atomic unit -- one claim, one evidence span, one explicit origin, one
// status, individually auditable -- and aggregation is conflict-aware and
// fail-closed by construction.
//
// New constitutional invariants for this phase:
//   XXVIII. NO SUPPORT CLAIM WITHOUT AN EVIDENCE SPAN AND ADJUDICATION ORIGIN.
//   XXIX.   ONE SUPPORTING RECORD MUST NOT ERASE A CONTRADICTORY RECORD.
//   XXX.    STRUCTURAL VALIDATION != SUPPORT ADJUDICATION.
//   XXXI.   SUPPORT ADJUDICATION != LEGAL CORRECTNESS.
//   XXXII.  SUPPORTING AND CONTRARY EVIDENCE MUST BOTH REMAIN AVAILABLE TO
//           LATER REASONING (no confirmation-bias discarding).
//   XXXIII. PARTIAL SUPPORT EXISTS AT CLAIM LEVEL, NOT AS WHOLE-PROPOSITION
//           VALIDATION.
//   XXXIV.  NOT_SUPPORTED != UNRESOLVED.
//   XXXV.   ABSENCE OF RETRIEVED SUPPORT != EVIDENCE OF ABSENCE.
//   XXXVI.  EVIDENCE ROLE MUST REMAIN EXTENSIBLE BUT MUST NOT BE
//           SEMANTICALLY CLASSIFIED IN K6.1.
//
// This module does NOT call an LLM, does NOT read or fetch source text at
// runtime, and does NOT infer textual entailment automatically --
// `EXTERNAL_REASONER` is a provenance LABEL a future authorized phase may
// populate, never something this phase invokes. Nothing here claims to have
// "read the legal text and proved semantic entailment" -- it only requires
// that whoever DID make that call (a human, an exact-text rule, or later a
// model) left an explicit, auditable trace of what evidence and what
// provenance backs it. K6.1 detects and preserves EVIDENCE conflict
// (records/adjudications disagree); it never resolves LEGAL conflict
// (hierarchy, temporal change, speciality, jurisdiction, later precedent,
// legislative reform, distinguishable facts) -- that remains Authority/
// Temporal/ApplicableRule, none of which exist yet.

/**
 * Design-only classification of WHAT KIND of evidence a span is (invariant
 * XXXVI: the field must remain extensible, but nothing in K6.1 may assign
 * it automatically). `UNKNOWN` is the only value this phase ever sets --
 * present so a future phase can populate real roles without EvidenceSpan
 * needing to change shape, not because this phase classifies anything.
 */
export type EvidenceRole =
  | 'HOLDING' | 'RATIO' | 'OBITER' | 'PARTY_ARGUMENT' | 'DISSENT' | 'FACTUAL_FINDING'
  | 'PROCEDURAL_HISTORY' | 'STATUTORY_TEXT' | 'DOCTRINE' | 'UNKNOWN';

/**
 * A more precise locator than `EvidenceLocator` (LR-K6A) -- adds
 * character-offset precision and an optional literal quote, both still
 * fully optional beyond `citationTrustRecordId` (a span may legitimately be
 * coarse). Never invents a span: `quotedText`, when present, is provenance
 * data asserted by whoever constructs the `SupportAdjudication` -- never
 * semantic proof, and this module does not verify it against any retrieved
 * source (no runtime source retrieval in this phase, per directive §4).
 * `evidenceRole`, if present, must default to `'UNKNOWN'` when the caller
 * has no real classification -- never a specific role invented to sound
 * more precise than what's actually known.
 */
export interface EvidenceSpan {
  citationTrustRecordId: string;
  fragmentId?: string;
  page?: number;
  startOffset?: number;
  endOffset?: number;
  quotedText?: string;
  hash?: string;
  evidenceRole?: EvidenceRole;
}

export type SupportAdjudicationStatus =
  | 'SUPPORTS' | 'PARTIALLY_SUPPORTS' | 'CONTRADICTS' | 'DOES_NOT_SUPPORT' | 'UNRESOLVED';

/**
 * A provenance LABEL only -- naming who/what made this specific
 * claim-to-evidence call. `EXTERNAL_REASONER` never means an LLM was
 * actually invoked in this phase (invariant XXX/XXXI); it exists so a
 * future authorized phase has somewhere to record that provenance without
 * this type needing to change. No provider- or vendor-specific value is
 * introduced, by design.
 */
export type AdjudicationOrigin = 'HUMAN' | 'EXACT_TEXT_RULE' | 'EXTERNAL_REASONER';

/**
 * The atomic unit LR-K6A's flat `supportedClaims`/`unsupportedClaims`/
 * `contradictoryClaims` arrays lacked: one claim, one evidence span, one
 * explicit origin, one status -- individually auditable. Distinguishes
 * `DOES_NOT_SUPPORT` (evidence was examined and found not to address the
 * claim) from `UNRESOLVED` (the evidence/adjudication itself is
 * insufficient to decide either way) -- invariant XXXIV, these are never
 * collapsed into each other. `UNRESOLVED` is also the correct status for
 * "no supporting authority was found in the corpus consulted" — that
 * absence of retrieval is never itself represented as
 * `DOES_NOT_SUPPORT`/`NOT_SUPPORTED`, which would silently assert "no such
 * authority exists" (invariant XXXV).
 */
export interface SupportAdjudication {
  id: string;
  propositionId: string;
  claimId: string;
  evidenceSpan: EvidenceSpan;
  status: SupportAdjudicationStatus;
  origin: AdjudicationOrigin;
  rationale?: string;
}

/**
 * Result of aggregating every `SupportAdjudication` (or, for
 * `agregarSoportePorProposicion`, every `PropositionSupportRecord`) for one
 * proposition. Deliberately carries BOTH `supportingClaimIds` and
 * `contraryClaimIds` explicitly, never just a final `status` -- invariant
 * XXXII: supporting and contrary evidence must both remain available to
 * later reasoning, never discarded because a conflict was already detected.
 * No confidence score anywhere.
 */
export interface AggregatedPropositionSupport {
  propositionId: string;
  status: PropositionSupportStatus;
  requiredClaimIds: string[];
  supportingClaimIds: string[];
  contraryClaimIds: string[];
  unresolvedClaimIds: string[];
  notSupportedClaimIds: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// LR-K7 — AUTHORITY + TEMPORAL QUALIFICATION
// ─────────────────────────────────────────────────────────────────────────────
//
// Answers two questions neither LR-K1-K6.1 attempts: "what KIND of legal
// weight does a source carry, and how does it relate to other sources?"
// (Authority/AuthorityRelationship) and "is this provision currently in
// force?" (TemporalLegalState/AmendmentEvent). Neither answers, and neither
// may be used to answer, whether a NormativeRule is the one that legally
// controls a case (that remains ApplicableRule, unbuilt) -- AUTHORITY/
// TEMPORAL QUALIFICATION != APPLICABLE RULE.
//
// New constitutional invariants for this phase:
//   XXXVII. NO NUMERIC AUTHORITY HIERARCHY. A single numeric ranking field on
//           `Authority` was proposed in an earlier draft and stays removed --
//           it invites comparing a regulation and a court ruling on one
//           scale, as if "level 3 beats level 5" were a legal argument.
//           Cross-type hierarchy is represented only by explicit, evidenced
//           AuthorityRelationship records.
//   XXXVIII. LEGACY VIGENCIA SIGNAL != VERIFIED. `es_norma_vigente=true` in
//           `biblioteca_vectores` is legacy ingestion metadata with no
//           independent confirmation behind it -- it can support PARTIAL at
//           best, never VERIFIED, regardless of its boolean value. See
//           `derivarVerificationStatusDesdeSenalLegado`.
//   XXXIX.  LIFECYCLE STATE != LEGAL VIGENCIA (restates invariant VI for this
//           phase). The ingestion pipeline's own internal review-stage
//           labels (see architecture doc §4, invariant VI) are not
//           referenced, read, or wired anywhere in this module --
//           TemporalLegalState.legalStatus is an entirely separate axis from
//           how far a document has moved through MayaLex's own ingestion
//           pipeline.
//   XL.     REFORMADO IS AN EVENT, NOT A TERMINAL STATUS. An AmendmentEvent
//           of type REFORMA never forces TemporalLegalState.legalStatus away
//           from VIGENTE -- a reformed article is still in force in its
//           amended form. Only an evidence-backed DEROGACION event may
//           justify legalStatus="DEROGADO" (see validarTemporalLegalState).
//   XLI.    NO RELATIONSHIP MAY BE INVENTED FROM MODEL EXPECTATION.
//           CONSTITUTIONAL_SUPREMACY, SPECIAL_OVER_GENERAL, and
//           LATER_OVER_EARLIER are relationships to represent with evidence,
//           never automatic winner functions -- there is no
//           `derivePrevailingAuthority` or equivalent anywhere in this
//           module. An AuthorityRelationship can be legitimately
//           verificationStatus="UNRESOLVED" when the specialty/timing/
//           supremacy itself is contested, and "lex specialis"/"lex
//           posterior" never resolve automatically to a winner.
//   XLII.   NO RELATIONSHIP VERIFIED WITHOUT EVIDENCE. Mirrors invariant III
//           for AuthorityRelationship/AmendmentEvent: verificationStatus may
//           only be "VERIFIED" when `evidence` is non-empty.
//   XLIII.  DOCTRINE IS NEVER PRIMARY_BINDING. `Authority.sourceType`
//           "ACADEMIC_DOCTRINE"/"INSTITUTIONAL_COMMENTARY" may never carry
//           `legalRole: "PRIMARY_BINDING"` -- restates §5.3 of the
//           architecture doc, preserving `FUENTES_DOCTRINALES`
//           (`lib/legal-retrieval/evidence-engine.ts`) exactly as it is.
//   XLIV.   NO LEGAL EFFECT FROM SOURCE-TYPE LABEL ALONE. Nothing in this
//           module derives, defaults, or infers `Authority.legalRole` from
//           `Authority.sourceType` -- a JURISPRUDENCE source is not
//           automatically PRIMARY_BINDING (or any other role) merely because
//           of its sourceType; `legalRole` is always independently declared
//           and only structurally validated, never derived.
//
// This module does NOT call an LLM, does NOT use embeddings or semantic
// similarity, does NOT implement Jurisprudence (§5.2 of the architecture
// doc, still design-only) or ApplicableRule, and does NOT wire into the
// ingestion pipeline's lifecycle stages, PRC-1, or any runtime path.
// Fixtures instantiate Authority/
// AuthorityRelationship/TemporalLegalState/AmendmentEvent explicitly by
// hand -- nothing here infers jurisdiction, source type, legal role, or
// temporal status from retrieved text.

/**
 * What KIND of legal source this is -- never a ranking, just a category.
 * See invariant XXXVII: no numeric hierarchy anywhere in this type.
 */
export type AuthoritySourceType =
  | 'CONSTITUTION' | 'TREATY' | 'STATUTE' | 'REGULATION' | 'JURISPRUDENCE'
  | 'INSTITUTIONAL_COMMENTARY' | 'ACADEMIC_DOCTRINE' | 'PRACTICE_TEMPLATE' | 'OTHER';

/**
 * What legal WEIGHT this source carries -- independently declared from
 * `sourceType`, never derived from it (invariant XLIV). Doctrine
 * (`ACADEMIC_DOCTRINE`/`INSTITUTIONAL_COMMENTARY`) may never be
 * `PRIMARY_BINDING` (invariant XLIII, §5.3 of the architecture doc).
 */
export type LegalRoleType = 'PRIMARY_BINDING' | 'INTERPRETIVE' | 'PERSUASIVE' | 'PRACTICE_GUIDANCE' | 'DISCOVERY_ONLY';

export interface Authority {
  sourceType: AuthoritySourceType;
  legalRole: LegalRoleType;
  /** Free text -- 'HN' today, another jurisdiction's code later. Not validated against a fixed list in this phase. */
  jurisdiction: string;
  /** Reused from lib/exequatur/curriculum/types.ts, not reinvented -- same locator LR-K3's LegalProposition/NormativeRule already use. */
  provenance: CanonicalLegalReference;
}

/**
 * Cross-source hierarchy is represented ONLY through explicit, evidenced
 * relationships like this one -- never a numeric field (invariant XXXVII).
 * `CONSTITUTIONAL_SUPREMACY`/`SPECIAL_OVER_GENERAL`/`LATER_OVER_EARLIER` are
 * relationships to assert with evidence, never automatic tie-breaker
 * functions (invariant XLI) -- `UNKNOWN` is a legitimate, stable value here,
 * the same discipline `PropositionSupportStatus`/`CitationVerificationState`
 * already use for "not yet resolved," never something to auto-upgrade.
 */
export type AuthorityRelationType =
  | 'CONSTITUTIONAL_SUPREMACY' | 'SPECIAL_OVER_GENERAL' | 'LATER_OVER_EARLIER'
  | 'AMENDS' | 'REPEALS' | 'INTERPRETS' | 'APPLIES' | 'DISTINGUISHES' | 'CITES' | 'UNKNOWN';

export interface AuthorityRelationship {
  source: CanonicalLegalReference;
  target: CanonicalLegalReference;
  relation: AuthorityRelationType;
  verificationStatus: LegalVerificationStatus;
  /** Pointers to the source text/decree establishing the relation -- may be empty ONLY when verificationStatus is not VERIFIED (invariant XLII). */
  evidence: string[];
}

/**
 * VIGENTE/DEROGADO/PARCIALMENTE_VIGENTE/SUSPENDIDO/UNKNOWN -- and, binding
 * (invariant XL): REFORMADO is deliberately NOT a value here. A reformed
 * article is still VIGENTE (or PARCIALMENTE_VIGENTE) in its amended form;
 * "reformado" describes a version relationship recorded in
 * `amendmentEvents`, never a terminal legal-status value that would make
 * every amended-but-current article look repealed.
 */
export type TemporalLegalStatus = 'VIGENTE' | 'DEROGADO' | 'PARCIALMENTE_VIGENTE' | 'SUSPENDIDO' | 'UNKNOWN';

export type AmendmentEventType = 'REFORMA' | 'DEROGACION' | 'SUSTITUCION' | 'RESTAURACION' | 'OTHER';

/**
 * A single point-in-time change to a provision. `REFORMA` never implies
 * `TemporalLegalState.legalStatus` becomes anything other than VIGENTE/
 * PARCIALMENTE_VIGENTE by itself (invariant XL) -- an amendment event is a
 * fact about history, not a status declaration.
 */
export interface AmendmentEvent {
  type: AmendmentEventType;
  /** e.g. "Decreto 284-2013". */
  instrument: string;
  date?: string;
  gacetaRef?: string;
  /** e.g. "Art. 380 Código de Comercio". */
  affectedProvision: string;
  /** Pointers to the source text/decree establishing this event -- may be empty ONLY when verificationStatus is not VERIFIED (invariant XLII). */
  evidence: string[];
  /** Optional structured locator, when the amending instrument itself resolves to one -- never required, since an event may be known only by `instrument`/`gacetaRef` at this shadow layer. */
  provenance?: CanonicalLegalReference;
  verificationStatus: LegalVerificationStatus;
}

/**
 * `legalStatus` and `verificationStatus` are two different axes and must
 * never be mixed into one field (see architecture doc §4) -- validated
 * independently, never one derived from the other. `DEROGADO` may only be
 * declared when backed by an evidence-verified `DEROGACION` amendment event
 * (see `validarTemporalLegalState`) -- it is never a bare declaration.
 */
export interface TemporalLegalState {
  legalStatus: TemporalLegalStatus;
  verificationStatus: LegalVerificationStatus;
  validFrom?: string;
  validTo?: string;
  amendmentEvents: AmendmentEvent[];
}

// ─────────────────────────────────────────────────────────────────────────────
// LR-K8 — RULE QUALIFICATION / APPLICABLE RULE CONTRACT
// ─────────────────────────────────────────────────────────────────────────────
//
// Answers: "given what LR-K7 already knows about a source's weight and a
// provision's temporal status, is THIS NormativeRule qualified as applicable
// right now?" It never decides this by inventing a hierarchy -- it links an
// already-verified Authority, an already-verified TemporalLegalState, and
// already-verified AuthorityRelationships (all LR-K7, all unmodified) against
// one NormativeRule, and mechanically aggregates blockers the CALLER already
// classified -- the same "fixtures instantiate explicit assessments
// manually" discipline as Subsumption (LR-K4) and proposition-support
// classification (LR-K6A/K6.1). RULE QUALIFICATION != SUBSUMPTION (LR-K4
// asks "do these facts satisfy this rule's elements," never touched here)
// and RULE QUALIFICATION != LEGAL CONCLUSION (LR-K5's ConclusionTrace is
// never referenced by, or a referent of, RuleQualification in this phase).
//
// New constitutional invariants for this phase:
//   XLV.   NO AUTOMATIC WINNER ENGINE. `qualificationStatus` is derived
//          mechanically from already-classified blockers (which specific
//          AuthorityRelationship the caller tagged as displacing/limiting,
//          and the referenced TemporalLegalState) -- there is no
//          `resolverReglaAplicable` or equivalent that reads relation-type
//          semantics and picks a winner among competing NormativeRule
//          records. Whether a verified SPECIAL_OVER_GENERAL or
//          LATER_OVER_EARLIER relationship displaces or merely limits a rule
//          is the caller's explicit classification (via
//          `RuleQualificationBlockerType`), never inferred from the
//          `AuthorityRelationType` value alone.
//   XLVI.  DEROGADO CANNOT BECOME APPLICABLE. A `RuleQualification` whose
//          `temporalState.legalStatus` is `"DEROGADO"` can never derive
//          `qualificationStatus: "APPLICABLE"` -- see
//          `derivarRuleQualificationStatus`.
//   XLVII. TEMPORAL VERIFICATION UNRESOLVED CANNOT BECOME FULLY APPLICABLE.
//          `temporalState.verificationStatus === "UNRESOLVED"` can never
//          derive `qualificationStatus: "APPLICABLE"` -- it derives
//          `"UNRESOLVED"` instead, never silently upgraded.
//   XLVIII. UNVERIFIED OR UNKNOWN RELATIONSHIP CANNOT DECIDE DISPLACEMENT.
//          A `RuleQualificationBlocker` of type `"DISPLACING_RELATIONSHIP"`/
//          `"LIMITING_RELATIONSHIP"` whose `relationship.verificationStatus`
//          is not `"VERIFIED"`, or whose `relationship.relation` is
//          `"UNKNOWN"`, can never produce `"DISPLACED"`/`"LIMITED"` --
//          `derivarRuleQualificationStatus` falls through to `"UNRESOLVED"`
//          instead.
//   XLIX.  CONSTITUTIONAL/SPECIAL/LATER RELATIONS QUALIFY ONLY WHEN EXPLICIT
//          AND VERIFIED. Any `relationship` a blocker cites must be one of
//          the exact objects declared in `RuleQualification.relationships`
//          (no borrowing an undeclared relationship, same discipline as
//          `Subsumption.caseFactIds`) -- never a relationship assumed to
//          exist because a relation TYPE (`CONSTITUTIONAL_SUPREMACY`,
//          `SPECIAL_OVER_GENERAL`, `LATER_OVER_EARLIER`) "should" apply.
//   L.     REFORMADO REMAINS AMENDMENT HISTORY (restates invariant XL at
//          this layer). `derivarRuleQualificationStatus` never reads
//          `temporalState.amendmentEvents` -- a `REFORMA` event never causes
//          `"DISPLACED"`/`"LIMITED"` by itself; only `legalStatus` and
//          classified relationship blockers do.
//   LI.    RULE QUALIFICATION != SUBSUMPTION != LEGAL CONCLUSION.
//          `RuleQualification` never embeds a `Subsumption` or
//          `ConclusionTrace`, and neither of those types is modified by this
//          phase to reference `RuleQualification` -- `ConclusionUncertainty.
//          authorityStatus`/`temporalStatus` remain hard-locked to
//          `'NOT_EVALUATED'` (§9.1), unwired by this phase.
//
// This module does NOT call an LLM, does NOT use embeddings or semantic
// similarity, does NOT infer missing hierarchy, does NOT invent lex
// specialis/lex posterior resolution, does NOT resolve jurisprudential
// conflicts, and does NOT wire into PRC-1 or any runtime path. Fixtures
// instantiate RuleQualification/blockers explicitly by hand -- nothing here
// infers which relationship displaces which rule.

export type RuleQualificationStatus = 'APPLICABLE' | 'LIMITED' | 'DISPLACED' | 'UNRESOLVED';

// ── LR-K8.1 — QUALIFICATION HARDENING ──────────────────────────────────────
//
// Cursor found two real gaps in LR-K8's original derivation: (1) it never
// read `Authority.legalRole` at all, so a rule backed only by an
// `INTERPRETIVE`/`PERSUASIVE`/`PRACTICE_GUIDANCE`/`DISCOVERY_ONLY` authority
// could derive `APPLICABLE` exactly as if it were `PRIMARY_BINDING`; (2) it
// treated any `verificationStatus` other than `'UNRESOLVED'` as sufficient
// for `APPLICABLE`, so `'PARTIAL'` temporal verification -- confirmed but
// not to the standard needed for a professional assertion of vigencia --
// slipped through as fully `APPLICABLE`. Both are fixed in
// `derivarRuleQualificationStatus`, never by inventing a new hierarchy or
// auto-promoting doctrine/jurisprudence to `PRIMARY_BINDING` (invariant
// XLIII, unchanged).
//
// New constitutional invariants for this phase:
//   LII.  AUTHORITY ELIGIBILITY FOR FULL APPLICABILITY. A `RuleQualification`
//         whose `authority.legalRole` is not `'PRIMARY_BINDING'` can never
//         derive `qualificationStatus: "APPLICABLE"` -- it derives
//         `"LIMITED"` instead (never `"UNRESOLVED"`, since the authority's
//         role is a known, definite fact, not an evidentiary gap), unless a
//         `DISPLACED` condition already applies.
//   LIII. TEMPORAL VERIFICATION SUFFICIENCY FOR FULL APPLICABILITY.
//         `temporalState.verificationStatus === "PARTIAL"` can never derive
//         `qualificationStatus: "APPLICABLE"` -- it derives `"LIMITED"`
//         instead. `"UNRESOLVED"` is unchanged: it still derives
//         `"UNRESOLVED"`, never upgraded to `"LIMITED"` or `"APPLICABLE"`.
//         Only `verificationStatus === "VERIFIED"` supports `"APPLICABLE"`.
//
// `RULE_NOT_VIGENTE`, when present, describes a temporal-legalStatus reason.
// `TEMPORAL_VERIFICATION_UNRESOLVED`/`TEMPORAL_VERIFICATION_PARTIAL` describe
// a temporal-verificationStatus reason. `AUTHORITY_NOT_PRIMARY_BINDING`
// describes an authority-role reason. None of these three carry a
// `relationship` -- only the `*_RELATIONSHIP` types do (invariant XLIX,
// unchanged).
export type RuleQualificationBlockerType =
  | 'RULE_NOT_VIGENTE'
  | 'TEMPORAL_VERIFICATION_UNRESOLVED'
  | 'TEMPORAL_VERIFICATION_PARTIAL'
  | 'AUTHORITY_NOT_PRIMARY_BINDING'
  | 'DISPLACING_RELATIONSHIP'
  | 'LIMITING_RELATIONSHIP'
  | 'RELATIONSHIP_UNVERIFIED_OR_UNKNOWN'
  | 'OTHER';

export interface RuleQualificationBlocker {
  type: RuleQualificationBlockerType;
  /** Present for the *_RELATIONSHIP* blocker types -- see invariant XLIX. */
  relationship?: AuthorityRelationship;
  description: string;
}

/**
 * Links one `NormativeRule` (by id -- `NormativeRule` is not reopened) to
 * the LR-K7 records that bear on whether it is currently qualified as
 * applicable: an `Authority` (what kind of source it is), a
 * `TemporalLegalState` (is it in force), and every `AuthorityRelationship`
 * actually considered (never one borrowed from elsewhere in the system but
 * not declared here -- same "no borrowing" discipline as
 * `Subsumption.caseFactIds`). `Authority`/`TemporalLegalState`/
 * `AuthorityRelationship` have no `id` field of their own (same recorded
 * design as `CitationTrustRecord`, LR-K2) -- embedded here by value rather
 * than by a manufactured id wrapper, since (unlike LR-K6A's
 * `IdentifiedCitationTrustRecord`) nothing in this phase needs to
 * cross-reference the same `Authority`/`TemporalLegalState` instance from
 * multiple `RuleQualification` records.
 */
export interface RuleQualification {
  id: string;
  /** Must equal a real NormativeRule.id -- never an orphan rule reference. */
  ruleId: string;
  authority: Authority;
  temporalState: TemporalLegalState;
  relationships: AuthorityRelationship[];
  qualificationStatus: RuleQualificationStatus;
  blockers: RuleQualificationBlocker[];
  notes?: string;
}

/**
 * The mission's own name for this same shadow contract --
 * `RuleQualification` is the canonical type name (consistent with
 * `SubsumptionAnalysisStatus`/`ConclusionStatus` naming elsewhere in this
 * module); `ApplicableRule` is kept as an alias so either name resolves to
 * the identical shape. This is explicitly NOT an automatic "winner" engine
 * (invariant XLV) -- nothing here selects which of several competing
 * `NormativeRule` records applies on its own.
 */
export type ApplicableRule = RuleQualification;
