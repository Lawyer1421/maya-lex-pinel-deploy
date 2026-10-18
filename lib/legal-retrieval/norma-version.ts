/**
 * lib/legal-retrieval/norma-version.ts
 * P0-1: resolución de versiones de normas por fecha.
 *
 * Función pura sobre filas de `norma_version` (ver
 * supabase/migrations/20261016000000_norma_version.sql). No toca la base ni el
 * chat: el cableado a /api/chat y al MCP queda fuera de este slice.
 *
 * Reglas (fail-closed):
 *  - Ventana semiabierta [vigente_desde, vigente_hasta); vigente_hasta null = abierta.
 *  - vigente_desde es la fecha de VIGENCIA, nunca la de publicación. Si el decreto
 *    calla, rige 20 días después de publicado (calcularVigenteDesde).
 *  - Vacatio legis: si hay una versión ya publicada que aún no rige en `fecha`,
 *    se devuelve la versión anterior con advertencia VACATIO_LEGIS.
 *  - Nunca PRIMARY: texto null o vacío, vigencia UNKNOWN o FALSE, precision_fecha
 *    RANGO o elegible_primary=false. Esas versiones se devuelven CONTEXT con
 *    advertencias. TRUE_PRESUNTA SÍ puede ser PRIMARY, siempre con la
 *    advertencia VIGENCIA_PRESUNTA; la verificación SECUNDARIA (p. ej. CEDIJ)
 *    también, siempre con VERIFICACION_SECUNDARIA (fallo CLO 16-oct-2026,
 *    SI_PRIMARY_CON_AVISO).
 *  - Precedencia entre fuentes para el mismo artículo y fecha: PRIMARIA_IMAGEN >
 *    PRIMARIA_TEXTO > SECUNDARIA. Gana la de mayor rango; las demás van en
 *    `contexto` y nunca como PRIMARY. Una versión superior que no puede servirse
 *    como PRIMARY se trata así:
 *      · sólo por falta de texto: puede ceder a la siguiente versión elegible
 *        (p. ej. SECUNDARIA) únicamente cuando su vigente_desde NO es posterior.
 *        Si es posterior se aplica la regla de reforma posterior (abajo).
 *      · por causa jurídica (vigencia FALSE o UNKNOWN, fecha en RANGO o dentro
 *        del margen de incertidumbre, o elegible_primary=false con texto): es la
 *        ganadora, se devuelve CONTEXT y NO se cae a una fuente inferior. Una
 *        versión sin texto que además es FALSE/UNKNOWN/RANGO (p. ej. una
 *        derogación sin texto) también bloquea: no se sirve texto inferior de
 *        una norma derogada.
 *  - Reforma posterior (dictamen CLO 17-oct-2026, fail-closed). Si entre las
 *    candidatas hay una versión POSTERIOR a la vigente (vigente_desde mayor, de
 *    CUALQUIER nivel; con varias se toma la de mayor vigente_desde, desempate por
 *    mayor rango de nivel y las demás van a contexto):
 *      (a) si la posterior está vinculada a un evento de reforma identificado
 *          (tipo_evento REFORMA, TEXTO_NUEVO_MISMO_NUMERO o ADICION, con un
 *          instrumento_modificador que identifica un decreto o fallo concreto con
 *          número según la lista blanca de identificaDecretoOFallo; «pendiente»,
 *          «s/n», «sin número», «varios» o una Gaceta sola no cuentan) Y es
 *          PRIMARY (texto,
 *          vigencia TRUE o TRUE_PRESUNTA, no RANGO ni margen de incertidumbre,
 *          elegible_primary),
 *          se sirve la posterior como PRIMARY con sus propias advertencias
 *          (VERIFICACION_SECUNDARIA si es SECUNDARIA) y las anteriores pasan a
 *          `contexto`, cada una con un aviso REFORMA_POSTERIOR en `avisosContexto`;
 *      (b) si falla cualquiera de esas condiciones, NINGUNA es PRIMARY: se
 *          devuelve CONTEXT con la vigente (advertencia REFORMA_POSTERIOR, más
 *          REFORMA_POSTERIOR_SIN_TEXTO si la posterior no tiene texto) y todas las
 *          demás candidatas en `contexto`, con REFORMA_POSTERIOR en
 *          `avisosContexto`. Sustituye al antiguo límite 3 del dictamen CLO del
 *          16-oct-2026 (SI_PRIMARY_CON_AVISO), que sólo miraba fuentes superiores
 *          sin texto.
 *      · La causa jurídica de la versión anterior (FALSE/UNKNOWN/RANGO) NO impide
 *        promover la posterior: ésta se evalúa sólo por sus propios requisitos.
 *        La causa de la anterior sólo rige para fechas previas a la vigencia de la
 *        posterior (fallo CLO 17-oct-2026 sobre las interpretaciones; caso piloto:
 *        Notariado arts. 72 y 73 derogados por el D.77-2006 y texto nuevo del
 *        D.59-2015).
 *      · DEROGACION_EXPRESA e INCONSTITUCIONALIDAD posteriores bloquean el texto
 *        anterior pero nunca promueven texto: se devuelve la propia versión
 *        posterior (normalmente FALSE) como CONTEXT, con las anteriores en
 *        `contexto` y REFORMA_POSTERIOR.
 *  - Sin reviviscencia automática: si una versión que empezó después de la
 *    servida ya cerró su vigencia antes de `fecha` (p. ej. una reforma con
 *    vigencia cerrada), el texto anterior no vuelve a PRIMARY salvo que un evento
 *    posterior expreso lo restablezca (una versión que empiece después). Si no
 *    lo hay: FALLO_CERRADO con motivo y aviso SIN_REVIVISCENCIA. Esto exige que
 *    la versión cerrada sea un evento real (tipo_evento distinto de ORIGINAL y
 *    vinculado a un decreto o fallo identificado).
 *  - Vigencia cerrada sin evento (dictamen CLO 18-oct-2026): una fila ORIGINAL,
 *    o sin vínculo identificado, cuya vigencia cerró sin un evento posterior no
 *    prueba derogación. No sale PRIMARY ni se presenta como FALSE: se devuelve
 *    CONTEXT con VIGENCIA_CERRADA_SIN_EVENTO y la fila va a `curacionDatos`
 *    (error de datos, no situación jurídica). Si es la última versión y la
 *    fecha es posterior a su cierre, se devuelve su propio texto como CONTEXT.
 *  - Margen de incertidumbre (precision_fecha AÑO o RANGO, bordes inclusive): la
 *    versión se devuelve CONTEXT con FECHA_EN_RANGO_INCIERTO.
 *  - Una reforma o fallo posterior a la edición CEDIJ que no esté registrado como
 *    versión se marca en los datos (elegible_primary=false + nota); sin esa fila
 *    no hay detección automática. Si la reforma sí está registrada como versión
 *    (de cualquier nivel), aplica la regla de reforma posterior de arriba.
 *  - Sin versión, fecha en un hueco, anterior a la primera versión o posterior a
 *    una reforma cerrada sin sucesora: FALLO_CERRADO. Nunca se rellena con la
 *    más cercana.
 */

