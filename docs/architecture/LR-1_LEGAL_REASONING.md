# LR-1 — MayaLex Legal Reasoning Architecture (Canonical)

**Status:** LR-K0 architecture freeze. LR-K1 (CaseFact/MissingFact), LR-K2
(Citation Trust I), LR-K3 (LegalProposition/NormativeRule), LR-K4 (generic
Subsumption contract), LR-K5 (Conclusion Traceability, `LEGAL_CONCLUSION`
only), LR-K6A (Citation Trust II: proposition-support *classification*
contract), LR-K6.1 (evidence-binding/provenance + conflict-aware
aggregation, correcting a real gap LR-K6A left open), and LR-K7
(Authority/AuthorityRelationship + TemporalLegalState/AmendmentEvent
qualification contracts) are implemented as shadow/structural types — see
`lib/legal-reasoning/`. **Citation Trust II is not "not started"** — §6
below previously said so in three places after LR-K6A landed; corrected in
that revision. What *is* still not implemented: semantic adjudication
*runtime* (a model or automated rule actually reading evidence text and
deciding entailment), `Jurisprudence` (§5.2, still design-only), and
`ApplicableRule` (still unbuilt — Authority/Temporal qualification answers
"what weight does this source carry" and "is it in force," never "is this
the rule that legally controls"). Nothing in this document is wired into
`app/api/chat/route.ts`, any system prompt, or any user-facing response. No
behavior changes through LR-K7.

This is the single canonical source for MayaLex's legal-reasoning
architecture. It supersedes the informal LR-1 design discussion that
preceded it (Mission M1.5) — that discussion is not duplicated here; this
document incorporates its conclusions and corrects them where the Control
Plane issued binding amendments.

## 0. Why this exists

MayaLex's legal reasoning method already exists — it has existed since v2.0
of the system prompts (`lib/system-prompt.ts`): the civil "MÉTODO DE
DICTAMEN — SILOGISMO JUDICIAL" and the penal six-layer `MAYA_PENAL_MODULES`
engine. Both already instruct the model to separate facts from law, apply
subsumption, consider a contrary thesis, and mark uncertainty locally with
`[VERIFICAR]`. **All of that reasoning exists only as prose the model is
trusted to follow.** Nothing in code checks that it did. The goal of LR-1 is
to move the parts of that reasoning that matter for correctness — fact
provenance, citation identity, eventually subsumption — into typed,
auditable, testable structures, without discarding the prose (which
continues to carry tone, structure, and domain judgment no type system
should try to replace).

## 1. Constitutional invariants

These are binding on every future LR phase, not just this one.

- **I. No fact without origin.** Every `CaseFact` traces to `USER_STATEMENT`,
  `USER_DOCUMENT`, or `PROCEDURAL_RECORD`. There is no path to a fact that
  doesn't declare where it came from.
- **II. No legal rule without source.** A `NormativeRule` (§7) always carries
  a `CanonicalLegalReference` — never asserted from model memory alone.
- **III. No verified citation without verified evidence.** A citation may
  only carry `verificationState: 'VERIFIED'` when it is backed by an
  identifiable, hashed piece of retrieved evidence. See §6.
- **IV. No case conclusion without a fact → rule trace.** A `Subsumption`
  (§8, implemented) must be able to point to the specific `CaseFact`s and
  `NormativeRule`s it used. A conclusion that can't produce this trace isn't
  a conclusion the kernel can vouch for.
- **V. No uncertainty may masquerade as verification.** `PARTIAL`,
  `UNRESOLVED`, and `DISCOVERY_ONLY` are legitimate, stable states — not
  defects to be silently upgraded. Promotion to `VERIFIED` is never
  automatic (§6).
- **VI. Lifecycle state != legal vigencia.** `V0`–`V5` (`lib/ingesta-oficial`)
  describes how far a document has moved through *MayaLex's own ingestion
  pipeline*. It says nothing about whether the underlying law is currently
  in force. `V5` means "fully reviewed and approved for production," not
  "vigente." These are different axes and must never be collapsed into one
  field. **Not wired in this mission** — `V_STATE_RUNTIME_AVAILABLE = NO`,
  confirmed in Mission M1; unchanged here.
- **VII. No jurisprudential effect from court label alone.** A ruling from
  Sala de lo Constitucional is not `GENERAL_ERGA_OMNES` merely because of
  which chamber issued it. Legal effect depends on what the decision itself
  says and on verified legal basis for that effect — see §5.
- **VIII. Source verification != legal correctness.** A `LegalProposition`
  or `NormativeRule` marked `VERIFIED` means its *source is traceable and
  its citation identity is confirmed* (LR-K2). It never means the
  proposition's reading of that source is legally correct — a `PARAPHRASED`
  or `INTERPRETIVE` proposition can carry a fully verified source and still
  be a mistaken interpretation of it. Nothing in LR-K1–K3 evaluates legal
  correctness; that is not this layer's question to answer. See §6.2.
- **IX. Valid structure != verified evidence.** A `NormativeRule` or
  `LegalProposition` that passes structural validation (`validarNormativeRule`,
  `validarLegalProposition`) only proves internal shape consistency — ids
  present, enums valid, sources non-empty. It does not prove that any
  retrieval actually happened, or that a `hash`'s presence means real
  evidence is bound to it. See §6.3 and §7.1.
- **X. No element assessment without trace.** A `RuleElementAssessment`
  marked `SATISFIED` must cite at least one `CaseFact`; marked `UNSATISFIED`
  it must cite at least one contradicting fact. See §8.
- **XI. No missing fact may be silently assumed.** A `MissingFact` never
  converts into a `CaseFact`, and no code path in `lib/legal-reasoning/`
  fills a gap on the reasoner's behalf. See §8.
- **XII. Subsumption != legal applicability.** Mapping facts against a
  rule's elements says nothing about whether that rule is the one that
  legally controls, is current, or outranks a competing rule. See §8.2.
- **XIII. Unknown != unsatisfied.** The absence of a fact is never
  represented as an affirmative failure of an element — see §8.
- **XIV. An exception must be analyzed separately from the main rule.** A
  `RuleExceptionAssessment` is never folded into `elementAssessments`, and
  no exception belonging to a rule may go unassessed. See §8.1.
- **XV. No conclusion without trace.** A `LEGAL_CONCLUSION`'s
  `subsumptionIds` may never be empty. See §9.
- **XVI. A blocked conclusion is a valid result.** `BLOCKED` is a final,
  legitimate `ConclusionStatus` — never something to force into `SUPPORTED`
  or hide. See §9.1.
- **XVII. No conclusion may hide an unresolved required element.** A
  `ConclusionTrace`'s `unresolvedElementIds`/`unresolvedExceptionIds` must
  exactly match what its referenced `Subsumption`s actually leave
  unresolved — never a cherry-picked subset. See §9.1.
- **XVIII. No conclusion may upgrade factual status.** Referencing a
  `CaseFact` in a `ConclusionTrace` never changes that fact's own `status`.
  See §9.2.
- **XIX. No conclusion may upgrade source or rule verification status.** A
  `ConclusionTrace` reports `ruleVerification` as `'VERIFIED_SHAPE'`, never
  the bare `'VERIFIED'` a `NormativeRule` carries — the rename itself is the
  safeguard. See §9.1.
- **XX. Structural conclusion completeness != legal correctness.** A
  `SUPPORTED` `ConclusionTrace` says nothing about legal applicability,
  vigencia, or authority — those remain permanently `NOT_EVALUATED` fields
  until later layers exist. See §9.2.
- **XXI. Traceability does not cure a false premise.** A `ConclusionTrace`
  can be perfectly traced to a `Subsumption`, `NormativeRule`, and
  `CitationTrustRecord` that are all structurally valid, while the
  `LegalProposition` at the root of the chain is a wrong reading of its own
  source. Nothing before LR-K6 could catch that — traceability alone is not
  evidence of correctness. See §6.4.
- **XXII. No verified legal proposition without supporting evidence.** A
  `LegalProposition` is never treated as fully backed merely because its
  source exists, its citation is identity-verified, or its hash is present —
  full backing additionally requires a `PropositionSupportRecord` with
  `status: 'SUPPORTED'`. See §6.4, `esProposicionCompletamenteRespaldada`.
- **XXIII. Source identity != proposition support.** Citation Trust I
  (§6.1–6.2) answers whether a citation's identity and provenance are real.
  It never answers whether the evidence actually supports the proposition
  attributed to it — that is Citation Trust II's question alone. See §6.4.
- **XXIV. Semantic similarity != proposition support.** A high vector
  similarity or reranker score means "possibly related," never "supports
  this proposition." `validarPropositionSupportRecord` never reads or
  derives from any similarity/embedding score. See §6.4.
- **XXV. Partial support must not masquerade as full support.** A
  `PropositionSupportRecord` can only declare `SUPPORTED` when every claim
  belonging to the proposition is in `supportedClaims` — one unaddressed
  claim forces `PARTIALLY_SUPPORTED` or worse, never rounded up. See §6.4.
- **XXVI. Contradictory evidence must not be silently ignored.** Any claim
  placed in `contradictoryClaims` forces the record's derived `status` to
  `CONTRADICTED` — the single highest-priority outcome, never downgraded to
  `PARTIAL`/`UNRESOLVED` or hidden behind a `SUPPORTED` claim elsewhere in
  the same record. See §6.4.
- **XXVII. No support status may be upgraded by model expectation.**
  `status` is always derived from, and cross-checked against, the record's
  own `supportedClaims`/`unsupportedClaims`/`contradictoryClaims` — never
  declared freely, never inferred from how confident a citation looks. See
  §6.4.
- **XXVIII. No support claim without an evidence span and adjudication
  origin.** A `SupportAdjudication` never exists without both a resolvable
  `EvidenceSpan` and an explicit `AdjudicationOrigin` — regardless of its
  `status`, even `UNRESOLVED`. See §6.5.
- **XXIX. One supporting record must not erase a contradictory record.**
  Aggregating multiple `PropositionSupportRecord`s (or `SupportAdjudication`s)
  for the same proposition/claim, a `CONTRADICTS`/`CONTRADICTED` signal
  always outranks a `SUPPORTS`/`SUPPORTED` one for the same claim, no matter
  which record was consulted first. This is the correction LR-K6.1 makes to
  `esProposicionCompletamenteRespaldada` — see §6.5.
- **XXX. Structural validation != support adjudication.** Passing
  `validarSupportAdjudication` proves an adjudication is internally
  coherent — real proposition, real claim, real citation, explicit origin.
  It never proves the adjudication's own content (e.g. `quotedText`) is an
  accurate reading of the source. See §6.5.
- **XXXI. Support adjudication != legal correctness.** Even a fully
  evidence-bound, conflict-free `SUPPORTED` aggregate says nothing about
  whether the underlying legal claim is ultimately correct, current, or
  controlling — that remains outside this kernel entirely. See §6.5.
- **XXXII. Supporting and contrary evidence must both remain available to
  later reasoning.** `AggregatedPropositionSupport` always carries
  `supportingClaimIds` AND `contraryClaimIds` explicitly — a detected
  conflict is never allowed to make the supporting side disappear, and vice
  versa. No confirmation-bias discarding. See §6.5.
- **XXXIII. Partial support exists at claim level, not as whole-proposition
  validation.** A compound proposition is never treated as supported merely
  because *some* of its required claims are — every derivation is scoped to
  `required: true` claims individually, never rounded up. See §6.5.
- **XXXIV. `NOT_SUPPORTED` != `UNRESOLVED`.** `DOES_NOT_SUPPORT` means
  evidence was examined and found not to address the claim.  `UNRESOLVED`
  means the evidence/adjudication itself is insufficient to decide. These
  are never collapsed into each other. See §6.5.
- **XXXV. Absence of retrieved support != evidence of absence.** "No
  authority was found in the corpus consulted" is never represented as "no
  such authority exists" — a claim with zero adjudications (or only
  `UNRESOLVED` ones) is `UNRESOLVED`, never `NOT_SUPPORTED`. See §6.5.
