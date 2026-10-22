import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { validarSalida, type SalidaCruda } from '@/lib/ai-gateway/shadow/citation-validator';
import { crearBudgetGuard } from '@/lib/ai-gateway/shadow/budget-guard';
import { clasificacionDesdeEtiqueta, clasificarFragmento } from '@/lib/ai-gateway/shadow/evidence-classification';
import { evaluarCorpusPublico } from '@/lib/ai-gateway/shadow/public-corpus-gate';
import { privacyGate } from '@/lib/ai-gateway/shadow/privacy-gate';
import { SHADOW_BUDGET_USD, SHADOW_MODEL_CONFIG } from '@/lib/ai-gateway/shadow/shadow-model-config';
import { SHADOW_GATEWAY_ENABLED } from '@/lib/ai-gateway/shadow/config';
import { MODEL_OUTPUT_WIRE_JSON_SCHEMA } from '@/lib/ai-gateway/shadow/model-output-schema';
import { construirCitas, formatearContextoRAG } from '@/lib/legal-retrieval/evidence-engine';
import type { FragmentoRAG } from '@/lib/legal-retrieval/types';
import type { ShadowGatewayInput } from '@/lib/ai-gateway/shadow/types';

/**
 * PR-G3 — implementación OFFLINE del modo sombra con adaptador OpenAI. Ninguna prueba hace una llamada real, usa
 * una credencial real ni abre red: el SDK se sustituye por dobles. SHADOW_GATEWAY_ENABLED sigue en false.
 */
const RAIZ = join(__dirname, '..');
const archivos = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? (n === 'node_modules' || n === '.next' ? [] : archivos(p)) : /\.(ts|tsx)$/.test(n) ? [p] : [];
  });

describe('SHADOW_GATEWAY_ENABLED y presupuesto por defecto', () => {
  it('el kill switch sigue apagado y el presupuesto por defecto es 0 USD', () => {
    expect(SHADOW_GATEWAY_ENABLED).toBe(false);
    expect(SHADOW_BUDGET_USD).toBe(0);
  });
});

// ── Privacy gate ─────────────────────────────────────────────────────────────
describe('privacy gate fail-closed (sin LLM)', () => {
  const PASAN = [
    'Explica el artículo 173 del Código Procesal Penal de Honduras',
    '¿Qué dice el artículo 173-B del Código Penal?',
    '¿Sigue vigente el Decreto 57-2020?',
    '¿Qué dispone el artículo 214 del Código Tributario?',
    '¿Qué deroga el artículo 634 del Código Penal (Decreto 130-2017) y desde cuándo está vigente?',
    'Según el corpus, ¿qué garantías tiene el imputado durante la detención?',
    '¿Qué plazo de prescripción tiene la acción penal?',
    '¿Cuál es la diferencia entre derogación y abrogación de una ley?',
    '¿Cómo se computa el plazo para interponer un recurso de apelación?',
    '¿Qué exige el Código del Notariado para una escritura pública?',
    '¿Qué dice el Reglamento del Notariado sobre el artículo 12-BIS?',
    '¿Cuándo entra en vigencia un decreto publicado en La Gaceta?',
    'Explica la diferencia entre el Código Civil y el Código de Comercio',
  ];
  it('PASS: preguntas abstractas de artículos, vigencia, derogación, código/decreto/ley y consultas públicas sin personas', () => {
    for (const q of PASAN) expect(privacyGate(q), q).toEqual({ estado: 'PASS' });
  });

  const RECHAZOS: Array<[string, string, 'A' | 'B' | 'C' | 'E']> = [
    // A — identificadores
    ['DNI', '¿Qué dice la ley para el DNI 0801-1990-12345?', 'A'],
    ['RTN', 'El RTN 08011990123456 de la sociedad, artículo 173', 'A'],
    ['teléfono 8 dígitos', 'Llámeme al 9876-5432 para el artículo 173', 'A'],
    ['teléfono con +504', 'Mi celular es +504 3345 6789, artículo 173', 'A'],
    ['teléfono con prefijo 7', 'Escríbame al 7123 4567 sobre el artículo 173', 'A'],
    ['correo normal', 'Mi correo es juan.perez@example.com, ¿qué dice el artículo 173?', 'A'],
    ['correo ofuscado (arroba/punto)', 'Escríbame a juan arroba gmail punto com sobre el artículo 173', 'A'],
    ['correo ofuscado ((at)/(dot))', 'Escríbame a juan (at) gmail (dot) com sobre la ley', 'A'],
    ['cuenta', 'Mi cuenta 12345678901 del banco, ¿qué dice el artículo 173?', 'A'],
    ['tarjeta', 'Pagué con la tarjeta 4111 1111 1111 1111, artículo 173', 'A'],
    ['pasaporte', 'Mi pasaporte A1234567 venció, ¿qué dice la ley?', 'A'],
    ['URL', 'Revisé https://sitio.hn/documento sobre el artículo 173', 'A'],
    ['dominio sin esquema', 'Consulta ejemplo.com sobre el artículo 173', 'A'],
    ['número largo', '¿Qué dice el artículo 173 del caso 123456?', 'A'],
    // B — cliente, expediente, documento privado
    ['mi cliente + nombre', 'Mi cliente Juan Pérez fue detenido; ¿qué dice el artículo 173?', 'B'],
    ['mi cliente a secas', 'mi cliente quiere saber qué dice el artículo 173', 'B'],
    ['señor + nombre', 'El señor Pedro Martínez pregunta por el artículo 173', 'B'],
    ['don + nombre', 'Don Carlos consulta el artículo 173', 'B'],
    ['licenciada + nombre', 'La licenciada María pidió el artículo 173', 'B'],
    ['imputado + nombre', 'El imputado Rodríguez pregunta por el artículo 173', 'B'],
    ['expediente', 'En el expediente 2024-00123 consta el artículo 173', 'B'],
    ['folio', 'Según el folio No. 45 del tomo, artículo 173', 'B'],
    ['tomo', 'Consta en el tomo 12 el artículo 173', 'B'],
    ['causa', 'En la causa No. 77 aplica el artículo 173', 'B'],
    ['dirección', 'Vivo en colonia Kennedy y consulto el artículo 173', 'B'],
    ['forma societaria', 'Inversiones López S.A. de C.V. consulta el artículo 173', 'B'],
    // C — texto largo o documental
    ['multilínea', 'Explica el artículo 173\ndel Código Procesal Penal', 'C'],
    ['CONSIDERANDO', 'CONSIDERANDO que el artículo 173 del Código Procesal Penal establece lo siguiente', 'C'],
    ['POR TANTO', 'Explica la ley. POR TANTO se aplica el artículo 173', 'C'],
    ['RESUELVE', 'El juez RESUELVE aplicar el artículo 173 del Código Procesal Penal', 'C'],
    ['texto largo', `Explica el artículo 173 del Código Procesal Penal ${'sobre la prescripción de la acción penal '.repeat(20)}`, 'C'],
    // E — duda
    ['sin señal jurídica', '¿Qué hago?', 'E'],
    ['saludo', 'Hola buenos días', 'E'],
    ['nombre propio detectable', '¿Qué dice el artículo 173 sobre Pedro Martínez?', 'E'],
    ['empresa con nombre propio', '¿Qué dice el artículo 173 para la Cervecería Hondureña?', 'E'],
    ['entrada vacía', '   ', 'E'],
  ];
  for (const [nombre, texto, etapa] of RECHAZOS) {
    it(`REJECT (${etapa}): ${nombre}`, () => {
      const r = privacyGate(texto);
      expect(r.estado, texto).toBe('REJECT');
      if (r.estado === 'REJECT') expect(r.etapa, texto).toBe(etapa);
    });
  }
  it('el rechazo nombra la etapa y una razón-código, nunca el texto ni el dato', () => {
    const r = privacyGate('Mi correo es juan.perez@example.com, ¿qué dice el artículo 173?');
    expect(r).toEqual({ estado: 'REJECT', etapa: 'A', razon: 'EMAIL' });
    expect(JSON.stringify(r)).not.toMatch(/juan|example/);
  });
  it('una entrada que no es texto se rechaza', () => {
    for (const v of [undefined, null, 42, {}, []]) expect(privacyGate(v).estado).toBe('REJECT');
  });

  // Limitaciones CONOCIDAS (documentadas en privacy-gate.ts): un filtro determinista no las elimina.
  it('FALSO POSITIVO conocido: un nombre propio legítimo fuera del vocabulario se rechaza', () => {
    expect(privacyGate('¿Qué dice el Tratado de Libre Comercio con Estados Unidos?').estado).toBe('REJECT');
  });
  it('FALSO POSITIVO conocido: dos números de 4 dígitos seguidos se leen como teléfono', () => {
    expect(privacyGate('¿Qué ley rige entre los años 2019 2020?').estado).toBe('REJECT');
  });
  it('FALSO NEGATIVO conocido: un nombre en minúscula y sin marcador pasa', () => {
    expect(privacyGate('¿qué dice el artículo 173 sobre juan perez?').estado).toBe('PASS');
  });
  it('FALSO NEGATIVO conocido: datos personales escritos con palabras pasan', () => {
    expect(privacyGate('Mi número es nueve nueve ocho siete, ¿qué dice el artículo 173?').estado).toBe('PASS');
  });
});