export type TipoEvento =
  | 'ORIGINAL'
  | 'REFORMA'
  | 'ADICION'
  | 'DEROGACION_EXPRESA'
  | 'TEXTO_NUEVO_MISMO_NUMERO'
  | 'INCONSTITUCIONALIDAD'
  | 'DESPLAZAMIENTO_ESPECIAL';

export type EstadoVigencia = 'TRUE' | 'TRUE_PRESUNTA' | 'FALSE' | 'UNKNOWN';
export type NivelVerificacion = 'PRIMARIA_IMAGEN' | 'PRIMARIA_TEXTO' | 'SECUNDARIA';
export type PrecisionFecha = 'DIA' | 'MES' | 'AÑO' | 'RANGO';

/** Fila de norma_version. Las fechas son ISO `YYYY-MM-DD`. */
export interface NormaVersion {
  instrumento_id: string;
  unidad: string;
  version_id: string;
  etiqueta: string | null;
  texto: string | null;
  texto_hash: string | null;
  vigente_desde: string;
  vigente_hasta: string | null;
  vigente_desde_min: string | null;
  vigente_desde_max: string | null;
  tipo_evento: TipoEvento;
  instrumento_modificador: string | null;
  gaceta_numero: string | null;
  fecha_publicacion: string | null;
  fecha_vigencia: string | null;
  estado_vigencia: EstadoVigencia;
  nivel_verificacion: NivelVerificacion;
  elegible_primary: boolean;
  fuente: string | null;
  fuente_pdf_hash: string | null;
  adjudicacion_ref: string | null;
  precision_fecha: PrecisionFecha;
  nota: string | null;
}

