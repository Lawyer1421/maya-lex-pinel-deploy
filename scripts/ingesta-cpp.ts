/**
 * scripts/ingesta-cpp.ts
 * Preparación LOCAL (staging, sin red) del cuerpo COMPLETO de artículos del
 * Código Procesal Penal de Honduras (Decreto 9-99-E), a partir de la
 * EDICIÓN CONSOLIDADA del Centro Electrónico de Documentación e Información
 * Judicial (CEDIJ, Poder Judicial de Honduras), para dictamen del CLO antes
 * de cualquier ingesta real, contemplando la sustitución in situ de la fila
 * manual `manual_curado:cpp_honduras:articulo_173`.
 *
 * Ejecutar: npx tsx scripts/ingesta-cpp.ts
 *
 * CERO ESCRITURAS EN PRODUCCIÓN: este script no importa ningún cliente de
 * Supabase, no abre conexión de red, y no tiene ninguna vía hacia
 * thgrhueckkjdutjvcufp. Lee un PDF local y escribe a stdout. El bloque SQL
 * que imprime al final es texto DECLARADO, no ejecutado.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * CAMBIO DE FUENTE (dictamen del CLO, 2026-09-02): la fuente anterior
 * (edición DECRETO 9-99-E de 1999 pura, sin reformas integradas) fue
 * reemplazada por la edición CONSOLIDADA moderna localizada localmente:
 *
 *   C:\Users\Fredy\OneDrive\Email attachments\Documentos\CODIGOS\
 *   Codigo Procesal Penal (2024).pdf
 *
 * Verificada por inspección directa (no es una suposición): es una
 * compilación oficial del CEDIJ/Poder Judicial con aparato de notas al pie
 * numeradas (78 notas), cada una citando el Decreto, fecha y Gaceta exactos
 * de cada reforma. Confirmado por lectura del propio documento que integra
 * TODAS las reformas exigidas por el CLO:
 *   - D.14-2006: Arts. 26-A, 219-A                          ✓ verificado
 *   - D.74-2013: Arts. 440-A al 440-O (Flagrancia)          ✓ verificado
 *   - D.22-2015: Arts. 237-A, 237-B                         ✓ verificado
 *   - D.70-2015: Arts. 402-A al 402-G                       ✓ verificado
 *   - D.195-2004: Arts. 414-417 (tenor reformado integrado  ✓ verificado
 *     directamente en la secuencia principal, sin el anexo separado que
 *     traía la edición 1999 -- por eso esta edición NO requiere excluir
 *     ningún "Decreto 195-2004" apéndice, a diferencia del script anterior)
 * Además halladas (no exigidas explícitamente por el CLO, pero presentes
 * en la fuente y por tanto incluidas para una ingesta fiel y completa):
 * Arts. 26-B, 127-A, 127-B, 173-A, 173-B, 224-A, 336-A.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * NOTAS AL PIE — hallazgo central de esta edición y por qué cambia el
 * diseño del pipeline por completo respecto de la edición 1999 pura:
 *
 * El aparato de notas está renderizado por pdftotext linealmente dentro
 * del propio cuerpo del texto (no hay separación de página/nota real en
 * texto plano). Cada nota aparece como un párrafo que empieza con su
 * número desnudo ("3 Artículo 26-A. Adicionado por Decreto 14-2006...");
 * el número de nota vuelve a aparecer, PEGADO sin espacio (o a veces con
 * un espacio simple antes de un salto de línea), justo después del texto
 * o encabezado al que anota (ej. "Artículo 26-A.3 Acción pública...",
 * "TÍTULO III62"). Sin depurar esto:
 *   (a) el marcador pegado ("26-A.3") contamina el INICIO del contenido
 *       del artículo siguiente;
 *   (b) el párrafo completo de la nota (con su cita "Reformado por
 *       Decreto...") queda dentro del contenido del artículo que anota,
 *       si no se recorta.
 *
 * Los números de nota son estrictamente CRECIENTES en todo el documento
 * (1, 2, 3, ..., 78) según el orden en que aparecen los artículos
 * reformados -- se aprovecha esa propiedad para detectarlas con precisión
 * (ver detectarNotasAlPie): una línea que empieza con un número desnudo
 * SOLO cuenta como inicio de nota si ese número es exactamente el
 * siguiente esperado en la secuencia. Esto evita falsos positivos de
 * líneas que, por el ajuste de columna de `pdftotext -layout`, empiezan
 * por casualidad con un número que en realidad es la continuación de una
 * oración (verificado: sin este control secuencial aparecían "notas"
 * fantasma hasta el número 436, todas espurias).
 *
 * ═══════════════════════════════════════════════════════════════════════
 * REFERENCIAS CRUZADAS A MITAD DE LÍNEA -- en esta edición, a diferencia
 * del Decreto 102-2018 (donde los encabezados reales siempre traían ".-"
 * y las referencias cruzadas nunca), TANTO un encabezado real
 * ("Artículo 303. Remisión de actuaciones...") COMO una referencia
 * cruzada que cae al inicio de línea por ajuste de columna
 * ("...a que se refiere el\nArtículo 303. El Órgano...") usan EXACTAMENTE
 * el mismo formato tipográfico. Se distinguen por el CONTEXTO, no por la
 * forma del propio encabezado -- ver esLimiteReal(): un límite real
 * siempre viene precedido de (a) una línea en blanco, o (b) puntuación de
 * cierre de oración, o (c) un encabezado estructural en mayúsculas, o
 * (d) la palabra "Derogado" (excepción verificada para Arts. 223/373-380,
 * que en esta edición no cierran con punto); una referencia cruzada a
 * mitad de oración no cumple ninguna de las cuatro.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * ARTS. 373-380 -- ya NO hay bloque duplicado en esta edición (a
 * diferencia de la edición 1999 pura, que traía el bloque "Derogado" MÁS
 * un bloque histórico completo bajo los mismos números). Aquí cada uno
 * aparece UNA sola vez, como "Artículo N. Derogado", con una nota al pie
 * consolidada (nota 62) citando la derogatoria por la Ley sobre Justicia
 * Constitucional (Decreto 244-2003). Este script generaliza el criterio:
 * CUALQUIER artículo cuyo contenido (tras su encabezado) sea exactamente
 * "Derogado" o "Derogado." se marca es_norma_vigente=false, con la cita
 * de derogatoria extraída de su propia nota al pie -- lo que también
 * resuelve, sin caso especial, los Arts. 223 (D.243-2011) y 418/419
 * (D.195-2004), hallados en esta pasada y no exigidos explícitamente por
 * el CLO pero presentes en la fuente.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sha256 } from '../lib/ingesta-oficial/hash';
import { normalizarTexto } from '../lib/ingesta-oficial/extraccion';
import { validarSinDatosPrivados } from '../lib/ingesta-oficial/validaciones';
import type { ArticuloExtraido } from '../lib/ingesta-oficial/types';

export const PDF_FUENTE =
  'C:/Users/Fredy/OneDrive/Email attachments/Documentos/CODIGOS/Codigo Procesal Penal (2024).pdf';

export const FUENTE_CANONICA = 'Código Procesal Penal de Honduras (Decreto 9-99-E)';
export const MATERIA = '01_PENAL';
export const DECRETO = '9-99-E';
export const NORM_ID = 'HN_CODIGO_PROCESAL_PENAL';
export const EDICION_FUENTE =
  'Compilación consolidada del Centro Electrónico de Documentación e Información Judicial (CEDIJ), Poder Judicial de Honduras -- edición con reformas integradas de los Decretos 14-2006 (Arts. 26-A, 219-A), 22-2015 (Arts. 237-A, 237-B), 70-2015 (Arts. 402-A al 402-G), 74-2013 (Arts. 440-A al 440-O, Flagrancia) y 195-2004 (Arts. 414-417)';

// Fila manual a reconciliar in situ (ver DECISION_LOG.md).
export const ID_STUB_MANUAL_ART173 = 'manual_curado:cpp_honduras:articulo_173';

// Arts. bis exigidos explícitamente por el dictamen del CLO -- fail-hard si
// falta alguno. No es una lista cerrada: pueden existir MÁS artículos bis
// en la fuente (y de hecho los hay -- ver cabecera del archivo) sin que eso
// sea un error; esta lista es un PISO mínimo verificable, no un techo.
export const LITERALES_REFORMADOS_REQUERIDOS = [
  '26-A', '219-A', // D.14-2006
  '237-A', '237-B', // D.22-2015
  '402-A', '402-B', '402-C', '402-D', '402-E', '402-F', '402-G', // D.70-2015
  '440-A', '440-B', '440-C', '440-D', '440-E', '440-F', '440-G', '440-H',
  '440-I', '440-J', '440-K', '440-L', '440-M', '440-N', '440-O', // D.74-2013
];
// Arts. base exigidos con tenor reformado integrado (D.195-2004) -- deben
// existir como artículos BASE normales (sin sufijo), ya que en esta
// edición vienen reformados in situ, no como anexo aparte.
export const BASE_REFORMADOS_REQUERIDOS = ['414', '415', '416', '417'];

export function fallarDuro(motivo: string): never {
  console.error(`\n🛑 FAIL-HARD: ${motivo}\n`);
  process.exit(1);
}

// ── 1. Extracción real del PDF ──────────────────────────────────────────
export function extraerTextoPDF(rutaPdf: string): string {
  try {
    return execFileSync('pdftotext', ['-layout', '-enc', 'UTF-8', rutaPdf, '-'], {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch (err) {
    fallarDuro(`no se pudo extraer texto de ${rutaPdf}: ${(err as Error).message}`);
  }
}

// ── 2. Acotar al cuerpo dispositivo real del Decreto 9-99-E ────────────
// Esta edición consolidada NO trae anexado el Decreto 195-2004 (sus
// reformas ya están integradas in situ en Arts. 414-417) -- verificado:
// el documento termina justo después de la fórmula de cierre y las firmas
// del propio Decreto 9-99-E, sin texto adicional. Se acota igual por
// robustez (si una futura edición SÍ trajera un anexo, esto lo excluiría).
export function acotarCuerpoDispositivo(textoCrudo: string): string {
  const marcaInicio = 'El siguiente:';
  const inicioIdx = textoCrudo.indexOf(marcaInicio);
  if (inicioIdx === -1) {
    fallarDuro('no se encontró la marca de inicio "El siguiente:" — el documento fuente pudo haber cambiado de formato');
  }
  const tramoDesdeInicio = textoCrudo.slice(inicioIdx + marcaInicio.length);
  const finRelativo = tramoDesdeInicio.search(/Dado en la Ciudad de Tegucigalpa/i);
  if (finRelativo === -1) {
    fallarDuro('no se encontró el bloque de firmas ("Dado en la Ciudad de Tegucigalpa...") — el documento fuente pudo haber cambiado de formato');
  }
  return tramoDesdeInicio.slice(0, finRelativo);
}

// ── 3. Detección y eliminación de notas al pie ──────────────────────────
export interface NotaAlPie {
  num: number;
  texto: string; // texto completo de la nota, espacios colapsados
}

// Detección secuencial estricta (1, 2, 3, ..., N): una línea que empieza
// con un número desnudo solo cuenta como inicio de nota si ese número es
// EXACTAMENTE el siguiente esperado -- ver justificación en la cabecera.
export function detectarNotasAlPie(cuerpo: string): { notas: NotaAlPie[]; spans: Array<{ desde: number; hasta: number }> } {
  const lineas = cuerpo.split('\n');
  const offsets: number[] = [];
  { let acc = 0; for (const l of lineas) { offsets.push(acc); acc += l.length + 1; } }

  let siguienteEsperado = 1;
  const inicios: number[] = []; // indices de linea
  for (let i = 0; i < lineas.length; i++) {
    const m = lineas[i].match(/^(\d{1,3})\s+\S/);
    if (m && Number(m[1]) === siguienteEsperado) { inicios.push(i); siguienteEsperado++; }
  }
  if (inicios.length === 0) {
    fallarDuro('no se detectó ninguna nota al pie con la detección secuencial estricta — el documento fuente pudo haber cambiado de formato');
  }

  // Span de cada nota: desde su línea de inicio hasta la primera línea en
  // blanco (o hasta el inicio de la siguiente nota, lo que ocurra primero).
  const notas: NotaAlPie[] = [];
  const spans: Array<{ desde: number; hasta: number }> = [];
  for (let k = 0; k < inicios.length; k++) {
    const li = inicios[k];
    let lf = li;
    const limite = k + 1 < inicios.length ? inicios[k + 1] : lineas.length;
    while (lf < limite && lineas[lf].trim() !== '') lf++;
    const desde = offsets[li];
    const hasta = offsets[lf] ?? cuerpo.length;
    spans.push({ desde, hasta });
    notas.push({ num: k + 1, texto: cuerpo.slice(desde, hasta).replace(/\s+/g, ' ').trim() });
  }
  return { notas, spans };
}

export function eliminarSpans(cuerpo: string, spans: Array<{ desde: number; hasta: number }>): string {
  let out = cuerpo;
  for (let i = spans.length - 1; i >= 0; i--) {
    out = out.slice(0, spans[i].desde) + out.slice(spans[i].hasta);
  }
  return out;
}

// ── 4. Limpieza: marcadores de nota inline + ruido de paginación ───────
// Elimina los marcadores de nota PEGADOS al texto que anotan (glued, sin
// espacio) y los que quedan con UN espacio antes de un salto de línea
// (variante de renderizado de pdftotext para notas al final de párrafo) --
// en ambos casos SOLO si el número coincide con una nota realmente
// detectada (numerosValidos), para no arriesgar borrar un número legítimo
// del texto (ver comentario extenso en el cuerpo de este archivo/PR).
export function limpiarMarcadoresInline(texto: string, numerosValidos: Set<number>): string {
  function combinacionValida(grupo: string): boolean {
    return grupo.split(',').every((n) => numerosValidos.has(Number(n)));
  }
  let out = texto.replace(/(?<=[\p{L}.)])(\d{1,3}(?:,\d{1,3})*)(?=[\s])/gu, (m, g) =>
    combinacionValida(g) ? '' : m,
  );
  out = out.replace(/(?<=\.) (\d{1,3}(?:,\d{1,3})*)(?=[ \t]*\n)/g, (m, g) =>
    combinacionValida(g) ? '' : m,
  );
  return out;
}

export function limpiarRuidoPaginacion(texto: string): string {
  return texto
    .replace(/\f/g, '\n')
    .replace(/^\s*CENTRO ELECTRÓNICO DE DOCUMENTACIÓN E INFORMACIÓN JUDICIAL\s*$/gim, '')
    .replace(/^[ \t]*\d{1,4}[ \t]*$/gm, '')
    .replace(/(\p{L})-\n\s*\n?\s*(\p{Ll})/gu, '$1$2')
    // Corte de palabra CON guion pero SIN salto de línea real -- artefacto
    // propio de esta extracción (verificado: 6 casos, ej. "Re- pública",
    // "Pro- curaduría", "jue- ces", todos en la misma línea impresa, no en
    // un borde de columna). Distinto del caso anterior (que sí cruza un
    // salto de línea); ambos son la misma clase de defecto de extracción,
    // no un guion compuesto real (los compuestos reales de esta fuente no
    // llevan espacio tras el guion, ej. "político-administrativo").
    .replace(/(\p{L})- (\p{Ll})/gu, '$1$2')
    .replace(/[ \t]+(?=\n)/g, '')
    .replace(/\n{3,}/g, '\n\n');
}

// ── 5. Segmentación ──────────────────────────────────────────────────────
// Patrón combinado: "Artículo N[-Letra]." en sus TRES variantes
// tipográficas verificadas contra esta fuente ("26-A." con guion antes del
// punto, "219.-A." con guion después del punto, "373." sin sufijo -- y
// "146." sin espacio entre "Artículo" y el número, verificado como
// artefacto puntual de extracción), o encabezado estructural
// Libro/Título/Capítulo/Sección -- el numeral que sigue puede ser romano
// ("CAPÍTULO IV"), "ÚNICO/ÚNICA", o un ordinal en palabra ("SECCIÓN
// SEGUNDA", verificado como variante real de esta fuente -- el Art. 54
// termina con ese encabezado intercalado antes del Art. 55).
const NUMERAL_ESTRUCTURAL =
  '(?:[IVXLCDM]+\\b|[UÚ]NIC[OA]\\b|PRIMER[OA]\\b|SEGUND[OA]\\b|TERCER[OA]\\b|CUART[OA]\\b|QUINT[OA]\\b|SEXT[OA]\\b|S[ÉE]PTIM[OA]\\b|OCTAV[OA]\\b|NOVEN[OA]\\b|D[ÉE]CIM[OA]\\b)';
// "DISPOSICIONES" (GENERALES/COMUNES/TRANSITORIAS Y FINALES/FINALES) es un
// encabezado de sección propio de este documento que NO lleva prefijo
// Libro/Título/Capítulo/Sección -- verificado: 12 apariciones, todas
// genuinos títulos de apartado (nunca a mitad de oración). Sin
// reconocerlo, el Art. 440-O (última reforma de Flagrancia) arrastraba
// "DISPOSICIONES TRANSITORIAS Y FINALES" como si fuera parte de su propio
// contenido.
// SIN el flag 'i': los encabezados estructurales reales de esta fuente
// SIEMPRE están en mayúsculas (verificado: 0 ocurrencias en minúscula de
// "Artículo" fuera de encabezado; en cambio "libro"/"título"/"capítulo"/
// "sección" en minúscula SÍ aparecen dentro de prosa normal -- 1, 1, 4 y 2
// veces respectivamente -- y con el flag 'i' cualquiera de ellas que
// cayera al inicio de línea por el ajuste de columna se habría
// confundido con un encabezado real). El único elemento que SÍ tolera
// mayús/minúscula es la letra de sufijo bis ([A-Za-z]), que es un
// carácter suelto, no una palabra clave estructural.
const PATRON_LIMITE_SEGMENTACION = new RegExp(
  `^[ \\t]*(?:Art[ií]culos?\\s*(\\d+)(?:(?:[-\\s]([A-Za-z])\\.|\\.-([A-Za-z])\\.|\\.))|(?:LIBRO|T[IÍ]TULO|CAP[IÍ]TULO|SECCI[OÓ]N)\\s+${NUMERAL_ESTRUCTURAL}|DISPOSICIONES\\s+\\S+)`,
  'gm',
);

interface CoincidenciaBruta {
  num: string | undefined; // ej. "26A", "373", undefined si es estructural
  inicio: number;
}

function recolectarCoincidencias(texto: string): CoincidenciaBruta[] {
  const coincidencias = [...texto.matchAll(PATRON_LIMITE_SEGMENTACION)];
  return coincidencias.map((c) => {
    const numero = c[1];
    const letra = (c[2] ?? c[3] ?? '').toUpperCase();
    return { num: numero !== undefined ? `${numero}${letra}` : undefined, inicio: c.index ?? 0 };
  });
}

// Determina si una coincidencia de "Artículo N" es un límite de artículo
// REAL, o una referencia cruzada que cae al inicio de línea por ajuste de
// columna -- ver justificación extensa en la cabecera del archivo. Un
// límite real cumple AL MENOS UNA de: (a) inicio del texto, (b) línea en
// blanco justo antes, (c) puntuación de cierre de oración justo antes,
// (d) línea previa en MAYÚSCULAS (encabezado estructural), (e) la palabra
// exacta "Derogado" justo antes (excepción verificada para esta fuente).
export function esLimiteReal(texto: string, idx: number): boolean {
  if (idx === 0) return true;

  let k = idx;
  while (k > 0 && (texto[k - 1] === ' ' || texto[k - 1] === '\t')) k--;
  if (texto.slice(Math.max(0, k - 2), k) === '\n\n') return true;

  let j = idx;
  while (j > 0 && /\s/.test(texto[j - 1])) j--;
  if (j === 0) return true;
  const ultimoChar = texto[j - 1];
  if ('.;:)"”\''.includes(ultimoChar)) return true;

  let lineStart = j - 1;
  while (lineStart > 0 && texto[lineStart - 1] !== '\n') lineStart--;
  const linea = texto.slice(lineStart, j);
  const soloLetras = linea.replace(/[^\p{L}]/gu, '');
  if (soloLetras.length > 0 && soloLetras === soloLetras.toUpperCase() && soloLetras !== soloLetras.toLowerCase()) {
    return true;
  }

  const mPalabra = texto.slice(Math.max(0, j - 20), j).match(/(\p{L}+)$/u);
  if (mPalabra && mPalabra[1] === 'Derogado') return true;

  return false;
}

export function segmentarArticulos(textoLimpio: string): ArticuloExtraido[] {
  const crudas = recolectarCoincidencias(textoLimpio);
  // esLimiteReal se aplica a TODAS las coincidencias, no solo a las de
  // artículo -- un encabezado estructural (Libro/Título/Capítulo/Sección)
  // también puede caer a mitad de oración como referencia cruzada por el
  // ajuste de columna de `pdftotext -layout` (ej. "...las normas
  // contenidas en el\nTítulo IV del..."), y de no filtrarse cortaría en
  // seco el contenido del artículo en curso, PERDIENDO el resto de su
  // texto real (detectado: el Art. 362 quedaba truncado a mitad de
  // oración exactamente en un "Título IV" de este tipo).
  const filtradas = crudas.filter((c) => esLimiteReal(textoLimpio, c.inicio));
  const articulos: ArticuloExtraido[] = [];
  for (let i = 0; i < filtradas.length; i++) {
    if (filtradas[i].num === undefined) continue; // límite estructural -- se descarta
    const fin = filtradas[i + 1]?.inicio ?? textoLimpio.length;
    articulos.push({ numArticulo: filtradas[i].num!, contenido: textoLimpio.slice(filtradas[i].inicio, fin).trim() });
  }
  return articulos;
}

// ── 6. Validación de integridad (adaptada: no exige secuencia 1..N pura) ─
// Los artículos BASE (sin sufijo de letra) deben cubrir 1..447 sin huecos
// ni duplicados. Los artículos con sufijo de letra NO forman una secuencia
// continua por naturaleza (son adiciones dispersas) -- se valida en su
// lugar que exista cada literal reformado EXIGIDO por el dictamen del CLO
// (lista mínima verificable, no cierre exhaustivo).
export function validarIntegridad(articulos: ArticuloExtraido[]): void {
  const base = articulos.filter((a) => /^\d+$/.test(a.numArticulo)).map((a) => Number(a.numArticulo));
  const bis = articulos.filter((a) => !/^\d+$/.test(a.numArticulo)).map((a) => a.numArticulo);

  const baseSet = new Set(base);
  const faltantes: number[] = [];
  for (let i = 1; i <= 447; i++) if (!baseSet.has(i)) faltantes.push(i);
  if (faltantes.length > 0) {
    fallarDuro(`faltan artículos base en la secuencia 1..447: ${faltantes.join(', ')}`);
  }
  const maxBase = Math.max(...base);
  if (maxBase !== 447 || base.length !== 447) {
    fallarDuro(`secuencia base inconsistente: ${base.length} artículos base, máximo ${maxBase} (se esperaba exactamente 447)`);
  }

  const bisDisplaySet = new Set(bis.map((n) => formatearNumArticuloDisplay(n)));
  const faltantesBis = LITERALES_REFORMADOS_REQUERIDOS.filter((r) => !bisDisplaySet.has(r));
  if (faltantesBis.length > 0) {
    fallarDuro(`faltan literales reformados exigidos por el dictamen del CLO: ${faltantesBis.join(', ')}`);
  }

  const faltantesReformadosBase = BASE_REFORMADOS_REQUERIDOS.filter((r) => !baseSet.has(Number(r)));
  if (faltantesReformadosBase.length > 0) {
    fallarDuro(`faltan artículos base con reforma integrada exigidos por el dictamen del CLO: ${faltantesReformadosBase.join(', ')}`);
  }

  // Cero IDs duplicados (base + bis combinados).
  const idsVistos = new Set<string>();
  for (const a of articulos) {
    if (idsVistos.has(a.numArticulo)) fallarDuro(`ID de artículo duplicado tras la segmentación: ${a.numArticulo}`);
    idsVistos.add(a.numArticulo);
  }
}

// "26A" -> "26-A" (formato de num_articulo exigido por el dictamen del CLO)
export function formatearNumArticuloDisplay(numInterno: string): string {
  const m = numInterno.match(/^(\d+)([A-Za-z])$/);
  if (!m) return numInterno;
  return `${m[1]}-${m[2].toUpperCase()}`;
}

// "26A" -> "26_a" (formato del ID canónico exigido: mayalex_normativos:cpp_1999_a26_a)
export function formatearNumArticuloId(numInterno: string): string {
  const m = numInterno.match(/^(\d+)([A-Za-z])$/);
  if (!m) return numInterno;
  return `${m[1]}_${m[2].toLowerCase()}`;
}

// Excepciones al cierre de puntuación, verificadas MANUALMENTE contra el
// texto crudo de pdftotext (antes de cualquier limpieza de este script)
// antes de añadirse aquí -- nunca una relajación general de la regla.
const EXCEPCIONES_CIERRE_VERIFICADAS: Record<string, string> = {
  '348': 'La edición consolidada CEDIJ termina esta oración sin punto final ("...ante el respectivo órgano jurisdiccional") -- verificado contra la salida cruda de `pdftotext -layout -enc UTF-8` ANTES de aplicar ninguna limpieza de este script (no es un artefacto introducido por la extracción/limpieza propia). Se preserva el texto tal cual el original, sin corregir la omisión editorial.',
};

// ── 7. Control de calidad fail-hard sobre cada fragmento ────────────────
export function validarFragmentoFailHard(numArticulo: string, contenido: string): void {
  const esDerogado = /^Derogado\.?$/.test(contenido.replace(/^Art[ií]culos?\s*\d+(?:[-\s]?[A-Za-z]\.|\.-[A-Za-z]\.|\.)\s*/, '').trim());

  if (contenido.length < 15) {
    fallarDuro(`Art. ${numArticulo}: contenido sospechosamente corto (${contenido.length} caracteres) — posible segmentación fallida`);
  }
  if (contenido.length > 20000) {
    fallarDuro(`Art. ${numArticulo}: contenido sospechosamente largo (${contenido.length} caracteres) — posible fallo de segmentación (¿se arrastró el artículo siguiente?)`);
  }
  // Un encabezado estructural (Libro/Título/Capítulo/Sección) SOLO cuenta
  // como contaminación si además pasa esLimiteReal (es decir, si de verdad
  // se comporta como un límite real, no como una mención de paso dentro de
  // la propia prosa -- ej. "...las normas contenidas en el Título IV del
  // Libro..." es una referencia legítima, NO un encabezado suelto; el Art.
  // 362 de esta fuente contiene exactamente ese caso).
  // Se escanea el CONTENIDO COMPLETO (no un substring) para que
  // esLimiteReal evalúe posiciones reales -- su caso especial "idx===0 =>
  // inicio de documento" solo es válido si idx=0 corresponde de verdad al
  // inicio de TODO el texto, no al inicio de un substring recortado (bug
  // real detectado: al pasar solo el resto tras la primera línea, un
  // "disposiciones relativas..." de prosa normal en la segunda línea del
  // Art. 441 quedaba en idx=0 del substring y se aceptaba siempre como
  // límite válido). El propio encabezado del artículo (primera línea)
  // siempre matchea como tipo "Artículo N" (m[1] definido) y se descarta
  // aquí sin necesitar recortar nada.
  for (const m of contenido.matchAll(PATRON_LIMITE_SEGMENTACION)) {
    if (m[1] !== undefined) continue; // es un "Artículo N", no un encabezado estructural
    if ((m.index ?? 0) === 0) continue; // es el propio encabezado del artículo (caso límite improbable)
    if (esLimiteReal(contenido, m.index ?? 0)) {
      fallarDuro(`Art. ${numArticulo}: quedó un encabezado estructural (Libro/Título/Capítulo/Sección) sin depurar dentro del contenido`);
    }
  }
  if (/\p{L}-\n\s*\p{Ll}/u.test(contenido) || /\p{L}- \p{Ll}/u.test(contenido)) {
    fallarDuro(`Art. ${numArticulo}: quedó un corte de palabra con guion sin reparar (texto cortado) dentro del contenido`);
  }
  // eslint-disable-next-line no-control-regex -- detección deliberada de
  // caracteres de control residuales (form feed, etc.) de la extracción PDF.
  const controlMatch = contenido.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/);
  if (controlMatch) {
    fallarDuro(
      `Art. ${numArticulo}: quedó un carácter de control sin limpiar (0x${controlMatch[0].charCodeAt(0).toString(16).padStart(2, '0')}) dentro del contenido — suciedad de extracción PDF`,
    );
  }
  if (/^[ \t]*\d{1,4}[ \t]*$/m.test(contenido)) {
    fallarDuro(`Art. ${numArticulo}: quedó una línea de número de página suelta sin depurar dentro del contenido`);
  }
  if (/Reformado por Decreto|Adicionado por Decreto|Derogado por Decreto|CENTRO ELECTRÓNICO/i.test(contenido)) {
    fallarDuro(`Art. ${numArticulo}: quedó texto de una nota al pie sin depurar dentro del contenido`);
  }
  if (!new RegExp(`^Art[ií]culos?\\s*${numArticulo.replace(/[A-Za-z]$/, '')}\\b`, 'i').test(contenido)) {
    fallarDuro(`Art. ${numArticulo}: el contenido no comienza con su propio encabezado "Artículo ${numArticulo}"`);
  }
  if (!esDerogado) {
    const ultimoCaracter = contenido.trim().slice(-1);
    if (!'.;:)'.includes(ultimoCaracter)) {
      const excepcion = EXCEPCIONES_CIERRE_VERIFICADAS[numArticulo];
      if (!excepcion) {
        fallarDuro(`Art. ${numArticulo}: el contenido no termina en puntuación de cierre válida ('${ultimoCaracter}') — posible texto cortado`);
      }
      console.warn(`⚠️  Art. ${numArticulo}: cierre sin puntuación aceptado como excepción verificada manualmente — ${excepcion}`);
    }
  }
}

