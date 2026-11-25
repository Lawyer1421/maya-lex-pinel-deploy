/**
 * scripts/olas/ola10-not.ts
 * OLA 10 — HN:LEY_NOTARIADO (Código del Notariado, Decreto No. 353-2005, La Gaceta 30,904). Fuente: edición del CEDIJ (Poder Judicial)
 * «Codigo-del-Notariado.pdf», con 9 notas al pie del D.77-2006 (reformas de los arts. 11 y 27; derogación de los arts. 72, 73, 84 y 87 y
 * de incisos). La edición anexa el D.77-2006 tras el articulado; la nota 9 (publicación del D.77-2006) cae en ese anexo.
 * Sustituye el legacy `mayalex_normativos:codigo_notariado_2005_a*` (94). NO toca el Reglamento (PCSJ-17-2012) ni las filas del D.77-2006.
 * Uso: npx tsx scripts/olas/ola10-not.ts [--sin-embeddings]
 */
import type { ConfigOla } from './paquete-ola';
import { emitirOlaCedij, type ParamsCedij } from './cedij';

export const CFG: ConfigOla = {
  ola: 'OLA10', normId: 'HN:LEY_NOTARIADO', instrumentoId: 'LEY_NOTARIADO', ingestBatch: 'OLA10_NOT_2006_01', fechaCorte: '2026-11-24',
  adjudicacion: 'EXPEDIENTE_AUDITORIA_NOT_OLA10.md (D1–D8)',
  legacy: { condicion: "b.id LIKE 'mayalex_normativos:codigo_notariado_2005_a%'", esperadas: 94, descripcion: 'legacy Código del Notariado (D.353-2005), ids mayalex_normativos:codigo_notariado_2005_a*' },
};
export const PARAMS: ParamsCedij = {
  cfg: CFG,
  pdf: 'C:/Users/fredy/OneDrive/CODIGOS Y LEYES REGLAMENTOS ACUERDOS ETC/Codigo-del-Notariado.pdf',
  materia: '03_NOTARIAL', fuenteCanonica: 'Código del Notariado de Honduras (Decreto No. 353-2005)', decreto: '353-2005',
  edicionFuente: 'Edición del CEDIJ (Poder Judicial), «Codigo-del-Notariado.pdf», con notas al pie del D.77-2006 y el texto del D.77-2006 anexo.',
  inicio: /^ARTÍCULO 1\.- La organización y el funcionamiento/m, fin: /^\s*Dado en la ciudad de Tegucigalpa/m,
  ultimoBase: 94, idLegacy: (n) => `mayalex_normativos:codigo_notariado_2005_a${n}`,
  legacyDump: 'out/ola10-not/legacy_prod.json',
  notasFueraDelArticulado: [9],
  /** La edición escribe la letra «O» por el cero en cinco encabezados. */
  erratas: ['2', '3', '5', '6', '9'].map((d) => ({ impreso: `ARTÍCULO ${d}O.-`, correcto: `ARTÍCULO ${d}0.-` })).map((e) => (e.impreso === 'ARTÍCULO 3O.-' ? { impreso: 'ARTICULO 3O.-', correcto: 'ARTICULO 30.-' } : e)),
};
if (process.argv[1]?.endsWith('ola10-not.ts')) {
  emitirOlaCedij({ ...PARAMS, salida: 'out/ola10-not', expedienteDir: 'docs/corpus/staging/2026-11-24-hn-not-ola10', pliego: 'EXPEDIENTE_AUDITORIA_NOT_OLA10.md',
    sinEmbeddings: process.argv.includes('--sin-embeddings') })
    .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
}
