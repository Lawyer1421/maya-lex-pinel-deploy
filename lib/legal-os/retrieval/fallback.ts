/**
 * lib/legal-os/retrieval/fallback.ts
 * Decisión del fallback a fuentes oficiales. Solo se intenta tras evidencia interna insuficiente; tras el fallback sin
 * evidencia oficial verificada la respuesta es ABSTAIN o QUALIFY, nunca una respuesta construida con una página web arbitraria.
 */
import type { RetrievalExecutionState } from '../../legal-retrieval/types';

export type DecisionFallback = 'USE_INTERNAL' | 'TRY_OFFICIAL' | 'ABSTAIN' | 'QUALIFY';

export interface EstadoFallback {
  state: RetrievalExecutionState;
  /** Ya se intentó el fallback oficial en esta consulta. */
  fallbackIntentado: boolean;
  /** El fallback devolvió evidencia de una fuente oficial verificada. */
  evidenciaOficialVerificada: boolean;
  /** La evidencia existe pero es parcial (no cubre todo lo pedido). */
  evidenciaParcial?: boolean;
}

export function decidirFallbackOficial(e: EstadoFallback): DecisionFallback {
  if (e.fallbackIntentado) {
    if (e.evidenciaOficialVerificada) return 'USE_INTERNAL'; // la evidencia oficial verificada ya está en el contexto
    return e.evidenciaParcial ? 'QUALIFY' : 'ABSTAIN';
  }
  switch (e.state) {
    case 'NOT_REQUIRED':
    case 'EXACT_SUCCESS':
      return 'USE_INTERNAL';
    case 'SEMANTIC_SUCCESS':
      return e.evidenciaParcial ? 'TRY_OFFICIAL' : 'USE_INTERNAL';
    case 'OFFICIAL_FALLBACK_REQUIRED':
    case 'NO_VERIFIED_EVIDENCE':
      return 'TRY_OFFICIAL';
    case 'CONFIGURATION_ERROR':
    case 'RETRIEVAL_ERROR':
      // Un fallo de nuestra infraestructura no es «falta de ley»: se intenta lo oficial una vez; si no, se abstiene.
      return 'TRY_OFFICIAL';
    default:
      return 'ABSTAIN';
  }
}
