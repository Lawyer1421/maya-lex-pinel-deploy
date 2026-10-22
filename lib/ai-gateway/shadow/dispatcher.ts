/**
 * lib/ai-gateway/shadow/dispatcher.ts
 * MAYALEX AI GATEWAY v1 — PR-G2: punto de despacho sombra (fire-and-forget).
 *
 * Contrato con producción:
 *  - `despacharShadow` NUNCA lanza ni devuelve una promesa: la respuesta HTTP
 *    no la espera ni la cambia. El trabajo asíncrono queda desacoplado.
 *  - Con el kill switch apagado no se hace nada (cero trabajo, cero registro).
 *  - Consultas con posibles datos personales se omiten (SKIPPED_PII).
 *  - El resultado sombra queda sólo en el registro en memoria; no sale de aquí.
 *  - El registro guarda estado y motivo, nunca la pregunta ni el dato detectado.
 */
import type { FragmentoRAG, RetrievalExecutionState } from '../../legal-retrieval/types';
import { SHADOW_GATEWAY_ENABLED, SHADOW_REGISTRY_MAX, SHADOW_TIMEOUT_MS } from './config';
import { crearAdaptadorSombra } from './adaptador-sombra';
import { validarSalida } from './citation-validator';
import { crearCircuitBreaker } from './circuit-breaker';
import { detectarPii } from './pii-gate';
import type { EvidenceChunk, ShadowGatewayInput, ShadowStatus } from './types';

export type EstadoDespacho =
  | 'SKIPPED_DISABLED'
  | 'SKIPPED_PII'
  | 'SKIPPED_NO_OUTCOME'
  | 'SKIPPED_CIRCUIT_OPEN'
  | 'DISPATCHED'
  | 'COMPLETED'
  | 'ERROR'
  | 'TIMEOUT';

export interface RegistroDespacho {
  queryId: string;
  estado: EstadoDespacho;
  /** Categoría de PII (SKIPPED_PII), estado del resultado sombra (COMPLETED) o tipo de error. */
  motivo: string | null;
  /** Solo en COMPLETED: tokens, costo estimado y latencia del resultado sombra (nunca texto). */
  uso?: { inputTokens: number; outputTokens: number; totalTokens: number; estimatedCostUsd: number; latenciaMs: number };
  /** Solo en COMPLETED: el estado sombra difiere de la decisión de producción (INVALID cuenta como desacuerdo). */
  desacuerdo?: boolean;
}

export interface ParametrosDespacho {
  queryId: string;
  pregunta: string;
  fragmentos: readonly FragmentoRAG[];
  decision: 'ANSWER' | 'ABSTAIN';
  retrievalState: RetrievalExecutionState | undefined;
}

const registro: RegistroDespacho[] = [];
const breaker = crearCircuitBreaker();
const pendientes = new Set<Promise<void>>();

function anotar(r: RegistroDespacho): void {
  registro.push(r);
  if (registro.length > SHADOW_REGISTRY_MAX) registro.shift();
}

/** Sólo para pruebas y diagnóstico: copia del registro. */
export function registroDespachos(): readonly RegistroDespacho[] {
  return registro.slice();
}

/** Sólo para pruebas: espera a que terminen los despachos en vuelo y vacía el registro si se pide. */
export async function esperarDespachos(vaciar = false): Promise<void> {
  await Promise.allSettled([...pendientes]);
  if (vaciar) registro.length = 0;
}

function aEvidencia(fragmentos: readonly FragmentoRAG[]): EvidenceChunk[] {
  return fragmentos.map((f, i) => ({
    chunk_id: f.id ?? f.hash ?? `frag-${i}`,
    instrumento: f.fuente,
    articulo: f.num_articulo || null,
    gaceta: null,
    // Producción no marca PRIMARY en este punto; no se promueve nada aquí.
    rol: 'CONTEXT' as const,
    texto: f.contenido,
  }));
}

/**
 * Corre `fn` con una señal que se aborta al vencer `ms`. Rechaza con Error('TIMEOUT') aunque el adaptador
 * ignore la señal, y siempre limpia el temporizador. La promesa de `fn` queda atendida: no genera rechazos
 * sin manejar si falla después del timeout.
 */
function conTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const ctrl = new AbortController();
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const vencido = new Promise<never>((_, reject) => {
    temporizador = setTimeout(() => {
      // Primero se rechaza con TIMEOUT y después se aborta: un cliente que rechaza al abortar no debe
      // ganar la carrera y hacer pasar el timeout por un error de otro tipo.
      reject(new Error('TIMEOUT'));
      ctrl.abort();
    }, ms);
    if (typeof temporizador === 'object' && 'unref' in temporizador) temporizador.unref();
  });
  const trabajo = fn(ctrl.signal);
  trabajo.catch(() => {});
  return Promise.race([trabajo, vencido]).finally(() => {
    if (temporizador !== undefined) clearTimeout(temporizador);
  });
}

export function despacharShadow(params: ParametrosDespacho): void {
  try {
    if (SHADOW_GATEWAY_ENABLED !== true) return;
    const { queryId } = params;
    const pii = detectarPii(params.pregunta);
    if (pii) {
      anotar({ queryId, estado: 'SKIPPED_PII', motivo: pii });
      return;
    }
    if (!params.retrievalState) {
      anotar({ queryId, estado: 'SKIPPED_NO_OUTCOME', motivo: null });
      return;
    }
    const input: ShadowGatewayInput = {
      queryId,
      sanitizedQuestion: params.pregunta,
      evidence: aEvidencia(params.fragmentos ?? []),
      productionOutcome: { decision: params.decision, retrievalState: params.retrievalState },
    };
    if (!breaker.permitir()) {
      anotar({ queryId, estado: 'SKIPPED_CIRCUIT_OPEN', motivo: null });
      return;
    }
    anotar({ queryId, estado: 'DISPATCHED', motivo: null });
    const trabajo = (async () => {
      const adapter = crearAdaptadorSombra();
      const cruda = await conTimeout((signal) => adapter.responder(input, { signal }), SHADOW_TIMEOUT_MS);
      breaker.exito();
      const resultado = validarSalida(input, cruda);
      const estado: ShadowStatus = resultado.status;
      const u = resultado.usage;
      anotar({
        queryId,
        estado: 'COMPLETED',
        motivo: estado,
        uso: { inputTokens: u.inputTokens, outputTokens: u.outputTokens, totalTokens: u.inputTokens + u.outputTokens, estimatedCostUsd: u.estimatedCostUsd, latenciaMs: resultado.latencyMs },
        desacuerdo: estado !== params.decision,
      });
    })()
      .catch((e: unknown) => {
        breaker.fallo();
        const esTimeout = e instanceof Error && e.message === 'TIMEOUT';
        anotar({ queryId, estado: esTimeout ? 'TIMEOUT' : 'ERROR', motivo: esTimeout ? null : (e instanceof Error ? e.name : 'desconocido') });
      })
      .finally(() => { pendientes.delete(trabajo); });
    pendientes.add(trabajo);
  } catch {
    // Un fallo del despacho sombra jamás debe llegar a la respuesta de producción.
  }
}
