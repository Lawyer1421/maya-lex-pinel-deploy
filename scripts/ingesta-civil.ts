/**
 * scripts/ingesta-civil.ts
 * Preparación LOCAL (staging, sin red) del cuerpo COMPLETO de artículos del
 * Código Civil de Honduras -- Decreto del Poder Ejecutivo del 8 de febrero
 * de 1906, emitido bajo la autoridad del Decreto 76 de la Asamblea Nacional
 * Constituyente -- para dictamen del CLO antes de cualquier ingesta real.
 *
 * Ejecutar: npx tsx scripts/ingesta-civil.ts
 *
 * CERO ESCRITURAS EN PRODUCCIÓN, CERO EMBEDDINGS: este script no importa
 * ningún cliente de Supabase (createClient/.rpc()/pg.Client/Pool()), no
 * usa execute_sql/DATABASE_URL/service_role, no abre conexión de red, y no
 * genera ningún vector. Lee un PDF local, escribe artefactos locales
 * (json/txt/sql) bajo out/ingesta-civil/, y termina. El bloque SQL que
 * declara al final es texto DECLARADO, no ejecutado -- ni siquiera trae
 * INSERTs (esos, con embeddings reales, son tarea de un futuro
 * scripts/insertar-civil.ts, no autorizado todavía).
 *
 * NO TOCA LAS FILAS EXISTENTES de materia='02_CIVIL' en biblioteca_vectores
 * (esas son, según el censo forense del 2026-09-03, mayormente Código
 * Procesal Civil D.211-2006 mal etiquetado + instrumentos notariales
 * anonimizados -- un problema DISTINTO, pendiente de decisión aparte). El
 * bloque SQL declarado aquí es un INSERT puro hacia biblioteca_vectores
 * SIN ningún DELETE previo -- a diferencia de scripts/ingesta-cpp.ts (que sí
 * declara un DELETE del stub manual del Art.173), el Civil no tiene ningún
 * stub previo que reemplazar.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * ADVERTENCIA DE PROVENANCIA -- a diferencia de scripts/ingesta-cpp.ts
 * (cuyos comentarios describen hallazgos ya verificados contra la salida
 * REAL de `pdftotext -layout`), este archivo NO ha sido ejecutado en esta
 * sesión: el usuario autorizó solo ESCRIBIR el script, no correrlo. Toda la
 * lógica de segmentación/notas al pie de abajo está modelada sobre un
 * análisis forense manual hecho con `pypdf` (scripts efímeros de scratchpad
 * -- civil_mapa_vigencia.py, check_letras.py -- nunca comiteados), NO sobre
 * una corrida real de `pdftotext -layout` contra este PDF. La PRIMERA vez
 * que este script se ejecute de verdad, sus propios fail-hard (conteos,
 * QC por fragmento) son los que deben confirmar o refutar estos supuestos
 * -- no se debe asumir que pasará en verde sin revisión.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * SET DE VIGENCIA -- decisión cerrada del CLO (dictamen firmado), NO
 * detectado automáticamente por este script a partir del contenido. La
 * razón: el propio cuerpo del PDF contiene casos donde la palabra
 * "Derogado" aparece SIN que el artículo completo esté derogado (Art.553:
 * "(Párrafo Derogado)" -- solo el segundo párrafo, por D.211-2006; Art.2141:
 * primer párrafo reformado, segundo derogado, también D.211-2006; Art.511:
 * el propio PDF lo marca REFORMADO en su nota al pie, pese a que el
 * apéndice de cierre (pp.422-423) lo lista erróneamente como derogado --
 * discrepancia detectada y reportada, resuelta a favor de la nota adosada
 * al artículo). Por eso FALSE_RANGOS abajo es la fuente de verdad -- fija,
 * copiada tal cual del dictamen -- y validarFragmentoFailHard() solo la
 * usa para CONTRASTAR (no para inferir) contra el contenido extraído: si
 * un artículo declarado FALSE no dice "Derogado" en el cuerpo, o si un
 * artículo declarado TRUE SÍ dice "Derogado", el script aborta -- eso
 * significaría que el set cerrado y la fuente real no coinciden, y ningún
 * "arreglo" automático está autorizado.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * ARTÍCULOS 21-36 -- NO están impresos en el cuerpo del PDF. El documento
 * salta de "Artículo 20." a "Artículo 37.", dejando solo la nota al pie 1
 * ("Artículo 21 a 36 Derogados, Artículo 37 Reformado por Decreto No.
 * 35-2013...") como referencia. Se sintetizan aquí como 16 filas STUB con
 * contenido literal "Artículo N. Derogado" -- NO se inventa texto viejo
 * (pre-1913) para rellenarlos, por instrucción expresa del CLO. Cada stub
 * lleva metadata.stub_no_impreso=true para que cualquier revisor (humano o
 * automatizado) sepa que esa fila no tiene texto sustantivo preservado.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * SIN BIS-LETRAS -- a diferencia del CPP (Decreto 9-99-E, con Arts. tipo
 * "26-A"), el Código Civil de 1906 no tiene artículos con sufijo de letra
 * (verificado manualmente contra Civil#2 y Civil#3 -- ver check_letras.py:
 * los ~15 falsos positivos de un regex ingenuo eran todos la primera
 * palabra del propio artículo, ej. "Artículo 431. A falta de padre..."). La
 * segmentación de este script es por tanto más simple que la del CPP: no
 * hay lógica de sufijo de letra en ninguna parte.
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { sha256 } from '../lib/ingesta-oficial/hash';
import { normalizarTexto } from '../lib/ingesta-oficial/extraccion';
import { validarSinDatosPrivados } from '../lib/ingesta-oficial/validaciones';
import type { ArticuloExtraido } from '../lib/ingesta-oficial/types';

export const PDF_FUENTE =
  'C:/Users/Fredy/OneDrive/Email attachments/Documentos/bufete/juan cavino/Documents/Respaldo Blanca17052022/ESCRITORIO TODO/CodigoCivil(Actualizado2014).pdf';

// Corrección de nombre firmada por el CLO -- la portada del propio PDF
// imprime "Decreto N° 76-1906", pero eso es un rótulo equivocado: el
// Código Civil es el Decreto del PODER EJECUTIVO del 8 de febrero de 1906,
// emitido bajo la autoridad habilitante del Decreto 76 de la Asamblea
// Nacional Constituyente. NUNCA usar "D.76-1906" como si fuera el propio
// instrumento -- ni en ids, ni en `fuente`, ni en metadata.decreto.
export const FUENTE_CANONICA =
  'Código Civil de Honduras (Decreto del Poder Ejecutivo del 8 de febrero de 1906)';
export const MATERIA = '02_CIVIL';
export const INSTRUMENTO = 'Decreto del Poder Ejecutivo, 8 de febrero de 1906';
export const DECRETO_HABILITANTE_ANC = '76 (Asamblea Nacional Constituyente)';
export const NORM_ID = 'HN_CODIGO_CIVIL_1906';
export const EDICION_FUENTE =
  'Edición consolidada del Poder Judicial de Honduras (www.poderjudicial.gob.hn), "CodigoCivil(Actualizado2014).pdf" -- elegida por el CLO sobre la variante "Código Civil (mayo 2018).pdf" tras comparación manual línea a línea de las últimas 25 páginas de ambas: cuerpo idéntico Art.1-2372, la única diferencia es que esta edición trae el apéndice "DEROGACIONES Y REFORMAS SEGÚN FECHAS DE DEROGACION Y REFORMAS" (pp.422-423), ausente en la variante de mayo 2018. Notas al pie individuales (43, numeración secuencial 1..43) usadas como fuente primaria de cada cita de decreto -- más precisas que el apéndice, que contiene un error verificado (Art.511 listado como derogado en el apéndice, pero reformado según su propia nota al pie 19) y una repetición de imprenta (rango "276 al 330" y el número "262" aparecen dos veces en el ítem 12 del propio apéndice).';

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

// ── 2. Acotar al cuerpo dispositivo real (Art.1 al Art.2372) ───────────
// Inicio: se ancla sobre el propio encabezado "Artículo 1." dentro de los
// primeros 20,000 caracteres (evita anclar sobre una frase de portada no
// verificada -- nunca leí las páginas 1-5 de este PDF en detalle, así que
// no asumo ningún texto de preámbulo específico). Fin: se ancla sobre el
// encabezado verbatim del apéndice de derogaciones (SÍ verificado por
// lectura manual -- ver CIVIL_2_Actualizado2014_ultimas25.txt), para
// EXCLUIR ese apéndice del cuerpo -- es una tabla de referencia, no texto
// de artículos, y no debe segmentarse como si lo fuera.
export function acotarCuerpoDispositivo(textoCrudo: string): string {
  const ventanaInicio = textoCrudo.slice(0, 20000);
  const mInicio = ventanaInicio.match(/Art[ií]culo\s+1[.\-]/);
  if (!mInicio || mInicio.index === undefined) {
    fallarDuro('no se encontró el encabezado "Artículo 1." dentro de los primeros 20,000 caracteres — el documento fuente pudo haber cambiado de formato');
  }
  const inicioIdx = mInicio.index!;

  const marcaFin = 'DEROGACIONES Y REFORMAS SEGÚN FECHAS DE';
  const finIdx = textoCrudo.indexOf(marcaFin, inicioIdx);
  if (finIdx === -1) {
    fallarDuro(`no se encontró la marca de fin "${marcaFin}" (encabezado del apéndice de derogaciones) — el documento fuente pudo haber cambiado de formato`);
  }
  return textoCrudo.slice(inicioIdx, finIdx);
}

// ── 3. Detección y eliminación de notas al pie ──────────────────────────
// Misma técnica que scripts/ingesta-cpp.ts (detección secuencial estricta
// 1,2,3,...,43): una línea que empieza con un número desnudo solo cuenta
// como inicio de nota si ese número es EXACTAMENTE el siguiente esperado.
// Verificado manualmente contra Civil#2: notas 1 a 43, sin huecos, cada
// una citando decreto/fecha/Gaceta -- ver reporte de cierre del turno
// anterior para el texto completo de las 43.
export interface NotaAlPie {
  num: number;
  texto: string;
}

export function detectarNotasAlPie(cuerpoOriginal: string): { notas: NotaAlPie[]; spans: Array<{ desde: number; hasta: number }> } {
  // BUG real encontrado en la primera corrida (2026-09-03): pdftotext -layout
  // inserta el carácter de salto de página \f PEGADO al inicio de la línea
  // siguiente, sin su propio \n -- ej. "...gob.hn\n\f21. Lo que una ley...".
  // El \f queda como PRIMER carácter de esa línea, desplazando "21." fuera
  // de la posición 0 y rompiendo el ancla `^(\d{1,3})`. Verificado: de las
  // 43 notas reales, la nota 21 cae exactamente en un salto de página así
  // (la única de las 43 que lo hace -- por eso la detección se cortaba en
  // 20/43, no antes). limpiarRuidoPaginacion() ya convierte \f -> \n, pero
  // corre DESPUÉS de la detección de notas en el pipeline -- aquí se separa
  // ese único paso (\f -> \n) para que corra ANTES, sin duplicar el resto
  // de limpiarRuidoPaginacion (que sí debe seguir corriendo después, sobre
  // el texto ya sin notas).
  const cuerpo = cuerpoOriginal.replace(/\f/g, '\n');
  const lineas = cuerpo.split('\n');
  const offsets: number[] = [];
  { let acc = 0; for (const l of lineas) { offsets.push(acc); acc += l.length + 1; } }

  // BUG real #2 encontrado en la primera corrida: la detección puramente
  // SECUENCIAL (sin más criterio) que sí bastaba para el CPP (ver
  // ingesta-cpp.ts) NO basta aquí -- el Código Civil tiene, dentro del
  // cuerpo de varios artículos, listas numeradas largas de requisitos,
  // impedimentos, causas, etc. (ej. Art. sobre testigos inhábiles en
  // testamentos, con ítems "10. Los deudores fraudulentos.", "19. Los
  // herederos y legatarios..."; Art.2370 con una lista de 21 reglas
  // transitorias, "20. La prescripción...", "21. Lo que una ley
  // posterior..."). Esas listas empiezan en "1." y coinciden por pura
  // COINCIDENCIA con el número de nota esperado en ese punto del barrido,
  // secuestrando el contador -- verificado: sin filtro adicional, el
  // barrido se desincroniza ya en la nota 4 (folio Art.79) y nunca se
  // recupera, terminando por "encontrar" 43 falsas notas si no fuera por
  // el chequeo de cantidad. Filtro añadido: una nota real de ESTA fuente
  // SIEMPRE cita su decreto/Gaceta dentro del propio párrafo (verificado
  // contra las 43 notas reales) -- una lista de requisitos del cuerpo,
  // en cambio, nunca lo hace. Se exige esa cita dentro del span completo
  // de la nota candidata (hasta la siguiente línea en blanco) antes de
  // aceptarla; si no la cita, se descarta como coincidencia y el barrido
  // sigue buscando el mismo número más adelante.
  const PATRON_CITA_DECRETO = /Decreto\s*(No\.?|N[°º])?\s*\d|Diario\s+Oficial|Gaceta/i;

  // BUG real #3: no todas las notas empiezan en la columna 0 -- algunas
  // (ej. la nota 6, sobre Art.84) traen espacios de indentación delante
  // del número ("   6 Artículo 84. Reformado..."), verificado contra la
  // salida real de pdftotext. Se tolera indentación inicial; el filtro de
  // cita de decreto (arriba) es lo que sigue evitando falsos positivos de
  // las listas numeradas del cuerpo, que también suelen venir indentadas.
  let siguienteEsperado = 1;
  const inicios: number[] = [];
  for (let i = 0; i < lineas.length; i++) {
    const m = lineas[i].match(/^\s*(\d{1,3})\s?\S/);
    if (!m || Number(m[1]) !== siguienteEsperado) continue;
    // Construye el span candidato (hasta la próxima línea en blanco) SOLO
    // para verificar la cita -- el span real y definitivo se recalcula
    // más abajo, igual que antes.
    let lf = i;
    while (lf < lineas.length && lineas[lf].trim() !== '') lf++;
    const spanCandidato = lineas.slice(i, lf).join(' ');
    if (!PATRON_CITA_DECRETO.test(spanCandidato)) continue; // coincidencia numérica de una lista del cuerpo, no una nota real
    inicios.push(i);
    siguienteEsperado++;
  }
  if (inicios.length === 0) {
    fallarDuro('no se detectó ninguna nota al pie con la detección secuencial estricta — el documento fuente pudo haber cambiado de formato');
  }
  if (inicios.length !== 43) {
    fallarDuro(`se esperaban exactamente 43 notas al pie (verificado manualmente contra Civil#2), se detectaron ${inicios.length} — revisar antes de continuar, no ajustar este número sin volver a leer el PDF a mano`);
  }

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

// BUG real #8, verificado puntualmente (un solo caso en toda la fuente):
// el marcador de la nota al pie 35 queda PEGADO directamente al número del
// propio artículo que anota, sin ningún separador -- "Artículo 178735. Lo
// dispuesto..." (= "Artículo 1787" + marcador "35", sin punto ni espacio
// entre ambos). limpiarMarcadoresInline() no lo puede separar porque su
// lookbehind exige una LETRA/puntuación antes del marcador, no otro
// dígito (con razón: aflojar esa condición arriesgaría cortar dígitos
// legítimos de cualquier número real de artículo). Se corrige aquí como
// una excepción puntual, verificada manualmente contra la fuente cruda de
// `pdftotext -layout` -- NO es una regla general.
const EXCEPCIONES_MARCADOR_PEGADO_A_NUMERO: Array<{ buscar: string; reemplazar: string }> = [
  { buscar: 'Artículo 178735.', reemplazar: 'Artículo 1787.' },
];

export function corregirExcepcionesPuntuales(texto: string): string {
  let out = texto;
  for (const { buscar, reemplazar } of EXCEPCIONES_MARCADOR_PEGADO_A_NUMERO) {
    if (!out.includes(buscar)) {
      fallarDuro(`excepción puntual "${buscar}" no encontrada en el texto -- la fuente pudo haber cambiado, revisar antes de aplicar esta corrección a ciegas`);
    }
    out = out.replaceAll(buscar, reemplazar);
  }
  return out;
}

export function eliminarSpans(cuerpo: string, spans: Array<{ desde: number; hasta: number }>): string {
  let out = cuerpo;
  for (let i = spans.length - 1; i >= 0; i--) {
    out = out.slice(0, spans[i].desde) + out.slice(spans[i].hasta);
  }
  return out;
}

// ── 4. Limpieza: marcadores de nota inline + ruido de paginación ───────
// Los marcadores de nota en esta fuente aparecen PEGADOS sin espacio al
// texto que anotan (ej. "TÍTULO V7", "Artículo 513. Derogado20") --
// verificado por lectura manual. Misma técnica de reemplazo condicionado
// (solo borra el número si coincide con una nota realmente detectada) que
// scripts/ingesta-cpp.ts, para no arriesgar borrar un número legítimo del
// propio texto legal (ej. una cantidad en un artículo).
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

// Ruido de paginación PROPIO de esta fuente (distinto del CEDIJ/CPP):
// pie de página "<número de página>" + "www.poderjudicial.gob.hn" en
// líneas sueltas -- verificado por lectura manual contra el extracto
// completo (CIVIL_2_Actualizado2014_completo.txt).
export function limpiarRuidoPaginacion(texto: string): string {
  return texto
    .replace(/\f/g, '\n')
    .replace(/^\s*www\.poderjudicial\.gob\.hn\s*$/gim, '')
    .replace(/^[ \t]*\d{1,4}[ \t]*$/gm, '')
    // BUG real #10: encabezados de subsección con numeral romano PEGADO a
    // un punto y sin espacio ("II.DE LOS INSTRUMENTOS O DOCUMENTOS
    // PRIVADOS", "III.REGLAS RELATIVAS A LA EDAD") -- verificado: 2 casos
    // en toda la fuente, ambos en línea propia fuertemente indentada
    // (centrada). No los reconoce PATRON_LIMITE_SEGMENTACION porque ese
    // patrón exige la palabra "SECCIÓN" -- esta fuente, en estos dos
    // puntos, solo imprime el numeral. Se descartan aquí como el resto
    // del ruido estructural (igual que Libro/Título/Capítulo/Sección, que
    // tampoco se preservan en ningún metadata -- ver scripts/ingesta-cpp.ts).
    .replace(/^[ \t]*[IVXLCDM]+\.[A-ZÁÉÍÓÚÑ][^\n]*$/gm, '')
    .replace(/(\p{L})-\n\s*\n?\s*(\p{Ll})/gu, '$1$2')
    .replace(/(\p{L})- (\p{Ll})/gu, '$1$2')
    .replace(/[ \t]+(?=\n)/g, '')
    .replace(/\n{3,}/g, '\n\n');
}

// ── 5. Segmentación (sin bis-letras — más simple que el CPP) ───────────
const NUMERAL_ESTRUCTURAL =
  '(?:[IVXLCDM]+\\b|[UÚ]NIC[OA]\\b|PRIMER[OA]\\b|SEGUND[OA]\\b|TERCER[OA]\\b|CUART[OA]\\b|QUINT[OA]\\b|SEXT[OA]\\b|S[ÉE]PTIM[OA]\\b|OCTAV[OA]\\b|NOVEN[OA]\\b|D[ÉE]CIM[OA]\\b|FINAL\\b)';
// BUG real #5: no todos los encabezados de artículo llevan punto o guion
// tras el número -- verificado: "Artículo 126 Derogado" (sin punto),
// "Artículo 523 La sentencia..." (sin punto) conviven en la misma fuente
// con la forma normal "Artículo 1381." (con punto). El terminador ahora
// acepta punto/guion O simplemente un espacio (fin del token numérico).
//
// BUG real #6: no todo encabezado real empieza al inicio de línea --
// verificado: "...pondrán fin a ella. Artículo 565. La demencia..." trae
// el encabezado A MITAD DE LÍNEA porque `pdftotext -layout` no rompió ahí.
// La rama de "Artículo" ya NO exige `^[ \t]*` -- puede matchear en
// cualquier posición; esLimiteReal() es quien decide si es un límite real
// o una referencia cruzada, igual que en scripts/ingesta-cpp.ts. La rama
// estructural (LIBRO/TÍTULO/CAPÍTULO/SECCIÓN) SÍ mantiene el anclaje de
// inicio de línea -- esos encabezados, cuando son reales, siempre abren
// línea propia en esta fuente.
const PATRON_LIMITE_SEGMENTACION = new RegExp(
  `(?:Art[ií]culos?\\s*(\\d+)\\s*[Oo]?\\s*(?:[.\\-]|(?=\\s))|^[ \\t]*(?:LIBRO|T[IÍ]TULO|CAP[IÍ]TULO|SECCI[OÓ]N)\\s+${NUMERAL_ESTRUCTURAL})`,
  'gm',
);

interface CoincidenciaBruta {
  num: string | undefined;
  inicio: number;
  fin: number; // fin del propio encabezado matcheado (num[.\-]  o estructural)
}

function recolectarCoincidencias(texto: string): CoincidenciaBruta[] {
  const coincidencias = [...texto.matchAll(PATRON_LIMITE_SEGMENTACION)];
  return coincidencias.map((c) => ({ num: c[1], inicio: c.index ?? 0, fin: (c.index ?? 0) + c[0].length }));
}

// BUG real #9: una referencia cruzada a mitad de oración puede caer justo
// después de una línea en blanco espuria de `-layout` (salto de página o
// justificado raro), colando la regla (b) de esLimiteReal -- verificado:
// "...treinta (30) días que en el\n\nArtículo 574 se prescribe." (nótese
// la línea en blanco entre "el" y "Artículo 574", pese a ser una sola
// oración). Filtro adicional, aplicado SOLO a encabezados de "Artículo"
// (num !== undefined): el contenido inmediatamente después del número
// debe empezar en MAYÚSCULA (o dígito) -- norma de redacción constante en
// esta fuente para el arranque real de un artículo ("Artículo 574. Las
// excusas...", "Artículo 126 Derogado"); una referencia cruzada, en
// cambio, continúa en minúscula ("574 se prescribe.").
function contenidoEmpiezaEnMayuscula(texto: string, fin: number): boolean {
  let p = fin;
  while (p < texto.length && /\s/.test(texto[p])) p++;
  const ch = texto[p];
  if (ch === undefined) return false;
  if (/\p{Ll}/u.test(ch)) return false; // minúscula -> NO es un arranque real
  return true; // mayúscula, dígito, o cualquier otro carácter no-minúscula
}

// Idéntica lógica que scripts/ingesta-cpp.ts::esLimiteReal -- ver
// justificación extensa allí. Reutilizada tal cual (no reimportada, para
// no acoplar este archivo a constantes internas del CPP) porque el mismo
// problema de fondo aplica aquí: `pdftotext -layout` puede envolver una
// referencia cruzada a mitad de oración ("...conforme el artículo 2284,
// y...") justo al inicio de una línea de columna.
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

  // Rule (f) -- BUG real #7: un encabezado estructural (TÍTULO/CAPÍTULO)
  // puede caer "flotando" a mitad de la MISMA línea que el cierre de un
  // artículo derogado, separado por un hueco de columna de `-layout`
  // (2+ espacios) -- verificado: "Artículo 381. Derogado      TÍTULO
  // XVII\nArtículo 382. Derogado  DE LOS ALIMENTOS". Sin esta regla,
  // "Artículo 382" quedaba absorbido como contenido del Art.381 porque el
  // límite real quedaba "escondido" tras ese encabezado flotante. Se
  // detecta exigiendo 2+ espacios seguidos de un tramo en MAYÚSCULAS
  // hasta el punto de corte -- la misma señal tipográfica que ya usa la
  // regla (d), pero sin exigir que TODA la línea sea mayúscula.
  const mHueco = texto.slice(0, j).match(/ {2,}([\p{Lu}\d ]+)$/u);
  if (mHueco) {
    const soloLetrasHueco = mHueco[1].replace(/[^\p{L}]/gu, '');
    if (soloLetrasHueco.length > 0 && soloLetrasHueco === soloLetrasHueco.toUpperCase()) {
      return true;
    }
  }

  return false;
}

// Complemento de la regla (f) de esLimiteReal: aquella regla decide que un
// encabezado flotante ("...Derogado      TÍTULO XVII") NO bloquea que el
// SIGUIENTE artículo cuente como límite real, pero no borra el fragmento
// flotante en sí -- ese fragmento queda como cola dentro del contenido del
// artículo ANTERIOR ("Artículo 381. Derogado      TÍTULO XVII14"), y
// contaminaría la validación fail-hard (que exige contenido EXACTO
// "Derogado" para los artículos del set FALSE). Se limpia aquí con la
// misma señal tipográfica (2+ espacios + tramo en mayúsculas hasta fin de
// línea) -- verificado contra los dos casos reales de esta fuente: la cola
// "TÍTULO XVII" en Art.381 y la cola "DE LOS ALIMENTOS" en Art.382.
export function limpiarEncabezadosFlotantes(contenido: string): string {
  return contenido
    .replace(/ {2,}[\p{Lu}][\p{Lu}\d ]*$/gmu, '')
    .replace(/[ \t]+$/gm, '')
    .trim();
}

export function segmentarArticulos(textoLimpio: string): ArticuloExtraido[] {
  const crudas = recolectarCoincidencias(textoLimpio);
  const filtradas = crudas.filter(
    (c) => esLimiteReal(textoLimpio, c.inicio) && (c.num === undefined || contenidoEmpiezaEnMayuscula(textoLimpio, c.fin)),
  );
  const articulos: ArticuloExtraido[] = [];
  for (let i = 0; i < filtradas.length; i++) {
    if (filtradas[i].num === undefined) continue;
    const fin = filtradas[i + 1]?.inicio ?? textoLimpio.length;
    const contenido = limpiarEncabezadosFlotantes(textoLimpio.slice(filtradas[i].inicio, fin).trim());
    articulos.push({ numArticulo: filtradas[i].num!, contenido });
  }
  return colapsarDuplicadosIdenticos(articulos);
}

// BUG real #4 encontrado en la primera corrida: el propio PDF fuente
// imprime el Art.1381 DOS VECES consecutivas, con texto byte-a-byte
// idéntico ("Se tendrá por cumplida la condición cuando el obligado
// impidiere voluntariamente su cumplimiento.") -- verificado contra la
// salida cruda de pdftotext, líneas 9059 y 9062 de la extracción directa:
// es una duplicación de IMPRENTA de la fuente, no un artefacto de este
// script. Se colapsa a UNA sola fila SOLO cuando dos ocurrencias
// CONSECUTIVAS del mismo número tienen contenido idéntico tras recortar
// espacios -- si el contenido difiere, NO se colapsa (fail-hard más abajo
// sigue abortando, porque eso sí requeriría juicio humano, no una fusión
// mecánica).
export function colapsarDuplicadosIdenticos(articulos: ArticuloExtraido[]): ArticuloExtraido[] {
  const out: ArticuloExtraido[] = [];
  for (const a of articulos) {
    const anterior = out[out.length - 1];
    if (anterior && anterior.numArticulo === a.numArticulo && anterior.contenido.trim() === a.contenido.trim()) {
      console.warn(`⚠️  Art. ${a.numArticulo}: duplicado de imprenta en la fuente (contenido idéntico) — colapsado a una sola fila`);
      continue;
    }
    out.push(a);
  }
  return out;
}

// ── 6. Los 16 stubs no impresos (Arts. 21-36) ───────────────────────────
// NO se extraen del PDF (no están impresos). Se sintetizan aquí, literal,
// sin inventar contenido histórico. Por instrucción expresa: "no inventar
// texto viejo".
export const STUBS_NO_IMPRESOS = Array.from({ length: 16 }, (_, i) => 21 + i); // 21..36

export function sintetizarStubs(): ArticuloExtraido[] {
  return STUBS_NO_IMPRESOS.map((n) => ({
    numArticulo: String(n),
    contenido: `Artículo ${n}. Derogado`,
  }));
}

// ── 7. Set de vigencia cerrado (dictamen del CLO) ───────────────────────
// COPIADO TAL CUAL del dictamen -- no reordenar, no "optimizar", no fundir
// rangos. Cada entrada cita el decreto tal como consta en la nota al pie
// adosada al artículo (no en el apéndice-resumen, ver advertencia de
// cabecera sobre la discrepancia del Art.511).
interface RangoFalse {
  desde: number;
  hasta: number;
  excepto?: number[];
  decreto: string;
}

export const FALSE_RANGOS: RangoFalse[] = [
  { desde: 21, hasta: 36, decreto: 'D.35-2013' }, // stubs, no impresos
  { desde: 47, hasta: 48, decreto: 'D.35-2013' },
  { desde: 68, hasta: 68, decreto: 'D.35-2013' },
  { desde: 78, hasta: 78, decreto: 'D.35-2013' },
  { desde: 79, hasta: 79, decreto: 'D.35-2013' },
  { desde: 94, hasta: 237, excepto: [234], decreto: 'D.35-2013' },
  { desde: 238, hasta: 247, decreto: 'D.35-2013' },
  { desde: 249, hasta: 249, decreto: 'D.35-2013' },
  { desde: 262, hasta: 262, decreto: 'D.35-2013' },
  { desde: 276, hasta: 409, excepto: [331, 343], decreto: 'D.35-2013' },
  { desde: 427, hasta: 427, decreto: 'D.35-2013' },
  { desde: 432, hasta: 433, decreto: 'D.35-2013' },
  { desde: 965, hasta: 970, decreto: 'D.35-2013' },
  { desde: 513, hasta: 515, decreto: 'D.211-2006' },
  { desde: 517, hasta: 517, decreto: 'D.211-2006' },
  { desde: 1495, hasta: 1538, decreto: 'D.211-2006' },
  { desde: 2158, hasta: 2158, decreto: 'D.211-2006' },
  { desde: 2367, hasta: 2367, decreto: 'D.211-2006' },
  { desde: 1565, hasta: 1565, decreto: 'D.51-2011' },
  { desde: 2019, hasta: 2020, decreto: 'D.161-2000' },
  { desde: 2322, hasta: 2322, decreto: 'D.69/1937' },
];

// Constantes fail-hard congeladas por el dictamen. Si el conteo real no
// cierra contra estas cifras, el script ABORTA -- no se "arregla" el set
// para que cierre.
export const TOTAL_ESPERADO = 2372;
export const TRUE_ESPERADO = 2001;
export const FALSE_ESPERADO = 371;

export function construirSetFalse(): Map<number, string> {
  const mapa = new Map<number, string>();
  for (const r of FALSE_RANGOS) {
    for (let n = r.desde; n <= r.hasta; n++) {
      if (r.excepto?.includes(n)) continue;
      if (mapa.has(n)) {
        fallarDuro(`FALSE_RANGOS tiene un solapamiento: el Art.${n} aparece en más de un rango (¿decretos distintos citando el mismo artículo? revisar el dictamen)`);
      }
      mapa.set(n, r.decreto);
    }
  }
  if (mapa.size !== FALSE_ESPERADO) {
    fallarDuro(`FALSE_RANGOS expandido da ${mapa.size} artículos, se esperaban exactamente ${FALSE_ESPERADO} — el dictamen y esta tabla no coinciden, no ajustar sin volver a revisar el dictamen`);
  }
  for (const n of STUBS_NO_IMPRESOS) {
    if (!mapa.has(n)) fallarDuro(`Art.${n} es un stub no impreso pero no aparece en FALSE_RANGOS — inconsistencia interna`);
  }
  return mapa;
}

// ── 8. Validación de integridad de la extracción (antes de fusionar stubs) ─
// Se espera EXACTAMENTE {1..2372} \ {21..36} = 2356 artículos extraídos del
// PDF, sin huecos adicionales y sin duplicados. Cualquier otro hueco (fuera
// de 21-36) es un fallo de segmentación, no un hueco legítimo de la fuente
// -- ver cierre forense del turno anterior (los 5 "huecos" que aparecieron
// en el primer barrido automático, 126/523/1369/1396/1508, resultaron ser
// falsos positivos de un regex demasiado estricto, no huecos reales).
export function validarIntegridadExtraccion(articulos: ArticuloExtraido[]): void {
  const nums = articulos.map((a) => Number(a.numArticulo));
  const set = new Set(nums);
  if (set.size !== nums.length) {
    const vistos = new Set<number>();
    const duplicados: number[] = [];
    for (const n of nums) { if (vistos.has(n)) duplicados.push(n); vistos.add(n); }
    fallarDuro(`artículos duplicados tras la segmentación: ${[...new Set(duplicados)].join(', ')}`);
  }
  const esperados = new Set<number>();
  for (let n = 1; n <= TOTAL_ESPERADO; n++) if (!STUBS_NO_IMPRESOS.includes(n)) esperados.add(n);
  const faltantes = [...esperados].filter((n) => !set.has(n));
  if (faltantes.length > 0) {
    fallarDuro(`faltan artículos en la extracción (fuera del hueco esperado 21-36): ${faltantes.slice(0, 30).join(', ')}${faltantes.length > 30 ? '…' : ''} (total ${faltantes.length})`);
  }
  const inesperados = [...set].filter((n) => !esperados.has(n));
  if (inesperados.length > 0) {
    fallarDuro(`la extracción produjo artículos fuera de 1..${TOTAL_ESPERADO} o dentro del hueco 21-36 (no deberían existir en el PDF): ${inesperados.slice(0, 30).join(', ')}`);
  }
  if (nums.length !== TOTAL_ESPERADO - STUBS_NO_IMPRESOS.length) {
    fallarDuro(`total de artículos extraídos (${nums.length}) no coincide con el esperado (${TOTAL_ESPERADO - STUBS_NO_IMPRESOS.length} = ${TOTAL_ESPERADO} - ${STUBS_NO_IMPRESOS.length} stubs)`);
  }
}

// ── 9. Control de calidad fail-hard sobre cada fragmento ────────────────
// Incluye la validación CRUZADA contra el set cerrado: un artículo FALSE
// (no-stub) debe decir "Derogado" en su cuerpo; un artículo TRUE NUNCA debe
// decir solo "Derogado" -- si el set cerrado y el contenido real
// discrepan, el script aborta (ver advertencia de cabecera sobre Art.511).
export function contenidoSinEncabezado(contenido: string): string {
  // Mismo terminador relajado que PATRON_LIMITE_SEGMENTACION -- punto,
  // guion, o simplemente el fin del token numérico (ver BUG real #5).
  return contenido.replace(/^Art[ií]culos?\s*\d+\s*[Oo]?\s*(?:[.\-]\s*|\s+)/, '').trim();
}

export function validarFragmentoFailHard(numArticulo: string, contenido: string, esFalseCerrado: boolean): void {
  const num = Number(numArticulo);
  const esStub = STUBS_NO_IMPRESOS.includes(num);
  const cuerpo = contenidoSinEncabezado(contenido);
  const esDerogadoLiteral = /^Derogado\.?$/.test(cuerpo);

  if (!esStub) {
    if (contenido.length < 10) {
      fallarDuro(`Art. ${numArticulo}: contenido sospechosamente corto (${contenido.length} caracteres) — posible segmentación fallida`);
    }
    if (contenido.length > 25000) {
      fallarDuro(`Art. ${numArticulo}: contenido sospechosamente largo (${contenido.length} caracteres) — posible fallo de segmentación`);
    }
    if (/Reformado por Decreto|Adicionado por Decreto|Derogado por Decreto|www\.poderjudicial/i.test(contenido)) {
      fallarDuro(`Art. ${numArticulo}: quedó texto de una nota al pie o de pie de página sin depurar dentro del contenido`);
    }
    const controlMatch = contenido.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/);
    if (controlMatch) {
      fallarDuro(`Art. ${numArticulo}: quedó un carácter de control sin limpiar dentro del contenido`);
    }
    if (!new RegExp(`^Art[ií]culos?\\s*${numArticulo}\\b`, 'i').test(contenido)) {
      fallarDuro(`Art. ${numArticulo}: el contenido no comienza con su propio encabezado`);
    }
  }

  // ── Validación cruzada set-cerrado vs. contenido real ──
  if (esFalseCerrado && !esStub && !esDerogadoLiteral) {
    fallarDuro(`Art. ${numArticulo}: el dictamen lo marca FALSE (derogado) pero su contenido NO es literalmente "Derogado" — el set cerrado y la fuente real discrepan, revisar antes de continuar (no ajustar el set automáticamente)`);
  }
  if (!esFalseCerrado && esDerogadoLiteral) {
    fallarDuro(`Art. ${numArticulo}: el contenido dice "Derogado" pero el dictamen NO lo tiene en el set FALSE — posible hueco en el set cerrado (ver el caso Art.511/553/2141 documentado en la cabecera; si es uno de esos tres, es la excepción ya firmada y este check no debería dispararse)`);
  }
}

// ── 10. Contrato de columnas biblioteca_vectores ────────────────────────
export interface RegistroCanonicoCivil {
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
  'pdftotext -layout -enc UTF-8 + eliminación de 43 notas al pie + limpieza de ruido de paginación + segmentación + validación fail-hard cruzada contra el set de vigencia cerrado del dictamen (scripts/ingesta-civil.ts) — PENDIENTE de verificación manual humana artículo por artículo antes de ingesta real. Script NO ejecutado en la sesión que lo escribió.';

export function construirRegistro(a: ArticuloExtraido, setFalse: Map<number, string>): RegistroCanonicoCivil {
  const num = Number(a.numArticulo);
  const esStub = STUBS_NO_IMPRESOS.includes(num);
  const decretoDerogatoria = setFalse.get(num);
  const esFalse = decretoDerogatoria !== undefined;

  const metadata: Record<string, unknown> = {
    instrumento: INSTRUMENTO,
    decreto_habilitante_anc: DECRETO_HABILITANTE_ANC,
    norm_id: NORM_ID,
    tipo_instrumento: 'codigo',
    edicion_fuente: EDICION_FUENTE,
    metodo_extraccion: METODO_EXTRACCION,
    hash_texto_sha256: sha256(a.contenido),
    verificado: false,
    fecha_verificacion: null,
  };

  if (esStub) {
    metadata.stub_no_impreso = true;
    metadata.nota_stub = 'Artículo no impreso en la edición consolidada fuente — solo consta en la nota al pie 1 como derogado por D.35-2013. Contenido sintetizado, no se inventa texto histórico.';
  }

  if (esFalse) {
    metadata.estado_articulo = 'DEROGADO';
    metadata.derogado_por = decretoDerogatoria;
  }

  return {
    id: `mayalex_normativos:cc_1906_a${num}`,
    fuente: FUENTE_CANONICA,
    materia: MATERIA,
    num_articulo: a.numArticulo,
    es_norma_vigente: !esFalse,
    jurisdiccion: 'HN',
    fuente_tipo: 'codigo',
    coleccion: 'mayalex_normativos',
    metadata,
    contenido: a.contenido,
  };
}

// ── 11. Ensamble del pipeline completo ──────────────────────────────────
export interface ResultadoPipelineCivil {
  articulos: ArticuloExtraido[]; // extraídos + 16 stubs sintetizados, 2372 total
  registros: RegistroCanonicoCivil[];
  notas: NotaAlPie[];
}

export function ejecutarPipelineCompleto(): ResultadoPipelineCivil {
  const textoCrudo = extraerTextoPDF(PDF_FUENTE);
  const cuerpoAcotado = acotarCuerpoDispositivo(textoCrudo);
  const cuerpoNormalizado = corregirExcepcionesPuntuales(normalizarTexto(cuerpoAcotado));

  const { notas, spans } = detectarNotasAlPie(cuerpoNormalizado);
  const numerosValidos = new Set(notas.map((n) => n.num));
  const sinNotas = eliminarSpans(cuerpoNormalizado, spans);
  const sinMarcadores = limpiarMarcadoresInline(sinNotas, numerosValidos);
  const textoLimpio = limpiarRuidoPaginacion(sinMarcadores);

  const extraidos = segmentarArticulos(textoLimpio);
  validarIntegridadExtraccion(extraidos);

  const stubs = sintetizarStubs();
  const articulos = [...extraidos, ...stubs].sort((a, b) => Number(a.numArticulo) - Number(b.numArticulo));

  if (articulos.length !== TOTAL_ESPERADO) {
    fallarDuro(`total tras fusionar stubs: ${articulos.length}, se esperaban ${TOTAL_ESPERADO}`);
  }

  const setFalse = construirSetFalse();
  for (const a of articulos) {
    const num = Number(a.numArticulo);
    validarFragmentoFailHard(a.numArticulo, a.contenido, setFalse.has(num));
  }

  const registros = articulos.map((a) => construirRegistro(a, setFalse));

  const totalTrue = registros.filter((r) => r.es_norma_vigente).length;
  const totalFalse = registros.filter((r) => !r.es_norma_vigente).length;
  if (totalTrue !== TRUE_ESPERADO) {
    fallarDuro(`TRUE real (${totalTrue}) != TRUE_ESPERADO (${TRUE_ESPERADO})`);
  }
  if (totalFalse !== FALSE_ESPERADO) {
    fallarDuro(`FALSE real (${totalFalse}) != FALSE_ESPERADO (${FALSE_ESPERADO})`);
  }
  if (totalTrue + totalFalse !== TOTAL_ESPERADO) {
    fallarDuro(`TRUE + FALSE (${totalTrue + totalFalse}) != TOTAL_ESPERADO (${TOTAL_ESPERADO})`);
  }

  return { articulos, registros, notas };
}

// ── 12. Declaración (NO ejecución) de la forma del SQL de staging ──────
// A diferencia de scripts/ingesta-cpp.ts, este bloque NO trae ningún
// DELETE -- el Civil no tiene ninguna fila previa que reemplazar, y no se
// autoriza tocar las filas existentes de materia='02_CIVIL' (CPC mal
// etiquetado + instrumentos notariales, problema aparte). Tampoco trae
// INSERTs reales: esos requieren embeddings, que este script no genera
// (esa es tarea de un futuro scripts/insertar-civil.ts, no autorizado en
// este turno).
export function declararFormaSQL(totalFilas: number): string {
  return `-- ESTRATEGIA DECLARADA -- NO EJECUTADA --
-- Ingesta aditiva pura del Código Civil (Decreto del Poder Ejecutivo,
-- 8 de febrero de 1906) hacia biblioteca_vectores -- ${totalFilas} filas.
-- SIN DELETE: no se toca ninguna fila existente de materia='02_CIVIL'.
-- Fase posterior (no este turno): scripts/insertar-civil.ts genera los
-- embeddings reales (intfloat/multilingual-e5-small, 384 dims) y produce
-- el archivo .sql definitivo con los INSERT reales -- este bloque es solo
-- la forma de la transacción, para dictamen del CLO.

DROP TABLE IF EXISTS stg_cc_1906_ingesta;
CREATE TABLE stg_cc_1906_ingesta (
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

-- (aquí van los INSERT en lotes hacia stg_cc_1906_ingesta, generados por
--  scripts/insertar-civil.ts en la fase posterior -- omitidos en esta
--  declaración porque este turno no genera embeddings reales)

DO $$
DECLARE rc integer;
BEGIN
  -- SIN DELETE previo -- ingesta puramente aditiva.
  INSERT INTO biblioteca_vectores (id, coleccion, materia, contenido, num_articulo, fuente, metadata, embedding, jurisdiccion, fuente_tipo, es_norma_vigente)
  SELECT id, coleccion, materia, contenido, num_articulo, fuente, metadata, embedding, jurisdiccion, fuente_tipo, es_norma_vigente
  FROM stg_cc_1906_ingesta;

  GET DIAGNOSTICS rc = ROW_COUNT;
  IF rc != ${totalFilas} THEN
    RAISE EXCEPTION 'ABORT: expected ${totalFilas} rows inserted, got %', rc;
  END IF;
END $$;

DROP TABLE stg_cc_1906_ingesta;
`;
}

// ── 13. Artefactos locales (json/txt/sql) — out/ es gitignored ─────────
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'out', 'ingesta-civil');

function escribirArtefactos(resultado: ResultadoPipelineCivil): void {
  mkdirSync(OUT_DIR, { recursive: true });

  const rutaJSON = join(OUT_DIR, 'registros.json');
  writeFileSync(rutaJSON, JSON.stringify(resultado.registros, null, 2), 'utf8');

  const vigentes = resultado.registros.filter((r) => r.es_norma_vigente);
  const derogados = resultado.registros.filter((r) => !r.es_norma_vigente);
  const stubs = resultado.registros.filter((r) => r.metadata.stub_no_impreso === true);
  const porDecreto = new Map<string, number>();
  for (const r of derogados) {
    const d = String(r.metadata.derogado_por ?? '?');
    porDecreto.set(d, (porDecreto.get(d) ?? 0) + 1);
  }

  let txt = '=== Ingesta Código Civil (Decreto Poder Ejecutivo, 8 feb 1906) — QC report ===\n\n';
  txt += `PDF fuente: ${PDF_FUENTE}\n`;
  txt += `Fuente canónica: ${FUENTE_CANONICA}\n\n`;
  txt += `TOTAL:    ${resultado.registros.length}\n`;
  txt += `TRUE:     ${vigentes.length}\n`;
  txt += `FALSE:    ${derogados.length} (incluye ${stubs.length} stubs no impresos, Arts. 21-36)\n\n`;
  txt += '=== FALSE por decreto ===\n';
  for (const [d, c] of [...porDecreto.entries()].sort()) txt += `  ${d}: ${c}\n`;
  txt += '\n=== Notas al pie detectadas ===\n';
  for (const n of resultado.notas) txt += `[${n.num}] ${n.texto}\n`;
  const rutaTXT = join(OUT_DIR, 'reporte-qc.txt');
  writeFileSync(rutaTXT, txt, 'utf8');

  const rutaSQL = join(OUT_DIR, 'forma-declarada.sql');
  writeFileSync(rutaSQL, declararFormaSQL(resultado.registros.length), 'utf8');

  console.log(`\nArtefactos locales escritos en ${OUT_DIR}:`);
  console.log(`  - registros.json (${resultado.registros.length} filas)`);
  console.log(`  - reporte-qc.txt`);
  console.log(`  - forma-declarada.sql (declarado, NO ejecutado)`);
}

// ── main ─────────────────────────────────────────────────────────────────
function main() {
  console.log('=== Preparación de ingesta canónica — Código Civil (Decreto del Poder Ejecutivo, 8 de febrero de 1906) ===');
  console.log(`Fuente PDF: ${PDF_FUENTE}\n`);

  const resultado = ejecutarPipelineCompleto();
  const errPII = validarSinDatosPrivados(resultado.articulos);
  if (errPII) fallarDuro(errPII);

  const vigentes = resultado.registros.filter((r) => r.es_norma_vigente);
  const derogados = resultado.registros.filter((r) => !r.es_norma_vigente);

  console.log(`✅ Fail-hard QC superado — ${resultado.registros.length}/${TOTAL_ESPERADO} fragmentos.`);
  console.log(`   TOTAL:    ${resultado.registros.length}`);
  console.log(`   TRUE:     ${vigentes.length}`);
  console.log(`   FALSE:    ${derogados.length} (incluye ${STUBS_NO_IMPRESOS.length} stubs no impresos)\n`);

  escribirArtefactos(resultado);

  console.log(
    '\n🔒 CERO escrituras SQL ejecutadas, CERO embeddings generados — este script no importa ningún cliente de Supabase, no abre conexión de red, y termina aquí. Pendiente de dictamen y aprobación formal del CLO antes de cualquier scripts/insertar-civil.ts.',
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
