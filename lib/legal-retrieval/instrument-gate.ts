/**
 * lib/legal-retrieval/instrument-gate.ts
 * P1 — intención instrumental (producción). Módulo puro: sin Supabase, sin red.
 *
 * Regla vinculante: EXPLICIT_INSTRUMENT_INTENT > MATERIA. La materia nunca
 * autoriza por sí sola un candidato semántico.
 *
 * Estados de la intención:
 * - NONE: no hay referencia a un instrumento. Sin filtro (comportamiento previo).
 * - SPECIFIC_RESOLVED: una identidad resuelta. Sólo fuentes que la confirman.
 * - MULTI_SPECIFIC_RESOLVED: varias identidades resueltas (comparación). Unión
 *   de las identidades; la respuesta exige evidencia de cada una. Si la
 *   comparación pide artículos concretos, la evidencia debe ser de esos
 *   artículos: un único artículo se aplica a todos los instrumentos; varios
 *   artículos no tienen correspondencia establecida y se abstiene.
 * - SPECIFIC_UNRESOLVED: hay una referencia específica (con número o
 *   calificador propio) que no se resuelve a identidad. Fail-close: ningún
 *   candidato semántico es evidencia verificada, aunque haya otra identidad
 *   resuelta en la misma consulta.
 *
 * Las clases genéricas ("ley aplicable", "código aplicable", "resolución
 * aplicable", "acuerdo correspondiente") no son referencias específicas: su
 * estado es NONE, salvo que el contexto identifique un instrumento particular.
 * Para la clase "ley", ámbito territorial o nacional ("hondureña", "de
 * Honduras", "de la República", "nacional") es NONE, y "sobre <tema>" también
 * es NONE: sin título, no hay referencia específica.
 */

import { detectarIdentidadesDesdeTexto, identidadDeFuente, type InstrumentoNormalizado } from './exact-resolver';

export type EstadoIntencionInstrumental =
  | 'NONE'
  | 'SPECIFIC_RESOLVED'
  | 'MULTI_SPECIFIC_RESOLVED'
  | 'SPECIFIC_UNRESOLVED';

export interface IntencionInstrumental {
  estado: EstadoIntencionInstrumental;
  /** Identidades resueltas, sin duplicados. Se conservan también en SPECIFIC_UNRESOLVED. */
  identidades: InstrumentoNormalizado[];
  /** Números de artículo que pide la consulta, sin duplicados (vacío si no pide ninguno). */
  articulos: string[];
}

export type PredicadoFuente = (fuente: string) => boolean;

const NORMALIZAR = (texto: string): string =>
  texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const CLASES_RE = /\b(codigo|reglamento|ley|decreto|resolucion|acuerdo)\b/g;
const ARTICULO_RE = /\bart(?:iculo|\.)?\s*(\d+)\b/g;

// Palabras que sólo introducen el calificador ("de la república", "del notariado").
const ARTICULOS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'sobre', 'a', 'al', 'un', 'una']);

// Calificadores genéricos: no nombran un instrumento concreto.
const GENERICOS = new Set([
  'aplicable', 'aplicables', 'correspondiente', 'correspondientes', 'pertinente', 'pertinentes',
  'respectivo', 'respectiva', 'respectivos', 'respectivas', 'vigente', 'vigentes', 'competente',
  'competentes', 'relevante', 'relevantes', 'siguiente', 'anterior', 'mismo', 'misma',
  'que', 'en', 'para', 'con', 'por', 'se', 'y', 'o', 'es', 'sea', 'dispone', 'procede',
  'corresponde', 'corresponda', 'aplica', 'aplique',
]);

// Calificadores de ámbito territorial o nacional. Sólo son genéricos para la
// clase "ley". No se extienden a otras clases: "decreto hondureño" sigue siendo específico.
const CALIFICADORES_LEY_GENERICOS = new Set(['honduras', 'hondurena', 'hondureno', 'nacional', 'republica']);

/**
 * true si el texto que sigue a una clase de instrumento la califica de forma
 * específica: un número de identificación en sus primeras palabras, o un
 * calificador propio que no es genérico ("notarial", "especial", "de adopciones").
 * En la clase "ley", un ámbito territorial o nacional se salta, y "sobre"
 * introduce un tema: "ley sobre el divorcio" no nombra un título y es NONE.
 */
function calificadorEspecifico(resto: string, clase: string): boolean {
  const palabras = (resto.split(/[?¿!¡,;:()]/)[0] ?? '')
    .trim()
    .split(/\s+/)
    .map((p) => p.replace(/\.+$/, ''))
    .filter(Boolean)
    .slice(0, 5);
  if (palabras.slice(0, 3).some((p) => /\d/.test(p))) return true;
  for (const p of palabras) {
    if (clase === 'ley' && p === 'sobre') return false;
    if (ARTICULOS.has(p)) continue;
    if (clase === 'ley' && CALIFICADORES_LEY_GENERICOS.has(p)) continue;
    return !GENERICOS.has(p);
  }
  return false;
}

