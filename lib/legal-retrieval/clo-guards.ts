/**
 * lib/legal-retrieval/clo-guards.ts
 * Salvaguardas CLO de recuperación (24-oct-2026). Módulo puro: sin red, base de datos ni entorno.
 *
 * Decide qué papel puede jugar un fragmento recuperado: PRIMARY (fundamento citable) o CONTEXT (referencia con aviso). La evidencia es
 * SUFICIENTE solo si hay al menos un PRIMARY; un fragmento CONTEXT nunca basta por sí solo.
 *
 * Diseño fail-closed: PRIMARY es la excepción y exige TODO lo siguiente; cualquier dato ausente, ambiguo o inesperado da CONTEXT.
 *  - instrument_id de una lista CERRADA, derivado de la fuente real (patrones anclados) o de metadatos con valores exactos; nunca de la
 *    materia ni de un campo que venga en la carga. Los campos `instrument_id`, `rol_evidencia`, `bloqueos_clo` y `avisos_clo` de un
 *    fragmento entrante se IGNORAN: la clasificación siempre se recalcula.
 *  - fuente_tipo normativo conocido (codigo, ley, norma, decreto, reglamento, constitucion) y país HN.
 *  - ningún bloqueo: (b) sentencias/doctrina; (c) artículos del Código del Notariado D.353-2005 bloqueados; (d) instrumentos sin pliego CLO
 *    (Reglamento PCSJ-17-2012) o sin cotejo (D.77-2006); (e) protocolo y práctica 03_NOTARIAL y capa documental.
 * Los campos `materia`, `instrumento_solicitado` y `coleccion_origen` que sella la ruta solo pueden AGREGAR bloqueos, nunca quitarlos: las señales de
 * materia/colección se UNEN (fila, consulta y metadatos); si CUALQUIERA es 03_NOTARIAL o capa documental, bloquea, y una carga externa no puede quitarlo.
 * Política de país (CLO 28-oct-2026, Anexo 2 — reemplaza la del 24-oct): la jurisdicción se NORMALIZA ('hn', 'HN', 'Honduras' = HN) y debe ser HN para ser
 * PRIMARY. Jurisdicción nula o vacía NO es HN: nunca PRIMARY. País explícito distinto de HN → conflicto → CONTEXT.
 * Significado de es_norma_vigente (CLO 28-oct-2026, Anexo 1.8): TRUE = elegible como fundamento; FALSE = excluido; NULL (o ausente) = solo CONTEXT.
 * Rol y norma desplazada declarados en la metadata de la fila (`rol`, `desplazado_por`, `elegible_primary`) solo pueden DEGRADAR a CONTEXT, en todas las rutas.
 *
 * Quitar un bloqueo es una decisión del CLO, no un ajuste de código.
 */
import type { FragmentoRAG } from './types';
import type { InstrumentoNormalizado } from './instrument-identity';

export type RolEvidencia = 'PRIMARY' | 'CONTEXT';
export type TipoFuenteClo = 'NORMA' | 'JURISPRUDENCIA' | 'DOCTRINA' | 'PRACTICA_NOTARIAL' | 'DOCUMENTAL';

/** Identificadores de instrumento: los del Exact Resolver más dos instrumentos presentes en el corpus que el resolver no modela. */
export type InstrumentId = InstrumentoNormalizado | 'LEY_ESPECIAL_ADOPCIONES' | 'DECRETO_77_2006';

/** Lista cerrada de instrument_id válidos. Cualquier otro valor ('', 'UNKNOWN', 'null', texto libre) no identifica nada. */
export const INSTRUMENT_IDS: readonly InstrumentId[] = Object.freeze([
  'CODIGO_PROCESAL_PENAL', 'CODIGO_PENAL', 'CODIGO_PROCESAL_CIVIL', 'CODIGO_CIVIL', 'CODIGO_TRABAJO', 'CODIGO_FAMILIA', 'CODIGO_NOTARIADO',
  'REGLAMENTO_NOTARIADO', 'CODIGO_TRIBUTARIO', 'LEY_JUSTICIA_CONSTITUCIONAL', 'CONSTITUCION', 'CODIGO_COMERCIO', 'LEY_ESPECIAL_ADOPCIONES',
  'DECRETO_77_2006',
] as const);

export const esInstrumentId = (v: unknown): v is InstrumentId => typeof v === 'string' && (INSTRUMENT_IDS as readonly string[]).includes(v);

export type CodigoBloqueoClo =
  | 'SIN_INSTRUMENT_ID'
  | 'FUENTE_TIPO_NO_VERIFICADO'
  | 'JURISDICCION_NO_HONDURENA'
  | 'SENTENCIA_NO_ES_NORMA'
  | 'SENTENCIA_NO_HONDURENA'
  | 'DOCTRINA_NO_ES_NORMA'
  | 'NOTARIADO_HUECO'
  | 'NOTARIADO_TEXTO_DIVERGENTE'
  | 'NOTARIADO_SOLO_CONTEXT_CLO'
  | 'NOTARIADO_ARTICULO_NO_VERIFICABLE'
  | 'INSTRUMENTO_SIN_PLIEGO_CLO'
  | 'INSTRUMENTO_TEXTO_NO_COTEJADO'
  | 'PRACTICA_NOTARIAL_NO_NORMA'
  | 'CAPA_DOCUMENTAL_NO_NORMA'
  | 'INSTRUMENTO_DISTINTO_DEL_SOLICITADO'
  | 'JURISDICCION_NO_ACREDITADA'
  | 'VIGENCIA_FALSE_EXCLUIDA'
  | 'VIGENCIA_NO_ACREDITADA'
  | 'ROL_DECLARADO_CONTEXT'
  | 'NORMA_DESPLAZADA'
  | 'MATERIA_NO_VERIFICADA'
  | 'CORPUS_P21_APAGADO'
  | 'FUENTE_EXTERNA_NO_NORMA';

export const MATERIA_NOTARIAL = '03_NOTARIAL';
export const COLECCION_DOCUMENTAL = 'mayalex_instrumentos';

/** Artículos del Código del Notariado D.353-2005 bloqueados como PRIMARY, con su causa. */
export const NOTARIADO_ARTICULOS_BLOQUEADOS: Readonly<Record<string, CodigoBloqueoClo>> = Object.freeze({
  '17': 'NOTARIADO_HUECO',
  '11': 'NOTARIADO_TEXTO_DIVERGENTE',
  '27': 'NOTARIADO_TEXTO_DIVERGENTE',
  // Decisión CLO 24-oct-2026: solo CONTEXT, nunca PRIMARY.
  '72': 'NOTARIADO_SOLO_CONTEXT_CLO',
  // CLO 28-oct-2026 (adjudicación P21): el 72-A es un artículo propio, solo CONTEXT.
  '72-A': 'NOTARIADO_SOLO_CONTEXT_CLO',
  '73': 'NOTARIADO_SOLO_CONTEXT_CLO',
  '84': 'NOTARIADO_SOLO_CONTEXT_CLO',
  '87': 'NOTARIADO_SOLO_CONTEXT_CLO',
  '93': 'NOTARIADO_SOLO_CONTEXT_CLO',
});

/** Instrumentos que solo pueden ser CONTEXT, con su causa. */
export const INSTRUMENTOS_SOLO_CONTEXT: Readonly<Partial<Record<InstrumentId, CodigoBloqueoClo>>> = Object.freeze({
  /** Resolución PCSJ-17-2012 (Gaceta 32,958): hasta que haya pliego CLO. */
  REGLAMENTO_NOTARIADO: 'INSTRUMENTO_SIN_PLIEGO_CLO',
  /** D.77-2006: texto no cotejado (Gaceta 31,091 NO_OBTENIDA). Decisión CLO 24-oct-2026. */
  DECRETO_77_2006: 'INSTRUMENTO_TEXTO_NO_COTEJADO',
});

