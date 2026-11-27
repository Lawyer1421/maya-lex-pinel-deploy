/**
 * scripts/olas/ocr-lgap.ts
 * OLA 14 — testigo oficial de la LGAP: OCR por columnas de La Gaceta No. 25,088 (29-nov-1986, escaneo de 10 págs.) y cotejo, artículo
 * por artículo, contra el texto de la edición CEDIJ que usa el paquete (scripts/olas/ola14-lgap.ts). Solo lee archivos; no escribe en
 * ninguna base de datos ni en el paquete.
 *
 * 1. Rasteriza cada columna en gris a 300 ppi recortando con `pdftoppm -x/-y/-W/-H` (la pág. 1 sin la cabecera ni el recuadro
 *    «CONTENIDO»; las demás sin la cabecera de página) y la reconoce con Tesseract `spa`, modo de una columna (`--psm 4`).
 * 2. Une el texto en orden de lectura (izquierda y luego derecha, página a página), corta el articulado entre «ARTICULO 1.» y el
 *    «Dado en…» y lo separa por encabezados.
 * 3. Para cada artículo cuyo texto en el paquete es el ORIGINAL de 1986 (sin reforma, adición ni derogación anotada), alinea palabra por
 *    palabra (forma comparable: minúsculas, sin tildes ni puntuación) el OCR con el texto del paquete y lista cada diferencia con su
 *    contexto. Una diferencia no es por sí un error de la edición: la mayoría son errores de OCR. Cada una se resuelve mirando la imagen.
 *
 * Uso: npx tsx scripts/olas/ocr-lgap.ts [--rehacer-ocr]   → out/ola14-lgap/ocr/ (texto, cotejo.json, cotejo.md)
 * Variables: OLAS_TESSERACT, OLAS_PDFTOPPM (como ocr-diagnostico.ts).
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TESSERACT = process.env.OLAS_TESSERACT ?? 'C:/Program Files/Tesseract-OCR/tesseract.exe';
const PDFTOPPM = process.env.OLAS_PDFTOPPM ?? 'pdftoppm';
export const PDF_GACETA_25088 = 'C:/Users/fredy/OneDrive/SISTEMA_LEGAL_PRINCIPAL/00_ARCHIVOS_VARIOS/Biblioteca_Personal/LeyGeneralDeLaAdministracionPublica.pdf';
const PPI = 300;

/**
 * Recortes por página, en píxeles a 300 ppi (página de 2552 × 3288–3296). El canal entre columnas se midió sobre las cajas de palabra
 * del diagnóstico (out/ocr-diag/lgap, psm 1): está entre x = 1189 y 1297 según la página; el corte va en su centro.
 */
export const RECORTES: ReadonlyArray<{ pagina: number; columnas: ReadonlyArray<[x: number, y: number, w: number, h: number]> }> = [
  { pagina: 1, columnas: [[0, 880, 1250, 2410], [1250, 1290, 1302, 2000]] },
  ...[[2, 1256], [3, 1198], [4, 1275], [5, 1222], [6, 1272], [7, 1227], [8, 1271], [9, 1264], [10, 1231]].map(([pagina, corte]) => ({
    pagina, columnas: [[0, 170, corte, 3126], [corte, 170, 2552 - corte, 3126]] as Array<[number, number, number, number]>,
  })),
];

export function ocrColumnas(salida: string, rehacer = false): string {
  mkdirSync(join(salida, 'img'), { recursive: true });
  const partes: string[] = [];
  for (const { pagina, columnas } of RECORTES) {
    columnas.forEach(([x, y, w, h], i) => {
      const base = join(salida, `p${String(pagina).padStart(2, '0')}_${i ? 'der' : 'izq'}`);
      if (rehacer || !existsSync(`${base}.txt`)) {
        execFileSync(PDFTOPPM, ['-gray', '-png', '-r', String(PPI), '-f', String(pagina), '-l', String(pagina), '-singlefile',
          '-x', String(x), '-y', String(y), '-W', String(w), '-H', String(h), PDF_GACETA_25088, join(salida, 'img', `p${pagina}_${i}`)]);
        execFileSync(TESSERACT, [join(salida, 'img', `p${pagina}_${i}.png`), base, '-l', 'spa', '--psm', '4', 'txt', 'tsv'], { stdio: 'ignore' });
      }
      partes.push(readFileSync(`${base}.txt`, 'utf8').replace(/\r\n?/g, '\n'));
    });
  }
  return partes.join('\n');
}

/** Forma comparable de una palabra: minúsculas, sin tildes ni signos. */
export const comparable = (w: string): string => w.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9ñ]/g, '');

/** Palabras comparables de un texto, uniendo las partidas a fin de renglón («desaten-⏎der»). */
export function palabras(texto: string): string[] {
  return texto.replace(/[-—–]\s*\n\s*/g, '').split(/\s+/).map(comparable).filter(Boolean);
}

