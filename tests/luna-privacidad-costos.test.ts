import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { FragmentoRAG } from '@/lib/legal-retrieval/types';
import { privacidadConsultaGeneral } from '@/lib/luna/privacy';
import { AVISO_LUNA_VERSION, MODALIDAD_CONSULTA_GENERAL, evaluarConsentimientoLuna } from '@/lib/luna/consent';
import { citasValidadasDeLuna } from '@/lib/luna/citas';
import { auditarPayload, construirSolicitudLuna, type ClienteLuna } from '@/lib/luna/adapter';
import { resolverConfigPlan } from '@/lib/luna/config';
import { crearContadorLocalCanary, crearContadorSupabase, aMicroUsd, RPC_RESERVAR, RPC_LIQUIDAR, type ClienteRpc } from '@/lib/luna/cost-counter';
import { crearMotorLuna, type RegistroLuna } from '@/lib/luna/engine';
import { CONFIRMACION, main, verificarModelo } from '@/scripts/luna-verify-model';

const frag = (x: Partial<FragmentoRAG> = {}): FragmentoRAG => ({
  id: 'mayalex_normativos:cpp_a173', contenido: 'ARTICULO 173.- Texto sintético de prueba.', num_articulo: '173',
  fuente: 'Codigo Procesal Penal', relevancia: 0.9, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, hash: 'abcd1234', ...x,
});

describe('privacidad de la consulta jurídica general — casos que PASAN (abstractos y públicos)', () => {
  it.each([
    '¿Qué dispone el artículo 173 del Código Procesal Penal sobre las medidas cautelares?',
    '¿Cuál es el plazo de prescripción de la acción penal según el Código Penal de Honduras?',
    '¿Qué requisitos exige el Código del Notariado para el otorgamiento de un poder?',
    '¿Cómo regula el Código de Comercio la sociedad de responsabilidad limitada?',
    'Explica la diferencia entre nulidad absoluta y nulidad relativa en el Código Civil.',
    '¿Qué establece el Decreto 353-2005 sobre el protocolo notarial?',
  ])('PASS: %s', (q) => {
    expect(privacidadConsultaGeneral(q)).toEqual({ estado: 'PASS' });
  });
});

describe('privacidad de la consulta jurídica general — casos que se RECHAZAN sin llamar a OpenAI', () => {
  it.each([
    ['nombre propio', 'Mi cliente Juan Carlos Pérez Martínez quiere demandar, ¿qué dice el Código Civil?', /./],
    ['nombre propio sin "mi"', '¿Qué dice el Código Civil si Roberto Mejía vende un inmueble?', /./],
    ['RTN', '¿Qué dice el Código Tributario sobre el RTN 08011990123456?', /./],
    ['DNI', '¿Qué dice el artículo 10 del código civil para el DNI 0801-1990-12345?', /./],
    ['número de expediente', '¿Qué plazo tiene el recurso en el expediente 0801-2024-00123 según el Código Procesal Civil?', /./],
    ['número de caso corto', '¿Qué plazo prevé el Código Procesal Penal en la causa No. 456?', /NUMERO_DE_CASO|BASE_/],
    ['monto en lempiras', '¿Qué prevé el Código Civil si la deuda es de L. 150,000?', /MONTO|BASE_/],
    ['monto en dólares', '¿Qué dice el Código de Comercio sobre un contrato por $5000?', /MONTO|BASE_/],
    ['monto con palabra', '¿Qué dice el Código de Comercio sobre un préstamo por 20 mil lempiras?', /MONTO|BASE_/],
    ['fecha concreta', '¿Qué dice el Código Procesal Penal de una detención el 15 de marzo de 2024?', /FECHA|BASE_/],
    ['fecha numérica', '¿Qué plazo da el Código Civil si firmé el 12/03/2024?', /./],
    ['fecha relativa', '¿Qué dice el Código del Trabajo sobre un despido ayer?', /FECHA|PRIMERA|BASE_/],
    ['primera persona (hechos propios)', 'Me despidieron sin causa, ¿qué dice el Código del Trabajo?', /PRIMERA_PERSONA|BASE_/],
    ['primera persona verbo', 'Quiero vender mi casa, ¿qué exige el Código Civil?', /PRIMERA_PERSONA|BASE_/],
    ['pretérito 1.ª persona', '¿Qué dice el Código Civil sobre el contrato que firmé con el arrendador?', /PRIMERA_PERSONA|PRETERITO|BASE_/],
    ['correo', '¿Qué dice el Código Civil? Escríbeme a persona@correo.com', /./],
    ['teléfono', '¿Qué dice el Código Civil? Llámame al 9988-7766', /./],
    ['texto multilínea', '¿Qué dice el Código Civil?\nY el Código Penal?', /./],
  ])('REJECT %s', (_n, q, razon) => {
    const r = privacidadConsultaGeneral(q);
    expect(r.estado).toBe('REJECT');
    if (r.estado === 'REJECT') {
      expect(r.razon).toMatch(razon);
      // La razón es un código: nunca contiene el texto ni el dato.
      expect(r.razon).not.toMatch(/Pérez|Mejía|0801|persona@|9988|150,000/);
    }
  });
  it('entradas inválidas fallan cerrado', () => {
    for (const x of [undefined, null, 5, '', '   ', {}]) expect(privacidadConsultaGeneral(x).estado).toBe('REJECT');
  });
});