// ── 8. Contrato de columnas biblioteca_vectores ─────────────────────────
export interface RegistroCanonicoCPP {
  id: string;
  fuente: string;
  materia: string;
  num_articulo: string;
  es_norma_vigente: boolean;
  jurisdiccion: 'HN';
  fuente_tipo: string;
  coleccion: string;
  metadata: Record<string, unknown>;
  contenido: string;
}

const METODO_EXTRACCION =
  'pdftotext -layout -enc UTF-8 (edición consolidada CEDIJ) + eliminación de notas al pie y limpieza de ruido de paginación + validación fail-hard automatizada (scripts/ingesta-cpp.ts) — PENDIENTE de verificación manual humana artículo por artículo antes de ingesta real';

// Busca, entre las notas al pie, aquella(s) que mencionan explícitamente
// este número de artículo junto con "Derogad", para citar la derogatoria
// con la fuente exacta (Decreto/fecha/Gaceta) tal como consta en el propio
// documento -- soporta el formato de rango "N al M" (ej. nota 62: "373 al
// 380") ademas de menciones directas de un solo número.
export function buscarCitaDerogatoria(numeroBase: number, notas: NotaAlPie[]): string | null {
  for (const nota of notas) {
    if (!/Derogad/i.test(nota.texto)) continue;
    // NO anclado al inicio de la nota: algunas (ej. nota 62) empiezan con
    // el título de la sección derogada ("Título III. De la Revisión,
    // Capítulo Único...") ANTES de la mención "Artículos 373 al 380
    // Derogados..." -- se busca la frase en cualquier posición del texto.
    const mCabecera = nota.texto.match(/Art[ií]culos?\s+(.+?)\s+[Dd]erogad/);
    if (!mCabecera) continue;
    const listado = mCabecera[1];
    const mRango = listado.match(/^(\d+)\s+al\s+(\d+)$/i);
    if (mRango) {
      const desde = Number(mRango[1]);
      const hasta = Number(mRango[2]);
      if (numeroBase >= desde && numeroBase <= hasta) return nota.texto.replace(/^\d+\s+/, '');
      continue;
    }
    const numeros = listado.match(/\d+/g)?.map(Number) ?? [];
    if (numeros.includes(numeroBase)) return nota.texto.replace(/^\d+\s+/, '');
  }
  return null;
}