export type CodigoAdvertencia =
  | 'VACATIO_LEGIS'
  | 'TEXTO_NO_VERIFICADO'
  | 'VIGENCIA_UNKNOWN'
  | 'VIGENCIA_PRESUNTA'
  | 'NORMA_NO_VIGENTE'
  | 'FECHA_EN_RANGO'
  | 'FECHA_EN_RANGO_INCIERTO'
  | 'VERIFICACION_SECUNDARIA'
  | 'REFORMA_POSTERIOR'
  | 'REFORMA_POSTERIOR_SIN_TEXTO'
  | 'SIN_REVIVISCENCIA'
  | 'VIGENCIA_CERRADA_SIN_EVENTO'
  | 'NO_ELEGIBLE_PRIMARY';

export interface Advertencia {
  codigo: CodigoAdvertencia;
  mensaje: string;
  /** VACATIO_LEGIS: versión ya publicada que aún no rige. */
  version_nueva?: string;
  /** VACATIO_LEGIS: desde cuándo rige la versión nueva. REFORMA_POSTERIOR*: vigente_desde de la posterior. */
  rige_desde?: string;
  /** REFORMA_POSTERIOR*: version_id de la versión posterior. */
  version_posterior?: string;
}

/** Aviso sobre una versión que viaja en `contexto`. */
export interface AvisoContexto {
  version_id: string;
  advertencia: Advertencia;
}

/** Fila con un problema de datos que debe revisar quien cura el corpus. */
export interface CuracionDatos {
  version_id: string;
  motivo: 'VIGENCIA_CERRADA_SIN_EVENTO';
  mensaje: string;
}

export type MotivoFalloCerrado =
  | 'FECHA_INVALIDA'
  | 'SIN_VERSIONES'
  | 'ANTERIOR_A_PRIMERA_VERSION'
  | 'HUECO_ENTRE_VERSIONES'
  | 'POSTERIOR_A_VERSION_CERRADA'
  | 'VERSIONES_SOLAPADAS'
  | 'SIN_REVIVISCENCIA';

export type ResultadoVersion =
  | {
      estado: 'PRIMARY';
      version: NormaVersion;
      advertencias: Advertencia[];
      contexto: NormaVersion[];
      avisosContexto: AvisoContexto[];
      curacionDatos: CuracionDatos[];
    }
  | {
      estado: 'CONTEXT';
      version: NormaVersion;
      advertencias: Advertencia[];
      contexto: NormaVersion[];
      avisosContexto: AvisoContexto[];
      curacionDatos: CuracionDatos[];
    }
  | { estado: 'FALLO_CERRADO'; motivo: MotivoFalloCerrado; mensaje: string; advertencias?: Advertencia[] };

const MENSAJE_FALLO = 'no hay texto verificado para esa fecha';
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** true si es una fecha ISO calendario válida. */
export function esFechaIso(s: string): boolean {
  const m = ISO_DATE_RE.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** Suma días a una fecha ISO (UTC, sin zonas horarias). */
export function sumarDias(iso: string, dias: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + dias));
  return dt.toISOString().slice(0, 10);
}

/** Días de vacatio por defecto cuando el decreto no fija fecha de vigencia. */
export const VACATIO_DIAS_POR_DEFECTO = 20;

/**
 * Fecha desde la que rige una norma: la de vigencia si el decreto la fija; si
 * calla, 20 días después de publicada. Devuelve null si no hay ninguna de las
 * dos (no se inventa una fecha).
 */
