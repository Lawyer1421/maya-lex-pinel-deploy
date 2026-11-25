/**
 * scripts/olas/ola9-ctrib.ts
 * OLA 9 — HN:CODIGO_TRIBUTARIO (Decreto No. 170-2016). Fuente: edición consolidada «Codigo Tributario (2024).pdf» (Word 2019,
 * 2-sep-2024), con notas al pie (fe de erratas de La Gaceta y reformas). Sustituye el legacy `mayalex_normativos:tributario_2016_a*`
 * (215 filas, «Consolidado SAR corte 2019», sin norm_id).
 * Uso: npx tsx scripts/olas/ola9-ctrib.ts [--sin-embeddings]
 */
import type { ConfigOla } from './paquete-ola';
import { emitirOlaCedij, type ParamsCedij } from './cedij';

export const CFG: ConfigOla = {
  ola: 'OLA9', normId: 'HN:CODIGO_TRIBUTARIO', instrumentoId: 'CODIGO_TRIBUTARIO', ingestBatch: 'OLA9_CTRIB_2024_01', fechaCorte: '2026-11-24',
  adjudicacion: 'EXPEDIENTE_AUDITORIA_CTRIB_OLA9.md (D1–D8)',
  legacy: { condicion: "b.id LIKE 'mayalex_normativos:tributario_2016_a%'", esperadas: 215, descripcion: 'legacy Código Tributario (Consolidado SAR corte 2019), ids mayalex_normativos:tributario_2016_a*' },
};
export const PARAMS: ParamsCedij = {
  cfg: CFG,
  pdf: 'C:/Users/fredy/OneDrive/Email attachments/Documentos/CODIGOS/Codigo Tributario (2024).pdf',
  materia: '08_TRIBUTARIO', fuenteCanonica: 'Código Tributario de Honduras (Decreto No. 170-2016)', decreto: '170-2016',
  edicionFuente: 'Edición consolidada «Codigo Tributario (2024).pdf» (Word 2019, 2-sep-2024), con notas al pie de fe de erratas y reformas publicadas en La Gaceta.',
  inicio: /^ARTÍCULO 1\.- ÁMBITO DE APLICACIÓN/m, fin: /^\s*Dado en la ciudad de Tegucigalpa/m,
  ultimoBase: 215, idLegacy: (n) => `mayalex_normativos:tributario_2016_a${n}`,
  legacyDump: 'out/ola9-ctrib/legacy_prod.json',
  /** «CAPÍTULO ll» (dos eles minúsculas) por «CAPÍTULO II». */
  erratas: [{ impreso: 'CAPÍTULO ll', correcto: 'CAPÍTULO II' }],
  /**
   * Propuesta D5: el art. 167 tiene una interpretación auténtica (D.25-2017) que remite al art. 392-E del Código Penal de 1983 (derogado)
   * y su último párrafo fue derogado por el Código Penal de 2017 (Gaceta 34,940); la edición no marca qué párrafo es. CONTEXT vigente
   * hasta dictamen.
   */
  dictamenes: {
    '167': {
      clasificacion: { vigencia: 'VIGENTE', rol: 'CONTEXT', motivo: 'CONTEXT vigente (propuesta D5): interpretación auténtica (D.25-2017) que remite al art. 392-E del Código Penal de 1983, derogado; último párrafo derogado por el D.130-2017 sin que la edición indique cuál es' },
      constancia: { nota: null, tipo: 'REVISION_PENDIENTE_CLO', decretos: ['25-2017', '130-2017'], texto: 'Revisión pendiente: la nota de la edición anota la interpretación auténtica del D.25-2017, que remite al art. 392-E del Código Penal de 1983 (derogado por el D.130-2017), y la derogación del «último párrafo» por el Código Penal de 2017 (La Gaceta No. 34,940), sin indicar si el texto impreso ya lo excluye. CONTEXT vigente hasta dictamen del CLO.' },
    },
  },
};
if (process.argv[1]?.endsWith('ola9-ctrib.ts')) {
  emitirOlaCedij({ ...PARAMS, salida: 'out/ola9-ctrib', expedienteDir: 'docs/corpus/staging/2026-11-24-hn-ctrib-ola9', pliego: 'EXPEDIENTE_AUDITORIA_CTRIB_OLA9.md',
    sinEmbeddings: process.argv.includes('--sin-embeddings') })
    .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
}
