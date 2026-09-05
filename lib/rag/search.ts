/**
 * MAYA PENAL — RAG Search
 * =======================
 * Búsqueda semántica del CPP Honduras.
 *
 * Modos soportados (configurable por RAG_BACKEND en .env.local):
 *
 *  'python'   → Llama al microservicio FastAPI local (python-rag/api_fastapi.py)
 *               Útil durante desarrollo local antes de provisionar Supabase.
 *               Requiere: uvicorn api_fastapi:app --port 8100
 *
 *  'supabase' → Búsqueda vectorial en Supabase pgvector (producción)
 *               Requiere: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *
 *  'disabled' → Sin RAG (solo el system prompt y normas-cpp.ts)
 *               Modo actual mientras Supabase no está provisionado.
 */

import { createHash } from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export interface FragmentoRAG {
  id?: string;
  contenido: string;
  num_articulo: string | null;
  fuente: string;
  relevancia: number;
  fuente_tipo?: string | null;
  jurisdiccion?: string | null;
  es_norma_vigente?: boolean | null;
  /** SHA-256(contenido+num_articulo+fuente) truncado a 8 hex — integridad verificable sin columna DB nueva (P0-4). */
  hash?: string;
}

/** Hash corto y determinista de un fragmento, para trazabilidad en UI (P0-4). */
export function hashFragmento(f: Pick<FragmentoRAG, 'contenido' | 'num_articulo' | 'fuente'>): string {
  return createHash('sha256')
    .update(`${f.contenido}|${f.num_articulo ?? ''}|${f.fuente}`)
    .digest('hex')
    .slice(0, 8);
}

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
  ['REGLAMENTO_NOTARIADO', /reglamento\s+(?:del?\s+)?(?:c[oó]digo\s+(?:del?\s+)?)?notariado\b/i],
  ['CODIGO_NOTARIADO', /c[oó]digo\s+(?:del?\s+)?notariado\b/i],
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

// ─────────────────────────────────────────────────────────────────────────────
// FAIL-CLOSED: ¿ESTA CONSULTA EXIGE EVIDENCIA VERIFICABLE DEL CORPUS?
// ─────────────────────────────────────────────────────────────────────────────
//
// WAR ROOM FINAL: hasta ahora, cuando la recuperación (exacta o semántica)
// devolvía cero fragmentos válidos, el chat seguía llamando al LLM con un
// system prompt sin contexto RAG — el modelo podía (y lo hizo, en la Prueba 3
// del hotfix anterior) responder con un análisis jurídico detallado desde su
// propio conocimiento paramétrico, citando artículos por número, sin ningún
// respaldo documental verificable. Esta función identifica, ANTES de invocar
// al LLM, cuándo una consulta exige ese respaldo — para poder abstenerse en
// código en vez de confiar en que el modelo se abstenga por sí mismo.

const RE_SEGUN_CORPUS = /seg[uú]n el corpus|de acuerdo (?:a|con) el corpus|corpus jur[ií]dico/i;
const RE_SOLICITA_EVIDENCIA = /\b(fuente|citas?|hash|texto recuperado|fragmento(?:s)?\s+(?:recuperado|del corpus))\b/i;

/**
 * true cuando la consulta exige evidencia verificable del corpus: lo pide
 * explícitamente ("según el corpus", "cita la fuente"), pide el contenido de
 * un artículo específico, o la ruta jurídica ya la exige por configuración
 * (modos de análisis con router activo en ruta A/B/C — ver route.ts).
 */
export function requiereEvidenciaCorpus(query: string, rutaCorpusObligatoria: boolean): boolean {
  if (rutaCorpusObligatoria) return true;
  if (RE_SEGUN_CORPUS.test(query)) return true;
  if (RE_SOLICITA_EVIDENCIA.test(query)) return true;
  if (detectarArticuloExacto(query) !== null) return true;
  return false;
}

export const CORPUS_EVIDENCE_NOT_FOUND = 'CORPUS_EVIDENCE_NOT_FOUND';

