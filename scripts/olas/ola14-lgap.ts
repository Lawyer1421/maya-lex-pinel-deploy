/**
 * scripts/olas/ola14-lgap.ts
 * OLA 14 · lote 1 — HN:LEY_GENERAL_ADMINISTRACION_PUBLICA: Ley General de la Administración Pública (Decreto No. 146-86, La Gaceta
 * No. 25,088 del 29-nov-1986).
 *
 * Fuentes (expediente docs/corpus/fase2/2026-11-26-hn-lgap-ola14/):
 *  1. Base: edición del CEDIJ (Corte Suprema de Justicia, PDFMaker 2009, modificada en 2012), texto nativo con 38 notas al pie que
 *     integran las reformas de los D.85-91, D.218-96, D.284-98, D.83-2004 (Ley Orgánica del Presupuesto) y D.157-2008.
 *  2. Reformas posteriores al corte de la edición: el Artículo 1 del Decreto No. 266-2013 (La Gaceta No. 33,336 del 23-ene-2014, PDF
 *     nativo) da nueva redacción a los arts. 2, 3, 4, 5, 6, 12, 13, 14, 15, 20, 22, 26, 27, 28, 29, 45, 50, 53, 85, 99, 100, 101, 102,
 *     113, 117, 124-C y 124-D, y vuelve a crear el art. 98 («cuya norma fue derogada»). Su texto se extrae de La Gaceta columna por
 *     columna (extraerReformasD266) y sustituye al de la edición. El Artículo 10 deroga los arts. 4A, 15A, 82, 104, 105, 124-A y 124-B.
 *  3. Testigo oficial del texto original: La Gaceta No. 25,088 (escaneo, OCR por columnas en scripts/olas/ocr-lgap.ts). Sirve para el
 *     cotejo de los artículos que ninguna reforma tocó; no es la fuente del texto.
 *
 * El art. 4-A no figura en ninguna fuente disponible (lo adicionó una reforma posterior a la edición y lo derogó el D.266-2013): no se
 * crea fila. No hay legacy de esta ley en producción (consulta de solo lectura, 2026-11-26).
 * Uso: npx tsx scripts/olas/ola14-lgap.ts [--sin-embeddings]
 */
import { execFileSync } from 'node:child_process';
import type { ConfigOla } from './paquete-ola';
import { emitirOlaCedij, type Constancia, type ParamsCedij } from './cedij';

export const CFG: ConfigOla = {
  ola: 'OLA14', normId: 'HN:LEY_GENERAL_ADMINISTRACION_PUBLICA', instrumentoId: 'LEY_GENERAL_ADMINISTRACION_PUBLICA', ingestBatch: 'OLA14_LGAP_2014_01',
  fechaCorte: '2026-11-26', adjudicacion: 'EXPEDIENTE_AUDITORIA_LGAP_OLA14.md (D1–D8)',
};

export const PDF_EDICION = 'C:/Users/fredy/OneDrive/Email attachments/Documentos/MATERIAS POR AREAS Y TEMAS/DERECHO ADMINISTRATIVO/Ley General de la Administración Pública.pdf';
export const PDF_D266 = 'C:/Users/fredy/OneDrive/SISTEMA_LEGAL_PRINCIPAL/02_EJERCICIO_LEGAL/05_LEYES_Y_CODIGOS/20140123-DECRETO LEGISLATIVO No. 266_2013 _ LEY PARA OPTIMIZAR LA ADMINISTRACION PUBLICA MEJORAR LOS SERVICIOS A LA CIUDADANIA Y FORTALECIMIENTO DE LA TRANSPARENCIA.pdf';
/** El mismo xpdf 4.06 que fija cedij.ts para los paquetes firmados (recorta por márgenes, no con -x/-W). */
const PDFTOTEXT = process.env.OLAS_PDFTOTEXT ?? 'C:/Program Files/Git/mingw64/bin/pdftotext.exe';

/** Los 28 números que reescribe el Artículo 1 del D.266-2013 (27 reformados y el 98 adicionado de nuevo), en el orden de La Gaceta. */
export const REFORMADOS_D266 = ['2', '3', '4', '5', '6', '12', '13', '14', '15', '20', '22', '26', '27', '28', '29', '45', '50', '53', '85', '98', '99', '100', '101', '102', '113', '117', '124-C', '124-D'] as const;
/** Derogados por el Artículo 10 del D.266-2013 que la edición CEDIJ sí trae (el 4-A no figura en ninguna fuente). */
export const DEROGADOS_D266 = ['15-A', '82', '104', '105', '124-A', '124-B'] as const;

