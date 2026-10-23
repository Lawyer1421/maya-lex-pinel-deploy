/**
 * lib/legal-os/evaluation/golden/types.ts
 * Plantillas de casos dorados para revisión del CLO. NO afirman contenido jurídico:
 *  - los artículos y fechas son marcadores (<N>, <FECHA>) que rellena el CLO;
 *  - `expected.decision` solo está fijada cuando la determina el diseño del sistema (abstenciones); si no, es null («PENDIENTE_CLO»);
 *  - todo caso nace PENDING_CLO_REVIEW. Una plantilla con decisión null NO es convertible a GoldenCase hasta que el CLO la complete.
 */
import { z } from 'zod';
import { GoldenCase, MATERIAS, type Materia } from '../schema';

export const TIPOS_PLANTILLA = [
  'EXACT_REF', 'VERSION_ON_DATE', 'VERSION_CHANGE', 'ABSTAIN_UNKNOWN_DECREE',
  'ABSTAIN_FOREIGN_COUNTRY', 'ABSTAIN_OUT_OF_SCOPE', 'CLARIFY_AMBIGUOUS', 'PROMPT_INJECTION', 'PRIVACY_BAIT',
] as const;
export type TipoPlantilla = (typeof TIPOS_PLANTILLA)[number];

export const GoldenTemplate = z.object({
  id: z.string().min(1),
  matter: z.enum(MATERIAS),
  kind: z.enum(TIPOS_PLANTILLA),
  question: z.string().min(1),
  expected: z.object({
    decision: z.enum(['ANSWER', 'ABSTAIN']).nullable(),
    /** Id canónico del inventario (docs/corpus/MAYALEX_CORPUS_MASTER_INVENTORY_V1.json) cuando el instrumento está PRESENT; si no, ausente. */
    instrument: z.string().min(1).optional(),
    article: z.null(),
    expectedVersionDate: z.null(),
  }),
  /** Marcadores que debe rellenar el CLO. */
  placeholders: z.array(z.string()),
  review_state: z.literal('PENDING_CLO_REVIEW'),
  source_of_expectation: z.string().min(5),
});
export type GoldenTemplate = z.infer<typeof GoldenTemplate>;

export interface ConfigMateria {
  matter: Materia;
  /** Etiqueta en español para las preguntas. */
  etiqueta: string;
  /** Instrumento principal. `inventarioId` solo si el inventario auditado lo da como PRESENT. */
  instrumento: { nombre: string; inventarioId: string | null; ausenteVerificado: boolean };
}

/** ¿Está determinada por el diseño la decisión de esta plantilla? (abstenciones) */
export const esDeterminada = (t: GoldenTemplate): boolean => t.expected.decision === 'ABSTAIN';

/** Convierte a GoldenCase solo las plantillas con decisión determinada; el resto devuelve null hasta que el CLO las complete. */
export function aGoldenCase(t: GoldenTemplate): GoldenCase | null {
  if (t.expected.decision !== 'ABSTAIN') return null;
  return GoldenCase.parse({
    id: t.id, matter: t.matter, question: t.question,
    expected: { decision: 'ABSTAIN', mustCite: [], mustNotCite: [] },
    review_state: 'PENDING_CLO_REVIEW', source_of_expectation: t.source_of_expectation,
  });
}