// ── Corpus público ───────────────────────────────────────────────────────────
const frag = (extra: Partial<FragmentoRAG> = {}): FragmentoRAG => ({
  id: 'f1', contenido: 'ARTICULO 173.- Texto de prueba.', num_articulo: '173', fuente: 'Codigo Procesal Penal', relevancia: 0.9,
  fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, hash: 'abcd1234', ...extra,
});

describe('gate de corpus público (experimental, fail-closed)', () => {
  it('PUBLIC_CORPUS_PASS cuando TODOS los fragmentos cumplen', () => {
    expect(evaluarCorpusPublico([frag(), frag({ id: 'f2', num_articulo: '174' })])).toEqual({ estado: 'PUBLIC_CORPUS_PASS' });
  });
  const RECHAZOS: Array<[string, Partial<FragmentoRAG>]> = [
    ['fuente_tipo', { fuente_tipo: 'sentencia' }],
    ['fuente_tipo', { fuente_tipo: null }],
    ['jurisdiccion', { jurisdiccion: 'MX' }],
    ['jurisdiccion', { jurisdiccion: null }],
    ['es_norma_vigente', { es_norma_vigente: false }],
    ['es_norma_vigente', { es_norma_vigente: null }],
    ['id', { id: undefined }],
    ['id', { id: '' }],
    ['hash', { hash: undefined }],
    ['hash', { hash: '' }],
    ['fuente', { fuente: '' }],
    ['fuente_doctrinal', { fuente: 'CPC_COMENTADO_ROMERO_2024' }],
    ['fuente_documental_excluida', { fuente: 'doc_6cfb720b' }],
  ];
  for (const [campo, cambio] of RECHAZOS) {
    it(`PUBLIC_CORPUS_REJECT por ${campo}: ${JSON.stringify(cambio)}`, () => {
      expect(evaluarCorpusPublico([frag(cambio)])).toEqual({ estado: 'PUBLIC_CORPUS_REJECT', razon: campo });
    });
  }
  it('si UNO falla, todo se rechaza', () => {
    expect(evaluarCorpusPublico([frag(), frag({ id: 'f2', jurisdiccion: 'MX' }), frag({ id: 'f3' })]).estado).toBe('PUBLIC_CORPUS_REJECT');
  });
  it('M1 (auditoría #85): una lista vacía se rechaza con sin_evidencia: no hay nada que verificar ni motivo para exponer la pregunta', () => {
    expect(evaluarCorpusPublico([])).toEqual({ estado: 'PUBLIC_CORPUS_REJECT', razon: 'sin_evidencia' });
    expect(evaluarCorpusPublico(undefined as never)).toEqual({ estado: 'PUBLIC_CORPUS_REJECT', razon: 'sin_evidencia' });
  });
  it('la razón es el nombre del campo, nunca su valor', () => {
    const r = evaluarCorpusPublico([frag({ fuente: 'doc_secreto_cliente' })]);
    expect(JSON.stringify(r)).not.toMatch(/secreto|cliente/);
  });
  it('M2 (auditoría #85): la deuda PRIVACY_GATE_KNOWN_FALSE_NEGATIVES_PENDING queda en el encabezado del gate y en el documento de deuda previa a canary', () => {
    const gate = readFileSync(join(RAIZ, 'lib', 'ai-gateway', 'shadow', 'privacy-gate.ts'), 'utf8');
    expect(gate).toMatch(/PRIVACY_GATE_KNOWN_FALSE_NEGATIVES_PENDING/);
    const doc = readFileSync(join(RAIZ, 'docs', 'governance', 'gateway-g3-deuda-pre-canary.md'), 'utf8');
    for (const marca of ['PRIVACY_GATE_KNOWN_FALSE_NEGATIVES_PENDING', 'PUBLIC_PROVENANCE_STRONG_PROOF_PENDING', 'Verificar antes de activar']) expect(doc, marca).toContain(marca);
  });
  it('la deuda PUBLIC_PROVENANCE_STRONG_PROOF_PENDING queda registrada y el gate no se presenta como prueba absoluta', () => {
    const fuente = readFileSync(join(RAIZ, 'lib', 'ai-gateway', 'shadow', 'public-corpus-gate.ts'), 'utf8');
    expect(fuente).toMatch(/PUBLIC_PROVENANCE_STRONG_PROOF_PENDING/);
    expect(fuente).toMatch(/NO es prueba absoluta de procedencia pública/);
  });
});

