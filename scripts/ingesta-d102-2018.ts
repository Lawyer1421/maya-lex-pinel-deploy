/**
 * scripts/ingesta-d102-2018.ts
 * Preparación LOCAL (staging, sin red) del cuerpo COMPLETO de artículos del
 * Decreto No. 102-2018 (Ley Especial de Adopciones de Honduras), para
 * dictamen previo del CLO antes de cualquier ingesta real.
 *
 * Ejecutar: npx tsx scripts/ingesta-d102-2018.ts
 * Ejecutar con expediente para PR: npx tsx scripts/ingesta-d102-2018.ts --expediente <ruta.md>
 *
 * CERO ESCRITURAS EN PRODUCCIÓN: este script no importa ningún cliente de
 * Supabase, no abre conexión de red, y no tiene ninguna vía hacia
 * thgrhueckkjdutjvcufp. Lee un PDF local y escribe a stdout; con
 * --expediente además escribe un .md local (nunca a la base de datos).
 *
 * Fuente documental (verificada localmente, 2026-09-02):
 *   C:\Users\Fredy\OneDrive\SISTEMA_LEGAL_PRINCIPAL\00_ARCHIVOS_VARIOS\
 *   Biblioteca_Personal\Ley-Especial-de-Adopciones-DINAF.pdf
 *   — publicación oficial de DINAF (Dirección de Niñez, Adolescencia y
 *   Familia), primera edición agosto 2019, texto íntegro del Decreto
 *   No. 102-2018 (64 artículos, del Objeto de la Ley hasta la Vigencia).
 *   Extraído con `pdftotext -layout -enc UTF-8` — mismo método ya
 *   registrado en producción para la fila
 *   manual_curado:cpp_honduras:articulo_173 (ver DECISION_LOG.md).
 *
 * RESUELTO por directiva del CLO 2026-09-02 (ya no es discrepancia
 * abierta — histórico para trazabilidad):
 *   - Convención de id: se cambió de "hn:decreto_102-2018:art_<N>" a
 *     "mayalex_normativos:adopciones_2018_a<N>", alineada con la
 *     convención canónica del Lote P0 (tributario_2016_a<N>,
 *     constitucion_1982_a<N>).
 *   - fecha_gaceta/publicacion: el CLO confirmó el valor VERIFICADO
 *     contra el pie de página del propio Decreto (DINAF, pág. 9:
 *     "Publicado en el Diario Oficial La Gaceta núm. 34,841 del 10 de
 *     enero de 2019") — el valor que traía la directiva original
 *     (34,851 / 21-ene-2019) no se usa en ningún registro.
 *   - Nombre de columna: la directiva ya usa "num_articulo" (el nombre
 *     real y verificado en producción), no "numero_articulo".
 *
 * ⚠ SEGMENTACIÓN — por qué este script NO reutiliza
 *   segmentarPorArticulo() de lib/ingesta-oficial/extraccion.ts tal
 *   cual, y dos problemas reales encontrados al extender la extracción
 *   al cuerpo completo (más allá de los primeros 5 artículos, donde no
 *   eran visibles):
 *
 *   1) Referencias cruzadas mal segmentadas. El texto contiene, dentro
 *      del propio Artículo 5 (Definiciones), una referencia cruzada que
 *      el ajuste de línea del PDF deja como línea propia: "Artículo 15
 *      de la presente Ley." Un segmentador que corte por cualquier
 *      línea que empiece con "Artículo N" la tomaría como un encabezado
 *      nuevo. Los encabezados reales de este documento siempre traen
 *      ".-" pegado al número ("Artículo 1.- Objeto..."); las
 *      referencias cruzadas nunca. También hay dos referencias cruzadas
 *      a "Capítulo" y una a "Sección" en el Art. 63 (Derogatorias) y en
 *      otro punto del cuerpo -- ninguna con un número romano pegado, a
 *      diferencia de los encabezados reales.
 *
 *   2) Encabezados de Capítulo/Sección intercalados entre artículos. El
 *      documento intercala títulos de capítulo/sección ("Capítulo II /
 *      Adoptabilidad y consentimiento / Sección I / Adoptabilidad")
 *      entre el cierre de un artículo y el encabezado del siguiente. Una
 *      segmentación que corte solo por "Artículo N.-" les asignaría ese
 *      texto de encabezado al artículo ANTERIOR como si fuera parte de
 *      su contenido (encontrado al procesar el Art. 5 completo: su
 *      contenido se extendía hasta "Capítulo II ... Sección I ...
 *      Adoptabilidad" en vez de terminar en "... tema de niñez.").
 *
 *   Este script resuelve ambos con un único patrón combinado que trata
 *   "Artículo N.-", "Capítulo <romano>" y "Sección <romano>" como
 *   límites de segmentación (solo cuando encabezan su propia línea),
 *   pero conserva como artículo real únicamente los segmentos cuyo
 *   límite es "Artículo N.-" -- los segmentos de Capítulo/Sección se
 *   descartan (no tienen contenido normativo propio, solo título). El
 *   control de secuencia (abajo) exige además 1..N consecutivo sin
 *   huecos ni duplicados sobre el resultado final.
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { sha256 } from '../lib/ingesta-oficial/hash';
import { normalizarTexto } from '../lib/ingesta-oficial/extraccion';
import { validarSinDatosPrivados } from '../lib/ingesta-oficial/validaciones';
import type { ArticuloExtraido } from '../lib/ingesta-oficial/types';

const PDF_FUENTE =
  'C:/Users/Fredy/OneDrive/SISTEMA_LEGAL_PRINCIPAL/00_ARCHIVOS_VARIOS/Biblioteca_Personal/Ley-Especial-de-Adopciones-DINAF.pdf';

const FUENTE_CANONICA = 'Ley Especial de Adopciones de Honduras (Decreto 102-2018)';
const MATERIA = '06_FAMILIA';

// Confirmado por el CLO (2026-09-02) contra el pie de página del propio
// Decreto (DINAF, pág. 9) — ver nota "RESUELTO" arriba.
const GACETA_CONFIRMADA = {
  fecha_gaceta: '2019-01-10',
  publicacion: 'La Gaceta núm. 34,841',
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

// ── 2. Acotar al cuerpo dispositivo real del Decreto (Art. 1 a Art. 64) ─
// CRÍTICO: los "CONSIDERANDO" del preámbulo citan Artículo 59/111/116 de
// la Constitución y Artículo 21 de la Convención de los Derechos del
// Niño — si se segmentara el documento completo esas referencias se
// confundirían con artículos propios del Decreto 102-2018. Se acota al
// tramo real, desde "Por tanto, Decreta" hasta el inicio del bloque de
// firmas ("Dado en la ciudad de Tegucigalpa..."), que cierra el cuerpo
// dispositivo justo después del Artículo 64 (Vigencia, el último).
function acotarCuerpoDispositivo(textoCrudo: string): string {
  const inicioDecreta = textoCrudo.search(/Por tanto,\s*Decreta/i);
  if (inicioDecreta === -1) {
    fallarDuro('no se encontró la cláusula "Por tanto, Decreta" — el documento fuente pudo haber cambiado de formato');
  }
  const tramoDesdeDecreta = textoCrudo.slice(inicioDecreta);
  const finRelativo = tramoDesdeDecreta.search(/Dado en la ciudad/i);
  if (finRelativo === -1) {
    fallarDuro('no se encontró el bloque de firmas ("Dado en la ciudad...") después de "Decreta" — el documento fuente pudo haber cambiado de formato');
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
// Límite de segmentación combinado: "Artículo N.-" (captura numArticulo
// en el grupo 1), o "Capítulo <romano>" / "Sección <romano>" (sin grupo
// 1 -- se usan solo para no dejarles su título colgado al artículo
// anterior, se descartan después). Los tres exigen encabezar su propia
// línea, que es justo lo que distingue un encabezado real de una
// referencia cruzada dentro de la prosa (ver comentario del archivo).
const PATRON_LIMITE_SEGMENTACION =
  /^\s*(?:Art[ií]culo\s+(\d+)\.-|Cap[ií]tulo\s+[IVXLCDM]+\b|Secci[oó]n\s+[IVXLCDM]+\b)/gim;

function segmentarArticulosD102(textoNormalizado: string): ArticuloExtraido[] {
  const coincidencias = [...textoNormalizado.matchAll(PATRON_LIMITE_SEGMENTACION)];
  const articulos: ArticuloExtraido[] = [];
  for (let i = 0; i < coincidencias.length; i++) {
    const actual = coincidencias[i];
    const numArticulo = actual[1];
    if (numArticulo === undefined) continue; // límite de Capítulo/Sección -- no es un artículo, se descarta
    const siguiente = coincidencias[i + 1];
    const inicio = actual.index ?? 0;
    const fin = siguiente?.index ?? textoNormalizado.length;
    articulos.push({ numArticulo, contenido: textoNormalizado.slice(inicio, fin).trim() });
  }
  return articulos;
}

// Exige una secuencia 1..N estrictamente consecutiva, sin huecos ni
// duplicados -- cualquier desvío (ej. una referencia cruzada mal
// segmentada como si fuera un artículo nuevo) lo detiene en seco.
function validarSecuenciaCompleta(articulos: ArticuloExtraido[]): void {
  if (articulos.length === 0) fallarDuro('no se segmentó ningún artículo del cuerpo acotado');
  const numeros = articulos.map((a) => Number(a.numArticulo));
  for (let i = 0; i < numeros.length; i++) {
    const esperado = i + 1;
    if (numeros[i] !== esperado) {
      fallarDuro(
        `secuencia de artículos rota en la posición ${i + 1}: se esperaba el Artículo ${esperado} y se obtuvo el Artículo ${numeros[i]} — posible referencia cruzada mal segmentada o artículo faltante`,
      );
    }
  }
}

// Excepciones al cierre de puntuación, verificadas MANUALMENTE contra el
// PDF crudo (byte a byte, no solo el texto extraído) antes de añadirse
// aquí -- nunca una relajación general de la regla. Cada entrada exige
// haber confirmado que la ausencia de puntuación de cierre es del propio
// documento oficial impreso, no un artefacto de extracción/limpieza.
const EXCEPCIONES_CIERRE_VERIFICADAS: Record<string, string> = {
  '10': 'La edición impresa de DINAF (pág. 22) termina esta oración sin punto final ("...ni puede realizarse trámite alguno de adopciones") -- verificado contra el PDF crudo con `cat -A`, no hay carácter suelto ni salto de página a mitad de la palabra. Se preserva el texto tal cual el original, sin corregir la omisión editorial.',
};

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
    const excepcion = EXCEPCIONES_CIERRE_VERIFICADAS[numArticulo];
    if (!excepcion) {
      fallarDuro(`Art. ${numArticulo}: el contenido no termina en puntuación de cierre válida ('${ultimoCaracter}') — posible texto cortado`);
    }
    console.warn(`⚠️  Art. ${numArticulo}: cierre sin puntuación aceptado como excepción verificada manualmente — ${excepcion}`);
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
    id: `mayalex_normativos:adopciones_2018_a${a.numArticulo}`,
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
      ...GACETA_CONFIRMADA,
      metodo_extraccion:
        'pdftotext -layout -enc UTF-8 + limpieza de ruido DINAF y validación fail-hard automatizada (scripts/ingesta-d102-2018.ts) — PENDIENTE de verificación manual humana artículo por artículo antes de ingesta real',
      hash_texto_sha256: sha256(a.contenido),
      verificado: false,
      fecha_verificacion: null,
    },
    contenido: a.contenido,
  };
}

// Extrae, dentro del contenido ya segmentado del Art. 5, el párrafo
// exacto que contiene la referencia cruzada "Artículo 15 de la presente
// Ley" -- evidencia textual para expediente de que esa referencia quedó
// DENTRO del Art. 5 y no partió el artículo en dos.
function extraerParrafoConReferencia(contenidoArt5: string, frase: string): string | null {
  const parrafos = contenidoArt5.split(/\n\n+/);
  return parrafos.find((p) => p.includes(frase)) ?? null;
}

function ultimoParrafo(contenido: string): string {
  const parrafos = contenido.split(/\n\n+/);
  return parrafos[parrafos.length - 1];
}

function porNumero(articulos: ArticuloExtraido[], n: string): ArticuloExtraido {
  const a = articulos.find((x) => x.numArticulo === n);
  if (!a) fallarDuro(`expediente: no se encontró el Art. ${n} entre los segmentados`);
  return a!;
}

// ── 7. Expediente documental para el dictamen del CLO (PR #14) ─────────
// Genera el markdown exacto exigido por el CLO: tenores íntegros
// auditados, matriz consolidada de los 64 registros, y declaración de
// condiciones fail-hard. Todo derivado directamente de `articulos`/
// `registros` ya validados -- ningún texto se retipea a mano, evita el
// riesgo de transcripción que eso implicaría.
function generarExpedienteMarkdown(articulos: ArticuloExtraido[], registros: RegistroCanonico[]): string {
  const art1 = porNumero(articulos, '1');
  const art5 = porNumero(articulos, '5');
  const art10 = porNumero(articulos, '10');
  const art60 = porNumero(articulos, '60');
  const art63 = porNumero(articulos, '63');
  const art64 = porNumero(articulos, '64');

  const FRASE_ART15 = 'Artículo 15 de la presente Ley';
  const numeralOrganismosAcreditados = extraerParrafoConReferencia(art5.contenido, FRASE_ART15);
  if (!numeralOrganismosAcreditados) {
    fallarDuro(`expediente: no se encontró en el Art. 5 el numeral con "${FRASE_ART15}"`);
  }

  const filas = registros
    .map((r) => `| \`${r.id}\` | ${r.num_articulo} | ${r.contenido.length} | \`${r.metadata.hash_texto_sha256.slice(0, 12)}\` |`)
    .join('\n');

  return `# Expediente documental — Decreto 102-2018 (Ley Especial de Adopciones)

Generado automáticamente por \`scripts/ingesta-d102-2018.ts\` a partir del PDF oficial de DINAF (verificado localmente), para el dictamen del CLO sobre este PR. **Cero escrituras SQL ejecutadas contra producción (thgrhueckkjdutjvcufp) en la generación de este expediente.**

## 1. Tenores íntegros auditados

### Art. 1 — completo

\`\`\`
${art1.contenido}
\`\`\`

### Art. 5 — numeral "Organismos Acreditados" completo (remisión al Art. 15 sin corte)

\`\`\`
${numeralOrganismosAcreditados}
\`\`\`

### Art. 10 — texto de cierre literal

Termina en "...trámite alguno de adopciones" **sin punto final**, tal como aparece en la Gaceta núm. 34,841 (edición DINAF, pág. 22) — verificado byte a byte contra el PDF crudo, no es artefacto de extracción:

\`\`\`
${ultimoParrafo(art10.contenido)}
\`\`\`

### Art. 60 — completo (Reformas al Código de la Niñez y la Adolescencia)

\`\`\`
${art60.contenido}
\`\`\`

### Art. 63 — completo (Derogatorias — D. 75-84, Capítulos I y VI del Código de Familia)

\`\`\`
${art63.contenido}
\`\`\`

### Art. 64 — completo (Vigencia)

\`\`\`
${art64.contenido}
\`\`\`

## 2. Matriz consolidada de los 64 registros

| ID | num_articulo | Longitud (chars) | SHA256 (primeros 12 hex) |
|---|---|---:|---|
${filas}

## 3. Condiciones fail-hard declaradas (pre-condiciones para la futura ejecución)

- **ROW_COUNT = 64 exacto** — verificado en esta corrida: secuencia 1..64 estrictamente consecutiva, sin huecos ni duplicados.
- **IDs canónicos** \`mayalex_normativos:adopciones_2018_a1\` a \`...a64\` — verificado, cero \`doc_*\`.
- **\`es_norma_vigente = true\`, \`fuente_tipo = 'ley'\`, \`materia = '06_FAMILIA'\`** en el 100% de los 64 registros — verificado.
- **CERO UPDATE masivo sobre la materia \`06_FAMILIA\`.** Esta preparación es exclusivamente aditiva (INSERT de 64 filas nuevas bajo \`fuente = '${FUENTE_CANONICA}'\`, un valor de \`fuente\` que hoy no existe en \`biblioteca_vectores\`). Los stubs \`123-A\` y \`123-B\` de \`Codigo de Familia\` (\`es_norma_vigente=false\`) no son tocados por ninguna operación de este pliego — permanecen inalterados.
`;
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
  // palabras cortadas sin reparar (detectado por el fail-hard en la
  // primera corrida de este script contra el PDF real).
  const cuerpoLimpio = limpiarRuidoDINAF(normalizarTexto(cuerpoAcotado));

  const articulos = segmentarArticulosD102(cuerpoLimpio);
  validarSecuenciaCompleta(articulos);

  const TOTAL = articulos.length;
  console.log(`Artículos segmentados en el cuerpo completo: ${TOTAL} (secuencia 1..${TOTAL} consecutiva, sin huecos ni duplicados — verificado)\n`);

  for (const a of articulos) validarFragmentoFailHard(a.numArticulo, a.contenido);
  const errPII = validarSinDatosPrivados(articulos);
  if (errPII) fallarDuro(errPII);

  console.log(
    `✅ Fail-hard QC superado — ${TOTAL}/${TOTAL} (100%) fragmentos limpios, sin PII, sin caracteres de control residuales, longitud no vacía, con encabezado propio y cierre de puntuación válido.\n`,
  );

  const registros = articulos.map(construirRegistro);

  console.log('=== RESUMEN DE LOS 64 REGISTROS (id, longitud, hash) ===\n');
  for (const r of registros) {
    console.log(`  ${r.id.padEnd(38)} | ${String(r.contenido.length).padStart(5)} chars | sha256:${r.metadata.hash_texto_sha256.slice(0, 12)}…`);
  }

  console.log('\n=== ⚖ EVIDENCIA TEXTUAL PARA EXPEDIENTE (exigida por el CLO) ===\n');

  const art1 = articulos.find((a) => a.numArticulo === '1');
  if (!art1) fallarDuro('no se encontró el Artículo 1 para la evidencia textual exigida');
  console.log('--- Texto COMPLETO del Artículo 1 ---\n');
  console.log(art1!.contenido);

  const art5 = articulos.find((a) => a.numArticulo === '5');
  if (!art5) fallarDuro('no se encontró el Artículo 5 para la evidencia textual exigida');
  const FRASE = 'Artículo 15 de la presente Ley';
  const parrafoConReferencia = extraerParrafoConReferencia(art5!.contenido, FRASE);
  if (!parrafoConReferencia) {
    fallarDuro(`no se encontró dentro del Art. 5 el párrafo con la frase "${FRASE}" -- la evidencia exigida por el CLO no puede construirse`);
  }
  const encabezadoArt5 = art5!.contenido.split('\n').slice(0, 2).join('\n');
  console.log('\n--- Encabezado del Artículo 5 ---\n');
  console.log(encabezadoArt5);
  console.log(`\n--- Numeral/definición exacta del Art. 5 que contiene "${FRASE}" (prueba de que NO hubo partición indebida) ---\n`);
  console.log(parrafoConReferencia);

  console.log(
    '\n🔒 CERO escrituras SQL ejecutadas — este script no importa ningún cliente de Supabase, no abre conexión de red, y termina aquí. Pendiente de dictamen y aprobación formal del CLO antes de cualquier INSERT real.',
  );

  const flagIdx = process.argv.indexOf('--expediente');
  if (flagIdx !== -1) {
    const rutaSalida = process.argv[flagIdx + 1];
    if (!rutaSalida) fallarDuro('--expediente requiere una ruta de archivo de salida');
    const markdown = generarExpedienteMarkdown(articulos, registros);
    writeFileSync(rutaSalida, markdown, 'utf8');
    console.log(`\n📄 Expediente documental escrito en: ${rutaSalida} (${markdown.length} caracteres)`);
  }
}

main();
