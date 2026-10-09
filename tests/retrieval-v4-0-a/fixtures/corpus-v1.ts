import type { LabBenchmarkQuery, LabRow } from '@/lib/legal-retrieval/lab/types';

/**
 * Corpus sintético versionado (V4.0-A). Contenido ficticio sin valor jurídico:
 * no reproduce texto legal real ni expedientes. Las etiquetas de fuente llevan
 * el sufijo FIXTURE para que nunca se confundan con fuentes reales.
 */

const CPP = 'Código Procesal Penal (FIXTURE sintético)';
const CC = 'Código Civil (FIXTURE sintético)';
const CPC_NORMAL = 'Código Procesal Civil (FIXTURE sintético)';
const CPC_TEXTO_BASE = 'CPC_TEXTO_BASE_D211-2006 (FIXTURE sintético)';
const NOTARIADO = 'Código del Notariado (FIXTURE sintético)';
const ADOPCIONES_102 = 'Ley Especial de Adopciones de Honduras (Decreto 102-2018) (FIXTURE sintético)';
const ESPEJO_A = 'Espejo Procesal (FIXTURE A)';
const ESPEJO_B = 'Espejo Procesal (FIXTURE B)';

const docBulk: LabRow[] = Array.from({ length: 20 }, (_, i) => {
  const n = String(i + 1).padStart(2, '0');
  return {
    id: `lab-docbulk-${n}`,
    contenido: `Documento masivo sintético ${n} sobre plazo de prueba de ejemplo, no normativo.`,
    num_articulo: null,
    fuente: `doc_bulk_${n}`,
    fuente_tipo: 'instrumento',
    jurisdiccion: 'HN',
    es_norma_vigente: true,
    materia: '01_PENAL',
  };
});

