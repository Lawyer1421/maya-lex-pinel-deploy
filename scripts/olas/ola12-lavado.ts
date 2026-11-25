/**
 * scripts/olas/ola12-lavado.ts
 * OLA 12 — HN:LEY_LAVADO_ACTIVOS: Ley Especial contra el Lavado de Activos (Decreto No. 144-2014), desde La Gaceta No. 33,718 del
 * 30-abr-2015 (PDF nativo «LEY-APNFDS-Y-LAVADO-DE-ACTIVOS-HONDURAS.pdf», págs. A.9–A.34). La Gaceta va a dos columnas: cada página
 * se extrae columna por columna recortando con `pdftotext` de poppler (columnas en x = 96–384 y 408–696 pt de una página de 792 pt).
 * Sin legacy en producción. Uso: npx tsx scripts/olas/ola12-lavado.ts [--sin-embeddings]
 */
import { execFileSync } from 'node:child_process';
import type { ConfigOla } from './paquete-ola';
import { emitirOlaCedij, type ParamsCedij } from './cedij';
import { esRuido } from './ola2-cp';

/** pdftotext de poppler (admite recorte -x/-y/-W/-H); el de xpdf de /mingw64 no recorta igual. */
export const POPPLER = 'C:/Users/fredy/AppData/Local/Microsoft/WinGet/Packages/oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe/poppler-25.07.0/Library/bin/pdftotext.exe';
/**
 * Páginas del PDF con el D.144-2014: la recopilación intercala otros documentos, así que el decreto (A.9–A.34 de La Gaceta, 26 págs.)
 * está en las págs. 9–22 (arts. 1–41) y 63–74 (arts. 42–91, «Dado en…» en la 74).
 */
export const PAGINAS: readonly number[] = [...Array.from({ length: 14 }, (_, k) => 9 + k), ...Array.from({ length: 12 }, (_, k) => 63 + k)];

export function extraerGaceta(pdf: string): string {
  const salida: string[] = [];
  for (const pag of PAGINAS) {
    for (const x of [0, 396]) {
      const t = execFileSync(POPPLER, ['-layout', '-f', String(pag), '-l', String(pag), '-x', String(x), '-y', '0', '-W', '396', '-H', '1224', '-enc', 'UTF-8', pdf, '-'], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
      salida.push(...t.replace(/\r\n?/g, '\n').replace(/\f/g, '').split('\n').filter((l) => !esRuido(l.trim()) && !/^\s*(A\.\s+\d{1,3}|\d{1,3}\s+A\.)\s*$/.test(l)));
    }
  }
  return salida.join('\n');
}

export const CFG: ConfigOla = {
  ola: 'OLA12', normId: 'HN:LEY_LAVADO_ACTIVOS', instrumentoId: 'LEY_LAVADO_ACTIVOS', ingestBatch: 'OLA12_LA_2015_01', fechaCorte: '2026-11-24',
  adjudicacion: 'EXPEDIENTE_AUDITORIA_LA_OLA12.md (D1–D8)',
};
export const PARAMS: ParamsCedij = {
  cfg: CFG,
  pdf: 'C:/Users/fredy/OneDrive/COSAS FREDY 2021/MANUAL PREV. LAVADO DE ACTIVOS/LEY-APNFDS-Y-LAVADO-DE-ACTIVOS-HONDURAS.pdf',
  materia: '01_PENAL', fuenteCanonica: 'Ley Especial contra el Lavado de Activos de Honduras (Decreto No. 144-2014)', decreto: '144-2014',
  edicionFuente: 'La Gaceta No. 33,718 del 30 de abril de 2015 (PDF nativo, recopilación «LEY-APNFDS-Y-LAVADO-DE-ACTIVOS-HONDURAS.pdf», págs. 9–22 y 63–74), Sección A, págs. A.9–A.34: Decreto No. 144-2014, extraído columna por columna.',
  extraerTexto: extraerGaceta, sinNotas: true,
  inicio: /^\s*ARTÍCULO 1\.- FINALIDAD/m, fin: /^\s*Dado en la ciudad de Tegucigalpa, municipio del Distrito/m,
  ultimoBase: 93, idLegacy: () => null, legacyDump: null,
};
if (process.argv[1]?.endsWith('ola12-lavado.ts')) {
  emitirOlaCedij({ ...PARAMS, salida: 'out/ola12-la', expedienteDir: 'docs/corpus/staging/2026-11-24-hn-la-ola12', pliego: 'EXPEDIENTE_AUDITORIA_LA_OLA12.md',
    sinEmbeddings: process.argv.includes('--sin-embeddings') })
    .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
}
