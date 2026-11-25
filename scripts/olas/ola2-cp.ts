/**
 * scripts/olas/ola2-cp.ts
 * OLA 2 — HN:CODIGO_PENAL (Decreto 130-2017). Texto consolidado a partir de FUENTES OFICIALES (La Gaceta), sin compilaciones de terceros:
 *
 *   BASE      La Gaceta No. 34,940 (10-may-2019), Decreto 130-2017 íntegro: «Decreto_130-2017 CODIGO PENAL.pdf» (PDF nativo de InDesign).
 *   REFORMAS  Gacetas nativas incluidas en «Codigo Penal Decreto 130-2017 fusionado actualizad_240904_104613.pdf», págs. 144–176:
 *               D.93-2021 (Gaceta 35,760, 1-nov-2021) · D.43-2023 (Gaceta 36,290, 25-jul-2023) · D.59-2024 (Gaceta 36,595, 2024).
 *             Las págs. 1–143 de ese archivo son el escaneo de la misma Gaceta 34,940 y no se usan. El D.61-2024 llega TRUNCADO (solo
 *             considerandos): se registra como reserva y no se aplica.
 *
 * Pasos (todos fail-hard):
 *   1. EXTRACCIÓN por columnas con pdftotext de xpdf (-simple y márgenes): la Gaceta es a dos columnas y el orden «raw» de InDesign desordena
 *      los párrafos. Se retiran cabeceras, pies y mancheta; se reconstruyen los párrafos partidos por salto de página o columna.
 *   2. SEGMENTACIÓN 1..635 consecutivos; los encabezados LIBRO/TÍTULO/CAPÍTULO/SECCIÓN salen del cuerpo y pasan a metadata.ubicacion.
 *   3. REFORMAS en orden cronológico según la tabla OPERACIONES (lectura jurídica declarada y visible en el expediente). La tabla se coteja
 *      con el propio texto de cada artículo del decreto: los números que el decreto enumera deben coincidir exactamente con la tabla.
 *      Las reformas publicadas con elisiones («…») se fusionan con el texto vigente unidad por unidad; cada fusión queda registrada.
 *   4. CLASIFICACIÓN propuesta para el CLO y COMPARACIÓN con las 635 filas legacy de producción (v2penal:mayalex_normativos:N).
 *
 * Uso: npx tsx scripts/olas/ola2-cp.ts [--legacy out/ola2-cp/legacy_prod.jsonl] [--sin-embeddings]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizarNumeroArticulo } from '../../lib/legal-retrieval/clo-guards';
import { contar, escribirManifiestoYPs1, escribirPaquete, sha256, type Clasificacion, type ConfigOla, type FilaOla } from './paquete-ola';
import { embeddingsConCache } from './ola1-cpp';

export const PDF_BASE = 'C:/Users/fredy/OneDrive/CODIGOS Y LEYES REGLAMENTOS ACUERDOS ETC/Decreto_130-2017 CODIGO PENAL.pdf';
export const PDF_REFORMAS = 'C:/Users/fredy/OneDrive/Email attachments/Documentos/CODIGOS/Codigo Penal Decreto 130-2017 fusionado actualizad_240904_104613.pdf';
const PAGS_BASE = [1, 140] as const;
const PAGS_REFORMAS = [144, 176] as const;
const MITAD = '354.33'; // páginas de 708.661 pt: la Gaceta se compone a dos columnas iguales

export const CFG: ConfigOla = {
  ola: 'OLA2',
  normId: 'HN:CODIGO_PENAL',
  instrumentoId: 'CODIGO_PENAL',
  ingestBatch: 'OLA2_CP_2017_01',
  fechaCorte: '2026-11-24',
  adjudicacion: 'EXPEDIENTE_AUDITORIA_CP_OLA2.md (D1–D8)',
  legacy: {
    condicion: "b.metadata->>'norm_id' = 'HN_CODIGO_PENAL' AND b.id LIKE 'v2penal:mayalex_normativos:%'",
    esperadas: 635,
    descripcion: 'carga legacy HN_CODIGO_PENAL (texto original de 2019 sin reformas), ids v2penal:mayalex_normativos:N',
  },
};
export const SALIDA = 'out/ola2-cp';
export const EXPEDIENTE_DIR = 'docs/corpus/staging/2026-11-24-hn-cp-ola2';
export const FUENTE = 'Código Penal de Honduras (Decreto 130-2017)';

// ── 1. Extracción ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function pdftotext(pdf: string, desde: number, hasta: number, margen: string[]): string[] {
  const out = execFileSync('pdftotext', ['-f', String(desde), '-l', String(hasta), '-simple', ...margen, '-enc', 'UTF-8', pdf, '-'], { encoding: 'utf8', maxBuffer: 64 << 20 });
  return out.split('\f');
}

/** Texto de un rango de páginas, columna izquierda y luego derecha de cada página. Exige el pdftotext de xpdf (opciones -simple y -margin*). */
export function extraerColumnas(pdf: string, [desde, hasta]: readonly [number, number]): string {
  let ayuda = '';
  try { ayuda = execFileSync('pdftotext', ['-h'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { ayuda = String((e as { stdout?: string; stderr?: string }).stdout ?? '') + String((e as { stderr?: string }).stderr ?? ''); }
  if (!/-simple/.test(ayuda) || !/-marginr/.test(ayuda)) throw new Error('se requiere pdftotext de xpdf (opciones -simple y -marginr); el de poppler no reproduce la extracción por columnas');
  const izq = pdftotext(pdf, desde, hasta, ['-marginr', MITAD]);
  const der = pdftotext(pdf, desde, hasta, ['-marginl', MITAD]);
  const n = hasta - desde + 1;
  const partes: string[] = [];
  for (let i = 0; i < n; i++) partes.push(`@@PAG ${desde + i}`, izq[i] ?? '', der[i] ?? '');
  return partes.join('\n');
}

const RUIDO: RegExp[] = [
  /^@@PAG \d+$/, /^La Gaceta(\s+REPÚBLICA.*)?$/, /^Sección A Acuerdos y Leyes/, /REPÚBLICA DE HONDURAS - TEGU/, /^[A-Z.,\s]*D\. ?C\., \d{1,2} DE [A-ZÁÉÍÓÚ]+ DEL? \d{4}/,
  /^UCIGALPA,/, /\bDEL? \d{4}\s+No\. ?3\d,\d{3}\b/, /^No\. ?3\d,\d{3}( La Gaceta)?$/, /^A\. ?\d{1,3}$/, /^\d{1,3} ?A\.$/, /^DIARIO OFICIAL DE LA REPÚBLICA/, /^DECANO DE LA PRENSA/, /^PARA MEJOR SEGURIDAD/,
  /Gerente General/, /^Coordinador(a)? y Supervisor(a)?$/, /^EMPRESA NACIONAL DE ARTES/, /^E\.N\.A\.G\.$/, /^Colonia Miraf[lI]ores/i, /^Teléfono\/Fax/, /^Administración: \d/,
  /^Planta: \d/, /^CENTRO CÍVICO GUBERNAMENTAL$/, /^JORGE ALBERTO RICO SALINAS/, /^ABOG\. [A-ZÁÉÍÓÚ ]+$/, /^SULY YADIRA/, /^EDIS ANTONIO MONCADA/,
];
export const esRuido = (l: string) => RUIDO.some((r) => r.test(l));

const ES_ITEM = /^(?:\d{1,2}\s?[).]|[a-zñ]{1,2}\)|[IVXL]+\.|[-•])\s?/;
const CIERRE = /[.:;]$/;

/** Líneas → párrafos. Une los párrafos partidos por salto de página o columna (el anterior no cierra y el siguiente no abre un numeral). */
/**
 * `porOracion`: en las Gacetas de reforma (columnas estrechas, sin línea en blanco entre párrafos) una línea que cierra oración seguida de
 * otra que empieza con mayúscula abre párrafo; en la base (con líneas en blanco entre párrafos) no se usa.
 */
export function parrafos(lineas: readonly string[], porOracion = false): string[] {
  const bloques: string[][] = [[]];
  for (const l of lineas) {
    if (l === '') { if (bloques[bloques.length - 1].length) bloques.push([]); continue; }
    bloques[bloques.length - 1].push(l);
  }
  const ps = bloques.filter((b) => b.length).map((b) => unirLineas(b, porOracion));
  const out: string[] = [];
  for (const p of ps) {
    const prev = out[out.length - 1];
    if (prev !== undefined && !CIERRE.test(prev) && !/^ARTÍCULO \d/.test(p) && !ES_ITEM.test(p) && !/[”"]$/.test(prev)) out[out.length - 1] = unirLineas([prev, p]);
    else out.push(p);
  }
  return out;
}

function unirLineas(ls: readonly string[], porOracion = false): string {
  let acc = '';
  for (const l of ls) {
    if (!acc) acc = l;
    else if (ES_ITEM.test(l) && /(?:[:;.]|[;,]\s*[oy],?)$/.test(acc)) acc = `${acc}\n${l}`;
    else if (porOracion && /[a-záéíóúñ)][.:]$/.test(acc) && /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]/.test(l)) acc = `${acc}\n${l}`;
    else if (porOracion && /^[^a-záéíóúñü]+\.$/.test(acc) && !acc.includes('\n')) acc = `${acc} ${l}`; // epígrafe solo en su línea
    else if (/[a-záéíóúñü]-$/.test(acc) && /^[a-záéíóúñü]/.test(l)) acc = acc.slice(0, -1) + l;
    else if (/[A-ZÁÉÍÓÚÑ]-$/.test(acc) && /^[A-ZÁÉÍÓÚÑ]/.test(l)) acc = acc.slice(0, -1) + l;
    else acc = `${acc} ${l}`;
  }
  return acc.split('\n').map((x) => x.replace(/\s{2,}/g, ' ').trim()).join('\n');
}

// ── 2. Segmentación de la base ──────────────────────────────────────────────────────────────────────────────────────────────────────────
/** «ARTÍCULO 1.-», y las variantes de la propia Gaceta «ARTÍCULO 302.» y «ARTÍCULO 513-», siempre seguidas del epígrafe en mayúsculas. */
const CAB_BASE = /^ARTÍCULO (\d+)(?:\.-|\.|-)\s*(?=[A-ZÁÉÍÓÚÑ])/;
const CABECERA_ESTRUCTURA = /^(LIBRO|PARTE|TÍTULO|TITULO|CAPÍTULO|CAPITULO|SECCIÓN|SECCION|DISPOSICIONES)\b/;
const sinMinusculas = (l: string) => !/[a-záéíóúñü]/.test(l);

export interface ArticuloBase { numero: string; parrafos: string[]; ubicacion: string[]; correcciones: string[] }

/** Léxico del propio texto de la Gaceta (claves sin tildes ni mayúsculas), para recomponer epígrafes espaciados. */
export function lexicoDe(texto: string): Set<string> {
  // Palabras que en la Gaceta solo aparecen dentro de un epígrafe espaciado (y por eso no entran al léxico). Cada recomposición se lista en el expediente.
  const s = new Set<string>(['y', 'o', 'e', 'a', 'u', 'preceptiva']);
  for (const w of texto.split(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü]+/)) if (w.length >= 2) s.add(clave(w));
  return s;
}

