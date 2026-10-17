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
 *    `contexto` y nunca como PRIMARY. Si la ganadora no es elegible, no se cae
 *    a una fuente inferior (fail-closed).
 *  - Una reforma o fallo posterior a la edición CEDIJ que no esté incorporado se
 *    marca en los datos (elegible_primary=false + nota). No hay detección
 *    automática.
 *  - Sin versión, fecha en un hueco, anterior a la primera versión o posterior a
 *    una versión cerrada: FALLO_CERRADO. Nunca se rellena con la más cercana.
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
  | 'NO_ELEGIBLE_PRIMARY';

export interface Advertencia {
  codigo: CodigoAdvertencia;
  mensaje: string;
  /** VACATIO_LEGIS: versión ya publicada que aún no rige. */
  version_nueva?: string;
  /** VACATIO_LEGIS: desde cuándo rige la versión nueva. */
  rige_desde?: string;
}

export type MotivoFalloCerrado =
  | 'FECHA_INVALIDA'
  | 'SIN_VERSIONES'
  | 'ANTERIOR_A_PRIMERA_VERSION'
  | 'HUECO_ENTRE_VERSIONES'
  | 'POSTERIOR_A_VERSION_CERRADA'
  | 'VERSIONES_SOLAPADAS';

export type ResultadoVersion =
  | { estado: 'PRIMARY'; version: NormaVersion; advertencias: Advertencia[]; contexto: NormaVersion[] }
  | { estado: 'CONTEXT'; version: NormaVersion; advertencias: Advertencia[]; contexto: NormaVersion[] }
  | { estado: 'FALLO_CERRADO'; motivo: MotivoFalloCerrado; mensaje: string };

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

function fallo(motivo: MotivoFalloCerrado): ResultadoVersion {
  return { estado: 'FALLO_CERRADO', motivo, mensaje: MENSAJE_FALLO };
}

/** Sin texto utilizable: null, vacío o sólo espacios. */
function sinTexto(v: NormaVersion): boolean {
  return v.texto === null || v.texto.trim() === '';
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
      return fallo('POSTERIOR_A_VERSION_CERRADA');
    }
    return fallo('HUECO_ENTRE_VERSIONES');
  }
  // Precedencia: gana la fuente de mayor rango; las demás pasan a contexto.
  const [vigente, ...contexto] = candidatas;

  const advertencias = advertenciasDe(vigente, fecha);

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

  return esPrimary(vigente, fecha)
    ? { estado: 'PRIMARY', version: vigente, advertencias, contexto }
    : { estado: 'CONTEXT', version: vigente, advertencias, contexto };
}
