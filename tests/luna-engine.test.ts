import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FragmentoRAG } from '@/lib/legal-retrieval/types';
import { crearMotorLuna, type RegistroLuna } from '@/lib/luna/engine';
import type { ClienteLuna } from '@/lib/luna/adapter';
import type { ContadorCostos } from '@/lib/luna/cost-counter';
import { construirSolicitudLuna } from '@/lib/luna/adapter';
import { planDesdeTier, resolverConfigPlan, lunaHabilitadaPorEntorno } from '@/lib/luna/config';
import { autorizarEvidencia } from '@/lib/luna/evidence';
import { costoPeorCasoUsd } from '@/lib/luna/pricing';
import { crearValidadorModelo } from '@/lib/luna/model-validation';
import { construirCandidato } from '@/lib/luna/incorporation-queue';

const frag = (x: Partial<FragmentoRAG> = {}): FragmentoRAG => ({
  id: 'mayalex_normativos:cpp_a173', contenido: 'ARTICULO 173.- Las medidas cautelares personales proceden cuando existan indicios racionales de participación.', num_articulo: '173',
  fuente: 'Codigo Procesal Penal', relevancia: 0.9, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, hash: 'abcd1234', ...x,
});
const PREGUNTA = '¿Qué dispone el artículo 173 sobre las medidas cautelares?';
const ENV_ON = { LUNA_ENABLED: '1' };
beforeEach(() => { process.env.OPENAI_API_KEY = 'sk-test-fake'; });
afterEach(() => { delete process.env.OPENAI_API_KEY; });

function cliente(salida: unknown, uso = { input_tokens: 900, output_tokens: 120 }, extra: Partial<ClienteLuna['models']> = {}) {
  const create = vi.fn().mockResolvedValue({ output_text: typeof salida === 'string' ? salida : JSON.stringify(salida), usage: uso });
  const retrieve = vi.fn().mockImplementation(async (id: string) => ({ id }));
  const c: ClienteLuna = { responses: { create }, models: { retrieve, ...extra } };
  return { c, create, retrieve };
}
const ANSWER = (chunk = 'mayalex_normativos:cpp_a173') => ({
  decision: 'ANSWER', abstention_reason: null,
  claims: [{ claim_id: 'c1', text: 'Las medidas cautelares personales proceden cuando existan indicios racionales de participación.', citations: [{ chunk_id: chunk, support: 'DIRECT' }] }],
});

function motor(c: ClienteLuna, env: Record<string, string | undefined> = ENV_ON) {
  const registros: RegistroLuna[] = [];
  const contador: ContadorCostos = { global: true, reservar: async () => true, liquidar: async () => {} };
  const m = crearMotorLuna({ env, crearCliente: () => c, registrar: (r) => registros.push(r), contador });
  return { m, registros };
}
const entrada = (x: Partial<Parameters<ReturnType<typeof crearMotorLuna>['responder']>[0]> = {}) =>
  ({ queryId: 'q1', pregunta: PREGUNTA, fragmentos: [frag()], tier: 'free', retrievalState: 'SEMANTIC_SUCCESS' as const, ...x });