export function construirRegistro(a: ArticuloExtraido, notas: NotaAlPie[]): RegistroCanonicoCPP {
  const esBis = !/^\d+$/.test(a.numArticulo);
  const numDisplay = esBis ? formatearNumArticuloDisplay(a.numArticulo) : a.numArticulo;
  const idSufijo = esBis ? formatearNumArticuloId(a.numArticulo) : a.numArticulo;
  const numeroBaseParaCita = Number(a.numArticulo.match(/^\d+/)![0]);

  const contenidoSinEncabezado = a.contenido.replace(/^Art[ií]culos?\s*\d+(?:[-\s]?[A-Za-z]\.|\.-[A-Za-z]\.|\.)\s*/, '').trim();
  const esDerogado = /^Derogado\.?$/.test(contenidoSinEncabezado);

  const metadata: Record<string, unknown> = {
    decreto: DECRETO,
    norm_id: NORM_ID,
    tipo_instrumento: 'codigo',
    edicion_fuente: EDICION_FUENTE,
    metodo_extraccion: METODO_EXTRACCION,
    hash_texto_sha256: sha256(a.contenido),
    verificado: false,
    fecha_verificacion: null,
  };

  if (esDerogado) {
    const cita = buscarCitaDerogatoria(numeroBaseParaCita, notas);
    if (!cita) fallarDuro(`Art. ${a.numArticulo}: contenido es "Derogado" pero no se encontró su nota de derogatoria correspondiente entre las ${notas.length} notas al pie detectadas`);
    metadata.estado_articulo = 'DEROGADO';
    metadata.derogado_por = cita;
  }

  return {
    id: `mayalex_normativos:cpp_1999_a${idSufijo}`,
    fuente: FUENTE_CANONICA,
    materia: MATERIA,
    num_articulo: numDisplay,
    es_norma_vigente: !esDerogado,
    jurisdiccion: 'HN',
    fuente_tipo: 'codigo',
    coleccion: 'mayalex_normativos',
    metadata,
    contenido: a.contenido,
  };
}

