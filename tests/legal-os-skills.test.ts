import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LegalSkillSchema, SKILL_ID_RE, type LegalSkill } from '@/lib/legal-os/skills/schema';
import { SkillRegistryError, crearRegistroSkills } from '@/lib/legal-os/skills/registry';
import { SKILLS_SEMILLA, registroConSemillas } from '@/lib/legal-os/skills/seeds';
import { SKILLS_LANZAMIENTO, registroDeLanzamiento, todasLasSkillsDeLanzamiento } from '@/lib/legal-os/skills/seeds-lanzamiento';
import { clasificarIntencion } from '@/lib/legal-os/router/intent';

const IDS = [
  'HN.CIVIL.CONTRACTS.SALE', 'HN.PENAL.CRIMES.FRAUD', 'HN.NOTARIAL.PUBLIC_DEED', 'HN.COMMERCIAL.NEGOTIABLE_INSTRUMENTS',
  'HN.FAMILY.DIVORCE', 'HN.LABOR.TERMINATION', 'HN.ADMINISTRATIVE.APPEAL',
];
const base = (): LegalSkill => structuredClone(SKILLS_SEMILLA[0]);
const activa = (): LegalSkill => ({ ...base(), status: 'ACTIVE', evaluation_set: 'eval-civil-v1', last_reviewed: '2026-10-23', owner: 'CLO' });
const codigo = (f: () => unknown) => { try { f(); } catch (e) { return (e as SkillRegistryError).codigo; } return null; };

describe('esquema de skill', () => {
  it('valida el formato del skill_id', () => {
    for (const id of IDS) expect(SKILL_ID_RE.test(id)).toBe(true);
    // P10: se relajó a CC.MATERIA[.SUBMATERIA[.TAREA]] para admitir materias compuestas como HN.PROCEDURAL_PENAL; el país solo, o sin materia, sigue siendo inválido.
    for (const id of ['hn.civil.contracts.sale', 'HN', 'HN.', 'HN.CIVIL.CONTRACTS.SALE.X', 'HND.CIVIL.A.B', 'HN..A.B']) expect(SKILL_ID_RE.test(id), id).toBe(false);
    for (const id of ['HN.CIVIL', 'HN.PROCEDURAL_PENAL']) expect(SKILL_ID_RE.test(id), id).toBe(true);
  });
  it('rechaza campos desconocidos y faltantes (strict)', () => {
    expect(LegalSkillSchema.safeParse({ ...base(), extra: 1 }).success).toBe(false);
    const { instructions: _i, ...sin } = base();
    expect(LegalSkillSchema.safeParse(sin).success).toBe(false);
  });
  it('el prefijo del id debe coincidir con el país', () => {
    expect(LegalSkillSchema.safeParse({ ...base(), country: 'GT' }).success).toBe(false);
  });
  it('herramienta permitida y prohibida a la vez es inválida', () => {
    expect(LegalSkillSchema.safeParse({ ...base(), tools_forbidden: ['search_law'] }).success).toBe(false);
  });
  it('cita obligatoria por proposición no se puede desactivar', () => {
    expect(LegalSkillSchema.safeParse({ ...base(), citation_policy: { required: false, perClaim: true, allowedSourceRoles: ['PRIMARY'] } }).success).toBe(false);
  });
});

