import {
  detectarArticuloExacto,
  resolverArticuloExacto,
  type FilaExactaDB,
  type ResultadoExacto,
} from '../exact-resolver';
import type { FragmentoRAG } from '../types';
import type { LabRow } from './types';

export type EstadoExactoLab =
  | 'EXACT_SUCCESS'
  | 'NO_ARTICLE'
  | 'AMBIGUOUS'
  | 'ABSTAIN_INSTRUMENT_OR_MATERIA'
  | 'MISS_SEMANTIC_ALLOWED';

export interface ResultadoExactoLab {
  estado: EstadoExactoLab;
  fragmento: FragmentoRAG | null;
}

export function aFilaExacta(fila: LabRow): FilaExactaDB {
  return {
    id: fila.id,
    contenido: fila.contenido,
    num_articulo: fila.num_articulo,
    fuente: fila.fuente ?? '',
    fuente_tipo: fila.fuente_tipo,
    jurisdiccion: fila.jurisdiccion,
    es_norma_vigente: fila.es_norma_vigente,
    materia: fila.materia ?? '',
    metadata: {},
  };
}

/**
 * Emula consultarPorVigencia (lib/rag/search.ts) sobre filas en memoria y
 * reutiliza el resolvedor de producción. La precedencia es la misma: vigentes
 * primero; sólo si no hay candidato ni ambigüedad se consultan no vigentes.
 */
export function resolverExactoLab(textoConsulta: string, filas: readonly LabRow[]): ResultadoExactoLab {
  const deteccion = detectarArticuloExacto(textoConsulta);
  if (!deteccion) return { estado: 'NO_ARTICLE', fragmento: null };

  const candidatasPorVigencia = (vigente: boolean): FilaExactaDB[] =>
    filas
      .filter(
        (f) =>
          f.num_articulo === deteccion.numero &&
          f.fuente_tipo === 'codigo' &&
          f.revision_pendiente !== true &&
          f.es_norma_vigente === vigente &&
          (deteccion.materiaDetectada === null || f.materia === deteccion.materiaDetectada),
      )
      .map(aFilaExacta);

  let resultado: ResultadoExacto = resolverArticuloExacto(
    candidatasPorVigencia(true),
    deteccion.numero,
    deteccion.instrumento,
  );
  if (resultado.fragmentos.length === 0 && !resultado.ambiguo) {
    resultado = resolverArticuloExacto(
      candidatasPorVigencia(false),
      deteccion.numero,
      deteccion.instrumento,
    );
  }

  if (resultado.fragmentos.length > 0) {
    return { estado: 'EXACT_SUCCESS', fragmento: resultado.fragmentos[0] };
  }
  if (resultado.ambiguo) return { estado: 'AMBIGUOUS', fragmento: null };
  if (deteccion.materiaDetectada || deteccion.instrumento) {
    return { estado: 'ABSTAIN_INSTRUMENT_OR_MATERIA', fragmento: null };
  }
  return { estado: 'MISS_SEMANTIC_ALLOWED', fragmento: null };
}
