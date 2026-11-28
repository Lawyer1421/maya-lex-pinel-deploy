/**
 * scripts/olas/cotejo-lgm.ts
 * OLA 15 — Ley de Garantías Mobiliarias (D.182-2009): cotejo cruzado D1 de tres testigos escaneados de La Gaceta No. 32,125.
 *   - BASE: el escaneo a 100 ppi ya reconocido por `ocr-lgm.ts` (TSV en out/ola15-lgm/ocr; se reutilizan, no se rehacen);
 *   - TSC: escaneo independiente a 150 ppi del Tribunal Superior de Cuentas;
 *   - CCIT: escaneo independiente a 150 ppi de la Cámara de Comercio e Industrias de Tegucigalpa (con sello del COHEP).
 * Solo lee PDFs y archivos locales; no escribe en ninguna base de datos ni genera paquete alguno.
 *
 * 1. Para TSC y CCIT, por página: corte entre columnas por la raya vertical de la Gaceta (respaldo: el canal blanco más ancho), a
 *    100 ppi; cada columna se reconoce a 300 ppi con Tesseract `spa` de tres modos (`MODOS`: psm 4, psm 6 y renglones reespaciados).
 *    La cabecera se quita por posición (cajas del TSV); el pie «A. N», con `lineas`. Pág. 1: solo la columna derecha.
 * 2. `cotejar`: cada columna de un testigo se alinea con la misma columna de la BASE (misma impresión, misma maquetación); los límites
 *    de artículo son los de la BASE (86/86 encabezados). El recuadro publicitario de la pág. 2 queda fuera.
 * 3. `tramos`: voto por tramos normalizados; un testigo apoya una forma si alguna de sus lecturas la da; gana la forma con dos testigos.
 * 4. `RESOLUCIONES` (conflictos, uno por uno) y `CORRECCIONES` (verificadas contra la imagen), separación de formas pegadas y
 *    restitución de tildes con el vocabulario del corpus V5 firmado. Resultado y motivos: docs/corpus/fase2/ocr/REPORTE_COTEJO_D1_LGM_OLA15.md.
 *
 * Uso: npx tsx scripts/olas/cotejo-lgm.ts [--rehacer-ocr | --geometria]  → out/ola15-lgm/cotejo/ (TSV e imágenes por testigo,
 *      articulado_<testigo>.txt, articulado_cotejado.txt, cotejo.json)
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { join } from 'node:path';
import { delimitar, lineas, ocrColumnas, vocabularioCorpus, PDF_GACETA_32125, SHA_GACETA_32125, ULTIMO_ARTICULO, type Delimitado, type Palabra } from './ocr-lgm';

const TESSERACT = process.env.OLAS_TESSERACT ?? 'C:/Program Files/Tesseract-OCR/tesseract.exe';
const PDFTOPPM = process.env.OLAS_PDFTOPPM ?? 'pdftoppm';
const DIR = 'C:/Users/fredy/OneDrive/SISTEMA_LEGAL_PRINCIPAL/02_EJERCICIO_LEGAL/05_LEYES_Y_CODIGOS';
const SALIDA = 'out/ola15-lgm/cotejo';
const PPI = 300;
const PPI_GEOMETRIA = 100;

export const TESTIGOS = [
  { id: 'tsc', nombre: 'TSC', pdf: `${DIR}/LGM_Gaceta_32125_TSC.pdf`, sha: '66270e8d35d3d1ed5561028380baca78cb74f82ff2d8da5f97095c7a3856f267',
    url: 'https://www.tsc.gob.hn/web/leyes/Ley%20de%20Garantias%20Mobiliarias.pdf' },
  { id: 'ccit', nombre: 'CCIT', pdf: `${DIR}/LGM_Gaceta_32125_CCIT.pdf`, sha: '94b687017b5068c8bb1a8535c4c06bca91c52fe209191290ee5cfa67dfff0ce6',
    url: 'https://www.ccit.hn/_files/ugd/7ccb0d_31ef38e4ea7b499b8992920a1cf25205.pdf' },
] as const;
export const ACUERDO_001_2020 = { pdf: `${DIR}/Acuerdo_001-2020_Reforma_Reglamento_RGM_Gaceta_35166.pdf`, sha: 'd54d09691e8a3503ee7fd89973a9dd0e4307e971a3c567c5693f773c642c4b24' };
const PAGINAS_LEY = 20;

const sha256 = (b: Buffer | string): string => createHash('sha256').update(b).digest('hex');

/**
 * PNG de 8 bits sin entrelazar (gris o RGB, como lo escribe pdftoppm) → luminancia por píxel. Se decodifica a mano con zlib para no
 * depender de librerías de imagen (el PGM de poppler 25 en Windows no cuadra con la página: se descartó).
 */
function leerPng(f: string): { w: number; h: number; px: Uint8Array } {
  const b = readFileSync(f);
  let o = 8, w = 0, h = 0, tipo = 0;
  const idat: Buffer[] = [];
  while (o < b.length) {
    const len = b.readUInt32BE(o), t = b.toString('latin1', o + 4, o + 8), d = b.subarray(o + 8, o + 8 + len);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); if (d[8] !== 8 || d[12] !== 0) throw new Error(`PNG no soportado: ${f}`); tipo = d[9]; }
    if (t === 'IDAT') idat.push(d);
    o += 12 + len;
  }
  const canales = ({ 0: 1, 2: 3, 4: 2, 6: 4 } as Record<number, number>)[tipo];
  if (!canales) throw new Error(`PNG tipo ${tipo} no soportado: ${f}`);
  const raw = inflateSync(Buffer.concat(idat)), fila = w * canales, px = new Uint8Array(w * h);
  let prev = new Uint8Array(fila);
  for (let y = 0; y < h; y++) {
    const filtro = raw[y * (fila + 1)], cur = new Uint8Array(raw.subarray(y * (fila + 1) + 1, (y + 1) * (fila + 1)));
    for (let i = 0; i < fila; i++) {
      const a = i >= canales ? cur[i - canales] : 0, up = prev[i], c = i >= canales ? prev[i - canales] : 0;
      const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c);
      cur[i] = (cur[i] + [0, a, up, (a + up) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? up : c][filtro]) & 255;
    }
    for (let x = 0; x < w; x++) px[y * w + x] = canales >= 3 ? Math.round((cur[x * canales] * 299 + cur[x * canales + 1] * 587 + cur[x * canales + 2] * 114) / 1000) : cur[x * canales];
    prev = cur;
  }
  return { w, h, px };
}