/**
 * La Gaceta justifica algunos epígrafes espaciando letras («S U S P E N S I Ó N D E L P R O C E - DIMIENTO»): se pierden los límites entre
 * palabras. Si hay 3+ fragmentos de 1–2 letras seguidos, el tramo en mayúsculas se recompone partiéndolo en el MENOR número de palabras del
 * léxico de la propia Gaceta. Si no se puede partir, falla.
 */
export function recomponerEspaciado(epigrafe: string, lexico: ReadonlySet<string>): string {
  const fichas = epigrafe.split(/\s+/);
  let racha = 0, hay = false;
  // Disparador: 3+ LETRAS SUELTAS seguidas («P E R»); palabras cortas legítimas («O DE LA») no lo activan.
  for (const f of fichas) { racha = /^[A-ZÁÉÍÓÚÑ]$/.test(f) ? racha + 1 : 0; if (racha >= 3) hay = true; }
  if (!hay) return epigrafe;
  return epigrafe.split(/([.,;:])/).map((tramo) => {
    if (/^[.,;:]$/.test(tramo) || !tramo.trim()) return tramo;
    const pegado = tramo.replace(/\s*-\s*/g, '').replace(/\s+/g, '');
    const n = pegado.length;
    const mejor: Array<{ c: number; d: number } | null> = Array(n + 1).fill(null);
    mejor[0] = { c: 0, d: 0 };
    for (let i = 1; i <= n; i++) for (let j = Math.max(0, i - 30); j < i; j++) {
      if (!mejor[j] || !lexico.has(clave(pegado.slice(j, i)))) continue;
      if (!mejor[i] || mejor[j]!.c + 1 < mejor[i]!.c) mejor[i] = { c: mejor[j]!.c + 1, d: j };
    }
    if (!mejor[n]) throw new Error(`epígrafe espaciado no recomponible con el léxico de la Gaceta: «${tramo.trim()}»`);
    const palabras: string[] = [];
    for (let i = n; i > 0; i = mejor[i]!.d) palabras.unshift(pegado.slice(mejor[i]!.d, i));
    return (tramo.startsWith(' ') ? ' ' : '') + palabras.join(' ');
  }).join('');
}

export function segmentarBase(texto: string): ArticuloBase[] {
  const lineas = texto.split('\n').map((l) => l.trim()).filter((l) => !esRuido(l));
  const ini = lineas.findIndex((l) => /^ARTÍCULO 1\.-/.test(l));
  const fin = lineas.findIndex((l, i) => i > ini && /^Dado en la ciudad de Tegucigalpa/.test(l));
  if (ini < 0 || fin < 0) throw new Error('no se localizan el art. 1 o la fórmula «Dado en la ciudad» de la Gaceta 34,940');
  // Ubicación previa al art. 1 (LIBRO I · PARTE GENERAL · TÍTULO I · LEY PENAL).
  let pendiente: string[] = [];
  for (let i = ini - 1; i >= 0 && (lineas[i] === '' || sinMinusculas(lineas[i])); i--) if (lineas[i]) pendiente.unshift(lineas[i]);
  pendiente = pendiente.slice(pendiente.findIndex((l) => /^LIBRO\b/.test(l)));

  const crudos: Array<{ numero: string; lineas: string[] }> = [];
  for (const l of lineas.slice(ini, fin)) {
    const m = CAB_BASE.exec(l);
    if (m) crudos.push({ numero: m[1], lineas: [l.slice(m[0].length)] });
    else crudos[crudos.length - 1].lineas.push(l);
  }
  if (crudos.length !== 635 || crudos.some((c, i) => c.numero !== String(i + 1))) throw new Error(`numeración base distinta de 1..635 (${crudos.length})`);

  const lexico = lexicoDe(lineas.join(' '));
  const ubic = new Ubicacion();
  ubic.aplicar(pendiente);
  return crudos.map((c) => {
    const ubicacion = ubic.actual();
    // Retira de la cola los bloques de encabezado estructural (todo mayúsculas, empieza con LIBRO/TÍTULO/…); pertenecen al artículo siguiente.
    const ls = [...c.lineas];
    const encabezados: string[] = [];
    for (;;) {
      while (ls.length && ls[ls.length - 1] === '') ls.pop();
      let k = ls.length - 1;
      while (k >= 0 && (ls[k] === '' || sinMinusculas(ls[k]))) k--;
      const cola = ls.slice(k + 1);
      const corte = cola.findIndex((l) => CABECERA_ESTRUCTURA.test(l));
      if (corte < 0) break;
      encabezados.unshift(...cola.slice(corte).filter(Boolean));
      ls.splice(k + 1 + corte);
    }
    ubic.aplicar(encabezados);
    const ps = parrafos(ls);
    const correcciones: string[] = [];
    const ep = EPIGRAFE.exec(ps[0]);
    if (ep) {
      const nuevo = recomponerEspaciado(ep[1], lexico);
      if (nuevo !== ep[1]) { correcciones.push(`EPIGRAFE_ESPACIADO_RECOMPUESTO: «${ep[1]}» → «${nuevo}»`); ps[0] = nuevo + ps[0].slice(ep[1].length); }
    }
    return { numero: c.numero, parrafos: ps, ubicacion, correcciones };
  });
}

