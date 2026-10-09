export type RetrievalChannel = 'exact' | 'lexical' | 'semantic';

export type RolRecuperacion = 'PRIMARY' | 'SECONDARY' | 'CONTEXT' | 'EXCLUDED';

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
  | 'estres_top_k_rpc'
  | 'clo_e2_contexto'
  | 'clo_e5_normal_excluido'
  | 'clo_e5_historico_explicito'
  | 'clo_e6_secundario'
  | 'clo_primary_con_e6'
  | 'adversarial_semantico_negativo';

export interface LabBenchmarkQuery {
  id: string;
  categoria: CategoriaBenchmark;
  texto: string;
  relevantes: string[];
  distractores: string[];
  articulo_esperado?: string;
  abstencion_esperada: boolean;
  soporte_validado_ids?: string[];
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

export interface ClaveOrdenLegal {
  rol_gate: number;
  relevancia: number;
  identidad_exacta: number;
  vigencia: number;
  relacion_verificada: number;
  jerarquia_normativa: number;
  jurisdiccion_materia: number;
  penalizacion_espejo: number;
}

export interface ComponentesRecuperacion {
  lexical: number;
  semantic: number;
  citation_completeness: number;
}

export interface RankedCandidate extends LabCandidate {
  rol_recuperacion: RolRecuperacion;
  relevancia_clo: 'PASS' | 'UNKNOWN' | 'FAIL';
  capa_clo: 'E2' | 'E5' | 'E6' | null;
  advertencia_clo: string | null;
  legal_order_key: ClaveOrdenLegal;
  retrieval_components: ComponentesRecuperacion;
  retrieval_order_score: number;
  vigencia_informativa: 'TRUE' | 'FALSE' | 'UNKNOWN';
}
