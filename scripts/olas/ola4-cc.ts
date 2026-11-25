/**
 * scripts/olas/ola4-cc.ts
 * OLA 4 — HN:CODIGO_CIVIL (Decreto del Poder Ejecutivo del 8 de febrero de 1906).
 *
 * Fuentes, por jerarquía:
 *   1. La Gaceta 33,222 (D.35-2013), ya en producción V5 (lote A04): art. 14 = lista OFICIAL de artículos del Código Civil derogados;
 *      art. 6 = texto OFICIAL de los 11 artículos reformados (37, 234, 271, 434, 511, 516, 559, 960, 963, 972, 973). Se leen de la
 *      transcripción cotejada `A04_transcripcion_candidata_v8.txt` y se exige que su SHA-256 sea el de las filas V5 de producción.
 *   2. Edición consolidada del Poder Judicial «CodigoCivil(Actualizado2014).pdf» (43 notas al pie), vía el extractor validado
 *      scripts/ingesta-civil.ts — la MISMA fuente y segmentación de las 2,372 filas legacy de producción (huella agregada verificada).
 *   3. «CODIGO CIVIL (CON REFORMAS).pdf» (compilación CSJ, Word→PDF, sin notas): cotejo textual de control y texto de 1906 de los
 *      arts. 307 y 397, que la edición PJ imprime solo como «Derogado» aunque La Gaceta no los deroga.
 *
 * Hallazgos que corrige respecto del legacy: arts. 252–260 derogados por el art. 14 del D.35-2013 y mostrados como vigentes; arts. 307
 * y 397 mostrados como derogados por el D.35-2013 sin que ese decreto los liste. Nada llega a V4/V5 sin la firma D1–D8 del CLO.
 *
 * OFFLINE salvo el modelo de embeddings local. Uso: npx tsx scripts/olas/ola4-cc.ts [--sin-embeddings]
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ejecutarPipelineCompleto, PDF_FUENTE, FUENTE_CANONICA, EDICION_FUENTE, type NotaAlPie } from '../ingesta-civil';
import { normalizarNumeroArticulo } from '../../lib/legal-retrieval/clo-guards';
import { contar, escribirManifiestoYPs1, escribirPaquete, sha256, type Clasificacion, type ConfigOla, type FilaOla } from './paquete-ola';
import { decretosDe, embeddingsConCache, refluir } from './ola1-cpp';

export const CFG: ConfigOla = {
  ola: 'OLA4',
  normId: 'HN:CODIGO_CIVIL',
  instrumentoId: 'CODIGO_CIVIL',
  ingestBatch: 'OLA4_CC_2014_01',
  fechaCorte: '2026-11-24',
  adjudicacion: 'EXPEDIENTE_AUDITORIA_CC_OLA4.md (D1–D8)',
  legacy: {
    condicion: "b.metadata->>'norm_id' = 'HN_CODIGO_CIVIL_1906' AND b.id LIKE 'mayalex_normativos:cc_1906_a%'",
    esperadas: 2372,
    descripcion: 'carga legacy HN_CODIGO_CIVIL_1906 (edición PJ 2014), ids mayalex_normativos:cc_1906_a*',
  },
};
export const SALIDA = 'out/ola4-cc';
export const EXPEDIENTE_DIR = 'docs/corpus/staging/2026-11-24-hn-cc-ola4';
export const PDF_CSJ = 'C:/Users/fredy/OneDrive/CODIGOS Y LEYES REGLAMENTOS ACUERDOS ETC/CODIGO CIVIL (CON REFORMAS).pdf';
export const TRANSCRIPCION_D35 = 'docs/corpus/staging/2026-11-05-hn-001-a04-orientacion/transcripcion_candidata/A04_transcripcion_candidata_v8.txt';
/** Huellas de las filas V5 de producción del D.35-2013 (A04_D35_2013_01:DECRETO_35_2013:14 y :6), consultadas el 2026-11-24. */
export const D35_ART14 = { inicio: 'Derogar de forma expresa los Artículos', largo: 1695, sha: 'c6c97388c9d94e1411a31c017c5f5eb9028dc1ee38107b863aeadb672dca0a44' };
export const D35_ART6 = { inicio: 'Reformar los Artículos 37,234', largo: 4311, sha: '8fc55528a05816da0ed00185cea38625af60c4c9d6dadeb1be340fb9fb64efa2' };
/** Huella agregada del legacy de producción: sha256 de «id|hash_texto_sha256|es_norma_vigente» por fila, orden C, unidas por \n. */
export const HUELLA_LEGACY_PROD = 'f98288055d351e6d9f731a7c91ee3750f759b018786433af840db13b02dd76e6';
/**
 * Filas legacy cuyo contenido se retocó en producción después de la carga (solo espacios y saltos de línea; mismo texto), con la huella
 * vigente en producción (consulta del 2026-11-24). El extractor reproduce el resto byte a byte.
 */