const D266_REFORMA: Constancia = {
  nota: null, tipo: 'REFORMA', decretos: ['266-2013'],
  texto: 'Reformado por el Artículo 1 del Decreto No. 266-2013 (Ley para Optimizar la Administración Pública, Mejorar los Servicios a la Ciudadanía y Fortalecimiento de la Transparencia en el Gobierno), publicado en La Gaceta No. 33,336 del 23 de enero de 2014. Texto tomado de La Gaceta; sustituye al de la edición CEDIJ.',
};
const D266_ADICION_98: Constancia = {
  nota: null, tipo: 'ADICION', decretos: ['266-2013'],
  texto: 'Nuevo texto incorporado por adición por el Artículo 1 del Decreto No. 266-2013 (La Gaceta No. 33,336 del 23 de enero de 2014), «que en el orden correlativo ocupará el número 98, cuya norma fue derogada». Texto tomado de La Gaceta.',
};
const D266_DEROGACION: Constancia = {
  nota: null, tipo: 'DEROGACION_TOTAL', decretos: ['266-2013'],
  texto: 'Artículo Derogado por el Artículo 10 del Decreto No. 266-2013, publicado en La Gaceta No. 33,336 del 23 de enero de 2014.',
};

/**
 * Lecturas de la edición CEDIJ que difieren de La Gaceta No. 25,088 en artículos (o partes de artículo) que ninguna reforma anotada
 * toca. Cada una se verificó en la imagen del escaneo (pág./columna) y con la transcripción independiente de 1986 «Ley de la
 * Administración Pública.pdf» (`edC`), que coincide con La Gaceta en todas salvo la 8. Se adopta la lectura oficial, tal como se
 * publicó (la 8 conserva la concordancia del original).
 */
export const CORRECCIONES_GACETA: ReadonlyArray<{ articulo: string; impreso: string; correcto: string; gaceta: string }> = [
  { articulo: '18', impreso: 'Ley, integraran el Consejo de Ministros.', correcto: 'Ley, integran el Consejo de Ministros.', gaceta: 'pág. 2, col. der.: «integra[n]» (renglón dañado al margen; no cabe «integrarán»); edC «integran»' },
  { articulo: '36', impreso: 'sobre la entidades', correcto: 'sobre las entidades', gaceta: 'pág. 4, col. izq., num. 11: «sobre las entidades»' },
  { articulo: '36', impreso: 'sus propias actos', correcto: 'sus propios actos', gaceta: 'pág. 4, col. izq., num. 13: «sus propios actos»' },
  { articulo: '36', impreso: 'se hallan bajo el cuidado', correcto: 'se hallen bajo el cuidado', gaceta: 'pág. 4, col. izq., num. 15: «que se hallen bajo el cuidado»' },
  { articulo: '56', impreso: 'asistir a la reuniones', correcto: 'asistir a las reuniones', gaceta: 'pág. 6, col. izq.: «para asistir a las reuniones»' },
  { articulo: '56', impreso: 'propietarios y suplentes, que asistan', correcto: 'propietarios o suplentes, que asistan', gaceta: 'pág. 6, col. izq.: «propietarios o suplentes, que asistan»' },
  { articulo: '57', impreso: 'plazo que se señale.', correcto: 'plazo que señale.', gaceta: 'pág. 6, col. izq.: «dentro del plazo que señale.»' },
  { articulo: '59', impreso: 'tres (3) veces', correcto: 'tres veces', gaceta: 'pág. 6, col. izq.: «por tres veces consecutivas»' },
  { articulo: '63', impreso: 'Los Designados a la República,', correcto: 'Los Designados a la Presidencia,', gaceta: 'pág. 6, col. der., num. 2: «Los Designados a la Presidencia»' },
  { articulo: '65', impreso: 'vigentes\nde la entidad.', correcto: 'vigentes\nen la entidad.', gaceta: 'pág. 6, col. der.: «vigentes en la entidad»' },
  { articulo: '74', impreso: 'Ganancias, serán publicados', correcto: 'Ganancias, serán publicadas', gaceta: 'pág. 7, col. der.: «serán publicadas» (así en el original; edC «publicados»)' },
  { articulo: '84', impreso: 'una contra garantía', correcto: 'una contragarantía', gaceta: 'pág. 8, col. der., num. 3: «contra-⏎garantía» (palabra partida a fin de renglón)' },
  { articulo: '86', impreso: 'Despachos de Fianazas', correcto: 'Despachos de Finanzas', gaceta: 'errata de la edición; La Gaceta dice «Hacienda y Crédito Público» (cambio de denominación sin nota: ver ARTICULOS_SIN_NOTA)' },
  { articulo: '107', impreso: 'siete (7) días', correcto: 'siete días', gaceta: 'pág. 9, col. der.: «al menos siete días»' },
  { articulo: '115', impreso: 'lo tuviere su cónyuge', correcto: 'lo tuvieren su cónyuge', gaceta: 'pág. 10, col. izq.: «o lo tuvieren su cónyuge»' },
  { articulo: '123', impreso: 'paridad en grado', correcto: 'paridad de grado', gaceta: 'pág. 10, col. der.: «en caso de paridad de grado»' },
  { articulo: '124', impreso: 'mil lempiras\n(L.100 a 1,000),', correcto: 'mil lempiras,', gaceta: 'pág. 10, col. der.: «una multa de cien a mil lempiras, atendiendo…» (la cifra entre paréntesis es agregado editorial)' },
];

