/**
 * lib/legal-retrieval/official-sources/fallback-orchestrator.ts
 * Retrieval v3 — Fase 1E.2: wiring de OFFICIAL_FALLBACK_REQUIRED al Official
 * Source Router, detrás de un feature flag Preview/canary.
 *
 * Esta es la ÚNICA función que app/api/chat/route.ts invoca para decidir si
 * intenta (y cómo interpreta) el fallback oficial -- toda la lógica de
 * decisión/orquestación vive aquí, pura y testeable sin mockear Next.js.
 *
 * Invariantes de esta fase (directiva Fase 1E.2):
 *   - Solo LEGISLATION -- nunca jurisprudencia, nunca Gaceta, nunca Tavily.
 *   - Como mucho UN intento por request (§11) -- nunca reintenta.
 *   - NUNCA convierte evidencia oficial en es_norma_vigente=true ni la
 *     etiqueta "NORMA VIGENTE HONDURAS" (§4) -- por diseño, esta evidencia
 *     nunca se convierte a FragmentoRAG/Cita, queda en su propia forma
 *     (OfficialSourceEvidence) y solo produce un mensaje de proveniencia
 *     explícito, nunca contenido de artículo (§6).
 *   - SOURCE_UNAVAILABLE/INVALID_RESPONSE/RATE_LIMITED NUNCA colapsan con
 *     NO_RESULTS (§12) -- se preservan como categorías distintas hasta el
 *     nivel de route.ts.
 */

import type { RetrievalExecutionState } from '../types';
import type { OfficialSourceEvidence, OfficialSourceId, OfficialSourceResultStatus } from './types';
import { routeOfficialSourceQuery, minimizeQueryForExternalResearch } from './router';

export interface OfficialFallbackOutcome {
  attempted: boolean;
  status?: OfficialSourceResultStatus;
  evidenceCount: number;
  latencyMs?: number;
  sourceId?: OfficialSourceId;
  evidence: OfficialSourceEvidence[];
}

export interface OfficialFallbackDecisionInput {
  /** Estado de retrieval interno -- ver lib/legal-retrieval/types.ts. Solo 'OFFICIAL_FALLBACK_REQUIRED' habilita el intento. */
  retrievalState: RetrievalExecutionState | undefined;
  /** Ruta del router de intención (A/B/C/D) -- solo B/C son "legislation-compatible" (ver directiva §3.C). */
  ruta: string;
  flagEnabled: boolean;
  rawQuery: string;
}

const OUTCOME_VACIO: OfficialFallbackOutcome = { attempted: false, evidenceCount: 0, evidence: [] };

/**
 * Regla determinista (§3 de la directiva) -- las 5 condiciones deben
 * cumplirse TODAS. Deliberadamente conservadora: cualquier duda excluye el
 * intento, nunca lo fuerza.
 *
 * (E) "sin guardia de ambigüedad/inexistencia exacta que lo bloquee" se
 * cumple por construcción: un artículo exacto explícito no encontrado o
 * ambiguo produce 'NO_VERIFIED_EVIDENCE' (Fase 1D), NUNCA
 * 'OFFICIAL_FALLBACK_REQUIRED' -- son dos estados distintos y mutuamente
 * excluyentes desde su origen en buscarRAG(). No hace falta un chequeo
 * adicional aquí para no contaminar la identidad exacta.
 */
export function shouldAttemptOfficialFallback(input: Omit<OfficialFallbackDecisionInput, 'rawQuery'>): boolean {
  if (!input.flagEnabled) return false;
  if (input.retrievalState !== 'OFFICIAL_FALLBACK_REQUIRED') return false;
  if (input.ruta !== 'B' && input.ruta !== 'C') return false;
  return true;
}

/**
 * Intenta el fallback oficial si (y solo si) `shouldAttemptOfficialFallback`
 * lo permite. Nunca lanza -- cualquier fallo de red/parseo ya llega
 * clasificado desde `routeOfficialSourceQuery`/el adapter (status
 * SOURCE_UNAVAILABLE/INVALID_RESPONSE), nunca como excepción no capturada.
 */
export async function attemptOfficialFallback(input: OfficialFallbackDecisionInput): Promise<OfficialFallbackOutcome> {
  if (!shouldAttemptOfficialFallback(input)) return OUTCOME_VACIO;

  // Minimización de consulta (§10, §14): nunca se envía la pregunta cruda
  // del usuario -- solo el texto reducido a términos jurídicos seguros.
  const searchText = minimizeQueryForExternalResearch(input.rawQuery);
  if (!searchText) return OUTCOME_VACIO;

  const inicio = Date.now();
  // Máximo UN intento (§11): un solo elemento en el array de consulta, y
  // routeOfficialSourceQuery ya se detiene en el primer SUCCESS o agota la
  // (única, en esta fase) lista de adapters para LEGISLATION sin reintentar.
  const [resultado] = await routeOfficialSourceQuery({ searchText, kind: 'LEGISLATION' });
  const latencyMs = Date.now() - inicio;

  return {
    attempted: true,
    status: resultado.status,
    evidenceCount: resultado.evidence.length,
    latencyMs,
    sourceId: resultado.sourceId,
    evidence: resultado.evidence,
  };
}

/**
 * Construye el mensaje seguro al usuario cuando SÍ se encontró metadata
 * oficial (§7). NUNCA incluye texto de artículo -- el adapter de esta fase
 * no descarga/parsea el PDF, solo trae título/fecha/URL (§6). El texto es
 * deliberadamente literal a lo exigido por la directiva, no una paráfrasis.
 */
export function construirMensajeFallbackOficial(evidence: OfficialSourceEvidence[]): string {
  const base = 'MayaLex localizó una fuente oficial relacionada en CEDIJ, pero aún no dispone del texto verificable necesario para fundamentar una respuesta jurídica detallada.';
  if (evidence.length === 0) return base;
  const primero = evidence[0];
  return `${base}\n\nDocumento localizado: "${primero.documentTitle}" (${primero.sourceName}).\nEnlace oficial: ${primero.sourceUrl}\n\nEsta referencia es informativa -- MayaLex no afirma el contenido de sus artículos sin verificación adicional.`;
}