/** Canal entre columnas (x a PPI) y tamaño de página a PPI: el tramo más ancho de baja tinta en la franja central del cuerpo. */
export function geometria(pdf: string, pagina: number, dir: string): { ancho: number; alto: number; corte: number; metodo: string } {
  const base = join(dir, `geo_p${String(pagina).padStart(2, '0')}`);
  if (!existsSync(`${base}.png`)) execFileSync(PDFTOPPM, ['-gray', '-png', '-r', String(PPI_GEOMETRIA), '-f', String(pagina), '-l', String(pagina), '-singlefile', pdf, base]);
  const { w, h, px } = leerPng(`${base}.png`);
  // Tinta = gris < 200: a baja resolución el texto del escaneo sale gris claro y un umbral más oscuro no lo ve.
  // Pág. 1: solo la franja bajo el sumario (el borde del recuadro del sumario es otra raya vertical).
  const y0 = Math.round(h * (pagina === 1 ? 0.66 : 0.12)), y1 = Math.round(h * 0.9), x0 = Math.round(w * 0.36), x1 = Math.round(w * 0.64);
  const tinta: number[] = [];
  for (let x = x0; x < x1; x++) { let n = 0; for (let y = y0; y < y1; y++) if (px[y * w + x] < 200) n++; tinta.push(n); }
  const umbral = Math.min(...tinta) + Math.max(3, (y1 - y0) * 0.01);
  const blanco = tinta.map((n) => n <= umbral);
  // La raya vertical del canal (1–3 px de tinta entre blancos) cuenta como blanco.
  for (let i = 1; i < blanco.length; i++) if (!blanco[i] && blanco[i - 1]) { let j = i; while (j < blanco.length && !blanco[j]) j++; if (j - i <= 3 && j < blanco.length) for (let q = i; q < j; q++) blanco[q] = true; }
  let mejor = { ini: 0, len: 0 };
  for (let i = 0; i < blanco.length;) {
    if (!blanco[i]) { i++; continue; }
    let j = i; while (j < blanco.length && blanco[j]) j++;
    if (j - i > mejor.len) mejor = { ini: i, len: j - i };
    i = j;
  }
  // La Gaceta separa las columnas con una raya vertical: si existe (la racha vertical de tinta más larga de la franja, > 25 % del alto,
  // mirando 3 px de ancho porque el escaneo la inclina), manda ella; el tramo blanco más ancho es el respaldo (una lista con sangría
  // puede dejar dentro de una columna una franja blanca más ancha que el canal).
  let raya = { x: -1, racha: 0 };
  for (let x = Math.max(1, x0); x < Math.min(w - 1, x1); x++) {
    let r = 0, max = 0;
    for (let y = y0; y < y1; y++) { if (Math.min(px[y * w + x - 1], px[y * w + x], px[y * w + x + 1]) < 200) { r++; if (r > max) max = r; } else r = 0; }
    if (max > raya.racha) raya = { x, racha: max };
  }
  const k = PPI / PPI_GEOMETRIA;
  const corte = raya.racha > (y1 - y0) * 0.25 ? raya.x : x0 + mejor.ini + mejor.len / 2;
  return { ancho: Math.round(w * k), alto: Math.round(h * k), corte: Math.round(corte * k), metodo: raya.racha > (y1 - y0) * 0.25 ? 'raya' : 'blanco' };
}

interface Caja { pagina: number; columna: 'izq' | 'der'; linea: number; texto: string; conf: number; top: number; bottom: number }
function cajasTsv(tsv: string, pagina: number, columna: 'izq' | 'der', dy: number): Caja[] {
  const out: Caja[] = [];
  const ids = new Map<string, number>();
  for (const fila of tsv.split(/\r?\n/).slice(1)) {
    const c = fila.split('\t');
    if (c[0] !== '5' || !c[11] || !c[11].trim()) continue;
    const clave = `${c[2]}/${c[3]}/${c[4]}`;
    if (!ids.has(clave)) ids.set(clave, ids.size + 1);
    out.push({ pagina, columna, linea: ids.get(clave)!, texto: c[11].trim(), conf: Number(c[10]), top: Number(c[7]) + dy, bottom: Number(c[7]) + Number(c[9]) + dy });
  }
  return out;
}

const RE_CABECERA = /Gaceta|REP[UÚ]BLICA|HONDURAS|TEGUCIGALPA|ENERO|2010|32[.,]\s?125|Secci[oó]n|Acuerdos/;

/** Quita la cabecera: todas las palabras hasta el borde inferior de la última línea de la franja superior que la nombra. */
function sinCabecera(cajas: Caja[], alto: number): { cajas: Caja[]; corte: number } {
  const franja = alto * 0.11;
  let corte = -1;
  const porLinea = new Map<number, Caja[]>();
  for (const c of cajas) porLinea.set(c.linea, [...(porLinea.get(c.linea) ?? []), c]);
  for (const l of porLinea.values()) {
    if (Math.min(...l.map((c) => c.top)) > franja) continue;
    if (RE_CABECERA.test(l.map((c) => c.texto).join(' '))) corte = Math.max(corte, ...l.map((c) => c.bottom));
  }
  return { cajas: corte < 0 ? cajas : cajas.filter((c) => c.top > corte), corte };
}

export type Columnas = Map<string, Palabra[]>;
const claveCol = (pagina: number, columna: string): string => `${String(pagina).padStart(2, '0')}_${columna}`;

/**
 * Renglones de una columna por proyección horizontal de tinta (gris < 170), y la columna recompuesta con 24 px de blanco entre renglones
 * (PGM). Tesseract, con renglones apretados tras un epígrafe en negrita, junta dos renglones y pierde uno («ARTÍCULO 6.- … Una» y luego
 * «garante y el acreedor…», sin «garantía mobiliaria se constituye mediante contrato entre el deudor»); con el blanco añadido no.
 */
export function reespaciar(png: string, pgm: string): Array<{ y0: number; ny0: number }> {
  const { w, h, px } = leerPng(png);
  const tinta = Array.from({ length: h }, (_, y) => { let n = 0; for (let x = 0; x < w; x++) if (px[y * w + x] < 170) n++; return n; });
  // Blanco entre renglones = fila con menos del 6 % de la tinta mediana de las filas con texto (descendentes y la leve inclinación del
  // escaneo dejan algo de tinta entre renglones).
  const conTexto = tinta.filter((n) => n > 0).sort((a, b) => a - b);
  const umbral = Math.max(3, (conTexto[Math.floor(conTexto.length / 2)] ?? 0) * 0.06);
  const crudas: Array<[number, number]> = [];
  for (let y = 0; y < h;) {
    if (tinta[y] < umbral) { y++; continue; }
    let z = y; while (z < h && tinta[z] >= umbral) z++;
    const ult = crudas.at(-1);
    if (ult && y - ult[1] <= 2) ult[1] = z; else crudas.push([y, z]);
    y = z;
  }
  // Bandas de varios renglones pegados: se parten en los mínimos de tinta cerca de cada múltiplo del paso de renglón (mediana de alturas).
  const altos = crudas.map(([a, b]) => b - a).filter((x) => x > 10).sort((a, b) => a - b);
  const paso = altos[Math.floor(altos.length / 2)] ?? 40;
  const bandas: Array<[number, number]> = [];
  for (const [a, b] of crudas) {
    const n = Math.round((b - a) / paso);
    if (n < 2) { bandas.push([a, b]); continue; }
    let ini = a;
    for (let k = 1; k < n; k++) {
      const c = Math.round(a + (k * (b - a)) / n), r = Math.round(paso / 3);
      let mejor = c;
      for (let yy = c - r; yy <= c + r; yy++) if (yy > ini && yy < b && tinta[yy] < tinta[mejor]) mejor = yy;
      bandas.push([ini, mejor]); ini = mejor;
    }
    bandas.push([ini, b]);
  }
  const GAP = 24, M = 4;
  const mapa: Array<{ y0: number; ny0: number }> = [];
  let alto = GAP;
  for (const [a, b] of bandas) { mapa.push({ y0: Math.max(0, a - M), ny0: alto }); alto += Math.min(h, b + M) - Math.max(0, a - M) + GAP; }
  const out = new Uint8Array(w * alto).fill(255);
  bandas.forEach(([a, b], i) => { const y0 = Math.max(0, a - M), y1 = Math.min(h, b + M); out.set(px.subarray(y0 * w, y1 * w), mapa[i].ny0 * w); });
  writeFileSync(pgm, Buffer.concat([Buffer.from(`P5\n${w} ${alto}\n255\n`, 'latin1'), Buffer.from(out)]));
  return mapa;
}

/** Lecturas de cada columna de un testigo: Tesseract psm 4, psm 6 y psm 6 sobre la columna con renglones reespaciados. */
export const MODOS = ['psm4', 'psm6', 'renglones'] as const;

/**
 * OCR de un testigo por columna en los tres MODOS: cada uno pierde renglones o bloques distintos en estos escaneos (TSC pág. 13 con
 * psm 4: el encabezado del art. 54). Para el cotejo cuentan todas las lecturas (`porModo`); `columnas` guarda, para informar, la que
 * reconoce más palabras.
 */
