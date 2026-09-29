# LR-1 — MayaLex Legal Reasoning Architecture (Canonical)

**Status:** LR-K0 architecture freeze. LR-K1 (CaseFact/MissingFact), LR-K2
(Citation Trust I), LR-K3 (LegalProposition/NormativeRule), LR-K4 (generic
Subsumption contract), and LR-K5 (Conclusion Traceability, `LEGAL_CONCLUSION`
only) are implemented as shadow/structural types — see
`lib/legal-reasoning/`. Nothing in this document is wired into
`app/api/chat/route.ts`, any system prompt, or any user-facing response. No
behavior changes through LR-K5.

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
| `TemporalLegalState` | Design only — §4 |
| `Authority` / `AuthorityRelationship` | Design only — §5 |
| `Jurisprudence` | Design only — §5 |
| `LegalProposition` | **Implemented** — `lib/legal-reasoning/types.ts` (LR-K3) |
| `NormativeRule`, `RuleElement`, `RuleException` | **Implemented** — `lib/legal-reasoning/types.ts` (LR-K3) |
| LegalProposition/NormativeRule validators | **Implemented** — `lib/legal-reasoning/validators.ts` (LR-K3) |
| Automatic article→rule extraction | **Not implemented, not this phase or any future one implied by LR-K3** |
| `RuleElementAssessment`, `RuleExceptionAssessment`, `Subsumption` | **Implemented** — `lib/legal-reasoning/types.ts` (LR-K4) |
| Subsumption validators (`validarSubsumption` + derivations) | **Implemented** — `lib/legal-reasoning/validators.ts` (LR-K4) |
| `ConclusionTrace`, `ConclusionBlocker`, `ConclusionUncertainty` (`LEGAL_CONCLUSION`) | **Implemented** — `lib/legal-reasoning/types.ts` (LR-K5) |
| ConclusionTrace validators (`validarConclusionTrace` + derivations) | **Implemented** — `lib/legal-reasoning/validators.ts` (LR-K5) |
| `PROCEDURAL_CONCLUSION` / `STRATEGIC_ASSESSMENT` reasoning | Type exists, explicitly rejected by the validator — future layers, §9 |
| Ephemeral per-query reasoning trace (CaseFact→RuleElement→NormativeRule→LegalSource→Conclusion chain) | Design only — §10 |
| Citation Trust II (proposition support) | **Not started, not this phase** — §6.3 |

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

## 4. Temporal model (binding)

Legal status and verification confidence are **two different axes** and
must never be mixed into one field. `es_norma_vigente=true` in
`biblioteca_vectores` **does not automatically mean `VERIFIED`** — it is,
today, legacy ingestion metadata with no independent confirmation step
behind it. It can support `PARTIAL` at best until a real verification
process exists.

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
  source: string;
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
`amendmentEvents[].type`.

`V0`–`V5` remains entirely separate (invariant VI) and is not wired here.

## 5. Authority and jurisprudence models (binding)

### 5.1 Authority — no numeric hierarchy

A single `authorityLevel: number` was proposed in the earlier draft and is
**removed**. A numeric field invites exactly the mistake the Control Plane
flagged: comparing jurisprudence and a regulation on the same scale as if
"level 3 beats level 5" were a legal argument. Cross-type hierarchy is
represented by explicit, evidenced relationships instead:

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
  evidence: string[]; // pointers to the source text/decree establishing the relation
}
```

**No relationship may be invented from model expectation alone.**
`CONSTITUTIONAL_SUPREMACY` must be asserted from verified Honduran
constitutional text (Arts. 16/18/64/320, already named in
`MAYA_LEX_SYSTEM_PROMPT`) before being marked `VERIFIED` — never assumed
because "constitutions always win." Likewise, *lex specialis* and *lex
posterior* are not blind automatic tie-breaker functions: they produce an
`AuthorityRelationship` with a `verificationStatus`, which can legitimately
be `UNRESOLVED` when the specialty/timing itself is contested or unclear.

### 5.2 Jurisprudence — effect is never assumed from the court label

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

### 5.3 Doctrine

Doctrine (`ACADEMIC_DOCTRINE`, `INSTITUTIONAL_COMMENTARY`) remains
`DISCOVERY_ONLY` today, with `PERSUASIVE` reserved for a future phase that
explicitly authorizes it. **Never `PRIMARY_BINDING`.** This preserves
`FUENTES_DOCTRINALES` (`lib/legal-retrieval/evidence-engine.ts`) exactly as
it is — that mechanism is not touched, weakened, or superseded by this
document; `Authority.legalRole` generalizes the same judgment it already
encodes, it doesn't replace the code that enforces it.

## 6. Citation Trust I (implemented) vs. Citation Trust II (not started)

### 6.1 Scope of LR-K2

Citation Trust I answers exactly one question: **"Is this citation's
identity and provenance real?"** — does the cited instrument/article exist,
is the document version known, is there hashable evidence behind it. It
does **not** answer "does the source actually support the proposition
MayaLex attributes to it" — that is a different, harder question, deferred
to Citation Trust II.

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

### 6.3 Citation Trust II — explicitly deferred

A future `LR-K6` phase will answer: *"Does the retrieved source actually
support the legal proposition MayaLex attributes to it?"* — proposition
support, not identity. This is a distinct, harder problem (it requires
reasoning about the text's content, not just confirming the citation
resolves to a real document) and **LR-K2 does not attempt it.** Nothing in
this phase should be read as solving or approximating proposition support.

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