describe('Luna — configuración por plan', () => {
  it('mapea tiers de cuota a planes', () => {
    expect(planDesdeTier('free')).toBe('free');
    expect(planDesdeTier('academico')).toBe('academico');
    expect(planDesdeTier('pro')).toBe('premium');
    expect(planDesdeTier('admin')).toBe('premium');
    expect(planDesdeTier(undefined)).toBe('free');
  });
  it('los planes difieren solo por configuración y límites crecientes', () => {
    const f = resolverConfigPlan('free', {}), a = resolverConfigPlan('academico', {}), p = resolverConfigPlan('premium', {});
    expect(f.modelId).toBe(a.modelId); expect(a.modelId).toBe(p.modelId);
    expect(f.maxOutputTokens).toBeLessThan(a.maxOutputTokens); expect(a.maxOutputTokens).toBeLessThan(p.maxOutputTokens);
    expect(f.maxEvidencias).toBeLessThan(p.maxEvidencias);
    expect(f.reasoningEffort).toBe('none');
  });
  it('un modelo pedido por entorno sin tarifa registrada se rechaza y se usa el predeterminado', () => {
    const c = resolverConfigPlan('free', { LUNA_MODEL_ID: 'modelo-sin-tarifa' });
    expect(c.modelId).toBe('gpt-6-luna'); expect(c.modeloRechazado).toBe('modelo-sin-tarifa');
    expect(costoPeorCasoUsd('modelo-sin-tarifa', 10, 10)).toBe(Number.POSITIVE_INFINITY);
  });
  it('está apagada salvo LUNA_ENABLED=1', () => {
    expect(lunaHabilitadaPorEntorno({})).toBe(false);
    expect(lunaHabilitadaPorEntorno({ LUNA_ENABLED: 'true' })).toBe(false);
    expect(lunaHabilitadaPorEntorno({ LUNA_ENABLED: '1' })).toBe(true);
  });
  it('costo por consulta del peor caso cabe en el tope de cada plan', () => {
    for (const plan of ['free', 'academico', 'premium'] as const) {
      const c = resolverConfigPlan(plan, {});
      expect(costoPeorCasoUsd(c.modelId, c.maxInputTokens, c.maxOutputTokens)).toBeLessThanOrEqual(c.maxCostoConsultaUsd);
    }
  });
});

describe('Luna — solicitud a la Responses API', () => {
  it('store:false, sin tools, esquema estricto y esfuerzo del plan', () => {
    const cfg = resolverConfigPlan('premium', {});
    const req = construirSolicitudLuna({ queryId: 'q', sanitizedQuestion: PREGUNTA, evidence: [], productionOutcome: { decision: 'ANSWER', retrievalState: 'SEMANTIC_SUCCESS' } }, cfg);
    expect(req.store).toBe(false);
    expect(req.text.format.strict).toBe(true);
    expect(req.reasoning.effort).toBe('medium');
    expect(req.max_output_tokens).toBe(cfg.maxOutputTokens);
    expect(Object.keys(req)).not.toContain('tools');
    expect(Object.keys(req)).not.toContain('previous_response_id');
  });
});

describe('Luna — evidencia autorizada (clasificador CLO compartido del #106, solo lectura)', () => {
  it('solo PRIMARY sale: vigencia FALSE/NULL, jurisdicción no HN o ausente, fuente no normativa y desplazadas quedan fuera; no muta el corpus', () => {
    const base = [
      frag(),
      frag({ id: 'x2', es_norma_vigente: false }),
      frag({ id: 'x3', es_norma_vigente: null }),
      frag({ id: 'x4', jurisdiccion: 'ES' }),
      frag({ id: 'x5', jurisdiccion: null }),
      frag({ id: 'x6', fuente_tipo: 'doctrina' }),
      frag({ id: 'x7', fuente: 'Escritura de constitución de sociedad' }),
    ];
    const copia = JSON.parse(JSON.stringify(base));
    const r = autorizarEvidencia(base, 10);
    expect(r.evidencia.map((e) => e.chunk_id)).toEqual(['mayalex_normativos:cpp_a173']);
    expect(base).toEqual(copia);
  });
  it('un rol_evidencia PRIMARY que venga en la carga no se respeta: se recalcula', () => {
    const f = { ...frag({ id: 'y1', es_norma_vigente: null }), rol_evidencia: 'PRIMARY' } as FragmentoRAG;
    expect(autorizarEvidencia([f], 5).evidencia).toEqual([]);
  });
  it('sin id no hay chunk; ids duplicados se envían una vez; respeta el tope por plan', () => {
    const muchos = Array.from({ length: 9 }, (_, i) => frag({ id: `f${i}`, hash: `h${i}`, num_articulo: String(i + 1) }));
    expect(autorizarEvidencia(muchos, 4).evidencia).toHaveLength(4);
    expect(autorizarEvidencia([frag({ id: undefined })], 4).evidencia).toEqual([]);
    expect(autorizarEvidencia([frag(), frag()], 4).evidencia).toHaveLength(1);
  });
});

