/**
 * lib/legal-os/skills/firac-schema.ts
 * Plantilla FIRAC (Facts, Issue, Rule, Application, Conclusion) para skills de revisión documental, con casillas de verificación por requisito
 * normativo (RuleCheckbox). Es DATOS, como `schema.ts`: describe qué debe comprobarse y cuándo NO se puede concluir; no resuelve la validez de
 * una norma (eso lo fija el corpus + el motor de versiones) ni declara vigencia.
 *
 * Armonización con `schema.ts`: reutiliza SKILL_ID_RE, SkillStatus y SkillTask, y los mismos campos de identidad/gobierno
 * (skill_id, country, jurisdiction, matter, submatter, task, version, owner, last_reviewed, status).
 *
 * Invariantes que el esquema hace cumplir:
 *  1. `missingElements` = ids de las casillas obligatorias HOJA aún sin resolver (UNKNOWN); se recalcula y no se acepta uno distinto.
 *     NOT_MET no es «faltante»: es un incumplimiento comprobado y puede sustentar NO_CUMPLE cuando ya no queda nada por resolver.
 *  2. Si hay `missingElements`, el veredicto NO puede ser categórico (CUMPLE / NO_CUMPLE): solo NO_CONCLUYENTE o CONDICIONAL_A_COMPLETAR.
 *  3. Una casilla solo pasa a MET con evidencia; al menos un fragmento PRIMARY (la doctrina o el contexto no sustituyen a la norma).
 *  4. Una casilla con `elements` (elementos constitutivos de un mismo artículo) deriva su estado de ellos, no se cuenta aparte y no exige
 *     evidencia propia: la evidencia PRIMARY se exige a cada elemento (así no hay evidencia redundante en la casilla madre).
 *  5. Una skill ACTIVE exige revisión humana fechada (igual que LegalSkillSchema).
 */
import { z } from 'zod';
import { SKILL_ID_RE, SkillStatus, SkillTask } from './schema';

export const FIRAC_SCHEMA_VERSION = 'firac-skill/0.1' as const;

/** Estado de una casilla. UNKNOWN = aún sin evidencia suficiente para decidir (no equivale a incumplimiento). */
export const RuleCheckboxStatus = z.enum(['UNKNOWN', 'MET', 'NOT_MET', 'NOT_APPLICABLE']);
export type RuleCheckboxStatus = z.infer<typeof RuleCheckboxStatus>;

/**
 * Estado de verificación de la base normativa de una casilla:
 *  - PENDIENTE_VERIFICACION: referencia aún no confirmada;
 *  - CONFIRMADO_POR_TITULAR: la confirma el Titular/Director del proyecto, SIN haberla contrastado todavía con el corpus;
 *  - VERIFICADO_CORPUS: contrastada contra un fragmento PRIMARY vigente del corpus (lo fija el pipeline, no un humano a mano).
 */
export const BasisVerification = z.enum(['PENDIENTE_VERIFICACION', 'CONFIRMADO_POR_TITULAR', 'VERIFICADO_CORPUS']);
export type BasisVerification = z.infer<typeof BasisVerification>;

/**
 * Cómo se asignaron los artículos:
 *  - CASILLA: los artículos aplican a esta casilla concreta;
 *  - GRUPO: son los artículos del conjunto de casillas de la skill; el reparto por casilla queda pendiente.
 */
export const BasisAssignment = z.enum(['CASILLA', 'GRUPO']);
export type BasisAssignment = z.infer<typeof BasisAssignment>;

export const RuleBasisSchema = z
  .object({
    /** Nombre del instrumento (sin afirmar vigencia). */
    instrument: z.string().min(1),
    /** Decreto o identificación legislativa del instrumento; null si no consta. */
    decree: z.string().min(1).nullable(),
    /** Artículos citados tal como se indicaron («81», «66-67»); vacío = aún sin indicar. */
    articles: z.array(z.string().min(1)),
    /** «y siguientes» tras el último artículo citado (p. ej. administración: Art. 78 y siguientes). */
    and_following: z.boolean(),
    assignment: BasisAssignment,
    verification: BasisVerification,
  })
  .strict();
export type RuleBasis = z.infer<typeof RuleBasisSchema>;

/** Un fragmento de evidencia del corpus que respalda una casilla. */
export const RuleEvidenceSchema = z
  .object({
    chunk_id: z.string().min(1),
    source_role: z.enum(['PRIMARY', 'CONTEXT']),
    quote: z.string().min(1).optional(),
  })
  .strict();
export type RuleEvidence = z.infer<typeof RuleEvidenceSchema>;

export const CHECKBOX_ID_RE = /^[A-Z]{2,4}(-[A-Z0-9]+)+$/;