export const LAB_CORPUS_V1: LabRow[] = [
  { id: 'lab-cpp-173', contenido: 'ARTICULO 173.- Plazo de prueba de ejemplo sintético para pruebas de recuperación.', num_articulo: '173', fuente: CPP, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '01_PENAL' },
  { id: 'lab-cpp-174', contenido: 'ARTICULO 174.- Medida cautelar de ejemplo sintética, sin valor jurídico.', num_articulo: '174', fuente: CPP, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '01_PENAL' },
  { id: 'lab-cpp-180', contenido: 'ARTICULO 180.- Salvo lo dispuesto en el artículo 173, el plazo de notificación de ejemplo es de tres días sintéticos.', num_articulo: '180', fuente: CPP, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '01_PENAL' },
  { id: 'lab-cpp-175-a', contenido: 'ARTICULO 175.- Texto de duplicado sintético idéntico.', num_articulo: '175', fuente: CPP, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '01_PENAL' },
  { id: 'lab-cpp-175-b', contenido: 'ARTICULO 175.- Texto de duplicado sintético idéntico.', num_articulo: '175', fuente: CPP, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '01_PENAL' },
  { id: 'lab-cpp-176-anon', contenido: 'ARTICULO 176.- [Cliente_Anónimo] plazo de prueba sintético.', num_articulo: '176', fuente: CPP, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '01_PENAL' },
  { id: 'lab-cpp-177-rev', contenido: 'ARTICULO 177.- Texto sintético pendiente de revisión humana.', num_articulo: '177', fuente: CPP, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '01_PENAL', revision_pendiente: true },
  { id: 'lab-cc-173', contenido: 'ARTICULO 173.- Regla civil sintética sobre caducidad de ejemplo.', num_articulo: '173', fuente: CC, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '02_CIVIL' },
  { id: 'lab-amb-190-penal', contenido: 'ARTICULO 190.- Texto penal sintético de ambigüedad.', num_articulo: '190', fuente: CPP, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '01_PENAL' },
  { id: 'lab-amb-190-civil', contenido: 'ARTICULO 190.- Texto civil sintético de ambigüedad.', num_articulo: '190', fuente: CC, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '02_CIVIL' },
  { id: 'lab-espejo-210-a', contenido: 'ARTICULO 210.- Texto espejo sintético idéntico.', num_articulo: '210', fuente: ESPEJO_A, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '01_PENAL' },
  { id: 'lab-espejo-210-b', contenido: 'ARTICULO 210.- Texto espejo sintético idéntico.', num_articulo: '210', fuente: ESPEJO_B, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '01_PENAL' },
  { id: 'lab-doc-9f2a', contenido: 'Documento sintético sobre plazo de prueba de ejemplo, no normativo.', num_articulo: null, fuente: 'doc_9f2a', fuente_tipo: 'instrumento', jurisdiccion: 'HN', es_norma_vigente: true, materia: '01_PENAL' },
  { id: 'lab-null-1', contenido: 'Fragmento legacy sintético sin fuente sobre plazo de prueba.', num_articulo: null, fuente: null, fuente_tipo: null, jurisdiccion: null, es_norma_vigente: false, materia: '01_PENAL' },
  { id: 'lab-derog-120', contenido: 'ARTICULO 120.- Derogado de ejemplo sintético.', num_articulo: '120', fuente: 'Código de Familia (FIXTURE sintético)', fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: false, materia: '04_FAMILIA' },
  { id: 'lab-sent-1', contenido: 'Sentencia sintética sobre plazo de prueba de ejemplo.', num_articulo: null, fuente: 'Sentencia de Prueba (FIXTURE ES)', fuente_tipo: 'sentencia', jurisdiccion: 'ES', es_norma_vigente: false, materia: '01_PENAL' },
  { id: 'lab-merc-300', contenido: 'ARTICULO 300.- Plazo de entrega de mercancías sintético.', num_articulo: '300', fuente: 'Código de Comercio (FIXTURE sintético)', fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '03_MERCANTIL' },
  { id: 'lab-dec-99', contenido: 'Decreto 99-2000 sintético: disposición de ejemplo sobre plazo de prueba.', num_articulo: null, fuente: 'Decreto 99-2000 (FIXTURE sintético)', fuente_tipo: 'instrumento', jurisdiccion: 'HN', es_norma_vigente: true, materia: null },
  { id: 'lab-cpc-10', contenido: 'ARTICULO 10.- Texto procesal civil sintético de ejemplo, sin valor jurídico.', num_articulo: '10', fuente: CPC_NORMAL, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '02_CIVIL' },
  { id: 'lab-cpt-10', contenido: 'ARTICULO 10.- Texto base sintético histórico, no es texto legal.', num_articulo: '10', fuente: CPC_TEXTO_BASE, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '02_CIVIL' },
  { id: 'lab-cpt-11', contenido: 'ARTICULO 11.- Texto base sintético histórico adicional, no es texto legal.', num_articulo: '11', fuente: CPC_TEXTO_BASE, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '02_CIVIL' },
  { id: 'lab-not-72', contenido: 'ARTICULO 72.- Texto notarial sintético de prueba, no es texto legal.', num_articulo: '72', fuente: NOTARIADO, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: null, materia: '03_NOTARIAL' },
  { id: 'lab-not-73', contenido: 'ARTICULO 73.- Texto notarial sintético de prueba, no es texto legal.', num_articulo: '73', fuente: NOTARIADO, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: null, materia: '03_NOTARIAL' },
  { id: 'lab-not-84', contenido: 'ARTICULO 84.- Texto notarial sintético de prueba, no es texto legal.', num_articulo: '84', fuente: NOTARIADO, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: null, materia: '03_NOTARIAL' },
  { id: 'lab-not-87', contenido: 'ARTICULO 87.- Texto notarial sintético de prueba, no es texto legal.', num_articulo: '87', fuente: NOTARIADO, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: null, materia: '03_NOTARIAL' },
  { id: 'lab-not-93', contenido: 'ARTICULO 93.- Texto notarial sintético de prueba, no es texto legal.', num_articulo: '93', fuente: NOTARIADO, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: null, materia: '03_NOTARIAL' },
  { id: 'lab-not-100', contenido: 'ARTICULO 100.- Texto notarial sintético de prueba, no es texto legal.', num_articulo: '100', fuente: NOTARIADO, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '03_NOTARIAL' },
  { id: 'lab-102-5', contenido: 'ARTICULO 5.- Disposición sintética de adopción, no es texto legal.', num_articulo: '5', fuente: ADOPCIONES_102, fuente_tipo: 'instrumento', jurisdiccion: 'HN', es_norma_vigente: true, materia: null },
  ...docBulk,
];