- **XXXVI. Evidence role must remain extensible but must not be
  semantically classified in K6.1.** `EvidenceSpan.evidenceRole` exists so a
  future phase can record what kind of evidence a span is (holding, ratio,
  obiter, etc.) without a shape change — this phase never assigns it a
  value other than `'UNKNOWN'` or leaves it absent. See §6.5.
- **XXXVII. No numeric authority hierarchy.** `Authority` never carries a
  numeric ranking field — cross-type hierarchy is represented only through
  explicit, evidenced `AuthorityRelationship` records. See §5.1.
- **XXXVIII. Legacy vigencia signal != `VERIFIED`.** `es_norma_vigente=true`
  in `biblioteca_vectores` is legacy ingestion metadata with no independent
  confirmation behind it — it can support `PARTIAL` at best, via
  `derivarVerificationStatusDesdeSenalLegado`, which can never return
  `VERIFIED` regardless of the boolean's value. See §4.
- **XXXIX. Lifecycle state != legal vigencia** (restates invariant VI for
  this phase). The ingestion pipeline's own internal review-stage labels
  are not referenced, read, or wired anywhere in `Authority`/
  `TemporalLegalState`. See §4.
- **XL. `REFORMADO` is an event, not a terminal status.** An `AmendmentEvent`
  of type `REFORMA` never forces `TemporalLegalState.legalStatus` away from
  `VIGENTE` — only an evidence-verified `DEROGACION` event may justify
  `legalStatus: "DEROGADO"`. See §4.
- **XLI. No relationship may be invented from model expectation.**
  `CONSTITUTIONAL_SUPREMACY`, `SPECIAL_OVER_GENERAL`, and `LATER_OVER_EARLIER`
  are relationships to represent with evidence, never automatic winner
  functions — no `derivePrevailingAuthority` or equivalent exists anywhere
  in this module. See §5.1.
- **XLII. No relationship or amendment event verified without evidence.**
  Mirrors invariant III: `AuthorityRelationship.verificationStatus` and
  `AmendmentEvent.verificationStatus` may only be `'VERIFIED'` when
  `evidence` is non-empty. See §4, §5.1.
- **XLIII. Doctrine is never `PRIMARY_BINDING`.** `Authority.sourceType`
  `'ACADEMIC_DOCTRINE'`/`'INSTITUTIONAL_COMMENTARY'` may never carry
  `legalRole: 'PRIMARY_BINDING'` — enforced by `validarAuthority`, restating
  §5.3. See §5.3.
- **XLIV. No legal effect from source-type label alone.** Nothing derives,
  defaults, or infers `Authority.legalRole` from `Authority.sourceType` — a
  `JURISPRUDENCE` source is not automatically `PRIMARY_BINDING` (or any
  other role) merely because of its `sourceType`. See §5.1.

