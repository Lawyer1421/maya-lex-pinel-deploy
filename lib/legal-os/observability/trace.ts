/**
 * lib/legal-os/observability/trace.ts
 * Una traza por consulta jurídica. Esquema, constructor de solo-anexar y exportación segura.
 * Principios: (1) la pregunta cruda NUNCA se exporta; (2) los fragmentos viajan como id + hash, no como texto;
 * (3) la observabilidad jamás afecta una respuesta: exportar no lanza.
 */
import { z } from 'zod';
import { huellaTexto, redactarTexto } from './redact';

const tier = z.enum(['EXPLORAR', 'ACADEMICO', 'PREMIUM']);

export const TraceEventSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('router'), at: z.number(), role: z.enum(['NONE', 'FAST', 'DEEP']), abstain: z.boolean(), reasons: z.array(z.string().max(200)).max(20) }),
  z.object({ kind: z.literal('retrieval_query'), at: z.number(), query_hash: z.string(), query_length: z.number().int().nonnegative(), strategy: z.string().max(60) }),
  z.object({ kind: z.literal('retrieved_chunk'), at: z.number(), chunk_id: z.string().max(200), hash: z.string().max(64), instrument: z.string().max(120).nullable(), article: z.string().max(40).nullable() }),
  z.object({ kind: z.literal('article_resolver'), at: z.number(), status: z.string().max(60), article: z.string().max(40).nullable(), instrument: z.string().max(120).nullable() }),
  z.object({ kind: z.literal('version_resolver'), at: z.number(), status: z.string().max(60), as_of: z.string().max(10).nullable() }),
  z.object({ kind: z.literal('evidence_decision'), at: z.number(), decision: z.enum(['ANSWER', 'ABSTAIN', 'DEGRADED']), reason: z.string().max(200).nullable() }),
  z.object({ kind: z.literal('agent_call'), at: z.number(), agent: z.string().max(80), ms: z.number().nonnegative(), ok: z.boolean() }),
  z.object({ kind: z.literal('tool_call'), at: z.number(), tool: z.string().max(80), ms: z.number().nonnegative(), ok: z.boolean() }),
  z.object({ kind: z.literal('model_call'), at: z.number(), model: z.string().max(80), input_tokens: z.number().int().nonnegative(), output_tokens: z.number().int().nonnegative(), cost_usd: z.number().nonnegative() }),
  z.object({ kind: z.literal('citation'), at: z.number(), chunk_id: z.string().max(200), support: z.enum(['DIRECT', 'CONTEXT', 'REJECTED']) }),
  z.object({ kind: z.literal('feedback'), at: z.number(), rating: z.enum(['UP', 'DOWN']), code: z.string().max(60).nullable() }),
]);
export type TraceEvent = z.infer<typeof TraceEventSchema>;

export const FinalStatusSchema = z.enum(['ANSWERED', 'ABSTAINED', 'DEGRADED', 'ERROR']);
export type FinalStatus = z.infer<typeof FinalStatusSchema>;

export const TraceSchema = z.object({
  query_id: z.string().min(1).max(100),
  tier,
  jurisdiction: z.object({ country: z.string().length(2), jurisdiction: z.string().max(20) }),
  skill: z.string().max(120).nullable(),
  question: z.object({ sha256_16: z.string(), length: z.number().int().nonnegative() }),
  started_at: z.number(),
  finished_at: z.number(),
  latency_ms: z.number().nonnegative(),
  model: z.string().nullable(),
  tokens: z.object({ input: z.number().int().nonnegative(), output: z.number().int().nonnegative() }),
  cost_usd: z.number().nonnegative(),
  abstained: z.boolean(),
  final_status: FinalStatusSchema,
  events: z.array(TraceEventSchema),
});
export type Trace = z.infer<typeof TraceSchema>;

export interface TraceSink {
  emit(trace: Trace): void | Promise<void>;
}

export const sinkNulo: TraceSink = { emit: () => undefined };

