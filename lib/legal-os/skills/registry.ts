/**
 * lib/legal-os/skills/registry.ts
 * Registro de skills con divulgación progresiva: seleccionar y listar devuelven fichas (SkillCard); la especificación completa
 * solo sale de `loadSkill`. Rechaza duplicados, países no habilitados y skills ACTIVE sin evaluación o sin política de abstención.
 */
import { PAISES } from '../jurisdiction/registry';
import type { IntentResult } from '../types';
import { LegalSkillSchema, type LegalSkill, type SkillCard, type SkillStatus } from './schema';

export class SkillRegistryError extends Error {
  constructor(readonly codigo: 'DUPLICADA' | 'PAIS_NO_HABILITADO' | 'ACTIVA_SIN_EVALUACION' | 'ACTIVA_SIN_ABSTENCION' | 'INVALIDA' | 'NO_ENCONTRADA', mensaje: string) {
    super(mensaje);
    this.name = 'SkillRegistryError';
  }
}

const aCard = (s: LegalSkill): SkillCard => ({ skill_id: s.skill_id, country: s.country, matter: s.matter, submatter: s.submatter, task: s.task, status: s.status });

/** Normaliza la materia libre del clasificador (p. ej. «penal») a la del id de skill (PENAL). */
const MATERIA_A_ID: Record<string, string> = {
  civil: 'CIVIL', penal: 'PENAL', laboral: 'LABOR', familia: 'FAMILY', notarial: 'NOTARIAL', comercial: 'COMMERCIAL',
  administrativo: 'ADMINISTRATIVE', tributario: 'TAX', constitucional: 'CONSTITUTIONAL', aduanero: 'CUSTOMS', aml: 'AML', bancario: 'BANKING', propiedad: 'PROPERTY',
};

export function crearRegistroSkills() {
  const skills = new Map<string, LegalSkill>();
  let cargasCompletas = 0;

  function registrar(candidata: unknown): SkillCard {
    const r = LegalSkillSchema.safeParse(candidata);
    if (!r.success) throw new SkillRegistryError('INVALIDA', r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
    const s = r.data;
    if (skills.has(s.skill_id)) throw new SkillRegistryError('DUPLICADA', `skill duplicada: ${s.skill_id}`);
    if (!PAISES[s.country].enabled) throw new SkillRegistryError('PAIS_NO_HABILITADO', `país no habilitado: ${s.country}`);
    if (s.status === 'ACTIVE') {
      if (!s.evaluation_set) throw new SkillRegistryError('ACTIVA_SIN_EVALUACION', `${s.skill_id} ACTIVE exige evaluation_set`);
      if (!s.abstention_policy) throw new SkillRegistryError('ACTIVA_SIN_ABSTENCION', `${s.skill_id} ACTIVE exige abstention_policy`);
    }
    skills.set(s.skill_id, Object.freeze(structuredClone(s)) as LegalSkill);
    return aCard(s);
  }

  function describeSkill(id: string): SkillCard {
    const s = skills.get(id);
    if (!s) throw new SkillRegistryError('NO_ENCONTRADA', `skill inexistente: ${id}`);
    return aCard(s);
  }

  /** Única vía a la especificación completa. */
  function loadSkill(id: string): LegalSkill {
    const s = skills.get(id);
    if (!s) throw new SkillRegistryError('NO_ENCONTRADA', `skill inexistente: ${id}`);
    cargasCompletas++;
    return structuredClone(s);
  }

  function listarSkills(filtro: { status?: SkillStatus; country?: string } = {}): SkillCard[] {
    return [...skills.values()].filter((s) => (!filtro.status || s.status === filtro.status) && (!filtro.country || s.country === filtro.country)).map(aCard);
  }

  /**
   * Selecciona fichas por intención: país, materia y tarea. Por defecto solo skills ACTIVE (una DRAFT jamás se aplica en producción);
   * `incluirBorradores` es para herramientas internas y evaluaciones.
   */
  function seleccionarPorIntencion(intent: IntentResult, opciones: { incluirBorradores?: boolean } = {}): SkillCard[] {
    const materia = intent.matter ? MATERIA_A_ID[intent.matter] : undefined;
    if (!materia) return [];
    return [...skills.values()]
      .filter((s) => s.country === intent.jurisdiction.country && s.jurisdiction === intent.jurisdiction.jurisdiction)
      .filter((s) => s.matter === materia && (s.task === intent.task || (intent.task === 'EXACT_LOOKUP' && s.task === 'RESEARCH')))
      .filter((s) => s.status === 'ACTIVE' || (opciones.incluirBorradores === true && (s.status === 'DRAFT' || s.status === 'REVIEW')))
      .map(aCard);
  }

  return { registrar, describeSkill, loadSkill, listarSkills, seleccionarPorIntencion, cargasCompletas: () => cargasCompletas };
}

export type RegistroSkills = ReturnType<typeof crearRegistroSkills>;
