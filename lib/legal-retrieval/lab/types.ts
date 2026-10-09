export type RetrievalChannel = 'exact' | 'lexical' | 'semantic';

export const LAB_RANKING_WEIGHTS = {
  exact: 10,
  lexical: 1,
  semantic: 1,
  source_identity: 0.1,
  jurisdiction: 0.1,
  materia: 0.2,
  duplicate_penalty: -0.5,
} as const;

export type RankingComponentKey = keyof typeof LAB_RANKING_WEIGHTS;

export interface LabRow {
  id: string;
  contenido: string;
  num_articulo: string | null;
  fuente: string | null;
  fuente_tipo: string | null;
  jurisdiccion: string | null;
  es_norma_vigente: boolean | null;
  materia: string | null;
  revision_pendiente?: boolean;
}

export type CategoriaBenchmark =
  | 'articulo_exacto'
  | 'frase_conceptual'
  | 'titulo_fuente'
  | 'numero_decreto'
  | 'sinonimos'
  | 'ambigua'
  | 'duplicado_misma_fuente'
  | 'espejo_fuente_distinta'
  | 'capa_doc_star'
  | 'fuente_nula'
  | 'no_vigente_hn'
  | 'jurisprudencia_junto_a_norma'
  | 'sin_evidencia'
  | 'vocabulario_similar_no_relacionado'
  | 'excepcion_remision'
  | 'estres_top_k_rpc';

export interface LabBenchmarkQuery {
  id: string;
  categoria: CategoriaBenchmark;
  texto: string;
  relevantes: string[];
  distractores: string[];
  articulo_esperado?: string;
  abstencion_esperada: boolean;
  semantic_hits: { id: string; score: number }[];
  validacion: 'PENDIENTE_VALIDACION_JURIDICA';
}

export interface LabCandidate {
  id: string;
  contenido: string;
  num_articulo: string | null;
  fuente: string;
  fuente_tipo: string | null;
  jurisdiccion: string | null;
  es_norma_vigente: boolean | null;
  materia: string | null;
  hash: string;
  retrieval_channel: RetrievalChannel[];
  semantic_score: number | null;
  lexical_score: number | null;
  exact_match: boolean;
}

export type RankingComponents = Record<RankingComponentKey, number>;

export interface RankedCandidate extends LabCandidate {
  ranking_components: RankingComponents;
  composite: number;
  vigencia_informativa: 'TRUE' | 'FALSE' | 'UNKNOWN';
}
