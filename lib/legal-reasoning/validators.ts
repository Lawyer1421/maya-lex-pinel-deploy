/**
 * lib/legal-reasoning/validators.ts
 *
 * LR-K1 / LR-K2 / LR-K3 / LR-K4 / LR-K5 / LR-K6 / LR-K6.1 / LR-K7 / LR-K8 /
 * LR-K8.1 — deterministic validators. Fail closed: a malformed or
 * incomplete structure is reported as invalid, never silently accepted or
 * repaired. No LLM extraction integration here (per directive, "no LLM
 * extraction integration yet unless strictly required for testing" -- it
 * isn't; these validators operate on already-constructed objects).
 */

import type {
  CaseFact,
  CaseFactOrigin,
  CaseFactStatus,
  MissingFact,
  CitationTrustRecord,
  CitationVerificationState,
  LegalProposition,
  PropositionType,
  LegalVerificationStatus,
  NormativeRule,
  RuleType,
  RuleElement,
  RuleException,
  Subsumption,
  RuleElementAssessment,
  RuleExceptionAssessment,
  ElementAssessmentStatus,
  ExceptionAssessmentStatus,
  SubsumptionAnalysisStatus,
  ConclusionTrace,
  ConclusionType,
  ConclusionStatus,
  ConclusionBlocker,
  ConclusionBlockerType,
  ConclusionUncertainty,
  FactCompletenessStatus,
  RuleVerificationSummary,
  EngineNotYetImplementedStatus,
  PropositionClaim,
  PropositionSupportStatus,
  PropositionSupportRecord,
  EvidenceLocator,
  IdentifiedCitationTrustRecord,
  EvidenceSpan,
  SupportAdjudication,
  SupportAdjudicationStatus,
  AdjudicationOrigin,
  AggregatedPropositionSupport,
  Authority,
  AuthoritySourceType,
  LegalRoleType,
  AuthorityRelationship,
  AuthorityRelationType,
  TemporalLegalState,
  TemporalLegalStatus,
  AmendmentEvent,
  AmendmentEventType,
  RuleQualification,
  RuleQualificationStatus,
  RuleQualificationBlocker,
  RuleQualificationBlockerType,
} from './types';

export interface ResultadoValidacion {
  valido: boolean;
  errores: string[];
}

function ok(): ResultadoValidacion {
  return { valido: true, errores: [] };
}
function fail(errores: string[]): ResultadoValidacion {
  return { valido: false, errores };
}

// ─────────────────────────────────────────────────────────────────────────────
// LR-K1 — CASE FACT / MISSING FACT
// ─────────────────────────────────────────────────────────────────────────────

const ORIGENES_VALIDOS: ReadonlySet<CaseFactOrigin> = new Set([
  'USER_STATEMENT', 'USER_DOCUMENT', 'PROCEDURAL_RECORD',
]);

const ESTADOS_VALIDOS: ReadonlySet<CaseFactStatus> = new Set([
  'ALLEGED', 'ADMITTED', 'DISPUTED', 'DOCUMENTED', 'PROVEN', 'UNKNOWN',
]);

/**
 * Invariante I (ver docs/architecture/LR-1_LEGAL_REASONING.md): no hecho sin
 * origen. Además de exigir un `origin`/`status` del enum permitido, rechaza
 * explícitamente el literal "ASSUMED" en runtime -- no solo confiando en el
 * tipo estático -- porque un CaseFact puede llegar de una extracción externa
 * (ej. salida de LLM) sin pasar por el compilador.
 */
export function validarCaseFact(fact: CaseFact): ResultadoValidacion {
  const errores: string[] = [];
  if (!fact || typeof fact !== 'object') return fail(['CaseFact ausente o no es un objeto']);
  if (!fact.id) errores.push('CaseFact sin id');
  if (!fact.proposition || fact.proposition.trim().length === 0) errores.push('CaseFact sin proposition');

  const origin = fact.origin as unknown;
  if (!origin || !ORIGENES_VALIDOS.has(origin as CaseFactOrigin)) {
    errores.push(`CaseFact.origin inválido o ausente: ${String(origin)}`);
  }

  const status = fact.status as unknown;
  if (status === 'ASSUMED') {
    errores.push('CaseFact.status="ASSUMED" no está permitido -- invariante I, usar ExplicitInference en su lugar');
  } else if (!status || !ESTADOS_VALIDOS.has(status as CaseFactStatus)) {
    errores.push(`CaseFact.status inválido o ausente: ${String(status)}`);
  }

  return errores.length === 0 ? ok() : fail(errores);
}

export function validarMissingFact(mf: MissingFact): ResultadoValidacion {
  const errores: string[] = [];
  if (!mf || typeof mf !== 'object') return fail(['MissingFact ausente o no es un objeto']);
  if (!mf.id) errores.push('MissingFact sin id');
  if (!mf.description || mf.description.trim().length === 0) errores.push('MissingFact sin description');
  if (!Array.isArray(mf.blocksConclusions)) {
    errores.push('MissingFact.blocksConclusions debe ser un arreglo (puede ser vacío, nunca ausente)');
  }
  return errores.length === 0 ? ok() : fail(errores);
}

// ─────────────────────────────────────────────────────────────────────────────
// LR-K2 — CITATION TRUST I (identidad/proveniencia, NUNCA soporte de proposición)
// ─────────────────────────────────────────────────────────────────────────────

const ESTADOS_CITACION_VALIDOS: ReadonlySet<CitationVerificationState> = new Set([
  'VERIFIED', 'PARTIAL', 'UNRESOLVED', 'DISCOVERY_ONLY',
]);

/**
 * Invariante III: ninguna cita puede validarse como VERIFIED sin evidencia
 * verificada -- exige versionStatus="VERIFIED" Y un hash identificable.
 * UNRESOLVED/DISCOVERY_ONLY son estados legítimos y estables, nunca errores
 * por sí mismos; esta función solo rechaza la promoción indebida a VERIFIED.
 */
export function validarCitationTrustRecord(c: CitationTrustRecord): ResultadoValidacion {
  const errores: string[] = [];
  if (!c || typeof c !== 'object') return fail(['CitationTrustRecord ausente o no es un objeto']);
  if (!c.proposition || c.proposition.trim().length === 0) errores.push('CitationTrustRecord sin proposition');
  if (!c.fuente || c.fuente.trim().length === 0) errores.push('CitationTrustRecord sin fuente');

  const estado = c.verificationState as unknown;
  if (!estado || !ESTADOS_CITACION_VALIDOS.has(estado as CitationVerificationState)) {
    errores.push(`CitationTrustRecord.verificationState inválido o ausente: ${String(estado)}`);
  }

  if (c.verificationState === 'VERIFIED') {
    if (c.versionStatus !== 'VERIFIED') {
      errores.push('CitationTrustRecord.verificationState="VERIFIED" exige versionStatus="VERIFIED" -- invariante III');
    }
    if (!c.hash) {
      errores.push('CitationTrustRecord.verificationState="VERIFIED" exige evidencia identificable (hash) -- invariante III');
    }
  }

  return errores.length === 0 ? ok() : fail(errores);
}

/**
 * true solo si el registro está en un estado que la capa de respuesta puede
 * tratar como autoridad primaria verificada. DISCOVERY_ONLY, PARTIAL y
 * UNRESOLVED devuelven false sin excepción -- ninguno puede "aparentar" ser
 * VERIFIED, sin importar cuán completo luzca el resto del registro.
 */
export function esAutoritativaVerificada(c: CitationTrustRecord): boolean {
  return c.verificationState === 'VERIFIED' && validarCitationTrustRecord(c).valido;
}

/**
 * Invariante V (ninguna incertidumbre puede disfrazarse de verificación):
 * ninguna transición de estado hacia VERIFIED se considera válida a través
 * de esta función -- ese registro debe reconstruirse explícitamente con
 * evidencia real (fuera del alcance de este validador, que solo audita
 * transiciones, nunca las ejecuta). Sirve para que el código consumidor
 * pueda preguntar "¿esta transición sería una promoción automática
 * indebida?" antes de aceptar un cambio de estado propuesto externamente
 * (ej. por una extracción de LLM).
 */
export function esTransicionPromocionIndebida(
  estadoActual: CitationVerificationState,
  estadoPropuesto: CitationVerificationState,
): boolean {
  if (estadoActual === estadoPropuesto) return false;
  return estadoPropuesto === 'VERIFIED';
}

// ─────────────────────────────────────────────────────────────────────────────
// LR-K3 — LEGAL PROPOSITION + NORMATIVE RULE
// ─────────────────────────────────────────────────────────────────────────────
//
// Invariante VIII (source verification != legal correctness) e invariante IX
// (valid structure != verified evidence): estos validadores NUNCA evalúan si
// una proposición es jurídicamente correcta, ni si una fuente fue realmente
// recuperada en tiempo de ejecución -- solo si la FORMA del objeto es
// coherente consigo misma. Ver docs/architecture/LR-1_LEGAL_REASONING.md.

const TIPOS_PROPOSICION_VALIDOS: ReadonlySet<PropositionType> = new Set([
  'TEXTUAL', 'PARAPHRASED', 'INTERPRETIVE',
]);

const ESTADOS_VERIFICACION_LEGAL_VALIDOS: ReadonlySet<LegalVerificationStatus> = new Set([
  'VERIFIED', 'PARTIAL', 'UNRESOLVED',
]);

/**
 * "No rule may exist without source traceability" se aplica igual a la
 * proposición: una proposición atribuida a ninguna fuente no es una
 * proposición legal, es una afirmación suelta. `sources` debe ser un
 * arreglo no vacío SIEMPRE, independientemente de verificationStatus --
 * UNRESOLVED describe si la fuente reclamada pudo confirmarse, nunca si
 * se reclamó alguna fuente en absoluto.
 *
 * VERIFIED exige, además de fuentes declaradas, al menos un registro de
 * CitationTrust propio ya confirmado (esAutoritativaVerificada) -- fuente
 * declarada sin evidencia de identidad confirmada no basta para VERIFIED
 * (invariante IX: estructura válida != evidencia verificada).
 */
export function validarLegalProposition(p: LegalProposition): ResultadoValidacion {
  const errores: string[] = [];
  if (!p || typeof p !== 'object') return fail(['LegalProposition ausente o no es un objeto']);
  if (!p.id) errores.push('LegalProposition sin id');
  if (!p.proposition || p.proposition.trim().length === 0) errores.push('LegalProposition sin proposition');

  if (!Array.isArray(p.sources) || p.sources.length === 0) {
    errores.push('LegalProposition sin sources -- ninguna proposición legal puede existir sin trazabilidad a una fuente');
  }

  const tipo = p.propositionType as unknown;
  if (!tipo || !TIPOS_PROPOSICION_VALIDOS.has(tipo as PropositionType)) {
    errores.push(`LegalProposition.propositionType inválido o ausente: ${String(tipo)}`);
  }

  const estado = p.verificationStatus as unknown;
  if (!estado || !ESTADOS_VERIFICACION_LEGAL_VALIDOS.has(estado as LegalVerificationStatus)) {
    errores.push(`LegalProposition.verificationStatus inválido o ausente: ${String(estado)}`);
  }

  if (p.verificationStatus === 'VERIFIED') {
    const citas = Array.isArray(p.citationTrust) ? p.citationTrust : [];
    const tieneCitaVerificada = citas.some((c) => esAutoritativaVerificada(c));
    if (!tieneCitaVerificada) {
      errores.push('LegalProposition.verificationStatus="VERIFIED" exige al menos un CitationTrustRecord propio ya verificado -- invariante IX');
    }
  }

  return errores.length === 0 ? ok() : fail(errores);
}

/** true solo si la proposición está en un estado que la capa de respuesta puede tratar como soporte de fuente confirmado -- nunca implica corrección de la interpretación (invariante VIII). */
export function esProposicionConFuenteVerificada(p: LegalProposition): boolean {
  return p.verificationStatus === 'VERIFIED' && validarLegalProposition(p).valido;
}

const TIPOS_REGLA_VALIDOS: ReadonlySet<RuleType> = new Set([
  'DEFINITION', 'REQUIREMENT', 'PROHIBITION', 'PERMISSION', 'OBLIGATION',
  'PRESUMPTION', 'EXCEPTION', 'DEADLINE', 'COMPETENCE', 'PROCEDURAL_RULE', 'LEGAL_CONSEQUENCE',
]);

function validarRuleElement(e: RuleElement, indice: number): string[] {
  const errores: string[] = [];
  if (!e || typeof e !== 'object') return [`elements[${indice}] ausente o no es un objeto`];
  if (!e.id) errores.push(`elements[${indice}] sin id`);
  if (!e.description || e.description.trim().length === 0) errores.push(`elements[${indice}] sin description`);
  if (typeof e.required !== 'boolean') errores.push(`elements[${indice}].required debe ser boolean`);
  return errores;
}