// ── Clasificación de producción (drift) ──────────────────────────────────────
describe('clasificación auténtica de producción (sin duplicar evidence-engine)', () => {
  const MATRIZ: Array<[string, Partial<FragmentoRAG>, string, boolean]> = [
    ['norma vigente HN', {}, 'NORMA_VIGENTE_HONDURAS', true],
    ['doctrinal aunque es_norma_vigente=true', { fuente: 'CPC_COMENTADO_ROMERO_2024', es_norma_vigente: true }, 'DOCTRINAL_NO_VINCULANTE', false],
    ['comparada (otra jurisdicción)', { es_norma_vigente: false, jurisdiccion: 'MX' }, 'COMPARADA', false],
    ['sentencia', { es_norma_vigente: false, fuente_tipo: 'sentencia' }, 'DOCTRINA_JURISPRUDENCIA', false],
    ['doctrina', { es_norma_vigente: false, fuente_tipo: 'doctrina' }, 'DOCTRINA_JURISPRUDENCIA', false],
    ['código no vigente', { es_norma_vigente: false }, 'NO_VIGENTE', false],
    ['sin clasificar', { es_norma_vigente: null, fuente_tipo: null, jurisdiccion: null }, 'SIN_CLASIFICAR', false],
  ];
  for (const [nombre, cambio, esperada, citable] of MATRIZ) {
    it(`${nombre} → ${esperada}, citable=${citable}`, () => {
      const f = frag(cambio);
      expect(clasificarFragmento(f)).toEqual({ clasificacionProduccion: esperada, citable });
    });
  }
  it('DRIFT: la clasificación coincide con la etiqueta real de formatearContextoRAG y con construirCitas', () => {
    for (const [, cambio] of MATRIZ) {
      const f = frag(cambio);
      const impreso = formatearContextoRAG({ fragmentos: [f], articulos_encontrados: [], backend: 'supabase' });
      const { clasificacionProduccion, citable } = clasificarFragmento(f);
      // El contexto que ve el modelo en producción lleva la etiqueta que se tradujo.
      const etiqueta = /\[FRAGMENTO 1[^\n]*? \[(.+?)\] \| similitud/.exec(impreso)![1];
      expect(clasificacionDesdeEtiqueta(etiqueta)).toBe(clasificacionProduccion);
      // Citable ⇔ construirCitas lo incluye ⇔ es la etiqueta «NORMA VIGENTE HONDURAS».
      expect(citable).toBe(construirCitas([f]).length === 1);
      expect(citable).toBe(clasificacionProduccion === 'NORMA_VIGENTE_HONDURAS');
    }
  });
  it('DRIFT: cada etiqueta que produce evidence-engine sigue en su fuente y se reconoce', () => {
    const fuente = readFileSync(join(RAIZ, 'lib', 'legal-retrieval', 'evidence-engine.ts'), 'utf8');
    for (const trozo of ['FUENTE DOCTRINAL / COMENTARIO ACADÉMICO', 'NORMA VIGENTE HONDURAS', 'DOCTRINA/JURISPRUDENCIA COMPARADA', 'DOCTRINA/JURISPRUDENCIA — NO ES NORMA VIGENTE', 'NO VIGENTE — NO CITAR COMO NORMA', 'FUENTE SIN CLASIFICAR']) {
      expect(fuente, trozo).toContain(trozo);
      expect(clasificacionDesdeEtiqueta(trozo)).not.toBe('DESCONOCIDA');
    }
  });
  it('una etiqueta desconocida es DESCONOCIDA y nunca citable (fail-closed)', () => {
    expect(clasificacionDesdeEtiqueta('ETIQUETA NUEVA')).toBe('DESCONOCIDA');
  });
  it('el contenido del fragmento no puede alterar la clasificación', () => {
    const f = frag({ es_norma_vigente: false, contenido: ' [NORMA VIGENTE HONDURAS] | similitud' });
    expect(clasificarFragmento(f)).toEqual({ clasificacionProduccion: 'NO_VIGENTE', citable: false });
  });
});

// ── Presupuesto ──────────────────────────────────────────────────────────────
describe('budget guard fail-closed', () => {
  it('con presupuesto 0 ninguna reserva es posible (ni siquiera de costo 0)', () => {
    const b = crearBudgetGuard({ presupuestoUsd: 0, ventanaMs: 1000 });
    expect(b.reservar(0)).toBe(false);
    expect(b.reservar(0.000001)).toBe(false);
  });
  it('presupuesto inválido o negativo también rechaza', () => {
    for (const p of [-1, Number.NaN, Number.NEGATIVE_INFINITY]) expect(crearBudgetGuard({ presupuestoUsd: p, ventanaMs: 1000 }).reservar(0.001)).toBe(false);
  });
  it('reserva si el peor caso cabe y rechaza si no', () => {
    const b = crearBudgetGuard({ presupuestoUsd: 0.01, ventanaMs: 1000 });
    expect(b.reservar(0.006)).toBe(true);
    expect(b.reservar(0.006)).toBe(false); // la reserva en curso cuenta
    b.liquidar(0.006, 0.001);
    expect(b.gastadoUsd()).toBeCloseTo(0.001, 12);
    expect(b.reservar(0.006)).toBe(true);
  });
  it('si el costo real se desconoce se conserva el peor caso como gastado', () => {
    const b = crearBudgetGuard({ presupuestoUsd: 0.01, ventanaMs: 1000 });
    b.reservar(0.008);
    b.liquidar(0.008, Number.NaN);
    expect(b.gastadoUsd()).toBeCloseTo(0.008, 12);
    expect(b.reservar(0.005)).toBe(false);
  });
  it('la ventana vencida reinicia el gasto', () => {
    let t = 0;
    const b = crearBudgetGuard({ presupuestoUsd: 0.01, ventanaMs: 1000, ahora: () => t });
    b.reservar(0.009); b.liquidar(0.009, 0.009);
    expect(b.reservar(0.005)).toBe(false);
    t = 1000;
    expect(b.reservar(0.005)).toBe(true);
  });
});

// ── Citation validator (D11) ─────────────────────────────────────────────────
describe('validador de citas: DIRECT solo cuenta con evidence citable', () => {
  const input = (): ShadowGatewayInput => ({
    queryId: 'q',
    sanitizedQuestion: '¿Qué dice el artículo 173?',
    evidence: [
      { chunk_id: 'citable', instrumento: 'CPP', articulo: '173', gaceta: null, rol: null, citable: true, texto: 't' },
      { chunk_id: 'nocitable', instrumento: 'DOCTRINA', articulo: null, gaceta: null, rol: null, citable: false, texto: 't' },
    ],
    productionOutcome: { decision: 'ANSWER', retrievalState: 'EXACT_SUCCESS' },
  });
  const cruda = (claims: unknown[]): SalidaCruda => ({ rawOutput: { decision: 'ANSWER', claims, abstention_reason: null }, usage: { inputTokens: 100, outputTokens: 10 }, latencyMs: 1 });
  const claim = (id: string, citations: Array<[string, 'DIRECT' | 'INDIRECT']>) => ({ claim_id: id, text: `claim ${id}`, citations: citations.map(([chunk_id, support]) => ({ chunk_id, support })) });

  it('DIRECT a evidence citable → claim validada', () => {
    const r = validarSalida(input(), cruda([claim('c1', [['citable', 'DIRECT']])]));
    expect(r.status).toBe('ANSWER');
    expect(r.claims.map((c) => c.claim_id)).toEqual(['c1']);
  });
  it('DIRECT a evidence NO citable → claim descartada; sin otras claims el resultado es INVALID', () => {
    const r = validarSalida(input(), cruda([claim('c1', [['nocitable', 'DIRECT']])]));
    expect(r.status).toBe('INVALID');
    expect(r.discardedClaims).toEqual([{ claim_id: 'c1', motivo: 'SIN_SOPORTE_DIRECTO_CITABLE', chunkIdsInvalidos: [] }]);
  });
  it('solo citas INDIRECT (aunque sean a un chunk citable) → claim descartada', () => {
    const r = validarSalida(input(), cruda([claim('c1', [['citable', 'INDIRECT']])]));
    expect(r.status).toBe('INVALID');
    expect(r.discardedClaims[0].motivo).toBe('SIN_SOPORTE_DIRECTO_CITABLE');
  });
  it('una cita DIRECT citable más otra a un chunk no citable → válida (el respaldo directo existe)', () => {
    const r = validarSalida(input(), cruda([claim('c1', [['citable', 'DIRECT'], ['nocitable', 'INDIRECT']])]));
    expect(r.status).toBe('ANSWER');
  });
  it('NO CITATION → claim descartada', () => {
    const r = validarSalida(input(), cruda([claim('c1', []), claim('c2', [['citable', 'DIRECT']])]));
    expect(r.status).toBe('ANSWER');
    expect(r.discardedClaims).toEqual([{ claim_id: 'c1', motivo: 'SIN_CITAS', chunkIdsInvalidos: [] }]);
  });
  it('UNKNOWN chunk_id → claim descartada y cita inválida', () => {
    const r = validarSalida(input(), cruda([claim('c1', [['inventado', 'DIRECT']]), claim('c2', [['citable', 'DIRECT']])]));
    expect(r.invalidCitations).toBe(1);
    expect(r.discardedClaims[0]).toEqual({ claim_id: 'c1', motivo: 'CITA_FUERA_DE_EVIDENCIA', chunkIdsInvalidos: ['inventado'] });
  });
  it('salida estructurada mal formada → INVALID', () => {
    for (const rawOutput of ['no es json', '{"decision":"ANSWER"}', { decision: 'TAL VEZ', claims: [], abstention_reason: null }, { decision: 'ANSWER', claims: [{ claim_id: 'c', text: 't', citations: [{ chunk_id: 'citable', support: 'CONTEXT' }] }], abstention_reason: null }]) {
      expect(validarSalida(input(), { rawOutput, usage: { inputTokens: 1, outputTokens: 1 }, latencyMs: 1 }).status).toBe('INVALID');
    }
  });
  it('el modelo no puede declarar PRIMARY/CONTEXT: el esquema de cable no tiene campo de rol y solo admite DIRECT/INDIRECT', () => {
    const cita = MODEL_OUTPUT_WIRE_JSON_SCHEMA.properties.claims.items.properties.citations.items;
    expect(Object.keys(cita.properties).sort()).toEqual(['chunk_id', 'support']);
    expect(cita.properties.support.enum).toEqual(['DIRECT', 'INDIRECT']);
    expect(cita.additionalProperties).toBe(false);
  });
});

// ── Adaptador OpenAI (SDK sustituido por un doble) ───────────────────────────
const ENTRADA: ShadowGatewayInput = {
  queryId: 'q-1',
  sanitizedQuestion: 'Explica el artículo 173 del Código Procesal Penal de Honduras',
  evidence: [{ chunk_id: 'f1', instrumento: 'Codigo Procesal Penal', articulo: '173', gaceta: null, rol: null, clasificacionProduccion: 'NORMA_VIGENTE_HONDURAS', citable: true, texto: 'ARTICULO 173.- Texto.' }],
  productionOutcome: { decision: 'ANSWER', retrievalState: 'EXACT_SUCCESS' },
};

describe('adaptador OpenAI (implementado, no ejecutado)', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.doUnmock('openai'); });

  it('la solicitud usa la Responses API con store:false, json_schema estricto y sin tools ni estado', async () => {
    const { construirSolicitud } = await import('@/lib/ai-gateway/shadow/openai-adapter');
    const cuerpo = construirSolicitud(ENTRADA) as Record<string, unknown>;
    expect(cuerpo.model).toBe(SHADOW_MODEL_CONFIG.modelId);
    expect(cuerpo.store).toBe(false);
    expect(cuerpo.max_output_tokens).toBe(SHADOW_MODEL_CONFIG.maxOutputTokens);
    expect(cuerpo.text).toEqual({ format: { type: 'json_schema', name: 'mayalex_shadow_output', strict: true, schema: MODEL_OUTPUT_WIRE_JSON_SCHEMA } });
    for (const prohibido of ['tools', 'tool_choice', 'previous_response_id', 'conversation', 'background', 'file_ids', 'metadata', 'parallel_tool_calls']) {
      expect(Object.keys(cuerpo), prohibido).not.toContain(prohibido);
    }
  });
  it('la entrada serializada no lleva roles, clasificación ni citabilidad: solo pregunta y evidence', async () => {
    const { serializarEntrada } = await import('@/lib/ai-gateway/shadow/openai-adapter');
    const obj = JSON.parse(serializarEntrada(ENTRADA));
    expect(Object.keys(obj).sort()).toEqual(['evidence', 'question']);
    expect(Object.keys(obj.evidence[0]).sort()).toEqual(['articulo', 'chunk_id', 'gaceta', 'instrumento', 'texto']);
    expect(JSON.stringify(obj)).not.toMatch(/PRIMARY|CONTEXT|citable|clasificacion/);
  });
  it('propaga la señal de aborto, mapea el uso (con caché) y devuelve la salida cruda', async () => {
    const { crearAdaptadorOpenAI } = await import('@/lib/ai-gateway/shadow/openai-adapter');
    const llamadas: Array<{ cuerpo: unknown; opciones: { signal?: AbortSignal } }> = [];
    const adaptador = crearAdaptadorOpenAI({
      crearCliente: () => ({
        responses: {
          create: async (cuerpo, opciones) => {
            llamadas.push({ cuerpo, opciones });
            return { output_text: '{"decision":"ABSTAIN","claims":[],"abstention_reason":"x"}', usage: { input_tokens: 500, output_tokens: 20, input_tokens_details: { cached_tokens: 200 } } };
          },
        },
      }),
    });
    const ctrl = new AbortController();
    const salida = await adaptador.responder(ENTRADA, { signal: ctrl.signal });
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0].opciones.signal).toBe(ctrl.signal);
    expect(salida.usage).toEqual({ inputTokens: 500, outputTokens: 20, cachedInputTokens: 200 });
    expect(typeof salida.rawOutput).toBe('string');
    expect(validarSalida(ENTRADA, salida).status).toBe('ABSTAIN');
  });
  it('una respuesta sin usage es un fallo (costo desconocido), no una salida válida', async () => {
    const { crearAdaptadorOpenAI } = await import('@/lib/ai-gateway/shadow/openai-adapter');
    const adaptador = crearAdaptadorOpenAI({ crearCliente: () => ({ responses: { create: async () => ({ output_text: '{}', usage: null }) } }) });
    await expect(adaptador.responder(ENTRADA)).rejects.toThrow(/usage/);
  });
  it('el SDK real se construye con maxRetries:0 y recibe la señal; todo con el SDK sustituido por un doble (sin red)', async () => {
    const construcciones: Array<Record<string, unknown>> = [];
    const creaciones: Array<{ cuerpo: Record<string, unknown>; opciones: Record<string, unknown> }> = [];
    vi.resetModules();
    vi.doMock('openai', () => ({
      default: class {
        constructor(o: Record<string, unknown>) { construcciones.push(o); }
        responses = {
          create: async (cuerpo: Record<string, unknown>, opciones: Record<string, unknown>) => {
            creaciones.push({ cuerpo, opciones });
            return { output_text: '{"decision":"ABSTAIN","claims":[],"abstention_reason":"x"}', usage: { input_tokens: 10, output_tokens: 5, input_tokens_details: { cached_tokens: 0 } } };
          },
        };
      },
    }));
    vi.stubEnv('OPENAI_API_KEY', 'clave-de-prueba-no-real');
    const { crearAdaptadorOpenAI } = await import('@/lib/ai-gateway/shadow/openai-adapter');
    const ctrl = new AbortController();
    await crearAdaptadorOpenAI().responder(ENTRADA, { signal: ctrl.signal });
    expect(construcciones).toEqual([{ apiKey: 'clave-de-prueba-no-real', maxRetries: 0 }]);
    expect(creaciones[0].opciones.signal).toBe(ctrl.signal);
    expect(creaciones[0].cuerpo.store).toBe(false);
  });
  it('credencialDisponible: falsa sin variable o vacía, verdadera con valor; no devuelve el valor', async () => {
    const { credencialDisponible } = await import('@/lib/ai-gateway/shadow/openai-adapter');
    vi.stubEnv('OPENAI_API_KEY', '');
    expect(credencialDisponible()).toBe(false);
    vi.stubEnv('OPENAI_API_KEY', '   ');
    expect(credencialDisponible()).toBe(false);
    vi.stubEnv('OPENAI_API_KEY', 'valor-falso');
    expect(credencialDisponible()).toBe(true);
  });
});