describe('modalidad explícita y aviso de privacidad', () => {
  const ok = { modalidad: MODALIDAD_CONSULTA_GENERAL, aceptado: true, aviso_version: AVISO_LUNA_VERSION };
  it('solo modalidad + aceptado===true + versión vigente', () => {
    expect(evaluarConsentimientoLuna(ok)).toEqual({ ok: true });
    expect(evaluarConsentimientoLuna(undefined)).toEqual({ ok: false, motivo: 'NO_SOLICITADA' });
    expect(evaluarConsentimientoLuna({ ...ok, modalidad: 'otra' })).toEqual({ ok: false, motivo: 'NO_SOLICITADA' });
    for (const aceptado of [false, 'true', 1, undefined, null]) expect(evaluarConsentimientoLuna({ ...ok, aceptado })).toEqual({ ok: false, motivo: 'AVISO_NO_ACEPTADO' });
    expect(evaluarConsentimientoLuna({ ...ok, aviso_version: 'vieja' })).toEqual({ ok: false, motivo: 'AVISO_VERSION_DISTINTA' });
  });
});

describe('citas del SSE: solo las validadas por Luna', () => {
  const a = frag({ id: 'a', num_articulo: '1' });
  const b = frag({ id: 'b', num_articulo: '2' });
  const c = frag({ id: 'c', num_articulo: '3', es_norma_vigente: null });
  it('convierte al contrato Cita del frontend y omite lo no validado', () => {
    const citas = citasValidadasDeLuna([a, b, c], ['a']);
    expect(citas).toEqual([{ articulo: '1', texto: a.contenido, fuente: 'Codigo Procesal Penal', vigente: true, hash: 'abcd1234' }]);
    expect(citas.some((x) => x.articulo === '2')).toBe(false);
    expect(citasValidadasDeLuna([a, b], [])).toEqual([]);
  });
  it('un id validado cuyo fragmento no es PRIMARY tampoco aparece', () => {
    expect(citasValidadasDeLuna([c], ['c'])).toEqual([]);
  });
});