function validarRuleException(ex: RuleException, indice: number): string[] {
  const errores: string[] = [];
  if (!ex || typeof ex !== 'object') return [`exceptions[${indice}] ausente o no es un objeto`];
  if (!ex.id) errores.push(`exceptions[${indice}] sin id`);
  if (!ex.description || ex.description.trim().length === 0) errores.push(`exceptions[${indice}] sin description`);
  return errores;
}

/**
 * Contrato explícito para `elements` vacío (requerido por la directiva,
 * "rule with empty elements behaves according to explicit contract"): un
 * arreglo vacío NUNCA es un error estructural por sí solo -- algunos
 * ruleType (DEFINITION, DEADLINE, COMPETENCE) no necesitan una lista de
 * elementos para ser una regla válida en esta capa. Esta función no
 * inventa un mínimo por tipo; eso pertenece a una fase futura con
 * fundamento real en el corpus, no a una regla arbitraria aquí.
 */
export function validarNormativeRule(r: NormativeRule): ResultadoValidacion {
  const errores: string[] = [];
  if (!r || typeof r !== 'object') return fail(['NormativeRule ausente o no es un objeto']);
  if (!r.id) errores.push('NormativeRule sin id');

  if (!Array.isArray(r.sources) || r.sources.length === 0) {
    errores.push('NormativeRule sin sources -- ninguna regla normativa puede existir sin trazabilidad a una fuente');
  }

  if (!Array.isArray(r.propositionIds)) {
    errores.push('NormativeRule.propositionIds debe ser un arreglo (puede ser vacío, nunca ausente)');
  }

  const tipo = r.ruleType as unknown;
  if (!tipo || !TIPOS_REGLA_VALIDOS.has(tipo as RuleType)) {
    errores.push(`NormativeRule.ruleType inválido o ausente: ${String(tipo)}`);
  }

  if (!Array.isArray(r.elements)) {
    errores.push('NormativeRule.elements debe ser un arreglo (puede ser vacío -- ver contrato explícito, no error por sí solo)');
  } else {
    r.elements.forEach((e, i) => errores.push(...validarRuleElement(e, i)));
  }

  if (!Array.isArray(r.exceptions)) {
    errores.push('NormativeRule.exceptions debe ser un arreglo (puede ser vacío, nunca ausente)');
  } else {
    r.exceptions.forEach((ex, i) => errores.push(...validarRuleException(ex, i)));
  }

  const estado = r.verificationStatus as unknown;
  if (!estado || !ESTADOS_VERIFICACION_LEGAL_VALIDOS.has(estado as LegalVerificationStatus)) {
    errores.push(`NormativeRule.verificationStatus inválido o ausente: ${String(estado)}`);
  }

  return errores.length === 0 ? ok() : fail(errores);
}

// ─────────────────────────────────────────────────────────────────────────────
// LR-K4 — GENERIC SUBSUMPTION CONTRACT
// ─────────────────────────────────────────────────────────────────────────────
//
// DEUDA REGISTRADA (hallazgo de Cursor, Mission LR-K4 §16): estos
// validadores NUNCA leen `NormativeRule.verificationStatus`. A propósito --
// `validarNormativeRule` (arriba) exige forma válida, NO exige un
// CitationTrustRecord verificado (a diferencia de `validarLegalProposition`,
// que sí lo exige para VERIFIED). Por lo tanto
// `NormativeRule.verificationStatus === 'VERIFIED'` hoy representa solo
// estado de CONTRATO a nivel de forma -- nunca prueba de evidencia
// recuperada, soporte de proposición, autoridad o vigencia. Esta capa de
// Subsumption NO corrige esa brecha (fuera de alcance de LR-K4, ver
// directiva §16) -- solo la documenta y nunca depende de ella para decidir
// nada aquí.
//
// Invariante XII (Subsumption != legal applicability): estos validadores
// NUNCA deciden si una regla es la que legalmente controla, si está vigente,
// si es especial o general, ni ninguna cuestión de autoridad/temporalidad --
// solo si el MAPEO estructural entre hechos y elementos es coherente.

const ESTADOS_ELEMENTO_VALIDOS: ReadonlySet<ElementAssessmentStatus> = new Set([
  'SATISFIED', 'UNSATISFIED', 'UNKNOWN',
]);

const ESTADOS_EXCEPCION_VALIDOS: ReadonlySet<ExceptionAssessmentStatus> = new Set([
  'APPLIES', 'DOES_NOT_APPLY', 'UNKNOWN',
]);

const ESTADOS_ANALISIS_VALIDOS: ReadonlySet<SubsumptionAnalysisStatus> = new Set([
  'COMPLETE', 'INCOMPLETE', 'BLOCKED',
]);

/**
 * Deriva el `analysisStatus` correcto a partir de las evaluaciones reales --
 * nunca se confía en el valor que el propio objeto declara sin contrastarlo
 * (ver validarSubsumption). BLOCKED gana sobre INCOMPLETE: una excepción sin
 * resolver es más fundamental que un elemento sin resolver, porque si la
 * excepción pudiera aplicar, la regla entera podría no operar -- "incomplete"
 * subestimaría ese vacío.
 */
export function derivarAnalysisStatusSubsuncion(
  rule: NormativeRule,
  elementAssessments: RuleElementAssessment[],
  exceptionAssessments: RuleExceptionAssessment[],
): SubsumptionAnalysisStatus {
  const excepcionDesconocida = exceptionAssessments.some((a) => a.status === 'UNKNOWN');
  if (excepcionDesconocida) return 'BLOCKED';

  const porElementoId = new Map(elementAssessments.map((a) => [a.elementId, a]));
  const algunRequeridoSinResolver = rule.elements
    .filter((e) => e.required)
    .some((e) => {
      const a = porElementoId.get(e.id);
      return !a || a.status === 'UNKNOWN';
    });
  if (algunRequeridoSinResolver) return 'INCOMPLETE';

  return 'COMPLETE';
}

/**
 * Ids de elementos REQUERIDOS cuya evaluación es UNKNOWN o está ausente --
 * lo que `Subsumption.unresolvedElementIds` debe contener exactamente
 * (como conjunto, sin importar el orden).
 */
export function derivarElementosNoResueltos(
  rule: NormativeRule,
  elementAssessments: RuleElementAssessment[],
): string[] {
  const porElementoId = new Map(elementAssessments.map((a) => [a.elementId, a]));
  return rule.elements
    .filter((e) => e.required)
    .filter((e) => {
      const a = porElementoId.get(e.id);
      return !a || a.status === 'UNKNOWN';
    })
    .map((e) => e.id);
}

function mismoConjunto(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  return b.every((x) => sa.has(x));
}

/**
 * Valida un RuleElementAssessment de forma aislada -- no incluye la
 * verificación de pertenencia al NormativeRule ni de duplicados, que
 * requieren el contexto completo (ver validarSubsumption).
 */
function validarRuleElementAssessment(
  a: RuleElementAssessment,
  indice: number,
  idsCaseFactValidos: (id: string) => boolean,
  idsMissingFactValidos: (id: string) => boolean,
): string[] {
  const errores: string[] = [];
  const prefijo = `elementAssessments[${indice}]`;
  if (!a || typeof a !== 'object') return [`${prefijo} ausente o no es un objeto`];
  if (!a.elementId) errores.push(`${prefijo} sin elementId`);

  const estado = a.status as unknown;
  if (!estado || !ESTADOS_ELEMENTO_VALIDOS.has(estado as ElementAssessmentStatus)) {
    errores.push(`${prefijo}.status inválido o ausente: ${String(estado)}`);
  }

  if (!Array.isArray(a.supportingFactIds)) errores.push(`${prefijo}.supportingFactIds debe ser un arreglo`);
  if (!Array.isArray(a.contradictingFactIds)) errores.push(`${prefijo}.contradictingFactIds debe ser un arreglo`);
  if (!Array.isArray(a.missingFactIds)) errores.push(`${prefijo}.missingFactIds debe ser un arreglo`);

  for (const id of a.supportingFactIds ?? []) {
    if (!idsCaseFactValidos(id)) errores.push(`${prefijo}.supportingFactIds referencia un CaseFact no declarado o inexistente: ${id}`);
  }
  for (const id of a.contradictingFactIds ?? []) {
    if (!idsCaseFactValidos(id)) errores.push(`${prefijo}.contradictingFactIds referencia un CaseFact no declarado o inexistente: ${id}`);
  }
  for (const id of a.missingFactIds ?? []) {
    if (!idsMissingFactValidos(id)) errores.push(`${prefijo}.missingFactIds referencia un MissingFact no declarado o inexistente: ${id}`);
  }

  // Invariante X: ningún assessment sin traza.
  if (a.status === 'SATISFIED' && (a.supportingFactIds ?? []).length === 0) {
    errores.push(`${prefijo}: status="SATISFIED" exige al menos un supportingFactId -- invariante X, no hay evaluación sin traza`);
  }
  // Invariante XIII: UNSATISFIED != UNKNOWN -- exige base fáctica afirmativa, nunca "no hay dato".
  if (a.status === 'UNSATISFIED' && (a.contradictingFactIds ?? []).length === 0) {
    errores.push(`${prefijo}: status="UNSATISFIED" exige al menos un contradictingFactId -- invariante XIII, la falta de información nunca equivale a "no satisfecho"`);
  }

  return errores;
}

function validarRuleExceptionAssessment(
  a: RuleExceptionAssessment,
  indice: number,
  idsCaseFactValidos: (id: string) => boolean,
  idsMissingFactValidos: (id: string) => boolean,
): string[] {
  const errores: string[] = [];
  const prefijo = `exceptionAssessments[${indice}]`;
  if (!a || typeof a !== 'object') return [`${prefijo} ausente o no es un objeto`];
  if (!a.exceptionId) errores.push(`${prefijo} sin exceptionId`);

  const estado = a.status as unknown;
  if (!estado || !ESTADOS_EXCEPCION_VALIDOS.has(estado as ExceptionAssessmentStatus)) {
    errores.push(`${prefijo}.status inválido o ausente: ${String(estado)}`);
  }

  if (!Array.isArray(a.supportingFactIds)) errores.push(`${prefijo}.supportingFactIds debe ser un arreglo`);
  if (!Array.isArray(a.contradictingFactIds)) errores.push(`${prefijo}.contradictingFactIds debe ser un arreglo`);
  if (!Array.isArray(a.missingFactIds)) errores.push(`${prefijo}.missingFactIds debe ser un arreglo`);

  for (const id of a.supportingFactIds ?? []) {
    if (!idsCaseFactValidos(id)) errores.push(`${prefijo}.supportingFactIds referencia un CaseFact no declarado o inexistente: ${id}`);
  }
  for (const id of a.contradictingFactIds ?? []) {
    if (!idsCaseFactValidos(id)) errores.push(`${prefijo}.contradictingFactIds referencia un CaseFact no declarado o inexistente: ${id}`);
  }
  for (const id of a.missingFactIds ?? []) {
    if (!idsMissingFactValidos(id)) errores.push(`${prefijo}.missingFactIds referencia un MissingFact no declarado o inexistente: ${id}`);
  }

  if (a.status === 'APPLIES' && (a.supportingFactIds ?? []).length === 0) {
    errores.push(`${prefijo}: status="APPLIES" exige al menos un supportingFactId`);
  }
  if (a.status === 'DOES_NOT_APPLY' && (a.contradictingFactIds ?? []).length === 0) {
    errores.push(`${prefijo}: status="DOES_NOT_APPLY" exige al menos un contradictingFactId`);
  }

  return errores;
}

/**
 * Valida un Subsumption completo contra la NormativeRule que referencia y
 * los conjuntos reales de CaseFact/MissingFact suministrados. Fail-closed:
 * cualquier id huérfano, elemento requerido omitido, excepción sin evaluar,
 * o inconsistencia entre analysisStatus/unresolvedElementIds y las
 * evaluaciones reales invalida el registro completo.
 *
 * `caseFacts`/`missingFacts` son los objetos REALES suministrados a esta
 * llamada -- un id solo se considera válido si (a) existe como CaseFact o
 * MissingFact real Y (b) fue declarado explícitamente en
 * `subsumption.caseFactIds`/`missingFactIds`. Un id que exista en algún
 * lugar del sistema pero no haya sido declarado como parte de ESTE análisis
 * se rechaza igual -- "no debe poder tomarse prestado" un hecho no incluido.
 */