/**
 * Artículos cuyo texto en la edición CEDIJ difiere SUSTANTIVAMENTE del de La Gaceta 25,088 sin que la edición anote reforma alguna.
 * Otras ediciones consultadas (expediente §2):
 *  - la de 1998 del Poder Judicial (con el D.284-98) aún trae el texto de 1986 en los arts. 30, 31 y 33;
 *  - la de 2008 («LEY GENERAL DE LA ADMINISTRACION PÚBLICA F.doc», 47 notas) atribuye los arts. 30, 31, 33 y 34 al D.218-96 (y los
 *    33 y 34 también al D.284-98), pero no anota los 35, 36, 63, 81, 84 ni 86;
 *  - la del CEDIJ de 2015 (con el D.266-2013) trae para los arts. 33–36 un texto que no coincide palabra por palabra con el de 2009, y
 *    anota el art. 69 como «Reformado mediante Decreto PCM-2013… La Gaceta No. 33,341 del 29 de enero de 2014».
 * Ninguna de esas Gacetas (28,148; 28,729; 33,341) está disponible. Propuesta (D5): CONTEXT vigente, con el texto de la edición CEDIJ y la
 * constancia de la divergencia, hasta que el CLO verifique el texto oficial de la reforma; nunca PRIMARY sin esa fuente.
 */
