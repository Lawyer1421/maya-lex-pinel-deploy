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
 * Política de país (decisión CLO 24-oct-2026): el país se deriva del instrument_id VALIDADO contra INSTRUMENT_IDS (todos son instrumentos hondureños),
 * no de la columna `jurisdiccion`. Instrumento validado + país vacío → puede ser PRIMARY; país explícito distinto de HN → conflicto → CONTEXT con aviso.
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
  | 'INSTRUMENTO_DISTINTO_DEL_SOLICITADO';

export const MATERIA_NOTARIAL = '03_NOTARIAL';
export const COLECCION_DOCUMENTAL = 'mayalex_instrumentos';

/** Artículos del Código del Notariado D.353-2005 bloqueados como PRIMARY, con su causa. */
export const NOTARIADO_ARTICULOS_BLOQUEADOS: Readonly<Record<string, CodigoBloqueoClo>> = Object.freeze({
  '17': 'NOTARIADO_HUECO',
  '11': 'NOTARIADO_TEXTO_DIVERGENTE',
  '27': 'NOTARIADO_TEXTO_DIVERGENTE',
  // Decisión CLO 24-oct-2026: solo CONTEXT, nunca PRIMARY.
  '72': 'NOTARIADO_SOLO_CONTEXT_CLO',
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
});

/** Campos mínimos de un fragmento (FragmentoRAG o una fila de la base con `materia` y `metadata`). */
export type FragmentoClasificable = Pick<FragmentoRAG, 'fuente' | 'fuente_tipo' | 'jurisdiccion'> &
  Partial<Pick<FragmentoRAG, 'num_articulo' | 'materia' | 'instrumento_solicitado' | 'coleccion_origen' | 'documento_origen' | 'norm_id'>> & { metadata?: Record<string, unknown> | null };

export interface ContextoClasificacion {
  /** Materia conocida de la consulta/fila cuando el fragmento no la trae (p. ej. filtro de materia de la RPC semántica). */
  materia?: string | null;
  /** Colección consultada. */
  coleccion?: string | null;
  /** Instrumento que pidió la consulta exacta. Solo AGREGA un bloqueo si la fuente real es otro instrumento; nunca confiere identidad. */
  instrumentoSolicitado?: InstrumentId | null;
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
 * Número de artículo normalizado: "Art. 017." / "Arto. 17" / "17º" / "17°" / "N° 17" / "Artículo 17" → "17"; "123-A" se conserva en mayúscula.
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
  return /^\d{1,4}(?:-?[a-z]{1,3})?$/.test(s) ? s.toUpperCase() : null;
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
  const esNormativoNotarial = instrumentId !== null && INSTRUMENTOS_NORMATIVOS_NOTARIALES.has(instrumentId);
  const esPracticaNotarial = !esSentencia && !esDoctrina && senalNotarial && !esNormativoNotarial;
  const esCapaDocumental = !esSentencia && !esDoctrina && !esPracticaNotarial && senalDocumental && instrumentId === null;
  if (esPracticaNotarial) bloqueos.push('PRACTICA_NOTARIAL_NO_NORMA');
  if (esCapaDocumental) bloqueos.push('CAPA_DOCUMENTAL_NO_NORMA');

  const claseNorma = !esSentencia && !esDoctrina && !esPracticaNotarial && !esCapaDocumental;
  if (claseNorma) {
    // (a) Sin instrumento identificado no hay PRIMARY.
    if (instrumentId === null) bloqueos.push('SIN_INSTRUMENT_ID');
    // Fail-closed: una norma exige un fuente_tipo normativo conocido. Null, vacío o desconocido → CONTEXT.
    if (!TIPOS_FUENTE_NORMATIVOS.has(tipo)) bloqueos.push('FUENTE_TIPO_NO_VERIFICADO');
    // Política de país (CLO 24-oct-2026): un instrumento validado contra INSTRUMENT_IDS es hondureño por definición; su país se deriva de ahí,
    // no de la columna `jurisdiccion`. País vacío con instrumento validado → no bloquea. País explícito distinto de HN → conflicto → CONTEXT.
    if (pais !== null && pais !== 'HN') bloqueos.push('JURISDICCION_NO_HONDURENA');
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
    };
    const c = clasificarFragmentoClo(sellado);
    return { ...sellado, instrument_id: c.instrumentId, rol_evidencia: c.rol, bloqueos_clo: c.bloqueos, avisos_clo: c.avisos };
  });
}

export interface ResumenEvidenciaClo {
  primarios: number;
  contexto: number;
  /** true solo con al menos un PRIMARY. Lo único que cuenta como evidencia para el Evidence Gate. */
  suficiente: boolean;
  bloqueos: CodigoBloqueoClo[];
}

/** Cuenta PRIMARY y CONTEXT recalculando la clasificación: nunca confía en un `rol_evidencia` que venga en el fragmento. */
export function resumenEvidenciaClo(fragmentos: readonly FragmentoRAG[], ctx: ContextoClasificacion = {}): ResumenEvidenciaClo {
  let primarios = 0;
  const bloqueos = new Set<CodigoBloqueoClo>();
  for (const f of fragmentos) {
    const c = clasificarFragmentoClo(f, ctx);
    if (c.rol === 'PRIMARY') primarios += 1;
    for (const b of c.bloqueos) bloqueos.add(b);
  }
  return { primarios, contexto: fragmentos.length - primarios, suficiente: primarios > 0, bloqueos: [...bloqueos] };
}

/** true si el fragmento puede presentarse como cita formal (norma PRIMARY). */
export function esCitableComoNorma(f: FragmentoRAG, ctx: ContextoClasificacion = {}): boolean {
  return clasificarFragmentoClo(f, ctx).rol === 'PRIMARY';
}
