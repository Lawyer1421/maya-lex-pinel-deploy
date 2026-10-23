import { describe, expect, it, vi, beforeEach } from 'vitest';
import { crearCircuitBreaker } from '@/lib/ai-gateway/shadow/circuit-breaker';
import { SHADOW_MODEL_CONFIG } from '@/lib/ai-gateway/shadow/shadow-model-config';
import { MODEL_OUTPUT_JSON_SCHEMA, MODEL_OUTPUT_WIRE_JSON_SCHEMA, modelOutputSchema } from '@/lib/ai-gateway/shadow/model-output-schema';

/**
 * PR-G3a — resiliencia del despacho sombra, sin red ni proveedor: circuit breaker en memoria,
 * AbortSignal en el timeout, uso y desacuerdo en el registro, y esquema de cable conservador.
 * El kill switch sigue en false en el código; aquí se enciende solo con un mock del módulo de config.
 */

describe('circuit breaker en memoria', () => {
  const reloj = () => {
    let t = 1_000;
    return { ahora: () => t, avanza: (ms: number) => { t += ms; } };
  };
  it('cerrado: permite y no se abre con menos fallos que el umbral', () => {
    const r = reloj();
    const b = crearCircuitBreaker({ umbralFallos: 3, ventanaMs: 1_000, enfriamientoMs: 5_000, ahora: r.ahora });
    b.fallo(); b.fallo();
    expect(b.estado()).toBe('CERRADO');
    expect(b.permitir()).toBe(true);
  });
  it('se abre al llegar al umbral y rechaza durante el enfriamiento', () => {
    const r = reloj();
    const b = crearCircuitBreaker({ umbralFallos: 3, ventanaMs: 1_000, enfriamientoMs: 5_000, ahora: r.ahora });
    b.fallo(); b.fallo(); b.fallo();
    expect(b.estado()).toBe('ABIERTO');
    expect(b.permitir()).toBe(false);
    r.avanza(4_999);
    expect(b.permitir()).toBe(false);
  });
  it('los fallos fuera de la ventana no cuentan', () => {
    const r = reloj();
    const b = crearCircuitBreaker({ umbralFallos: 3, ventanaMs: 1_000, enfriamientoMs: 5_000, ahora: r.ahora });
    b.fallo(); b.fallo();
    r.avanza(1_500);
    b.fallo();
    expect(b.estado()).toBe('CERRADO');
  });
  it('tras el enfriamiento deja pasar una sola sonda; si tiene éxito se cierra', () => {
    const r = reloj();
    const b = crearCircuitBreaker({ umbralFallos: 2, enfriamientoMs: 5_000, ahora: r.ahora });
    b.fallo(); b.fallo();
    r.avanza(5_000);
    expect(b.estado()).toBe('SEMIABIERTO');
    expect(b.permitir()).toBe(true);
    expect(b.permitir()).toBe(false); // solo una sonda a la vez
    b.exito();
    expect(b.estado()).toBe('CERRADO');
    expect(b.permitir()).toBe(true);
  });
  it('si la sonda falla vuelve a abrirse con un nuevo enfriamiento', () => {
    const r = reloj();
    const b = crearCircuitBreaker({ umbralFallos: 2, enfriamientoMs: 5_000, ahora: r.ahora });
    b.fallo(); b.fallo();
    r.avanza(5_000);
    expect(b.permitir()).toBe(true);
    b.fallo();
    expect(b.estado()).toBe('ABIERTO');
    expect(b.permitir()).toBe(false);
    r.avanza(5_000);
    expect(b.permitir()).toBe(true);
  });
  it('una sonda cancelada (p. ej. rechazada por el presupuesto) no cierra ni reabre el breaker y libera la sonda', () => {
    const r = reloj();
    const b = crearCircuitBreaker({ umbralFallos: 2, enfriamientoMs: 5_000, ahora: r.ahora });
    b.fallo(); b.fallo();
    r.avanza(5_000);
    expect(b.permitir()).toBe(true);
    b.cancelarSonda();
    expect(b.estado()).toBe('SEMIABIERTO');
    expect(b.permitir()).toBe(true);
  });
  it('un éxito reinicia el conteo de fallos', () => {
    const b = crearCircuitBreaker({ umbralFallos: 3 });
    b.fallo(); b.fallo(); b.exito(); b.fallo(); b.fallo();
    expect(b.estado()).toBe('CERRADO');
  });
});

