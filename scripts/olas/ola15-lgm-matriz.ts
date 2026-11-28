/**
 * scripts/olas/ola15-lgm-matriz.ts
 * OLA 15 — Ley de Garantías Mobiliarias (D.182-2009): matriz de clasificación propuesta para la firma del CLO (D1–D4 + matriz).
 * Solo lee archivos locales; no escribe en ninguna base de datos ni genera SQL.
 *
 * Entradas:
 *   - docs/corpus/fase2/ocr/LGM_OLA15_articulado_cotejado.txt: texto D1 aprobado por el CLO (SHA-256 84effbdb…), una línea por artículo;
 *   - docs/corpus/fase2/2026-11-27-hn-lgm-ola15/art47_D50-2016.txt: texto del art. 47 reformado por el art. 10 del D.50-2016
 *     (La Gaceta 34,076), cotejado carácter por carácter contra la imagen (EXPEDIENTE §3).
 * Salidas (en la carpeta del expediente):
 *   - matriz_clasificacion.csv: 87 filas (86 artículos + la fila histórica del art. 47 de 2010), con la huella del texto que el paquete
 *     debe cargar en cada fila;
 *   - encabezados_cortados.csv: los encabezados de título y capítulo que el corte retira del final de cada artículo (regla §5.1 del
 *     reporte D1) y el texto verificado que el adaptador debe asignar como estructura;
 *   - constancias.csv.
 * El corte es determinista: si un artículo de la lista no termina en el encabezado esperado, o si queda un encabezado en mayúsculas
 * en algún artículo, el script se detiene.
 *
 * Uso: npx tsx scripts/olas/ola15-lgm-matriz.ts
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'docs/corpus/fase2/2026-11-27-hn-lgm-ola15';
const TEXTO_D1 = 'docs/corpus/fase2/ocr/LGM_OLA15_articulado_cotejado.txt';
export const SHA_D1 = '84effbdbe0855e103e606fea191989a6f656413648a64cd05e5992578ebfdba1';
const ART47_2016 = join(DIR, 'art47_D50-2016.txt');

export const INSTRUMENTO = 'LEY_GARANTIAS_MOBILIARIAS';
export const LOTE = 'OLA15_LGM_2016_01';

const sha256 = (x: string | Buffer): string => createHash('sha256').update(x).digest('hex');

/**
 * Encabezados al final de cada artículo (§5.1 del reporte D1), tal como los trae el texto aprobado (`aprobado`), y el encabezado
 * verificado contra la imagen que el adaptador asigna a los artículos siguientes (`verificado`). Dos difieren: art. 79 (los tres OCR
 * perdieron el «II») y art. 84 («|» final, mancha).
 */
