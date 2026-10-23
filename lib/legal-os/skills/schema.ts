/**
 * lib/legal-os/skills/schema.ts
 * Especificación de Legal Skill. Una skill es DATOS (no código jurídico): describe cómo buscar, qué evidencia exige y cuándo abstenerse.
 * No contiene artículos ni reglas jurídicas: la validez la fija el corpus + el motor de versiones.
 */
import { z } from 'zod';

/** CC.MATERIA[.SUBMATERIA[.TAREA]] — p. ej. HN.CIVIL.CONTRACTS.SALE, HN.FAMILY.DIVORCE o HN.PROCEDURAL_PENAL (materia compuesta). */
export const SKILL_ID_RE = /^[A-Z]{2}(\.[A-Z][A-Z0-9_]*){1,3}$/;

export const SkillStatus = z.enum(['DRAFT', 'REVIEW', 'ACTIVE', 'DEPRECATED']);
export type SkillStatus = z.infer<typeof SkillStatus>;

export const SkillTask = z.enum(['EXACT_LOOKUP', 'RESEARCH', 'ANALYSIS', 'DRAFTING', 'DOCUMENT_REVIEW']);

const AbstentionPolicy = z.object({
  mode: z.enum(['ABSTAIN_ON_NO_EVIDENCE', 'QUALIFY_ON_PARTIAL_EVIDENCE']),
  /** Nota de referencia; el texto final lo fija el sistema, no el modelo. */
  notes: z.string().min(1),
});

const CitationPolicy = z.object({
  required: z.literal(true),
  /** Toda proposición material se respalda con un chunk de evidencia. */
  perClaim: z.literal(true),
  allowedSourceRoles: z.array(z.enum(['PRIMARY', 'CONTEXT'])).min(1),
});

/**
 * Requisitos de evidencia EJECUTABLES por el pipeline. `required_instruments` son ids de InstrumentoNormalizado (exact-resolver) que deben
 * estar en la evidencia recuperada (todos); vacío = no se exige un instrumento concreto (instrumento aún sin id normalizado).
 */
export const EvidenceRequirementsSchema = z
  .object({
    required_instruments: z.array(z.string().regex(/^[A-Z_]+$/)),
    /** Mínimo de fragmentos distintos de los instrumentos exigidos (o de cualquier instrumento si la lista está vacía). */
    min_primary_sources: z.number().int().min(1),
    /** La jurisprudencia nunca sustituye a la norma: como máximo apoya. */
    jurisprudence: z.enum(['SUPPORTING_ONLY', 'NOT_USED']),
  })
  .strict();
export type EvidenceRequirements = z.infer<typeof EvidenceRequirementsSchema>;

export const LegalSkillSchema = z
  .object({
    skill_id: z.string().regex(SKILL_ID_RE, 'skill_id debe ser CC.MATERIA.SUBMATERIA[.TAREA] en mayúsculas'),
    country: z.enum(['HN', 'GT', 'SV', 'NI', 'CR', 'PA', 'BZ']),
    jurisdiction: z.enum(['NACIONAL', 'DEPARTAMENTAL', 'MUNICIPAL']),
    matter: z.string().min(1),
    submatter: z.string().min(1),
    task: SkillTask,
    /** Descripciones genéricas de instrumentos (sin decretos ni artículos). */
    required_sources: z.array(z.string().min(1)).min(1),
    preferred_sources: z.array(z.string().min(1)),
    retrieval_strategy: z.array(z.enum(['EXACT', 'STRUCTURED', 'LEXICAL', 'SEMANTIC', 'GRAPH', 'RERANK', 'OFFICIAL_WEB'])).min(1),
    exact_resolver: z.boolean(),
    /** Referencias al motor de versiones; nunca afirmaciones jurídicas. */
    validity_rules: z.array(z.string().min(1)).min(1),
    /** Calidad mínima de evidencia 0–1 para responder. */
    evidence_threshold: z.number().min(0).max(1),
    evidence_requirements: EvidenceRequirementsSchema.optional(),
    citation_policy: CitationPolicy,
    abstention_policy: AbstentionPolicy.nullable(),
    instructions: z.string().min(1),
    tools_allowed: z.array(z.string().min(1)),
    tools_forbidden: z.array(z.string().min(1)),
    model_policy: z.object({ role: z.enum(['NONE', 'FAST', 'DEEP']), reasoningEffort: z.enum(['none', 'low', 'medium', 'high']) }),
    output_schema: z.string().min(1),
    /** Identificador del conjunto de evaluación; null mientras no exista. */
    evaluation_set: z.string().min(1).nullable(),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    owner: z.string().min(1),
    /** Fecha ISO de la última revisión humana; null si nunca fue revisada. */
    last_reviewed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    status: SkillStatus,
  })
  .strict()
  .superRefine((s, ctx) => {
    const partes = s.skill_id.split('.');
    if (partes[0] !== s.country) ctx.addIssue({ code: 'custom', path: ['skill_id'], message: 'el prefijo del skill_id debe ser el país' });
    const solapadas = s.tools_allowed.filter((t) => s.tools_forbidden.includes(t));
    if (solapadas.length) ctx.addIssue({ code: 'custom', path: ['tools_allowed'], message: `herramientas permitidas y prohibidas a la vez: ${solapadas.join(', ')}` });
    if (s.status === 'ACTIVE' && s.last_reviewed === null) ctx.addIssue({ code: 'custom', path: ['last_reviewed'], message: 'una skill ACTIVE exige revisión humana fechada' });
  });

export type LegalSkill = z.infer<typeof LegalSkillSchema>;

/** Ficha mínima para la divulgación progresiva: nunca incluye instrucciones ni fuentes. */
export interface SkillCard {
  skill_id: string;
  country: LegalSkill['country'];
  matter: string;
  submatter: string;
  task: LegalSkill['task'];
  status: SkillStatus;
}