### Intent/depth exceptions

`EXACT_LOOKUP` (Intent A, per the M1.5 routing matrix) does not require
case-fact subsumption — invariant IV applies to *conclusions*, and an exact
article lookup produces a retrieval result, not a conclusion. The same
applies to `GENERAL_EXPLANATION` (Intent B) unless it asserts something
about a specific factual situation. Exceptions are intent-scoped, never
matter-scoped — there is no "penal is exempt" or "civil is exempt" carve-out.

## 2. What is implemented vs. designed-only in this mission

| Component | Status |
|---|---|
| `CaseFact`, `MissingFact`, `ExplicitInference` (minimal) | **Implemented** — `lib/legal-reasoning/types.ts` |
| Case-fact validators (fail-closed) | **Implemented** — `lib/legal-reasoning/validators.ts` |
| `CitationTrustRecord` (identity/provenance only) | **Implemented** — `lib/legal-reasoning/types.ts` |
| Citation Trust I validators | **Implemented** — `lib/legal-reasoning/validators.ts` |
| `TemporalLegalState`, `AmendmentEvent` | **Implemented** — `lib/legal-reasoning/types.ts` (LR-K7) — §4 |
| `Authority`, `AuthorityRelationship` | **Implemented** — `lib/legal-reasoning/types.ts` (LR-K7) — §5.1 |
| Authority/Temporal validators (`validarAuthority`, `validarAuthorityRelationship`, `validarTemporalLegalState`, `derivarVerificationStatusDesdeSenalLegado`) | **Implemented** — `lib/legal-reasoning/validators.ts` (LR-K7) |
| `Jurisprudence` | Design only — §5.2, not this phase |
| `ApplicableRule` | Design only — not started, not implied by LR-K7 |
| `LegalProposition` | **Implemented** — `lib/legal-reasoning/types.ts` (LR-K3) |
| `NormativeRule`, `RuleElement`, `RuleException` | **Implemented** — `lib/legal-reasoning/types.ts` (LR-K3) |
| LegalProposition/NormativeRule validators | **Implemented** — `lib/legal-reasoning/validators.ts` (LR-K3) |
| Automatic article→rule extraction | **Not implemented, not this phase or any future one implied by LR-K3** |
| `RuleElementAssessment`, `RuleExceptionAssessment`, `Subsumption` | **Implemented** — `lib/legal-reasoning/types.ts` (LR-K4) |
| Subsumption validators (`validarSubsumption` + derivations) | **Implemented** — `lib/legal-reasoning/validators.ts` (LR-K4) |
| `ConclusionTrace`, `ConclusionBlocker`, `ConclusionUncertainty` (`LEGAL_CONCLUSION`) | **Implemented** — `lib/legal-reasoning/types.ts` (LR-K5) |
| ConclusionTrace validators (`validarConclusionTrace` + derivations) | **Implemented** — `lib/legal-reasoning/validators.ts` (LR-K5) |
| `PROCEDURAL_CONCLUSION` / `STRATEGIC_ASSESSMENT` reasoning | Type exists, explicitly rejected by the validator — future layers, §9 |
| `PropositionClaim`, `EvidenceLocator`, `PropositionSupportRecord` (Citation Trust II classification) | **Implemented** — `lib/legal-reasoning/types.ts` (LR-K6A) |
| Proposition-support validators (`validarPropositionSupportRecord` + derivations) | **Implemented** — `lib/legal-reasoning/validators.ts` (LR-K6A) |
| `EvidenceSpan`, `SupportAdjudication` (Citation Trust II evidence binding) | **Implemented** — `lib/legal-reasoning/types.ts` (LR-K6.1) |
| Evidence-binding validators + conflict-aware aggregation (`validarSupportAdjudication`, `agregarSoportePorProposicion`, `agregarAdjudicacionesPorProposicion`) | **Implemented** — `lib/legal-reasoning/validators.ts` (LR-K6.1) |
| Semantic adjudication runtime (a model/rule actually reading evidence text and deciding entailment) | **Not started, not this phase** — §6.5 |
| Ephemeral per-query reasoning trace (CaseFact→RuleElement→NormativeRule→LegalSource→Conclusion chain) | Design only — §10 |

## 3. Case fact / legal source separation

Three distinct epistemic objects, never merged:

- **`CaseFact`** — something asserted or established about *this matter*
  (§4.1). Belongs to the client's situation, not to the law.
- **`LegalProposition`** — a proposition *attributed to a legal source*
  ("Art. 1605 CC requires X for a valid sale"). Belongs to the law, as read.
- **`NormativeRule`** (§7) — the atomic rule *derived* from a
  `LegalProposition`, structured enough to subsume facts against (elements,
  exceptions, consequence).

Earlier drafts of this architecture used `SOURCE_FACT` as a fact-origin
value inside `CaseFact`. That conflated a case fact with a legal source and
is removed — a case fact's origin is always about the client's matter
(`USER_STATEMENT`/`USER_DOCUMENT`/`PROCEDURAL_RECORD`), never "the law says
so." A proposition read from a source is a `LegalProposition`, not a
`CaseFact`.

## 4. Temporal model (binding, implemented LR-K7)

Legal status and verification confidence are **two different axes** and
must never be mixed into one field. `es_norma_vigente=true` in
`biblioteca_vectores` **does not automatically mean `VERIFIED`** — it is,
today, legacy ingestion metadata with no independent confirmation step
behind it. It can support `PARTIAL` at best until a real verification
process exists — the single, explicit translation of that legacy boolean
into a `LegalVerificationStatus` is `derivarVerificationStatusDesdeSenalLegado`
(`lib/legal-reasoning/validators.ts`), which can never return `VERIFIED`
regardless of the boolean's value (invariant XXXVIII).

```ts
interface TemporalLegalState {
  legalStatus: 'VIGENTE' | 'DEROGADO' | 'PARCIALMENTE_VIGENTE' | 'SUSPENDIDO' | 'UNKNOWN';
  verificationStatus: 'VERIFIED' | 'PARTIAL' | 'UNRESOLVED';
  validFrom?: string;   // ISO date, when known
  validTo?: string;

  amendmentEvents: AmendmentEvent[];
}

interface AmendmentEvent {
  type: 'REFORMA' | 'DEROGACION' | 'SUSTITUCION' | 'RESTAURACION' | 'OTHER';
  instrument: string;          // e.g. "Decreto 284-2013"
  date?: string;
  gacetaRef?: string;
  affectedProvision: string;   // e.g. "Art. 380 Código de Comercio"
  evidence: string[];          // pointers to the source text/decree -- may be empty ONLY when not VERIFIED (invariant XLII)
  provenance?: CanonicalLegalReference; // optional structured locator, when the amending instrument itself resolves to one
  verificationStatus: 'VERIFIED' | 'PARTIAL' | 'UNRESOLVED';
}
```

**`REFORMADO` is an amendment event, not a terminal `legalStatus`.** A
reformed article is still `VIGENTE` in its amended form (or
`PARCIALMENTE_VIGENTE` if only part of it changed) — "reformado" describes
a version relationship, not that the article stopped being law. Modeling it
as a `legalStatus` value would make every amended-but-current article look
repealed, which is exactly backwards. This directly generalizes what CC-2
already discovered by hand for Decreto 284-2013 Art. 37 (repeals Arts.
380–383 of the Código de Comercio) vs. Art. 13/14 (amends other articles,
does not repeal them) — that distinction is precisely `legalStatus` vs.
`amendmentEvents[].type` (invariant XL). Symmetrically, `legalStatus:
"DEROGADO"` is never a bare declaration: `validarTemporalLegalState`
(`lib/legal-reasoning/validators.ts`) requires at least one `AmendmentEvent`
with `type: "DEROGACION"`, `verificationStatus: "VERIFIED"`, and non-empty
`evidence` before accepting it.