function porNumero(articulos: ArticuloExtraido[], n: string): ArticuloExtraido {
  const a = articulos.find((x) => x.numArticulo === n);
  if (!a) fallarDuro(`no se encontró el Art. ${n} entre los segmentados`);
  return a!;
}

// ── 9. Ensamble del pipeline completo (reutilizable por insertar-cpp.ts) ─
export interface ResultadoPipelineCPP {
  articulos: ArticuloExtraido[]; // TODOS -- base + bis, incluidos los derogados
  registros: RegistroCanonicoCPP[];
  notas: NotaAlPie[];
}

export function ejecutarPipelineCompleto(): ResultadoPipelineCPP {
  const textoCrudo = extraerTextoPDF(PDF_FUENTE);
  const cuerpoAcotado = acotarCuerpoDispositivo(textoCrudo);
  const cuerpoNormalizado = normalizarTexto(cuerpoAcotado);

  const { notas, spans } = detectarNotasAlPie(cuerpoNormalizado);
  const numerosValidos = new Set(notas.map((n) => n.num));
  const sinNotas = eliminarSpans(cuerpoNormalizado, spans);
  const sinMarcadores = limpiarMarcadoresInline(sinNotas, numerosValidos);
  const textoLimpio = limpiarRuidoPaginacion(sinMarcadores);

  const articulos = segmentarArticulos(textoLimpio);
  validarIntegridad(articulos);
  for (const a of articulos) validarFragmentoFailHard(a.numArticulo, a.contenido);

  const registros = articulos.map((a) => construirRegistro(a, notas));

  return { articulos, registros, notas };
}

