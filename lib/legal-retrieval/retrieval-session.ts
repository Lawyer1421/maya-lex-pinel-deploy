/**
 * lib/legal-retrieval/retrieval-session.ts
 * Pre-slice MCP v1 (docs/governance/PLAN-MCP-SLICE-1.md): sesión de retrieval
 * compartida entre /api/chat y el futuro MCP.
 *
 * Extracción 1:1 de app/api/chat/route.ts, sin cambio de comportamiento:
 *  - `recuperarEvidenciaCorpus`: búsqueda en la colección principal y, en RUTA_C
 *    civil, la segunda pasada procedimental filtrada por
 *    evidenciaProcedimentalPermitida.
 *  - `decidirAbstencion`: gate fail-closed CORPUS_EVIDENCE_NOT_FOUND y los
 *    mensajes distintos para CONFIGURATION_ERROR / RETRIEVAL_ERROR.
 *
 * No resuelve flags ni colecciones: el llamador decide la colección, la materia
 * y si corre la pasada procedimental, y pasa el rerank ya resuelto.
 */

import {
  buscarRAG,
  formatearContextoRAG,
  requiereEvidenciaCorpus,
  CORPUS_EVIDENCE_NOT_FOUND,
  MENSAJE_ABSTENCION_CORPUS,
  type FragmentoRAG,
  type RetrievalOutcome,
} from '@/lib/rag/search';
import {
  clasificarIntencionInstrumental,
  evidenciaProcedimentalPermitida,
} from '@/lib/legal-retrieval/instrument-gate';
import {
  MENSAJE_CONFIGURACION_NO_DISPONIBLE,
  MENSAJE_RETRIEVAL_ERROR,
} from '@/lib/legal-retrieval/retrieval-outcome';

/** Contexto recuperado para el prompt. `outcome` refleja SOLO la colección principal. */
export interface EvidenciaCorpus {
  texto: string;
  fragmentos: FragmentoRAG[];
  outcome?: RetrievalOutcome;
}

export interface ParametrosRecuperacion {
  pregunta: string;
  coleccionPrincipal: string;
  /** Filtro de materia dentro de la colección (modo penal). */
  materiaFiltro?: string;
  /** RUTA_C civil: segunda pasada en mayalex_procedimental. */
  pasadaProcedimental: boolean;
  rerank: boolean;
}

/**
 * Recupera la evidencia de la colección principal y, si corresponde, la pasada
 * procedimental. La pasada procedimental sólo añade fragmentos que sobreviven a
 * evidenciaProcedimentalPermitida (elegibles y verificables del instrumento;
 * en comparaciones con un único artículo pedido, además ese artículo). Nunca
 * sustituye el outcome de la colección principal.
 */
export async function recuperarEvidenciaCorpus(p: ParametrosRecuperacion): Promise<EvidenciaCorpus> {
  const ragResultado = await buscarRAG(p.pregunta, 5, p.coleccionPrincipal, p.materiaFiltro, { rerank: p.rerank });
  let contextoRAG = formatearContextoRAG(ragResultado);
  const fragmentos = [...ragResultado.fragmentos];

  if (p.pasadaProcedimental) {
    const ragProc = await buscarRAG(p.pregunta, 3, 'mayalex_procedimental', undefined, { rerank: p.rerank });
    const intencionPregunta = clasificarIntencionInstrumental(p.pregunta);
    const procPermitidos = evidenciaProcedimentalPermitida(
      ragResultado.fragmentos, ragProc.fragmentos, intencionPregunta,
    );
    if (procPermitidos.length > 0) {
      const contextoProc = formatearContextoRAG({
        ...ragProc,
        fragmentos: procPermitidos,
        articulos_encontrados: [...new Set(procPermitidos.map((f) => f.num_articulo).filter((a): a is string => a !== null))],
      });
      contextoRAG = contextoRAG ? `${contextoRAG}\n\n${contextoProc}` : contextoProc;
    }
    fragmentos.push(...procPermitidos);
  }
  return { texto: contextoRAG, fragmentos, outcome: ragResultado.outcome };
}

export interface DecisionAbstencion {
  /** La consulta exige evidencia del corpus y la colección principal no trajo ninguna. */
  evidenciaInsuficiente: boolean;
  /** CONFIGURATION_ERROR o RETRIEVAL_ERROR: el sistema no pudo consultar, no es «no existe». */
  esFalloDeSistema: boolean;
  mensajeAbstencion: string;
  codigoAbstencion: string;
}

/**
 * Gate fail-closed, decidido antes de invocar al LLM. La insuficiencia se mide
 * con `outcome.evidenceCount` (sólo colección principal): la pasada
 * procedimental no puede crear evidencia por sí sola
 * (PROCEDURAL_PASS_CAN_MASK_PRIMARY_INSUFFICIENCY). Si falta `outcome` se usa
 * `fragmentos.length === 0` como respaldo explícito.
 */
export function decidirAbstencion(
  pregunta: string,
  rutaCorpusObligatoria: boolean,
  evidencia: Pick<EvidenciaCorpus, 'fragmentos' | 'outcome'>,
): DecisionAbstencion {
  const evidenciaPrimariaInsuficiente = evidencia.outcome
    ? (evidencia.outcome.evidenceCount ?? 0) === 0
    : evidencia.fragmentos.length === 0;
  const evidenciaInsuficiente =
    requiereEvidenciaCorpus(pregunta, rutaCorpusObligatoria) && evidenciaPrimariaInsuficiente;

  const outcomeState = evidencia.outcome?.state;
  const esFalloDeSistema = outcomeState === 'CONFIGURATION_ERROR' || outcomeState === 'RETRIEVAL_ERROR';
  const mensajeAbstencion = outcomeState === 'CONFIGURATION_ERROR'
    ? MENSAJE_CONFIGURACION_NO_DISPONIBLE
    : outcomeState === 'RETRIEVAL_ERROR'
      ? MENSAJE_RETRIEVAL_ERROR
      : MENSAJE_ABSTENCION_CORPUS;
  const codigoAbstencion = esFalloDeSistema ? (outcomeState as string) : CORPUS_EVIDENCE_NOT_FOUND;

  return { evidenciaInsuficiente, esFalloDeSistema, mensajeAbstencion, codigoAbstencion };
}