describe('Luna — motor', () => {
  it('ANSWER con referencia verificable resuelta desde la evidencia', async () => {
    const { c, create } = cliente(ANSWER());
    const { m, registros } = motor(c);
    const r = await m.responder(entrada());
    expect(r.estado).toBe('ANSWER');
    if (r.estado !== 'ANSWER') return;
    expect(r.texto).toContain('Codigo Procesal Penal, art. 173');
    expect(r.chunkIdsValidados).toEqual(['mayalex_normativos:cpp_a173']);
    expect(r.texto).toContain('NO OFICIAL');
    expect(r.referencias).toEqual([{ chunk_id: 'mayalex_normativos:cpp_a173', instrumento: 'Codigo Procesal Penal', articulo: '173' }]);
    expect(r.uso.costoEstimadoUsd).toBeGreaterThan(0);
    expect(r.uso.costoEstimadoUsd).toBeLessThan(0.003);
    expect(create).toHaveBeenCalledTimes(1);
    const cuerpo = create.mock.calls[0][0];
    expect(cuerpo.store).toBe(false);
    expect(JSON.stringify(registros)).not.toContain(PREGUNTA);
  });

  it('ABSTAIN dice qué falta', async () => {
    const { c } = cliente({ decision: 'ABSTAIN', claims: [], abstention_reason: 'Falta el artículo 174 y su reforma vigente.' });
    const r = await motor(c).m.responder(entrada());
    expect(r.estado).toBe('ABSTAIN');
    if (r.estado === 'ABSTAIN') expect(r.texto).toContain('Falta el artículo 174');
  });

  it('descarta una cita inventada: ANSWER sin claim sustentada → ERROR (la ruta sigue por el proveedor vigente)', async () => {
    const { c } = cliente(ANSWER('chunk-inventado'));
    const r = await motor(c).m.responder(entrada());
    expect(r).toEqual({ estado: 'ERROR', motivo: 'SALIDA_INVALIDA' });
  });

  it('salida no JSON → ERROR', async () => {
    const r = await motor(cliente('no es json').c).m.responder(entrada());
    expect(r.estado).toBe('ERROR');
  });

  it('apagada o sin credencial: SKIPPED y ninguna llamada', async () => {
    const a = cliente(ANSWER());
    expect(await motor(a.c, {}).m.responder(entrada())).toEqual({ estado: 'SKIPPED', motivo: 'DESHABILITADA' });
    delete process.env.OPENAI_API_KEY;
    expect(await motor(a.c, { LUNA_ENABLED: '1' }).m.responder(entrada())).toEqual({ estado: 'SKIPPED', motivo: 'SIN_CREDENCIAL' });
    expect(a.create).not.toHaveBeenCalled();
    expect(a.retrieve).not.toHaveBeenCalled();
  });

  it('privacidad: una pregunta con datos personales no sale al proveedor', async () => {
    const { c, create } = cliente(ANSWER());
    const r = await motor(c).m.responder(entrada({ pregunta: 'Mi DNI es 0801-1990-12345, ¿qué dice el artículo 173 del código procesal penal?' }));
    expect(r.estado).toBe('SKIPPED');
    expect(create).not.toHaveBeenCalled();
  });

  it('sin evidencia autorizada no hay llamada', async () => {
    const { c, create } = cliente(ANSWER());
    const r = await motor(c).m.responder(entrada({ fragmentos: [frag({ es_norma_vigente: null })] }));
    expect(r).toEqual({ estado: 'SKIPPED', motivo: 'EVIDENCIA_NO_ACREDITADA' });
    expect(create).not.toHaveBeenCalled();
  });

  it('modelo no disponible en la cuenta: SKIPPED, sin llamada de respuesta', async () => {
    const { c, create } = cliente(ANSWER(), undefined, { retrieve: vi.fn().mockRejectedValue(Object.assign(new Error('nf'), { status: 404 })) });
    const r = await motor(c).m.responder(entrada());
    expect(r).toEqual({ estado: 'SKIPPED', motivo: 'MODELO_NO_DISPONIBLE_EN_CUENTA' });
    expect(create).not.toHaveBeenCalled();
  });

  it('no se pudo verificar el modelo (red): fail-closed', async () => {
    const { c, create } = cliente(ANSWER(), undefined, { retrieve: vi.fn().mockRejectedValue(new Error('ECONNRESET')) });
    const r = await motor(c).m.responder(entrada());
    expect(r).toEqual({ estado: 'SKIPPED', motivo: 'MODELO_VERIFICACION_FALLIDA' });
    expect(create).not.toHaveBeenCalled();
  });

  it('presupuesto: con 0 USD no hay llamada; el gasto liquidado agota la ventana', async () => {
    const a = cliente(ANSWER());
    const cero = await motor(a.c, { ...ENV_ON, LUNA_BUDGET_USD_FREE: '0' }).m.responder(entrada());
    expect(cero).toEqual({ estado: 'SKIPPED', motivo: 'PRESUPUESTO_AGOTADO' });
    expect(a.create).not.toHaveBeenCalled();

    const b = cliente(ANSWER());
    const { m } = motor(b.c, { ...ENV_ON, LUNA_BUDGET_USD_FREE: '0.0008' });
    const resultados = [];
    for (let i = 0; i < 6; i++) resultados.push((await m.responder(entrada({ queryId: `q${i}` }))).estado);
    expect(resultados).toContain('ANSWER');
    expect(resultados.at(-1)).toBe('SKIPPED');
    expect(b.create.mock.calls.length).toBeLessThan(6);
  });

  it('error del proveedor: ERROR, y tras 5 fallos el circuito abre sin más llamadas', async () => {
    const create = vi.fn().mockRejectedValue(new Error('boom'));
    const c: ClienteLuna = { responses: { create }, models: { retrieve: async (id: string) => ({ id }) } };
    const { m } = motor(c, { ...ENV_ON, LUNA_BUDGET_USD_FREE: '100' });
    for (let i = 0; i < 5; i++) expect((await m.responder(entrada({ queryId: `e${i}` }))).estado).toBe('ERROR');
    const r = await m.responder(entrada({ queryId: 'e6' }));
    expect(r).toEqual({ estado: 'SKIPPED', motivo: 'CIRCUITO_ABIERTO' });
    expect(create).toHaveBeenCalledTimes(5);
  });

  it('respuesta sin usage no se acepta (costo desconocido)', async () => {
    const create = vi.fn().mockResolvedValue({ output_text: JSON.stringify(ANSWER()), usage: null });
    const c: ClienteLuna = { responses: { create }, models: { retrieve: async (id: string) => ({ id }) } };
    expect((await motor(c).m.responder(entrada())).estado).toBe('ERROR');
  });

  it('timeout: ERROR TIMEOUT y la señal se aborta', async () => {
    let senal: AbortSignal | undefined;
    const create = vi.fn().mockImplementation((_b: unknown, o: { signal?: AbortSignal }) => { senal = o.signal; return new Promise(() => {}); });
    const c: ClienteLuna = { responses: { create }, models: { retrieve: async (id: string) => ({ id }) } };
    vi.useFakeTimers();
    try {
      const p = motor(c).m.responder(entrada());
      await vi.advanceTimersByTimeAsync(21_000);
      expect(await p).toEqual({ estado: 'ERROR', motivo: 'TIMEOUT' });
      expect(senal?.aborted).toBe(true);
    } finally { vi.useRealTimers(); }
  });
});

