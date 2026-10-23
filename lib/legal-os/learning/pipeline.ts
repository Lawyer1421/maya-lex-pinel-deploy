/**
 * lib/legal-os/learning/pipeline.ts
 * Estados: OBSERVE → LOG → CLASSIFY → CREATE_EVAL_CASE → PROPOSE_IMPROVEMENT → TEST → APPROVAL → DEPLOY.
 * Solo avanza un paso. TEST exige un resultado de pruebas aprobado; APPROVAL y DEPLOY exigen un actor HUMAN o CI con nombre y fecha:
 * una automatización (o el modelo) jamás aprueba ni despliega. Este módulo solo registra el estado: NO existe aquí ninguna función
 * que modifique corpus, prompts, skills, configuración de recuperación o código.
 */
export const ESTADOS_APRENDIZAJE = ['OBSERVE', 'LOG', 'CLASSIFY', 'CREATE_EVAL_CASE', 'PROPOSE_IMPROVEMENT', 'TEST', 'APPROVAL', 'DEPLOY'] as const;
export type EstadoAprendizaje = (typeof ESTADOS_APRENDIZAJE)[number];

export interface Actor {
  kind: 'HUMAN' | 'CI' | 'AUTOMATION' | 'MODEL';
  name: string;
}
export interface RegistroAprobacion {
  approver: string;
  kind: 'HUMAN' | 'CI';
  /** AAAA-MM-DD */
  date: string;
}
export interface ResultadoPruebas {
  suite: string;
  passed: boolean;
}

export interface ItemAprendizaje {
  id: string;
  state: EstadoAprendizaje;
  signalIds: readonly string[];
  proposalId: string | null;
  testResult: ResultadoPruebas | null;
  approval: RegistroAprobacion | null;
  history: readonly { state: EstadoAprendizaje; actor: Actor; at: string }[];
}

export type ResultadoAvance = { ok: true; item: ItemAprendizaje } | { ok: false; error: string };

export interface EvidenciaAvance {
  proposalId?: string;
  testResult?: ResultadoPruebas;
  approvalDate?: string;
  at?: string;
}

export function nuevoItem(id: string, signalIds: readonly string[], actor: Actor, at: string): ItemAprendizaje {
  return Object.freeze({ id, state: 'OBSERVE' as const, signalIds: Object.freeze([...signalIds]), proposalId: null, testResult: null, approval: null, history: Object.freeze([{ state: 'OBSERVE' as const, actor, at }]) });
}

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function avanzar(item: ItemAprendizaje, destino: EstadoAprendizaje, actor: Actor, evidencia: EvidenciaAvance = {}): ResultadoAvance {
  const i = ESTADOS_APRENDIZAJE.indexOf(item.state);
  if (ESTADOS_APRENDIZAJE.indexOf(destino) !== i + 1) return { ok: false, error: `transición inválida ${item.state} → ${destino}` };
  if (!actor.name.trim()) return { ok: false, error: 'actor sin nombre' };

  let proposalId = item.proposalId;
  let testResult = item.testResult;
  let approval = item.approval;

  if (destino === 'CREATE_EVAL_CASE') {
    if (!evidencia.proposalId) return { ok: false, error: 'CREATE_EVAL_CASE exige el id de la propuesta' };
    proposalId = evidencia.proposalId;
  }
  if (destino === 'TEST') {
    if (!evidencia.testResult?.passed) return { ok: false, error: 'TEST exige un resultado de pruebas aprobado' };
    testResult = evidencia.testResult;
  }
  if (destino === 'APPROVAL') {
    if (actor.kind !== 'HUMAN' && actor.kind !== 'CI') return { ok: false, error: 'APPROVAL solo puede realizarla un humano o CI' };
    if (!item.testResult?.passed) return { ok: false, error: 'APPROVAL exige pruebas aprobadas' };
    if (!evidencia.approvalDate || !ES_FECHA.test(evidencia.approvalDate)) return { ok: false, error: 'APPROVAL exige fecha de aprobación AAAA-MM-DD' };
    approval = { approver: actor.name, kind: actor.kind, date: evidencia.approvalDate };
  }
  if (destino === 'DEPLOY') {
    if (actor.kind !== 'HUMAN' && actor.kind !== 'CI') return { ok: false, error: 'DEPLOY solo puede realizarlo un humano o CI' };
    if (!item.approval) return { ok: false, error: 'DEPLOY exige una aprobación registrada' };
  }

  return {
    ok: true,
    item: Object.freeze({
      ...item,
      state: destino,
      proposalId,
      testResult,
      approval,
      history: Object.freeze([...item.history, { state: destino, actor, at: evidencia.at ?? evidencia.approvalDate ?? '' }]),
    }),
  };
}
