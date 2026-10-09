import { identidadDocumentalCoincide, type InstrumentoNormalizado } from '../exact-resolver';
import { aFilaExacta } from './exact-lab';
import type { LabCandidate } from './types';

/**
 * Relevancia para la pregunta concreta. Sólo identidad determinista: instrumento,
 * artículo, materia clasificada o identificador exacto. La similitud léxica o
 * semántica nunca produce PASS por sí sola.
 */
export type Relevancia = 'PASS' | 'UNKNOWN' | 'FAIL';

export interface ContextoRelevancia {
  articulo: string | null;
  instrumento: InstrumentoNormalizado | null;
  materia: string | null;
}

export function evaluarRelevancia(c: LabCandidate, ctx: ContextoRelevancia): Relevancia {
  if (c.exact_match) return 'PASS';

  const articuloCoincide = ctx.articulo !== null && c.num_articulo === ctx.articulo;
  if (ctx.articulo !== null && !articuloCoincide) return 'FAIL';

  if (ctx.instrumento !== null) {
    const identidad = identidadDocumentalCoincide(aFilaExacta({ ...c, materia: c.materia }), ctx.instrumento);
    if (!identidad) return 'FAIL';
    return ctx.articulo === null || articuloCoincide ? 'PASS' : 'FAIL';
  }

  const materiaCoincide = ctx.materia !== null && c.materia === ctx.materia;
  if (articuloCoincide && materiaCoincide) return 'PASS';
  if (materiaCoincide && ctx.articulo === null) return 'PASS';
  return 'UNKNOWN';
}
