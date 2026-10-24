/**
 * lib/legal-retrieval/clo-guards.ts
 * Salvaguardas CLO de recuperación (24-oct-2026). Módulo puro: sin red, base de datos ni entorno.
 *
 * Decide qué papel puede jugar un fragmento recuperado: PRIMARY (fundamento citable) o CONTEXT (referencia con aviso). La evidencia es
 * SUFICIENTE solo si hay al menos un PRIMARY; un fragmento CONTEXT nunca basta por sí solo.
 *
 *  (a) Sin `instrument_id` (instrumento identificado a partir de la fuente real o de metadata.norm_id): nunca PRIMARY; como máximo CONTEXT.
 *  (b) Sentencias: tipo de fuente propio (JURISPRUDENCIA), nunca legislación; una no hondureña jamás se presenta como derecho de Honduras.
 *  (c) Código del Notariado D.353-2005: art. 17 = HUECO; arts. 11 y 27 = TEXTO_DIVERGENTE (texto del D.77-2006, Gaceta 31,091, no cotejado).
 *      Los tres quedan bloqueados como PRIMARY.
 *  (d) Reglamento PCSJ-17-2012: bloqueado como PRIMARY hasta que haya pliego CLO; solo CONTEXT.
 *  (e) Filas de la materia 03_NOTARIAL (protocolo y práctica) sin identidad normativa notarial: nunca se citan como norma.
 *
 * Quitar un bloqueo es una decisión del CLO, no un ajuste de código.
 */
import type { FragmentoRAG } from './types';
import { identidadDeFuente, type InstrumentoNormalizado } from './instrument-identity';

export type RolEvidencia = 'PRIMARY' | 'CONTEXT';
export type TipoFuenteClo = 'NORMA' | 'JURISPRUDENCIA' | 'DOCTRINA' | 'PRACTICA_NOTARIAL';

/** Identificadores de instrumento: los del Exact Resolver más dos instrumentos presentes en el corpus que el resolver no modela. */
export type InstrumentId = InstrumentoNormalizado | 'LEY_ESPECIAL_ADOPCIONES' | 'DECRETO_77_2006';

export type CodigoBloqueoClo =
  | 'SIN_INSTRUMENT_ID'
  | 'SENTENCIA_NO_ES_NORMA'
  | 'SENTENCIA_NO_HONDURENA'
  | 'DOCTRINA_NO_ES_NORMA'
  | 'NOTARIADO_HUECO'
  | 'NOTARIADO_TEXTO_DIVERGENTE'
  | 'INSTRUMENTO_SIN_PLIEGO_CLO'
  | 'PRACTICA_NOTARIAL_NO_NORMA'
  | 'INSTRUMENTO_DISTINTO_DEL_SOLICITADO';

export const MATERIA_NOTARIAL = '03_NOTARIAL';

/** Artículos del Código del Notariado D.353-2005 bloqueados como PRIMARY, con su causa. */
export const NOTARIADO_ARTICULOS_BLOQUEADOS: Readonly<Record<string, CodigoBloqueoClo>> = Object.freeze({
  '17': 'NOTARIADO_HUECO',
  '11': 'NOTARIADO_TEXTO_DIVERGENTE',
  '27': 'NOTARIADO_TEXTO_DIVERGENTE',
});

/** Instrumentos que no pueden ser PRIMARY mientras no exista pliego CLO. */
export const INSTRUMENTOS_SIN_PLIEGO_CLO: ReadonlySet<InstrumentId> = new Set<InstrumentId>(['REGLAMENTO_NOTARIADO']);

/** Instrumentos normativos notariales: las filas 03_NOTARIAL con otra identidad (protocolo y práctica) no son norma. */
const INSTRUMENTOS_NORMATIVOS_NOTARIALES: ReadonlySet<InstrumentId> = new Set<InstrumentId>(['CODIGO_NOTARIADO', 'REGLAMENTO_NOTARIADO', 'DECRETO_77_2006']);

