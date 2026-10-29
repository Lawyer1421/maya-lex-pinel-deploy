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
import type { ShadowGatewayInput } from '../ai-gateway/shadow/types';
import type { FragmentoRAG, RetrievalExecutionState } from '../legal-retrieval/types';
import { createServerSupabaseClient } from '../supabase';
import { auditarPayload, construirSolicitudLuna, credencialOpenAIDisponible, crearClienteOpenAI, type AuditoriaPayload, type ClienteLuna } from './adapter';
import { evaluarSuficienciaR3, mencionesNoValidadas, mensajeAbstencionR3, resumenEvidenciaClo, type MotivoR3 } from '../legal-retrieval/clo-guards';
import { objetivosDeConsulta } from '../legal-retrieval/r3-objetivos';
import { aMicroUsd, crearContadorLocalCanary, crearContadorSupabase, type ContadorCostos } from './cost-counter';
import { privacidadConsultaGeneral } from './privacy';
import { contadorLocalPermitido, lunaHabilitadaPorEntorno, planDesdeTier, resolverConfigPlan, type PlanLuna } from './config';
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
  /** Estado de recuperación de la colección principal (outcome.state). Solo EXACT/SEMANTIC_SUCCESS permiten a Luna responder. */
  retrievalState: RetrievalExecutionState | undefined;
  /** flag_corpus_p21 ya resuelto por la ruta; ausente = apagado (el clasificador degrada las filas P21 a CONTEXT). */
  corpusP21Habilitado?: boolean;
}

export interface UsoLuna {
  inputTokens: number;
  outputTokens: number;
  costoEstimadoUsd: number;
}

export type ResultadoLuna =
  | { estado: 'ANSWER'; texto: string; referencias: ReferenciaLuna[]; /** chunk_id con cita DIRECT validada: base de las citas del SSE. */ chunkIdsValidados: string[]; modelo: string; plan: PlanLuna; uso: UsoLuna; latenciaMs: number }
  | { estado: 'ABSTAIN'; texto: string; modelo: string; plan: PlanLuna; uso: UsoLuna; latenciaMs: number }
  | { estado: 'SKIPPED' | 'ERROR'; motivo: string };

export interface RegistroLuna {
  queryId: string;
  estado: ResultadoLuna['estado'];
  motivo: string | null;
  plan: PlanLuna;
  modelo?: string;
  uso?: UsoLuna;
  /** Auditoría del payload ENVIADO (campos, tamaño, escaneo de PII). Sin texto. */
  payload?: AuditoriaPayload;
  /** Motivo de la abstención por R3, si la hubo. */
  motivoR3?: MotivoR3;
  /** true si el límite de costos aplicado era global (multi-instancia); false = local de canary. */
  contadorGlobal?: boolean;
}

export interface DepsMotorLuna {
  env?: Readonly<Record<string, string | undefined>>;
  crearCliente?: () => ClienteLuna;
  ahora?: () => number;
  registrar?: (r: RegistroLuna) => void;
  /** Contador de costos. Por defecto: global sobre Supabase (RPC propuestas, no aplicadas) o local solo con LUNA_COST_COUNTER=local_canary_only. */
  contador?: ContadorCostos;
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
  const p = r.payload ? ` payload=${r.payload.campos.join('+')} evidencias=${r.payload.evidencias} bytes=${r.payload.bytes} pii=${r.payload.pii}` : '';
  console.log(`[Luna] estado=${r.estado} plan=${r.plan} motivo=${r.motivo ?? '-'}${r.uso ? ` costo_usd=${r.uso.costoEstimadoUsd.toFixed(6)} (estimado)` : ''}${p}${r.contadorGlobal === false ? ' contador=LOCAL_CANARY_NO_GLOBAL' : ''}`);
};