/** Instrumentos normativos notariales: las filas 03_NOTARIAL con otra identidad (protocolo y práctica) no son norma. */
const INSTRUMENTOS_NORMATIVOS_NOTARIALES: ReadonlySet<InstrumentId> = new Set<InstrumentId>(['CODIGO_NOTARIADO', 'REGLAMENTO_NOTARIADO', 'DECRETO_77_2006']);

/** fuente_tipo de una norma. Todo lo demás (incluido null o vacío) no se acredita como norma. */
const TIPOS_FUENTE_NORMATIVOS: ReadonlySet<string> = new Set(['codigo', 'ley', 'norma', 'decreto', 'reglamento', 'constitucion']);

const AVISOS: Readonly<Record<CodigoBloqueoClo, string>> = Object.freeze({
  SIN_INSTRUMENT_ID: 'Fragmento sin instrumento identificado: solo contexto; no es fundamento ni se cita como norma.',
  FUENTE_TIPO_NO_VERIFICADO: 'Tipo de fuente ausente o no reconocido como norma: solo contexto; no se cita como norma.',
  JURISDICCION_NO_HONDURENA: 'Fuente de otro país o sin país declarado: NO es derecho de Honduras; solo contexto.',
  SENTENCIA_NO_ES_NORMA: 'Sentencia: jurisprudencia, no legislación. No se presenta como norma.',
  SENTENCIA_NO_HONDURENA: 'Sentencia no hondureña: jurisprudencia extranjera o internacional; NO es derecho de Honduras.',
  DOCTRINA_NO_ES_NORMA: 'Doctrina o comentario: no vinculante, no es norma.',
  NOTARIADO_HUECO: 'Código del Notariado D.353-2005, art. 17: HUECO en el corpus; no se usa como fundamento hasta la verificación del CLO.',
  NOTARIADO_TEXTO_DIVERGENTE:
    'Código del Notariado D.353-2005: TEXTO_DIVERGENTE respecto del texto del D.77-2006 (Gaceta 31,091), no cotejado; no se usa como fundamento hasta la verificación del CLO.',
  NOTARIADO_SOLO_CONTEXT_CLO: 'Código del Notariado D.353-2005: artículo que por decisión del CLO (24-oct-2026) solo se usa como contexto, nunca como fundamento.',
  NOTARIADO_ARTICULO_NO_VERIFICABLE: 'Código del Notariado D.353-2005: el número de artículo falta o no es verificable; solo contexto.',
  INSTRUMENTO_SIN_PLIEGO_CLO: 'Instrumento sin pliego de verificación CLO: solo contexto hasta que el CLO lo apruebe.',
  INSTRUMENTO_TEXTO_NO_COTEJADO: 'Decreto 77-2006: texto no cotejado (Gaceta 31,091 no obtenida); solo contexto, nunca fundamento.',
  PRACTICA_NOTARIAL_NO_NORMA: 'Material de protocolo y práctica notarial (03_NOTARIAL): no es norma y nunca se cita como tal.',
  CAPA_DOCUMENTAL_NO_NORMA: 'Capa documental del corpus (documentos, no instrumentos normativos): no es norma y nunca se cita como tal.',
  INSTRUMENTO_DISTINTO_DEL_SOLICITADO: 'La fuente real de la fila es otro instrumento distinto del solicitado: solo contexto, no es el artículo pedido.',
  JURISDICCION_NO_ACREDITADA: 'Jurisdicción ausente: no se acredita que sea derecho de Honduras; solo contexto, nunca fundamento.',
  VIGENCIA_FALSE_EXCLUIDA: 'NORMA NO VIGENTE, NO CITAR: marcada como no vigente o excluida (es_norma_vigente=FALSE); no se usa como fundamento ni se cita como vigente.',
  VIGENCIA_NO_ACREDITADA: 'Vigencia no acreditada (es_norma_vigente nulo o ausente): solo contexto; no se afirma que sea el texto vigente.',
  ROL_DECLARADO_CONTEXT: 'La fila declara en su metadata que solo es contexto: nunca fundamento.',
  NORMA_DESPLAZADA: 'Norma desplazada por otra posterior: solo contexto; no es el texto vigente.',
  MATERIA_NO_VERIFICADA: 'Instrumento notarial sin materia verificada por la ruta: no se acredita que sea norma; solo contexto.',
  CORPUS_P21_APAGADO: 'Corpus P21 desactivado (flag_corpus_p21 apagado): solo contexto, nunca fundamento.',
  FUENTE_EXTERNA_NO_NORMA: 'Contenido externo (web o plantilla): no es el corpus normativo; solo contexto, nunca fundamento.',
});

/** Campos mínimos de un fragmento (FragmentoRAG o una fila de la base con `materia` y `metadata`). */
export type FragmentoClasificable = Pick<FragmentoRAG, 'fuente' | 'fuente_tipo' | 'jurisdiccion'> &
  Partial<Pick<FragmentoRAG, 'num_articulo' | 'materia' | 'instrumento_solicitado' | 'coleccion_origen' | 'documento_origen' | 'norm_id' | 'es_norma_vigente' | 'id' | 'metadata_clo' | 'corpus_p21_habilitado'>> & { metadata?: Record<string, unknown> | null };

export interface ContextoClasificacion {
  /** Materia conocida de la consulta/fila cuando el fragmento no la trae (p. ej. filtro de materia de la RPC semántica). */
  materia?: string | null;
  /** Colección consultada. */
  coleccion?: string | null;
  /** Instrumento que pidió la consulta exacta. Solo AGREGA un bloqueo si la fuente real es otro instrumento; nunca confiere identidad. */
  instrumentoSolicitado?: InstrumentId | null;
  /** flag_corpus_p21 resuelto por el llamador. Ausente = apagado: las filas P21 solo son CONTEXT. */
  corpusP21Habilitado?: boolean;
}

export interface ClasificacionClo {
  instrumentId: InstrumentId | null;
  tipoFuente: TipoFuenteClo;
  rol: RolEvidencia;
  bloqueos: CodigoBloqueoClo[];
  avisos: string[];
}

