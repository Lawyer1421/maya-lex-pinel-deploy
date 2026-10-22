/**
 * Golden Set del gateway PR-G1 (modo sombra). Fuente de verdad: el CLO
 * (prompt PR-G1 del 21-oct-2026 y dictamen CLO del issue #74). Sólo los casos
 * verificados por el CLO; cualquier otro es hipótesis y queda en
 * CASOS_PENDIENTES_CLO, fuera del gate.
 *
 * Los textos de evidencia son FIXTURES SINTÉTICAS: no son el texto legal
 * oficial. Lo que se fija es la identidad (instrumento, artículo, Gaceta) y la
 * decisión esperada. Las respuestas del modelo son grabadas: no hay red.
 */
import type { SalidaCruda } from '@/lib/ai-gateway/shadow/citation-validator';
import type { GoldenCase } from '@/lib/ai-gateway/shadow/golden-runner';
import type { EvidenceChunk } from '@/lib/ai-gateway/shadow/types';
import { resolverVersion, type NormaVersion } from '@/lib/legal-retrieval/norma-version';
import type { CloRulingSource, VerificacionFechaPagina } from './procedencia-clo';

const SINTETICO = 'FIXTURE SINTÉTICA: no es el texto legal oficial.';

// Fixtures sintéticos: el CLO declara qué chunk es autoridad (PRIMARY) y cuál es solo contexto. En ellos `citable` sigue
// a `rol`; en el runtime real el rol es null y `citable` lo decide construirCitas (ver evidence-classification.ts).
const chunk = (c: Omit<EvidenceChunk, 'texto' | 'citable'>): EvidenceChunk => ({ ...c, citable: c.rol === 'PRIMARY', texto: `${SINTETICO} ${c.instrumento} art. ${c.articulo ?? '-'}` });

/** Versión de una unidad cuyo único evento es una REFORMA sin instrumento modificador. */
export const VERSION_REFORMA_SIN_INSTRUMENTO: NormaVersion = {
  instrumento_id: 'SINT_G1',
  unidad: '1',
  version_id: 'reforma-sin-instrumento',
  etiqueta: null,
  texto: SINTETICO,
  texto_hash: null,
  vigente_desde: '2020-01-01',
  vigente_hasta: null,
  vigente_desde_min: null,
  vigente_desde_max: null,
  tipo_evento: 'REFORMA',
  instrumento_modificador: null,
  gaceta_numero: null,
  fecha_publicacion: null,
  fecha_vigencia: null,
  estado_vigencia: 'TRUE',
  nivel_verificacion: 'PRIMARIA_TEXTO',
  elegible_primary: true,
  fuente: null,
  fuente_pdf_hash: null,
  adjudicacion_ref: null,
  precision_fecha: 'DIA',
  nota: null,
};

/** Rol que producción da a esa versión (resolverVersion, dictamen CLO 21-oct-2026). */
const resueltaReforma = resolverVersion('SINT_G1', '1', '2026-10-21', [VERSION_REFORMA_SIN_INSTRUMENTO], { anioEnCurso: 2026 });
const ROL_REFORMA_SIN_INSTRUMENTO: EvidenceChunk['rol'] = resueltaReforma.estado === 'PRIMARY' ? 'PRIMARY' : 'CONTEXT';

/** Caso del Golden Set con la verificación de fecha y página de La Gaceta que cite su referenciaCLO (M1). */
export type CasoG1 = GoldenCase & { verificacionFechaPagina?: VerificacionFechaPagina };