/** Parámetros numéricos o de texto de una casilla (mínimos, máximos, porcentajes); null = aún no confirmado. */
export const RuleParameterValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const casillaBase = {
  id: z.string().regex(CHECKBOX_ID_RE, 'id de casilla en mayúsculas, p. ej. CPC-HECHOS'),
  label: z.string().min(1),
  requirement: z.string().min(1),
  mandatory: z.boolean(),
  status: RuleCheckboxStatus,
  evidence: z.array(RuleEvidenceSchema),
  basis: z.array(RuleBasisSchema).min(1),
  parameters: z.record(z.string().min(1), RuleParameterValue).optional(),
};

/** Elemento constitutivo de una casilla (hoja): comparte el artículo de su casilla madre. */
export const RuleElementSchema = z.object(casillaBase).strict();
export type RuleElement = z.infer<typeof RuleElementSchema>;

export const RuleCheckboxSchema = z
  .object({
    ...casillaBase,
    /** Elementos constitutivos del mismo artículo (p. ej. los de la demanda en el art. 424). Si existen, el estado de la casilla se deriva de ellos. */
    elements: z.array(RuleElementSchema).min(1).optional(),
  })
  .strict();
export type RuleCheckbox = z.infer<typeof RuleCheckboxSchema>;

/** Veredictos que cierran la revisión de forma categórica. Prohibidos mientras existan `missingElements`. */
export const VEREDICTOS_CATEGORICOS = ['CUMPLE', 'NO_CUMPLE'] as const;
/** Veredictos permitidos cuando faltan elementos. */
export const VEREDICTOS_CON_FALTANTES = ['NO_CONCLUYENTE', 'CONDICIONAL_A_COMPLETAR'] as const;

export const FiracVerdict = z.enum(['NO_CONCLUYENTE', 'CONDICIONAL_A_COMPLETAR', 'CUMPLE', 'NO_CUMPLE']);
export type FiracVerdict = z.infer<typeof FiracVerdict>;

export const FiracConclusionSchema = z
  .object({
    verdict: FiracVerdict,
    allowed_verdicts_when_missing: z.array(z.enum(VEREDICTOS_CON_FALTANTES)).min(1),
    forbidden_verdicts_when_missing: z.array(z.enum(VEREDICTOS_CATEGORICOS)).min(1),
    text: z.string().min(1),
  })
  .strict();
export type FiracConclusion = z.infer<typeof FiracConclusionSchema>;

const InstrumentoFiracSchema = z
  .object({
    name: z.string().min(1),
    decree: z.string().min(1).nullable(),
    verification: BasisVerification,
  })
  .strict();

export const FiracSectionSchema = z
  .object({
    /** F — hechos que el usuario debe aportar y los ya aportados. */
    facts: z.object({ required_inputs: z.array(z.string().min(1)).min(1), provided: z.array(z.string().min(1)) }).strict(),
    /** I — la cuestión que se revisa. */
    issue: z.string().min(1),
    /** R — requisitos normativos como casillas. */
    rules: z.array(RuleCheckboxSchema).min(1),
    /** A — cómo se aplica cada casilla a los hechos. */
    application: z.object({ method: z.string().min(1), citation_policy: z.string().min(1) }).strict(),
    /** C — conclusión, condicionada por `missingElements`. */
    conclusion: FiracConclusionSchema,
  })
  .strict();

