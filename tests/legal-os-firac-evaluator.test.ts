import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FiracSkillSchema, type FiracSkill, type RuleEvidence } from '@/lib/legal-os/skills/firac-schema';
import { FiracEvaluationError, evaluarCasilla, evaluarFirac, type FactAssertion } from '@/lib/legal-os/skills/firac-evaluator';

const DIR = join(process.cwd(), 'tests', 'fixtures', 'skills');
const NOMBRES = ['notarial', 'mercantil', 'procesal_civil'] as const;
const plantilla = (n: (typeof NOMBRES)[number]): FiracSkill => FiracSkillSchema.parse(JSON.parse(readFileSync(join(DIR, `${n}.json`), 'utf8')));
const hojas = (s: FiracSkill) => s.firac.rules.flatMap((r) => r.elements ?? [r]);
const PRIMARY = (id: string): RuleEvidence[] => [{ chunk_id: `chunk-${id}`, source_role: 'PRIMARY' }];
const CONTEXT = (id: string): RuleEvidence[] => [{ chunk_id: `ctx-${id}`, source_role: 'CONTEXT' }];
const cumple = (): FactAssertion => ({ satisfied: true });
const todoCumple = (s: FiracSkill) => ({
  facts: Object.fromEntries(hojas(s).map((h) => [h.id, cumple()])),
  evidence: Object.fromEntries(hojas(s).map((h) => [h.id, PRIMARY(h.id)])),
});

describe('evaluarCasilla (regla de decisión por casilla)', () => {
  it('sin hecho → UNKNOWN; «no aplica» → NOT_APPLICABLE', () => {
    expect(evaluarCasilla(undefined, PRIMARY('x'))).toEqual({ status: 'UNKNOWN', reason: 'SIN_HECHO' });
    expect(evaluarCasilla({ satisfied: null }, PRIMARY('x'))).toEqual({ status: 'UNKNOWN', reason: 'SIN_HECHO' });
    expect(evaluarCasilla({ satisfied: null, not_applicable: { reason: 'no hay apoderado' } }, undefined)).toEqual({ status: 'NOT_APPLICABLE', reason: 'NO_APLICA' });
  });
  it('sin evidencia PRIMARY de la norma no se cumple ni se incumple', () => {
    expect(evaluarCasilla(cumple(), undefined).status).toBe('UNKNOWN');
    expect(evaluarCasilla(cumple(), []).status).toBe('UNKNOWN');
    expect(evaluarCasilla({ satisfied: false }, CONTEXT('x')).reason).toBe('NORMA_SIN_EVIDENCIA_PRIMARY');
  });
  it('con evidencia PRIMARY: cumple → MET, no cumple → NOT_MET', () => {
    expect(evaluarCasilla(cumple(), PRIMARY('x'))).toEqual({ status: 'MET', reason: 'HECHO_CUMPLE' });
    expect(evaluarCasilla({ satisfied: false }, PRIMARY('x'))).toEqual({ status: 'NOT_MET', reason: 'HECHO_NO_CUMPLE' });
  });
});

