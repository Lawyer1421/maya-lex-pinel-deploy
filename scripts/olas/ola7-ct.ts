/**
 * scripts/olas/ola7-ct.ts
 * OLA 7 — HN:CODIGO_TRABAJO (Decreto No. 189 de 1959). Fuente: edición consolidada del CEDIJ «Codigo del Trabajo (mayo 2018).pdf»
 * (Word 2019, 23-oct-2023), con notas al pie que citan reformas, interpretaciones auténticas y derogaciones.
 * Sustituye el legacy `v2trabajo:mayalex_normativos:*` (870), extraído de la edición de 2003 («Código del trabajo y sus reformas.pdf»).
 * Uso: npx tsx scripts/olas/ola7-ct.ts [--sin-embeddings]
 */
import type { ConfigOla } from './paquete-ola';
import { emitirOlaCedij, type ParamsCedij } from './cedij';

export const CFG: ConfigOla = {
  ola: 'OLA7', normId: 'HN:CODIGO_TRABAJO', instrumentoId: 'CODIGO_TRABAJO', ingestBatch: 'OLA7_CT_2023_01', fechaCorte: '2026-11-24',
  adjudicacion: 'EXPEDIENTE_AUDITORIA_CT_OLA7.md (D1–D8)',
  legacy: {
    condicion: "b.metadata->>'norm_id' = 'HN_CODIGO_TRABAJO' AND b.id LIKE 'v2trabajo:mayalex_normativos:%'",
    esperadas: 870,
    descripcion: 'legacy HN_CODIGO_TRABAJO (V2, edición de 2003), ids v2trabajo:mayalex_normativos:*',
  },
};
export const PARAMS: ParamsCedij = {
  cfg: CFG,
  pdf: 'C:/Users/fredy/OneDrive/Email attachments/Documentos/CODIGOS/Codigo del Trabajo (mayo 2018).pdf',
  materia: '05_LABORAL', fuenteCanonica: 'Código del Trabajo de Honduras (Decreto No. 189 de 1959)', decreto: '189-1959',
  edicionFuente: 'Edición consolidada del CEDIJ (Poder Judicial), «Codigo del Trabajo (mayo 2018).pdf», Word 2019, 23-oct-2023; notas al pie con la cita de cada decreto.',
  inicio: /^Art[ií]culo 1\. El presente C[oó]digo regula/m, fin: /^\s*Dado en (?:la ciudad de|el Sal[oó]n)/m,
  ultimoBase: 875, idLegacy: (n) => `v2trabajo:mayalex_normativos:${n}`,
  legacyDump: 'out/ola7-ct/legacy_prod.json',
  /** Sin punto final en la edición, verificado en el PDF (32: «Párrafo tercero Derogado»; 454: tabla; 874: lista de decretos). */
  sinCierre: new Set(['32', '45', '353', '454', '492', '500', '784', '791', '874']),
};
if (process.argv[1]?.endsWith('ola7-ct.ts')) {
  emitirOlaCedij({ ...PARAMS, salida: 'out/ola7-ct', expedienteDir: 'docs/corpus/staging/2026-11-24-hn-ct-ola7', pliego: 'EXPEDIENTE_AUDITORIA_CT_OLA7.md',
    sinEmbeddings: process.argv.includes('--sin-embeddings') })
    .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
}
