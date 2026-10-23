/**
 * lib/legal-os/evaluation/schema.ts
 * Esquema de casos dorados y de resultados de ejecución. Offline y puro.
 * Un caso solo cuenta como «correcto jurídicamente» si su expectativa fue aprobada por el CLO (review_state = CLO_APPROVED).
 */
import { z } from 'zod';

export const MATERIAS = [
  'Constitutional', 'Civil', 'CivilProcedure', 'Criminal', 'CriminalProcedure', 'Commercial', 'Labor', 'Family',
  'Notarial', 'Administrative', 'Tax', 'Customs', 'AML', 'Banking', 'Property',
] as const;
export type Materia = (typeof MATERIAS)[number];

/** Instrumento + artículo, tal como los fija la expectativa (p. ej. CPP + 173-B). */
export const ReferenciaArticulo = z.object({ instrumento: z.string().min(1), articulo: z.string().min(1) });
export type ReferenciaArticulo = z.infer<typeof ReferenciaArticulo>;

export const GoldenCase = z.object({
  id: z.string().min(1),
  matter: z.enum(MATERIAS),
  question: z.string().min(1),
  expected: z.object({
    decision: z.enum(['ANSWER', 'ABSTAIN']),
    instrument: z.string().min(1).optional(),
    article: z.string().min(1).optional(),
    mustCite: z.array(ReferenciaArticulo).default([]),
    mustNotCite: z.array(ReferenciaArticulo.pick({ instrumento: true })).default([]),
    expectedVersionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
  review_state: z.enum(['PENDING_CLO_REVIEW', 'CLO_APPROVED']),
  /**
   * Suite declarada. DESIGN_FIXED: la decisión la determina el diseño del sistema (no afirma derecho).
   * LEGAL_CLO_APPROVED: expectativa jurídica aprobada por el CLO. Ausente = se deriva de review_state (aprobado → LEGAL, si no → pendiente).
   */
  suite: z.enum(['DESIGN_FIXED', 'LEGAL_CLO_APPROVED']).optional(),
  /** De dónde sale la expectativa (archivo + id de caso, dictamen). Obligatorio: sin fuente no hay caso. */
  source_of_expectation: z.string().min(5),
}).refine((c) => c.suite !== 'LEGAL_CLO_APPROVED' || c.review_state === 'CLO_APPROVED', { message: 'suite LEGAL_CLO_APPROVED exige review_state CLO_APPROVED', path: ['suite'] })
  .refine((c) => c.suite !== 'DESIGN_FIXED' || c.review_state !== 'CLO_APPROVED', { message: 'un caso aprobado por el CLO no es DESIGN_FIXED', path: ['suite'] });
export type GoldenCase = z.infer<typeof GoldenCase>;

export const RetrievedItem = z.object({ id: z.string(), instrumento: z.string().nullable().optional(), articulo: z.string().nullable().optional() });
export type RetrievedItem = z.infer<typeof RetrievedItem>;

export const RunResult = z.object({
  caseId: z.string(),
  decision: z.enum(['ANSWER', 'ABSTAIN']),
  /** Citas de la respuesta final. */
  citations: z.array(z.object({ chunkId: z.string(), instrumento: z.string().nullable().optional(), articulo: z.string().nullable().optional() })).default([]),
  /** Afirmaciones con los ids de evidencia que citan. */
  claims: z.array(z.object({ claimId: z.string(), citedIds: z.array(z.string()) })).default([]),
  retrieved: z.array(RetrievedItem).default([]),
  /** Ids de la evidencia que realmente se entregó al modelo. */
  evidenceIds: z.array(z.string()).default([]),
  versionDate: z.string().nullable().optional(),
  latencyMs: z.number().nonnegative(),
  costUsd: z.number().nonnegative(),
  feedback: z.enum(['UP', 'DOWN']).nullable().optional(),
});
export type RunResult = z.infer<typeof RunResult>;