export function validarSubsumption(
  subsumption: Subsumption,
  rule: NormativeRule,
  caseFacts: CaseFact[],
  missingFacts: MissingFact[],
): ResultadoValidacion {
  const errores: string[] = [];
  if (!subsumption || typeof subsumption !== 'object') return fail(['Subsumption ausente o no es un objeto']);
  if (!subsumption.id) errores.push('Subsumption sin id');
  if (subsumption.ruleId !== rule.id) {
    errores.push(`Subsumption.ruleId ("${subsumption.ruleId}") no coincide con NormativeRule.id ("${rule.id}")`);
  }

  const idsCaseFactReales = new Set(caseFacts.map((f) => f.id));
  const idsMissingFactReales = new Set(missingFacts.map((m) => m.id));

  if (!Array.isArray(subsumption.caseFactIds)) errores.push('Subsumption.caseFactIds debe ser un arreglo');
  if (!Array.isArray(subsumption.missingFactIds)) errores.push('Subsumption.missingFactIds debe ser un arreglo');

  const idsCaseFactDeclarados = new Set(Array.isArray(subsumption.caseFactIds) ? subsumption.caseFactIds : []);
  const idsMissingFactDeclarados = new Set(Array.isArray(subsumption.missingFactIds) ? subsumption.missingFactIds : []);

  for (const id of idsCaseFactDeclarados) {
    if (!idsCaseFactReales.has(id)) errores.push(`Subsumption.caseFactIds contiene un id que no existe en caseFacts: ${id}`);
  }
  for (const id of idsMissingFactDeclarados) {
    if (!idsMissingFactReales.has(id)) errores.push(`Subsumption.missingFactIds contiene un id que no existe en missingFacts: ${id}`);
  }

  const esCaseFactValido = (id: string) => idsCaseFactReales.has(id) && idsCaseFactDeclarados.has(id);
  const esMissingFactValido = (id: string) => idsMissingFactReales.has(id) && idsMissingFactDeclarados.has(id);

  const elementosPorId = new Map(rule.elements.map((e) => [e.id, e]));
  const excepcionesPorId = new Map(rule.exceptions.map((ex) => [ex.id, ex]));

  // ── ELEMENT ASSESSMENTS ──
  if (!Array.isArray(subsumption.elementAssessments)) {
    errores.push('Subsumption.elementAssessments debe ser un arreglo');
  } else {
    const idsVistos = new Set<string>();
    subsumption.elementAssessments.forEach((a, i) => {
      errores.push(...validarRuleElementAssessment(a, i, esCaseFactValido, esMissingFactValido));
      if (a?.elementId) {
        if (!elementosPorId.has(a.elementId)) {
          errores.push(`elementAssessments[${i}].elementId "${a.elementId}" no pertenece a NormativeRule "${rule.id}"`);
        }
        if (idsVistos.has(a.elementId)) {
          errores.push(`elementAssessments[${i}]: evaluación duplicada para elementId "${a.elementId}" -- invariante X, un solo trace por elemento`);
        }
        idsVistos.add(a.elementId);
      }
    });

    // Cobertura obligatoria: ningún elemento REQUERIDO puede faltar.
    for (const el of rule.elements) {
      if (el.required && !idsVistos.has(el.id)) {
        errores.push(`RuleElement requerido "${el.id}" no tiene ninguna evaluación en Subsumption -- ningún elemento requerido puede desaparecer en silencio`);
      }
    }
  }

  // ── EXCEPTION ASSESSMENTS ──
  if (!Array.isArray(subsumption.exceptionAssessments)) {
    errores.push('Subsumption.exceptionAssessments debe ser un arreglo');
  } else {
    const idsVistos = new Set<string>();
    subsumption.exceptionAssessments.forEach((a, i) => {
      errores.push(...validarRuleExceptionAssessment(a, i, esCaseFactValido, esMissingFactValido));
      if (a?.exceptionId) {
        if (!excepcionesPorId.has(a.exceptionId)) {
          errores.push(`exceptionAssessments[${i}].exceptionId "${a.exceptionId}" no pertenece a NormativeRule "${rule.id}"`);
        }
        if (idsVistos.has(a.exceptionId)) {
          errores.push(`exceptionAssessments[${i}]: evaluación duplicada para exceptionId "${a.exceptionId}"`);
        }
        idsVistos.add(a.exceptionId);
      }
    });

    // Invariante XIV: NINGUNA excepción de la regla puede quedar sin evaluar.
    for (const ex of rule.exceptions) {
      if (!idsVistos.has(ex.id)) {
        errores.push(`RuleException "${ex.id}" no tiene ninguna evaluación en Subsumption -- invariante XIV, ninguna excepción puede desaparecer en silencio`);
      }
    }
  }

  // ── ANALYSIS STATUS / UNRESOLVED ELEMENTS (derivados, no declarados libremente) ──
  if (Array.isArray(subsumption.elementAssessments) && Array.isArray(subsumption.exceptionAssessments)) {
    const estadoDerivado = derivarAnalysisStatusSubsuncion(rule, subsumption.elementAssessments, subsumption.exceptionAssessments);
    const estadoDeclarado = subsumption.analysisStatus as unknown;
    if (!estadoDeclarado || !ESTADOS_ANALISIS_VALIDOS.has(estadoDeclarado as SubsumptionAnalysisStatus)) {
      errores.push(`Subsumption.analysisStatus inválido o ausente: ${String(estadoDeclarado)}`);
    } else if (estadoDeclarado !== estadoDerivado) {
      errores.push(`Subsumption.analysisStatus="${String(estadoDeclarado)}" no coincide con el estado derivado de las evaluaciones ("${estadoDerivado}") -- COMPLETE/INCOMPLETE/BLOCKED nunca se declaran libremente`);
    }

    const noResueltosDerivados = derivarElementosNoResueltos(rule, subsumption.elementAssessments);
    if (!Array.isArray(subsumption.unresolvedElementIds)) {
      errores.push('Subsumption.unresolvedElementIds debe ser un arreglo');
    } else if (!mismoConjunto(subsumption.unresolvedElementIds, noResueltosDerivados)) {
      errores.push(`Subsumption.unresolvedElementIds no coincide con los elementos requeridos sin resolver (esperado: [${noResueltosDerivados.join(', ')}])`);
    }
  }

  return errores.length === 0 ? ok() : fail(errores);
}

// ─────────────────────────────────────────────────────────────────────────────
// LR-K5 — CONCLUSION TRACEABILITY CONTRACT
// ─────────────────────────────────────────────────────────────────────────────
//
// Solo LEGAL_CONCLUSION recibe soporte completo en esta fase (ver
// validarConclusionTrace: rechaza explícitamente PROCEDURAL_CONCLUSION y
// STRATEGIC_ASSESSMENT como "no implementado", nunca los valida a medias).
// Invariante XX (completitud estructural != corrección legal): nada aquí
// evalúa si la conclusión es correcta, vinculante, o vigente -- solo si su
// trazabilidad hacia las Subsumption referenciadas es coherente.

const TIPOS_CONCLUSION_VALIDOS: ReadonlySet<ConclusionType> = new Set([
  'LEGAL_CONCLUSION', 'PROCEDURAL_CONCLUSION', 'STRATEGIC_ASSESSMENT',
]);

const ESTADOS_CONCLUSION_VALIDOS: ReadonlySet<ConclusionStatus> = new Set([
  'SUPPORTED', 'PARTIAL', 'BLOCKED', 'UNRESOLVED',
]);

const TIPOS_BLOQUEADOR_VALIDOS: ReadonlySet<ConclusionBlockerType> = new Set([
  'MISSING_FACT', 'UNRESOLVED_ELEMENT', 'UNRESOLVED_EXCEPTION', 'INCOMPLETE_SUBSUMPTION',
  'AUTHORITY_NOT_EVALUATED', 'TEMPORAL_STATUS_NOT_EVALUATED', 'OTHER',
]);

function todosLosAssessments(subs: Subsumption[]): Array<RuleElementAssessment | RuleExceptionAssessment> {
  return subs.flatMap((s) => [...s.elementAssessments, ...s.exceptionAssessments]);
}

/** Ids de CaseFact usados como SOPORTE en algún assessment de las Subsumption referenciadas -- el universo que ConclusionTrace.supportingFactIds puede citar. */
function factsSoporteDeSubsunciones(subs: Subsumption[]): Set<string> {
  return new Set(todosLosAssessments(subs).flatMap((a) => a.supportingFactIds));
}

/** Mismo principio para contradictingFactIds. */
function factsContradiccionDeSubsunciones(subs: Subsumption[]): Set<string> {
  return new Set(todosLosAssessments(subs).flatMap((a) => a.contradictingFactIds));
}

/** Universo declarado de MissingFact a través de las Subsumption referenciadas -- nunca inventado a nivel de ConclusionTrace. */
function missingFactsDeSubsunciones(subs: Subsumption[]): Set<string> {
  return new Set(subs.flatMap((s) => s.missingFactIds));
}

/** Unión de los elementos requeridos sin resolver de TODAS las Subsumption referenciadas -- ninguno puede desaparecer en la conclusión (invariante XVII). */
function elementosNoResueltosDeSubsunciones(subs: Subsumption[]): string[] {
  return [...new Set(subs.flatMap((s) => s.unresolvedElementIds))];
}

/** Mismo principio para excepciones -- derivado de exceptionAssessments con status UNKNOWN, ya que Subsumption no expone un campo `unresolvedExceptionIds` propio. */
function excepcionesNoResueltasDeSubsunciones(subs: Subsumption[]): string[] {
  return [...new Set(
    subs.flatMap((s) => s.exceptionAssessments.filter((a) => a.status === 'UNKNOWN').map((a) => a.exceptionId)),
  )];
}

/**
 * Señal puramente MECÁNICA de conflicto estructural (§16 de la directiva):
 * un mismo id de CaseFact usado como soporte en algún assessment Y como
 * contradicción en otro, dentro del mismo conjunto de Subsumption
 * referenciadas. No es razonamiento adversarial ni semántico -- solo
 * detecta que la propia trazabilidad ya es internamente inconsistente. Una
 * ConclusionTrace nunca puede ignorar esto en silencio (ver
 * validarConclusionTrace).
 */
function detectarConflictoEstructural(subs: Subsumption[]): string[] {
  const soporte = factsSoporteDeSubsunciones(subs);
  const contradiccion = factsContradiccionDeSubsunciones(subs);
  return [...soporte].filter((id) => contradiccion.has(id));
}

/**
 * Deriva el único `status` que una ConclusionTrace puede declarar dado el
 * conjunto de Subsumption que referencia -- nunca se acepta un valor
 * distinto sin justificarlo (ver validarConclusionTrace). Prioridad:
 * conflicto estructural > BLOCKED > PARTIAL > SUPPORTED -- un conflicto sin
 * resolver es más fundamental que cualquiera de los otros tres estados.
 */
export function derivarConclusionStatus(subsumciones: Subsumption[]): ConclusionStatus {
  if (detectarConflictoEstructural(subsumciones).length > 0) return 'UNRESOLVED';
  if (subsumciones.some((s) => s.analysisStatus === 'BLOCKED')) return 'BLOCKED';
  if (subsumciones.some((s) => s.analysisStatus === 'INCOMPLETE')) return 'PARTIAL';
  return 'SUPPORTED';
}

function derivarFactCompleteness(subsumciones: Subsumption[]): FactCompletenessStatus {
  const totalRequeridos = subsumciones.reduce((acc, s) => acc + s.elementAssessments.length, 0);
  const noResueltos = elementosNoResueltosDeSubsunciones(subsumciones).length
    + excepcionesNoResueltasDeSubsunciones(subsumciones).length;
  if (noResueltos === 0) return 'COMPLETE';
  if (noResueltos >= totalRequeridos && totalRequeridos > 0) return 'UNRESOLVED';
  return 'PARTIAL';
}

/**
 * Nunca devuelve el literal 'VERIFIED' de NormativeRule -- siempre
 * 'VERIFIED_SHAPE', para que una ConclusionTrace jamás pueda leerse como si
 * afirmara que la regla es legalmente correcta o vinculante (invariante
 * XIX). Si las reglas referenciadas tienen estados mixtos, se reporta el
 * más restrictivo (UNRESOLVED > PARTIAL > VERIFIED_SHAPE) -- nunca el mejor
 * caso cuando existe uno peor.
 */
function derivarRuleVerification(reglas: NormativeRule[]): RuleVerificationSummary {
  if (reglas.length === 0) return 'UNRESOLVED';
  if (reglas.some((r) => r.verificationStatus === 'UNRESOLVED')) return 'UNRESOLVED';
  if (reglas.some((r) => r.verificationStatus === 'PARTIAL')) return 'PARTIAL';
  return 'VERIFIED_SHAPE';
}