export const MENSAJE_ABSTENCION_CORPUS =
  'No se recuperaron fragmentos verificables del corpus para esta consulta. ' +
  'Para evitar una respuesta jurídica sin respaldo documental, Maya Lex no responderá desde conocimiento general.';

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

async function consultarPorVigencia(
  numero: string,
  materiaDetectada: string | null,
  esNormaVigente: boolean,
): Promise<FilaExactaDB[]> {
  const { createServerSupabaseClient } = await import('@/lib/supabase');
  const supabase = createServerSupabaseClient();

  let consulta = supabase
    .from('biblioteca_vectores')
    .select('id, contenido, num_articulo, fuente, fuente_tipo, jurisdiccion, es_norma_vigente, materia, metadata')
    .eq('num_articulo', numero)
    .eq('fuente_tipo', 'codigo')
    .eq('es_norma_vigente', esNormaVigente);

  // Filtro de materia: solo optimiza la consulta a la DB (menos filas a
  // traer) — la aceptación real la decide identidadDocumentalCoincide() en
  // resolverArticuloExacto, nunca la materia por sí sola.
  if (materiaDetectada) consulta = consulta.eq('materia', materiaDetectada);

  const { data, error } = await consulta;
  if (error || !data) return [];
  return data as FilaExactaDB[];
}

export async function buscarArticuloExacto(
  numero: string,
  materiaDetectada: string | null,
  instrumentoSolicitado: InstrumentoNormalizado | null,
): Promise<ResultadoExacto> {
  const filasVigentes = await consultarPorVigencia(numero, materiaDetectada, true);
  const resultadoVigente = resolverArticuloExacto(filasVigentes, numero, instrumentoSolicitado);
  if (resultadoVigente.fragmentos.length > 0 || resultadoVigente.ambiguo) {
    return resultadoVigente;
  }

  // GAP 2 (Operación "Facultades Completas", 2026-08-28): si no hay ningún
  // artículo vigente con ese número, se intenta un segundo paso -- solo
  // artículos CONFIRMADOS no vigentes (ej. derogados, con evidencia textual
  // directa de fuente -- nunca inferidos). Reutiliza exactamente la misma
  // función de resolución (mismos tres filtros: anonimización, encabezado
  // real, identidad de instrumento) -- ningún criterio se relaja para este
  // camino. El resultado NUNCA se presenta como norma vigente: construirCitas
  // ya exige es_norma_vigente===true para entrar a la lista de citas, y
  // formatearContextoRAG ya etiqueta este patrón exacto como
  // "[NO VIGENTE — NO CITAR COMO NORMA]" (D6a-bis). Este paso es
  // deliberadamente distinto de la exclusión de D6(b): esa protege contra
  // que un artículo derogado se cuele por similitud semántica sin que el
  // usuario lo haya pedido; esto responde de forma honesta cuando el usuario
  // SÍ preguntó explícitamente por ese número exacto -- "fue derogado" es
  // información real, no una alucinación.
  const filasNoVigentes = await consultarPorVigencia(numero, materiaDetectada, false);
  return resolverArticuloExacto(filasNoVigentes, numero, instrumentoSolicitado);
}

