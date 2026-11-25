/**
 * scripts/olas/ola5-cf.ts
 * OLA 5 — HN:CODIGO_FAMILIA (Decreto No. 76-84, La Gaceta No. 24,394 del 16 de agosto de 1984).
 *
 * Fuentes, por jerarquía:
 *   1. La Gaceta 33,222 (D.35-2013), ya en producción V5 (lote A04): art. 4 (reforma 28 artículos del Código de Familia), art. 5 (adiciona
 *      34 artículos), art. 13 (deroga el art. 131). Se leen de `A04_transcripcion_candidata_v8.txt` y se exige la huella de producción.
 *   2. Edición consolidada del CEDIJ «Codigo de Familia (Actualizado con Reformas Ley de Adopciones).pdf» (Word 2019, 17-oct-2023) con
 *      notas al pie secuenciales que citan cada decreto (D.35-2013, D.31-2015, D.44-2017, D.102-2018, D.211-2006, D.73-96, D.124-92…).
 *
 * Extracción: pdftotext -layout; por página se retira la cabecera del CEDIJ y el folio, y las notas al pie (bloque inferior que empieza con
 * el número de nota esperado). Las llamadas de nota vienen pegadas al número del artículo («Artículo 111.» = art. 11 + nota 1) o al texto
 * («Derogado.3»); se resuelven en orden estricto 1..N y cada nota que nombra su artículo se cruza con el artículo donde cayó su llamada.
 *
 * Hallazgo central sobre el legacy de producción (373 filas `v2familia:mayalex_normativos:*`): 328 filas dicen estado_articulo=VIGENTE
 * pero tienen es_norma_vigente=false (incoherencia de carga), muchas con contenido «Derogado» sin decreto, y faltan los artículos
 * adicionados por el D.31-2015 (70-A a 70-D) y otros. Nada llega a V4/V5 sin la firma D1–D8 del CLO.
 *
 * OFFLINE salvo el modelo de embeddings local. Uso: npx tsx scripts/olas/ola5-cf.ts [--sin-embeddings]
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizarNumeroArticulo } from '../../lib/legal-retrieval/clo-guards';
import { contar, escribirManifiestoYPs1, escribirPaquete, sha256, type Clasificacion, type ConfigOla, type FilaOla } from './paquete-ola';
import { decretosDe, embeddingsConCache } from './ola1-cpp';
import { dice, normalizarCotejo, refluirGaceta, tramoVerificado, TRANSCRIPCION_D35, GACETA_D35 } from './ola4-cc';

export const CFG: ConfigOla = {
  ola: 'OLA5',
  normId: 'HN:CODIGO_FAMILIA',
  instrumentoId: 'CODIGO_FAMILIA',
  ingestBatch: 'OLA5_CF_2023_01',
  fechaCorte: '2026-11-24',
  adjudicacion: 'EXPEDIENTE_AUDITORIA_CF_OLA5.md (D1–D8)',
  legacy: {
    condicion: "b.metadata->>'norm_id' = 'HN_CODIGO_FAMILIA' AND b.id LIKE 'v2familia:mayalex_normativos:%'",
    esperadas: 373,
    descripcion: 'carga legacy HN_CODIGO_FAMILIA (V2), ids v2familia:mayalex_normativos:*',
  },
};
export const SALIDA = 'out/ola5-cf';
export const EXPEDIENTE_DIR = 'docs/corpus/staging/2026-11-24-hn-cf-ola5';
export const PDF_FUENTE = 'C:/Users/fredy/OneDrive/Email attachments/Documentos/CODIGOS/Codigo de Familia (Actualizado con Reformas Ley de Adopciones).pdf';
export const FUENTE_CANONICA = 'Código de Familia de Honduras (Decreto No. 76-84)';
export const EDICION_FUENTE = 'Edición consolidada del CEDIJ (Poder Judicial), «Codigo de Familia (Actualizado con Reformas Ley de Adopciones).pdf», Word 2019, 17-oct-2023; notas al pie secuenciales con la cita de cada decreto.';
export const D35_ART4 = { inicio: 'Reformar los Artículos 11,16,23', largo: 18090, sha: 'e2668e470586862b005100a8c2c58192b022da9a914e5aba5bf7d8dfd146bbd1' };
export const D35_ART5 = { inicio: 'Adicionar al Decreto No. 76-84', largo: 18772, sha: '956d34880ecc762522ee9a66e2b78f979e92e2a28d30e62036003bb1d425bee4' };
export const D35_ART13 = { inicio: 'Derogar el Artículo 131 del Decreto', largo: 110, sha: '1eec596d0e94109dbf3c5b1c0a26f3db582f9c7a595b62c22288c76ac43a8dc0' };

/** Legacy de producción (consulta del 2026-11-24): los 373 números y los 43 marcados es_norma_vigente=true; 123-A y 123-B son los únicos con estado DEROGADO. */
export const LEGACY_VIGENTES = new Set('68,70,185,186,187,188,189,190,191,192,193,194,195,196,197,197-A,197-B,197-C,197-D,197-E,198,198-A,198-B,198-C,199,200,201,202,203,204,205,207,207-A,207-B,207-C,207-D,207-E,207-F,207-G,208,209,210,210-A'.split(','));
export const LEGACY_NUMEROS = new Set([...LEGACY_VIGENTES, '123-A', '123-B', ...('5,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,171,172,173,174,175,176,177,211,212,242-A,243,244,245,246,247,248,249,269,270,271,272,273,274,275,276,277,3,4,1,2,48,49,50,51,52,53,54,115,64,65,66,67,69,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,95,96,97,98,99,100,101,102,103,104,105,116,117,118,119,119-A,119-B,120,120-A,136,106,107,108,109,110,111,112,113,114,144,166,167,168,169,170,178,179,180,181,182,183,184,206,338,213,214,215,216,216-A,216-B,217,218,219,220,221,222,223,224,225,226,226-A,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,265,266,267,268,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292,293,294,295,296,297,298,299,300,301,302,303,304,305,306,307,308,309,310,311,312,313,314,315,316,317,318,319,320,321,322,323,324,325,326,327,328,329,330,331,332,332-A,333,334,335,336,337,23,31,32,33,34,35,43,44,45,46,47,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,24,25,26,27,28,29,30,36,37,38,39,40,41,42,55,56,57,58,59,60,61,62,63,86,87,88,89,90,91,92,93,94,120-B,120-C,120-D,121,122,123,123-C,123-D,123-E,123-F,123-G,123-H,124,125,126,127,128,129,130,131,132,133,134,135,137,138,139,140,141,142,143,145,146,147,148,149,150'.split(','))]);
/** Legacy con contenido literal «Derogado» (md5 ec181e5f…, 8 caracteres) aunque su estado dice VIGENTE. */
export const LEGACY_SOLO_DEROGADO = new Set('131,137,138,145,146,147,148,149,150,151,152,153,155,160,167,169,170'.split(','));

