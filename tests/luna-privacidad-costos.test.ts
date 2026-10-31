import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { FragmentoRAG } from '@/lib/legal-retrieval/types';
import { privacidadConsultaGeneral } from '@/lib/luna/privacy';
import { AVISO_LUNA_VERSION, MODALIDAD_CONSULTA_GENERAL, evaluarConsentimientoLuna } from '@/lib/luna/consent';
import { citasValidadasDeLuna } from '@/lib/luna/citas';
import { auditarPayload, construirSolicitudLuna, type ClienteLuna } from '@/lib/luna/adapter';
import { lunaHabilitadaPorEntorno, resolverConfigPlan, contadorLocalPermitido, esPreviewODesarrollo, PRESUPUESTO_PREVIEW_USD, MAX_DURO_CONSULTA_USD, MAX_DURO_DIA_USD } from '@/lib/luna/config';
import { crearContadorLocalCanary, crearContadorSupabase, aMicroUsd, RPC_RESERVAR, RPC_LIQUIDAR, type ClienteRpc } from '@/lib/luna/cost-counter';
import { crearMotorLuna, type RegistroLuna } from '@/lib/luna/engine';
import { CONFIRMACION, CONFIRMACION_LISTA, TOPE_ENSAYO_USD, listarModelosDeCuenta, main, planDeEnsayo, resolverTope, verificarModelo } from '@/scripts/luna-verify-model';
import { costoRealUsd, tarifaDeModelo } from '@/lib/luna/pricing';

