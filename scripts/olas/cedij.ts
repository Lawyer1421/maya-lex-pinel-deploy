/**
 * scripts/olas/cedij.ts
 * Constructor genérico de olas desde una edición consolidada del CEDIJ (Poder Judicial) en Word→PDF con notas al pie secuenciales.
 * Reutiliza la extracción validada en la OLA 5 (scripts/olas/ola5-cf.ts): retiro de cabecera/folio/notas por página, resolución estricta
 * de llamadas de nota 1..N (pegadas al número del artículo, al texto o a un epígrafe de título), cruce nota↔artículo, estructura a
 * `ubicacion`, reflujo de párrafos. Lo usan la OLA 6 (Código Procesal Civil) y la OLA 7 (Código del Trabajo).
 *
 * Clasificación propuesta (la decide el CLO en el pliego):
 *   · contenido «Derogado» o nota de derogación TOTAL que nombra el artículo → CONTEXT derogado (si la edición conserva el texto, se
 *     conserva como antecedente y se lista en el expediente);
 *   · resto → PRIMARY, con constancias de reforma, adición, interpretación auténtica, derogación parcial o referencia;
 *   · dictámenes del CLO por artículo, si los hay.
 * Comparación con el legacy de producción (volcado JSON id/n/v/c/m): números ausentes y sobrantes, vigencia, similitud de texto.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { normalizarNumeroArticulo } from '../../lib/legal-retrieval/clo-guards';
import { sha256, type Clasificacion, type ConfigOla, type FilaOla } from './paquete-ola';
import { decretosDe } from './ola1-cpp';
import { dice, normalizarCotejo } from './ola4-cc';
import { articuloDeNota, extraer, quitarEstructura, refluirCF, type ArticuloBruto, type Nota } from './ola5-cf';

export type TipoConstancia = 'REFORMA' | 'ADICION' | 'DEROGACION_TOTAL' | 'DEROGACION_PARCIAL' | 'DEROGACION_DE_TITULO' | 'INTERPRETACION_AUTENTICA'
  | 'REFERENCIA' | 'REVISION_PENDIENTE_CLO' | 'REFORMA_TACITA' | 'FE_DE_ERRATAS';
export interface Constancia { nota: number | null; tipo: TipoConstancia; texto: string; decretos: string[] }

export function tipificarNotaCedij(texto: string): TipoConstancia {
  if (/^(T[ií]tulo|Cap[ií]tulo|Secci[oó]n)/i.test(texto) && /Derogad/i.test(texto)) return 'DEROGACION_DE_TITULO';
  if (/Fe de Errata/i.test(texto) && !/Reformad|Derogad|Interpreta|Adicion/i.test(texto)) return 'FE_DE_ERRATAS';
  if (/Interpreta/i.test(texto)) return 'INTERPRETACION_AUTENTICA';
  if (/t[aá]citamente/i.test(texto)) return 'REFORMA_TACITA';
  const antes = texto.split(/Derogad/i)[0];
  if (/Derogad/i.test(texto)) return /p[aá]rrafo|numeral|literal|inciso|fracci[oó]n|ordinal/i.test(antes) ? 'DEROGACION_PARCIAL' : 'DEROGACION_TOTAL';
  if (/Adicionad|Adici[oó]n/i.test(texto) && !/Reformad/i.test(texto)) return 'ADICION';
  if (/Reformad|reforma/i.test(texto)) return 'REFORMA';
  return 'REFERENCIA';
}
export const decretosCedij = (t: string) => [...new Set([...decretosDe(t),
  ...[...t.matchAll(/Decreto\.?\s+(?:No\.?\s*|N[°º]\.?\s*)?(\d{1,4})(?:-\s?(\d{2,4}))?\b/gi)].map((m) => (m[2] ? `${m[1]}-${m[2]}` : m[1]))])];

/**
 * Segmentación con llamadas de nota tolerantes (copia de `segmentar` de la OLA 5, que no se toca porque su paquete está firmado):
 *   · una llamada puede aparecer hasta 2 posiciones antes de su turno (la edición del Código del Trabajo pone la nota 8, que anota los
 *     arts. 32 y 34, después de la 7 en el orden de notas, pero su llamada en el art. 34 va antes de… no: va después; y viceversa);
 *     toda nota debe resolverse exactamente una vez;
 *   · «Derogado 6»: llamada separada por un espacio, solo tras «Derogado/a».
 */
