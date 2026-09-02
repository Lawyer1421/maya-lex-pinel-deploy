/**
 * scripts/ingesta-d102-2018.ts
 * Preparación LOCAL (staging, sin red) de los primeros 5 artículos del
 * Decreto No. 102-2018 (Ley Especial de Adopciones de Honduras), para
 * dictamen previo del CLO antes de cualquier ingesta real.
 *
 * Ejecutar: npx tsx scripts/ingesta-d102-2018.ts
 *
 * CERO ESCRITURAS: este script no importa ningún cliente de Supabase, no
 * abre conexión de red, y no tiene ninguna vía hacia thgrhueckkjdutjvcufp.
 * Solo lee un PDF local y escribe a stdout.
 *
 * Fuente documental (verificada localmente, 2026-09-02):
 *   C:\Users\Fredy\OneDrive\SISTEMA_LEGAL_PRINCIPAL\00_ARCHIVOS_VARIOS\
 *   Biblioteca_Personal\Ley-Especial-de-Adopciones-DINAF.pdf
 *   — publicación oficial de DINAF (Dirección de Niñez, Adolescencia y
 *   Familia), primera edición agosto 2019, texto íntegro del Decreto
 *   No. 102-2018. Extraído con `pdftotext -layout -enc UTF-8` — mismo
 *   método ya registrado en producción para la fila
 *   manual_curado:cpp_honduras:articulo_173 (ver DECISION_LOG.md).
 *   (Había un segundo archivo candidato, ADOPCION.pdf, en la misma
 *   carpeta — descartado: 23 KB / 89 líneas de texto, es un resumen, no
 *   el texto íntegro del decreto.)
 *
 * ⚠ DISCREPANCIA DE METADATOS — PENDIENTE DE DICTAMEN DEL CLO:
 *   La directiva especificó fecha_gaceta="2019-01-21" y
 *   publicacion="La Gaceta No. 34,851". El pie de página del propio
 *   Decreto (DINAF, pág. 9) dice textualmente: "Publicado en el Diario
 *   Oficial La Gaceta núm. 34,841 del 10 de enero de 2019" — número de
 *   Gaceta Y fecha distintos de los indicados en la directiva. Este
 *   script emite el valor VERIFICADO contra la fuente primaria, nunca el
 *   de la directiva sin verificar — no se fabrica ni se asume cuál de
 *   los dos está equivocado. Ambos valores se imprimen al final, uno
 *   junto al otro, para que el CLO resuelva la discrepancia.
 *
 * ⚠ NOMBRE DE COLUMNA: la directiva pide "numero_articulo"; la columna
 *   real verificada en `biblioteca_vectores` (auditoría 2026-09-02) es
 *   `num_articulo`. Este script usa el nombre real de columna para que
 *   estos registros sean insertables tal cual el día que se autorice.
 *
 * ⚠ SEGMENTACIÓN — por qué este script NO reutiliza
 *   segmentarPorArticulo() de lib/ingesta-oficial/extraccion.ts tal
 *   cual: ese segmentador genérico corta por cualquier línea que
 *   empiece con "Artículo N". El texto real de este decreto contiene,
 *   dentro del propio Artículo 5 (Definiciones), una referencia cruzada
 *   que el ajuste de línea del PDF deja como línea propia: "Artículo 15
 *   de la presente Ley." (línea 348 del texto extraído). El segmentador
 *   genérico la tomaría como un encabezado de artículo nuevo, truncando
 *   el Artículo 5 real y creando un "Artículo 15" espurio. Los
 *   encabezados reales de este documento siempre traen ".-" pegado al
 *   número ("Artículo 1.- Objeto..."); las referencias cruzadas nunca
 *   ("Artículo 15 de la presente Ley."). Este script segmenta con esa
 *   distinción explícita — si esa convención cambiara en un futuro
 *   re-procesamiento, el control de conteo de abajo (exactamente
 *   ['1','2','3','4','5']) lo detendría en seco de todos modos.
 */
import { execFileSync } from 'node:child_process';
import { sha256 } from '../lib/ingesta-oficial/hash';
import { normalizarTexto } from '../lib/ingesta-oficial/extraccion';
import { validarSinDatosPrivados } from '../lib/ingesta-oficial/validaciones';
import type { ArticuloExtraido } from '../lib/ingesta-oficial/types';

