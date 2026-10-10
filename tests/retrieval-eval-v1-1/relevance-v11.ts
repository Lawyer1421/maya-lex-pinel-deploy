import type { LabCandidate } from '@/lib/legal-retrieval/lab/types';
import { identidadDeRegistro, type ContextoIntencion } from './instrument-intent';

/**
 * Relevancia V1.1 (sólo evaluación). Identidad determinista. La similitud
 * léxica o semántica nunca produce PASS. La materia sola no produce PASS
 * cuando la consulta expresa una clase de instrumento.
 */

export type RelevanciaV11 = 'PASS' | 'UNKNOWN' | 'FAIL';

export type RazonV11 =
  | 'EXACT_IDENTITY'
  | 'INSTRUMENT_AND_ARTICLE'
  | 'INSTRUMENT_IDENTITY'
  | 'MATERIA_AND_ARTICLE'
  | 'MATERIA_ONLY'
  | 'INCOMPATIBLE_INSTRUMENT'
  | 'ARTICLE_MISMATCH_SINGLE'
  | 'ARTICLE_MISMATCH_MULTI'
  | 'INTENT_UNRESOLVED_CANDIDATE'
  | 'ARTICLE_MATCH_NO_IDENTITY'
  | 'NO_SIGNAL';

export function relevanciaV11(c: LabCandidate, ctx: ContextoIntencion): { relevancia: RelevanciaV11; razon: RazonV11 } {
  if (c.exact_match) return { relevancia: 'PASS', razon: 'EXACT_IDENTITY' };

  const hayArticulo = ctx.articulos.length > 0;
  const articuloCoincide = hayArticulo && c.num_articulo !== null && ctx.articulos.includes(c.num_articulo);
  const articuloDiscrepa = hayArticulo && !articuloCoincide;
  const identidadCandidato = identidadDeRegistro(c);
  const intencion = ctx.intencion;

  if (intencion.identidad !== null) {
    if (identidadCandidato !== null && identidadCandidato !== intencion.identidad) {
      return { relevancia: 'FAIL', razon: 'INCOMPATIBLE_INSTRUMENT' };
    }
    if (articuloDiscrepa) {
      return ctx.multiArticulo
        ? { relevancia: 'UNKNOWN', razon: 'ARTICLE_MISMATCH_MULTI' }
        : { relevancia: 'FAIL', razon: 'ARTICLE_MISMATCH_SINGLE' };
    }
    if (identidadCandidato === null) return { relevancia: 'UNKNOWN', razon: 'INTENT_UNRESOLVED_CANDIDATE' };
    return hayArticulo
      ? { relevancia: 'PASS', razon: 'INSTRUMENT_AND_ARTICLE' }
      : { relevancia: 'PASS', razon: 'INSTRUMENT_IDENTITY' };
  }

  if (intencion.clase !== null) {
    if (articuloDiscrepa) {
      return ctx.multiArticulo
        ? { relevancia: 'UNKNOWN', razon: 'ARTICLE_MISMATCH_MULTI' }
        : { relevancia: 'FAIL', razon: 'ARTICLE_MISMATCH_SINGLE' };
    }
    if (articuloCoincide) return { relevancia: 'UNKNOWN', razon: 'ARTICLE_MATCH_NO_IDENTITY' };
    return { relevancia: 'UNKNOWN', razon: 'NO_SIGNAL' };
  }

  if (articuloDiscrepa) {
    return ctx.multiArticulo
      ? { relevancia: 'UNKNOWN', razon: 'ARTICLE_MISMATCH_MULTI' }
      : { relevancia: 'FAIL', razon: 'ARTICLE_MISMATCH_SINGLE' };
  }
  const materiaCoincide = ctx.materia !== null && c.materia === ctx.materia;
  if (articuloCoincide) {
    return materiaCoincide
      ? { relevancia: 'PASS', razon: 'MATERIA_AND_ARTICLE' }
      : { relevancia: 'UNKNOWN', razon: 'ARTICLE_MATCH_NO_IDENTITY' };
  }
  if (materiaCoincide) return { relevancia: 'PASS', razon: 'MATERIA_ONLY' };
  return { relevancia: 'UNKNOWN', razon: 'NO_SIGNAL' };
}
