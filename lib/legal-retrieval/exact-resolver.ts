/**
 * lib/legal-retrieval/exact-resolver.ts
 * Retrieval v3 — Fase 1A: EXTRACCIÓN, no rediseño.
 *
 * Movido 1:1 desde lib/rag/search.ts (sin cambio de comportamiento): la
 * recuperación determinista por número de artículo exacto, la detección de
 * materia/instrumento desde el texto de la consulta, y la verificación de
 * identidad documental. Ver MAYALEX_RETRIEVAL_V3_ARCHITECTURE.md sección E/F
 * para el diseño completo de Retrieval v3 -- esta fase solo mueve el código
 * ya existente y verificado, no introduce ninguna lógica nueva.
 *
 * `contieneArtefactoAnonimizacion`, `hashFragmento` y el tipo `FragmentoRAG`
 * viven en ./primitives y ./types respectivamente (Fase 1A.1 -- antes se
 * importaban desde lib/rag/search.ts, lo que cerraba un ciclo search.ts ->
 * exact-resolver.ts -> search.ts; este módulo NUNCA debe importar de
 * lib/rag/search.ts). lib/rag/search.ts re-exporta todo lo de este archivo
 * para mantener compatibilidad exacta con los consumidores actuales
 * (route.ts, tests) sin requerirles ningún cambio.
 */

import type { FragmentoRAG } from './types';
import { contieneArtefactoAnonimizacion, hashFragmento } from './primitives';

// ─────────────────────────────────────────────────────────────────────────────
// RECUPERACIÓN DETERMINISTA POR ARTÍCULO EXACTO
// ─────────────────────────────────────────────────────────────────────────────
//
// P0-2B: la búsqueda semántica pura falla en dos escenarios de seguridad
// jurídica: (a) depende de HF_API_TOKEN, que puede faltar en un entorno y
// dejar el chat sin ningún contexto sin que el usuario lo note con claridad;
// (b) puede no rankear el artículo exacto pedido en el top-k cuando hay
// jurisprudencia/doctrina compitiendo por similitud. Esta capa intenta una
// recuperación exacta y determinista ANTES de la semántica, y no requiere
// embeddings — sigue funcionando aunque falte HF_API_TOKEN.
//
// Limitación de datos conocida (no resoluble en código): la columna `fuente`
// está vacía en todo el corpus de staging hoy, así que no hay forma de
// distinguir p. ej. Código Penal de Código Procesal Penal por metadato — solo
// por lo que el propio texto de la consulta indique. Mientras esa columna no
// se pueble, la desambiguación de instrumento es best-effort por texto, nunca
// una certeza de base de datos. Este código NO inventa un instrumento cuando
// no puede determinarlo: si hay más de un candidato tras vigencia+materia,
// se marca ambiguo y no se ofrece como fundamento normativo.

export interface DeteccionArticulo {
  numero: string;
  materiaDetectada: string | null;
  /** Identidad estricta del instrumento (CPP vs Código Penal, etc.) — ver IDENTIDAD ESTRICTA DEL INSTRUMENTO abajo. */
  instrumento: InstrumentoNormalizado | null;
}

const RE_ARTICULO_NUM = /\bart(?:[ií]culo|\.)?\s*(\d+)\b/i;
const RE_MATERIA_PENAL = /\b(penal|cpp|c[oó]digo\s+procesal\s+penal)\b/i;
const RE_MATERIA_CIVIL = /\b(civil|cpc|c[oó]digo\s+procesal\s+civil)\b/i;

/**
 * Detecta la materia (penal/civil) mencionada explícitamente en el texto de
 * una consulta — independiente de si hay un número de artículo. Se usa tanto
 * para la búsqueda exacta como para acotar la búsqueda semántica: sin esto,
 * una consulta claramente penal ("medidas cautelares... proceso penal") podía
 * recuperar por similitud un artículo civil/arbitral (ej. Art. 353 sobre
 * procesos extranjeros), porque la búsqueda semántica no filtraba materia.
 */
