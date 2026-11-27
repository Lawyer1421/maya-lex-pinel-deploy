/**
 * scripts/olas/ocr-lgm.ts
 * OLA 15 (preparación) — Ley de Garantías Mobiliarias (D.182-2009): OCR por columnas de La Gaceta No. 32,125 (28-ene-2010, escaneo de
 * 20 págs. a 100 ppi) y reporte preliminar para el cotejo. Solo lee el PDF y los paquetes locales; no escribe en ninguna base de datos
 * ni genera paquete alguno.
 *
 * 1. Rasteriza cada columna en gris a 300 ppi recortando con `pdftoppm -x/-y/-W/-H` (pág. 1: solo la columna derecha bajo el sumario,
 *    donde empieza el articulado; págs. 2–20: sin la cabecera de página) y la reconoce con Tesseract `spa`, una columna (`--psm 4`).
 * 2. Recorre las palabras del TSV en orden de lectura (izquierda y luego derecha, página a página), reconstruye las líneas, quita el pie
 *    «A. N», y delimita el articulado entre «ARTÍCULO 1.-» y el «Dado en la ciudad de Tegucigalpa…» (el resto de la pág. 20 es el
 *    D.294-2009, otra disposición). Los encabezados se aceptan solo en orden consecutivo: los artículos de otras leyes que la Gaceta
 *    transcribe entre comillas no cortan el articulado.
 * 3. Reporte preliminar por palabra, con página, columna, línea y artículo:
 *    - BAJA_CONFIANZA: confianza de Tesseract < 80;
 *    - FUERA_DE_VOCABULARIO: formas de 4 letras o más que no están en el corpus V5 local (out/ola*\/rows.jsonl), agrupadas;
 *    - CIFRA: toda palabra con un dígito; además las remisiones «artículo(s) N» (fuera de 1..86 = alerta) y la concordancia
 *      «seis (6)» entre la cifra en letras y la cifra entre paréntesis.
 *
 * Uso: npx tsx scripts/olas/ocr-lgm.ts [--rehacer-ocr]   → out/ola15-lgm/ocr/ (texto por columna, articulado_ocr.txt, cierre_ocr.txt,
 *      reporte.json, REPORTE_OCR_LGM_PRELIMINAR.md)
 * Variables: OLAS_TESSERACT, OLAS_PDFTOPPM (como ocr-diagnostico.ts).
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TESSERACT = process.env.OLAS_TESSERACT ?? 'C:/Program Files/Tesseract-OCR/tesseract.exe';
const PDFTOPPM = process.env.OLAS_PDFTOPPM ?? 'pdftoppm';
export const PDF_GACETA_32125 = 'C:/Users/fredy/OneDrive/SISTEMA_LEGAL_PRINCIPAL/02_EJERCICIO_LEGAL/05_LEYES_Y_CODIGOS/Ley de Garantias Mobiliarias.pdf';
export const SHA_GACETA_32125 = 'dc919517a242bbda548171a7ebecb7dbe20b32af5a909eb784bb8a0f917f758c';
const PPI = 300;
const SALIDA = 'out/ola15-lgm/ocr';
/** Último artículo del D.182-2009 (el 86 es la vigencia, seguido del «Dado en…»). */
export const ULTIMO_ARTICULO = 86;

/**
 * Recortes por página, en píxeles a 300 ppi. `ancho`/`alto` son los de la página rasterizada (varían por el escaneo). `arriba` va bajo
 * la cabecera de la Gaceta (medida sobre las cajas de palabra del diagnóstico out/ocr-diag/gm, psm 1; en la pág. 6 la cabecera se pegó a la
 * primera línea del cuerpo y el corte se fijó a mano); `corte` es el centro del canal entre columnas, medido igual.
 */