export const GOLDEN_G1: readonly CasoG1[] = [
  {
    id: 'G1-ABS-NOTARIADO-ART-500',
    estado: 'VERIFICADO',
    categoria: 'ABSTENCION',
    clo_ruling_ref: 'Dictamen CLO 21-oct-2026, issue #74, caso C2 (el art. 500 del Código del Notariado no existe; el último es el 94): https://github.com/Lawyer1421/maya-lex-pinel-deploy/issues/74#issuecomment-6313691566. Confirmado en el prompt PR-G1 del CLO, 21-oct-2026.',
    articulo: '500 (inexistente; el último artículo es el 94)',
    gaceta: '30,904',
    referenciaCLO: 'Código del Notariado, D.353-2005, Gaceta 30,904: el último artículo es el 94; el art. 500 no existe.',
    input: {
      queryId: 'q-g1-01',
      sanitizedQuestion: '¿Qué dice el artículo 500 del Código del Notariado?',
      evidence: [chunk({ chunk_id: 'cn-94', instrumento: 'CODIGO_NOTARIADO', articulo: '94', gaceta: '30,904', rol: 'PRIMARY' })],
      productionOutcome: { decision: 'ABSTAIN', retrievalState: 'NO_VERIFIED_EVIDENCE' },
    },
    esperado: { decision: 'ABSTAIN' },
  },
  {
    id: 'G1-ABS-REGLAMENTO-ART-12-BIS',
    estado: 'VERIFICADO',
    categoria: 'ABSTENCION',
    clo_ruling_ref: 'Dictamen CLO 21-oct-2026, issue #74, caso C1 (el art. 12-BIS del Reglamento del Notariado no existe) y caso D2 (Resolución PCSJ-17-2012, Gaceta 32,958): https://github.com/Lawyer1421/maya-lex-pinel-deploy/issues/74#issuecomment-6313691566. Confirmado en el prompt PR-G1 del CLO, 21-oct-2026.',
    articulo: '12-BIS (inexistente)',
    gaceta: '32,958',
    referenciaCLO: 'Reglamento del Código del Notariado, Resolución PCSJ-17-2012, Gaceta 32,958: el art. 12-BIS no existe.',
    input: {
      queryId: 'q-g1-02',
      sanitizedQuestion: '¿Qué establece el artículo 12-BIS del Reglamento del Código del Notariado?',
      evidence: [],
      productionOutcome: { decision: 'ABSTAIN', retrievalState: 'NO_VERIFIED_EVIDENCE' },
    },
    esperado: { decision: 'ABSTAIN' },
  },
  {
    id: 'G1-NOT-LEY-DEL-NOTARIADO',
    estado: 'VERIFICADO',
    categoria: 'NOTARIAL',
    clo_ruling_ref: 'Dictamen CLO 21-oct-2026, issue #74, caso D1 («Ley del Notariado» se corrige a Código del Notariado, D.353-2005): https://github.com/Lawyer1421/maya-lex-pinel-deploy/issues/74#issuecomment-6313691566. Confirmado en el prompt PR-G1 del CLO, 21-oct-2026.',
    articulo: 'sin artículo (identidad del instrumento: D.353-2005)',
    gaceta: '30,904',
    referenciaCLO: '«Ley del Notariado» se corrige a Código del Notariado, D.353-2005, Gaceta 30,904.',
    input: {
      queryId: 'q-g1-03',
      sanitizedQuestion: '¿Qué regula la Ley del Notariado?',
      evidence: [chunk({ chunk_id: 'cn-identidad', instrumento: 'CODIGO_NOTARIADO', articulo: null, gaceta: '30,904', rol: 'PRIMARY' })],
      productionOutcome: { decision: 'ANSWER', retrievalState: 'EXACT_SUCCESS' },
    },
    esperado: { decision: 'ANSWER' },
  },
  {
    id: 'G1-REF-ART-173-B-CPP',
    estado: 'VERIFICADO',
    categoria: 'REFERENCIA_CRUZADA',
    clo_ruling_ref: 'Dictamen CLO 21-oct-2026, issue #74, casos C3 (el art. 173-B está en el CPP, no en el Código Penal) y A2 (adicionado por el D.98-2017, Gaceta 34,473): https://github.com/Lawyer1421/maya-lex-pinel-deploy/issues/74#issuecomment-6313691566. Confirmado en el prompt PR-G1 del CLO, 21-oct-2026.',
    articulo: '173-B del CPP',
    gaceta: '34,473',
    referenciaCLO: 'Art. 173-B: pertenece al CPP (adicionado por el D.98-2017, Gaceta 34,473), no al Código Penal.',
    input: {
      queryId: 'q-g1-04',
      sanitizedQuestion: '¿Qué dice el artículo 173-B del Código Penal?',
      evidence: [
        chunk({ chunk_id: 'cpp-173-b', instrumento: 'CPP', articulo: '173-B', gaceta: '34,473', rol: 'PRIMARY' }),
        chunk({ chunk_id: 'cp-173', instrumento: 'CODIGO_PENAL', articulo: '173', gaceta: null, rol: 'CONTEXT' }),
      ],
      productionOutcome: { decision: 'ANSWER', retrievalState: 'EXACT_SUCCESS' },
    },
    esperado: { decision: 'ANSWER', articulo: { instrumento: 'CPP', articulo: '173-B' }, instrumentosProhibidos: ['CODIGO_PENAL'] },
  },
  {
    id: 'G1-VIG-CODIGO-PENAL-130-2017',
    estado: 'VERIFICADO',
    categoria: 'VIGENCIA_VERSION',
    clo_ruling_ref: 'Dictamen CLO 22-oct-2026, fuentes oficiales: La Gaceta 34,940 (SHA-256 54f6a4122f8b96a60631deb8c486284ff0744c0d09ea0ed332d8d5d1960ba132) y La Gaceta 35,247 (SHA-256 60b5b7865bdb0b868131005429017632fb168e286a1a9dfa5482378e8f58bbdb). Verificado contra La Gaceta 34,940 y 35,247 (Investigador Fuentes Oficiales HN), CLO 22-oct-2026.',
    articulo: '634 del D.130-2017 (deroga el D.144-83 y todas sus reformas); vigencia desde el 25-jun-2020 por el art. 1 del D.46-2020',
    gaceta: '34,940; 35,247',
    verificacionFechaPagina: {
      estado: 'VERIFICADO_CLO_PDF_OFICIAL',
      fecha: '22-oct-2026',
      detalle: [
        { gaceta: '34,940', fecha: '10-may-2019', pagina: '140-A', paginaPdf: 156 },
        { gaceta: '35,247', fecha: '9-may-2020', pagina: '2-A', paginaPdf: 2 },
      ],
    },
    referenciaCLO:
      'Art. 634 del D.130-2017: deroga el D.144-83 (Código Penal de 1983) y todas sus reformas (La Gaceta 34,940, 10-may-2019, pág. 140-A). Vigencia desde el 25-jun-2020 por el art. 1 del D.46-2020, que reforma el art. 635 (La Gaceta 35,247, 9-may-2020, pág. 2-A).',
    input: {
      queryId: 'q-g1-05',
      sanitizedQuestion: '¿Qué deroga el artículo 634 del Código Penal (Decreto 130-2017) y desde cuándo está vigente?',
      evidence: [
        chunk({ chunk_id: 'cp-130-2017-634', instrumento: 'CODIGO_PENAL_D130_2017', articulo: '634', gaceta: '34,940', rol: 'PRIMARY' }),
        chunk({ chunk_id: 'd46-2020-1', instrumento: 'DECRETO_46_2020', articulo: '1', gaceta: '35,247', rol: 'PRIMARY' }),
      ],
      productionOutcome: { decision: 'ANSWER', retrievalState: 'EXACT_SUCCESS' },
    },
    esperado: { decision: 'ANSWER', articulo: { instrumento: 'CODIGO_PENAL_D130_2017', articulo: '634' } },
  },
  {
    id: 'G1-VIG-D57-2020-SIN-REVIVISCENCIA',
    estado: 'VERIFICADO',
    categoria: 'VIGENCIA_VERSION',
    clo_ruling_ref: 'Dictamen CLO 21-oct-2026, issue #74, caso B3 (D.57-2020 derogado por el D.43-2023; no revive): https://github.com/Lawyer1421/maya-lex-pinel-deploy/issues/74#issuecomment-6313691566. Confirmado en el prompt PR-G1 del CLO, 21-oct-2026.',
    articulo: 'sin artículo (D.57-2020, que interpretaba los arts. 217, 219 y 220 del CPP, derogado por el D.43-2023)',
    gaceta: '35,398 (D.57-2020); 36,290 (D.43-2023)',
    referenciaCLO: 'D.57-2020 (Gaceta 35,398): derogado por el D.43-2023 (Gaceta 36,290). No revive.',
    input: {
      queryId: 'q-g1-06',
      sanitizedQuestion: '¿Sigue vigente el Decreto 57-2020?',
      evidence: [
        chunk({ chunk_id: 'd57-2020', instrumento: 'DECRETO_57_2020', articulo: null, gaceta: '35,398', rol: 'CONTEXT' }),
        chunk({ chunk_id: 'd43-2023', instrumento: 'DECRETO_43_2023', articulo: null, gaceta: '36,290', rol: 'PRIMARY' }),
      ],
      productionOutcome: { decision: 'ANSWER', retrievalState: 'EXACT_SUCCESS' },
    },
    esperado: { decision: 'ANSWER' },
  },
  {
    id: 'G1-ART-TRIBUTARIO-214',
    estado: 'VERIFICADO',
    categoria: 'ARTICULO_EXACTO',
    clo_ruling_ref: 'Dictamen CLO 21-oct-2026, issue #74, caso A4 (Código Tributario D.170-2016; su art. 214 deroga el D.22-97): https://github.com/Lawyer1421/maya-lex-pinel-deploy/issues/74#issuecomment-6313691566. Confirmado en el prompt PR-G1 del CLO, 21-oct-2026.',
    articulo: '214 del Código Tributario',
    gaceta: '34,224',
    referenciaCLO: 'Código Tributario D.170-2016 (Gaceta 34,224): su art. 214 deroga el D.22-97.',
    input: {
      queryId: 'q-g1-07',
      sanitizedQuestion: '¿Qué dispone el artículo 214 del Código Tributario?',
      evidence: [chunk({ chunk_id: 'ct-214', instrumento: 'CODIGO_TRIBUTARIO', articulo: '214', gaceta: '34,224', rol: 'PRIMARY' })],
      productionOutcome: { decision: 'ANSWER', retrievalState: 'EXACT_SUCCESS' },
    },
    esperado: { decision: 'ANSWER', articulo: { instrumento: 'CODIGO_TRIBUTARIO', articulo: '214' } },
  },
  {
    id: 'G1-VER-REFORMA-NO-VINCULADA',
    estado: 'VERIFICADO',
    categoria: 'VIGENCIA_VERSION',
    clo_ruling_ref: 'Dictamen CLO 21-oct-2026, issue #74, punto 1 (REFORMA_NO_VINCULADA: una REFORMA sin vínculo nunca es PRIMARY): https://github.com/Lawyer1421/maya-lex-pinel-deploy/issues/74#issuecomment-6313691566. Confirmado en el prompt PR-G1 del CLO, 21-oct-2026.',
    articulo: 'art. 1 de la unidad sintética SINT_G1 (REFORMA sin instrumento modificador vinculado)',
    gaceta: null,
    referenciaCLO: 'REFORMA sin instrumento modificador vinculado: nunca PRIMARY (REFORMA_NO_VINCULADA, CONTEXT). Sin evidencia PRIMARY, se abstiene.',
    input: {
      queryId: 'q-g1-08',
      sanitizedQuestion: '¿Cuál es el texto vigente de la unidad reformada?',
      evidence: [{ chunk_id: 'reforma-sin-instrumento', instrumento: 'SINT_G1', articulo: '1', gaceta: null, rol: ROL_REFORMA_SIN_INSTRUMENTO, citable: false, texto: SINTETICO }],
      // Sin evidencia PRIMARY (sólo CONTEXT) producción no tiene qué citar: NO_VERIFIED_EVIDENCE, nunca EXACT_SUCCESS.
      productionOutcome: { decision: 'ABSTAIN', retrievalState: 'NO_VERIFIED_EVIDENCE' },
    },
    esperado: { decision: 'ABSTAIN' },
  },
];


