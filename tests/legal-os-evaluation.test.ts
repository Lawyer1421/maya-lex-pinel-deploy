import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as M from '@/lib/legal-os/evaluation/metrics';
import { UMBRALES_CI, compararInformes, ejecutarEvaluacion, informeMarkdown } from '@/lib/legal-os/evaluation/runner';
import { GoldenCase, MATERIAS, RunResult } from '@/lib/legal-os/evaluation/schema';
import { GOLDEN_SEED } from '@/lib/legal-os/evaluation/seed-golden';
import { GOLDEN_G1 } from './golden/gateway-g1-casos';

type ExpectedIn = Partial<GoldenCase['expected']>;
const caso = (extra: Partial<Omit<GoldenCase, 'expected'>> & { expected?: ExpectedIn } = {}): GoldenCase =>
  GoldenCase.parse({
    id: 'c1', matter: 'Criminal', question: 'q', review_state: 'PENDING_CLO_REVIEW', source_of_expectation: 'prueba sintética',
    ...extra, expected: { decision: 'ANSWER', mustCite: [], mustNotCite: [], ...extra.expected },
  });
const res = (extra: Partial<RunResult> = {}): RunResult => RunResult.parse({ caseId: 'c1', decision: 'ANSWER', latencyMs: 100, costUsd: 0.001, ...extra });
const par = (c: GoldenCase, r: RunResult): M.Par => ({ caso: c, resultado: r });

describe('esquema', () => {
  it('cubre las 15 materias y exige fuente de la expectativa', () => {
    expect(MATERIAS).toHaveLength(15);
    expect(() => GoldenCase.parse({ id: 'x', matter: 'Civil', question: 'q', expected: { decision: 'ABSTAIN' }, review_state: 'CLO_APPROVED' })).toThrow();
    expect(() => GoldenCase.parse({ id: 'x', matter: 'Inventada', question: 'q', expected: { decision: 'ABSTAIN' }, review_state: 'CLO_APPROVED', source_of_expectation: 'abcdef' })).toThrow();
  });
});

describe('métricas: sin datos → null con motivo, nunca 100 %', () => {
  it('todas devuelven null cuando no hay elementos', () => {
    for (const [nombre, f] of Object.entries(M.METRICAS)) {
      const r = f([]);
      expect(r.value, nombre).toBeNull();
      expect(r.n, nombre).toBe(0);
      expect(r.reason, nombre).toBeTruthy();
    }
  });
  it('corrección jurídica solo cuenta casos aprobados por el CLO', () => {
    const pendiente = par(caso(), res());
    expect(M.legalCorrectness([pendiente]).value).toBeNull();
    const aprobadoOk = par(caso({ review_state: 'CLO_APPROVED' }), res());
    const aprobadoMal = par(caso({ id: 'c2', review_state: 'CLO_APPROVED', expected: { decision: 'ABSTAIN' } }), res({ caseId: 'c2' }));
    expect(M.legalCorrectness([pendiente, aprobadoOk, aprobadoMal])).toEqual({ value: 0.5, n: 2, denominator: 2 });
  });
});

describe('métricas: valores', () => {
  const c = caso({ expected: { instrument: 'CPP', article: '173-B', mustCite: [{ instrumento: 'CPP', articulo: '173-B' }], mustNotCite: [{ instrumento: 'CODIGO_PENAL' }], expectedVersionDate: '2020-01-01' } });
  const bien = res({
    citations: [{ chunkId: 'a', instrumento: 'CPP', articulo: '173-B' }], versionDate: '2020-01-01',
    retrieved: [{ id: 'a', instrumento: 'CPP', articulo: '173-B' }, { id: 'b', instrumento: 'CODIGO_PENAL', articulo: '173' }],
  });
  const mal = res({ citations: [{ chunkId: 'b', instrumento: 'CODIGO_PENAL', articulo: '173' }], versionDate: '2019-01-01', retrieved: [{ id: 'b', instrumento: 'CODIGO_PENAL', articulo: '173' }] });
  it('citas, artículo y versión', () => {
    expect(M.citationCorrectness([par(c, bien), par(c, mal)]).value).toBe(0.5);
    expect(M.articleAccuracy([par(c, bien), par(c, mal)]).value).toBe(0.5);
    expect(M.versionAccuracy([par(c, bien), par(c, mal)]).value).toBe(0.5);
  });
  it('citar lo prohibido, aunque se cite lo exigido, es incorrecto', () => {
    const ambos = res({ citations: [{ chunkId: 'a', instrumento: 'CPP', articulo: '173-B' }, { chunkId: 'b', instrumento: 'CODIGO_PENAL', articulo: '173' }] });
    expect(M.citationCorrectness([par(c, ambos)]).value).toBe(0);
  });
  it('recall y precisión', () => {
    expect(M.retrievalRecall([par(c, bien), par(c, mal)])).toEqual({ value: 0.5, n: 2, denominator: 2 });
    expect(M.retrievalPrecision([par(c, bien), par(c, mal)])).toEqual({ value: 1 / 3, n: 2, denominator: 3 });
  });
  it('abstención', () => {
    const abs = caso({ id: 'c3', expected: { decision: 'ABSTAIN' } });
    expect(M.abstentionAccuracy([par(abs, res({ caseId: 'c3', decision: 'ABSTAIN' })), par(abs, res({ caseId: 'c3' }))]).value).toBe(0.5);
  });
  it('alucinación: afirmaciones que citan ids fuera de la evidencia', () => {
    const r = res({ evidenceIds: ['a'], claims: [{ claimId: '1', citedIds: ['a'] }, { claimId: '2', citedIds: ['a', 'zzz'] }] });
    expect(M.hallucinationRate([par(c, r)])).toEqual({ value: 0.5, n: 2, denominator: 2 });
  });
  it('latencia p50/p95, costo y satisfacción', () => {
    const ps = [100, 200, 300, 400, 1000].map((l, i) => par(c, res({ caseId: String(i), latencyMs: l, costUsd: l / 1000, feedback: i < 3 ? 'UP' : i === 3 ? 'DOWN' : null })));
    expect(M.latencyP50(ps).value).toBe(300);
    expect(M.latencyP95(ps).value).toBe(1000);
    expect(M.costMeanUsd(ps).value).toBeCloseTo(0.4, 10);
    expect(M.userSatisfaction(ps)).toEqual({ value: 0.75, n: 4, denominator: 4 });
  });
});