export function calcularVigenteDesde(p: {
  fecha_vigencia?: string | null;
  fecha_publicacion?: string | null;
}): string | null {
  if (p.fecha_vigencia) return p.fecha_vigencia;
  if (p.fecha_publicacion) return sumarDias(p.fecha_publicacion, VACATIO_DIAS_POR_DEFECTO);
  return null;
}

/** Ventana [desde, hasta) contiene la fecha. Comparación léxica válida en ISO. */
function contiene(v: NormaVersion, fecha: string): boolean {
  return v.vigente_desde <= fecha && (v.vigente_hasta === null || fecha < v.vigente_hasta);
}

/**
 * Pares de versiones de la misma (instrumento, unidad, nivel_verificacion) cuyas
 * ventanas se solapan. Fuentes de distinto nivel pueden coexistir para la misma
 * fecha: la precedencia entre ellas la resuelve resolverVersion.
 */
export function detectarSolapes(versiones: readonly NormaVersion[]): [NormaVersion, NormaVersion][] {
  const solapes: [NormaVersion, NormaVersion][] = [];
  for (let i = 0; i < versiones.length; i++) {
    for (let j = i + 1; j < versiones.length; j++) {
      const a = versiones[i];
      const b = versiones[j];
      if (a.instrumento_id !== b.instrumento_id || a.unidad !== b.unidad) continue;
      if (a.nivel_verificacion !== b.nivel_verificacion) continue;
      const finA = a.vigente_hasta ?? '9999-12-31';
      const finB = b.vigente_hasta ?? '9999-12-31';
      if (a.vigente_desde < finB && b.vigente_desde < finA) solapes.push([a, b]);
    }
  }
  return solapes;
}

function fallo(motivo: MotivoFalloCerrado, advertencias?: Advertencia[]): ResultadoVersion {
  return advertencias
    ? { estado: 'FALLO_CERRADO', motivo, mensaje: MENSAJE_FALLO, advertencias }
    : { estado: 'FALLO_CERRADO', motivo, mensaje: MENSAJE_FALLO };
}

/** Sin texto utilizable: null, vacío o sólo espacios. */
function sinTexto(v: NormaVersion): boolean {
  return v.texto === null || v.texto.trim() === '';
}

/**
 * Causa jurídica que impide servir una versión como PRIMARY, distinta de la
 * falta de texto: vigencia FALSE o UNKNOWN, fecha en RANGO, o fecha dentro del
 * margen de incertidumbre del inicio de vigencia. elegible_primary=false se
 * trata aparte (sólo es causa jurídica si la versión tiene texto, porque sin
 * texto el CHECK de la tabla lo fuerza a false).
 */
function causaJuridica(v: NormaVersion, fecha: string): boolean {
  if (v.estado_vigencia === 'FALSE' || v.estado_vigencia === 'UNKNOWN') return true;
  if (v.precision_fecha === 'RANGO') return true;
  return (
    v.vigente_desde_min !== null &&
    v.vigente_desde_max !== null &&
    v.vigente_desde_min <= fecha &&
    fecha <= v.vigente_desde_max
  );
}

/** La única razón para no servirla como PRIMARY es que no tiene texto. */
function soloFaltaTexto(v: NormaVersion, fecha: string): boolean {
  return sinTexto(v) && !causaJuridica(v, fecha);
}

/** Rango de precedencia entre fuentes (mayor gana). */
const RANGO_NIVEL: Record<NivelVerificacion, number> = {
  PRIMARIA_IMAGEN: 3,
  PRIMARIA_TEXTO: 2,
  SECUNDARIA: 1,
};