export const ENCABEZADOS: ReadonlyArray<{ tras: number; aprobado: string; verificado: string; desde: number }> = [
  { tras: 1, aprobado: 'CAPÍTULO II SISTEMA UNITARIO DE GARANTÍAS SOBRE LOS BIENES MUEBLES', verificado: 'CAPÍTULO II · SISTEMA UNITARIO DE GARANTÍAS SOBRE LOS BIENES MUEBLES', desde: 2 },
  { tras: 2, aprobado: 'CAPÍTULO III BIENES GARANTIZADORES, OBLIGACIONES GARANTIZADAS Y DEFINICIONES', verificado: 'CAPÍTULO III · BIENES GARANTIZADORES, OBLIGACIONES GARANTIZADAS Y DEFINICIONES', desde: 3 },
  { tras: 5, aprobado: 'TÍTULO II CONSTITUCIÓN DE LAS GARANTÍAS MOBILIARIAS CAPÍTULO I CONSTITUCIÓN', verificado: 'TÍTULO II · CONSTITUCIÓN DE LAS GARANTÍAS MOBILIARIAS · CAPÍTULO I · CONSTITUCIÓN', desde: 6 },
  { tras: 15, aprobado: 'CAPÍTULO II DERECHOS Y OBLIGACIONES DE LAS PARTES', verificado: 'CAPÍTULO II · DERECHOS Y OBLIGACIONES DE LAS PARTES', desde: 16 },
  { tras: 17, aprobado: 'TÍTULO III PUBLICIDAD CAPÍTULO I REGLAS GENERALES', verificado: 'TÍTULO III · PUBLICIDAD · CAPÍTULO I · REGLAS GENERALES', desde: 18 },
  { tras: 19, aprobado: 'CAPÍTULO II CRÉDITOS', verificado: 'CAPÍTULO II · CRÉDITOS', desde: 20 },
  { tras: 29, aprobado: 'CAPÍTULO III OBLIGACIONES NO-DINERARIAS', verificado: 'CAPÍTULO III · OBLIGACIONES NO-DINERARIAS', desde: 30 },
  { tras: 31, aprobado: 'CAPÍTULO IV CRÉDITOS DOCUMENTARIOS O CARTAS DE CRÉDITO INTERNACIONAL', verificado: 'CAPÍTULO IV · CRÉDITOS DOCUMENTARIOS O CARTAS DE CRÉDITO INTERNACIONAL', desde: 32 },
  { tras: 32, aprobado: 'CAPÍTULO V TÍTULOS-VALORES Y TÍTULOS REPRESENTATIVOS DE MERCADERÍAS', verificado: 'CAPÍTULO V · TÍTULOS-VALORES Y TÍTULOS REPRESENTATIVOS DE MERCADERÍAS', desde: 33 },
  { tras: 35, aprobado: 'CAPÍTULO VI CONTROL POR UN TERCERO DEPOSITARIO', verificado: 'CAPÍTULO VI · CONTROL POR UN TERCERO DEPOSITARIO', desde: 36 },
  { tras: 37, aprobado: 'CAPÍTULO VII OTROS BIENES CORPORALES O INCORPORALES', verificado: 'CAPÍTULO VII · OTROS BIENES CORPORALES O INCORPORALES', desde: 38 },
  { tras: 39, aprobado: 'CAPÍTULO VIII CONVERSIÓN DE UNA GARANTÍA MOBILIARIA', verificado: 'CAPÍTULO VIII · CONVERSIÓN DE UNA GARANTÍA MOBILIARIA', desde: 40 },
  { tras: 40, aprobado: 'TÍTULO IV REGISTRO Y DISPOSICIONES RELACIONADAS CAPÍTULO I REGISTRO', verificado: 'TÍTULO IV · REGISTRO Y DISPOSICIONES RELACIONADAS · CAPÍTULO I · REGISTRO', desde: 41 },
  { tras: 49, aprobado: 'TÍTULO V REGLAS DE PRELACIÓN CAPÍTULO I PRELACIÓN', verificado: 'TÍTULO V · REGLAS DE PRELACIÓN · CAPÍTULO I · PRELACIÓN', desde: 50 },
  { tras: 54, aprobado: 'TÍTULO VI EJECUCIÓN CAPÍTULO I DISPOSICIONES GENERALES', verificado: 'TÍTULO VI · EJECUCIÓN · CAPÍTULO I · DISPOSICIONES GENERALES', desde: 55 },
  { tras: 71, aprobado: 'TÍTULO VII MANDATO IRREVOCABLE PARA CUMPLIR OBLIGACIONES CAPÍTULO I APLICACIÓN DEL MANDATO IRREVOCABLE', verificado: 'TÍTULO VII · MANDATO IRREVOCABLE PARA CUMPLIR OBLIGACIONES · CAPÍTULO I · APLICACIÓN DEL MANDATO IRREVOCABLE', desde: 72 },
  { tras: 74, aprobado: 'TÍTULO VIII MEDIOS ALTERNATIVOS PARA LA RESOLUCIÓN DE DISPUTAS Y SUBASTA DE BIENES CAPÍTULO I DISPOSICIONES GENERALES', verificado: 'TÍTULO VIII · MEDIOS ALTERNATIVOS PARA LA RESOLUCIÓN DE DISPUTAS Y SUBASTA DE BIENES · CAPÍTULO I · DISPOSICIONES GENERALES', desde: 75 },
  { tras: 77, aprobado: 'TÍTULO IX DISPOSICIONES FINALES CAPÍTULO I JURISDICCIÓN Y ACTIVOS EVENTUALES', verificado: 'TÍTULO IX · DISPOSICIONES FINALES · CAPÍTULO I · JURISDICCIÓN Y ACTIVOS EVENTUALES', desde: 78 },
  { tras: 79, aprobado: 'CAPÍTULO REGLAS TRANSITORIAS', verificado: 'CAPÍTULO II · REGLAS TRANSITORIAS', desde: 80 },
  { tras: 83, aprobado: 'CAPÍTULO III REFORMAS Y JERARQUÍA DE LA PRESENTE LEY', verificado: 'CAPÍTULO III · REFORMAS Y JERARQUÍA DE LA PRESENTE LEY', desde: 84 },
  { tras: 84, aprobado: 'TÍTULO X DISPOSICIONES TRANSITORIAS CAPÍTULO I REGLAMENTO Y ENTRADA EN VIGENCIA |', verificado: 'TÍTULO X · DISPOSICIONES TRANSITORIAS · CAPÍTULO I · REGLAMENTO Y ENTRADA EN VIGENCIA', desde: 85 },
];
/** Encabezado anterior al art. 1 (no está en el texto aprobado: el articulado empieza en «ARTÍCULO 1.-»). */
export const ENCABEZADO_INICIAL = 'TÍTULO I · ÁMBITO Y APLICACIÓN GENERAL · CAPÍTULO I · PROPÓSITO DE LA LEY';

