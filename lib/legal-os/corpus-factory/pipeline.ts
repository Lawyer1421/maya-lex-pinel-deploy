/**
 * lib/legal-os/corpus-factory/pipeline.ts
 * Máquina de estados de ingesta. Reglas duras:
 *  - solo se avanza un paso, nunca se salta ni se retrocede;
 *  - los pasos V4, V5 y AVAILABLE exigen un actor HUMANO y un registro de aprobación (nombre + fecha); un agente o una
 *    automatización jamás los ejecuta, aunque aporte un registro;
 *  - el registro es inmutable: cada transición devuelve un registro nuevo;
 *  - un text_sha256 nuevo del mismo instrumento crea una versión NUEVA (append-only); una fuente de rango inferior no reemplaza a una oficial.
 */
import { ETAPAS_INGESTA, InstrumentRecordSchema, type Approval, type EtapaIngesta, type InstrumentRecord } from './schema';

export type Actor = { kind: 'HUMAN' | 'AGENT' | 'AUTOMATION'; name: string };

export type MotivoRechazo =
  | 'NO_ES_SIGUIENTE_PASO' | 'REQUIERE_ACTOR_HUMANO' | 'REQUIERE_APROBACION' | 'APROBACION_INVALIDA' | 'ESTADO_TERMINAL'
  | 'VERIFICACION_RECHAZADA' | 'DUPLICADO_EXACTO' | 'FUENTE_DE_RANGO_INFERIOR' | 'TEXTO_SIN_HASH' | 'ID_DISTINTO';

export type Resultado<T> = { ok: true; valor: T } | { ok: false; motivo: MotivoRechazo };

const PASOS_HUMANOS: ReadonlySet<EtapaIngesta> = new Set<EtapaIngesta>(['V4', 'V5', 'AVAILABLE']);

export function siguienteEtapa(e: EtapaIngesta): EtapaIngesta | null {
  const i = ETAPAS_INGESTA.indexOf(e);
  return i >= 0 && i < ETAPAS_INGESTA.length - 1 ? ETAPAS_INGESTA[i + 1] : null;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export function avanzar(registro: InstrumentRecord, a: EtapaIngesta, actor: Actor, aprobacion?: Approval): Resultado<InstrumentRecord> {
  if (registro.verification_state === 'REJECTED') return { ok: false, motivo: 'VERIFICACION_RECHAZADA' };
  const sig = siguienteEtapa(registro.ingestion_state);
  if (sig === null) return { ok: false, motivo: 'ESTADO_TERMINAL' };
  if (a !== sig) return { ok: false, motivo: 'NO_ES_SIGUIENTE_PASO' };

  let siguiente: InstrumentRecord = { ...registro, ingestion_state: a };
  if (PASOS_HUMANOS.has(a)) {
    if (actor.kind !== 'HUMAN' || !actor.name.trim()) return { ok: false, motivo: 'REQUIERE_ACTOR_HUMANO' };
    if (!aprobacion) return { ok: false, motivo: 'REQUIERE_APROBACION' };
    if (aprobacion.stage !== a || !aprobacion.approver.trim() || !FECHA.test(aprobacion.date) || Number.isNaN(Date.parse(aprobacion.date))) {
      return { ok: false, motivo: 'APROBACION_INVALIDA' };
    }
    siguiente = { ...siguiente, approvals: [...registro.approvals, aprobacion] };
    if (a === 'V4' || a === 'V5') siguiente = { ...siguiente, verification_state: a };
  } else if (a === 'HUMAN_VERIFICATION') {
    siguiente = { ...siguiente, verification_state: 'PENDING_VERIFICATION' };
  }
  return { ok: true, valor: InstrumentRecordSchema.parse(siguiente) };
}

/** Disponible = completó el pipeline Y tiene verificación humana V4/V5 respaldada por una aprobación de cada etapa humana. */
export function estaDisponible(r: InstrumentRecord): boolean {
  if (r.ingestion_state !== 'AVAILABLE') return false;
  if (r.verification_state !== 'V4' && r.verification_state !== 'V5') return false;
  const etapas = new Set(r.approvals.map((x) => x.stage));
  return etapas.has('V4') && etapas.has('V5') && etapas.has('AVAILABLE');
}

/**
 * Registra una versión nueva en el historial (append-only). Devuelve el historial ampliado; los registros previos no se tocan.
 * Una fuente de rango inferior (número de tier mayor, o sin tier) no puede reemplazar a una oficial ya presente.
 */
export function registrarVersion(historial: readonly InstrumentRecord[], entrante: InstrumentRecord): Resultado<InstrumentRecord[]> {
  if (!entrante.text_sha256) return { ok: false, motivo: 'TEXTO_SIN_HASH' };
  if (historial.length === 0) return { ok: true, valor: [{ ...entrante, version: 1 }] };
  if (historial.some((h) => h.id !== entrante.id)) return { ok: false, motivo: 'ID_DISTINTO' };
  if (historial.some((h) => h.text_sha256 === entrante.text_sha256)) return { ok: false, motivo: 'DUPLICADO_EXACTO' };
  const mejor = Math.min(...historial.map((h) => h.source_tier ?? Number.POSITIVE_INFINITY));
  if (Number.isFinite(mejor) && (entrante.source_tier === null || entrante.source_tier > mejor)) return { ok: false, motivo: 'FUENTE_DE_RANGO_INFERIOR' };
  const version = Math.max(...historial.map((h) => h.version)) + 1;
  return { ok: true, valor: [...historial, { ...entrante, version, ingestion_state: 'DISCOVER', verification_state: 'UNVERIFIED', approvals: [] }] };
}