function derivarSubsumptionCompleteness(subsumciones: Subsumption[]): SubsumptionAnalysisStatus {
  if (subsumciones.some((s) => s.analysisStatus === 'BLOCKED')) return 'BLOCKED';
  if (subsumciones.some((s) => s.analysisStatus === 'INCOMPLETE')) return 'INCOMPLETE';
  return 'COMPLETE';
}

/**
 * authorityStatus/temporalStatus son SIEMPRE 'NOT_EVALUATED' en esta fase --
 * no derivados de nada, porque no existe ningún motor de Autoridad ni
 * Temporalidad que pudiera evaluarlos (invariante XX). validarConclusionTrace
 * rechaza cualquier otro valor declarado para estos dos campos.
 */
export function derivarConclusionUncertainty(
  subsumciones: Subsumption[],
  reglas: NormativeRule[],
): ConclusionUncertainty {
  return {
    factCompleteness: derivarFactCompleteness(subsumciones),
    ruleVerification: derivarRuleVerification(reglas),
    subsumptionCompleteness: derivarSubsumptionCompleteness(subsumciones),
    authorityStatus: 'NOT_EVALUATED',
    temporalStatus: 'NOT_EVALUATED',
  };
}

function validarConclusionBlocker(
  b: ConclusionBlocker,
  indice: number,
  idsMissingFactValidos: Set<string>,
  idsElementoNoResueltoValidos: Set<string>,
  idsExcepcionNoResueltaValidos: Set<string>,
): string[] {
  const errores: string[] = [];
  const prefijo = `blockedBy[${indice}]`;
  if (!b || typeof b !== 'object') return [`${prefijo} ausente o no es un objeto`];
  const tipo = b.type as unknown;
  if (!tipo || !TIPOS_BLOQUEADOR_VALIDOS.has(tipo as ConclusionBlockerType)) {
    errores.push(`${prefijo}.type inválido o ausente: ${String(tipo)}`);
  }
  if (!b.description || b.description.trim().length === 0) {
    errores.push(`${prefijo} sin description`);
  }
  // Solo se valida referenceId contra un universo conocido para los tipos
  // que tienen uno -- AUTHORITY_NOT_EVALUATED/TEMPORAL_STATUS_NOT_EVALUATED/
  // OTHER no tienen un universo de ids que verificar en esta fase.
  if (b.referenceId) {
    if (b.type === 'MISSING_FACT' && !idsMissingFactValidos.has(b.referenceId)) {
      errores.push(`${prefijo}.referenceId "${b.referenceId}" no es un MissingFact trazable a través de las Subsumption referenciadas`);
    }
    if (b.type === 'UNRESOLVED_ELEMENT' && !idsElementoNoResueltoValidos.has(b.referenceId)) {
      errores.push(`${prefijo}.referenceId "${b.referenceId}" no es un elemento sin resolver de las Subsumption referenciadas`);
    }
    if (b.type === 'UNRESOLVED_EXCEPTION' && !idsExcepcionNoResueltaValidos.has(b.referenceId)) {
      errores.push(`${prefijo}.referenceId "${b.referenceId}" no es una excepción sin resolver de las Subsumption referenciadas`);
    }
  }
  return errores;
}

/**
 * Valida una ConclusionTrace completa contra las Subsumption y NormativeRule
 * que referencia. Fail-closed: cualquier id huérfano, trazabilidad rota,
 * status/uncertainty declarado libremente en vez de derivado, o intento de
 * ocultar un elemento/excepción sin resolver invalida el registro completo.
 *
 * Solo LEGAL_CONCLUSION recibe validación completa -- PROCEDURAL_CONCLUSION
 * y STRATEGIC_ASSESSMENT se rechazan explícitamente como "no implementado en
 * esta fase", nunca se validan a medias (§4 de la directiva LR-K5).
 */
export function validarConclusionTrace(
  trace: ConclusionTrace,
  subsumptions: Subsumption[],
  rules: NormativeRule[],
): ResultadoValidacion {
  const errores: string[] = [];
  if (!trace || typeof trace !== 'object') return fail(['ConclusionTrace ausente o no es un objeto']);
  if (!trace.id) errores.push('ConclusionTrace sin id');

  const tipo = trace.conclusionType as unknown;
  if (!tipo || !TIPOS_CONCLUSION_VALIDOS.has(tipo as ConclusionType)) {
    return fail([...errores, `ConclusionTrace.conclusionType inválido o ausente: ${String(tipo)}`]);
  }
  if (trace.conclusionType !== 'LEGAL_CONCLUSION') {
    return fail([
      ...errores,
      `ConclusionTrace.conclusionType="${trace.conclusionType}" no está implementado en LR-K5 -- ` +
      'PROCEDURAL_CONCLUSION y STRATEGIC_ASSESSMENT son capas futuras, nunca se validan a medias en esta fase',
    ]);
  }

  if (!trace.proposition || trace.proposition.trim().length === 0) errores.push('ConclusionTrace sin proposition');

  // Invariante XV: ninguna LEGAL_CONCLUSION sin al menos una Subsumption.
  if (!Array.isArray(trace.subsumptionIds) || trace.subsumptionIds.length === 0) {
    errores.push('ConclusionTrace.subsumptionIds no puede estar vacío para LEGAL_CONCLUSION -- invariante XV, ninguna conclusión sin traza');
  }

  const subsPorId = new Map(subsumptions.map((s) => [s.id, s]));
  const idsSubsumptionDeclarados = Array.isArray(trace.subsumptionIds) ? trace.subsumptionIds : [];
  const subsReferenciadas: Subsumption[] = [];
  for (const id of idsSubsumptionDeclarados) {
    const s = subsPorId.get(id);
    if (!s) {
      errores.push(`ConclusionTrace.subsumptionIds contiene un id que no existe en el contexto suministrado: ${id}`);
    } else {
      subsReferenciadas.push(s);
    }
  }

  const reglasPorId = new Map(rules.map((r) => [r.id, r]));
  const idsRuleDeclarados = Array.isArray(trace.ruleIds) ? trace.ruleIds : [];
  if (!Array.isArray(trace.ruleIds)) errores.push('ConclusionTrace.ruleIds debe ser un arreglo');
  for (const id of idsRuleDeclarados) {
    if (!reglasPorId.has(id)) {
      errores.push(`ConclusionTrace.ruleIds contiene un id que no existe en el contexto suministrado: ${id}`);
      continue;
    }
    if (!subsReferenciadas.some((s) => s.ruleId === id)) {
      errores.push(`ConclusionTrace.ruleIds contiene "${id}", pero ninguna Subsumption referenciada usa esa regla`);
    }
  }

  // Si no hay Subsumption válidas referenciadas, no tiene sentido seguir
  // derivando -- ya se registró el error de fondo arriba.
  if (subsReferenciadas.length === 0) {
    return fail(errores.length ? errores : ['ConclusionTrace no referencia ninguna Subsumption válida']);
  }

  const reglasReferenciadas = idsRuleDeclarados
    .map((id) => reglasPorId.get(id))
    .filter((r): r is NormativeRule => Boolean(r));

  const idsFactSoporte = factsSoporteDeSubsunciones(subsReferenciadas);
  const idsFactContradiccion = factsContradiccionDeSubsunciones(subsReferenciadas);
  const idsMissingFact = missingFactsDeSubsunciones(subsReferenciadas);
  const idsElementoNoResuelto = new Set(elementosNoResueltosDeSubsunciones(subsReferenciadas));
  const idsExcepcionNoResuelta = new Set(excepcionesNoResueltasDeSubsunciones(subsReferenciadas));

  // Trazabilidad de hechos -- ConclusionTrace solo puede REFERENCIAR lo que
  // ya está establecido dentro de las Subsumption citadas, nunca introducir
  // un rol de hecho nuevo (§12: "REFERENCE Subsumption, not recreate it").
  if (!Array.isArray(trace.supportingFactIds)) {
    errores.push('ConclusionTrace.supportingFactIds debe ser un arreglo');
  } else {
    for (const id of trace.supportingFactIds) {
      if (!idsFactSoporte.has(id)) errores.push(`ConclusionTrace.supportingFactIds referencia un hecho no trazable como soporte en las Subsumption referenciadas: ${id}`);
    }
  }
  if (!Array.isArray(trace.contradictingFactIds)) {
    errores.push('ConclusionTrace.contradictingFactIds debe ser un arreglo');
  } else {
    for (const id of trace.contradictingFactIds) {
      if (!idsFactContradiccion.has(id)) errores.push(`ConclusionTrace.contradictingFactIds referencia un hecho no trazable como contradicción en las Subsumption referenciadas: ${id}`);
    }
  }
  if (!Array.isArray(trace.missingFactIds)) {
    errores.push('ConclusionTrace.missingFactIds debe ser un arreglo');
  } else {
    for (const id of trace.missingFactIds) {
      if (!idsMissingFact.has(id)) errores.push(`ConclusionTrace.missingFactIds referencia un MissingFact no declarado en las Subsumption referenciadas: ${id}`);
    }
  }

  // Invariante XVII: ningún elemento/excepción requerido sin resolver puede
  // desaparecer -- unresolvedElementIds/unresolvedExceptionIds deben
  // coincidir EXACTAMENTE con lo derivado, nunca un subconjunto elegido.
  if (!Array.isArray(trace.unresolvedElementIds)) {
    errores.push('ConclusionTrace.unresolvedElementIds debe ser un arreglo');
  } else if (!mismoConjunto(trace.unresolvedElementIds, [...idsElementoNoResuelto])) {
    errores.push(`ConclusionTrace.unresolvedElementIds no coincide con los elementos sin resolver de las Subsumption referenciadas (esperado: [${[...idsElementoNoResuelto].join(', ')}]) -- invariante XVII, ningún elemento requerido puede ocultarse`);
  }
  if (!Array.isArray(trace.unresolvedExceptionIds)) {
    errores.push('ConclusionTrace.unresolvedExceptionIds debe ser un arreglo');
  } else if (!mismoConjunto(trace.unresolvedExceptionIds, [...idsExcepcionNoResuelta])) {
    errores.push(`ConclusionTrace.unresolvedExceptionIds no coincide con las excepciones sin resolver de las Subsumption referenciadas (esperado: [${[...idsExcepcionNoResuelta].join(', ')}])`);
  }

  // ── STATUS (derivado, nunca declarado libremente) ──
  const estadoDerivado = derivarConclusionStatus(subsReferenciadas);
  const estadoDeclarado = trace.status as unknown;
  if (!estadoDeclarado || !ESTADOS_CONCLUSION_VALIDOS.has(estadoDeclarado as ConclusionStatus)) {
    errores.push(`ConclusionTrace.status inválido o ausente: ${String(estadoDeclarado)}`);
  } else if (estadoDeclarado !== estadoDerivado) {
    errores.push(`ConclusionTrace.status="${String(estadoDeclarado)}" no coincide con el estado derivado de las Subsumption referenciadas ("${estadoDerivado}") -- invariante XVIII/XX, ningún estado se declara libremente`);
  }

  // ── BLOCKERS ──
  // SUPPORTED exige blockedBy vacío; cualquier otro estado exige al menos un
  // bloqueador explícito (invariante XVI: BLOCKED es un resultado válido,
  // pero nunca uno silencioso).
  if (!Array.isArray(trace.blockedBy)) {
    errores.push('ConclusionTrace.blockedBy debe ser un arreglo');
  } else {
    trace.blockedBy.forEach((b, i) => {
      errores.push(...validarConclusionBlocker(b, i, idsMissingFact, idsElementoNoResuelto, idsExcepcionNoResuelta));
    });
    if (estadoDeclarado === 'SUPPORTED' && trace.blockedBy.length > 0) {
      errores.push('ConclusionTrace.status="SUPPORTED" no puede declarar ningún blockedBy -- un bloqueador presente contradice soporte estructural completo');
    }
    if (estadoDeclarado !== 'SUPPORTED' && ESTADOS_CONCLUSION_VALIDOS.has(estadoDeclarado as ConclusionStatus) && trace.blockedBy.length === 0) {
      errores.push(`ConclusionTrace.status="${String(estadoDeclarado)}" exige al menos un blockedBy explícito -- invariante XVI, un bloqueo nunca es silencioso`);
    }
  }

  // ── UNCERTAINTY (derivado, nunca declarado libremente) ──
  if (!trace.uncertainty || typeof trace.uncertainty !== 'object') {
    errores.push('ConclusionTrace.uncertainty ausente o no es un objeto');
  } else {
    const uncertaintyDerivado = derivarConclusionUncertainty(subsReferenciadas, reglasReferenciadas);
    if (trace.uncertainty.factCompleteness !== uncertaintyDerivado.factCompleteness) {
      errores.push(`ConclusionTrace.uncertainty.factCompleteness="${trace.uncertainty.factCompleteness}" no coincide con el derivado ("${uncertaintyDerivado.factCompleteness}")`);
    }
    if (trace.uncertainty.ruleVerification !== uncertaintyDerivado.ruleVerification) {
      errores.push(`ConclusionTrace.uncertainty.ruleVerification="${trace.uncertainty.ruleVerification}" no coincide con el derivado ("${uncertaintyDerivado.ruleVerification}") -- invariante XIX, nunca se reporta mejor de lo que las reglas referenciadas realmente tienen`);
    }
    if (trace.uncertainty.subsumptionCompleteness !== uncertaintyDerivado.subsumptionCompleteness) {
      errores.push(`ConclusionTrace.uncertainty.subsumptionCompleteness="${trace.uncertainty.subsumptionCompleteness}" no coincide con el derivado ("${uncertaintyDerivado.subsumptionCompleteness}")`);
    }
    // authorityStatus/temporalStatus: SIEMPRE 'NOT_EVALUATED' en esta fase --
    // no se derivan de nada, se exige el literal exacto (invariante XX).
    if (trace.uncertainty.authorityStatus !== 'NOT_EVALUATED') {
      errores.push(`ConclusionTrace.uncertainty.authorityStatus debe ser "NOT_EVALUATED" en esta fase (no existe motor de Autoridad) -- se declaró "${String(trace.uncertainty.authorityStatus)}"`);
    }
    if (trace.uncertainty.temporalStatus !== 'NOT_EVALUATED') {
      errores.push(`ConclusionTrace.uncertainty.temporalStatus debe ser "NOT_EVALUATED" en esta fase (no existe motor Temporal) -- se declaró "${String(trace.uncertainty.temporalStatus)}"`);
    }
  }

  return errores.length === 0 ? ok() : fail(errores);
}