export const PAGINAS: ReadonlyArray<{ pagina: number; ancho: number; alto: number; arriba: number; corte: number }> = [
  [2, 2550, 3384, 340, 1268], [3, 2583, 3411, 345, 1276], [4, 2577, 3402, 370, 1271], [5, 2550, 3384, 334, 1293],
  [6, 2550, 3384, 350, 1250], [7, 2605, 3423, 370, 1342], [8, 2550, 3384, 350, 1246], [9, 2550, 3384, 330, 1296],
  [10, 2550, 3384, 355, 1239], [11, 2550, 3384, 355, 1302], [12, 2574, 3408, 355, 1245], [13, 2550, 3384, 480, 1294],
  [14, 2550, 3384, 345, 1268], [15, 2550, 3384, 480, 1266], [16, 2550, 3387, 335, 1299], [17, 2550, 3381, 475, 1297],
  [18, 2550, 3384, 345, 1255], [19, 2619, 3435, 498, 1275], [20, 2550, 3384, 355, 1317],
].map(([pagina, ancho, alto, arriba, corte]) => ({ pagina, ancho, alto, arriba, corte }));

export interface Recorte { pagina: number; columna: 'izq' | 'der'; x: number; y: number; w: number; h: number }
export const RECORTES: readonly Recorte[] = [
  // Pág. 1: el articulado empieza en la columna derecha, bajo el sumario («LEY DE GARANTÍAS MOBILIARIAS … ARTÍCULO 1.-»).
  { pagina: 1, columna: 'der', x: 1260, y: 2150, w: 2550 - 1260, h: 3366 - 2150 },
  ...PAGINAS.flatMap(({ pagina, ancho, alto, arriba, corte }): Recorte[] => [
    { pagina, columna: 'izq', x: 0, y: arriba, w: corte, h: alto - arriba },
    { pagina, columna: 'der', x: corte, y: arriba, w: ancho - corte, h: alto - arriba },
  ]),
];

export interface Palabra { pagina: number; columna: 'izq' | 'der'; linea: number; texto: string; conf: number }

/** Palabras de un TSV de Tesseract (nivel 5), con el número de línea global de la columna (bloque/párrafo/línea). */
export function palabrasTsv(tsv: string, pagina: number, columna: 'izq' | 'der'): Palabra[] {
  const out: Palabra[] = [];
  const lineas = new Map<string, number>();
  for (const fila of tsv.split(/\r?\n/).slice(1)) {
    const c = fila.split('\t');
    if (c[0] !== '5' || !c[11] || !c[11].trim()) continue;
    const clave = `${c[2]}/${c[3]}/${c[4]}`;
    if (!lineas.has(clave)) lineas.set(clave, lineas.size + 1);
    out.push({ pagina, columna, linea: lineas.get(clave)!, texto: c[11].trim(), conf: Number(c[10]) });
  }
  return out;
}

/**
 * Pie de página «A. 6» / «A.» + «6» (la línea entera; el número en recuadro negro a veces sale en letras: «A. HEN»), y el rótulo
 * «Sección A» si quedó dentro del recorte.
 */
const esPie = (linea: Palabra[]): boolean => /^(?:[A4]\.?\s*\d{1,2}|[A4]\.\s*[A-Z0-9|!]{1,4}|[A4]\.?|Secci[oó]n\s+A.*)$/.test(linea.map((p) => p.texto).join(' ').trim());

export function lineas(palabras: Palabra[]): Palabra[][] {
  const out: Palabra[][] = [];
  for (const p of palabras) {
    const ult = out.at(-1);
    if (ult && ult[0].pagina === p.pagina && ult[0].columna === p.columna && ult[0].linea === p.linea) ult.push(p); else out.push([p]);
  }
  return out.filter((l) => !esPie(l));
}

