import { contieneArtefactoAnonimizacion } from '../primitives';
import { esFuenteDocumentalExcluida, esRegistroNoVigenteExcluido } from '../semantic-retriever';
import type { LabRow, RetrievalChannel } from './types';

export type MotivoExclusion =
  | 'REVISION_PENDIENTE'
  | 'ANONIMIZACION'
  | 'FUENTE_NULL'
  | 'CAPA_DOC_STAR'
  | 'D6B_NO_VIGENTE_HN';

/**
 * El canal exacto conserva la semántica de producción: un artículo derogado
 * pedido explícitamente por número se devuelve con etiqueta NO VIGENTE
 * (search.ts, GAP 2). D6b se aplica sólo a canales no exactos.
 */
export function motivoExclusionDura(fila: LabRow, canal: RetrievalChannel): MotivoExclusion | null {
  if (fila.revision_pendiente === true) return 'REVISION_PENDIENTE';
  if (contieneArtefactoAnonimizacion(fila.contenido)) return 'ANONIMIZACION';
  if (fila.fuente === null) return 'FUENTE_NULL';
  if (esFuenteDocumentalExcluida(fila.fuente)) return 'CAPA_DOC_STAR';
  if (canal !== 'exact' && esRegistroNoVigenteExcluido(fila)) return 'D6B_NO_VIGENTE_HN';
  return null;
}