The ingestion pipeline's own internal review-stage labels (invariant VI)
remain entirely separate and are not referenced anywhere in this module
(invariant XXXIX).

## 5. Authority and jurisprudence models (binding; Authority implemented LR-K7, Jurisprudence design-only)

### 5.1 Authority — no numeric hierarchy (implemented LR-K7)

A single numeric ranking field was proposed in the earlier draft and is
**removed**. A numeric field invites exactly the mistake the Control Plane
flagged: comparing jurisprudence and a regulation on the same scale as if
"level 3 beats level 5" were a legal argument (invariant XXXVII). Cross-type
hierarchy is represented by explicit, evidenced relationships instead:

```ts
interface Authority {
  sourceType: 'CONSTITUTION' | 'TREATY' | 'STATUTE' | 'REGULATION' | 'JURISPRUDENCE'
            | 'INSTITUTIONAL_COMMENTARY' | 'ACADEMIC_DOCTRINE' | 'PRACTICE_TEMPLATE' | 'OTHER';
  legalRole: 'PRIMARY_BINDING' | 'INTERPRETIVE' | 'PERSUASIVE' | 'PRACTICE_GUIDANCE' | 'DISCOVERY_ONLY';
  jurisdiction: string;               // 'HN' | other
  provenance: CanonicalLegalReference; // reused from lib/exequatur/curriculum/types.ts, not reinvented
}

interface AuthorityRelationship {
  source: CanonicalLegalReference;
  target: CanonicalLegalReference;
  relation: 'CONSTITUTIONAL_SUPREMACY' | 'SPECIAL_OVER_GENERAL' | 'LATER_OVER_EARLIER'
          | 'AMENDS' | 'REPEALS' | 'INTERPRETS' | 'APPLIES' | 'DISTINGUISHES' | 'CITES' | 'UNKNOWN';
  verificationStatus: 'VERIFIED' | 'PARTIAL' | 'UNRESOLVED';
  evidence: string[]; // pointers to the source text/decree establishing the relation -- may be empty ONLY when not VERIFIED (invariant XLII)
}
```

**No relationship may be invented from model expectation alone** (invariant
XLI). `CONSTITUTIONAL_SUPREMACY` must be asserted from verified Honduran
constitutional text (Arts. 16/18/64/320, already named in
`MAYA_LEX_SYSTEM_PROMPT`) before being marked `VERIFIED` — never assumed
because "constitutions always win." Likewise, *lex specialis* and *lex
posterior* are not blind automatic tie-breaker functions: they produce an
`AuthorityRelationship` with a `verificationStatus`, which can legitimately
be `UNRESOLVED` when the specialty/timing itself is contested or unclear.
There is no `derivePrevailingAuthority` or equivalent anywhere in
`lib/legal-reasoning/` — `validarAuthorityRelationship` only audits
structural coherence (enum membership, evidence required for `VERIFIED`),
never decides a winner.

**No legal effect from source-type label alone** (invariant XLIV):
`validarAuthority` never derives, defaults, or infers `legalRole` from
`sourceType` — a `JURISPRUDENCE` source is not automatically
`PRIMARY_BINDING` (or any other role) merely because of its `sourceType`;
`legalRole` is always independently declared by the caller and only
structurally validated.

### 5.2 Jurisprudence — effect is never assumed from the court label (design only, not LR-K7)

```ts
interface Jurisprudence {
  court: string;
  chamber: string;
  date?: string;
  caseNumber?: string;
  decisionType: string;
  procedureType: string;

  materialFacts: string;
  legalIssue: string;
  ruleInterpreted: string;
  holding: string;
  ratio: string;

  legalEffect: 'GENERAL_ERGA_OMNES' | 'CASE_SPECIFIC' | 'INTERPRETIVE' | 'UNRESOLVED';
  propositionSupported: string;
  treatment: 'SUPPORTS' | 'CONTRADICTS' | 'DISTINGUISHABLE' | 'BACKGROUND_ONLY' | 'UNRESOLVED';

  similarities: string[];
  distinctions: string[];

  effectVerificationStatus: 'VERIFIED' | 'PARTIAL' | 'UNRESOLVED';
  sourceProvenance: CanonicalLegalReference | { url: string; retrievedAt: string };
}
```

**A Sala de lo Constitucional ruling is not `GENERAL_ERGA_OMNES` merely
because of the chamber.** `legalEffect` defaults to `UNRESOLVED` until the
decision's own text and a verified legal basis (e.g., the specific
constitutional provision granting that chamber's rulings general effect in
that particular procedure type) support otherwise. **Semantic retrieval
must never assign `treatment` or `legalEffect` automatically** — a
high-similarity match only populates `similarities`/`distinctions` for
explicit reasoning over; it never auto-becomes `SUPPORTS` or
`GENERAL_ERGA_OMNES`. This is the concrete mechanism behind "semantic
similarity != legal analogy," restated from M1.5 and now corrected per the
binding jurisprudence amendment.

### 5.3 Doctrine (enforced in code, LR-K7)

Doctrine (`ACADEMIC_DOCTRINE`, `INSTITUTIONAL_COMMENTARY`) remains
`DISCOVERY_ONLY` today, with `PERSUASIVE` reserved for a future phase that
explicitly authorizes it. **Never `PRIMARY_BINDING`** (invariant XLIII) —
`validarAuthority` rejects any `Authority` with a doctrinal `sourceType` and
`legalRole: "PRIMARY_BINDING"`, not just as prose. This preserves
`FUENTES_DOCTRINALES` (`lib/legal-retrieval/evidence-engine.ts`) exactly as
it is — that mechanism is not touched, weakened, or superseded by this
document; `Authority.legalRole` generalizes the same judgment it already
encodes, it doesn't replace the code that enforces it.

### 5.4 Authority/Temporal qualification != ApplicableRule (LR-K7)

Neither `Authority`/`AuthorityRelationship` nor `TemporalLegalState`
decides, or may be used to decide, whether a `NormativeRule` is the one
that legally controls a case, is current, or outranks a competing rule for
a specific `Subsumption`/`ConclusionTrace` — that remains `ApplicableRule`,
entirely unbuilt and unimplied by this phase. LR-K7 answers "what weight
does this source carry" and "is this provision in force," never "does this
rule apply here." Nothing in `lib/legal-reasoning/` wires `Authority` or
`TemporalLegalState` into `Subsumption`, `ConclusionTrace`,
`ConclusionUncertainty.authorityStatus`, or
`ConclusionUncertainty.temporalStatus` — those two fields remain hard-locked
to `'NOT_EVALUATED'` (§9.1, invariant XX), unchanged by this phase.

## 6. Citation Trust I and II (both implemented — classification + evidence binding)

### 6.1 Scope of LR-K2

Citation Trust I answers exactly one question: **"Is this citation's
identity and provenance real?"** — does the cited instrument/article exist,
is the document version known, is there hashable evidence behind it. It
does **not** answer "does the source actually support the proposition
MayaLex attributes to it" — that is Citation Trust II's question
(§6.3–§6.5, implemented, not deferred).

