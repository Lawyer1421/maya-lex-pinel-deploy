/**
 * scripts/olas/ocr-diagnostico.ts
 * Prueba diagnóstica de OCR para fuentes escaneadas (Fase II). Solo lee el PDF; no genera ningún paquete ni toca ninguna base de datos.
 *
 * Por cada página: rasteriza en gris a la resolución indicada (pdftoppm), corre Tesseract con `spa` en modo de segmentación automática
 * (psm 1: detecta columnas) y guarda el texto y el TSV de palabras. Después mide:
 *  - confianza media de palabra y porcentaje de palabras con confianza < 60 y < 80;
 *  - encabezados «ARTÍCULO N» detectados y huecos en la numeración (1..máximo), una señal directa de texto perdido o mal leído.
 *
 * Uso: npx tsx scripts/olas/ocr-diagnostico.ts --pdf <ruta> --salida <dir> [--ppi 300] [--paginas 1-20] [--etiqueta GM]
 * Variables: OLAS_TESSERACT (por omisión C:/Program Files/Tesseract-OCR/tesseract.exe) y OLAS_PDFTOPPM (por omisión `pdftoppm` del PATH).
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TESSERACT = process.env.OLAS_TESSERACT ?? 'C:/Program Files/Tesseract-OCR/tesseract.exe';
const PDFTOPPM = process.env.OLAS_PDFTOPPM ?? 'pdftoppm';

function arg(nombre: string, defecto?: string): string {
  const i = process.argv.indexOf(`--${nombre}`);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  if (defecto !== undefined) return defecto;
  throw new Error(`falta --${nombre}`);
}

export interface MetricasPagina { pagina: number; palabras: number; confMedia: number; bajo60: number; bajo80: number }
export interface Diagnostico {
  etiqueta: string; pdf: string; pdf_sha256: string; ppi: number; motor: string; idioma: string; psm: number;
  paginas: MetricasPagina[]; palabras: number; confMedia: number; pctBajo60: number; pctBajo80: number;
  articulos: { detectados: number; maximo: number | null; huecos: number[]; repetidos: string[] };
  veredicto: string;
}

/** Métricas de un TSV de Tesseract (nivel 5 = palabra; conf −1 = sin texto). */
export function metricasTsv(tsv: string, pagina: number): MetricasPagina {
  const confs: number[] = [];
  for (const linea of tsv.split(/\r?\n/).slice(1)) {
    const c = linea.split('\t');
    if (c[0] !== '5' || !c[11] || !c[11].trim()) continue;
    const conf = Number(c[10]);
    if (conf >= 0) confs.push(conf);
  }
  const n = confs.length;
  const media = n ? confs.reduce((a, b) => a + b, 0) / n : 0;
  return { pagina, palabras: n, confMedia: Math.round(media * 10) / 10, bajo60: confs.filter((c) => c < 60).length, bajo80: confs.filter((c) => c < 80).length };
}

/** Encabezados de artículo en el texto OCR: número base (con sufijo A/B… o bis) y huecos en 1..máximo. */
export function analizarArticulos(texto: string): Diagnostico['articulos'] {
  const vistos: string[] = [];
  // Hasta 6 signos de ruido del OCR antes del encabezado («— ARTICULO 22.—», «. , ARTICULO 54.—»), pero ninguna letra: «del artículo 5» no cuenta.
  for (const m of texto.matchAll(/(?:^|\n)[^\p{L}\n]{0,6}ART[IÍ1l]CULO\s+(\d{1,3})(?:\s*[-.]?\s*([A-Z])\b|\s+(bis))?/giu)) vistos.push(`${Number(m[1])}${m[2] ? `-${m[2].toUpperCase()}` : m[3] ? ' bis' : ''}`);
  const base = [...new Set(vistos.map((v) => Number.parseInt(v, 10)))].sort((a, b) => a - b);
  const maximo = base.length ? base[base.length - 1] : null;
  const huecos = maximo === null ? [] : Array.from({ length: maximo }, (_, i) => i + 1).filter((n) => !base.includes(n));
  const repetidos = [...new Set(vistos.filter((v, i) => vistos.indexOf(v) !== i))];
  return { detectados: new Set(vistos).size, maximo, huecos, repetidos };
}