const PREGUNTA = 'Explica el artículo 173 del Código Procesal Penal de Honduras';
const FRAG = { id: 'f1', contenido: 'ARTICULO 173.- Texto limpio de prueba.', num_articulo: '173', fuente: 'Codigo Procesal Penal', relevancia: 0.9, hash: 'abcd1234', fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true };

async function cargarDispatcher(responder: (input: unknown, opciones?: { signal?: AbortSignal }) => Promise<unknown>, habilitado = true) {
  vi.resetModules();
  vi.doMock('@/lib/ai-gateway/shadow/config', () => ({ SHADOW_GATEWAY_ENABLED: habilitado, SHADOW_TIMEOUT_MS: 40, SHADOW_REGISTRY_MAX: 200 }));
  vi.doMock('@/lib/ai-gateway/shadow/shadow-model-config', async (original) => ({ ...(await original<typeof import('@/lib/ai-gateway/shadow/shadow-model-config')>()), SHADOW_BUDGET_USD: 1 }));
  vi.doMock('@/lib/ai-gateway/shadow/public-provenance', () => ({ evaluarProcedenciaFuerte: () => ({ estado: 'PROVENANCE_PASS' }) }));
  vi.doMock('@/lib/ai-gateway/shadow/adaptador-sombra', () => ({ credencialDisponible: () => true, crearAdaptadorSombra: () => ({ modelo: 'gpt-6-luna', responder }) }));
  return import('@/lib/ai-gateway/shadow/dispatcher');
}
const params = (queryId: string, decision: 'ANSWER' | 'ABSTAIN' = 'ANSWER') => ({ queryId, pregunta: PREGUNTA, fragmentos: [FRAG as never], decision, retrievalState: 'EXACT_SUCCESS' as const });
const respuestaValida = (chunkId = 'f1') => ({
  rawOutput: { decision: 'ANSWER', claims: [{ claim_id: 'c1', text: 'El art. 173 trata el tema.', citations: [{ chunk_id: chunkId, support: 'DIRECT' }] }], abstention_reason: null },
  usage: { inputTokens: 1000, outputTokens: 100 },
  latencyMs: 12,
});

beforeEach(() => { vi.restoreAllMocks(); vi.doUnmock('@/lib/ai-gateway/shadow/pii-gate'); });

describe('timeout con AbortSignal', () => {
  it('el adaptador recibe una señal y se aborta al vencer el timeout; el registro anota TIMEOUT', async () => {
    let senal: AbortSignal | undefined;
    const d = await cargarDispatcher((_i, o) => { senal = o?.signal; return new Promise(() => {}); });
    d.despacharShadow(params('q-1'));
    await d.esperarDespachos();
    expect(senal).toBeInstanceOf(AbortSignal);
    expect(senal!.aborted).toBe(true);
    expect(d.registroDespachos().at(-1)).toMatchObject({ queryId: 'q-1', estado: 'TIMEOUT' });
  });
  it('si el adaptador responde a tiempo la señal NO se aborta y el temporizador se limpia', async () => {
    let senal: AbortSignal | undefined;
    const d = await cargarDispatcher(async (_i, o) => { senal = o?.signal; return respuestaValida(); });
    const clear = vi.spyOn(globalThis, 'clearTimeout');
    d.despacharShadow(params('q-2'));
    await d.esperarDespachos();
    expect(senal!.aborted).toBe(false);
    expect(clear).toHaveBeenCalled();
    expect(d.registroDespachos().at(-1)).toMatchObject({ estado: 'COMPLETED', motivo: 'ANSWER' });
  });
  it('un adaptador que rechaza al abortarse no convierte el timeout en ERROR ni deja rechazos sin manejar', async () => {
    const sinManejar = vi.fn();
    process.on('unhandledRejection', sinManejar);
    const d = await cargarDispatcher((_i, o) => new Promise((_, rej) => { o?.signal?.addEventListener('abort', () => rej(new Error('abortado'))); }));
    d.despacharShadow(params('q-3'));
    await d.esperarDespachos();
    await new Promise((r) => setTimeout(r, 20));
    process.off('unhandledRejection', sinManejar);
    expect(sinManejar).not.toHaveBeenCalled();
    expect(d.registroDespachos().at(-1)).toMatchObject({ estado: 'TIMEOUT' });
  });
  it('despacharShadow sigue devolviendo undefined y con el kill switch apagado no invoca nada', async () => {
    const responder = vi.fn();
    const d = await cargarDispatcher(responder, false);
    expect(d.despacharShadow(params('q-4'))).toBeUndefined();
    await d.esperarDespachos();
    expect(responder).not.toHaveBeenCalled();
    expect(d.registroDespachos()).toEqual([]);
  });
});