export function ocrTestigo(t: (typeof TESTIGOS)[number], rehacer: boolean): { columnas: Columnas; porModo: Columnas[]; geo: unknown[] } {
  const dir = join(SALIDA, t.id);
  mkdirSync(join(dir, 'img'), { recursive: true });
  const columnas: Columnas = new Map(), geo: unknown[] = [];
  const porModo: Columnas[] = MODOS.map(() => new Map());
  for (let pagina = 1; pagina <= PAGINAS_LEY; pagina++) {
    const g = geometria(t.pdf, pagina, dir);
    // Pág. 1: solo la columna derecha, desde bajo la cabecera de portada (el sumario no tiene encabezados «ARTÍCULO N.-»).
    const y = pagina === 1 ? Math.round(g.alto * 0.25) : 0;
    const cols: Array<['izq' | 'der', number, number]> = pagina === 1 ? [['der', g.corte, g.ancho - g.corte]] : [['izq', 0, g.corte], ['der', g.corte, g.ancho - g.corte]];
    const eleccion: Record<string, string> = {};
    for (const [columna, x, w] of cols) {
      const img = join(dir, 'img', `p${claveCol(pagina, columna)}`);
      if (rehacer || !existsSync(`${img}.png`)) execFileSync(PDFTOPPM, ['-gray', '-png', '-r', String(PPI), '-f', String(pagina), '-l', String(pagina), '-singlefile',
        '-x', String(x), '-y', String(y), '-W', String(w), '-H', String(g.alto - y), t.pdf, img]);
      const lecturas = MODOS.map((modo) => {
        const base = join(dir, `p${claveCol(pagina, columna)}${modo === 'psm4' ? '' : modo === 'psm6' ? '_psm6' : '_renglones'}`);
        let mapa: Array<{ y0: number; ny0: number }> | null = null;
        if (modo === 'renglones') {
          mapa = reespaciar(`${img}.png`, `${img}_renglones.pgm`);
          writeFileSync(`${base}.mapa.json`, JSON.stringify(mapa));
        }
        if (rehacer || !existsSync(`${base}.tsv`)) execFileSync(TESSERACT, [modo === 'renglones' ? `${img}_renglones.pgm` : `${img}.png`, base, '-l', 'spa', '--psm', modo === 'psm4' ? '4' : '6', 'txt', 'tsv'], { stdio: 'ignore' });
        let todas = cajasTsv(readFileSync(`${base}.tsv`, 'utf8'), pagina, columna, 0);
        if (mapa) {
          // De la imagen reespaciada a la coordenada de la columna original (para quitar la cabecera por posición).
          const m = mapa;
          const aOriginal = (ny: number): number => { let k = 0; while (k + 1 < m.length && m[k + 1].ny0 <= ny) k++; return m.length ? m[k].y0 + (ny - m[k].ny0) : ny; };
          todas = todas.map((c) => ({ ...c, top: aOriginal(c.top), bottom: aOriginal(c.bottom) }));
        }
        todas = todas.map((c) => ({ ...c, top: c.top + y, bottom: c.bottom + y }));
        const { cajas, corte } = pagina === 1 ? { cajas: todas, corte: -1 } : sinCabecera(todas, g.alto);
        return { modo, corte, palabras: cajas.map(({ pagina: p, columna: c, linea, texto, conf }) => ({ pagina: p, columna: c, linea, texto, conf })) };
      });
      const mejor = lecturas.reduce((a, b) => (b.palabras.length > a.palabras.length ? b : a));
      columnas.set(claveCol(pagina, columna), mejor.palabras);
      lecturas.forEach((l, q) => porModo[q].set(claveCol(pagina, columna), l.palabras));
      eleccion[columna] = `${mejor.modo} (${lecturas.map((l) => `${l.modo}=${l.palabras.length}`).join(', ')}; cabecera hasta y=${mejor.corte})`;
    }
    geo.push({ pagina, ...g, eleccion });
  }
  return { columnas, porModo, geo };
}

/** Como RE_ENCABEZADO de ocr-lgm.ts, pero el número admite lo que el OCR pone por un dígito («$» por 8, «O» por 0, «l» por 1). */
const RE_CANDIDATO = /^[^\p{L}"“”'«]{0,4}[A4][RK]T[IÍ1lí][CG]ULO\s*([0-9$SOolIi|]{1,3})\s*(?:[.,:]?\s*([-—–])|\.\s+(?=\p{Lu}{2}))/u;
const RE_DADO = /^Dado\s+en\s+la\s+ciudad\s+de\s+Tegucigalpa/u;

/**
 * Delimitación tolerante para los testigos: la regla «solo encabezados consecutivos» se rompe con un dígito mal leído (TSC lee «13» en el
 * art. 18; CCIT, «$» en el 8). Un encabezado cuyo número no es el esperado se acepta como el esperado si alguno de los dos encabezados
 * siguientes confirma la secuencia (lleva el número esperado + 1 o + 2); la corrección queda anotada en `renumerados`.
 */
export function delimitarTolerante(todas: Palabra[][]): Delimitado & { renumerados: string[] } {
  const txt = todas.map((l) => l.map((p) => p.texto).join(' '));
  let fin = txt.findIndex((t, i) => i > 0 && RE_DADO.test(t));
  if (fin < 0) fin = todas.length;
  const cand = txt.map((t, i) => (i < fin ? t.match(RE_CANDIDATO) : null)).map((m, i) => (m ? { i, n: /^\d+$/.test(m[1]) ? Number(m[1]) : NaN, guion: !!m[2] } : null)).filter((x): x is { i: number; n: number; guion: boolean } => !!x);
  const articulado: Palabra[][] = [], articuloDeLinea: number[] = [], encabezados: number[] = [], sinGuion: number[] = [], descartados: string[] = [], renumerados: string[] = [];
  const aceptados = new Map<number, number>();
  let actual = 0;
  cand.forEach((c, k) => {
    const esperado = actual + 1;
    if (actual === 0 && c.n !== 1) return;
    const confirma = cand.slice(k + 1, k + 3).some((s, q) => s.n === esperado + 1 + q);
    if (c.n === esperado || (actual >= 1 && confirma && !(c.n > actual + 2))) {
      if (c.n !== esperado) renumerados.push(`pág. ${todas[c.i][0].pagina} ${todas[c.i][0].columna}: «${txt[c.i].slice(0, 50)}» leído como ${Number.isNaN(c.n) ? 'ilegible' : c.n}; es el ${esperado} por la secuencia`);
      actual = esperado; aceptados.set(c.i, esperado); encabezados.push(esperado);
      if (!c.guion) sinGuion.push(esperado);
    } else if (actual >= 1) descartados.push(`pág. ${todas[c.i][0].pagina} ${todas[c.i][0].columna}: «${txt[c.i].slice(0, 70)}» (tras el art. ${actual})`);
  });
  let art = 0, i = 0;
  for (; i < fin; i++) {
    if (aceptados.has(i)) art = aceptados.get(i)!;
    if (art >= 1) { articulado.push(todas[i]); articuloDeLinea.push(art); }
  }
  const cierre: Palabra[][] = [];
  for (; i < todas.length; i++) {
    if (cierre.length && (todas[i][0].columna !== cierre[0][0].columna || /Poder\s+Legislativo|DECRETO\s+No/i.test(txt[i]))) break;
    cierre.push(todas[i]);
  }
  return { articulado, cierre, articuloDeLinea, encabezados, sinGuion, descartados, renumerados };
}

// ───────────────────────────── cotejo ─────────────────────────────

export interface Token { t: string; conf: number; articulo: number; pagina: number; columna: string }

/** Vocabulario del corpus V5 firmado (se carga una vez): decide si una palabra partida a fin de línea se une con guion o sin él. */
let VOC: Set<string> | null = null;
const voc = (): Set<string> => (VOC ??= vocabularioCorpus());

/**
 * Tokens de una columna en orden de lectura. Palabra partida a fin de línea («consti-» + «tución», «PRO-» + «PIEDAD»): se une sin guion
 * si la palabra unida está en el vocabulario o la primera mitad no es palabra; si no, se conserva el guion de la palabra compuesta
 * («no-» + «dinerarias» → «no-dinerarias», «TÍTULOS-» + «VALORES»). `articuloDe` da el artículo de cada línea (0 fuera del articulado).
 */
export function tokensColumna(ls: Palabra[][], articuloDe: (l: Palabra[]) => number): Token[] {
  const out: Token[] = [];
  for (const l of ls) for (const p of l) {
    const ult = out.at(-1);
    const mismaCaja = (a: string, b: string): boolean => (/\p{Lu}/u.test(a) && /^\p{Lu}/u.test(b)) || (/\p{Ll}/u.test(a.slice(-2, -1)) && /^\p{Ll}/u.test(b));
    if (ult && /\p{L}-$/u.test(ult.t) && /^\p{L}/u.test(p.texto) && l[0] === p && mismaCaja(ult.t.slice(0, -1), p.texto)) {
      const raiz = ult.t.slice(0, -1), w = (raiz + p.texto).replace(/[^\p{L}]+$/u, '');
      // Sin guion si la palabra unida existe o si la primera mitad no es palabra («GARAN-» + «TIZADORES»); con guion si las dos lo son.
      ult.t = voc().has(w.toLowerCase()) || !voc().has(raiz.toLowerCase()) ? raiz + p.texto : `${raiz}-${p.texto}`;
      ult.conf = Math.min(ult.conf, p.conf);
      continue;
    }
    out.push({ t: p.texto, conf: p.conf, articulo: articuloDe(l), pagina: p.pagina, columna: p.columna });
  }
  return out;
}

function lev(a: string, b: string): number {
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
const costoSub = (a: string, b: string): number => (a === b ? 0 : 0.4 + 0.6 * (lev(a, b) / Math.max(a.length, b.length)));

/**
 * Alinea `otro` contra `base`: para cada posición i de la base, la palabra que le corresponde (o '' si el testigo la omite), y para
 * cada hueco i (antes de base[i]; el último, al final) lo que el testigo inserta.
 */
export function alinear(base: string[], otro: string[]): { en: string[]; ins: string[] } {
  const m = base.length, n = otro.length;
  const D = Array.from({ length: m + 1 }, () => new Float64Array(n + 1));
  for (let i = 0; i <= m; i++) D[i][0] = i;
  for (let j = 0; j <= n; j++) D[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + costoSub(base[i - 1], otro[j - 1]));
  const en: string[] = Array(m).fill(''), ins: string[][] = Array.from({ length: m + 1 }, () => []);
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && Math.abs(D[i][j] - (D[i - 1][j - 1] + costoSub(base[i - 1], otro[j - 1]))) < 1e-9) { en[i - 1] = otro[j - 1]; i--; j--; }
    else if (i > 0 && Math.abs(D[i][j] - (D[i - 1][j] + 1)) < 1e-9) { en[i - 1] = ''; i--; }
    else { ins[i].unshift(otro[j - 1]); j--; }
  }
  return { en, ins: ins.map((x) => x.join(' ')) };
}

