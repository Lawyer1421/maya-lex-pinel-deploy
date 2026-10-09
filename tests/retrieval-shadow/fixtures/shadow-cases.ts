import type { CorridaShadow } from '@/lib/legal-retrieval/lab/shadow';
import type { LabBenchmarkQuery, LabRow } from '@/lib/legal-retrieval/lab/types';

/**
 * Casos adversariales sintéticos (sombra V4). Contenido ficticio, sin valor
 * jurídico. Cada caso usa su propio mini-corpus para aislar el efecto.
 */

const CPP = 'Código Procesal Penal (FIXTURE sintético)';
const CPP_B = 'Código Procesal Penal (FIXTURE B)';
const CC = 'Código Civil (FIXTURE sintético)';
const NOT = 'Código del Notariado (FIXTURE sintético)';
const FAM = 'Código de Familia (FIXTURE sintético)';
const CPC_TEXTO = 'CPC_TEXTO_BASE_D211-2006 (FIXTURE sintético)';
const ADOP = 'Ley Especial de Adopciones de Honduras (Decreto 102-2018) (FIXTURE sintético)';
const INSTR_PENAL = 'Instrumento Penal (FIXTURE)';
const INSTR_CIVIL = 'Instrumento Civil (FIXTURE)';
const SENT_ES = 'Sentencia Penal (FIXTURE ES)';

export const FILAS_SHADOW: Record<string, LabRow> = {
  cpp10a: { id: 'sh-cpp10a', contenido: 'ARTICULO 10.- Plazo sintético de prueba penal A.', num_articulo: '10', fuente: CPP, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '01_PENAL' },
  cpp10b: { id: 'sh-cpp10b', contenido: 'ARTICULO 10.- Plazo sintético de prueba penal B.', num_articulo: '10', fuente: CPP_B, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '01_PENAL' },
  cpp11: { id: 'sh-cpp11', contenido: 'ARTICULO 11.- Otro artículo penal sintético.', num_articulo: '11', fuente: CPP, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '01_PENAL' },
  instrPenal: { id: 'sh-instr-penal', contenido: 'Instrumento sintético penal de prueba sobre plazo.', num_articulo: null, fuente: INSTR_PENAL, fuente_tipo: 'instrumento', jurisdiccion: 'HN', es_norma_vigente: true, materia: '01_PENAL' },
  civ40: { id: 'sh-civ40', contenido: 'ARTICULO 40.- Caducidad sintética civil de prueba.', num_articulo: '40', fuente: CC, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '02_CIVIL' },
  adop5: { id: 'sh-adop5', contenido: 'ARTICULO 5.- Disposición sintética de adopción civil de prueba.', num_articulo: '5', fuente: ADOP, fuente_tipo: 'instrumento', jurisdiccion: 'HN', es_norma_vigente: true, materia: '02_CIVIL' },
  instrCivil: { id: 'sh-instr-civil', contenido: 'Instrumento sintético civil de caducidad de prueba.', num_articulo: null, fuente: INSTR_CIVIL, fuente_tipo: 'instrumento', jurisdiccion: 'HN', es_norma_vigente: true, materia: '02_CIVIL' },
  not100: { id: 'sh-not100', contenido: 'ARTICULO 100.- Requisito notarial sintético de prueba.', num_articulo: '100', fuente: NOT, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '03_NOTARIAL' },
  not72: { id: 'sh-not72', contenido: 'ARTICULO 72.- Requisito notarial sintético de prueba.', num_articulo: '72', fuente: NOT, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: null, materia: '03_NOTARIAL' },
  cpt10: { id: 'sh-cpt10', contenido: 'ARTICULO 10.- Texto base sintético histórico civil.', num_articulo: '10', fuente: CPC_TEXTO, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '02_CIVIL' },
  fam9f: { id: 'sh-fam9f', contenido: 'ARTICULO 9.- Derogado sintético de prueba.', num_articulo: '9', fuente: FAM, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: false, materia: '04_FAMILIA' },
  sentPenal: { id: 'sh-sent-penal', contenido: 'Sentencia sintética penal de prueba.', num_articulo: null, fuente: SENT_ES, fuente_tipo: 'sentencia', jurisdiccion: 'ES', es_norma_vigente: false, materia: '01_PENAL' },
};

function consulta(id: string, texto: string, semantic: { id: string; score: number }[], extra: Partial<LabBenchmarkQuery> = {}): LabBenchmarkQuery {
  return {
    id,
    categoria: 'adversarial_semantico_negativo',
    texto,
    relevantes: [],
    distractores: [],
    abstencion_esperada: false,
    semantic_hits: semantic,
    validacion: 'PENDIENTE_VALIDACION_JURIDICA',
    ...extra,
  };
}