// ── Extracción ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface Nota { num: number; texto: string }
const CABECERA = /^\s*CENTRO ELECTR[OÓ]NICO DE DOCUMENTACI[OÓ]N E INFORMACI[OÓ]N JUDICIAL\s*$/;
const FOLIO = /^\s{20,}\d{1,3}\s*$/;

export function extraer(crudo: string): { cuerpo: string; notas: Nota[] } {
  const paginas = crudo.split('\f');
  const notas: Nota[] = [];
  const cuerpo: string[] = [];
  let k = 1;
  for (const pag of paginas) {
    const lineas = pag.split('\n').filter((l) => !CABECERA.test(l) && !FOLIO.test(l));
    let enNotas = false;
    for (const l of lineas) {
      // Algunas páginas traen sangría de un espacio y otras pegan el número («44Artículo»); toda nota empieza con mayúscula.
      const m = /^ {0,2}(\d{1,3}) *([A-ZÁÉÍÓÚ].*)$/.exec(l);
      if (m && Number(m[1]) === k) { notas.push({ num: k, texto: m[2].trim() }); k++; enNotas = true; continue; }
      if (enNotas) { if (l.trim()) notas[notas.length - 1].texto += ` ${l.trim()}`; continue; }
      cuerpo.push(l);
    }
  }
  return { cuerpo: cuerpo.join('\n'), notas };
}

/** Erratas de numeración de la edición, confirmadas por su propia nota al pie (la nota nombra el artículo correcto). */
export const ERRATAS_EDICION: ReadonlyArray<{ impreso: string; correcto: string; nota: number }> = [
  { impreso: 'Artículo 323.47Derogado', correcto: 'Artículo 133.47Derogado', nota: 47 },
  { impreso: 'Artículo 332.55Derogado', correcto: 'Artículo 142.55Derogado', nota: 55 },
];
export function corregirErratas(cuerpo: string): string {
  let t = cuerpo;
  for (const e of ERRATAS_EDICION) {
    const n = t.split(e.impreso).length - 1;
    if (n !== 1) throw new Error(`errata «${e.impreso}»: ${n} apariciones (se esperaba 1)`);
    t = t.replace(e.impreso, e.correcto);
  }
  return t;
}

export interface ArticuloBruto { numero: string; texto: string; llamadas: number[]; encabezado: string }
const ENCABEZADO = /^Art[ií]culo\s+(\d+)\s*(?:(?:-\s*|\.-|\s)?\s*([A-H])(?![a-zA-Záéíóúñ]))?\s*([.\-]*)\s*(\d{0,3})\s*([.\-]*)\s*(\d{0,3})/;

/** Base numérica de un artículo («119-A» → 119). */
const base = (n: string) => Number(n.split('-')[0]);