const AVISOS: Readonly<Record<CodigoBloqueoClo, string>> = Object.freeze({
  SIN_INSTRUMENT_ID: 'Fragmento sin instrumento identificado: solo contexto; no es fundamento ni se cita como norma.',
  SENTENCIA_NO_ES_NORMA: 'Sentencia: jurisprudencia, no legislación. No se presenta como norma.',
  SENTENCIA_NO_HONDURENA: 'Sentencia no hondureña: jurisprudencia extranjera o internacional; NO es derecho de Honduras.',
  DOCTRINA_NO_ES_NORMA: 'Doctrina o comentario: no vinculante, no es norma.',
  NOTARIADO_HUECO: 'Código del Notariado D.353-2005, art. 17: HUECO en el corpus; no se usa como fundamento hasta la verificación del CLO.',
  NOTARIADO_TEXTO_DIVERGENTE:
    'Código del Notariado D.353-2005: TEXTO_DIVERGENTE respecto del texto del D.77-2006 (Gaceta 31,091), no cotejado; no se usa como fundamento hasta la verificación del CLO.',
  INSTRUMENTO_SIN_PLIEGO_CLO: 'Instrumento sin pliego de verificación CLO: solo contexto hasta que el CLO lo apruebe.',
  PRACTICA_NOTARIAL_NO_NORMA: 'Material de protocolo y práctica notarial (03_NOTARIAL): no es norma y nunca se cita como tal.',
  INSTRUMENTO_DISTINTO_DEL_SOLICITADO: 'La fuente real de la fila es otro instrumento distinto del solicitado: solo contexto, no es el artículo pedido.',
});

/** Campos mínimos de un fragmento (FragmentoRAG o una fila de la base con `materia`). */
export type FragmentoClasificable = Pick<FragmentoRAG, 'fuente' | 'fuente_tipo' | 'jurisdiccion'> &
  Partial<Pick<FragmentoRAG, 'num_articulo' | 'instrument_id' | 'materia'>> & { metadata?: Record<string, unknown> | null };

export interface ContextoClasificacion {
  /** Materia conocida de la consulta/fila cuando el fragmento no la trae (p. ej. filtro de materia de la RPC semántica). */
  materia?: string | null;
  /**
   * Instrumento que el Exact Resolver ya confirmó con un dato real de la fila (fuente o metadata.documento_origen). Si la fuente declara
   * otro instrumento, la fila es CONTEXT; si no declara ninguno, hereda este.
   */
  instrumentoConfirmado?: InstrumentId | null;
}

export interface ClasificacionClo {
  instrumentId: InstrumentId | null;
  tipoFuente: TipoFuenteClo;
  rol: RolEvidencia;
  bloqueos: CodigoBloqueoClo[];
  avisos: string[];
}

/** Número de artículo normalizado ("Art. 017." → "17"; "123-A" se conserva); null si no hay número. */
export function normalizarNumeroArticulo(n: string | null | undefined): string | null {
  if (n === null || n === undefined) return null;
  const limpio = String(n).trim().replace(/^art(?:[ií]culo|\.)?\s*/i, '').replace(/[.\s]+$/g, '').replace(/^0+(?=\d)/, '');
  return limpio === '' ? null : limpio.toUpperCase();
}

/** `instrument_id` de un fragmento: el declarado, el de la fuente real (D.77-2006 y Adopciones incluidos) o el de metadata.norm_id. Nunca se infiere de la materia. */
export function instrumentIdDeFragmento(f: FragmentoClasificable): InstrumentId | null {
  if (f.instrument_id) return f.instrument_id as InstrumentId;
  const fuente = f.fuente ?? '';
  // El D.77-2006 se evalúa antes: su fuente ("Reformas al Código del Notariado") contiene el nombre del Código y no es el Código.
  if (/decreto\s+(?:no\.?\s*)?77-2006/i.test(fuente)) return 'DECRETO_77_2006';
  if (/ley\s+especial\s+de\s+adopciones|decreto\s+(?:no\.?\s*)?102-2018/i.test(fuente)) return 'LEY_ESPECIAL_ADOPCIONES';
  const desdeFuente = identidadDeFuente(fuente);
  if (desdeFuente) return desdeFuente;
  const norm = f.metadata && typeof f.metadata === 'object' ? f.metadata.norm_id : undefined;
  if (typeof norm === 'string' && norm.trim() !== '') {
    const n = norm.toLowerCase();
    if (/reglamento_notariado/.test(n)) return 'REGLAMENTO_NOTARIADO';
    if (/decreto_77_2006/.test(n)) return 'DECRETO_77_2006';
    if (/codigo_notariado/.test(n)) return 'CODIGO_NOTARIADO';
  }
  return null;
}