/** Encabezado de artículo al inicio de línea: «ARTÍCULO 13.-», con ruido de OCR tolerado (4RTÍCULO, ARTICULO1.-), nunca tras comillas. */
// El guion tras el número a veces falta en el OCR («ARTÍCULO 42. CARACTERÍSTICAS…»): basta un punto seguido del epígrafe en mayúsculas.
const RE_ENCABEZADO = /^[^\p{L}"“”'«]{0,4}[A4][RK]T[IÍ1lí][CG]ULO\s*(\d{1,3})\s*(?:[.,:]?\s*([-—–])|\.\s+(?=\p{Lu}{2}))/u;
const RE_DADO = /^Dado\s+en\s+la\s+ciudad\s+de\s+Tegucigalpa/u;

export interface Delimitado { articulado: Palabra[][]; cierre: Palabra[][]; articuloDeLinea: number[]; encabezados: number[]; sinGuion: number[]; descartados: string[] }

/** Delimita el articulado y asigna cada línea a su artículo; solo acepta encabezados consecutivos (n = último + 1). */
export function delimitar(todas: Palabra[][]): Delimitado {
  const articulado: Palabra[][] = [], articuloDeLinea: number[] = [], encabezados: number[] = [], sinGuion: number[] = [], descartados: string[] = [];
  let actual = 0, i = 0;
  for (; i < todas.length; i++) {
    const t = todas[i].map((p) => p.texto).join(' ');
    if (actual >= 1 && RE_DADO.test(t)) break;
    const m = t.match(RE_ENCABEZADO);
    if (m) {
      const n = Number(m[1]);
      if (n === actual + 1) {
        actual = n; encabezados.push(n);
        if (!m[2]) sinGuion.push(n);
      } else if (actual >= 1) descartados.push(`pág. ${todas[i][0].pagina} ${todas[i][0].columna}: «${t.slice(0, 70)}» (tras el art. ${actual})`);
    }
    if (actual >= 1) { articulado.push(todas[i]); articuloDeLinea.push(actual); }
  }
  // Cierre: «Dado en…», firmas y sanción, hasta que empieza otra disposición (en la pág. 20, columna derecha: «Poder Legislativo»/D.294-2009).
  const cierre: Palabra[][] = [];
  for (; i < todas.length; i++) {
    const t = todas[i].map((p) => p.texto).join(' ');
    if (cierre.length && (todas[i][0].columna !== cierre[0][0].columna || /Poder\s+Legislativo|DECRETO\s+No/i.test(t))) break;
    cierre.push(todas[i]);
  }
  return { articulado, cierre, articuloDeLinea, encabezados, sinGuion, descartados };
}

const UNIDADES: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12,
  trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21, veintiun: 21,
  veintiuna: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28,
  veintinueve: 29, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100,
};
const sinTildes = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Valor de una cifra en letras de 0 a 199 («treinta y cinco», «ciento veinte»), o null si no lo es. */
export function valorEnLetras(frase: string): number | null {
  const ws = sinTildes(frase).split(/\s+/).filter((w) => w && w !== 'y');
  if (!ws.length || !ws.every((w) => w in UNIDADES)) return null;
  return ws.reduce((s, w) => s + UNIDADES[w], 0);
}

export interface Hallazgo { tipo: 'BAJA_CONFIANZA' | 'CIFRA' | 'REMISION' | 'CONCORDANCIA'; articulo: number; pagina: number; columna: string; linea: number; texto: string; conf: number | null; contexto: string; alerta?: string }

/** Forma de vocabulario: minúsculas, sin signos en los bordes; conserva tildes (una tilde perdida también es error de OCR). */
const forma = (w: string): string => w.toLowerCase().replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu, '');

export function vocabularioCorpus(): Set<string> {
  const voc = new Set<string>();
  for (const d of readdirSync('out').filter((x) => /^ola\d+-/.test(x) && !x.startsWith('ola15'))) {
    const f = join('out', d, 'rows.jsonl');
    if (!existsSync(f)) continue;
    for (const l of readFileSync(f, 'utf8').split('\n').filter(Boolean)) for (const w of String(JSON.parse(l).contenido).split(/[^\p{L}]+/u)) if (w) voc.add(w.toLowerCase());
  }
  return voc;
}