describe('registro con uso y desacuerdo', () => {
  it('COMPLETED guarda tokens, total, costo estimado y latencia, sin texto de la pregunta ni de las claims', async () => {
    const d = await cargarDispatcher(async () => respuestaValida());
    d.despacharShadow(params('q-5'));
    await d.esperarDespachos();
    const r = d.registroDespachos().at(-1)!;
    expect(r.uso).toEqual({ inputTokens: 1000, outputTokens: 100, totalTokens: 1100, estimatedCostUsd: (1000 * SHADOW_MODEL_CONFIG.pricing.standard.inputUsdPerMillion + 100 * SHADOW_MODEL_CONFIG.pricing.standard.outputUsdPerMillion) / 1_000_000, latenciaMs: 12 });
    expect(r.desacuerdo).toBe(false);
    expect(JSON.stringify(r)).not.toMatch(/art\. 173|Procesal|Explica/);
  });
  it('shadow ANSWER con producción ABSTAIN se registra como desacuerdo y no cambia nada más', async () => {
    const d = await cargarDispatcher(async () => respuestaValida());
    d.despacharShadow(params('q-6', 'ABSTAIN'));
    await d.esperarDespachos();
    expect(d.registroDespachos().at(-1)).toMatchObject({ estado: 'COMPLETED', motivo: 'ANSWER', desacuerdo: true });
  });
  it('una salida INVALID (cita fuera del evidence) cuenta como desacuerdo', async () => {
    const d = await cargarDispatcher(async () => respuestaValida('chunk-inexistente'));
    d.despacharShadow(params('q-7'));
    await d.esperarDespachos();
    expect(d.registroDespachos().at(-1)).toMatchObject({ estado: 'COMPLETED', motivo: 'INVALID', desacuerdo: true });
  });
  it('los estados SKIPPED y de error no llevan uso ni desacuerdo (forma estable)', async () => {
    const d = await cargarDispatcher(async () => { throw new Error('boom'); });
    d.despacharShadow({ ...params('q-8'), pregunta: 'Mi correo es a@b.com, artículo 173' });
    d.despacharShadow(params('q-9'));
    await d.esperarDespachos();
    const [pii, , err] = d.registroDespachos();
    expect(pii).toEqual({ queryId: 'q-8', estado: 'SKIPPED_PII', motivo: 'EMAIL' });
    expect(err).toEqual({ queryId: 'q-9', estado: 'ERROR', motivo: 'Error' });
  });
});

