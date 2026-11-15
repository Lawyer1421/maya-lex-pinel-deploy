/**
 * lib/legal-retrieval/instrument-ref.ts
 * Identidad canónica país-calificada de un instrumento: `<ISO2>:<INSTRUMENTO>` (p. ej. `HN:CODIGO_CIVIL`, `SV:CODIGO_CIVIL`).
 * Módulo puro. Diseño: docs/retrieval/MULTI_JURISDICTION_V3_TECHNICAL_DESIGN.md (§1, invariante 2).
 *
 * Reglas (sin excepciones ni valores por defecto):
 *  · El país es obligatorio y pertenece al conjunto cerrado de v3; un id sin prefijo (`CODIGO_CIVIL`) NO se interpreta como `HN`.
 *  · El instrumento pertenece al catálogo cerrado de instrument-identity.ts.
 *  · Formato exacto: mayúsculas, un solo `:`, sin espacios. No se normaliza: lo que no es canónico se rechaza.
 * Así dos instrumentos homónimos de países distintos nunca comparten identidad, y `HN:X === HN:X` es la única igualdad posible.
 * No reemplaza al id de chunk (`coleccion:chunk_id`), que conserva su función.
 */
import type { CountryCode } from '../legal-os/types';
import { RE_FUENTE_POR_INSTRUMENTO, type InstrumentoNormalizado } from './instrument-identity';

/** Países admitidos por buscar_biblioteca_v3 (misma lista que valida la migración 20261115000000). Belice queda fuera de esta fase. */
export const JURISDICCIONES_V3 = ['HN', 'SV', 'GT', 'CR', 'NI', 'PA'] as const satisfies readonly CountryCode[];
export type JurisdiccionV3 = (typeof JURISDICCIONES_V3)[number];

export type InstrumentRef = `${JurisdiccionV3}:${InstrumentoNormalizado}`;

export type MotivoRechazoRef = 'NO_ES_TEXTO' | 'FORMATO_INVALIDO' | 'PAIS_NO_ADMITIDO' | 'INSTRUMENTO_DESCONOCIDO';

export type ResultadoRef =
  | { ok: true; ref: InstrumentRef; pais: JurisdiccionV3; instrumento: InstrumentoNormalizado }
  | { ok: false; motivo: MotivoRechazoRef };

const INSTRUMENTOS = new Set(Object.keys(RE_FUENTE_POR_INSTRUMENTO));
const RE_FORMATO = /^([A-Z]{2}):([A-Z][A-Z0-9_]*)$/;

export function esJurisdiccionV3(valor: unknown): valor is JurisdiccionV3 {
  return typeof valor === 'string' && (JURISDICCIONES_V3 as readonly string[]).includes(valor);
}

export function esInstrumentoNormalizado(valor: unknown): valor is InstrumentoNormalizado {
  return typeof valor === 'string' && INSTRUMENTOS.has(valor);
}

/** Valida un identificador ya serializado. Nunca lanza. */
export function parsearInstrumentRef(valor: unknown): ResultadoRef {
  if (typeof valor !== 'string') return { ok: false, motivo: 'NO_ES_TEXTO' };
  const m = RE_FORMATO.exec(valor);
  if (!m) return { ok: false, motivo: 'FORMATO_INVALIDO' };
  const [, pais, instrumento] = m;
  if (!esJurisdiccionV3(pais)) return { ok: false, motivo: 'PAIS_NO_ADMITIDO' };
  if (!esInstrumentoNormalizado(instrumento)) return { ok: false, motivo: 'INSTRUMENTO_DESCONOCIDO' };
  return { ok: true, ref: valor as InstrumentRef, pais, instrumento };
}

export function esInstrumentRef(valor: unknown): valor is InstrumentRef {
  return parsearInstrumentRef(valor).ok;
}

/** Construye la identidad canónica. Lanza ante país o instrumento fuera de catálogo (error de programación o de ingesta). */
export function crearInstrumentRef(pais: string, instrumento: string): InstrumentRef {
  if (!esJurisdiccionV3(pais)) throw new Error(`instrument-ref: país no admitido: ${JSON.stringify(pais)}`);
  if (!esInstrumentoNormalizado(instrumento)) throw new Error(`instrument-ref: instrumento desconocido: ${JSON.stringify(instrumento)}`);
  return `${pais}:${instrumento}`;
}

/**
 * La identidad declarada por una fila solo vale si su prefijo coincide EXACTAMENTE con la columna `jurisdiccion` de esa misma fila.
 * Jurisdicción nula, vacía, en otro formato (`hn`, `Honduras`) o distinta -> false.
 */
export function refCoincideConJurisdiccion(ref: unknown, jurisdiccionFila: unknown): boolean {
  const r = parsearInstrumentRef(ref);
  return r.ok && typeof jurisdiccionFila === 'string' && r.pais === jurisdiccionFila;
}