export function segmentarFlexible(cuerpo: string, totalNotas: number, ignorar: readonly number[] = []): ArticuloBruto[] {
  // `ignorar`: notas cuya llamada cae fuera del articulado (p. ej. en un decreto de reforma anexo a la edición).
  const encontradas = new Set<number>(ignorar);
  const pendientes = () => { const out: number[] = []; for (let n = 1; n <= totalNotas && out.length < 3; n++) if (!encontradas.has(n)) out.push(n); return out; };
  const lineas = cuerpo.split('\n');
  const arts: ArticuloBruto[] = [];
  let prev = 0;
  let actual: ArticuloBruto | null = null;
  const cuerpoActual: string[] = [];
  const llamadasDeEstructura: number[] = [];
  const cerrar = () => { if (actual) { actual.texto = cuerpoActual.join('\n'); arts.push(actual); } cuerpoActual.length = 0; };
  // La letra de un artículo bis no puede ir seguida de otra letra, tampoco mayúscula acentuada («14.- CÓMPUTO» no es «14-C»).
  // Y debe ir seguida de punto, guion, llamada de nota o fin de línea: «Artículo 4.- A los Tribunales…» no es el art. 4-A.
  const ENC = /^(?:Art[ií]culo|ART[IÍ]CULO)\.?\s+(\d+)\s*(?:(?:-\s*|\.-|\s)?\s*([A-H])(?![a-zA-ZáéíóúñÁÉÍÓÚÑ])(?=\s*[.\-\d]|\s*$))?\s*([.\-]*)\s*(\d{0,3})\s*([.\-]*)\s*(\d{0,3})/;
  const baseDe = (n: string) => Number(n.split('-')[0]);
  for (const l of lineas) {
    const m = ENC.exec(l.trimStart());
    let tomado: { numero: string; llamadas: number[]; resto: string } | null = null;
    if (m && !/^(?:Art[ií]culo|ART[IÍ]CULO)\s+\d+\s+(?:de|del|y|al|o)\s/.test(l.trimStart())) {
      const D = m[1];
      const letra = m[2] ?? '';
      const opciones: Array<{ a: number; llamadas: number[] }> = [];
      for (let i = 1; i <= D.length; i++) {
        const a = Number(D.slice(0, i));
        let resto = D.slice(i);
        const llamadas: number[] = [];
        while (resto) { const c = pendientes().filter((x) => !llamadas.includes(x)).find((x) => resto.startsWith(String(x))); if (c === undefined) break; llamadas.push(c); resto = resto.slice(String(c).length); }
        if (resto) continue;
        // Mismo número que el anterior solo si es bis (lleva letra): «Artículo 78 reformado de la Ley…» dentro del 78 no abre artículo.
        if ((a > prev || (a === prev && letra)) && a <= prev + 3) opciones.push({ a, llamadas });
      }
      if (opciones.length) {
        opciones.sort((x, y) => Math.abs(x.a - prev - (letra ? 0 : 1)) - Math.abs(y.a - prev - (letra ? 0 : 1)) || y.llamadas.length - x.llamadas.length);
        const o = opciones[0];
        const llamadas = [...o.llamadas];
        for (const g of [m[4], m[6]]) {
          if (!g) continue;
          const pend = pendientes().filter((x) => !llamadas.includes(x));
          const c = pend.find((x) => g === String(x) || g === String(x).repeat(2));
          if (c === undefined) throw new Error(`encabezado «${l.trim().slice(0, 40)}»: llamada ${g} fuera de las pendientes (${pend.join(', ')})`);
          llamadas.push(c);
        }
        tomado = { numero: letra ? `${o.a}-${letra}` : String(o.a), llamadas, resto: l.trimStart().slice(m[0].length) };
      }
    }
    if (tomado) {
      cerrar();
      for (const c of tomado.llamadas) encontradas.add(c);
      actual = { numero: tomado.numero, texto: '', llamadas: [...llamadasDeEstructura, ...tomado.llamadas], encabezado: l.trim() };
      llamadasDeEstructura.length = 0;
      prev = baseDe(tomado.numero);
    }
    if (actual) {
      const est = tomado ? null : /^(\s*[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ ]+[A-ZÁÉÍÓÚÑIVXL])\s+(\d{1,3})\s*$/.exec(l);
      if (est && pendientes().includes(Number(est[2]))) { encontradas.add(Number(est[2])); llamadasDeEstructura.push(Number(est[2])); cuerpoActual.push(est[1]); continue; }
      // Llamada sola en su línea (los folios, con sangría ≥ 20, ya se retiraron en `extraer`).
      const sola = tomado ? null : /^ {0,10}(\d{1,3})\s*$/.exec(l);
      if (sola && pendientes().includes(Number(sola[1]))) { encontradas.add(Number(sola[1])); actual.llamadas.push(Number(sola[1])); continue; }
      let linea = tomado ? tomado.resto : l;
      for (;;) {
        let hallado: { idx: number; len: number; n: number } | null = null;
        for (const k of pendientes()) {
          const re = new RegExp(`(?<=[a-zA-ZáéíóúñÁÉÍÓÚÑ.;:,”"»)])${k}(?=\\s|$|[A-ZÁÉÍÓÚ.,;])|(?<=Derogad[oa]\\.? |[;:.,”"»] )${k}(?=\\s*$)|(?<=[.:] )${k}(?= [A-ZÁÉÍÓÚ])`);
          const mm = re.exec(linea);
          if (mm && (!hallado || mm.index < hallado.idx)) hallado = { idx: mm.index, len: String(k).length, n: k };
        }
        if (!hallado) break;
        linea = (linea.slice(0, hallado.idx) + linea.slice(hallado.idx + hallado.len)).replace(/ +$/, '');
        encontradas.add(hallado.n);
        actual.llamadas.push(hallado.n);
        // Llamadas encadenadas tras la recién retirada («Bahía20 21 22.»): solo números pendientes separados por un espacio.
        for (;;) {
          const cadena = /^ (\d{1,3})(?=[\s.;,]|$)/.exec(linea.slice(hallado.idx));
          if (!cadena || !pendientes().includes(Number(cadena[1]))) break;
          linea = linea.slice(0, hallado.idx) + linea.slice(hallado.idx + cadena[0].length);
          encontradas.add(Number(cadena[1]));
          actual.llamadas.push(Number(cadena[1]));
        }
      }
      cuerpoActual.push(linea);
    }
  }
  cerrar();
  const sin = Array.from({ length: totalNotas }, (_, i) => i + 1).filter((n) => !encontradas.has(n));
  if (sin.length) throw new Error(`llamadas de nota sin resolver: ${sin.slice(0, 20).join(', ')} (de ${totalNotas})`);
  for (const a of arts) a.llamadas.sort((x, y) => x - y);
  return arts;
}

