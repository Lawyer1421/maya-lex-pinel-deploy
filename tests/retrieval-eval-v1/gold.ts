import type { RegistroSnapshot } from './snapshot';

/**
 * Set de evaluación V1. Oro técnico verificado contra los encabezados y textos
 * del lote versionado. El oro legal NO está validado por abogado: todo caso
 * evaluable queda en PENDING_LEGAL_VALIDATION salvo indicación contraria.
 *
 * Estados (un solo campo legal_validation_status):
 *  - TECHNICALLY_VERIFIED: el oro técnico (ids/artículos) existe y coincide con el texto del lote.
 *  - PENDING_LEGAL_VALIDATION: requiere interpretación jurídica o cruce con CLO.
 *  - GOLD_SOURCE_INSUFFICIENT: el instrumento o el artículo no están en el snapshot.
 */

export type Instrumento = 'CODIGO_NOTARIADO' | 'REGLAMENTO_NOTARIADO' | 'NONE_IN_SNAPSHOT';
export type Categoria = 'A_EXACTA' | 'B_CONCEPTUAL' | 'C_MULTI_REMISION_EXCEPCION' | 'D_ADVERSARIAL' | 'E_EVIDENCIA_INSUFICIENTE' | 'F_HISTORICA_VIGENCIA_ROL';
export type EstadoValidacion = 'TECHNICALLY_VERIFIED' | 'PENDING_LEGAL_VALIDATION' | 'GOLD_SOURCE_INSUFFICIENT';

export interface PreguntaEvaluacion {
  id: string;
  categoria: Categoria;
  pregunta: string;
  materia: '03_NOTARIAL' | 'NINGUNA';
  expected_instrument: Instrumento;
  expected_articles: string[];
  /** Instrumento contrario con el mismo número: no debe presentarse como fuente. */
  forbidden_instrument_same_number: Instrumento | null;
  expected_primary_required: boolean;
  expected_secondary_allowed: boolean;
  expected_context_allowed: boolean;
  expected_abstention: boolean;
  legal_validation_status: EstadoValidacion;
  notes: string;
}

export interface OroResuelto extends PreguntaEvaluacion {
  acceptable_source_ids: string[];
  forbidden_source_ids: string[];
  legal_gold: false;
}

const C = (
  id: string,
  categoria: Categoria,
  pregunta: string,
  expected_instrument: Instrumento,
  expected_articles: string[],
  extra: Partial<PreguntaEvaluacion> = {},
): PreguntaEvaluacion => ({
  id,
  categoria,
  pregunta,
  materia: expected_instrument === 'NONE_IN_SNAPSHOT' ? 'NINGUNA' : '03_NOTARIAL',
  expected_instrument,
  expected_articles,
  forbidden_instrument_same_number: null,
  expected_primary_required: expected_instrument !== 'NONE_IN_SNAPSHOT',
  expected_secondary_allowed: false,
  expected_context_allowed: false,
  expected_abstention: false,
  legal_validation_status: 'TECHNICALLY_VERIFIED',
  notes: '',
  ...extra,
});

const COD: Instrumento = 'CODIGO_NOTARIADO';
const REG: Instrumento = 'REGLAMENTO_NOTARIADO';
const NONE: Instrumento = 'NONE_IN_SNAPSHOT';
const ABST = { expected_abstention: true, expected_primary_required: false };
const SIN_SNAPSHOT = { legal_validation_status: 'GOLD_SOURCE_INSUFFICIENT' as const, expected_abstention: true, expected_primary_required: false, notes: 'Instrumento ausente del snapshot. Abstención técnica; la respuesta jurídica no está establecida.' };
const E2 = { expected_context_allowed: true, expected_primary_required: false, legal_validation_status: 'PENDING_LEGAL_VALIDATION' as const, notes: 'E2: CONTEXT únicamente. Estado legal no adjudicado.' };

