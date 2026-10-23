import type { AgentContract, AgentId } from './types';

/** Autoridad mínima por agente. Los nombres de herramienta salen del catálogo del bus (una prueba lo verifica). */
export const CONTRATOS: Readonly<Record<AgentId, AgentContract>> = Object.freeze({
  LEGAL_INTAKE: { id: 'LEGAL_INTAKE', authority: 'PROPOSE_ONLY', allowedTools: ['legal_skill'], timeoutMs: 3_000 },
  LEGAL_RESEARCH: { id: 'LEGAL_RESEARCH', authority: 'PROPOSE_ONLY', allowedTools: ['search_law', 'search_regulations', 'search_treaties', 'legal_definition'], timeoutMs: 8_000 },
  EXACT_LAW: { id: 'EXACT_LAW', authority: 'PROPOSE_ONLY', allowedTools: ['resolve_article', 'get_law_version', 'build_timeline'], timeoutMs: 5_000 },
  CASELAW: { id: 'CASELAW', authority: 'PROPOSE_ONLY', allowedTools: ['search_jurisprudence', 'get_case'], timeoutMs: 8_000 },
  CONTRADICTION: { id: 'CONTRADICTION', authority: 'PROPOSE_ONLY', allowedTools: ['search_reforms', 'search_gaceta', 'compare_versions', 'search_jurisprudence'], timeoutMs: 8_000 },
  CITATION: { id: 'CITATION', authority: 'PROPOSE_ONLY', allowedTools: ['validate_citation'], timeoutMs: 5_000 },
  LEGAL_DRAFTING: { id: 'LEGAL_DRAFTING', authority: 'PROPOSE_ONLY', allowedTools: ['draft_from_evidence'], timeoutMs: 15_000 },
  QUALITY: { id: 'QUALITY', authority: 'PROPOSE_ONLY', allowedTools: [], timeoutMs: 3_000 },
});