```ts
type CitationVerificationState = 'VERIFIED' | 'PARTIAL' | 'UNRESOLVED' | 'DISCOVERY_ONLY';
type DocumentVersionStatus = 'VERIFIED' | 'UNVERIFIED';

interface CitationTrustRecord {
  proposition: string;
  instrumento: string | null;   // InstrumentoNormalizado value where applicable, reused not reinvented
  articulo: string | null;
  fuente: string;
  documentVersion: string | null;  // an IDENTIFIER, never itself a verification claim
  versionStatus: DocumentVersionStatus; // whether THAT identified version has actually been confirmed
  verificationState: CitationVerificationState;
  hash?: string;
}
```

`documentVersion` and `versionStatus` are deliberately separate fields.
Knowing *which* version a citation claims to be (`documentVersion`) is not
the same as knowing whether that specific version has been confirmed
(`versionStatus`) — conflating them was the exact mistake that would let a
citation "sound precise" (has a version string) while being entirely
unverified.

This extends `Cita` (`lib/legal-retrieval/evidence-engine.ts`) conceptually
— `Cita` is not replaced, deprecated, or modified by this mission.
`CitationTrustRecord` is a separate, additive structure for the reasoning
kernel; nothing in `evidence-engine.ts` or the response pipeline consumes
it yet.

**Recorded typed debt (Mission LR-K3, Cursor finding):**
`CitationTrustRecord.instrumento` is typed `string | null`, not
`InstrumentoNormalizado | null` (`lib/rag/search.ts`) — the stricter typing
that LR-K3's `CanonicalLegalReference`-based types (`LegalProposition.sources`,
`NormativeRule.sources`) now use. Left unchanged deliberately: it has no
runtime consumer yet, and reopening an already-reviewed, gated-`PASS` LR-K2
artifact for an incidental type tightening (rather than a substantive
reason) was judged higher-risk than the debt itself. Tighten it the next
time LR-K2 is revised for a reason that actually requires it.

### 6.2 Binding rule

**No verified citation without verified evidence** (invariant III): a
record can only be constructed/validated as `VERIFIED` when `versionStatus
=== 'VERIFIED'` **and** identifiable evidence (`hash`) is present. An
`UNRESOLVED` record — the typed equivalent of today's `[VERIFICAR]` marker
— is not an error state. It's a legitimate, stable value. It must never be
silently promoted to `VERIFIED` without that evidence actually showing up.
`DISCOVERY_ONLY` (e.g., an OSINT/web hit, per the CEDIJ fallback's own
existing metadata-only discipline) can never masquerade as a verified
primary authority regardless of how confident the retrieved text looks.

### 6.3 Citation Trust II — implemented (LR-K6A + LR-K6.1)

Answers: *"Does the retrieved source actually support the legal proposition
MayaLex attributes to it?"* — proposition support, not identity. This is a
distinct, harder problem than LR-K2's (it requires comparing evidence
content against a claim, not just confirming a citation resolves to a real
document) — **LR-K2 never attempted it**, and this section previously
deferred it to "a future LR-K6 phase." It's implemented now
(`lib/legal-reasoning/types.ts`, `lib/legal-reasoning/validators.ts`) —
see §6.4.

**6.3.1 Structural validation != evidence binding (invariant IX).** A
`CitationTrustRecord`, `LegalProposition`, or `NormativeRule` that passes
its validator only proves the object is internally coherent — required
fields present, enums valid, `VERIFIED` states carry a `hash` and a
confirmed `versionStatus`. **The presence of a `hash` alone is never treated
as proof that evidence was actually retrieved at runtime** — these
validators operate purely on already-constructed objects and have no
retrieval dependency (by design, per LR-K3 §11: no LLM calls, no runtime
retrieval integration in this kernel). A future phase that constructs these
objects from real retrieval output is responsible for actually binding
`hash` to genuine evidence; this layer only checks that *if* a `VERIFIED`
claim is made, the required fields accompanying it are present.

### 6.4 Proposition support classification contract (LR-K6A)

**LR-K6A validates that a caller-provided claim classification is internally
coherent. It does not, by itself, bind that classification to individually
auditable evidence, and its original `esProposicionCompletamenteRespaldada`
had a real defect — see §6.5, which corrects both.**

Propositions are decomposed into explicit claim units **by the caller** — a
fixture today, an authorized extraction phase later — never inferred by
this module. `PropositionClaim` links back to `LegalProposition` by
`propositionId`, the same non-nesting pattern `Subsumption` uses for
`ruleId`, so LR-K3's already-reviewed type is never reopened.

```ts
type PropositionSupportStatus = 'SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'CONTRADICTED' | 'NOT_SUPPORTED' | 'UNRESOLVED';

interface PropositionClaim { id: string; propositionId: string; text: string; }

interface EvidenceLocator {
  citationTrustRecordId: string;
  fragmentId?: string; page?: number; textRange?: string; hash?: string;
}

interface PropositionSupportRecord {
  id: string;
  propositionId: string;
  citationTrustRecordIds: string[];
  status: PropositionSupportStatus;
  supportedClaims: string[];
  unsupportedClaims: string[];
  contradictoryClaims: string[];    // a claim conflicting with even one source goes here, never in supportedClaims
  evidenceLocators: EvidenceLocator[];
  notes?: string;
}
```

**Status is derived, never declared freely** (same discipline as §8.2/§9.1),
in strict priority order: **`CONTRADICTED`** (any claim in
`contradictoryClaims` — invariant XXVI, this outranks everything, including
an unclassified claim elsewhere) → **`UNRESOLVED`** (any claim belonging to
the proposition isn't classified into any of the three arrays, or the
proposition has zero claims at all) → **`SUPPORTED`** (every claim is in
`supportedClaims`) → **`PARTIALLY_SUPPORTED`** (some but not all) →
**`NOT_SUPPORTED`** (all claims classified, none supported, no
contradiction). `SUPPORTED`/`PARTIALLY_SUPPORTED`/`CONTRADICTED` all require
at least one `EvidenceLocator` resolving to a citation declared in the
record's own `citationTrustRecordIds` — support is never asserted without a
resolvable relation to real evidence, and never "borrowed" from a citation
the record didn't declare.

**Conflicting sources** (§17 of the LR-K6 directive: one source supports a
claim, another contradicts it) are represented by placing that claim in
`contradictoryClaims` — contradiction wins at the claim level exactly as it
wins at the record level. No dedicated conflict state was added, kept
minimal per instruction.

**Recorded debt:** `CitationTrustRecord` (LR-K2) has no `id` field of its
own — modeled as a value object, like `Cita` in `evidence-engine.ts`.
`IdentifiedCitationTrustRecord { id, record }` assigns an id externally so
LR-K6A/K6.1 can reference specific citations, without reopening or
modifying `CitationTrustRecord` itself. Retire this wrapper only if a future
phase gives `CitationTrustRecord` its own id for a substantive reason.

**Relation to `NormativeRule` (§18 of the LR-K6.1 directive):**
`PropositionSupport = SUPPORTED` never implies a `NormativeRule` built from
that proposition is legally correct — source support and reasoning
correctness remain separate axes, restated from invariant VIII.