describe('ejecutor y compuerta de regresión', () => {
  const casos = [caso({ id: 'a', expected: { decision: 'ABSTAIN' } }), caso({ id: 'b', expected: { decision: 'ABSTAIN' } })];
  const bueno = (c: GoldenCase) => res({ caseId: c.id, decision: 'ABSTAIN' });
  const malo = (c: GoldenCase) => res({ caseId: c.id, decision: c.id === 'a' ? 'ANSWER' : 'ABSTAIN', evidenceIds: [], claims: [{ claimId: '1', citedIds: ['fantasma'] }] });
  it('genera informe y markdown', async () => {
    const r = await ejecutarEvaluacion(casos, bueno, new Date('2026-10-23T00:00:00Z'));
    expect(r.metricas.abstentionAccuracy.value).toBe(1);
    expect(r.metricas.legalCorrectness.value).toBeNull();
    expect(informeMarkdown(r)).toMatch(/legalCorrectness \| n\/d/);
  });
  it('la compuerta falla en regresión de abstención o de alucinación', async () => {
    const antes = await ejecutarEvaluacion(casos, (c) => ({ ...bueno(c), claims: [{ claimId: '1', citedIds: ['e'] }], evidenceIds: ['e'] }));
    const despues = await ejecutarEvaluacion(casos, malo);
    const cmp = compararInformes(antes, despues);
    expect(cmp.ok).toBe(false);
    expect(cmp.regresiones.map((x) => x.metrica).sort()).toEqual(['abstentionAccuracy', 'hallucinationRate']);
    expect(compararInformes(antes, antes).ok).toBe(true);
  });
  it('umbral configurable y métrica que deja de calcularse cuenta como regresión', async () => {
    const antes = await ejecutarEvaluacion(casos, bueno);
    const peor = await ejecutarEvaluacion(casos, (c) => res({ caseId: c.id, decision: c.id === 'a' ? 'ANSWER' : 'ABSTAIN' }));
    expect(compararInformes(antes, peor, { abstentionAccuracy: 0.6 }).ok).toBe(true);
    expect(compararInformes(antes, peor, UMBRALES_CI).ok).toBe(false);
    const sinCasos = await ejecutarEvaluacion([], bueno);
    expect(compararInformes(antes, sinCasos).regresiones.some((r) => r.motivo.includes('dejó de ser calculable'))).toBe(true);
  });
  it('un error del sistema bajo prueba se registra y no oculta el resto', async () => {
    const r = await ejecutarEvaluacion(casos, (c) => {
      if (c.id === 'a') throw new Error('boom');
      return bueno(c);
    });
    expect(r.errores).toEqual([{ caseId: 'a', error: 'boom' }]);
    expect(r.metricas.abstentionAccuracy.n).toBe(1);
  });
});

describe('conjunto dorado inicial', () => {
  it('todos PENDING_CLO_REVIEW y con fuente', () => {
    expect(GOLDEN_SEED.length).toBeGreaterThanOrEqual(8);
    for (const c of GOLDEN_SEED) {
      expect(c.review_state).toBe('PENDING_CLO_REVIEW');
      expect(c.source_of_expectation.length).toBeGreaterThan(10);
    }
  });
  it('los casos G1 coinciden con tests/golden/gateway-g1-casos.ts (pregunta, decisión, artículo, prohibidos)', () => {
    const g1 = GOLDEN_SEED.filter((c) => c.id.startsWith('G1-'));
    expect(g1).toHaveLength(5);
    for (const c of g1) {
      const o = GOLDEN_G1.find((x) => x.id === c.id)!;
      expect(o, c.id).toBeDefined();
      expect(c.question).toBe(o.input.sanitizedQuestion);
      expect(c.expected.decision).toBe(o.esperado.decision);
      if (o.esperado.articulo) expect(c.expected.mustCite).toEqual([{ instrumento: o.esperado.articulo.instrumento, articulo: o.esperado.articulo.articulo }]);
      else expect(c.expected.mustCite).toEqual([]);
      expect(c.expected.mustNotCite.map((x) => x.instrumento)).toEqual(o.esperado.instrumentosProhibidos ?? []);
    }
  });
  it('un sistema que sigue la expectativa obtiene abstención y citas perfectas; la corrección jurídica sigue en n/d', async () => {
    const r = await ejecutarEvaluacion(GOLDEN_SEED, (c) => res({
      caseId: c.id, decision: c.expected.decision,
      citations: c.expected.mustCite.map((m, i) => ({ chunkId: `x${i}`, instrumento: m.instrumento, articulo: m.articulo })),
    }));
    expect(r.metricas.abstentionAccuracy.value).toBe(1);
    expect(r.metricas.citationCorrectness.value).toBe(1);
    expect(r.metricas.legalCorrectness.value).toBeNull();
  });
  it('el módulo no importa el gateway', () => {
    for (const f of ['schema', 'metrics', 'runner', 'seed-golden']) {
      expect(readFileSync(join(__dirname, '..', 'lib', 'legal-os', 'evaluation', `${f}.ts`), 'utf8')).not.toMatch(/ai-gateway/);
    }
  });
});