export const LEGACY_CORREGIDO_EN_PROD: Record<string, string> = {
  '675': 'c919d9277ce4142a49bdd34d0a1e86cbbb9ae06486d7c1830f6d44ba4e911b01',
  '1280': '855d0c3b9d7d3adecdfacdcaf8ebe9b640bf7dd0295933f49fcf8f7b894c090c',
};
export const GACETA_D35 = { decreto: '35-2013', gaceta: '33,222', fecha: '2013-09-06' };

// ── La Gaceta (D.35-2013) ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function tramoVerificado(texto: string, t: { inicio: string; largo: number; sha: string }): string {
  for (let i = texto.indexOf(t.inicio); i !== -1; i = texto.indexOf(t.inicio, i + 1)) {
    const s = texto.slice(i, i + t.largo);
    if (sha256(s) === t.sha) return s;
  }
  throw new Error(`no se halló en ${TRANSCRIPCION_D35} el tramo «${t.inicio}» con la huella de producción ${t.sha}`);
}
export function leerD35(): { derogados: Set<number>; reformados: Map<string, string> } {
  const texto = readFileSync(TRANSCRIPCION_D35, 'utf8').replace(/\r\n/g, '\n');
  const a14 = tramoVerificado(texto, D35_ART14);
  const lista = a14.slice(D35_ART14.inicio.length, a14.indexOf('del CÓDIGO CIVIL'));
  const derogados = new Set([...lista.matchAll(/\d+/g)].map((m) => Number(m[0])));
  if (derogados.size !== 324) throw new Error(`art. 14 D.35-2013: ${derogados.size} artículos (esperados 324)`);
  const a6 = tramoVerificado(texto, D35_ART6);
  const reformados = new Map<string, string>();
  const partes = a6.split(/"?ARTÍCULO (\d+)\.-\s*/);
  for (let i = 1; i < partes.length; i += 2) reformados.set(partes[i], partes[i + 1].replace(/\n*CÓDIGO PENAL\s*$/, '').replace(/"\s*$/, '').trim());
  const esperados = ['37', '234', '271', '434', '511', '516', '559', '960', '963', '972', '973'];
  if ([...reformados.keys()].join() !== esperados.join()) throw new Error(`art. 6 D.35-2013: artículos ${[...reformados.keys()].join()}`);
  return { derogados, reformados };
}

/** Une las líneas de columna de La Gaceta; un salto de columna a mitad de oración (minúscula tras párrafo abierto) no abre párrafo. */
export function refluirGaceta(t: string): string {
  const parrafos = refluir(t).split('\n\n');
  const out: string[] = [];
  for (const p of parrafos) {
    if (out.length && !/[.:;]$/.test(out[out.length - 1]) && /^[a-záéíóúñ(]/.test(p)) out[out.length - 1] += ` ${p}`;
    else out.push(p);
  }
  return out.join('\n\n');
}

// ── Compilación CSJ «CON REFORMAS» (cotejo) ─────────────────────────────────────────────────────────────────────────────────────────────
export function leerCSJ(): { textos: Map<string, string>; pdfSha: string } {
  const crudo = execFileSync('pdftotext', ['-layout', '-enc', 'UTF-8', PDF_CSJ, '-'], { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }).replace(/\f/g, '\n');
  const cuerpo = crudo.slice(0, crudo.search(/^\s*REFORMAS\s*$/m));
  const lineas = cuerpo.split('\n').filter((l) => !/^\s*\d{1,3}\s*$/.test(l) && !/^\s*(CORTE SUPREMA DE JUSTICIA|República de Honduras, C\. A\.|Código Civil)\s*$/.test(l));
  const textos = new Map<string, string>();
  let actual: string | null = null;
  let buf: string[] = [];
  const cerrar = () => { if (actual && !textos.has(actual)) textos.set(actual, buf.join('\n')); };
  for (const l of lineas) {
    const m = /^\s*(?:ART[IÍ]CULO|Art[ií]culo)\s*[º°o]?\s*\.?\s*(\d+)\s*\.?-?\s*$/.exec(l);
    if (m) { cerrar(); actual = m[1]; buf = []; } else if (actual) buf.push(l);
  }
  cerrar();
  return { textos, pdfSha: sha256(readFileSync(PDF_CSJ)) };
}
/** Texto normalizado para cotejo: sin títulos/capítulos en mayúsculas, sin puntuación, minúsculas. */
export function normalizarCotejo(t: string): string[] {
  return t.split('\n').filter((l) => !(l.trim() === l.trim().toUpperCase() && /[A-ZÁÉÍÓÚÑ]{4}/.test(l))).join(' ')
    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9ñ]+/g, ' ').trim().split(' ').filter(Boolean);
}
export function dice(a: readonly string[], b: readonly string[]): number {
  if (!a.length && !b.length) return 1;
  const bigr = (x: readonly string[]) => { const m = new Map<string, number>(); for (let i = 0; i < x.length - 1; i++) { const k = `${x[i]} ${x[i + 1]}`; m.set(k, (m.get(k) ?? 0) + 1); } return m; };
  const A = bigr(a), B = bigr(b);
  let inter = 0, na = 0, nb = 0;
  for (const v of A.values()) na += v;
  for (const v of B.values()) nb += v;
  for (const [k, v] of A) inter += Math.min(v, B.get(k) ?? 0);
  return na + nb === 0 ? (a.join() === b.join() ? 1 : 0) : (2 * inter) / (na + nb);
}

// ── Notas al pie de la edición PJ 2014 → artículos (posiciones de llamada verificadas en el texto, ver expediente §3) ─────────────────
const rango = (a: number, b: number, excepto: number[] = []) => Array.from({ length: b - a + 1 }, (_, i) => a + i).filter((n) => !excepto.includes(n));
export const NOTA_ARTICULOS: Record<number, number[]> = {
  1: rango(21, 37), 2: [47, 48], 3: [68], 4: [78], 5: [79], 6: [84], 7: rango(94, 237), 8: [234], 9: rango(238, 247), 10: [249], 11: [262],
  12: [271], 13: rango(276, 409, [331, 343]), 14: rango(276, 409, [331, 343]), 15: [409], 16: [427], 17: [432, 433], 18: [434], 19: [511],
  20: rango(513, 515), 21: [516], 22: [517], 23: [553], 24: [559], 25: [619, 621], 26: [960], 27: [963], 28: rango(965, 970), 29: [972, 973],
  30: rango(1495, 1538), 31: rango(1495, 1538), 32: rango(1495, 1538), 33: rango(1495, 1538), 34: [1565], 35: [1787], 36: [2019, 2020],
  37: [2137], 38: [2141], 39: [2158], 40: [2307], 41: rango(2312, 2330), 42: [2322], 43: [2367],
};

export type TipoConstancia = 'REFORMA' | 'DEROGACION_TOTAL' | 'DEROGACION_PARCIAL' | 'REFERENCIA' | 'DEROGACION_GACETA_OMITIDA_EN_EDICION' | 'DEROGACION_NO_CONSTA_EN_GACETA' | 'TEXTO_OFICIAL_GACETA';
export interface Constancia { nota: number | null; tipo: TipoConstancia; texto: string; decretos: string[] }

export function tipificarNotaCC(texto: string, articulo: number): TipoConstancia {
  if (/V[ée]ase/.test(texto) && !/Reformad|Derogad/.test(texto.split(/V[ée]ase/)[0])) return 'REFERENCIA';
  if (articulo === 553 || articulo === 2141) return 'DEROGACION_PARCIAL';
  if (/Derogad/i.test(texto) && !(/Reformad/i.test(texto) && [37, 234].includes(articulo))) return 'DEROGACION_TOTAL';
  return 'REFORMA';
}
const decretosCC = (t: string) => [...new Set([...decretosDe(t), ...[...t.matchAll(/Decreto\s+(?:N[°o]\.?\s*)?(\d{1,3})\s+(?:del|de fecha|publicado)/gi)].map((m) => m[1])])];

// ── Integridad ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Sin punto final en la edición PJ 2014, verificado a mano: la compilación CSJ tampoco lo trae (salvo 639 y 1447, donde su texto difiere). */
export const SIN_CIERRE_VERIFICADOS = new Set<string>(['639', '644', '682', '710', '755', '976', '1036', '1069', '1077', '1136', '1235', '1388', '1394', '1431', '1447', '1456', '1603', '1608', '1684', '1725', '1748', '2124']);
export function problemasDeIntegridad(numero: string, contenido: string, soloDerogado: boolean): string[] {
  const p: string[] = [];
  if (contenido.length < (soloDerogado ? 7 : 15)) p.push(`contenido demasiado corto (${contenido.length})`);
  if (/^Art[ií]culo\s+\d/i.test(contenido)) p.push('encabezado residual');
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F�\r]|Ã[¡-¿]|Â[ -¿]/.test(contenido)) p.push('caracteres de control o mojibake');
  if (/^\s*\d{1,3}\s*$|www\.poderjudicial|P[áa]gina\s+\d+/m.test(contenido)) p.push('marca de página');
  if (/\n{3,}| {2,}/.test(contenido)) p.push('espaciado anómalo');
  if (soloDerogado && !/^Derogado\.?$/.test(contenido)) p.push(`derogado con texto inesperado: «${contenido.slice(0, 40)}»`);
  if (!soloDerogado && !SIN_CIERRE_VERIFICADOS.has(numero) && !/[.;:)”"»]$/.test(contenido)) p.push('termina sin puntuación de cierre');
  return p;
}

// ── Pipeline ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface ArticuloCC {
  fila: FilaOla; constancias: Constancia[]; correcciones: string[]; idLegacy: string; hashFuenteLegacy: string; vigenteLegacy: boolean;
  cotejoCSJ: number | null; cotejoGaceta: number | null;
}