/** Lleva LIBRO / TÍTULO / CAPÍTULO / SECCIÓN vigentes para cada artículo. */
class Ubicacion {
  private niveles: Record<'LIBRO' | 'TITULO' | 'CAPITULO' | 'SECCION', string | null> = { LIBRO: null, TITULO: null, CAPITULO: null, SECCION: null };
  aplicar(lineas: readonly string[]): void {
    let actual: keyof Ubicacion['niveles'] | null = null;
    for (const l of lineas) {
      const m = CABECERA_ESTRUCTURA.exec(l);
      if (m && m[1] !== 'PARTE') {
        const k = (m[1] === 'DISPOSICIONES' ? 'TITULO' : m[1].normalize('NFD').replace(/\p{M}/gu, '')) as keyof Ubicacion['niveles'];
        actual = k;
        this.niveles[k] = l;
        const orden = ['LIBRO', 'TITULO', 'CAPITULO', 'SECCION'] as const;
        for (const inf of orden.slice(orden.indexOf(k) + 1)) this.niveles[inf] = null;
      } else if (actual) this.niveles[actual] = `${this.niveles[actual]} ${l}`;
    }
  }
  actual(): string[] { return Object.values(this.niveles).filter((x): x is string => !!x).map((x) => x.replace(/\s{2,}/g, ' ')); }
}

// ── 3. Reformas ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface Decreto { decreto: string; gaceta: string; fecha_gaceta: string; vigencia: string }
export const DECRETOS: Record<string, Decreto> = {
  '93-2021': { decreto: '93-2021', gaceta: '35,760', fecha_gaceta: '2021-11-01', vigencia: 'al día siguiente de su publicación (art. 11), con las derogaciones aprobadas el 5-nov-2019 y el 19-feb-2020 y las reformas del 4-mar-2020 que incorpora (art. 10)' },
  '43-2023': { decreto: '43-2023', gaceta: '36,290', fecha_gaceta: '2023-07-25', vigencia: 'desde el día de su publicación (art. 6)' },
  '59-2024': { decreto: '59-2024', gaceta: '36,595', fecha_gaceta: '2024-07-25', vigencia: '5 de julio de 2024 (art. 2)' },
};

type TipoOp = 'DEROGA' | 'REFORMA' | 'ADICIONA' | 'DEJA_SIN_EFECTO_DEROGACION' | 'DEJA_SIN_EFECTO_REFORMA';
export interface Operacion { decreto: keyof typeof DECRETOS; articuloDecreto: number; tipo: TipoOp; articulos: string[]; nota: string }

/** Lectura jurídica de los decretos, en orden cronológico. Se coteja con el texto del decreto en cotejarOperaciones(). */
export const OPERACIONES: Operacion[] = [
  { decreto: '93-2021', articuloDecreto: 1, tipo: 'DEROGA', articulos: ['102', '103', '104', '105', '106', '176', '182', '225', '263', '275', '309', '317', '337', '346', '368', '397', '403', '411', '417', '430', '434', '437', '444', '469', '511', '569', '596'], nota: 'derogación aprobada el 5-nov-2019, publicada e incorporada por el D.93-2021 (art. 10)' },
  { decreto: '93-2021', articuloDecreto: 2, tipo: 'DEROGA', articulos: ['28', '153'], nota: 'derogación aprobada el 19-feb-2020, publicada por el D.93-2021' },
  { decreto: '93-2021', articuloDecreto: 3, tipo: 'REFORMA', articulos: ['428', '429'], nota: 'reforma aprobada el 4-mar-2020, publicada por el D.93-2021' },
  { decreto: '93-2021', articuloDecreto: 4, tipo: 'REFORMA', articulos: ['219', '248', '312', '325', '328', '373', '374', '378', '379', '386', '439'], nota: 'reforma' },
  { decreto: '93-2021', articuloDecreto: 5, tipo: 'ADICIONA', articulos: ['378-A'], nota: 'adición' },
  { decreto: '93-2021', articuloDecreto: 6, tipo: 'DEROGA', articulos: ['296', '353', '613'], nota: 'derogación' },
  { decreto: '43-2023', articuloDecreto: 2, tipo: 'DEJA_SIN_EFECTO_DEROGACION', articulos: ['102', '444'], nota: 'deja sin valor ni efecto la derogación hecha por el art. 1 del D.93-2021' },
  { decreto: '43-2023', articuloDecreto: 2, tipo: 'DEJA_SIN_EFECTO_REFORMA', articulos: ['439'], nota: 'deja sin valor ni efecto la reforma hecha por el art. 4 del D.93-2021' },
  { decreto: '43-2023', articuloDecreto: 2, tipo: 'REFORMA', articulos: ['102', '439', '444'], nota: '«se reforma por adición»: nuevo texto íntegro' },
  { decreto: '43-2023', articuloDecreto: 2, tipo: 'ADICIONA', articulos: ['587-A'], nota: 'adición (financiamiento al terrorismo)' },
  { decreto: '59-2024', articuloDecreto: 1, tipo: 'REFORMA', articulos: ['324', '325', '327'], nota: 'reforma' },
  { decreto: '59-2024', articuloDecreto: 1, tipo: 'ADICIONA', articulos: ['337-A'], nota: 'adición' },
];
/** D.43-2023, art. 5: nuevo nombre del Título XXV (afecta solo a metadata.ubicacion). */
export const TITULO_XXV = { decreto: '43-2023', nombre: 'TÍTULO XXV OTROS DELITOS CONTRA EL ORDEN SOCIOECONOMICO' };

interface DecretoParseado { decreto: string; articulos: Map<number, { encabezado: string; bloques: Map<string, string> }> }

const DECRETO_ART = /^ARTÍCULO (\d{1,2})\.-\s*(Derogar|Reformar|Adicionar|Interpretar|VIGENCIA|El presente)/;
const BLOQUE_ART = /^“?ARTÍCULO (\d{1,3})(?:\s?-?\s?([A-Z]))?\.?\s?-?\s*/;

