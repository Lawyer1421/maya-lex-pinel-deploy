/**
 * lib/luna/engine.ts
 * MAYALEX LUNA (P26): motor de respuesta sobre la Responses API. Es SUBORDINADO de /api/chat: la ruta ya resolvió
 * autenticación, cuota, recuperación (exacto → semántico), Evidence Gate y fallback oficial. Luna solo recibe la evidencia
 * autorizada y devuelve una respuesta con referencias verificables o una abstención que dice qué falta.
 *
 * Contrato: `responder` NUNCA lanza. Devuelve ANSWER / ABSTAIN (la ruta los emite) o SKIPPED / ERROR (la ruta sigue por el
 * proveedor vigente, sin cambio de comportamiento). Compuertas, todas fail-closed y en este orden:
 *   kill switch de entorno → credencial → privacy gate → evidencia autorizada → tope de entrada → tope de costo por consulta
 *   → circuit breaker → presupuesto del plan → modelo disponible en la cuenta → llamada con timeout → parseo estricto →
 *   validador de citas (DIRECT a evidencia citable).
 * El registro (`registrar`) guarda códigos y cifras: nunca la pregunta, el texto de una claim ni datos detectados.
 */
import { crearBudgetGuard, type BudgetGuard } from '../ai-gateway/shadow/budget-guard';
import { crearCircuitBreaker, type CircuitBreaker } from '../ai-gateway/shadow/circuit-breaker';
import { validarSalida } from '../ai-gateway/shadow/citation-validator';
import { privacyGate } from '../ai-gateway/shadow/privacy-gate';
import type { ShadowGatewayInput } from '../ai-gateway/shadow/types';
import type { FragmentoRAG } from '../legal-retrieval/types';
import { construirSolicitudLuna, credencialOpenAIDisponible, crearClienteOpenAI, type ClienteLuna } from './adapter';
import { lunaHabilitadaPorEntorno, planDesdeTier, resolverConfigPlan, type PlanLuna } from './config';
import { autorizarEvidencia } from './evidence';
import { crearValidadorModelo, type ValidadorModelo } from './model-validation';
import { costoPeorCasoUsd, costoRealUsd, estimarTokensEntrada } from './pricing';
import { renderizarAbstencion, renderizarRespuesta, type ReferenciaLuna } from './render';

export interface EntradaLuna {
  queryId: string;
  pregunta: string;
  fragmentos: readonly FragmentoRAG[];
  /** Tier de cuota ya verificado en el servidor (rateLimitResult.tier). */
  tier: string;
}

export interface UsoLuna {
  inputTokens: number;
  outputTokens: number;
  costoEstimadoUsd: number;
}

export type ResultadoLuna =
  | { estado: 'ANSWER'; texto: string; referencias: ReferenciaLuna[]; modelo: string; plan: PlanLuna; uso: UsoLuna; latenciaMs: number }
  | { estado: 'ABSTAIN'; texto: string; modelo: string; plan: PlanLuna; uso: UsoLuna; latenciaMs: number }
  | { estado: 'SKIPPED' | 'ERROR'; motivo: string };

export interface RegistroLuna {
  queryId: string;
  estado: ResultadoLuna['estado'];
  motivo: string | null;
  plan: PlanLuna;
  modelo?: string;
  uso?: UsoLuna;
}

export interface DepsMotorLuna {
  env?: Readonly<Record<string, string | undefined>>;
  crearCliente?: () => ClienteLuna;
  ahora?: () => number;
  registrar?: (r: RegistroLuna) => void;
}

class TimeoutLuna extends Error {
  constructor() { super('TIMEOUT'); this.name = 'TimeoutLuna'; }
}

function conTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const ctrl = new AbortController();
  let t: ReturnType<typeof setTimeout> | undefined;
  const vencido = new Promise<never>((_, reject) => {
    t = setTimeout(() => { reject(new TimeoutLuna()); ctrl.abort(); }, ms);
  });
  const trabajo = fn(ctrl.signal);
  trabajo.catch(() => {});
  return Promise.race([trabajo, vencido]).finally(() => { if (t !== undefined) clearTimeout(t); });
}