/** Decreto que deroga, según la nota: el primero citado DESPUÉS de «Derogado» (la nota puede citar antes otros decretos). */
export function decretoDerogatorio(texto: string): string | null {
  const i = texto.search(/Derogad/i);
  // El primero por POSICIÓN («…Decreto No.73-96 … Véase … Decreto No.211-2006» → 73-96).
  const m = /Decreto\.?\s+(?:No\.?\s*|N[°º]\.?\s*)?(\d{1,4})(?:-\s?(\d{2,4}))?\b/i.exec(i >= 0 ? texto.slice(i) : texto);
  return m ? (m[2] ? `${m[1]}-${m[2]}` : m[1]) : null;
}

export interface ParamsCedij {
  cfg: ConfigOla; pdf: string; materia: string; fuenteCanonica: string; edicionFuente: string; decreto: string;
  /** Inicio y fin del articulado dentro del texto (tras retirar notas y cabeceras). */
  inicio: RegExp; fin: RegExp;
  erratas?: ReadonlyArray<{ impreso: string; correcto: string; nota?: number }>;
  sinCierre?: ReadonlySet<string>;
  dictamenes?: Record<string, { clasificacion: Clasificacion; constancia?: Constancia }>;
  /** Último artículo base esperado (numeración 1..N sin huecos). */
  ultimoBase: number;
  /** Prefijo del id legacy por número (para `sustituye_id_legacy`). */
  idLegacy: (numero: string) => string | null;
  /** Volcado legacy de producción (JSON [{id, n, v, c, m}]). */
  legacyDump: string | null;
  /** La edición no tiene notas al pie: no se buscan (evita confundir incisos «1 La clase…» con notas). */
  sinNotas?: boolean;
  /** Artículos que la edición NO imprime y se toman del legacy, como CONTEXT vigente pendiente de cotejo (decisión del CLO). */
  suplirDesdeLegacy?: readonly string[];
  /** Notas cuya llamada está fuera del articulado (se registran en el expediente, no en un artículo). */
  notasFueraDelArticulado?: readonly number[];
  /** Extractor propio del texto (p. ej. La Gaceta a dos columnas); si falta, `pdftotext -layout`. */
  extraerTexto?: (pdf: string) => string;
  /** Correcciones sobre el texto crudo, ANTES de separar notas (p. ej. notas que empiezan por un número: «33 1. Copiado…»). */
  erratasCrudas?: ReadonlyArray<{ de: RegExp; a: string; esperadas: number }>;
  /** Notas cuyo texto nombra un artículo equivocado (errata de la edición, verificada): se excluyen del cruce nota↔artículo. */
  notasNombreErrado?: readonly number[];
  /** Números de nota que la edición se salta (p. ej. de la 17 a la 19): se insertan como marcadores sin llamada para mantener 1..N. */
  notasInexistentes?: readonly number[];
  /** Notas cuya llamada la edición no imprime: número de nota → artículo al que se asignan (lo nombra la propia nota). */
  notasSinLlamada?: Readonly<Record<number, string>>;
  /** Líneas de ruido propias de la edición (cabeceras de página de un libro, p. ej. «DINAF | 7»); se retiran antes de todo. */
  ruido?: RegExp;
  /** Rótulos de estructura en minúsculas («Capítulo III Solicitantes…», «Sección I …») que, al final de un artículo, van a `ubicacion`. */
  estructura?: RegExp;
  /** Unir palabras partidas con guion al final de línea (maquetación de libro). */
  deguionar?: boolean;
}

export interface ArticuloCedij { fila: FilaOla; constancias: Constancia[]; correcciones: string[]; ubicacion: string[]; derogadoConTexto: boolean }

