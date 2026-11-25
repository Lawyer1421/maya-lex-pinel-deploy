/**
 * scripts/olas/ola12-leyes.ts
 * OLA 12 — Leyes especiales prioritarias. Un paquete por instrumento (lote y pliego propios), con el constructor de `cedij.ts`:
 *   ljc   HN:LEY_JUSTICIA_CONSTITUCIONAL  (D.244-2003)  edición CEDIJ 2007; sustituye el legacy `v2ljc:mayalex_normativos:*` (124)
 *   loat  HN:LEY_ORGANIZACION_TRIBUNALES  (D.76 de 1906) edición CEDIJ 2007 «(ACTUALIZADA-07)»; sin legacy
 *   lp    HN:LEY_PROPIEDAD                (D.82-2004)    edición CSJ 2007; sin legacy; reformas 2009–2012 no integradas → CONTEXT
 * La Ley Especial contra el Lavado de Activos (D.144-2014) se arma desde La Gaceta 33,718 en `ola12-lavado.ts`. La Ley de Garantías
 * Mobiliarias (D.182-2009) queda fuera: solo hay escaneos sin texto (ver expediente de la OLA 12).
 * Uso: npx tsx scripts/olas/ola12-leyes.ts <ljc|loat|lp> [--sin-embeddings]
 */
import type { ConfigOla } from './paquete-ola';
import { emitirOlaCedij, type Constancia, type ParamsCedij } from './cedij';

const BASE = 'C:/Users/fredy/OneDrive';
const cfg = (ola: string, normId: string, ingestBatch: string, pliego: string, legacy?: ConfigOla['legacy']): ConfigOla => ({
  ola, normId, instrumentoId: normId.replace('HN:', ''), ingestBatch, fechaCorte: '2026-11-24', adjudicacion: `${pliego} (D1–D8)`, ...(legacy ? { legacy } : {}),
});

/** Ley de Propiedad: artículos reformados después de la edición (decretos escaneados, sin texto): CONTEXT vigente hasta integrar el texto. */
const REFORMAS_LP: Record<string, string[]> = { '53': ['150-2010'], '75': ['205-2012'], '77': ['109-2009', '205-2012'], '126': ['205-2012'], '140': ['150-2010'] };
const dictamenesLP: ParamsCedij['dictamenes'] = Object.fromEntries(Object.entries(REFORMAS_LP).map(([n, decs]) => [n, {
  clasificacion: { vigencia: 'VIGENTE', rol: 'CONTEXT', motivo: `CONTEXT vigente: reformado por ${decs.map((d) => `D.${d}`).join(' y ')} después de la edición de 2007; el texto de la reforma no está integrado (D5)` },
  constancia: { nota: null, tipo: 'REFORMA_TACITA', decretos: decs, texto: `Reformado por ${decs.map((d) => `el Decreto No. ${d}`).join(' y ')}, posterior a la edición de 2007 que se usa como fuente. Las copias locales del decreto son escaneos sin capa de texto, por lo que la reforma no está integrada: el texto que se muestra es el anterior. CONTEXT vigente hasta integrar el texto de La Gaceta.` } as Constancia,
}]));