const ref = (id: string): string => GOLDEN_G1.find((c) => c.id === id)!.clo_ruling_ref;

/**
 * Procedencia del dictamen CLO de cada caso. Los siete casos del 21-oct-2026 conservan su
 * clo_ruling_ref sin cambios (rulingRef es esa misma cadena) y su código de caso, tal como
 * ya figura en esa referencia. El caso Penal se apoya en fuentes oficiales.
 */
export const PROCEDENCIA_G1: Readonly<Record<string, CloRulingSource>> = {
  'G1-ABS-NOTARIADO-ART-500': { kind: 'CLO_ISSUE_RULING', verifiedAt: '21-oct-2026', rulingRef: ref('G1-ABS-NOTARIADO-ART-500'), caseCode: 'C2' },
  'G1-ABS-REGLAMENTO-ART-12-BIS': { kind: 'CLO_ISSUE_RULING', verifiedAt: '21-oct-2026', rulingRef: ref('G1-ABS-REGLAMENTO-ART-12-BIS'), caseCode: 'C1' },
  'G1-NOT-LEY-DEL-NOTARIADO': { kind: 'CLO_ISSUE_RULING', verifiedAt: '21-oct-2026', rulingRef: ref('G1-NOT-LEY-DEL-NOTARIADO'), caseCode: 'D1' },
  'G1-REF-ART-173-B-CPP': { kind: 'CLO_ISSUE_RULING', verifiedAt: '21-oct-2026', rulingRef: ref('G1-REF-ART-173-B-CPP'), caseCode: 'C3' },
  'G1-VIG-CODIGO-PENAL-130-2017': {
    kind: 'CLO_OFFICIAL_SOURCE_RULING',
    verifiedAt: '22-oct-2026',
    officialSources: [
      { publication: 'La Gaceta', number: '34,940', sha256: '54f6a4122f8b96a60631deb8c486284ff0744c0d09ea0ed332d8d5d1960ba132' },
      { publication: 'La Gaceta', number: '35,247', sha256: '60b5b7865bdb0b868131005429017632fb168e286a1a9dfa5482378e8f58bbdb' },
    ],
    goldenCaseId: 'G1-VIG-CODIGO-PENAL-130-2017',
    researchProvenance: 'Investigador Fuentes Oficiales HN, 22-oct-2026; cotejo CLO del PDF oficial ENAG',
  },
  'G1-VIG-D57-2020-SIN-REVIVISCENCIA': { kind: 'CLO_ISSUE_RULING', verifiedAt: '21-oct-2026', rulingRef: ref('G1-VIG-D57-2020-SIN-REVIVISCENCIA'), caseCode: 'B3' },
  'G1-ART-TRIBUTARIO-214': { kind: 'CLO_ISSUE_RULING', verifiedAt: '21-oct-2026', rulingRef: ref('G1-ART-TRIBUTARIO-214'), caseCode: 'A4' },
  'G1-VER-REFORMA-NO-VINCULADA': { kind: 'CLO_ISSUE_RULING', verifiedAt: '21-oct-2026', rulingRef: ref('G1-VER-REFORMA-NO-VINCULADA'), caseCode: 'punto 1' },
};