/**
 * Artículos del texto OCR, por encabezado «ARTICULO N.—» (tolera hasta 6 signos de ruido antes y el «4RTICULO» del art. 23). El
 * contenido de cada uno va del final de su encabezado al siguiente encabezado.
 */
export function articulosOcr(texto: string): Map<string, string> {
  const re = /(?:^|\n)[^\p{L}\n]{0,6}[A4][RK]T[IÍ1l]CULO\s+(\d{1,3})\s*[.,]?\s*[—–-]+\s*/giu;
  const marcas = [...texto.matchAll(re)].map((m) => ({ n: String(Number(m[1])), ini: (m.index ?? 0), fin: (m.index ?? 0) + m[0].length }));
  const out = new Map<string, string>();
  marcas.forEach((m, i) => { if (!out.has(m.n)) out.set(m.n, texto.slice(m.fin, marcas[i + 1]?.ini ?? texto.length)); });
  return out;
}

export interface Diferencia { posicion: number; ocr: string[]; paquete: string[]; contexto: string }

/** Alineación palabra a palabra (LCS) entre el OCR y el texto del paquete; devuelve los tramos que difieren. */
export function diferencias(ocr: string[], paquete: string[]): Diferencia[] {
  const n = ocr.length, m = paquete.length;
  const L: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = ocr[i] === paquete[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out: Diferencia[] = [];
  let i = 0, j = 0, a: string[] = [], b: string[] = [], pos = 0;
  const volcar = () => {
    if (a.length || b.length) out.push({ posicion: pos, ocr: a, paquete: b, contexto: paquete.slice(Math.max(0, pos - 4), pos + b.length + 4).join(' ') });
    a = []; b = [];
  };
  while (i < n || j < m) {
    if (i < n && j < m && ocr[i] === paquete[j]) { volcar(); i++; j++; pos = j; continue; }
    if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) { if (!a.length && !b.length) pos = j; b.push(paquete[j++]); } else { if (!a.length && !b.length) pos = j; a.push(ocr[i++]); }
  }
  volcar();
  return out;
}

if (process.argv[1]?.endsWith('ocr-lgap.ts')) {
  const salida = 'out/ola14-lgap/ocr';
  const texto = ocrColumnas(salida, process.argv.includes('--rehacer-ocr'));
  const ini = texto.search(/[A4]RT[IÍ1l]CULO\s+1\s*[.,]?\s*[—–-]+\s*La presente Ley/u);
  const fin = texto.search(/Dado en la ciudad de Tegucigalpa/);
  if (ini < 0 || fin < 0) throw new Error(`OCR: no se halló el articulado (inicio ${ini}, fin ${fin})`);
  const articulado = texto.slice(ini, fin);
  writeFileSync(join(salida, 'articulado_ocr.txt'), articulado);
  const motor = execFileSync(TESSERACT, ['--version'], { encoding: 'utf8' }).split(/\r?\n/)[0];
  const ocr = articulosOcr(articulado);
  const filas: Array<{ num_articulo: string; contenido: string; metadata: { constancias: Array<{ tipo: string }> } }> =
    readFileSync('out/ola14-lgap/rows.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const informe: Array<{ articulo: string; original: boolean; palabras_ocr: number; palabras_paquete: number; diferencias: Diferencia[] }> = [];
  for (const f of filas) {
    if (!/^\d+$/.test(f.num_articulo)) continue;
    const original = !f.metadata.constancias.some((c) => /REFORMA|ADICION|DEROGACION|FE_DE_ERRATAS/.test(c.tipo));
    const t = ocr.get(f.num_articulo);
    const po = t ? palabras(t) : [];
    const pp = palabras(f.contenido);
    informe.push({ articulo: f.num_articulo, original, palabras_ocr: po.length, palabras_paquete: pp.length, diferencias: original && t ? diferencias(po, pp) : [] });
  }
  const huecos = Array.from({ length: 126 }, (_, k) => String(k + 1)).filter((n) => !ocr.has(n));
  const pdfSha = createHash('sha256').update(readFileSync(PDF_GACETA_25088)).digest('hex');
  writeFileSync(join(salida, 'cotejo.json'), JSON.stringify({ pdf: PDF_GACETA_25088, pdf_sha256: pdfSha, motor, ppi: PPI, psm: 4, recortes: RECORTES,
    articulado_sha256: createHash('sha256').update(articulado).digest('hex'), encabezados_ocr: ocr.size, huecos, informe }, null, 1));
  const originales = informe.filter((x) => x.original);
  console.log(`motor ${motor}; encabezados OCR ${ocr.size}/126; huecos [${huecos.join(', ')}]`);
  console.log(`artículos con texto original de 1986: ${originales.length}; diferencias a revisar: ${originales.reduce((s, x) => s + x.diferencias.length, 0)}`);
}