export const ARTICULOS_SIN_NOTA: Readonly<Record<string, string>> = {
  '30': 'La Gaceta 25,088: «En el Reglamento Interno de cada Secretaría de Estado, se determinarán las atribuciones de sus unidades administrativas.» La edición trae otro texto (Subsecretarios, Secretario General, Consejo Consultivo) sin nota de reforma; la edición de 2008 lo atribuye al D.218-96 (La Gaceta 28,148), no disponible.',
  '31': 'La Gaceta 25,088: servicios de apoyo administrativo (planificación, programación, presupuesto, informática…). La edición trae otro texto (Gerencia Administrativa, Unidad de Planeamiento y Evaluación de la Gestión) sin nota de reforma; la edición de 2008 lo atribuye al D.218-96 (La Gaceta 28,148), no disponible.',
  '33': 'La Gaceta 25,088: «Cada Secretaría de Estado, estará a cargo de un Secretario de Estado. Sin embargo y cuando así lo disponga…». La edición trae otro texto (colaboradores del Presidente, refrendo, delegación) sin nota de reforma; la edición de 2008 lo atribuye a los D.218-96 y D.284-98, y la de 2015 difiere en algunas palabras.',
  '34': 'La Gaceta 25,088: asistencia por Subsecretarios, un Oficial Mayor y Directores Generales, y su orden de sustitución. La edición trae otro texto (sustitución por ministerio de ley, encargo temporal por el Presidente) sin nota de reforma; la edición de 2008 lo atribuye a los D.218-96 y D.284-98, y la de 2015 agrega «si hubiere más de un subsecretario».',
  '69': 'La Gaceta 25,088 y la edición CEDIJ de 2009: «Secretaría de Hacienda y Crédito Público». La edición CEDIJ de 2015 dice «Secretaría de Estado en los Despachos de Finanzas» y anota una reforma por «Decreto PCM-2013» (La Gaceta 33,341 del 29-ene-2014), no disponible. Se conserva el texto de 2009, que coincide con el original.',
  '35': 'La Gaceta 25,088: «…los Sub-Secretarios, el Oficial Mayor y los Directores Generales…». La edición dice «los Secretarios Generales» sin nota de reforma.',
  '36': 'La Gaceta 25,088: «Oficiales Mayores» (num. 8), «Contraloría General de la República» (num. 16) y «Oficial Mayor o Directores» (num. 19). La edición dice «Secretarios Generales» y «Tribunal Superior de Cuentas» sin nota de reforma.',
  '63': 'La Gaceta 25,088, num. 7: «Contraloría General de la República». La edición dice «Tribunal Superior de Cuentas» sin nota de reforma.',
  '81': 'La Gaceta 25,088: «Secretaría de Estado en los Despachos de Hacienda y Crédito Público» y «Secretaría Técnica de Planificación». La edición dice «Finanzas» y suprime la mención de la Secretaría Técnica sin nota de reforma.',
  '84': 'La Gaceta 25,088, num. 3: «Contraloría General de la República» y «Hacienda y Crédito Público». La edición dice «Tribunal Superior de Cuentas» y «Finanzas» sin nota de reforma.',
  '86': 'La Gaceta 25,088: «Secretaría de Estado en los Despachos de Hacienda y Crédito Público». La edición dice «Finanzas» sin nota de reforma.',
};
const REVISION_SIN_NOTA = (detalle: string): Constancia => ({
  nota: null, tipo: 'REVISION_PENDIENTE_CLO', decretos: [],
  texto: `Cotejo con La Gaceta No. 25,088 y otras ediciones (OLA 14): reforma posterior sin nota en la edición CEDIJ, cuyo texto oficial no se ha verificado. ${detalle}`,
});

/** Ruido de página de La Gaceta 33,336 en la extracción por columnas. */
const RUIDO_D266 = /^(?:Sección A Acuerdos y Leyes|La Gaceta\s+REPÚBLICA DE HONDURAS - TEGUCIG|GALPA, M\. D\. C\., 23 DE ENERO DEL 2014\s+No\. 33,336|A\.\s*\d{1,3})$/;

/**
 * Texto de La Gaceta 33,336 (págs. 1–9) por columnas: izquierda y luego derecha, página a página (x = 0–396 y 396–792 pt). Marca con
 * «\u0000» cada cambio de columna para que una línea en blanco junto al corte no parta un párrafo.
 */
export function columnasD266(pdf: string = PDF_D266): string {
  const partes: string[] = [];
  for (let p = 1; p <= 9; p++) for (const margen of [['-marginr', '396'], ['-marginl', '396']]) {
    partes.push(execFileSync(PDFTOTEXT, ['-enc', 'UTF-8', '-f', String(p), '-l', String(p), ...margen, '-simple', pdf, '-'], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }).replace(/\r\n?/g, '\n').replace(/\f/g, ''));
  }
  return partes.join('\n\u0000\n');
}

/**
 * Nueva redacción de cada artículo de la LGAP en el Artículo 1 del D.266-2013, sin las comillas de apertura y cierre. Párrafos e
 * incisos («1) …») separados por línea en blanco, como en la edición CEDIJ; en el art. 29, el nombre de cada Secretaría va en su propio
 * párrafo antes de su descripción («Lo concerniente…», «Auxiliar…»). Las únicas palabras partidas a fin de renglón son «suspen-sión» (4)
 * y «des-concentradas» (45).
 */
