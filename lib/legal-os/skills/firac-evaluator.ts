/**
 * lib/legal-os/skills/firac-evaluator.ts
 * Evaluador FIRAC: cruza los HECHOS que aporta el usuario contra las casillas de una plantilla (firac-schema.ts) y devuelve la plantilla
 * evaluada. Es una función PURA y determinista: sin red, sin Supabase, sin modelo de lenguaje. No interpreta derecho: solo aplica reglas
 * de decisión explícitas sobre dos entradas que otro componente debe aportar:
 *   - `facts`: lo que el usuario (o un extractor de documentos) afirma sobre cada casilla;
 *   - `evidence`: fragmentos del corpus que respaldan la NORMA de cada casilla (el pipeline de recuperación; aquí solo llegan ya resueltos).
 *
 * Reglas de decisión por casilla hoja (ver `evaluarCasilla`):
 *   1. Sin hecho aportado                                  → UNKNOWN (SIN_HECHO).
 *   2. Hecho «no aplica» con motivo                        → NOT_APPLICABLE (NO_APLICA).
 *   3. Hecho aportado pero sin evidencia PRIMARY de la norma → UNKNOWN (NORMA_SIN_EVIDENCIA_PRIMARY): sin norma respaldada no se cumple ni se incumple.
 *   4. Hecho «cumple» + evidencia PRIMARY                  → MET.
 *   5. Hecho «no cumple» + evidencia PRIMARY               → NOT_MET.
 * Veredicto (lo fija el sistema, no el modelo):
 *   - con faltantes (UNKNOWN): CONDICIONAL_A_COMPLETAR si ya hay alguna casilla resuelta; NO_CONCLUYENTE si no hay ninguna;
 *   - sin faltantes: NO_CUMPLE si alguna casilla es NOT_MET; CUMPLE en otro caso.
 * El resultado se vuelve a validar con FiracSkillSchema, de modo que los invariantes del esquema (missingElements recalculado, sin veredicto
 * categórico con faltantes, MET con evidencia PRIMARY) no pueden romperse desde aquí. El evaluador NUNCA marca una base como VERIFICADO_CORPUS
 * ni declara vigencia: eso corresponde al pipeline y al CLO. Toda salida es NO OFICIAL.
 */
import {
  FiracSkillSchema, VEREDICTOS_CON_FALTANTES, calcularMissingElements, estadoDeCasilla,
  type FiracSkill, type FiracVerdict, type RuleCheckbox, type RuleCheckboxStatus, type RuleElement, type RuleEvidence,
} from './firac-schema';

/** Lo que se afirma sobre una casilla. `satisfied: null` equivale a no haber aportado el hecho. */
export interface FactAssertion {
  /** true = el hecho cumple el requisito; false = no lo cumple; null = sin dato. */
  satisfied: boolean | null;
  /** Si el requisito no aplica al caso, con el motivo (obligatorio). */
  not_applicable?: { reason: string };
  /** Nota o cita del documento del usuario que sustenta el hecho (se conserva en `facts.provided`). */
  note?: string;
}

export interface FiracEvaluationInput {
  template: FiracSkill;
  /** Hechos por id de casilla hoja (los ids de elementos incluidos). */
  facts: Readonly<Record<string, FactAssertion>>;
  /** Evidencia de corpus por id de casilla hoja: respalda la norma, no el hecho. */
  evidence: Readonly<Record<string, readonly RuleEvidence[]>>;
}

export type EvaluationReason = 'SIN_HECHO' | 'NO_APLICA' | 'NORMA_SIN_EVIDENCIA_PRIMARY' | 'HECHO_CUMPLE' | 'HECHO_NO_CUMPLE';

export interface EvaluationTraceItem {
  id: string;
  status: RuleCheckboxStatus;
  reason: EvaluationReason;
}

export interface FiracEvaluation {
  skill: FiracSkill;
  trace: EvaluationTraceItem[];
  /** Mismo valor que `skill.missingElements`, por comodidad. */
  missingElements: string[];
}

export class FiracEvaluationError extends Error {
  constructor(readonly codigo: 'ID_DESCONOCIDO' | 'NO_APLICA_SIN_MOTIVO' | 'HECHO_AMBIGUO' | 'PLANTILLA_INVALIDA' | 'RESULTADO_INVALIDO', mensaje: string) {
    super(mensaje);
    this.name = 'FiracEvaluationError';
  }
}

/** Decide el estado de UNA casilla hoja. Pura; devuelve también el motivo para la traza. */
export function evaluarCasilla(
  fact: FactAssertion | undefined,
  evidence: readonly RuleEvidence[] | undefined,
): { status: RuleCheckboxStatus; reason: EvaluationReason } {
  if (!fact || (fact.satisfied === null && !fact.not_applicable)) return { status: 'UNKNOWN', reason: 'SIN_HECHO' };
  if (fact.not_applicable) return { status: 'NOT_APPLICABLE', reason: 'NO_APLICA' };
  const hayNorma = (evidence ?? []).some((e) => e.source_role === 'PRIMARY');
  if (!hayNorma) return { status: 'UNKNOWN', reason: 'NORMA_SIN_EVIDENCIA_PRIMARY' };
  return fact.satisfied ? { status: 'MET', reason: 'HECHO_CUMPLE' } : { status: 'NOT_MET', reason: 'HECHO_NO_CUMPLE' };
}