// ─────────────────────────────────────────────────────────────────────────────
// LR-K6 — CITATION TRUST II: PROPOSITION SUPPORT CONTRACT
// ─────────────────────────────────────────────────────────────────────────────
//
// Responde "¿la evidencia recuperada realmente respalda la LegalProposition
// que se le atribuye?" -- NUNCA "¿es correcta esta interpretación legal?",
// "¿es esta la regla que controla?", ni "¿esta fuente está vigente?".
// Invariante XXIV (similitud semántica != soporte de proposición): este
// módulo NUNCA usa embeddings, similitud vectorial ni score de reranker como
// prueba de soporte -- la clasificación de cada PropositionClaim en
// supportedClaims/unsupportedClaims/contradictoryClaims la decide quien
// construye el registro (un fixture hoy, una fase futura autorizada más
// adelante), nunca este validador. Este validador solo audita que esa
// clasificación YA DECIDIDA sea internamente coherente -- misma disciplina
// que Subsumption en LR-K4.

const ESTADOS_SOPORTE_VALIDOS: ReadonlySet<PropositionSupportStatus> = new Set([
  'SUPPORTED', 'PARTIALLY_SUPPORTED', 'CONTRADICTED', 'NOT_SUPPORTED', 'UNRESOLVED',
]);

/**
 * Deriva el único `status` que un PropositionSupportRecord puede declarar,
 * dado cómo se clasificaron los claims de la proposición. Prioridad:
 * CONTRADICTED (invariante XXVI, nunca se opaca por nada, ni por un claim
 * sin clasificar) > UNRESOLVED (algún claim de la proposición no fue
 * clasificado en ninguno de los tres arreglos) > SUPPORTED (todos los claims
 * están en supportedClaims) > PARTIALLY_SUPPORTED (algunos sí, ninguna
 * contradicción, no todos) > NOT_SUPPORTED (todos clasificados, ninguno
 * soportado, ninguna contradicción).
 *
 * Una proposición sin ningún PropositionClaim asociado deriva UNRESOLVED --
 * nunca SUPPORTED por vacuidad.
 */
export function derivarPropositionSupportStatus(
  idsClaimsDeLaProposicion: string[],
  supportedClaims: string[],
  unsupportedClaims: string[],
  contradictoryClaims: string[],
): PropositionSupportStatus {
  if (idsClaimsDeLaProposicion.length === 0) return 'UNRESOLVED';
  if (contradictoryClaims.length > 0) return 'CONTRADICTED';

  const clasificados = new Set([...supportedClaims, ...unsupportedClaims]);
  const sinClasificar = idsClaimsDeLaProposicion.filter((id) => !clasificados.has(id));
  if (sinClasificar.length > 0) return 'UNRESOLVED';

  if (supportedClaims.length === idsClaimsDeLaProposicion.length) return 'SUPPORTED';
  if (supportedClaims.length > 0) return 'PARTIALLY_SUPPORTED';
  return 'NOT_SUPPORTED';
}

function validarEvidenceLocator(
  loc: EvidenceLocator,
  indice: number,
  idsCitacionDeclaradas: Set<string>,
  idsCitacionReales: Set<string>,
): string[] {
  const errores: string[] = [];
  const prefijo = `evidenceLocators[${indice}]`;
  if (!loc || typeof loc !== 'object') return [`${prefijo} ausente o no es un objeto`];
  if (!loc.citationTrustRecordId) {
    errores.push(`${prefijo} sin citationTrustRecordId`);
    return errores;
  }
  if (!idsCitacionReales.has(loc.citationTrustRecordId)) {
    errores.push(`${prefijo}.citationTrustRecordId "${loc.citationTrustRecordId}" no existe en el contexto de CitationTrustRecord suministrado`);
  } else if (!idsCitacionDeclaradas.has(loc.citationTrustRecordId)) {
    errores.push(`${prefijo}.citationTrustRecordId "${loc.citationTrustRecordId}" no está declarado en citationTrustRecordIds de este registro -- no se puede tomar prestada una citación no declarada`);
  }
  return errores;
}

/**
 * Valida un PropositionSupportRecord completo. Fail-closed: cualquier id
 * huérfano (proposición, citación, claim), clasificación de claim en más de
 * un arreglo, status declarado libremente en vez de derivado, o SUPPORTED/
 * PARTIALLY_SUPPORTED/CONTRADICTED sin al menos un EvidenceLocator resoluble
 * invalida el registro completo.
 *
 * Invariante XXIII (identidad de fuente != soporte de proposición): que
 * `citations` contenga registros VERIFIED con hash no exime de construir la
 * clasificación de claims explícitamente -- este validador nunca infiere
 * status a partir de CitationTrustRecord.verificationState/hash por sí
 * solos, solo de lo que supportedClaims/unsupportedClaims/contradictoryClaims
 * ya declaran.
 */
export function validarPropositionSupportRecord(
  record: PropositionSupportRecord,
  propositions: LegalProposition[],
  citations: IdentifiedCitationTrustRecord[],
  claims: PropositionClaim[],
): ResultadoValidacion {
  const errores: string[] = [];
  if (!record || typeof record !== 'object') return fail(['PropositionSupportRecord ausente o no es un objeto']);
  if (!record.id) errores.push('PropositionSupportRecord sin id');

  const propuestaExiste = propositions.some((p) => p.id === record.propositionId);
  if (!record.propositionId || !propuestaExiste) {
    errores.push(`PropositionSupportRecord.propositionId no existe en el contexto de LegalProposition suministrado: ${String(record.propositionId)}`);
  }

  const idsCitacionReales = new Set(citations.map((c) => c.id));
  const idsCitacionDeclaradas = new Set(Array.isArray(record.citationTrustRecordIds) ? record.citationTrustRecordIds : []);
  if (!Array.isArray(record.citationTrustRecordIds)) {
    errores.push('PropositionSupportRecord.citationTrustRecordIds debe ser un arreglo');
  } else {
    for (const id of record.citationTrustRecordIds) {
      if (!idsCitacionReales.has(id)) {
        errores.push(`PropositionSupportRecord.citationTrustRecordIds contiene un id que no existe en el contexto de CitationTrustRecord suministrado: ${id}`);
      }
    }
  }

  const estado = record.status as unknown;
  if (!estado || !ESTADOS_SOPORTE_VALIDOS.has(estado as PropositionSupportStatus)) {
    errores.push(`PropositionSupportRecord.status inválido o ausente: ${String(estado)}`);
  }

  const claimsDeLaProposicion = claims.filter((c) => c.propositionId === record.propositionId);
  const idsClaimsValidos = new Set(claimsDeLaProposicion.map((c) => c.id));

  const arreglosClaim: Array<{ nombre: string; valores: string[] }> = [
    { nombre: 'supportedClaims', valores: Array.isArray(record.supportedClaims) ? record.supportedClaims : [] },
    { nombre: 'unsupportedClaims', valores: Array.isArray(record.unsupportedClaims) ? record.unsupportedClaims : [] },
    { nombre: 'contradictoryClaims', valores: Array.isArray(record.contradictoryClaims) ? record.contradictoryClaims : [] },
  ];
  for (const campo of ['supportedClaims', 'unsupportedClaims', 'contradictoryClaims'] as const) {
    if (!Array.isArray(record[campo])) errores.push(`PropositionSupportRecord.${campo} debe ser un arreglo`);
  }
  for (const { nombre, valores } of arreglosClaim) {
    for (const id of valores) {
      if (!idsClaimsValidos.has(id)) {
        errores.push(`PropositionSupportRecord.${nombre} referencia un claim que no pertenece a la proposición "${record.propositionId}": ${id}`);
      }
    }
  }

  // Ningún claim puede clasificarse en más de uno de los tres arreglos --
  // una contradicción y un soporte simultáneos para el mismo claim es una
  // inconsistencia del propio registro, no un estado legítimo.
  const conteoPorClaim = new Map<string, number>();
  for (const { valores } of arreglosClaim) {
    for (const id of valores) conteoPorClaim.set(id, (conteoPorClaim.get(id) ?? 0) + 1);
  }
  for (const [id, conteo] of conteoPorClaim) {
    if (conteo > 1) errores.push(`El claim "${id}" aparece en más de uno de supportedClaims/unsupportedClaims/contradictoryClaims -- clasificación ambigua`);
  }

  // ── EVIDENCE LOCATORS ──
  if (!Array.isArray(record.evidenceLocators)) {
    errores.push('PropositionSupportRecord.evidenceLocators debe ser un arreglo');
  } else {
    record.evidenceLocators.forEach((loc, i) => {
      errores.push(...validarEvidenceLocator(loc, i, idsCitacionDeclaradas, idsCitacionReales));
    });
  }

  // ── STATUS (derivado, nunca declarado libremente) ──
  const estadoDerivado = derivarPropositionSupportStatus(
    [...idsClaimsValidos],
    arreglosClaim[0].valores,
    arreglosClaim[1].valores,
    arreglosClaim[2].valores,
  );
  if (ESTADOS_SOPORTE_VALIDOS.has(estado as PropositionSupportStatus) && estado !== estadoDerivado) {
    errores.push(`PropositionSupportRecord.status="${String(estado)}" no coincide con el estado derivado de la clasificación de claims ("${estadoDerivado}") -- invariante XXV/XXVI/XXVII, ningún estado se declara libremente`);
  }

  // Invariante: SUPPORTED/PARTIALLY_SUPPORTED/CONTRADICTED exigen al menos
  // un EvidenceLocator resoluble -- el soporte nunca se afirma sin una
  // relación resoluble a evidencia real.
  const exigeEvidencia = estado === 'SUPPORTED' || estado === 'PARTIALLY_SUPPORTED' || estado === 'CONTRADICTED';
  if (exigeEvidencia && Array.isArray(record.evidenceLocators) && record.evidenceLocators.length === 0) {
    errores.push(`PropositionSupportRecord.status="${String(estado)}" exige al menos un EvidenceLocator -- el soporte nunca se afirma sin evidencia resoluble`);
  }

  return errores.length === 0 ? ok() : fail(errores);
}

// ─────────────────────────────────────────────────────────────────────────────
// LR-K6.1 — EVIDENCE BINDING + CONFLICT-AWARE AGGREGATION
// ─────────────────────────────────────────────────────────────────────────────
//
// Corrige un hallazgo real de Cursor: la versión anterior de
// esProposicionCompletamenteRespaldada usaba `.some(status === 'SUPPORTED')`
// -- un solo PropositionSupportRecord SUPPORTED bastaba para devolver true,
// sin importar que OTRO registro para la MISMA proposición dijera
// CONTRADICTED. Invariante XXIX: un registro de soporte nunca puede borrar
// uno contradictorio. La corrección agrega TODOS los registros/adjudicaciones
// de la proposición a nivel de CLAIM REQUERIDO (invariante XXXIII) antes de
// decidir, y preserva explícitamente tanto los claims soportados como los
// contradictorios en el resultado (invariante XXXII) -- nunca solo un
// veredicto final que descarte la evidencia contraria.