// ── Dispatcher: orden y cero llamadas ────────────────────────────────────────
const PREGUNTA_OK = 'Explica el artículo 173 del Código Procesal Penal de Honduras';

interface OpcionesCarga {
  habilitado?: boolean;
  /** undefined = presupuesto real (0 USD). */
  presupuesto?: number;
  credencial?: boolean;
  responder?: (input: ShadowGatewayInput, o?: { signal?: AbortSignal }) => Promise<unknown>;
}

async function cargar(o: OpcionesCarga = {}) {
  vi.resetModules();
  vi.doUnmock('@/lib/ai-gateway/shadow/shadow-model-config');
  vi.doMock('@/lib/ai-gateway/shadow/config', () => ({ SHADOW_GATEWAY_ENABLED: o.habilitado ?? true, SHADOW_TIMEOUT_MS: 40, SHADOW_REGISTRY_MAX: 200 }));
  if (o.presupuesto !== undefined) {
    const presupuesto = o.presupuesto;
    vi.doMock('@/lib/ai-gateway/shadow/shadow-model-config', async (original) => ({ ...(await original<typeof import('@/lib/ai-gateway/shadow/shadow-model-config')>()), SHADOW_BUDGET_USD: presupuesto }));
  }
  const responder = vi.fn(o.responder ?? (async () => ({ rawOutput: { decision: 'ANSWER', claims: [{ claim_id: 'c1', text: 'texto', citations: [{ chunk_id: 'f1', support: 'DIRECT' }] }], abstention_reason: null }, usage: { inputTokens: 100, outputTokens: 10 }, latencyMs: 3 })));
  vi.doMock('@/lib/ai-gateway/shadow/adaptador-sombra', () => ({
    credencialDisponible: () => o.credencial ?? true,
    crearAdaptadorSombra: () => ({ modelo: 'gpt-6-luna', responder }),
  }));
  const d = await import('@/lib/ai-gateway/shadow/dispatcher');
  return { d, responder };
}
const params = (queryId: string, extra: Partial<Parameters<Awaited<ReturnType<typeof cargar>>['d']['despacharShadow']>[0]> = {}) => ({
  queryId, pregunta: PREGUNTA_OK, fragmentos: [frag()], decision: 'ANSWER' as const, retrievalState: 'EXACT_SUCCESS' as const, ...extra,
});

