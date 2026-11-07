import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  FiracSkillSchema, calcularMissingElements, estadoDeCasilla, veredictoPermitido, VEREDICTOS_CATEGORICOS, type FiracSkill,
} from '@/lib/legal-os/skills/firac-schema';
import { SKILL_ID_RE } from '@/lib/legal-os/skills/schema';
import { SKILLS_SEMILLA } from '@/lib/legal-os/skills/seeds';
import { todasLasSkillsDeLanzamiento } from '@/lib/legal-os/skills/seeds-lanzamiento';

const DIR = join(process.cwd(), 'tests', 'fixtures', 'skills');
const NOMBRES = ['notarial', 'mercantil', 'procesal_civil'] as const;
const leer = (n: string): unknown => JSON.parse(readFileSync(join(DIR, `${n}.json`), 'utf8'));
const fix = (n: (typeof NOMBRES)[number]): FiracSkill => FiracSkillSchema.parse(leer(n));
const clon = (n: (typeof NOMBRES)[number]): Record<string, any> => structuredClone(leer(n)) as Record<string, any>;
const evidencia = (rol: 'PRIMARY' | 'CONTEXT') => [{ chunk_id: 'chunk-1', source_role: rol }];

describe('plantillas FIRAC: fixtures de skills', () => {
  it.each(NOMBRES)('%s valida contra FiracSkillSchema', (n) => {
    const r = FiracSkillSchema.safeParse(leer(n));
    expect(r.success, JSON.stringify(r.success ? [] : r.error.issues)).toBe(true);
  });

  it.each(NOMBRES)('%s: estados UNKNOWN, missingElements completo y veredicto NO_CONCLUYENTE', (n) => {
    const s = fix(n);
    const hojas = s.firac.rules.flatMap((r) => r.elements ?? [r]);
    expect(hojas.every((h) => h.status === 'UNKNOWN' && h.mandatory && h.evidence.length === 0)).toBe(true);
    expect(s.missingElements).toEqual(hojas.map((h) => h.id));
    expect(s.firac.conclusion.verdict).toBe('NO_CONCLUYENTE');
    expect(s.status).toBe('DRAFT');
    expect(s.last_reviewed).toBeNull();
    for (const cat of VEREDICTOS_CATEGORICOS) expect(s.firac.conclusion.forbidden_verdicts_when_missing).toContain(cat);
  });

  it('los skill_id respetan SKILL_ID_RE, son únicos y no chocan con las semillas', () => {
    const ids = NOMBRES.map((n) => fix(n).skill_id);
    expect(new Set(ids).size).toBe(3);
    for (const id of ids) expect(SKILL_ID_RE.test(id), id).toBe(true);
    const existentes = new Set([...SKILLS_SEMILLA, ...todasLasSkillsDeLanzamiento()].map((s) => s.skill_id));
    for (const id of ids) expect(existentes.has(id), `${id} ya existe`).toBe(false);
  });

  it('notarial: arts. 15, 16 y 29 del Notariado por grupo y 81–82 del CPC para las facultades', () => {
    const s = fix('notarial');
    expect(s.instrument.decree).toBe('Decreto No. 353-2005');
    const por = (id: string) => s.firac.rules.find((r) => r.id === id)!;
    for (const r of s.firac.rules) {
      const nb = r.basis.find((b) => b.instrument === 'Código del Notariado')!;
      expect(nb.articles).toEqual(['15', '16', '29']);
      expect(nb.assignment).toBe('GRUPO');
    }
    const cpc = por('NOT-FACULTADES').basis.find((b) => b.instrument === 'Código Procesal Civil')!;
    expect(cpc.articles).toEqual(['81', '82']);
    expect(cpc.assignment).toBe('CASILLA');
    expect(s.firac.rules.filter((r) => r.basis.some((b) => b.instrument === 'Código Procesal Civil')).map((r) => r.id)).toEqual(['NOT-FACULTADES']);
  });

  it('mercantil: Decreto Legislativo No. 73, arts. 66-67, 68 (2 a 25), 71 (50 %) y 78 y siguientes', () => {
    const s = fix('mercantil');
    expect(s.instrument.decree).toBe('Decreto Legislativo No. 73');
    const r = (id: string) => s.firac.rules.find((x) => x.id === id)!;
    expect(r('MER-RAZON-SOCIAL').basis[0].articles).toEqual(['66', '67']);
    expect(r('MER-SOCIOS').basis[0].articles).toEqual(['68']);
    expect(r('MER-SOCIOS').parameters).toEqual({ minimo: 2, maximo: 25 });
    expect(r('MER-EXHIBICION').basis[0].articles).toEqual(['71']);
    expect(r('MER-EXHIBICION').parameters).toEqual({ porcentaje_exhibicion_minima: 50 });
    expect(r('MER-ADMIN').basis[0]).toMatchObject({ articles: ['78'], and_following: true });
    // El Titular no dio artículo para el capital fundacional: no se inventa.
    expect(r('MER-CAPITAL').basis[0]).toMatchObject({ articles: [], verification: 'PENDIENTE_VERIFICACION' });
    expect(r('MER-CAPITAL').parameters).toEqual({ capital_minimo: null });
  });

  it('procesal civil: los elementos de la demanda quedan subsumidos en el art. 424 y los anexos en los arts. 425–426', () => {
    const s = fix('procesal_civil');
    expect(s.instrument.decree).toBe('Decreto No. 211-2006');
    expect(s.firac.rules.map((r) => r.id)).toEqual(['CPC-424-REQUISITOS', 'CPC-ANEXOS']);
    const r424 = s.firac.rules[0];
    expect(r424.basis[0].articles).toEqual(['424']);
    expect((r424.elements ?? []).map((e) => e.id)).toEqual(['CPC-TRIBUNAL', 'CPC-LEGITIMACION', 'CPC-HECHOS', 'CPC-DERECHO', 'CPC-PETITORIO']);
    expect(s.firac.rules[1]).toMatchObject({ mandatory: true });
    expect(s.firac.rules[1].basis[0].articles).toEqual(['425', '426']);
    // la casilla madre no se cuenta aparte: solo sus elementos y los anexos
    expect(s.missingElements).not.toContain('CPC-424-REQUISITOS');
    expect(s.missingElements).toHaveLength(6);
  });
});