**Relation to `ConclusionTrace` (§19 of the LR-K6.1 directive, not wired
now):** a future runtime integration must prevent a `SUPPORTED`
`LEGAL_CONCLUSION` from relying on a `LegalProposition` whose support is
`CONTRADICTED`, `NOT_SUPPORTED`, or `UNRESOLVED`, unless the conclusion is
explicitly downgraded or blocked. `ConclusionTrace` (§9) is not modified in
this phase to enforce this — documented here as a requirement for whichever
future phase wires Citation Trust II into LR-K5's validation path.

**Boundaries (invariants XXIII/XXIV):** semantic similarity, vector scores,
and reranker output are never read or derived from anywhere in this
contract — `validarPropositionSupportRecord` only audits a
claim-to-evidence classification the caller already decided, the same
"fixtures instantiate explicit assessments manually" discipline as LR-K4's
`Subsumption`. No LLM call, no embedding call, no Authority or Temporal
decision, no `NormativeRule` legal-correctness claim.

### 6.5 Evidence binding + conflict-aware aggregation (LR-K6.1)

**Corrects a real defect Cursor found:** the original
`esProposicionCompletamenteRespaldada` used `.some(status === 'SUPPORTED')`
— a single `SUPPORTED` `PropositionSupportRecord` was enough to return
`true`, even when *another* record for the same proposition said
`CONTRADICTED`. Fixed here, and made stricter: it now requires
evidence-bound `SupportAdjudication`s, not merely a flat claim
classification.

```ts
interface PropositionClaim { id: string; propositionId: string; text: string; required: boolean; }

type EvidenceRole = 'HOLDING' | 'RATIO' | 'OBITER' | 'PARTY_ARGUMENT' | 'DISSENT'
                   | 'FACTUAL_FINDING' | 'PROCEDURAL_HISTORY' | 'STATUTORY_TEXT' | 'DOCTRINE' | 'UNKNOWN';

interface EvidenceSpan {
  citationTrustRecordId: string;
  fragmentId?: string; page?: number;
  startOffset?: number; endOffset?: number;
  quotedText?: string; hash?: string;
  evidenceRole?: EvidenceRole;   // invariant XXXVI: never auto-classified, 'UNKNOWN' or absent only in this phase
}

type SupportAdjudicationStatus = 'SUPPORTS' | 'PARTIALLY_SUPPORTS' | 'CONTRADICTS' | 'DOES_NOT_SUPPORT' | 'UNRESOLVED';
type AdjudicationOrigin = 'HUMAN' | 'EXACT_TEXT_RULE' | 'EXTERNAL_REASONER';   // provenance label only -- no model call in this phase

interface SupportAdjudication {
  id: string; propositionId: string; claimId: string;
  evidenceSpan: EvidenceSpan;            // required, always -- invariant XXVIII
  status: SupportAdjudicationStatus;
  origin: AdjudicationOrigin;            // required, always -- invariant XXVIII
  rationale?: string;
}

interface AggregatedPropositionSupport {
  propositionId: string;
  status: PropositionSupportStatus;
  requiredClaimIds: string[];
  supportingClaimIds: string[];    // never emptied just because contraryClaimIds is non-empty -- invariant XXXII
  contraryClaimIds: string[];      // never emptied just because supportingClaimIds is non-empty
  unresolvedClaimIds: string[];
  notSupportedClaimIds: string[];
}
```

**Aggregation is required-claim-scoped** (invariant XXXIII): a claim marked
`required: false` can be contradicted or unaddressed without blocking full
support; only `required: true` claims drive `status`. Priority order,
identical for `agregarSoportePorProposicion` (over `PropositionSupportRecord[]`)
and `agregarAdjudicacionesPorProposicion` (over `SupportAdjudication[]`):
a contradicted *required* claim → `CONTRADICTED` (invariant XXIX/XXVI,
outranks everything) → any required claim left unclassified → `UNRESOLVED`
→ every required claim supported → `SUPPORTED` → some but not all →
`PARTIALLY_SUPPORTED` → none supported, all examined → `NOT_SUPPORTED`.
Both functions return the full `AggregatedPropositionSupport`, never a bare
status string — `contraryClaimIds` and `supportingClaimIds` are always both
present in the result, regardless of which one determined the final
`status` (invariant XXXII: no confirmation-bias discarding).

**`DOES_NOT_SUPPORT` != `UNRESOLVED`** (invariant XXXIV): a claim with an
adjudication that explicitly examined the evidence and found no support
lands in `notSupportedClaimIds`. A claim with *no* adjudication at all, or
only `UNRESOLVED` ones, lands in `unresolvedClaimIds` — **never**
`notSupportedClaimIds`. This is also the negative-evidence principle
(invariant XXXV): "no supporting authority was found in the corpus
consulted" is `UNRESOLVED`, never `NOT_SUPPORTED` — the system must never
manufacture "no such authority exists" out of a retrieval gap.

**Corrected helper:**

```ts
function esProposicionCompletamenteRespaldada(
  proposicion: LegalProposition,
  claims: PropositionClaim[],
  adjudicaciones: SupportAdjudication[],
): boolean {
  if (!esProposicionConFuenteVerificada(proposicion)) return false;   // LR-K2/K3, unmodified
  const agregado = agregarAdjudicacionesPorProposicion(proposicion.id, adjudicaciones, claims);
  if (agregado.requiredClaimIds.length === 0) return false;
  return agregado.status === 'SUPPORTED';
}
```

Returns `true` only when every required claim has an explicit, evidence-bound
`SUPPORTS` adjudication (each already checked by `validarSupportAdjudication`
against real `citations`), none is `CONTRADICTS`, and none is left
unresolved — fail-closed by construction, not by a patched-on special case.
**Signature change from LR-K6A's original** (`PropositionSupportRecord[]` →
`claims` + `SupportAdjudication[]`): authorized explicitly by this mission
to fix the reported defect properly, not an unauthorized reopening.

**Structural validation != support adjudication** (invariant XXX):
`validarSupportAdjudication` confirms an adjudication references a real
proposition, claim, and citation, and carries an explicit origin — it never
verifies that `quotedText` is an accurate reading of the source, and never
calls out to fetch or OCR anything. **Support adjudication != legal
correctness** (invariant XXXI): even a fully evidence-bound, conflict-free
`SUPPORTED` aggregate says nothing about whether the claim is ultimately
correct, current, or controlling.

**EvidenceConflict != LegalConflict:** an `EvidenceConflict` is what this
phase detects — records or adjudications disagree about the same claim. A
`LegalConflict` is why authorities might legitimately conflict: hierarchy,
temporal change, speciality, jurisdiction, later precedent, legislative
reform, or distinguishable facts. **K6.1 detects and preserves
`EvidenceConflict`; it never resolves `LegalConflict`** — that remains
Authority/Temporal/`ApplicableRule`, none of which exist yet.

**Future chain compatibility:** nothing in this design blocks `LegalProposition
→ RequiredClaims → EvidenceSpan → SupportAdjudication → ConflictAggregation
→ Authority → TemporalValidity → ApplicableRule → LegalInference →
Conclusion` from being built out later. **K6.1 stops at
ConflictAggregation** — the four steps after it remain entirely unbuilt and
unimplied.

## 7. Legal proposition and normative rule