beforeEach(() => { vi.restoreAllMocks(); });

describe('dispatcher: cada compuerta fail-closed deja cero llamadas', () => {
  it('flujo completo permitido (presupuesto fijado solo en la prueba): una llamada y COMPLETED', async () => {
    const { d, responder } = await cargar({ presupuesto: 1 });
    d.despacharShadow(params('ok'));
    await d.esperarDespachos();
    expect(responder).toHaveBeenCalledTimes(1);
    expect(d.registroDespachos().map((r) => r.estado)).toEqual(['DISPATCHED', 'COMPLETED']);
  });
  it('kill switch false → cero llamadas y cero registros', async () => {
    const { d, responder } = await cargar({ habilitado: false, presupuesto: 1 });
    d.despacharShadow(params('k'));
    await d.esperarDespachos();
    expect(responder).not.toHaveBeenCalled();
    expect(d.registroDespachos()).toEqual([]);
  });
  it('privacy REJECT → cero llamadas (etapa A/B como SKIPPED_PII; C/E como SKIPPED_PRIVACY)', async () => {
    const { d, responder } = await cargar({ presupuesto: 1 });
    d.despacharShadow(params('p1', { pregunta: 'Mi correo es a@b.com, artículo 173' }));
    d.despacharShadow(params('p2', { pregunta: '¿Qué hago?' }));
    await d.esperarDespachos();
    expect(responder).not.toHaveBeenCalled();
    expect(d.registroDespachos()).toEqual([
      { queryId: 'p1', estado: 'SKIPPED_PII', motivo: 'EMAIL' },
      { queryId: 'p2', estado: 'SKIPPED_PRIVACY', motivo: 'sin_senal_juridica' },
    ]);
  });
  it('corpus REJECT → cero llamadas', async () => {
    const { d, responder } = await cargar({ presupuesto: 1 });
    d.despacharShadow(params('c', { fragmentos: [frag(), frag({ id: 'f2', fuente: 'doc_privado' })] }));
    await d.esperarDespachos();
    expect(responder).not.toHaveBeenCalled();
    expect(d.registroDespachos()).toEqual([{ queryId: 'c', estado: 'SKIPPED_PUBLIC_CORPUS', motivo: 'fuente_documental_excluida' }]);
  });
  it('credencial ausente → cero llamadas y SKIPPED_NO_CREDENTIALS', async () => {
    const { d, responder } = await cargar({ presupuesto: 1, credencial: false });
    d.despacharShadow(params('n'));
    await d.esperarDespachos();
    expect(responder).not.toHaveBeenCalled();
    expect(d.registroDespachos()).toEqual([{ queryId: 'n', estado: 'SKIPPED_NO_CREDENTIALS', motivo: null }]);
  });
  it('presupuesto 0 (el valor real por defecto) → cero llamadas y SKIPPED_BUDGET', async () => {
    const { d, responder } = await cargar(); // sin mock de presupuesto: se usa SHADOW_BUDGET_USD real
    for (let i = 0; i < 3; i++) d.despacharShadow(params(`b${i}`));
    await d.esperarDespachos();
    expect(responder).not.toHaveBeenCalled();
    expect(d.registroDespachos().map((r) => r.estado)).toEqual(['SKIPPED_BUDGET', 'SKIPPED_BUDGET', 'SKIPPED_BUDGET']);
  });
  it('presupuesto insuficiente para el peor caso → cero llamadas', async () => {
    const { d, responder } = await cargar({ presupuesto: 0.0000001 });
    d.despacharShadow(params('i'));
    await d.esperarDespachos();
    expect(responder).not.toHaveBeenCalled();
    expect(d.registroDespachos()[0].estado).toBe('SKIPPED_BUDGET');
  });
  it('circuit abierto → cero llamadas adicionales', async () => {
    const { d, responder } = await cargar({ presupuesto: 1, responder: async () => { throw new Error('caído'); } });
    for (let i = 0; i < 5; i++) { d.despacharShadow(params(`e${i}`)); await d.esperarDespachos(); }
    expect(responder).toHaveBeenCalledTimes(5);
    d.despacharShadow(params('abierto'));
    await d.esperarDespachos();
    expect(responder).toHaveBeenCalledTimes(5);
    expect(d.registroDespachos().at(-1)).toEqual({ queryId: 'abierto', estado: 'SKIPPED_CIRCUIT_OPEN', motivo: null });
  });
  it('M1: cero fragmentos → SKIPPED_PUBLIC_CORPUS (sin_evidencia) y cero llamadas, con kill switch y presupuesto simulados encendidos', async () => {
    const { d, responder } = await cargar({ habilitado: true, presupuesto: 1, credencial: true });
    d.despacharShadow(params('vacio', { fragmentos: [] }));
    await d.esperarDespachos();
    expect(responder).not.toHaveBeenCalled();
    expect(d.registroDespachos()).toEqual([{ queryId: 'vacio', estado: 'SKIPPED_PUBLIC_CORPUS', motivo: 'sin_evidencia' }]);
  });
  it('orden: privacidad antes que corpus, corpus antes que credencial, credencial antes que presupuesto', async () => {
    const { d } = await cargar({ credencial: false }); // presupuesto 0 real
    d.despacharShadow(params('o1', { pregunta: 'Mi correo es a@b.com', fragmentos: [frag({ jurisdiccion: 'MX' })] }));
    d.despacharShadow(params('o2', { fragmentos: [frag({ jurisdiccion: 'MX' })] }));
    d.despacharShadow(params('o3'));
    await d.esperarDespachos();
    expect(d.registroDespachos().map((r) => r.estado)).toEqual(['SKIPPED_PII', 'SKIPPED_PUBLIC_CORPUS', 'SKIPPED_NO_CREDENTIALS']);
  });
  it('un presupuesto rechazado con el breaker semiabierto devuelve la sonda sin cambiar el estado', async () => {
    const { d } = await cargar({ presupuesto: 0.0000001 });
    d.despacharShadow(params('x'));
    await d.esperarDespachos();
    expect(d.registroDespachos()[0].estado).toBe('SKIPPED_BUDGET');
  });
});