/** Separa cada decreto completo (los que tienen «D E C R E T A») y, dentro, sus artículos y los textos entrecomillados que introducen. */
export function parsearReformas(texto: string): { decretos: DecretoParseado[]; truncados: string[] } {
  const lineas = texto.split('\n').map((l) => l.trim()).filter((l) => !esRuido(l));
  const ps = parrafos(lineas, true);
  const decretos: DecretoParseado[] = [];
  const truncados: string[] = [];
  let actual: DecretoParseado | null = null;
  let ultimoNumero: string | null = null;
  let artDec: { encabezado: string; bloques: Map<string, string> } | null = null;
  let bloque: string | null = null;
  for (const p of ps) {
    const nds = [...p.matchAll(/DECRETO No\. ?(\d{1,3}-\d{4})/g)];
    if (nds.length && !/^ARTÍCULO/.test(p)) ultimoNumero = nds[nds.length - 1][1];
    if (/(?:^|POR TANTO,?\s*)D E C R E T A\s*:?\s*$/.test(p)) {
      if (!ultimoNumero) throw new Error('«D E C R E T A» sin número de decreto previo');
      actual = { decreto: ultimoNumero, articulos: new Map() };
      decretos.push(actual);
      artDec = null; bloque = null;
      continue;
    }
    if (!actual) continue;
    if (/^Dado en la ciudad de Tegucigalpa/.test(p)) { actual = null; continue; }
    const da = DECRETO_ART.exec(p);
    if (da) {
      artDec = { encabezado: p, bloques: new Map() };
      actual.articulos.set(Number(da[1]), artDec);
      bloque = null;
      continue;
    }
    if (!artDec) continue;
    const ba = BLOQUE_ART.exec(p);
    if (ba && /^“|^ARTÍCULO \d{1,3}(?:\s?-?\s?[A-Z])?\.?\s?-?\s*[A-ZÁÉÍÓÚÑ ]{3,}/.test(p)) {
      bloque = ba[2] ? `${ba[1]}-${ba[2]}` : ba[1];
      artDec.bloques.set(bloque, p.replace(/^“/, ''));
      continue;
    }
    if (bloque) {
      const prev = artDec.bloques.get(bloque)!;
      if (/”\.?;?$/.test(prev)) { bloque = null; continue; } // texto del decreto tras cerrar comillas (p. ej. «asimismo, se reforma…»)
      artDec.bloques.set(bloque, `${prev}\n${p}`);
    } else {
      artDec.encabezado = `${artDec.encabezado}\n${p}`;
    }
  }
  // Decretos anunciados sin parte dispositiva en el archivo (truncados).
  const completos = new Set(decretos.map((d) => d.decreto));
  for (const m of texto.matchAll(/DECRETO No\. ?(\d{1,3}-\d{4})/g)) if (!completos.has(m[1]) && !truncados.includes(m[1])) truncados.push(m[1]);
  return { decretos, truncados };
}

const numerosEn = (s: string) => [...s.replace(/(\d)\s*-\s*\n?\s*(\d{4})/g, '$1-$2').matchAll(/\b(\d{1,3}(?:\s?-\s?[A-Z])?)\b(?!-\d{4})/g)].map((m) => m[1].replace(/\s/g, ''));

/** La tabla OPERACIONES debe coincidir con los números que enumera cada artículo del decreto. */
export function cotejarOperaciones(decretos: readonly DecretoParseado[]): string[] {
  const errores: string[] = [];
  const porArt = new Map<string, Operacion[]>();
  for (const op of OPERACIONES) { const k = `${op.decreto}#${op.articuloDecreto}`; porArt.set(k, [...(porArt.get(k) ?? []), op]); }
  for (const [k, ops] of porArt) {
    const [dec, n] = k.split('#');
    const d = decretos.find((x) => x.decreto === dec);
    const a = d?.articulos.get(Number(n));
    if (!a) { errores.push(`${k}: el artículo del decreto no aparece en la fuente`); continue; }
    const citados = new Set(numerosEn(a.encabezado.split(/del Decreto|del CÓDIGO|del Decreto Legislativo|contenidos en el Decreto|al Decreto/)[0].replace(/^ARTÍCULO \d+\.-/, '')));
    // D.43-2023 art. 2: los derogados/reformados cuyo efecto se anula se citan en la primera frase; los reformados por adición, en la segunda.
    const esperados = new Set(ops.flatMap((o) => o.articulos));
    // Se quita el encabezado del propio artículo del decreto y las menciones a artículos de OTRO decreto (D.43-2023 cita los arts. 1 y 4 del D.93-2021).
    const cuerpo = a.encabezado.replace(/^ARTÍCULO \d{1,2}\.-/, '').replace(/de su Art[ií]culo \d+|Art[ií]culo \d+ del Decreto Legislativo/g, '');
    const enDecreto = new Set([...cuerpo.matchAll(/art[ií]culos? ((?:\d{1,3}(?:-[A-Z])?(?:,\s*|\s+y\s+)?)+)/gi)].flatMap((m) => numerosEn(m[1])));
    for (const e of esperados) if (!enDecreto.has(e) && !citados.has(e)) errores.push(`${k}: la tabla incluye el art. ${e}, que el decreto no enumera`);
    for (const e of enDecreto) if (!esperados.has(e)) errores.push(`${k}: el decreto enumera el art. ${e}, que la tabla no recoge`);
    for (const op of ops.filter((o) => o.tipo === 'REFORMA' || o.tipo === 'ADICIONA'))
      for (const art of op.articulos) if (!a.bloques.has(art)) errores.push(`${k}: falta el texto entrecomillado del art. ${art}`);
  }
  return errores;
}

// ── Fusión de reformas con elisiones ────────────────────────────────────────────────────────────────────────────────────────────────────
const EPIGRAFE = /^([^a-záéíóúñü]+?\.)\s+/;
const clave = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const ELISION = /…|\.{3}/;

/** Unidades: un párrafo o numeral por unidad; una elisión seguida de mayúscula abre otra unidad («El consentimiento … Aun cuando…»). */
export function unidades(texto: string): string[] {
  return texto.split('\n').flatMap((l) => l.split(/(?<=…|\.\.\.)\s+(?=[A-ZÁÉÍÓÚÑ0-9]\S*\s)/))
    // Oración elidida pegada a texto nuevo en el mismo párrafo («… por un tercero. Las conductas…»).
    .flatMap((u) => u.split(/(?<=[a-záéíóúñ)][.;:])\s+(?=[A-ZÁÉÍÓÚÑ][^.;:…]{0,60}(?:…|\.\.\.))/)).flatMap((u) => u.split(/(?<=;|; y,|; o,|; o|; y)\s+(?=\d{1,2}[).]\s)/)).map((u) => u.trim()).filter(Boolean);
}

/** descartadas: unidades del texto anterior que no se toman; suprimidas: las descartadas que la reforma NO sustituye por otra unidad publicada. */
export interface Fusion { tomadas: Array<{ unidad: string; de: 'REFORMA' | 'VIGENTE' | 'EPIGRAFE_REFORMA' }>; descartadas: string[]; suprimidas: string[] }

/** Marca de una unidad para saber si la reforma la sustituye: el numeral («4)» o «4.»), el epígrafe o las tres primeras palabras. */
function marcaDeUnidad(u: string): string {
  const num = /^(\d{1,2}|[a-z])\s?[).]\s/.exec(u);
  if (num) return `#${num[1]}`;
  const ep = EPIGRAFE.exec(u);
  if (ep) return `E${clave(ep[1])}`;
  return `T${clave(u.split(/\s+/).slice(0, 3).join(' '))}`;
}