const PDF_FUENTE =
  'C:/Users/Fredy/OneDrive/SISTEMA_LEGAL_PRINCIPAL/00_ARCHIVOS_VARIOS/Biblioteca_Personal/Ley-Especial-de-Adopciones-DINAF.pdf';

const FUENTE_CANONICA = 'Ley Especial de Adopciones de Honduras (Decreto 102-2018)';
const MATERIA = '06_FAMILIA';
const NUM_ARTICULOS_ESPERADOS = ['1', '2', '3', '4', '5'];

const GACETA_VERIFICADA_CONTRA_PDF = {
  fecha_gaceta: '2019-01-10',
  publicacion: 'La Gaceta núm. 34,841',
};
const GACETA_SEGUN_DIRECTIVA_CLO = {
  fecha_gaceta: '2019-01-21',
  publicacion: 'La Gaceta No. 34,851',
};

function fallarDuro(motivo: string): never {
  console.error(`\n🛑 FAIL-HARD: ${motivo}\n`);
  process.exit(1);
}

// ── 1. Extracción real del PDF ──────────────────────────────────────────
function extraerTextoPDF(rutaPdf: string): string {
  try {
    return execFileSync('pdftotext', ['-layout', '-enc', 'UTF-8', rutaPdf, '-'], {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch (err) {
    fallarDuro(`no se pudo extraer texto de ${rutaPdf}: ${(err as Error).message}`);
  }
}

// ── 2. Acotar al cuerpo dispositivo real del Decreto ────────────────────
// CRÍTICO: los "CONSIDERANDO" del preámbulo citan Artículo 59/111/116 de
// la Constitución y Artículo 21 de la Convención de los Derechos del
// Niño — si se segmentara el documento completo esas referencias se
// confundirían con artículos propios del Decreto 102-2018. Se acota al
// tramo real "Decreta ... Capítulo I ... Capítulo II" antes de segmentar,
// y el "Capítulo II" se busca DESPUÉS de "Decreta" (el índice, al inicio
// del PDF, también contiene la cadena "Capítulo II" y produciría un
// corte prematuro si se buscara sobre el documento completo).
function acotarCuerpoDispositivo(textoCrudo: string): string {
  const inicioDecreta = textoCrudo.search(/Por tanto,\s*Decreta/i);
  if (inicioDecreta === -1) {
    fallarDuro('no se encontró la cláusula "Por tanto, Decreta" — el documento fuente pudo haber cambiado de formato');
  }
  const tramoDesdeDecreta = textoCrudo.slice(inicioDecreta);
  const finRelativo = tramoDesdeDecreta.search(/Cap[ií]tulo\s+II\b/);
  if (finRelativo === -1) {
    fallarDuro('no se encontró el encabezado "Capítulo II" después de "Decreta" — el documento fuente pudo haber cambiado de formato');
  }
  return tramoDesdeDecreta.slice(0, finRelativo);
}

// ── 3. Limpieza específica de esta edición impresa (ruido DINAF) ───────
// Aplicada ANTES de normalizarTexto() del pipeline compartido — ese es
// genérico y determinístico, pero no conoce los encabezados/pies de
// página específicos de esta edición.
function limpiarRuidoDINAF(texto: string): string {
  return texto
    // Salto de página del PDF (form feed, 0x0C) — pdftotext lo inserta
    // entre páginas; no es contenido, es un artefacto de paginación.
    .replace(/\f/g, '\n')
    // Pie de página: "DINAF | 13"
    .replace(/^\s*DINAF\s*\|\s*\d+\s*$/gim, '')
    // Encabezado: "14 | Ley Especial de Adopciones"
    .replace(/^\s*\d+\s*\|\s*Ley Especial de Adopciones\s*$/gim, '')
    // Artefacto marginal del libro impreso (pestaña de sección temática
    // "A: Acuerdos y Leyes"), embebido a mitad de línea — no es parte
    // del texto legal. Solo consume espacio HORIZONTAL alrededor (\s
    // también empareja saltos de línea y se comía el salto en blanco
    // real que separa el párrafo siguiente -- detectado comparando
    // contra una transcripción manual de control del Art. 5).
    .replace(/[ \t]*A Acuerdos y Leyes[ \t]*/g, ' ')
    // Repara guiones de corte de línea del PDF ("fa-\nmilia" ->
    // "familia"), incluso con una línea en blanco de por medio
    // ("adopta-\n\n    bilidad" -> "adoptabilidad"). Solo une cuando la
    // continuación empieza en minúscula, para no fusionar enumeraciones
    // numeradas ("1)", "2)") con la palabra siguiente.
    .replace(/(\p{L})-\n\s*\n?\s*(\p{Ll})/gu, '$1$2')
    // Colapsa el hueco en blanco que dejan el form feed y las líneas de
    // encabezado/pie/artefacto ya removidas arriba, y recorta espacios
    // horizontales colgantes que esas mismas remociones dejan antes de
    // un salto de línea (ej. "hijo. \n\n" -> "hijo.\n\n").
    .replace(/[ \t]+(?=\n)/g, '')
    .replace(/\n{3,}/g, '\n\n');
}

// ── 4. Segmentación estricta específica de este documento ──────────────
const PATRON_ARTICULO_D102_2018 = /^\s*Art[ií]culo\s+(\d+)\.-\s*(.*)$/gim;

function segmentarArticulosD102(textoNormalizado: string): ArticuloExtraido[] {
  const coincidencias = [...textoNormalizado.matchAll(PATRON_ARTICULO_D102_2018)];
  const articulos: ArticuloExtraido[] = [];
  for (let i = 0; i < coincidencias.length; i++) {
    const actual = coincidencias[i];
    const siguiente = coincidencias[i + 1];
    const inicio = actual.index ?? 0;
    const fin = siguiente?.index ?? textoNormalizado.length;
    articulos.push({ numArticulo: actual[1], contenido: textoNormalizado.slice(inicio, fin).trim() });
  }
  return articulos;
}

// ── 5. Control de calidad fail-hard sobre cada fragmento segmentado ────
function validarFragmentoFailHard(numArticulo: string, contenido: string): void {
  if (contenido.length < 20) {
    fallarDuro(`Art. ${numArticulo}: contenido sospechosamente corto (${contenido.length} caracteres) — posible segmentación fallida`);
  }
  if (contenido.length > 20000) {
    fallarDuro(`Art. ${numArticulo}: contenido sospechosamente largo (${contenido.length} caracteres) — posible fallo de segmentación (¿se arrastró el artículo siguiente?)`);
  }
  if (/DINAF\s*\|/i.test(contenido) || /Ley Especial de Adopciones\s*$/im.test(contenido)) {
    fallarDuro(`Art. ${numArticulo}: quedó un encabezado/pie de página de DINAF sin limpiar dentro del contenido`);
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
  const ultimoCaracter = contenido.trim().slice(-1);
  if (!'.;:)'.includes(ultimoCaracter)) {
    fallarDuro(`Art. ${numArticulo}: el contenido no termina en puntuación de cierre válida ('${ultimoCaracter}') — posible texto cortado`);
  }
  if (!new RegExp(`^Art[ií]culo\\s+${numArticulo}\\.-`).test(contenido)) {
    fallarDuro(`Art. ${numArticulo}: el contenido no comienza con su propio encabezado "Artículo ${numArticulo}.-"`);
  }
}

// ── 6. Contrato de columnas biblioteca_vectores ─────────────────────────
interface RegistroCanonico {
  id: string;
  fuente: string;
  materia: string;
  num_articulo: string;
  es_norma_vigente: true;
  jurisdiccion: 'HN';
  fuente_tipo: string;
  coleccion: string;
  metadata: {
    decreto: string;
    norm_id: string;
    tipo_instrumento: string;
    fecha_gaceta: string;
    publicacion: string;
    metodo_extraccion: string;
    hash_texto_sha256: string;
    verificado: boolean;
    fecha_verificacion: string | null;
  };
  contenido: string;
}

function construirRegistro(a: ArticuloExtraido): RegistroCanonico {
  return {
    id: `hn:decreto_102-2018:art_${a.numArticulo}`,
    fuente: FUENTE_CANONICA,
    materia: MATERIA,
    num_articulo: a.numArticulo,
    es_norma_vigente: true,
    jurisdiccion: 'HN',
    fuente_tipo: 'ley',
    coleccion: 'mayalex_normativos',
    metadata: {
      decreto: '102-2018',
      norm_id: 'HN_LEY_ESPECIAL_ADOPCIONES',
      tipo_instrumento: 'ley',
      ...GACETA_VERIFICADA_CONTRA_PDF,
      metodo_extraccion:
        'pdftotext -layout -enc UTF-8 + limpieza de ruido DINAF y validación fail-hard automatizada (scripts/ingesta-d102-2018.ts) — PENDIENTE de verificación manual humana antes de ingesta real',
      hash_texto_sha256: sha256(a.contenido),
      verificado: false,
      fecha_verificacion: null,
    },
    contenido: a.contenido,
  };
}

function main() {
  console.log('=== Preparación de ingesta canónica — Decreto 102-2018 (Ley Especial de Adopciones) ===');
  console.log(`Fuente PDF: ${PDF_FUENTE}\n`);

  const textoCrudo = extraerTextoPDF(PDF_FUENTE);
  const cuerpoAcotado = acotarCuerpoDispositivo(textoCrudo);
  // normalizarTexto() primero: pdftotext en Windows emite \r\n, y
  // limpiarRuidoDINAF() reparadora de guiones de corte de línea busca
  // literalmente "-\n" -- si se aplicara antes, el \r sobrante entre el
  // guion y el salto de línea le impediría reconocer el patrón y dejaría
  // palabras cortadas sin reparar (detectado por el fail-hard de abajo
  // en la primera corrida de este script contra el PDF real).
  const cuerpoLimpio = limpiarRuidoDINAF(normalizarTexto(cuerpoAcotado));

  const articulos = segmentarArticulosD102(cuerpoLimpio);
  console.log(`Artículos segmentados en el tramo acotado: [${articulos.map((a) => a.numArticulo).join(', ')}]`);

  const primeros5 = articulos.slice(0, 5);
  const numerosObtenidos = primeros5.map((a) => a.numArticulo);
  if (JSON.stringify(numerosObtenidos) !== JSON.stringify(NUM_ARTICULOS_ESPERADOS)) {
    fallarDuro(
      `se esperaban exactamente los artículos [${NUM_ARTICULOS_ESPERADOS.join(', ')}] y se obtuvieron [${numerosObtenidos.join(', ')}]`,
    );
  }

  for (const a of primeros5) validarFragmentoFailHard(a.numArticulo, a.contenido);

  const errPII = validarSinDatosPrivados(primeros5);
  if (errPII) fallarDuro(errPII);

  console.log(
    `\n✅ Fail-hard QC superado — ${primeros5.length}/5 fragmentos limpios, sin PII, con encabezado propio y cierre de puntuación válido.\n`,
  );

  const registros = primeros5.map(construirRegistro);

  console.log('=== MUESTRA PARA DICTAMEN DEL CLO (5/5) ===\n');
  for (const r of registros) {
    console.log(
      JSON.stringify(
        {
          ...r,
          contenido: r.contenido.length > 200 ? `${r.contenido.slice(0, 200)}…` : r.contenido,
          contenido_longitud_total: r.contenido.length,
        },
        null,
        2,
      ),
    );
    console.log('');
  }

  console.log('=== ⚠ DISCREPANCIAS PENDIENTES DE DICTAMEN DEL CLO (sin resolver por este script) ===\n');
  console.log(
    JSON.stringify(
      {
        discrepancia: 'fecha_gaceta / publicacion',
        segun_directiva_clo: GACETA_SEGUN_DIRECTIVA_CLO,
        verificado_contra_pdf_oficial_dinaf: GACETA_VERIFICADA_CONTRA_PDF,
        nota:
          'El pie de página del propio Decreto (DINAF, pág. 9) dice: "Publicado en el Diario Oficial La Gaceta núm. 34,841 del 10 de enero de 2019" — número de Gaceta Y fecha distintos de los indicados en la directiva. Este script emitió el valor verificado contra la fuente primaria en los registros de arriba, no el de la directiva.',
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      {
        discrepancia: 'nombre de columna',
        segun_directiva_clo: 'numero_articulo',
        columna_real_en_produccion: 'num_articulo',
        nota: 'biblioteca_vectores no tiene una columna numero_articulo — se usó el nombre real (verificado en la auditoría del 2026-09-02) para que estos registros sean insertables tal cual el día que se autorice la ingesta.',
      },
      null,
      2,
    ),
  );

  console.log(
    '\n🔒 CERO escrituras ejecutadas — este script no importa ningún cliente de Supabase, no abre conexión de red, y termina aquí. Pendiente de dictamen y aprobación formal del CLO antes de cualquier INSERT real.',
  );
}

main();
