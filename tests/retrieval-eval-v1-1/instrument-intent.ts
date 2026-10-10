import {
  detectarInstrumentoDesdeTexto,
  detectarMateriaSemanticaAmpliada,
  identidadDocumentalCoincide,
  type InstrumentoNormalizado,
} from '@/lib/legal-retrieval/exact-resolver';
import { aFilaExacta } from '@/lib/legal-retrieval/lab/exact-lab';
import type { LabRow } from '@/lib/legal-retrieval/lab/types';

/**
 * Intención instrumental explícita (V1.1, sólo evaluación).
 * EXPLICIT_INSTRUMENT_INTENT > MATERIA. La materia nunca sustituye a la clase
 * de instrumento que el usuario nombra.
 */

export type ClaseInstrumento = 'codigo' | 'reglamento' | 'ley' | 'decreto' | 'resolucion' | 'acuerdo';

/**
 * Metadatos de identidad registrados por CLO. Son identidad de instrumento,
 * no verificación de fuente legal ni oro legal.
 */
export const METADATA_IDENTIDAD_REGLAMENTO_NOTARIADO = {
  identidad: 'REGLAMENTO_NOTARIADO',
  nombre: 'Reglamento del Código del Notariado',
  resolucion: 'Resolución PCSJ-17-2012',
  no_es_oro_legal: true,
} as const;

const NORM = (texto: string): string =>
  texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

const PRIORIDAD_CLASE: ClaveClase[] = ['reglamento', 'decreto', 'resolucion', 'acuerdo', 'ley', 'codigo'];
type ClaveClase = ClaseInstrumento;

const PATRON_CLASE: Record<ClaveClase, RegExp> = {
  reglamento: /\breglamento/,
  decreto: /\bdecreto\b/,
  resolucion: /\bresolucion/,
  acuerdo: /\bacuerdo\b/,
  ley: /\bley\b/,
  codigo: /\bcodigo\b/,
};

export interface IntencionInstrumento {
  clase: ClaseInstrumento | null;
  /** Identidad resuelta. Null si la clase es explícita pero no resoluble. */
  identidad: InstrumentoNormalizado | null;
}

/**
 * Normaliza alias notariales. "reglamento notarial" y equivalentes resuelven a
 * REGLAMENTO_NOTARIADO. "ley ... notarial" nunca se asimila al Código.
 */
export function intencionInstrumento(texto: string): IntencionInstrumento {
  const n = NORM(texto);
  const presentes = (Object.keys(PATRON_CLASE) as ClaveClase[]).filter((c) => PATRON_CLASE[c].test(n));
  const clase = PRIORIDAD_CLASE.find((c) => presentes.includes(c)) ?? null;
  const notarial = /notari|funcion notarial/.test(n);

  if (clase === 'reglamento' && notarial) return { clase, identidad: 'REGLAMENTO_NOTARIADO' };
  if (clase === 'codigo' && notarial) return { clase, identidad: 'CODIGO_NOTARIADO' };
  if (clase === 'ley' && notarial) return { clase, identidad: null };
  if (clase !== null) {
    const identidad = detectarInstrumentoDesdeTexto(texto);
    return { clase, identidad: identidad ?? null };
  }
  return { clase: null, identidad: detectarInstrumentoDesdeTexto(texto) ?? null };
}

const RE_ARTICULO_TODOS = /\bart(?:[ií]culo|\.)?\s*(\d+)\b/gi;
const RE_MULTI = /\b(remit\w*|relacion\w*|excepci\w*|excepto|salvo|reform\w*|reglamenta|complement\w*|anterior|siguiente|vincul\w*)\b/;

export interface ContextoIntencion {
  articulos: string[];
  multiArticulo: boolean;
  intencion: IntencionInstrumento;
  materia: string | null;
  historicaCPC: boolean;
}

export function contextoIntencion(texto: string): ContextoIntencion {
  const n = NORM(texto);
  const articulos = [...new Set([...texto.matchAll(RE_ARTICULO_TODOS)].map((m) => m[1]))];
  const multiArticulo = articulos.length >= 2 || RE_MULTI.test(n);
  return {
    articulos,
    multiArticulo,
    intencion: intencionInstrumento(texto),
    materia: detectarMateriaSemanticaAmpliada(texto),
    historicaCPC: /\b(historic\w*|original|anterior|temporal)\b/.test(n) && /codigo procesal civil|cpc|texto base|d211/.test(n),
  };
}

/** Identidad documental de un registro, con las mismas reglas de producción. */
export function identidadDeRegistro(fila: LabRow): InstrumentoNormalizado | null {
  const filaExacta = aFilaExacta(fila);
  if (identidadDocumentalCoincide(filaExacta, 'REGLAMENTO_NOTARIADO')) return 'REGLAMENTO_NOTARIADO';
  if (identidadDocumentalCoincide(filaExacta, 'CODIGO_NOTARIADO')) return 'CODIGO_NOTARIADO';
  return null;
}