**Implemented in LR-K3** (`lib/legal-reasoning/types.ts`,
`lib/legal-reasoning/validators.ts`) — this section is no longer design-only
for these two types. `Subsumption` (§8) is **also implemented**, as of
LR-K4 — see §2's status table. `ConclusionTrace` (§9, LR-K5) is likewise
implemented; only `Conclusion`'s `PROCEDURAL_CONCLUSION`/
`STRATEGIC_ASSESSMENT` reasoning and the standalone reasoning trace (§10)
remain design-only.
<!-- Documentation-drift fix (Mission LR-K5 §25, Cursor finding): this
paragraph previously said Subsumption "remain[ed] design-only" after LR-K4
had already implemented it. Corrected here, on the LR-K5 branch only — the
already-reviewed LR-K4 commit is not touched. -->


### 7.1 Three distinct epistemic objects (binding, restated from §3)

`CaseFact != LegalProposition != NormativeRule != Conclusion`. A
`CanonicalLegalReference` is a **locator** (instrumento + articulo) — it is
not automatically a rule. **`ARTICLE != NORMATIVE RULE`**: one article can
contain multiple rules (a requirement, its consequence, and an exception can
all sit in the same article, or across several); one rule can depend on
multiple sources (a definition elsewhere, an exception in a different
article, even a different instrument). There is no `1 article = 1 rule`
assumption anywhere in these types.

```ts
type LegalVerificationStatus = 'VERIFIED' | 'PARTIAL' | 'UNRESOLVED';
type PropositionType = 'TEXTUAL' | 'PARAPHRASED' | 'INTERPRETIVE';

interface LegalProposition {
  id: string;
  proposition: string;
  sources: CanonicalLegalReference[];       // never empty
  citationTrust: CitationTrustRecord[];     // LR-K2 records for the sources above
  propositionType: PropositionType;
  verificationStatus: LegalVerificationStatus;
  notes?: string;
}
```

`VERIFIED` requires both a non-empty `sources` array and at least one
`citationTrust` entry independently confirmed as verified (LR-K2's
`esAutoritativaVerificada`) — a proposition cannot claim `VERIFIED` on the
strength of its own say-so. Per invariant VIII, `VERIFIED` here means
*source support is confirmed* — never that a `PARAPHRASED` or
`INTERPRETIVE` reading of that source is the *correct* one.

```ts
type RuleType = 'DEFINITION' | 'REQUIREMENT' | 'PROHIBITION' | 'PERMISSION' | 'OBLIGATION'
              | 'PRESUMPTION' | 'EXCEPTION' | 'DEADLINE' | 'COMPETENCE' | 'PROCEDURAL_RULE' | 'LEGAL_CONSEQUENCE';

interface RuleElement {
  id: string;
  description: string;
  required: boolean;
  // No satisfied/unsatisfied/missing -- that's Subsumption (§8, LR-K4).
}

interface RuleException {
  id: string;
  description: string;
  source?: CanonicalLegalReference;   // an exception may cite a different provision entirely
  propositionId?: string;
}

interface NormativeRule {
  id: string;
  propositionIds: string[];           // never inline proposition text
  sources: CanonicalLegalReference[]; // never empty; may span multiple instruments
  ruleType: RuleType;
  elements: RuleElement[];            // may be empty -- see contract below
  exceptions: RuleException[];        // never merged into elements
  verificationStatus: LegalVerificationStatus;
}
```

**Empty-`elements` contract:** an empty array is never rejected as a
structural error by itself. `DEFINITION`, `DEADLINE`, and `COMPETENCE` rules
in particular may have no element checklist and still be perfectly valid at
this layer — the validator does not invent a minimum element count per
`ruleType`; that judgment requires real corpus grounding a future phase
would supply, not an arbitrary rule here.

**Exceptions are never folded into `elements`.** `RuleException` is its own
type, with its own optional source — an exception qualifying a rule from a
*different* article (the canonical case: "Art. X applies, salvo lo
dispuesto en el artículo Z") remains a separate, auditable object pointing
at `Art. Z`, never a fifth line item indistinguishable from `elements A/B/C`.

**Not implemented, not implied by LR-K3:** automatic article→rule
extraction, any LLM call, `ApplicableRule`, `Authority`
evaluation, temporal qualification, jurisprudence, or strategic
analysis. (`Subsumption` and `ConclusionTrace` were out of scope for LR-K3
specifically, but are now implemented — LR-K4 and LR-K5 respectively; see
§8/§9, not left permanently unimplemented as this sentence's original
LR-K3-era wording could be misread to suggest.)
`MAYA_PENAL_MODULES`'s Capa 2 (tipicidad
elements: verbo rector, sujeto activo/pasivo, bien jurídico, resultado,
dolo/culpa) is the closest existing prose analogue — a future phase would
formalize that specific, already-working checklist as the first real
`NormativeRule` instances, not invent new legal content.

## 8. Subsumption — generic core, not penal-first

**Implemented in LR-K4** (`lib/legal-reasoning/types.ts`,
`lib/legal-reasoning/validators.ts`). Answers, structurally only: *given
`NormativeRule` R, how do the supplied `CaseFact`s map against its elements
and exceptions?* It never decides whether R legally applies, is current,
outranks a competing rule, or supports a final conclusion — those remain
later layers (§8.2, invariant XII).

```ts
type ElementAssessmentStatus = 'SATISFIED' | 'UNSATISFIED' | 'UNKNOWN';

interface RuleElementAssessment {
  elementId: string;
  status: ElementAssessmentStatus;
  supportingFactIds: string[];    // non-empty required when SATISFIED (invariant X)
  contradictingFactIds: string[]; // non-empty required when UNSATISFIED (invariant XIII)
  missingFactIds: string[];       // optional even when UNKNOWN
  reasoningNote?: string;
}

type ExceptionAssessmentStatus = 'APPLIES' | 'DOES_NOT_APPLY' | 'UNKNOWN';

interface RuleExceptionAssessment {
  exceptionId: string;
  status: ExceptionAssessmentStatus;
  supportingFactIds: string[];
  contradictingFactIds: string[];
  missingFactIds: string[];
}

type SubsumptionAnalysisStatus = 'COMPLETE' | 'INCOMPLETE' | 'BLOCKED';

interface Subsumption {
  id: string;
  ruleId: string;
  caseFactIds: string[];
  missingFactIds: string[];
  elementAssessments: RuleElementAssessment[];
  exceptionAssessments: RuleExceptionAssessment[];
  analysisStatus: SubsumptionAnalysisStatus;
  unresolvedElementIds: string[];
}
```

### 8.1 Coverage, exceptions, and fact-reference discipline

`validarSubsumption` enforces, deterministically:

- Every **required** `RuleElement` on the referenced rule has exactly one
  assessment — a required element cannot silently disappear.
- **Every** `RuleException` on the rule has exactly one assessment, with no
  "optional" exceptions — invariant XIV. An exception is never merged into
  `elementAssessments`.
- Every fact id any assessment cites must be a real `CaseFact`/`MissingFact`
  **and** be explicitly declared in that `Subsumption`'s own `caseFactIds`/
  `missingFactIds` — a fact that exists elsewhere in the system but wasn't
  declared as part of this analysis cannot be "borrowed."
- `SATISFIED` requires a non-empty `supportingFactIds` (invariant X);
  `UNSATISFIED` requires a non-empty `contradictingFactIds` — the absence of
  a fact is never itself treated as an affirmative failure (invariant XIII,
  `UNKNOWN != UNSATISFIED`).

### 8.2 `analysisStatus` is derived, never declared freely

`derivarAnalysisStatusSubsuncion` computes the only value `analysisStatus`
may legally hold, and `validarSubsumption` rejects any mismatch:

