/**
 * PR-G1 — MAYALEX AI GATEWAY v1, SHADOW MODE (dictamen CLO 21-oct-2026).
 * Contratos, esquema estricto, validador de citas, tarifas y runner del Golden
 * Set con respuestas grabadas. Sin red, sin OpenAI, sin variables de entorno.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { validarSalida, type SalidaCruda } from '@/lib/ai-gateway/shadow/citation-validator';
import { RecordedResponseAdapter, entraAlGate, runGoldenSet, type GoldenCase } from '@/lib/ai-gateway/shadow/golden-runner';
import { MODEL_OUTPUT_JSON_SCHEMA, parsearSalidaModelo } from '@/lib/ai-gateway/shadow/model-output-schema';
import { estimarCostoUsd } from '@/lib/ai-gateway/shadow/pricing';
import { SHADOW_MODEL_CONFIG } from '@/lib/ai-gateway/shadow/shadow-model-config';
import { MODELO_GATEWAY, type ShadowGatewayInput, type ShadowGatewayResult } from '@/lib/ai-gateway/shadow/types';
import { construirRespuestaHttpUsuario, type ProductionUserResponse } from '@/lib/ai-gateway/user-response-boundary';
import { resolverVersion } from '@/lib/legal-retrieval/norma-version';
import {
  CASOS_PENDIENTES_CLO,
  GOLDEN_G1,
  PARA_PR_POSTERIOR_ISSUE_78,
  PENDIENTE_VERIFICACION_CLO,
  RESPUESTAS_GRABADAS_G1,
  PROCEDENCIA_G1,
  VERSION_REFORMA_SIN_INSTRUMENTO,
} from './golden/gateway-g1-casos';

const PENAL = 'G1-VIG-CODIGO-PENAL-130-2017';

const RAIZ = join(__dirname, '..');

const input = (evidenceIds: string[], decision: 'ANSWER' | 'ABSTAIN' = 'ANSWER', queryId = 'q-test'): ShadowGatewayInput => ({
  queryId,
  sanitizedQuestion: 'pregunta sintética',
  evidence: evidenceIds.map((chunk_id) => ({ chunk_id, instrumento: 'SINT', articulo: '1', gaceta: null, rol: 'PRIMARY' as const, citable: true, texto: 'FIXTURE SINTÉTICA' })),
  productionOutcome: { decision, retrievalState: decision === 'ANSWER' ? 'EXACT_SUCCESS' : 'NO_VERIFIED_EVIDENCE' },
});
const cruda = (rawOutput: unknown): SalidaCruda => ({ rawOutput, usage: { inputTokens: 1000, outputTokens: 100 }, latencyMs: 5 });
const answer = (claims: unknown[]) => ({ decision: 'ANSWER', claims, abstention_reason: null });

describe('modelo y contratos', () => {
  it('el único modelo es gpt-6-luna', () => {
    expect(MODELO_GATEWAY).toBe('gpt-6-luna');
    expect(SHADOW_MODEL_CONFIG.modelId).toBe('gpt-6-luna');
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

describe('tarifas de gpt-6-luna (única fuente: shadow-model-config.ts)', () => {
  const { standard, batch } = SHADOW_MODEL_CONFIG.pricing;
  it('la configuración central lleva fecha de verificación y URL documental', () => {
    expect(SHADOW_MODEL_CONFIG.pricing.verifiedAt).toBe('2026-10-23');
    expect(SHADOW_MODEL_CONFIG.pricing.sourceUrl).toBe('https://developers.openai.com/api/docs/pricing');
  });
  it('estima el costo por millón de tokens con las tarifas de la configuración', () => {
    expect(estimarCostoUsd(1_000_000, 0)).toBeCloseTo(standard.inputUsdPerMillion, 12);
    expect(estimarCostoUsd(0, 1_000_000)).toBeCloseTo(standard.outputUsdPerMillion, 12);
    expect(estimarCostoUsd(1_000_000, 1_000_000, 'batch')).toBeCloseTo(batch.inputUsdPerMillion + batch.outputUsdPerMillion, 12);
  });
  it('la entrada en caché se cobra a su tarifa y es un subconjunto de la entrada', () => {
    expect(estimarCostoUsd(1_000_000, 0, 'standard', 1_000_000)).toBeCloseTo(standard.cachedInputUsdPerMillion, 12);
    expect(estimarCostoUsd(1_000_000, 0, 'standard', 400_000)).toBeCloseTo((600_000 * standard.inputUsdPerMillion + 400_000 * standard.cachedInputUsdPerMillion) / 1e6, 12);
    expect(() => estimarCostoUsd(100, 0, 'standard', 200)).toThrow(/caché/);
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
    expect(refs['G1-VIG-CODIGO-PENAL-130-2017']).toMatch(/Art\. 634 del D\.130-2017: deroga el D\.144-83/);
    expect(refs['G1-VIG-D57-2020-SIN-REVIVISCENCIA']).toMatch(/D\.43-2023 \(Gaceta 36,290\)\. No revive/);
    expect(refs['G1-ART-TRIBUTARIO-214']).toMatch(/D\.170-2016 \(Gaceta 34,224\): su art\. 214 deroga el D\.22-97/);
    expect(refs['G1-VER-REFORMA-NO-VINCULADA']).toMatch(/REFORMA_NO_VINCULADA, CONTEXT/);
  });
  it('H1 (CLO 22-oct-2026): el caso Penal D.130-2017 volvió al gate con fuentes oficiales y cuenta en las métricas', async () => {
    expect(GOLDEN_G1.some((c) => c.id === PENAL)).toBe(true);
    expect(PENDIENTE_VERIFICACION_CLO).toEqual([]);
    expect(Object.keys(RESPUESTAS_GRABADAS_G1)).toContain('q-g1-05');
    const informe = await runGoldenSet(GOLDEN_G1, new RecordedResponseAdapter(RESPUESTAS_GRABADAS_G1));
    expect(informe.casosEvaluados).toContain(PENAL);
    expect(informe.casosExcluidosPendientes).not.toContain(PENAL);
  });
  it('H1: 634 y 144-83 se aceptan sólo en el caso Penal; en cualquier otro caso siguen prohibidos', () => {
    // Política: las referencias 634 y 144-83 sólo se permiten en el caso Penal verificado por el CLO.
    const REFERENCIA_PENAL = /art\. 634|\b634\b|144-83/;
    const violaPolitica = (caso: GoldenCase, grabada: unknown) => caso.id !== PENAL && REFERENCIA_PENAL.test(JSON.stringify({ caso, grabada }));
    const penalReal = GOLDEN_G1.find((c) => c.id === PENAL)!;
    expect(violaPolitica(penalReal, RESPUESTAS_GRABADAS_G1['q-g1-05'])).toBe(false);
    const ficticio: GoldenCase = { ...penalReal, id: 'G1-FICTICIO-OTRO' };
    expect(violaPolitica(ficticio, RESPUESTAS_GRABADAS_G1['q-g1-05'])).toBe(true);
    expect(violaPolitica({ ...GOLDEN_G1[0], referenciaCLO: 'El art. 634 deroga algo' }, undefined)).toBe(true);
    const otrosCasos = GOLDEN_G1.filter((c) => c.id !== PENAL);
    const queryIdsOtros = new Set(otrosCasos.map((c) => c.input.queryId));
    const otrasRespuestas = Object.fromEntries(Object.entries(RESPUESTAS_GRABADAS_G1).filter(([q]) => queryIdsOtros.has(q)));
    expect(JSON.stringify({ otrosCasos, otrasRespuestas, PROCEDENCIA: otrosCasos.map((c) => PROCEDENCIA_G1[c.id]) })).not.toMatch(/art\. 634|\b634\b|144-83/);
    const penal = GOLDEN_G1.find((c) => c.id === PENAL)!;
    expect(JSON.stringify({ penal, r: RESPUESTAS_GRABADAS_G1['q-g1-05'] })).toMatch(/634/);
    expect(JSON.stringify(RESPUESTAS_GRABADAS_G1['q-g1-05'])).toMatch(/144-83/);
  });

  it('H3: cada caso lleva clo_ruling_ref (fecha y dictamen CLO), su artículo y su Gaceta', () => {
    for (const c of GOLDEN_G1) {
      expect(c.clo_ruling_ref, c.id).toMatch(/CLO/);
      // Procedencia 2 (fuentes oficiales, 22-oct-2026): se valida en tests/golden-procedencia-clo.test.ts.
      if (PROCEDENCIA_G1[c.id].kind === 'CLO_OFFICIAL_SOURCE_RULING') {
        expect(c.articulo.trim(), c.id).not.toBe('');
        expect(c.gaceta, c.id).toMatch(/\d{2},\d{3}/);
        continue;
      }
      expect(c.clo_ruling_ref, c.id).toMatch(/21-oct-2026/);
      // H3-bis (Auditor, 22-oct-2026): la fuente verificable es el dictamen del issue #74, con su URL y su código de caso;
      // el prompt PR-G1 puede acompañarla, pero no ser la única referencia.
      expect(c.clo_ruling_ref, c.id).toContain('issuecomment-6313691566');
      expect(c.clo_ruling_ref, c.id).toMatch(/\b[A-E]\d\b|punto 1/);
      expect(c.articulo.trim(), c.id).not.toBe('');
      if (c.gaceta !== null) expect(c.gaceta, c.id).toMatch(/\d{2},\d{3}/);
    }
    // La única Gaceta nula es la del caso sintético, que el dictamen no ata a ninguna.
    expect(GOLDEN_G1.filter((c) => c.gaceta === null).map((c) => c.id)).toEqual(['G1-VER-REFORMA-NO-VINCULADA']);
  });
  it('H3: ningún caso sin clo_ruling_ref entra al gate', async () => {
    const base = GOLDEN_G1[0];
    for (const sinRef of ['', '   ', undefined as unknown as string]) {
      const caso: GoldenCase = { ...base, id: 'SIN-REF', clo_ruling_ref: sinRef };
      expect(entraAlGate(caso)).toBe(false);
    }
    expect(entraAlGate(base)).toBe(true);
    expect(entraAlGate({ ...base, estado: 'PENDIENTE' })).toBe(false);
    const sinRef: GoldenCase = { ...base, id: 'SIN-REF', clo_ruling_ref: '', input: { ...base.input, queryId: 'q-sin-grabar' } };
    const informe = await runGoldenSet([...GOLDEN_G1, sinRef], new RecordedResponseAdapter(RESPUESTAS_GRABADAS_G1));
    expect(informe.casosEvaluados).not.toContain('SIN-REF');
    expect(informe.casosExcluidosPendientes).toEqual(['SIN-REF']);
    expect(informe.gate.pasa).toBe(true);
  });

  it('H2: A1, A3, B2, B4, B5, C4, D2 y D3 no se agregan: quedan para un PR posterior (Issue #78)', () => {
    expect(PARA_PR_POSTERIOR_ISSUE_78.map((c) => c.id)).toEqual(['A1', 'A3', 'B2', 'B4', 'B5', 'C4', 'D2', 'D3']);
    expect(GOLDEN_G1.map((c) => c.id).some((id) => /\b(A1|A3|B2|B4|B5|C4|D2|D3)\b/.test(id))).toBe(false);
  });

  it('coherencia: producción no abstiene con éxito ni responde sin evidencia verificada', () => {
    const exitos = ['EXACT_SUCCESS', 'SEMANTIC_SUCCESS', 'NOT_REQUIRED'];
    for (const c of GOLDEN_G1) {
      const { decision, retrievalState } = c.input.productionOutcome;
      if (decision === 'ABSTAIN') expect(exitos, c.id).not.toContain(retrievalState);
      else expect(exitos, c.id).toContain(retrievalState);
    }
    // q-g1-08: sólo evidencia CONTEXT, producción se abstiene por falta de evidencia verificada.
    const q8 = GOLDEN_G1.find((c) => c.id === 'G1-VER-REFORMA-NO-VINCULADA')!;
    expect(q8.input.productionOutcome).toEqual({ decision: 'ABSTAIN', retrievalState: 'NO_VERIFIED_EVIDENCE' });
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
    const { standard, batch: tarifaBatch } = SHADOW_MODEL_CONFIG.pricing;
    expect(std.metricas.costoEstimadoUsd).toBeCloseTo((tin * standard.inputUsdPerMillion + tout * standard.outputUsdPerMillion) / 1e6, 12);
    expect(batch.metricas.costoEstimadoUsd).toBeCloseTo((tin * tarifaBatch.inputUsdPerMillion + tout * tarifaBatch.outputUsdPerMillion) / 1e6, 12);
  });

  it('TEST CRÍTICO: si el adaptador falso dice ANSWER y producción dice ABSTAIN, se registra el desacuerdo', async () => {
    const caso = GOLDEN_G1.find((c) => c.id === 'G1-ABS-NOTARIADO-ART-500')!;
    const respuestas = {
      ...RESPUESTAS_GRABADAS_G1,
      [caso.input.queryId]: cruda(answer([{ claim_id: 'c1', text: 'El art. 500 regula…', citations: [{ chunk_id: 'cn-94', support: 'DIRECT' }] }])),
    };
    const informe = await runGoldenSet(GOLDEN_G1, new RecordedResponseAdapter(respuestas));
    expect(informe.desacuerdos).toEqual([
      expect.objectContaining({ caseId: caso.id, shadowStatus: 'ANSWER', produccion: 'ABSTAIN', desacuerdoConProduccion: true, cumpleEsperado: false }),
    ]);
    expect(informe.metricas.abstencionCorrecta.tasa).toBeCloseTo(2 / 3, 12);
    expect(informe.gate.pasa).toBe(false);
  });
  it('desacuerdo INVERSO: el shadow dice ABSTAIN y producción dice ANSWER, y queda registrado', async () => {
    const caso = GOLDEN_G1.find((c) => c.id === 'G1-ART-TRIBUTARIO-214')!;
    expect(caso.input.productionOutcome.decision).toBe('ANSWER');
    const respuestas = {
      ...RESPUESTAS_GRABADAS_G1,
      [caso.input.queryId]: cruda({ decision: 'ABSTAIN', claims: [], abstention_reason: 'No encuentro evidencia suficiente.' }),
    };
    const informe = await runGoldenSet(GOLDEN_G1, new RecordedResponseAdapter(respuestas));
    expect(informe.desacuerdos).toEqual([
      expect.objectContaining({ caseId: caso.id, shadowStatus: 'ABSTAIN', produccion: 'ANSWER', esperado: 'ANSWER', desacuerdoConProduccion: true, cumpleEsperado: false }),
    ]);
    expect(informe.gate.pasa).toBe(false);
    // No cuenta como abstención correcta: el CLO esperaba ANSWER.
    expect(informe.metricas.abstencionCorrecta).toEqual({ numerador: 3, denominador: 3, tasa: 1 });
    expect(informe.metricas.exactitudArticuloExacto.tasa).toBeCloseTo(2 / 3, 12);
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
    // G3: cp-173 es CONTEXT (no citable); una cita DIRECT a un fragmento no citable no cuenta como respaldo, así que la
    // claim se descarta y el resultado es INVALID. Sigue sin ser un acierto y el gate sigue fallando.
    expect(informe.comparaciones[0]).toMatchObject({ shadowStatus: 'INVALID', articuloExactoCorrecto: false, cumpleEsperado: false });
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
  it('fuera del gateway sólo app/api/chat/route.ts importa lib/ai-gateway, y sólo el dispatcher (PR-G2)', () => {
    const fuera = [...archivos(join(RAIZ, 'app')), ...archivos(join(RAIZ, 'lib'))].filter((p) => !relative(RAIZ, p).startsWith('lib/ai-gateway'));
    const importan = fuera.filter((p) => /ai-gateway/.test(readFileSync(p, 'utf8'))).map((p) => relative(RAIZ, p));
    expect(importan).toEqual(['app/api/chat/route.ts']);
    const lineas = readFileSync(join(RAIZ, 'app', 'api', 'chat', 'route.ts'), 'utf8').split('\n').filter((l) => /ai-gateway/.test(l));
    expect(lineas.filter((l) => /^import /.test(l))).toEqual(["import { despacharShadow } from '@/lib/ai-gateway/shadow/dispatcher';"]);
  });
  // Guard de red: fetch, XMLHttpRequest, OpenAI y su clave, process.env, Supabase y los clientes HTTP
  // (axios, undici, http y https, con o sin prefijo node:) en import, require o import dinámico.
  const GUARD_RED = new RegExp(
    [
      String.raw`\bfetch\s*\(`,
      'XMLHttpRequest',
      'OPENAI_API_KEY',
      String.raw`process\.env`,
      '@supabase',
      String.raw`(?:from|import|require)\s*\(?\s*['"](?:openai|axios|undici|(?:node:)?https?)['"]`,
    ].join('|'),
  );
  it('el guard de red detecta fetch, XMLHttpRequest, OpenAI, axios, undici, node:http, node:https, http y https', () => {
    const detectados = [
      "await fetch('https://x')",
      'new XMLHttpRequest()',
      "import OpenAI from 'openai'",
      "const k = OPENAI_API_KEY",
      'process.env.X',
      "import { createClient } from '@supabase/supabase-js'",
      "import axios from 'axios'",
      "import { request } from 'undici'",
      "import http from 'node:http'",
      "import https from 'node:https'",
      "import http from 'http'",
      "import https from \"https\"",
      "const h = require('node:http')",
      "const a = require('axios')",
      "const u = await import('undici')",
    ];
    for (const linea of detectados) expect(linea, linea).toMatch(GUARD_RED);
    // Sin falsos positivos con texto normal ni con la palabra «http» fuera de un import.
    for (const ok of ["const url = 'https://ejemplo'", 'const httpStatus = 200', "import { z } from 'zod'"]) {
      expect(ok, ok).not.toMatch(GUARD_RED);
    }
  });
  it('el gateway no abre red ni lee claves (guard ampliado)', () => {
    // G3: openai-adapter.ts es el único módulo con una excepción acotada (ver tests/ai-gateway-shadow-g3.test.ts).
    const fuentes = [...archivos(join(RAIZ, 'lib', 'ai-gateway')).filter((p) => !p.endsWith('openai-adapter.ts')), join(RAIZ, 'tests', 'golden', 'gateway-g1-casos.ts')];
    for (const p of fuentes) {
      expect(readFileSync(p, 'utf8'), relative(RAIZ, p)).not.toMatch(GUARD_RED);
    }
  });
});
