/**
 * lib/legal-os/graph/types.ts
 * Grafo de conocimiento jurídico (en memoria, offline). Solo estructura y consultas: el grafo NO declara validez jurídica;
 * devuelve lo que los eventos registrados implican y marca `unverified` cuando algún evento no tiene verificación humana.
 */
export const NODE_KINDS = ['LAW', 'DECREE', 'ARTICLE', 'REFORM', 'REPEAL', 'REGULATION', 'JUDGMENT', 'TREATY', 'INSTITUTION', 'LEGAL_SKILL'] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export const EDGE_KINDS = ['REFORMS', 'REPEALS', 'INTERPRETS', 'IMPLEMENTS', 'CITES', 'APPLIES', 'DECLARES_UNCONSTITUTIONAL', 'REPLACES', 'DEPENDS_ON'] as const;
export type EdgeKind = (typeof EDGE_KINDS)[number];

export type DatePrecision = 'DIA' | 'MES' | 'AÑO' | 'RANGO';
export type VerificationState = 'HUMAN_VERIFIED' | 'CANDIDATE' | 'UNVERIFIED';

export interface Provenance {
  source: string;
  /** 1 = Gaceta … 5 = regulador oficial. */
  tier: 1 | 2 | 3 | 4 | 5;
  hash?: string;
  verification_state: VerificationState;
}

export interface Effective {
  /** ISO YYYY-MM-DD. */
  effective_from?: string;
  effective_to?: string;
  precision?: DatePrecision;
}

export interface GraphNode extends Effective {
  id: string;
  kind: NodeKind;
  label?: string;
  provenance: Provenance;
}

/** Arista inmutable. Una corrección es una arista nueva con `supersedes`. */
export interface GraphEdge extends Effective {
  id: string;
  kind: EdgeKind;
  from: string;
  to: string;
  provenance: Provenance;
  /** Id de la arista que esta reemplaza (la anterior no se modifica). */
  supersedes?: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export type StatusOnDate = 'IN_FORCE' | 'REPEALED' | 'UNCONSTITUTIONAL' | 'NOT_YET_ENACTED' | 'UNKNOWN';

export interface LawOnDate {
  status: StatusOnDate;
  /** Id del nodo cuya disposición rige en la fecha (el propio artículo o el modificador), si se conoce. */
  providedBy: string | null;
  reason?: string;
  /** Algún evento usado carece de verificación humana: el resultado es una pista, no un hecho. */
  unverified: boolean;
  edgesUsed: string[];
}
