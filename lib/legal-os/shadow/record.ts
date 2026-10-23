/**
 * lib/legal-os/shadow/record.ts
 * Registro de evaluación shadow: UNA traza de extremo a extremo por consulta (campos de P3). Responde: ¿por qué respondió?, ¿por qué se abstuvo?,
 * ¿qué evidencia usó?, ¿qué modelo elegiría?, ¿cuánto costaría? Sin PII innecesaria: la pregunta cruda nunca entra (solo huella y longitud).
 */
import { clasificarIntencion } from '../router/intent';
import { planificarRecuperacion } from '../retrieval/plan';
import type { SalidaPipeline } from '../pipeline';
import type { Trace } from '../observability';

export type EstadoShadow = 'SHADOW_ANSWER' | 'SHADOW_ABSTAIN' | 'SHADOW_DEGRADED' | 'SHADOW_ERROR' | 'SHADOW_SKIPPED';
export type Concordancia = 'MATCH' | 'SHADOW_STRICTER' | 'SHADOW_LOOSER';

export interface EntradaRegistro {
  salida: SalidaPipeline;
  pregunta: string;
  decisionProduccion: 'ANSWER' | 'ABSTAIN';
  estadoRetrieval: string | null;
  articuloExacto: { numero: string; instrumento: string | null } | null;
  fuentesExcluidas: number;
  privacidad: string;
  skillId?: string | null;
}

export interface RegistroShadow {
  query_id: string;
  jurisdiction: { country: string; jurisdiction: string };
  matter: string | null;
  skill_id: string | null;
  intent: string;
  risk: string;
  retrieval_plan: string[];
  exact_resolution: { requested: boolean; article: string | null; instrument: string | null; retrieval_state: string | null };
  retrieved_sources: Array<{ chunk_id: string; instrument: string | null; article: string | null; hash: string }>;
  excluded_sources: number;
  source_tier: 'INTERNAL_CORPUS_UNVERIFIED';
  evidence_status: string;
  model_route: string;
  route_reasons: string[];
  model_id: string | null;
  /** Siempre false en este shadow: el proveedor es simulado. */
  model_called: false;
  citations: string[];
  citation_validation: { accepted: number; rejected: number };
  abstention: { abstained: boolean; reason: string | null };
  latency_ms: number;
  estimated_cost_usd: number;
  privacy_decision: string;
  provenance_decision: string;
  production_decision: 'ANSWER' | 'ABSTAIN';
  agreement: Concordancia;
  final_shadow_status: EstadoShadow;
  warnings: string[];
  question: { sha256_16: string; length: number };
}

function concordancia(prod: 'ANSWER' | 'ABSTAIN', shadow: 'ANSWER' | 'ABSTAIN'): Concordancia {
  if (prod === shadow) return 'MATCH';
  return shadow === 'ABSTAIN' ? 'SHADOW_STRICTER' : 'SHADOW_LOOSER';
}

export function construirRegistroShadow(e: EntradaRegistro): RegistroShadow {
  const t: Trace = e.salida.traza;
  const intent = clasificarIntencion(e.pregunta);
  const plan = planificarRecuperacion(intent);
  const router = t.events.find((x): x is Extract<Trace['events'][number], { kind: 'router' }> => x.kind === 'router');
  const citas = t.events.filter((x): x is Extract<Trace['events'][number], { kind: 'citation' }> => x.kind === 'citation');
  const chunks = t.events.filter((x): x is Extract<Trace['events'][number], { kind: 'retrieved_chunk' }> => x.kind === 'retrieved_chunk');
  const estado: EstadoShadow = t.final_status === 'ERROR' ? 'SHADOW_ERROR' : t.final_status === 'DEGRADED' ? 'SHADOW_DEGRADED' : e.salida.decision === 'ANSWER' ? 'SHADOW_ANSWER' : 'SHADOW_ABSTAIN';
  return {
    query_id: t.query_id,
    jurisdiction: t.jurisdiction,
    matter: intent.matter,
    skill_id: e.skillId ?? null,
    intent: intent.task,
    risk: intent.risk,
    retrieval_plan: plan.pasos.filter((p) => p.enabled).map((p) => p.kind),
    exact_resolution: { requested: e.articuloExacto !== null, article: e.articuloExacto?.numero ?? null, instrument: e.articuloExacto?.instrumento ?? null, retrieval_state: e.estadoRetrieval },
    retrieved_sources: chunks.map((c) => ({ chunk_id: c.chunk_id, instrument: c.instrument, article: c.article, hash: c.hash })),
    excluded_sources: e.fuentesExcluidas,
    source_tier: 'INTERNAL_CORPUS_UNVERIFIED',
    evidence_status: e.salida.motivo === 'SIN_EVIDENCIA' || chunks.length === 0 ? 'NO_EVIDENCE' : e.salida.advertencias.length > 0 ? 'EVIDENCE_VALIDITY_UNVERIFIED' : 'EVIDENCE_PRESENT',
    model_route: router?.role ?? 'NOT_ROUTED',
    route_reasons: router?.reasons ?? [],
    model_id: e.salida.rol === 'NONE' ? null : (t.model ?? null),
    model_called: false,
    citations: citas.filter((c) => c.support !== 'REJECTED').map((c) => c.chunk_id),
    citation_validation: { accepted: citas.filter((c) => c.support !== 'REJECTED').length, rejected: citas.filter((c) => c.support === 'REJECTED').length },
    abstention: { abstained: e.salida.decision === 'ABSTAIN', reason: e.salida.motivo },
    latency_ms: t.latency_ms,
    estimated_cost_usd: e.salida.costoUsd,
    privacy_decision: e.privacidad,
    provenance_decision: 'NOT_EVALUATED_SIMULATED_NO_EXTERNAL_CALL',
    production_decision: e.decisionProduccion,
    agreement: concordancia(e.decisionProduccion, e.salida.decision),
    final_shadow_status: estado,
    warnings: e.salida.advertencias,
    question: t.question,
  };
}