/** Veredicto que corresponde a un conjunto de casillas (lo calcula el sistema). */
export function veredictoDeRevision(rules: readonly RuleCheckbox[]): FiracVerdict {
  if (calcularMissingElements(rules).length > 0) {
    const hayResueltas = rules.some((r) => (r.elements ?? [r]).some((h) => h.status === 'MET' || h.status === 'NOT_MET'));
    return hayResueltas ? 'CONDICIONAL_A_COMPLETAR' : 'NO_CONCLUYENTE';
  }
  return rules.some((r) => estadoDeCasilla(r) === 'NOT_MET') ? 'NO_CUMPLE' : 'CUMPLE';
}

const TEXTO: Record<FiracVerdict, (faltan: string[]) => string> = {
  NO_CONCLUYENTE: (f) => `Faltan elementos por verificar (${f.join(', ')}); no se emite un veredicto categórico. Salida analítica NO OFICIAL.`,
  CONDICIONAL_A_COMPLETAR: (f) => `Revisión parcial: quedan elementos por completar (${f.join(', ')}); el resultado es condicional y no categórico. Salida analítica NO OFICIAL.`,
  CUMPLE: () => 'Todas las casillas obligatorias están resueltas y ninguna incumple, con evidencia PRIMARY de la norma. Salida analítica NO OFICIAL; no declara vigencia.',
  NO_CUMPLE: () => 'Todas las casillas obligatorias están resueltas y al menos una incumple, con evidencia PRIMARY de la norma. Salida analítica NO OFICIAL; no declara vigencia.',
};

export function evaluarFirac(input: FiracEvaluationInput): FiracEvaluation {
  const plantilla = FiracSkillSchema.safeParse(input.template);
  if (!plantilla.success) throw new FiracEvaluationError('PLANTILLA_INVALIDA', `plantilla inválida: ${plantilla.error.issues[0]?.message ?? 'sin detalle'}`);
  const skill = structuredClone(plantilla.data) as FiracSkill;

  const hojas = new Map<string, RuleCheckbox | RuleElement>();
  for (const r of skill.firac.rules) for (const h of r.elements ?? [r]) hojas.set(h.id, h);
  for (const id of [...Object.keys(input.facts), ...Object.keys(input.evidence)])
    if (!hojas.has(id)) throw new FiracEvaluationError('ID_DESCONOCIDO', `la plantilla ${skill.skill_id} no tiene la casilla ${id}`);
  for (const [id, f] of Object.entries(input.facts)) {
    if (f.not_applicable && !f.not_applicable.reason.trim()) throw new FiracEvaluationError('NO_APLICA_SIN_MOTIVO', `${id}: «no aplica» exige motivo`);
    if (f.not_applicable && f.satisfied !== null) throw new FiracEvaluationError('HECHO_AMBIGUO', `${id}: no puede ser «no aplica» y a la vez cumple/no cumple`);
  }

  const trace: EvaluationTraceItem[] = [];
  const aportados: string[] = [];
  for (const [id, h] of hojas) {
    const fact = input.facts[id];
    const ev = input.evidence[id];
    const r = evaluarCasilla(fact, ev); // las no obligatorias se evalúan igual; solo las obligatorias cuentan en missingElements
    h.status = r.status;
    h.evidence = r.status === 'MET' || r.status === 'NOT_MET' ? [...(ev ?? [])] : [];
    trace.push({ id, status: r.status, reason: r.reason });
    if (fact && (fact.satisfied !== null || fact.not_applicable)) aportados.push(fact.note ? `${id}: ${fact.note}` : id);
  }
  // El estado de una casilla madre se deriva de sus elementos.
  for (const r of skill.firac.rules) if (r.elements) r.status = estadoDeCasilla(r);

  skill.firac.facts.provided = aportados;
  skill.missingElements = calcularMissingElements(skill.firac.rules);
  const verdict = veredictoDeRevision(skill.firac.rules);
  skill.firac.conclusion = { ...skill.firac.conclusion, verdict, text: TEXTO[verdict](skill.missingElements) };

  // Doble seguro: ningún veredicto categórico con faltantes (lo exige también el esquema).
  if (skill.missingElements.length > 0 && !(VEREDICTOS_CON_FALTANTES as readonly string[]).includes(verdict))
    throw new FiracEvaluationError('RESULTADO_INVALIDO', 'veredicto categórico con missingElements');
  const salida = FiracSkillSchema.safeParse(skill);
  if (!salida.success) throw new FiracEvaluationError('RESULTADO_INVALIDO', `resultado inválido: ${salida.error.issues[0]?.message ?? 'sin detalle'}`);
  return { skill: salida.data, trace, missingElements: salida.data.missingElements };
}
