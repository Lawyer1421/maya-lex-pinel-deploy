/**
 * lib/legal-os/corpus-factory/schema.ts
 * Registro de instrumento del Corpus Factory. Todo dato desconocido es explícito ('UNKNOWN' o null): nunca se inventa.
 */
import { z } from 'zod';

export const MATERIAS_LAUNCH_CORE = [
  'CONSTITUTIONAL', 'CIVIL', 'CIVIL_PROCEDURE', 'CRIMINAL', 'CRIMINAL_PROCEDURE', 'COMMERCIAL', 'LABOR', 'FAMILY', 'NOTARIAL',
  'ADMINISTRATIVE', 'TAX', 'PROPERTY', 'AML', 'BANKING', 'CUSTOMS',
] as const;
export type MateriaLaunch = (typeof MATERIAS_LAUNCH_CORE)[number];

/** `OTHER` = materia conocida fuera del launch-core; `UNKNOWN` = materia sin determinar. */
export const MateriaSchema = z.enum([...MATERIAS_LAUNCH_CORE, 'OTHER', 'UNKNOWN']);

/** 1 La Gaceta · 2 Poder Judicial/CEDIJ · 3 Congreso Nacional · 4 Tribunal Superior de Cuentas · 5 regulador/institución oficial. */
export const SourceTierSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);

export const ETAPAS_INGESTA = [
  'DISCOVER', 'DOWNLOAD', 'HASH', 'DUPLICATE_CHECK', 'EXTRACT', 'NORMALIZE', 'SEGMENT', 'ARTICLE_DETECTION', 'METADATA',
  'REFORM_LINKING', 'VALIDITY_CANDIDATE', 'QA', 'HUMAN_VERIFICATION', 'V4', 'V5', 'INDEX', 'VECTORIZE', 'GOLDEN_TEST', 'AVAILABLE',
] as const;
export type EtapaIngesta = (typeof ETAPAS_INGESTA)[number];

export const VerificationStateSchema = z.enum(['UNVERIFIED', 'PENDING_VERIFICATION', 'V4', 'V5', 'REJECTED']);
export type VerificationState = z.infer<typeof VerificationStateSchema>;

const desconocidoStr = z.union([z.string().min(1), z.literal('UNKNOWN')]);
const fechaIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const sha256 = z.string().regex(/^[0-9a-f]{64}$/);

export const ApprovalSchema = z.object({
  /** Persona que aprueba. Nunca un agente. */
  approver: z.string().trim().min(1),
  date: fechaIso,
  stage: z.enum(['V4', 'V5', 'AVAILABLE']),
});
export type Approval = z.infer<typeof ApprovalSchema>;

export const InstrumentRecordSchema = z.object({
  /** Identificador canónico estable del instrumento (p. ej. HN_CODIGO_NOTARIADO_D353_2005). */
  id: z.string().min(1),
  country: z.enum(['HN', 'GT', 'SV', 'NI', 'CR', 'PA', 'BZ']),
  jurisdiction: z.enum(['NACIONAL', 'DEPARTAMENTAL', 'MUNICIPAL']),
  matter: MateriaSchema,
  title: z.string().min(1),
  decree: desconocidoStr,
  publication: desconocidoStr,
  gaceta_number: desconocidoStr,
  gaceta_date: z.union([fechaIso, z.literal('UNKNOWN')]),
  effective_date: z.union([fechaIso, z.literal('UNKNOWN')]),
  official_url: z.union([z.string().url(), z.null()]),
  pdf_sha256: sha256.nullable(),
  text_sha256: sha256.nullable(),
  source: desconocidoStr,
  source_tier: SourceTierSchema.nullable(),
  articles: z.array(z.string()),
  reforms: z.array(z.string()),
  derogations: z.array(z.string()),
  interpretations: z.array(z.string()),
  constitutional_effects: z.array(z.string()),
  /** Versión del texto, ≥ 1. Un text_sha256 nuevo del mismo id crea otra versión; nunca se sobrescribe. */
  version: z.number().int().min(1),
  verification_state: VerificationStateSchema,
  ingestion_state: z.enum(ETAPAS_INGESTA),
  /** Presencia física en el corpus: PRESENT observada, ABSENT_VERIFIED ausencia comprobada, UNKNOWN sin inventario. */
  presence: z.enum(['PRESENT', 'ABSENT_VERIFIED', 'UNKNOWN']),
  /** Texto reemplazado por una versión posterior o con reformas sin incorporar. */
  outdated: z.boolean(),
  /** Mediciones del inventario (nulas si no se midieron). */
  measures: z.object({ rows: z.number().int().nonnegative().nullable(), distinct_articles: z.number().int().nonnegative().nullable() }),
  approvals: z.array(ApprovalSchema),
  notes: z.array(z.string()),
});
export type InstrumentRecord = z.infer<typeof InstrumentRecordSchema>;

/** Registro «en blanco»: todo UNKNOWN/null, listo para completarse con datos comprobados. */
export function registroVacio(base: Pick<InstrumentRecord, 'id' | 'title'> & Partial<InstrumentRecord>): InstrumentRecord {
  return InstrumentRecordSchema.parse({
    country: 'HN', jurisdiction: 'NACIONAL', matter: 'UNKNOWN', decree: 'UNKNOWN', publication: 'UNKNOWN', gaceta_number: 'UNKNOWN',
    gaceta_date: 'UNKNOWN', effective_date: 'UNKNOWN', official_url: null, pdf_sha256: null, text_sha256: null, source: 'UNKNOWN',
    source_tier: null, articles: [], reforms: [], derogations: [], interpretations: [], constitutional_effects: [], version: 1,
    verification_state: 'UNVERIFIED', ingestion_state: 'DISCOVER', presence: 'UNKNOWN', outdated: false,
    measures: { rows: null, distinct_articles: null }, approvals: [], notes: [], ...base,
  });
}
