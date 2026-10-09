import {
  LAB_RANKING_WEIGHTS,
  type LabCandidate,
  type RankedCandidate,
  type RankingComponents,
} from './types';

export interface EventoPenalizacion {
  tipo: 'PENALIZA_MISMA_FUENTE_Y_ARTICULO';
  conservado: string;
  afectado: string;
}

export interface ContextoRanking {
  materia: string | null;
}

function componentes(c: LabCandidate, contexto: ContextoRanking): RankingComponents {
  return {
    exact: c.exact_match ? 1 : 0,
    lexical: c.lexical_score ?? 0,
    semantic: c.semantic_score ?? 0,
    source_identity: c.fuente.trim().length > 0 ? 1 : 0,
    jurisdiction: c.jurisdiccion === 'HN' ? 1 : 0,
    materia: contexto.materia !== null && c.materia === contexto.materia ? 1 : 0,
    duplicate_penalty: 0,
  };
}

function compuesto(comp: RankingComponents): number {
  let total = 0;
  for (const clave of Object.keys(LAB_RANKING_WEIGHTS) as (keyof RankingComponents)[]) {
    total += LAB_RANKING_WEIGHTS[clave] * comp[clave];
  }
  return Math.round(total * 1e6) / 1e6;
}

function vigenciaInformativa(c: LabCandidate): RankedCandidate['vigencia_informativa'] {
  if (c.es_norma_vigente === true) return 'TRUE';
  if (c.es_norma_vigente === false) return 'FALSE';
  return 'UNKNOWN';
}

function compararRanking(a: RankedCandidate, b: RankedCandidate): number {
  if (b.composite !== a.composite) return b.composite - a.composite;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Puntúa candidatos con componentes explícitos. La vigencia se reporta sólo
 * como información; no entra en ningún componente puntuado. Una penalización
 * aplica únicamente a candidatos que comparten fuente y número de artículo
 * con un candidato de mayor puntuación (posible versión o duplicado no
 * demostrado), nunca por similitud de texto.
 */
export function puntuarCandidatos(
  candidatos: readonly LabCandidate[],
  contexto: ContextoRanking,
): { ranking: RankedCandidate[]; eventos: EventoPenalizacion[] } {
  const base: RankedCandidate[] = candidatos.map((c) => {
    const comp = componentes(c, contexto);
    return {
      ...c,
      ranking_components: comp,
      composite: compuesto(comp),
      vigencia_informativa: vigenciaInformativa(c),
    };
  });

  base.sort(compararRanking);

  const vistos = new Map<string, RankedCandidate>();
  const eventos: EventoPenalizacion[] = [];
  for (const c of base) {
    if (c.num_articulo === null) continue;
    const clave = `${c.fuente}\u0000${c.num_articulo}`;
    const conservado = vistos.get(clave);
    if (!conservado) {
      vistos.set(clave, c);
      continue;
    }
    c.ranking_components = { ...c.ranking_components, duplicate_penalty: 1 };
    c.composite = compuesto(c.ranking_components);
    eventos.push({ tipo: 'PENALIZA_MISMA_FUENTE_Y_ARTICULO', conservado: conservado.id, afectado: c.id });
  }

  base.sort(compararRanking);
  return { ranking: base, eventos };
}