/** Aplica una reforma publicada con elisiones: cada «prefijo…» toma la unidad vigente que empieza igual (después de la última usada). */
export function fusionar(numero: string, vigente: string, reforma: string): { texto: string; fusion: Fusion } {
  const base = unidades(vigente);
  const usadas = new Set<number>();
  const tomadas: Fusion['tomadas'] = [];
  let cursor = 0;
  for (const u of unidades(reforma)) {
    const m = ELISION.exec(u);
    if (!m) { tomadas.push({ unidad: u, de: 'REFORMA' }); continue; }
    let prefijo = u.slice(0, m.index).trim();
    const sufijo = u.slice(m.index + m[0].length).replace(/^[.…]+/, '').trim();
    // Primera unidad con epígrafe y cuerpo elidido («EPÍGRAFE NUEVO. Quien…»): el epígrafe es texto de la reforma; el cuerpo, del vigente.
    const ep = tomadas.length === 0 ? EPIGRAFE.exec(prefijo) : null;
    if (ep) prefijo = prefijo.slice(ep[0].length).trim();
    const kp = clave(prefijo);
    // Numeral elidido sin texto («1) …»): se toma el numeral vigente con el mismo ordinal, en orden.
    const soloNumeral = /^(\d{1,2}|[a-z])[).]$/.exec(prefijo);
    if (kp.length < 3 && !soloNumeral) throw new Error(`art. ${numero}: elisión sin prefijo identificable («${u}»)`);
    const cuerpo = (b: string, i: number) => (i === 0 && ep ? b.replace(EPIGRAFE, '') : b);
    const coincide = (b: string, i: number) => (soloNumeral ? new RegExp('^' + soloNumeral[1] + ' ?[).] ').test(b) : clave(cuerpo(b, i)).startsWith(kp));
    const buscar = () => base.map((b, i) => ({ b, i })).filter(({ b, i }) => i >= cursor && !usadas.has(i) && coincide(b, i));
    let candidatas = buscar();
    if (candidatas.length === 0) {
      // La oración elidida puede estar dentro de un párrafo del texto vigente: se parte ese párrafo en la oración que empieza igual.
      for (let i = cursor; i < base.length && candidatas.length === 0; i++) {
        const oraciones = base[i].split(/(?<=[a-záéíóúñ)][.:])\s+(?=[A-ZÁÉÍÓÚÑ])/);
        const k = oraciones.findIndex((o, x) => x > 0 && clave(o).startsWith(kp));
        if (k > 0) { base.splice(i, 1, oraciones.slice(0, k).join(' '), oraciones.slice(k).join(' ')); candidatas = buscar(); }
      }
    }
    if (candidatas.length === 0) throw new Error(`art. ${numero}: la elisión «${u}» no corresponde a ninguna unidad del texto vigente`);
    const { b: bCompleta, i } = candidatas[0];
    const b = ep ? `${ep[1]} ${cuerpo(bCompleta, i)}` : bCompleta;
    usadas.add(i); cursor = i + 1;
    let texto = b;
    if (sufijo && /^[;:,.]?\s*(?:[oy],?)?$/.test(sufijo)) texto = b.replace(/(?:\s*[;:,.])?(?:\s+[oy],?)?\s*$/, '') + sufijo.replace(/^([;:,.])\s*([oy])/, '$1 $2');
    else if (sufijo) throw new Error(`art. ${numero}: texto tras la elisión no reconocido («${u}»)`);
    tomadas.push({ unidad: texto, de: ep && clave(ep[1]) !== clave(EPIGRAFE.exec(bCompleta)?.[1] ?? '') ? 'EPIGRAFE_REFORMA' : 'VIGENTE' });
  }
  const descartadas = base.filter((_, i) => !usadas.has(i));
  const sustitutos = new Set(tomadas.filter((t) => t.de === 'REFORMA').map((t) => marcaDeUnidad(t.unidad)));
  const suprimidas = descartadas.filter((d) => !sustitutos.has(marcaDeUnidad(d)));
  return { texto: componer(tomadas.map((t) => t.unidad)), fusion: { tomadas, descartadas, suprimidas } };
}

/** Une unidades: los numerales/literales van en línea propia; los párrafos, separados por línea en blanco. */
export function componer(us: readonly string[]): string {
  return us.reduce((acc, u, i) => (i === 0 ? u : ES_ITEM.test(u) || /:$/.test(us[i - 1]) ? `${acc}\n${u}` : `${acc}\n\n${u}`), '');
}

/** Texto de un bloque entrecomillado del decreto → contenido del artículo (sin «ARTÍCULO N.-», sin comillas de cierre). */
export function textoDeBloque(bloque: string): string {
  const sin = bloque.replace(BLOQUE_ART, '').replace(/\s*”\s*\.?;?\s*$/, '');
  const t = sin.split('\n').map((l) => l.trim()).filter(Boolean);
  // Epígrafe solo en la primera línea («EXPLOTACIÓN ILEGAL DE RECURSOS NATURALES.» ⏎ «Quien…»): va con su cuerpo.
  if (t.length > 1 && /^[^a-záéíóúñü]+\.$/.test(t[0])) t.splice(0, 2, `${t[0]} ${t[1]}`);
  const out = componer(t);
  // El punto tras las comillas de cierre es del decreto; el artículo transcrito conserva su punto final.
  return /[.;:]$/.test(out) || ELISION.test(out.slice(-3)) ? out : `${out}.`;
}

/** Si el epígrafe de la reforma viene espaciado o partido («E X P L O TA - CIÓN»), se toma el del texto vigente cuando son la misma palabra. */
export function normalizarEpigrafe(reforma: string, vigente: string | null): string {
  const ep = /^([^a-záéíóúñü]+?\.)\s/.exec(reforma);
  if (!ep) return reforma;
  const epV = vigente ? /^([^a-záéíóúñü]+?\.)\s/.exec(vigente)?.[1] ?? null : null;
  return alinearEpigrafe(ep[1], epV) + reforma.slice(ep[1].length);
}

/**
 * Reconstruye un epígrafe con letras espaciadas o partidas («I N T R O D U C C I Ó N D E ESPECIES EXÓGENAS.», «E X P L O TA - CIÓN»):
 * consume fichas de la reforma mientras formen, en orden, las palabras del epígrafe vigente; lo que ya no coincide se conserva tal cual
 * (es lo que la reforma cambia, p. ej. EXÓTICAS → EXÓGENAS). Sin epígrafe vigente, solo se juntan las letras sueltas.
 */
export function alinearEpigrafe(reforma: string, vigente: string | null): string {
  const fichas = reforma.split(/\s+/).filter((f) => f && f !== '-');
  const palabras = vigente ? vigente.split(/\s+/) : [];
  const out: string[] = [];
  let i = 0;
  for (const w of palabras) {
    let acc = '';
    let j = i;
    while (j < fichas.length && clave(acc).length < clave(w).length) acc += fichas[j++].replace(/-$/, '');
    if (clave(acc) !== clave(w) || !clave(w)) break;
    out.push(w); i = j;
  }
  const resto = fichas.slice(i).join(' ').replace(/(?<=\b[A-ZÁÉÍÓÚÑ]) (?=[A-ZÁÉÍÓÚÑ]\b)/g, '').replace(/([A-ZÁÉÍÓÚÑ])-([A-ZÁÉÍÓÚÑ])/g, '$1$2');
  return [...out, resto].filter(Boolean).join(' ');
}

// ── 4. Consolidación ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface Constancia { tipo: TipoOp | 'TITULO_RENOMBRADO' | 'DECRETO_TRUNCADO' | 'SUPRESION_POR_SUSTITUCION' | 'EPIGRAFE_REFORMADO'; decreto: string; gaceta: string; fecha_gaceta: string; detalle: string }
export interface ArticuloCP {
  numero: string; texto: string; textoOriginal2019: string | null; vigente: boolean; ubicacion: string[]; correcciones: string[];
  constancias: Constancia[]; fusiones: Array<{ decreto: string; descartadas: string[]; suprimidas: string[]; desdeVigente: number; desdeReforma: number; epigrafeNuevo: boolean }>;
  historial: Array<{ decreto: string; texto: string; vigente: boolean }>;
}