describe('Luna — R3 del CLO (clasificador compartido del #106) aplicada a la respuesta', () => {
  const art10 = frag({ id: 'cpp-10', num_articulo: '10', hash: 'h10', contenido: 'ARTICULO 10.- La acción penal prescribe por el transcurso del plazo legal.' });
  const claim = (texto: string, chunk: string) => ({ decision: 'ANSWER', abstention_reason: null, claims: [{ claim_id: 'c1', text: texto, citations: [{ chunk_id: chunk, support: 'DIRECT' }] }] });
  it('cita DIRECT a un PRIMARY TRUE de OTRO artículo → ABSTAIN que dice qué falta', async () => {
    const { c } = cliente(claim('La acción penal prescribe por el transcurso del plazo legal.', 'cpp-10'));
    const r = await motor(c).m.responder(entrada({ fragmentos: [frag(), art10], pregunta: '¿Qué dispone el artículo 173 del Código Procesal Penal?' }));
    expect(r.estado).toBe('ABSTAIN');
    if (r.estado === 'ABSTAIN') expect(r.texto).toContain('mismo instrumento y artículo consultados');
  });
  it('la cita DIRECT no respalda la afirmación concreta (cifra distinta) → ABSTAIN', async () => {
    const { c } = cliente(claim('Las medidas cautelares personales proceden cuando la pena excede los diez años.', 'mayalex_normativos:cpp_a173'));
    const r = await motor(c).m.responder(entrada());
    expect(r.estado).toBe('ABSTAIN');
    if (r.estado === 'ABSTAIN') expect(r.texto).toContain('no respalda lo que afirma');
  });
  it('un solo fragmento basta: no se impone un mínimo de dos', async () => {
    const { c } = cliente(ANSWER());
    const r = await motor(c).m.responder(entrada({ fragmentos: [frag()] }));
    expect(r.estado).toBe('ANSWER');
  });
  it('solo la afirmación que cumple R3 se muestra; la no respaldada se omite', async () => {
    const { c } = cliente({ decision: 'ANSWER', abstention_reason: null, claims: [
      ...ANSWER().claims,
      { claim_id: 'c2', text: 'El imputado puede recusar al juez por parcialidad manifiesta.', citations: [{ chunk_id: 'mayalex_normativos:cpp_a173', support: 'DIRECT' }] },
    ] });
    const r = await motor(c).m.responder(entrada());
    expect(r.estado).toBe('ANSWER');
    if (r.estado === 'ANSWER') expect(r.texto).not.toContain('recusar');
  });
  it('antes de llamar: sin PRIMARY del artículo consultado no se invoca a OpenAI', async () => {
    const { c, create } = cliente(ANSWER());
    const r = await motor(c).m.responder(entrada({ fragmentos: [art10], pregunta: '¿Qué dispone el artículo 173 del Código Procesal Penal?' }));
    expect(r).toEqual({ estado: 'SKIPPED', motivo: 'EVIDENCIA_NO_ACREDITADA' });
    expect(create).not.toHaveBeenCalled();
  });
});

describe('Luna — validación de modelo y cola de incorporación', () => {
  it('la validación positiva se cachea', async () => {
    const retrieve = vi.fn().mockImplementation(async (id: string) => ({ id }));
    const v = crearValidadorModelo();
    const cl = { models: { retrieve } };
    expect(await v.validar('gpt-6-luna', cl)).toEqual({ disponible: true });
    await v.validar('gpt-6-luna', cl);
    expect(retrieve).toHaveBeenCalledTimes(1);
  });
  it('el candidato de incorporación es solo un registro en memoria pendiente de revisión humana', () => {
    const c = construirCandidato({ queryId: 'q', fuenteUrl: 'https://example.invalid/x', fuenteNombre: 'CEDIJ', titulo: 'Ley X' }, () => new Date('2026-10-29T00:00:00Z'));
    expect(c.estado).toBe('PENDIENTE_REVISION_HUMANA');
    expect(Object.isFrozen(c)).toBe(true);
  });
});