/** Cuenta las referencias de clase que no están cubiertas por una identidad resuelta y son específicas. */
function contarReferenciasPendientes(
  texto: string,
  identidades: { inicio: number; fin: number }[],
): number {
  let pendientes = 0;
  for (const m of texto.matchAll(CLASES_RE)) {
    const inicio = m.index ?? 0;
    const fin = inicio + m[0].length;
    if (identidades.some((i) => i.inicio <= inicio && fin <= i.fin)) continue;
    if (calificadorEspecifico(texto.slice(fin), m[1])) pendientes++;
  }
  return pendientes;
}

/** Clasifica la intención instrumental de una consulta en uno de los cuatro estados. */
export function clasificarIntencionInstrumental(texto: string): IntencionInstrumental {
  const n = NORMALIZAR(texto);
  const detectadas = detectarIdentidadesDesdeTexto(n);
  const identidades = [...new Set(detectadas.map((d) => d.instrumento))];
  const articulos = [...new Set([...n.matchAll(ARTICULO_RE)].map((m) => m[1]))];
  if (contarReferenciasPendientes(n, detectadas) > 0) return { estado: 'SPECIFIC_UNRESOLVED', identidades, articulos };
  if (identidades.length === 0) return { estado: 'NONE', identidades, articulos };
  return {
    estado: identidades.length === 1 ? 'SPECIFIC_RESOLVED' : 'MULTI_SPECIFIC_RESOLVED',
    identidades,
    articulos,
  };
}

/**
 * Elegibilidad de un candidato semántico según la intención:
 * - NONE: sin filtro.
 * - SPECIFIC_RESOLVED / MULTI_SPECIFIC_RESOLVED: sólo fuentes cuya identidad
 *   real está entre las identidades resueltas. Una fuente sin identidad no entra.
 * - SPECIFIC_UNRESOLVED: nada entra (fail-close hasta resolver la identidad).
 */
export function elegibilidadSemantica(intencion: IntencionInstrumental): PredicadoFuente {
  if (intencion.estado === 'NONE') return () => true;
  if (intencion.estado === 'SPECIFIC_UNRESOLVED') return () => false;
  return (fuente) => {
    const identidad = identidadDeFuente(fuente);
    return identidad !== null && intencion.identidades.includes(identidad);
  };
}

/** Todos los fragmentos son elegibles y cada identidad resuelta aparece al menos una vez. */
function identidadesCubiertas(fragmentos: readonly { fuente: string }[], intencion: IntencionInstrumental): boolean {
  const elegible = elegibilidadSemantica(intencion);
  return (
    fragmentos.every((f) => elegible(f.fuente)) &&
    intencion.identidades.every((id) => fragmentos.some((f) => identidadDeFuente(f.fuente) === id))
  );
}

/**
 * Evidencia final que puede enviarse como contexto. Devuelve [] si no hay
 * cobertura completa. En una comparación con artículos concretos, sólo cuentan
 * los fragmentos de ese artículo: un fragmento de otro artículo no autoriza la
 * comparación. Con más de un artículo pedido no hay correspondencia
 * establecida, así que se abstiene.
 */
export function evidenciaFinal<T extends { fuente: string; num_articulo?: string | null }>(
  fragmentos: readonly T[],
  intencion: IntencionInstrumental,
): T[] {
  if (!identidadesCubiertas(fragmentos, intencion)) return [];
  if (intencion.estado !== 'MULTI_SPECIFIC_RESOLVED' || intencion.articulos.length === 0) return [...fragmentos];
  if (intencion.articulos.length > 1) return [];
  const articulo = intencion.articulos[0];
  const delArticulo = fragmentos.filter((f) => f.num_articulo === articulo);
  return identidadesCubiertas(delArticulo, intencion) ? delArticulo : [];
}

/** true si todos los fragmentos dados sobreviven a la evidencia final (y hay al menos uno). */
export function evidenciaCubreIntencion(
  fragmentos: readonly { fuente: string; num_articulo?: string | null }[],
  intencion: IntencionInstrumental,
): boolean {
  return fragmentos.length > 0 && evidenciaFinal(fragmentos, intencion).length === fragmentos.length;
}

/**
 * Fragmentos del pase procedimental que pueden añadirse al contexto junto al
 * principal: sólo los que sobreviven a la evidencia final de la unión. Así, un
 * instrumento que el pase principal no cubrió no entra por el procedimental.
 */
export function evidenciaProcedimentalPermitida<T extends { fuente: string; num_articulo?: string | null }>(
  principal: readonly T[],
  procedimental: readonly T[],
  intencion: IntencionInstrumental,
): T[] {
  const finalUnido = evidenciaFinal([...principal, ...procedimental], intencion);
  return procedimental.filter((f) => finalUnido.includes(f));
}