export function aplicarErratas(cuerpo: string, erratas: ParamsCedij['erratas'] = []): string {
  let t = cuerpo;
  for (const e of erratas) {
    const n = t.split(e.impreso).length - 1;
    if (n !== 1) throw new Error(`errata «${e.impreso}»: ${n} apariciones (se esperaba 1)`);
    t = t.replace(e.impreso, e.correcto);
  }
  return t;
}

export function problemasDeIntegridadCedij(numero: string, contenido: string, soloDerogado: boolean, sinCierre: ReadonlySet<string>): string[] {
  const p: string[] = [];
  if (contenido.length < (soloDerogado ? 7 : 15)) p.push(`contenido demasiado corto (${contenido.length})`);
  if (/^Art[ií]culo\s+\d/i.test(contenido)) p.push('encabezado residual');
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F�\r]|Ã[¡-¿]|Â[ -¿]/.test(contenido)) p.push('caracteres de control o mojibake');
  if (/CENTRO ELECTR|^\s*\d{1,3}\s*$|-- \d+ of \d+ --/m.test(contenido)) p.push('cabecera, folio o marca de página');
  if (/\n{3,}| {2,}/.test(contenido)) p.push('espaciado anómalo');
  if (!soloDerogado && !sinCierre.has(numero) && !/[.;:)”"»]$/.test(contenido)) p.push(`termina sin puntuación de cierre: «${contenido.slice(-50)}»`);
  return p;
}

/**
 * Extractor con el que se generaron los paquetes firmados: xpdf 4.06, el que trae Git for Windows. Va fijo por ruta porque el
 * `pdftotext` del PATH cambia según la terminal: Git Bash halla xpdf 4.06 y PowerShell halla poppler 25.07, que da otro texto y hace
 * fallar la OLA 3. Se puede sustituir con la variable OLAS_PDFTOTEXT.
 */
const PDFTOTEXT_FIRMADO = process.env.OLAS_PDFTOTEXT ?? 'C:/Program Files/Git/mingw64/bin/pdftotext.exe';