describe('circuit breaker integrado en el despacho', () => {
  it('tras 5 fallos seguidos se omiten los despachos con SKIPPED_CIRCUIT_OPEN y el adaptador no se invoca', async () => {
    const responder = vi.fn(async () => { throw new Error('caído'); });
    const d = await cargarDispatcher(responder);
    for (let i = 0; i < 5; i++) {
      d.despacharShadow(params(`f-${i}`));
      await d.esperarDespachos();
    }
    expect(responder).toHaveBeenCalledTimes(5);
    d.despacharShadow(params('f-5'));
    await d.esperarDespachos();
    expect(responder).toHaveBeenCalledTimes(5);
    expect(d.registroDespachos().at(-1)).toEqual({ queryId: 'f-5', estado: 'SKIPPED_CIRCUIT_OPEN', motivo: null });
  });
  it('los timeouts también cuentan como fallos', async () => {
    const d = await cargarDispatcher(() => new Promise(() => {}));
    for (let i = 0; i < 5; i++) {
      d.despacharShadow(params(`t-${i}`));
      await d.esperarDespachos();
    }
    d.despacharShadow(params('t-5'));
    expect(d.registroDespachos().at(-1)).toMatchObject({ estado: 'SKIPPED_CIRCUIT_OPEN' });
  });
  it('una salida INVALID no abre el breaker: es un problema del modelo, no de la infraestructura', async () => {
    const d = await cargarDispatcher(async () => respuestaValida('no-existe'));
    for (let i = 0; i < 8; i++) {
      d.despacharShadow(params(`i-${i}`));
      await d.esperarDespachos();
    }
    expect(d.registroDespachos().filter((r) => r.estado === 'SKIPPED_CIRCUIT_OPEN')).toEqual([]);
  });
  it('los despachos omitidos por PII no consumen la sonda ni cuentan como fallo', async () => {
    const d = await cargarDispatcher(async () => { throw new Error('caído'); });
    for (let i = 0; i < 10; i++) d.despacharShadow({ ...params(`p-${i}`), pregunta: 'Mi correo es a@b.com' });
    await d.esperarDespachos();
    expect(d.registroDespachos().every((r) => r.estado === 'SKIPPED_PII')).toBe(true);
  });
});

describe('esquema de cable conservador', () => {
  const claves = (o: unknown, acc = new Set<string>()): Set<string> => {
    if (Array.isArray(o)) o.forEach((x) => claves(x, acc));
    else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { acc.add(k); claves(v, acc); }
    return acc;
  };
  it('solo usa type, properties, required, additionalProperties, enum e items', () => {
    const permitidas = new Set(['type', 'properties', 'required', 'additionalProperties', 'enum', 'items', 'decision', 'claims', 'abstention_reason', 'claim_id', 'text', 'citations', 'chunk_id', 'support']);
    for (const k of claves(MODEL_OUTPUT_WIRE_JSON_SCHEMA)) expect(permitidas.has(k), k).toBe(true);
    const ks = claves(MODEL_OUTPUT_WIRE_JSON_SCHEMA);
    for (const prohibida of ['$schema', 'title', 'minLength', 'maxLength', 'pattern', 'minItems', 'default']) expect(ks.has(prohibida), prohibida).toBe(false);
  });
  it('conserva la forma: mismos campos obligatorios, enums y additionalProperties:false en todo objeto', () => {
    const objetos: unknown[] = [];
    const recorre = (o: unknown) => { if (o && typeof o === 'object') { if ((o as { type?: unknown }).type === 'object') objetos.push(o); Object.values(o).forEach(recorre); } };
    recorre(MODEL_OUTPUT_WIRE_JSON_SCHEMA);
    expect(objetos).toHaveLength(3);
    for (const o of objetos as Array<{ additionalProperties: unknown; required: string[]; properties: Record<string, unknown> }>) {
      expect(o.additionalProperties).toBe(false);
      expect(new Set(o.required)).toEqual(new Set(Object.keys(o.properties)));
    }
    expect(MODEL_OUTPUT_WIRE_JSON_SCHEMA.required).toEqual(MODEL_OUTPUT_JSON_SCHEMA.required);
    expect(MODEL_OUTPUT_WIRE_JSON_SCHEMA.properties.decision).toEqual(MODEL_OUTPUT_JSON_SCHEMA.properties.decision);
    expect(MODEL_OUTPUT_WIRE_JSON_SCHEMA.properties.claims.items.properties.citations.items.properties.support).toEqual(
      MODEL_OUTPUT_JSON_SCHEMA.properties.claims.items.properties.citations.items.properties.support,
    );
  });
  it('lo que zod rechaza por minLength sigue rechazándose aunque el cable no lo exprese', () => {
    expect(modelOutputSchema.safeParse({ decision: 'ANSWER', claims: [{ claim_id: '', text: 'x', citations: [] }], abstention_reason: null }).success).toBe(false);
  });
});