export type Estado = 'UNANIME' | 'SEGMENTACION' | 'MAYORIA_BASE' | 'CORREGIDA' | 'CONFLICTO' | 'RESUELTA';
/** Lectura alineada de cada testigo en una posición de la BASE: una por modo de Tesseract (psm 4, psm 6). */
export interface Posicion { articulo: number; base: string; tsc: string[]; ccit: string[]; hueco: boolean; pagina: number; columna: string }

/**
 * Cotejo por columna: los tres escaneos son de la misma impresión, con la misma maquetación, así que cada columna de un testigo se alinea
 * con la misma columna de la BASE y los límites de artículo se toman de la BASE (86/86 encabezados). Un encabezado mal leído o un bloque
 * perdido en un testigo solo afecta a sus propias posiciones, que deciden los otros dos.
 */
export const RECUADRO: string[] = [];

export function cotejar(baseLineas: Palabra[][], dBase: Delimitado, tsc: Columnas[], ccit: Columnas[]): Posicion[] {
  const artDe = new Map<Palabra[], number>();
  dBase.articulado.forEach((l, k) => artDe.set(l, dBase.articuloDeLinea[k]));
  const porCol = new Map<string, Palabra[][]>();
  for (const l of baseLineas) { const c = claveCol(l[0].pagina, l[0].columna); porCol.set(c, [...(porCol.get(c) ?? []), l]); }
  // El recuadro publicitario de la Gaceta («La Gaceta … CENTRO CÍVICO GUBERNAMENTAL», pág. 2 der.) cae dentro del art. 3: no es texto
  // de la ley y queda fuera del cotejo.
  for (const ls of porCol.values()) {
    const txt = ls.map((l) => l.map((p) => p.texto).join(' '));
    const ini = txt.findIndex((t) => /^La\s+Gaceta$/.test(t.trim()));
    const fin = txt.findIndex((t, i) => i > ini && /GUBERNAMENTAL/.test(t));
    if (ini >= 0 && fin > ini && fin - ini < 25) for (let i = ini; i <= fin; i++) { artDe.set(ls[i], 0); RECUADRO.push(txt[i]); }
  }
  const out: Posicion[] = [];
  for (const [col, ls] of porCol) {
    const tb = tokensColumna(ls, (l) => artDe.get(l) ?? 0);
    if (!tb.some((x) => x.articulo >= 1)) continue;
    const b = tb.map((x) => x.t);
    const al = (cs: Columnas[]) => cs.map((c) => alinear(b, tokensColumna(lineas(c.get(col) ?? []), () => 0).map((x) => x.t)));
    const aT = al(tsc), aC = al(ccit);
    for (let k = 0; k <= b.length; k++) {
      const loc = tb[Math.min(k, tb.length - 1)];
      // Un hueco pertenece al artículo de la palabra que lo precede (en la frontera entre artículos, lo insertado es el final del
      // anterior: «plazo anterior.» del art. 45); al principio de la columna, al de la palabra que lo sigue.
      const artHueco = k > 0 && tb[k - 1].articulo >= 1 ? tb[k - 1].articulo : k < tb.length ? tb[k].articulo : tb[k - 1].articulo;
      const iT = aT.map((a) => a.ins[k]), iC = aC.map((a) => a.ins[k]);
      if ([...iT, ...iC].some(Boolean) && artHueco >= 1 && (k === 0 || tb[k - 1].articulo >= 1) && (k === tb.length || tb[k].articulo >= 1 || tb[k - 1]?.articulo >= 1)) out.push({ articulo: artHueco, base: '', tsc: iT, ccit: iC, hueco: true, pagina: loc.pagina, columna: loc.columna });
      if (k < b.length && tb[k].articulo >= 1) out.push({ articulo: tb[k].articulo, base: b[k], tsc: aT.map((a) => a.en[k]), ccit: aC.map((a) => a.en[k]), hueco: false, pagina: loc.pagina, columna: loc.columna });
    }
  }
  return out;
}

/** Forma de comparación: sin espacios y sin signos sueltos (fichas sin letra ni dígito: «-», «:», «|», «.»), que el OCR siembra al azar. */
export const normalizar = (x: string): string => x.split(/\s+/).filter((w) => /[\p{L}\d]/u.test(w)).join('');

/** Unánime si cada testigo tiene alguna lectura igual a la BASE. */
const unanime = (p: Posicion): boolean => p.tsc.includes(p.base) && p.ccit.includes(p.base);

export interface Tramo { articulo: number; pagina: number; columna: string; base: string; tsc: string[]; ccit: string[]; voto: string; estado: Estado; apoyo: string }

