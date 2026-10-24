/**
 * lib/legal-retrieval/instrument-identity.ts
 * Identidad de instrumento a partir de la fuente real de una fila. Módulo puro y sin dependencias, extraído 1:1 de exact-resolver.ts
 * (sin cambio de patrones ni de orden) para que clo-guards.ts y exact-resolver.ts lo compartan sin ciclo de importación.
 */

export type InstrumentoNormalizado =
  | 'CODIGO_PROCESAL_PENAL'
  | 'CODIGO_PENAL'
  | 'CODIGO_PROCESAL_CIVIL'
  | 'CODIGO_CIVIL'
  | 'CODIGO_TRABAJO'
  | 'CODIGO_FAMILIA'
  | 'CODIGO_NOTARIADO'
  | 'REGLAMENTO_NOTARIADO'
  | 'CODIGO_TRIBUTARIO'
  | 'LEY_JUSTICIA_CONSTITUCIONAL'
  | 'CONSTITUCION'
  | 'CODIGO_COMERCIO';

// Patrón que debe encontrarse en `fuente` (o metadata.documento_origen) de
// una fila real de la DB para confirmar que pertenece a ese instrumento.
// Mismo patrón que la detección de texto — es intencional: la identidad de
// un candidato se confirma con el mismo vocabulario con que el usuario lo pidió.
export const RE_FUENTE_POR_INSTRUMENTO: Record<InstrumentoNormalizado, RegExp> = {
  CODIGO_PROCESAL_PENAL: /c[oó]digo\s+procesal\s+penal/i,
  CODIGO_PROCESAL_CIVIL: /c[oó]digo\s+procesal\s+civil/i,
  CODIGO_PENAL: /c[oó]digo\s+penal\b/i,
  CODIGO_CIVIL: /c[oó]digo\s+civil\b/i,
  CODIGO_TRABAJO: /c[oó]digo\s+(?:del?\s+)?trabajo/i,
  CODIGO_FAMILIA: /c[oó]digo\s+de\s+familia/i,
  // Negative lookbehind: la fuente real del Reglamento es literalmente
  // "Reglamento del Código del Notariado (...)", que contiene "Código del
  // Notariado" como subcadena. Sin esta exclusión, una fila del Reglamento
  // confirmaría identidad para CODIGO_NOTARIADO igual que las filas del
  // Código base — la misma clase de colisión de `fuente` que causó el bug
  // P1 con Decreto 77-2006 (ver hallazgo de esta sesión).
  CODIGO_NOTARIADO: /(?<!reglamento\s+(?:del?\s+)?)c[oó]digo\s+(?:del?\s+)?notariado/i,
  REGLAMENTO_NOTARIADO: /reglamento\s+(?:del?\s+)?(?:c[oó]digo\s+(?:del?\s+)?)?notariado/i,
  CODIGO_TRIBUTARIO: /c[oó]digo\s+tributario/i,
  // La fuente real es literalmente "Ley sobre Justicia Constitucional".
  LEY_JUSTICIA_CONSTITUCIONAL: /ley\s+(?:sobre|de)\s+justicia\s+constitucional/i,
  // La fuente real es "Constitucion de la Republica de Honduras (...)". El \b
  // evita coincidir con "Ley sobre Justicia Constitucional" (otro instrumento
  // ya presente en el corpus, materia 07_CONSTITUCIONAL) -- ver hallazgo P0
  // de esta sesión: sin este aislamiento, ambas fuentes contienen la raíz
  // "constituci" y podrían confundirse en la identidad documental.
  CONSTITUCION: /constituci[oó]n\b/i,
  // La fuente real es "Codigo de Comercio (Decreto No. 73-1950, Congreso
  // Nacional de Honduras)". A diferencia del lote V2 (CONSTITUCION,
  // CODIGO_FAMILIA, etc.), el contenido ingerido SÍ trae el encabezado real
  // "Articulo N" -- no se agrega a INSTRUMENTOS_SIN_ENCABEZADO_TEXTUAL.
  CODIGO_COMERCIO: /c[oó]digo\s+de\s+comercio/i,
};

/**
 * Instrumento que declara una fuente real (sólo `fuente`, sin metadata), con
 * los mismos patrones de identidadDocumentalCoincide. Null si la fuente no
 * declara ninguno. Lo usa la ruta semántica, que no trae metadata por fila.
 * El orden de RE_FUENTE_POR_INSTRUMENTO es el de declaración: los patrones
 * están escritos para no solaparse (ver comentarios arriba).
 */
export function identidadDeFuente(fuente: string): InstrumentoNormalizado | null {
  if (!fuente) return null;
  for (const [instrumento, patron] of Object.entries(RE_FUENTE_POR_INSTRUMENTO) as [InstrumentoNormalizado, RegExp][]) {
    if (patron.test(fuente)) return instrumento;
  }
  return null;
}