export function reporte(d: Delimitado, voc: Set<string>) {
  const hallazgos: Hallazgo[] = [];
  const oov = new Map<string, { n: number; ejemplos: string[] }>();
  d.articulado.forEach((linea, k) => {
    const art = d.articuloDeLinea[k];
    const texto = linea.map((p) => p.texto).join(' ');
    const ctx = texto.length > 110 ? `${texto.slice(0, 107)}…` : texto;
    linea.forEach((p, j) => {
      const base = { articulo: art, pagina: p.pagina, columna: p.columna, linea: p.linea, texto: p.texto, conf: p.conf, contexto: ctx };
      if (p.conf < 80) hallazgos.push({ tipo: 'BAJA_CONFIANZA', ...base });
      if (/\d/.test(p.texto)) {
        // Símbolo ajeno dentro de la cifra («£2-2004») o letra que imita un dígito pegada a otro («2O09», «l5»).
        const limpio = p.texto.replace(/^[(\[“"«]+|[)\].,;:”"»]+$/g, '');
        const raro = /[^\p{L}\d.,\-/°º%)]/u.test(limpio) || /\d[OoIlS]|[OoIlS]\d/.test(limpio.replace(/^No\.?/, ''));
        hallazgos.push({ tipo: 'CIFRA', ...base, ...(raro ? { alerta: `cifra con carácter sospechoso: «${p.texto}»` } : {}) });
      }
      // Palabra partida a fin de línea: se une con la primera de la línea siguiente antes de mirar el vocabulario.
      let w = p.texto;
      if (j === linea.length - 1 && /\p{L}-$/u.test(w) && d.articulado[k + 1]) w = w.slice(0, -1) + d.articulado[k + 1][0].texto;
      else if (j === 0 && k > 0 && /\p{L}-$/u.test(d.articulado[k - 1].at(-1)!.texto)) return;
      const f = forma(w);
      if (/^\p{L}{4,}$/u.test(f) && !voc.has(f)) {
        const e = oov.get(f) ?? { n: 0, ejemplos: [] };
        e.n++;
        if (e.ejemplos.length < 3) e.ejemplos.push(`art. ${art}, pág. ${p.pagina} ${p.columna} l. ${p.linea}`);
        oov.set(f, e);
      }
    });
  });
  // Remisiones y concordancia, sobre el texto corrido de cada artículo (las remisiones pueden partirse entre líneas).
  const porArticulo = new Map<number, string>();
  d.articulado.forEach((l, k) => porArticulo.set(d.articuloDeLinea[k], `${porArticulo.get(d.articuloDeLinea[k]) ?? ''} ${l.map((p) => p.texto).join(' ')}`));
  for (const [art, t0] of porArticulo) {
    // Sin el encabezado propio (su número no es una remisión) y con las palabras partidas a fin de línea unidas.
    const cuerpo = t0.trim().replace(RE_ENCABEZADO, '').replace(/(\p{L})-\s+(\p{L})/gu, '$1$2');
    for (const m of cuerpo.matchAll(/\bart[ií]culos?\s+((?:\d{1,4}(?:\s*[,y]\s*|\s+al?\s+|\s*-\s*)?)+)/giu)) {
      const nums = [...m[1].matchAll(/\d{1,4}/g)].map((x) => Number(x[0]));
      const fuera = nums.filter((n) => n < 1 || n > ULTIMO_ARTICULO);
      const despues = cuerpo.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 60);
      const otraLey = /^\s*(?:de|del)\s+(?:la\s+|el\s+)?(?:c[oó]digo|ley|decreto|reglamento|constituci[oó]n)/i.test(despues);
      hallazgos.push({ tipo: 'REMISION', articulo: art, pagina: 0, columna: '', linea: 0, texto: m[0].trim(), conf: null, contexto: cuerpo.slice(Math.max(0, (m.index ?? 0) - 50), (m.index ?? 0) + m[0].length + 60).trim(),
        ...(fuera.length && !otraLey ? { alerta: `remite a ${fuera.join(', ')}: fuera de 1..${ULTIMO_ARTICULO} y sin nombrar otra ley (¿error de OCR?)` } : {}),
        ...(otraLey ? { alerta: `remisión externa a ${nums.join(', ')} (${despues.trim().split(/\s+/).slice(0, 5).join(' ')}…): verificar la cifra en la imagen` } : {}) });
    }
    for (const m of cuerpo.matchAll(/((?:\p{L}+\s+){1,3})\(\s*([0-9OoIl]{1,3})\s*\)/gu)) {
      const palabrasPrevias = m[1].trim().split(/\s+/);
      let valor: number | null = null, frase = '';
      for (let k = palabrasPrevias.length; k >= 1 && valor === null; k--) { frase = palabrasPrevias.slice(-k).join(' '); valor = valorEnLetras(frase); }
      if (valor === null) continue;
      const cifra = m[2].replace(/[Oo]/g, '0').replace(/[Il]/g, '1');
      hallazgos.push({ tipo: 'CONCORDANCIA', articulo: art, pagina: 0, columna: '', linea: 0, texto: `${frase} (${m[2]})`, conf: null, contexto: '',
        ...(Number(cifra) !== valor || cifra !== m[2] ? { alerta: `en letras ${valor}, entre paréntesis «${m[2]}»` } : {}) });
    }
  }
  return { hallazgos, oov: [...oov].sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0])).map(([f, e]) => ({ forma: f, ...e })) };
}