describe('registro', () => {
  it('rechaza duplicados', () => {
    const r = crearRegistroSkills();
    r.registrar(base());
    expect(codigo(() => r.registrar(base()))).toBe('DUPLICADA');
  });
  it('rechaza países no habilitados (la regla del registro de jurisdicciones manda)', () => {
    const gt = { ...base(), skill_id: 'GT.CIVIL.CONTRACTS.SALE', country: 'GT' as const };
    expect(LegalSkillSchema.safeParse(gt).success).toBe(true);
    expect(codigo(() => crearRegistroSkills().registrar(gt))).toBe('PAIS_NO_HABILITADO');
  });
  it('rechaza ACTIVE sin evaluation_set', () => {
    expect(codigo(() => crearRegistroSkills().registrar({ ...activa(), evaluation_set: null }))).toBe('ACTIVA_SIN_EVALUACION');
  });
  it('rechaza ACTIVE sin abstention_policy', () => {
    expect(codigo(() => crearRegistroSkills().registrar({ ...activa(), abstention_policy: null }))).toBe('ACTIVA_SIN_ABSTENCION');
  });
  it('rechaza ACTIVE sin revisión humana fechada', () => {
    expect(codigo(() => crearRegistroSkills().registrar({ ...activa(), last_reviewed: null }))).toBe('INVALIDA');
  });
  it('acepta una ACTIVE completa', () => {
    expect(crearRegistroSkills().registrar(activa())).toMatchObject({ status: 'ACTIVE' });
  });
  it('skill inexistente', () => {
    expect(codigo(() => crearRegistroSkills().loadSkill('HN.X.Y.Z'))).toBe('NO_ENCONTRADA');
    expect(codigo(() => crearRegistroSkills().describeSkill('HN.X.Y.Z'))).toBe('NO_ENCONTRADA');
  });
  it('la especificación guardada es inmutable desde fuera', () => {
    const r = crearRegistroSkills();
    r.registrar(base());
    const s = r.loadSkill('HN.CIVIL.CONTRACTS.SALE');
    s.instructions = 'alterado';
    expect(r.loadSkill('HN.CIVIL.CONTRACTS.SALE').instructions).not.toBe('alterado');
  });
});

describe('semillas', () => {
  it('son exactamente las siete pedidas, todas DRAFT, PENDING_CLO y sin revisión', () => {
    expect(SKILLS_SEMILLA.map((s) => s.skill_id)).toEqual(IDS);
    for (const s of SKILLS_SEMILLA) {
      expect(s).toMatchObject({ status: 'DRAFT', owner: 'PENDING_CLO', last_reviewed: null, evaluation_set: null });
      expect(LegalSkillSchema.safeParse(s).success, s.skill_id).toBe(true);
    }
  });
  it('no contienen contenido jurídico: ni números de artículo ni de decreto ni citas', () => {
    const texto = JSON.stringify(SKILLS_SEMILLA);
    expect(texto).not.toMatch(/\bart(?:[ií]culo|\.)?\s*\d/i);
    expect(texto).not.toMatch(/\b(?:decreto|d\.)\s*(?:no\.?\s*)?\d/i);
    expect(texto).not.toMatch(/\d{1,3}-\d{2,4}/);
  });
  it('se registran sin error y ninguna es ACTIVE', async () => {
    const r = await registroConSemillas();
    expect(r.listarSkills()).toHaveLength(7);
    expect(r.listarSkills({ status: 'ACTIVE' })).toEqual([]);
  });
});

