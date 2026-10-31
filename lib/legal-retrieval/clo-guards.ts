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
  'prevé', 'preve', 'señala', 'senala', 'indica', 'contiene', 'contienen', 'menciona', 'trata', 'refiere', 'describe', 'expresa', 'texto', 'conforme', 'respecto', 'caso', 'casos', 'derecho', 'general', 'honduras', 'hondureno', 'hondurena',
]);
const MIN_TERMINOS_SIN_ANCLAS = 3;

/**
 * ¿El fragmento PRIMARY respalda la afirmación concreta? Comprobación determinista y conservadora (ante la duda, NO respalda). El respaldo NO se mide
 * solo por traslape de palabras: se exige que lo verificable COINCIDA con el fragmento.
 *  - Instrumento: si la afirmación nombra un instrumento, debe ser EXACTAMENTE el del fragmento (un instrumento distinto invalida).
 *  - Artículo: todo «artículo N» (también «arto.», «art.», «arts.») que nombre la afirmación debe ser EXACTAMENTE el del fragmento; que el número aparezca
 *    dentro de su texto (una remisión) ya no basta.
 *  - Cifras: toda cifra (dígitos o número en palabras) debe figurar en el fragmento.
 *  - Términos propios: al menos la mitad (≥ 5 letras, sin vacías) con su raíz en el fragmento; si la afirmación no trae ninguna ancla verificable
 *    (cifra, artículo o instrumento), el umbral sube a 75 % y exige al menos 3 términos coincidentes.
 * No sustituye la lectura jurídica: es la barrera mínima para que una cita DIRECT no avale lo que el texto no dice.
 */
export function afirmacionRespaldadaPorFragmento(
  afirmacion: string,
  f: Pick<FragmentoRAG, 'contenido' | 'num_articulo' | 'fuente'> & Partial<Pick<FragmentoClasificable, 'metadata' | 'documento_origen' | 'norm_id'>>,
): boolean {
  const a = norm(afirmacion);
  const t = norm(f.contenido);
  if (a === '' || t === '') return false;
  const artFragmento = normalizarNumeroArticulo(f.num_articulo);
  let anclas = 0;

  // Instrumento nombrado → debe ser el del fragmento.
  const nombrados = instrumentosConocidosMencionados(afirmacion);
  if (nombrados.length > 0) {
    const idFragmento = instrumentIdDeFragmento(f);
    if (idFragmento === null || nombrados.some((id) => id !== idFragmento)) return false;
    anclas += 1;
  }
  // Artículos nombrados → deben ser exactamente el del fragmento.
  const articulos = articulosMencionados(afirmacion);
  for (const n of articulos) if (artFragmento === null || n !== artFragmento) return false;
  if (articulos.length > 0) anclas += 1;

  // Cifras: dígitos (fuera de las referencias a artículo) y números en palabras.
  const sinRefs = a.replace(new RegExp(MENCION_ARTICULOS.source, 'g'), ' ');
  for (const m of sinRefs.matchAll(/\d+/g)) {
    anclas += 1;
    const enPalabras = Object.entries(PALABRAS_NUMERO).filter(([, d]) => d === m[0]).map(([w]) => w);
    const aceptables = [new RegExp(`(?<!\\d)${m[0]}(?!\\d)`), ...enPalabras.map((w) => new RegExp(`\\b${w}\\b`))];
    if (!aceptables.some((r) => r.test(t))) return false;
  }
  for (const m of sinRefs.matchAll(/[a-zñ]+/g)) {
    const dig = PALABRAS_NUMERO[m[0]];
    if (!dig) continue;
    anclas += 1;
    if (!new RegExp(`\\b${m[0]}\\b|(?<!\\d)${dig}(?!\\d)`).test(t)) return false;
  }

  // Términos propios: TODOS deben figurar en el fragmento (A-4b). El nombre del instrumento ya se validó arriba y no cuenta como término.
  let sinNombres = sinRefs;
  for (const id of nombrados) for (const al of ALIAS_INSTRUMENTO[id]) sinNombres = sinNombres.replace(new RegExp(`(?<![a-z0-9])${escapar(al)}(?![a-z0-9])`, 'g'), ' ');
  const terminos = [...new Set([...sinNombres.matchAll(/[a-zñ]{5,}/g)].map((m) => m[0]).filter((w) => !VACIAS.has(w) && !(w in PALABRAS_NUMERO)))];
  if (!terminos.every((w) => t.includes(w.slice(0, 5)))) return false;
  if (!cantidadesConUnidadCoinciden(sinRefs, t)) return false;
  if (!calificadoresYNegacionesCoinciden(sinRefs, t)) return false;
  if (terminos.length === 0) return anclas > 0;           // sin términos propios solo vale si hay anclas que coincidieron
  return anclas > 0 || terminos.length >= MIN_TERMINOS_SIN_ANCLAS;
}

