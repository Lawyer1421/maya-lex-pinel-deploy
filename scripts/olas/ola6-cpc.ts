/**
 * scripts/olas/ola6-cpc.ts
 * OLA 6 — HN:CODIGO_PROCESAL_CIVIL (Decreto No. 211-2006). Fuente: edición consolidada del CEDIJ «Codigo Procesal Civil (2018).pdf»
 * (Word 2019, 29-feb-2024), con 3 notas al pie (D.21-2015 en los arts. 400 y 783; D.168-2009 en el art. 932).
 * Sustituye TRES capas de producción (ver expediente): el legacy `v2civil:mayalex_normativos:*` (932), su espejo idéntico
 * `v2civil:mayalex_procedimental:*` (932) y los fragmentos `mayalex_normativos:cpc_base_a*` (995). NO toca el comentario doctrinal
 * de Romero (`cpc_comentado_*`) ni la guía de plazos (`mayalex_procedimental:04_CPC_PLAZOS_*`).
 * Uso: npx tsx scripts/olas/ola6-cpc.ts [--sin-embeddings]
 */
import type { ConfigOla } from './paquete-ola';
import { emitirOlaCedij, type ParamsCedij } from './cedij';

export const CFG: ConfigOla = {
  ola: 'OLA6', normId: 'HN:CODIGO_PROCESAL_CIVIL', instrumentoId: 'CODIGO_PROCESAL_CIVIL', ingestBatch: 'OLA6_CPC_2024_01', fechaCorte: '2026-11-24',
  adjudicacion: 'EXPEDIENTE_AUDITORIA_CPC_OLA6.md (D1–D8)',
  legacy: {
    condicion: "((b.metadata->>'norm_id' = 'HN_CODIGO_PROCESAL_CIVIL' AND (b.id LIKE 'v2civil:mayalex_normativos:%' OR b.id LIKE 'v2civil:mayalex_procedimental:%')) OR b.id LIKE 'mayalex_normativos:cpc_base_a%')",
    esperadas: 2859,
    descripcion: 'legacy CPC en tres capas: v2civil normativos (932) + espejo procedimental (932) + fragmentos cpc_base (995); el comentario de Romero y la guía de plazos no se tocan',
  },
};
export const PARAMS: ParamsCedij = {
  cfg: CFG,
  pdf: 'C:/Users/fredy/OneDrive/Email attachments/Documentos/CODIGOS/Codigo Procesal Civil (2018).pdf',
  materia: '02_CIVIL', fuenteCanonica: 'Código Procesal Civil de Honduras (Decreto No. 211-2006)', decreto: '211-2006',
  edicionFuente: 'Edición consolidada del CEDIJ (Poder Judicial), «Codigo Procesal Civil (2018).pdf», Word 2019, 29-feb-2024; 3 notas al pie con la cita de cada decreto.',
  // La edición termina el articulado con el art. 932 y la línea de publicación (no trae «Dado en…»).
  inicio: /^Art[ií]culo 1\. DERECHO DE ACCESO/m, fin: /^Publicado en el diario oficial La Gaceta No\.31, ?313/m,
  ultimoBase: 932, idLegacy: (n) => `v2civil:mayalex_normativos:${n}`,
  legacyDump: 'out/ola6-cpc/legacy_prod.json',
  /** Arts. 40 (sumisión tácita) y 420 (promoción de la cuestión incidental): la edición no los imprime. */
  // Solo el art. 40: el 420 SÍ está en la edición, con encabezado en mayúsculas («ARTÍCULO 420.-»), que la versión firmada el
  // 2026-11-24 no reconocía (su texto quedaba pegado al art. 419). Corregido; el paquete requiere nueva firma.
  suplirDesdeLegacy: ['40'],
  /** Sin punto final en la edición, verificado en el PDF. */
  sinCierre: new Set(['5', '9', '571', '601', '826']),
};
if (process.argv[1]?.endsWith('ola6-cpc.ts')) {
  emitirOlaCedij({ ...PARAMS, salida: 'out/ola6-cpc', expedienteDir: 'docs/corpus/staging/2026-11-24-hn-cpc-ola6', pliego: 'EXPEDIENTE_AUDITORIA_CPC_OLA6.md',
    sinEmbeddings: process.argv.includes('--sin-embeddings') })
    .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
}