export function crearSinkEnMemoria(): TraceSink & { trazas: readonly Trace[]; limpiar(): void } {
  const trazas: Trace[] = [];
  return { trazas, emit: (t) => { trazas.push(t); }, limpiar: () => { trazas.length = 0; } };
}

export interface TraceStart {
  queryId: string;
  tier: z.infer<typeof tier>;
  jurisdiction: { country: string; jurisdiction: string };
  skill?: string | null;
  /** Pregunta cruda: se reduce de inmediato a huella; no se conserva. */
  question: string;
}

/** Entrada de `add`: un evento sin su marca de tiempo (la pone el constructor). */
export type EventInput = TraceEvent extends infer E ? (E extends { at: number } ? Omit<E, 'at'> : never) : never;

type Head = Pick<Trace, 'query_id' | 'tier' | 'jurisdiction' | 'skill' | 'question' | 'started_at'>;

export class TraceBuilder {
  private readonly events: TraceEvent[] = [];
  private final: Trace | null = null;
  private last: number;
  private readonly started: number;
  private readonly head: Head;

  constructor(start: TraceStart, private readonly now: () => number = Date.now) {
    this.started = this.now();
    this.last = this.started;
    this.head = {
      query_id: start.queryId, tier: start.tier, jurisdiction: { ...start.jurisdiction }, skill: start.skill ?? null,
      question: huellaTexto(start.question), started_at: this.started,
    };
  }

  /** Marca de tiempo monótona: nunca retrocede aunque el reloj lo haga. */
  private tick(): number {
    this.last = Math.max(this.last, this.now());
    return this.last;
  }

  add(ev: EventInput): this {
    if (this.final) throw new Error('traza finalizada: es inmutable');
    this.events.push(Object.freeze(TraceEventSchema.parse({ ...ev, at: this.tick() })));
    return this;
  }

  /** Huella de una consulta de retrieval (el texto de la consulta no se conserva). */
  retrievalQuery(texto: string, strategy: string): this {
    const h = huellaTexto(texto);
    return this.add({ kind: 'retrieval_query', query_hash: h.sha256_16, query_length: h.length, strategy });
  }

  finalize(status: FinalStatus): Trace {
    if (this.final) return this.final;
    const fin = this.tick();
    const modelos = this.events.filter((e): e is Extract<TraceEvent, { kind: 'model_call' }> => e.kind === 'model_call');
    const trace = TraceSchema.parse({
      ...this.head,
      finished_at: fin,
      latency_ms: fin - this.started,
      model: modelos.length ? modelos[modelos.length - 1].model : null,
      tokens: { input: modelos.reduce((a, m) => a + m.input_tokens, 0), output: modelos.reduce((a, m) => a + m.output_tokens, 0) },
      cost_usd: modelos.reduce((a, m) => a + m.cost_usd, 0),
      abstained: status === 'ABSTAINED',
      final_status: status,
      events: this.events.slice(),
    });
    this.final = deepFreeze(trace);
    return this.final;
  }

  get finalizada(): boolean {
    return this.final !== null;
  }
}

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o as object)) deepFreeze(v);
  }
  return o;
}

/**
 * Exporta la traza al sink. NUNCA lanza ni rechaza: un fallo de observabilidad no puede afectar la respuesta al usuario.
 * Pasa una última redacción defensiva a los textos de razones (por si un llamador metió datos personales).
 */
export async function exportarTraza(trace: Trace, sink: TraceSink): Promise<boolean> {
  try {
    const seguro: Trace = {
      ...trace,
      events: trace.events.map((e) =>
        e.kind === 'router' ? { ...e, reasons: e.reasons.map(redactarTexto) }
        : e.kind === 'evidence_decision' && e.reason ? { ...e, reason: redactarTexto(e.reason) }
        : e),
    };
    await sink.emit(TraceSchema.parse(seguro));
    return true;
  } catch {
    return false;
  }
}
