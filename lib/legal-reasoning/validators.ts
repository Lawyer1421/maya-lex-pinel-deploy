/**
 * lib/legal-reasoning/validators.ts
 *
 * LR-K1 / LR-K2 / LR-K3 / LR-K4 — deterministic validators. Fail closed: a
 * malformed or incomplete structure is reported as invalid, never silently
 * accepted or repaired. No LLM extraction integration here (per directive,
 * "no LLM extraction integration yet unless strictly required for testing"
 * -- it isn't; these validators operate on already-constructed objects).
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