/**
 * Voto por tramos: las posiciones no unánimes contiguas se juntan y se comparan normalizadas (sin espacios ni signos sueltos), porque la
 * Gaceta compone muy apretado y el OCR pega o separa palabras de forma distinta en cada escaneo («El monto» / «Elmonto»).
 * Cada testigo apoya una forma si alguna de sus lecturas la da; gana la forma con el apoyo de al menos dos de los tres testigos.
 *   SEGMENTACION: los tres coinciden salvo espacios y signos sueltos · MAYORIA_BASE: la BASE y un testigo · CORREGIDA: los dos testigos
 *   contra la BASE · CONFLICTO: ninguna forma reúne dos testigos (se resuelve contra la imagen).
 * El texto del voto es la lectura con más palabras entre las que dan la forma ganadora (sin signos sueltos sobrantes).
 */
export function tramos(pos: Posicion[]): Tramo[] {
  const out: Tramo[] = [];
  for (let i = 0; i < pos.length;) {
    const p = pos[i];
    if (unanime(p)) { out.push({ articulo: p.articulo, pagina: p.pagina, columna: p.columna, base: p.base, tsc: p.tsc, ccit: p.ccit, voto: p.base, estado: 'UNANIME', apoyo: 'B T C' }); i++; continue; }
    let j = i;
    while (j < pos.length && !unanime(pos[j]) && pos[j].articulo === p.articulo && pos[j].pagina === p.pagina && pos[j].columna === p.columna) j++;
    const g = pos.slice(i, j);
    const unir = (vs: string[]): string => vs.filter(Boolean).join(' ');
    const b = unir(g.map((x) => x.base));
    const t = p.tsc.map((_, q) => unir(g.map((x) => x.tsc[q])));
    const c = p.ccit.map((_, q) => unir(g.map((x) => x.ccit[q])));
    const lect: Array<{ w: 'B' | 'T' | 'C'; s: string }> = [{ w: 'B', s: b }, ...t.map((s) => ({ w: 'T' as const, s })), ...c.map((s) => ({ w: 'C' as const, s }))];
    const apoyos = new Map<string, Set<string>>();
    for (const l of lect) { const n = normalizar(l.s); apoyos.set(n, (apoyos.get(n) ?? new Set()).add(l.w)); }
    // Empate de dos formas con dos testigos cada una (un testigo apoya ambas con lecturas distintas): si una es la omisión (''), gana el
    // texto, porque el OCR pierde renglones pero no inventa el mismo texto en dos testigos; si no, conflicto.
    const orden = [...apoyos].sort((x, y) => y[1].size - x[1].size || (x[0] === '' ? 1 : 0) - (y[0] === '' ? 1 : 0));
    let [forma, quien] = orden[0];
    let empate = orden.length > 1 && orden[1][1].size === quien.size && orden[1][0] !== '';
    let regla = '';
    // Sin mayoría: se compara sin tildes; si así hay dos testigos, gana la lectura con más tildes (perder una tilde es el error típico).
    if (quien.size < 2 || empate) {
      const sinT = (x: string): string => x.normalize('NFD').replace(/\p{M}/gu, '');
      const ap2 = new Map<string, Set<string>>();
      for (const l of lect) { const n = sinT(normalizar(l.s)); ap2.set(n, (ap2.get(n) ?? new Set()).add(l.w)); }
      const o2 = [...ap2].sort((x, y) => y[1].size - x[1].size || (x[0] === '' ? 1 : 0) - (y[0] === '' ? 1 : 0));
      if (o2[0][1].size >= 2 && !(o2.length > 1 && o2[1][1].size === o2[0][1].size && o2[1][0] !== '')) {
        const tildes = (x: string): number => x.normalize('NFD').length - x.length;
        const cands = lect.filter((l) => sinT(normalizar(l.s)) === o2[0][0]);
        const elegida = cands.reduce((a, b2) => (tildes(normalizar(b2.s)) > tildes(normalizar(a.s)) ? b2 : a));
        forma = normalizar(elegida.s); quien = o2[0][1]; empate = false; regla = 'tildes';
      }
    }
    const limpiar = (x: string): string => x.split(/\s+/).filter((w, k, ws) => /[\p{L}\d]/u.test(w) || (k > 0 && k === ws.length - 1 && /^[.,;:]$/.test(w))).join(' ');
    let estado: Estado, voto: string;
    if (quien.size < 2 || empate) { estado = 'CONFLICTO'; voto = b; }
    else {
      estado = quien.size === 3 && !regla ? 'SEGMENTACION' : quien.has('B') && normalizar(b) === forma ? 'MAYORIA_BASE' : 'CORREGIDA';
      voto = lect.filter((l) => normalizar(l.s) === forma).map((l) => limpiar(l.s)).reduce((x, y) => (y.split(' ').length > x.split(' ').length ? y : x));
    }
    out.push({ articulo: p.articulo, pagina: p.pagina, columna: p.columna, base: b, tsc: t, ccit: c, voto, estado, apoyo: [...quien].join(' ') + (regla ? ` (${regla})` : '') });
    i = j;
  }
  return out;
}

/**
 * Resolución dirigida de los CONFLICTOS (ninguna forma con dos testigos), uno por uno. `clave` identifica el tramo dentro del artículo
 * por un fragmento de la lectura de la BASE (cada regla debe casar con un solo conflicto). `motivo`: «imagen» = verificado en el recorte
 * del escaneo CCIT a 150 ppi (pág./col.); «contexto» = el tramo es un artefacto de alineación o de signos sueltos y la palabra está
 * completa en el tramo vecino; «testigos» = los testigos que conservan el texto coinciden y el otro perdió el renglón.
 */