/** Hipótesis del CLO aún no verificadas (marcadas NV en #74). No son fixtures ni entran al gate. */
export const CASOS_PENDIENTES_CLO = [
  'E1 (NV): fecha y vigencia del Código Civil de 1906',
  'E2 (NV): sustitución de la Ley Electoral D.44-2004 por el D.35-2021',
] as const;

/**
 * Casos retirados del gate que esperan verificación del CLO. Vacío desde el
 * dictamen CLO del 22-oct-2026 (Issue #78): el caso Penal D.130-2017 volvió al
 * gate con fuentes oficiales. Si vuelve a haber uno, no cuenta en ninguna métrica
 * ni lleva respuesta grabada.
 */
export const PENDIENTE_VERIFICACION_CLO: readonly { id: string; motivo: string }[] = [];

/**
 * Casos del dictamen CLO del issue #74 que NO se agregan en este PR. Quedan
 * para un PR posterior, a la espera del dictamen CLO (Issue #78). Sólo se
 * registran sus identificadores: no son fixtures y no entran al gate.
 */
export const PARA_PR_POSTERIOR_ISSUE_78 = [
  { id: 'A1', categoria: 'ARTICULO_EXACTO' },
  { id: 'A3', categoria: 'ARTICULO_EXACTO' },
  { id: 'B2', categoria: 'VIGENCIA_VERSION' },
  { id: 'B4', categoria: 'VIGENCIA_VERSION' },
  { id: 'B5', categoria: 'VIGENCIA_VERSION' },
  { id: 'C4', categoria: 'ABSTENCION' },
  { id: 'D2', categoria: 'NOTARIAL' },
  { id: 'D3', categoria: 'NOTARIAL' },
] as const;