export function construirCedij(p: ParamsCedij): { articulos: ArticuloCedij[]; notas: Nota[]; pdfSha: string } {
  const pdfSha = sha256(readFileSync(p.pdf));
  const crudo = p.extraerTexto
    ? p.extraerTexto(p.pdf).replace(/\r\n?/g, '\n')
    : execFileSync(PDFTOTEXT_FIRMADO, ['-layout', '-enc', 'UTF-8', p.pdf, '-'], { encoding: 'utf8', maxBuffer: 80 * 1024 * 1024 }).replace(/\r\n?/g, '\n');
  // Cabecera del CEDIJ en minúsculas (ediciones antiguas) y línea «Poder Judicial de Honduras»: `extraer` solo retira la de mayúsculas.
  // Se conserva el salto de página (\f) que a veces encabeza la línea retirada: `extraer` lo necesita para delimitar las notas.
  const esRuido = (l: string) => /^\s*(Centro Electr[oó]nico de Documentaci[oó]n e Informaci[oó]n Judicial|Poder Judicial de Honduras)\s*$/.test(l) || (p.ruido?.test(l.replace(/\f/g, '')) ?? false);
  let limpio = crudo.split('\n').map((l) => (esRuido(l) ? l.replace(/[^\f]/g, '') : l)).join('\n');
  for (const e of p.erratasCrudas ?? []) {
    const n = (limpio.match(new RegExp(e.de.source, e.de.flags.includes('g') ? e.de.flags : `${e.de.flags}g`)) ?? []).length;
    if (n !== e.esperadas) throw new Error(`errata cruda ${e.de}: ${n} apariciones (se esperaban ${e.esperadas})`);
    limpio = limpio.replace(new RegExp(e.de.source, e.de.flags.includes('g') ? e.de.flags : `${e.de.flags}g`), e.a);
  }
  for (const n of p.notasInexistentes ?? []) {
    // Marcador justo antes de la nota siguiente, para que la detección secuencial de `extraer` no se detenga.
    const re = new RegExp(`^( {0,2})${n + 1}( *[A-ZÁÉÍÓÚ])`, 'm');
    if (!re.test(limpio)) throw new Error(`nota inexistente ${n}: no se halló la nota ${n + 1}`);
    limpio = limpio.replace(re, `$1${n} NOTA INEXISTENTE EN LA EDICIÓN\n$1${n + 1}$2`);
  }
  const { cuerpo, notas } = p.sinNotas
    ? {
      cuerpo: limpio.replace(/\f/g, '\n').split('\n')
        .filter((l) => !/^\s*CENTRO ELECTR[OÓ]NICO DE DOCUMENTACI[OÓ]N E INFORMACI[OÓ]N JUDICIAL\s*$/.test(l) && !/^\s{20,}\d{1,3}\s*$/.test(l)).join('\n'),
      notas: [] as Nota[],
    }
    : extraer(limpio);
  const i0 = cuerpo.search(p.inicio);
  const i1 = cuerpo.search(p.fin);
  if (i0 < 0 || i1 < 0 || i1 <= i0) throw new Error(`no se delimitó el articulado (inicio ${i0}, fin ${i1})`);
  const sinLlamada = Object.entries(p.notasSinLlamada ?? {}).map(([n, art]) => [Number(n), art] as const);
  const brutos = segmentarFlexible(aplicarErratas(cuerpo.slice(i0, i1), p.erratas), notas.length, [...(p.notasFueraDelArticulado ?? []), ...(p.notasInexistentes ?? []), ...sinLlamada.map(([n]) => n)]);
  for (const [n, art] of sinLlamada) {
    const b = brutos.find((x) => x.numero === art);
    if (!b) throw new Error(`nota ${n} sin llamada: el art. ${art} no existe`);
    b.llamadas = [...b.llamadas, n].sort((x, y) => x - y);
  }
  // Artículos no impresos por la edición: se insertan en su lugar con el texto del legacy (sin marcas de página).
  const suplidos = new Set<string>();
  if (p.suplirDesdeLegacy?.length) {
    if (!p.legacyDump) throw new Error('suplirDesdeLegacy requiere legacyDump');
    const legacy: Legacy[] = JSON.parse(readFileSync(p.legacyDump, 'utf8'));
    for (const n of p.suplirDesdeLegacy) {
      if (brutos.some((b) => b.numero === n)) throw new Error(`art. ${n}: la edición sí lo imprime; no se suple`);
      const l = legacy.find((x) => x.n === n);
      if (!l) throw new Error(`art. ${n}: no está en el legacy`);
      const pos = brutos.findIndex((b) => /^\d+$/.test(b.numero) && Number(b.numero) > Number(n));
      // Residuos de la extracción legacy: marcas «-- N of M --», folio suelto y cabecera del CEDIJ.
      const texto = l.c.split('\n').filter((x) => !/^\s*(-- \d+ of \d+ --|\d{1,3}|Centro Electr[oó]nico de Documentaci[oó]n e Informaci[oó]n Judicial)\s*$/i.test(x)).join('\n');
      brutos.splice(pos, 0, { numero: n, texto, llamadas: [], encabezado: `(legacy ${l.id})` });
      suplidos.add(n);
    }
  }
  const problemas: string[] = [];
  const notaArt = new Map<number, string>();
  for (const a of brutos) for (const n of a.llamadas) notaArt.set(n, a.numero);
  for (const n of notas) {
    const nombrado = articuloDeNota(n.texto);
    // Una nota puede nombrar varios artículos («Artículo 32 y 34», «Artículos 128, 129 y 131»): basta con que nombre aquel donde cae.
    const cae = notaArt.get(n.num);
    const nombraVarios = cae !== undefined && new RegExp(`^[^.]{0,60}\\b${cae.replace('-', '[\\s.-]*')}\\b`).test(n.texto);
    // Una nota que nombra un número mayor que el último artículo de la ley se refiere a otra ley (p. ej. «Artículo 934» del Código de
    // Procedimientos en la LOAT): no se cruza.
    const deOtraLey = (!!nombrado && p.ultimoBase > 0 && Number(nombrado.split('-')[0]) > p.ultimoBase) || (p.notasNombreErrado ?? []).includes(n.num);
    if (nombrado && nombrado !== cae && !nombraVarios && !deOtraLey) problemas.push(`nota ${n.num} nombra el art. ${nombrado} pero su llamada cae en el art. ${notaArt.get(n.num)}`);
  }
  const base = brutos.map((a) => a.numero).filter((n) => /^\d+$/.test(n)).map(Number);
  const faltan = Array.from({ length: p.ultimoBase }, (_, k) => k + 1).filter((n) => !base.includes(n));
  if (faltan.length) problemas.push(`faltan artículos base: ${faltan.join(', ')}`);
  // Notas que nombran varios artículos en su cabeza («Artículos 128, 129 y 131 Derogados…», «Artículo 188 y 190.»): su constancia se
  // liga también a cada artículo nombrado, aunque la llamada caiga en uno solo.
  const numeros = new Set(brutos.map((b) => b.numero));
  const notasPorNombre = new Map<string, number[]>();
  for (const n of notas) {
    const cabeza = /^Art[ií]culos?\s+((?:\d{1,3}(?:-[A-H])?(?:\s*,\s*|\s+y\s+|\s+al\s+)?)+)/.exec(n.texto);
    if (!cabeza) continue;
    let lista = [...cabeza[1].matchAll(/\d{1,3}(?:-[A-H])?/g)].map((m) => m[0]);
    const rango = /(\d{1,3})\s+al\s+(\d{1,3})/.exec(cabeza[1]);
    if (rango) lista = Array.from({ length: Number(rango[2]) - Number(rango[1]) + 1 }, (_, k) => String(Number(rango[1]) + k));
    if (lista.length < 2) continue;
    for (const art of lista) if (numeros.has(art)) notasPorNombre.set(art, [...(notasPorNombre.get(art) ?? []), n.num]);
  }
  const vistos = new Set<string>();
  let ubicPendiente: string[] = [];
  const sinCierre = p.sinCierre ?? new Set<string>();
  const articulos = brutos.map((a, i): ArticuloCedij => {
    if (vistos.has(a.numero)) problemas.push(`art. ${a.numero} repetido`);
    vistos.add(a.numero);
    // Una sigla sola en su renglón («(CNBS).») se une al anterior para que no se confunda con un rótulo en mayúsculas.
    // Solo al final del artículo, que es donde `quitarEstructura` la retiraría.
    const q = quitarEstructura(a.texto.replace(/\n\s*(\([A-ZÁÉÍÓÚÑ]{2,10}\)[.,;:]?)\s*$/, ' $1'));
    let texto = q.texto;
    const ubicacion = [...q.ubicacion];
    if (p.estructura) {
      // Rótulos de estructura en minúsculas al final del artículo (pueden venir antes de los rótulos en mayúsculas ya retirados).
      const lineas = texto.split('\n');
      while (lineas.length && (!lineas[lineas.length - 1].trim() || p.estructura.test(lineas[lineas.length - 1].trim()))) {
        const u = lineas.pop()!.trim();
        if (u) ubicacion.unshift(u);
      }
      texto = lineas.join('\n');
    }
    let guiones = 0;
    if (p.deguionar) texto = texto.replace(/([a-záéíóúñ])-\n\s*([a-záéíóúñ])/g, (_, x: string, y: string) => { guiones++; return x + y; });
    const miUbicacion = ubicPendiente;
    ubicPendiente = ubicacion;
    const correcciones: string[] = ['ENCABEZADO_RETIRADO'];
    if (a.llamadas.length) correcciones.push('LLAMADAS_DE_NOTA_RETIRADAS');
    let contenido = refluirCF(texto.replace(/^[\s.\-]+/, '')).normalize('NFC');
    if (guiones) correcciones.push(`PALABRAS_PARTIDAS_UNIDAS:${guiones}`);
    if (p.estructura) {
      // Rótulos en dos líneas («Capítulo III» / «Solicitantes de adopciones») quedan como párrafo final tras el reflujo.
      const parrafos = contenido.split('\n\n');
      while (parrafos.length > 1 && p.estructura.test(parrafos[parrafos.length - 1])) ubicacion.unshift(parrafos.pop()!);
      contenido = parrafos.join('\n\n');
    }
    const llamadas = [...new Set([...a.llamadas, ...(notasPorNombre.get(a.numero) ?? [])])].sort((x, y) => x - y);
    const constancias: Constancia[] = llamadas.map((n) => { const t = notas[n - 1].texto.replace(/\s+/g, ' '); return { nota: n, tipo: tipificarNotaCedij(t), texto: t, decretos: decretosCedij(t) }; });
    const soloDerogado = /^Derogad[oa]\.?$/.test(contenido);
    const derogTotalPropia = constancias.find((c) => c.tipo === 'DEROGACION_TOTAL' && (articuloDeNota(c.texto) === a.numero || (notasPorNombre.get(a.numero) ?? []).includes(c.nota!)));
    let clasificacion: Clasificacion;
    // Nota de derogación que no nombra el artículo y cae en uno con texto: deroga un inciso o numeral (p. ej. «11) Derogado.4»).
    if (!soloDerogado && !derogTotalPropia) for (const c of constancias) if (c.tipo === 'DEROGACION_TOTAL' && articuloDeNota(c.texto) === null) c.tipo = 'DEROGACION_PARCIAL';
    if (soloDerogado || derogTotalPropia) {
      const c = derogTotalPropia ?? constancias.find((x) => /DEROGACION_(TOTAL|DE_TITULO)/.test(x.tipo));
      const dec = c ? decretoDerogatorio(c.texto) : null;
      clasificacion = { vigencia: 'DEROGADO', rol: 'CONTEXT', motivo: `DEROGADO${dec ? ` por D.${dec}` : ''} según la edición CEDIJ; cotejo con La Gaceta pendiente (D1)${soloDerogado ? '' : '; la edición conserva el texto, que se mantiene como antecedente'}` };
    } else if (constancias.some((c) => c.tipo === 'REFORMA_TACITA')) {
      // Mismo criterio que la OLA 1 (firmada): reforma tácita sin texto actualizado → CONTEXT vigente hasta dictamen.
      clasificacion = { vigencia: 'VIGENTE', rol: 'CONTEXT', motivo: 'REFORMA_TACITA: la edición anota una reforma tácita que el texto no incorpora; CONTEXT hasta dictamen del CLO (D5)' };
    } else {
      const tipos = new Set(constancias.map((c) => c.tipo));
      const anot = tipos.has('DEROGACION_PARCIAL') ? ' (derogación parcial anotada)' : tipos.has('INTERPRETACION_AUTENTICA') ? ' (interpretación auténtica anotada)' : tipos.has('ADICION') ? ' (artículo adicionado)' : tipos.has('REFORMA') ? ' (reforma integrada)' : '';
      clasificacion = { vigencia: 'VIGENTE', rol: null, motivo: `PRIMARY elegible${anot}: edición consolidada CEDIJ con reformas integradas; cotejo íntegro con La Gaceta pendiente (D1)` };
    }
    if (suplidos.has(a.numero)) {
      correcciones.push('TEXTO_DE_LEGACY_NO_IMPRESO_EN_EDICION');
      constancias.push({ nota: null, tipo: 'REVISION_PENDIENTE_CLO', decretos: [],
        texto: `La edición CEDIJ no imprime este artículo (salta del anterior al siguiente). Texto tomado de la fila legacy de producción ${p.idLegacy(a.numero)}, pendiente de cotejo con La Gaceta.` });
      clasificacion = { vigencia: 'VIGENTE', rol: 'CONTEXT', motivo: 'CONTEXT vigente: artículo no impreso en la edición CEDIJ; texto del legacy pendiente de cotejo con La Gaceta (D5)' };
    }
    const dictamen = p.dictamenes?.[a.numero];
    if (dictamen) { clasificacion = dictamen.clasificacion; if (dictamen.constancia) constancias.push(dictamen.constancia); }
    for (const pr of problemasDeIntegridadCedij(a.numero, contenido, soloDerogado, sinCierre)) problemas.push(`art. ${a.numero}: ${pr}`);
    // Encabezado del artículo siguiente tragado por este (caso real: «ARTÍCULO 420.-» en mayúsculas dentro del 419 del CPC).
    const sig = /^\d+$/.test(a.numero) ? Number(a.numero) + 1 : null;
    if (sig && new RegExp(`^\\s*(?:Art[ií]culo|ART[IÍ]CULO)\\.?\\s+${sig}\\s*[.\\-]`, 'm').test(contenido)) problemas.push(`art. ${a.numero}: contiene el encabezado del art. ${sig}`);
    const fila: FilaOla = {
      id: `${p.cfg.ingestBatch}:${p.cfg.instrumentoId}:${a.numero}`,
      coleccion: 'mayalex_normativos', materia: p.materia, contenido, num_articulo: a.numero, fuente: p.fuenteCanonica,
      metadata: {
        norm_id: p.cfg.normId, instrumento_id: p.cfg.instrumentoId, ingest_batch: p.cfg.ingestBatch, ola: p.cfg.ola, ordinal: i + 1, decreto: p.decreto,
        texto_origen: 'PDF_CONSOLIDADO_CEDIJ_SANEADO', edicion_fuente: p.edicionFuente, pdf_sha256: pdfSha, article_sha256: sha256(contenido),
        ubicacion: miUbicacion, constancias, correcciones_saneamiento: correcciones, sustituye_id_legacy: p.idLegacy(a.numero),
        ...(clasificacion.vigencia === 'DEROGADO' ? { derogado_por: [...new Set(constancias.filter((c) => /DEROGACION_(TOTAL|DE_TITULO)/.test(c.tipo)).map((c) => decretoDerogatorio(c.texto)).filter(Boolean))].map((d) => `D.${d}`).join(', ') || 'edición CEDIJ' } : {}),
      },
      jurisdiccion: 'HN', fuente_tipo: 'codigo', instrumento_id: p.cfg.instrumentoId, num_articulo_norm: normalizarNumeroArticulo(a.numero),
      hash_contenido: sha256(contenido), ingest_batch: p.cfg.ingestBatch, clasificacion,
    };
    return { fila, constancias, correcciones, ubicacion: miUbicacion, derogadoConTexto: clasificacion.vigencia === 'DEROGADO' && !soloDerogado };
  });
  if (problemas.length) throw new Error(`integridad: ${problemas.length} problema(s)\n  ${problemas.slice(0, 150).join('\n  ')}`);
  return { articulos, notas, pdfSha };
}