export function segmentar(cuerpo: string, totalNotas: number): ArticuloBruto[] {
  const lineas = cuerpo.split('\n');
  const arts: ArticuloBruto[] = [];
  let k = 1; // próxima nota esperada
  let prev = 0;
  let actual: ArticuloBruto | null = null;
  const cuerpoActual: string[] = [];
  const llamadasDeEstructura: number[] = [];
  const cerrar = () => { if (actual) { actual.texto = cuerpoActual.join('\n'); arts.push(actual); } cuerpoActual.length = 0; };
  for (const l of lineas) {
    const m = ENCABEZADO.exec(l.trimStart());
    // Una referencia «Artículo 5 de este Código» al inicio de línea no es encabezado: exige número plausible y que no siga «de».
    let tomado: { numero: string; llamadas: number[]; resto: string } | null = null;
    if (m && !/^Art[ií]culo\s+\d+\s+de\s/.test(l.trimStart())) {
      const D = m[1];
      const letra = m[2] ?? '';
      const opciones: Array<{ a: number; llamadas: number[] }> = [];
      for (let i = 1; i <= D.length; i++) {
        const a = Number(D.slice(0, i));
        let resto = D.slice(i);
        const llamadas: number[] = [];
        let kk = k;
        while (resto && resto.startsWith(String(kk))) { llamadas.push(kk); resto = resto.slice(String(kk).length); kk++; }
        if (resto) continue;
        if (a >= prev && a <= prev + 3) opciones.push({ a, llamadas });
      }
      if (opciones.length) {
        // Preferir el número que sigue al anterior (o el mismo, para bis); a igualdad, el que consume llamadas.
        opciones.sort((x, y) => Math.abs(x.a - prev - (letra ? 0 : 1)) - Math.abs(y.a - prev - (letra ? 0 : 1)) || y.llamadas.length - x.llamadas.length);
        const o = opciones[0];
        let kk = k + o.llamadas.length;
        const llamadas = [...o.llamadas];
        for (const g of [m[4], m[6]]) {
          if (!g) continue;
          // «70-A99.»: la edición duplica el voladito de la nota 9 (verificado en el PDF); cuenta como una sola llamada.
          if (Number(g) !== kk && g !== String(kk).repeat(2)) throw new Error(`encabezado «${l.trim().slice(0, 40)}»: llamada ${g} fuera de orden (esperada ${kk})`);
          llamadas.push(kk); kk++;
        }
        tomado = { numero: letra ? `${o.a}-${letra}` : String(o.a), llamadas, resto: l.trimStart().slice(m[0].length) };
      }
    }
    if (tomado) {
      cerrar();
      actual = { numero: tomado.numero, texto: '', llamadas: [...llamadasDeEstructura, ...tomado.llamadas], encabezado: l.trim() };
      llamadasDeEstructura.length = 0;
      k += tomado.llamadas.length;
      prev = base(tomado.numero);
    }
    if (actual) {
      // Llamada en un epígrafe de estructura («TÍTULO IV 21»): la nota es del título y se liga al artículo SIGUIENTE.
      const est = tomado ? null : /^(\s*[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ ]+[A-ZÁÉÍÓÚÑIVXL])\s+(\d{1,3})\s*$/.exec(l);
      if (est && Number(est[2]) === k) { llamadasDeEstructura.push(k); k++; cuerpoActual.push(est[1]); continue; }
      // Llamadas pegadas al texto (también en el resto de la línea del encabezado, «Artículo 206. Derogado110»), en orden estricto.
      let linea = tomado ? tomado.resto : l;
      for (;;) {
        const re = new RegExp(`(?<=[a-zA-ZáéíóúñÁÉÍÓÚÑ.;:,”"»)])${k}(?=\\s|$|[A-ZÁÉÍÓÚ.,]|\\.)`);
        const mm = re.exec(linea);
        if (!mm || k > totalNotas) break;
        linea = linea.slice(0, mm.index) + linea.slice(mm.index + String(k).length);
        actual.llamadas.push(k);
        k++;
      }
      cuerpoActual.push(linea);
    }
  }
  cerrar();
  if (k !== totalNotas + 1) throw new Error(`llamadas de nota: se resolvieron ${k - 1} de ${totalNotas}`);
  return arts;
}

/** Artículo que nombra el texto de una nota («Artículo 119 A.», «Artículo 175.-A.», «Último párrafo Artículo 16.»), o null. */
export function articuloDeNota(texto: string): string | null {
  const m = /^(?:[ÚU]ltimo p[aá]rrafo(?: de este)?\s+)?Art[ií]culo\s+(\d+)\s*(?:[.\-]*\s*-?\s*([A-H])(?![a-záéíóúñ]))?/.exec(texto);
  return m ? (m[2] ? `${m[1]}-${m[2]}` : m[1]) : null;
}

