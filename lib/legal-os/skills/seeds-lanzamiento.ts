/**
 * lib/legal-os/skills/seeds-lanzamiento.ts
 * Skills de ALTA FRECUENCIA para el lanzamiento, ejecutables por el pipeline en modo sombra/evaluación.
 * Todas DRAFT, propietario PENDING_CLO, sin revisión y SIN contenido jurídico (ni artículos, ni decretos, ni reglas):
 * solo describen qué instrumentos exige la evidencia, el umbral y la política de abstención. Pasar a ACTIVE exige evaluation_set y revisión del CLO.
 * Los instrumentos exigidos se expresan con el id normalizado del Exact Resolver cuando existe; si no, quedan vacíos (instrumento por identificar).
 */
import { SKILLS_SEMILLA } from './seeds';
import type { EvidenceRequirements, LegalSkill } from './schema';

const BASE = SKILLS_SEMILLA[0];

const req = (required_instruments: string[], min_primary_sources = 1, jurisprudence: EvidenceRequirements['jurisprudence'] = 'SUPPORTING_ONLY'): EvidenceRequirements => ({
  required_instruments, min_primary_sources, jurisprudence,
});

type Parcial = Pick<LegalSkill, 'skill_id' | 'matter' | 'submatter' | 'task' | 'required_sources' | 'preferred_sources'> & Partial<LegalSkill>;

const skill = (p: Parcial): LegalSkill => ({ ...structuredClone(BASE), ...p });

/** Requisitos de evidencia de las 7 skills semilla originales (se aplican al registrar el conjunto de lanzamiento). */
export const REQUISITOS_SEMILLA: Readonly<Record<string, EvidenceRequirements>> = Object.freeze({
  'HN.CIVIL.CONTRACTS.SALE': req(['CODIGO_CIVIL']),
  'HN.PENAL.CRIMES.FRAUD': req(['CODIGO_PENAL']),
  'HN.NOTARIAL.PUBLIC_DEED': req(['CODIGO_NOTARIADO']),
  'HN.COMMERCIAL.NEGOTIABLE_INSTRUMENTS': req(['CODIGO_COMERCIO']),
  'HN.FAMILY.DIVORCE': req(['CODIGO_FAMILIA']),
  'HN.LABOR.TERMINATION': req(['CODIGO_TRABAJO']),
  'HN.ADMINISTRATIVE.APPEAL': req([]),
});

export const SKILLS_LANZAMIENTO: readonly LegalSkill[] = [
  skill({ skill_id: 'HN.CONSTITUTIONAL.ARTICLE_LOOKUP', matter: 'CONSTITUTIONAL', submatter: 'ARTICLE_LOOKUP', task: 'EXACT_LOOKUP', required_sources: ['Constitución de la República de Honduras'], preferred_sources: ['Ley sobre Justicia Constitucional'], evidence_threshold: 0.9, evidence_requirements: req(['CONSTITUCION']) }),
  skill({ skill_id: 'HN.CIVIL.CONTRACTS', matter: 'CIVIL', submatter: 'CONTRACTS', task: 'RESEARCH', required_sources: ['Código Civil de Honduras'], preferred_sources: ['Código de Comercio de Honduras'], evidence_requirements: req(['CODIGO_CIVIL']) }),
  skill({ skill_id: 'HN.CIVIL.PROPERTY', matter: 'CIVIL', submatter: 'PROPERTY', task: 'RESEARCH', required_sources: ['Código Civil de Honduras'], preferred_sources: ['Legislación de propiedad (instrumento por identificar)'], evidence_requirements: req(['CODIGO_CIVIL']) }),
  skill({ skill_id: 'HN.CIVIL.SUCCESSION', matter: 'CIVIL', submatter: 'SUCCESSION', task: 'RESEARCH', required_sources: ['Código Civil de Honduras'], preferred_sources: ['Código Procesal Civil de Honduras'], evidence_requirements: req(['CODIGO_CIVIL']) }),
  skill({ skill_id: 'HN.PROCEDURAL_CIVIL.CLAIM', matter: 'PROCEDURAL_CIVIL', submatter: 'CLAIM', task: 'RESEARCH', required_sources: ['Código Procesal Civil de Honduras'], preferred_sources: ['Código Civil de Honduras'], evidence_requirements: req(['CODIGO_PROCESAL_CIVIL']) }),
  skill({ skill_id: 'HN.PENAL.ARTICLE_LOOKUP', matter: 'PENAL', submatter: 'ARTICLE_LOOKUP', task: 'EXACT_LOOKUP', required_sources: ['Código Penal de Honduras'], preferred_sources: [], evidence_threshold: 0.9, evidence_requirements: req(['CODIGO_PENAL']) }),
  skill({ skill_id: 'HN.PENAL.OFFENSE_ANALYSIS', matter: 'PENAL', submatter: 'OFFENSE_ANALYSIS', task: 'ANALYSIS', required_sources: ['Código Penal de Honduras'], preferred_sources: ['Código Procesal Penal de Honduras'], model_policy: { role: 'DEEP', reasoningEffort: 'medium' }, evidence_requirements: req(['CODIGO_PENAL']) }),
  skill({ skill_id: 'HN.PROCEDURAL_PENAL', matter: 'PROCEDURAL_PENAL', submatter: 'GENERAL', task: 'RESEARCH', required_sources: ['Código Procesal Penal de Honduras'], preferred_sources: ['Código Penal de Honduras'], evidence_requirements: req(['CODIGO_PROCESAL_PENAL']) }),
  skill({ skill_id: 'HN.COMMERCIAL.CONTRACTS', matter: 'COMMERCIAL', submatter: 'CONTRACTS', task: 'RESEARCH', required_sources: ['Código de Comercio de Honduras'], preferred_sources: ['Código Civil de Honduras'], evidence_requirements: req(['CODIGO_COMERCIO']) }),
  skill({ skill_id: 'HN.FAMILY.CHILDREN', matter: 'FAMILY', submatter: 'CHILDREN', task: 'RESEARCH', required_sources: ['Código de Familia de Honduras', 'Código de la Niñez y la Adolescencia'], preferred_sources: [], evidence_requirements: req(['CODIGO_FAMILIA']) }),
  skill({ skill_id: 'HN.TAX.ARTICLE_LOOKUP', matter: 'TAX', submatter: 'ARTICLE_LOOKUP', task: 'EXACT_LOOKUP', required_sources: ['Código Tributario de Honduras'], preferred_sources: [], evidence_threshold: 0.9, evidence_requirements: req(['CODIGO_TRIBUTARIO']) }),
  skill({ skill_id: 'HN.AML.COMPLIANCE', matter: 'AML', submatter: 'COMPLIANCE', task: 'RESEARCH', required_sources: ['Legislación contra el lavado de activos (instrumento por identificar)'], preferred_sources: [], evidence_requirements: req([]) }),
];

/** Todas las skills de lanzamiento: las 7 semillas con sus requisitos + las 12 nuevas. */
export function todasLasSkillsDeLanzamiento(): LegalSkill[] {
  const semillas = SKILLS_SEMILLA.map((s) => ({ ...structuredClone(s), evidence_requirements: REQUISITOS_SEMILLA[s.skill_id] }));
  return [...semillas, ...structuredClone(SKILLS_LANZAMIENTO) as LegalSkill[]];
}

/** Registro con las 19 skills de lanzamiento (todas DRAFT). */
export async function registroDeLanzamiento() {
  const { crearRegistroSkills } = await import('./registry');
  const r = crearRegistroSkills();
  for (const s of todasLasSkillsDeLanzamiento()) r.registrar(s);
  return r;
}