export function ocrColumnas(rehacer = false): Palabra[] {
  mkdirSync(join(SALIDA, 'img'), { recursive: true });
  const todas: Palabra[] = [];
  for (const r of RECORTES) {
    const base = join(SALIDA, `p${String(r.pagina).padStart(2, '0')}_${r.columna}`);
    if (rehacer || !existsSync(`${base}.tsv`)) {
      const img = join(SALIDA, 'img', `p${String(r.pagina).padStart(2, '0')}_${r.columna}`);
      execFileSync(PDFTOPPM, ['-gray', '-png', '-r', String(PPI), '-f', String(r.pagina), '-l', String(r.pagina), '-singlefile',
        '-x', String(r.x), '-y', String(r.y), '-W', String(r.w), '-H', String(r.h), PDF_GACETA_32125, img]);
      execFileSync(TESSERACT, [`${img}.png`, base, '-l', 'spa', '--psm', '4', 'txt', 'tsv'], { stdio: 'ignore' });
    }
    todas.push(...palabrasTsv(readFileSync(`${base}.tsv`, 'utf8'), r.pagina, r.columna));
  }
  return todas;
}

const texto = (ls: Palabra[][]): string => ls.map((l) => l.map((p) => p.texto).join(' ')).join('\n') + '\n';

function markdown(meta: Record<string, unknown>, d: Delimitado, r: ReturnType<typeof reporte>): string {
  const por = (t: Hallazgo['tipo']) => r.hallazgos.filter((h) => h.tipo === t);
  const fila = (h: Hallazgo) => `| ${h.articulo} | ${h.pagina ? `${h.pagina} ${h.columna} l.${h.linea}` : '—'} | \`${h.texto.replace(/\|/g, '\\|')}\` | ${h.conf === null ? '—' : Math.round(h.conf)} | ${(h.alerta ?? h.contexto).replace(/\|/g, '\\|')} |`;
  const tabla = (hs: Hallazgo[]) => ['| Art. | Ubicación | Texto | Conf. | Contexto / alerta |', '|---|---|---|---|---|', ...hs.map(fila)].join('\n');
  const alertas = r.hallazgos.filter((h) => h.alerta);
  return [
    '# Reporte OCR preliminar · Ley de Garantías Mobiliarias (D.182-2009) · OLA 15',
    '',
    `**Generado por** \`scripts/olas/ocr-lgm.ts\` · **Fuente** La Gaceta No. 32,125 (28-ene-2010), SHA-256 \`${meta.pdf_sha256}\` · **Motor** ${meta.motor}, \`spa\`, \`--psm 4\`, ${PPI} ppi por columna`,
    '',
    '> **PRELIMINAR. No es texto apto para empaquetar.** Testigo único escaneado a 100 ppi. Ninguna corrección se aplica aquí: cada hallazgo se resuelve contra la imagen y contra el segundo testigo (CEDIJ / CNBS / TSC) cuando se incorpore.',
    '',
    '## Resumen',
    '',
    `- Articulado: ${d.encabezados.length} encabezados en orden consecutivo (1..${d.encabezados.at(-1)}); faltan: ${meta.faltantes || 'ninguno'}.`,
    `- Articulado delimitado: ${d.articulado.length} líneas, ${meta.palabras_articulado} palabras; SHA-256 del texto OCR \`${meta.articulado_sha256}\`.`,
    `- Cierre («Dado en…», firmas y sanción): ${d.cierre.length} líneas, en \`cierre_ocr.txt\`.`,
    `- Encabezados descartados por no ser consecutivos (transcripciones u OCR): ${d.descartados.length}.`,
    `- Encabezados sin guion tras el número (verificar en la imagen si es del original o del OCR): ${d.sinGuion.join(', ') || 'ninguno'}.`,
    `- Palabras con confianza < 80: ${por('BAJA_CONFIANZA').length} (${meta.pct_bajo80} %).`,
    `- Formas fuera de vocabulario (≥ 4 letras, no presentes en el corpus V5 local): ${r.oov.length} formas distintas, ${r.oov.reduce((s, o) => s + o.n, 0)} apariciones.`,
    `- Palabras con cifras: ${por('CIFRA').length}; remisiones «artículo N»: ${por('REMISION').length}; cifras en letras con paréntesis: ${por('CONCORDANCIA').length}.`,
    `- **Alertas automáticas:** ${alertas.length}.`,
    '',
    '## Alertas automáticas',
    '',
    alertas.length ? tabla(alertas) : 'Ninguna.',
    '',
    ...(d.descartados.length ? ['## Encabezados descartados', '', ...d.descartados.map((x) => `- ${x}`), ''] : []),
    '## Fuera de vocabulario (agrupado, de más a menos frecuente)',
    '',
    'Incluye vocabulario legítimo que el corpus aún no tiene («mobiliarias», «garante»…) y errores reales (palabras pegadas, letras confundidas). Hay que decidir cada forma.',
    '',
    '| Forma | Veces | Primeras ubicaciones |', '|---|---|---|',
    ...r.oov.map((o) => `| \`${o.forma}\` | ${o.n} | ${o.ejemplos.join('; ')} |`),
    '',
    '## Remisiones «artículo N»',
    '',
    tabla(por('REMISION')),
    '',
    '## Cifras en letras con paréntesis',
    '',
    tabla(por('CONCORDANCIA')),
    '',
    '## Todas las palabras con cifras',
    '',
    tabla(por('CIFRA')),
    '',
    '## Palabras con confianza < 80',
    '',
    tabla(por('BAJA_CONFIANZA')),
    '',
  ].join('\n');
}