function main(): void {
  const pdf = arg('pdf');
  const salida = arg('salida');
  const ppi = Number(arg('ppi', '300'));
  const etiqueta = arg('etiqueta', 'OCR');
  const psm = 1;
  const rango = arg('paginas', '');
  mkdirSync(join(salida, 'img'), { recursive: true });
  const [desde, hasta] = rango ? rango.split('-').map(Number) : [undefined, undefined];
  execFileSync(PDFTOPPM, ['-gray', '-png', '-r', String(ppi), ...(desde ? ['-f', String(desde)] : []), ...(hasta ? ['-l', String(hasta)] : []), pdf, join(salida, 'img', 'p')]);
  const imagenes = readdirSync(join(salida, 'img')).filter((f) => f.endsWith('.png')).sort();
  const motor = execFileSync(TESSERACT, ['--version'], { encoding: 'utf8' }).split(/\r?\n/)[0];
  const paginas: MetricasPagina[] = [];
  const textos: string[] = [];
  for (const img of imagenes) {
    const pagina = Number(img.match(/(\d+)\.png$/)?.[1]);
    const base = join(salida, `pag_${String(pagina).padStart(3, '0')}`);
    execFileSync(TESSERACT, [join(salida, 'img', img), base, '-l', 'spa', '--psm', String(psm), 'txt', 'tsv'], { stdio: 'ignore' });
    textos.push(readFileSync(`${base}.txt`, 'utf8'));
    paginas.push(metricasTsv(readFileSync(`${base}.tsv`, 'utf8'), pagina));
    console.log(`${etiqueta} pág. ${pagina}: ${paginas.at(-1)!.palabras} palabras, confianza media ${paginas.at(-1)!.confMedia}`);
  }
  const texto = textos.join('\n');
  writeFileSync(join(salida, 'texto_completo.txt'), texto);
  const palabras = paginas.reduce((a, p) => a + p.palabras, 0);
  const confMedia = palabras ? Math.round((paginas.reduce((a, p) => a + p.confMedia * p.palabras, 0) / palabras) * 10) / 10 : 0;
  const pct = (k: 'bajo60' | 'bajo80') => (palabras ? Math.round((paginas.reduce((a, p) => a + p[k], 0) / palabras) * 1000) / 10 : 0);
  const articulos = analizarArticulos(texto);
  const pctBajo60 = pct('bajo60');
  const veredicto = confMedia >= 90 && pctBajo60 <= 3 && articulos.huecos.length === 0
    ? 'APTO_CON_COTEJO: calidad alta; cotejo manual artículo por artículo antes de empaquetar'
    : confMedia >= 80 && pctBajo60 <= 8
      ? 'APTO_CON_CORRECCION: calidad media; requiere corrección manual dirigida (palabras < 60 y huecos de numeración) y cotejo íntegro'
      : 'NO_APTO: calidad insuficiente; buscar otra fuente o reescanear antes de empaquetar';
  const diag: Diagnostico = {
    etiqueta, pdf, pdf_sha256: createHash('sha256').update(readFileSync(pdf)).digest('hex'), ppi, motor, idioma: 'spa', psm,
    paginas, palabras, confMedia, pctBajo60, pctBajo80: pct('bajo80'), articulos, veredicto,
  };
  writeFileSync(join(salida, 'diagnostico.json'), `${JSON.stringify(diag, null, 2)}\n`);
  console.log(JSON.stringify({ etiqueta, palabras, confMedia, pctBajo60, pctBajo80: diag.pctBajo80, articulos: { ...articulos, huecos: articulos.huecos.length } , veredicto }));
}

if (process.argv[1]?.endsWith('ocr-diagnostico.ts')) main();