export function consolidar(base: readonly ArticuloBase[], decretos: readonly DecretoParseado[]): Map<string, ArticuloCP> {
  const arts = new Map<string, ArticuloCP>();
  for (const b of base) {
    const texto = componer(b.parrafos);
    arts.set(b.numero, { numero: b.numero, texto, textoOriginal2019: texto, vigente: true, ubicacion: b.ubicacion, correcciones: b.correcciones, constancias: [], fusiones: [], historial: [] });
  }
  const cons = (op: Operacion, detalle: string): Constancia => ({ tipo: op.tipo, decreto: op.decreto, gaceta: DECRETOS[op.decreto].gaceta, fecha_gaceta: DECRETOS[op.decreto].fecha_gaceta, detalle });
  for (const op of OPERACIONES) {
    const bloques = decretos.find((d) => d.decreto === op.decreto)!.articulos.get(op.articuloDecreto)!.bloques;
    for (const n of op.articulos) {
      let a = arts.get(n);
      if (op.tipo === 'ADICIONA') {
        if (a) throw new Error(`art. ${n}: ya existe y el ${op.decreto} lo adiciona`);
        const vecino = arts.get(n.split('-')[0])!;
        a = { numero: n, texto: '', textoOriginal2019: null, vigente: true, ubicacion: vecino.ubicacion, correcciones: [], constancias: [], fusiones: [], historial: [] };
        arts.set(n, a);
      }
      if (!a) throw new Error(`art. ${n}: no existe y el ${op.decreto} lo ${op.tipo.toLowerCase()}`);
      switch (op.tipo) {
        case 'DEROGA':
          if (!a.vigente) throw new Error(`art. ${n}: derogado dos veces`);
          a.historial.push({ decreto: op.decreto, texto: a.texto, vigente: a.vigente });
          a.vigente = false;
          a.constancias.push(cons(op, `Derogado por el art. ${op.articuloDecreto} del D.${op.decreto} (${op.nota}).`));
          break;
        case 'DEJA_SIN_EFECTO_DEROGACION':
        case 'DEJA_SIN_EFECTO_REFORMA': {
          const previo = [...a.historial].reverse().find((h) => h.decreto === '93-2021');
          if (!previo) throw new Error(`art. ${n}: el ${op.decreto} anula un acto del D.93-2021 que no consta`);
          a.texto = previo.texto; a.vigente = previo.vigente;
          a.fusiones = a.fusiones.filter((f) => f.decreto !== '93-2021'); // la fusión anulada deja de contar
          a.constancias.push(cons(op, `El art. ${op.articuloDecreto} del D.${op.decreto} ${op.nota}.`));
          break;
        }
        case 'REFORMA':
        case 'ADICIONA': {
          const bloque = bloques.get(n);
          if (!bloque) throw new Error(`art. ${n}: sin texto en el D.${op.decreto}`);
          a.historial.push({ decreto: op.decreto, texto: a.texto, vigente: a.vigente });
          let nuevo = normalizarEpigrafe(textoDeBloque(bloque), a.texto || null);
          if (ELISION.test(nuevo)) {
            if (op.tipo === 'ADICIONA' || !a.vigente) throw new Error(`art. ${n}: elisiones sin texto vigente sobre el que fusionar`);
            const { texto, fusion } = fusionar(n, a.texto, nuevo);
            nuevo = texto;
            a.fusiones.push({ decreto: op.decreto, descartadas: fusion.descartadas, suprimidas: fusion.suprimidas, desdeVigente: fusion.tomadas.filter((t) => t.de === 'VIGENTE').length,
              desdeReforma: fusion.tomadas.filter((t) => t.de === 'REFORMA').length, epigrafeNuevo: fusion.tomadas.some((t) => t.de === 'EPIGRAFE_REFORMA') });
          } else a.fusiones = []; // texto íntegro: las fusiones anteriores quedan sustituidas
          a.texto = nuevo; a.vigente = true;
          a.constancias.push(cons(op, `${op.tipo === 'ADICIONA' ? 'Adicionado' : 'Reformado'} por el art. ${op.articuloDecreto} del D.${op.decreto} (${op.nota}).`));
          const ultima = a.fusiones[a.fusiones.length - 1];
          if (ultima?.decreto === op.decreto) {
            const base = { decreto: op.decreto, gaceta: DECRETOS[op.decreto].gaceta, fecha_gaceta: DECRETOS[op.decreto].fecha_gaceta };
            for (const sup of ultima.suprimidas)
              a.constancias.push({ ...base, tipo: 'SUPRESION_POR_SUSTITUCION', detalle: `Párrafo suprimido por la sustitución integral del precepto en el D.${op.decreto} (no figura en el texto que el decreto manda leer): «${sup}»` });
            if (ultima.epigrafeNuevo) a.constancias.push({ ...base, tipo: 'EPIGRAFE_REFORMADO', detalle: `El D.${op.decreto} publica el epígrafe nuevo («${EPIGRAFE.exec(nuevo)?.[1] ?? ''}») y elide el cuerpo, que se conserva sin cambios.` });
          }
          break;
        }
      }
    }
  }
  for (const a of arts.values()) {
    const i = a.ubicacion.findIndex((u) => /^TÍTULO XXV\b/.test(u));
    if (i >= 0) {
      a.ubicacion = a.ubicacion.map((u, k) => (k === i ? TITULO_XXV.nombre : u));
      a.constancias.push({ tipo: 'TITULO_RENOMBRADO', decreto: '43-2023', gaceta: DECRETOS['43-2023'].gaceta, fecha_gaceta: DECRETOS['43-2023'].fecha_gaceta, detalle: 'El art. 5 del D.43-2023 renombra el Título XXV: «OTROS DELITOS CONTRA EL ORDEN SOCIOECONOMICO».' });
    }
  }
  return arts;
}

export const ordenArticulo = (n: string) => { const [b, l] = n.split('-'); return Number(b) * 100 + (l ? l.charCodeAt(0) - 64 : 0); };

// ── Integridad y clasificación ──────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Artículos cuyo final sin puntuación es de la propia Gaceta 34,940 (verificado en el PDF): se conservan tal cual, sin añadir signos. */
export const SIN_CIERRE_EN_LA_GACETA = new Set(['211', '232', '317', '521']);
/** Art. 633: reforma el CPP y transcribe sus artículos con las elisiones («…») de la propia Gaceta; no es una elisión de esta consolidación. */
export const ELISIONES_DE_LA_GACETA = new Set(['633']);

export function problemasDeIntegridad(a: ArticuloCP): string[] {
  const p: string[] = [];
  const t = a.texto;
  if (t.length < 20) p.push(`contenido demasiado corto (${t.length})`);
  if (/^ARTÍCULO/i.test(t)) p.push('encabezado residual');
  if (ELISION.test(t) && !ELISIONES_DE_LA_GACETA.has(a.numero)) p.push('elisión «…» residual');
  if (/[“”]/.test(t) && (t.match(/“/g)?.length ?? 0) !== (t.match(/”/g)?.length ?? 0)) p.push('comillas desparejadas');
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F�\r]|Ã[¡-¿]|Â[ -¿]/.test(t)) p.push('caracteres de control o mojibake');
  if (/(?<!“)La Gaceta(?!”)|No\. 3\d,\d{3}|REPÚBLICA DE HONDURAS - TEG|-- \d+ of \d+ --/.test(t)) p.push('marca de página o cabecera');
  if (/\n{3,}| {2,}/.test(t)) p.push('espaciado anómalo');
  if (/[a-záéíóúñ]- [a-záéíóúñ]/.test(t)) p.push('posible palabra partida por guion');
  if (/\b(?:[A-ZÁÉÍÓÚÑ] ){3,}[A-ZÁÉÍÓÚÑ]\b/.test(t)) p.push('palabra espaciada');
  if (/(?:^|\n)(LIBRO|TÍTULO|CAPÍTULO|SECCIÓN) [IVXL]+\b/.test(t)) p.push('encabezado estructural dentro del cuerpo');
  if (!/[.;:)”"]$/.test(t) && !SIN_CIERRE_EN_LA_GACETA.has(a.numero)) p.push('termina sin puntuación de cierre');
  return p;
}

/**
 * Propuesta para el CLO. Fuente oficial (La Gaceta) → PRIMARY. Derogado → CONTEXT/false (con su texto de 2019, para hechos anteriores).
 * Reforma publicada con elisiones que DESCARTA unidades del texto anterior → CONTEXT vigente: el alcance de lo suprimido requiere dictamen.
 * Elisión total (el decreto no publica ningún texto nuevo) → PENDIENTE: no se puede saber qué cambió.
 */
