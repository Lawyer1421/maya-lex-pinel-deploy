import type { RankedCandidate } from './types';

export type VeredictoSuficiencia = 'SUFFICIENT' | 'LIMITED' | 'ABSTAIN';

export type MotivoSuficiencia =
  | 'SIN_EVIDENCIA'
  | 'SOLO_RELEVANCIA_FALLIDA'
  | 'SOLO_CAPAS_ABIERTAS'
  | 'SIN_PRIMARY_RELEVANTE'
  | 'PRIMARY_PASS_SIN_SOPORTE_VALIDADO'
  | 'PRIMARY_PASS_CON_SOPORTE_VALIDADO';

export interface ResultadoSuficiencia {
  veredicto: VeredictoSuficiencia;
  motivo: MotivoSuficiencia;
  advertencias: string[];
}

export interface OpcionesSuficiencia {
  /** Marcador explícito validado por una persona. Nunca se infiere de puntuaciones. */
  soporteValidado?: ReadonlySet<string>;
}

/**
 * Suficiencia = RETRIEVAL_ROLE ∧ RELEVANCE ∧ material_support.
 * SUFFICIENT exige un PRIMARY con relevancia PASS y soporte validado explícito.
 * Sin ese marcador, el máximo posible es LIMITED. CONTEXT, SECONDARY y capas
 * abiertas nunca se acumulan para producir SUFFICIENT.
 */
export function evaluarSuficiencia(
  ranking: readonly RankedCandidate[],
  opciones: OpcionesSuficiencia = {},
): ResultadoSuficiencia {
  const advertencias = [
    ...new Set(ranking.map((c) => c.advertencia_clo).filter((a): a is string => a !== null)),
  ].sort();

  if (ranking.length === 0) {
    return { veredicto: 'ABSTAIN', motivo: 'SIN_EVIDENCIA', advertencias };
  }

  const admisibles = ranking.filter((c) => c.relevancia_clo !== 'FAIL');
  if (admisibles.length === 0) {
    return { veredicto: 'ABSTAIN', motivo: 'SOLO_RELEVANCIA_FALLIDA', advertencias };
  }

  const primaryRelevante = admisibles.filter(
    (c) => c.rol_recuperacion === 'PRIMARY' && c.relevancia_clo === 'PASS',
  );
  if (primaryRelevante.length === 0) {
    if (admisibles.every((c) => c.capa_clo !== null)) {
      return { veredicto: 'ABSTAIN', motivo: 'SOLO_CAPAS_ABIERTAS', advertencias };
    }
    return { veredicto: 'LIMITED', motivo: 'SIN_PRIMARY_RELEVANTE', advertencias };
  }

  const soporte = opciones.soporteValidado ?? new Set<string>();
  if (primaryRelevante.some((c) => soporte.has(c.id))) {
    return { veredicto: 'SUFFICIENT', motivo: 'PRIMARY_PASS_CON_SOPORTE_VALIDADO', advertencias };
  }
  return { veredicto: 'LIMITED', motivo: 'PRIMARY_PASS_SIN_SOPORTE_VALIDADO', advertencias };
}