export function clasificarFragmentoClo(f: FragmentoClasificable, ctx: ContextoClasificacion = {}): ClasificacionClo {
  const derivado = instrumentIdDeFragmento(f);
  const instrumentId = derivado ?? ctx.instrumentoConfirmado ?? null;
  const materia = f.materia ?? ctx.materia ?? null;
  const bloqueos: CodigoBloqueoClo[] = [];
  if (derivado !== null && ctx.instrumentoConfirmado && derivado !== ctx.instrumentoConfirmado) bloqueos.push('INSTRUMENTO_DISTINTO_DEL_SOLICITADO');

  // (b) Las sentencias tienen su propio tipo de fuente. Una sentencia no hondureña (o sin país) jamás es derecho de Honduras.
  const esSentencia = f.fuente_tipo === 'sentencia';
  const esDoctrina = f.fuente_tipo === 'doctrina';
  if (esSentencia) {
    bloqueos.push(f.jurisdiccion === 'HN' ? 'SENTENCIA_NO_ES_NORMA' : 'SENTENCIA_NO_HONDURENA');
  } else if (esDoctrina) {
    bloqueos.push('DOCTRINA_NO_ES_NORMA');
  }

  // (e) Protocolo y práctica notarial: materia 03_NOTARIAL sin identidad normativa notarial.
  const esPracticaNotarial = !esSentencia && !esDoctrina && materia === MATERIA_NOTARIAL
    && (instrumentId === null || !INSTRUMENTOS_NORMATIVOS_NOTARIALES.has(instrumentId));
  if (esPracticaNotarial) bloqueos.push('PRACTICA_NOTARIAL_NO_NORMA');

  // (a) Sin instrumento identificado no hay PRIMARY (las sentencias/doctrina/práctica ya llevan su propio bloqueo).
  if (instrumentId === null && !esSentencia && !esDoctrina && !esPracticaNotarial) bloqueos.push('SIN_INSTRUMENT_ID');

  // (c) Código del Notariado D.353-2005: HUECO y TEXTO_DIVERGENTE.
  if (instrumentId === 'CODIGO_NOTARIADO') {
    const causa = NOTARIADO_ARTICULOS_BLOQUEADOS[normalizarNumeroArticulo(f.num_articulo) ?? ''];
    if (causa) bloqueos.push(causa);
  }

  // (d) Instrumento sin pliego CLO (Reglamento PCSJ-17-2012).
  if (instrumentId !== null && INSTRUMENTOS_SIN_PLIEGO_CLO.has(instrumentId)) bloqueos.push('INSTRUMENTO_SIN_PLIEGO_CLO');

  const tipoFuente: TipoFuenteClo = esSentencia ? 'JURISPRUDENCIA' : esDoctrina ? 'DOCTRINA' : esPracticaNotarial ? 'PRACTICA_NOTARIAL' : 'NORMA';
  return {
    instrumentId,
    tipoFuente,
    rol: bloqueos.length === 0 ? 'PRIMARY' : 'CONTEXT',
    bloqueos,
    avisos: bloqueos.map((b) => AVISOS[b]),
  };
}

/** Copia cada fragmento con su clasificación (`instrument_id`, `rol_evidencia`, `bloqueos_clo`, `avisos_clo`). Idempotente. */
export function anotarFragmentosClo<T extends FragmentoRAG>(fragmentos: readonly T[], ctx: ContextoClasificacion = {}): T[] {
  return fragmentos.map((f) => {
    const c = clasificarFragmentoClo(f, ctx);
    return {
      ...f,
      instrument_id: c.instrumentId,
      rol_evidencia: c.rol,
      bloqueos_clo: c.bloqueos,
      avisos_clo: c.avisos,
    };
  });
}

export interface ResumenEvidenciaClo {
  primarios: number;
  contexto: number;
  /** true solo con al menos un PRIMARY. Lo único que cuenta como evidencia para el Evidence Gate. */
  suficiente: boolean;
  bloqueos: CodigoBloqueoClo[];
}

export function resumenEvidenciaClo(fragmentos: readonly FragmentoRAG[], ctx: ContextoClasificacion = {}): ResumenEvidenciaClo {
  let primarios = 0;
  const bloqueos = new Set<CodigoBloqueoClo>();
  for (const f of fragmentos) {
    const rol = f.rol_evidencia ?? clasificarFragmentoClo(f, ctx).rol;
    if (rol === 'PRIMARY') primarios += 1;
    for (const b of (f.bloqueos_clo as CodigoBloqueoClo[] | undefined) ?? clasificarFragmentoClo(f, ctx).bloqueos) bloqueos.add(b);
  }
  return { primarios, contexto: fragmentos.length - primarios, suficiente: primarios > 0, bloqueos: [...bloqueos] };
}

/** true si el fragmento puede presentarse como cita formal (norma PRIMARY). */
export function esCitableComoNorma(f: FragmentoRAG, ctx: ContextoClasificacion = {}): boolean {
  return (f.rol_evidencia ?? clasificarFragmentoClo(f, ctx).rol) === 'PRIMARY';
}