const norm = (s: unknown): string =>
  (typeof s === 'string' ? s : '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Número de artículo normalizado: "Art. 017." / "Arto. 17" / "17º" / "17°" / "N° 17" / "Artículo 17" → "17"; "123-A" / "72A" / "72-a" → "72-A" (forma canónica con guion y mayúscula).
 * Null si no hay un número reconocible (se trata como no verificable, nunca se adivina).
 */
export function normalizarNumeroArticulo(n: string | number | null | undefined): string | null {
  if (n === null || n === undefined) return null;
  let s = norm(String(n)).replace(/[º°ª]/g, '');
  for (let i = 0; i < 4; i++) {
    const antes = s;
    s = s.replace(/^[\s.,:;\-–—]*(?:articulo|arto|art|numero|num|no|n)\b[\s.:;\-–—]*/, '').replace(/^[\s.,:;\-–—]+/, '');
    if (s === antes) break;
  }
  s = s.replace(/[\s.,:;\-–—]+$/g, '').replace(/^0+(?=\d)/, '');
  const m = /^(\d{1,4})(?:-?([a-z]{1,3}))?$/.exec(s);
  return m ? (m[2] ? `${m[1]}-${m[2].toUpperCase()}` : m[1]) : null;
}

// Patrones ANCLADOS al inicio de la fuente normalizada (sin tildes, minúsculas): el nombre del instrumento debe ser lo primero que dice la
// fuente y debe terminar ahí, o seguir "de Honduras", «(» o «,». Así «Escritura de constitución de sociedad» o «Código Civil de España» no
// identifican un instrumento hondureño. Orden: lo más específico primero.
const CIERRE = '(?:\\s+de\\s+honduras)?(?=\\s*\\(|,|\\s*$)';
const FUENTES_CANONICAS: ReadonlyArray<readonly [InstrumentId, RegExp]> = [
  ['DECRETO_77_2006', /^decreto\s+(?:no\.?\s*)?77-2006\b/],
  ['REGLAMENTO_NOTARIADO', new RegExp(`^reglamento\\s+(?:(?:de|del|al|para)\\s+)?(?:el\\s+)?codigo\\s+(?:del?\\s+)?notariado${CIERRE}`)],
  ['CODIGO_NOTARIADO', new RegExp(`^codigo\\s+(?:del?\\s+)?notariado${CIERRE}`)],
  ['CODIGO_PROCESAL_PENAL', new RegExp(`^codigo\\s+procesal\\s+penal${CIERRE}`)],
  ['CODIGO_PROCESAL_CIVIL', new RegExp(`^codigo\\s+procesal\\s+civil${CIERRE}`)],
  ['CODIGO_PENAL', new RegExp(`^codigo\\s+penal${CIERRE}`)],
  ['CODIGO_CIVIL', new RegExp(`^codigo\\s+civil${CIERRE}`)],
  ['CODIGO_TRABAJO', new RegExp(`^codigo\\s+(?:del?\\s+)?trabajo${CIERRE}`)],
  ['CODIGO_FAMILIA', new RegExp(`^codigo\\s+de\\s+familia${CIERRE}`)],
  ['CODIGO_TRIBUTARIO', new RegExp(`^codigo\\s+tributario${CIERRE}`)],
  ['CODIGO_COMERCIO', new RegExp(`^codigo\\s+de\\s+comercio${CIERRE}`)],
  ['LEY_JUSTICIA_CONSTITUCIONAL', /^ley\s+(?:sobre|de)\s+justicia\s+constitucional(?=\s*\(|,|\s*$)/],
  ['CONSTITUCION', new RegExp(`^constitucion\\s+(?:politica\\s+)?de\\s+la\\s+republica${CIERRE}`)],
  ['LEY_ESPECIAL_ADOPCIONES', new RegExp(`^ley\\s+especial\\s+de\\s+adopciones${CIERRE}`)],
];

/** metadata.norm_id con valores EXACTOS conocidos (sin patrones). Cualquier otro valor no identifica nada. */
const NORM_IDS: Readonly<Record<string, InstrumentId>> = Object.freeze({
  HN_CODIGO_CIVIL_1906: 'CODIGO_CIVIL',
  HN_CODIGO_PROCESAL_CIVIL: 'CODIGO_PROCESAL_CIVIL',
  HN_CODIGO_TRABAJO: 'CODIGO_TRABAJO',
  HN_CODIGO_PENAL: 'CODIGO_PENAL',
  HN_CODIGO_PROCESAL_PENAL: 'CODIGO_PROCESAL_PENAL',
  HN_CODIGO_FAMILIA: 'CODIGO_FAMILIA',
  HN_LEY_JUSTICIA_CONSTITUCIONAL: 'LEY_JUSTICIA_CONSTITUCIONAL',
  HN_LEY_ESPECIAL_ADOPCIONES: 'LEY_ESPECIAL_ADOPCIONES',
  'mayalex_normativos:codigo_notariado_2005': 'CODIGO_NOTARIADO',
  'mayalex_normativos:reglamento_notariado_2012': 'REGLAMENTO_NOTARIADO',
  'mayalex_normativos:decreto_77_2006': 'DECRETO_77_2006',
});

function desdeFuenteCanonica(texto: unknown): InstrumentId | null {
  const t = norm(texto);
  if (!t) return null;
  for (const [id, re] of FUENTES_CANONICAS) if (re.test(t)) return id;
  return null;
}

/**
 * `instrument_id` de un fragmento: el de la fuente real (patrones anclados), o el de metadata.documento_origen, o el de metadata.norm_id
 * (valores exactos). Nunca se toma del propio fragmento ni se infiere de la materia. Siempre uno de INSTRUMENT_IDS, o null.
 */
export function instrumentIdDeFragmento(f: Pick<FragmentoClasificable, 'fuente' | 'metadata' | 'documento_origen' | 'norm_id'>): InstrumentId | null {
  const deFuente = desdeFuenteCanonica(f.fuente);
  if (deFuente) return deFuente;
  const meta = f.metadata && typeof f.metadata === 'object' ? f.metadata : null;
  const deDoc = desdeFuenteCanonica(f.documento_origen ?? meta?.documento_origen);
  if (deDoc) return deDoc;
  const normId = f.norm_id ?? meta?.norm_id;
  if (typeof normId === 'string' && Object.prototype.hasOwnProperty.call(NORM_IDS, normId)) return NORM_IDS[normId];
  return null;
}


/** País normalizado: 'HN' para HN/Honduras/HND (sin importar mayúsculas, tildes ni espacios); null si no se declara; el texto normalizado en mayúsculas si es otro. */
export function normalizarPais(v: unknown): string | null {
  const t = norm(v).toUpperCase();
  if (t === '') return null;
  return t === 'HN' || t === 'HND' || t === 'HONDURAS' || t === 'REPUBLICA DE HONDURAS' ? 'HN' : t;
}

/** Prefijos de id del corpus P21 (docs/corpus/staging/p21). Con flag_corpus_p21 apagado estas filas no se recuperan ni son PRIMARY. */
export const PREFIJOS_CORPUS_P21: readonly string[] = Object.freeze([
  'mayalex_normativos:codigo_comercio_bch_d73_50',
  'mayalex_normativos:codigo_notariado_d59_2015',
  'mayalex_normativos:decreto_284_2013_titulo_ii',
]);
export function esFilaCorpusP21(f: Pick<FragmentoClasificable, 'id' | 'norm_id' | 'metadata' | 'metadata_clo'>): boolean {
  const meta = f.metadata && typeof f.metadata === 'object' ? f.metadata : null;
  const candidatos = [f.id, f.norm_id, meta?.norm_id, f.metadata_clo?.norm_id].filter((x): x is string => typeof x === 'string');
  return candidatos.some((c) => PREFIJOS_CORPUS_P21.some((p) => c.startsWith(p))) || meta?.p21 === true || f.metadata_clo?.p21 === true;
}
/** Quita las filas P21 cuando el corpus está apagado (el llamador pasa el flag resuelto). Encendido: devuelve la lista tal cual. */
export function filtrarCorpusP21<T extends FragmentoClasificable>(fragmentos: readonly T[], habilitado: boolean | undefined): T[] {
  return habilitado === true ? [...fragmentos] : fragmentos.filter((f) => !esFilaCorpusP21(f));
}

const esMateriaNotarial = (v: unknown): boolean => norm(v).toUpperCase() === MATERIA_NOTARIAL;
const esColeccionDocumental = (v: unknown): boolean => norm(v) === COLECCION_DOCUMENTAL;
/** sub_tipo de las filas de protocolo y práctica (capa `mayalex_instrumentos`). */
const SUBTIPOS_PRACTICA: ReadonlySet<string> = new Set(['instrumento_notarial', 'autenticacion', 'poder', 'hipoteca', 'testamento', 'matrimonio_divorcio', 'compraventa']);
/** Fuente comentada, anotada o concordada: doctrina aunque venga marcada como código. */
const RE_FUENTE_DOCTRINAL = /\b(?:comentad[ao]s?|anotad[ao]s?|concordad[ao]s?)\b/;

export function clasificarFragmentoClo(f: FragmentoClasificable, ctx: ContextoClasificacion = {}): ClasificacionClo {
  const instrumentId = instrumentIdDeFragmento(f);
  const meta = f.metadata && typeof f.metadata === 'object' ? f.metadata : null;
  // Señales de materia y colección: UNIÓN de la fila, la consulta y los metadatos. Una carga externa nunca puede quitar un bloqueo.
  const senalNotarial = esMateriaNotarial(f.materia) || esMateriaNotarial(ctx.materia) || esMateriaNotarial(meta?.materia)
    || SUBTIPOS_PRACTICA.has(norm(meta?.sub_tipo)) || norm(meta?.tipo_fuente) === 'instrumento';
  const senalDocumental = esColeccionDocumental(f.coleccion_origen) || esColeccionDocumental(ctx.coleccion);
  const solicitado = (f.instrumento_solicitado ?? ctx.instrumentoSolicitado ?? null) as string | null;
  const tipo = norm(f.fuente_tipo);
  const pais = normalizarPais(f.jurisdiccion);
  const bloqueos: CodigoBloqueoClo[] = [];

  // (b) Las sentencias tienen su propio tipo de fuente, sin importar el país. Se reconocen por familia de palabras (sentencia, jurisprudencia,
  // fallo, casación…), sin distinguir mayúsculas ni tildes. Una sentencia no hondureña (o sin país) jamás es derecho de Honduras.
  const esSentencia = /sentencia|jurisprudencia|fallo|casacion|amparo|inconstitucionalidad|exhibicion personal|habeas/.test(tipo);
  // Doctrina: por tipo, o por una fuente «comentada/anotada/concordada» aunque fuente_tipo diga 'codigo'.
  const esDoctrina = !esSentencia && (/doctrina|comentario|glosa|libro|monografia/.test(tipo) || RE_FUENTE_DOCTRINAL.test(norm(f.fuente)));
  if (esSentencia) bloqueos.push(pais === 'HN' ? 'SENTENCIA_NO_ES_NORMA' : 'SENTENCIA_NO_HONDURENA');
  else if (esDoctrina) bloqueos.push('DOCTRINA_NO_ES_NORMA');

  // (e) Protocolo y práctica notarial (03_NOTARIAL) y capa documental: sin identidad normativa propia, nunca norma.
  // CLO 28-oct-2026 (Anexo 2.4): decide el TIPO de fuente, nunca el nombre. Una fila 03_NOTARIAL cuya fuente diga «Código del Notariado…» sigue
  // siendo práctica salvo que su fuente_tipo sea normativo; las señales fuertes de práctica (sub_tipo, tipo_fuente=instrumento) mandan siempre.
  const esNormativoNotarial = instrumentId !== null && INSTRUMENTOS_NORMATIVOS_NOTARIALES.has(instrumentId) && TIPOS_FUENTE_NORMATIVOS.has(tipo);
  const senalPracticaFuerte = SUBTIPOS_PRACTICA.has(norm(meta?.sub_tipo)) || norm(meta?.tipo_fuente) === 'instrumento';
  const esPracticaNotarial = !esSentencia && !esDoctrina && senalNotarial && (!esNormativoNotarial || senalPracticaFuerte);
  const esCapaDocumental = !esSentencia && !esDoctrina && !esPracticaNotarial && senalDocumental && instrumentId === null;
  if (esPracticaNotarial) bloqueos.push('PRACTICA_NOTARIAL_NO_NORMA');
  if (esCapaDocumental) bloqueos.push('CAPA_DOCUMENTAL_NO_NORMA');

  const claseNorma = !esSentencia && !esDoctrina && !esPracticaNotarial && !esCapaDocumental;
  if (claseNorma) {
    // (a) Sin instrumento identificado no hay PRIMARY.
    if (instrumentId === null) bloqueos.push('SIN_INSTRUMENT_ID');
    // Fail-closed: una norma exige un fuente_tipo normativo conocido. Null, vacío o desconocido → CONTEXT.
    if (!TIPOS_FUENTE_NORMATIVOS.has(tipo)) bloqueos.push('FUENTE_TIPO_NO_VERIFICADO');
    // Política de país (CLO 28-oct-2026): la jurisdicción normalizada debe ser HN. Nula o vacía → no acreditada (nunca PRIMARY); otro país → conflicto.
    if (pais === null) bloqueos.push('JURISDICCION_NO_ACREDITADA');
    else if (pais !== 'HN') bloqueos.push('JURISDICCION_NO_HONDURENA');
    // Significado CLO de es_norma_vigente: TRUE elegible · FALSE excluido · NULL (o ausente) solo CONTEXT.
    if (f.es_norma_vigente === false) bloqueos.push('VIGENCIA_FALSE_EXCLUIDA');
    else if (f.es_norma_vigente !== true) bloqueos.push('VIGENCIA_NO_ACREDITADA');
    // Metadata de la fila (todas las rutas): rol declarado y norma desplazada solo pueden degradar.
    const mc = { ...(meta ?? {}), ...(f.metadata_clo ?? {}) } as Record<string, unknown>;
    if ((typeof mc.rol === 'string' && mc.rol.toUpperCase() !== 'PRIMARY') || mc.elegible_primary === false) bloqueos.push('ROL_DECLARADO_CONTEXT');
    if (mc.desplazado_por !== undefined && mc.desplazado_por !== null && String(mc.desplazado_por).trim() !== '') bloqueos.push('NORMA_DESPLAZADA');
    // Instrumentos de la familia notarial exigen materia conocida por la ruta (fila o consulta). La metadata de la carga no cuenta: la RPC
    // semántica nunca devuelve materia y una carga no puede ascender la fila a PRIMARY.
    if (instrumentId !== null && INSTRUMENTOS_NORMATIVOS_NOTARIALES.has(instrumentId) && !(norm(f.materia) || norm(ctx.materia))) bloqueos.push('MATERIA_NO_VERIFICADA');
    // Gate del corpus P21: con flag_corpus_p21 apagado (o sin resolver) las filas P21 no son fundamento.
    // La bandera se toma del contexto explícito o, si no hay, de la que selló la ruta en el fragmento: un solo criterio en todos los consumidores.
    if ((ctx.corpusP21Habilitado ?? f.corpus_p21_habilitado) !== true && esFilaCorpusP21(f)) bloqueos.push('CORPUS_P21_APAGADO');
  }

  // La fuente real es otro instrumento distinto del solicitado.
  if (instrumentId !== null && solicitado && instrumentId !== solicitado) bloqueos.push('INSTRUMENTO_DISTINTO_DEL_SOLICITADO');

  // (c) Código del Notariado D.353-2005: artículos bloqueados; un número ausente o ilegible tampoco se acredita.
  if (instrumentId === 'CODIGO_NOTARIADO') {
    const numero = normalizarNumeroArticulo(f.num_articulo);
    if (numero === null) bloqueos.push('NOTARIADO_ARTICULO_NO_VERIFICABLE');
    else if (Object.prototype.hasOwnProperty.call(NOTARIADO_ARTICULOS_BLOQUEADOS, numero)) bloqueos.push(NOTARIADO_ARTICULOS_BLOQUEADOS[numero]);
  }

  // (d) Instrumentos que solo pueden ser CONTEXT (Reglamento PCSJ-17-2012 sin pliego CLO; D.77-2006 sin cotejo).
  if (instrumentId !== null) {
    const causa = INSTRUMENTOS_SOLO_CONTEXT[instrumentId];
    if (causa) bloqueos.push(causa);
  }

  const tipoFuente: TipoFuenteClo = esSentencia ? 'JURISPRUDENCIA' : esDoctrina ? 'DOCTRINA' : esPracticaNotarial ? 'PRACTICA_NOTARIAL' : esCapaDocumental ? 'DOCUMENTAL' : 'NORMA';
  return {
    instrumentId,
    tipoFuente,
    rol: bloqueos.length === 0 ? 'PRIMARY' : 'CONTEXT',
    bloqueos,
    avisos: bloqueos.map((b) => AVISOS[b]),
  };
}

/**
 * Copia cada fragmento con su clasificación (`instrument_id`, `rol_evidencia`, `bloqueos_clo`, `avisos_clo`) y sella la materia y la colección
 * conocidas. SIEMPRE recalcula: los campos de clasificación que traiga el fragmento (p. ej. de la carga de un servicio externo) se descartan.
 */
export function anotarFragmentosClo<T extends FragmentoRAG>(fragmentos: readonly T[], ctx: ContextoClasificacion = {}): T[] {
  return fragmentos.map((f) => {
    // Sellado por UNIÓN: si la fila o la consulta señalan 03_NOTARIAL o la capa documental, esa señal es la que queda.
    const materiaSellada = esMateriaNotarial(ctx.materia) ? ctx.materia : esMateriaNotarial(f.materia) ? f.materia : f.materia ?? ctx.materia ?? null;
    const coleccionSellada = esColeccionDocumental(ctx.coleccion) ? ctx.coleccion : esColeccionDocumental(f.coleccion_origen) ? f.coleccion_origen : f.coleccion_origen ?? ctx.coleccion ?? undefined;
    const sellado: T = {
      ...f,
      materia: materiaSellada ?? null,
      coleccion_origen: coleccionSellada ?? undefined,
      instrumento_solicitado: f.instrumento_solicitado ?? ctx.instrumentoSolicitado ?? undefined,
      corpus_p21_habilitado: (ctx.corpusP21Habilitado ?? f.corpus_p21_habilitado) === true,
    };
    const c = clasificarFragmentoClo(sellado, { corpusP21Habilitado: ctx.corpusP21Habilitado });
    return { ...sellado, instrument_id: c.instrumentId, rol_evidencia: c.rol, bloqueos_clo: c.bloqueos, avisos_clo: c.avisos };
  });
}

/**
 * R3 — SUFICIENCIA (texto oficial del CLO, 29-oct-2026):
 *   «Hay suficiencia solo si existe al menos una cita DIRECT validada a un fragmento con rol PRIMARY y es_norma_vigente = TRUE, del mismo
 *   instrumento y del mismo artículo consultados. Un conteo de PRIMARY no basta. Si no hay esa cita, hay abstención. NULL = solo CONTEXT;
 *   FALSE = excluido, rotulado "NORMA NO VIGENTE, NO CITAR".»
 * Complemento: la cita DIRECT debe respaldar la afirmación CONCRETA que hace la respuesta. No se impone un mínimo de fragmentos.
 *
 * Dos niveles, ambos aquí (clasificador compartido):
 *  1. Recuperación (`resumenEvidenciaClo`): condición NECESARIA. Existe un fragmento PRIMARY con vigencia TRUE que además coincide con el
 *     instrumento y el artículo consultados (si la consulta los nombra). Un PRIMARY de otro artículo o instrumento no cuenta.
 *  2. Respuesta (`evaluarSuficienciaR3`): condición COMPLETA. Una afirmación de la respuesta con cita DIRECT a un fragmento que cumple (1) y
 *     cuyo contenido respalda lo que la afirmación dice (cifras, artículos y términos propios de la afirmación aparecen en el fragmento).
 * Consulta temática (no nombra instrumento ni artículo): no hay objetivo que comparar; rigen PRIMARY + TRUE y la cita DIRECT que respalda.
 */
export interface ObjetivoConsulta {
  /** Instrumento consultado, si la consulta lo nombra. */
  instrumentId: InstrumentId | null;
  /** Artículo consultado (normalizado), si la consulta lo nombra. */
  articulo: string | null;
}

/**
 * ¿El fragmento cumple la parte de fragmento de R3? PRIMARY + es_norma_vigente=TRUE + instrumento Y artículo IDENTIFICADOS + mismo instrumento y
 * artículo consultados.
 *  - A-1 (auditoría): un PRIMARY+TRUE sin número de artículo (o sin instrumento) NUNCA da suficiencia, aunque la consulta no nombre artículo.
 *  - BAJO (auditoría): si la consulta nombra un artículo pero su instrumento no se resolvió, el número de artículo no basta para hacer match.
 */
export function fragmentoCumpleR3(f: FragmentoRAG, objetivos: readonly ObjetivoConsulta[] = [], ctx: ContextoClasificacion = {}): boolean {
  if (f.es_norma_vigente !== true) return false;
  if (clasificarFragmentoClo(f, ctx).rol !== 'PRIMARY') return false;
  const id = instrumentIdDeFragmento(f);
  const art = normalizarNumeroArticulo(f.num_articulo);
  if (id === null || art === null) return false;
  if (objetivos.length === 0) return true;
  return objetivos.some((o) => {
    if (o.articulo !== null && o.instrumentId === null) return false;                 // BAJO: artículo sin instrumento resuelto → no hay match
    return (o.instrumentId === null || o.instrumentId === id) && (o.articulo === null || normalizarNumeroArticulo(o.articulo) === art);
  });
}

export interface ResumenEvidenciaClo {
  primarios: number;
  contexto: number;
  /**
   * R3 a nivel de recuperación (condición NECESARIA): true solo si algún fragmento cumple `fragmentoCumpleR3`. NO es un conteo de PRIMARY:
   * un PRIMARY de otro artículo o instrumento, o con vigencia nula, no basta. La suficiencia completa la da `evaluarSuficienciaR3`.
   */
  suficiente: boolean;
  bloqueos: CodigoBloqueoClo[];
}

/** Cuenta PRIMARY y CONTEXT recalculando la clasificación: nunca confía en un `rol_evidencia` que venga en el fragmento. */
export function resumenEvidenciaClo(fragmentos: readonly FragmentoRAG[], ctx: ContextoClasificacion = {}, objetivos: readonly ObjetivoConsulta[] = []): ResumenEvidenciaClo {
  let primarios = 0;
  let cumple = false;
  const bloqueos = new Set<CodigoBloqueoClo>();
  for (const f of fragmentos) {
    const c = clasificarFragmentoClo(f, ctx);
    if (c.rol === 'PRIMARY') primarios += 1;
    for (const b of c.bloqueos) bloqueos.add(b);
    if (!cumple && fragmentoCumpleR3(f, objetivos, ctx)) cumple = true;
  }
  return { primarios, contexto: fragmentos.length - primarios, suficiente: cumple, bloqueos: [...bloqueos] };
}

// ── Respaldo de la afirmación concreta ──────────────────────────────────────────────────────────────────────────────────────────────────
const PALABRAS_NUMERO: Readonly<Record<string, string>> = Object.freeze({
  dos: '2', tres: '3', cuatro: '4', cinco: '5', seis: '6', siete: '7', ocho: '8', nueve: '9', diez: '10', quince: '15', veinte: '20',
  treinta: '30', cuarenta: '40', cincuenta: '50', sesenta: '60', noventa: '90', cien: '100', ciento: '100',
});
const VACIAS = new Set([
  'sobre', 'entre', 'cuando', 'donde', 'segun', 'ademas', 'tambien', 'dicho', 'dicha', 'dichos', 'dichas', 'este', 'esta', 'estos', 'estas', 'cual', 'cuales', 'puede',
  'pueden', 'debe', 'deben', 'ser', 'sera', 'seran', 'tiene', 'tienen', 'hacer', 'haber', 'hasta', 'desde', 'para', 'porque', 'mediante', 'durante', 'dentro', 'misma',
  'mismo', 'otros', 'otras', 'cada', 'todo', 'toda', 'todos', 'todas', 'norma', 'normas', 'articulo', 'articulos', 'codigo', 'ley', 'establece', 'dispone', 'regula',
  'prevé', 'preve', 'señala', 'senala', 'indica', 'conforme', 'respecto', 'caso', 'casos', 'derecho', 'general', 'honduras', 'hondureno', 'hondurena',
]);
const UMBRAL_TERMINOS = 0.5;

/**
 * ¿El contenido del fragmento respalda la afirmación concreta? Comprobación determinista y conservadora (ante la duda, NO respalda):
 *  - toda cifra de la afirmación (dígitos o número en palabras) aparece en el fragmento;
 *  - todo «artículo N» que cite la afirmación es el del fragmento o figura en su texto;
 *  - al menos la mitad de los términos propios de la afirmación (≥ 5 letras, sin vacías) tienen su raíz (5 letras) en el fragmento.
 * No sustituye la lectura jurídica: es la barrera mínima para que una cita DIRECT no avale una afirmación que el texto no dice.
 */
export function afirmacionRespaldadaPorFragmento(afirmacion: string, f: Pick<FragmentoRAG, 'contenido' | 'num_articulo'>): boolean {
  const a = norm(afirmacion);
  const t = norm(f.contenido);
  if (a === '' || t === '') return false;
  const artFragmento = normalizarNumeroArticulo(f.num_articulo);

  // Referencias «artículo N» de la afirmación.
  for (const m of a.matchAll(/\bart(?:iculo|\.)?\s*(\d+(?:-?[a-z])?)\b/g)) {
    const n = normalizarNumeroArticulo(m[1]);
    if (n === null) return false;
    if (n !== artFragmento && !new RegExp(`(?<![\\d])${n.replace('-', '-?')}(?![\\d])`, 'i').test(t)) return false;
  }
  // Cifras: dígitos (fuera de las referencias a artículo) y números en palabras.
  const sinRefs = a.replace(/\bart(?:iculo|\.)?\s*\d+(?:-?[a-z])?\b/g, ' ');
  for (const m of sinRefs.matchAll(/\d+/g)) {
    if (!new RegExp(`(?<!\\d)${m[0]}(?!\\d)`).test(t)) return false;
  }
  for (const m of sinRefs.matchAll(/[a-zñ]+/g)) {
    const dig = PALABRAS_NUMERO[m[0]];
    if (dig && !new RegExp(`\\b${m[0]}\\b|(?<!\\d)${dig}(?!\\d)`).test(t)) return false;
  }
  // Términos propios.
  const terminos = [...new Set([...sinRefs.matchAll(/[a-zñ]{5,}/g)].map((m) => m[0]).filter((w) => !VACIAS.has(w) && !(w in PALABRAS_NUMERO)))];
  if (terminos.length === 0) return true;
  const presentes = terminos.filter((w) => t.includes(w.slice(0, 5))).length;
  return presentes / terminos.length >= UMBRAL_TERMINOS;
}

export interface AfirmacionCitada {
  claim_id: string;
  texto: string;
  citas: readonly { fragmentoId: string; soporte: 'DIRECT' | 'INDIRECT' }[];
}

export type MotivoR3 = 'OK' | 'SIN_AFIRMACIONES' | 'SIN_CITA_DIRECT' | 'SIN_PRIMARY_VIGENTE' | 'OTRO_INSTRUMENTO_O_ARTICULO' | 'AFIRMACION_NO_RESPALDADA' | 'RESPUESTA_NO_NOMBRA_FUENTE' | 'MENCION_NO_VALIDADA' | 'SIN_FRAGMENTOS_PARA_NORMA';

export interface ResultadoR3 {
  suficiente: boolean;
  motivo: MotivoR3;
  /** Afirmaciones que cumplen R3 y los fragmentos que las respaldan. Solo estas pueden mostrarse y citarse. */
  afirmacionesValidas: { claim_id: string; fragmentoIds: string[] }[];
}

// ── La respuesta debe NOMBRAR el instrumento y el artículo que cita ────────────────────────────────────────────────────────────────────
const ALIAS_INSTRUMENTO: Readonly<Record<InstrumentId, readonly string[]>> = Object.freeze({
  CODIGO_PROCESAL_PENAL: ['codigo procesal penal', 'cpp'],
  CODIGO_PENAL: ['codigo penal', 'cp'],
  CODIGO_PROCESAL_CIVIL: ['codigo procesal civil', 'cpc'],
  CODIGO_CIVIL: ['codigo civil', 'cc'],
  CODIGO_TRABAJO: ['codigo de trabajo', 'codigo del trabajo', 'ct'],
  CODIGO_FAMILIA: ['codigo de familia'],
  CODIGO_NOTARIADO: ['codigo del notariado', 'codigo de notariado', 'decreto 353-2005', 'decreto no. 353-2005'],
  REGLAMENTO_NOTARIADO: ['reglamento del codigo del notariado', 'reglamento al codigo del notariado', 'reglamento del notariado'],
  CODIGO_TRIBUTARIO: ['codigo tributario'],
  LEY_JUSTICIA_CONSTITUCIONAL: ['ley sobre justicia constitucional', 'ley de justicia constitucional', 'ljc'],
  CONSTITUCION: ['constitucion de la republica', 'constitucion politica', 'constitucion'],
  CODIGO_COMERCIO: ['codigo de comercio'],
  LEY_ESPECIAL_ADOPCIONES: ['ley especial de adopciones'],
  DECRETO_77_2006: ['77-2006'],
});
const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** ¿El texto nombra el instrumento del fragmento? (alias exactos con fronteras de palabra; las siglas no se confunden con subcadenas). */
export function textoNombraInstrumento(texto: string, id: InstrumentId): boolean {
  const t = norm(texto);
  return ALIAS_INSTRUMENTO[id].some((a) => new RegExp(`(?<![a-z0-9])${escapar(a)}(?![a-z0-9])`).test(t));
}

/** ¿El texto nombra el artículo (normalizado, p. ej. «72-A») del fragmento? Acepta «art. 173», «artículo 173», «arts. 10 y 173». */
export function textoNombraArticulo(texto: string, articulo: string): boolean {
  const n = normalizarNumeroArticulo(articulo);
  if (n === null) return false;
  const [num, letra] = n.split('-');
  const num0 = `0*${num}`;
  const suf = letra ? `-?${letra.toLowerCase()}` : '(?![a-z0-9])(?!-[a-z])';
  return new RegExp(`\\bart(?:iculos?|s?\\.?)\\s*[^.;\\n]{0,40}?(?<![\\d])${num0}${suf}(?![\\d])`, 'i').test(norm(texto));
}

/** La respuesta nombra el instrumento Y el artículo de la fuente que cita. */
export function respuestaNombraFuente(texto: string, f: FragmentoRAG): boolean {
  const id = instrumentIdDeFragmento(f);
  return id !== null && f.num_articulo !== null && textoNombraInstrumento(texto, id) && textoNombraArticulo(texto, f.num_articulo);
}

/**
 * R3 completa sobre una respuesta. Cada afirmación vale solo si tiene una cita DIRECT a un fragmento que cumple `fragmentoCumpleR3`, que respalda
 * la afirmación concreta y cuyo instrumento y artículo NOMBRA la respuesta (`textoRespuesta`, obligatorio: no hay ruta que lo omita). Sin ninguna
 * afirmación válida: abstención (`suficiente=false`). No impone un mínimo de fragmentos.
 */
export function evaluarSuficienciaR3(
  fragmentos: readonly FragmentoRAG[],
  afirmaciones: readonly AfirmacionCitada[],
  objetivos: readonly ObjetivoConsulta[],
  ctx: ContextoClasificacion,
  textoRespuesta: string,
): ResultadoR3 {
  if (afirmaciones.length === 0) return { suficiente: false, motivo: 'SIN_AFIRMACIONES', afirmacionesValidas: [] };
  const porId = new Map<string, FragmentoRAG>();
  for (const f of fragmentos) if (typeof f.id === 'string' && !porId.has(f.id)) porId.set(f.id, f);
  const validas: ResultadoR3['afirmacionesValidas'] = [];
  let hayDirect = false, hayVigentePrimary = false, hayMismoObjetivo = false, hayRespaldo = false;
  for (const a of afirmaciones) {
    const ids: string[] = [];
    for (const c of a.citas) {
      if (c.soporte !== 'DIRECT') continue;
      hayDirect = true;
      const f = porId.get(c.fragmentoId);
      if (!f) continue;
      if (f.es_norma_vigente !== true || clasificarFragmentoClo(f, ctx).rol !== 'PRIMARY') continue;
      hayVigentePrimary = true;
      if (!fragmentoCumpleR3(f, objetivos, ctx)) continue;
      hayMismoObjetivo = true;
      if (!afirmacionRespaldadaPorFragmento(a.texto, f)) continue;
      hayRespaldo = true;
      if (respuestaNombraFuente(textoRespuesta, f)) ids.push(c.fragmentoId);
    }
    if (ids.length > 0) validas.push({ claim_id: a.claim_id, fragmentoIds: [...new Set(ids)] });
  }
  if (validas.length > 0) return { suficiente: true, motivo: 'OK', afirmacionesValidas: validas };
  const motivo: MotivoR3 = !hayDirect ? 'SIN_CITA_DIRECT' : !hayVigentePrimary ? 'SIN_PRIMARY_VIGENTE' : !hayMismoObjetivo ? 'OTRO_INSTRUMENTO_O_ARTICULO' : !hayRespaldo ? 'AFIRMACION_NO_RESPALDADA' : 'RESPUESTA_NO_NOMBRA_FUENTE';
  return { suficiente: false, motivo, afirmacionesValidas: [] };
}

/** Qué falta, por motivo de abstención (un solo texto para Luna y para el chat principal). */
export const FALTANTE_R3: Readonly<Record<MotivoR3, string>> = Object.freeze({
  OK: '',
  SIN_AFIRMACIONES: 'la respuesta no contiene afirmaciones con fundamento',
  SIN_CITA_DIRECT: 'ninguna afirmación tiene una cita directa al texto de la norma',
  SIN_PRIMARY_VIGENTE: 'la cita no corresponde a una norma con vigencia acreditada y con instrumento y artículo identificados',
  OTRO_INSTRUMENTO_O_ARTICULO: 'la cita no corresponde al mismo instrumento y artículo consultados',
  AFIRMACION_NO_RESPALDADA: 'el texto citado no respalda lo que afirma la respuesta',
  RESPUESTA_NO_NOMBRA_FUENTE: 'la respuesta no nombra el instrumento y el artículo en que se funda',
  MENCION_NO_VALIDADA: 'la respuesta menciona un artículo o un instrumento que no está respaldado por ningún fragmento recuperado del corpus',
  SIN_FRAGMENTOS_PARA_NORMA: 'la respuesta se refiere a una norma concreta, pero esta consulta no recuperó ningún fragmento del corpus que la respalde',
});

export function mensajeAbstencionR3(motivo: MotivoR3): string {
  return `MayaLex no cuenta con evidencia verificable suficiente para responder con fundamento esta consulta.\n\nLo que falta para poder responder: ${FALTANTE_R3[motivo] || 'una cita directa a norma vigente del instrumento y artículo consultados'}.`;
}

// ── R4: ninguna mención sin respaldo ────────────────────────────────────────────────────────────────────────────────────────────────
// R4 (CLO 29-oct, re-auditoría): además de R3, TODO artículo o instrumento que el texto mencione debe estar validado contra un fragmento recuperado
// elegible (PRIMARY, vigente TRUE, instrumento y artículo identificados). Una sola mención sin respaldo («el artículo 999 del Código Penal establece la
// pena de muerte» cuando no se recuperó) hace que la respuesta COMPLETA se abstenga. Lo que se entrega son solo las oraciones validadas por R3.
const MENCION_ARTICULOS = /\bart(?:iculos?|s?\.?)\s*((?:\d+(?:-?[a-z])?(?![a-z0-9]))(?:\s*(?:,|y|e|al|a|-)\s*\d+(?:-?[a-z])?(?![a-z0-9]))*)/g;
// Nombres de instrumentos que NO están en la tabla de alias (se detectan sobre el texto original, con mayúscula inicial del nombre propio).
const NOMBRE_PROPIO = String.raw`(?:\s+(?:(?:de|del|la|las|los|el|y)\s+){0,2}[A-ZÁÉÍÓÚÑ]\w*)+`;
const INSTRUMENTO_GENERICO = new RegExp(
  String.raw`\b(?:Ley|Decreto|Reglamento|Convenci[oó]n|Tratado|Pacto|Acuerdo|Resoluci[oó]n|Estatuto)(?:\s+(?:No\.?|N[úu]m\.?|N[°º]))?(?:\s+\d[\d-]*|${NOMBRE_PROPIO})|\bC[oó]digo${NOMBRE_PROPIO}`,
  'g',
);
const CONTENIDO_DE_NORMA = /\b(?:la|el|las|los)\s+(?:ley|leyes|codigo|codigos|norma|normas|constitucion|reglamento|reglamentos|legislacion|ordenamiento)\b[^.;\n]{0,60}\b(?:establece|establecen|dispone|disponen|senala|senalan|prescribe|prescriben|determina|determinan|regula|regulan|preve|prevén|estipula|ordena|exige|exigen|sanciona|castiga|prohibe|permite|obliga)\b/;

function articulosMencionados(texto: string): string[] {
  const t = norm(texto);
  const out: string[] = [];
  for (const m of t.matchAll(MENCION_ARTICULOS)) {
    for (const n of m[1].matchAll(/\d+(?:-?[a-z])?(?![a-z0-9])/g)) {
      const a = normalizarNumeroArticulo(n[0]);
      if (a !== null) out.push(a);
    }
  }
  return out;
}
const TODOS_INSTRUMENTOS = Object.keys(ALIAS_INSTRUMENTO) as InstrumentId[];
function instrumentosConocidosMencionados(texto: string): InstrumentId[] {
  return TODOS_INSTRUMENTOS.filter((id) => textoNombraInstrumento(texto, id));
}
function instrumentosGenericosNoReconocidos(texto: string): string[] {
  const out: string[] = [];
  for (const m of texto.matchAll(INSTRUMENTO_GENERICO)) {
    const frag = norm(m[0]);
    // Si el nombre contiene un alias conocido no es «desconocido»: lo valida la comprobación por instrumento.
    if (TODOS_INSTRUMENTOS.some((id) => ALIAS_INSTRUMENTO[id].some((al) => al.length > 3 && frag.includes(al)))) continue;
    out.push(frag);
  }
  return out;
}

/** ¿El texto se refiere a una norma concreta? (nombra un artículo o un instrumento, o afirma el contenido de «la ley/el código/la norma»). */
export function mencionaNormaConcreta(texto: string): boolean {
  return articulosMencionados(texto).length > 0
    || instrumentosConocidosMencionados(texto).length > 0
    || instrumentosGenericosNoReconocidos(texto).length > 0
    || CONTENIDO_DE_NORMA.test(norm(texto));
}

/** Bloques de la respuesta: separados por línea en blanco (un encabezado y su cuerpo forman un bloque). */
function bloquesDe(texto: string): string[] {
  return texto.split(/\n[ \t]*\n+/).map((b) => b.trim()).filter((b) => b !== '');
}

/**
 * Menciones sin respaldo, como CÓDIGOS (nunca el texto del modelo). Por bloque: cada instrumento nombrado debe tener un fragmento elegible de ese
 * instrumento; cada artículo nombrado debe corresponder a un fragmento elegible de un instrumento nombrado en el MISMO bloque (un artículo sin
 * instrumento nombrado no se valida); un instrumento que no está en la tabla de alias nunca se valida.
 */
export function mencionesNoValidadas(texto: string, fragmentos: readonly FragmentoRAG[], ctx: ContextoClasificacion = {}): string[] {
  const elegibles = fragmentos.filter((f) => fragmentoCumpleR3(f, [], ctx));
  const problemas: string[] = [];
  for (const bloque of bloquesDe(texto)) {
    const insts = instrumentosConocidosMencionados(bloque);
    const arts = articulosMencionados(bloque);
    if (instrumentosGenericosNoReconocidos(bloque).length > 0) problemas.push('INSTRUMENTO_DESCONOCIDO');
    for (const id of insts) if (!elegibles.some((f) => instrumentIdDeFragmento(f) === id)) problemas.push(`INSTRUMENTO_SIN_FRAGMENTO:${id}`);
    for (const a of arts) {
      const ok = insts.length > 0 && elegibles.some((f) => normalizarNumeroArticulo(f.num_articulo) === a && insts.includes(instrumentIdDeFragmento(f) as InstrumentId));
      if (!ok) problemas.push(`ARTICULO_SIN_FRAGMENTO:${a}`);
    }
  }
  return problemas;
}

export interface ResultadoR4 {
  suficiente: boolean;
  motivo: MotivoR3;
  /** Texto a entregar: SOLO las oraciones validadas por R3 (vacío si hay abstención). */
  textoValidado: string;
  fragmentoIds: string[];
}

/**
 * R4 sobre el TEXTO LIBRE de una respuesta (chat principal). Un solo criterio compartido con Luna:
 *  1. cualquier mención de artículo o instrumento sin respaldo → abstención completa (`MENCION_NO_VALIDADA`);
 *  2. R3 por oración; sin ninguna oración válida → abstención;
 *  3. se entregan SOLO las oraciones validadas.
 */
export function validarRespuestaR4(texto: string, fragmentos: readonly FragmentoRAG[], objetivos: readonly ObjetivoConsulta[], ctx: ContextoClasificacion = {}): ResultadoR4 {
  const vacio = (motivo: MotivoR3): ResultadoR4 => ({ suficiente: false, motivo, textoValidado: '', fragmentoIds: [] });
  if (mencionesNoValidadas(texto, fragmentos, ctx).length > 0) return vacio('MENCION_NO_VALIDADA');
  const afirmaciones = extraerAfirmacionesCitadas(texto, fragmentos);
  const r3 = evaluarSuficienciaR3(fragmentos, afirmaciones, objetivos, ctx, texto);
  if (!r3.suficiente) return vacio(r3.motivo);
  const validas = new Set(r3.afirmacionesValidas.map((a) => a.claim_id));
  const porBloque = new Map<number, string[]>();
  for (const a of afirmaciones) {
    if (!validas.has(a.claim_id)) continue;
    const b = Number(a.claim_id.split('.')[0].slice(1));
    porBloque.set(b, [...(porBloque.get(b) ?? []), a.texto]);
  }
  const textoValidado = [...porBloque.entries()].sort((x, y) => x[0] - y[0]).map(([, o]) => o.join(' ')).join('\n\n');
  return { suficiente: true, motivo: 'OK', textoValidado, fragmentoIds: [...new Set(r3.afirmacionesValidas.flatMap((a) => a.fragmentoIds))] };
}

/**
 * Convierte el TEXTO LIBRE de una respuesta (chat principal) en afirmaciones con citas, para aplicarle la MISMA R3 que a Luna. Por párrafo, una
 * oración cita (DIRECT) a un fragmento recuperado cuando el párrafo nombra el artículo Y el instrumento de ese fragmento. Sin nombre, no hay cita.
 * Es una aproximación determinista y conservadora: lo que no se pueda ligar a un fragmento no cuenta como fundamento.
 */
export function extraerAfirmacionesCitadas(texto: string, fragmentos: readonly FragmentoRAG[]): AfirmacionCitada[] {
  const candidatos = fragmentos.filter((f): f is FragmentoRAG & { id: string } => typeof f.id === 'string' && f.id !== '' && f.num_articulo !== null);
  const salida: AfirmacionCitada[] = [];
  bloquesDe(texto).forEach((bloque, i) => {
    const citados = candidatos.filter((f) => respuestaNombraFuente(bloque, f));
    if (citados.length === 0) return;
    let n = 0;
    for (const oracion of bloque.split(/(?<=[.!?;:])\s+|\n+/)) {
      if (oracion.trim().length < 20) continue;
      n += 1;
      salida.push({ claim_id: `b${i}.${n}`, texto: oracion.trim(), citas: citados.map((f) => ({ fragmentoId: f.id, soporte: 'DIRECT' as const })) });
    }
  });
  return salida;
}

/** true si el fragmento puede presentarse como cita formal (norma PRIMARY). */
export function esCitableComoNorma(f: FragmentoRAG, ctx: ContextoClasificacion = {}): boolean {
  return clasificarFragmentoClo(f, ctx).rol === 'PRIMARY';
}

/**
 * Contenido externo al corpus (contexto web de Tavily, plantillas notariales del modo documento): pasa por el clasificador y NUNCA es PRIMARY.
 * No es una fila del corpus: no tiene instrumento, vigencia ni jurisdicción acreditados.
 */
export function clasificarFuenteExterna(tipo: 'WEB' | 'PLANTILLA_NOTARIAL'): ClasificacionClo {
  const bloqueos: CodigoBloqueoClo[] = ['FUENTE_EXTERNA_NO_NORMA'];
  return { instrumentId: null, tipoFuente: tipo === 'WEB' ? 'DOCUMENTAL' : 'PRACTICA_NOTARIAL', rol: 'CONTEXT', bloqueos, avisos: bloqueos.map((b) => AVISOS[b]) };
}

export interface LineaLogClo { id: string | null; rol: RolEvidencia; instrument_id: InstrumentId | null; motivos: CodigoBloqueoClo[]; vigencia: 'TRUE' | 'FALSE' | 'NULL' }

/**
 * Una línea por fragmento para los logs: motivo(s) CLO y estado de vigencia. SIN texto del fragmento, de la pregunta ni de ningún cliente:
 * solo el id del corpus, el rol, el instrumento, los códigos de bloqueo y el estado de es_norma_vigente.
 */
export function resumenLogClo(fragmentos: readonly FragmentoRAG[], ctx: ContextoClasificacion = {}): LineaLogClo[] {
  return fragmentos.map((f) => {
    const c = clasificarFragmentoClo(f, ctx);
    return { id: typeof f.id === 'string' ? f.id : null, rol: c.rol, instrument_id: c.instrumentId, motivos: c.bloqueos, vigencia: f.es_norma_vigente === true ? 'TRUE' : f.es_norma_vigente === false ? 'FALSE' : 'NULL' };
  });
}
