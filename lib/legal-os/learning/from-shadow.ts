/**
 * lib/legal-os/learning/from-shadow.ts
 * Cablea las señales del bucle de aprendizaje CONTROLADO a partir del registro del shadow. Solo OBSERVA y PROPONE:
 * OBSERVE → PROPOSE → EVAL → REVIEW → PROMOTE. Nada aquí cambia prompts, corpus, validez jurídica, skills ni política de recuperación.
 */
import { MATERIAS } from '../evaluation/schema';
import { Signal, UMBRAL_COSTO_USD, UMBRAL_LATENCIA_MS, clasificarSenal, proponerCasoEval, type ClasificacionSenal, type PropuestaCasoEval } from './signals';

/** Forma mínima del registro del shadow (estructural: este módulo no importa el shadow). */
export interface RegistroObservable {
  query_id: string;
  jurisdiction: { country: string };
  matter: string | null;
  evidence_status: string;
  abstention: { abstained: boolean; reason: string | null };
  citation_validation: { rejected: number };
  latency_ms: number;
  estimated_cost_usd: number;
  question: { sha256_16: string };
  production_decision: 'ANSWER' | 'ABSTAIN';
}

const MATERIA_POR_ETIQUETA: Readonly<Record<string, (typeof MATERIAS)[number]>> = {
  constitucional: 'Constitutional', civil: 'Civil', penal: 'Criminal', laboral: 'Labor', familia: 'Family', notarial: 'Notarial', comercial: 'Commercial',
  tributario: 'Tax', administrativo: 'Administrative', aduanero: 'Customs', aml: 'AML', bancario: 'Banking', propiedad: 'Property',
};

const codigo = (s: string | null, defecto: string): string => {
  const c = (s ?? defecto).toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 48);
  return c.length >= 2 ? c : defecto;
};

/** Convierte el registro de UNA consulta en señales cerradas y redactadas (huella, códigos y números; nunca texto libre). */
export function senalesDesdeRegistro(r: RegistroObservable, at: string): Signal[] {
  const base = { at, queryHash: r.question.sha256_16, country: r.jurisdiction.country, matter: (r.matter ? MATERIA_POR_ETIQUETA[r.matter] : undefined) ?? null, feedback: null };
  const out: Signal[] = [];
  const add = (kind: Signal['kind'], suf: string, reasonCode: string | null, metrics: Signal['metrics'] = {}) =>
    out.push(Signal.parse({ ...base, id: `${r.query_id}:${suf}`, kind, reasonCode, metrics }));

  const motivo = r.abstention.reason;
  if (r.abstention.abstained) {
    add('ABSTENTION', 'ABSTENTION', codigo(motivo, 'ABSTENTION'));
    if (motivo === 'SIN_EVIDENCIA') add('FAILED_RETRIEVAL', 'RETRIEVAL_MISS', 'NO_VERIFIED_EVIDENCE');
    if (motivo === 'INSTRUMENTO_SIN_EVIDENCIA') add('CORPUS_GAP', 'MISSING_INSTRUMENT', 'MISSING_INSTRUMENT');
  }
  if (r.citation_validation.rejected > 0) add('CITATION_FAILURE', 'INVALID_CITATION', 'INVALID_CITATION', { occurrences: r.citation_validation.rejected });
  if (r.evidence_status === 'EVIDENCE_VALIDITY_UNVERIFIED') add('LOW_CONFIDENCE', 'LOW_EVIDENCE', 'VALIDITY_UNVERIFIED', { confidence: 0.4 });
  if (r.latency_ms > UMBRAL_LATENCIA_MS) add('LATENCY', 'HIGH_LATENCY', 'HIGH_LATENCY', { latencyMs: r.latency_ms });
  if (r.estimated_cost_usd > UMBRAL_COSTO_USD) add('COST', 'HIGH_COST', 'HIGH_COST', { costUsd: r.estimated_cost_usd });
  return out;
}

/** Señal de retroalimentación negativa/positiva del usuario (solo huella de consulta y calificación). */
export function senalDeFeedback(p: { queryId: string; queryHash: string; country: string; rating: 'UP' | 'DOWN'; at: string }): Signal {
  return Signal.parse({ id: `${p.queryId}:USER_FEEDBACK`, kind: 'USER_FEEDBACK', at: p.at, queryHash: p.queryHash, country: p.country, matter: null, reasonCode: p.rating === 'DOWN' ? 'USER_NEGATIVE_FEEDBACK' : 'USER_POSITIVE_FEEDBACK', feedback: p.rating, metrics: {} });
}

export interface CandidatoMejora {
  senal: Signal;
  clasificacion: ClasificacionSenal;
  /** Propuesta de caso de evaluación: sin pregunta ni respuesta esperada; la revisa el CLO. */
  propuesta: PropuestaCasoEval;
  /** Siempre OBSERVE→PROPOSE: promover exige pruebas y aprobación de una persona o de CI. */
  etapa: 'PROPOSE';
}

/** Genera candidatos de mejora SIN aplicar nada. Ordena por prioridad (P0 primero) y de forma estable. */
export function generarCandidatos(senales: readonly Signal[]): CandidatoMejora[] {
  const orden = { P0: 0, P1: 1, P2: 2 } as const;
  return senales
    .map((s) => ({ senal: s, clasificacion: clasificarSenal(s), propuesta: proponerCasoEval(s), etapa: 'PROPOSE' as const }))
    .sort((a, b) => orden[a.clasificacion.priority] - orden[b.clasificacion.priority] || a.senal.id.localeCompare(b.senal.id));
}