describe('evaluarFirac sobre las plantillas', () => {
  it.each(NOMBRES)('%s: sin hechos queda NO_CONCLUYENTE con todo UNKNOWN', (n) => {
    const t = plantilla(n);
    const r = evaluarFirac({ template: t, facts: {}, evidence: {} });
    expect(r.skill.firac.conclusion.verdict).toBe('NO_CONCLUYENTE');
    expect(r.missingElements).toEqual(hojas(t).map((h) => h.id));
    expect(r.trace.every((x) => x.reason === 'SIN_HECHO')).toBe(true);
    expect(r.skill.firac.conclusion.text).toMatch(/NO OFICIAL/);
  });

  it.each(NOMBRES)('%s: hechos sin evidencia de la norma no resuelven nada', (n) => {
    const t = plantilla(n);
    const { facts } = todoCumple(t);
    const r = evaluarFirac({ template: t, facts, evidence: {} });
    expect(hojas(r.skill).every((h) => h.status === 'UNKNOWN')).toBe(true);
    expect(r.skill.firac.conclusion.verdict).toBe('NO_CONCLUYENTE');
    expect(r.trace.every((x) => x.reason === 'NORMA_SIN_EVIDENCIA_PRIMARY')).toBe(true);
  });

  it.each(NOMBRES)('%s: evidencia solo CONTEXT tampoco basta', (n) => {
    const t = plantilla(n);
    const { facts } = todoCumple(t);
    const evidence = Object.fromEntries(hojas(t).map((h) => [h.id, CONTEXT(h.id)]));
    expect(evaluarFirac({ template: t, facts, evidence }).missingElements).toHaveLength(hojas(t).length);
  });

  it.each(NOMBRES)('%s: todo cumple con evidencia PRIMARY → CUMPLE y sin faltantes', (n) => {
    const t = plantilla(n);
    const r = evaluarFirac({ template: t, ...todoCumple(t) });
    expect(r.missingElements).toEqual([]);
    expect(r.skill.firac.conclusion.verdict).toBe('CUMPLE');
    expect(hojas(r.skill).every((h) => h.status === 'MET' && h.evidence.some((e) => e.source_role === 'PRIMARY'))).toBe(true);
  });

  it('una casilla que incumple, con todo resuelto → NO_CUMPLE', () => {
    const t = plantilla('mercantil');
    const { facts, evidence } = todoCumple(t);
    facts['MER-SOCIOS'] = { satisfied: false, note: 'un solo socio' };
    const r = evaluarFirac({ template: t, facts, evidence });
    expect(r.skill.firac.conclusion.verdict).toBe('NO_CUMPLE');
    expect(r.skill.firac.rules.find((x) => x.id === 'MER-SOCIOS')!.status).toBe('NOT_MET');
    expect(r.skill.firac.facts.provided).toContain('MER-SOCIOS: un solo socio');
  });

  it('resolución parcial → CONDICIONAL_A_COMPLETAR, nunca categórico, con los faltantes exactos', () => {
    const t = plantilla('notarial');
    const r = evaluarFirac({
      template: t,
      facts: { 'NOT-IDENTIDAD': cumple(), 'NOT-COMPARECENCIA': { satisfied: false } },
      evidence: { 'NOT-IDENTIDAD': PRIMARY('i'), 'NOT-COMPARECENCIA': PRIMARY('c') },
    });
    expect(r.skill.firac.conclusion.verdict).toBe('CONDICIONAL_A_COMPLETAR');
    expect(r.missingElements).toEqual(['NOT-CAPACIDAD', 'NOT-FACULTADES', 'NOT-TIMBRES']);
    expect(r.skill.firac.conclusion.text).toContain('NOT-CAPACIDAD');
  });

  it('«no aplica» con motivo saca la casilla de los faltantes', () => {
    const t = plantilla('notarial');
    const { facts, evidence } = todoCumple(t);
    facts['NOT-FACULTADES'] = { satisfied: null, not_applicable: { reason: 'poder sin facultades especiales' } };
    const r = evaluarFirac({ template: t, facts, evidence });
    expect(r.missingElements).toEqual([]);
    expect(r.skill.firac.conclusion.verdict).toBe('CUMPLE');
  });

  it('procesal civil: el estado del art. 424 se deriva de sus elementos y no se cuenta aparte', () => {
    const t = plantilla('procesal_civil');
    const { facts, evidence } = todoCumple(t);
    const ok = evaluarFirac({ template: t, facts, evidence });
    expect(ok.skill.firac.rules[0].status).toBe('MET');
    const mal = evaluarFirac({ template: t, facts: { ...facts, 'CPC-HECHOS': { satisfied: false } }, evidence });
    expect(mal.skill.firac.rules[0].status).toBe('NOT_MET');
    expect(mal.skill.firac.conclusion.verdict).toBe('NO_CUMPLE');
    const parcial = evaluarFirac({ template: t, facts: { 'CPC-TRIBUNAL': cumple() }, evidence: { 'CPC-TRIBUNAL': PRIMARY('t') } });
    expect(parcial.skill.firac.rules[0].status).toBe('UNKNOWN');
    expect(parcial.missingElements).not.toContain('CPC-424-REQUISITOS');
    expect(parcial.missingElements).toEqual(['CPC-LEGITIMACION', 'CPC-HECHOS', 'CPC-DERECHO', 'CPC-PETITORIO', 'CPC-ANEXOS']);
  });
});

describe('evaluarFirac: garantías', () => {
  it('es pura: no muta la plantilla y repite el mismo resultado', () => {
    const t = plantilla('mercantil');
    const copia = structuredClone(t);
    const e = todoCumple(t);
    const a = evaluarFirac({ template: t, ...e });
    const b = evaluarFirac({ template: t, ...e });
    expect(t).toEqual(copia);
    expect(a).toEqual(b);
  });

  it('nunca marca una base como VERIFICADO_CORPUS ni cambia la verificación', () => {
    const t = plantilla('notarial');
    const r = evaluarFirac({ template: t, ...todoCumple(t) });
    expect(r.skill.firac.rules.map((x) => x.basis)).toEqual(t.firac.rules.map((x) => x.basis));
    expect(r.skill.firac.rules.flatMap((x) => x.basis).some((b) => b.verification === 'VERIFICADO_CORPUS')).toBe(false);
    expect(r.skill.instrument.verification).toBe(t.instrument.verification);
  });

  it('el resultado siempre pasa FiracSkillSchema', () => {
    for (const n of NOMBRES) {
      const t = plantilla(n);
      for (const e of [{ facts: {}, evidence: {} }, todoCumple(t)]) expect(FiracSkillSchema.safeParse(evaluarFirac({ template: t, ...e }).skill).success).toBe(true);
    }
  });

  it('rechaza ids desconocidos, «no aplica» sin motivo o ambiguo y plantillas inválidas', () => {
    const t = plantilla('notarial');
    const cod = (f: () => unknown) => { try { f(); } catch (e) { return (e as FiracEvaluationError).codigo; } return null; };
    expect(cod(() => evaluarFirac({ template: t, facts: { 'NOT-XXX': cumple() }, evidence: {} }))).toBe('ID_DESCONOCIDO');
    expect(cod(() => evaluarFirac({ template: t, facts: {}, evidence: { 'NOT-XXX': PRIMARY('x') } }))).toBe('ID_DESCONOCIDO');
    expect(cod(() => evaluarFirac({ template: t, facts: { 'NOT-TIMBRES': { satisfied: null, not_applicable: { reason: '  ' } } }, evidence: {} }))).toBe('NO_APLICA_SIN_MOTIVO');
    expect(cod(() => evaluarFirac({ template: t, facts: { 'NOT-TIMBRES': { satisfied: true, not_applicable: { reason: 'x' } } }, evidence: {} }))).toBe('HECHO_AMBIGUO');
    expect(cod(() => evaluarFirac({ template: { ...t, missingElements: [] } as FiracSkill, facts: {}, evidence: {} }))).toBe('PLANTILLA_INVALIDA');
  });
});