function advertenciasDe(v: NormaVersion, fecha: string): Advertencia[] {
  const adv: Advertencia[] = [];
  if (sinTexto(v)) {
    adv.push({ codigo: 'TEXTO_NO_VERIFICADO', mensaje: 'La versión no tiene texto verificado.' });
  }
  if (v.estado_vigencia === 'UNKNOWN') {
    adv.push({ codigo: 'VIGENCIA_UNKNOWN', mensaje: 'La vigencia de esta versión no está determinada.' });
  } else if (v.estado_vigencia === 'TRUE_PRESUNTA') {
    adv.push({ codigo: 'VIGENCIA_PRESUNTA', mensaje: 'La vigencia de esta versión es presunta, no verificada.' });
  } else if (v.estado_vigencia === 'FALSE') {
    adv.push({ codigo: 'NORMA_NO_VIGENTE', mensaje: 'La unidad no estaba vigente en esa fecha (derogada o declarada inconstitucional).' });
  }
  if (v.precision_fecha === 'RANGO') {
    adv.push({ codigo: 'FECHA_EN_RANGO', mensaje: 'La fecha de vigencia de esta versión es un rango, no un día exacto.' });
  }
  if (
    v.vigente_desde_min !== null &&
    v.vigente_desde_max !== null &&
    v.vigente_desde_min <= fecha &&
    fecha <= v.vigente_desde_max
  ) {
    adv.push({ codigo: 'FECHA_EN_RANGO_INCIERTO', mensaje: 'La fecha consultada cae dentro del margen de incertidumbre del inicio de vigencia.' });
  }
  if (v.nivel_verificacion === 'SECUNDARIA') {
    adv.push({ codigo: 'VERIFICACION_SECUNDARIA', mensaje: 'La versión se apoya sólo en fuente secundaria.' });
  }
  if (!v.elegible_primary) {
    adv.push({ codigo: 'NO_ELEGIBLE_PRIMARY', mensaje: 'La versión no está marcada como elegible para servirse como fuente primaria.' });
  }
  return adv;
}

/**
 * PRIMARY exige texto, vigencia TRUE o TRUE_PRESUNTA, fecha no RANGO y
 * elegible_primary. Nunca: texto null o vacío, UNKNOWN, FALSE, RANGO, elegible_primary=false.
 * Una fecha dentro del margen de incertidumbre del inicio de vigencia tampoco es
 * PRIMARY (el margen sólo existe cuando se desconoce el día exacto).
 */
function esPrimary(v: NormaVersion, fecha: string): boolean {
  if (sinTexto(v)) return false;
  if (v.estado_vigencia !== 'TRUE' && v.estado_vigencia !== 'TRUE_PRESUNTA') return false;
  if (v.precision_fecha === 'RANGO') return false;
  if (!v.elegible_primary) return false;
  if (
    v.vigente_desde_min !== null &&
    v.vigente_desde_max !== null &&
    v.vigente_desde_min <= fecha &&
    fecha <= v.vigente_desde_max
  ) {
    return false;
  }
  return true;
}

/** Eventos posteriores que pueden promover su texto a PRIMARY. */
const EVENTOS_PROMOVIBLES: readonly TipoEvento[] = ['REFORMA', 'TEXTO_NUEVO_MISMO_NUMERO', 'ADICION'];

/** Eventos posteriores que bloquean el texto anterior pero nunca promueven texto. */
const EVENTOS_BLOQUEANTES: readonly TipoEvento[] = ['DEROGACION_EXPRESA', 'INCONSTITUCIONALIDAD'];

/** Marcadores que nunca identifican un decreto o fallo concreto. */
const MODIFICADOR_NO_IDENTIFICA_RE =
  /\b(?:pendiente|varios|por definir|tbd)\b|s\s*\/\s*n\b|sin\s+n[uú]mero|\bn\s*\/\s*d\b|\bgaceta\b/i;

/** Número y año: «59-2015», «137-06». */
const NUM_ANIO = String.raw`\d{1,5}\s*-\s*(?:\d{2}|\d{4})`;
/** «No.», «Nº», «N°» opcional delante del número. */
const NUMERO = String.raw`(?:N(?:o|º|°)\.?\s*)?`;
/** Siglas de un identificador alfanumérico: «PCSJ-», «RI-», «PCM-». */
const SIGLAS = String.raw`[A-Z]{1,8}(?:-[A-Z]{1,8})*\s*-\s*`;

/**
 * Lista blanca de vínculos (dictamen CLO 18-oct-2026). Cada patrón cubre el
 * valor recortado completo.
 */
