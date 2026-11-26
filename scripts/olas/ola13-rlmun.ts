/**
 * scripts/olas/ola13-rlmun.ts
 * OLA 13 · lote 3 — HN:REGLAMENTO_LEY_MUNICIPALIDADES: Reglamento General de la Ley de Municipalidades (Acuerdo Ejecutivo No. 018-93,
 * 1-feb-1993; publicado en La Gaceta del 18-feb-1993). Fuente: la misma edición AMHON (2011) del lote OLA13_LMUN_2009_01, págs. 112–221,
 * que trae el Reglamento DESPUÉS de la Ley.
 *
 * Separación de la Ley: el articulado empieza en «ARTÍCULO 1. El presente Reglamento tiene por objetivo…» (posterior al «Dado en la
 * ciudad de Tegucigalpa…» y a las firmas de la Ley) y termina en la firma «Rafael Leonardo Callejas» que sigue al art. 228. La Ley
 * encabeza sus artículos «ARTÍCULO N.-» y el Reglamento «ARTÍCULO N.», y el lote, el `instrumento_id` y el `norm_id` son propios.
 *
 * La edición no imprime reformas ni notas al pie en el Reglamento. Imprime 226 de 228 encabezados: no trae el del art. 26 (su texto
 * queda dentro del art. 25, tal como se imprime) y anota que el art. 219 «no aparece publicado en el Diario Oficial la Gaceta».
 * No hay legacy de este reglamento en producción.
 * Uso: npx tsx scripts/olas/ola13-rlmun.ts [--sin-embeddings]
 */
import type { ConfigOla } from './paquete-ola';
import { emitirOlaCedij, type ParamsCedij } from './cedij';
import { extraerColumnaAmhon, PARAMS as PARAMS_LMUN } from './ola13-lmun';

export const CFG: ConfigOla = {
  ola: 'OLA13', normId: 'HN:REGLAMENTO_LEY_MUNICIPALIDADES', instrumentoId: 'REGLAMENTO_LEY_MUNICIPALIDADES', ingestBatch: 'OLA13_RLMUN_1993_01',
  fechaCorte: '2026-11-26', adjudicacion: 'EXPEDIENTE_AUDITORIA_RLMUN_OLA13.md (D1–D8)',
};

/** Aviso editorial impreso en lugar del art. 219: no es texto del Reglamento; se retira y se somete al CLO como «no impreso». */
const NOTA_219 = /\n\nNOTA: El ARTÍCULO 219 no aparece publicado en\nel Diario Oficial la Gaceta\.\n/;

export const PARAMS: ParamsCedij = {
  cfg: CFG,
  pdf: PARAMS_LMUN.pdf,
  materia: '10_LEYES_REGLAMENTOS',
  fuenteCanonica: 'Reglamento General de la Ley de Municipalidades de Honduras (Acuerdo No. 018-93)',
  decreto: 'Acuerdo 018-93',
  edicionFuente: 'Edición de la Asociación de Municipios de Honduras (AMHON), «LEY DE MUNICIPALIDADES.pdf» (2011), págs. 112–221: Reglamento General de la Ley de Municipalidades (Acuerdo No. 018-93, La Gaceta del 18-feb-1993), sin reformas anotadas; separado de la Ley (lote OLA13_LMUN_2009_01).',
  extraerTexto: extraerColumnaAmhon,
  ruido: PARAMS_LMUN.ruido,
  sinNotas: true,
  inicio: /^ARTÍCULO 1\. El presente Reglamento tiene por/m,
  fin: /^\s*Rafael Leonardo Callejas\s*$/m,
  ultimoBase: 228, idLegacy: () => null, legacyDump: null,
  erratasCrudas: [{ de: NOTA_219, a: '\n', esperadas: 1 }],
  /**
   * Sin punto final en la edición. Se verificó en una extracción independiente de ancho completo (poppler `-layout`, normalizando los
   * espacios): en los 7 casos el texto sigue directamente con el encabezado del artículo siguiente.
   */
  sinCierre: new Set(['45', '112', '118', '121', '163', '170', '196']),
  /**
   * El único rótulo de estructura en minúsculas del Reglamento («TITULO II / CAPITULO I / De la Municipalidad», al final del art. 7) no lo
   * retira el filtro de mayúsculas. Los demás rótulos («DEL TERRITORIO», «DE LA POBLACION»…) van en mayúsculas.
   */
  estructura: /^(?:De la Municipalidad|T[IÍ]TULO\s+[IVXLC]+|CAP[IÍ]TULO\s+(?:[IVXLC]+|[ÚU]NICO))$/,
  noImpresos: {
    26: 'La edición AMHON no imprime el encabezado del art. 26: entre el art. 25 y el art. 27 el texto sigue sin corte («Son causales de suspensión: a)… d)…»), que queda dentro del art. 25 tal como se imprime; cotejo con La Gaceta del 18-feb-1993 pendiente (D1).',
    219: 'La edición AMHON anota en su lugar: «NOTA: El ARTÍCULO 219 no aparece publicado en el Diario Oficial la Gaceta». La nota se retiró del texto del art. 218.',
  },
  edicion: 'AMHON',
  motivoPrimary: 'edición AMHON del Acuerdo 018-93, sin reformas anotadas',
};
if (process.argv[1]?.endsWith('ola13-rlmun.ts')) {
  emitirOlaCedij({ ...PARAMS, salida: 'out/ola13-rlmun', expedienteDir: 'docs/corpus/fase2/2026-11-26-hn-rlmun-ola13', pliego: 'EXPEDIENTE_AUDITORIA_RLMUN_OLA13.md',
    sinEmbeddings: process.argv.includes('--sin-embeddings') })
    .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
}