/** Comparación con el legacy de producción: volcado JSON [{id, n, v, c, m}] guardado en out/<ola>/legacy_prod.json. */
export interface Legacy { id: string; n: string; v: boolean | null; c: string; m: Record<string, unknown> }
export function compararLegacyCedij(articulos: readonly ArticuloCedij[], ruta: string) {
  if (!existsSync(ruta)) throw new Error(`falta el volcado legacy ${ruta}`);
  const legacy: Legacy[] = JSON.parse(readFileSync(ruta, 'utf8'));
  const porNum = new Map(legacy.map((l) => [l.n, l]));
  const nums = new Set(articulos.map((a) => a.fila.num_articulo));
  const sims: Array<{ numero: string; dice: number }> = [];
  let mismaVigencia = 0;
  const cambiosVigencia: Array<{ numero: string; legacy: string; ola: string }> = [];
  for (const a of articulos) {
    const l = porNum.get(a.fila.num_articulo);
    if (!l) continue;
    const vNueva = a.fila.clasificacion.vigencia === 'VIGENTE';
    if ((l.v === true) === vNueva) mismaVigencia++; else cambiosVigencia.push({ numero: a.fila.num_articulo, legacy: l.v ? 'VIGENTE' : String(l.v), ola: a.fila.clasificacion.vigencia });
    sims.push({ numero: a.fila.num_articulo, dice: Number(dice(normalizarCotejo(l.c), normalizarCotejo(a.fila.contenido)).toFixed(4)) });
  }
  const residuos = {
    marcas_de_pagina: legacy.filter((l) => /-- \d+ of \d+ --/.test(l.c)).length,
    cabeceras_cedij: legacy.filter((l) => /CENTRO ELECTR/.test(l.c)).length,
    vacias_o_cortas: legacy.filter((l) => l.c.trim().length < 15).map((l) => l.n),
  };
  return {
    filas_legacy: legacy.length,
    faltan_en_legacy: articulos.filter((a) => !porNum.has(a.fila.num_articulo)).map((a) => a.fila.num_articulo),
    legacy_sin_articulo: legacy.filter((l) => !nums.has(l.n)).map((l) => l.n),
    misma_vigencia: mismaVigencia, cambios_de_vigencia: cambiosVigencia,
    texto_identico: sims.filter((s) => s.dice === 1).length, texto_desde_095: sims.filter((s) => s.dice >= 0.95).length,
    texto_bajo_090: sims.filter((s) => s.dice < 0.9).sort((x, y) => x.dice - y.dice),
    residuos,
  };
}