if (process.argv[1]?.endsWith('ocr-lgm.ts')) {
  const pdfSha = createHash('sha256').update(readFileSync(PDF_GACETA_32125)).digest('hex');
  if (pdfSha !== SHA_GACETA_32125) throw new Error(`el PDF no es la Gaceta 32,125 constatada: ${pdfSha}`);
  const todas = lineas(ocrColumnas(process.argv.includes('--rehacer-ocr')));
  const d = delimitar(todas);
  if (!d.encabezados.length || !d.cierre.length) throw new Error(`OCR: no se halló el articulado (encabezados ${d.encabezados.length}, cierre ${d.cierre.length})`);
  const articulado = texto(d.articulado);
  writeFileSync(join(SALIDA, 'articulado_ocr.txt'), articulado);
  writeFileSync(join(SALIDA, 'cierre_ocr.txt'), texto(d.cierre));
  const r = reporte(d, vocabularioCorpus());
  const palabrasArt = d.articulado.reduce((s, l) => s + l.length, 0);
  const faltantes = Array.from({ length: ULTIMO_ARTICULO }, (_, k) => k + 1).filter((n) => !d.encabezados.includes(n)).join(', ');
  const meta = {
    pdf: PDF_GACETA_32125, pdf_sha256: pdfSha, motor: execFileSync(TESSERACT, ['--version'], { encoding: 'utf8' }).split(/\r?\n/)[0], ppi: PPI, psm: 4,
    recortes: RECORTES, articulado_sha256: createHash('sha256').update(articulado).digest('hex'), palabras_articulado: palabrasArt,
    pct_bajo80: Math.round((r.hallazgos.filter((h) => h.tipo === 'BAJA_CONFIANZA').length / palabrasArt) * 1000) / 10, faltantes,
    encabezados: d.encabezados, encabezados_sin_guion: d.sinGuion, descartados: d.descartados,
  };
  writeFileSync(join(SALIDA, 'reporte.json'), `${JSON.stringify({ ...meta, ...r }, null, 1)}\n`);
  writeFileSync(join(SALIDA, 'REPORTE_OCR_LGM_PRELIMINAR.md'), markdown(meta, d, r));
  console.log(`encabezados ${d.encabezados.length}/${ULTIMO_ARTICULO}; faltan [${faltantes}]; descartados ${d.descartados.length}; palabras ${palabrasArt}`);
  console.log(`baja confianza ${meta.pct_bajo80} %; OOV ${r.oov.length} formas; cifras ${r.hallazgos.filter((h) => h.tipo === 'CIFRA').length}; alertas ${r.hallazgos.filter((h) => h.alerta).length}`);
}