/** Dictámenes del CLO sobre artículos concretos (resolución del 2026-11-24, D5 del pliego de la OLA 2). Prevalecen sobre la regla general. */
export const DICTAMENES_CLO: Record<string, Clasificacion> = {
  '325': { vigencia: 'VIGENTE', rol: 'CONTEXT', motivo: 'CONTEXT vigente por dictamen del CLO (D5, 2026-11-24): lectura literal por sustitución integral del precepto en el D.59-2024 (Gaceta 36,595); suprimidos los dos párrafos añadidos por el D.93-2021 (constancia SUPRESION_POR_SUSTITUCION)' },
  '328': { vigencia: 'VIGENTE', rol: null, motivo: 'PRIMARY por dictamen del CLO (D5, 2026-11-24): epígrafe actualizado «EXÓGENAS» por el D.93-2021 (Gaceta 35,760); cuerpo de la Gaceta 34,940 sin cambios' },
};

export function clasificar(a: ArticuloCP): Clasificacion {
  if (DICTAMENES_CLO[a.numero] && a.vigente) return DICTAMENES_CLO[a.numero];
  if (!a.vigente) {
    const d = a.constancias.filter((c) => c.tipo === 'DEROGA').map((c) => `D.${c.decreto}`).join(', ');
    return { vigencia: 'DEROGADO', rol: 'CONTEXT', motivo: `DEROGADO por ${d}; se conserva el texto de 2019 (Gaceta 34,940) para hechos anteriores` };
  }
  const sinTextoNuevo = a.fusiones.find((f) => f.desdeReforma === 0 && !f.epigrafeNuevo);
  if (sinTextoNuevo) return { vigencia: 'PENDIENTE', rol: 'CONTEXT', motivo: `PENDIENTE: el D.${sinTextoNuevo.decreto} lo declara reformado pero la Gaceta solo publica elisiones; no consta el texto nuevo (D5)` };
  const conSupresion = a.fusiones.filter((f) => f.suprimidas.length > 0);
  if (conSupresion.length) return { vigencia: 'VIGENTE', rol: 'CONTEXT', motivo: `CONTEXT: la reforma con elisiones del D.${conSupresion.map((f) => f.decreto).join(', D.')} omite ${conSupresion.reduce((s, f) => s + f.suprimidas.length, 0)} párrafo(s) del texto anterior sin sustituirlos; no consta si quedan suprimidos (D5)` };
  const reformas = a.constancias.filter((c) => c.tipo === 'REFORMA' || c.tipo === 'ADICIONA').map((c) => `D.${c.decreto}`);
  return { vigencia: 'VIGENTE', rol: null, motivo: reformas.length ? `PRIMARY: texto oficial consolidado con ${reformas.join(', ')} (La Gaceta)` : 'PRIMARY: texto oficial de la Gaceta 34,940, sin reformas en las Gacetas cotejadas' };
}

// ── Legacy ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface FilaLegacy { n: string; v: boolean; c: string }
export function compararLegacy(arts: ReadonlyMap<string, ArticuloCP>, legacy: readonly FilaLegacy[]) {
  const porNum = new Map(legacy.map((l) => [l.n, l]));
  const r = { filas_legacy: legacy.length, texto_2019_identico: 0, texto_2019_con_residuos: 0, texto_2019_distinto: [] as string[], legacy_vigente_pero_derogado: [] as string[], legacy_desactualizado_por_reforma: [] as string[], sin_fila_legacy: [] as string[], residuos: { encabezado_estructural: 0, marca_pagina: 0, firmas: 0, letras_espaciadas: 0 } };
  for (const a of [...arts.values()].sort((x, y) => ordenArticulo(x.numero) - ordenArticulo(y.numero))) {
    const l = porNum.get(a.numero);
    if (!l) { r.sin_fila_legacy.push(a.numero); continue; }
    const kl = clave(l.c), k19 = clave(a.textoOriginal2019 ?? '');
    if (kl === k19) r.texto_2019_identico++;
    else if (kl.startsWith(k19)) r.texto_2019_con_residuos++;
    else r.texto_2019_distinto.push(a.numero);
    if (/\n(LIBRO|TÍTULO|CAPÍTULO|SECCIÓN)\b/.test(l.c)) r.residuos.encabezado_estructural++;
    if (/-- \d+ of \d+ --/.test(l.c)) r.residuos.marca_pagina++;
    if (/PRESIDENTE|SECRETARIO/.test(l.c) && /Dado en la ciudad/.test(l.c)) r.residuos.firmas++;
    if (/\b(?:[A-ZÁÉÍÓÚÑ] ){3,}/.test(l.c)) r.residuos.letras_espaciadas++;
    if (l.v && !a.vigente) r.legacy_vigente_pero_derogado.push(a.numero);
    if (a.vigente && a.constancias.some((c) => c.tipo === 'REFORMA')) r.legacy_desactualizado_por_reforma.push(a.numero);
  }
  return r;
}

// ── Pipeline ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function construirOla2() {
  const pdfBaseSha = sha256(readFileSync(PDF_BASE));
  const pdfRefSha = sha256(readFileSync(PDF_REFORMAS));
  const textoBase = extraerColumnas(PDF_BASE, PAGS_BASE);
  const textoRef = extraerColumnas(PDF_REFORMAS, PAGS_REFORMAS);
  if (!/No\. ?34,940/.test(textoBase) || !/DECRETO No\. ?130-2017/.test(textoBase)) throw new Error('el PDF base no es la Gaceta 34,940 con el Decreto 130-2017');
  const base = segmentarBase(textoBase);
  const { decretos, truncados } = parsearReformas(textoRef);
  const esperados = Object.keys(DECRETOS);
  if (decretos.map((d) => d.decreto).join() !== esperados.join()) throw new Error(`decretos completos en la fuente: ${decretos.map((d) => d.decreto).join(', ')} (se esperaban ${esperados.join(', ')})`);
  for (const d of esperados) if (!new RegExp(`No\\. ?${DECRETOS[d].gaceta}`).test(textoRef)) throw new Error(`no consta la Gaceta ${DECRETOS[d].gaceta} del D.${d}`);
  const errores = cotejarOperaciones(decretos);
  if (errores.length) throw new Error(`la tabla OPERACIONES no coincide con los decretos:\n  ${errores.join('\n  ')}`);
  const arts = consolidar(base, decretos);
  const problemas = [...arts.values()].flatMap((a) => problemasDeIntegridad(a).map((p) => `art. ${a.numero}: ${p}`));
  if (problemas.length) throw new Error(`integridad: ${problemas.length} problema(s)\n  ${problemas.join('\n  ')}`);
  return { arts, pdfBaseSha, pdfRefSha, truncados, textoBaseSha: sha256(textoBase), textoRefSha: sha256(textoRef) };
}

