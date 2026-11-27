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
  | 'CODIGO_COMERCIO'
  | 'CODIGO_NINEZ'
  | 'DECRETO_284_2013'
  | 'DECRETO_35_2013'
  // Leyes de las olas V5 firmadas (OLA 12 y OLA 13, 2026-11-25/26). Identidad canónica `HN:<id>` (instrument-ref.ts).
  | 'LEY_ORGANIZACION_TRIBUNALES'
  | 'LEY_PROPIEDAD'
  | 'LEY_LAVADO_ACTIVOS'
  | 'LEY_PROCEDIMIENTO_ADMINISTRATIVO'
  | 'REGLAMENTO_LEY_MUNICIPALIDADES'
  | 'LEY_MUNICIPALIDADES'
  // OLA 14 (D8 del expediente OLA14_LGAP, firmado el 2026-11-26).
  | 'LEY_GENERAL_ADMINISTRACION_PUBLICA';

/**
 * Cierre de los nombres de las leyes V5 en la `fuente` real: nada más que «de Honduras» opcional y luego «(Decreto…)», una coma o el final.
 * Así «Ley de Propiedad Intelectual», «Ley de Municipalidades de El Salvador» o «Comentario a la Ley…» no confirman la identidad.
 */
const CIERRE_FUENTE_V5 = String.raw`(?:\s+de\s+honduras)?(?=\s*\(|\s*,|\s*$)`;
const fuenteV5 = (nombre: string): RegExp => new RegExp(String.raw`^\s*${nombre}${CIERRE_FUENTE_V5}`, 'i');

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
  CODIGO_NOTARIADO: /(?<!reglamento\s+(?:(?:del?|al|para)\s+(?:el\s+)?)?)c[oó]digo\s+(?:del?\s+)?notariado/i,
  REGLAMENTO_NOTARIADO: /reglamento\s+(?:(?:del?|al|para)\s+(?:el\s+)?)?(?:c[oó]digo\s+(?:del?\s+)?)?notariado/i,
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
  // A03: anclado al principio para que el Decreto 35-2013, que menciona la Niñez en su título, conserve su identidad propia.
  CODIGO_NINEZ: /^\s*c[oó]digo\s+de\s+la\s+ni[nñ]ez\s+y\s+(?:de\s+)?la\s+adolescencia\b/i,
  // Piloto de adjudicación (2026-11-15). La fuente que escribe la ingesta EMPIEZA por el decreto: «Decreto 284-2013, Ley para la Generación de
  // Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)».
  // Anclado al inicio y declarado al final: una fila del Código de Comercio que lo cite («…reformado por el Decreto 284-2013») sigue siendo
  // CODIGO_COMERCIO, y la fuente del decreto no contiene «Código de Comercio» ni «Constitución», cuyos patrones se evalúan antes.
  DECRETO_284_2013: /^\s*decreto\s+(?:legislativo\s+)?(?:n(?:o|º|°|[uú]mero)\.?\s*)?284\s*[-–]\s*2013\b/i,
  // A04 (2026-11-16): reformas integrales en Familia y Niñez (La Gaceta 33,222). Mismo criterio que el D.284-2013: anclado al inicio. La fuente
  // de la ingesta no nombra ningún código («Decreto 35-2013, reformas integrales en Familia y Niñez (La Gaceta 33,222)»), así que no la captura
  // ningún patrón anterior; una fila del Código de Familia que cite «reformado por el Decreto 35-2013» conserva su identidad.
  DECRETO_35_2013: /^\s*decreto\s+(?:legislativo\s+)?(?:n(?:o|º|°|[uú]mero)\.?\s*)?35\s*[-–]\s*2013\b/i,
  // Olas V5 (2026-11-26). Anclados al inicio y cerrados (CIERRE_FUENTE_V5): son exactamente las fuentes de producción, p. ej.
  // «Ley de Propiedad de Honduras (Decreto No. 82-2004)». El Reglamento se declara antes que la Ley: su fuente («Reglamento General de la
  // Ley de Municipalidades…») contiene el nombre de la Ley, aunque el ancla ya impide la colisión.
  LEY_ORGANIZACION_TRIBUNALES: fuenteV5(String.raw`ley\s+de\s+organizaci[oó]n\s+y\s+atribuciones\s+de\s+los\s+tribunales`),
  LEY_PROPIEDAD: fuenteV5(String.raw`ley\s+de\s+(?:la\s+)?propiedad`),
  LEY_LAVADO_ACTIVOS: fuenteV5(String.raw`ley\s+especial\s+contra\s+el\s+lavado\s+de\s+activos`),
  LEY_PROCEDIMIENTO_ADMINISTRATIVO: fuenteV5(String.raw`ley\s+de\s+procedimientos?\s+administrativos?`),
  // Conectores de CONECTOR_RLMUN (exact-resolver.ts), incluidas las locuciones preposicionales («conforme a», «en aplicación de»…).
  REGLAMENTO_LEY_MUNICIPALIDADES: fuenteV5(String.raw`reglamento\s+(?:general\s+)?(?:de|a|para|sobre|conforme\s+a|con\s+arreglo\s+a|(?:en|de)\s+(?:aplicaci[oó]n|ejecuci[oó]n|desarrollo)\s+de)\s+(?:la\s+)?(?:nueva\s+)?ley\s+de\s+municipalidades`),
  LEY_MUNICIPALIDADES: fuenteV5(String.raw`ley\s+de\s+municipalidades`),
  // «Ley General de la Administración Pública de Honduras (Decreto No. 146-86)»; la «Ley para Optimizar la Administración Pública» no coincide.
  LEY_GENERAL_ADMINISTRACION_PUBLICA: fuenteV5(String.raw`ley\s+general\s+de\s+(?:la\s+)?administraci[oó]n\s+p[uú]blica`),
};

/**
 * Fuentes cuyo NOMBRE EXACTO es el texto legislativo oficial de un instrumento (decisión del propietario, 2-nov-2026): el Decreto 211-2006 es
 * el texto base oficial del Código Procesal Civil. Coincidencia exacta (no patrón): `CPC_COMENTADO_ROMERO_2024` y cualquier otra variante NO
 * entran, siguen siendo doctrina. Solo la usa `identidadDeFuente` (ruta semántica); no entra en RE_FUENTE_POR_INSTRUMENTO para no alterar la
 * ruta exacta por artículo.
 */
export const FUENTES_OFICIALES_EXACTAS: Readonly<Record<string, InstrumentoNormalizado>> = Object.freeze({
  'cpc_texto_base_d211-2006': 'CODIGO_PROCESAL_CIVIL',
});

/**
 * Instrumento que declara una fuente real (sólo `fuente`, sin metadata), con
 * los mismos patrones de identidadDocumentalCoincide. Null si la fuente no
 * declara ninguno. Lo usa la ruta semántica, que no trae metadata por fila.
 * El orden de RE_FUENTE_POR_INSTRUMENTO es el de declaración: los patrones
 * están escritos para no solaparse (ver comentarios arriba).
 */
export function identidadDeFuente(fuente: string): InstrumentoNormalizado | null {
  if (!fuente) return null;
  const oficial = FUENTES_OFICIALES_EXACTAS[fuente.trim().toLowerCase()];
  if (oficial) return oficial;
  for (const [instrumento, patron] of Object.entries(RE_FUENTE_POR_INSTRUMENTO) as [InstrumentoNormalizado, RegExp][]) {
    if (patron.test(fuente)) return instrumento;
  }
  return null;
}