/**
 * Fe de erratas del texto D1 aprobado (puntuación), halladas al construir esta matriz por el control de cierre de artículo y por un
 * barrido de «coma + mayúscula» / «punto + minúscula»; cada una se verificó en el escaneo CCIT. Se aplican tras el corte de
 * encabezados; el archivo aprobado (84effbdb…) no se modifica. Cada `de` debe casar exactamente una vez.
 */
export const FE_DE_ERRATAS: ReadonlyArray<{ articulo: number; de: RegExp; a: string; imagen: string }> = [
  { articulo: 17, de: /garantía mobiliaria$/u, a: 'garantía mobiliaria.', imagen: 'CCIT pág. 7 izq.: «d) Presente el formulario registral de terminación de la garantía mobiliaria.»' },
  { articulo: 26, de: /en su caso, Todo saldo/u, a: 'en su caso. Todo saldo', imagen: 'CCIT pág. 8 der.: «…al cesionario en su caso.» y punto y aparte «Todo saldo…»' },
  { articulo: 52, de: /constituido sobre ellos, El acreedor/u, a: 'constituido sobre ellos. El acreedor', imagen: 'CCIT pág. 13 izq.: «constituido sobre ellos. El acreedor garantizado puede autorizar»' },
  { articulo: 56, de: /serán irrecurribles,$/u, a: 'serán irrecurribles.', imagen: 'CCIT pág. 15 der.: «Los que ordenen la continuación del proceso de ejecución serán irrecurribles.»' },
];