export const LAB_QUERIES_V1: LabBenchmarkQuery[] = [
  { id: 'Q01', categoria: 'articulo_exacto', texto: 'artículo 173 del Código Procesal Penal', relevantes: ['lab-cpp-173'], distractores: [], articulo_esperado: '173', abstencion_esperada: false, semantic_hits: [{ id: 'lab-cc-173', score: 0.4 }], validacion: 'PENDIENTE_VALIDACION_JURIDICA' },
  { id: 'Q02', categoria: 'articulo_exacto', texto: 'artículo 173 del Código Penal', relevantes: [], distractores: [], abstencion_esperada: true, semantic_hits: [], validacion: 'PENDIENTE_VALIDACION_JURIDICA' },
  { id: 'Q03', categoria: 'frase_conceptual', texto: 'medida cautelar de ejemplo', relevantes: ['lab-cpp-174'], distractores: [], abstencion_esperada: false, semantic_hits: [{ id: 'lab-cpp-174', score: 0.7 }], validacion: 'PENDIENTE_VALIDACION_JURIDICA' },
  { id: 'Q04', categoria: 'titulo_fuente', texto: 'Código Civil sintético caducidad', relevantes: ['lab-cc-173'], distractores: [], abstencion_esperada: false, semantic_hits: [{ id: 'lab-cc-173', score: 0.5 }], validacion: 'PENDIENTE_VALIDACION_JURIDICA' },
  { id: 'Q05', categoria: 'numero_decreto', texto: 'decreto 99-2000', relevantes: ['lab-dec-99'], distractores: [], abstencion_esperada: false, semantic_hits: [], validacion: 'PENDIENTE_VALIDACION_JURIDICA' },
  { id: 'Q06', categoria: 'sinonimos', texto: 'lapso probatorio', relevantes: ['lab-cpp-173'], distractores: [], abstencion_esperada: false, semantic_hits: [{ id: 'lab-cpp-173', score: 0.82 }, { id: 'lab-cc-173', score: 0.3 }], validacion: 'PENDIENTE_VALIDACION_JURIDICA' },
  { id: 'Q07', categoria: 'ambigua', texto: 'artículo 190 sin indicar código', relevantes: [], distractores: [], abstencion_esperada: true, semantic_hits: [{ id: 'lab-amb-190-penal', score: 0.6 }, { id: 'lab-amb-190-civil', score: 0.6 }], validacion: 'PENDIENTE_VALIDACION_JURIDICA' },
  { id: 'Q08', categoria: 'duplicado_misma_fuente', texto: 'texto de duplicado sintético idéntico', relevantes: ['lab-cpp-175-a'], distractores: [], abstencion_esperada: false, semantic_hits: [{ id: 'lab-cpp-175-a', score: 0.8 }, { id: 'lab-cpp-175-b', score: 0.79 }], validacion: 'PENDIENTE_VALIDACION_JURIDICA' },
  { id: 'Q09', categoria: 'espejo_fuente_distinta', texto: 'texto espejo sintético idéntico', relevantes: ['lab-espejo-210-a', 'lab-espejo-210-b'], distractores: [], abstencion_esperada: false, semantic_hits: [{ id: 'lab-espejo-210-a', score: 0.8 }, { id: 'lab-espejo-210-b', score: 0.8 }], validacion: 'PENDIENTE_VALIDACION_JURIDICA' },
  { id: 'Q10', categoria: 'capa_doc_star', texto: 'plazo de prueba de ejemplo', relevantes: ['lab-cpp-173'], distractores: ['lab-doc-9f2a'], abstencion_esperada: false, semantic_hits: [{ id: 'lab-doc-9f2a', score: 0.95 }, { id: 'lab-cpp-173', score: 0.6 }], validacion: 'PENDIENTE_VALIDACION_JURIDICA' },
  { id: 'Q11', categoria: 'fuente_nula', texto: 'fragmento legacy sintético sin fuente', relevantes: [], distractores: [], abstencion_esperada: true, semantic_hits: [{ id: 'lab-null-1', score: 0.9 }], validacion: 'PENDIENTE_VALIDACION_JURIDICA' },
  { id: 'Q12', categoria: 'no_vigente_hn', texto: 'derogado de ejemplo código de familia', relevantes: [], distractores: [], abstencion_esperada: true, semantic_hits: [{ id: 'lab-derog-120', score: 0.9 }], validacion: 'PENDIENTE_VALIDACION_JURIDICA' },
  { id: 'Q13', categoria: 'jurisprudencia_junto_a_norma', texto: 'plazo de prueba sentencia', relevantes: ['lab-sent-1', 'lab-cpp-173'], distractores: [], abstencion_esperada: false, semantic_hits: [{ id: 'lab-sent-1', score: 0.7 }, { id: 'lab-cpp-173', score: 0.8 }], validacion: 'PENDIENTE_VALIDACION_JURIDICA' },
  { id: 'Q14', categoria: 'sin_evidencia', texto: 'zzz consulta sin correspondencia alguna', relevantes: [], distractores: [], abstencion_esperada: true, semantic_hits: [], validacion: 'PENDIENTE_VALIDACION_JURIDICA' },
  { id: 'Q15', categoria: 'vocabulario_similar_no_relacionado', texto: 'plazo de notificación', relevantes: ['lab-cpp-180'], distractores: ['lab-merc-300'], abstencion_esperada: false, semantic_hits: [{ id: 'lab-cpp-180', score: 0.6 }, { id: 'lab-merc-300', score: 0.45 }], validacion: 'PENDIENTE_VALIDACION_JURIDICA' },
  { id: 'Q16', categoria: 'excepcion_remision', texto: 'salvo lo dispuesto en el artículo 173 plazo de notificación', relevantes: ['lab-cpp-180', 'lab-cpp-173'], distractores: ['lab-cc-173'], abstencion_esperada: false, semantic_hits: [{ id: 'lab-cpp-180', score: 0.8 }, { id: 'lab-cpp-173', score: 0.7 }], validacion: 'PENDIENTE_VALIDACION_JURIDICA' },
  {
    id: 'Q17',
    categoria: 'estres_top_k_rpc',
    texto: 'plazo de prueba de ejemplo',
    relevantes: ['lab-cpp-173'],
    distractores: docBulk.map((d) => d.id),
    abstencion_esperada: false,
    semantic_hits: [
      ...docBulk.map((d, i) => ({ id: d.id, score: 0.99 - i * 0.001 })),
      { id: 'lab-cpp-173', score: 0.5 },
    ],
    validacion: 'PENDIENTE_VALIDACION_JURIDICA',
  },
  { id: 'Q18', categoria: 'clo_e2_contexto', texto: 'requisitos notariales sintéticos artículo 72', relevantes: ['lab-not-72'], distractores: [], articulo_esperado: '72', abstencion_esperada: true, semantic_hits: [{ id: 'lab-not-72', score: 0.8 }], validacion: 'PENDIENTE_VALIDACION_JURIDICA' },
  { id: 'Q19', categoria: 'clo_e6_secundario', texto: 'requisitos notariales sintéticos decreto 102-2018', relevantes: ['lab-not-72', 'lab-102-5'], distractores: [], abstencion_esperada: true, semantic_hits: [{ id: 'lab-not-72', score: 0.8 }, { id: 'lab-102-5', score: 0.7 }], validacion: 'PENDIENTE_VALIDACION_JURIDICA' },
  { id: 'Q20', categoria: 'clo_e5_normal_excluido', texto: 'texto base sintético de ejemplo', relevantes: [], distractores: ['lab-cpt-10', 'lab-cpt-11'], abstencion_esperada: true, semantic_hits: [{ id: 'lab-cpt-10', score: 0.95 }, { id: 'lab-cpt-11', score: 0.9 }], validacion: 'PENDIENTE_VALIDACION_JURIDICA' },
  { id: 'Q21', categoria: 'clo_e5_historico_explicito', texto: 'texto original histórico del CPC_TEXTO_BASE_D211-2006 sintético', relevantes: ['lab-cpt-10'], distractores: [], abstencion_esperada: true, semantic_hits: [{ id: 'lab-cpt-10', score: 0.9 }], validacion: 'PENDIENTE_VALIDACION_JURIDICA' },
  { id: 'Q22', categoria: 'clo_primary_con_e6', texto: 'plazo de prueba adopción', relevantes: ['lab-cpp-173', 'lab-102-5'], distractores: [], abstencion_esperada: false, semantic_hits: [{ id: 'lab-102-5', score: 0.95 }, { id: 'lab-cpp-173', score: 0.6 }], validacion: 'PENDIENTE_VALIDACION_JURIDICA' },
  { id: 'Q23', categoria: 'adversarial_semantico_negativo', texto: 'plazo de notificación', relevantes: ['lab-cpp-180'], distractores: ['lab-merc-300'], abstencion_esperada: false, semantic_hits: [{ id: 'lab-merc-300', score: 0.99 }, { id: 'lab-cpp-180', score: 0.6 }], validacion: 'PENDIENTE_VALIDACION_JURIDICA' },
];