export interface ResultadoRAG {
  fragmentos: FragmentoRAG[];
  articulos_encontrados: string[];
  backend: 'python' | 'supabase' | 'disabled';
  error?: string;
  /** true cuando la búsqueda exacta encontró el mismo número de artículo en más de un instrumento/materia — no se citó nada para no adivinar. */
  ambiguo?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────

type BackendRAG = 'python' | 'supabase' | 'disabled';

/**
 * P0-2B: RAG_BACKEND ausente en un entorno (a diferencia de 'disabled'
 * explícito) apagaba el RAG por completo en silencio — el chat seguía
 * respondiendo, sin ningún error visible, simplemente sin corpus ni citas.
 * Un olvido de configuración no debe comportarse igual que una decisión
 * deliberada de desactivar el RAG: si las credenciales de Supabase existen,
 * se usa el backend real; 'disabled' sigue respetándose cuando es explícito.
 */
export function getBackend(): BackendRAG {
  const val = process.env.RAG_BACKEND as BackendRAG | undefined;
  if (val && ['python', 'supabase', 'disabled'].includes(val)) return val;

  const tieneSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
  return tieneSupabase ? 'supabase' : 'disabled';
}

const PYTHON_RAG_URL = process.env.PYTHON_RAG_URL ?? 'http://localhost:8100';

// ─────────────────────────────────────────────────────────────────────────────
// BACKEND: PYTHON FASTAPI (desarrollo local)
// ─────────────────────────────────────────────────────────────────────────────

async function buscarEnPython(
  consulta: string,
  k: number,
  coleccion: string,
  materia?: string,
): Promise<ResultadoRAG> {
  const response = await fetch(`${PYTHON_RAG_URL}/buscar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ consulta, k, coleccion, materia: materia ?? null }),
    // Timeout razonable — la búsqueda vectorial es rápida
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => 'Error desconocido');
    throw new Error(`Python RAG error ${response.status}: ${err}`);
  }

  const data = await response.json() as {
    fragmentos: FragmentoRAG[];
    articulos_encontrados: string[];
  };

  return {
    fragmentos: data.fragmentos.map((f) => ({ ...f, hash: f.hash ?? hashFragmento(f) })),
    articulos_encontrados: data.articulos_encontrados,
    backend: 'python',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKEND: SUPABASE PGVECTOR (producción)
// ─────────────────────────────────────────────────────────────────────────────

async function buscarEnSupabase(
  consulta: string,
  k: number,
  coleccion: string,
  materia?: string,
): Promise<ResultadoRAG> {
  // Requiere la tabla biblioteca_vectores + RPC buscar_biblioteca en Supabase
  // (supabase/vectores.sql — poblada por scripts/seed_vectores.py) y
  // HF_API_TOKEN para el embedding de la consulta (lib/rag/embed.ts).
  const { createServerSupabaseClient } = await import('@/lib/supabase');
  const { embedQuery } = await import('@/lib/rag/embed');
  const supabase = createServerSupabaseClient();

  const queryEmbedding = await embedQuery(consulta);

  type FilaRPC = {
    id: string;
    contenido: string;
    num_articulo: string | null;
    fuente: string;
    fuente_tipo: string | null;
    jurisdiccion: string | null;
    es_norma_vigente: boolean | null;
    similarity: number;
  };

  const mapearFila = (row: FilaRPC): FragmentoRAG => ({
    id: row.id,
    contenido: row.contenido,
    num_articulo: row.num_articulo,
    fuente: row.fuente,
    relevancia: row.similarity,
    fuente_tipo: row.fuente_tipo,
    jurisdiccion: row.jurisdiccion,
    es_norma_vigente: row.es_norma_vigente,
    hash: hashFragmento({ contenido: row.contenido, num_articulo: row.num_articulo, fuente: row.fuente }),
  });

  // v2: agrega fuente_tipo/jurisdiccion/es_norma_vigente para que el modelo
  // distinga norma vigente hondureña de doctrina/jurisprudencia comparada.
  //
  // Retrieval en dos etapas (Cohere rerank-v3.5, 2026-09-01):
  //  Etapa 1 (aquí): en vez de traer directamente los k=5 finales por
  //    similitud pura, se amplía la recuperación a RETRIEVAL_WIDE_K
  //    candidatos — la similitud vectorial es barata pero imprecisa para
  //    relevancia jurídica real; un embudo ancho le da más material al
  //    reranker antes de decidir.
  //  Etapa 2 (rerankearFragmentos, más abajo): Cohere reordena esos
  //    candidatos por relevancia consulta-documento real y se trunca a los
  //    k mejores — reemplaza a la similitud coseno como criterio final de
  //    corte, con degradación elegante si Cohere no está disponible.
  //
  // El fusionado con un top-3 adicional filtrado a solo_norma_vigente=true
  // se mantiene sin cambios: sigue siendo el mecanismo que garantiza que un
  // artículo vigente con similitud pura baja (el caso real de producción,
  // 2026-07-23: Art. 173 CPP en la posición #8 por similitud, fuera del
  // top-5 de esa época) SIEMPRE entre al menos como candidato al pool que
  // recibe el reranker — ya no depende de "forzar su inclusión final" sino
  // de garantizarle una oportunidad justa de ranking por relevancia real,
  // que es un criterio más fuerte que el hack de fusión que sustituye.
  const RETRIEVAL_WIDE_K = Math.max(k, 25);
  const [normal, vigente] = await Promise.all([
    supabase.rpc('buscar_biblioteca_v2', {
      query_embedding: queryEmbedding,
      coleccion_filtro: coleccion,
      materia_filtro: materia ?? null,
      limite: RETRIEVAL_WIDE_K,
    }),
    supabase.rpc('buscar_biblioteca_v2', {
      query_embedding: queryEmbedding,
      coleccion_filtro: coleccion,
      materia_filtro: materia ?? null,
      limite: 3,
      solo_norma_vigente: true,
    }),
  ]);

  if (normal.error) {
    throw new Error(`Supabase RAG error: ${normal.error.message}`);
  }

  const fragmentosNormal: FragmentoRAG[] = (normal.data ?? []).map(mapearFila);

  // vigente.error se ignora (degradación elegante) — el top-k normal ya es
  // un resultado válido por sí solo; la fusión es una garantía adicional.
  const fragmentosVigente: FragmentoRAG[] = (vigente.error ? [] : vigente.data ?? []).map(mapearFila);

  const idsExistentes = new Set(fragmentosNormal.map(f => f.id));
  const fragmentosSinFiltrar = [
    ...fragmentosNormal,
    ...fragmentosVigente.filter(f => !idsExistentes.has(f.id)),
  ];

  // Contención de calidad: nunca presentar como respuesta un fragmento con
  // artefactos de anonimización sin limpiar (ej. [Cliente_Anónimo],
  // [Teléfono_Oculto]) — mismo criterio que la contención SEO de /leyes y
  // /consultas (lib/seo/estado-editorial.ts). Auditoría de corpus 2026-07-27
  // encontró este patrón en 76.6% del corpus legacy.
  //
  // D6(b) (Operación "Facultades Completas", 2026-08-28): exclusión real de
  // artículos de código hondureño confirmados NO vigentes (ej. derogados —
  // dossier DEROGACION_ADOPCION_102-2018 de Fase 1). Antes solo se
  // etiquetaban (D6a) pero seguían llegando al contexto del modelo por esta
  // vía sin filtro (`fragmentosNormal`, similitud pura, sin filtro de
  // vigencia) — un artículo derogado con embedding cercano a la consulta
  // podía colarse igual, con o sin etiqueta. Se excluyen aquí, antes de
  // construir el contexto, no solo se marcan. No se borran de la base de
  // datos (quedan disponibles para la futura feature de vigencia/derogación
  // visible, ver decision log 2026-08-27) — solo se excluyen de esta
  // recuperación semántica sin filtro.
  //
  // Extensión (2026-08-28, mismo día): `esRegistroNoVigenteExcluido` exige
  // `fuente_tipo === 'codigo'` exacto, así que NO cubre las filas realmente
  // huérfanas del corpus legacy (`fuente IS NULL`, y con ella
  // `fuente_tipo`/`jurisdiccion` también NULL — 5,024 de las 8,366 puestas
  // en `es_norma_vigente=false` en el QUINTO UPDATE, ver DECISION_LOG.md).
  // Se agrega un filtro adicional, deliberadamente angosto (solo
  // `fuente === null`, sin tocar la condición de D6b) para cerrar ese caso
  // sin duplicar ni reemplazar la función existente.
  const candidatos = fragmentosSinFiltrar
    .filter((f) => !contieneArtefactoAnonimizacion(f.contenido))
    .filter((f) => !esRegistroNoVigenteExcluido(f))
    .filter((f) => f.fuente !== null);

  // Etapa 2 del retrieval en dos etapas: Cohere reordena `candidatos` (hasta
  // ~RETRIEVAL_WIDE_K + 3) por relevancia consulta-documento real y trunca a
  // los k mejores. rerankearFragmentos() nunca lanza — si Cohere no está
  // disponible, retorna candidatos.slice(0, k) en el mismo orden de
  // similitud pgvector que tenía antes de esta integración (paridad de
  // comportamiento con el pipeline previo en el camino de fallback).
  const { rerankearFragmentos } = await import('@/lib/rag/rerank');
  const fragmentos = await rerankearFragmentos(consulta, candidatos, k);

  const articulos = [...new Set(
    fragmentos
      .map(f => f.num_articulo)
      .filter((a): a is string => a !== null)
  )];

  return { fragmentos, articulos_encontrados: articulos, backend: 'supabase' };
}

const PATRON_ANONIMIZACION_SIN_LIMPIAR = /\[(Cliente|Empresa)_An[oó]nimo|Tel[eé]fono_Oculto|Expediente_Anonimizado\]/;

export function contieneArtefactoAnonimizacion(contenido: string): boolean {
  return PATRON_ANONIMIZACION_SIN_LIMPIAR.test(contenido);
}

/**
 * D6(b) — true para un artículo de código hondureño confirmado NO vigente
 * (ej. derogado). Mismo criterio exacto que la etiqueta de seguridad D6(a)
 * en formatearContextoRAG, pero aplicado ANTES de que el fragmento llegue al
 * contexto, no solo al mostrarlo. Se define aquí (no inline) para que ambos
 * puntos del código — exclusión y etiqueta — usen la misma condición, nunca
 * dos copias que puedan desincronizarse.
 */
export function esRegistroNoVigenteExcluido(f: Pick<FragmentoRAG, 'es_norma_vigente' | 'fuente_tipo' | 'jurisdiccion'>): boolean {
  return f.es_norma_vigente === false && f.fuente_tipo === 'codigo' && f.jurisdiccion === 'HN';
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Busca fragmentos normativos relevantes para una consulta.
 * Elige automáticamente el backend según RAG_BACKEND en .env.local.
 *
 * @param consulta - Texto de la pregunta jurídica
 * @param k - Número de fragmentos a recuperar (default 5)
 * @param coleccion - Colección ChromaDB (ej. 'mayalex_normativos')
 * @param materia - Filtro por metadato materia (ej. '01_PENAL') — garantiza
 *                  aislamiento anti-contaminación dentro de colecciones mixtas
 */
export async function buscarRAG(
  consulta: string,
  k = 5,
  coleccion = 'cpp_honduras',
  materia?: string,
): Promise<ResultadoRAG> {
  const backend = getBackend();

  if (backend === 'disabled') {
    return { fragmentos: [], articulos_encontrados: [], backend: 'disabled' };
  }

  // Recuperación exacta por artículo — prioridad sobre la semántica.
  // No requiere HF_API_TOKEN (no genera embedding), así que sigue
  // funcionando aunque la búsqueda semántica esté degradada. Si detecta
  // ambigüedad entre instrumentos con el mismo número, NO cae en
  // silencio a la semántica (que podría citar el instrumento equivocado)
  // — deja constancia explícita vía `ambiguo` para que el caller decida
  // abstenerse.
  if (backend === 'supabase') {
    const deteccion = detectarArticuloExacto(consulta);
    if (deteccion) {
      try {
        const materiaEfectiva = deteccion.materiaDetectada ?? materia ?? null;
        const exacto = await buscarArticuloExacto(deteccion.numero, materiaEfectiva, deteccion.instrumento);
        if (exacto.ambiguo) {
          return { fragmentos: [], articulos_encontrados: [], backend: 'supabase', ambiguo: true };
        }
        if (exacto.fragmentos.length > 0) {
          return {
            fragmentos: exacto.fragmentos,
            articulos_encontrados: [deteccion.numero],
            backend: 'supabase',
          };
        }
        // Sin candidato exacto válido. Si el usuario identificó la materia
        // (penal/civil) O el instrumento específico (CPP, Código Penal,
        // Código de Trabajo, etc.), no se cae a semántica amplia — podría
        // citar un artículo de un instrumento distinto con el mismo número,
        // o un fragmento mal segmentado; la búsqueda semántica tampoco filtra
        // por instrumento, así que no puede sustituir la identidad exacta que
        // el usuario pidió. Se abstiene. Si el número vino totalmente
        // desnudo ("Artículo 173" a secas, sin materia ni instrumento), sí se
        // permite el fallback semántico — comportamiento previo, ya validado.
        if (deteccion.materiaDetectada || deteccion.instrumento) {
          return { fragmentos: [], articulos_encontrados: [], backend: 'supabase' };
        }
      } catch (error) {
        console.warn(
          '[RAG] Búsqueda exacta falló, degradando a semántica:',
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }

  // Guardia de producción: en Vercel no existe localhost — si RAG_BACKEND=python
  // apunta a localhost, degradar a disabled en vez de esperar el timeout de 8s
  // en CADA consulta.
  if (
    backend === 'python' &&
    process.env.VERCEL === '1' &&
    /localhost|127\.0\.0\.1/.test(PYTHON_RAG_URL)
  ) {
    console.warn(
      '[RAG] RAG_BACKEND=python con PYTHON_RAG_URL=localhost en Vercel — RAG deshabilitado. ' +
      'Configura RAG_BACKEND=disabled (o supabase) en las env vars de Vercel.'
    );
    return { fragmentos: [], articulos_encontrados: [], backend: 'disabled' };
  }

  // Búsqueda semántica: si no vino un filtro de materia explícito (route.ts
  // solo lo pasa en modos "_penal", que la UI no expone hoy), se infiere de
  // lo que el propio texto de la consulta indique. Sin esto, una pregunta
  // claramente penal podía recuperar por similitud un artículo civil o de
  // arbitraje (ej. Art. 353, procesos extranjeros) solo porque puntuaba alto
  // — el filtro de materia en la RPC lo excluye a nivel de base de datos,
  // no por heurística posterior.
  const materiaSemantica = materia ?? detectarMateriaDesdeTexto(consulta) ?? undefined;

  try {
    if (backend === 'python') {
      return await buscarEnPython(consulta, k, coleccion, materiaSemantica);
    }
    if (backend === 'supabase') {
      return await buscarEnSupabase(consulta, k, coleccion, materiaSemantica);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[RAG] Error backend ${backend}:`, msg);
    // Degradación elegante — continuar sin RAG
    return {
      fragmentos: [],
      articulos_encontrados: [],
      backend,
      error: msg,
    };
  }