const MODIFICADOR_IDENTIFICA_RES: readonly RegExp[] = [
  // Decreto (legislativo) con número y año: «D.59-2015», «Decreto No. 168-2009».
  new RegExp(String.raw`^(?:D\.?|Decreto(?:\s+Legislativo)?)\s*${NUMERO}${NUM_ANIO}$`, 'i'),
  // Decreto Ejecutivo con número y año: «DE 12-2018», «Decreto Ejecutivo PCM-005-2020».
  new RegExp(String.raw`^(?:D\.?\s*E\.?|Decreto\s+Ejecutivo)\s*${NUMERO}(?:${SIGLAS})?${NUM_ANIO}$`, 'i'),
  // Acuerdo Ejecutivo con número y año: «AE 679-2014», «Acuerdo Ejecutivo 679-2014».
  new RegExp(String.raw`^(?:A\.?\s*E\.?|Acuerdo\s+Ejecutivo)\s*${NUMERO}(?:${SIGLAS})?${NUM_ANIO}$`, 'i'),
  // Resolución con su identificador: «PCSJ-17-2012», «Resolución PCSJ-17-2012».
  new RegExp(String.raw`^(?:Resoluci[oó]n\s*${NUMERO})?[A-Z]{2,8}(?:-[A-Z]{1,8})*\s*-\s*${NUM_ANIO}$`, 'i'),
  // Sentencia o fallo con su expediente: «RI-137-06», «Sentencia RI-137-06».
  new RegExp(String.raw`^(?:Sentencia|Fallo|Expediente|Exp\.)\s*${NUMERO}${SIGLAS}${NUM_ANIO}$`, 'i'),
];

/**
 * El instrumento_modificador identifica un decreto o fallo concreto (dictamen
 * CLO 18-oct-2026, lista blanca): Decreto, Decreto Ejecutivo o Acuerdo Ejecutivo
 * con número y año («D.59-2015», «AE 679-2014»); Resolución con su identificador
 * («PCSJ-17-2012», Reglamento del Notariado); sentencia o fallo con su
 * expediente («RI-137-06»). No cuentan «s/n», «sin número (año)», «pendiente»,
 * «varios», vacío ni null. La Gaceta sola nunca es vínculo: un mismo número trae
 * varios instrumentos; va en gaceta_numero como dato de la fuente.
 */
export function identificaDecretoOFallo(modificador: string | null): boolean {
  if (modificador === null) return false;
  const m = modificador.trim();
  if (m === '' || MODIFICADOR_NO_IDENTIFICA_RE.test(m)) return false;
  return MODIFICADOR_IDENTIFICA_RES.some((re) => re.test(m));
}

/** Evento real: no ORIGINAL y vinculado a un decreto o fallo identificado. */
function esEventoReal(v: NormaVersion): boolean {
  return v.tipo_evento !== 'ORIGINAL' && identificaDecretoOFallo(v.instrumento_modificador);
}

function avisoVigenciaCerradaSinEvento(v: NormaVersion): Advertencia {
  return {
    codigo: 'VIGENCIA_CERRADA_SIN_EVENTO',
    mensaje: `La versión ${v.version_id} (nivel_verificacion ${v.nivel_verificacion}, vigente_desde ${v.vigente_desde}) tiene la vigencia cerrada el ${v.vigente_hasta} sin un evento posterior que lo explique; no se afirma que fue derogada y se registra para curación de datos.`,
    version_posterior: v.version_id,
    rige_desde: v.vigente_desde,
  };
}

function curacionDe(v: NormaVersion): CuracionDatos {
  return {
    version_id: v.version_id,
    motivo: 'VIGENCIA_CERRADA_SIN_EVENTO',
    mensaje: `Vigencia cerrada el ${v.vigente_hasta} sin evento posterior vinculado: revisar vigente_hasta o registrar el evento que la cierra.`,
  };
}

/** Vinculada a un evento de reforma identificado con su decreto o fallo. */
function vinculadaAReforma(v: NormaVersion): boolean {
  return EVENTOS_PROMOVIBLES.includes(v.tipo_evento) && identificaDecretoOFallo(v.instrumento_modificador);
}

function descripcionPosterior(p: NormaVersion): string {
  return `${p.version_id} (nivel_verificacion ${p.nivel_verificacion}, vigente_desde ${p.vigente_desde})`;
}