- **`BLOCKED`** — at least one exception assessment is `UNKNOWN`. Treated as
  more fundamental than an unresolved element: if the exception might
  apply, the rule might not even operate, so "incomplete" would understate
  the gap.
- **`INCOMPLETE`** — no exception is `UNKNOWN`, but at least one required
  element is.
- **`COMPLETE`** — every required element and every exception is resolved
  (not `UNKNOWN`).

**None of these three values is a legal verdict.** `COMPLETE` means only
that this shadow layer's bookkeeping is structurally finished — it never
means a claim succeeds, an offense is established, a contract is valid, or
any right exists. No `Subsumption` field expresses a final conclusion,
procedural recommendation, strategic assessment, or confidence score; those
remain out of scope (§9, design only).

### 8.3 Generic-first, proven with two golden fixtures

The penal six-layer method (`MAYA_PENAL_MODULES`) remains a **matter-specific
adapter over this generic contract**, not the other way around — there is
no `PenalSubsumption` or `CivilSubsumption` parent type.
`tests/legal-reasoning-subsumption.test.ts` proves this with two independent
synthetic fixtures sharing the identical `Subsumption`/`NormativeRule`
shape: a civil-style rule (elements A/B/C, exception Z) and a penal-style
rule (conduct/objective-circumstance/subjective-element, no exceptions) —
neither fixture declares a legal outcome, guilt, liability, or a procedural
recommendation.

### 8.4 Recorded limitation (not fixed in LR-K4)

`NormativeRule.verificationStatus === 'VERIFIED'` is, today, shape-level
contract state only — `validarNormativeRule` (§7) does not require a
verified `CitationTrustRecord` the way `validarLegalProposition` does.
Subsumption validation in this phase **never reads or depends on**
`NormativeRule.verificationStatus` for exactly this reason — mapping facts
against elements is deliberately independent of whether the rule's own
source evidence has been confirmed. Closing that gap belongs to a future
Citation Trust / NormativeRule reconciliation, not to LR-K4.

## 9. Conclusion traceability

**`LEGAL_CONCLUSION` implemented in LR-K5** (`lib/legal-reasoning/types.ts`,
`lib/legal-reasoning/validators.ts`). `PROCEDURAL_CONCLUSION` and
`STRATEGIC_ASSESSMENT` exist in the `ConclusionType` union so a future phase
doesn't need to redesign it, but are **explicitly rejected** by
`validarConclusionTrace` in this phase — never half-validated, never
populated by new logic.

```ts
type ConclusionType = 'LEGAL_CONCLUSION' | 'PROCEDURAL_CONCLUSION' | 'STRATEGIC_ASSESSMENT';
type ConclusionStatus = 'SUPPORTED' | 'PARTIAL' | 'BLOCKED' | 'UNRESOLVED';

interface ConclusionBlocker {
  type: 'MISSING_FACT' | 'UNRESOLVED_ELEMENT' | 'UNRESOLVED_EXCEPTION' | 'INCOMPLETE_SUBSUMPTION'
      | 'AUTHORITY_NOT_EVALUATED' | 'TEMPORAL_STATUS_NOT_EVALUATED' | 'OTHER';
  referenceId?: string;
  description: string;
}

interface ConclusionUncertainty {
  factCompleteness: 'COMPLETE' | 'PARTIAL' | 'UNRESOLVED';
  ruleVerification: 'VERIFIED_SHAPE' | 'PARTIAL' | 'UNRESOLVED';   // never the bare 'VERIFIED' literal -- see below
  subsumptionCompleteness: SubsumptionAnalysisStatus;
  authorityStatus: 'NOT_EVALUATED' | 'PARTIAL' | 'UNRESOLVED';     // always NOT_EVALUATED today
  temporalStatus: 'NOT_EVALUATED' | 'PARTIAL' | 'UNRESOLVED';      // always NOT_EVALUATED today
}

interface ConclusionTrace {
  id: string;
  conclusionType: ConclusionType;
  proposition: string;
  status: ConclusionStatus;
  subsumptionIds: string[];     // never empty for LEGAL_CONCLUSION -- invariant XV
  ruleIds: string[];
  supportingFactIds: string[];
  contradictingFactIds: string[];
  missingFactIds: string[];
  unresolvedElementIds: string[];
  unresolvedExceptionIds: string[];
  blockedBy: ConclusionBlocker[];
  uncertainty: ConclusionUncertainty;
  notes?: string;
}
```

### 9.1 Everything is derived, nothing is declared freely

`validarConclusionTrace` cross-checks every one of `status`,
`unresolvedElementIds`, `unresolvedExceptionIds`, and every field of
`uncertainty` against what the referenced `Subsumption`/`NormativeRule`
records actually contain — the same "declared value must equal derived
value" discipline as §8.2. `ConclusionStatus` derivation ranks, in order:
a detected **structural conflict** (the same `CaseFact` id used as support
in one referenced `Subsumption`'s assessment and as contradiction in
another — a purely mechanical signal, never semantic adversarial reasoning)
→ `UNRESOLVED`; any referenced `Subsumption` `BLOCKED` → `BLOCKED`; any
`INCOMPLETE` → `PARTIAL`; otherwise → `SUPPORTED`. `SUPPORTED` requires an
empty `blockedBy`; every other status requires at least one explicit
blocker — **`BLOCKED` is a fully valid, final result** (invariant XVI),
never something to paper over by forcing `SUPPORTED` or omitting the
blocker.

`ruleVerification` never uses the bare `'VERIFIED'` literal that
`NormativeRule.verificationStatus` itself has — it's renamed
`'VERIFIED_SHAPE'` specifically so a `ConclusionTrace` can never be read as
claiming the underlying rule is legally correct or authoritative (invariant
XIX). `authorityStatus`/`temporalStatus` are hard-required to be
`'NOT_EVALUATED'` — not derived, because nothing in this system can
evaluate them yet; `validarConclusionTrace` rejects any other value
outright.

### 9.2 What ConclusionTrace never does

It never mutates a referenced `CaseFact`'s `status` or a `NormativeRule`'s
`verificationStatus` (invariant XVIII/XIX — validators are pure, read-only
functions). It never introduces a fact-support role that wasn't already
established inside a referenced `Subsumption`'s own assessments — "the
trace references Subsumption, it never recreates it." And structural
completeness is never legal correctness (invariant XX): a fully traced,
internally consistent `SUPPORTED` conclusion says nothing about whether the
underlying rule currently applies, is current law, or outranks a competing
rule — that remains a future Authority/Temporal layer's question, tracked
here only as the permanently-`NOT_EVALUATED` fields above.

## 10. Citation / reasoning trace (design only)

A **per-query, per-answer ephemeral trace** — not a persistent knowledge
graph:

```
CaseFact → RuleElement → NormativeRule → LegalSource → Conclusion
```

Each edge must be auditable (which fact fed which element, which rule
produced which conclusion). This trace lives and dies with a single
response; it is not stored as a queryable graph, does not require a graph
database, and does not imply an ontology project. **No Neo4j. No corpus
rewrite.** If a future phase needs to persist anything, that's a distinct,
separately-authorized decision — not implied by this design.

## 11. Non-goals of LR-1 (restated, binding)

No autonomous multi-agent architecture. No legal knowledge graph as a
prerequisite. No new corpus or retrieval architecture (EG-1's retrieval
layer is unchanged and authoritative). No V0–V5 redesign or wiring. No
multi-provider routing. No jurisprudence mega-platform. No four separate
products. No numeric confidence scores anywhere in this model.