const palabraEn = (w: string, t: string) => new RegExp(`(?<![a-z0-9])${escapar(w.length > 5 ? w.slice(0, 5) : w)}`).test(t);
const NUM_ALT = (n: string) => [n, ...Object.entries(PALABRAS_NUMERO).filter(([, d]) => d === n).map(([w]) => w)].map(escapar).join('|');
const UNIDADES = 'anos?|meses|mes|dias?|horas?|semanas?|lempiras|dolares|por ciento|%|salarios minimos';
/** «cinco años», «18 años», «11,000 lempiras»: la misma cantidad con la MISMA unidad debe figurar en el fragmento (3 años ≠ 3 meses). */
function cantidadesConUnidadCoinciden(a: string, t: string): boolean {
  for (const m of a.matchAll(new RegExp(String.raw`(?<![\d.,])(\d[\d.,]*|${Object.keys(PALABRAS_NUMERO).join('|')})\s+(?:de\s+)?(${UNIDADES})`, 'g'))) {
    const raw = m[1];
    const dig = PALABRAS_NUMERO[raw] ?? raw.replace(/[.,]/g, '');
    if (!new RegExp(String.raw`(?:${NUM_ALT(dig)}|${escapar(raw)})\s*(?:\(\d+\)\s*)?(?:de\s+)?(?:${UNIDADES.split('|').map((u) => u.slice(0, 4)).join('|')})`).test(t.replace(/(\d),(\d{3})/g, '$1$2'))) return false;
  }
  return true;
}
const CALIFICADORES = /(?<![a-z0-9])(?:siempre|nunca|jamas|todo|todos|toda|todas|cualquier|cualquiera|unicamente|solo|solamente|exclusivamente|obligatoriamente|automaticamente|perpetua|perpetuo|ilimitado|ilimitada|absoluto|absoluta|aun|incluso)(?![a-z0-9])/g;
const NO_NUCLEO = new Set(['la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'que', 'se', 'lo', 'le', 'a', 'en', 'por', 'con']);
const ANTONIMOS: readonly (readonly [string, string])[] = [
  ['inferior', 'superior'], ['mayor', 'menor'], ['maximo', 'minimo'], ['antes', 'despues'], ['procede', 'improcedente'], ['permite', 'prohibe'], ['permitido', 'prohibido'],
  ['valido', 'nulo'], ['obligatorio', 'facultativo'], ['publico', 'privado'], ['anterior', 'posterior'], ['aumenta', 'reduce'], ['aumento', 'reduccion'],
];
/**
 * A-4b. La afirmación no puede añadir lo que el fragmento no dice: (1) cada calificador absoluto («siempre», «perpetua», «aun», «solo»…) debe figurar en el
 * fragmento; (2) cada negación («no procede», «sin indicios») debe aparecer en el fragmento con la MISMA palabra negada; (3) un término cuyo antónimo está en
 * el fragmento y él no, invalida.
 */
function calificadoresYNegacionesCoinciden(a: string, t: string): boolean {
  for (const m of a.matchAll(CALIFICADORES)) if (!new RegExp(`(?<![a-z0-9])${escapar(m[0].slice(0, 5))}`).test(t)) return false;
  const pal = a.split(/[^a-zñ0-9]+/).filter((w) => w !== '');
  for (let i = 0; i < pal.length; i++) {
    if (!/^(?:no|nunca|jamas|ni|sin|tampoco|salvo|excepto)$/.test(pal[i])) continue;
    const nucleo = pal.slice(i + 1, i + 4).find((x) => !NO_NUCLEO.has(x));
    if (nucleo === undefined) continue;
    if (!new RegExp(`(?<![a-z0-9])${pal[i]}\\s+(?:[a-zñ]+\\s+){0,2}?${escapar(nucleo.length > 5 ? nucleo.slice(0, 5) : nucleo)}`).test(t)) return false;
  }
  for (const [x, y] of ANTONIMOS) {
    for (const [p, q] of [[x, y], [y, x]] as const) if (pal.includes(p) && !palabraEn(p, t) && palabraEn(q, t)) return false;
  }
  return true;
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
  return new RegExp(`\\bart(?:iculos?|os?\\.?|s?\\.?|º|°)\\s*[^.;\\n]{0,40}?(?<![\\d])${num0}${suf}(?![\\d])`, 'i').test(norm(texto));
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
// «artículo», «art.», «arts.», «arto.», «artº»; con o sin «N.º». Admite listas: «arts. 10 y 173».
const MENCION_ARTICULOS = /\bart(?:iculos?|os?\.?|s?\.?|º|°)\s*(?:n[o°º]\.?\s*)?((?:\d+(?:-?[a-z])?(?![a-z0-9]))(?:\s*(?:,|y|e|al|a|-)\s*\d+(?:-?[a-z])?(?![a-z0-9]))*)/g;
// Unidades por debajo del artículo («numeral 3», «inciso b», «literal c», «párrafo segundo»): son contenido normativo que solo vale colgado de un artículo validado.
const UNIDAD_SUBARTICULO = /\b(?:numeral(?:es)?|incisos?|literal(?:es)?|parrafos?|apartados?|fracciones?)\s+(?:n[o°º]\.?\s*)?(?:\d+|[a-z]\)?|primero|segundo|tercero|cuarto|quinto|unico|unica|final)(?![a-z0-9])/;
// Siglas de instrumento con número: «D.L. 130-2017», «DL 130-2017», «D.E. 12-2020», «PCM 05-2020», «A.E. 123-2020». Se evalúa sobre el texto ORIGINAL (mayúsculas).
const SIGLA_NORMATIVA = /\b(?:[A-Z]{1,4}\.){1,3}\s*(?:N[o°º]\.?\s*)?\d{1,4}-\d{2,4}\b|\b(?:D\.?L|D\.?E|D\.?P|A\.?E|A\.?L|PCM|PCS|AEJ|DEC)\.?\s*(?:N[o°º]\.?\s*)?\d{1,4}-\d{2,4}\b/;
// Nombres de instrumentos que NO están en la tabla de alias (se detectan sobre el texto original, con mayúscula inicial del nombre propio).
const NOMBRE_PROPIO = String.raw`(?:\s+(?:(?:de|del|la|las|los|el|y)\s+){0,2}[A-ZÁÉÍÓÚÑ]\w*)+`;
const INSTRUMENTO_GENERICO = new RegExp(
  String.raw`\b(?:Ley|Decreto|Reglamento|Convenci[oó]n|Tratado|Pacto|Acuerdo|Resoluci[oó]n|Estatuto)(?:\s+(?:No\.?|N[úu]m\.?|N[°º]))?(?:\s+\d[\d-]*|${NOMBRE_PROPIO})|\bC[oó]digo${NOMBRE_PROPIO}`,
  'g',
);
// Los mismos nombres EN MINÚSCULA («ley de municipalidades», «decreto legislativo 130-2017», «reglamento de la ley de…»), sobre el texto normalizado.
const INSTRUMENTO_GENERICO_MINUSCULA = /\b(?:leyes|ley|decretos?|reglamentos?|acuerdos?|resoluciones|resolucion|convenciones|convencion|tratados?|pactos?|estatutos?|codigos?)\s+(?:(?:no|n|num)\.?\s*\d[\d-]*|(?:legislativo|ejecutivo)\s+(?:(?:no|n|num)\.?\s*)?\d[\d-]*|(?:(?:legislativo|ejecutivo|especial|organica|general|de|del|sobre|para)\s+)+(?:la\s+|las\s+|los\s+|el\s+)?[a-z]{3,}|\d[\d-]*)/g;
// Verbos con los que se afirma el contenido de una norma. Solos pueden ser lenguaje ordinario; cuentan como contenido normativo junto a un sustantivo jurídico.
const VERBO_NORMATIVO = /\b(?:establece|establecen|dispone|disponen|fija|fijan|sanciona|sancionan|castiga|castigan|prescribe|prescriben|determina|determinan|regula|regulan|preve|prevén|prevee|estipula|estipulan|ordena|ordenan|exige|exigen|prohibe|prohiben|permite|permiten|obliga|obligan|faculta|facultan|autoriza|autorizan|impone|imponen|tipifica|tipifican|penaliza|penalizan|senala|senalan)\b/;
const SUSTANTIVO_JURIDICO = /\b(?:ley|leyes|codigo|codigos|norma|normas|constitucion|reglamento|reglamentos|legislacion|ordenamiento|decreto|decretos|plazo|plazos|termino|terminos|pena|penas|multa|multas|sancion|sanciones|prision|reclusion|inhabilitacion|prescripcion|caducidad|recurso|recursos|apelacion|casacion|demanda|delito|delitos|requisito|requisitos|competencia|procedimiento|obligacion|obligaciones|derecho|derechos|prohibicion)\b/;
const NUMERO_O_PALABRA = String.raw`(?:\d+|uno|una|un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|quince|veinte|treinta|cuarenta|cincuenta|sesenta|noventa|cien|ciento)`;
// «el plazo para apelar es de tres días», «prisión de 3 a 5 años», «multa de 500 lempiras»: cantidad + unidad junto a un término de plazo o sanción.
const CANTIDAD_NORMATIVA = new RegExp(
  String.raw`\b(?:plazo|plazos|termino|terminos|pena|penas|multa|multas|prision|reclusion|sancion|prescripcion|caducidad|inhabilitacion|interes|intereses|tasa)\b[^.;\n]{0,60}\b${NUMERO_O_PALABRA}\b[^.;\n]{0,25}\b(?:dias?|meses|mes|anos?|horas?|semanas?|lempiras|dolares|por ciento|%)`,
);
const PLAZO_PROCESAL = new RegExp(
  String.raw`\b${NUMERO_O_PALABRA}\s+(?:dias(?:\s+habiles)?|meses|anos|horas)\b[^.;\n]{0,40}\b(?:apelar|apelacion|recurrir|recurso|contestar|interponer|notificar|prescribe|prescribir|caduca|caducar|plazo|demanda)\b|\b(?:apelar|apelacion|recurrir|recurso|contestar|interponer|notificar|prescribe|prescribir|caduca|caducar|demanda)\b[^.;\n]{0,40}\b${NUMERO_O_PALABRA}\s+(?:dias(?:\s+habiles)?|meses|anos|horas)\b`,
);
const CONTENIDO_DE_NORMA = /\b(?:la|el|las|los)\s+(?:ley|leyes|codigo|codigos|norma|normas|constitucion|reglamento|reglamentos|legislacion|ordenamiento)\b[^.;\n]{0,60}\b(?:establece|establecen|dispone|disponen|senala|senalan|prescribe|prescriben|determina|determinan|regula|regulan|preve|prevén|estipula|ordena|exige|exigen|sanciona|castiga|prohibe|permite|obliga|fija|fijan)\b/;

// Residuo D-1 (re-auditoría 4): procedencia/prohibición afirmadas («no procede», «está prohibido»), cifras con unidad suelta («18 años», «11,000 lempiras») y artículo con número en palabras.
const NUMERO_PALABRAS_ART = String.raw`(?:primer[oa]?|segund[oa]|tercer[oa]?|cuart[oa]|quint[oa]|sext[oa]|septim[oa]|octav[oa]|noven[oa]|decim[oa]\w*|vigesim[oa]\w*|uno|un[oa]?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciseis|diecisiete|dieciocho|diecinueve|veinte|veinti\w+|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|cien|ciento|doscientos|trescientos|cuatrocientos|quinientos|mil)`;
const ARTICULO_EN_PALABRAS = new RegExp(String.raw`\bart(?:iculos?|os?\.?|s?\.?)\s+${NUMERO_PALABRAS_ART}(?![a-z])`, 'g');
const PROCEDENCIA_PROHIBICION = /\b(?:no\s+procede|no\s+proceden|improcedente|improcedentes|esta\s+prohibid[oa]s?|estan\s+prohibid[oa]s?|queda(?:n)?\s+prohibid[oa]s?|se\s+prohibe|esta\s+penad[oa]|es\s+punible|es\s+delito|es\s+obligatori[oa]|son\s+obligatori[oa]s|procede(?:n)?\s+(?:el|la|los|las|un|una|recurso|apelacion|casacion|amparo|la\s+prision))\b/;
const CIFRA_CON_UNIDAD = /(?<![\d.,])\d[\d.,]*\s+(?:de\s+)?(?:anos|meses|dias|semanas|horas|lempiras|dolares|usd|por ciento|salarios minimos)\b|\d\s*%/;

/** ¿La oración afirma contenido normativo (aunque no cite artículo)? Verbo normativo + sustantivo jurídico, cantidad normativa, plazo procesal o «la ley establece…». */
export function oracionAfirmaContenidoNormativo(oracion: string): boolean {
  const t = norm(oracion);
  return CONTENIDO_DE_NORMA.test(t) || (VERBO_NORMATIVO.test(t) && SUSTANTIVO_JURIDICO.test(t)) || CANTIDAD_NORMATIVA.test(t) || PLAZO_PROCESAL.test(t)
    || PROCEDENCIA_PROHIBICION.test(t) || CIFRA_CON_UNIDAD.test(t);
}

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
const SIGLA_SIN_NUMERO = /(?<![\p{L}\d])(?:[Ll]a|[Ee]l|[Dd]el|[Ll]os|[Ll]as|[Aa]l)\s+([A-ZÁÉÍÓÚÑ]{2,8})(?![\p{L}\d])/gu;
const SIGLAS_INOCUAS = new Set(['IA', 'AI', 'USD', 'PDF', 'ONU', 'OEA', 'OIT', 'IVA', 'ISR', 'ISV', 'DNI', 'RTN', 'SMS', 'URL', 'API', 'OK', 'UNAH', 'CSJ', 'MP', 'FAQ', 'GPT', 'TSE', 'SAR', 'BCH', 'IHSS']);
function instrumentosGenericosNoReconocidos(texto: string): string[] {
  const out: string[] = [];
  const contieneAlias = (frag: string) => TODOS_INSTRUMENTOS.some((id) => ALIAS_INSTRUMENTO[id].some((al) => al.length > 3 && frag.includes(al)));
  for (const m of texto.matchAll(INSTRUMENTO_GENERICO)) {
    const frag = norm(m[0]);
    // Si el nombre contiene un alias conocido no es «desconocido»: lo valida la comprobación por instrumento.
    if (contieneAlias(frag)) continue;
    out.push(frag);
  }
  for (const m of norm(texto).matchAll(INSTRUMENTO_GENERICO_MINUSCULA)) {
    if (contieneAlias(m[0])) continue;
    if (/^decreto\s+(?:no\.?\s*)?353-2005\b/.test(m[0])) continue;
    out.push(m[0]);
  }
  for (const m of texto.matchAll(new RegExp(SIGLA_NORMATIVA.source, 'g'))) out.push(norm(m[0]));
  // Sigla sin número («La LCT establece…»): una sigla en mayúsculas tras artículo que no es un instrumento ni una entidad de la lista inocua nunca se valida.
  for (const m of texto.matchAll(SIGLA_SIN_NUMERO)) {
    const s = m[1];
    if (SIGLAS_INOCUAS.has(s) || TODOS_INSTRUMENTOS.some((id) => ALIAS_INSTRUMENTO[id].includes(s.toLowerCase()))) continue;
    out.push(`sigla ${s.toLowerCase()}`);
  }
  for (const m of norm(texto).matchAll(ARTICULO_EN_PALABRAS)) out.push(m[0]);
  return [...new Set(out)];
}

/** ¿El texto se refiere a una norma concreta? (nombra un artículo, una unidad de artículo, un instrumento —por nombre, sigla o en minúscula— o afirma contenido normativo). */
export function mencionaNormaConcreta(texto: string): boolean {
  return articulosMencionados(texto).length > 0
    || UNIDAD_SUBARTICULO.test(norm(texto))
    || instrumentosConocidosMencionados(texto).length > 0
    || instrumentosGenericosNoReconocidos(texto).length > 0
    || oracionesDe(texto).some(oracionAfirmaContenidoNormativo);
}

const oracionesDe = (texto: string): string[] => texto.split(/(?<=[.!?;:])\s+|\n+/).map((o) => o.trim()).filter((o) => o !== '');

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
    const respaldados: typeof elegibles = [];
    for (const a of arts) {
      const aptos = elegibles.filter((f) => normalizarNumeroArticulo(f.num_articulo) === a && insts.includes(instrumentIdDeFragmento(f) as InstrumentId));
      if (aptos.length === 0) problemas.push(`ARTICULO_SIN_FRAGMENTO:${a}`);
      respaldados.push(...aptos);
    }
    // Numeral / inciso / literal: solo vale colgado de un artículo validado del mismo bloque.
    if (UNIDAD_SUBARTICULO.test(norm(bloque)) && respaldados.length === 0) problemas.push('UNIDAD_SIN_ARTICULO_VALIDADO');
    // Contenido normativo SIN artículo citado («el plazo para apelar es de tres días»): cada oración debe estar respaldada por un fragmento que el
    // propio bloque nombra (instrumento y artículo). Sin fragmento que la respalde, la respuesta completa se abstiene.
    for (const oracion of oracionesDe(bloque)) {
      if (!oracionAfirmaContenidoNormativo(oracion)) continue;
      const citados = elegibles.filter((f) => respuestaNombraFuente(bloque, f));
      if (!citados.some((f) => afirmacionRespaldadaPorFragmento(oracion, f))) problemas.push('CONTENIDO_NORMATIVO_SIN_FRAGMENTO');
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
