/**
 * lib/legal-os/types.ts
 * MayaLex Legal OS — contratos base. Sin Honduras cableado: país, jurisdicción, autoridad, instrumento, versión y skill son datos.
 * Regla de oro: el modelo propone; la validez jurídica la fija el corpus + el motor de versiones, nunca un LLM.
 */

/** Códigos ISO 3166-1 alfa-2 de Centroamérica. */
export type CountryCode = 'HN' | 'GT' | 'SV' | 'NI' | 'CR' | 'PA' | 'BZ';

export interface JurisdictionRef {
  country: CountryCode;
  /** Ámbito dentro del país: nacional, departamental, municipal. */
  jurisdiction: 'NACIONAL' | 'DEPARTAMENTAL' | 'MUNICIPAL';
}

export type LegalTask = 'EXACT_LOOKUP' | 'RESEARCH' | 'ANALYSIS' | 'DRAFTING' | 'DOCUMENT_REVIEW' | 'OUT_OF_SCOPE';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type SubscriptionTier = 'EXPLORAR' | 'ACADEMICO' | 'PREMIUM';
export type RequestedDepth = 'QUICK' | 'STANDARD' | 'DEEP';

export interface IntentResult {
  task: LegalTask;
  jurisdiction: JurisdictionRef;
  /** Materia en forma libre (p. ej. «penal»); los ids de skill la afinan. */
  matter: string | null;
  risk: RiskLevel;
  /** El usuario nombra un artículo/instrumento concreto (resoluble sin modelo). */
  hasExactReference: boolean;
  /** La respuesta exige evidencia del corpus (no hay respuesta sin fuentes). */
  requiresEvidence: boolean;
}

/** Rol de modelo, no ID de modelo: los IDs viven en `ModelPolicy` y solo se rellenan si están verificados. */
export type ModelRole = 'NONE' | 'FAST' | 'DEEP';

export interface RoutingInput {
  intent: IntentResult;
  tier: SubscriptionTier;
  depth: RequestedDepth;
  /** Calidad de la evidencia recuperada, 0–1 (1 = artículo exacto verificado). */
  evidenceQuality: number;
  /** Confianza del retrieval, 0–1. */
  retrievalConfidence: number;
  /** Número de fragmentos de evidencia disponibles. */
  evidenceCount: number;
  /** Tokens de entrada estimados del prompt con evidencia. */
  estimatedInputTokens: number;
  /** Objetivo de latencia percibida en ms. */
  latencyTargetMs: number;
}

export interface ModelRoute {
  role: ModelRole;
  /** ID del modelo, o null si el rol es NONE o el ID no está verificado. */
  modelId: string | null;
  reasoningEffort: 'none' | 'low' | 'medium' | 'high';
  stream: boolean;
  estimatedCostUsd: number;
  reasons: string[];
  /** Se pidió/convenía DEEP pero no hay modelo profundo verificado: se degrada a FAST y se avisa. */
  deepUnavailable: boolean;
  /** Sin evidencia suficiente no se llama al modelo: abstención. */
  abstain: boolean;
}
