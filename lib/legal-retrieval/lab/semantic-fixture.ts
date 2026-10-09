import type { LabBenchmarkQuery, LabRow } from './types';

/** Espejo de `LIMIT least(limite, 20)` en buscar_biblioteca_v2 (migración 20260925055249). */
export const SEMANTIC_CANDIDATE_CAP = 20;

export interface SemanticFixtureHit {
  id: string;
  score: number;
}

function compararIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Búsqueda semántica sobre puntuaciones precalculadas en la fixture (sin
 * llamada a embeddings). Reproduce el orden de la RPC: el filtro de
 * revision_pendiente ocurre en SQL antes del tope; las demás exclusiones
 * ocurren después, en la aplicación. Por eso doc_* puede consumir el tope.
 */
export function buscarSemanticoFixture(
  query: LabBenchmarkQuery,
  filas: readonly LabRow[],
  tope: number = SEMANTIC_CANDIDATE_CAP,
): SemanticFixtureHit[] {
  const porId = new Map(filas.map((f) => [f.id, f] as const));
  return query.semantic_hits
    .filter((h) => porId.has(h.id) && porId.get(h.id)?.revision_pendiente !== true)
    .sort((a, b) => b.score - a.score || compararIds(a.id, b.id))
    .slice(0, tope)
    .map((h) => ({ id: h.id, score: h.score }));
}