const f = FILAS_SHADOW;

export const CASOS_SHADOW: CorridaShadow[] = [
  {
    id: 'C01_secundario_alto_supera_primario_pass',
    query: consulta('C01', 'caducidad sintética civil de prueba', [{ id: 'sh-adop5', score: 0.95 }, { id: 'sh-civ40', score: 0.2 }]),
    corpus: [f.civ40, f.adop5],
    k: 1,
  },
  {
    id: 'C02_contexto_alto_supera_primario_pass',
    query: consulta('C02', 'plazo sintético penal de prueba', [{ id: 'sh-instr-penal', score: 0.99 }, { id: 'sh-cpp10a', score: 0.1 }]),
    corpus: [f.cpp10a, f.instrPenal],
    k: 1,
  },
  {
    id: 'C03_relevancia_fail_puntuacion_maxima',
    query: consulta('C03', 'Código Procesal Penal sintético plazo de prueba', [{ id: 'sh-instr-penal', score: 0.99 }, { id: 'sh-cpp10a', score: 0.1 }]),
    corpus: [f.cpp10a, f.instrPenal],
    k: 2,
  },
  {
    id: 'C04_solo_secundario',
    query: consulta('C04', 'adopción civil de prueba', [{ id: 'sh-adop5', score: 0.9 }]),
    corpus: [f.adop5],
    k: 3,
  },
  {
    id: 'C05_solo_contexto',
    query: consulta('C05', 'plazo sintético penal de prueba', [{ id: 'sh-instr-penal', score: 0.9 }]),
    corpus: [f.instrPenal],
    k: 3,
  },
  {
    id: 'C06_solo_fail',
    query: consulta('C06', 'Código Procesal Penal sintético de prueba plazo', [{ id: 'sh-civ40', score: 0.9 }, { id: 'sh-instr-penal', score: 0.8 }]),
    corpus: [f.civ40, f.instrPenal],
    k: 3,
  },
  {
    id: 'C07_primario_pass_bajo_top_k',
    query: consulta('C07', 'caducidad sintética civil de prueba', [{ id: 'sh-instr-civil', score: 0.99 }, { id: 'sh-adop5', score: 0.9 }, { id: 'sh-civ40', score: 0.1 }]),
    corpus: [f.civ40, f.adop5, f.instrCivil],
    k: 2,
  },
  {
    id: 'C08_varios_primario_pass_compiten',
    query: consulta('C08', 'Código Procesal Penal sintético plazo de prueba', [{ id: 'sh-cpp10b', score: 0.9 }, { id: 'sh-cpp10a', score: 0.5 }]),
    corpus: [f.cpp10a, f.cpp10b],
    k: 1,
  },
  {
    id: 'C09_e2_contexto_compite_con_primario',
    query: consulta('C09', 'requisito notarial sintético de prueba', [{ id: 'sh-not72', score: 0.99 }, { id: 'sh-not100', score: 0.1 }]),
    corpus: [f.not100, f.not72],
    k: 2,
  },
  {
    id: 'C10_e6_secundario_compite_con_primario',
    query: consulta('C10', 'caducidad sintética civil de prueba', [{ id: 'sh-adop5', score: 0.99 }, { id: 'sh-civ40', score: 0.1 }]),
    corpus: [f.civ40, f.adop5],
    k: 2,
  },
  {
    id: 'C11a_e5_normal_excluida',
    query: consulta('C11a', 'texto base sintético de prueba', [{ id: 'sh-cpt10', score: 0.95 }]),
    corpus: [f.cpt10, f.cpp10a],
    k: 3,
  },
  {
    id: 'C11b_e5_historica_explicita',
    query: consulta('C11b', 'texto original histórico del CPC_TEXTO_BASE_D211-2006 sintético', [{ id: 'sh-cpt10', score: 0.9 }]),
    corpus: [f.cpt10, f.cpp10a],
    k: 3,
  },
  {
    id: 'C12_exacto_falso_localizado',
    query: consulta('C12', 'artículo 9 del Código de Familia sintético', []),
    corpus: [f.fam9f],
    k: 2,
  },
  {
    id: 'C13_sin_evidencia_tras_seleccion',
    query: consulta('C13', 'texto base sintético de prueba', [{ id: 'sh-cpt10', score: 0.95 }]),
    corpus: [f.cpt10],
    k: 3,
  },
];