const uso = (inputTokens: number, outputTokens: number, latencyMs: number) => ({ usage: { inputTokens, outputTokens }, latencyMs });

/** Respuestas grabadas del modelo (sin red). Correctas para cada caso del Golden Set. */
export const RESPUESTAS_GRABADAS_G1: Readonly<Record<string, SalidaCruda>> = {
  'q-g1-01': { rawOutput: { decision: 'ABSTAIN', claims: [], abstention_reason: 'El Código del Notariado termina en el art. 94; el art. 500 no existe.' }, ...uso(900, 40, 410) },
  'q-g1-02': { rawOutput: { decision: 'ABSTAIN', claims: [], abstention_reason: 'No hay evidencia de un art. 12-BIS en el Reglamento (PCSJ-17-2012).' }, ...uso(600, 35, 380) },
  'q-g1-03': {
    rawOutput: {
      decision: 'ANSWER',
      claims: [{ claim_id: 'c1', text: 'La consulta corresponde al Código del Notariado, Decreto 353-2005 (Gaceta 30,904).', citations: [{ chunk_id: 'cn-identidad', support: 'DIRECT' }] }],
      abstention_reason: null,
    },
    ...uso(1100, 120, 620),
  },
  'q-g1-04': {
    rawOutput: {
      decision: 'ANSWER',
      claims: [{ claim_id: 'c1', text: 'El art. 173-B pertenece al CPP, adicionado por el Decreto 98-2017 (Gaceta 34,473), no al Código Penal.', citations: [{ chunk_id: 'cpp-173-b', support: 'DIRECT' }] }],
      abstention_reason: null,
    },
    ...uso(1500, 130, 700),
  },
  'q-g1-05': {
    rawOutput: {
      decision: 'ANSWER',
      claims: [
        { claim_id: 'c1', text: 'El art. 634 del Decreto 130-2017 (La Gaceta 34,940) deroga el Decreto 144-83 (Código Penal de 1983) y todas sus reformas.', citations: [{ chunk_id: 'cp-130-2017-634', support: 'DIRECT' }] },
        { claim_id: 'c2', text: 'El Decreto 130-2017 está vigente desde el 25-jun-2020, por el art. 1 del Decreto 46-2020 (La Gaceta 35,247), que reforma el art. 635.', citations: [{ chunk_id: 'd46-2020-1', support: 'DIRECT' }] },
      ],
      abstention_reason: null,
    },
    ...uso(1400, 150, 680),
  },
  'q-g1-06': {
    rawOutput: {
      decision: 'ANSWER',
      claims: [{ claim_id: 'c1', text: 'El D.57-2020 fue derogado por el D.43-2023 (Gaceta 36,290) y no revive.', citations: [{ chunk_id: 'd43-2023', support: 'DIRECT' }, { chunk_id: 'd57-2020', support: 'INDIRECT' }] }],
      abstention_reason: null,
    },
    ...uso(1300, 110, 650),
  },
  'q-g1-07': {
    rawOutput: {
      decision: 'ANSWER',
      claims: [{ claim_id: 'c1', text: 'El art. 214 del Código Tributario (D.170-2016, Gaceta 34,224) deroga el D.22-97.', citations: [{ chunk_id: 'ct-214', support: 'DIRECT' }] }],
      abstention_reason: null,
    },
    ...uso(1000, 90, 540),
  },
  'q-g1-08': { rawOutput: { decision: 'ABSTAIN', claims: [], abstention_reason: 'La única evidencia es CONTEXT (REFORMA_NO_VINCULADA); no hay texto PRIMARY.' }, ...uso(700, 45, 400) },
};