function avisoReformaPosterior(p: NormaVersion): Advertencia {
  return {
    codigo: 'REFORMA_POSTERIOR',
    mensaje: `Existe una versión posterior ${descripcionPosterior(p)}; esta versión es histórica o no es verificable como PRIMARY y se muestra sólo como contexto.`,
    version_posterior: p.version_id,
    rige_desde: p.vigente_desde,
  };
}

function avisoReformaPosteriorSinTexto(p: NormaVersion): Advertencia {
  return {
    codigo: 'REFORMA_POSTERIOR_SIN_TEXTO',
    mensaje: `La versión posterior ${descripcionPosterior(p)} no tiene texto incorporado; el texto de la versión devuelta se muestra sólo como contexto.`,
    version_posterior: p.version_id,
    rige_desde: p.vigente_desde,
  };
}

/**
 * Versión de (instrumento, unidad) vigente en `fecha` (ISO YYYY-MM-DD) entre las
 * `versiones` dadas (filas de norma_version; se filtran por instrumento y unidad).
 */
export function resolverVersion(
  instrumento: string,
  unidad: string,
  fecha: string,
  versiones: readonly NormaVersion[],
): ResultadoVersion {
  if (!esFechaIso(fecha)) return fallo('FECHA_INVALIDA');

  const propias = versiones
    .filter((v) => v.instrumento_id === instrumento && v.unidad === unidad)
    .sort((a, b) => (a.vigente_desde < b.vigente_desde ? -1 : a.vigente_desde > b.vigente_desde ? 1 : 0));
  if (propias.length === 0) return fallo('SIN_VERSIONES');
  if (detectarSolapes(propias).length > 0) return fallo('VERSIONES_SOLAPADAS');

  const candidatas = propias
    .filter((v) => contiene(v, fecha))
    .sort((x, y) => RANGO_NIVEL[y.nivel_verificacion] - RANGO_NIVEL[x.nivel_verificacion]);
  if (candidatas.length === 0) {
    if (fecha < propias[0].vigente_desde) return fallo('ANTERIOR_A_PRIMERA_VERSION');
    if (propias.every((v) => v.vigente_hasta !== null && fecha >= v.vigente_hasta)) {
      const ultima = [...propias].sort(
        (x, y) =>
          (x.vigente_desde < y.vigente_desde ? 1 : x.vigente_desde > y.vigente_desde ? -1 : 0) ||
          RANGO_NIVEL[y.nivel_verificacion] - RANGO_NIVEL[x.nivel_verificacion],
      )[0];
      // Dictamen CLO 18-oct-2026: sin evento que cierre la vigencia no hay prueba
      // de derogación; se devuelve su texto como CONTEXT y se marca para curación.
      if (!esEventoReal(ultima)) {
        return {
          estado: 'CONTEXT',
          version: ultima,
          advertencias: [...advertenciasDe(ultima, fecha), avisoVigenciaCerradaSinEvento(ultima)],
          contexto: [],
          avisosContexto: [],
          curacionDatos: [curacionDe(ultima)],
        };
      }
      return fallo('POSTERIOR_A_VERSION_CERRADA');
    }
    return fallo('HUECO_ENTRE_VERSIONES');
  }
  // Precedencia: gana la fuente de mayor rango que no sea sólo «sin texto».
  const vigente = candidatas.find((v) => !soloFaltaTexto(v, fecha)) ?? candidatas[0];

  // Dictamen CLO 17-oct-2026: versión posterior (de cualquier nivel) a la vigente.
  const reformaPosterior = candidatas
    .filter((v) => v !== vigente && v.vigente_desde > vigente.vigente_desde)
    .sort(
      (x, y) =>
        (x.vigente_desde < y.vigente_desde ? 1 : x.vigente_desde > y.vigente_desde ? -1 : 0) ||
        RANGO_NIVEL[y.nivel_verificacion] - RANGO_NIVEL[x.nivel_verificacion],
    )[0];

  // La posterior se evalúa sólo por sus propios requisitos: la causa jurídica de
  // la anterior no impide promoverla (fallo CLO 17-oct-2026).
  const posteriorBloqueante =
    reformaPosterior !== undefined && EVENTOS_BLOQUEANTES.includes(reformaPosterior.tipo_evento);
  const promueve =
    reformaPosterior !== undefined &&
    !posteriorBloqueante &&
    esPrimary(reformaPosterior, fecha) &&
    vinculadaAReforma(reformaPosterior);

  // Derogación o inconstitucionalidad posterior: se devuelve la propia posterior
  // (CONTEXT, nunca PRIMARY) y el texto anterior queda como contexto.
  const servida = promueve || posteriorBloqueante ? (reformaPosterior as NormaVersion) : vigente;

  // Versiones que empezaron después de la servida y ya cerraron antes de `fecha`.
  const cerradasPosteriores = propias
    .filter((v) => v.vigente_desde > servida.vigente_desde && v.vigente_hasta !== null && v.vigente_hasta <= fecha)
    .sort((x, y) => (x.vigente_desde < y.vigente_desde ? 1 : x.vigente_desde > y.vigente_desde ? -1 : 0));
  // Sin reviviscencia automática: si la cerrada es un evento real, el texto
  // anterior no revive.
  const reformaCerrada = cerradasPosteriores.find(esEventoReal);
  // Sin evento real (p. ej. una edición ORIGINAL cerrada): error de datos
  // (dictamen CLO 18-oct-2026).
  const cerradasSinEvento = cerradasPosteriores.filter((v) => !esEventoReal(v));
  if (reformaCerrada) {
    return fallo('SIN_REVIVISCENCIA', [
      {
        codigo: 'SIN_REVIVISCENCIA',
        mensaje: `La versión ${reformaCerrada.version_id} (nivel_verificacion ${reformaCerrada.nivel_verificacion}, vigente_desde ${reformaCerrada.vigente_desde}) cerró su vigencia el ${reformaCerrada.vigente_hasta} y ningún evento posterior restablece el texto anterior ${servida.version_id}.`,
        version_posterior: reformaCerrada.version_id,
        rige_desde: reformaCerrada.vigente_desde,
      },
    ]);
  }

  const contexto = [...candidatas.filter((v) => v !== servida), ...cerradasSinEvento];
  const advertencias = advertenciasDe(servida, fecha);
  const avisosContexto: AvisoContexto[] = [];

  if (reformaPosterior) {
    if (promueve || posteriorBloqueante) {
      for (const v of contexto) {
        avisosContexto.push({ version_id: v.version_id, advertencia: avisoReformaPosterior(reformaPosterior) });
      }
    } else {
      advertencias.push(avisoReformaPosterior(reformaPosterior));
      if (sinTexto(reformaPosterior)) advertencias.push(avisoReformaPosteriorSinTexto(reformaPosterior));
      for (const v of contexto) {
        avisosContexto.push({ version_id: v.version_id, advertencia: avisoReformaPosterior(reformaPosterior) });
      }
    }
  }

  // Vacatio legis: versión posterior ya publicada pero aún sin regir en `fecha`.
  const enVacatio = propias.find(
    (v) => v.vigente_desde > fecha && v.fecha_publicacion !== null && v.fecha_publicacion <= fecha,
  );
  if (enVacatio) {
    advertencias.push({
      codigo: 'VACATIO_LEGIS',
      mensaje: `La versión ${enVacatio.version_id} ya está publicada y regirá desde ${enVacatio.vigente_desde}.`,
      version_nueva: enVacatio.version_id,
      rige_desde: enVacatio.vigente_desde,
    });
  }

  for (const v of cerradasSinEvento) {
    advertencias.push(avisoVigenciaCerradaSinEvento(v));
    avisosContexto.push({ version_id: v.version_id, advertencia: avisoVigenciaCerradaSinEvento(v) });
  }
  const curacionDatos = cerradasSinEvento.map(curacionDe);

  return esPrimary(servida, fecha) &&
    !EVENTOS_BLOQUEANTES.includes(servida.tipo_evento) &&
    (reformaPosterior === undefined || promueve) &&
    cerradasSinEvento.length === 0
    ? { estado: 'PRIMARY', version: servida, advertencias, contexto, avisosContexto, curacionDatos }
    : { estado: 'CONTEXT', version: servida, advertencias, contexto, avisosContexto, curacionDatos };
}