// ── Constancias y clasificación ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export type TipoConstancia = 'REFORMA' | 'ADICION' | 'DEROGACION_TOTAL' | 'DEROGACION_PARCIAL' | 'DEROGACION_DE_TITULO' | 'TEXTO_OFICIAL_GACETA' | 'DEROGACION_GACETA_OMITIDA_EN_EDICION' | 'REVISION_PENDIENTE_CLO' | 'DICTAMEN_CLO';
export interface Constancia { nota: number | null; tipo: TipoConstancia; texto: string; decretos: string[] }
export function tipificarNota(texto: string): TipoConstancia {
  if (/^(T[ií]tulo|Cap[ií]tulo)/i.test(texto) && /Derogad/i.test(texto)) return 'DEROGACION_DE_TITULO';
  if (/p[aá]rrafo|numeral|literal|inciso/i.test(texto.split(/Derogad/i)[0]) && /Derogad/i.test(texto)) return 'DEROGACION_PARCIAL';
  if (/Derogad/i.test(texto)) return 'DEROGACION_TOTAL';
  if (/Adici/i.test(texto)) return 'ADICION';
  return 'REFORMA';
}
// Variantes de la edición: «Decreto. 73-96», «Decreto No. 73-96», «Decreto 102-⏎2018» (guion al final de línea).
const decretosCF = (t: string) => [...new Set([...decretosDe(t), ...[...t.matchAll(/Decreto\.?\s+(?:No\.?\s*)?(\d{1,3})-\s?(\d{2,4})\b/gi)].map((m) => `${m[1]}-${m[2]}`)])];

