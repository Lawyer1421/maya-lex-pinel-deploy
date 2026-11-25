/**
 * scripts/olas/ola11-adop.ts
 * OLA 11 — HN:LEY_ADOPCIONES (Ley Especial de Adopciones, Decreto No. 102-2018, La Gaceta No. 34,841 del 10-ene-2019). Fuente: edición
 * oficial de la DINAF «Ley-Especial-de-Adopciones-DINAF.pdf» (primera edición, agosto de 2019), sin notas al pie. Es la misma fuente de
 * las 64 filas legacy `mayalex_normativos:adopciones_2018_a*` (scripts/ingesta-d102-2018.ts), que esta ola sustituye.
 * Uso: npx tsx scripts/olas/ola11-adop.ts [--sin-embeddings]
 */
import type { ConfigOla } from './paquete-ola';
import { emitirOlaCedij, type ParamsCedij } from './cedij';

export const CFG: ConfigOla = {
  ola: 'OLA11', normId: 'HN:LEY_ADOPCIONES', instrumentoId: 'LEY_ADOPCIONES', ingestBatch: 'OLA11_ADOP_2019_01', fechaCorte: '2026-11-24',
  adjudicacion: 'EXPEDIENTE_AUDITORIA_ADOP_OLA11.md (D1–D8)',
  legacy: { condicion: "b.id LIKE 'mayalex_normativos:adopciones_2018_a%'", esperadas: 64, descripcion: 'legacy Ley Especial de Adopciones (D.102-2018), ids mayalex_normativos:adopciones_2018_a*' },
};
export const PARAMS: ParamsCedij = {
  cfg: CFG,
  pdf: 'C:/Users/fredy/OneDrive/SISTEMA_LEGAL_PRINCIPAL/00_ARCHIVOS_VARIOS/Biblioteca_Personal/Ley-Especial-de-Adopciones-DINAF.pdf',
  materia: '06_FAMILIA', fuenteCanonica: 'Ley Especial de Adopciones de Honduras (Decreto No. 102-2018)', decreto: '102-2018',
  edicionFuente: 'Edición oficial de la DINAF (Dirección de Niñez, Adolescencia y Familia), primera edición, agosto de 2019; texto íntegro del Decreto No. 102-2018 (La Gaceta No. 34,841, 10-ene-2019).',
  inicio: /^\s*Art[ií]culo 1\.- Objeto de la Ley/m, fin: /^\s*Dado en la ciudad de Tegucigalpa/m,
  ultimoBase: 64, idLegacy: (n) => `mayalex_normativos:adopciones_2018_a${n}`,
  legacyDump: 'out/ola11-adop/legacy_prod.json',
  // Maquetación de libro: cabeceras de página «DINAF | 7» / «10 | Ley Especial de Adopciones», rótulos «Capítulo III …» / «Sección I …»
  // en minúsculas, y palabras partidas con guion al final de línea.
  ruido: /^\s*(DINAF \| \d+|\d+ \| Ley Especial de Adopciones)\s*$/,
  estructura: /^(Cap[ií]tulo [IVXL]+|Secci[oó]n [IVXL]+)\b/,
  deguionar: true,
  /** «(DINAF).» en línea propia (art. 58) se confundiría con un rótulo en mayúsculas: se une a su línea. */
  erratas: [{ impreso: 'Adolescencia y Familia\n(DINAF).', correcto: 'Adolescencia y Familia (DINAF).' }],
  /** Sin punto final en la edición, verificado en el PDF. */
  sinCierre: new Set(['10']),
};
if (process.argv[1]?.endsWith('ola11-adop.ts')) {
  emitirOlaCedij({ ...PARAMS, salida: 'out/ola11-adop', expedienteDir: 'docs/corpus/staging/2026-11-24-hn-adop-ola11', pliego: 'EXPEDIENTE_AUDITORIA_ADOP_OLA11.md',
    sinEmbeddings: process.argv.includes('--sin-embeddings') })
    .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
}
