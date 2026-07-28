/**
 * lib/ingesta-oficial/extraccion.ts
 * Extracción, normalización y segmentación por artículo del texto fuente.
 * Determinístico, sin IA — la separación por artículo debe ser auditable
 * y reproducible byte a byte, no una inferencia de modelo.
 */
import type { ArticuloExtraido } from './types';

/** Quita encabezados/pies de página repetidos y normaliza espacios en blanco. */
export function normalizarTexto(textoCrudo: string): string {
  return textoCrudo
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s*P[aá]gina\s+\d+(\s+de\s+\d+)?\s*$/gim, '')
    .trim();
}

const PATRON_ARTICULO = /^\s*ART[IÍ]CULO\s+(\d+)[.\-:°º]*\s*(.*)$/gim;

/** Segmenta el texto por encabezados "ARTÍCULO N" — determinístico. */
export function segmentarPorArticulo(textoNormalizado: string): ArticuloExtraido[] {
  const coincidencias = [...textoNormalizado.matchAll(PATRON_ARTICULO)];
  if (coincidencias.length === 0) return [];

  const articulos: ArticuloExtraido[] = [];
  for (let i = 0; i < coincidencias.length; i++) {
    const actual = coincidencias[i];
    const siguiente = coincidencias[i + 1];
    const inicio = actual.index ?? 0;
    const fin = siguiente?.index ?? textoNormalizado.length;
    const numArticulo = actual[1];
    const contenido = textoNormalizado.slice(inicio, fin).trim();
    articulos.push({ numArticulo, contenido });
  }
  return articulos;
}

/** Detecta encabezados repetidos que sobrevivieron a la normalización (control de calidad, no bloqueante por sí solo). */
export function detectarEncabezadosRepetidos(articulos: ArticuloExtraido[]): string[] {
  const conteo = new Map<string, number>();
  for (const a of articulos) {
    const primeraLinea = a.contenido.split('\n')[0]?.trim() ?? '';
    conteo.set(primeraLinea, (conteo.get(primeraLinea) ?? 0) + 1);
  }
  return [...conteo.entries()].filter(([, c]) => c > 1).map(([linea]) => linea);
}
