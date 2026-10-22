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

const SINTETICO = 'FIXTURE SINTÉTICA: no es el texto legal oficial.';

const chunk = (c: Omit<EvidenceChunk, 'texto'>): EvidenceChunk => ({ ...c, texto: `${SINTETICO} ${c.instrumento} art. ${c.articulo ?? '-'}` });

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

export const GOLDEN_G1: readonly GoldenCase[] = [
  {
    id: 'G1-ABS-NOTARIADO-ART-500',
    estado: 'VERIFICADO',
    categoria: 'ABSTENCION',
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
    referenciaCLO:
      'Código Penal D.130-2017 (Gaceta 34,940): vigente desde el 25-jun-2020 por el D.46-2020 (Gaceta 35,247); su art. 634 deroga el D.144-83.',
    input: {
      queryId: 'q-g1-05',
      sanitizedQuestion: '¿Desde cuándo rige el Código Penal D.130-2017 y qué decreto deroga?',
      evidence: [
        chunk({ chunk_id: 'cp-634', instrumento: 'CODIGO_PENAL', articulo: '634', gaceta: '34,940', rol: 'PRIMARY' }),
        chunk({ chunk_id: 'd46-2020', instrumento: 'DECRETO_46_2020', articulo: null, gaceta: '35,247', rol: 'PRIMARY' }),
      ],
      productionOutcome: { decision: 'ANSWER', retrievalState: 'EXACT_SUCCESS' },
    },
    esperado: { decision: 'ANSWER', articulo: { instrumento: 'CODIGO_PENAL', articulo: '634' } },
  },
  {
    id: 'G1-VIG-D57-2020-SIN-REVIVISCENCIA',
    estado: 'VERIFICADO',
    categoria: 'VIGENCIA_VERSION',
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
    referenciaCLO: 'REFORMA sin instrumento modificador vinculado: nunca PRIMARY (REFORMA_NO_VINCULADA, CONTEXT). Sin evidencia PRIMARY, se abstiene.',
    input: {
      queryId: 'q-g1-08',
      sanitizedQuestion: '¿Cuál es el texto vigente de la unidad reformada?',
      evidence: [{ chunk_id: 'reforma-sin-instrumento', instrumento: 'SINT_G1', articulo: '1', gaceta: null, rol: ROL_REFORMA_SIN_INSTRUMENTO, texto: SINTETICO }],
      productionOutcome: { decision: 'ABSTAIN', retrievalState: 'EXACT_SUCCESS' },
    },
    esperado: { decision: 'ABSTAIN' },
  },
];

/** Hipótesis del CLO aún no verificadas (marcadas NV en #74). No son fixtures ni entran al gate. */
export const CASOS_PENDIENTES_CLO = [
  'E1 (NV): fecha y vigencia del Código Civil de 1906',
  'E2 (NV): sustitución de la Ley Electoral D.44-2004 por el D.35-2021',
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
        { claim_id: 'c1', text: 'El Código Penal D.130-2017 rige desde el 25-jun-2020 por el D.46-2020.', citations: [{ chunk_id: 'd46-2020', support: 'DIRECT' }] },
        { claim_id: 'c2', text: 'Su art. 634 deroga el D.144-83.', citations: [{ chunk_id: 'cp-634', support: 'DIRECT' }] },
      ],
      abstention_reason: null,
    },
    ...uso(1800, 160, 820),
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