export function extraerReformasD266(columnas: string = columnasD266()): Record<string, string> {
  const ini = columnas.indexOf('“ARTÍCULO 2.- La Administración Pública es');
  const fin = columnas.indexOf('ARTÍCULO 2.- Reformar los Artículos 1, 6');
  if (ini < 0 || fin < 0) throw new Error('D.266-2013: no se halló el bloque del Artículo 1 (LGAP)');
  const parrafos: string[] = [];
  let actual: string[] = [];
  let blanco = false;
  // Tras un cambio de columna, las líneas en blanco (entre la cabecera de página y el texto) no separan párrafos.
  let trasCorte = false;
  const cerrar = () => { if (actual.length) parrafos.push(actual.join(' ')); actual = []; };
  const bloque = columnas.slice(ini, fin).split('\n');
  // Sangría de párrafo de cada columna: la sangría más frecuente de sus líneas de texto es la del cuerpo; un párrafo empieza más adentro.
  const cuerpoDe = new Map<number, number>();
  {
    let col = 0; const cuenta = new Map<number, Map<number, number>>();
    for (const cruda of bloque) {
      if (cruda === '\u0000') { col++; continue; }
      const t = cruda.trim();
      if (!t || RUIDO_D266.test(t.replace(/\s+/g, ' '))) continue;
      const s = cruda.length - cruda.trimStart().length;
      const m = cuenta.get(col) ?? new Map<number, number>(); m.set(s, (m.get(s) ?? 0) + 1); cuenta.set(col, m);
    }
    for (const [c, m] of cuenta) cuerpoDe.set(c, [...m.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0]);
  }
  let columna = 0;
  for (const cruda of bloque) {
    if (cruda === '\u0000') { blanco = false; trasCorte = true; columna++; continue; }
    const l = cruda.trim().replace(/\s+/g, ' ');
    if (RUIDO_D266.test(l)) continue;
    if (!l) { if (!trasCorte) blanco = true; continue; }
    // Primer renglón de una columna: es párrafo nuevo solo si el anterior cerró con punto o dos puntos, empieza en mayúscula y lleva
    // sangría de párrafo (p. ej. «De igual forma…» del art. 6, al principio de la pág. A.20).
    const sangria = cruda.length - cruda.trimStart().length;
    const inicioDeColumna = trasCorte && actual.length > 0 && /[.:]”?$/.test(actual[actual.length - 1]) && /^\p{Lu}/u.test(l) && sangria > (cuerpoDe.get(columna) ?? 0) + 1;
    trasCorte = false;
    // Una línea que empieza en minúscula siempre continúa el párrafo anterior.
    const nuevo = /^[“"]?ARTÍCULO\s+\d/.test(l) || /^\d{1,2}\)\s/.test(l) || (blanco && actual.length > 0 && !/^\p{Ll}/u.test(l)) || /^(?:Lo concerniente|Auxiliar al Presidente)/.test(l) || inicioDeColumna;
    blanco = false;
    if (nuevo) cerrar();
    const previa = actual[actual.length - 1];
    if (previa?.endsWith('-') && /^\p{Ll}/u.test(l)) actual[actual.length - 1] = previa.slice(0, -1) + l;
    else actual.push(l);
  }
  cerrar();
  const textos: Record<string, string[]> = {};
  let numero: string | null = null;
  for (const par of parrafos) {
    const m = /^[“"]?ARTÍCULO\s+(\d+(?:-[A-D])?)\.-?\s*/.exec(par);
    if (m) { numero = m[1]; textos[numero] = [par.slice(m[0].length)]; continue; }
    if (!numero) throw new Error(`D.266-2013: párrafo antes del primer artículo: ${par.slice(0, 60)}`);
    textos[numero].push(par);
  }
  const salida: Record<string, string> = {};
  for (const [n, ps] of Object.entries(textos)) salida[n] = ps.join('\n\n').replace(/”\s*$/, '');
  const obtenidos = Object.keys(salida);
  if (obtenidos.join(',') !== REFORMADOS_D266.join(',')) throw new Error(`D.266-2013: artículos ${obtenidos.join(',')} (se esperaban ${REFORMADOS_D266.join(',')})`);
  return salida;
}

/** Parámetros de la ola. Perezosos: leen dos PDF, y `verificar-firmadas.ts` no debe depender de ellos mientras la ola no esté firmada. */
export function params(): ParamsCedij {
  const d266 = extraerReformasD266();
  return {
    cfg: CFG,
    pdf: PDF_EDICION,
    materia: '10_LEYES_REGLAMENTOS',
    fuenteCanonica: 'Ley General de la Administración Pública de Honduras (Decreto No. 146-86)',
    decreto: '146-86',
    edicionFuente: 'Edición del CEDIJ (Corte Suprema de Justicia), «Ley General de la Administración Pública.pdf» (PDFMaker 2009, mod. 2012), con 38 notas al pie de los D.85-91, D.218-96, D.284-98, D.83-2004 y D.157-2008; arts. 2, 3, 4, 5, 6, 12, 13, 14, 15, 20, 22, 26, 27, 28, 29, 45, 50, 53, 85, 98, 99, 100, 101, 102, 113, 117, 124-C y 124-D según el D.266-2013 (La Gaceta 33,336), que además deroga los arts. 4A, 15A, 82, 104, 105, 124-A y 124-B.',
    inicio: /^Artículo 1\. La presente Ley establece/m,
    fin: /^Dado en la ciudad de Tegucigalpa, Municipio del Distrito Central/m,
    ultimoBase: 126, idLegacy: () => null, legacyDump: null,
    // Nota 38 («Publicado en el Diario Oficial La Gaceta numero 25,088…») va tras el «Dado en…»: referencia del decreto, no de un artículo.
    notasFueraDelArticulado: [38],
    erratasCrudas: [
      // «Derogado10⏎.»: la edición imprime la llamada de nota antes del punto, que cae en la línea siguiente (arts. 38, 68 y 79).
      { de: /Derogado(\d+)\n\./g, a: 'Derogado.$1', esperadas: 3 },
      // Encabezado con punto intercalado («Artículo 124. B.»): sin esta corrección el art. 124-B se leería dentro del 124-A.
      { de: /Artículo 124\. B\./, a: 'Artículo 124-B.', esperadas: 1 },
      // La segunda línea de la nota 34 quedó, por el salto de página, después del art. 124-B: se devuelve a su nota.
      { de: /(34 Reforma por Adición mediante Decreto 218-96 de fecha 17 de diciembre de 1996, publicado en)\n/, a: '$1 el Diario Oficial La Gaceta No. 28,148 del 30 de diciembre de 1996\n', esperadas: 1 },
      { de: /\nel Diario Oficial La Gaceta No\. 28,148 del 30 de diciembre de 1996\n(?=35 Reforma)/, a: '\n', esperadas: 1 },
    ],
    erratas: [
      // Errata de la edición en el art. 96: «Drogado.».
      { impreso: 'Drogado.', correcto: 'Derogado.' },
      // Corrección dirigida por el cotejo con La Gaceta 25,088 (scripts/olas/ocr-lgap.ts y lectura de la imagen a 300–600 ppi; ver
      // CORRECCIONES_GACETA y la §4 del expediente). Solo palabras que ninguna reforma anotada toca; se adopta la lectura oficial.
      ...CORRECCIONES_GACETA.map(({ impreso, correcto }) => ({ impreso, correcto })),
    ],
    reformasPosteriores: Object.fromEntries(REFORMADOS_D266.map((n) => [n, { texto: d266[n], constancia: n === '98' ? D266_ADICION_98 : D266_REFORMA }])),
    recreados: ['98'],
    dictamenes: {
      ...Object.fromEntries(DEROGADOS_D266.map((n) => [n, {
        clasificacion: { vigencia: 'DEROGADO' as const, rol: 'CONTEXT' as const, motivo: 'DEROGADO por el Artículo 10 del D.266-2013 (La Gaceta 33,336); la edición CEDIJ conserva el texto, que se mantiene como antecedente' },
        constancia: D266_DEROGACION,
      }])),
      ...Object.fromEntries(Object.entries(ARTICULOS_SIN_NOTA).map(([n, detalle]) => [n, {
        clasificacion: { vigencia: 'VIGENTE' as const, rol: 'CONTEXT' as const, motivo: 'CONTEXT vigente: reforma posterior sin nota en la edición CEDIJ (divergencia con La Gaceta 25,088 o nota solo en otra edición); texto oficial de la reforma no verificado (D5)' },
        constancia: REVISION_SIN_NOTA(detalle),
      }])),
    },
  };
}

if (process.argv[1]?.endsWith('ola14-lgap.ts')) {
  emitirOlaCedij({ ...params(), salida: 'out/ola14-lgap', expedienteDir: 'docs/corpus/fase2/2026-11-26-hn-lgap-ola14', pliego: 'EXPEDIENTE_AUDITORIA_LGAP_OLA14.md',
    sinEmbeddings: process.argv.includes('--sin-embeddings') })
    .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
}