export function detectarMateriaDesdeTexto(query: string): string | null {
  if (RE_MATERIA_PENAL.test(query)) return '01_PENAL';
  if (RE_MATERIA_CIVIL.test(query)) return '02_CIVIL';
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// EG-1 — MATERIA AMPLIADA, SOLO PARA EL FILTRO SEMÁNTICO
// ─────────────────────────────────────────────────────────────────────────────
//
// Defecto probado (MISSION M1, 2026-09-28): fuera de penal/civil, ninguna
// consulta recibía ningún filtro de materia en la búsqueda semántica
// (lib/rag/search.ts: `materiaSemantica` quedaba `undefined`), así que un
// fragmento de materia totalmente ajena podía colar por similitud pura y
// contar como SEMANTIC_SUCCESS -- bloqueando tanto la abstención fail-closed
// como el fallback oficial. Caso real documentado:
// docs/observability/RETRIEVAL_V3_GOLDEN_CASE_SRL_HONDURAS.md ("¿Cuáles son
// los requisitos para constituir una Sociedad de Responsabilidad Limitada en
// Honduras?" recuperó "Ley sobre Justicia Constitucional").
//
// Deliberadamente separado de `detectarMateriaDesdeTexto`, nunca usado por la
// ruta de artículo exacto (`detectarArticuloExacto`/`buscarArticuloExacto`):
// ahí la materia es solo una optimización de consulta a la DB -- la
// aceptación real la decide `identidadDocumentalCoincide()` por identidad de
// instrumento, nunca por materia (ver comentario junto a `consultarPorVigencia`
// en lib/rag/search.ts). Pasarle a esa ruta un valor que no existe todavía en
// el corpus bloquearía candidatos ya confirmados por identidad de instrumento
// en cuanto se ingiera contenido real. La búsqueda semántica, en cambio, NO
// tiene ningún chequeo de identidad por fragmento -- es exactamente la vía
// donde ocurrió la contaminación documentada arriba.
//
// Mismo patrón exacto de keyword regex que RE_MATERIA_PENAL/RE_MATERIA_CIVIL,
// ya aceptado en este archivo -- no es una ontología jurídica nueva, solo más
// cobertura de materias ya presentes en la taxonomía real de
// biblioteca_vectores (ver auditoría de corpus, Fase AR-0). Materias sin
// cobertura aquí (laboral, tributario, familia, agrario) permanecen sin
// filtro semántico, exactamente igual que antes de esta fase -- no es una
// regresión, es un gap conocido y documentado, no resuelto en EG-1.
const RE_MATERIA_MERCANTIL =
  /\b(mercantil|comerciantes?|sociedad(?:es)?\s+(?:mercantil(?:es)?|an[oó]nima|de\s+responsabilidad\s+limitada|en\s+comandita|colectiva)|c[oó]digo\s+de\s+comercio|actos?\s+de\s+comercio|raz[oó]n\s+social|s\.?\s?de\s?r\.?\s?l\.?\b|s\.?\s?a\.?\s+de\s+c\.?v\.?)/i;
const RE_MATERIA_NOTARIAL =
  /\b(notarial|notario|escritura\s+p[uú]blica|protocolo\s+notarial|c[oó]digo\s+del?\s+notariado)\b/i;
const RE_MATERIA_CONSTITUCIONAL =
  /\b(constituci[oó]n(?:al)?|ley\s+(?:sobre|de)\s+justicia\s+constitucional|amparo|habeas\s+corpus|inconstitucionalidad)\b/i;

/**
 * Sentinel deliberado: hoy NO existe ningún valor de `materia` en
 * biblioteca_vectores dedicado a derecho mercantil (verificado, auditoría de
 * corpus 2026-09-28 -- el Código de Comercio, cuando se ingiera a producción,
 * usa materia='10_LEYES_REGLAMENTOS', una categoría genérica compartida con
 * muchas otras normas no mercantiles, ver scripts/ingesta-comercio.ts).
 * Filtrar la búsqueda semántica a este sentinel garantiza CERO falsos
 * positivos por contaminación de materia hoy (ningún fragmento existente
 * puede coincidir) a costa de cero recall semántico mercantil hasta que
 * exista una materia real dedicada -- consciente y documentado, no oculto.
 * Revisar/retirar este sentinel cuando se autorice una ingesta mercantil real
 * con su propio valor de materia.
 */
export const MATERIA_MERCANTIL_SIN_CORPUS = '__MERCANTIL_SIN_CORPUS_DEDICADO__';

/**
 * Úsese SOLO para `materiaSemantica` en lib/rag/search.ts::buscarRAG -- ver
 * bloque de comentario arriba para el porqué de la separación de
 * `detectarMateriaDesdeTexto`.
 */
export function detectarMateriaSemanticaAmpliada(query: string): string | null {
  const base = detectarMateriaDesdeTexto(query);
  if (base) return base;
  if (RE_MATERIA_MERCANTIL.test(query)) return MATERIA_MERCANTIL_SIN_CORPUS;
  if (RE_MATERIA_NOTARIAL.test(query)) return '03_NOTARIAL';
  if (RE_MATERIA_CONSTITUCIONAL.test(query)) return '07_CONSTITUCIONAL';
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// IDENTIDAD ESTRICTA DEL INSTRUMENTO
// ─────────────────────────────────────────────────────────────────────────────
//
// HOTFIX FINAL: `materia` (01_PENAL/02_CIVIL) es demasiado ancha — Código
// Penal y Código Procesal Penal comparten la misma materia, así que una
// consulta por "Artículo 173 del Código Penal" podía recibir el registro del
// CPP simplemente porque no existía otro candidato en esa materia. La
// identidad de instrumento es un nivel de precisión distinto: se detecta del
// texto de la consulta, y solo se acepta un candidato de la DB si su propio
// dato real (fuente, o metadata.documento_origen) confirma ese instrumento —
// nunca por materia, número de artículo, fuente_tipo o vigencia solamente.

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

// Orden importa: las variantes "procesal" se evalúan primero para que
// "Código Procesal Penal" nunca caiga en CODIGO_PENAL por contener "penal".
// Mismo motivo para REGLAMENTO_NOTARIADO antes que CODIGO_NOTARIADO: el texto
// "Reglamento del Código del Notariado" contiene "Código del Notariado" como
// subcadena, así que si CODIGO_NOTARIADO se evaluara primero se quedaría con
// la coincidencia por error.
const RE_INSTRUMENTO: Array<[InstrumentoNormalizado, RegExp]> = [
  ['CODIGO_PROCESAL_PENAL', /\bcpp\b|c[oó]digo\s+procesal\s+penal\b/i],
  ['CODIGO_PROCESAL_CIVIL', /\bcpc\b|c[oó]digo\s+procesal\s+civil\b/i],
  ['CODIGO_PENAL', /c[oó]digo\s+penal\b/i],
  ['CODIGO_CIVIL', /c[oó]digo\s+civil\b/i],
  ['CODIGO_TRABAJO', /c[oó]digo\s+(?:del?\s+)?trabajo\b/i],
  ['CODIGO_FAMILIA', /c[oó]digo\s+de\s+familia\b/i],
  // Alias P1 (intención instrumental explícita): "reglamento notarial" y
  // "reglamento de la función notarial" son el Reglamento. "ley notarial" NO
  // es alias de ningún instrumento: no se asimila al Código del Notariado.
  ['REGLAMENTO_NOTARIADO', /reglamento\s+(?:(?:del?\s+)?(?:c[oó]digo\s+(?:del?\s+)?)?notariado\b|(?:de\s+la\s+)?(?:funci[oó]n\s+)?notarial\b)/i],
  ['CODIGO_NOTARIADO', /c[oó]digo\s+(?:(?:del?\s+)?notariado\b|notarial\b)/i],
  ['CODIGO_TRIBUTARIO', /c[oó]digo\s+tributario\b/i],
  ['CODIGO_COMERCIO', /c[oó]digo\s+de\s+comercio\b/i],
  // Se evalúa antes que CONSTITUCION por el mismo motivo que
  // REGLAMENTO_NOTARIADO antes que CODIGO_NOTARIADO: aunque el \b de
  // CONSTITUCION ya evita coincidir dentro de "Constitucional" (ver abajo),
  // declarar el instrumento más específico primero es la convención de este
  // archivo y evita depender solo del \b si el patrón de CONSTITUCION cambia.
  ['LEY_JUSTICIA_CONSTITUCIONAL', /ley\s+(?:sobre|de)\s+justicia\s+constitucional\b/i],
  // \b tras "constituci[oó]n" es lo que evita que esto capture "Ley sobre
  // Justicia Constitucional" (que en la fuente real contiene "Constitucional",
  // sin límite de palabra inmediatamente después de "constitucion").
  ['CONSTITUCION', /constituci[oó]n\b/i],
];

/** Detecta el instrumento normativo específico que el usuario mencionó explícitamente, o null si no lo hizo. */
export function detectarInstrumentoDesdeTexto(query: string): InstrumentoNormalizado | null {
  for (const [instrumento, re] of RE_INSTRUMENTO) {
    if (re.test(query)) return instrumento;
  }
  return null;
}

// Patrón que debe encontrarse en `fuente` (o metadata.documento_origen) de
// una fila real de la DB para confirmar que pertenece a ese instrumento.
// Mismo patrón que la detección de texto — es intencional: la identidad de
// un candidato se confirma con el mismo vocabulario con que el usuario lo pidió.
const RE_FUENTE_POR_INSTRUMENTO: Record<InstrumentoNormalizado, RegExp> = {
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
 * true solo si un dato REAL del registro (fuente, o metadata.documento_origen)
 * confirma el instrumento solicitado. Una fila con fuente/metadata ausente
 * (la mayoría del corpus legacy hoy) nunca coincide con ningún instrumento —
 * no se adivina la identidad de un documento que no la declara.
 */
export function identidadDocumentalCoincide(row: FilaExactaDB, instrumento: InstrumentoNormalizado): boolean {
  const patron = RE_FUENTE_POR_INSTRUMENTO[instrumento];
  if (row.fuente && patron.test(row.fuente)) return true;
  const metaDoc = row.metadata && typeof row.metadata === 'object'
    ? (row.metadata as Record<string, unknown>).documento_origen
    : undefined;
  if (typeof metaDoc === 'string' && patron.test(metaDoc)) return true;
  return false;
}

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

/** Detecta un número de artículo explícito y, si el texto lo indica, la materia y el instrumento exacto. */
export function detectarArticuloExacto(query: string): DeteccionArticulo | null {
  const m = RE_ARTICULO_NUM.exec(query);
  if (!m) return null;
  return {
    numero: m[1],
    materiaDetectada: detectarMateriaDesdeTexto(query),
    instrumento: detectarInstrumentoDesdeTexto(query),
  };
}

/**
 * Confirma que el fragmento contiene el encabezado real del artículo, no
 * solo una mención de paso (p. ej. una sentencia que cita "el artículo 173
 * numeral 3" sin ser el texto del artículo). Sin esto, un fragmento mal
 * segmentado que solo contiene la cola de un artículo distinto podía
 * citarse como si fuera el artículo pedido.
 *
 * BUG P1 (2026-09-04): esta función solo reconocía el formato CEDIJ/CPP
 * ("ARTICULO 173.-"). El Código Civil (fuente Poder Judicial,
 * CodigoCivil(Actualizado2014).pdf) usa "Artículo 1. " (punto+espacio, sin
 * guion) y, en los 16 stubs sintetizados de Arts.21-36, ni siquiera punto
 * ("Artículo 126 Derogado") -- verificado: 0/6 artículos del Civil pasaban
 * el filtro viejo, dejando la búsqueda exacta del Civil siempre vacía pese
 * a que el fuente/instrumento sí resolvía correctamente.
 *
 * Ahora acepta tres terminadores reales del corpus: ".-" (CPP), ". " (Civil,
 * mayoría) y " " suelto (stubs del Civil sin punto). El terminador por sí
 * solo ya no basta para distinguir un encabezado real de una referencia
 * cruzada una vez que se acepta el espacio suelto -- se exige además que lo
 * que sigue empiece en MAYÚSCULA (o dígito/comilla): un encabezado real
 * siempre abre su propio texto en mayúscula; una referencia cruzada a mitad
 * de oración ("el artículo 173 numeral 3...") continúa en minúscula.
 *
 * NO se ancla a inicio de línea/párrafo -- se probó esa variante (propuesta
 * inicial del auditor) y rompía un test ya existente y correcto: el CPP
 * real trae encabezados que aparecen a mitad de una cadena sin salto de
 * línea previo ("...preciso: 1)... ARTICULO 173.- Medidas...",
 * tests/rag-articulo-exacto.test.ts:168). El filtro mayúscula+terminador ya
 * discrimina correctamente sin ese ancla, verificado contra los 4 casos
 * exigidos más los 4 tests preexistentes de este archivo.
 *
 * BUG #2 encontrado al probar la primera versión (también corregido aquí):
 * un lookahead de mayúscula `(?=[A-Z...])` DENTRO de una regex con flag `i`
 * (necesario para aceptar "articulo"/"Artículo"/"ARTICULO") queda anulado
 * -- bajo `/i`, `[A-Z]` matchea minúsculas también, así que "numeral"
 * (minúscula) pasaba igual que "Medidas" (mayúscula). Verificado con el
 * test negativo del propio auditor ("...el artículo 173 numeral 3..."),
 * que fallaba con la regex de una sola pieza. Se resuelve en dos pasos: la
 * regex (case-insensitive) solo localiza "artículo N" + terminador; el
 * chequeo de mayúscula del carácter siguiente se hace aparte, comparando
 * el carácter crudo contra su propia mayúscula/minúscula -- sensible a
 * caso de verdad, sin depender del flag de la regex.
 *
 * BUG #3 (encontrado por el suite completo, no solo este archivo): el
 * saneo `numero.replace(/[^0-9]/g, '')` de la propuesta del auditor
 * descarta el sufijo de letra de los artículos bis ("123-A" -> "123"),
 * rompiendo tests/rag-articulo-derogado-fallback.test.ts (D.102-2018,
 * Arts. 123-A/123-B). `numero` ya llega formateado por el caller
 * (formatearNumArticuloDisplay-equivalente) -- no hace falta sanearlo, y
 * sanearlo mal rompe un caso real ya cubierto por tests. Se usa tal cual,
 * igual que el código original antes de este fix.
 */
export function tieneEncabezadoArticulo(contenido: string, numero: string): boolean {
  if (!numero) return false;
  const re = new RegExp(`art[ií]culo\\s*${numero}\\s*(?:\\.-\\s*|\\.\\s+|\\s+)`, 'i');
  const m = re.exec(contenido);
  if (!m) return false;
  const siguiente = contenido[m.index + m[0].length];
  if (!siguiente) return false;
  if (/[0-9"«]/.test(siguiente)) return true;
  return siguiente === siguiente.toUpperCase() && siguiente !== siguiente.toLowerCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// RUTA PARALELA DE VERIFICACIÓN — INSTRUMENTOS SIN ENCABEZADO TEXTUAL (P0 2026-09-05)
// ─────────────────────────────────────────────────────────────────────────────
//
// Hallazgo: para estos 7 instrumentos, el `contenido` almacenado en el corpus
// NUNCA incluye el literal "Artículo N." -- arranca directo en el título o
// cuerpo del artículo (ej. Constitución Art.1: "Honduras es un Estado de
// derecho, soberano..."; Código Penal Art.1: "PRINCIPIO DE LEGALIDAD. Nadie
// puede ser castigado..."). Confirmado contra el contenido REAL de producción
// para los 7, no por inferencia. `tieneEncabezadoArticulo` exige ese literal
// como defensa contra fragmentos mal segmentados -- aplicado tal cual, deja
// estos 7 instrumentos permanentemente sin resultado en la búsqueda exacta,
// sin importar qué tan bien rutee el instrumento.
//
// Opción C (decisión explícita de Fredy, 2026-09-05): en vez de relajar
// tieneEncabezadoArticulo de forma abierta (arriesgaría reabrir el bug que
// esa función fue creada para prevenir, para TODO el corpus) o reescribir
// `contenido` con un UPDATE masivo, se agrega una ruta de verificación
// paralela y explícitamente allowlisteada: solo para estos 7 instrumentos,
// se acepta un candidato sin encabezado textual si (a) su identidad
// documental real (fuente/metadata) confirma el instrumento pedido, Y (b) su
// propia columna `num_articulo` coincide exactamente con el número pedido.
// Los otros dos filtros de resolverArticuloExacto (sin artefactos de
// anonimización, identidad documental) NO se relajan -- esta ruta solo
// sustituye el requisito de encabezado textual, nada más. Ningún otro
// instrumento pasa por esta ruta: para todo lo demás, tieneEncabezadoArticulo
// sigue siendo el único criterio.
const INSTRUMENTOS_SIN_ENCABEZADO_TEXTUAL: ReadonlySet<InstrumentoNormalizado> = new Set([
  'CONSTITUCION',
  'CODIGO_FAMILIA',
  'CODIGO_TRABAJO',
  'CODIGO_PENAL',
  'CODIGO_PROCESAL_CIVIL',
  'CODIGO_TRIBUTARIO',
  'LEY_JUSTICIA_CONSTITUCIONAL',
]);

/**
 * true solo si el instrumento está en la allowlist de "sin encabezado
 * textual" Y la propia columna `num_articulo` de la fila coincide
 * exactamente con el número pedido. No sustituye identidadDocumentalCoincide
 * ni el filtro de anonimización -- resolverArticuloExacto sigue aplicando
 * ambos sin excepción; esto solo reemplaza tieneEncabezadoArticulo como
 * segunda vía, y únicamente para los instrumentos explícitamente listados.
 */
export function tieneIdentidadSinEncabezado(
  row: FilaExactaDB,
  numero: string,
  instrumento: InstrumentoNormalizado,
): boolean {
  if (!INSTRUMENTOS_SIN_ENCABEZADO_TEXTUAL.has(instrumento)) return false;
  return row.num_articulo === numero;
}

export interface ResultadoExacto {
  fragmentos: FragmentoRAG[];
  /** true cuando hay más de un candidato (posibles instrumentos distintos con el mismo número) — no citar ninguno como autoritativo. */
  ambiguo: boolean;
}

/**
 * Busca un artículo por coincidencia exacta de número — sin embeddings.
 * Solo considera fuente_tipo='codigo' (excluye jurisprudencia/sentencias que
 * simplemente MENCIONAN un número de artículo) y es_norma_vigente=true.
 */
export interface FilaExactaDB {
  id: string;
  contenido: string;
  num_articulo: string | null;
  fuente: string;
  fuente_tipo: string | null;
  jurisdiccion: string | null;
  es_norma_vigente: boolean | null;
  materia: string;
  metadata?: Record<string, unknown> | null;
}

/**
 * Resuelve las filas ya obtenidas de la DB a un resultado exacto — función
 * pura, separada de la llamada a Supabase para poder testear la lógica de
 * ambigüedad/filtrado sin necesitar una base de datos real.
 *
 * `instrumentoSolicitado`: si el usuario mencionó un instrumento explícito
 * (CPP, Código Penal, etc.), solo se acepta un candidato cuya identidad
 * documental REAL (fuente/metadata) lo confirme — nunca por materia, número
 * de artículo, fuente_tipo o vigencia solamente. Si el usuario NO mencionó
 * ningún instrumento ("Artículo 173" a secas), la búsqueda exacta se
 * abstiene — no adivina cuál instrumento quiso decir.
 */
export function resolverArticuloExacto(
  filas: FilaExactaDB[],
  numero: string,
  instrumentoSolicitado: InstrumentoNormalizado | null,
): ResultadoExacto {
  if (filas.length === 0) return { fragmentos: [], ambiguo: false };
  if (!instrumentoSolicitado) return { fragmentos: [], ambiguo: false };

  // Tres filtros obligatorios, ninguno se relaja por los otros:
  // 1) sin artefactos de anonimización sin limpiar (nunca se presenta
  //    "[Cliente_Anónimo]" como si fuera texto de ley real);
  // 2) el fragmento debe contener el encabezado real del artículo, no solo
  //    mencionarlo de paso o ser un trozo de un artículo distinto mal
  //    segmentado -- salvo para el allowlist explícito de instrumentos sin
  //    encabezado textual (ver tieneIdentidadSinEncabezado arriba), donde se
  //    confía en `num_articulo` en su lugar;
  // 3) identidad documental real que confirme el instrumento pedido — no
  //    materia, no fuente_tipo, no vigencia. Si ningún candidato cumple los
  //    tres, se trata como "no encontrado" — mejor abstenerse que citar un
  //    fragmento degradado, mal atribuido o del instrumento equivocado.
  const limpias = filas
    .filter((row) => !contieneArtefactoAnonimizacion(row.contenido))
    .filter((row) =>
      tieneEncabezadoArticulo(row.contenido, numero) ||
      tieneIdentidadSinEncabezado(row, numero, instrumentoSolicitado),
    )
    .filter((row) => identidadDocumentalCoincide(row, instrumentoSolicitado));

  // Más de un candidato en materias distintas (posibles instrumentos
  // distintos con el mismo número) => ambiguo. No adivinar cuál es el
  // correcto. En la práctica, con el filtro de identidad ya aplicado, esto
  // solo dispara si el propio corpus tiene datos inconsistentes.
  const materiasDistintas = new Set(limpias.map((r) => r.materia));
  if (limpias.length > 1 && materiasDistintas.size > 1) {
    return { fragmentos: [], ambiguo: true };
  }

  const fragmentos: FragmentoRAG[] = limpias.slice(0, 1).map((row) => ({
    id: row.id,
    contenido: row.contenido,
    num_articulo: row.num_articulo,
    fuente: row.fuente,
    relevancia: 1,
    fuente_tipo: row.fuente_tipo,
    jurisdiccion: row.jurisdiccion,
    es_norma_vigente: row.es_norma_vigente,
    hash: hashFragmento({ contenido: row.contenido, num_articulo: row.num_articulo, fuente: row.fuente }),
  }));

  return { fragmentos, ambiguo: false };
}
