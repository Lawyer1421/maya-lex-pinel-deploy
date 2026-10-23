import { describe, expect, it } from 'vitest';
import { REDACTED, huellaTexto, redactarTexto } from '@/lib/legal-os/observability/redact';
import { TraceBuilder, TraceSchema, crearSinkEnMemoria, exportarTraza, sinkNulo, type TraceSink } from '@/lib/legal-os/observability/trace';

const reloj = (...t: number[]) => { let i = 0; return () => t[Math.min(i++, t.length - 1)]; };
const inicio = { queryId: 'q1', tier: 'ACADEMICO' as const, jurisdiction: { country: 'HN', jurisdiction: 'NACIONAL' }, skill: 'HN.CIVIL.CONTRACTS.SALE', question: '' };

const PREGUNTA = 'Me llamo Juan Carlos Pérez, mi DNI es 0801-1990-12345, RTN 08011990123456, tel +504 9876-5432, correo juan.perez@example.com, cuenta 0012345678901. ¿Qué dice el artículo 173?';

describe('redacción', () => {
  it('quita correo, DNI, RTN, teléfonos, secuencias largas y nombres con marcador', () => {
    const r = redactarTexto(PREGUNTA);
    for (const s of ['juan.perez@example.com', '0801-1990-12345', '08011990123456', '9876-5432', '0012345678901', 'Juan Carlos', 'Pérez']) expect(r, s).not.toContain(s);
    expect(r).toContain(REDACTED);
    expect(r).toContain('artículo 173');
  });
  it('variantes adversariales', () => {
    for (const s of ['escribeme a ana arroba gmail punto com', 'mail: bob(at)corp(dot)hn', 'llama al 9999 8888', 'dni 0801 1990 12345', 'expediente 12345678', 'Sr. Anselmo Quiroz Zelaya demandó', 'mi cliente doña Marta de la Cruz']) {
      const r = redactarTexto(s);
      expect(/arroba gmail|bob\(at\)|9999 8888|0801 1990|12345678|Anselmo|Quiroz|Marta|Cruz/.test(r), `${s} → ${r}`).toBe(false);
    }
  });
  it('conserva el texto sin datos personales', () => {
    expect(redactarTexto('¿Qué dice el artículo 173 del Código Procesal Penal?')).toBe('¿Qué dice el artículo 173 del Código Procesal Penal?');
  });
  it('la huella es estable y no contiene el texto', () => {
    expect(huellaTexto('hola')).toEqual(huellaTexto('hola'));
    expect(JSON.stringify(huellaTexto(PREGUNTA))).not.toContain('Juan');
  });
});

describe('TraceBuilder', () => {
  const armar = () => {
    const b = new TraceBuilder({ ...inicio, question: PREGUNTA }, reloj(1000, 1010, 1020, 1015, 1040, 1100, 1110));
    b.add({ kind: 'router', role: 'FAST', abstain: false, reasons: ['consulta con evidencia'] })
      .retrievalQuery(PREGUNTA, 'exacto')
      .add({ kind: 'retrieved_chunk', chunk_id: 'c1', hash: 'abcd1234', instrument: 'CPP', article: '173' })
      .add({ kind: 'model_call', model: 'gpt-6-luna', input_tokens: 1200, output_tokens: 150, cost_usd: 0.0003 })
      .add({ kind: 'citation', chunk_id: 'c1', support: 'DIRECT' });
    return b;
  };
  it('exportado: la pregunta cruda y los datos personales no aparecen en ningún campo', () => {
    const t = armar().finalize('ANSWERED');
    const json = JSON.stringify(t);
    for (const s of ['Juan', 'Pérez', '0801', '08011990123456', '9876', 'example.com', '0012345678901', 'Me llamo', '¿Qué dice']) expect(json, s).not.toContain(s);
    expect(t.question.length).toBe(PREGUNTA.length);
  });
  it('agrega tokens y costo del modelo y marca la latencia', () => {
    const t = armar().finalize('ANSWERED');
    expect(t).toMatchObject({ model: 'gpt-6-luna', tokens: { input: 1200, output: 150 }, cost_usd: 0.0003, abstained: false, final_status: 'ANSWERED' });
    expect(t.latency_ms).toBe(t.finished_at - t.started_at);
  });
  it('marcas de tiempo monótonas aunque el reloj retroceda', () => {
    const t = armar().finalize('ANSWERED');
    const ats = t.events.map((e) => e.at);
    expect(ats).toEqual([...ats].sort((a, b) => a - b));
  });
  it('inmutable tras finalize: no admite eventos y el objeto está congelado', () => {
    const b = armar();
    const t = b.finalize('ABSTAINED');
    expect(() => b.add({ kind: 'feedback', rating: 'UP', code: null })).toThrow(/inmutable/);
    expect(Object.isFrozen(t)).toBe(true);
    expect(Object.isFrozen(t.events)).toBe(true);
    expect(() => { (t as { query_id: string }).query_id = 'x'; }).toThrow();
    expect(b.finalize('ERROR')).toBe(t);
    expect(t.abstained).toBe(true);
  });
  it('es determinista con reloj inyectado', () => {
    expect(armar().finalize('ANSWERED')).toEqual(armar().finalize('ANSWERED'));
  });
  it('rechaza eventos que violan el esquema', () => {
    const b = new TraceBuilder(inicio, reloj(1));
    expect(() => b.add({ kind: 'model_call', model: 'x', input_tokens: -1, output_tokens: 0, cost_usd: 0 })).toThrow();
  });
  it('el esquema valida una traza completa', () => {
    expect(TraceSchema.safeParse(armar().finalize('ANSWERED')).success).toBe(true);
  });
});

describe('exportación', () => {
  const traza = () => new TraceBuilder({ ...inicio, question: 'x' }, reloj(1, 2)).finalize('ANSWERED');
  it('entrega al sink en memoria', async () => {
    const sink = crearSinkEnMemoria();
    expect(await exportarTraza(traza(), sink)).toBe(true);
    expect(sink.trazas).toHaveLength(1);
  });
  it('el fallo del sink (síncrono o asíncrono) se traga y no lanza', async () => {
    const sincrono: TraceSink = { emit: () => { throw new Error('boom'); } };
    const asincrono: TraceSink = { emit: async () => { throw new Error('boom'); } };
    await expect(exportarTraza(traza(), sincrono)).resolves.toBe(false);
    await expect(exportarTraza(traza(), asincrono)).resolves.toBe(false);
  });
  it('sink nulo: no hace nada', async () => {
    await expect(exportarTraza(traza(), sinkNulo)).resolves.toBe(true);
  });
  it('razones con datos personales se redactan en la exportación', async () => {
    const sink = crearSinkEnMemoria();
    const b = new TraceBuilder({ ...inicio, question: 'x' }, reloj(1, 2, 3));
    b.add({ kind: 'router', role: 'NONE', abstain: true, reasons: ['correo ana.p@corp.hn en la consulta'] });
    await exportarTraza(b.finalize('ABSTAINED'), sink);
    expect(JSON.stringify(sink.trazas)).not.toContain('ana.p@corp.hn');
  });
});
