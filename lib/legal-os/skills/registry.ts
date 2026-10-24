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

/** Materia libre del clasificador → materias de skill posibles (lo procesal convive con lo sustantivo). */
const MATERIAS_DE_SKILL: Record<string, readonly string[]> = {
  civil: ['CIVIL', 'PROCEDURAL_CIVIL'], penal: ['PENAL', 'PROCEDURAL_PENAL'], laboral: ['LABOR'], familia: ['FAMILY'], notarial: ['NOTARIAL'],
  comercial: ['COMMERCIAL'], administrativo: ['ADMINISTRATIVE'], tributario: ['TAX'], constitucional: ['CONSTITUTIONAL'], aduanero: ['CUSTOMS'],
  aml: ['AML'], bancario: ['BANKING'], propiedad: ['CIVIL', 'PROPERTY'],
};

/** Pistas textuales por último segmento del skill_id; desambiguan skills de la misma materia. No son reglas jurídicas. */
const PISTAS: Record<string, RegExp> = {
  CONTRACTS: /\b(contrat\w*|obligaci\w*|compraventa|arrendamiento)\b/i,
  SALE: /\b(compraventa|venta|vendedor|comprador)\b/i,
  PROPERTY: /\b(propiedad|inmueble\w*|posesi[oó]n|dominio|hipoteca|servidumbre)\b/i,
  SUCCESSION: /\b(sucesi\w*|herenci\w*|testament\w*|herede\w*|legado)\b/i,
  CLAIM: /\b(demanda|reclamaci\w*|proceso civil|emplazamiento)\b/i,
  FRAUD: /\b(fraude|estafa)\b/i,
  OFFENSE_ANALYSIS: /\b(delito|tipicidad|autor[ií]a|tentativa|agravante|atenuante)\b/i,
  ARTICLE_LOOKUP: /\bart(?:[ií]culo|\.)?\s*\d+/i,
  DIVORCE: /\b(divorcio|disoluci[oó]n del matrimonio)\b/i,
  CHILDREN: /\b(ni[ñn]\w*|menor\w*|adolescent\w*|alimentos|custodia|patria potestad)\b/i,
  TERMINATION: /\b(despido|terminaci[oó]n del contrato|preaviso|cesant[ií]a)\b/i,
  NEGOTIABLE_INSTRUMENTS: /\b(letra de cambio|cheque|pagar[eé]|t[ií]tulos? valores?)\b/i,
  PUBLIC_DEED: /\b(escritura p[uú]blica|escritura|protocolo)\b/i,
  APPEAL: /\b(recurso|apelaci[oó]n|impugnaci[oó]n)\b/i,
  COMPLIANCE: /\b(lavado de activos|cumplimiento|debida diligencia|uif|beneficiario final)\b/i,
  PROCEDURAL_PENAL: /\b(proceso penal|imputado|audiencia|medidas cautelares|prisi[oó]n preventiva)\b/i,
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

  /**
   * Elige LA skill que ejecutará el pipeline: materia + tarea + instrumento nombrado + pistas de submateria en el texto.
   * Devuelve solo el id (divulgación progresiva: la especificación completa se carga después con `loadSkill`, una sola vez).
   * Reglas: una skill que exige instrumentos distintos del nombrado se excluye; sin una pista temática o un instrumento único
   * no se elige ninguna; el desempate es determinista (id más corto, luego orden alfabético).
   */
  function seleccionarMejor(intent: IntentResult, texto: string, opciones: { incluirBorradores?: boolean; instrumento?: string | null } = {}): string | null {
    const materia = intent.matter ? MATERIAS_DE_SKILL[intent.matter] : undefined;
    if (!materia) return null;
    const conPista: Array<{ id: string; puntos: number }> = [];
    const soloInstrumento: string[] = [];
    for (const s of skills.values()) {
      if (s.country !== intent.jurisdiction.country || s.jurisdiction !== intent.jurisdiction.jurisdiction) continue;
      if (!materia.includes(s.matter)) continue;
      if (!(s.status === 'ACTIVE' || (opciones.incluirBorradores === true && (s.status === 'DRAFT' || s.status === 'REVIEW')))) continue;
      const tareaOk = s.task === intent.task || (s.task === 'RESEARCH' && (intent.task === 'EXACT_LOOKUP' || intent.task === 'ANALYSIS'));
      if (!tareaOk) continue;
      const exigidos = s.evidence_requirements?.required_instruments ?? [];
      if (opciones.instrumento && exigidos.length > 0 && !exigidos.includes(opciones.instrumento)) continue;
      const porInstrumento = !!opciones.instrumento && exigidos.includes(opciones.instrumento);
      const pista = PISTAS[s.skill_id.split('.').pop() as string];
      if (pista && pista.test(texto)) {
        conPista.push({ id: s.skill_id, puntos: 2 + (porInstrumento ? 3 : 0) + (s.task === intent.task ? 1 : 0) });
      } else if (porInstrumento) {
        soloInstrumento.push(s.skill_id);
      }
    }
    // Con pista temática manda la de más puntos (desempate: la más específica, luego alfabético). Sin pista, el instrumento nombrado
    // solo basta si identifica UNA única skill; si hay varias candidatas no se adivina: ninguna.
    if (conPista.length > 0) {
      // Con igual puntaje gana la skill MÁS ESPECÍFICA (más segmentos en el id; p. ej. CIVIL.CONTRACTS.SALE sobre CIVIL.CONTRACTS), luego orden alfabético.
      conPista.sort((a, b) => b.puntos - a.puntos || b.id.split('.').length - a.id.split('.').length || (a.id < b.id ? -1 : 1));
      return conPista[0].id;
    }
    return soloInstrumento.length === 1 ? soloInstrumento[0] : null;
  }

  return { registrar, describeSkill, loadSkill, listarSkills, seleccionarPorIntencion, seleccionarMejor, cargasCompletas: () => cargasCompletas };
}

export type RegistroSkills = ReturnType<typeof crearRegistroSkills>;