function claimsDeLaProposicion(propositionId: string, claims: PropositionClaim[]): PropositionClaim[] {
  return claims.filter((c) => c.propositionId === propositionId);
}

/**
 * Núcleo compartido de agregación: dado, para cada claim de la proposición,
 * qué conjuntos de ids ya se determinaron como contradichos/soportados/no
 * soportados, deriva el AggregatedPropositionSupport completo -- MISMA
 * lógica para PropositionSupportRecord[] (agregarSoportePorProposicion) y
 * SupportAdjudication[] (agregarAdjudicacionesPorProposicion), para que
 * ambas vías nunca diverjan en sus reglas de prioridad.
 *
 * Prioridad: contradicción en un claim REQUERIDO > claim requerido sin
 * clasificar > cobertura de requeridos. La contradicción en un claim NO
 * requerido se preserva en `contraryClaimIds` (invariante XXXII, nunca se
 * descarta) pero no por sí sola fuerza CONTRADICTED -- solo los requeridos
 * determinan el status de la proposición (invariante XXXIII).
 */
function derivarAgregado(
  propositionId: string,
  todosLosClaims: PropositionClaim[],
  contradictorios: Set<string>,
  soportados: Set<string>,
  noSoportados: Set<string>,
): AggregatedPropositionSupport {
  const idsRequeridos = todosLosClaims.filter((c) => c.required).map((c) => c.id);
  const idsTodos = todosLosClaims.map((c) => c.id);
  const unresolvedClaimIds = idsTodos.filter(
    (id) => !contradictorios.has(id) && !soportados.has(id) && !noSoportados.has(id),
  );

  let status: PropositionSupportStatus;
  const contradictoriosRequeridos = idsRequeridos.filter((id) => contradictorios.has(id));
  const requeridosSinClasificar = idsRequeridos.filter(
    (id) => !contradictorios.has(id) && !soportados.has(id) && !noSoportados.has(id),
  );

  if (idsRequeridos.length === 0) {
    status = 'UNRESOLVED'; // sin claims requeridos declarados, no hay nada que agregar de forma responsable
  } else if (contradictoriosRequeridos.length > 0) {
    status = 'CONTRADICTED'; // invariante XXIX/XXVI: un solo requerido contradicho basta, sin importar cuántos otros estén soportados
  } else if (requeridosSinClasificar.length > 0) {
    status = 'UNRESOLVED';
  } else {
    const requeridosSoportados = idsRequeridos.filter((id) => soportados.has(id));
    if (requeridosSoportados.length === idsRequeridos.length) status = 'SUPPORTED';
    else if (requeridosSoportados.length > 0) status = 'PARTIALLY_SUPPORTED';
    else status = 'NOT_SUPPORTED';
  }

  return {
    propositionId,
    status,
    requiredClaimIds: idsRequeridos,
    supportingClaimIds: [...soportados],
    // TODOS los contradictorios, requeridos o no -- nunca se descartan (invariante XXXII).
    contraryClaimIds: [...contradictorios],
    unresolvedClaimIds,
    notSupportedClaimIds: [...noSoportados],
  };
}

/**
 * Agrega, a nivel de CLAIM REQUERIDO, todos los PropositionSupportRecord de
 * una misma proposición -- nunca decide con un solo registro aislado
 * (invariante XXIX). Si un claim aparece como contradictoryClaims en
 * CUALQUIER registro, ese claim queda contradicho sin importar que otro
 * registro lo liste en supportedClaims.
 */
export function agregarSoportePorProposicion(
  propositionId: string,
  registros: PropositionSupportRecord[],
  claims: PropositionClaim[],
): AggregatedPropositionSupport {
  const todosLosClaims = claimsDeLaProposicion(propositionId, claims);
  const registrosDeProposicion = registros.filter((r) => r.propositionId === propositionId);

  const contradictorios = new Set<string>();
  for (const r of registrosDeProposicion) {
    for (const id of r.contradictoryClaims) contradictorios.add(id);
  }
  const soportados = new Set<string>();
  for (const r of registrosDeProposicion) {
    for (const id of r.supportedClaims) if (!contradictorios.has(id)) soportados.add(id);
  }
  const noSoportados = new Set<string>();
  for (const r of registrosDeProposicion) {
    for (const id of r.unsupportedClaims) if (!contradictorios.has(id) && !soportados.has(id)) noSoportados.add(id);
  }

  return derivarAgregado(propositionId, todosLosClaims, contradictorios, soportados, noSoportados);
}

const ESTADOS_ADJUDICACION_VALIDOS: ReadonlySet<SupportAdjudicationStatus> = new Set([
  'SUPPORTS', 'PARTIALLY_SUPPORTS', 'CONTRADICTS', 'DOES_NOT_SUPPORT', 'UNRESOLVED',
]);

const ORIGENES_ADJUDICACION_VALIDOS: ReadonlySet<AdjudicationOrigin> = new Set([
  'HUMAN', 'EXACT_TEXT_RULE', 'EXTERNAL_REASONER',
]);

/**
 * Valida un SupportAdjudication aislado -- el átomo que LR-K6A no tenía:
 * un claim, una evidencia, una procedencia explícita, un estado. Invariante
 * XXVIII: ninguna adjudicación existe sin evidenceSpan Y origin, sin
 * importar el status (incluso UNRESOLVED debe declarar de dónde vino el
 * intento y a qué evidencia se refería, aunque esa evidencia resultara
 * insuficiente). Nunca valida `evidenceRole` como algo distinto de
 * 'UNKNOWN' o ausente por sí solo -- este validador no clasifica evidencia
 * (invariante XXXVI), solo confirma que la forma del objeto es coherente.
 */
export function validarSupportAdjudication(
  adjudicacion: SupportAdjudication,
  propositions: LegalProposition[],
  claims: PropositionClaim[],
  citations: IdentifiedCitationTrustRecord[],
): ResultadoValidacion {
  const errores: string[] = [];
  if (!adjudicacion || typeof adjudicacion !== 'object') return fail(['SupportAdjudication ausente o no es un objeto']);
  if (!adjudicacion.id) errores.push('SupportAdjudication sin id');

  const propuestaExiste = propositions.some((p) => p.id === adjudicacion.propositionId);
  if (!adjudicacion.propositionId || !propuestaExiste) {
    errores.push(`SupportAdjudication.propositionId no existe en el contexto suministrado: ${String(adjudicacion.propositionId)}`);
  }

  const claimValido = claims.some((c) => c.id === adjudicacion.claimId && c.propositionId === adjudicacion.propositionId);
  if (!adjudicacion.claimId || !claimValido) {
    errores.push(`SupportAdjudication.claimId no pertenece a la proposición referenciada o no existe: ${String(adjudicacion.claimId)}`);
  }

  // Invariante XXVIII: evidenceSpan y origin son obligatorios siempre, sin excepción por status.
  if (!adjudicacion.evidenceSpan || typeof adjudicacion.evidenceSpan !== 'object') {
    errores.push('SupportAdjudication.evidenceSpan ausente -- invariante XXVIII, ninguna adjudicación existe sin evidencia referenciada');
  } else if (!adjudicacion.evidenceSpan.citationTrustRecordId) {
    errores.push('SupportAdjudication.evidenceSpan.citationTrustRecordId ausente -- invariante XXVIII');
  } else if (!citations.some((c) => c.id === adjudicacion.evidenceSpan.citationTrustRecordId)) {
    errores.push(`SupportAdjudication.evidenceSpan.citationTrustRecordId "${adjudicacion.evidenceSpan.citationTrustRecordId}" no existe en el contexto de CitationTrustRecord suministrado`);
  }

  const origen = adjudicacion.origin as unknown;
  if (!origen || !ORIGENES_ADJUDICACION_VALIDOS.has(origen as AdjudicationOrigin)) {
    errores.push(`SupportAdjudication.origin inválido o ausente: ${String(origen)} -- invariante XXVIII, ninguna adjudicación sin procedencia explícita`);
  }

  const estado = adjudicacion.status as unknown;
  if (!estado || !ESTADOS_ADJUDICACION_VALIDOS.has(estado as SupportAdjudicationStatus)) {
    errores.push(`SupportAdjudication.status inválido o ausente: ${String(estado)}`);
  }

  return errores.length === 0 ? ok() : fail(errores);
}

/**
 * Agregación conflict-aware a través de TODAS las SupportAdjudication de una
 * proposición, a nivel de claim REQUERIDO (invariante XXXIII) -- CONTRADICTS
 * en cualquier adjudicación para un claim requerido gana sobre cualquier
 * SUPPORTS del mismo claim (invariante XXIX aplicada a nivel atómico).
 * DOES_NOT_SUPPORT != UNRESOLVED (invariante XXXIV): un claim examinado y
 * no respaldado cae en notSupportedClaimIds; un claim sin ninguna
 * adjudicación, o solo con adjudicaciones UNRESOLVED, cae en
 * unresolvedClaimIds -- nunca se confunden.
 */
export function agregarAdjudicacionesPorProposicion(
  propositionId: string,
  adjudicaciones: SupportAdjudication[],
  claims: PropositionClaim[],
): AggregatedPropositionSupport {
  const todosLosClaims = claimsDeLaProposicion(propositionId, claims);

  const porClaim = new Map<string, SupportAdjudicationStatus[]>();
  for (const a of adjudicaciones) {
    if (a.propositionId !== propositionId) continue;
    const lista = porClaim.get(a.claimId) ?? [];
    lista.push(a.status);
    porClaim.set(a.claimId, lista);
  }

  const contradictorios = new Set<string>();
  const soportados = new Set<string>();
  const noSoportados = new Set<string>();
  for (const c of todosLosClaims) {
    const estados = porClaim.get(c.id) ?? [];
    if (estados.includes('CONTRADICTS')) { contradictorios.add(c.id); continue; }
    if (estados.includes('SUPPORTS')) { soportados.add(c.id); continue; }
    // Invariante XXXIV: DOES_NOT_SUPPORT es examen real sin respaldo, nunca
    // lo mismo que UNRESOLVED (evidencia insuficiente para decidir).
    if (estados.includes('PARTIALLY_SUPPORTS') || estados.includes('DOES_NOT_SUPPORT')) { noSoportados.add(c.id); continue; }
    // Sin adjudicación, o solo UNRESOLVED -> queda en unresolvedClaimIds
    // (derivarAgregado). Invariante XXXV: ausencia de recuperación de
    // soporte nunca se convierte aquí en notSupportedClaimIds -- eso
    // afirmaría "no existe tal respaldo", que este módulo nunca puede saber.
  }

  return derivarAgregado(propositionId, todosLosClaims, contradictorios, soportados, noSoportados);
}

/**
 * Invariante XXII (ninguna proposición legal verificada sin evidencia de
 * soporte) + invariante XXIX (un registro de soporte no puede borrar uno
 * contradictorio) + invariante XXVIII (soporte exige evidencia enlazada):
 * FAIL-CLOSED por construcción. `esProposicionConFuenteVerificada`
 * (LR-K2/K3, sin tocar) confirma identidad/proveniencia de fuente; esta
 * función además exige, a través de `agregarAdjudicacionesPorProposicion`
 * (que opera sobre SupportAdjudication, cada una ya validada por
 * validarSupportAdjudication como evidence-bound con procedencia explícita):
 *
 *   - al menos un claim REQUERIDO existe para la proposición;
 *   - CADA claim requerido tiene una adjudicación SUPPORTS explícita
 *     (evidence-bound, con origin);
 *   - NINGÚN claim requerido tiene una adjudicación CONTRADICTS;
 *   - NINGÚN claim requerido queda sin clasificar (UNRESOLVED).
 *
 * Devuelve true SOLO cuando el agregado deriva exactamente 'SUPPORTED'.
 * Nunca reabre ni modifica validarLegalProposition.
 *
 * CAMBIO DE FIRMA (Mission LR-K6.1, versión reconciliada): ahora opera sobre
 * SupportAdjudication[] (evidence-bound) en vez de PropositionSupportRecord[]
 * (clasificación plana sin evidencia individual enlazada) -- el nivel de
 * rigor que la directiva exige explícitamente ("every required claim has
 * explicit SUPPORTS adjudication... every required claim is evidence-bound").
 * Corrección autorizada explícitamente por esta misión, no una reapertura no
 * autorizada de LR-K6A.
 */