// ── 10. Declaración (NO ejecución) del SQL de reemplazo atómico Art.173 ─
export function declararSQLReemplazoAtomico(totalFilas: number): string {
  return `-- ESTRATEGIA DECLARADA -- NO EJECUTADA EN ESTE TURNO --
-- Reemplazo atómico del stub manual del Art. 173 del CPP + ingesta de
-- las ${totalFilas} filas canónicas del Decreto 9-99-E (edición consolidada CEDIJ).
-- Fase posterior (no este turno): scripts/insertar-cpp.ts genera los
-- embeddings reales (intfloat/multilingual-e5-small, 384 dims) y produce
-- el archivo .sql definitivo -- este bloque es solo la forma de la
-- transacción, para dictamen del CLO.

DROP TABLE IF EXISTS stg_cpp_1999_ingesta;
CREATE TABLE stg_cpp_1999_ingesta (
  id text PRIMARY KEY,
  coleccion text,
  materia text,
  contenido text,
  num_articulo text,
  fuente text,
  metadata jsonb,
  embedding vector(384),
  jurisdiccion text,
  fuente_tipo text,
  es_norma_vigente boolean
);

-- (aquí van los INSERT en lotes hacia stg_cpp_1999_ingesta, generados por
--  scripts/insertar-cpp.ts en la fase posterior -- omitidos en esta
--  declaración porque este turno no genera embeddings reales)

DO $$
DECLARE rc integer;
BEGIN
  -- 1) Elimina el stub manual previo del Art. 173
  --    (metadata.embedding_pendiente_regeneracion=true) -- se hace DENTRO
  --    del mismo bloque atómico que el INSERT, así que si el INSERT
  --    fallara, el DELETE también se revierte (no queda el Art.173 sin
  --    ninguna fila).
  DELETE FROM biblioteca_vectores WHERE id = '${ID_STUB_MANUAL_ART173}';

  -- 2) Mueve las ${totalFilas} filas canónicas desde staging -- incluye
  --    el nuevo 'mayalex_normativos:cpp_1999_a173' con embedding real,
  --    reemplazando al stub eliminado en el paso 1.
  INSERT INTO biblioteca_vectores (id, coleccion, materia, contenido, num_articulo, fuente, metadata, embedding, jurisdiccion, fuente_tipo, es_norma_vigente)
  SELECT id, coleccion, materia, contenido, num_articulo, fuente, metadata, embedding, jurisdiccion, fuente_tipo, es_norma_vigente
  FROM stg_cpp_1999_ingesta;

  GET DIAGNOSTICS rc = ROW_COUNT;
  IF rc != ${totalFilas} THEN
    RAISE EXCEPTION 'ABORT: expected ${totalFilas} rows moved, got %', rc;
  END IF;
END $$;

DROP TABLE stg_cpp_1999_ingesta;
`;
}