export const INSTRUMENTOS: Record<string, ParamsCedij & { salida: string; expedienteDir: string; pliego: string }> = {
  ljc: {
    cfg: cfg('OLA12', 'HN:LEY_JUSTICIA_CONSTITUCIONAL', 'OLA12_LJC_2007_01', 'EXPEDIENTE_AUDITORIA_LJC_OLA12.md',
      { condicion: "b.metadata->>'norm_id' = 'HN_LEY_JUSTICIA_CONSTITUCIONAL' AND b.id LIKE 'v2ljc:mayalex_normativos:%'", esperadas: 124, descripcion: 'legacy HN_LEY_JUSTICIA_CONSTITUCIONAL (V2), ids v2ljc:mayalex_normativos:*' }),
    pdf: `${BASE}/Email attachments/Documentos/AMPARO RECURSOS/Ley-Sobre-Justicia-Constitucional.pdf`,
    materia: '00_CONSTITUCIONAL', fuenteCanonica: 'Ley sobre Justicia Constitucional de Honduras (Decreto No. 244-2003)', decreto: '244-2003',
    edicionFuente: 'Edición del CEDIJ (Poder Judicial), «Ley-Sobre-Justicia-Constitucional.pdf» (Acrobat PDFMaker 7.0, 18-oct-2007), sin notas al pie.',
    inicio: /^ARTÍCULO 1\.- OBJETO DE LA LEY/m, fin: /^\s*Dado en (?:la ciudad de )?Tegucigalpa/m,
    ultimoBase: 124, idLegacy: (n) => `v2ljc:mayalex_normativos:${n}`, legacyDump: 'out/ola12-ljc/legacy_prod.json',
    sinCierre: new Set(['46']), // verificado en el PDF
    salida: 'out/ola12-ljc', expedienteDir: 'docs/corpus/staging/2026-11-24-hn-ljc-ola12', pliego: 'EXPEDIENTE_AUDITORIA_LJC_OLA12.md',
  },
  loat: {
    cfg: cfg('OLA12', 'HN:LEY_ORGANIZACION_TRIBUNALES', 'OLA12_LOAT_2007_01', 'EXPEDIENTE_AUDITORIA_LOAT_OLA12.md'),
    pdf: `${BASE}/CODIGOS Y LEYES REGLAMENTOS ACUERDOS ETC/LEY DE ORGANIZACIÓN Y ATRIBUCIONES DE LOS TRIBUNALES (ACTUALIZADA-07).pdf`,
    materia: '09_JUDICIAL', fuenteCanonica: 'Ley de Organización y Atribuciones de los Tribunales de Honduras (Decreto No. 76 de 1906)', decreto: '76-1906',
    edicionFuente: 'Edición del CEDIJ (Poder Judicial), «LEY DE ORGANIZACIÓN Y ATRIBUCIONES DE LOS TRIBUNALES (ACTUALIZADA-07).pdf» (Acrobat PDFMaker 7.0, 10-dic-2007), con notas al pie y decretos de reforma anexos.',
    inicio: /^Artículo 1\.- La facultad de juzgar/m, fin: /^\s*Dado en Tegucigalpa, ocho de febrero de mil novecientos seis/m,
    ultimoBase: 264, idLegacy: () => null, legacyDump: null,
    notasInexistentes: [18],
    sinCierre: new Set(['43', '89', '250']), // verificado en el PDF
    // Notas 79–98: publicación de los decretos de reforma que la edición anexa después del articulado.
    notasFueraDelArticulado: Array.from({ length: 20 }, (_, k) => 79 + k),
    // Notas «33 1. Copiado…» y «34 1. Copiado…»: empiezan por un número, que la detección de notas no admite.
    erratasCrudas: [
      { de: /^( {0,2}3[34]) (1\. Copiado)/m, a: '$1 Numeral $2', esperadas: 2 },
      // Notas 66 y 70 con sangría de 12 y 5 espacios.
      { de: /^ {3,}(66Copiado|70 Artículos 250)/m, a: '$1', esperadas: 2 },
    ],
    // La edición imprime dos veces el primer párrafo del art. 33.
    erratas: [
      { impreso: 'Artículo 33.- Los Jueces de Paz desempeñarán también las funciones de Notarios\nPúblicos, con las mismas obligaciones y derechos de los Notarios.\n\nArtículo 33.-', correcto: 'Artículo 33.-' },
      // «Artículo 194. AL 217.58.»: rango del Título XIII (Ministerio Público) derogado por el art. 84 del D.228-93 (nota 58). Se expande
      // en una fila por artículo, para que 218 y siguientes no queden dentro del 194.
      { impreso: 'Artículo 194. AL 217.58.', correcto: ['Artículo 194.58 Derogado.', ...Array.from({ length: 23 }, (_, k) => `Artículo ${195 + k}. Derogado.`)].join('\n\n') },
    ],
    dictamenes: {
      ...Object.fromEntries(Array.from({ length: 23 }, (_, k) => [String(195 + k), {
        clasificacion: { vigencia: 'DEROGADO', rol: 'CONTEXT', motivo: 'DEROGADO por el art. 84 del D.228-93, Ley del Ministerio Público (nota 58 de la edición: «Artículos del 194 al 217»); cotejo con La Gaceta pendiente (D1)' },
        constancia: { nota: 58, tipo: 'DEROGACION_TOTAL', decretos: ['228-93'], texto: 'Referente al Título XIII del Ministerio Público, Artículos del 194 al 217 fueron derogados expresamente por la Ley del Ministerio Público, Artículo 84 del Decreto Número 228-93, de fecha 13 de diciembre de 1993, publicado en el Diario Oficial La Gaceta No. 27,241 del 6 de enero de 1994. (La edición imprime el rango en una sola línea: «Artículo 194. AL 217».)' } as Constancia,
      }])),
      // Propuesta D5: las notas de 233, 234 y 236 dicen que la Ley de Notariado de 1930 a la que remiten está derogada por el D.353-2005;
      // no dicen que estos artículos de la LOAT lo estén. Materia regulada hoy por el Código del Notariado (OLA 10): CONTEXT vigente.
      ...Object.fromEntries(['233', '234', '236'].map((n) => [n, {
        clasificacion: { vigencia: 'VIGENTE', rol: 'CONTEXT', motivo: 'CONTEXT vigente (propuesta D5): la nota de la edición remite a la Ley de Notariado de 1930, derogada por el Código del Notariado (D.353-2005), que regula hoy esta materia; la derogación de este artículo de la LOAT no consta' },
        constancia: { nota: null, tipo: 'REFORMA_TACITA', decretos: ['353-2005'], texto: 'La nota de la edición indica que la Ley de Notariado de 1930 (Decreto No. 162) a la que remite este artículo fue derogada por el Código del Notariado (Decreto No. 353-2005). La materia la regula hoy ese Código; no consta la derogación expresa de este artículo de la LOAT. CONTEXT vigente hasta dictamen del CLO.' } as Constancia,
      }])),
    },
    notasSinLlamada: { 9: '30' }, // la nota 9 («Articulo 30 párrafo segundo.- Reformado…») no tiene llamada impresa
    salida: 'out/ola12-loat', expedienteDir: 'docs/corpus/staging/2026-11-24-hn-loat-ola12', pliego: 'EXPEDIENTE_AUDITORIA_LOAT_OLA12.md',
  },
  lp: {
    cfg: cfg('OLA12', 'HN:LEY_PROPIEDAD', 'OLA12_LP_2007_01', 'EXPEDIENTE_AUDITORIA_LP_OLA12.md'),
    pdf: `${BASE}/CODIGOS Y LEYES REGLAMENTOS ACUERDOS ETC/Ley_de_la_Propiedad.pdf`,
    materia: '02_CIVIL', fuenteCanonica: 'Ley de Propiedad de Honduras (Decreto No. 82-2004)', decreto: '82-2004',
    edicionFuente: 'Edición de la Corte Suprema de Justicia «Ley_de_la_Propiedad.pdf» (GNU Ghostscript, 12-abr-2007), sin notas al pie.',
    inicio: /^\s*ARTÍCULO 1\.?-?/m, fin: /^\s*Dado en (?:la ciudad de )?Tegucigalpa/m,
    ultimoBase: 142, idLegacy: () => null, legacyDump: null, sinNotas: true,
    erratas: [{ impreso: 'ARTICLO 15.-', correcto: 'ARTICULO 15.-' }], dictamenes: dictamenesLP,
    sinCierre: new Set(['17', '142']), // verificado en el PDF; el 142 termina truncado en la edición («consignado en el Titulo»)
    salida: 'out/ola12-lp', expedienteDir: 'docs/corpus/staging/2026-11-24-hn-lp-ola12', pliego: 'EXPEDIENTE_AUDITORIA_LP_OLA12.md',
  },
};

if (process.argv[1]?.endsWith('ola12-leyes.ts')) {
  const p = INSTRUMENTOS[process.argv[2]];
  if (!p) { console.error(`instrumento desconocido: ${process.argv[2]} (ljc | loat | lp)`); process.exit(1); }
  emitirOlaCedij({ ...p, sinEmbeddings: process.argv.includes('--sin-embeddings') }).catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
}