  return { fragmentos: [], articulos_encontrados: [], backend: 'disabled' };
}

// ─────────────────────────────────────────────────────────────────────────────
// FUENTES DOCTRINALES / COMENTARIO — NUNCA DERECHO POSITIVO VINCULANTE
// ─────────────────────────────────────────────────────────────────────────────
// Blindaje explícito (auditoría CLO 2026-09-02): en producción, las filas de
// CPC_COMENTADO_ROMERO_2024 (doctrina/comentario, no norma) tienen
// es_norma_vigente=NULL y fuente_tipo=NULL. Cualquier filtro basado solo en
// esos campos es INCIDENTAL -- depende de que nadie los pueble mal en una
// ingesta futura. Esta lista hace la exclusión/etiquetado explícito e
// independiente de esos campos, en los dos puntos donde una fuente doctrinal
// podría presentarse como si fuera norma vigente:
//   1. construirCitas() (app/api/chat/route.ts) -- la excluye del array de
//      citas formales de la UI.
//   2. formatearContextoRAG() (abajo) -- la etiqueta inequívocamente dentro
//      del propio contexto inyectado al modelo, para que el LLM nunca la
//      trate como derecho positivo vinculante aunque siga usándola como
//      referencia doctrinal.
// Definida aquí (no en route.ts) para que ambos consumidores la importen de
// una única fuente de verdad sin crear un import circular entre los dos
// módulos. Añadir aquí cualquier otra fuente de doctrina/comentario/glosa
// que se ingiera en el futuro.
export const FUENTES_DOCTRINALES = new Set<string>(['CPC_COMENTADO_ROMERO_2024']);