describe('plantillas FIRAC: invariantes del esquema', () => {
  it('rechaza un veredicto categórico mientras haya missingElements', () => {
    for (const verdict of ['CUMPLE', 'NO_CUMPLE']) {
      const o = clon('notarial');
      o.firac.conclusion.verdict = verdict;
      expect(FiracSkillSchema.safeParse(o).success, verdict).toBe(false);
    }
    const ok = clon('notarial');
    ok.firac.conclusion.verdict = 'CONDICIONAL_A_COMPLETAR';
    expect(FiracSkillSchema.safeParse(ok).success).toBe(true);
  });

  it('rechaza un missingElements que no coincida con el cálculo', () => {
    const o = clon('mercantil');
    o.missingElements = o.missingElements.slice(1);
    expect(FiracSkillSchema.safeParse(o).success).toBe(false);
    const p = clon('mercantil');
    p.missingElements = [...p.missingElements].reverse();
    expect(FiracSkillSchema.safeParse(p).success).toBe(false);
  });

  it('MET exige evidencia PRIMARY: sin evidencia o solo CONTEXT es inválido', () => {
    const sin = clon('notarial');
    sin.firac.rules[0].status = 'MET';
    sin.missingElements = sin.missingElements.slice(1);
    expect(FiracSkillSchema.safeParse(sin).success).toBe(false);
    const ctx = structuredClone(sin);
    ctx.firac.rules[0].evidence = evidencia('CONTEXT');
    expect(FiracSkillSchema.safeParse(ctx).success).toBe(false);
    const ok = structuredClone(sin);
    ok.firac.rules[0].evidence = evidencia('PRIMARY');
    expect(FiracSkillSchema.safeParse(ok).success).toBe(true);
  });

  it('con todo MET desaparece missingElements y se admite CUMPLE; NO_CUMPLE exige una casilla NOT_MET', () => {
    const o = clon('notarial');
    for (const r of o.firac.rules) { r.status = 'MET'; r.evidence = evidencia('PRIMARY'); }
    o.missingElements = [];
    o.firac.conclusion.verdict = 'CUMPLE';
    expect(FiracSkillSchema.safeParse(o).success).toBe(true);
    o.firac.conclusion.verdict = 'NO_CUMPLE';
    expect(FiracSkillSchema.safeParse(o).success).toBe(false);
    o.firac.rules[0].status = 'NOT_MET';
    expect(FiracSkillSchema.safeParse(o).success).toBe(true);
    o.firac.conclusion.verdict = 'CUMPLE';
    expect(FiracSkillSchema.safeParse(o).success).toBe(false);
  });

  it('el estado de una casilla con elementos se deriva de ellos', () => {
    const s = fix('procesal_civil');
    const r = structuredClone(s.firac.rules[0]);
    expect(estadoDeCasilla(r)).toBe('UNKNOWN');
    for (const e of r.elements!) { e.status = 'MET'; e.evidence = evidencia('PRIMARY'); }
    expect(estadoDeCasilla(r)).toBe('MET');
    r.elements![2].status = 'NOT_MET';
    expect(estadoDeCasilla(r)).toBe('NOT_MET');
    r.elements![2].status = 'NOT_APPLICABLE';
    expect(estadoDeCasilla(r)).toBe('MET');
    expect(calcularMissingElements([r])).toEqual([]);
  });

  it('veredictoPermitido: con faltantes solo los no categóricos', () => {
    const s = fix('mercantil');
    expect(veredictoPermitido(s.firac.rules, 'CUMPLE')).toBe(false);
    expect(veredictoPermitido(s.firac.rules, 'NO_CUMPLE')).toBe(false);
    expect(veredictoPermitido(s.firac.rules, 'NO_CONCLUYENTE')).toBe(true);
    expect(veredictoPermitido(s.firac.rules, 'CONDICIONAL_A_COMPLETAR')).toBe(true);
  });

  it('rechaza ids repetidos, campos desconocidos y país distinto del prefijo', () => {
    const dup = clon('procesal_civil');
    dup.firac.rules[1].id = 'CPC-TRIBUNAL';
    expect(FiracSkillSchema.safeParse(dup).success).toBe(false);
    expect(FiracSkillSchema.safeParse({ ...clon('notarial'), extra: 1 }).success).toBe(false);
    expect(FiracSkillSchema.safeParse({ ...clon('notarial'), country: 'GT' }).success).toBe(false);
  });

  it('una skill ACTIVE exige revisión humana fechada (como LegalSkillSchema)', () => {
    expect(FiracSkillSchema.safeParse({ ...clon('notarial'), status: 'ACTIVE' }).success).toBe(false);
    expect(FiracSkillSchema.safeParse({ ...clon('notarial'), status: 'ACTIVE', last_reviewed: '2026-11-07' }).success).toBe(true);
  });

  it('exige que la política prohíba ambos veredictos categóricos', () => {
    const o = clon('notarial');
    o.firac.conclusion.forbidden_verdicts_when_missing = ['CUMPLE'];
    expect(FiracSkillSchema.safeParse(o).success).toBe(false);
  });
});
