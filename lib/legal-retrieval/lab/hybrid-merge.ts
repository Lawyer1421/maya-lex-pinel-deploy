import { hashFragmento } from '../primitives';
import type { LexicalHit } from './lexical-lab';
import type { SemanticFixtureHit } from './semantic-fixture';
import type { LabCandidate, LabRow, RetrievalChannel } from './types';

export function candidatoDesdeFila(fila: LabRow): LabCandidate {
  if (fila.fuente === null) {
    throw new Error('candidatoDesdeFila: fuente nula debe excluirse antes de construir candidatos');
  }
  return {
    id: fila.id,
    contenido: fila.contenido,
    num_articulo: fila.num_articulo,
    fuente: fila.fuente,
    fuente_tipo: fila.fuente_tipo,
    jurisdiccion: fila.jurisdiccion,
    es_norma_vigente: fila.es_norma_vigente,
    materia: fila.materia,
    hash: hashFragmento({ contenido: fila.contenido, num_articulo: fila.num_articulo, fuente: fila.fuente }),
    retrieval_channel: [],
    semantic_score: null,
    lexical_score: null,
    exact_match: false,
  };
}

function ordenarCanales(canales: RetrievalChannel[]): RetrievalChannel[] {
  const orden: RetrievalChannel[] = ['exact', 'lexical', 'semantic'];
  return orden.filter((c) => canales.includes(c));
}

/**
 * Une candidatos léxicos y semánticos por id. Cada candidato conserva qué
 * canales lo recuperaron y su puntuación por canal; nunca se pierde la
 * procedencia al fusionar.
 */
export function fusionarHibrido(
  lexicos: readonly LexicalHit[],
  semanticos: readonly SemanticFixtureHit[],
  filasPorId: ReadonlyMap<string, LabRow>,
): LabCandidate[] {
  const porId = new Map<string, LabCandidate>();

  const obtener = (id: string): LabCandidate | null => {
    const existente = porId.get(id);
    if (existente) return existente;
    const fila = filasPorId.get(id);
    if (!fila || fila.fuente === null) return null;
    const nuevo = candidatoDesdeFila(fila);
    porId.set(id, nuevo);
    return nuevo;
  };

  for (const h of lexicos) {
    const c = obtener(h.id);
    if (!c) continue;
    c.lexical_score = h.score;
    c.retrieval_channel = ordenarCanales([...c.retrieval_channel, 'lexical']);
  }
  for (const h of semanticos) {
    const c = obtener(h.id);
    if (!c) continue;
    c.semantic_score = h.score;
    c.retrieval_channel = ordenarCanales([...c.retrieval_channel, 'semantic']);
  }

  return [...porId.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