const frag = (x: Partial<FragmentoRAG> = {}): FragmentoRAG => ({
  id: 'mayalex_normativos:cpp_a173', contenido: 'ARTICULO 173.- Las medidas cautelares personales proceden cuando existan indicios racionales de participación.', num_articulo: '173',
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

describe('fail-closed: si no se puede clasificar como consulta general con seguridad, NO sale', () => {
  it.each([
    ['nombre en minúscula', '¿Qué dice el Código Civil si zacarias quiroz vende un inmueble?'],
    ['dos nombres en minúscula', '¿Qué plazo establece el Código del Trabajo para wenceslao maldonado?'],
    ['nombre tras tratamiento', '¿Qué obligaciones impone el Código de Comercio a don ramiro?'],
    ['hechos en tercera persona (pretérito)', '¿Qué dice el Código del Trabajo si el patrono despidió al empleado sin causa?'],
    ['hechos en tercera persona (plural)', '¿Qué prevé el Código Penal cuando dos personas robaron un vehículo?'],
    ['relato con "fue"', '¿Qué dice el Código Procesal Penal de una persona que fue detenida sin orden?'],
    ['persona concreta por rol', '¿Qué dice el Código Civil sobre el contrato del cliente garcia?'],
    ['nombre tras "llamado"', '¿Qué dice el Código Civil sobre un vendedor llamado osorio?'],
  ])('REJECT %s', (_n, q) => {
    const r = privacidadConsultaGeneral(q);
    expect(r.estado).toBe('REJECT');
    if (r.estado === 'REJECT') expect(r.razon).not.toMatch(/zacarias|quiroz|osorio|garcia|ramiro/i);
  });
  it.each([
    '¿Qué obligaciones tiene el arrendador según el Código Civil?',
    '¿Qué debe hacer un patrono para despedir a un trabajador según el Código del Trabajo?',
    '¿Cuándo procede la prisión preventiva en el proceso penal hondureño?',
  ])('sigue PASS (abstracta, tiempo presente): %s', (q) => {
    expect(privacidadConsultaGeneral(q)).toEqual({ estado: 'PASS' });
  });
});

describe('interruptor de la interfaz: apagado por defecto, consentimiento versionado, aviso sin aprobar', () => {
  it('sin aprobación del CLO no se envía ningún campo, aunque el usuario active y acepte', async () => {
    const { construirCampoLuna, INTERRUPTOR_LUNA_INICIAL, AVISO_LUNA_AUTORIZADO_POR_PROPIETARIO } = await import('@/lib/luna/consent');
    expect(AVISO_LUNA_AUTORIZADO_POR_PROPIETARIO).toBe(false);
    expect(INTERRUPTOR_LUNA_INICIAL).toEqual({ activo: false, aceptado: false });
    expect(construirCampoLuna({ activo: true, aceptado: true })).toBeUndefined();
  });
  it('con aprobación: solo activo + aceptado produce el campo, con la versión vigente', async () => {
    const { construirCampoLuna } = await import('@/lib/luna/consent');
    expect(construirCampoLuna({ activo: true, aceptado: false }, true)).toBeUndefined();
    expect(construirCampoLuna({ activo: false, aceptado: true }, true)).toBeUndefined();
    expect(construirCampoLuna({ activo: true, aceptado: true }, true)).toEqual({ modalidad: MODALIDAD_CONSULTA_GENERAL, aceptado: true, aviso_version: AVISO_LUNA_VERSION });
  });
  it('el borrador del aviso en docs/ contiene el texto del código y el estado «sin aprobar»', async () => {
    const { AVISO_LUNA_TEXTO } = await import('@/lib/luna/consent');
    const doc = readFileSync(join(process.cwd(), 'docs', 'luna', 'AVISO_LUNA_BORRADOR.md'), 'utf8');
    expect(doc).toContain(AVISO_LUNA_TEXTO);
    expect(doc).toContain(AVISO_LUNA_VERSION);
    expect(doc).toMatch(/BORRADOR/);
  });
  it('ChatInterface importa el interruptor solo vía consent y no incrusta el texto del aviso', () => {
    const ui = readFileSync(join(process.cwd(), 'components', 'ChatInterface.tsx'), 'utf8');
    expect(ui).toContain('construirCampoLuna');
    expect(ui).toContain('AVISO_LUNA_AUTORIZADO_POR_PROPIETARIO');
    expect(ui).not.toContain('Consulta jurídica general: tu pregunta');
  });
});

describe('auditoría 3: typo del vocabulario y topónimos afinados (institucionales pasan; lugares de un caso no)', () => {
  it('el vocabulario extra reconoce «tutela» y «adopcion» como términos jurídicos (typo «tuadopcion» corregido)', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('lib/luna/privacy.ts', 'utf8');
    expect(src).not.toContain('tuadopcion');
    expect(src).toMatch(/tutela\|adopcion/);
  });
  it.each([
    '¿Qué competencia territorial tiene un juzgado de letras de olancho según el Código Procesal Penal?',
    '¿Cómo se organiza el Registro de la Propiedad de Tegucigalpa según el Código Civil?',
    '¿Cuál es la competencia de la corte de apelaciones de comayagua en materia penal?',
    '¿Qué funciones tiene la municipalidad de Choluteca según la ley?',
    '¿Qué dice el Código de Familia sobre la tutela y la adopción de menores?',
  ])('PASS (pregunta abstracta sobre una institución): %s', (q) => {
    expect(privacidadConsultaGeneral(q), q).toEqual({ estado: 'PASS' });
  });
  it.each([
    '¿Qué dice el Código Penal sobre un delito cometido en Olancho?',
    '¿Qué prevé el Código Civil para un vecino demandado en el juzgado de Olancho?',
    '¿Qué dice el Código Procesal Penal si alguien es acusado ante el juzgado de letras de Olancho?',
    '¿Qué prevé el Código Civil si una persona que vive en la aldea el ocotal es demandada ante el juzgado?',
    'una persona de olancho es demandada ante el juzgado de letras',
    '¿Qué dice el Código Penal sobre lo ocurrido en el municipio de choluteca?',
    '¿Qué dice el Código de Familia de un trámite en la colonia las flores ante la alcaldía?',
  ])('REJECT (lugar de un caso, aunque aparezca una institución): %s', (q) => {
    expect(privacidadConsultaGeneral(q).estado, q).toBe('REJECT');
  });
});

describe('privacidad: lugar de un caso y persona indefinida con condición procesal', () => {
  it.each([
    'alguien que vive en la aldea el ocotal es demandado',
    '¿Qué pasa si alguien que vive en la aldea El Ocotal es demandado?',
    '¿Qué dice el Código Civil si alguien que vive en la colonia las flores es demandado?',
    'una persona que reside en el barrio la granja es acusada, ¿qué dice el Código Penal?',
    '¿Qué derechos tiene un vecino de la aldea el ocotal si lo demandan según el Código Civil?',
    '¿Qué dice el Código Penal si alguien de tegucigalpa es denunciado?',
    '¿Qué dice el Código Civil sobre un inmueble ubicado en el caserío los pinos?',
    '¿Qué prevé el Código Procesal Penal si fulano es detenido en el municipio de choluteca?',
  ])('REJECT: %s', (q) => {
    const r = privacidadConsultaGeneral(q);
    expect(r.estado).toBe('REJECT');
    if (r.estado === 'REJECT') expect(r.razon).not.toMatch(/ocotal|granja|pinos|tegucigalpa|choluteca/i);
  });
  it.each([
    'una persona del ocotal es demandada',
    'un señor de el ocotal es demandado',
    'una persona de olancho es demandada',
    '¿Qué prevé el Código Civil si una persona de olancho es demandada?',
    '¿Qué prevé el Código Civil si una mujer de la montaña es demandada por deudas?',
    '¿Qué dice el Código Penal si un joven de el progreso fue detenido?',
    '¿Qué dice el Código Civil si alguien de choluteca fue demandado?',
    'una señora del barrio es acusada, ¿qué dice el Código Penal?',
    '¿Qué prevé el Código de Trabajo si un trabajador de san pedro sula es despedido?',
    'un vecino de copan esta siendo procesado, ¿qué dice el Código Procesal Penal?',
  ])('REJECT (persona indefinida + lugar + acción procesal, fail-closed): %s', (q) => {
    const r = privacidadConsultaGeneral(q);
    expect(r.estado).toBe('REJECT');
    if (r.estado === 'REJECT') expect(r.razon).not.toMatch(/ocotal|olancho|choluteca|copan|progreso/i);
  });
  it('lo abstracto sobre domicilio o residencia sigue pasando', () => {
    expect(privacidadConsultaGeneral('¿Qué dice el Código Civil sobre el domicilio de las personas?')).toEqual({ estado: 'PASS' });
    expect(privacidadConsultaGeneral('¿Qué obligaciones tiene el arrendador según el Código Civil?')).toEqual({ estado: 'PASS' });
  });
});

describe('M-2 (auditoría): flag_luna_responses con bandera encendida y lista vacía = CERRADO para todos', () => {
  const fresh = async (row: { enabled: boolean; allowed_emails: string[] | null } | null) => {
    vi.resetModules();
    const chain: any = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: row, error: null }) };
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => ({ from: () => chain }) }));
    return import('@/lib/flags');
  };
  it('enabled=true y allowed_emails vacío/nulo/solo espacios → false para todos, incluido un correo cualquiera', async () => {
    for (const lista of [[], null, ['  ', '']]) {
      const { isFlagEnabledForUser } = await fresh({ enabled: true, allowed_emails: lista as string[] });
      expect(await isFlagEnabledForUser('flag_luna_responses', 'cualquiera@x.com')).toBe(false);
      expect(await isFlagEnabledForUser('flag_luna_responses', null)).toBe(false);
    }
  });
  it('con correos nombrados solo abre para ellos (sin distinguir mayúsculas ni espacios)', async () => {
    const { isFlagEnabledForUser } = await fresh({ enabled: true, allowed_emails: [' Prueba@X.com '] });
    expect(await isFlagEnabledForUser('flag_luna_responses', 'prueba@x.com')).toBe(true);
    expect(await isFlagEnabledForUser('flag_luna_responses', 'otro@x.com')).toBe(false);
  });
  it('enabled=false o fila ausente → false; y las demás banderas conservan «lista vacía = activación amplia»', async () => {
    expect(await (await fresh({ enabled: false, allowed_emails: ['a@b.com'] })).isFlagEnabledForUser('flag_luna_responses', 'a@b.com')).toBe(false);
    expect(await (await fresh(null)).isFlagEnabledForUser('flag_luna_responses', 'a@b.com')).toBe(false);
    expect(await (await fresh({ enabled: true, allowed_emails: [] })).isFlagEnabledForUser('flag_rerank', 'a@b.com')).toBe(true);
  });
});