describe('payload mínimo y registro de que no lleva PII', () => {
  const entrada = (q: string) => ({
    queryId: 'q', sanitizedQuestion: q, productionOutcome: { decision: 'ANSWER' as const, retrievalState: 'SEMANTIC_SUCCESS' as const },
    evidence: [{ chunk_id: 'a', instrumento: 'Codigo Procesal Penal', articulo: '173', gaceta: null, rol: 'PRIMARY' as const, citable: true, texto: 'ARTICULO 173.- ...' }],
  });
  const cfg = resolverConfigPlan('free', {});
  it('el cuerpo solo lleva pregunta y fragmentos normativos; sin historial, archivos, tools, usuario ni sesión', () => {
    const cuerpo = construirSolicitudLuna(entrada('¿Qué dispone el artículo 173 del Código Procesal Penal?'), cfg);
    expect(Object.keys(cuerpo).sort()).toEqual(['input', 'instructions', 'max_output_tokens', 'model', 'reasoning', 'store', 'text']);
    const input = JSON.parse(cuerpo.input);
    expect(Object.keys(input).sort()).toEqual(['evidence', 'question']);
    expect(Object.keys(input.evidence[0]).sort()).toEqual(['articulo', 'chunk_id', 'gaceta', 'instrumento', 'texto']);
    const a = auditarPayload(cuerpo);
    expect(a).toMatchObject({ ok: true, campos: ['evidence', 'question'], evidencias: 1, pii: 'SIN_PII_DETECTADA' });
  });
  it('un payload con pregunta con PII o con un campo extra no se audita (no se envía)', () => {
    expect(auditarPayload(construirSolicitudLuna(entrada('Mi DNI es 0801-1990-12345 y el artículo 173'), cfg)).pii).toBe('PII_O_DATOS_DE_CASO_DETECTADOS');
    const sucio = { ...construirSolicitudLuna(entrada('¿Qué dispone el artículo 173 del Código Procesal Penal?'), cfg), previous_response_id: 'x' } as never;
    expect(auditarPayload(sucio)).toMatchObject({ ok: false, pii: 'PAYLOAD_NO_VALIDO' });
  });
  it('el motor deja el registro con la auditoría y SIN la pregunta ni el texto', async () => {
    process.env.OPENAI_API_KEY = 'sk-test-fake';
    const create = vi.fn().mockResolvedValue({ output_text: JSON.stringify({ decision: 'ABSTAIN', claims: [], abstention_reason: 'falta' }), usage: { input_tokens: 500, output_tokens: 20 } });
    const cliente: ClienteLuna = { responses: { create }, models: { retrieve: async (id: string) => ({ id }) } };
    const registros: RegistroLuna[] = [];
    const m = crearMotorLuna({ env: { LUNA_ENABLED: '1' }, crearCliente: () => cliente, registrar: (r) => registros.push(r), contador: crearContadorLocalCanary(() => '2026-10-29') });
    const pregunta = '¿Qué dispone el artículo 173 del Código Procesal Penal?';
    await m.responder({ queryId: 'q', pregunta, fragmentos: [frag()], tier: 'free', retrievalState: 'SEMANTIC_SUCCESS' });
    delete process.env.OPENAI_API_KEY;
    expect(registros[0].payload).toMatchObject({ ok: true, pii: 'SIN_PII_DETECTADA', campos: ['evidence', 'question'] });
    expect(registros[0].contadorGlobal).toBe(false);
    const dump = JSON.stringify(registros);
    expect(dump).not.toContain(pregunta);
    expect(dump).not.toContain('Texto sintético');
  });
});

describe('suficiencia: ni un conteo de PRIMARY ni un estado ajeno bastan', () => {
  beforeEach(() => { process.env.OPENAI_API_KEY = 'sk-test-fake'; });
  afterEach(() => { delete process.env.OPENAI_API_KEY; });
  const armar = (estado: string, salida: unknown) => {
    const create = vi.fn().mockResolvedValue({ output_text: JSON.stringify(salida), usage: { input_tokens: 500, output_tokens: 50 } });
    const cliente: ClienteLuna = { responses: { create }, models: { retrieve: async (id: string) => ({ id }) } };
    const m = crearMotorLuna({ env: { LUNA_ENABLED: '1' }, crearCliente: () => cliente, registrar: () => {}, contador: crearContadorLocalCanary(() => 'd') });
    return { create, responder: () => m.responder({ queryId: 'q', pregunta: '¿Qué dispone el artículo 173 del Código Procesal Penal?', fragmentos: [frag()], tier: 'free', retrievalState: estado as never }) };
  };
  it.each(['OFFICIAL_FALLBACK_REQUIRED', 'NO_VERIFIED_EVIDENCE', 'RETRIEVAL_ERROR', undefined])('estado %s → no hay llamada', async (estado) => {
    const t = armar(estado as string, {});
    expect(await t.responder()).toEqual({ estado: 'SKIPPED', motivo: 'EVIDENCIA_NO_ACREDITADA' });
    expect(t.create).not.toHaveBeenCalled();
  });
  it('un PRIMARY recuperado pero solo citado como INDIRECT no produce respuesta', async () => {
    const t = armar('SEMANTIC_SUCCESS', { decision: 'ANSWER', abstention_reason: null, claims: [{ claim_id: 'c', text: 'x', citations: [{ chunk_id: 'mayalex_normativos:cpp_a173', support: 'INDIRECT' }] }] });
    expect((await t.responder()).estado).toBe('ERROR');
  });
  it('un INDIRECT junto a un DIRECT no se cita como fundamento', async () => {
    const dos = [frag(), frag({ id: 'otro', num_articulo: '174', hash: 'h2' })];
    const create = vi.fn().mockResolvedValue({ output_text: JSON.stringify({ decision: 'ANSWER', abstention_reason: null, claims: [{ claim_id: 'c', text: 'regla', citations: [{ chunk_id: dos[0].id!, support: 'DIRECT' }, { chunk_id: 'otro', support: 'INDIRECT' }] }] }), usage: { input_tokens: 500, output_tokens: 50 } });
    const m = crearMotorLuna({ env: { LUNA_ENABLED: '1' }, crearCliente: () => ({ responses: { create }, models: { retrieve: async (id: string) => ({ id }) } }), registrar: () => {}, contador: crearContadorLocalCanary(() => 'd') });
    const r = await m.responder({ queryId: 'q', pregunta: '¿Qué dispone el artículo 173 del Código Procesal Penal?', fragmentos: dos, tier: 'free', retrievalState: 'EXACT_SUCCESS' });
    expect(r.estado).toBe('ANSWER');
    if (r.estado === 'ANSWER') expect(r.chunkIdsValidados).toEqual([dos[0].id]);
  });
  it('el privacy gate estricto corta antes de OpenAI (cliente nunca creado)', async () => {
    const crearCliente = vi.fn();
    const m = crearMotorLuna({ env: { LUNA_ENABLED: '1' }, crearCliente, registrar: () => {}, contador: crearContadorLocalCanary(() => 'd') });
    const r = await m.responder({ queryId: 'q', pregunta: 'Mi cliente Juan Pérez firmó un contrato por L. 5,000 el 3 de mayo de 2024, ¿qué dice el Código Civil?', fragmentos: [frag()], tier: 'free', retrievalState: 'SEMANTIC_SUCCESS' });
    expect(r.estado).toBe('SKIPPED');
    expect(crearCliente).not.toHaveBeenCalled();
  });
});