export function esProposicionCompletamenteRespaldada(
  proposicion: LegalProposition,
  claims: PropositionClaim[],
  adjudicaciones: SupportAdjudication[],
): boolean {
  if (!esProposicionConFuenteVerificada(proposicion)) return false;
  const agregado = agregarAdjudicacionesPorProposicion(proposicion.id, adjudicaciones, claims);
  if (agregado.requiredClaimIds.length === 0) return false;
  return agregado.status === 'SUPPORTED';
}

// ─────────────────────────────────────────────────────────────────────────────
// LR-K7 — AUTHORITY + TEMPORAL QUALIFICATION
// ─────────────────────────────────────────────────────────────────────────────
//
// Responde "¿qué peso legal tiene esta fuente y cómo se relaciona con otras?"
// (Authority/AuthorityRelationship) y "¿está vigente esta disposición?"
// (TemporalLegalState/AmendmentEvent) -- NUNCA "¿es esta la regla que
// legalmente controla el caso?" (eso sigue siendo ApplicableRule, sin
// construir). Invariante XXXVII: sin jerarquía numérica en ningún lugar de
// este módulo -- la jerarquía cruzada se representa solo con
// AuthorityRelationship explícitas y evidenciadas. Invariante XLI: ninguna
// relación se infiere por expectativa del modelo -- no existe aquí ninguna
// función "ganadora automática" para lex specialis/lex posterior/supremacía
// constitucional, solo relaciones auditables con su propio
// verificationStatus.

const TIPOS_FUENTE_VALIDOS: ReadonlySet<AuthoritySourceType> = new Set([
  'CONSTITUTION', 'TREATY', 'STATUTE', 'REGULATION', 'JURISPRUDENCE',
  'INSTITUTIONAL_COMMENTARY', 'ACADEMIC_DOCTRINE', 'PRACTICE_TEMPLATE', 'OTHER',
]);

const ROLES_LEGALES_VALIDOS: ReadonlySet<LegalRoleType> = new Set([
  'PRIMARY_BINDING', 'INTERPRETIVE', 'PERSUASIVE', 'PRACTICE_GUIDANCE', 'DISCOVERY_ONLY',
]);

const FUENTES_DOCTRINALES: ReadonlySet<AuthoritySourceType> = new Set([
  'ACADEMIC_DOCTRINE', 'INSTITUTIONAL_COMMENTARY',
]);

/**
 * Invariante XLIV: `legalRole` nunca se deriva de `sourceType` -- esta
 * función NO existe en ninguna forma que mapee automáticamente
 * sourceType→legalRole; `validarAuthority` solo audita que la combinación
 * declarada sea internamente coherente (invariante XLIII: doctrina nunca
 * PRIMARY_BINDING), nunca la completa ni la infiere por sí sola.
 */
export function validarAuthority(a: Authority): ResultadoValidacion {
  const errores: string[] = [];
  if (!a || typeof a !== 'object') return fail(['Authority ausente o no es un objeto']);

  const tipo = a.sourceType as unknown;
  if (!tipo || !TIPOS_FUENTE_VALIDOS.has(tipo as AuthoritySourceType)) {
    errores.push(`Authority.sourceType inválido o ausente: ${String(tipo)}`);
  }

  const rol = a.legalRole as unknown;
  if (!rol || !ROLES_LEGALES_VALIDOS.has(rol as LegalRoleType)) {
    errores.push(`Authority.legalRole inválido o ausente: ${String(rol)}`);
  }

  if (FUENTES_DOCTRINALES.has(a.sourceType) && a.legalRole === 'PRIMARY_BINDING') {
    errores.push('Authority.sourceType doctrinal (ACADEMIC_DOCTRINE/INSTITUTIONAL_COMMENTARY) no puede declarar legalRole="PRIMARY_BINDING" -- invariante XLIII, ver §5.3 de la arquitectura');
  }

  if (!a.jurisdiction || a.jurisdiction.trim().length === 0) errores.push('Authority sin jurisdiction');

  if (!a.provenance || typeof a.provenance !== 'object') {
    errores.push('Authority sin provenance -- ninguna fuente de autoridad puede existir sin locator trazable');
  } else if (!a.provenance.instrumento || !a.provenance.articulo) {
    errores.push('Authority.provenance debe declarar instrumento y articulo');
  }

  return errores.length === 0 ? ok() : fail(errores);
}

const RELACIONES_AUTORIDAD_VALIDAS: ReadonlySet<AuthorityRelationType> = new Set([
  'CONSTITUTIONAL_SUPREMACY', 'SPECIAL_OVER_GENERAL', 'LATER_OVER_EARLIER',
  'AMENDS', 'REPEALS', 'INTERPRETS', 'APPLIES', 'DISTINGUISHES', 'CITES', 'UNKNOWN',
]);

/**
 * Invariante XLII (ninguna relación VERIFIED sin evidencia, la misma
 * disciplina que invariante III para CitationTrustRecord): `verificationStatus
 * === 'VERIFIED'` exige `evidence` no vacío. `UNKNOWN` es un valor legítimo y
 * estable para `relation` -- nunca se rechaza ni se "sube" a otra relación
 * automáticamente (invariante XLI).
 */
export function validarAuthorityRelationship(r: AuthorityRelationship): ResultadoValidacion {
  const errores: string[] = [];
  if (!r || typeof r !== 'object') return fail(['AuthorityRelationship ausente o no es un objeto']);

  if (!r.source || !r.source.instrumento || !r.source.articulo) {
    errores.push('AuthorityRelationship.source debe declarar instrumento y articulo');
  }
  if (!r.target || !r.target.instrumento || !r.target.articulo) {
    errores.push('AuthorityRelationship.target debe declarar instrumento y articulo');
  }

  const relacion = r.relation as unknown;
  if (!relacion || !RELACIONES_AUTORIDAD_VALIDAS.has(relacion as AuthorityRelationType)) {
    errores.push(`AuthorityRelationship.relation inválido o ausente: ${String(relacion)}`);
  }

  const estado = r.verificationStatus as unknown;
  if (!estado || !ESTADOS_VERIFICACION_LEGAL_VALIDOS.has(estado as LegalVerificationStatus)) {
    errores.push(`AuthorityRelationship.verificationStatus inválido o ausente: ${String(estado)}`);
  }

  if (!Array.isArray(r.evidence)) {
    errores.push('AuthorityRelationship.evidence debe ser un arreglo (puede ser vacío, nunca ausente)');
  } else if (r.verificationStatus === 'VERIFIED' && r.evidence.length === 0) {
    errores.push('AuthorityRelationship.verificationStatus="VERIFIED" exige evidence no vacío -- invariante XLII, ninguna relación se verifica sin evidencia');
  }

  return errores.length === 0 ? ok() : fail(errores);
}

const TIPOS_EVENTO_ENMIENDA_VALIDOS: ReadonlySet<AmendmentEventType> = new Set([
  'REFORMA', 'DEROGACION', 'SUSTITUCION', 'RESTAURACION', 'OTHER',
]);

/**
 * Igual disciplina que `validarAuthorityRelationship`: VERIFIED exige
 * evidence no vacío (invariante XLII). `provenance` es opcional -- un evento
 * puede conocerse solo por `instrument`/`gacetaRef` en esta capa sombra.
 */
function validarAmendmentEvent(e: AmendmentEvent, indice: number): string[] {
  const errores: string[] = [];
  const prefijo = `amendmentEvents[${indice}]`;
  if (!e || typeof e !== 'object') return [`${prefijo} ausente o no es un objeto`];

  const tipo = e.type as unknown;
  if (!tipo || !TIPOS_EVENTO_ENMIENDA_VALIDOS.has(tipo as AmendmentEventType)) {
    errores.push(`${prefijo}.type inválido o ausente: ${String(tipo)}`);
  }
  if (!e.instrument || e.instrument.trim().length === 0) errores.push(`${prefijo} sin instrument`);
  if (!e.affectedProvision || e.affectedProvision.trim().length === 0) errores.push(`${prefijo} sin affectedProvision`);

  const estado = e.verificationStatus as unknown;
  if (!estado || !ESTADOS_VERIFICACION_LEGAL_VALIDOS.has(estado as LegalVerificationStatus)) {
    errores.push(`${prefijo}.verificationStatus inválido o ausente: ${String(estado)}`);
  }

  if (!Array.isArray(e.evidence)) {
    errores.push(`${prefijo}.evidence debe ser un arreglo (puede ser vacío, nunca ausente)`);
  } else if (e.verificationStatus === 'VERIFIED' && e.evidence.length === 0) {
    errores.push(`${prefijo}.verificationStatus="VERIFIED" exige evidence no vacío -- invariante XLII`);
  }

  return errores;
}

const ESTADOS_TEMPORALES_VALIDOS: ReadonlySet<TemporalLegalStatus> = new Set([
  'VIGENTE', 'DEROGADO', 'PARCIALMENTE_VIGENTE', 'SUSPENDIDO', 'UNKNOWN',
]);

/**
 * Invariante XL (REFORMADO es un evento, no un estado terminal): esta
 * función NUNCA rechaza legalStatus="VIGENTE" (o "PARCIALMENTE_VIGENTE")
 * solo porque existan eventos REFORMA -- un artículo reformado sigue vigente
 * en su forma enmendada. Invariante contrario, simétrico: legalStatus=
 * "DEROGADO" exige al menos un AmendmentEvent tipo DEROGACION con
 * verificationStatus="VERIFIED" y evidence no vacío -- la derogación nunca
 * es una declaración desnuda (mismo principio que invariante III/XLII
 * aplicado aquí). `legalStatus` y `verificationStatus` se validan de forma
 * independiente -- ninguno se deriva del otro (ver architecture doc §4);
 * en particular, esta función NUNCA acepta una señal legado
 * `es_norma_vigente` como entrada -- ese puente, si alguna vez existe, pasa
 * obligatoriamente por `derivarVerificationStatusDesdeSenalLegado` (nunca
 * más que PARTIAL) y nunca por aquí (invariante XXXVIII).
 */
export function validarTemporalLegalState(state: TemporalLegalState): ResultadoValidacion {
  const errores: string[] = [];
  if (!state || typeof state !== 'object') return fail(['TemporalLegalState ausente o no es un objeto']);

  const estadoLegal = state.legalStatus as unknown;
  if (!estadoLegal || !ESTADOS_TEMPORALES_VALIDOS.has(estadoLegal as TemporalLegalStatus)) {
    errores.push(`TemporalLegalState.legalStatus inválido o ausente: ${String(estadoLegal)}`);
  }

  const estadoVerificacion = state.verificationStatus as unknown;
  if (!estadoVerificacion || !ESTADOS_VERIFICACION_LEGAL_VALIDOS.has(estadoVerificacion as LegalVerificationStatus)) {
    errores.push(`TemporalLegalState.verificationStatus inválido o ausente: ${String(estadoVerificacion)}`);
  }

  if (!Array.isArray(state.amendmentEvents)) {
    errores.push('TemporalLegalState.amendmentEvents debe ser un arreglo (puede ser vacío, nunca ausente)');
  } else {
    state.amendmentEvents.forEach((e, i) => errores.push(...validarAmendmentEvent(e, i)));

    if (estadoLegal === 'DEROGADO') {
      const derogacionVerificada = state.amendmentEvents.some(
        (e) => e.type === 'DEROGACION' && e.verificationStatus === 'VERIFIED' && Array.isArray(e.evidence) && e.evidence.length > 0,
      );
      if (!derogacionVerificada) {
        errores.push('TemporalLegalState.legalStatus="DEROGADO" exige al menos un AmendmentEvent type="DEROGACION" con verificationStatus="VERIFIED" y evidence no vacío -- la derogación nunca es una declaración desnuda');
      }
    }
  }

  return errores.length === 0 ? ok() : fail(errores);
}

/**
 * Invariante XXXVIII: el único puente permitido entre la señal legado
 * `es_norma_vigente` (metadato de ingesta en `biblioteca_vectores`, sin
 * proceso de confirmación independiente detrás) y un
 * `LegalVerificationStatus` -- y ese puente NUNCA puede alcanzar 'VERIFIED',
 * sin importar el valor booleano de entrada. `true` sugiere que existe una
 * señal legado (soporta PARTIAL como máximo); `false` no aporta ninguna
 * señal en absoluto (UNRESOLVED). Ningún otro lugar de este módulo lee ni
 * acepta este booleano como entrada.
 */
export function derivarVerificationStatusDesdeSenalLegado(esNormaVigente: boolean): LegalVerificationStatus {
  return esNormaVigente ? 'PARTIAL' : 'UNRESOLVED';
}