export const RESOLUCIONES: ReadonlyArray<{ articulo: number; clave: string; voto: string; motivo: string }> = [
  { articulo: 1, clave: 'II', voto: 'II', motivo: 'imagen p. 2 izq.: «CAPÍTULO II SISTEMA UNITARIO DE GARANTÍAS»' },
  { articulo: 2, clave: 'normas sobre prenda', voto: 'las normas sobre prenda, prenda civil, prenda comercial, prenda de acciones,', motivo: 'imagen p. 2 izq.: comas (la BASE lee puntos)' },
  { articulo: 2, clave: 'mobiliaria regulada', voto: 'mobiliaria regulada por la presente Ley.', motivo: 'testigos: BASE = CCIT; el prefijo de CCIT es el sello del COHEP' },
  { articulo: 2, clave: 'IH', voto: 'III', motivo: 'imagen p. 2 der.: «CAPÍTULO III BIENES GARANTIZADORES»' },
  { articulo: 4, clave: 'exista', voto: 'que no exista provisión respecto de los intereses moratorios,', motivo: 'testigos: CCIT ×3; el apóstrofo de la BASE es una mancha' },
  { articulo: 5, clave: 'dividendos', voto: 'pagos por dividendos; 4)', motivo: 'testigos: TSC ×2 y CCIT ×3 leen el numeral «4)» del inciso siguiente; la BASE lo leyó en bloque con 3), 5) y 6) en otra posición (borrado por la votación)' },
  { articulo: 10, clave: 'Titulos', voto: 'Títulos III', motivo: 'imagen p. 5 der.: «de los Títulos III y V»' },
  { articulo: 13, clave: 'firma de una persona', voto: 'requiera la firma de una persona, ese requisito podrá ser satisfecho', motivo: 'imagen p. 6 izq.: coma tras «persona»' },
  { articulo: 15, clave: 'superior', voto: 'escala superior;', motivo: 'testigos: TSC y CCIT leen «;»' },
  { articulo: 15, clave: 'transportista', voto: 'transportista;', motivo: 'imagen p. 6 der.: «transportista;»' },
  { articulo: 17, clave: 'HI', voto: 'III', motivo: 'imagen p. 7 der.: «TÍTULO III PUBLICIDAD»' },
  { articulo: 19, clave: 'HI', voto: 'II', motivo: 'imagen p. 7 der.: «CAPÍTULO II CRÉDITOS»' },
  { articulo: 22, clave: 'crédito', voto: 'a ceder el crédito;', motivo: 'testigos: TSC y CCIT leen «;»; segmentación de CCIT' },
  { articulo: 30, clave: 'registral', voto: 'inscripción registral.', motivo: 'imagen p. 9 izq.: punto final' },
  { articulo: 32, clave: 'V', voto: 'V', motivo: 'imagen p. 9 der.: «CAPÍTULO V TÍTULOS-VALORES Y TÍTULOS REPRESENTATIVOS»' },
  { articulo: 33, clave: 'inventario siempre', voto: 'inventario siempre y cuando:', motivo: 'testigos: BASE = CCIT; lo demás de CCIT es el sello del COHEP' },
  { articulo: 33, clave: 'emitidos', voto: 'emitidos.', motivo: 'imagen p. 10 izq.: «los títulos emitidos.»' },
  { articulo: 34, clave: 'tenedor', voto: 'acreedor garantizado como tenedor legítimo en esta calidad,', motivo: 'imagen p. 10 izq.: coma tras «calidad»' },
  { articulo: 35, clave: 'POR', voto: 'POR', motivo: 'contexto: «CONTROL» está en el tramo anterior («CAPÍTULO VI CONTROL POR UN TERCERO DEPOSITARIO»)' },
  { articulo: 42, clave: 'garantías', voto: 'garantías', motivo: 'contexto: «mobiliarias;» sigue en la BASE (renglón siguiente)' },
  { articulo: 42, clave: 'EsunRegistro', voto: 'Es un Registro', motivo: 'contexto: segmentación' },
  { articulo: 42, clave: 'amobiliari', voto: 'garantía mobiliaria.', motivo: 'imagen p. 12 izq.: «de la inscripción de la garantía mobiliaria.»' },
  { articulo: 44, clave: 'Enelcasode', voto: 'En el caso de', motivo: 'contexto: segmentación' },
  { articulo: 47, clave: 'alo', voto: 'a lo', motivo: 'contexto: «en atención a lo prescrito por el Artículo 28»; CCIT perdió la «a»' },
  { articulo: 54, clave: 'Enelcaso', voto: 'b) En el caso', motivo: 'contexto: segmentación; el guion de CCIT es una mancha' },
  { articulo: 55, clave: 'ARTÍCULO', voto: 'ARTÍCULO 55.-', motivo: 'contexto: encabezado consecutivo de la BASE; los testigos leen «SS»' },
  { articulo: 55, clave: 'contractual', voto: 'contractual que expresamente permita esa posibilidad.', motivo: 'testigos: BASE = CCIT; el punto inicial de CCIT es una mancha' },
  { articulo: 55, clave: 'acredite', voto: 'acredite con la correspondiente certificación registral.', motivo: 'imagen p. 15 izq.: punto tras «registral»' },
  { articulo: 56, clave: 'mediante auto', voto: 'audiencia mediante auto. Si desestima la oposición mandará', motivo: 'imagen p. 15 izq.: «auto. Si desestima»' },
  { articulo: 56, clave: '3)', voto: 'y, 3)', motivo: 'imagen p. 15 der.: el inciso 2) termina en «y,»' },
  { articulo: 58, clave: 'mismos bienes muebles', voto: 'mobiliaria sobre los mismos bienes muebles en garantía. Si las', motivo: 'testigos: CCIT ×3 («garantía. Si»); TSC perdió el renglón' },
  { articulo: 60, clave: 'o', voto: 'o', motivo: 'imagen p. 16 izq.: «apropiación o reposesión»' },
  { articulo: 60, clave: 'reposesión', voto: 'o reposesión,', motivo: 'testigos: CCIT ×3; el punto de la BASE es una mancha' },
  { articulo: 60, clave: 'De acuerdo', voto: 'De acuerdo con la orden', motivo: 'testigos: BASE = CCIT; «¡» y «S + Cs» son manchas' },
  { articulo: 71, clave: 'decida', voto: 'decida', motivo: 'contexto: «lo» sigue en la BASE («para que decida lo»)' },
  { articulo: 72, clave: 'IRREVOCABLE', voto: 'IRREVOCABLE.', motivo: 'testigos: TSC y CCIT leen «.»' },
  { articulo: 72, clave: 'reposcer', voto: 'bienes, reposeer bienes objeto de garantía, realizar pagos totales', motivo: 'testigos: CCIT ×3 «reposeer»' },
  { articulo: 75, clave: 'legislación', voto: 'legislación', motivo: 'contexto: «con la» está en el tramo anterior' },
  { articulo: 76, clave: 'Intemet', voto: 'Internet', motivo: 'testigos: «rn» leído «m» (error típico de OCR); TSC ×2 y CCIT ×3 «Internet»' },
];

/**
 * Correcciones dirigidas sobre el texto votado: los números romanos de los epígrafes en negrita los confunden los tres OCR por igual
 * (I/II/III), así que la mayoría no basta. Se verificaron TODOS los epígrafes de TÍTULO y CAPÍTULO contra el escaneo CCIT (36 recortes);
 * estas son las lecturas que la votación dejó mal. `de` debe aparecer exactamente una vez en el artículo.
 */
export const CORRECCIONES: ReadonlyArray<{ articulo: number; de: string | RegExp; a: string; motivo: string }> = [
  { articulo: 5, de: /T[IÍ]TULO\s*\S+(?=\s+CONSTITUCI[OÓ]N DE LAS GARANT)/u, a: 'TÍTULO II', motivo: 'imagen p. 5 izq.: «TÍTULO II CONSTITUCIÓN DE LAS GARANTÍAS MOBILIARIAS»' },
  { articulo: 29, de: /CAP[IÍ]TULO\s*\S+(?=\s+OBLIGACIONES NO-DINERARIAS)/u, a: 'CAPÍTULO III', motivo: 'imagen p. 9 izq.: «CAPÍTULO III OBLIGACIONES NO-DINERARIAS» (la votación dio II)' },
  { articulo: 83, de: /CAP[IÍ]TULO\s*\S+(?=\s+REFORMAS Y JERARQU)/u, a: 'CAPÍTULO III', motivo: 'imagen p. 19 der.: «CAPÍTULO III REFORMAS Y JERARQUÍA DE LA PRESENTE LEY» (TSC y CCIT leen II)' },
  { articulo: 83, de: 'que se leerá de la “ARTÍCULO 28', a: 'que se leerá de la forma siguiente: “ARTÍCULO 28', motivo: 'imagen p. 19 der.: «de la forma siguiente:» (solo CCIT lo leyó)' },
  { articulo: 83, de: /los siguientes:\s+\S*\s+(?=2\) Registro de la Propiedad Vehicular)/u, a: 'los siguientes: 1) …; ', motivo: 'imagen p. 19 der.: inciso «1) …;» (numeral no reformado; ningún OCR lo leyó)' },
  { articulo: 83, de: 'sobre los mismos; 5) Registros', a: 'sobre los mismos; 3) …; 4) …; 5) Registros', motivo: 'imagen p. 19 der.: incisos «3) …;» y «4) …;»' },
  { articulo: 83, de: 'cree o incorpore; 7) Registro', a: 'cree o incorpore; 6) …; 7) Registro', motivo: 'imagen p. 19 der.: inciso «6) …;»' },
  { articulo: 56, de: 'se tramitará de 1) El deudor', a: 'se tramitará de la manera siguiente: 1) El deudor', motivo: 'imagen p. 15 izq.: «de la manera siguiente:» (la BASE lo leyó; TSC y CCIT lo perdieron)' },
  { articulo: 60, de: 'los bienes en garantía entregados', a: 'los bienes en garantía serán entregados', motivo: 'imagen p. 16 der.: «serán» (en CCIT lo tapa el sello del COHEP)' },
  { articulo: 71, de: 'para que decida que corresponda', a: 'para que decida lo que corresponda', motivo: 'imagen p. 18 izq.: «decida lo»' },
  { articulo: 84, de: 'contenidas en la presente Ley deben aplicarse', a: 'contenidas en la presente Ley para la constitución, publicidad y ejecución de garantías mobiliarias deben aplicarse', motivo: 'imagen p. 19 der.: renglón que solo leyó CCIT (×3)' },
  { articulo: 84, de: 'TÍTULO DISPOSICIONES TRANSITORIAS', a: 'TÍTULO X DISPOSICIONES TRANSITORIAS', motivo: 'imagen p. 20 izq.: «TÍTULO X»' },
  { articulo: 54, de: 'En el casode garantías', a: 'En el caso de garantías', motivo: 'segmentación: el vocabulario del corpus trae «casode» pegado' },
  { articulo: 5, de: 'o él intermediario', a: 'o el intermediario', motivo: 'la regla de tildes eligió «él» (CCIT); es el artículo: «la Institución depositaria o el intermediario»' },
  { articulo: 86, de: /”\.\s+;$/u, a: '”.', motivo: '«;» suelto tras el cierre «La Gaceta”.» (la BASE cortó el renglón; los testigos lo aportan con una mancha)' },
  { articulo: 17, de: 'Devuelvala', a: 'Devuelva la', motivo: 'imagen p. 7 izq.: «a) Devuelva la posesión»' },
  { articulo: 22, de: 'hacedido', a: 'ha cedido', motivo: 'segmentación' },
  { articulo: 33, de: 'altemativamente', a: 'alternativamente', motivo: '«rn» leído «m» por los tres OCR' },
  { articulo: 33, de: 'vezhecha', a: 'vez hecha', motivo: 'segmentación' },
  { articulo: 56, de: 'Seránrecurribles', a: 'Serán recurribles', motivo: 'segmentación (imagen p. 15 der.)' },
  { articulo: 74, de: /T[IÍ]TULO\s*\S+(?=\s+MEDIOS ALTERNATIVOS)/u, a: 'TÍTULO VIII', motivo: 'imagen p. 18 der.: «TÍTULO VIII MEDIOS ALTERNATIVOS…» (la votación dio VII)' },
];
/** «CAPÍTULOI», «CAPÍTULO!», «CAPÍTULO1» ante el epígrafe en mayúsculas = «CAPÍTULO I» (verificado en los 36 recortes). */
const RE_CAPITULO_I = /CAP[IÍ]TULO\s*[I!1l|](?:\s+[|.·•]+)?(?=\s+\p{Lu}{3})/gu;