export const PREGUNTAS_V1: PreguntaEvaluacion[] = [
  // A. Búsqueda exacta
  C('A01', 'A_EXACTA', 'Qué dice el artículo 4 del Código del Notariado sobre cuándo y dónde se ejerce la función notarial', COD, ['4'], { forbidden_instrument_same_number: REG }),
  C('A02', 'A_EXACTA', 'artículo 15 del código del notariado, idioma y estilo de los instrumentos públicos', COD, ['15'], { forbidden_instrument_same_number: REG }),
  C('A03', 'A_EXACTA', 'art. 35 Código del Notariado: qué es el protocolo', COD, ['35'], { forbidden_instrument_same_number: REG }),
  C('A04', 'A_EXACTA', 'Código del Notariado artículo 19, qué es la escritura matriz', COD, ['19'], { forbidden_instrument_same_number: REG }),
  C('A05', 'A_EXACTA', 'artículo 42 del Código del Notariado sobre la seguridad jurídica de los actos', COD, ['42'], { forbidden_instrument_same_number: REG }),
  C('A06', 'A_EXACTA', 'artículo 79 del Código del Notariado, sanciones aplicables', COD, ['79'], { forbidden_instrument_same_number: REG }),
  C('A07', 'A_EXACTA', 'artículo 81 del Código del Notariado, faltas graves', COD, ['81'], { forbidden_instrument_same_number: REG }),
  C('A08', 'A_EXACTA', 'artículo 91 del Código del Notariado, personas no autorizadas para el notariado', COD, ['91'], { forbidden_instrument_same_number: REG }),
  C('A09', 'A_EXACTA', 'artículo 54 del Código del Notariado, trámites a instancia de parte', COD, ['54'], { forbidden_instrument_same_number: REG }),
  C('A10', 'A_EXACTA', 'artículo 2 del Código del Notariado', COD, ['2'], { forbidden_instrument_same_number: REG }),

  // B. Conceptual
  C('B01', 'B_CONCEPTUAL', '¿Qué significa que el notario tenga fe pública?', COD, ['5']),
  C('B02', 'B_CONCEPTUAL', '¿Qué requisitos debe cumplir alguien para ser notario en Honduras?', COD, ['7']),
  C('B03', 'B_CONCEPTUAL', '¿Qué documentos se consideran instrumentos públicos en materia notarial?', COD, ['14']),
  C('B04', 'B_CONCEPTUAL', '¿Qué es una copia de una escritura matriz?', COD, ['28']),
  C('B05', 'B_CONCEPTUAL', '¿Quién tiene la custodia de los protocolos notariales?', COD, ['36']),
  C('B06', 'B_CONCEPTUAL', '¿El notario puede certificar que una persona existe físicamente?', COD, ['22']),
  C('B07', 'B_CONCEPTUAL', '¿Qué órgano controla a los notarios y cómo se integra?', COD, ['74', '75']),
  C('B08', 'B_CONCEPTUAL', '¿Qué faltas leves puede cometer un notario?', COD, ['80']),
  C('B09', 'B_CONCEPTUAL', '¿Pueden los jueces de paz ejercer la función notarial?', COD, ['6'], { forbidden_instrument_same_number: REG }),
  C('B10', 'B_CONCEPTUAL', 'qué es el protocolo de un notario', COD, ['35']),

  // C. Multi-artículo, remisión, excepción
  C('C01', 'C_MULTI_REMISION_EXCEPCION', 'Un notario quiere permitir que terceros actúen dentro de su protocolo. ¿Puede hacerlo y hay excepciones?', COD, ['13'], { legal_validation_status: 'PENDING_LEGAL_VALIDATION', notes: 'Excepción de mandamiento judicial o requerimiento de la Contraloría.' }),
  C('C02', 'C_MULTI_REMISION_EXCEPCION', 'El deber de custodia de los protocolos se relaciona con una obligación del artículo 12. ¿Cuál es el deber de custodia y qué numeral del 12 aplica?', COD, ['36', '12'], { legal_validation_status: 'PENDING_LEGAL_VALIDATION', notes: 'Remisión explícita al numeral 9 del artículo 12.' }),
  C('C03', 'C_MULTI_REMISION_EXCEPCION', '¿Puede un notario ejercer la docencia a la vez que el notariado?', COD, ['78'], { legal_validation_status: 'PENDING_LEGAL_VALIDATION', notes: 'Excepción "excepto la docencia".' }),
  C('C04', 'C_MULTI_REMISION_EXCEPCION', '¿Qué sanción corresponde a un notario por una falta grave?', COD, ['79', '81'], { legal_validation_status: 'PENDING_LEGAL_VALIDATION' }),
  C('C05', 'C_MULTI_REMISION_EXCEPCION', '¿Cómo se trata la reincidencia de faltas en el régimen disciplinario notarial?', COD, ['81', '82'], { legal_validation_status: 'PENDING_LEGAL_VALIDATION' }),
  C('C06', 'C_MULTI_REMISION_EXCEPCION', '¿Una copia puede omitir partes de la escritura matriz?', COD, ['31'], { legal_validation_status: 'PENDING_LEGAL_VALIDATION' }),
  C('C07', 'C_MULTI_REMISION_EXCEPCION', 'En una ejecución de garantía por venta pública, ¿el acreedor pierde el derecho a perseguir otros bienes del deudor?', COD, ['65'], { legal_validation_status: 'PENDING_LEGAL_VALIDATION', notes: 'Excepción "salvo el derecho del acreedor".' }),
  C('C08', 'C_MULTI_REMISION_EXCEPCION', 'En un asunto no contencioso ante notario, ¿qué normas aplican supletoriamente?', COD, ['53', '56'], { legal_validation_status: 'PENDING_LEGAL_VALIDATION' }),
  C('C09', 'C_MULTI_REMISION_EXCEPCION', '¿Responde el notario por requerir información a la autoridad competente?', COD, ['58'], { legal_validation_status: 'PENDING_LEGAL_VALIDATION', notes: 'Cláusula "sin perjuicio de su responsabilidad".' }),
  C('C10', 'C_MULTI_REMISION_EXCEPCION', '¿Prevalece la nulidad prevista en otras leyes sobre la nulidad de la ley notarial?', COD, ['18'], { legal_validation_status: 'PENDING_LEGAL_VALIDATION' }),

  // D. Distractores adversariales (instrumento explícito; mismo número en el otro instrumento)
  C('D01', 'D_ADVERSARIAL', 'Según el Reglamento del Código del Notariado, ¿cómo se ejerce la función notarial?', REG, ['3'], { forbidden_instrument_same_number: COD }),
  C('D02', 'D_ADVERSARIAL', 'En el Código del Notariado, artículo 3, ¿qué es la función notarial?', COD, ['3'], { forbidden_instrument_same_number: REG }),
  C('D03', 'D_ADVERSARIAL', 'Reglamento del Código del Notariado: cuando un notario se imposibilita, ¿quién lo sustituye?', REG, ['6'], { forbidden_instrument_same_number: COD }),
  C('D04', 'D_ADVERSARIAL', 'Código del Notariado artículo 6: ¿qué jueces pueden ejercer la función notarial?', COD, ['6'], { forbidden_instrument_same_number: REG }),
  C('D05', 'D_ADVERSARIAL', 'Según el reglamento notarial, ¿qué presunción tienen las afirmaciones del notario?', REG, ['9'], { forbidden_instrument_same_number: COD }),
  C('D06', 'D_ADVERSARIAL', 'Reglamento del Código del Notariado, artículo 12: ¿cómo debe ser el sello del notario?', REG, ['12'], { forbidden_instrument_same_number: COD }),
  C('D07', 'D_ADVERSARIAL', 'Reglamento del Código del Notariado, artículo 10: ¿qué es la imparcialidad del notario?', REG, ['10'], { forbidden_instrument_same_number: COD }),
  C('D08', 'D_ADVERSARIAL', 'Reglamento del Código del Notariado, artículo 11: ¿qué prohibiciones tiene el notario?', REG, ['11'], { forbidden_instrument_same_number: COD }),
  C('D09', 'D_ADVERSARIAL', '¿Qué prohibiciones tiene el notario según el Código del Notariado?', COD, ['13'], { forbidden_instrument_same_number: REG }),
  C('D10', 'D_ADVERSARIAL', 'Reglamento del Código del Notariado, artículo 1: seguridad jurídica y función del notariado', REG, ['1'], { forbidden_instrument_same_number: COD }),

  // E. Evidencia insuficiente / abstención
  C('E01', 'E_EVIDENCIA_INSUFICIENTE', '¿Cuál es el plazo de prescripción de la acción civil por daños en Honduras?', NONE, [], SIN_SNAPSHOT),
  C('E02', 'E_EVIDENCIA_INSUFICIENTE', '¿Qué dice el artículo 173 del Código Procesal Penal sobre las medidas cautelares?', NONE, [], SIN_SNAPSHOT),
  C('E03', 'E_EVIDENCIA_INSUFICIENTE', '¿Qué establece el artículo 150 del Código del Notariado?', COD, ['150'], { expected_abstention: true, expected_primary_required: false, legal_validation_status: 'TECHNICALLY_VERIFIED', notes: 'Artículo inexistente: el lote contiene los artículos 1 a 94 del Código; no hay artículo 150.' }),
  C('E04', 'E_EVIDENCIA_INSUFICIENTE', '¿Qué requisitos exige el Código de Comercio para constituir una sociedad anónima?', NONE, [], SIN_SNAPSHOT),
  C('E05', 'E_EVIDENCIA_INSUFICIENTE', '¿Qué plazo tiene una institución pública para responder una solicitud de información según la ley de acceso a la información?', NONE, [], SIN_SNAPSHOT),
  C('E06', 'E_EVIDENCIA_INSUFICIENTE', '¿Cuáles son las causales de divorcio en el Código de Familia?', NONE, [], SIN_SNAPSHOT),
  C('E07', 'E_EVIDENCIA_INSUFICIENTE', '¿Qué obligaciones tienen los padres según la Ley Especial de Adopciones de 2018?', NONE, [], SIN_SNAPSHOT),

  // F. Histórica, vigencia y rol
  C('F01', 'F_HISTORICA_VIGENCIA_ROL', '¿Cuál era el texto original del artículo 11 del Código del Notariado antes de la reforma?', COD, ['11'], { ...ABST, expected_context_allowed: false, legal_validation_status: 'PENDING_LEGAL_VALIDATION', notes: 'E1: texto original de los artículos 11 y 27 desplazado por D.77-2006. No hay intención histórica CPC, por lo que no aplica CONTEXT histórico.' }),
  C('F02', 'F_HISTORICA_VIGENCIA_ROL', '¿Sigue vigente el artículo 72 del Código del Notariado?', COD, ['72'], { ...E2, ...ABST, expected_context_allowed: true, expected_primary_required: false, expected_abstention: true }),
  C('F03', 'F_HISTORICA_VIGENCIA_ROL', '¿El artículo 27 del Código del Notariado está vigente?', COD, ['27'], { ...ABST, legal_validation_status: 'PENDING_LEGAL_VALIDATION', notes: 'E1: artículo 27 desplazado por D.77-2006.' }),
  C('F04', 'F_HISTORICA_VIGENCIA_ROL', '¿Qué dice el artículo 84 del Código del Notariado?', COD, ['84'], { ...E2, ...ABST, expected_context_allowed: true }),
  C('F05', 'F_HISTORICA_VIGENCIA_ROL', '¿Cuál era el texto histórico del Código Procesal Civil sobre el plazo de apelación?', NONE, [], SIN_SNAPSHOT),
  C('F06', 'F_HISTORICA_VIGENCIA_ROL', '¿Qué dice el artículo 30 del Código del Notariado sobre las copias de escrituras matrices?', COD, ['30'], { legal_validation_status: 'TECHNICALLY_VERIFIED', notes: 'Caso que depende de la vigencia del snapshot: PRIMARY sólo con vigencia adjudicada.' }),
];

/** Resuelve oro técnico contra el snapshot. Falla si un artículo declarado no existe. */
export function resolverOro(preguntas: PreguntaEvaluacion[], filas: RegistroSnapshot[]): OroResuelto[] {
  return preguntas.map((p) => {
    if (p.expected_instrument === 'NONE_IN_SNAPSHOT') {
      return { ...p, acceptable_source_ids: [], forbidden_source_ids: [], legal_gold: false };
    }
    const aceptables = p.expected_articles.map((num) => {
      const f = filas.find((r) => r.instrumento === p.expected_instrument && r.num_articulo === num);
      if (!f) {
        if (p.expected_abstention && p.id === 'E03') return null;
        throw new Error(`Oro inválido ${p.id}: ${p.expected_instrument} art. ${num} ausente del snapshot`);
      }
      return f.id;
    }).filter((x): x is string => x !== null);
    const prohibidos = p.forbidden_instrument_same_number
      ? p.expected_articles.flatMap((num) => filas.filter((r) => r.instrumento === p.forbidden_instrument_same_number && r.num_articulo === num).map((r) => r.id))
      : [];
    return { ...p, acceptable_source_ids: aceptables, forbidden_source_ids: prohibidos, legal_gold: false };
  });
}