const ES_ITEM = /^(?:\d{1,2}\)|[a-zñ]{1,2}\)|[IVXL]+\.|\d{1,2}\.\s|[-•])\s?/;
export function refluirCF(t: string): string {
  const parrafos = t.split(/\n\s*\n/).map((p) => p.split('\n').map((l) => l.trim()).filter(Boolean)
    .reduce((acc, l) => (acc === '' ? l : ES_ITEM.test(l) ? `${acc}\n${l}` : `${acc} ${l}`), '')).filter(Boolean);
  const out: string[] = [];
  for (const p of parrafos) {
    if (out.length && !/[.:;]$/.test(out[out.length - 1]) && /^[a-záéíóúñ(]/.test(p)) out[out.length - 1] += ` ${p}`;
    else out.push(p);
  }
  return out.join('\n\n').replace(/ {2,}/g, ' ');
}
/** Retira epígrafes de estructura (TÍTULO/CAPÍTULO/SECCIÓN y su rúbrica en mayúsculas) que quedan al final del artículo anterior. */
export function quitarEstructura(t: string): { texto: string; ubicacion: string[] } {
  const lineas = t.split('\n');
  const ubicacion: string[] = [];
  while (lineas.length) {
    const u = lineas[lineas.length - 1].trim();
    if (!u) { lineas.pop(); continue; }
    if ((/[A-ZÁÉÍÓÚÑ]{3}/.test(u) || /^[IVXL]+$/.test(u)) && !/[a-záéíóúñ]/.test(u) || /^Secci[oó]n [A-ZÁÉÍÓÚ][a-záéíóú]+$/.test(u)) { ubicacion.unshift(u); lineas.pop(); continue; }
    break;
  }
  return { texto: lineas.join('\n'), ubicacion };
}

export function leerD35CF(): { reformados: Map<string, string>; derogados: Set<string> } {
  const texto = readFileSync(TRANSCRIPCION_D35, 'utf8').replace(/\r\n/g, '\n');
  const reformados = new Map<string, string>();
  for (const t of [D35_ART4, D35_ART5]) {
    const s = tramoVerificado(texto, t);
    const partes = s.split(/"ARTÍCULO (\d+(?:-[A-H])?)(?:\.-|-|\.)\s*/);
    for (let i = 1; i < partes.length; i += 2) reformados.set(partes[i], partes[i + 1].replace(/\n*CÓDIGO (?:CIVIL|DE FAMILIA)\s*$/, '').replace(/"\s*$/, '').trim());
  }
  tramoVerificado(texto, D35_ART13);
  return { reformados, derogados: new Set(['131']) };
}

/**
 * Resolución del CLO del 2026-11-24 (D5): artículos del Título IV (De la adopción) que la edición mantiene vigentes, reclasificados como
 * CONTEXT vigente hasta cotejar la cláusula derogatoria del D.102-2018. La lista del art. 63 del D.102-2018 que consta en
 * docs/governance/fase1-triage/dossier-DEROGACION_ADOPCION_102-2018.md tampoco los incluye.
 */
const ART63 = 'art. 63, numeral 1, del Decreto No. 102-2018, Ley Especial de Adopciones (La Gaceta No. 34,841 del 10 de enero de 2019)';
/**
 * Cierre de D5 por resolución del CLO (2026-11-24, segunda resolución), conforme al art. 63 del D.102-2018: el literal a) deroga del
 * Título IV (De la adopción) los Capítulos I y VI; el literal b) lista 55 artículos. 122-A y 135 (Capítulo I) y 175-A (Capítulo VI)
 * quedan derogados por el literal a); 165 (Capítulo IV) no consta en ninguno de los dos literales y sigue como CONTEXT vigente.
 */
export const DICTAMENES_CLO: Record<string, { clasificacion: Clasificacion; constancia: Constancia }> = {
  ...Object.fromEntries(([['122-A', 'I'], ['135', 'I'], ['175-A', 'VI']] as const).map(([n, cap]) => [n, {
    clasificacion: { vigencia: 'DEROGADO', rol: 'CONTEXT', motivo: `DEROGADO por el ${ART63}, literal a): Capítulo ${cap} del Título IV. Dictamen del CLO (D5, 2026-11-24)` } as Clasificacion,
    constancia: { nota: null, tipo: 'DEROGACION_TOTAL', decretos: ['102-2018'], texto: `Derogado por el ${ART63}, literal a), que deroga el Capítulo ${cap} del Título IV (De la adopción). La edición CEDIJ lo imprime como vigente; se conserva su texto como antecedente. Resolución del CLO del 2026-11-24 (cierre de D5).` } as Constancia,
  }])),
  '165': {
    clasificacion: { vigencia: 'VIGENTE', rol: 'CONTEXT', motivo: `CONTEXT vigente por dictamen del CLO (D5, 2026-11-24): Capítulo IV del Título IV; la derogación expresa del ${ART63} solo alcanzó los Capítulos I y VI` },
    constancia: { nota: null, tipo: 'DICTAMEN_CLO', decretos: ['102-2018'], texto: `Capítulo IV del Título IV (De la adopción). La derogación expresa del ${ART63} solo alcanzó los Capítulos I y VI (literal a) y los artículos que lista el literal b), entre los que no está este. Se mantiene como CONTEXT vigente. Resolución del CLO del 2026-11-24 (cierre de D5).` },
  },
};

const MOTIVO_EDICION = 'edición consolidada CEDIJ (2023) con reformas integradas; cotejo íntegro con La Gaceta pendiente (D1)';
export interface ArticuloCF {
  fila: FilaOla; constancias: Constancia[]; correcciones: string[]; ubicacion: string[]; cotejoGaceta: number | null; enLegacy: boolean; vigenteLegacy: boolean | null;
}

export function construirOla5(): { articulos: ArticuloCF[]; notas: Nota[]; pdfSha: string } {
  const pdfSha = sha256(readFileSync(PDF_FUENTE));
  const crudo = execFileSync('pdftotext', ['-layout', '-enc', 'UTF-8', PDF_FUENTE, '-'], { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }).replace(/\r\n?/g, '\n');
  const { cuerpo, notas } = extraer(crudo);
  const inicio = cuerpo.search(/^Art[ií]culo 1\. /m);
  const fin = cuerpo.search(/^Dado en la ciudad de Tegucigalpa/m);
  const brutos = segmentar(corregirErratas(cuerpo.slice(inicio, fin)), notas.length);
  const d35 = leerD35CF();

  const problemas: string[] = [];
  const vistos = new Set<string>();
  // Cruce nota ↔ artículo donde cayó su llamada.
  const notaArt = new Map<number, string>();
  for (const a of brutos) for (const n of a.llamadas) notaArt.set(n, a.numero);
  for (const n of notas) {
    const nombrado = articuloDeNota(n.texto);
    if (nombrado && nombrado !== notaArt.get(n.num)) problemas.push(`nota ${n.num} nombra el art. ${nombrado} pero su llamada cae en el art. ${notaArt.get(n.num)}`);
  }

  // Ubicación: los epígrafes al final de un artículo pertenecen al siguiente.
  let ubicPendiente: string[] = [];
  const articulos = brutos.map((a, i): ArticuloCF => {
    if (vistos.has(a.numero)) problemas.push(`art. ${a.numero} repetido`);
    vistos.add(a.numero);
    const { texto, ubicacion } = quitarEstructura(a.texto);
    const miUbicacion = ubicPendiente;
    ubicPendiente = ubicacion;
    const correcciones: string[] = ['ENCABEZADO_RETIRADO'];
    if (a.llamadas.length) correcciones.push('LLAMADAS_DE_NOTA_RETIRADAS');
    let contenido = refluirCF(texto.replace(/^[\s.\-]+/, '')).normalize('NFC');
    const constancias: Constancia[] = a.llamadas.map((n) => { const t = notas[n - 1].texto.replace(/\s+/g, ' '); return { nota: n, tipo: tipificarNota(t), texto: t, decretos: decretosCF(t) }; });
    const derogadoEdicion = /^Derogad[oa]\.?$/.test(contenido);
    let clasificacion: Clasificacion;
    let cotejoGaceta: number | null = null;
    const decretosConst = constancias.flatMap((c) => c.decretos);

    if (derogadoEdicion) {
      const c = constancias.find((x) => x.tipo === 'DEROGACION_TOTAL' || x.tipo === 'DEROGACION_DE_TITULO');
      const titulo = !c ? [...articulos.slice(0, 0)] : [];
      void titulo;
      clasificacion = { vigencia: 'DEROGADO', rol: 'CONTEXT', motivo: c ? `DEROGADO por ${c.decretos.map((d) => `D.${d}`).join(', ') || 'nota de la edición'} según la edición CEDIJ 2023${d35.derogados.has(a.numero) ? '; confirmado con el art. 13 del D.35-2013 (Gaceta 33,222)' : '; cotejo con La Gaceta pendiente (D1)'}` : 'DEROGADO según la edición CEDIJ 2023 (sin nota propia: derogación del título/capítulo anotada en un artículo anterior)' };
    } else if (d35.derogados.has(a.numero)) {
      constancias.push({ nota: null, tipo: 'DEROGACION_GACETA_OMITIDA_EN_EDICION', decretos: [GACETA_D35.decreto], texto: 'Derogado por el art. 13 del Decreto No. 35-2013 (La Gaceta No. 33,222). La edición no lo anota.' });
      clasificacion = { vigencia: 'DEROGADO', rol: 'CONTEXT', motivo: 'DEROGADO por el art. 13 del D.35-2013 (Gaceta 33,222), omitido por la edición' };
    } else {
      // Texto oficial del D.35-2013 cuando esa es la ÚLTIMA reforma anotada del artículo.
      // (la edición no siempre anota el D.35-2013, p. ej. 216-A: basta con que no haya un decreto posterior a 2013)
      const posterior = decretosConst.some((d) => Number(d.split('-').pop()) > 2013);
      if (d35.reformados.has(a.numero) && !posterior && !constancias.some((c) => c.tipo === 'DEROGACION_PARCIAL')) {
        // Comilla de cierre de la transcripción del decreto que La Gaceta deja a fin de un párrafo intermedio (332-A): no es texto.
        const oficial = refluirGaceta(d35.reformados.get(a.numero)!).replace(/"(?=\n\n)/g, '').replace(/ {2,}/g, ' ').normalize('NFC');
        cotejoGaceta = dice(normalizarCotejo(oficial), normalizarCotejo(contenido));
        // Reforma publicada con elisiones («4)», «7) ...;y»): La Gaceta conserva esos numerales del texto anterior. Se verifica que cada
        // unidad NO elidida de La Gaceta esté en la edición y se conserva el texto de la edición, que integra lo elidido.
        // Unidades = líneas; solo se parte dentro de una línea tras un numeral elidido que cierra con «;y» («7) ...;y 8)»), nunca en
        // remisiones internas como «el numeral 1) forman…».
        const unidadesGaceta = oficial.split('\n').flatMap((x) => x.split(/(?<=^\d{1,2}\)\s*(?:\.{3}|…)\s*;\s*y,?)\s+(?=\d{1,2}\))/)).map((x) => x.trim()).filter(Boolean);
        const esElidida = (x: string) => /^\d{1,2}\)\s*(?:\.{3}|…)?\s*;?\s*(?:y,?)?$/.test(x);
        const elididas = unidadesGaceta.filter(esElidida);
        if (elididas.length) {
          // Fusión: unidades no elididas = texto de La Gaceta; numerales elididos = texto de la edición (texto anterior conservado).
          const itemsEd = new Map(contenido.split('\n').filter((x) => /^\d{1,2}\)/.test(x)).map((x) => [x.match(/^\d+/)![0], x]));
          const fusion = unidadesGaceta.map((x) => {
            if (!esElidida(x)) return x;
            const n = x.match(/^\d+/)![0];
            const ed = itemsEd.get(n);
            if (!ed) { problemas.push(`art. ${a.numero}: numeral ${n}) elidido en La Gaceta y ausente en la edición`); return x; }
            return ed;
          });
          const intro = fusion.filter((x) => !/^\d{1,2}\)/.test(x));
          const items = fusion.filter((x) => /^\d{1,2}\)/.test(x));
          const fusionado = [...intro.slice(0, 1), items.join('\n'), ...intro.slice(1)].filter(Boolean).join('\n\n');
          cotejoGaceta = dice(normalizarCotejo(fusionado), normalizarCotejo(contenido));
          if (cotejoGaceta < 0.85) problemas.push(`art. ${a.numero}: fusión con elisiones demasiado distinta de la edición (${cotejoGaceta.toFixed(3)})`);
          constancias.push({ nota: null, tipo: 'TEXTO_OFICIAL_GACETA', decretos: [GACETA_D35.decreto],
            texto: `La Gaceta No. 33,222 publica la reforma con los numerales ${elididas.map((x) => x.match(/^\d+/)![0]).join(', ')} elididos (se conservan del texto anterior, tomados de la edición CEDIJ). Las demás unidades se toman del D.35-2013 oficial (similitud con la edición ${cotejoGaceta.toFixed(3)}); sha256 del texto de la edición: ${sha256(contenido)}.` });
          correcciones.push('TEXTO_OFICIAL_GACETA', 'FUSION_ELISIONES_GACETA');
          contenido = fusionado;
        } else if (cotejoGaceta >= 0.85 && oficial !== contenido) {
          constancias.push({ nota: null, tipo: 'TEXTO_OFICIAL_GACETA', decretos: [GACETA_D35.decreto],
            texto: `Texto tomado del D.35-2013 (La Gaceta No. 33,222), que coincide en sustancia con la edición CEDIJ (similitud ${cotejoGaceta.toFixed(3)}); sha256 del texto de la edición: ${sha256(contenido)}.` });
          correcciones.push('TEXTO_OFICIAL_GACETA');
          contenido = oficial;
        }
      }
      const tipos = new Set(constancias.map((c) => c.tipo));
      const anot = tipos.has('DEROGACION_PARCIAL') ? ' (derogación parcial anotada)' : tipos.has('ADICION') ? ' (artículo adicionado)' : tipos.has('REFORMA') ? ' (reforma integrada)' : '';
      clasificacion = cotejoGaceta !== null && cotejoGaceta < 0.85
        ? { vigencia: 'VIGENTE', rol: 'CONTEXT', motivo: `CONTEXT vigente: el texto de la edición difiere del D.35-2013 oficial (similitud ${cotejoGaceta.toFixed(3)}); dictamen del CLO (D5)` }
        : { vigencia: 'VIGENTE', rol: null, motivo: correcciones.includes('TEXTO_OFICIAL_GACETA') ? 'PRIMARY: texto oficial del D.35-2013 (Gaceta 33,222)' : `PRIMARY elegible${anot}: ${MOTIVO_EDICION}` };
    }
    const dictamen = DICTAMENES_CLO[a.numero];
    if (dictamen) {
      if (clasificacion.vigencia !== 'VIGENTE') throw new Error(`art. ${a.numero}: dictamen CLO sobre un artículo que la edición ya no da por vigente`);
      clasificacion = dictamen.clasificacion;
      constancias.push(dictamen.constancia);
    }
    for (const pr of problemasDeIntegridadCF(a.numero, contenido, clasificacion.vigencia === 'DEROGADO' && derogadoEdicion)) problemas.push(`art. ${a.numero}: ${pr}`);
    const numero = a.numero;
    const enLegacy = LEGACY_NUMEROS.has(numero);
    const fila: FilaOla = {
      id: `${CFG.ingestBatch}:${CFG.instrumentoId}:${numero}`,
      coleccion: 'mayalex_normativos', materia: '03_FAMILIA', contenido, num_articulo: numero, fuente: FUENTE_CANONICA,
      metadata: {
        norm_id: CFG.normId, instrumento_id: CFG.instrumentoId, ingest_batch: CFG.ingestBatch, ola: CFG.ola, ordinal: i + 1, decreto: '76-84',
        gaceta_original: '24,394', fecha_gaceta_original: '1984-08-16',
        texto_origen: correcciones.includes('TEXTO_OFICIAL_GACETA') ? 'GACETA_33222_D35_2013' : 'PDF_CONSOLIDADO_CEDIJ_2023_SANEADO',
        edicion_fuente: EDICION_FUENTE, pdf_sha256: pdfSha, article_sha256: sha256(contenido), ubicacion: miUbicacion,
        constancias, correcciones_saneamiento: correcciones,
        ...(enLegacy ? { sustituye_id_legacy: `v2familia:mayalex_normativos:${numero}` } : {}),
        ...(clasificacion.vigencia === 'DEROGADO' ? { derogado_por: [...new Set(constancias.filter((c) => /DEROGACION_(TOTAL|DE_TITULO|GACETA)/.test(c.tipo)).flatMap((c) => c.decretos))].map((d) => `D.${d}`).join(', ') || 'edición CEDIJ' } : {}),
      },
      jurisdiccion: 'HN', fuente_tipo: 'codigo', instrumento_id: CFG.instrumentoId, num_articulo_norm: normalizarNumeroArticulo(numero),
      hash_contenido: sha256(contenido), ingest_batch: CFG.ingestBatch, clasificacion,
    };
    return { fila, constancias, correcciones, ubicacion: miUbicacion, cotejoGaceta, enLegacy, vigenteLegacy: enLegacy ? LEGACY_VIGENTES.has(numero) : null };
  });
  if (problemas.length) throw new Error(`integridad: ${problemas.length} problema(s)\n  ${problemas.slice(0, 120).join('\n  ')}`);
  return { articulos, notas, pdfSha };
}

