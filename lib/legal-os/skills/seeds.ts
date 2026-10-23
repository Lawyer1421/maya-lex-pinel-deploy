/**
 * lib/legal-os/skills/seeds.ts
 * Skills SEMILLA, todas en estado DRAFT, propietario PENDING_CLO y sin revisión. No contienen contenido jurídico (ni artículos, ni
 * decretos, ni reglas): solo la forma de buscar y los umbrales. Pasar a ACTIVE exige evaluation_set y revisión humana del CLO.
 */
import type { LegalSkill } from './schema';

type Variable = Pick<LegalSkill, 'skill_id' | 'matter' | 'submatter' | 'task' | 'required_sources' | 'preferred_sources'>;

const semilla = (p: Variable): LegalSkill => ({
  country: 'HN',
  jurisdiction: 'NACIONAL',
  exact_resolver: true,
  retrieval_strategy: ['EXACT', 'STRUCTURED', 'LEXICAL', 'SEMANTIC', 'RERANK'],
  validity_rules: ['RESOLVER_VIGENCIA_CON_MOTOR_DE_VERSIONES', 'ABSTENER_SI_VERSION_NO_VERIFICADA'],
  evidence_threshold: 0.6,
  citation_policy: { required: true, perClaim: true, allowedSourceRoles: ['PRIMARY', 'CONTEXT'] },
  abstention_policy: { mode: 'ABSTAIN_ON_NO_EVIDENCE', notes: 'Sin evidencia verificada del corpus no se responde.' },
  instructions: 'Responder solo con la evidencia entregada, citando cada proposición. No afirmar vigencia ni validez: eso lo determina el sistema.',
  tools_allowed: ['search_law', 'resolve_article', 'get_law_version', 'validate_citation'],
  tools_forbidden: ['web_search', 'file_write', 'send_email'],
  model_policy: { role: 'FAST', reasoningEffort: 'none' },
  output_schema: 'legal-answer.v1',
  evaluation_set: null,
  version: '0.1.0',
  owner: 'PENDING_CLO',
  last_reviewed: null,
  status: 'DRAFT',
  ...p,
});

export const SKILLS_SEMILLA: readonly LegalSkill[] = [
  semilla({ skill_id: 'HN.CIVIL.CONTRACTS.SALE', matter: 'CIVIL', submatter: 'CONTRACTS', task: 'RESEARCH', required_sources: ['Código Civil de Honduras'], preferred_sources: ['Código de Comercio de Honduras'] }),
  semilla({ skill_id: 'HN.PENAL.CRIMES.FRAUD', matter: 'PENAL', submatter: 'CRIMES', task: 'RESEARCH', required_sources: ['Código Penal de Honduras'], preferred_sources: ['Código Procesal Penal de Honduras'] }),
  semilla({ skill_id: 'HN.NOTARIAL.PUBLIC_DEED', matter: 'NOTARIAL', submatter: 'PUBLIC_DEED', task: 'DRAFTING', required_sources: ['Código del Notariado de Honduras', 'Reglamento del Notariado'], preferred_sources: ['Código Civil de Honduras'] }),
  semilla({ skill_id: 'HN.COMMERCIAL.NEGOTIABLE_INSTRUMENTS', matter: 'COMMERCIAL', submatter: 'NEGOTIABLE_INSTRUMENTS', task: 'RESEARCH', required_sources: ['Código de Comercio de Honduras'], preferred_sources: [] }),
  semilla({ skill_id: 'HN.FAMILY.DIVORCE', matter: 'FAMILY', submatter: 'DIVORCE', task: 'RESEARCH', required_sources: ['Código de Familia de Honduras'], preferred_sources: ['Código Procesal Civil de Honduras'] }),
  semilla({ skill_id: 'HN.LABOR.TERMINATION', matter: 'LABOR', submatter: 'TERMINATION', task: 'RESEARCH', required_sources: ['Código del Trabajo de Honduras'], preferred_sources: [] }),
  semilla({ skill_id: 'HN.ADMINISTRATIVE.APPEAL', matter: 'ADMINISTRATIVE', submatter: 'APPEAL', task: 'RESEARCH', required_sources: ['Normativa de procedimiento administrativo (instrumento por identificar)', 'Normativa de la jurisdicción contencioso-administrativa (instrumento por identificar)'], preferred_sources: [] }),
];

/** Crea un registro con las semillas ya cargadas. */
export async function registroConSemillas() {
  const { crearRegistroSkills } = await import('./registry');
  const r = crearRegistroSkills();
  for (const s of SKILLS_SEMILLA) r.registrar(s);
  return r;
}
