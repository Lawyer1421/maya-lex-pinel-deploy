import { describe, it, expect } from 'vitest';
import { ejecutarBenchmark, BENCH_PII, FP_CONOCIDOS } from './privacy/benchmark-privacidad';
import { GOLDEN_G1 } from './golden/gateway-g1-casos';

const preguntasGolden = GOLDEN_G1.map((c) => c.input.sanitizedQuestion);
const r = ejecutarBenchmark(preguntasGolden);

describe('G4-B benchmark de privacidad (offline)', () => {
  it('el dataset cubre todas las categorías pedidas', () => {
    const cats = new Set(BENCH_PII.map((c) => c.categoria));
    for (const c of ['NOMBRE_COMPLETO','NOMBRE_SIN_TRATAMIENTO','NOMBRE_CON_TRATAMIENTO','DNI','RTN','TELEFONO','EMAIL','EMAIL_OFUSCADO','PASAPORTE','CUENTA','EXPEDIENTE','NUMERO_JUDICIAL','NUMERO_EN_PALABRAS'])
      expect(cats.has(c as never), c).toBe(true);
  });
  it('recall 100% por categoría sobre los casos exigidos', () => {
    expect(r.falsosNegativosExigidos).toEqual([]);
    for (const [k, v] of Object.entries(r.recallPorCategoria)) expect(v.recall, k).toBe(1);
  });
  it('sin falsos positivos sobre consultas públicas ni preguntas del Golden Set', () => {
    expect(r.falsosPositivos).toEqual([]);
    expect(r.tasaFalsosPositivos).toBe(0);
  });
  it('falsos positivos conocidos (etapa E, fail-closed) siguen siendo rechazados y documentados', () => {
    const rr = ejecutarBenchmark(FP_CONOCIDOS);
    expect(rr.falsosPositivos).toEqual(FP_CONOCIDOS);
  });
  it('no quedan residuales marcados en el conjunto de G4 (el riesgo residual real se mide en tests/privacy-g6.test.ts)', () => {
    expect(BENCH_PII.filter((c) => c.residual)).toEqual([]);
    expect(r.residualesNoDetectados).toEqual([]);
  });
});
