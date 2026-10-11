/**
 * lib/legal-retrieval/instrument-gate.ts
 * P1 — intención instrumental explícita (producción).
 *
 * Regla vinculante: EXPLICIT_INSTRUMENT_INTENT > MATERIA. Si la consulta nombra
 * un instrumento con identidad resuelta, sólo es elegible un candidato cuya
 * propia fuente confirme esa identidad. La materia nunca valida por sí sola un
 * candidato de otro instrumento. Módulo puro: sin Supabase, sin red.
 *
 * Neutralidad: una clase explícita sin identidad resoluble ("ley notarial",
 * "decreto" sin nombre) NO fabrica identidad y NO filtra. Ningún candidato
 * queda autorizado por la clase sola; sólo se deja de forzar identidad.
 */

import {
  detectarInstrumentoDesdeTexto,
  identidadDeFuente,
  type InstrumentoNormalizado,
} from './exact-resolver';

export type ClaseInstrumentoExplicita = 'codigo' | 'reglamento' | 'ley' | 'decreto' | 'resolucion' | 'acuerdo';

export interface IntencionInstrumentoExplicita {
  clase: ClaseInstrumentoExplicita | null;
  /** Identidad resuelta por el detector de producción (incluye alias notariales). Null si no hay identidad. */
  identidad: InstrumentoNormalizado | null;
}

const NORMALIZAR = (texto: string): string =>
  texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

// Orden de prioridad: si conviven varias clases, gana la más específica.
const PRIORIDAD_CLASE: ClaseInstrumentoExplicita[] = ['reglamento', 'decreto', 'resolucion', 'acuerdo', 'ley', 'codigo'];

const PATRON_CLASE: Record<ClaseInstrumentoExplicita, RegExp> = {
  reglamento: /\breglamento/,
  decreto: /\bdecreto\b/,
  resolucion: /\bresolucion/,
  acuerdo: /\bacuerdo\b/,
  ley: /\bley\b/,
  codigo: /\bcodigo\b/,
};

/**
 * Reconoce la clase de instrumento que la consulta expresa y la identidad que
 * el detector de producción resuelve. La identidad ya incluye los alias
 * notariales; "ley notarial" no resuelve identidad y no se fuerza.
 */
export function intencionInstrumentoExplicita(texto: string): IntencionInstrumentoExplicita {
  const n = NORMALIZAR(texto);
  const presentes = PRIORIDAD_CLASE.filter((c) => PATRON_CLASE[c].test(n));
  const clase = presentes[0] ?? null;
  return { clase, identidad: detectarInstrumentoDesdeTexto(texto) ?? null };
}

/**
 * true si el candidato es elegible bajo la intención instrumental:
 * - sin identidad explícita resuelta: siempre (neutral, sin filtro);
 * - con identidad explícita: sólo si la fuente real del candidato confirma esa
 *   identidad. Una fuente que no declara instrumento no se acepta: no se
 *   adivina la identidad de un documento que no la declara.
 */
export function cumpleIdentidadExplicita(fuente: string, identidad: InstrumentoNormalizado | null): boolean {
  if (identidad === null) return true;
  return identidadDeFuente(fuente) === identidad;
}

export type PredicadoFuente = (fuente: string) => boolean;

/**
 * Elegibilidad de un candidato semántico bajo la intención instrumental.
 *
 * B. Identidad resuelta (con o sin clase): sólo fuentes que confirman esa
 *    identidad (cumpleIdentidadExplicita).
 * C. Clase explícita sin identidad resoluble: ninguna identidad puede
 *    verificarse, así que ningún candidato semántico es evidencia verificada,
 *    tenga o no materia. Fail-close hasta que la identidad se resuelva de forma
 *    independiente (P2). No se mapea la clase genérica a un instrumento.
 * A. Sin clase explícita: sin filtro (comportamiento previo).
 *
 * Con todos los candidatos bloqueados, el caller queda sin evidencia y
 * buscarRAG devuelve OFFICIAL_FALLBACK_REQUIRED.
 */
export function elegibilidadSemantica(intencion: IntencionInstrumentoExplicita): PredicadoFuente {
  if (intencion.identidad !== null) {
    const identidad = intencion.identidad;
    return (fuente) => cumpleIdentidadExplicita(fuente, identidad);
  }
  if (intencion.clase !== null) return () => false;
  return () => true;
}
