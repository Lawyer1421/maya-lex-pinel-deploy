/**
 * lib/ai-gateway/shadow/types.ts
 * MAYALEX AI GATEWAY v1 — PR-G1, SHADOW MODE (dictamen CLO 21-oct-2026).
 *
 * Contratos del gateway en modo sombra. Nada de este módulo llega al usuario:
 * un ShadowGatewayResult se compara con la respuesta de producción y se
 * registra; nunca se sirve. Este PR no llama a ningún modelo ni a la red.
 */
import type { RetrievalExecutionState } from '../../legal-retrieval/types';
import type { ResultadoExacto } from '../../legal-retrieval/exact-resolver';

/** Único modelo autorizado por Fredy para el gateway (decisión del 21-oct-2026). */
export const MODELO_GATEWAY = 'gpt-6-luna' as const;
export type ModeloGateway = typeof MODELO_GATEWAY;

/**
 * Clasificación que PRODUCCIÓN ya aplica hoy a un fragmento (la etiqueta de formatearContextoRAG). No es un rol
 * PRIMARY/CONTEXT: es la semántica auténtica del runtime actual.
 */
export type ClasificacionProduccion =
  | 'NORMA_VIGENTE_HONDURAS'
  | 'DOCTRINAL_NO_VINCULANTE'
  | 'COMPARADA'
  | 'DOCTRINA_JURISPRUDENCIA'
  | 'NO_VIGENTE'
  | 'SIN_CLASIFICAR'
  | 'DESCONOCIDA';

/** Fragmento de evidencia que se entrega al modelo. `chunk_id` es la única forma de citarlo. */
export interface EvidenceChunk {
  chunk_id: string;
  /** Instrumento normalizado del fragmento (p. ej. CODIGO_NOTARIADO, CPP). */
  instrumento: string;
  /** Número de artículo, si el fragmento es un artículo. */
  articulo: string | null;
  /** Gaceta de la fuente, si se conoce. */
  gaceta: string | null;
  /**
   * PRIMARY o CONTEXT solo si lo resolvió `resolverVersion`. El runtime actual NO lo produce: allí es `null`.
   * Nunca se infiere ni se usa CONTEXT por defecto, y el modelo no puede declararlo.
   */
  rol: 'PRIMARY' | 'CONTEXT' | null;
  /** Clasificación que producción ya aplica al fragmento (ausente en fixtures sintéticos). */
  clasificacionProduccion?: ClasificacionProduccion;
  /** ¿Producción lo trata como citable (construirCitas)? Solo un chunk citable puede ser respaldo DIRECT. */
  citable: boolean;
  texto: string;
}

/** Lo que producción decidió para la misma consulta. */
export interface ProductionOutcome {
  decision: 'ANSWER' | 'ABSTAIN';
  retrievalState: RetrievalExecutionState;
}

export interface ShadowGatewayInput {
  queryId: string;
  /** Pregunta ya anonimizada; nunca el texto crudo del usuario. */
  sanitizedQuestion: string;
  evidence: EvidenceChunk[];
  productionOutcome: ProductionOutcome;
  exactResolverResult?: ResultadoExacto;
}

export type ShadowStatus = 'ANSWER' | 'ABSTAIN' | 'INVALID';

export type CitationSupport = 'DIRECT' | 'INDIRECT';

export interface ValidatedCitation {
  chunk_id: string;
  support: CitationSupport;
}

/** Claim que superó el validador: tiene citas y todas apuntan al evidence de su consulta. */
export interface ValidatedClaim {
  claim_id: string;
  text: string;
  citations: ValidatedCitation[];
}

export type MotivoDescarte = 'SIN_CITAS' | 'CITA_FUERA_DE_EVIDENCIA' | 'SIN_SOPORTE_DIRECTO_CITABLE';

export interface DiscardedClaim {
  claim_id: string;
  motivo: MotivoDescarte;
  /** chunk_id citados que no están en el evidence de la consulta. */
  chunkIdsInvalidos: string[];
}

export interface ShadowUsage {
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

declare const SHADOW_ONLY: unique symbol;

export interface ShadowGatewayResult {
  /** Marca nominal: un resultado sombra no es intercambiable con una respuesta de producción. */
  readonly [SHADOW_ONLY]: true;
  readonly origin: 'SHADOW';
  queryId: string;
  model: ModeloGateway;
  status: ShadowStatus;
  claims: ValidatedClaim[];
  discardedClaims: DiscardedClaim[];
  /** Número de citas descartadas por apuntar fuera del evidence de la consulta. */
  invalidCitations: number;
  /** Total de citas que emitió el modelo (válidas e inválidas). */
  totalCitations: number;
  abstentionReason: string | null;
  /** Por qué el resultado es INVALID (esquema, coherencia o sin claims sustentadas). */
  invalidReason: string | null;
  usage: ShadowUsage;
  latencyMs: number;
}

/** Único constructor de ShadowGatewayResult: aplica la marca nominal. */
export function crearResultadoSombra(r: Omit<ShadowGatewayResult, typeof SHADOW_ONLY | 'origin'>): ShadowGatewayResult {
  return { ...r, origin: 'SHADOW' } as ShadowGatewayResult;
}
