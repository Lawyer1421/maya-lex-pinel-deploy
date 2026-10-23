import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MATERIAS, GoldenCase } from '@/lib/legal-os/evaluation/schema';
import { GOLDEN_SETS, GoldenTemplate, aGoldenCase, resumenGolden, textoEstadoGolden } from '@/lib/legal-os/evaluation/golden';

const RAIZ = join(__dirname, '..');
const todos = MATERIAS.flatMap((m) => GOLDEN_SETS[m]);

describe('conjuntos dorados por materia (plantillas para el CLO)', () => {
  it('cubre las 15 materias, con ≥8 casos y ≥3 abstenciones por materia', () => {
    expect(Object.keys(GOLDEN_SETS).sort()).toEqual([...MATERIAS].sort());
    for (const m of MATERIAS) {
      const casos = GOLDEN_SETS[m];
      expect(casos.length, m).toBeGreaterThanOrEqual(8);
      expect(casos.filter((c) => c.expected.decision === 'ABSTAIN').length, m).toBeGreaterThanOrEqual(3);
      for (const c of casos) expect(c.matter).toBe(m);
    }
  });
  it('cada plantilla valida contra su esquema y cada abstención contra el GoldenCase real', () => {
    for (const t of todos) {
      expect(() => GoldenTemplate.parse(t), t.id).not.toThrow();
      if (t.expected.decision === 'ABSTAIN') expect(GoldenCase.safeParse(aGoldenCase(t)).success, t.id).toBe(true);
      else expect(aGoldenCase(t), t.id).toBeNull();
    }
  });
  it('los ids son únicos', () => {
    expect(new Set(todos.map((t) => t.id)).size).toBe(todos.length);
  });
  it('ningún caso está CLO_APPROVED', () => {
    for (const t of todos) expect(t.review_state).toBe('PENDING_CLO_REVIEW');
    expect(resumenGolden().every((r) => r.approved === 0 && r.preparacion === 'NOT_SCORABLE')).toBe(true);
  });
  it('ninguna pregunta embebe un número de artículo o decreto concreto, salvo la sonda «Decreto 999-9999»', () => {
    for (const t of todos) {
      const sinSonda = t.question.replace('Decreto 999-9999', '');
      expect(/\d/.test(sinSonda), `${t.id}: ${t.question}`).toBe(false);
      if (t.question.includes('999-9999')) expect(t.kind).toBe('ABSTAIN_UNKNOWN_DECREE');
    }
  });
  it('la decisión solo está fijada donde la determina el diseño; nunca se afirma ANSWER, artículo ni fecha', () => {
    for (const t of todos) {
      expect(t.expected.decision).not.toBe('ANSWER');
      expect(t.expected.article).toBeNull();
      expect(t.expected.expectedVersionDate).toBeNull();
      if (t.expected.decision === null) expect(t.source_of_expectation).toMatch(/PENDIENTE_CLO/);
    }
  });
  it('los marcadores declarados aparecen en la pregunta', () => {
    for (const t of todos) for (const p of t.placeholders) expect(t.question, t.id).toContain(p);
  });
  it('solo el Código de Comercio (ABSENT_VERIFIED en el inventario) fija abstención en las consultas exactas; los demás quedan pendientes', () => {
    const exactas = todos.filter((t) => ['EXACT_REF', 'VERSION_ON_DATE', 'VERSION_CHANGE'].includes(t.kind));
    for (const t of exactas) expect(t.expected.decision === 'ABSTAIN', t.id).toBe(t.matter === 'Commercial');
  });
  it('los ids de instrumento existen en el inventario auditado como PRESENT', () => {
    const inv = JSON.parse(readFileSync(join(RAIZ, 'docs', 'corpus', 'MAYALEX_CORPUS_MASTER_INVENTORY_V1.json'), 'utf8'));
    const texto = JSON.stringify(inv);
    for (const t of todos) if (t.expected.instrument) expect(texto, t.expected.instrument).toContain(t.expected.instrument);
  });
  it('cubre todos los tipos de prueba pedidos', () => {
    const tipos = new Set(todos.map((t) => t.kind));
    for (const k of ['EXACT_REF', 'VERSION_ON_DATE', 'ABSTAIN_UNKNOWN_DECREE', 'ABSTAIN_FOREIGN_COUNTRY', 'ABSTAIN_OUT_OF_SCOPE', 'CLARIFY_AMBIGUOUS', 'PROMPT_INJECTION', 'PRIVACY_BAIT']) {
      expect(tipos.has(k as never), k).toBe(true);
    }
  });
  it('el documento de estado commiteado coincide con el generado', () => {
    expect(readFileSync(join(RAIZ, 'docs', 'launch', 'GOLDEN_SETS_STATUS.md'), 'utf8')).toBe(textoEstadoGolden());
  });
});