export const FiracSkillSchema = z
  .object({
    schema: z.literal(FIRAC_SCHEMA_VERSION),
    skill_id: z.string().regex(SKILL_ID_RE, 'skill_id debe ser CC.MATERIA.SUBMATERIA[.TAREA] en mayúsculas'),
    country: z.enum(['HN', 'GT', 'SV', 'NI', 'CR', 'PA', 'BZ']),
    jurisdiction: z.enum(['NACIONAL', 'DEPARTAMENTAL', 'MUNICIPAL']),
    matter: z.string().min(1),
    submatter: z.string().min(1),
    task: SkillTask,
    status: SkillStatus,
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    owner: z.string().min(1),
    last_reviewed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    instrument: InstrumentoFiracSchema,
    firac: FiracSectionSchema,
    /** Ids de las casillas obligatorias hoja aún sin resolver (UNKNOWN). Se valida contra el cálculo. */
    missingElements: z.array(z.string().min(1)),
    verdict_policy: z.object({ rule: z.string().min(1), missingElements_definition: z.string().min(1) }).strict(),
    scope_notes: z.array(z.string().min(1)),
    disclaimers: z.array(z.string().min(1)).min(1),
  })
  .strict()
  .superRefine((s, ctx) => {
    if (s.skill_id.split('.')[0] !== s.country) ctx.addIssue({ code: 'custom', path: ['skill_id'], message: 'el prefijo del skill_id debe ser el país' });
    if (s.status === 'ACTIVE' && s.last_reviewed === null) ctx.addIssue({ code: 'custom', path: ['last_reviewed'], message: 'una skill ACTIVE exige revisión humana fechada' });

    // Ids únicos en toda la skill (casillas y elementos).
    const vistos = new Set<string>();
    for (const [i, r] of s.firac.rules.entries()) {
      for (const id of [r.id, ...(r.elements ?? []).map((e) => e.id)]) {
        if (vistos.has(id)) ctx.addIssue({ code: 'custom', path: ['firac', 'rules', i], message: `id de casilla repetido: ${id}` });
        vistos.add(id);
      }
    }

    // MET exige evidencia con al menos un fragmento PRIMARY (casillas y elementos).
    const revisaEvidencia = (item: { id: string; status: RuleCheckboxStatus; evidence: RuleEvidence[] }, path: (string | number)[]) => {
      if (item.status === 'MET' && !item.evidence.some((e) => e.source_role === 'PRIMARY'))
        ctx.addIssue({ code: 'custom', path, message: `${item.id}: MET exige evidencia PRIMARY` });
    };
    for (const [i, r] of s.firac.rules.entries()) {
      if (!r.elements) revisaEvidencia(r, ['firac', 'rules', i]); // con elementos, el estado de la casilla es derivado y la evidencia vive en ellos
      for (const [j, e] of (r.elements ?? []).entries()) revisaEvidencia(e, ['firac', 'rules', i, 'elements', j]);
    }

    // Invariante 1: missingElements es exactamente el cálculo.
    const esperado = calcularMissingElements(s.firac.rules);
    if (s.missingElements.length !== esperado.length || s.missingElements.some((id, i) => id !== esperado[i]))
      ctx.addIssue({ code: 'custom', path: ['missingElements'], message: `missingElements debe ser [${esperado.join(', ')}]` });

    // Invariante 2: con faltantes, sin veredicto categórico.
    const v = s.firac.conclusion;
    if (esperado.length > 0 && !(VEREDICTOS_CON_FALTANTES as readonly string[]).includes(v.verdict))
      ctx.addIssue({ code: 'custom', path: ['firac', 'conclusion', 'verdict'], message: 'con missingElements no se emite un veredicto categórico' });
    for (const cat of VEREDICTOS_CATEGORICOS)
      if (!v.forbidden_verdicts_when_missing.includes(cat)) ctx.addIssue({ code: 'custom', path: ['firac', 'conclusion', 'forbidden_verdicts_when_missing'], message: `debe prohibir ${cat}` });
    // Sin faltantes, el veredicto categórico debe corresponder a las casillas: NO_CUMPLE exige alguna NOT_MET; CUMPLE exige ninguna NOT_MET.
    const hayNoMet = s.firac.rules.some((r) => estadoDeCasilla(r) === 'NOT_MET');
    if (esperado.length === 0 && v.verdict === 'NO_CUMPLE' && !hayNoMet)
      ctx.addIssue({ code: 'custom', path: ['firac', 'conclusion', 'verdict'], message: 'NO_CUMPLE exige al menos una casilla NOT_MET' });
    if (esperado.length === 0 && v.verdict === 'CUMPLE' && hayNoMet)
      ctx.addIssue({ code: 'custom', path: ['firac', 'conclusion', 'verdict'], message: 'CUMPLE no es compatible con una casilla NOT_MET' });
  });

export type FiracSkill = z.infer<typeof FiracSkillSchema>;

/** Estado efectivo de una casilla: si tiene elementos, se deriva de ellos (NOT_MET > UNKNOWN > MET; N/A se ignora). */
export function estadoDeCasilla(r: RuleCheckbox): RuleCheckboxStatus {
  if (!r.elements) return r.status;
  const activos = r.elements.filter((e) => e.mandatory && e.status !== 'NOT_APPLICABLE');
  if (activos.some((e) => e.status === 'NOT_MET')) return 'NOT_MET';
  if (activos.some((e) => e.status === 'UNKNOWN')) return 'UNKNOWN';
  return activos.length === 0 ? 'NOT_APPLICABLE' : 'MET';
}

/** Ids de las casillas obligatorias hoja (casillas sin elementos y elementos) aún UNKNOWN, en orden de aparición. NOT_MET no cuenta como faltante. */
export function calcularMissingElements(rules: readonly RuleCheckbox[]): string[] {
  const faltan: string[] = [];
  for (const r of rules) {
    const hojas = r.elements ?? [r];
    for (const h of hojas) if (h.mandatory && h.status === 'UNKNOWN') faltan.push(h.id);
  }
  return faltan;
}

/** ¿Es admisible este veredicto dado el conjunto de casillas? */
export function veredictoPermitido(rules: readonly RuleCheckbox[], verdict: FiracVerdict): boolean {
  return calcularMissingElements(rules).length === 0 || (VEREDICTOS_CON_FALTANTES as readonly string[]).includes(verdict);
}