// ─────────────────────────────────────────────────────────────────────────────
// FORMATEAR CONTEXTO PARA EL SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convierte los fragmentos RAG en un bloque de texto para inyectar
 * en el system prompt de Claude (después del MAYA PENAL system prompt base).
 */
export function formatearContextoRAG(resultado: ResultadoRAG): string {
  if (resultado.fragmentos.length === 0) {
    return '';
  }

  const lineas = [
    '── CONTEXTO RECUPERADO — BIBLIOTECA PENAL PINEL ──',
    `Fuente: ${resultado.backend === 'python' ? 'Índice local ChromaDB' : 'Supabase pgvector'}`,
    `Fragmentos: ${resultado.fragmentos.length} | Artículos: ${resultado.articulos_encontrados.join(', ') || 'N/A'}`,
    '',
  ];

  for (const [i, f] of resultado.fragmentos.entries()) {
    // Salvaguarda D6(a) (2026-08-27), corregida D6(a-bis) (2026-08-28): esta
    // etiqueta NUNCA debe quedar en null. Un artículo de código hondureño
    // confirmado NO vigente (derogado — dossier DEROGACION_ADOPCION_102-2018)
    // ahora recibe su propia etiqueta específica, distinta del fallback
    // genérico: "NO VIGENTE" es una afirmación conocida y verificada, no lo
    // mismo que "no sabemos qué es esto" (fuente sin clasificar). El fallback
    // genérico queda reservado solo para metadata realmente ausente/ambigua.
    // Nota: desde D6(b), esRegistroNoVigenteExcluido() ya excluye estos
    // fragmentos ANTES de llegar aquí en la vía de búsqueda semántica de
    // Supabase — esta etiqueta es la segunda capa de defensa, por si un
    // fragmento con este mismo patrón llega por otra vía (ej. backend
    // Python, o una recuperación exacta futura que no pase por ese filtro).
    // Chequeo de FUENTES_DOCTRINALES primero y por separado del resto de la
    // cadena: debe ganar incluso si es_norma_vigente llegara mal poblado
    // como true por error de ingesta futura (mismo principio que en
    // construirCitas() -- ver comentario junto a la constante).
    const etiqueta = FUENTES_DOCTRINALES.has(f.fuente)
      ? `FUENTE DOCTRINAL / COMENTARIO ACADÉMICO - NO VINCULANTE: ${f.fuente}`
      : f.es_norma_vigente === true
        ? 'NORMA VIGENTE HONDURAS'
        : f.jurisdiccion && f.jurisdiccion !== 'HN'
          ? `DOCTRINA/JURISPRUDENCIA COMPARADA — ${f.jurisdiccion}`
          : f.fuente_tipo === 'sentencia' || f.fuente_tipo === 'doctrina'
            ? 'DOCTRINA/JURISPRUDENCIA — NO ES NORMA VIGENTE'
            : esRegistroNoVigenteExcluido(f)
              ? 'NO VIGENTE — NO CITAR COMO NORMA'
              : 'FUENTE SIN CLASIFICAR — NO CITAR COMO NORMA VIGENTE';
    const art = f.num_articulo ? ` — Art. ${f.num_articulo}` : '';
    const tag = ` [${etiqueta}]`;
    lineas.push(`[FRAGMENTO ${i + 1}${art}${tag} | relevancia: ${(f.relevancia * 100).toFixed(0)}%]`);
    lineas.push(f.contenido.trim());
    lineas.push('');
  }

  lineas.push('── FIN DEL CONTEXTO RAG ──');
  lineas.push('INSTRUCCIÓN: Usar exclusivamente la información del contexto anterior para fundamentar el análisis. Solo cite número de artículo de fragmentos marcados [NORMA VIGENTE HONDURAS]. Fragmentos de doctrina o jurisprudencia comparada se usan únicamente como referencia, nunca como fundamento normativo directo. Si el artículo citado no aparece en el contexto, indicarlo explícitamente. La interfaz muestra por separado, de forma automática, la fuente y el hash de verificación de cada fragmento citado — no comentes sobre la presencia, ausencia o formato de esos datos, ni intentes reproducirlos: no forman parte de este contexto y no te corresponde informarlos.');

  return lineas.join('\n');
}