export function aplicarResoluciones(trs: Tramo[]): { aplicadas: string[]; sinResolver: Tramo[] } {
  const aplicadas: string[] = [];
  for (const r of RESOLUCIONES) {
    const hits = trs.filter((t) => t.estado === 'CONFLICTO' && t.articulo === r.articulo && (/^(?:[IVXH]+|o)$/.test(r.clave) ? t.base.trim() === r.clave : t.base.includes(r.clave)));
    if (hits.length !== 1) throw new Error(`resolución art. ${r.articulo} «${r.clave}»: casa con ${hits.length} conflictos`);
    const t = hits[0];
    aplicadas.push(`art. ${r.articulo}: «${t.base}» → «${r.voto}» (${r.motivo})`);
    Object.assign(t, { voto: r.voto, estado: 'RESUELTA', apoyo: r.motivo });
  }
  return { aplicadas, sinResolver: trs.filter((t) => t.estado === 'CONFLICTO') };
}

export function aplicarCorrecciones(textos: Map<number, string>): string[] {
  const hechas: string[] = [];
  for (const c of CORRECCIONES) {
    const t = textos.get(c.articulo) ?? '';
    const n = typeof c.de === 'string' ? t.split(c.de).length - 1 : [...t.matchAll(new RegExp(c.de.source, `${c.de.flags.replace('g', '')}g`))].length;
    if (n !== 1) throw new Error(`corrección art. ${c.articulo}: «${String(c.de)}» aparece ${n} veces`);
    const antes = (typeof c.de === 'string' ? c.de : t.match(c.de)![0]);
    textos.set(c.articulo, t.replace(c.de, c.a));
    hechas.push(`art. ${c.articulo}: «${antes}» → «${c.a}» (${c.motivo})`);
  }
  for (const [a, t] of textos) {
    const n = [...t.matchAll(RE_CAPITULO_I)].filter((m) => m[0] !== 'CAPÍTULO I').length;
    if (n) { textos.set(a, t.replace(RE_CAPITULO_I, 'CAPÍTULO I')); hechas.push(`art. ${a}: ${n} × «CAPÍTULO I» normalizado (CAPÍTULOI/!/1)`); }
  }
  return hechas;
}

/** Palabras funcionales: una forma pegada solo se separa si al menos una de sus partes es una de ellas («enel», «conla», «Silas»). */
const FUNCIONALES = new Set(['a', 'al', 'con', 'de', 'del', 'el', 'en', 'la', 'las', 'lo', 'los', 'o', 'para', 'por', 'que', 'se', 'si', 'su', 'sus', 'un', 'una', 'y']);

/**
 * Separa formas pegadas por la composición apretada de la Gaceta («enel» → «en el», «Enelcasode» → «En el caso de»). Una forma se separa
 * solo si no está en el vocabulario del corpus V5 firmado y se
 * descompone en 2–4 partes del vocabulario con al menos una palabra funcional. Devuelve el texto y la lista de separaciones.
 */
export function separarPegadas(texto: string, voc: Set<string>): { texto: string; separadas: Map<string, string> } {
  const separadas = new Map<string, string>();
  const CLITICOS = new Set(['la', 'las', 'lo', 'los', 'le', 'les', 'se', 'nos']);
  // Pieza válida: palabra del vocabulario de 3 letras o más, o palabra funcional (el vocabulario del corpus trae letras sueltas).
  const pieza = (x: string): boolean => FUNCIONALES.has(x.toLowerCase()) || (x.length >= 3 && voc.has(x.toLowerCase()));
  const particiones = (w: string, k: number): string[][] => {
    if (k === 1) return pieza(w) ? [[w]] : [];
    const out: string[][] = [];
    for (let i = 1; i < w.length; i++) if (pieza(w.slice(0, i))) for (const r of particiones(w.slice(i), k - 1)) out.push([w.slice(0, i), ...r]);
    return out;
  };
  const out = texto.replace(/\p{L}{4,}/gu, (w) => {
    if (voc.has(w.toLowerCase()) || NO_SEPARAR.has(w.toLowerCase())) return w;
    for (let k = 2; k <= 4; k++) {
      const ps = particiones(w, k).filter((x) => x.some((y) => FUNCIONALES.has(y.toLowerCase()))
        // Pronombre enclítico («inscribirla», «venderlos»): solo si lo anterior es palabra funcional («Sila» → «Si la»).
        && !(CLITICOS.has(x.at(-1)!.toLowerCase()) && !FUNCIONALES.has(x.at(-2)!.toLowerCase())));
      if (!ps.length) continue;
      const mejor = ps.reduce((m, x) => (Math.min(...x.map((y) => y.length)) > Math.min(...m.map((y) => y.length)) ? x : m));
      separadas.set(w, mejor.join(' '));
      return mejor.join(' ');
    }
    return w;
  });
  return { texto: out, separadas };
}

/** Formas que el separador no debe tocar (revisadas a mano: son palabras, no formas pegadas). */
export const NO_SEPARAR = new Set<string>(['definen', 'aislados', 'convertida']);

/** Texto votado de un artículo; los conflictos quedan marcados ⟦base|tsc|ccit⟧ para resolverlos contra la imagen. */
export function textoVotado(ts: Tramo[], marcar = true): string {
  return ts.map((x) => (x.estado === 'CONFLICTO' && marcar ? `⟦${x.base || '∅'}|${x.tsc.join('/') || '∅'}|${x.ccit.join('/') || '∅'}⟧` : x.voto)).filter(Boolean).join(' ');
}