/** Escribe filas, manifiesto de artículos, constancias y (con embeddings) el paquete SQL y los .ps1. */
export async function emitirOlaCedij(p: ParamsCedij & { salida: string; expedienteDir: string; pliego: string; sinEmbeddings: boolean }): Promise<void> {
  const { mkdirSync, writeFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { contar, escribirManifiestoYPs1, escribirPaquete } = await import('./paquete-ola');
  const { embeddingsConCache } = await import('./ola1-cpp');
  const { articulos, notas, pdfSha } = construirCedij(p);
  const filas = articulos.map((a) => a.fila);
  mkdirSync(p.salida, { recursive: true });
  mkdirSync(p.expedienteDir, { recursive: true });
  const legacy = p.legacyDump ? compararLegacyCedij(articulos, p.legacyDump) : null;
  const embeddings = p.sinEmbeddings ? null : await embeddingsConCache(filas, join(p.salida, 'embeddings_cache.jsonl'));
  writeFileSync(join(p.salida, 'rows.jsonl'), filas.map((f) => JSON.stringify(f)).join('\n') + '\n');
  const manifiestoArt = {
    instrumento: p.cfg.normId, ingest_batch: p.cfg.ingestBatch, pdf_fuente: p.pdf.split('/').pop(), pdf_sha256: pdfSha,
    texto_sha256: sha256(filas.map((f) => `${f.num_articulo}\n${f.contenido}`).join('\n\n')), notas_al_pie: notas.length,
    conteos: contar(filas), legacy,
    derogados_con_texto: articulos.filter((a) => a.derogadoConTexto).map((a) => a.fila.num_articulo),
    articulos_detalle: articulos.map((a) => ({
      numero: a.fila.num_articulo, sha256: a.fila.hash_contenido, vigencia: a.fila.clasificacion.vigencia, rol: a.fila.clasificacion.rol ?? 'PRIMARY',
      motivo: a.fila.clasificacion.motivo, constancias: a.constancias.map((c) => ({ nota: c.nota, tipo: c.tipo, decretos: c.decretos })), correcciones: a.correcciones,
    })),
  };
  writeFileSync(join(p.expedienteDir, 'manifiesto_articulos.json'), JSON.stringify(manifiestoArt, null, 2) + '\n');
  writeFileSync(join(p.expedienteDir, 'constancias.csv'), ['articulo,nota,tipo,decretos,texto',
    ...articulos.flatMap((a) => a.constancias.map((c) => [a.fila.num_articulo, c.nota ?? '*', c.tipo, c.decretos.join(' '), `"${c.texto.replace(/"/g, '""')}"`].join(',')))].join('\n') + '\n');
  const resumen = { conteos: contar(filas), notas: notas.length, legacy: legacy ? { ...legacy, texto_bajo_090: legacy.texto_bajo_090.length } : 'sin filas legacy en producción', derogados_con_texto: manifiestoArt.derogados_con_texto, texto_sha256: manifiestoArt.texto_sha256 };
  if (!embeddings) { console.log(JSON.stringify(resumen, null, 2)); console.log('--sin-embeddings: manifiesto y constancias generados; no el paquete SQL.'); return; }
  const { archivos, conteos } = escribirPaquete({ cfg: p.cfg, filas, embeddings, salida: p.salida });
  escribirManifiestoYPs1({ cfg: p.cfg, salida: p.salida, archivos, conteos, pliegoRel: `${p.expedienteDir}/${p.pliego}`, raizRel: '../..',
    extra: { pdf_sha256: pdfSha, texto_sha256: manifiestoArt.texto_sha256, manifiesto_articulos_sha256: sha256(readFileSync(join(p.expedienteDir, 'manifiesto_articulos.json'))) } });
  console.log(JSON.stringify({ ...resumen, archivos: archivos.map((a) => `${a.ruta} ${a.bytes}B ${a.sha256}`) }, null, 2));
}