const MOTIVO_EDICION = 'edición consolidada del Poder Judicial (2014) con reformas integradas; cotejo íntegro con La Gaceta pendiente (D1)';

export function construirOla4(): { articulos: ArticuloCC[]; notas: NotaAlPie[]; pdfSha: string; csjSha: string; huellaLegacy: string } {
  const pdfSha = sha256(readFileSync(PDF_FUENTE));
  const r = ejecutarPipelineCompleto();
  const d35 = leerD35();
  const { textos: csj, pdfSha: csjSha } = leerCSJ();

  // Huella del legacy (misma extracción que produjo las filas de producción).
  // Orden por id (collate "C"); los dos artículos corregidos a mano en producción entran con su huella de producción.
  const huellaLegacy = sha256([...r.registros].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((x) => `${x.id}|${LEGACY_CORREGIDO_EN_PROD[x.num_articulo] ?? x.metadata.hash_texto_sha256}|${x.es_norma_vigente}`).join('\n'));

  const notasPorArt = new Map<number, Constancia[]>();
  for (const n of r.notas) {
    const arts = NOTA_ARTICULOS[n.num];
    if (!arts) throw new Error(`nota ${n.num} sin asignación`);
    const texto = n.texto.replace(/^\d+\s*/, '').replace(/\s+/g, ' ').trim();
    for (const a of arts) {
      const previas = notasPorArt.get(a) ?? [];
      if (!previas.some((c) => c.texto === texto)) notasPorArt.set(a, [...previas, { nota: n.num, tipo: tipificarNotaCC(texto, a), texto, decretos: decretosCC(texto) }]);
    }
  }
  if (Object.keys(NOTA_ARTICULOS).length !== r.notas.length) throw new Error('tabla de notas y notas detectadas no coinciden');

  const problemas: string[] = [];
  const articulos = r.registros.map((reg, i): ArticuloCC => {
    const numero = reg.num_articulo;
    const n = Number(numero);
    // Variantes reales de la edición: «Artículo 126 Derogado», «Artículo 172.-», etc.
    const cab = new RegExp(`^Art[ií]culo\\s*${numero}(?!\\d)\\s*[.\\-]*\\s*`);
    if (!cab.test(reg.contenido)) { problemas.push(`art. ${numero}: sin encabezado ${JSON.stringify(reg.contenido.slice(0, 30))}`); }
    const correcciones: string[] = ['ENCABEZADO_RETIRADO'];
    let contenido = refluirGaceta(reg.contenido.replace(cab, '')).replace(/ {2,}/g, ' ').normalize('NFC');
    if (contenido !== reg.contenido.replace(cab, '').trim()) correcciones.push('REFLUJO_DE_LINEAS');
    // Epígrafe de la subdivisión SIGUIENTE pegado al final (p. ej. «II. REGLA RELATIVA A LAS PROFESIONES…»): no es texto del artículo.
    const epigrafeFinal = /\n\n(?:[IVX]+\.\s+)?[A-ZÁÉÍÓÚÑ ,]{8,}$/.exec(contenido);
    if (epigrafeFinal && epigrafeFinal[0].trim() === epigrafeFinal[0].trim().toUpperCase()) {
      contenido = contenido.slice(0, epigrafeFinal.index);
      correcciones.push('EPIGRAFE_SIGUIENTE_RETIRADO');
    }
    const constancias = (notasPorArt.get(n) ?? []).map((c) => ({ ...c }));
    const edicionDerogado = !reg.es_norma_vigente;
    const enGaceta = d35.derogados.has(n);
    const derogadoPorD35Edicion = edicionDerogado && /35-2013/.test(String(reg.metadata.derogado_por ?? ''));
    let clasificacion: Clasificacion;
    let cotejoGaceta: number | null = null;
    let soloDerogado = false;
    const textoCSJ = csj.get(numero) ?? null;

    if (enGaceta && !edicionDerogado) {
      constancias.push({ nota: null, tipo: 'DEROGACION_GACETA_OMITIDA_EN_EDICION', decretos: [GACETA_D35.decreto],
        texto: `Derogado expresamente por el art. 14 del Decreto No. 35-2013 (La Gaceta No. 33,222, 6 de septiembre de 2013). La edición del Poder Judicial (2014) no anota esta derogación y conserva el texto de 1906, que se mantiene aquí solo como antecedente para hechos anteriores.` });
      clasificacion = { vigencia: 'DEROGADO', rol: 'CONTEXT', motivo: 'DEROGADO por el art. 14 del D.35-2013 (Gaceta 33,222), omitido por la edición PJ 2014; texto de 1906 conservado como antecedente' };
    } else if (derogadoPorD35Edicion && !enGaceta) {
      if (!textoCSJ) throw new Error(`art. ${numero}: sin texto en la compilación CSJ`);
      contenido = refluir(textoCSJ.split('\n').filter((l) => !(l.trim() && l.trim() === l.trim().toUpperCase() && /[A-ZÁÉÍÓÚÑ]{4}/.test(l))).join('\n')).normalize('NFC');
      correcciones.push('TEXTO_1906_DE_COMPILACION_CSJ');
      constancias.push({ nota: null, tipo: 'DEROGACION_NO_CONSTA_EN_GACETA', decretos: [GACETA_D35.decreto],
        texto: `La edición del Poder Judicial (2014) lo imprime como «Derogado» por el D.35-2013 (notas 13 y 14: «Títulos XIV al XVII … excepto 331 y 343»), pero la lista expresa del art. 14 del D.35-2013 (La Gaceta No. 33,222) no incluye este artículo. Texto tomado de la compilación CSJ «Código Civil (con reformas)». Vigencia por dictamen del CLO.` });
      clasificacion = { vigencia: 'PENDIENTE', rol: 'CONTEXT', motivo: 'PENDIENTE_CLO: la edición PJ 2014 lo da por derogado (D.35-2013) pero el art. 14 del D.35-2013 (Gaceta 33,222) no lo lista (D5)' };
    } else if (edicionDerogado) {
      soloDerogado = true;
      const d = String(reg.metadata.derogado_por ?? '');
      const confirmado = enGaceta && d === 'D.35-2013';
      clasificacion = { vigencia: 'DEROGADO', rol: 'CONTEXT', motivo: confirmado ? 'DEROGADO por el art. 14 del D.35-2013 (Gaceta 33,222), confirmado contra la lista oficial' : `DEROGADO por ${d} según la nota de la edición PJ 2014; cotejo con La Gaceta pendiente (D1)` };
    } else if (d35.reformados.has(numero)) {
      const oficial = refluirGaceta(d35.reformados.get(numero)!).normalize('NFC');
      cotejoGaceta = dice(normalizarCotejo(oficial), normalizarCotejo(contenido));
      if (cotejoGaceta < 0.85) throw new Error(`art. ${numero}: el texto de la edición difiere del D.35-2013 oficial (Dice ${cotejoGaceta.toFixed(3)})`);
      if (oficial !== contenido) {
        correcciones.push('TEXTO_OFICIAL_GACETA');
        constancias.push({ nota: null, tipo: 'TEXTO_OFICIAL_GACETA', decretos: [GACETA_D35.decreto],
          texto: `Texto tomado del art. 6 del Decreto No. 35-2013 (La Gaceta No. 33,222), que coincide en sustancia con la edición del Poder Judicial (similitud ${cotejoGaceta.toFixed(3)}); sha256 del texto de la edición: ${sha256(contenido)}.` });
        contenido = oficial;
      }
      clasificacion = { vigencia: 'VIGENTE', rol: null, motivo: 'PRIMARY: texto oficial del art. 6 del D.35-2013 (Gaceta 33,222)' };
    } else {
      const tipos = new Set(constancias.map((c) => c.tipo));
      clasificacion = { vigencia: 'VIGENTE', rol: null, motivo: `PRIMARY elegible${tipos.has('DEROGACION_PARCIAL') ? ' (párrafo derogado anotado)' : tipos.has('REFORMA') ? ' (reforma integrada por la edición)' : ''}: ${MOTIVO_EDICION}` };
    }
    // Punto final omitido por la edición: se repone solo si la compilación CSJ trae el mismo final con punto.
    if (!soloDerogado && !/[.;:)”"»]$/.test(contenido) && textoCSJ) {
      const finCSJ = textoCSJ.trim().replace(/\s+/g, ' ');
      const ultimas = contenido.replace(/\s+/g, ' ').split(' ').slice(-4).join(' ');
      if (finCSJ.endsWith(`${ultimas}.`)) { contenido += '.'; correcciones.push('PUNTO_FINAL_SEGUN_CSJ'); }
    }
    for (const pr of problemasDeIntegridad(numero, contenido, soloDerogado)) problemas.push(`art. ${numero}: ${pr}`);
    const cotejoCSJ = textoCSJ && clasificacion.vigencia === 'VIGENTE' ? dice(normalizarCotejo(textoCSJ), normalizarCotejo(contenido)) : null;
    const fila: FilaOla = {
      id: `${CFG.ingestBatch}:${CFG.instrumentoId}:${numero}`,
      coleccion: 'mayalex_normativos', materia: '02_CIVIL', contenido, num_articulo: numero, fuente: FUENTE_CANONICA,
      metadata: {
        norm_id: CFG.normId, instrumento_id: CFG.instrumentoId, ingest_batch: CFG.ingestBatch, ola: CFG.ola, ordinal: i + 1,
        instrumento: reg.metadata.instrumento, decreto_habilitante_anc: reg.metadata.decreto_habilitante_anc,
        texto_origen: correcciones.includes('TEXTO_OFICIAL_GACETA') ? 'GACETA_33222_D35_2013' : correcciones.includes('TEXTO_1906_DE_COMPILACION_CSJ') ? 'COMPILACION_CSJ_1906' : 'PDF_CONSOLIDADO_PJ_2014_SANEADO',
        edicion_fuente: EDICION_FUENTE, pdf_sha256: pdfSha, fragmento_fuente_sha256: reg.metadata.hash_texto_sha256, article_sha256: sha256(contenido),
        constancias, correcciones_saneamiento: correcciones, sustituye_id_legacy: reg.id,
        ...(clasificacion.vigencia === 'DEROGADO' ? { derogado_por: enGaceta ? 'D.35-2013' : reg.metadata.derogado_por } : {}),
        ...(cotejoCSJ !== null ? { cotejo_compilacion_csj: Number(cotejoCSJ.toFixed(4)) } : {}),
      },
      jurisdiccion: 'HN', fuente_tipo: 'codigo', instrumento_id: CFG.instrumentoId, num_articulo_norm: normalizarNumeroArticulo(numero),
      hash_contenido: sha256(contenido), ingest_batch: CFG.ingestBatch, clasificacion,
    };
    return { fila, constancias, correcciones, idLegacy: reg.id, hashFuenteLegacy: String(reg.metadata.hash_texto_sha256), vigenteLegacy: reg.es_norma_vigente, cotejoCSJ, cotejoGaceta };
  });
  if (problemas.length) throw new Error(`integridad: ${problemas.length} problema(s)\n  ${problemas.slice(0, 80).join('\n  ')}`);
  return { articulos, notas: r.notas, pdfSha, csjSha, huellaLegacy };
}