describe('contador global de costos', () => {
  const dia = () => '2026-10-29';
  it('micro-USD enteros', () => { expect(aMicroUsd(0.0013)).toBe(1300); });
  it('Supabase: reserva y liquidación vía RPC; error o respuesta distinta de true = no hay llamada', async () => {
    const llamadas: [string, Record<string, unknown>][] = [];
    const cliente = (data: unknown, error: { message: string } | null = null): ClienteRpc => ({ rpc: async (fn, args) => { llamadas.push([fn, args]); return { data, error }; } });
    expect(await crearContadorSupabase(() => cliente(true), dia).reservar('free', 1300, 1_000_000)).toBe(true);
    expect(llamadas[0]).toEqual([RPC_RESERVAR, { p_dia: '2026-10-29', p_plan: 'free', p_micro_usd: 1300, p_tope_micro_usd: 1_000_000 }]);
    expect(await crearContadorSupabase(() => cliente(false), dia).reservar('free', 1300, 1_000_000)).toBe(false);
    expect(await crearContadorSupabase(() => cliente(null, { message: 'function does not exist' }), dia).reservar('free', 1, 10)).toBe(false);
    expect(await crearContadorSupabase(() => { throw new Error('sin red'); }, dia).reservar('free', 1, 10)).toBe(false);
    expect(await crearContadorSupabase(() => cliente(true), dia).reservar('free', 1, 0)).toBe(false);
    await crearContadorSupabase(() => cliente(true), dia).liquidar('free', 1300, 150);
    expect(llamadas.at(-1)).toEqual([RPC_LIQUIDAR, { p_dia: '2026-10-29', p_plan: 'free', p_delta_micro_usd: -1150 }]);
  });
  it('dos instancias del motor comparten el tope cuando el contador es el mismo almacén (el local en memoria NO es global)', async () => {
    process.env.OPENAI_API_KEY = 'sk-test-fake';
    let gastado = 0;
    const compartido = { global: true, reservar: async (_p: string, m: number, t: number) => (gastado + m <= t ? ((gastado += m), true) : false), liquidar: async () => {} };
    const create = vi.fn().mockResolvedValue({ output_text: JSON.stringify({ decision: 'ABSTAIN', claims: [], abstention_reason: 'x' }), usage: { input_tokens: 500, output_tokens: 20 } });
    const mk = () => crearMotorLuna({ env: { LUNA_ENABLED: '1', LUNA_BUDGET_USD_FREE: '0.0008' }, crearCliente: () => ({ responses: { create }, models: { retrieve: async (id: string) => ({ id }) } }), registrar: () => {}, contador: compartido });
    const a = mk(), b = mk();
    const e = { queryId: 'q', pregunta: '¿Qué dispone el artículo 173 del Código Procesal Penal?', fragmentos: [frag()], tier: 'free', retrievalState: 'SEMANTIC_SUCCESS' as const };
    const res = [(await a.responder(e)).estado, (await b.responder(e)).estado, (await a.responder(e)).estado, (await b.responder(e)).estado];
    delete process.env.OPENAI_API_KEY;
    expect(res.filter((x) => x === 'SKIPPED').length).toBeGreaterThan(0);
    expect(create.mock.calls.length).toBeLessThan(4);
    const local = crearContadorLocalCanary(dia);
    expect(local.global).toBe(false);
  });
  it('sin DDL aplicado (RPC inexistente) y sin modo canary, Luna falla cerrada', async () => {
    process.env.OPENAI_API_KEY = 'sk-test-fake';
    const create = vi.fn();
    const m = crearMotorLuna({ env: { LUNA_ENABLED: '1' }, crearCliente: () => ({ responses: { create }, models: { retrieve: async (id: string) => ({ id }) } }), registrar: () => {}, contador: crearContadorSupabase(() => ({ rpc: async () => ({ data: null, error: { message: 'no existe' } }) }), dia) });
    const r = await m.responder({ queryId: 'q', pregunta: '¿Qué dispone el artículo 173 del Código Procesal Penal?', fragmentos: [frag()], tier: 'free', retrievalState: 'SEMANTIC_SUCCESS' });
    delete process.env.OPENAI_API_KEY;
    expect(r).toEqual({ estado: 'SKIPPED', motivo: 'PRESUPUESTO_GLOBAL_AGOTADO' });
    expect(create).not.toHaveBeenCalled();
  });
});

