/**
 * scripts/olas/ola13-lmun.ts
 * OLA 13 · lote 2 — HN:LEY_MUNICIPALIDADES (Decreto No. 134-90). Fuente: edición de la Asociación de Municipios de Honduras (AMHON),
 * «LEY DE MUNICIPALIDADES.pdf» (Adobe Acrobat 9, 26-oct-2011), con reformas integradas hasta el D.143-2009, marcadas en línea
 * («(Según reforma por Decreto 48-91)», «(Adicionado por Decreto 127-2000)») y 16 notas al pie.
 * El PDF trae a continuación el Reglamento General (Acuerdo No. 018-93), que NO forma parte de este lote: el articulado se corta en
 * «Dado en la ciudad de Tegucigalpa» y el Reglamento queda inventariado aparte como OLA13_RLMUN.
 * La edición imprime títulos de margen a la derecha («OBJETO DE LA LEY»); se extrae solo la columna del texto (x 0–430 pt).
 * No hay legacy de esta ley en producción.
 * Uso: npx tsx scripts/olas/ola13-lmun.ts [--sin-embeddings]
 */
import { execFileSync } from 'node:child_process';
import type { ConfigOla } from './paquete-ola';
import { emitirOlaCedij, type ParamsCedij } from './cedij';

export const CFG: ConfigOla = {
  ola: 'OLA13', normId: 'HN:LEY_MUNICIPALIDADES', instrumentoId: 'LEY_MUNICIPALIDADES', ingestBatch: 'OLA13_LMUN_2009_01',
  fechaCorte: '2026-11-25', adjudicacion: 'EXPEDIENTE_AUDITORIA_LMUN_OLA13.md (D1–D8)',
};

/** Poppler 25.07 fijado por ruta (como en la OLA 12 LA): xpdf 4.06 no recorta por coordenadas. */
const POPPLER_PDFTOTEXT = process.env.OLAS_POPPLER_PDFTOTEXT
  ?? 'C:/Users/fredy/AppData/Local/Microsoft/WinGet/Packages/oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe/poppler-25.07.0/Library/bin/pdftotext.exe';

const entidades = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'").replace(/&amp;/g, '&');

/**
 * Texto sin los títulos de margen. Con `-bbox-layout`, poppler agrupa el texto en bloques con coordenadas: el cuerpo y las notas al pie
 * empiezan en x≈143 pt y los títulos de margen en x≈439 pt («OBJETO DE LA LEY»). Se descartan los bloques que empiezan en x ≥ 430 pt
 * (también el número de página, en x≈435 pt). Recortar la página a 430 pt no sirve: las notas al pie ocupan todo el ancho y se cortarían.
 * Cada página termina en salto de página (\f), que `extraer` usa para delimitar las notas.
 */
export function extraerColumnaAmhon(pdf: string): string {
  const html = execFileSync(POPPLER_PDFTOTEXT, ['-bbox-layout', '-enc', 'UTF-8', pdf, '-'], { encoding: 'utf8', maxBuffer: 200 * 1024 * 1024 });
  const paginas = html.split(/<page\b/).slice(1);
  return paginas.map((pag) => {
    // 1) Palabras de los bloques que no son margen ni cabecera. Los bloques solo sirven para descartar: poppler parte en bloques las
    //    líneas justificadas con mucho espacio («acciones   legales   que   en   derecho») y los ordena mal, así que las líneas se
    //    reconstruyen por coordenadas.
    const palabras: Array<{ x0: number; y0: number; y1: number; t: string }> = [];
    for (const b of pag.matchAll(/<block xMin="([\d.]+)" yMin="([\d.]+)"[^>]*>([\s\S]*?)<\/block>/g)) {
      // Títulos de margen (x ≥ 430 pt) y cabecera de página «Ley De Municipalidades N» (y < 55 pt; desde la pág. 100 el número
      // de página cae dentro de la columna del texto).
      if (Number(b[1]) >= 430 || Number(b[2]) < 55) continue;
      for (const w of b[3].matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="[\d.]+" yMax="([\d.]+)">([^<]*)<\/word>/g)) {
        palabras.push({ x0: Number(w[1]), y0: Number(w[2]), y1: Number(w[3]), t: entidades(w[4]) });
      }
    }
    // 2) Líneas: una palabra pertenece a la línea cuyo rango vertical contiene su centro (así el voladito cae en su línea).
    palabras.sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
    const lineas: Array<{ y0: number; y1: number; ws: typeof palabras }> = [];
    for (const w of palabras) {
      const c = (w.y0 + w.y1) / 2;
      const l = lineas.find((x) => c >= x.y0 - 0.5 && c <= x.y1 + 0.5);
      if (l) { l.ws.push(w); l.y0 = Math.min(l.y0, w.y0); l.y1 = Math.max(l.y1, w.y1); } else lineas.push({ y0: w.y0, y1: w.y1, ws: [w] });
    }
    lineas.sort((a, b) => a.y0 - b.y0);
    // 3) Texto: palabras por x; llamada en voladito (dígitos más bajos que la línea) y puntuación suelta, pegadas a la anterior;
    //    párrafo nuevo cuando el espacio vertical supera media línea.
    const alturas = lineas.map((l) => l.y1 - l.y0).sort((a, b) => a - b);
    const altoLinea = alturas[Math.floor(alturas.length / 2)] ?? 12;
    let texto = '';
    let yPrev: number | null = null;
    for (const l of lineas) {
      l.ws.sort((a, b) => a.x0 - b.x0);
      const altos = l.ws.map((w) => w.y1 - w.y0).sort((a, b) => a - b);
      const mediana = altos[Math.floor(altos.length / 2)];
      let s = '';
      l.ws.forEach((w, k) => {
        const pegada = k > 0 && ((/^\d{1,2}$/.test(w.t) && w.y1 - w.y0 < 0.85 * mediana) || /^[.,;:)]+$/.test(w.t));
        s += (k === 0 || pegada ? '' : ' ') + w.t;
      });
      if (yPrev !== null) texto += l.y0 - yPrev > 0.5 * altoLinea ? '\n\n' : '\n';
      texto += s;
      yPrev = l.y1;
    }
    return texto;
  }).join('\n\f')
    // Encabezado partido por la justificación del texto («ARTÍCULO» / «25.-»).
    .replace(/^(ART[IÍ]CULO)\n(?=\d{1,3}(?:-[A-Z])?\.-)/gm, '$1 ');
}