/** Sin puntuación final en la edición CEDIJ, verificado en el PDF (arts. 22, 34, 35 y 271). */
export const SIN_CIERRE_VERIFICADOS = new Set<string>(['22', '34', '35', '271']);
export function problemasDeIntegridadCF(numero: string, contenido: string, soloDerogado: boolean): string[] {
  const p: string[] = [];
  if (contenido.length < (soloDerogado ? 7 : 15)) p.push(`contenido demasiado corto (${contenido.length})`);
  if (/^Art[ií]culo\s+\d/i.test(contenido)) p.push('encabezado residual');
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F�\r]|Ã[¡-¿]|Â[ -¿]/.test(contenido)) p.push('caracteres de control o mojibake');
  if (/CENTRO ELECTR|^\s*\d{1,3}\s*$|Diario Oficial La\s*$/m.test(contenido)) p.push('cabecera, folio o nota residual');
  if (/\n{3,}| {2,}/.test(contenido)) p.push('espaciado anómalo');
  if (!soloDerogado && !SIN_CIERRE_VERIFICADOS.has(numero) && !/[.;:)”"»]$/.test(contenido)) p.push(`termina sin puntuación de cierre: «${contenido.slice(-40)}»`);
  return p;
}

async function main(): Promise<void> {
  const { articulos, notas, pdfSha } = construirOla5();
  const filas = articulos.map((a) => a.fila);
  mkdirSync(SALIDA, { recursive: true });
  mkdirSync(EXPEDIENTE_DIR, { recursive: true });
  const nums = new Set(filas.map((f) => f.num_articulo));
  const legacy = {
    filas_legacy: LEGACY_NUMEROS.size,
    faltan_en_legacy: articulos.filter((a) => !a.enLegacy).map((a) => a.fila.num_articulo),
    legacy_sin_articulo_en_edicion: [...LEGACY_NUMEROS].filter((n) => !nums.has(n)),
    legacy_false_y_ola5_vigente: articulos.filter((a) => a.vigenteLegacy === false && a.fila.clasificacion.vigencia === 'VIGENTE').length,
    legacy_false_y_ola5_derogado: articulos.filter((a) => a.vigenteLegacy === false && a.fila.clasificacion.vigencia === 'DEROGADO').length,
    legacy_true_y_ola5_derogado: articulos.filter((a) => a.vigenteLegacy === true && a.fila.clasificacion.vigencia !== 'VIGENTE').map((a) => a.fila.num_articulo),
    legacy_solo_derogado_y_ola5: articulos.filter((a) => LEGACY_SOLO_DEROGADO.has(a.fila.num_articulo)).map((a) => `${a.fila.num_articulo}:${a.fila.clasificacion.vigencia}`),
  };
  const embeddings = process.argv.includes('--sin-embeddings') ? null : await embeddingsConCache(filas, join(SALIDA, 'embeddings_cache.jsonl'));
  writeFileSync(join(SALIDA, 'rows.jsonl'), filas.map((f) => JSON.stringify(f)).join('\n') + '\n');
  const manifiestoArt = {
    instrumento: CFG.normId, ingest_batch: CFG.ingestBatch, pdf_fuente: PDF_FUENTE.split('/').pop(), pdf_sha256: pdfSha,
    gaceta_d35: { ...GACETA_D35, art4_sha256: D35_ART4.sha, art5_sha256: D35_ART5.sha, art13_sha256: D35_ART13.sha },
    texto_sha256: sha256(filas.map((f) => `${f.num_articulo}\n${f.contenido}`).join('\n\n')), notas_al_pie: notas.length,
    conteos: contar(filas), legacy,
    articulos_detalle: articulos.map((a) => ({
      numero: a.fila.num_articulo, sha256: a.fila.hash_contenido, vigencia: a.fila.clasificacion.vigencia, rol: a.fila.clasificacion.rol ?? 'PRIMARY',
      motivo: a.fila.clasificacion.motivo, constancias: a.constancias.map((c) => ({ nota: c.nota, tipo: c.tipo, decretos: c.decretos })),
      correcciones: a.correcciones, en_legacy: a.enLegacy, vigente_legacy: a.vigenteLegacy, ...(a.cotejoGaceta !== null ? { cotejo_gaceta: Number(a.cotejoGaceta.toFixed(4)) } : {}),
    })),
  };
  writeFileSync(join(EXPEDIENTE_DIR, 'manifiesto_articulos.json'), JSON.stringify(manifiestoArt, null, 2) + '\n');
  writeFileSync(join(EXPEDIENTE_DIR, 'constancias.csv'), ['articulo,nota,tipo,decretos,texto',
    ...articulos.flatMap((a) => a.constancias.map((c) => [a.fila.num_articulo, c.nota ?? '*', c.tipo, c.decretos.join(' '), `"${c.texto.replace(/"/g, '""')}"`].join(',')))].join('\n') + '\n');
  const resumen = { conteos: contar(filas), notas: notas.length, legacy, texto_sha256: manifiestoArt.texto_sha256 };
  if (!embeddings) { console.log(JSON.stringify(resumen, null, 2)); console.log('--sin-embeddings: manifiesto y constancias generados; no el paquete SQL.'); return; }
  const { archivos, conteos } = escribirPaquete({ cfg: CFG, filas, embeddings, salida: SALIDA });
  escribirManifiestoYPs1({ cfg: CFG, salida: SALIDA, archivos, conteos, pliegoRel: `${EXPEDIENTE_DIR}/EXPEDIENTE_AUDITORIA_CF_OLA5.md`, raizRel: '../..',
    extra: { pdf_sha256: pdfSha, texto_sha256: manifiestoArt.texto_sha256, manifiesto_articulos_sha256: sha256(readFileSync(join(EXPEDIENTE_DIR, 'manifiesto_articulos.json'))) } });
  console.log(JSON.stringify({ ...resumen, archivos: archivos.map((a) => `${a.ruta} ${a.bytes}B ${a.sha256}`) }, null, 2));
}

if (process.argv[1]?.endsWith('ola5-cf.ts')) main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
