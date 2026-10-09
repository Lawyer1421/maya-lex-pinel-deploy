import type { RankedCandidate } from './types';

export type VeredictoSuficiencia = 'SUFFICIENT' | 'LIMITED' | 'ABSTAIN';

export interface ResultadoSuficiencia {
  veredicto: VeredictoSuficiencia;
  motivo:
    | 'PRIMARY_PRESENTE'
    | 'SIN_EVIDENCIA'
    | 'SOLO_CAPAS_ABIERTAS'
    | 'SOLO_CONTEXTO_O_SECUNDARIO';
  advertencias: string[];
}

/**
 * Puerta de suficiencia por roles de evidencia. No evalúa si la respuesta es
 * jurídicamente correcta; sólo si existe evidencia del rol requerido.
 */
export function evaluarSuficiencia(ranking: readonly RankedCandidate[]): ResultadoSuficiencia {
  const advertencias = [
    ...new Set(ranking.map((c) => c.advertencia_clo).filter((a): a is string => a !== null)),
  ].sort();

  if (ranking.length === 0) {
    return { veredicto: 'ABSTAIN', motivo: 'SIN_EVIDENCIA', advertencias };
  }
  if (ranking.some((c) => c.rol_recuperacion === 'PRIMARY')) {
    return { veredicto: 'SUFFICIENT', motivo: 'PRIMARY_PRESENTE', advertencias };
  }
  const todasAbiertas = ranking.every((c) => c.capa_clo !== null);
  if (todasAbiertas) {
    return { veredicto: 'ABSTAIN', motivo: 'SOLO_CAPAS_ABIERTAS', advertencias };
  }
  return { veredicto: 'LIMITED', motivo: 'SOLO_CONTEXTO_O_SECUNDARIO', advertencias };
}
