/**
 * lib/ai-gateway/shadow/dispatcher.ts
 * MAYALEX AI GATEWAY v1 — punto de despacho sombra (fire-and-forget). G2 + G3.
 *
 * Contrato con producción:
 *  - `despacharShadow` NUNCA lanza ni devuelve una promesa: la respuesta HTTP no la espera ni la cambia.
 *  - Cada compuerta es fail-closed y se evalúa en este orden; la primera que falla omite el despacho:
 *      kill switch → privacy gate → corpus público → procedencia fuerte → credencial → circuit breaker → presupuesto → adaptador
 *      → parseo estructurado → validador de citas → métricas.
 *  - El resultado sombra queda solo en el registro en memoria; no sale de aquí.
 *  - El registro guarda estados, códigos de razón y cifras (tokens, costo, latencia): nunca la pregunta, el
 *    texto de una claim ni el dato detectado.
 *  - Riesgo P1 documentado, sin cambiar la arquitectura (D14): en un entorno serverless el trabajo suelto puede
 *    cortarse al terminar la respuesta (p. ej. en Vercel) antes de completar la llamada futura. `after()` y
 *    `maxDuration` quedan para un PR con autorización expresa.
 */
import type { FragmentoRAG, RetrievalExecutionState } from '../../legal-retrieval/types';
import { SHADOW_GATEWAY_ENABLED, SHADOW_REGISTRY_MAX, SHADOW_TIMEOUT_MS } from './config';
import { credencialDisponible, crearAdaptadorSombra } from './adaptador-sombra';
import { crearBudgetGuard } from './budget-guard';
import { crearCircuitBreaker } from './circuit-breaker';
import { validarSalida } from './citation-validator';
import { evaluarCorpusPublico } from './public-corpus-gate';
import { evaluarProcedenciaFuerte } from './public-provenance';
import { clasificarFragmento } from './evidence-classification';
import { estimarCostoConservadorUsd } from './pricing';
import { privacyGate } from './privacy-gate';
import { SHADOW_BUDGET_USD, SHADOW_BUDGET_WINDOW_MS, SHADOW_MODEL_CONFIG } from './shadow-model-config';
import type { EvidenceChunk, ShadowGatewayInput, ShadowStatus } from './types';

export type EstadoDespacho =
  | 'SKIPPED_DISABLED'
  | 'SKIPPED_PII'
  | 'SKIPPED_PRIVACY'
  | 'SKIPPED_PUBLIC_CORPUS'
  | 'SKIPPED_PUBLIC_PROVENANCE'
  | 'SKIPPED_NO_CREDENTIALS'
  | 'SKIPPED_NO_OUTCOME'
  | 'SKIPPED_CIRCUIT_OPEN'
  | 'SKIPPED_BUDGET'
  | 'DISPATCHED'
  | 'COMPLETED'
  | 'ERROR'
  | 'TIMEOUT';

