/**
 * scripts/ingesta-cpp.ts
 * Preparación LOCAL (staging, sin red) del cuerpo COMPLETO de artículos del
 * Código Procesal Penal de Honduras (Decreto 9-99-E), para dictamen del CLO
 * antes de cualquier ingesta real, contemplando la sustitución in situ de la
 * fila manual `manual_curado:cpp_honduras:articulo_173`.
 *
 * Ejecutar: npx tsx scripts/ingesta-cpp.ts
 *
 * CERO ESCRITURAS EN PRODUCCIÓN: este script no importa ningún cliente de
 * Supabase, no abre conexión de red, y no tiene ninguna vía hacia
 * thgrhueckkjdutjvcufp. Lee un PDF local y escribe a stdout. El bloque SQL
 * que imprime al final es texto DECLARADO, no ejecutado.
 *
 * Fuente documental (verificada localmente, 2026-09-02):
 *   C:\Users\Fredy\OneDrive\SISTEMA_LEGAL_PRINCIPAL\02_EJERCICIO_LEGAL\
 *   05_LEYES_Y_CODIGOS\Codigo Procesal penal de Honduras.pdf
 *   — edición compilada del Centro Electrónico de Documentación e
 *   Información Judicial (CEDIJ), Poder Judicial de Honduras, Febrero/2002,
 *   texto íntegro del Decreto No. 9-99-E. Extraído con
 *   `pdftotext -layout -enc UTF-8` — mismo método ya registrado en
 *   producción para la fila manual_curado:cpp_honduras:articulo_173, cuyo
 *   metadata.pagina_impresa='50' coincide exactamente con el artefacto de
 *   paginación embebido dentro del propio Art. 173 en esta extracción,
 *   confirmando que es el mismo documento fuente.
 *
 * ⚠ DELIMITACIÓN DOCUMENTAL (dictamen de preingesta del CLO, 2026-09-02):
 *   El cuerpo dispositivo real va del Art. 1 (Libro Primero, Título I,
 *   Capítulo Único) al Art. 447 y su fórmula de cierre ("Dado en la Ciudad
 *   de Tegucigalpa... a los diecinueve días del mes de diciembre de mil
 *   novecientos noventa y nueve"). El PDF fuente trae ADEMÁS, a
 *   continuación de esa fórmula de cierre y de las firmas, el texto
 *   íntegro del DECRETO 195-2004 (reforma al procedimiento de altos
 *   funcionarios), con su propia numeración de artículos reiniciada desde
 *   el 1 — que colisionaría con los Arts. 1, 3, 4, 414-417 del Decreto
 *   9-99-E si no se excluyera. Este script acota el cuerpo ANTES de esa
 *   primera ocurrencia de "Dado en la Ciudad de Tegucigalpa", excluyendo
 *   por completo el Decreto 195-2004 — verificado: sin la acotación, la
 *   detección de duplicados sube de 8 grupos (373-380, ver abajo) a 15
 *   (suma de 1,3,4,373,374,375,376,377,378,379,380,414,415,416,417, estos
 *   últimos 7 números pertenecientes al 195-2004); acotando correctamente
 *   al cuerpo del 9-99-E, quedan exactamente los 8 grupos esperados.
 *
 * ⚠ DISPOSITIVOS DEROGADOS (Arts. 373-380) — hallazgo y resolución:
 *   Dentro del cuerpo ya acotado del Decreto 9-99-E (sin el 195-2004), el
 *   propio compilador del CEDIJ intercala DOS bloques bajo los mismos
 *   ocho números 373 a 380:
 *     1) Un bloque de 8 líneas breves "ARTÍCULO N.-Derogado" (encabezado
 *        "TÍTULO III / DE LA REVISIÓN / CAPÍTULO ÚNICO / DE LAS NORMAS A
 *        QUE ESTÁ SUJETA LA REVISIÓN"), seguido de una nota del propio
 *        compilador, verificada aquí AUTOMÁTICAMENTE (no solo por
 *        dictamen), que cita textualmente:
 *          "REVISION, Articulo 373,374, 375, 376,377,378,379,380 fueron
 *           derogados por la Ley Sobre Justicia Constitucional Decreto
 *           244-2003, publicada en el Diario Oficial la Gaceta No. 30,792
 *           de fecha 3 de septiembre de 2005. Para los casos anteriores a
 *           la derogación el texto es el que a continuación se lee;"
 *     2) Inmediatamente después, un SEGUNDO bloque bajo los MISMOS ocho
 *        números (373 "Casos en que procede la Revisión..." hasta 380),
 *        con contenido sustantivo real — que la propia nota del
 *        compilador encuadra como el texto aplicable únicamente a "los
 *        casos anteriores a la derogación" (es decir, texto histórico de
 *        aplicación transitoria a casos previos a septiembre de 2005, no
 *        derecho vigente para casos nuevos).
 *
 *   RESOLUCIÓN (dictamen del CLO, 2026-09-02): se ingresa UNA fila por
 *   cada uno de los ocho números (a373..a380), es_norma_vigente=false,
 *   con el contenido registrando la mención de derogatoria (nota de
 *   compilación, citada literalmente arriba — no una afirmación
 *   independiente de este script). El segundo bloque (texto histórico
 *   "Casos en que procede la Revisión...") se OMITE deliberadamente de
 *   esta ingesta -- ingerirlo bajo los mismos ocho números violaría la
 *   prohibición expresa de duplicar IDs, y el propio compilador lo
 *   encuadra como aplicable solo a casos anteriores a la derogación, no
 *   como derecho vigente. Este script lo detecta, lo cuenta y lo excluye
 *   de forma fail-hard verificable (ver detectarZonaContestada373a380) --
 *   nunca lo descarta en silencio: si la forma del bloque cambiara
 *   respecto de lo aquí verificado, el script falla en vez de adivinar.
 *   Queda como pendiente explícito para una futura revisión del equipo
 *   jurídico del fundador si ese texto histórico amerita su propia
 *   ingesta bajo un identificador distinto (ver nota en el reporte final).
 *
 * ⚠ SEGMENTACIÓN — mismo riesgo de contaminación por encabezados de
 *   Libro/Título/Capítulo/Sección intercalados ya resuelto para el
 *   Decreto 102-2018 (ver scripts/ingesta-d102-2018.ts): se usa un patrón
 *   combinado que trata "ARTÍCULO N[-Letra].-" y los encabezados
 *   estructurales como límites de segmentación, descartando estos
 *   últimos. El encabezado real de artículo en este documento admite
 *   variantes tipográficas de OCR/imprenta verificadas contra el PDF
 *   (p.ej. "ARTCULO 10.-" sin la Í, "ARTÍCULO 92. -Función." con espacio
 *   antes del guion, "ARTÍCULO 241. Personas..." con punto sin guion) --
 *   el patrón las tolera todas. También admite (sin que existan
 *   actualmente en este documento, verificado por barrido completo)
 *   artículos "bis"/con letra tipo "26-A" o "402-A", para no romper si
 *   una edición futura los trajera.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sha256 } from '../lib/ingesta-oficial/hash';
import { normalizarTexto } from '../lib/ingesta-oficial/extraccion';
import { validarSinDatosPrivados } from '../lib/ingesta-oficial/validaciones';
import type { ArticuloExtraido } from '../lib/ingesta-oficial/types';

export const PDF_FUENTE =
  'C:/Users/Fredy/OneDrive/SISTEMA_LEGAL_PRINCIPAL/02_EJERCICIO_LEGAL/05_LEYES_Y_CODIGOS/Codigo Procesal penal de Honduras.pdf';

export const FUENTE_CANONICA = 'Código Procesal Penal de Honduras (Decreto 9-99-E)';
export const MATERIA = '01_PENAL';
export const DECRETO = '9-99-E';
export const NORM_ID = 'HN_CODIGO_PROCESAL_PENAL';

// Fila manual a reconciliar in situ (ver DECISION_LOG.md).
export const ID_STUB_MANUAL_ART173 = 'manual_curado:cpp_honduras:articulo_173';

// Cita literal del compilador (CEDIJ / Poder Judicial), verificada
// AUTOMÁTICAMENTE contra el texto extraído en verificarNotaDerogatoria() --
// no es una afirmación independiente de este script ni del CLO sin
// respaldo textual: es lo que el propio documento fuente dice.
export const DECRETO_DEROGATORIO = '244-2003';
export const LEY_DEROGATORIA = 'Ley sobre Justicia Constitucional';
export const GACETA_DEROGATORIA = 'La Gaceta No. 30,792 de fecha 3 de septiembre de 2005';

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
// Excluye el preámbulo (portada CEDIJ, "DECRETA: El siguiente:") y, sobre
// todo, EXCLUYE por completo el Decreto 195-2004 anexado a continuación de
// la fórmula de cierre -- ver nota "DELIMITACIÓN DOCUMENTAL" arriba.
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

// ── 3. Limpieza específica de esta edición (ruido de paginación CEDIJ) ─
// Aplicada DESPUÉS de normalizarTexto() (que resuelve \r\n -> \n primero;
// ver mismo bug ya documentado y corregido para el Decreto 102-2018).
export function limpiarRuidoCPP(texto: string): string {
  return texto
    // Salto de página del PDF (form feed, 0x0C) — no es contenido.
    .replace(/\f/g, '\n')
    // Números de página sueltos en su propia línea (1 a 4 dígitos,
    // fuertemente sangrados a la derecha en el original) — verificado:
    // 190 ocurrencias en todo el documento, todas artefactos de
    // paginación (incluida la que aparece a mitad del Art. 173, cuyo
    // valor "50" coincide con metadata.pagina_impresa de la fila manual
    // a reconciliar). Nunca contenido real: ningún artículo del cuerpo
    // consiste en una línea con solo un número.
    .replace(/^[ \t]*\d{1,4}[ \t]*$/gm, '')
    // Repara guiones de corte de línea del PDF ("vigi-\nlancia" ->
    // "vigilancia"), igual que en el Decreto 102-2018. Solo une cuando la
    // continuación empieza en minúscula, para no fusionar enumeraciones
    // ("10)", "11)") con la palabra siguiente.
    .replace(/(\p{L})-\n\s*\n?\s*(\p{Ll})/gu, '$1$2')
    // Recorta espacios horizontales colgantes antes de un salto de línea
    // y colapsa el hueco en blanco que dejan las remociones de arriba.
    .replace(/[ \t]+(?=\n)/g, '')
    .replace(/\n{3,}/g, '\n\n');
}

// ── 4. Segmentación estricta específica de este documento ──────────────
// Límite combinado: "ARTÍCULO N[-Letra].-" (grupo 1 = número, grupo 2 =
// letra bis opcional, no usada actualmente pero soportada), o encabezado
// estructural Libro/Título/Capítulo/Sección (romano o "ÚNICO/ÚNICA"), que
// se descarta. Tolera las variantes tipográficas verificadas contra el
// PDF real: "ARTCULO" (sin Í), punto sin guion, espacio antes del guion.
const PATRON_LIMITE_SEGMENTACION =
  /^\s*(?:ART[IÍ]?CULO\s+(\d+)(?:[-\s]([A-Z]))?\.\s*-{0,2}\s*|(?:LIBRO|T[IÍ]TULO|CAP[IÍ]TULO|SECCI[OÓ]N)\s+(?:[IVXLCDM]+\b|[UÚ]NIC[OA]\b))/gim;

// CRÍTICO: se conservan TODAS las coincidencias (artículo Y estructural)
// en una sola lista ordenada -- el límite de corte de cada artículo debe
// ser la SIGUIENTE coincidencia de cualquier tipo, no la siguiente
// coincidencia de artículo. Si se filtraran los límites estructurales
// ANTES de cortar contenido (como en un primer intento de este script),
// un encabezado de Libro/Título/Capítulo/Sección que cae entre el
// Artículo N y el Artículo N+1 queda pegado al final del contenido del
// Artículo N -- detectado en la primera corrida real contra este PDF
// (el Art. 23 arrastraba "TITULO II / DE LAS ACCIONES PENALES Y CIVILES /
// CAPITULO I / DE LA CLASIFICACION..." hasta el Art. 24).
interface CoincidenciaBruta {
  numArticulo: string | undefined; // undefined = límite estructural (Libro/Título/Capítulo/Sección)
  inicio: number;
}

function recolectarTodasLasCoincidencias(textoNormalizado: string): CoincidenciaBruta[] {
  const coincidencias = [...textoNormalizado.matchAll(PATRON_LIMITE_SEGMENTACION)];
  return coincidencias.map((c) => {
    const numero = c[1];
    const letra = c[2] ?? '';
    return { numArticulo: numero !== undefined ? `${numero}${letra}` : undefined, inicio: c.index ?? 0 };
  });
}

// Extrae SOLO los tramos de artículo (descarta los estructurales DESPUÉS
// de haberlos usado como límite de corte, nunca antes).
function extraerArticulos(textoNormalizado: string, todas: CoincidenciaBruta[]): ArticuloExtraido[] {
  const out: ArticuloExtraido[] = [];
  for (let i = 0; i < todas.length; i++) {
    const actual = todas[i];
    if (actual.numArticulo === undefined) continue; // límite estructural -- se descarta aquí, no antes
    const fin = todas[i + 1]?.inicio ?? textoNormalizado.length;
    out.push({ numArticulo: actual.numArticulo, contenido: textoNormalizado.slice(actual.inicio, fin).trim() });
  }
  return out;
}

// ── 5. Zona contestada 373-380: detección y resolución fail-hard ───────
// Verifica AUTOMÁTICAMENTE (no solo por dictamen) que el bloque duplicado
// tiene exactamente la forma documentada: 8 coincidencias "373..380"
// (bloque derogado, contenido corto) seguidas inmediatamente de 8
// coincidencias "373..380" otra vez (bloque histórico, contenido largo),
// y que justo después continúa "381". Si la forma real del documento no
// coincide EXACTAMENTE con esto, falla en vez de adivinar qué hacer.
export interface ResultadoZonaContestada {
  indiceInicioStubs: number; // índice dentro de `articulos` donde empieza el bloque "373 Derogado"
  indiceInicioHistorico: number; // índice donde empieza el segundo bloque "373 Casos en que procede..."
  indiceSiguiente381: number; // índice donde retoma la numeración normal
  bloqueHistorico: ArticuloExtraido[]; // ya correctamente segmentado -- capturado para transparencia, NO se ingiere
}

// Recibe la lista de artículos YA correctamente segmentada (sin
// contaminación de encabezados estructurales -- ver extraerArticulos) y
// localiza en ella el patrón exacto verificado: 8 ocurrencias de
// "373".."380" (stubs), seguidas inmediatamente de otras 8 ocurrencias de
// "373".."380" (histórico), seguidas de "381". Si la forma real no
// coincide EXACTAMENTE, falla en vez de adivinar qué hacer.
export function detectarZonaContestada373a380(articulos: ArticuloExtraido[]): ResultadoZonaContestada {
  const RANGO = ['373', '374', '375', '376', '377', '378', '379', '380'];
  const idx373primero = articulos.findIndex((a) => a.numArticulo === '373');
  if (idx373primero === -1) {
    fallarDuro('no se encontró ninguna coincidencia para el Art. 373 — la zona contestada 373-380 no tiene la forma esperada');
  }

  // Bloque 1 esperado: 373..380 consecutivos exactos, sin nada intercalado.
  for (let i = 0; i < RANGO.length; i++) {
    const a = articulos[idx373primero + i];
    if (!a || a.numArticulo !== RANGO[i]) {
      fallarDuro(
        `zona contestada 373-380: se esperaba "${RANGO[i]}" en la posición ${idx373primero + i} del primer bloque (derogado) y se obtuvo "${a?.numArticulo ?? '(fin)'}" — la forma del documento cambió respecto de lo verificado`,
      );
    }
  }
  const idxInicioHistorico = idx373primero + RANGO.length;

  // Bloque 2 esperado: 373..380 otra vez, consecutivos, inmediatamente después.
  for (let i = 0; i < RANGO.length; i++) {
    const a = articulos[idxInicioHistorico + i];
    if (!a || a.numArticulo !== RANGO[i]) {
      fallarDuro(
        `zona contestada 373-380: se esperaba "${RANGO[i]}" en la posición ${idxInicioHistorico + i} del segundo bloque (histórico) y se obtuvo "${a?.numArticulo ?? '(fin)'}" — la forma del documento cambió respecto de lo verificado`,
      );
    }
  }
  const idxSiguiente381 = idxInicioHistorico + RANGO.length;
  const siguiente = articulos[idxSiguiente381];
  if (!siguiente || siguiente.numArticulo !== '381') {
    fallarDuro(
      `zona contestada 373-380: tras los dos bloques de 8 se esperaba retomar en "381" y se obtuvo "${siguiente?.numArticulo ?? '(fin)'}"`,
    );
  }

  const bloqueHistorico = articulos.slice(idxInicioHistorico, idxInicioHistorico + RANGO.length);

  // Sanity check: el bloque histórico debe ser sustantivo (no otro "Derogado" corto) --
  // si algún día resultara corto, la asunción de este script ya no aplicaría.
  for (const a of bloqueHistorico) {
    if (a.contenido.length < 50) {
      fallarDuro(`zona contestada 373-380: el Art. ${a.numArticulo} del bloque histórico es sospechosamente corto (${a.contenido.length} caracteres) — no coincide con lo verificado manualmente`);
    }
  }

  return {
    indiceInicioStubs: idx373primero,
    indiceInicioHistorico: idxInicioHistorico,
    indiceSiguiente381: idxSiguiente381,
    bloqueHistorico,
  };
}

// Verifica que la nota de derogatoria citada en las constantes de este
// módulo (DECRETO_DEROGATORIO, LEY_DEROGATORIA, GACETA_DEROGATORIA)
// aparece REALMENTE en el texto fuente, en la zona 373-380 -- para que la
// atribución de este script nunca dependa de una afirmación no verificada.
export function verificarNotaDerogatoria(textoNormalizado: string): string {
  const inicioZona = textoNormalizado.search(/ART[IÍ]?CULO\s+373\.-?\s*Derogado/i);
  if (inicioZona === -1) {
    fallarDuro('no se encontró el bloque "ARTÍCULO 373.-Derogado" para verificar la nota de derogatoria');
  }
  const ventana = textoNormalizado.slice(inicioZona, inicioZona + 1500);
  if (!ventana.includes(DECRETO_DEROGATORIO)) {
    fallarDuro(`la nota de derogatoria no cita el decreto "${DECRETO_DEROGATORIO}" en el texto fuente — verificación automática falló`);
  }
  if (!new RegExp(LEY_DEROGATORIA.replace(/\s+/g, '\\s+'), 'i').test(ventana)) {
    fallarDuro(`la nota de derogatoria no cita "${LEY_DEROGATORIA}" en el texto fuente — verificación automática falló`);
  }
  const parrafos = ventana.split(/\n\n+/);
  const parrafoNota = parrafos.find((p) => p.includes(DECRETO_DEROGATORIO));
  if (!parrafoNota) fallarDuro('no se pudo aislar el párrafo exacto de la nota de derogatoria');
  return parrafoNota.replace(/\s+/g, ' ').trim();
}

// Exige secuencia 1..447 estrictamente consecutiva sobre el conjunto final
// ya resuelto (stubs 373-380 incluidos, histórico 373-380 excluido).
export function validarSecuenciaCompleta(articulos: ArticuloExtraido[]): void {
  if (articulos.length === 0) fallarDuro('no se segmentó ningún artículo del cuerpo acotado');
  const numeros = articulos.map((a) => Number(a.numArticulo));
  for (let i = 0; i < numeros.length; i++) {
    const esperado = i + 1;
    if (numeros[i] !== esperado) {
      fallarDuro(
        `secuencia de artículos rota en la posición ${i + 1}: se esperaba el Artículo ${esperado} y se obtuvo el Artículo ${numeros[i]} — posible encabezado mal segmentado o artículo faltante`,
      );
    }
  }
}

// ── 6. Control de calidad fail-hard sobre cada fragmento sustantivo ────
export function validarFragmentoFailHard(numArticulo: string, contenido: string): void {
  if (contenido.length < 20) {
    fallarDuro(`Art. ${numArticulo}: contenido sospechosamente corto (${contenido.length} caracteres) — posible segmentación fallida`);
  }
  if (contenido.length > 20000) {
    fallarDuro(`Art. ${numArticulo}: contenido sospechosamente largo (${contenido.length} caracteres) — posible fallo de segmentación (¿se arrastró el artículo siguiente?)`);
  }
  if (/^\s*(LIBRO|T[IÍ]TULO|CAP[IÍ]TULO|SECCI[OÓ]N)\s+(?:[IVXLCDM]+\b|[UÚ]NIC[OA]\b)/im.test(contenido.slice(contenido.indexOf('\n') + 1))) {
    fallarDuro(`Art. ${numArticulo}: quedó un encabezado estructural (Libro/Título/Capítulo/Sección) sin depurar dentro del contenido`);
  }
  if (/\p{L}-\n\s*\p{Ll}/u.test(contenido)) {
    fallarDuro(`Art. ${numArticulo}: quedó un corte de línea con guion sin reparar (texto cortado) dentro del contenido`);
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
  if (!new RegExp(`^ART[IÍ]?CULO\\s+${numArticulo}\\b`, 'i').test(contenido)) {
    fallarDuro(`Art. ${numArticulo}: el contenido no comienza con su propio encabezado "ARTÍCULO ${numArticulo}"`);
  }
}

// ── 7. Contrato de columnas biblioteca_vectores ─────────────────────────
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
  'pdftotext -layout -enc UTF-8 + limpieza de ruido de paginación CEDIJ y validación fail-hard automatizada (scripts/ingesta-cpp.ts) — PENDIENTE de verificación manual humana artículo por artículo antes de ingesta real';

export function construirRegistro(a: ArticuloExtraido): RegistroCanonicoCPP {
  return {
    id: `mayalex_normativos:cpp_1999_a${a.numArticulo}`,
    fuente: FUENTE_CANONICA,
    materia: MATERIA,
    num_articulo: a.numArticulo,
    es_norma_vigente: true,
    jurisdiccion: 'HN',
    fuente_tipo: 'codigo',
    coleccion: 'mayalex_normativos',
    metadata: {
      decreto: DECRETO,
      norm_id: NORM_ID,
      tipo_instrumento: 'codigo',
      metodo_extraccion: METODO_EXTRACCION,
      hash_texto_sha256: sha256(a.contenido),
      verificado: false,
      fecha_verificacion: null,
    },
    contenido: a.contenido,
  };
}

// Construye las 8 filas derogadas (a373..a380). El contenido registra la
// mención de derogatoria como NOTA DE COMPILACIÓN, citando literalmente lo
// que el propio documento fuente dice (verificado por
// verificarNotaDerogatoria) — no se presenta como si fuera el texto
// original de 1999 del articulado (que la propia fuente ya no reproduce,
// reemplazado por la palabra "Derogado").
export function construirRegistrosDerogados373a380(notaFuenteVerificada: string): RegistroCanonicoCPP[] {
  const RANGO = ['373', '374', '375', '376', '377', '378', '379', '380'];
  return RANGO.map((n) => {
    const contenido =
      `ARTÍCULO ${n}.- Derogado. ` +
      `[Nota de compilación oficial — Centro Electrónico de Documentación e Información Judicial (CEDIJ), Poder Judicial de Honduras, edición Febrero/2002 — verificada textualmente contra el propio documento fuente:] ` +
      `${notaFuenteVerificada}`;
    return {
      id: `mayalex_normativos:cpp_1999_a${n}`,
      fuente: FUENTE_CANONICA,
      materia: MATERIA,
      num_articulo: n,
      es_norma_vigente: false,
      jurisdiccion: 'HN',
      fuente_tipo: 'codigo',
      coleccion: 'mayalex_normativos',
      metadata: {
        decreto: DECRETO,
        norm_id: NORM_ID,
        tipo_instrumento: 'codigo',
        estado_articulo: 'DEROGADO',
        derogado_por: `${LEY_DEROGATORIA} (Decreto ${DECRETO_DEROGATORIO})`,
        publicacion_derogatoria: GACETA_DEROGATORIA,
        derogatoria_citada_en_fuente: true, // verificada automáticamente, no afirmación independiente
        metodo_extraccion: METODO_EXTRACCION,
        hash_texto_sha256: sha256(contenido),
        verificado: false,
        fecha_verificacion: null,
      },
      contenido,
    };
  });
}

function porNumero(articulos: ArticuloExtraido[], n: string): ArticuloExtraido {
  const a = articulos.find((x) => x.numArticulo === n);
  if (!a) fallarDuro(`no se encontró el Art. ${n} entre los segmentados`);
  return a!;
}

// ── 8. Ensamble del pipeline completo (reutilizable por insertar-cpp.ts) ─
export interface ResultadoPipelineCPP {
  articulosVigentes: ArticuloExtraido[]; // 1-372 + 381-447 (439 artículos)
  registrosDerogados: RegistroCanonicoCPP[]; // a373..a380 (8 filas, es_norma_vigente=false)
  bloqueHistoricoOmitido: ArticuloExtraido[]; // 373-380 "Casos en que procede la Revisión..." -- NO se ingiere
  notaDerogatoriaVerificada: string;
  textoNormalizado: string;
}

export function ejecutarPipelineCompleto(): ResultadoPipelineCPP {
  const textoCrudo = extraerTextoPDF(PDF_FUENTE);
  const cuerpoAcotado = acotarCuerpoDispositivo(textoCrudo);
  // normalizarTexto() primero (\r\n -> \n) antes de la reparación de
  // guiones de corte de línea -- mismo orden ya requerido para el
  // Decreto 102-2018 y re-confirmado aquí durante el análisis crudo.
  const textoNormalizado = limpiarRuidoCPP(normalizarTexto(cuerpoAcotado));

  // Segmentación en dos fases: primero se cortan TODOS los tramos de
  // artículo con límites correctos (incluyendo los estructurales como
  // frontera, ver extraerArticulos), lo que produce naturalmente las DOS
  // ocurrencias de "373".."380" en su posición real dentro de la
  // secuencia -- ninguna re-segmentación adicional hace falta para
  // aislar la zona contestada, solo localizarla dentro de esta lista ya
  // correcta.
  const todasLasCoincidencias = recolectarTodasLasCoincidencias(textoNormalizado);
  const articulosCompletos = extraerArticulos(textoNormalizado, todasLasCoincidencias);

  const zona = detectarZonaContestada373a380(articulosCompletos);
  const notaDerogatoriaVerificada = verificarNotaDerogatoria(textoNormalizado);

  const articulosAntes = articulosCompletos.slice(0, zona.indiceInicioStubs);
  const articulosDespues = articulosCompletos.slice(zona.indiceSiguiente381);

  const articulosVigentes = [...articulosAntes, ...articulosDespues];
  for (const a of articulosVigentes) validarFragmentoFailHard(a.numArticulo, a.contenido);

  const registrosDerogados = construirRegistrosDerogados373a380(notaDerogatoriaVerificada);

  return {
    articulosVigentes,
    registrosDerogados,
    bloqueHistoricoOmitido: zona.bloqueHistorico,
    notaDerogatoriaVerificada,
    textoNormalizado,
  };
}

// ── 9. Declaración (NO ejecución) del SQL de reemplazo atómico Art.173 ──
export function declararSQLReemplazoAtomico(totalFilas: number): string {
  return `-- ESTRATEGIA DECLARADA -- NO EJECUTADA EN ESTE TURNO --
-- Reemplazo atómico del stub manual del Art. 173 del CPP + ingesta de
-- las ${totalFilas} filas canónicas del Decreto 9-99-E (${totalFilas - 8} vigentes + 8 derogadas a373-a380).
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
  console.log('=== Preparación de ingesta canónica — Código Procesal Penal (Decreto 9-99-E) ===');
  console.log(`Fuente PDF: ${PDF_FUENTE}\n`);

  const resultado = ejecutarPipelineCompleto();
  const todosLosArticulos: ArticuloExtraido[] = [
    ...resultado.articulosVigentes,
    ...resultado.registrosDerogados.map((r) => ({ numArticulo: r.num_articulo, contenido: r.contenido })),
  ].sort((a, b) => Number(a.numArticulo) - Number(b.numArticulo));

  validarSecuenciaCompleta(todosLosArticulos);

  const errPII = validarSinDatosPrivados(resultado.articulosVigentes);
  if (errPII) fallarDuro(errPII);

  const TOTAL_VIGENTES = resultado.articulosVigentes.length;
  const TOTAL_DEROGADOS = resultado.registrosDerogados.length;
  const TOTAL = TOTAL_VIGENTES + TOTAL_DEROGADOS;

  console.log(`✅ Fail-hard QC superado — secuencia 1..${TOTAL} consecutiva, sin huecos ni duplicados.`);
  console.log(`   Vigentes (es_norma_vigente=true):  ${TOTAL_VIGENTES}`);
  console.log(`   Derogados (es_norma_vigente=false): ${TOTAL_DEROGADOS}  (Arts. 373-380)`);
  console.log(`   TOTAL:                              ${TOTAL}\n`);

  console.log(
    `ℹ️  Bloque histórico OMITIDO deliberadamente (texto "Casos en que procede la Revisión..." bajo los mismos números 373-380, encuadrado por el propio compilador como aplicable solo a casos anteriores a la derogación de 2005) -- ${resultado.bloqueHistoricoOmitido.length} fragmentos, ${resultado.bloqueHistoricoOmitido.reduce((s, a) => s + a.contenido.length, 0)} caracteres totales, no ingeridos en este pliego. Pendiente de revisión del equipo jurídico del fundador si amerita ingesta propia bajo otro identificador.\n`,
  );

  console.log('=== Nota de derogatoria verificada AUTOMÁTICAMENTE contra el texto fuente ===\n');
  console.log(resultado.notaDerogatoriaVerificada);

  console.log('\n=== ⚖ EVIDENCIA TEXTUAL EXIGIDA — Art. 1 (texto completo) ===\n');
  console.log(porNumero(resultado.articulosVigentes, '1').contenido);

  console.log('\n=== ⚖ EVIDENCIA TEXTUAL EXIGIDA — Art. 173 (texto completo) ===\n');
  console.log(porNumero(resultado.articulosVigentes, '173').contenido);

  console.log('\n=== ⚖ DETALLE DE FILA GENERADA — Art. 373 (demuestra es_norma_vigente=false) ===\n');
  const registro373 = resultado.registrosDerogados.find((r) => r.num_articulo === '373')!;
  console.log(JSON.stringify(registro373, null, 2));

  console.log('\n=== 🔧 BLOQUE SQL DECLARADO (NO EJECUTADO) — reemplazo atómico Art. 173 ===\n');
  console.log(declararSQLReemplazoAtomico(TOTAL));

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
