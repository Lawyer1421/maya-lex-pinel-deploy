/**
 * lib/legal-os/learning/signals.ts
 * Señales del bucle de aprendizaje CONTROLADO. Solo datos redactados: huella de la consulta (nunca su texto), códigos cerrados y métricas numéricas.
 * Nada aquí cambia corpus, prompts, skills, recuperación ni código: observar y proponer, jamás aplicar.
 */
import { z } from 'zod';
import { MATERIAS } from '../evaluation/schema';

export const SIGNAL_KINDS = [
  'USER_FEEDBACK', 'ABSTENTION', 'FAILED_RETRIEVAL', 'MISSING_CITATION', 'LOW_CONFIDENCE', 'FREQUENT_QUERY', 'CORPUS_GAP', 'LATENCY', 'COST', 'CITATION_FAILURE',
] as const;
export type SignalKind = (typeof SIGNAL_KINDS)[number];

/** Huella (hex) de la consulta ya anonimizada. Un texto libre no puede entrar en este campo. */
const huella = z.string().regex(/^[0-9a-f]{16,64}$/, 'queryHash debe ser una huella hexadecimal, no texto');

export const Signal = z
  .object({
    id: z.string().min(1),
    kind: z.enum(SIGNAL_KINDS),
    /** ISO 8601. */
    at: z.string().datetime(),
    queryHash: huella,
    country: z.string().length(2),
    matter: z.enum(MATERIAS).nullable().default(null),
    /** Código cerrado del motivo (p. ej. NO_VERIFIED_EVIDENCE), nunca texto libre. */
    reasonCode: z.string().regex(/^[A-Z0-9_]{2,48}$/).nullable().default(null),
    feedback: z.enum(['UP', 'DOWN']).nullable().default(null),
    metrics: z
      .object({
        latencyMs: z.number().nonnegative().optional(),
        costUsd: z.number().nonnegative().optional(),
        confidence: z.number().min(0).max(1).optional(),
        occurrences: z.number().int().positive().optional(),
      })
      .strict()
      .default({}),
  })
  .strict();
export type Signal = z.infer<typeof Signal>;

export type CategoriaSenal = 'RETRIEVAL' | 'CORPUS' | 'CITATION' | 'QUALITY' | 'PERFORMANCE' | 'COST' | 'DEMAND';
export type AccionSugerida = 'ADD_EVAL_CASE' | 'REVIEW_CORPUS_GAP' | 'REVIEW_RETRIEVAL' | 'REVIEW_CITATIONS' | 'REVIEW_PERFORMANCE';

export interface ClasificacionSenal {
  category: CategoriaSenal;
  priority: 'P0' | 'P1' | 'P2';
  suggestedAction: AccionSugerida;
}

export const UMBRAL_LATENCIA_MS = 8_000;
export const UMBRAL_COSTO_USD = 0.02;
export const UMBRAL_CONFIANZA = 0.5;
export const UMBRAL_FRECUENCIA = 10;

/** Clasificación determinista. Una señal malformada lanza (la ingesta de señales es la frontera donde se rechaza). */
export function clasificarSenal(entrada: unknown): ClasificacionSenal {
  const s = Signal.parse(entrada);
  switch (s.kind) {
    case 'CITATION_FAILURE':
      return { category: 'CITATION', priority: 'P0', suggestedAction: 'REVIEW_CITATIONS' };
    case 'MISSING_CITATION':
      return { category: 'CITATION', priority: 'P1', suggestedAction: 'ADD_EVAL_CASE' };
    case 'CORPUS_GAP':
      return { category: 'CORPUS', priority: 'P1', suggestedAction: 'REVIEW_CORPUS_GAP' };
    case 'FAILED_RETRIEVAL':
      return { category: 'RETRIEVAL', priority: 'P1', suggestedAction: 'REVIEW_RETRIEVAL' };
    case 'ABSTENTION':
      return { category: 'RETRIEVAL', priority: s.reasonCode === 'NO_VERIFIED_EVIDENCE' ? 'P1' : 'P2', suggestedAction: s.reasonCode === 'NO_VERIFIED_EVIDENCE' ? 'REVIEW_CORPUS_GAP' : 'ADD_EVAL_CASE' };
    case 'LOW_CONFIDENCE':
      return { category: 'QUALITY', priority: (s.metrics.confidence ?? 1) < UMBRAL_CONFIANZA ? 'P1' : 'P2', suggestedAction: 'ADD_EVAL_CASE' };
    case 'USER_FEEDBACK':
      return { category: 'QUALITY', priority: s.feedback === 'DOWN' ? 'P1' : 'P2', suggestedAction: 'ADD_EVAL_CASE' };
    case 'FREQUENT_QUERY':
      return { category: 'DEMAND', priority: (s.metrics.occurrences ?? 0) >= UMBRAL_FRECUENCIA ? 'P1' : 'P2', suggestedAction: 'ADD_EVAL_CASE' };
    case 'LATENCY':
      return { category: 'PERFORMANCE', priority: (s.metrics.latencyMs ?? 0) > UMBRAL_LATENCIA_MS ? 'P1' : 'P2', suggestedAction: 'REVIEW_PERFORMANCE' };
    case 'COST':
      return { category: 'COST', priority: (s.metrics.costUsd ?? 0) > UMBRAL_COSTO_USD ? 'P1' : 'P2', suggestedAction: 'REVIEW_PERFORMANCE' };
  }
}

/**
 * Propuesta de caso de evaluación. NO contiene la pregunta ni una respuesta esperada: el texto lo captura una persona y la expectativa
 * la fija el CLO. `review_state` es siempre PENDING_CLO_REVIEW.
 */
export interface PropuestaCasoEval {
  id: string;
  matter: (typeof MATERIAS)[number] | null;
  queryHash: string;
  signalIds: string[];
  review_state: 'PENDING_CLO_REVIEW';
  question: null;
  expected: null;
  source_of_expectation: string;
  motivo: AccionSugerida;
}

export function proponerCasoEval(entrada: unknown): PropuestaCasoEval {
  const s = Signal.parse(entrada);
  const c = clasificarSenal(s);
  return {
    id: `PROP-${s.queryHash.slice(0, 12)}-${s.kind}`,
    matter: s.matter,
    queryHash: s.queryHash,
    signalIds: [s.id],
    review_state: 'PENDING_CLO_REVIEW',
    question: null,
    expected: null,
    source_of_expectation: `learning-loop:${s.id}`,
    motivo: c.suggestedAction,
  };
}