/** Texto de cada artículo tras el corte del encabezado final y la fe de erratas. Falla si algo no casa exactamente. */
export function cortar(lineas: string[]): Map<number, string> {
  if (lineas.length !== 86) throw new Error(`se esperaban 86 artículos, hay ${lineas.length}`);
  const out = new Map<number, string>();
  lineas.forEach((l, k) => {
    const n = k + 1;
    if (!l.startsWith(`ARTÍCULO ${n}.`)) throw new Error(`la línea ${n} no empieza por «ARTÍCULO ${n}.»`);
    const e = ENCABEZADOS.find((x) => x.tras === n);
    let t = l;
    if (e) {
      if (!t.endsWith(` ${e.aprobado}`)) throw new Error(`art. ${n}: no termina en «${e.aprobado}»`);
      t = t.slice(0, -(e.aprobado.length + 1));
    }
    for (const f of FE_DE_ERRATAS.filter((x) => x.articulo === n)) {
      const veces = [...t.matchAll(new RegExp(f.de.source, 'gu'))].length;
      if (veces !== 1) throw new Error(`fe de erratas art. ${n}: «${f.de.source}» casa ${veces} veces`);
      t = t.replace(f.de, f.a);
    }
    if (!/[.;:”"]$/.test(t)) throw new Error(`art. ${n}: tras el corte no termina en signo de cierre: «…${t.slice(-40)}»`);
    // Ningún encabezado en mayúsculas debe quedar en el cuerpo: «TÍTULO/CAPÍTULO + número romano + epígrafe» (o el «CAPÍTULO REGLAS»
    // sin número del art. 79). Las menciones «el Título V de la presente Ley» van en minúsculas y el epígrafe del art. 9 («…COMO TÍTULO
    // EJECUTIVO») no lleva número romano.
    if (/(?:T[IÍ]TULO|CAP[IÍ]TULO)\s+(?:[IVX]+\s+[A-ZÁÉÍÓÚÑ]{4,}|REGLAS\s+TRANSITORIAS)/u.test(t)) throw new Error(`art. ${n}: queda un encabezado en el cuerpo`);
    out.set(n, t);
  });
  return out;
}

const csv = (filas: Array<Array<string | number | boolean | null>>): string =>
  filas.map((f) => f.map((v) => (v === null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))).join(',')).join('\n') + '\n';

if (process.argv[1]?.endsWith('ola15-lgm-matriz.ts')) {
  // La huella aprobada es la del archivo en LF (el blob versionado); en Windows la copia de trabajo puede venir en CRLF.
  const bruto = readFileSync(TEXTO_D1, 'utf8').replace(/\r\n/g, '\n');
  if (sha256(bruto) !== SHA_D1) throw new Error(`el texto D1 no es el aprobado: ${sha256(bruto)}`);
  const textos = cortar(bruto.replace(/\n$/, '').split('\n'));
  const art47nuevo = readFileSync(ART47_2016, 'utf8').replace(/\r\n/g, '\n').replace(/\n$/, '');
  const id = (n: string): string => `${LOTE}:${INSTRUMENTO}:${n}`;
  const FUENTE_2010 = 'D.182-2009, La Gaceta 32,125 (28-ene-2010); texto D1 cotejado';
  const C47_REFORMA = 'Reformado por el Artículo 10 del Decreto No. 50-2016 (Capítulo IV, Garantías Mobiliarias), publicado en La Gaceta No. 34,076 del 4 de julio de 2016, vigente desde su publicación (art. 12 del D.50-2016). Texto tomado de La Gaceta 34,076; sustituye al de 2010.';
  const C47_HIST = 'Texto original de 2010 (La Gaceta 32,125), sustituido por el Artículo 10 del Decreto No. 50-2016 (La Gaceta No. 34,076 del 4 de julio de 2016). Se conserva como antecedente; no es norma vigente.';
  const C83 = 'Norma de reforma: adiciona los numerales 2), 5), 7) y 8) del Artículo 28 de la Ley de Propiedad (D.82-2004). Su efecto en la Ley de Propiedad consta en la corrección C2 (fila OLA12_LP_2007_01:LEY_PROPIEDAD:28, CONTEXT vigente).';
  const filas: Array<Array<string | number | boolean | null>> = [['articulo', 'id_propuesto', 'num_articulo', 'num_articulo_norm', 'version', 'rol', 'vigencia', 'es_norma_vigente', 'fuente_texto', 'sha256_contenido', 'caracteres', 'constancia', 'encabezado_cortado_al_final']];
  const constancias: Array<Array<string | number | boolean | null>> = [['id_propuesto', 'tipo', 'decretos', 'texto']];
  for (const [n, t] of textos) {
    const e = ENCABEZADOS.find((x) => x.tras === n);
    if (n === 47) {
      filas.push([47, id('47'), '47', '47', 'D.50-2016 art. 10 (texto vigente)', 'PRIMARY', 'VIGENTE', true, 'D.50-2016, La Gaceta 34,076 (4-jul-2016); cotejo carácter por carácter con la imagen', sha256(art47nuevo), art47nuevo.length, 'REFORMA 50-2016', null]);
      constancias.push([id('47'), 'REFORMA', '50-2016', C47_REFORMA]);
      filas.push([47, id('47-TEXTO-2010'), '47', null, 'D.182-2009 (texto original, sustituido)', 'CONTEXT', 'DEROGADO', false, FUENTE_2010, sha256(t), t.length, 'SUSTITUCION 50-2016', e?.aprobado ?? null]);
      constancias.push([id('47-TEXTO-2010'), 'SUSTITUCION', '50-2016', C47_HIST]);
      continue;
    }
    filas.push([n, id(String(n)), String(n), String(n), 'D.182-2009 (texto 2010 cotejado)', 'PRIMARY', 'VIGENTE', true, FUENTE_2010, sha256(t), t.length, n === 83 ? 'NOTA norma de reforma' : null, e?.aprobado ?? null]);
    if (n === 83) constancias.push([id('83'), 'NOTA', '82-2004', C83]);
  }
  writeFileSync(join(DIR, 'matriz_clasificacion.csv'), csv(filas));
  writeFileSync(join(DIR, 'constancias.csv'), csv(constancias));
  writeFileSync(join(DIR, 'encabezados_cortados.csv'), csv([['tras_articulo', 'rige_desde_articulo', 'texto_en_el_aprobado', 'encabezado_verificado_imagen', 'difiere'],
    [0, 1, '(precede al art. 1; no está en el texto aprobado)', ENCABEZADO_INICIAL, 'n/a'],
    ...ENCABEZADOS.map((e) => [e.tras, e.desde, e.aprobado, e.verificado, e.aprobado.replace(/ · /g, ' ') !== e.verificado.replace(/ · /g, ' ') ? 'SÍ' : 'no'])]));
  const cuenta = (rol: string, vig: string) => filas.slice(1).filter((f) => f[5] === rol && f[6] === vig).length;
  console.log(`filas ${filas.length - 1}: PRIMARY vigentes ${cuenta('PRIMARY', 'VIGENTE')}, CONTEXT derogados ${cuenta('CONTEXT', 'DEROGADO')}; encabezados cortados ${ENCABEZADOS.length}`);
  console.log(`sha256 matriz ${sha256(readFileSync(join(DIR, 'matriz_clasificacion.csv')))}; art47 2016 ${sha256(art47nuevo)} (${art47nuevo.length} car.)`);
}