describe('divulgación progresiva', () => {
  it('describeSkill devuelve solo la ficha mínima', async () => {
    const r = await registroConSemillas();
    const card = r.describeSkill('HN.PENAL.CRIMES.FRAUD');
    expect(Object.keys(card).sort()).toEqual(['country', 'matter', 'skill_id', 'status', 'submatter', 'task']);
    expect(JSON.stringify(card)).not.toMatch(/instructions|required_sources|Código/);
  });
  it('seleccionar y listar NO cargan especificaciones completas; loadSkill sí, bajo demanda', async () => {
    const r = await registroConSemillas();
    const intent = clasificarIntencion('¿Qué dice el Código Penal sobre el fraude y el delito?');
    r.listarSkills();
    r.seleccionarPorIntencion(intent, { incluirBorradores: true });
    r.describeSkill('HN.PENAL.CRIMES.FRAUD');
    expect(r.cargasCompletas()).toBe(0);
    r.loadSkill('HN.PENAL.CRIMES.FRAUD');
    expect(r.cargasCompletas()).toBe(1);
  });
  it('por defecto una DRAFT nunca se selecciona; con incluirBorradores sí, por país, materia y tarea', async () => {
    const r = await registroConSemillas();
    const penal = clasificarIntencion('¿Qué dice el Código Penal sobre el delito de fraude?');
    expect(penal.matter).toBe('penal');
    expect(r.seleccionarPorIntencion(penal)).toEqual([]);
    expect(r.seleccionarPorIntencion(penal, { incluirBorradores: true }).map((c) => c.skill_id)).toEqual(['HN.PENAL.CRIMES.FRAUD']);
    const redaccion = clasificarIntencion('Redacta una escritura pública de compraventa ante notario');
    expect(r.seleccionarPorIntencion(redaccion, { incluirBorradores: true }).map((c) => c.skill_id)).toEqual(['HN.NOTARIAL.PUBLIC_DEED']);
  });
  it('una skill ACTIVE sí se selecciona por defecto', () => {
    const r = crearRegistroSkills();
    r.registrar({ ...activa(), skill_id: 'HN.CIVIL.CONTRACTS.SALE' });
    const intent = clasificarIntencion('¿Qué dice el Código Civil sobre las obligaciones y la herencia?');
    expect(r.seleccionarPorIntencion(intent).map((c) => c.skill_id)).toEqual(['HN.CIVIL.CONTRACTS.SALE']);
  });
  it('sin materia identificada no se selecciona nada', async () => {
    const r = await registroConSemillas();
    expect(r.seleccionarPorIntencion(clasificarIntencion('hola'), { incluirBorradores: true })).toEqual([]);
  });
});

describe('aislamiento', () => {
  it('lib/legal-os/skills no importa el gateway', () => {
    for (const f of ['schema.ts', 'registry.ts', 'seeds.ts', 'seeds-lanzamiento.ts', 'index.ts']) {
      expect(readFileSync(join(__dirname, '..', 'lib', 'legal-os', 'skills', f), 'utf8')).not.toMatch(/ai-gateway/);
    }
  });
});

// ── P10: skills de lanzamiento ejecutables ─────────────────────────────────────
const LANZAMIENTO = [
  'HN.CONSTITUTIONAL.ARTICLE_LOOKUP', 'HN.CIVIL.CONTRACTS', 'HN.CIVIL.PROPERTY', 'HN.CIVIL.SUCCESSION', 'HN.PROCEDURAL_CIVIL.CLAIM', 'HN.PENAL.ARTICLE_LOOKUP',
  'HN.PENAL.OFFENSE_ANALYSIS', 'HN.PROCEDURAL_PENAL', 'HN.COMMERCIAL.CONTRACTS', 'HN.COMMERCIAL.NEGOTIABLE_INSTRUMENTS', 'HN.LABOR.TERMINATION', 'HN.FAMILY.DIVORCE',
  'HN.FAMILY.CHILDREN', 'HN.NOTARIAL.PUBLIC_DEED', 'HN.ADMINISTRATIVE.APPEAL', 'HN.TAX.ARTICLE_LOOKUP', 'HN.AML.COMPLIANCE',
];