export function crearMotorLuna(deps: DepsMotorLuna = {}) {
  const env = deps.env ?? process.env;
  const ahora = deps.ahora ?? Date.now;
  const registrar = deps.registrar ?? registroPorDefecto;
  const validador: ValidadorModelo = crearValidadorModelo(ahora);
  const breaker: CircuitBreaker = crearCircuitBreaker({ ahora });
  const presupuestos = new Map<PlanLuna, BudgetGuard>();
  const diaHn = () => new Date(ahora()).toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' });
  const contador: ContadorCostos = deps.contador
    ?? (env.LUNA_COST_COUNTER === 'local_canary_only'
      ? crearContadorLocalCanary(diaHn)
      : crearContadorSupabase(() => createServerSupabaseClient() as never, diaHn));

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

        // Suficiencia de recuperación: solo si el pipeline acreditó evidencia (resolutor exacto o semántica con PRIMARY, #106).
        const estadoRecuperacion = entrada.retrievalState;
        if (estadoRecuperacion !== 'EXACT_SUCCESS' && estadoRecuperacion !== 'SEMANTIC_SUCCESS') return salir({ estado: 'SKIPPED', motivo: 'EVIDENCIA_NO_ACREDITADA' });

        // Privacidad estricta de la modalidad general: rechaza SIN llamar a OpenAI (la ruta deriva al proveedor actual).
        const privacidad = privacidadConsultaGeneral(entrada.pregunta);
        if (privacidad.estado !== 'PASS') return salir({ estado: 'SKIPPED', motivo: `PRIVACIDAD_${privacidad.razon}` });

        const config = resolverConfigPlan(plan, env);
        // Topes duros: un valor de entorno inválido o por encima de los máximos del código deja a Luna cerrada (no se recorta en silencio).
        if (config.invalida) return salir({ estado: 'SKIPPED', motivo: `CONFIG_${config.invalida}` });
        // `local_canary_only` (contador no global) está prohibido fuera de Preview y desarrollo.
        if (env.LUNA_COST_COUNTER === 'local_canary_only' && !contadorLocalPermitido(env)) return salir({ estado: 'SKIPPED', motivo: 'CONTADOR_LOCAL_PROHIBIDO_EN_PRODUCCION' });
        // R3 (clasificador compartido, #106): sin un PRIMARY vigente (TRUE) del mismo instrumento y artículo consultados no se llama a OpenAI.
        const ctxClo = { corpusP21Habilitado: entrada.corpusP21Habilitado };
        const objetivos = objetivosDeConsulta(entrada.pregunta);
        if (!resumenEvidenciaClo(entrada.fragmentos, ctxClo, objetivos).suficiente) return salir({ estado: 'SKIPPED', motivo: 'EVIDENCIA_NO_ACREDITADA' });
        const { evidencia: candidata } = autorizarEvidencia(entrada.fragmentos, config.maxEvidencias, { corpusP21Habilitado: entrada.corpusP21Habilitado });
        if (candidata.length === 0) return salir({ estado: 'SKIPPED', motivo: 'SIN_EVIDENCIA_AUTORIZADA' });

        // Tope de entrada: se recorta la evidencia sobrante (la de menor orden de relevancia) hasta que quepa.
        let evidencia = candidata;
        const entradaCon = (ev: typeof candidata): ShadowGatewayInput => ({
          queryId: entrada.queryId,
          sanitizedQuestion: entrada.pregunta,
          evidence: ev,
          productionOutcome: { decision: 'ANSWER', retrievalState: estadoRecuperacion },
        });
        const tokensDe = (ev: typeof candidata) =>
          estimarTokensEntrada(entrada.pregunta.length + ev.reduce((n, e) => n + e.texto.length + 200, 0) + 1500);
        while (evidencia.length > 0 && tokensDe(evidencia) > config.maxInputTokens) evidencia = evidencia.slice(0, -1);
        if (evidencia.length === 0) return salir({ estado: 'SKIPPED', motivo: 'ENTRADA_EXCEDE_TOPE' });

        const input = entradaCon(evidencia);
        const reserva = costoPeorCasoUsd(config.modelId, tokensDe(evidencia), config.maxOutputTokens);
        if (!(reserva <= config.maxCostoConsultaUsd)) return salir({ estado: 'SKIPPED', motivo: 'COSTO_EXCEDE_TOPE_CONSULTA' });

        // Auditoría del payload que se enviaría: estructura mínima y escaneo de la pregunta enviada. Fail-closed.
        const solicitud = construirSolicitudLuna(input, config);
        const payload = auditarPayload(solicitud);
        if (!payload.ok) return salir({ estado: 'SKIPPED', motivo: 'PAYLOAD_NO_AUDITADO' }, { payload });

        if (!breaker.permitir()) return salir({ estado: 'SKIPPED', motivo: 'CIRCUITO_ABIERTO' }, { payload });
        const presupuesto = presupuestoDe(plan, config.presupuestoDiarioUsd);
        if (!presupuesto.reservar(reserva)) {
          breaker.cancelarSonda();
          return salir({ estado: 'SKIPPED', motivo: 'PRESUPUESTO_AGOTADO' }, { payload });
        }
        // Límite GLOBAL (multi-instancia). El guard en memoria de arriba es una capa extra por instancia, no el límite.
        const reservaMicro = aMicroUsd(reserva);
        if (!(await contador.reservar(plan, reservaMicro, aMicroUsd(config.presupuestoDiarioUsd)))) {
          presupuesto.liquidar(reserva, 0);
          breaker.cancelarSonda();
          return salir({ estado: 'SKIPPED', motivo: contador.global ? 'PRESUPUESTO_GLOBAL_AGOTADO' : 'PRESUPUESTO_CANARY_AGOTADO' }, { payload, contadorGlobal: contador.global });
        }

        const cliente = (deps.crearCliente ?? (() => crearClienteOpenAI()))();
        try {
          const validacion = await conTimeout((signal) => validador.validar(config.modelId, cliente, signal), Math.min(config.timeoutMs, 10_000));
          if (!validacion.disponible) {
            presupuesto.liquidar(reserva, 0);
            await contador.liquidar(plan, reservaMicro, 0);
            breaker.cancelarSonda();
            return salir({ estado: 'SKIPPED', motivo: `MODELO_${validacion.razon}` }, { modelo: config.modelId, payload });
          }

          const inicio = ahora();
          const respuesta = await conTimeout((signal) => cliente.responses.create(solicitud, { signal }), config.timeoutMs);
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
          await contador.liquidar(plan, reservaMicro, Number.isFinite(cota) ? aMicroUsd(cota) : Number.NaN);
          const uso: UsoLuna = {
            inputTokens: u.input_tokens,
            outputTokens: u.output_tokens,
            costoEstimadoUsd: costoRealUsd(u.input_tokens, u.output_tokens, u.input_tokens_details?.cached_tokens ?? 0),
          };

          if (resultado.status === 'ANSWER') {
            // R3 completa (clasificador compartido): cita DIRECT validada a un PRIMARY vigente del mismo instrumento y artículo consultados que
            // respalde la afirmación CONCRETA. Solo las afirmaciones que lo cumplen se muestran y se citan; sin ninguna, hay abstención.
            const r3 = evaluarSuficienciaR3(
              entrada.fragmentos,
              resultado.claims.map((c) => ({ claim_id: c.claim_id, texto: c.text, citas: c.citations.map((ct) => ({ fragmentoId: ct.chunk_id, soporte: ct.support })) })),
              objetivos,
              ctxClo,
              // La respuesta de Luna siempre lleva, por construcción, «[Instrumento, art. N]» de cada fuente citada (renderizarRespuesta).
              renderizarRespuesta(resultado.claims, evidencia).texto,
            );
            if (!r3.suficiente) {
              return salir({ estado: 'ABSTAIN', texto: mensajeAbstencionR3(r3.motivo), modelo: config.modelId, plan, uso, latenciaMs }, { modelo: config.modelId, uso, payload, motivoR3: r3.motivo, contadorGlobal: contador.global });
            }
            const validas = new Map(r3.afirmacionesValidas.map((a) => [a.claim_id, new Set(a.fragmentoIds)]));
            const claimsR3 = resultado.claims
              .filter((c) => validas.has(c.claim_id))
              .map((c) => ({ ...c, citations: c.citations.filter((ct) => ct.support === 'DIRECT' && validas.get(c.claim_id)!.has(ct.chunk_id)) }));
            const { texto, referencias, chunkIdsValidados } = renderizarRespuesta(claimsR3, evidencia);
            // R4 (criterio compartido con el chat principal): el texto final no puede mencionar un artículo o instrumento sin fragmento que lo respalde.
            if (mencionesNoValidadas(texto, entrada.fragmentos, ctxClo).length > 0) {
              return salir({ estado: 'ABSTAIN', texto: mensajeAbstencionR3('MENCION_NO_VALIDADA'), modelo: config.modelId, plan, uso, latenciaMs }, { modelo: config.modelId, uso, payload, motivoR3: 'MENCION_NO_VALIDADA', contadorGlobal: contador.global });
            }
            if (chunkIdsValidados.length === 0) return salir({ estado: 'ERROR', motivo: 'SIN_CITA_DIRECTA_VALIDADA' }, { modelo: config.modelId, uso, payload });
            return salir({ estado: 'ANSWER', texto, referencias, chunkIdsValidados, modelo: config.modelId, plan, uso, latenciaMs }, { modelo: config.modelId, uso, payload, contadorGlobal: contador.global });
          }
          if (resultado.status === 'ABSTAIN') {
            return salir({ estado: 'ABSTAIN', texto: renderizarAbstencion(resultado.abstentionReason), modelo: config.modelId, plan, uso, latenciaMs }, { modelo: config.modelId, uso, payload, contadorGlobal: contador.global });
          }
          // INVALID: la salida del modelo no es utilizable; la ruta sigue por el proveedor vigente. El gasto ya quedó liquidado.
          return salir({ estado: 'ERROR', motivo: 'SALIDA_INVALIDA' }, { modelo: config.modelId, uso, payload });
        } catch (e) {
          breaker.fallo();
          presupuesto.liquidar(reserva, Number.NaN);
          await contador.liquidar(plan, reservaMicro, Number.NaN);
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