describe('dispatcher: aislamiento de producción y del registro', () => {
  it('la excepción del adaptador no se propaga: despacharShadow devuelve undefined y se anota ERROR', async () => {
    const { d } = await cargar({ presupuesto: 1, responder: async () => { throw new Error('boom'); } });
    expect(d.despacharShadow(params('x'))).toBeUndefined();
    await d.esperarDespachos();
    expect(d.registroDespachos().at(-1)).toMatchObject({ estado: 'ERROR', motivo: 'Error' });
  });
  it('el timeout aborta la señal y se anota TIMEOUT', async () => {
    let senal: AbortSignal | undefined;
    const { d } = await cargar({ presupuesto: 1, responder: (_i, o) => { senal = o?.signal; return new Promise(() => {}); } });
    d.despacharShadow(params('t'));
    await d.esperarDespachos();
    expect(senal!.aborted).toBe(true);
    expect(d.registroDespachos().at(-1)).toMatchObject({ estado: 'TIMEOUT' });
  });
  it('un fallo con costo desconocido conserva el peor caso como gastado (el presupuesto se agota)', async () => {
    // Presupuesto justo para una sola llamada: tras un error, la reserva queda como gasto y la siguiente se rechaza.
    const { d, responder } = await cargar({ presupuesto: 0.0006, responder: async () => { throw new Error('boom'); } });
    d.despacharShadow(params('g1'));
    await d.esperarDespachos();
    d.despacharShadow(params('g2'));
    await d.esperarDespachos();
    expect(responder).toHaveBeenCalledTimes(1);
    expect(d.registroDespachos().at(-1)).toMatchObject({ queryId: 'g2', estado: 'SKIPPED_BUDGET' });
  });
  it('la evidencia que recibe el adaptador lleva rol null (nunca CONTEXT por defecto) y la clasificación de producción', async () => {
    let recibido: ShadowGatewayInput | undefined;
    const { d } = await cargar({
      presupuesto: 1,
      responder: async (i) => { recibido = i; return { rawOutput: { decision: 'ABSTAIN', claims: [], abstention_reason: 'x' }, usage: { inputTokens: 1, outputTokens: 1 }, latencyMs: 1 }; },
    });
    d.despacharShadow(params('r'));
    await d.esperarDespachos();
    expect(recibido!.evidence).toHaveLength(1);
    expect(recibido!.evidence[0]).toMatchObject({ rol: null, clasificacionProduccion: 'NORMA_VIGENTE_HONDURAS', citable: true });
  });
  it('el registro no contiene la pregunta cruda ni texto de claims ni de evidence', async () => {
    const { d } = await cargar({ presupuesto: 1 });
    d.despacharShadow(params('reg', { pregunta: 'Explica el artículo 173 del Código Procesal Penal de Honduras con detalle' }));
    d.despacharShadow(params('reg2', { pregunta: 'Mi correo es juan@example.com, artículo 173' }));
    await d.esperarDespachos();
    const volcado = JSON.stringify(d.registroDespachos());
    expect(volcado).not.toMatch(/Explica|detalle|juan|example|Texto de prueba|texto"/);
    for (const r of d.registroDespachos()) expect(Object.keys(r).every((k) => ['queryId', 'estado', 'motivo', 'uso', 'desacuerdo'].includes(k))).toBe(true);
  });
});

// ── Guard de red y credenciales ──────────────────────────────────────────────
describe('network guard y credenciales', () => {
  const ADAPTADOR = join(RAIZ, 'lib', 'ai-gateway', 'shadow', 'openai-adapter.ts');
  const importaOpenai = /(?:from|import|require)\s*\(?\s*['"]openai(?:\/[^'"]*)?['"]/;

  it('ningún archivo de app/ ni de lib/ importa openai salvo openai-adapter.ts', () => {
    const todos = [...archivos(join(RAIZ, 'app')), ...archivos(join(RAIZ, 'lib'))];
    const importan = todos.filter((p) => importaOpenai.test(readFileSync(p, 'utf8'))).map((p) => relative(RAIZ, p));
    expect(importan).toEqual(['lib/ai-gateway/shadow/openai-adapter.ts']);
  });
  it('solo openai-adapter.ts lee la credencial; nadie más nombra la variable ni usa NEXT_PUBLIC', () => {
    const todos = [...archivos(join(RAIZ, 'app')), ...archivos(join(RAIZ, 'lib'))];
    const lectores = todos.filter((p) => /OPENAI_API_KEY/.test(readFileSync(p, 'utf8'))).map((p) => relative(RAIZ, p));
    expect(lectores).toEqual(['lib/ai-gateway/shadow/openai-adapter.ts']);
    for (const p of archivos(join(RAIZ, 'lib', 'ai-gateway'))) expect(readFileSync(p, 'utf8'), relative(RAIZ, p)).not.toMatch(/NEXT_PUBLIC/);
  });
  it('el adaptador no abre red por su cuenta: sin fetch, XHR, axios, undici, http/https ni Supabase', () => {
    const fuente = readFileSync(ADAPTADOR, 'utf8');
    // Se quita solo lo autorizado: el import del SDK y la lectura de la credencial.
    const sinPermitido = fuente.replace(/import OpenAI from 'openai';/, '').replace(/process\.env\.OPENAI_API_KEY/g, 'CLAVE');
    const GUARD = new RegExp([
      String.raw`\bfetch\s*\(`, 'XMLHttpRequest', 'OPENAI_API_KEY', String.raw`process\.env`, '@supabase',
      String.raw`(?:from|import|require)\s*\(?\s*['"](?:openai|axios|undici|(?:node:)?https?)['"]`,
    ].join('|'));
    expect(sinPermitido).not.toMatch(GUARD);
    expect((fuente.match(/process\.env\.OPENAI_API_KEY/g) ?? []).length).toBeLessThanOrEqual(2);
  });
  it('es solo servidor: ningún archivo con «use client» importa el gateway ni el adaptador', () => {
    const todos = [...archivos(join(RAIZ, 'app')), ...archivos(join(RAIZ, 'lib')), ...archivos(join(RAIZ, 'components'))].filter((p) => !p.includes('/ai-gateway/'));
    const cliente = todos.filter((p) => /^\s*['"]use client['"]/m.test(readFileSync(p, 'utf8')));
    for (const p of cliente) expect(readFileSync(p, 'utf8'), relative(RAIZ, p)).not.toMatch(/ai-gateway/);
  });
  it('las tarifas viven solo en shadow-model-config.ts: ningún otro módulo del gateway repite sus valores', () => {
    const { standard, batch } = SHADOW_MODEL_CONFIG.pricing;
    const valores = [standard.inputUsdPerMillion, standard.outputUsdPerMillion, standard.cachedInputUsdPerMillion, batch.inputUsdPerMillion, batch.outputUsdPerMillion].map(String);
    const patron = new RegExp(`(?<![\\w.])(?:${valores.map((v) => v.replace('.', '\\.')).join('|')})(?![\\w.])`);
    for (const p of archivos(join(RAIZ, 'lib', 'ai-gateway')).filter((x) => !x.endsWith('shadow-model-config.ts'))) {
      const sinComentarios = readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      expect(sinComentarios, relative(RAIZ, p)).not.toMatch(patron);
    }
  });
  it('la documentación de retención está en el adaptador: store:false no es ZDR y no se envían datos privados', () => {
    const fuente = readFileSync(ADAPTADOR, 'utf8');
    expect(fuente).toMatch(/NO equivale a Zero Data Retention/);
    expect(fuente).toMatch(/monitoreo de abuso/);
    expect(fuente).toMatch(/previous_response_id/);
  });
});