async function main(): Promise<void> {
  const { articulos, notas, pdfSha, csjSha, huellaLegacy } = construirOla4();
  if (huellaLegacy !== HUELLA_LEGACY_PROD) throw new Error(`la extracción no reproduce el legacy de producción (${huellaLegacy})`);
  const filas = articulos.map((a) => a.fila);
  mkdirSync(SALIDA, { recursive: true });
  mkdirSync(EXPEDIENTE_DIR, { recursive: true });

  const cambiosVigencia = articulos.filter((a) => a.vigenteLegacy !== (a.fila.clasificacion.vigencia === 'VIGENTE'))
    .map((a) => ({ numero: a.fila.num_articulo, legacy: a.vigenteLegacy ? 'VIGENTE' : 'DEROGADO', ola4: a.fila.clasificacion.vigencia }));
  const cotejo = articulos.filter((a) => a.cotejoCSJ !== null);
  const bajo = cotejo.filter((a) => a.cotejoCSJ! < 0.9).map((a) => ({ numero: a.fila.num_articulo, dice: Number(a.cotejoCSJ!.toFixed(3)) }));
  const legacy = {
    filas_legacy: 2372, huella_agregada: huellaLegacy, reproduce_produccion: true,
    mismo_texto_fuente: articulos.filter((a) => !a.correcciones.some((c) => c.startsWith('TEXTO_'))).length,
    cambios_de_vigencia: cambiosVigencia,
  };
  const cotejoCSJ = {
    articulos_cotejados: cotejo.length, sin_texto_en_csj: articulos.filter((a) => a.fila.clasificacion.vigencia === 'VIGENTE' && a.cotejoCSJ === null).map((a) => a.fila.num_articulo),
    identicos: cotejo.filter((a) => a.cotejoCSJ === 1).length, desde_095: cotejo.filter((a) => a.cotejoCSJ! >= 0.95).length, bajo_090: bajo,
  };

  const embeddings = process.argv.includes('--sin-embeddings') ? null : await embeddingsConCache(filas, join(SALIDA, 'embeddings_cache.jsonl'));
  writeFileSync(join(SALIDA, 'rows.jsonl'), filas.map((f) => JSON.stringify(f)).join('\n') + '\n');
  const manifiestoArt = {
    instrumento: CFG.normId, ingest_batch: CFG.ingestBatch, pdf_fuente: PDF_FUENTE.split('/').pop(), pdf_sha256: pdfSha,
    pdf_cotejo_csj: PDF_CSJ.split('/').pop(), pdf_cotejo_csj_sha256: csjSha, gaceta_d35: { ...GACETA_D35, art14_sha256: D35_ART14.sha, art6_sha256: D35_ART6.sha },
    texto_sha256: sha256(filas.map((f) => `${f.num_articulo}\n${f.contenido}`).join('\n\n')), notas_al_pie: notas.length,
    conteos: contar(filas), legacy, cotejo_csj: cotejoCSJ,
    articulos_detalle: articulos.map((a) => ({
      numero: a.fila.num_articulo, sha256: a.fila.hash_contenido, vigencia: a.fila.clasificacion.vigencia, rol: a.fila.clasificacion.rol ?? 'PRIMARY',
      motivo: a.fila.clasificacion.motivo, constancias: a.constancias.map((c) => ({ nota: c.nota, tipo: c.tipo, decretos: c.decretos })),
      correcciones: a.correcciones, id_legacy: a.idLegacy, cotejo_csj: a.cotejoCSJ === null ? null : Number(a.cotejoCSJ.toFixed(4)),
      ...(a.cotejoGaceta !== null ? { cotejo_gaceta: Number(a.cotejoGaceta.toFixed(4)) } : {}),
    })),
  };
  writeFileSync(join(EXPEDIENTE_DIR, 'manifiesto_articulos.json'), JSON.stringify(manifiestoArt, null, 2) + '\n');
  writeFileSync(join(EXPEDIENTE_DIR, 'constancias.csv'), ['articulo,nota,tipo,decretos,texto',
    ...articulos.flatMap((a) => a.constancias.map((c) => [a.fila.num_articulo, c.nota ?? '*', c.tipo, c.decretos.join(' '), `"${c.texto.replace(/"/g, '""')}"`].join(',')))].join('\n') + '\n');

  const resumen = { conteos: contar(filas), cambios_de_vigencia: cambiosVigencia, cotejo_csj: { ...cotejoCSJ, bajo_090: bajo.length }, texto_sha256: manifiestoArt.texto_sha256 };
  if (!embeddings) { console.log(JSON.stringify(resumen, null, 2)); console.log('--sin-embeddings: manifiesto y constancias generados; no el paquete SQL.'); return; }
  const { archivos, conteos } = escribirPaquete({ cfg: CFG, filas, embeddings, salida: SALIDA });
  escribirManifiestoYPs1({ cfg: CFG, salida: SALIDA, archivos, conteos, pliegoRel: `${EXPEDIENTE_DIR}/EXPEDIENTE_AUDITORIA_CC_OLA4.md`, raizRel: '../..',
    extra: { pdf_sha256: pdfSha, texto_sha256: manifiestoArt.texto_sha256, manifiesto_articulos_sha256: sha256(readFileSync(join(EXPEDIENTE_DIR, 'manifiesto_articulos.json'))) } });
  console.log(JSON.stringify({ ...resumen, archivos: archivos.map((a) => `${a.ruta} ${a.bytes}B ${a.sha256}`) }, null, 2));
}

if (process.argv[1]?.endsWith('ola4-cc.ts')) main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