function main() {
  console.log('=== Preparación de ingesta canónica — Código Procesal Penal (Decreto 9-99-E), edición consolidada CEDIJ ===');
  console.log(`Fuente PDF: ${PDF_FUENTE}\n`);

  const resultado = ejecutarPipelineCompleto();
  const errPII = validarSinDatosPrivados(resultado.articulos);
  if (errPII) fallarDuro(errPII);

  const vigentes = resultado.registros.filter((r) => r.es_norma_vigente);
  const derogados = resultado.registros.filter((r) => !r.es_norma_vigente);
  const base = resultado.articulos.filter((a) => /^\d+$/.test(a.numArticulo));
  const bis = resultado.articulos.filter((a) => !/^\d+$/.test(a.numArticulo));

  console.log(`✅ Fail-hard QC superado — ${resultado.registros.length}/${resultado.registros.length} (100%) fragmentos.`);
  console.log(`   Artículos base (1..447, sin huecos):     ${base.length}`);
  console.log(`   Artículos con sufijo de letra (reformas): ${bis.length}`);
  console.log(`   TOTAL:                                    ${resultado.registros.length}`);
  console.log(`   Vigentes (es_norma_vigente=true):         ${vigentes.length}`);
  console.log(`   Derogados (es_norma_vigente=false):       ${derogados.length}  (${derogados.map((d) => d.num_articulo).join(', ')})\n`);

  console.log('=== Grid de muestra para dictamen ===\n');
  const muestras = ['1', '26A', '173', '219A', '373', '402A', '440A', '447'];
  console.log('| num_articulo | id | es_norma_vigente | sha256 (12) |');
  console.log('|---|---|---|---|');
  for (const m of muestras) {
    const a = porNumero(resultado.articulos, m);
    const r = resultado.registros.find((x) => x.metadata.hash_texto_sha256 === sha256(a.contenido))!;
    console.log(`| ${r.num_articulo} | \`${r.id}\` | ${r.es_norma_vigente} | \`${(r.metadata.hash_texto_sha256 as string).slice(0, 12)}\` |`);
  }

  console.log('\n=== ⚖ EVIDENCIA TEXTUAL — Art. 1 (texto completo) ===\n');
  console.log(porNumero(resultado.articulos, '1').contenido);

  console.log('\n=== ⚖ EVIDENCIA TEXTUAL — Art. 173 (texto completo) ===\n');
  console.log(porNumero(resultado.articulos, '173').contenido);

  console.log('\n=== ⚖ DETALLE DE FILA GENERADA — Art. 373 (demuestra es_norma_vigente=false) ===\n');
  const registro373 = resultado.registros.find((r) => r.num_articulo === '373')!;
  console.log(JSON.stringify(registro373, null, 2));

  console.log('\n=== 🔧 BLOQUE SQL DECLARADO (NO EJECUTADO) — reemplazo atómico Art. 173 ===\n');
  console.log(declararSQLReemplazoAtomico(resultado.registros.length));

  console.log(
    '\n🔒 CERO escrituras SQL ejecutadas — este script no importa ningún cliente de Supabase, no abre conexión de red, y termina aquí. Pendiente de dictamen y aprobación formal del CLO antes de cualquier INSERT/DELETE real.',
  );
}

// Solo ejecuta main() cuando este archivo corre directamente -- no cuando
// otro script lo importa para reutilizar sus funciones (ej. un futuro
// scripts/insertar-cpp.ts), para no disparar la extracción del PDF y el
// fail-hard como efecto colateral.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