describe('topes duros en código, producción y contador local', () => {
  it('los topes duros son los del CLO y la configuración por defecto de cada plan los respeta', () => {
    expect(MAX_DURO_CONSULTA_USD).toBe(0.01);
    expect(MAX_DURO_DIA_USD).toBe(5);
    for (const plan of ['free', 'academico', 'premium'] as const) {
      const c = resolverConfigPlan(plan, {});
      expect(c.invalida).toBeUndefined();
      expect(c.maxCostoConsultaUsd).toBeLessThanOrEqual(0.01);
      expect(c.presupuestoDiarioUsd).toBeLessThanOrEqual(5);
    }
  });
  it.each([
    ['por consulta', { LUNA_MAX_QUERY_USD_PREMIUM: '0.02' }],
    ['por día', { LUNA_BUDGET_USD_PREMIUM: '5.01' }],
    ['por día (otro plan)', { LUNA_BUDGET_USD_FREE: '100' }],
    ['valor no numérico', { LUNA_BUDGET_USD_PREMIUM: 'mucho' }],
    ['valor negativo', { LUNA_MAX_QUERY_USD_FREE: '-1' }],
  ])('un valor de entorno que excede el tope o es inválido (%s) → configuración inválida', (_n, extra) => {
    const plan = Object.keys(extra)[0].endsWith('FREE') ? 'free' : 'premium';
    expect(resolverConfigPlan(plan, extra).invalida).toBeDefined();
  });
  it('el motor falla cerrado con configuración inválida: no hay llamada', async () => {
    process.env.OPENAI_API_KEY = 'sk-test-fake';
    const create = vi.fn();
    const m = crearMotorLuna({ env: { NODE_ENV: 'test', LUNA_ENABLED: '1', LUNA_BUDGET_USD_PREMIUM: '50' }, crearCliente: () => ({ responses: { create }, models: { retrieve: async (id: string) => ({ id }) } }), registrar: () => {}, contador: crearContadorLocalCanary(() => 'd') });
    const r = await m.responder({ queryId: 'q', pregunta: '¿Qué dispone el artículo 173 del Código Procesal Penal?', fragmentos: [frag()], tier: 'pro', retrievalState: 'SEMANTIC_SUCCESS' });
    delete process.env.OPENAI_API_KEY;
    expect(r).toEqual({ estado: 'SKIPPED', motivo: 'CONFIG_EXCEDE_TOPE_DURO' });
    expect(create).not.toHaveBeenCalled();
  });
  it('LUNA_ALLOW_PRODUCTION se exige SIEMPRE fuera de Preview y desarrollo: producción de Vercel, producción autoalojada y entorno sin identificar', () => {
    for (const ambiente of [{ VERCEL_ENV: 'production' }, { NODE_ENV: 'production' }, {}]) {
      expect(lunaHabilitadaPorEntorno({ ...ambiente, LUNA_ENABLED: '1' }), JSON.stringify(ambiente)).toBe(false);
      expect(lunaHabilitadaPorEntorno({ ...ambiente, LUNA_ENABLED: '1', LUNA_ALLOW_PRODUCTION: '1' }), JSON.stringify(ambiente)).toBe(true);
    }
    for (const ambiente of [{ VERCEL_ENV: 'preview' }, { VERCEL_ENV: 'development' }, { NODE_ENV: 'development' }, { NODE_ENV: 'test' }]) {
      expect(lunaHabilitadaPorEntorno({ ...ambiente, LUNA_ENABLED: '1' }), JSON.stringify(ambiente)).toBe(true);
    }
    expect(esPreviewODesarrollo({ VERCEL_ENV: 'production', NODE_ENV: 'development' })).toBe(false);
  });
  it('local_canary_only está PROHIBIDO fuera de Preview/desarrollo, aunque exista LUNA_ALLOW_PRODUCTION', async () => {
    expect(contadorLocalPermitido({ VERCEL_ENV: 'preview' })).toBe(true);
    expect(contadorLocalPermitido({ VERCEL_ENV: 'production', LUNA_ALLOW_PRODUCTION: '1' })).toBe(false);
    expect(contadorLocalPermitido({ NODE_ENV: 'production', LUNA_ALLOW_PRODUCTION: '1' })).toBe(false);
    process.env.OPENAI_API_KEY = 'sk-test-fake';
    const create = vi.fn();
    const m = crearMotorLuna({ env: { VERCEL_ENV: 'production', LUNA_ENABLED: '1', LUNA_ALLOW_PRODUCTION: '1', LUNA_COST_COUNTER: 'local_canary_only' }, crearCliente: () => ({ responses: { create }, models: { retrieve: async (id: string) => ({ id }) } }), registrar: () => {} });
    const r = await m.responder({ queryId: 'q', pregunta: '¿Qué dispone el artículo 173 del Código Procesal Penal?', fragmentos: [frag()], tier: 'free', retrievalState: 'SEMANTIC_SUCCESS' });
    delete process.env.OPENAI_API_KEY;
    expect(r).toEqual({ estado: 'SKIPPED', motivo: 'CONTADOR_LOCAL_PROHIBIDO_EN_PRODUCCION' });
    expect(create).not.toHaveBeenCalled();
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
    const m = crearMotorLuna({ env: { NODE_ENV: 'test', LUNA_ENABLED: '1' }, crearCliente: () => cliente, registrar: (r) => registros.push(r), contador: crearContadorLocalCanary(() => '2026-10-29') });
    const pregunta = '¿Qué dispone el artículo 173 del Código Procesal Penal?';
    await m.responder({ queryId: 'q', pregunta, fragmentos: [frag()], tier: 'free', retrievalState: 'SEMANTIC_SUCCESS' });
    delete process.env.OPENAI_API_KEY;
    expect(registros[0].payload).toMatchObject({ ok: true, pii: 'SIN_PII_DETECTADA', campos: ['evidence', 'question'] });
    expect(registros[0].contadorGlobal).toBe(false);
    const dump = JSON.stringify(registros);
    expect(dump).not.toContain(pregunta);
    expect(dump).not.toContain('medidas cautelares personales proceden');
  });
});

