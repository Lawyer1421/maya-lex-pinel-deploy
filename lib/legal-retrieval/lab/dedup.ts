import type { LabCandidate, RetrievalChannel } from './types';

/**
 * Sólo se colapsan duplicados cuyos campos confiables son idénticos (hash
 * sobre contenido, num_articulo y fuente). Espejos con fuente distinta NO se
 * colapsan: no hay identidad canónica demostrable (CA-03, E7 registro CLO).
 */
export const DEDUP_FALSE_MERGE_POLICY = 'FAIL_SAFE' as const;

export interface EventoDedup {
  tipo: 'COLAPSO_DUPLICADO_EXACTO';
  conservado: string;
  afectado: string;
}

function unirCanales(a: RetrievalChannel[], b: RetrievalChannel[]): RetrievalChannel[] {
  const orden: RetrievalChannel[] = ['exact', 'lexical', 'semantic'];
  return orden.filter((c) => a.includes(c) || b.includes(c));
}

function maximoONulo(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.max(a, b);
}

export function colapsarDuplicadosExactos(candidatos: readonly LabCandidate[]): {
  candidatos: LabCandidate[];
  eventos: EventoDedup[];
} {
  const orden = [...candidatos].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const porHash = new Map<string, LabCandidate>();
  const eventos: EventoDedup[] = [];

  for (const c of orden) {
    const previo = porHash.get(c.hash);
    if (!previo) {
      porHash.set(c.hash, { ...c });
      continue;
    }
    previo.retrieval_channel = unirCanales(previo.retrieval_channel, c.retrieval_channel);
    previo.lexical_score = maximoONulo(previo.lexical_score, c.lexical_score);
    previo.semantic_score = maximoONulo(previo.semantic_score, c.semantic_score);
    previo.exact_match = previo.exact_match || c.exact_match;
    eventos.push({ tipo: 'COLAPSO_DUPLICADO_EXACTO', conservado: previo.id, afectado: c.id });
  }

  return { candidatos: [...porHash.values()], eventos };
}
