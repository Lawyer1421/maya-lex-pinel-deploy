/**
 * PR-G1 — MAYALEX AI GATEWAY v1, SHADOW MODE (dictamen CLO 21-oct-2026).
 * Contratos, esquema estricto, validador de citas, tarifas y runner del Golden
 * Set con respuestas grabadas. Sin red, sin OpenAI, sin variables de entorno.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { validarSalida, type SalidaCruda } from '@/lib/ai-gateway/shadow/citation-validator';
import { RecordedResponseAdapter, runGoldenSet, type GoldenCase } from '@/lib/ai-gateway/shadow/golden-runner';
import { MODEL_OUTPUT_JSON_SCHEMA, parsearSalidaModelo } from '@/lib/ai-gateway/shadow/model-output-schema';
import { TARIFAS_GPT6_LUNA, estimarCostoUsd } from '@/lib/ai-gateway/shadow/pricing';
import { MODELO_GATEWAY, type ShadowGatewayInput, type ShadowGatewayResult } from '@/lib/ai-gateway/shadow/types';
import { construirRespuestaHttpUsuario, type ProductionUserResponse } from '@/lib/ai-gateway/user-response-boundary';
import { resolverVersion } from '@/lib/legal-retrieval/norma-version';
import { CASOS_PENDIENTES_CLO, GOLDEN_G1, RESPUESTAS_GRABADAS_G1, VERSION_REFORMA_SIN_INSTRUMENTO } from './golden/gateway-g1-casos';

const RAIZ = join(__dirname, '..');

const input = (evidenceIds: string[], decision: 'ANSWER' | 'ABSTAIN' = 'ANSWER', queryId = 'q-test'): ShadowGatewayInput => ({
  queryId,
  sanitizedQuestion: 'pregunta sintética',
  evidence: evidenceIds.map((chunk_id) => ({ chunk_id, instrumento: 'SINT', articulo: '1', gaceta: null, rol: 'PRIMARY' as const, texto: 'FIXTURE SINTÉTICA' })),
  productionOutcome: { decision, retrievalState: decision === 'ANSWER' ? 'EXACT_SUCCESS' : 'NO_VERIFIED_EVIDENCE' },
});
const cruda = (rawOutput: unknown): SalidaCruda => ({ rawOutput, usage: { inputTokens: 1000, outputTokens: 100 }, latencyMs: 5 });
const answer = (claims: unknown[]) => ({ decision: 'ANSWER', claims, abstention_reason: null });

describe('modelo y contratos', () => {
  it('el único modelo es gpt-6-luna', () => {
    expect(MODELO_GATEWAY).toBe('gpt-6-luna');
    expect(TARIFAS_GPT6_LUNA.modelo).toBe('gpt-6-luna');
  });
  it('ShadowGatewayResult lleva origin SHADOW, status, claims, usage y latencyMs', () => {
    const r = validarSalida(input(['a']), cruda(answer([{ claim_id: 'c1', text: 't', citations: [{ chunk_id: 'a', support: 'DIRECT' }] }])));
    expect(r).toMatchObject({ origin: 'SHADOW', model: 'gpt-6-luna', status: 'ANSWER', latencyMs: 5 });
    expect(r.usage).toEqual({ inputTokens: 1000, outputTokens: 100, estimatedCostUsd: estimarCostoUsd(1000, 100) });
  });
});

describe('JSON Schema estricto de la salida del modelo', () => {
  const objetos = (nodo: unknown, out: Record<string, unknown>[] = []): Record<string, unknown>[] => {
    if (nodo && typeof nodo === 'object') {
      const o = nodo as Record<string, unknown>;
      if (o.type === 'object') out.push(o);
      for (const v of Object.values(o)) objetos(v, out);
    }
    return out;
  };
  it('additionalProperties: false y todos los campos obligatorios en cada objeto', () => {
    const os = objetos(MODEL_OUTPUT_JSON_SCHEMA);
    expect(os).toHaveLength(3);
    for (const o of os) {
      expect(o.additionalProperties).toBe(false);
      expect([...(o.required as string[])].sort()).toEqual(Object.keys(o.properties as object).sort());
    }
  });
  it('enums cerrados: decision ANSWER|ABSTAIN y support DIRECT|INDIRECT', () => {
    const p = MODEL_OUTPUT_JSON_SCHEMA.properties;
    expect(p.decision.enum).toEqual(['ANSWER', 'ABSTAIN']);
    expect(p.claims.items.properties.citations.items.properties.support.enum).toEqual(['DIRECT', 'INDIRECT']);
  });
  it.each([
    ['campo extra en la raíz', { ...answer([]), extra: 1 }],
    ['falta abstention_reason', { decision: 'ANSWER', claims: [] }],
    ['decision fuera del enum', { decision: 'MAYBE', claims: [], abstention_reason: null }],
    ['support fuera del enum', answer([{ claim_id: 'c', text: 't', citations: [{ chunk_id: 'a', support: 'STRONG' }] }])],
    ['cita sin support', answer([{ claim_id: 'c', text: 't', citations: [{ chunk_id: 'a' }] }])],
    ['campo extra en una cita', answer([{ claim_id: 'c', text: 't', citations: [{ chunk_id: 'a', support: 'DIRECT', page: 2 }] }])],
    ['claim sin claim_id', answer([{ text: 't', citations: [] }])],
    ['ABSTAIN sin motivo', { decision: 'ABSTAIN', claims: [], abstention_reason: null }],
    ['ABSTAIN con claims', { decision: 'ABSTAIN', claims: [{ claim_id: 'c', text: 't', citations: [] }], abstention_reason: 'x' }],
    ['ANSWER con motivo de abstención', { decision: 'ANSWER', claims: [], abstention_reason: 'x' }],
    ['claim_id repetido', answer([{ claim_id: 'c', text: 't', citations: [] }, { claim_id: 'c', text: 'u', citations: [] }])],
    ['JSON inválido', '{decision:'],
  ])('rechaza: %s', (_n, raw) => {
    expect(parsearSalidaModelo(raw).ok).toBe(false);
    expect(validarSalida(input(['a']), cruda(raw)).status).toBe('INVALID');
  });
  it('acepta un string JSON válido', () => {
    expect(parsearSalidaModelo(JSON.stringify(answer([]))).ok).toBe(true);
  });
});

describe('validador determinístico de citas', () => {
  it('una claim sin citas se descarta (SIN_CITAS)', () => {
    const r = validarSalida(input(['a']), cruda(answer([
      { claim_id: 'c1', text: 'sin cita', citations: [] },
      { claim_id: 'c2', text: 'con cita', citations: [{ chunk_id: 'a', support: 'DIRECT' }] },
    ])));
    expect(r.status).toBe('ANSWER');
    expect(r.claims.map((c) => c.claim_id)).toEqual(['c2']);
    expect(r.discardedClaims).toEqual([{ claim_id: 'c1', motivo: 'SIN_CITAS', chunkIdsInvalidos: [] }]);
    expect(r.invalidCitations).toBe(0);
  });
  it('una claim con un chunk_id fuera del evidence se descarta entera y la cita cuenta como inválida', () => {
    const r = validarSalida(input(['a']), cruda(answer([
      { claim_id: 'c1', text: 'mixta', citations: [{ chunk_id: 'a', support: 'DIRECT' }, { chunk_id: 'inventado', support: 'INDIRECT' }] },
      { claim_id: 'c2', text: 'buena', citations: [{ chunk_id: 'a', support: 'DIRECT' }] },
    ])));
    expect(r.claims.map((c) => c.claim_id)).toEqual(['c2']);
    expect(r.discardedClaims).toEqual([{ claim_id: 'c1', motivo: 'CITA_FUERA_DE_EVIDENCIA', chunkIdsInvalidos: ['inventado'] }]);
    expect(r.invalidCitations).toBe(1);
    expect(r.totalCitations).toBe(3);
  });
  it('el evidence de otra consulta no sirve: sólo cuenta el bundle de ESA consulta', () => {
    const otra = input(['de-otra-consulta'], 'ANSWER', 'q-otra');
    expect(otra.evidence[0].chunk_id).toBe('de-otra-consulta');
    const r = validarSalida(input(['a'], 'ANSWER', 'q-esta'), cruda(answer([{ claim_id: 'c1', text: 't', citations: [{ chunk_id: 'de-otra-consulta', support: 'DIRECT' }] }])));
    expect(r.invalidCitations).toBe(1);
    expect(r.status).toBe('INVALID');
  });
  it('ANSWER sin ninguna claim sustentada es INVALID, nunca una respuesta ni una abstención', () => {
    const r = validarSalida(input(['a']), cruda(answer([{ claim_id: 'c1', text: 't', citations: [] }])));
    expect(r.status).toBe('INVALID');
    expect(r.claims).toEqual([]);
    expect(r.invalidReason).toMatch(/sin ninguna claim sustentada/);
  });
  it('ANSWER sin claims también es INVALID', () => {
    expect(validarSalida(input(['a']), cruda(answer([]))).status).toBe('INVALID');
  });
  it('ABSTAIN válido queda ABSTAIN con su motivo', () => {
    const r = validarSalida(input([]), cruda({ decision: 'ABSTAIN', claims: [], abstention_reason: 'sin evidencia' }));
    expect(r).toMatchObject({ status: 'ABSTAIN', abstentionReason: 'sin evidencia', claims: [] });
  });
});

describe('tarifas de gpt-6-luna (verificadas el 21-oct-2026)', () => {
  it('constantes estándar y batch', () => {
    expect(TARIFAS_GPT6_LUNA.verificadoEl).toBe('2026-10-21');
    expect(TARIFAS_GPT6_LUNA.standard).toEqual({ inputUsdPorMillon: 0.1, outputUsdPorMillon: 0.5 });
    expect(TARIFAS_GPT6_LUNA.batch).toEqual({ inputUsdPorMillon: 0.05, outputUsdPorMillon: 0.25 });
  });
  it('estima el costo por millón de tokens', () => {
    expect(estimarCostoUsd(1_000_000, 0)).toBeCloseTo(0.1, 12);
    expect(estimarCostoUsd(0, 1_000_000)).toBeCloseTo(0.5, 12);
    expect(estimarCostoUsd(1_000_000, 1_000_000, 'batch')).toBeCloseTo(0.3, 12);
  });
  it('tokens inválidos no se estiman', () => {
    expect(() => estimarCostoUsd(-1, 0)).toThrow();
    expect(() => estimarCostoUsd(Number.NaN, 0)).toThrow();
  });
});

describe('Golden Set PR-G1 (sólo casos verificados por el CLO)', () => {
  it('carga exactamente los 8 casos verificados, cada uno con su referencia del CLO', () => {
    expect(GOLDEN_G1).toHaveLength(8);
    expect(GOLDEN_G1.every((c) => c.estado === 'VERIFICADO')).toBe(true);
    const refs = Object.fromEntries(GOLDEN_G1.map((c) => [c.id, c.referenciaCLO]));
    expect(refs['G1-ABS-NOTARIADO-ART-500']).toMatch(/art\. 500 no existe/);
    expect(refs['G1-ABS-NOTARIADO-ART-500']).toMatch(/último artículo es el 94/);
    expect(refs['G1-ABS-REGLAMENTO-ART-12-BIS']).toMatch(/PCSJ-17-2012, Gaceta 32,958/);
    expect(refs['G1-NOT-LEY-DEL-NOTARIADO']).toMatch(/D\.353-2005, Gaceta 30,904/);
    expect(refs['G1-REF-ART-173-B-CPP']).toMatch(/CPP \(adicionado por el D\.98-2017, Gaceta 34,473\)/);
    expect(refs['G1-VIG-CODIGO-PENAL-130-2017']).toMatch(/25-jun-2020 por el D\.46-2020/);
    expect(refs['G1-VIG-CODIGO-PENAL-130-2017']).toMatch(/art\. 634 deroga el D\.144-83/);
    expect(refs['G1-VIG-D57-2020-SIN-REVIVISCENCIA']).toMatch(/D\.43-2023 \(Gaceta 36,290\)\. No revive/);
    expect(refs['G1-ART-TRIBUTARIO-214']).toMatch(/D\.170-2016 \(Gaceta 34,224\): su art\. 214 deroga el D\.22-97/);
    expect(refs['G1-VER-REFORMA-NO-VINCULADA']).toMatch(/REFORMA_NO_VINCULADA, CONTEXT/);
  });
  it('las hipótesis NV del CLO quedan pendientes, fuera de los fixtures', () => {
    expect(CASOS_PENDIENTES_CLO.length).toBeGreaterThan(0);
    expect(GOLDEN_G1.some((c) => /Civil|Electoral/.test(c.referenciaCLO))).toBe(false);
  });
  it('el caso REFORMA_NO_VINCULADA usa el rol que da producción: CONTEXT, nunca PRIMARY', () => {
    const r = resolverVersion('SINT_G1', '1', '2026-10-21', [VERSION_REFORMA_SIN_INSTRUMENTO], { anioEnCurso: 2026 });
    expect(r.estado).toBe('CONTEXT');
    if (r.estado === 'FALLO_CERRADO') throw new Error('inesperado');
    expect(r.advertencias.map((a) => a.codigo)).toContain('REFORMA_NO_VINCULADA');
    const caso = GOLDEN_G1.find((c) => c.id === 'G1-VER-REFORMA-NO-VINCULADA')!;
    expect(caso.input.evidence.every((e) => e.rol === 'CONTEXT')).toBe(true);
  });

  it('con las respuestas grabadas el gate pasa: 0 % de citas inválidas y todas las métricas al 100 %', async () => {
    const informe = await runGoldenSet(GOLDEN_G1, new RecordedResponseAdapter(RESPUESTAS_GRABADAS_G1));
    expect(informe.modelo).toBe('gpt-6-luna');
    expect(informe.casosEvaluados).toHaveLength(8);
    expect(informe.metricas.citasInvalidas).toEqual({ numerador: 0, denominador: 7, tasa: 0 });
    expect(informe.metricas.abstencionCorrecta).toEqual({ numerador: 3, denominador: 3, tasa: 1 });
    expect(informe.metricas.exactitudArticuloExacto).toEqual({ numerador: 3, denominador: 3, tasa: 1 });
    expect(informe.metricas.precisionClaimsSustentadas).toEqual({ numerador: 6, denominador: 6, tasa: 1 });
    expect(informe.desacuerdos).toEqual([]);
    expect(informe.gate).toEqual({ pasa: true, motivos: [] });
  });
  it('costo estimado con las tarifas estándar y batch', async () => {
    const adapter = new RecordedResponseAdapter(RESPUESTAS_GRABADAS_G1);
    const std = await runGoldenSet(GOLDEN_G1, adapter);
    const batch = await runGoldenSet(GOLDEN_G1, adapter, { modoTarifa: 'batch' });
    const tin = Object.values(RESPUESTAS_GRABADAS_G1).reduce((s, r) => s + r.usage.inputTokens, 0);
    const tout = Object.values(RESPUESTAS_GRABADAS_G1).reduce((s, r) => s + r.usage.outputTokens, 0);
    expect(std.metricas.tokens).toEqual({ input: tin, output: tout });
    expect(std.metricas.costoEstimadoUsd).toBeCloseTo((tin * 0.1 + tout * 0.5) / 1e6, 12);
    expect(batch.metricas.costoEstimadoUsd).toBeCloseTo((tin * 0.05 + tout * 0.25) / 1e6, 12);
  });

  it('TEST CRÍTICO: si el adaptador falso dice ANSWER y producción dice ABSTAIN, se registra el desacuerdo', async () => {
    const caso = GOLDEN_G1.find((c) => c.id === 'G1-ABS-NOTARIADO-ART-500')!;
    const respuestas = {
      ...RESPUESTAS_GRABADAS_G1,
      [caso.input.queryId]: cruda(answer([{ claim_id: 'c1', text: 'El art. 500 regula…', citations: [{ chunk_id: 'cn-94', support: 'INDIRECT' }] }])),
    };
    const informe = await runGoldenSet(GOLDEN_G1, new RecordedResponseAdapter(respuestas));
    expect(informe.desacuerdos).toEqual([
      expect.objectContaining({ caseId: caso.id, shadowStatus: 'ANSWER', produccion: 'ABSTAIN', desacuerdoConProduccion: true, cumpleEsperado: false }),
    ]);
    expect(informe.metricas.abstencionCorrecta.tasa).toBeCloseTo(2 / 3, 12);
    expect(informe.gate.pasa).toBe(false);
  });
  it('un INVALID también es desacuerdo con producción', async () => {
    const caso = GOLDEN_G1.find((c) => c.id === 'G1-ART-TRIBUTARIO-214')!;
    const informe = await runGoldenSet([caso], new RecordedResponseAdapter({ [caso.input.queryId]: cruda('no es json') }));
    expect(informe.desacuerdos.map((d) => d.shadowStatus)).toEqual(['INVALID']);
    expect(informe.gate.pasa).toBe(false);
  });
  it('una cita inventada rompe el gate (objetivo 0 %)', async () => {
    const caso = GOLDEN_G1.find((c) => c.id === 'G1-ART-TRIBUTARIO-214')!;
    const respuestas = {
      [caso.input.queryId]: cruda(answer([
        { claim_id: 'c1', text: 'ok', citations: [{ chunk_id: 'ct-214', support: 'DIRECT' }] },
        { claim_id: 'c2', text: 'inventada', citations: [{ chunk_id: 'ct-999', support: 'DIRECT' }] },
      ])),
    };
    const informe = await runGoldenSet([caso], new RecordedResponseAdapter(respuestas));
    expect(informe.metricas.citasInvalidas).toEqual({ numerador: 1, denominador: 2, tasa: 0.5 });
    expect(informe.metricas.precisionClaimsSustentadas).toEqual({ numerador: 1, denominador: 2, tasa: 0.5 });
    expect(informe.gate.pasa).toBe(false);
  });
  it('art. 173-B citado desde el Código Penal no cuenta como acierto', async () => {
    const caso = GOLDEN_G1.find((c) => c.id === 'G1-REF-ART-173-B-CPP')!;
    const respuestas = { [caso.input.queryId]: cruda(answer([{ claim_id: 'c1', text: 't', citations: [{ chunk_id: 'cp-173', support: 'DIRECT' }] }])) };
    const informe = await runGoldenSet([caso], new RecordedResponseAdapter(respuestas));
    expect(informe.comparaciones[0]).toMatchObject({ articuloExactoCorrecto: false, citaInstrumentoProhibido: true, cumpleEsperado: false });
    expect(informe.gate.pasa).toBe(false);
  });
  it('un caso PENDIENTE no entra al gate ni se evalúa', async () => {
    const pendiente: GoldenCase = { ...GOLDEN_G1[0], id: 'HIPOTESIS', estado: 'PENDIENTE', input: { ...GOLDEN_G1[0].input, queryId: 'q-sin-grabar' } };
    const informe = await runGoldenSet([...GOLDEN_G1, pendiente], new RecordedResponseAdapter(RESPUESTAS_GRABADAS_G1));
    expect(informe.casosExcluidosPendientes).toEqual(['HIPOTESIS']);
    expect(informe.casosEvaluados).not.toContain('HIPOTESIS');
    expect(informe.gate.pasa).toBe(true);
  });
  it('sin casos verificados el gate no pasa y las tasas son null, no 100 %', async () => {
    const informe = await runGoldenSet([], new RecordedResponseAdapter({}));
    expect(informe.gate.pasa).toBe(false);
    expect(informe.metricas.abstencionCorrecta.tasa).toBeNull();
  });
  it('el adaptador falso no inventa respuestas para un caso sin grabar', async () => {
    await expect(new RecordedResponseAdapter({}).responder(GOLDEN_G1[0].input)).rejects.toThrow(/sin respuesta grabada/);
  });
});

describe('aislamiento: el resultado sombra nunca llega al usuario', () => {
  it('construirRespuestaHttpUsuario no acepta un ShadowGatewayResult (comprobado por tsc)', () => {
    const sombra: ShadowGatewayResult = validarSalida(input(['a']), cruda({ decision: 'ABSTAIN', claims: [], abstention_reason: 'x' }));
    // @ts-expect-error: un ShadowGatewayResult no es un ProductionUserResponse.
    const noAsignable: ProductionUserResponse = sombra;
    // @ts-expect-error: la función que construye la respuesta HTTP rechaza un resultado sombra.
    expect(() => construirRespuestaHttpUsuario(sombra)).toThrow(/sólo una respuesta de producción/);
    expect(noAsignable.origin).toBe('SHADOW');
  });
  it('una respuesta de producción sí se construye', async () => {
    const res = construirRespuestaHttpUsuario({ origin: 'PRODUCTION', body: { ok: true } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  const archivos = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? archivos(p) : /\.(ts|tsx)$/.test(n) ? [p] : [];
    });
  it('ningún archivo de app/ ni de lib/ fuera del gateway importa lib/ai-gateway', () => {
    const fuera = [...archivos(join(RAIZ, 'app')), ...archivos(join(RAIZ, 'lib'))].filter((p) => !relative(RAIZ, p).startsWith('lib/ai-gateway'));
    const importan = fuera.filter((p) => /ai-gateway/.test(readFileSync(p, 'utf8'))).map((p) => relative(RAIZ, p));
    expect(importan).toEqual([]);
  });
  it('el gateway no abre red ni lee claves: sin fetch, OpenAI, OPENAI_API_KEY, process.env ni Supabase', () => {
    const fuentes = [...archivos(join(RAIZ, 'lib', 'ai-gateway')), join(RAIZ, 'tests', 'golden', 'gateway-g1-casos.ts')];
    for (const p of fuentes) {
      const src = readFileSync(p, 'utf8');
      expect(src, relative(RAIZ, p)).not.toMatch(/\bfetch\s*\(|from ['"]openai['"]|OPENAI_API_KEY|process\.env|@supabase|XMLHttpRequest|node:https?\b/);
    }
  });
});