// ─────────────────────────────────────────────────────────────────────────────
// LR-K8 — RULE QUALIFICATION / APPLICABLE RULE CONTRACT
// ─────────────────────────────────────────────────────────────────────────────
//
// Responde "¿está esta NormativeRule calificada como aplicable ahora mismo?"
// enlazando UN Authority, UN TemporalLegalState y las AuthorityRelationship
// que el propio llamador ya clasificó (invariante XLV: ninguna función aquí
// "gana" automáticamente a partir del TIPO de relación -- SPECIAL_OVER_GENERAL
// o LATER_OVER_EARLIER verificadas pueden producir DISPLACED o LIMITED según
// cómo las clasificó el fixture, nunca según una tabla de decisión
// hardcodeada). `qualificationStatus` se DERIVA mecánicamente (misma
// disciplina "derivado, nunca declarado libremente" que Subsumption/
// ConclusionTrace/PropositionSupportRecord) a partir de: legalStatus del
// TemporalLegalState + qué blockers de tipo *_RELATIONSHIP el llamador ya
// declaró y si esas relaciones son verificables (VERIFIED, relation!=UNKNOWN).

function mismaRelacion(a: AuthorityRelationship, b: AuthorityRelationship): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** true solo si la relación referenciada por un blocker *_RELATIONSHIP existe tal cual en `relationships` Y es utilizable para decidir desplazamiento/limitación (invariante XLVIII: ni sin verificar ni UNKNOWN puede decidir). */
function relacionUtilizable(rel: AuthorityRelationship | undefined, relationships: AuthorityRelationship[]): boolean {
  if (!rel) return false;
  const declarada = relationships.some((r) => mismaRelacion(r, rel));
  if (!declarada) return false;
  return rel.verificationStatus === 'VERIFIED' && rel.relation !== 'UNKNOWN';
}

/**
 * Deriva el único `qualificationStatus` que una RuleQualification puede
 * declarar. Prioridad: DEROGADO (temporal) o un blocker DISPLACING_RELATIONSHIP
 * utilizable > SUSPENDIDO/PARCIALMENTE_VIGENTE (temporal), un blocker
 * LIMITING_RELATIONSHIP utilizable, `authority.legalRole !== 'PRIMARY_BINDING'`
 * (invariante LII, LR-K8.1), o `verificationStatus === 'PARTIAL'` (invariante
 * LIII, LR-K8.1) > verificationStatus="UNRESOLVED" o legalStatus="UNKNOWN" o
 * cualquier blocker *_RELATIONSHIP NO utilizable (invariante XLVI/XLVII/
 * XLVIII) > APPLICABLE (VIGENTE + VERIFIED + authority PRIMARY_BINDING + sin
 * blockers). Invariante L: NUNCA lee `temporalState.amendmentEvents` -- un
 * evento REFORMA nunca decide esto por sí mismo. LR-K8.1: `PARTIAL` deriva
 * LIMITED (un hecho conocido y definido sobre la fuente/verificación, no una
 * laguna evidentiaria) -- nunca se confunde con `UNRESOLVED`, que permanece
 * sin cambios.
 *
 * LR-K8.1b ("Option A", decisión CLO 2026-09-29): el bloque LIMITED se
 * evalúa ANTES que el bloque UNRESOLVED a propósito -- un `legalRole` no
 * primario SIEMPRE gana sobre una laguna temporal (`UNRESOLVED`/`UNKNOWN`)
 * cuando ambos ocurren a la vez, salvo que ya aplique DISPLACED. `UNRESOLVED`
 * solo puede derivarse cuando `authority.legalRole === 'PRIMARY_BINDING'` Y
 * existe una laguna temporal genuina. La "Option B" (laguna temporal gana
 * sobre rol no primario) fue considerada y rechazada explícitamente -- ver
 * types.ts, sección "LR-K8.1 — QUALIFICATION HARDENING", para el
 * razonamiento completo.
 */
export function derivarRuleQualificationStatus(
  authority: Authority,
  temporalState: TemporalLegalState,
  relationships: AuthorityRelationship[],
  blockers: RuleQualificationBlocker[],
): RuleQualificationStatus {
  const desplazantesUtilizables = blockers.filter(
    (b) => b.type === 'DISPLACING_RELATIONSHIP' && relacionUtilizable(b.relationship, relationships),
  );
  if (temporalState.legalStatus === 'DEROGADO' || desplazantesUtilizables.length > 0) {
    return 'DISPLACED';
  }

  const limitantesUtilizables = blockers.filter(
    (b) => b.type === 'LIMITING_RELATIONSHIP' && relacionUtilizable(b.relationship, relationships),
  );
  if (
    temporalState.legalStatus === 'SUSPENDIDO'
    || temporalState.legalStatus === 'PARCIALMENTE_VIGENTE'
    || limitantesUtilizables.length > 0
    // Invariante LII (LR-K8.1): un rol no PRIMARY_BINDING (INTERPRETIVE,
    // PERSUASIVE, PRACTICE_GUIDANCE, DISCOVERY_ONLY) nunca sostiene
    // APPLICABLE completo -- es un hecho conocido sobre la fuente, no una
    // laguna, así que se representa LIMITED, nunca UNRESOLVED. "Option A"
    // (LR-K8.1b, decisión CLO): este chequeo se evalúa aquí, ANTES del
    // bloque UNRESOLVED de abajo, a propósito -- gana sobre cualquier laguna
    // temporal simultánea (UNRESOLVED/UNKNOWN), nunca al revés.
    || authority.legalRole !== 'PRIMARY_BINDING'
    // Invariante LIII (LR-K8.1): verificación temporal PARTIAL no basta para
    // una aserción profesional de vigencia plena -- LIMITED, nunca APPLICABLE.
    || temporalState.verificationStatus === 'PARTIAL'
  ) {
    return 'LIMITED';
  }

  const relacionNoUtilizableDeclarada = blockers.some(
    (b) => (b.type === 'DISPLACING_RELATIONSHIP' || b.type === 'LIMITING_RELATIONSHIP' || b.type === 'RELATIONSHIP_UNVERIFIED_OR_UNKNOWN')
      && !relacionUtilizable(b.relationship, relationships),
  );
  if (
    temporalState.verificationStatus === 'UNRESOLVED'
    || temporalState.legalStatus === 'UNKNOWN'
    || relacionNoUtilizableDeclarada
  ) {
    return 'UNRESOLVED';
  }

  return 'APPLICABLE';
}

const ESTADOS_CALIFICACION_VALIDOS: ReadonlySet<RuleQualificationStatus> = new Set([
  'APPLICABLE', 'LIMITED', 'DISPLACED', 'UNRESOLVED',
]);

const TIPOS_BLOQUEADOR_CALIFICACION_VALIDOS: ReadonlySet<RuleQualificationBlockerType> = new Set([
  'RULE_NOT_VIGENTE', 'TEMPORAL_VERIFICATION_UNRESOLVED', 'TEMPORAL_VERIFICATION_PARTIAL',
  'AUTHORITY_NOT_PRIMARY_BINDING', 'DISPLACING_RELATIONSHIP',
  'LIMITING_RELATIONSHIP', 'RELATIONSHIP_UNVERIFIED_OR_UNKNOWN', 'OTHER',
]);

function validarRuleQualificationBlocker(
  b: RuleQualificationBlocker,
  indice: number,
  relationships: AuthorityRelationship[],
): string[] {
  const errores: string[] = [];
  const prefijo = `blockers[${indice}]`;
  if (!b || typeof b !== 'object') return [`${prefijo} ausente o no es un objeto`];

  const tipo = b.type as unknown;
  if (!tipo || !TIPOS_BLOQUEADOR_CALIFICACION_VALIDOS.has(tipo as RuleQualificationBlockerType)) {
    errores.push(`${prefijo}.type inválido o ausente: ${String(tipo)}`);
  }
  if (!b.description || b.description.trim().length === 0) errores.push(`${prefijo} sin description`);

  const esTipoRelacional = b.type === 'DISPLACING_RELATIONSHIP' || b.type === 'LIMITING_RELATIONSHIP' || b.type === 'RELATIONSHIP_UNVERIFIED_OR_UNKNOWN';
  if (esTipoRelacional) {
    if (!b.relationship) {
      errores.push(`${prefijo}: type="${b.type}" exige una relationship explícita -- invariante XLIX, ninguna relación se asume sin representarse`);
    } else if (!relationships.some((r) => mismaRelacion(r, b.relationship as AuthorityRelationship))) {
      errores.push(`${prefijo}.relationship no está declarada en RuleQualification.relationships -- no se puede tomar prestada una relación no declarada (invariante XLIX)`);
    }
  }

  return errores;
}

/**
 * Valida una RuleQualification completa contra el NormativeRule que
 * referencia. Fail-closed: ruleId huérfano, Authority/TemporalLegalState/
 * AuthorityRelationship internamente inválidos, blocker con relationship no
 * declarada, o qualificationStatus declarado que no coincide con el
 * derivado invalidan el registro completo -- nunca se acepta un status
 * distinto del mecánicamente derivado (misma disciplina que Subsumption/
 * ConclusionTrace/PropositionSupportRecord).
 */
export function validarRuleQualification(
  q: RuleQualification,
  rules: NormativeRule[],
): ResultadoValidacion {
  const errores: string[] = [];
  if (!q || typeof q !== 'object') return fail(['RuleQualification ausente o no es un objeto']);
  if (!q.id) errores.push('RuleQualification sin id');

  const reglaExiste = rules.some((r) => r.id === q.ruleId);
  if (!q.ruleId || !reglaExiste) {
    errores.push(`RuleQualification.ruleId no existe en el contexto de NormativeRule suministrado: ${String(q.ruleId)}`);
  }

  const resultadoAutoridad = validarAuthority(q.authority);
  if (!resultadoAutoridad.valido) {
    errores.push(...resultadoAutoridad.errores.map((e) => `RuleQualification.authority: ${e}`));
  }

  const resultadoTemporal = validarTemporalLegalState(q.temporalState);
  if (!resultadoTemporal.valido) {
    errores.push(...resultadoTemporal.errores.map((e) => `RuleQualification.temporalState: ${e}`));
  }

  if (!Array.isArray(q.relationships)) {
    errores.push('RuleQualification.relationships debe ser un arreglo (puede ser vacío, nunca ausente)');
  } else {
    q.relationships.forEach((r, i) => {
      const resultado = validarAuthorityRelationship(r);
      if (!resultado.valido) errores.push(...resultado.errores.map((e) => `RuleQualification.relationships[${i}]: ${e}`));
    });
  }

  const relacionesDeclaradas = Array.isArray(q.relationships) ? q.relationships : [];

  if (!Array.isArray(q.blockers)) {
    errores.push('RuleQualification.blockers debe ser un arreglo (puede ser vacío, nunca ausente)');
  } else {
    q.blockers.forEach((b, i) => errores.push(...validarRuleQualificationBlocker(b, i, relacionesDeclaradas)));
  }

  // ── QUALIFICATION STATUS (derivado, nunca declarado libremente) ──
  const estado = q.qualificationStatus as unknown;
  if (!estado || !ESTADOS_CALIFICACION_VALIDOS.has(estado as RuleQualificationStatus)) {
    errores.push(`RuleQualification.qualificationStatus inválido o ausente: ${String(estado)}`);
  } else if (resultadoAutoridad.valido && resultadoTemporal.valido && Array.isArray(q.relationships) && Array.isArray(q.blockers)) {
    const estadoDerivado = derivarRuleQualificationStatus(q.authority, q.temporalState, relacionesDeclaradas, q.blockers);
    if (estado !== estadoDerivado) {
      errores.push(`RuleQualification.qualificationStatus="${String(estado)}" no coincide con el estado derivado ("${estadoDerivado}") -- invariante XLV/XLVI/XLVII/XLVIII/LII/LIII, ningún estado se declara libremente`);
    }
  }

  // APPLICABLE exige blockers vacío; cualquier otro estado exige al menos un blocker explícito (mismo principio que ConclusionTrace, invariante XVI aplicada aquí).
  if (Array.isArray(q.blockers)) {
    if (estado === 'APPLICABLE' && q.blockers.length > 0) {
      errores.push('RuleQualification.qualificationStatus="APPLICABLE" no puede declarar ningún blocker -- un bloqueador presente contradice aplicabilidad completa');
    }
    if (estado !== 'APPLICABLE' && ESTADOS_CALIFICACION_VALIDOS.has(estado as RuleQualificationStatus) && q.blockers.length === 0) {
      errores.push(`RuleQualification.qualificationStatus="${String(estado)}" exige al menos un blocker explícito -- ningún bloqueo es silencioso`);
    }
  }

  return errores.length === 0 ? ok() : fail(errores);
}