describe('suficiencia: ni un conteo de PRIMARY ni un estado ajeno bastan', () => {
  beforeEach(() => { process.env.OPENAI_API_KEY = 'sk-test-fake'; });
  afterEach(() => { delete process.env.OPENAI_API_KEY; });
  const armar = (estado: string, salida: unknown) => {
    const create = vi.fn().mockResolvedValue({ output_text: JSON.stringify(salida), usage: { input_tokens: 500, output_tokens: 50 } });
    const cliente: ClienteLuna = { responses: { create }, models: { retrieve: async (id: string) => ({ id }) } };
    const m = crearMotorLuna({ env: { NODE_ENV: 'test', LUNA_ENABLED: '1' }, crearCliente: () => cliente, registrar: () => {}, contador: crearContadorLocalCanary(() => 'd') });
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
    const create = vi.fn().mockResolvedValue({ output_text: JSON.stringify({ decision: 'ANSWER', abstention_reason: null, claims: [{ claim_id: 'c', text: 'Las medidas cautelares personales proceden con indicios racionales de participación.', citations: [{ chunk_id: dos[0].id!, support: 'DIRECT' }, { chunk_id: 'otro', support: 'INDIRECT' }] }] }), usage: { input_tokens: 500, output_tokens: 50 } });
    const m = crearMotorLuna({ env: { NODE_ENV: 'test', LUNA_ENABLED: '1' }, crearCliente: () => ({ responses: { create }, models: { retrieve: async (id: string) => ({ id }) } }), registrar: () => {}, contador: crearContadorLocalCanary(() => 'd') });
    const r = await m.responder({ queryId: 'q', pregunta: '¿Qué dispone el artículo 173 del Código Procesal Penal?', fragmentos: dos, tier: 'free', retrievalState: 'EXACT_SUCCESS' });
    expect(r.estado).toBe('ANSWER');
    if (r.estado === 'ANSWER') expect(r.chunkIdsValidados).toEqual([dos[0].id]);
  });
  it('el privacy gate estricto corta antes de OpenAI (cliente nunca creado)', async () => {
    const crearCliente = vi.fn();
    const m = crearMotorLuna({ env: { NODE_ENV: 'test', LUNA_ENABLED: '1' }, crearCliente, registrar: () => {}, contador: crearContadorLocalCanary(() => 'd') });
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
    const mk = () => crearMotorLuna({ env: { NODE_ENV: 'test', LUNA_ENABLED: '1', LUNA_BUDGET_USD_FREE: '0.0008' }, crearCliente: () => ({ responses: { create }, models: { retrieve: async (id: string) => ({ id }) } }), registrar: () => {}, contador: compartido });
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
    const m = crearMotorLuna({ env: { NODE_ENV: 'test', LUNA_ENABLED: '1' }, crearCliente: () => ({ responses: { create }, models: { retrieve: async (id: string) => ({ id }) } }), registrar: () => {}, contador: crearContadorSupabase(() => ({ rpc: async () => ({ data: null, error: { message: 'no existe' } }) }), dia) });
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

describe('Preview: cuenta de prueba, presupuesto estricto y nunca producción por accidente', () => {
  it('en producción LUNA_ENABLED=1 no basta: exige la segunda llave LUNA_ALLOW_PRODUCTION=1', () => {
    expect(lunaHabilitadaPorEntorno({ NODE_ENV: 'test', LUNA_ENABLED: '1', VERCEL_ENV: 'production' })).toBe(false);
    expect(lunaHabilitadaPorEntorno({ NODE_ENV: 'test', LUNA_ENABLED: '1', VERCEL_ENV: 'production', LUNA_ALLOW_PRODUCTION: '1' })).toBe(true);
    expect(lunaHabilitadaPorEntorno({ NODE_ENV: 'test', LUNA_ENABLED: '1', VERCEL_ENV: 'preview' })).toBe(true);
    expect(lunaHabilitadaPorEntorno({ VERCEL_ENV: 'preview' })).toBe(false);
  });
  it('en Preview el presupuesto diario de cada plan se limita al de Preview (USD 0.05 por defecto)', () => {
    for (const plan of ['free', 'academico', 'premium'] as const) {
      expect(resolverConfigPlan(plan, { VERCEL_ENV: 'preview' }).presupuestoDiarioUsd).toBe(PRESUPUESTO_PREVIEW_USD);
    }
    expect(resolverConfigPlan('premium', { VERCEL_ENV: 'preview', LUNA_PREVIEW_BUDGET_USD: '0.01' }).presupuestoDiarioUsd).toBe(0.01);
    expect(resolverConfigPlan('free', { VERCEL_ENV: 'preview', LUNA_BUDGET_USD_FREE: '0.02' }).presupuestoDiarioUsd).toBe(0.02);
    expect(resolverConfigPlan('premium', { VERCEL_ENV: 'production' }).presupuestoDiarioUsd).toBe(5);
  });
});

describe('script de verificación real: el secreto solo del entorno, nunca del repo ni de los logs', () => {
  it('el código fuente no contiene claves ni imprime variables de entorno', () => {
    const src = readFileSync(join(process.cwd(), 'scripts', 'luna-verify-model.ts'), 'utf8');
    expect(src).not.toMatch(/sk-[A-Za-z0-9_-]{8,}/);
    expect(src).not.toMatch(/console\.\w+\([^)]*process\.env/);
    expect(src).not.toMatch(/process\.env\.OPENAI_API_KEY/);   // la clave solo la lee openai-adapter.ts
  });
  it('ni el informe ni los mensajes de error reproducen la clave', async () => {
    process.env.OPENAI_API_KEY = 'sk-test-SECRETO-NO-IMPRIMIR';
    const out: string[] = [];
    const cliente: ClienteLuna = {
      models: { retrieve: async (id: string) => ({ id }) },
      responses: { create: async () => { throw Object.assign(new Error('Incorrect API key provided: sk-test-SECRETO-NO-IMPRIMIR'), { status: 401 }); } },
    };
    await main([], { LUNA_VERIFY_CONFIRM: CONFIRMACION }, () => cliente, (t) => out.push(t));
    delete process.env.OPENAI_API_KEY;
    expect(out.join('\n')).not.toContain('SECRETO');
  });
  it('usa solo consultas sintéticas (sin corpus real ni datos de clientes)', () => {
    const src = readFileSync(join(process.cwd(), 'scripts', 'luna-verify-model.ts'), 'utf8');
    expect(src).toContain('sintetico:a1');
    expect(src).not.toMatch(/biblioteca_vectores|createServerSupabaseClient|buscarRAG/);
  });
});

describe('BAJO (re-auditoría 4): lista blanca de instituciones — «Corte de Apelaciones» deja de rechazarse por capitalizada', () => {
  it.each([
    '¿Qué competencia tiene la Corte de Apelaciones en materia de recursos?',
    '¿Cuál es la función de la Corte Suprema de Justicia en el control de constitucionalidad?',
    '¿Qué resuelve la Sala de lo Constitucional en los amparos?',
  ])('pasa: %s', (q) => {
    expect(privacidadConsultaGeneral(q).estado).toBe('PASS');
  });
  it('un nombre de persona capitalizado junto a la institución sigue rechazándose', () => {
    expect(privacidadConsultaGeneral('¿Qué hará la Corte de Apelaciones con el recurso de Carlos Mejía?').estado).toBe('REJECT');
  });
  it('el topónimo de caso junto a la institución conserva sus reglas', () => {
    expect(privacidadConsultaGeneral('Mi vecino fue demandado en la Corte de Apelaciones de Olancho por un delito.').estado).toBe('REJECT');
  });
});

describe('ensayo aislado: el script no asume el modelo, muestra el plan y controla el gasto (tope USD 0.05)', () => {
  const ok = { decision: 'ANSWER', abstention_reason: null, claims: [{ claim_id: 'c', text: 'rige desde su publicación', citations: [{ chunk_id: 'sintetico:a1', support: 'DIRECT' }] }] };
  const clienteOk = (extra: Partial<{ list: () => Promise<unknown>; create: (b: never) => Promise<unknown> }> = {}): ClienteLuna & { models: { list?: () => Promise<unknown> } } => ({
    models: { retrieve: async (id: string) => ({ id }), list: extra.list },
    responses: { create: (extra.create ?? (async () => ({ output_text: JSON.stringify(ok), usage: { input_tokens: 400, output_tokens: 60 } }))) as never },
  });

  it('el plan del peor caso cabe en el tope y se imprime SIEMPRE, también sin autorización y sin abrir red', async () => {
    const crear = vi.fn();
    const out: string[] = [];
    expect(await main([], {}, crear as never, (t) => out.push(t))).toBe(2);
    expect(crear).not.toHaveBeenCalled();
    expect(out[0]).toContain('PLAN DEL ENSAYO');
    const plan = planDeEnsayo('gpt-6-luna');
    expect(plan.llamadasPagadas).toBe(3);
    expect(plan.cabeEnElTope).toBe(true);
    expect(plan.peorCasoTotalUsd).toBeLessThanOrEqual(TOPE_ENSAYO_USD);
  });
  it('un modelo sin tarifa registrada detiene el ensayo antes de la red: no puede garantizarse el control', async () => {
    const crear = vi.fn();
    const out: string[] = [];
    expect(await main(['--model', 'modelo-inventado'], { LUNA_VERIFY_CONFIRM: CONFIRMACION }, crear as never, (t) => out.push(t))).toBe(2);
    expect(crear).not.toHaveBeenCalled();
    expect(out.join(' ')).toContain('SIN_TARIFA_REGISTRADA_PARA_EL_MODELO');
  });
  it('LUNA_VERIFY_MAX_USD solo puede bajar el tope; un valor mayor o inválido detiene el ensayo', async () => {
    expect(resolverTope({ LUNA_VERIFY_MAX_USD: '0.01' }).topeUsd).toBe(0.01);
    expect(resolverTope({ LUNA_VERIFY_MAX_USD: '1' }).error).toContain('excede');
    expect(resolverTope({ LUNA_VERIFY_MAX_USD: 'abc' }).error).toContain('inválido');
    const crear = vi.fn();
    const out: string[] = [];
    process.env.OPENAI_API_KEY = 'sk-test-no-imprimir';
    expect(await main([], { LUNA_VERIFY_CONFIRM: CONFIRMACION, LUNA_VERIFY_MAX_USD: '5' }, crear as never, (t) => out.push(t))).toBe(2);
    delete process.env.OPENAI_API_KEY;
    expect(crear).not.toHaveBeenCalled();
  });
  it('un tope tan bajo que el peor caso no cabe detiene el ensayo sin llamadas', async () => {
    const crear = vi.fn();
    const out: string[] = [];
    process.env.OPENAI_API_KEY = 'sk-test-no-imprimir';
    expect(await main([], { LUNA_VERIFY_CONFIRM: CONFIRMACION, LUNA_VERIFY_MAX_USD: '0.0000001' }, crear as never, (t) => out.push(t))).toBe(2);
    delete process.env.OPENAI_API_KEY;
    expect(crear).not.toHaveBeenCalled();
    expect(out.join(' ')).toContain('PEOR_CASO_EXCEDE_EL_TOPE');
  });
  it('lista los modelos «luna» realmente disponibles (llamada gratuita) y no da por válido el identificador asumido', async () => {
    const create = vi.fn();
    const cliente = clienteOk({ list: async () => ({ data: [{ id: 'gpt-6-luna-2026-10' }, { id: 'otro-modelo' }] }), create });
    cliente.models.retrieve = async () => { throw Object.assign(new Error('nf'), { status: 404 }); };
    const inf = await verificarModelo(cliente, 'gpt-6-luna');
    expect(inf.disponibleEnCuenta).toBe(false);
    expect(inf.modelosLunaEnCuenta).toEqual(['gpt-6-luna-2026-10']);
    expect(inf.totalModelosEnCuenta).toBe(2);
    expect(create).not.toHaveBeenCalled();
  });
  it('durante la ejecución no se paga una llamada si gastado + peor caso excede el tope', async () => {
    const create = vi.fn(async () => ({ output_text: JSON.stringify(ok), usage: { input_tokens: 400, output_tokens: 60 } }));
    const inf = await verificarModelo(clienteOk({ create: create as never }), 'gpt-6-luna', planDeEnsayo('gpt-6-luna').peorCasoPorLlamadaUsd[0] + 1e-9);
    expect(create).toHaveBeenCalledTimes(1);
    expect(inf.esfuerzos.map((e) => e.estado)).toEqual(['OK', 'OMITIDO_POR_PRESUPUESTO', 'OMITIDO_POR_PRESUPUESTO']);
    expect(inf.gastoEstimadoUsd).toBeLessThan(inf.topeUsd);
  });
  it('un error que no es 400 suma el peor caso al gasto (no se subestima lo que pudo cobrarse)', async () => {
    const create = vi.fn(async () => { throw Object.assign(new Error('x'), { status: 500 }); });
    const inf = await verificarModelo(clienteOk({ create: create as never }), 'gpt-6-luna');
    expect(inf.gastoEstimadoUsd).toBeGreaterThan(0);
    expect(inf.gastoEstimadoUsd).toBeLessThanOrEqual(TOPE_ENSAYO_USD);
  });
});

describe('tarifas exactas por modelo y modalidad (Standard USD 0.10 / 0.50 por millón; verificado en la documentación oficial el 2026-10-31)', () => {
  it('Standard de gpt-6-luna: entrada 0.10, salida 0.50, entrada en caché 0.01', () => {
    expect(tarifaDeModelo('gpt-6-luna')).toEqual({ inputUsdPerMillion: 0.1, outputUsdPerMillion: 0.5, cachedInputUsdPerMillion: 0.01 });
    expect(costoRealUsd('gpt-6-luna', 1_000_000, 0)).toBeCloseTo(0.1, 10);
    expect(costoRealUsd('gpt-6-luna', 0, 1_000_000)).toBeCloseTo(0.5, 10);
    expect(costoRealUsd('gpt-6-luna', 1_000_000, 0, 1_000_000)).toBeCloseTo(0.01, 10);            // todo en caché
    expect(costoRealUsd('gpt-6-luna', 400, 60)).toBeCloseTo((400 * 0.1 + 60 * 0.5) / 1_000_000, 12);
  });
  it('Batch usa su propia tarifa (0.05 / 0.25) y no se confunde con Standard', () => {
    expect(tarifaDeModelo('gpt-6-luna', 'batch')).toMatchObject({ inputUsdPerMillion: 0.05, outputUsdPerMillion: 0.25 });
    expect(costoRealUsd('gpt-6-luna', 1_000_000, 1_000_000, 0, 'batch')).toBeCloseTo(0.3, 10);
    expect(costoRealUsd('gpt-6-luna', 1_000_000, 1_000_000, 0, 'standard')).toBeCloseTo(0.6, 10);
  });
  it('un modelo o una modalidad sin tarifa registrada NO se estiman: lanzan (Fast y regional no están registradas)', () => {
    expect(() => costoRealUsd('otro-modelo', 10, 10)).toThrow(/sin tarifa registrada/);
    expect(() => costoRealUsd('gpt-6-luna', 10, 10, 0, 'fast' as never)).toThrow(/modalidad sin tarifa/);
    expect(() => costoRealUsd('gpt-6-luna', 10, 10, 20)).toThrow();
  });
});

describe('--list-models: comprobación gratuita, sin llamadas pagadas', () => {
  const lista = [{ id: 'gpt-6-luna' }, { id: 'gpt-6-luna-mini' }, { id: 'otro' }];
  const clienteLista = () => {
    const create = vi.fn();
    const retrieve = vi.fn();
    return { create, retrieve, cliente: { models: { retrieve, list: async () => ({ data: lista }) }, responses: { create } } as never as ClienteLuna };
  };
  it('exige su confirmación propia: la del ensayo pagado NO la sustituye', async () => {
    const { cliente, create } = clienteLista();
    const crear = vi.fn(() => cliente);
    const out: string[] = [];
    process.env.OPENAI_API_KEY = 'sk-test-no-imprimir';
    expect(await main(['--list-models'], { LUNA_VERIFY_CONFIRM: CONFIRMACION }, crear, (t) => out.push(t))).toBe(2);
    expect(await main(['--list-models'], {}, crear, (t) => out.push(t))).toBe(2);
    delete process.env.OPENAI_API_KEY;
    expect(crear).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
  it('lista los IDs de la cuenta usando solo models.list: nunca responses.create ni models.retrieve', async () => {
    const { cliente, create, retrieve } = clienteLista();
    const out: string[] = [];
    process.env.OPENAI_API_KEY = 'sk-test-SECRETO-NO-IMPRIMIR';
    const code = await main(['--list-models'], { LUNA_VERIFY_CONFIRM: CONFIRMACION_LISTA }, () => cliente, (t) => out.push(t));
    delete process.env.OPENAI_API_KEY;
    expect(code).toBe(0);
    expect(create).not.toHaveBeenCalled();
    expect(retrieve).not.toHaveBeenCalled();
    const informe = JSON.parse(out.join('\n'));
    expect(informe).toMatchObject({ modo: 'LISTA_GRATUITA', llamadasPagadas: 0, totalModelos: 3, modelosLuna: ['gpt-6-luna', 'gpt-6-luna-mini'], modeloSolicitadoListado: true });
    expect(out.join('\n')).not.toContain('SECRETO');
  });
  it('si el modelo solicitado no está en la cuenta, termina con 1 y lo dice (no se asume válido)', async () => {
    const { cliente } = clienteLista();
    const inf = await listarModelosDeCuenta(cliente, 'gpt-6-luna-inexistente');
    expect(inf.modeloSolicitadoListado).toBe(false);
    expect(inf.tarifaRegistradaParaSolicitado).toBe(false);
  });
  it('el script no se conecta a Supabase ni al corpus (el ensayo y la lista no tocan la base de datos)', () => {
    const src = readFileSync(join(process.cwd(), 'scripts', 'luna-verify-model.ts'), 'utf8');
    expect(src).not.toMatch(/supabase|SUPABASE|biblioteca_vectores|buscarRAG/i);
  });
});