describe('script de verificación real: no se ejecuta sin el sí de Fredy', () => {
  it('sin confirmación o sin clave: código 2 y ninguna llamada', async () => {
    const crear = vi.fn();
    const out: string[] = [];
    expect(await main([], {}, crear as never, (t) => out.push(t))).toBe(2);
    delete process.env.OPENAI_API_KEY;
    expect(await main([], { LUNA_VERIFY_CONFIRM: CONFIRMACION }, crear as never, (t) => out.push(t))).toBe(2);
    expect(crear).not.toHaveBeenCalled();
    expect(out.join(' ')).toContain('No se hizo ninguna llamada');
  });
  it('con cliente simulado prueba none/low/medium con esquema estricto y store:false, y marca NO_SOPORTADO un esfuerzo rechazado (400)', async () => {
    const llamadas: { effort: string; store: boolean; strict: boolean }[] = [];
    const ok = { decision: 'ANSWER', abstention_reason: null, claims: [{ claim_id: 'c', text: 'rige desde su publicación', citations: [{ chunk_id: 'sintetico:a1', support: 'DIRECT' }] }] };
    const cliente: ClienteLuna = {
      models: { retrieve: async (id: string) => ({ id }) },
      responses: { create: async (b) => {
        llamadas.push({ effort: b.reasoning.effort, store: b.store, strict: b.text.format.strict });
        if (b.reasoning.effort === 'medium') throw Object.assign(new Error('bad'), { status: 400 });
        return { output_text: JSON.stringify(ok), usage: { input_tokens: 400, output_tokens: 60 } };
      } },
    };
    const inf = await verificarModelo(cliente, 'gpt-6-luna');
    expect(inf.tarifaRegistrada).toBe(true);
    expect(llamadas.map((l) => l.effort)).toEqual(['none', 'low', 'medium']);
    expect(llamadas.every((l) => l.store === false && l.strict)).toBe(true);
    expect(inf.esfuerzos.map((e) => e.estado)).toEqual(['OK', 'OK', 'NO_SOPORTADO']);
    expect(inf.esfuerzos[0].costoEstimadoUsd).toBeGreaterThan(0);
    expect(inf.nota).toContain('ESTIMADOS');
  });
});

describe('no se duplican reglas del #106 en lib/luna', () => {
  it('lib/luna no evalúa vigencia, jurisdicción ni fuente_tipo: eso es del clasificador compartido', () => {
    const dir = join(process.cwd(), 'lib', 'luna');
    for (const n of readdirSync(dir)) {
      const t = readFileSync(join(dir, n), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      expect(t, n).not.toMatch(/es_norma_vigente|jurisdiccion|fuente_tipo|evaluarCorpusPublico/);
    }
  });
});

describe('Luna no escribe en el corpus ni en datos de clientes', () => {
  it('lib/luna no usa insert/update/delete/upsert ni nombra tablas del corpus, pagos o suscripciones', () => {
    const dir = join(process.cwd(), 'lib', 'luna');
    for (const n of readdirSync(dir)) {
      const t = readFileSync(join(dir, n), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      expect(t, n).not.toMatch(/\.(insert|update|delete|upsert)\s*\(|biblioteca_vectores|suscripcion|paypal|\.from\s*\(/i);
    }
  });
});