const registroPorDefecto = (r: RegistroLuna) => {
  console.log(`[Luna] estado=${r.estado} plan=${r.plan} motivo=${r.motivo ?? '-'}${r.uso ? ` costo_usd=${r.uso.costoEstimadoUsd.toFixed(6)}` : ''}`);
};

export function crearMotorLuna(deps: DepsMotorLuna = {}) {
  const env = deps.env ?? process.env;
  const ahora = deps.ahora ?? Date.now;
  const registrar = deps.registrar ?? registroPorDefecto;
  const validador: ValidadorModelo = crearValidadorModelo(ahora);
  const breaker: CircuitBreaker = crearCircuitBreaker({ ahora });
  const presupuestos = new Map<PlanLuna, BudgetGuard>();

  const presupuestoDe = (plan: PlanLuna, usd: number): BudgetGuard => {
    let g = presupuestos.get(plan);
    if (!g) {
      g = crearBudgetGuard({ presupuestoUsd: usd, ventanaMs: 24 * 60 * 60 * 1000, ahora });
      presupuestos.set(plan, g);
    }
    return g;
  };

  return {
    /** ¿Está Luna encendida por entorno? La ruta además exige la bandera por usuario. */
    habilitada: () => lunaHabilitadaPorEntorno(env),

    async responder(entrada: EntradaLuna): Promise<ResultadoLuna> {
      const plan = planDesdeTier(entrada.tier);
      const salir = (r: ResultadoLuna, extra: Partial<RegistroLuna> = {}): ResultadoLuna => {
        try {
          registrar({ queryId: entrada.queryId, estado: r.estado, motivo: 'motivo' in r ? r.motivo : (r.estado === 'ABSTAIN' ? 'ABSTAIN' : null), plan, ...extra });
        } catch { /* el registro es subordinado */ }
        return r;
      };
      try {
        if (!lunaHabilitadaPorEntorno(env)) return salir({ estado: 'SKIPPED', motivo: 'DESHABILITADA' });
        if (!credencialOpenAIDisponible()) return salir({ estado: 'SKIPPED', motivo: 'SIN_CREDENCIAL' });

        const privacidad = privacyGate(entrada.pregunta);
        if (privacidad.estado !== 'PASS') return salir({ estado: 'SKIPPED', motivo: `PRIVACIDAD_${privacidad.etapa}` });

        const config = resolverConfigPlan(plan, env);
        const { evidencia: candidata } = autorizarEvidencia(entrada.fragmentos, config.maxEvidencias);
        if (candidata.length === 0) return salir({ estado: 'SKIPPED', motivo: 'SIN_EVIDENCIA_AUTORIZADA' });

        // Tope de entrada: se recorta la evidencia sobrante (la de menor orden de relevancia) hasta que quepa.
        let evidencia = candidata;
        const entradaCon = (ev: typeof candidata): ShadowGatewayInput => ({
          queryId: entrada.queryId,
          sanitizedQuestion: entrada.pregunta,
          evidence: ev,
          productionOutcome: { decision: 'ANSWER', retrievalState: 'SEMANTIC_SUCCESS' },
        });
        const tokensDe = (ev: typeof candidata) =>
          estimarTokensEntrada(entrada.pregunta.length + ev.reduce((n, e) => n + e.texto.length + 200, 0) + 1500);
        while (evidencia.length > 0 && tokensDe(evidencia) > config.maxInputTokens) evidencia = evidencia.slice(0, -1);
        if (evidencia.length === 0) return salir({ estado: 'SKIPPED', motivo: 'ENTRADA_EXCEDE_TOPE' });

        const input = entradaCon(evidencia);
        const reserva = costoPeorCasoUsd(config.modelId, tokensDe(evidencia), config.maxOutputTokens);
        if (!(reserva <= config.maxCostoConsultaUsd)) return salir({ estado: 'SKIPPED', motivo: 'COSTO_EXCEDE_TOPE_CONSULTA' });

        if (!breaker.permitir()) return salir({ estado: 'SKIPPED', motivo: 'CIRCUITO_ABIERTO' });
        const presupuesto = presupuestoDe(plan, config.presupuestoDiarioUsd);
        if (!presupuesto.reservar(reserva)) {
          breaker.cancelarSonda();
          return salir({ estado: 'SKIPPED', motivo: 'PRESUPUESTO_AGOTADO' });
        }

        const cliente = (deps.crearCliente ?? (() => crearClienteOpenAI()))();
        try {
          const validacion = await conTimeout((signal) => validador.validar(config.modelId, cliente, signal), Math.min(config.timeoutMs, 10_000));
          if (!validacion.disponible) {
            presupuesto.liquidar(reserva, 0);
            breaker.cancelarSonda();
            return salir({ estado: 'SKIPPED', motivo: `MODELO_${validacion.razon}` }, { modelo: config.modelId });
          }

          const inicio = ahora();
          const respuesta = await conTimeout((signal) => cliente.responses.create(construirSolicitudLuna(input, config), { signal }), config.timeoutMs);
          if (!respuesta.usage) throw new Error('respuesta sin usage');
          breaker.exito();
          const u = respuesta.usage;
          const latenciaMs = ahora() - inicio;
          const resultado = validarSalida(input, {
            rawOutput: respuesta.output_text,
            usage: { inputTokens: u.input_tokens, outputTokens: u.output_tokens, cachedInputTokens: u.input_tokens_details?.cached_tokens ?? 0 },
            latencyMs: latenciaMs,
          });
          const cota = costoPeorCasoUsd(config.modelId, u.input_tokens, u.output_tokens);
          presupuesto.liquidar(reserva, Number.isFinite(cota) ? cota : Number.NaN);
          const uso: UsoLuna = {
            inputTokens: u.input_tokens,
            outputTokens: u.output_tokens,
            costoEstimadoUsd: costoRealUsd(u.input_tokens, u.output_tokens, u.input_tokens_details?.cached_tokens ?? 0),
          };

          if (resultado.status === 'ANSWER') {
            const { texto, referencias } = renderizarRespuesta(resultado.claims, evidencia);
            return salir({ estado: 'ANSWER', texto, referencias, modelo: config.modelId, plan, uso, latenciaMs }, { modelo: config.modelId, uso });
          }
          if (resultado.status === 'ABSTAIN') {
            return salir({ estado: 'ABSTAIN', texto: renderizarAbstencion(resultado.abstentionReason), modelo: config.modelId, plan, uso, latenciaMs }, { modelo: config.modelId, uso });
          }
          // INVALID: la salida del modelo no es utilizable; la ruta sigue por el proveedor vigente. El gasto ya quedó liquidado.
          return salir({ estado: 'ERROR', motivo: 'SALIDA_INVALIDA' }, { modelo: config.modelId, uso });
        } catch (e) {
          breaker.fallo();
          presupuesto.liquidar(reserva, Number.NaN);
          const esTimeout = e instanceof TimeoutLuna;
          return salir({ estado: 'ERROR', motivo: esTimeout ? 'TIMEOUT' : (e instanceof Error ? e.name : 'DESCONOCIDO') }, { modelo: config.modelId });
        }
      } catch (e) {
        return salir({ estado: 'ERROR', motivo: e instanceof Error ? e.name : 'DESCONOCIDO' });
      }
    },
  };
}

export type MotorLuna = ReturnType<typeof crearMotorLuna>;

let porDefecto: MotorLuna | undefined;
/** Instancia única del proceso (breaker y presupuesto en memoria por instancia). */
export function motorLuna(): MotorLuna {
  return (porDefecto ??= crearMotorLuna());
}