export const PARAMS: ParamsCedij = {
  cfg: CFG,
  pdf: 'C:/Users/fredy/OneDrive/SISTEMA_LEGAL_PRINCIPAL/02_EJERCICIO_LEGAL/05_LEYES_Y_CODIGOS/LEY DE MUNICIPALIDADES.pdf',
  materia: '10_LEYES_REGLAMENTOS', fuenteCanonica: 'Ley de Municipalidades de Honduras (Decreto No. 134-90)', decreto: '134-90',
  edicionFuente: 'Edición de la Asociación de Municipios de Honduras (AMHON), «LEY DE MUNICIPALIDADES.pdf» (2011), con reformas integradas hasta el D.143-2009 marcadas en línea y 16 notas al pie; sin el Reglamento General (Acuerdo 018-93).',
  extraerTexto: extraerColumnaAmhon,
  ruido: /^\s*(Ley De Municipalidades\s*\d*|Asociación de Municipios de Honduras)\s*$/,
  inicio: /^ARTÍCULO 1\.- \(Según reforma por Decreto 48-/m, fin: /^\s*Dado en la ciudad de Tegucigalpa/m,
  ultimoBase: 129, idLegacy: () => null, legacyDump: null,
  /** Sin punto final en la edición (verificado en el PDF: «…cumplimiento de dichas disposiciones» y la nota 4). */
  sinCierre: new Set(['44']),
  marcasEnLinea: /\((?:Según reforma|Adicionado|Derogado|Interpretado|Reformado)[^()]*\)/g,
  // El título de margen «PEAJE» (pág. 83) queda a la altura de un renglón de la nota 13 y entra en su bloque. Es el único: se
  // listaron todas las palabras en mayúsculas con x ≥ 430 pt conservadas en las págs. de la ley.
  erratasCrudas: [
    { de: /Interpretar PEAJE\nel artículo 85/, a: 'Interpretar\nel artículo 85', esperadas: 1 },
    // La nota 8 (D.124-95) sigue en la pág. 74, al pie y sin número, antes de las notas 9 y 10: sin esto su continuación caería dentro
    // del art. 76, a mitad de frase («…registrado o declarado en los [No deberán efectuar…] municipios con 75.000…»).
    { de: /reclamar las\ndevoluciones correspondientes\.\n/, a: 'reclamar las\ndevoluciones correspondientes. No deberán efectuar ningún pago quienes se encuentren comprendidos en los rangos de excepciones del Artículo 76 reformado, de la Ley de Municipalidades.\n', esperadas: 1 },
    { de: /\n\nNo deberán efectuar ningún pago quienes se encuentren comprendidos en\nlos rangos de excepciones del Artículo 76 reformado, de la Ley de\nMunicipalidades\.\n/, a: '\n', esperadas: 1 },
  ],
  edicion: 'AMHON',
  erratas: [
    // Llamadas dentro del paréntesis de la marca («(Interpretado7)»): se sacan del paréntesis; la marca pasa a constancia.
    ...[7, 11, 13].map((n) => ({ impreso: `(Interpretado${n})`, correcto: `(Interpretado)${n}`, nota: n })),
    // Art. 127: la edición encierra todo el texto derogado en un paréntesis que abre con la marca («(Derogado por Decreto 48-91. El
    // impuesto…» … «tres.)») y que contiene otro paréntesis «(1993)». Se separa la marca para que pase a constancia y el texto quede
    // como antecedente.
    { impreso: 'ARTÍCULO 127.- (Derogado por Decreto 48-91. El', correcto: 'ARTÍCULO 127.- (Derogado por Decreto 48-91) El' },
    { impreso: 'noventa y\ntres.)', correcto: 'noventa y\ntres.' },
  ],
  /**
   * Arts. 81 y 127: derogados por el D.48-91 (marca en línea y título de margen «DEROGADO»), pero la edición conserva su texto. Como
   * la marca no nombra el artículo, el constructor la tomaría por derogación parcial: se fija la clasificación.
   */
  dictamenes: Object.fromEntries(['81', '127'].map((n) => [n, {
    clasificacion: { vigencia: 'DEROGADO' as const, rol: 'CONTEXT' as const, motivo: 'DEROGADO por D.48-91 según la edición AMHON (marca en línea y título de margen «DEROGADO»); la edición conserva el texto, que se mantiene como antecedente; cotejo con La Gaceta pendiente (D1)' },
  }])),
};
if (process.argv[1]?.endsWith('ola13-lmun.ts')) {
  emitirOlaCedij({ ...PARAMS, salida: 'out/ola13-lmun', expedienteDir: 'docs/corpus/fase2/2026-11-25-hn-lmun-ola13', pliego: 'EXPEDIENTE_AUDITORIA_LMUN_OLA13.md',
    sinEmbeddings: process.argv.includes('--sin-embeddings') })
    .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
}