export interface RegistroDespacho {
  queryId: string;
  estado: EstadoDespacho;
  /** Código de razón (categoría PII, etapa de privacidad, campo del corpus), estado sombra (COMPLETED) o tipo de error. */
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
const pendientes = new Set<Promise<void>>();
const breaker = crearCircuitBreaker();
const presupuesto = crearBudgetGuard({ presupuestoUsd: SHADOW_BUDGET_USD, ventanaMs: SHADOW_BUDGET_WINDOW_MS });

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

/**
 * Evidencia para el modelo. El rol queda en `null`: el runtime actual no produce PRIMARY/CONTEXT y no se
 * infiere ni se usa CONTEXT por defecto. La clasificación y la citabilidad son las que producción ya aplica.
 */
export function aEvidencia(fragmentos: readonly FragmentoRAG[]): EvidenceChunk[] {
  return fragmentos.map((f, i) => {
    const { clasificacionProduccion, citable } = clasificarFragmento(f);
    return {
      chunk_id: f.id ?? f.hash ?? `frag-${i}`,
      instrumento: f.fuente,
      articulo: f.num_articulo || null,
      gaceta: null,
      rol: null,
      clasificacionProduccion,
      citable,
      texto: f.contenido,
    };
  });
}

/**
 * Corre `fn` con una señal que se aborta al vencer `ms`. Rechaza con Error('TIMEOUT') aunque el adaptador
 * ignore la señal, y siempre limpia el temporizador. La promesa de `fn` queda atendida: no genera rechazos
 * sin manejar si falla después del timeout.
 */
export function conTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
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

/** Costo del peor caso: entrada estimada de forma conservadora más el tope de salida. */
export function peorCasoUsd(input: ShadowGatewayInput): number {
  const caracteres = input.sanitizedQuestion.length + input.evidence.reduce((n, e) => n + e.texto.length + 200, 0) + 1500;
  const tokensEntrada = Math.ceil(caracteres / SHADOW_MODEL_CONFIG.charsPerTokenEstimate);
  return estimarCostoConservadorUsd(tokensEntrada, SHADOW_MODEL_CONFIG.maxOutputTokens);
}

export function despacharShadow(params: ParametrosDespacho): void {
  try {
    // 1. Kill switch.
    if (SHADOW_GATEWAY_ENABLED !== true) return;
    const { queryId } = params;
    if (!params.retrievalState) {
      anotar({ queryId, estado: 'SKIPPED_NO_OUTCOME', motivo: null });
      return;
    }

    // 2. Privacy gate: solo PASS permite seguir.
    const privacidad = privacyGate(params.pregunta);
    if (privacidad.estado !== 'PASS') {
      const esPii = privacidad.etapa === 'A' || privacidad.etapa === 'B';
      anotar({ queryId, estado: esPii ? 'SKIPPED_PII' : 'SKIPPED_PRIVACY', motivo: privacidad.razon });
      return;
    }

    // 3. Corpus público: todos los fragmentos o ninguno.
    const corpus = evaluarCorpusPublico(params.fragmentos ?? []);
    if (corpus.estado !== 'PUBLIC_CORPUS_PASS') {
      anotar({ queryId, estado: 'SKIPPED_PUBLIC_CORPUS', motivo: corpus.razon });
      return;
    }

    // 3b. Procedencia pública FUERTE (G4-A): manifiesto aprobado + hash de contenido. Vacío por defecto → no hay egress.
    const procedencia = evaluarProcedenciaFuerte(params.fragmentos ?? []);
    if (procedencia.estado !== 'PROVENANCE_PASS') {
      anotar({ queryId, estado: 'SKIPPED_PUBLIC_PROVENANCE', motivo: procedencia.razon });
      return;
    }

    // 4. Credencial.
    if (!credencialDisponible()) {
      anotar({ queryId, estado: 'SKIPPED_NO_CREDENTIALS', motivo: null });
      return;
    }

    // 5. Circuit breaker.
    if (!breaker.permitir()) {
      anotar({ queryId, estado: 'SKIPPED_CIRCUIT_OPEN', motivo: null });
      return;
    }

    const input: ShadowGatewayInput = {
      queryId,
      sanitizedQuestion: params.pregunta,
      evidence: aEvidencia(params.fragmentos ?? []),
      productionOutcome: { decision: params.decision, retrievalState: params.retrievalState },
    };

    // 6. Presupuesto: si el peor caso no cabe (o el presupuesto es 0) no hay llamada. Si el breaker dejó pasar una
    // sonda y el presupuesto la rechaza, la sonda se devuelve sin cambiar el estado del breaker.
    const reserva = peorCasoUsd(input);
    if (!presupuesto.reservar(reserva)) {
      breaker.cancelarSonda();
      anotar({ queryId, estado: 'SKIPPED_BUDGET', motivo: null });
      return;
    }

    anotar({ queryId, estado: 'DISPATCHED', motivo: null });
    const trabajo = (async () => {
      // 7. Adaptador (con señal de aborto) → 8. parseo estructurado y validador de citas → 9. métricas.
      const adapter = crearAdaptadorSombra();
      const cruda = await conTimeout((signal) => adapter.responder(input, { signal }), SHADOW_TIMEOUT_MS);
      breaker.exito();
      const resultado = validarSalida(input, cruda);
      // Se liquida con la cota superior (escritura de caché incluida): nunca se subestima lo gastado.
      presupuesto.liquidar(reserva, estimarCostoConservadorUsd(resultado.usage.inputTokens, resultado.usage.outputTokens));
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
        // Costo desconocido: se conserva el peor caso como gastado.
        presupuesto.liquidar(reserva, Number.NaN);
        const esTimeout = e instanceof Error && e.message === 'TIMEOUT';
        anotar({ queryId, estado: esTimeout ? 'TIMEOUT' : 'ERROR', motivo: esTimeout ? null : (e instanceof Error ? e.name : 'desconocido') });
      })
      .finally(() => { pendientes.delete(trabajo); });
    pendientes.add(trabajo);
  } catch {
    // Un fallo del despacho sombra jamás debe llegar a la respuesta de producción.
  }
}
