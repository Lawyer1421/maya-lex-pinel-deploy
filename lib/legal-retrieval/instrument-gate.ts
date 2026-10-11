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
 *   de las identidades; la respuesta exige evidencia de cada una.
 * - SPECIFIC_UNRESOLVED: hay una referencia específica (con número o
 *   calificador propio) que no se resuelve a identidad. Fail-close: ningún
 *   candidato semántico es evidencia verificada, aunque haya otra identidad
 *   resuelta en la misma consulta.
 *
 * Las clases genéricas ("ley aplicable", "código aplicable", "resolución
 * aplicable", "acuerdo correspondiente") no son referencias específicas: su
 * estado es NONE, salvo que el contexto identifique un instrumento particular.
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
}

export type PredicadoFuente = (fuente: string) => boolean;

const NORMALIZAR = (texto: string): string =>
  texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const CLASES_RE = /\b(codigo|reglamento|ley|decreto|resolucion|acuerdo)\b/g;

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

/**
 * true si el texto que sigue a una clase de instrumento la califica de forma
 * específica: un número de identificación en sus primeras palabras, o un
 * calificador propio que no es genérico ("notarial", "especial", "decreto 130-2017").
 */
function calificadorEspecifico(resto: string): boolean {
  const palabras = (resto.split(/[?¿!¡,;:()]/)[0] ?? '')
    .trim()
    .split(/\s+/)
    .map((p) => p.replace(/\.+$/, ''))
    .filter(Boolean)
    .slice(0, 5);
  if (palabras.slice(0, 3).some((p) => /\d/.test(p))) return true;
  const primera = palabras.find((p) => !ARTICULOS.has(p));
  return primera !== undefined && !GENERICOS.has(primera);
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
    if (calificadorEspecifico(texto.slice(fin))) pendientes++;
  }
  return pendientes;
}

/** Clasifica la intención instrumental de una consulta en uno de los cuatro estados. */
export function clasificarIntencionInstrumental(texto: string): IntencionInstrumental {
  const n = NORMALIZAR(texto);
  const detectadas = detectarIdentidadesDesdeTexto(n);
  const identidades = [...new Set(detectadas.map((d) => d.instrumento))];
  if (contarReferenciasPendientes(n, detectadas) > 0) return { estado: 'SPECIFIC_UNRESOLVED', identidades };
  if (identidades.length === 0) return { estado: 'NONE', identidades };
  return {
    estado: identidades.length === 1 ? 'SPECIFIC_RESOLVED' : 'MULTI_SPECIFIC_RESOLVED',
    identidades,
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

/**
 * true si la evidencia final cubre la intención: todos los fragmentos son
 * elegibles, y cada identidad resuelta aparece al menos una vez. Es el criterio
 * para permitir una respuesta completa, sobre todo en comparaciones.
 */
export function evidenciaCubreIntencion(
  fragmentos: readonly { fuente: string }[],
  intencion: IntencionInstrumental,
): boolean {
  const elegible = elegibilidadSemantica(intencion);
  return (
    fragmentos.every((f) => elegible(f.fuente)) &&
    intencion.identidades.every((id) => fragmentos.some((f) => identidadDeFuente(f.fuente) === id))
  );
}
