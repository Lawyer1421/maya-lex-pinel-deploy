import { contieneArtefactoAnonimizacion } from '../primitives';
import { esFuenteDocumentalExcluida, esRegistroNoVigenteExcluido } from '../semantic-retriever';
import { excepcionE2AD6b } from './clo-policy';
import type { LabRow, RetrievalChannel } from './types';

export type MotivoExclusion =
  | 'REVISION_PENDIENTE'
  | 'ANONIMIZACION'
  | 'FUENTE_NULL'
  | 'CAPA_DOC_STAR'
  | 'D6B_NO_VIGENTE_HN'
  | 'VIGENCIA_FALSE_NORMATIVA';

const TIPOS_NORMATIVOS = new Set(['codigo', 'instrumento']);

/**
 * Canal exacto: conserva la semántica de producción (artículo derogado pedido
 * explícitamente por número, con etiqueta). Canales léxico y semántico: FALSE
 * normativo queda excluido, salvo la excepción E2 cerrada por identidad.
 */
export function motivoExclusionDura(fila: LabRow, canal: RetrievalChannel): MotivoExclusion | null {
  if (fila.revision_pendiente === true) return 'REVISION_PENDIENTE';
  if (contieneArtefactoAnonimizacion(fila.contenido)) return 'ANONIMIZACION';
  if (fila.fuente === null) return 'FUENTE_NULL';
  if (esFuenteDocumentalExcluida(fila.fuente)) return 'CAPA_DOC_STAR';
  if (canal === 'exact') return null;
  if (excepcionE2AD6b(fila)) return null;
  if (esRegistroNoVigenteExcluido(fila)) return 'D6B_NO_VIGENTE_HN';
  if (fila.es_norma_vigente === false && fila.fuente_tipo !== null && TIPOS_NORMATIVOS.has(fila.fuente_tipo)) {
    return 'VIGENCIA_FALSE_NORMATIVA';
  }
  return null;
}
