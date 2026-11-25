/**
 * scripts/olas/ola3-con.ts
 * OLA 3 — HN:CONSTITUCION_REPUBLICA (Decreto No. 131 de 1982, La Gaceta No. 23,612 del 20-ene-1982). Fuente: edición consolidada
 * «Constitucion de la Republica (actualizada noviembre 2021).pdf» (Word 2019, 19-may-2023), con notas al pie de reformas,
 * interpretaciones, adiciones y derogaciones hasta el D.200-2018. Sustituye el legacy `mayalex_normativos:constitucion_1982_a*`
 * (378 filas, «Consolidado TSC corte 2004»).
 * Uso: npx tsx scripts/olas/ola3-con.ts [--sin-embeddings]
 */
import type { ConfigOla } from './paquete-ola';
import { emitirOlaCedij, type ParamsCedij } from './cedij';

export const CFG: ConfigOla = {
  ola: 'OLA3', normId: 'HN:CONSTITUCION_REPUBLICA', instrumentoId: 'CONSTITUCION_REPUBLICA', ingestBatch: 'OLA3_CON_2021_01', fechaCorte: '2026-11-24',
  adjudicacion: 'EXPEDIENTE_AUDITORIA_CON_OLA3.md (D1–D8)',
  legacy: { condicion: "b.id LIKE 'mayalex_normativos:constitucion_1982_a%'", esperadas: 378, descripcion: 'legacy Constitución (Consolidado TSC corte 2004), ids mayalex_normativos:constitucion_1982_a*' },
};
export const PARAMS: ParamsCedij = {
  cfg: CFG,
  pdf: 'C:/Users/fredy/OneDrive/SISTEMA_LEGAL_PRINCIPAL/02_EJERCICIO_LEGAL/05_LEYES_Y_CODIGOS/Constitucion de la Republica (actualizada noviembre 2021).pdf',
  materia: '00_CONSTITUCIONAL', fuenteCanonica: 'Constitución de la República de Honduras (Decreto No. 131 de 1982)', decreto: '131-1982',
  edicionFuente: 'Edición consolidada «Constitucion de la Republica (actualizada noviembre 2021).pdf» (Word 2019, 19-may-2023), con notas al pie de cada reforma, interpretación, adición y derogación.',
  inicio: /^\s*ARTICULO 1\. Honduras es un Estado de derecho/m, fin: /^\s*Dado en el Salón de Sesiones de la Asamblea Nacional Constituyente/m,
  ultimoBase: 379, idLegacy: (n) => `mayalex_normativos:constitucion_1982_a${n}`, legacyDump: 'out/ola3-con/legacy_prod.json',
  /** Sin punto final en la edición, verificado en el PDF; el 200 son numerales «Derogado». */
  sinCierre: new Set(['116', '154', '200', '244', '271']),
  /** La nota 120 repite el texto de la 119 («Artículo 373. Interpretado…») pero su llamada está en el art. 374. */
  notasNombreErrado: [120],
  erratas: [
    // «PUBLIQUESE".» en renglón propio se confundiría con un rótulo en mayúsculas y se perdería.
    { impreso: '“POR TANTO\nPUBLIQUESE".', correcto: '“POR TANTO PUBLIQUESE".' },
    // Voladito «55» repetido al final del art. 246 (la nota 55 anota el art. 217, donde ya se resolvió su llamada).
    { impreso: 'Consejo de Ministros.55', correcto: 'Consejo de Ministros.' },
  ],
  dictamenes: {
    '200': {
      clasificacion: { vigencia: 'DEROGADO', rol: 'CONTEXT', motivo: 'DEROGADO: la edición imprime el artículo y sus numerales 1 a 5 como «Derogado» (nota 38: D.175-2003); cotejo con La Gaceta pendiente (D1)' },
    },
  },
};
if (process.argv[1]?.endsWith('ola3-con.ts')) {
  emitirOlaCedij({ ...PARAMS, salida: 'out/ola3-con', expedienteDir: 'docs/corpus/staging/2026-11-24-hn-con-ola3', pliego: 'EXPEDIENTE_AUDITORIA_CON_OLA3.md',
    sinEmbeddings: process.argv.includes('--sin-embeddings') })
    .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
}