export function filasOla2(arts: ReadonlyMap<string, ArticuloCP>, pdfBaseSha: string, pdfRefSha: string, truncados: readonly string[]): FilaOla[] {
  const orden = [...arts.values()].sort((x, y) => ordenArticulo(x.numero) - ordenArticulo(y.numero));
  return orden.map((a, i): FilaOla => {
    const contenido = a.texto.normalize('NFC');
    const reformado = a.constancias.some((c) => c.tipo !== 'TITULO_RENOMBRADO');
    return {
      id: `${CFG.ingestBatch}:${CFG.instrumentoId}:${a.numero}`,
      coleccion: 'mayalex_normativos', materia: '01_PENAL', contenido, num_articulo: a.numero, fuente: FUENTE,
      metadata: {
        norm_id: CFG.normId, instrumento_id: CFG.instrumentoId, ingest_batch: CFG.ingestBatch, ola: CFG.ola, ordinal: i + 1, decreto: '130-2017',
        texto_origen: reformado ? 'GACETA_34940_CONSOLIDADO_CON_GACETAS_DE_REFORMA' : 'GACETA_34940',
        gaceta_base: { numero: '34,940', fecha: '2019-05-10', pdf_sha256: pdfBaseSha },
        gacetas_reforma: { pdf_sha256: pdfRefSha, decretos: Object.values(DECRETOS), truncados_no_aplicados: truncados },
        epigrafe: /^([^a-záéíóúñü]+?)\.\s/.exec(contenido)?.[1] ?? null,
        ubicacion: a.ubicacion, constancias: a.constancias,
        fusiones_elision: a.fusiones, correcciones_saneamiento: a.correcciones,
        article_sha256: sha256(contenido),
        ...(a.textoOriginal2019 && a.textoOriginal2019 !== contenido ? { texto_2019_sha256: sha256(a.textoOriginal2019) } : {}),
        sustituye_id_legacy: a.textoOriginal2019 !== null ? `v2penal:mayalex_normativos:${a.numero}` : null,
      },
      jurisdiccion: 'HN', fuente_tipo: 'codigo', instrumento_id: CFG.instrumentoId, num_articulo_norm: normalizarNumeroArticulo(a.numero),
      hash_contenido: sha256(contenido), ingest_batch: CFG.ingestBatch, clasificacion: clasificar(a),
    };
  });
}

async function main(): Promise<void> {
  const { arts, pdfBaseSha, pdfRefSha, truncados, textoBaseSha, textoRefSha } = construirOla2();
  const filas = filasOla2(arts, pdfBaseSha, pdfRefSha, truncados);
  mkdirSync(SALIDA, { recursive: true });
  mkdirSync(EXPEDIENTE_DIR, { recursive: true });
  const iLegacy = process.argv.indexOf('--legacy');
  const rutaLegacy = iLegacy !== -1 ? process.argv[iLegacy + 1] : join(SALIDA, 'legacy_prod.jsonl');
  const legacy = existsSync(rutaLegacy) ? compararLegacy(arts, readFileSync(rutaLegacy, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as FilaLegacy)) : null;

  writeFileSync(join(SALIDA, 'rows.jsonl'), filas.map((f) => JSON.stringify(f)).join('\n') + '\n');
  const orden = [...arts.values()].sort((x, y) => ordenArticulo(x.numero) - ordenArticulo(y.numero));
  const manifiestoArt = {
    instrumento: CFG.normId, ingest_batch: CFG.ingestBatch,
    fuentes: { base: { archivo: PDF_BASE.split('/').pop(), sha256: pdfBaseSha, paginas: PAGS_BASE, texto_extraido_sha256: textoBaseSha }, reformas: { archivo: PDF_REFORMAS.split('/').pop(), sha256: pdfRefSha, paginas: PAGS_REFORMAS, texto_extraido_sha256: textoRefSha }, decretos: DECRETOS, truncados_no_aplicados: truncados },
    texto_sha256: sha256(filas.map((f) => `${f.num_articulo}\n${f.contenido}`).join('\n\n')),
    conteos: contar(filas), operaciones: OPERACIONES, legacy,
    articulos_detalle: orden.map((a) => { const f = filas.find((x) => x.num_articulo === a.numero)!; return {
      numero: a.numero, sha256: f.hash_contenido, vigencia: f.clasificacion.vigencia, rol: f.clasificacion.rol ?? 'PRIMARY', motivo: f.clasificacion.motivo,
      constancias: a.constancias.map((c) => `${c.tipo} D.${c.decreto}`), fusiones: a.fusiones, correcciones: a.correcciones, ubicacion: a.ubicacion }; }),
  };
  writeFileSync(join(EXPEDIENTE_DIR, 'manifiesto_articulos.json'), JSON.stringify(manifiestoArt, null, 2) + '\n');
  writeFileSync(join(EXPEDIENTE_DIR, 'constancias.csv'), ['articulo,tipo,decreto,gaceta,fecha_gaceta,detalle',
    ...orden.flatMap((a) => a.constancias.map((c) => [a.numero, c.tipo, c.decreto, `"${c.gaceta}"`, c.fecha_gaceta, `"${c.detalle.replace(/"/g, '""')}"`].join(',')))].join('\n') + '\n');
  // Texto anterior y nuevo de cada artículo tocado por una reforma, para el cotejo del CLO.
  writeFileSync(join(EXPEDIENTE_DIR, 'reformas_texto_anterior_y_vigente.md'), [
    '# OLA 2 · Código Penal · artículos reformados: texto anterior y texto consolidado', '',
    'Generado por `scripts/olas/ola2-cp.ts`. Para cada artículo tocado por los decretos 93-2021, 43-2023 y 59-2024: el texto de la Gaceta 34,940, el texto que resulta y, si hubo reforma con elisiones, las unidades que se tomaron del texto anterior y las que se suprimieron.', '',
    ...orden.filter((a) => a.constancias.some((c) => c.tipo !== 'TITULO_RENOMBRADO')).flatMap((a) => {
      const f = filas.find((x) => x.num_articulo === a.numero)!;
      return [`## Art. ${a.numero} · ${f.clasificacion.vigencia}${f.clasificacion.rol ? ` · ${f.clasificacion.rol}` : ' · PRIMARY'}`, '',
        ...a.constancias.filter((c) => c.tipo !== 'TITULO_RENOMBRADO').map((c) => `- ${c.detalle} Gaceta ${c.gaceta} (${c.fecha_gaceta}).`), '',
        ...a.fusiones.flatMap((fu) => [`**Fusión con elisiones (D.${fu.decreto}):** ${fu.desdeReforma} unidad(es) publicadas por la reforma${fu.epigrafeNuevo ? ' (más el epígrafe nuevo)' : ''}, ${fu.desdeVigente} tomadas del texto anterior por elisión, ${fu.descartadas.length - fu.suprimidas.length} sustituida(s) y **${fu.suprimidas.length} omitida(s) sin sustituto**.`, ...fu.suprimidas.map((d) => `> Omitida sin sustituto: ${d}`), '']),
        '**Texto 2019 (Gaceta 34,940):**', '', a.textoOriginal2019 ? a.textoOriginal2019.split('\n').map((l) => `> ${l}`).join('\n') : '> (artículo nuevo)', '',
        `**Texto ${a.vigente ? 'consolidado' : 'que se conserva (derogado)'}:**`, '', a.texto.split('\n').map((l) => `> ${l}`).join('\n'), ''];
    }),
  ].join('\n'));

  const embeddings = process.argv.includes('--sin-embeddings') ? null : await embeddingsConCache(filas, join(SALIDA, 'embeddings_cache.jsonl'));
  if (!embeddings) { console.log(JSON.stringify({ conteos: contar(filas), legacy, truncados }, null, 2)); return; }
  const { archivos, conteos } = escribirPaquete({ cfg: CFG, filas, embeddings, salida: SALIDA });
  escribirManifiestoYPs1({ cfg: CFG, salida: SALIDA, archivos, conteos, pliegoRel: `${EXPEDIENTE_DIR}/EXPEDIENTE_AUDITORIA_CP_OLA2.md`, raizRel: '../..',
    extra: { pdf_base_sha256: pdfBaseSha, pdf_reformas_sha256: pdfRefSha, texto_sha256: manifiestoArt.texto_sha256, manifiesto_articulos_sha256: sha256(readFileSync(join(EXPEDIENTE_DIR, 'manifiesto_articulos.json'))) } });
  console.log(JSON.stringify({ conteos, legacy: legacy && { ...legacy, texto_2019_distinto: legacy.texto_2019_distinto.length }, truncados, archivos: archivos.map((a) => `${a.ruta} ${a.bytes}B ${a.sha256}`) }, null, 2));
}

if (process.argv[1]?.endsWith('ola2-cp.ts')) main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