if (process.argv[1]?.endsWith('cotejo-lgm.ts')) {
  const rehacer = process.argv.includes('--rehacer-ocr');
  mkdirSync(SALIDA, { recursive: true });
  if (process.argv.includes('--geometria')) {
    for (const t of TESTIGOS) {
      mkdirSync(join(SALIDA, t.id), { recursive: true });
      console.log(t.id, Array.from({ length: PAGINAS_LEY }, (_, i) => { const g = geometria(t.pdf, i + 1, join(SALIDA, t.id)); return `${i + 1}:${g.corte}${g.metodo === 'raya' ? '' : '*'}`; }).join(' '));
    }
    process.exit(0);
  }
  const shaBase = sha256(readFileSync(PDF_GACETA_32125));
  if (shaBase !== SHA_GACETA_32125) throw new Error(`BASE alterada: ${shaBase}`);
  for (const t of [...TESTIGOS, ACUERDO_001_2020]) { const s = sha256(readFileSync(t.pdf)); if (s !== t.sha) throw new Error(`${t.pdf}: huella ${s}, esperada ${t.sha}`); }
  const baseLineas = lineas(ocrColumnas(false));
  const dBase = delimitar(baseLineas);
  const testigos = TESTIGOS.map((t) => {
    const { columnas, porModo, geo } = ocrTestigo(t, rehacer);
    // Delimitación propia del testigo solo para informar cómo lee los encabezados (p. ej. el guion del art. 42); el cotejo no depende de ella.
    const d = delimitarTolerante(lineas([...columnas.values()].flat()));
    const txt = d.articulado.map((l) => l.map((p) => p.texto).join(' ')).join('\n') + '\n';
    writeFileSync(join(SALIDA, `articulado_${t.id}.txt`), txt);
    const faltan = Array.from({ length: ULTIMO_ARTICULO }, (_, k) => k + 1).filter((n) => !d.encabezados.includes(n));
    console.log(`${t.nombre}: encabezados propios ${d.encabezados.length}/${ULTIMO_ARTICULO}; faltan [${faltan.join(', ')}]; sin guion [${d.sinGuion.join(', ')}]; renumerados ${d.renumerados.length}; palabras ${[...columnas.values()].reduce((s, c) => s + c.length, 0)}`);
    return { t, d, columnas, porModo, geo, faltan, sha: sha256(txt) };
  });
  const [tsc, ccit] = testigos;
  const pos = cotejar(baseLineas, dBase, tsc.porModo, ccit.porModo);
  const ordenadas = [...pos].sort((x, y) => x.articulo - y.articulo);
  const trs = tramos(ordenadas);
  const conflictosIniciales = trs.filter((x) => x.estado === 'CONFLICTO').length;
  const { aplicadas, sinResolver } = aplicarResoluciones(trs);
  if (sinResolver.length) console.log(`SIN RESOLVER ${sinResolver.length}:\n${sinResolver.map((x) => `  art. ${x.articulo} p${x.pagina}${x.columna} B«${x.base}» T«${x.tsc.join(' / ')}» C«${x.ccit.join(' / ')}»`).join('\n')}`);
  const cuenta = (e: Estado) => trs.filter((x) => x.estado === e).length;
  console.log(`posiciones ${pos.length} → tramos ${trs.length}: unánimes ${cuenta('UNANIME')}, segmentación ${cuenta('SEGMENTACION')}, mayoría con la base ${cuenta('MAYORIA_BASE')}, corregidas ${cuenta('CORREGIDA')}, conflictos ${cuenta('CONFLICTO')}; recuadro excluido ${RECUADRO.length} líneas`);
  const porArt = new Map<number, Tramo[]>();
  for (const x of trs) porArt.set(x.articulo, [...(porArt.get(x.articulo) ?? []), x]);
  const textos = new Map([...porArt].map(([a, ts]) => [a, textoVotado(ts)] as [number, string]));
  // Separación de formas pegadas con el vocabulario del corpus V5 firmado (no con el del propio texto: las formas pegadas se repiten).
  const separaciones = new Map<string, string>();
  for (const [a, t] of textos) { const r = separarPegadas(t, voc()); textos.set(a, r.texto); for (const [x, y] of r.separadas) separaciones.set(x, y); }
  console.log(`formas pegadas separadas: ${separaciones.size}`);
  const correcciones = aplicarCorrecciones(textos);
  // Restitución de tildes: los tres OCR pierden tildes a la vez («fisica», «físicamente» en la imagen p. 4 der.). Una forma fuera del
  // vocabulario que, sin tildes, coincide con una sola palabra del corpus V5 firmado se sustituye por ella.
  const porClave = new Map<string, Set<string>>();
  const sinT = (x: string): string => x.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  for (const w of voc()) if (w.length >= 4) porClave.set(sinT(w), (porClave.get(sinT(w)) ?? new Set()).add(w));
  const tildes = new Map<string, string>();
  for (const [a, t] of textos) textos.set(a, t.replace(/\p{L}{4,}/gu, (w) => {
    if (voc().has(w.toLowerCase())) return w;
    const c = porClave.get(sinT(w));
    if (!c || c.size !== 1) return w;
    const v = [...c][0];
    const r = w === w.toUpperCase() ? v.toUpperCase() : w[0] === w[0].toUpperCase() ? v[0].toUpperCase() + v.slice(1) : v;
    tildes.set(w, r);
    return r;
  }));
  console.log(`tildes restituidas: ${tildes.size} formas`);
  // Residuo para la revisión humana: formas de 4+ letras que no están en el vocabulario del corpus V5 firmado.
  const oov = new Map<string, { n: number; arts: number[] }>();
  for (const [a, t] of textos) for (const w of t.match(/\p{L}{4,}/gu) ?? []) {
    if (voc().has(w.toLowerCase())) continue;
    const e = oov.get(w) ?? { n: 0, arts: [] };
    e.n++; if (!e.arts.includes(a)) e.arts.push(a);
    oov.set(w, e);
  }
  console.log(`fuera de vocabulario: ${oov.size} formas`);
  const cotejado = [...textos.values()].join('\n') + '\n';
  writeFileSync(join(SALIDA, 'articulado_cotejado.txt'), cotejado);
  writeFileSync(join(SALIDA, 'cotejo.json'), `${JSON.stringify({
    base: { pdf: PDF_GACETA_32125, sha: shaBase, encabezados: dBase.encabezados.length, sinGuion: dBase.sinGuion },
    testigos: testigos.map(({ t, d, geo, faltan, sha }) => ({ id: t.id, pdf: t.pdf, sha_pdf: t.sha, url: t.url, encabezados: d.encabezados.length, faltan, sinGuion: d.sinGuion, descartados: d.descartados, renumerados: d.renumerados, sha_articulado: sha, geo })),
    motor: execFileSync(TESSERACT, ['--version'], { encoding: 'utf8' }).split(/\r?\n/)[0],
    recuadro_excluido: RECUADRO,
    conflictos_iniciales: conflictosIniciales, resoluciones: aplicadas, correcciones, separaciones: Object.fromEntries(separaciones), tildes: Object.fromEntries(tildes), fuera_de_vocabulario: Object.fromEntries([...oov].sort((x, y) => y[1].n - x[1].n)), sha_cotejado: sha256(cotejado),
    tramos: trs.filter((x) => x.estado !== 'UNANIME'),
    resumen: { posiciones: pos.length, tramos: trs.length, UNANIME: cuenta('UNANIME'), SEGMENTACION: cuenta('SEGMENTACION'), MAYORIA_BASE: cuenta('MAYORIA_BASE'), CORREGIDA: cuenta('CORREGIDA'), CONFLICTO: cuenta('CONFLICTO'), RESUELTA: cuenta('RESUELTA') },
  }, null, 1)}\n`);
}