describe('P10 skills de lanzamiento', () => {
  it('están las 17 pedidas (más las semillas originales), todas válidas, DRAFT, PENDING_CLO y sin revisión', async () => {
    const r = await registroDeLanzamiento();
    const ids = r.listarSkills().map((c) => c.skill_id);
    for (const id of LANZAMIENTO) expect(ids, id).toContain(id);
    expect(SKILLS_LANZAMIENTO).toHaveLength(12);
    for (const s of todasLasSkillsDeLanzamiento()) {
      expect(LegalSkillSchema.safeParse(s).success, s.skill_id).toBe(true);
      expect(s).toMatchObject({ status: 'DRAFT', owner: 'PENDING_CLO', last_reviewed: null, evaluation_set: null });
      expect(s.evidence_requirements, s.skill_id).toBeDefined();
    }
  });
  it('definen requisitos de evidencia y no contienen contenido jurídico (sin números de artículo ni decretos)', () => {
    for (const s of SKILLS_LANZAMIENTO) {
      expect(s.evidence_requirements?.min_primary_sources).toBeGreaterThanOrEqual(1);
      expect(s.evidence_requirements?.jurisprudence).toBe('SUPPORTING_ONLY');
      const texto = JSON.stringify([s.required_sources, s.preferred_sources, s.instructions, s.validity_rules, s.abstention_policy]);
      expect(texto, s.skill_id).not.toMatch(/\d/);
      expect(texto, s.skill_id).not.toMatch(/\bart[ií]culo\b|\bdecreto\b/i);
    }
  });
  it('las skills de consulta de artículo exigen un umbral alto (0.9) y su instrumento', () => {
    for (const s of SKILLS_LANZAMIENTO.filter((x) => x.skill_id.endsWith('ARTICLE_LOOKUP'))) {
      expect(s.evidence_threshold).toBe(0.9);
      expect(s.evidence_requirements?.required_instruments.length).toBe(1);
    }
  });
  it('el conjunto suma 7 + 12 skills y el registro rechaza duplicados', async () => {
    const r = await registroDeLanzamiento();
    expect(r.listarSkills()).toHaveLength(7 + 12);
    expect(codigo(() => r.registrar(todasLasSkillsDeLanzamiento()[0]))).toBe('DUPLICADA');
  });
  it('seleccionarMejor: instrumento + pista eligen la skill correcta (sin cargar especificaciones completas)', async () => {
    const r = await registroDeLanzamiento();
    const elegir = (q: string, instrumento: string | null) => r.seleccionarMejor(clasificarIntencion(q), q, { incluirBorradores: true, instrumento });
    expect(elegir('¿Qué dice el artículo 173 del Código Procesal Penal?', 'CODIGO_PROCESAL_PENAL')).toBe('HN.PROCEDURAL_PENAL');
    expect(elegir('¿Qué dice el artículo 5 del Código Penal?', 'CODIGO_PENAL')).toBe('HN.PENAL.ARTICLE_LOOKUP');
    expect(elegir('¿Qué dice el artículo 17 de la Constitución de la República?', 'CONSTITUCION')).toBe('HN.CONSTITUTIONAL.ARTICLE_LOOKUP');
    expect(elegir('¿Qué dice el artículo 10 del Código Tributario?', 'CODIGO_TRIBUTARIO')).toBe('HN.TAX.ARTICLE_LOOKUP');
    expect(elegir('¿Cómo se hereda sin testamento según el Código Civil?', 'CODIGO_CIVIL')).toBe('HN.CIVIL.SUCCESSION');
    expect(elegir('¿Qué requisitos tiene la letra de cambio en el Código de Comercio?', 'CODIGO_COMERCIO')).toBe('HN.COMMERCIAL.NEGOTIABLE_INSTRUMENTS');
    expect(r.cargasCompletas()).toBe(0);
  });
  it('seleccionarMejor no adivina: instrumento con varias skills y sin pista, o sin materia → null; una skill que exige otro instrumento se excluye; borradores solo si se piden', async () => {
    const r = await registroDeLanzamiento();
    const elegir = (q: string, instrumento: string | null, borr = true) => r.seleccionarMejor(clasificarIntencion(q), q, { incluirBorradores: borr, instrumento });
    expect(elegir('Háblame del Código Civil', 'CODIGO_CIVIL')).toBeNull();
    expect(elegir('¿Qué es la prenda sin desplazamiento?', null)).toBeNull();
    expect(elegir('¿Qué dice el artículo 173 del Código Procesal Penal?', 'CODIGO_PROCESAL_PENAL')).not.toBe('HN.PENAL.ARTICLE_LOOKUP');
    expect(elegir('¿Qué dice el artículo 5 del Código Penal?', 'CODIGO_PENAL', false)).toBeNull();
  });
});
