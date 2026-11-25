/**
 * scripts/olas/ola1-cpp.ts
 * OLA 1 — HN:CODIGO_PROCESAL_PENAL (Decreto 9-99-E, edición consolidada CEDIJ «Codigo Procesal Penal (2024).pdf»).
 *
 * Reutiliza el extractor validado scripts/ingesta-cpp.ts (notas al pie secuenciales, límites reales de artículo, fail-hard por fragmento,
 * derogados con su cita) y le añade lo que exige el estándar V5 de A03/D35/D284:
 *   1. SANEAMIENTO DETERMINISTA, registrado artículo por artículo: quita las llamadas de nota pegadas al encabezado o al texto (solo números
 *      de notas que anotan ESE artículo), saca del cuerpo las notas con asterisco y las guarda como constancia, y une las líneas cortadas por
 *      la maquetación del PDF (respetando párrafos y numerales). El encabezado «Artículo N.» se retira como en A03 (va en num_articulo).
 *   2. INTEGRIDAD fail-hard: 447 artículos base sin huecos + bis exigidos, sin llamadas de nota residuales, asteriscos, caracteres de control,
 *      mojibake, marcas de página ni cierres sin puntuación fuera de la lista verificada; sha256(UTF-8) por fila.
 *   3. CONSTANCIAS: cada una de las 78 notas al pie se tipifica (reforma, adición, derogación total/parcial, interpretación auténtica
 *      vigente o sin efecto, reforma tácita, cambio institucional) y se liga a sus artículos.
 *   4. CLASIFICACIÓN ESTRICTA PROPUESTA (la decide el CLO en el pliego): derogado → CONTEXT/false; reforma tácita sin texto actualizado →
 *      CONTEXT/true; resto vigente → PRIMARY. Ninguna fila llega a V4/V5 sin la firma D1–D8.
 *   5. COMPARACIÓN con las 480 filas legacy de producción (mayalex_normativos:cpp_1999_a*), que este lote sustituye ocultándolas (no borrándolas).
 *
 * OFFLINE salvo el modelo de embeddings local (Xenova/multilingual-e5-small, caché en disco). Sin Supabase ni claves.
 * Uso: npx tsx scripts/olas/ola1-cpp.ts [--legacy <volcado_hashes_prod.txt>] [--sin-embeddings]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ejecutarPipelineCompleto, PDF_FUENTE, FUENTE_CANONICA, DECRETO, EDICION_FUENTE, type NotaAlPie } from '../ingesta-cpp';
import { normalizarNumeroArticulo } from '../../lib/legal-retrieval/clo-guards';
import { contar, escribirManifiestoYPs1, escribirPaquete, sha256, type Clasificacion, type ConfigOla, type FilaOla } from './paquete-ola';

export const CFG: ConfigOla = {
  ola: 'OLA1',
  normId: 'HN:CODIGO_PROCESAL_PENAL',
  instrumentoId: 'CODIGO_PROCESAL_PENAL',
  ingestBatch: 'OLA1_CPP_2024_01',
  fechaCorte: '2026-11-24',
  adjudicacion: 'EXPEDIENTE_AUDITORIA_CPP_OLA1.md (D1–D8)',
  legacy: {
    condicion: "b.metadata->>'norm_id' = 'HN_CODIGO_PROCESAL_PENAL' AND b.id LIKE 'mayalex_normativos:cpp_1999_a%'",
    esperadas: 480,
    descripcion: 'carga legacy HN_CODIGO_PROCESAL_PENAL sin estado_v, ids mayalex_normativos:cpp_1999_a*',
  },
};
export const SALIDA = 'out/ola1-cpp';
export const EXPEDIENTE_DIR = 'docs/corpus/staging/2026-11-24-hn-cpp-ola1';
const ARTS_SIN_CIERRE_VERIFICADOS = new Set(['348']); // ver validarFragmentoFailHard en ingesta-cpp.ts

// ── Constancias ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export type TipoConstancia =
  | 'REFORMA' | 'ADICION' | 'DEROGACION_TOTAL' | 'DEROGACION_PARCIAL' | 'INTERPRETACION_AUTENTICA' | 'INTERPRETACION_SIN_EFECTO'
  | 'REFORMA_TACITA' | 'CAMBIO_INSTITUCIONAL' | 'NOTA_ASTERISCO';
export interface Constancia { nota: number | null; tipo: TipoConstancia; texto: string; decretos: string[] }

export function tipificarNota(texto: string): TipoConstancia {
  if (/sin valor y efecto/i.test(texto)) return 'INTERPRETACION_SIN_EFECTO';
  if (/Interpreta/i.test(texto)) return 'INTERPRETACION_AUTENTICA';
  if (/t[aá]citamente/i.test(texto)) return 'REFORMA_TACITA';
  if (/Se suprime/i.test(texto)) return 'CAMBIO_INSTITUCIONAL';
  if (/numeral\s+\d+\)?\s+derogad|derogaci[oó]n del p[aá]rrafo/i.test(texto)) return 'DEROGACION_PARCIAL';
  if (/Derogad/i.test(texto)) return 'DEROGACION_TOTAL';
  if (/Adicionad|Adici[oó]n/i.test(texto) && !/Reformad/i.test(texto)) return 'ADICION';
  return 'REFORMA';
}
/**
 * Efectos posteriores verificados en La Gaceta que la edición CEDIJ no anotó. Resolución del CLO (2026-11-24): la interpretación auténtica
 * del art. 274 (art. 9 del D.93-2021) quedó sin efecto porque el art. 4 del D.43-2023 (Gaceta No. 36,290, 25-jul-2023) derogó ese art. 9.
 * La nota de la edición se conserva, retipificada, y se añade la constancia de la derogación.
 */
export const EFECTOS_POSTERIORES: ReadonlyArray<{ articulo: string; de: TipoConstancia; decretoAfectado: string; a: TipoConstancia; constancia: Constancia }> = [
  {
    articulo: '274', de: 'INTERPRETACION_AUTENTICA', decretoAfectado: '93-2021', a: 'INTERPRETACION_SIN_EFECTO',
    constancia: {
      nota: null, tipo: 'INTERPRETACION_SIN_EFECTO', decretos: ['43-2023', '93-2021'],
      texto: 'Interpretación sin efecto: derogada por el art. 4 del Decreto No. 43-2023 (Gaceta No. 36,290, 25 de julio de 2023), que deroga el art. 9 del Decreto No. 93-2021, contentivo de la interpretación del párrafo tercero de este artículo. Resolución del CLO del 2026-11-24.',
    },
  },
];

export function aplicarEfectosPosteriores(numero: string, constancias: Constancia[]): Constancia[] {
  const efectos = EFECTOS_POSTERIORES.filter((e) => e.articulo === numero);
  if (!efectos.length) return constancias;
  const out = constancias.map((c) => ({ ...c }));
  for (const e of efectos) {
    const afectadas = out.filter((c) => c.tipo === e.de && c.decretos.includes(e.decretoAfectado));
    if (afectadas.length !== 1) throw new Error(`art. ${numero}: se esperaba 1 constancia ${e.de} del D.${e.decretoAfectado} y hay ${afectadas.length}`);
    afectadas[0].tipo = e.a;
    out.push(e.constancia);
  }
  return out;
}

export const decretosDe = (t: string) => [...new Set([...t.matchAll(/Decreto\s+(?:Ejecutivo\s+N[uú]mero\s+|No\.?\s*)?([A-Z]{0,4}-?\d{1,3}-\d{4}|\d{1,3}-\d{4})/gi)].map((m) => m[1]))];

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function expandirRango(desde: string, hasta: string): string[] {
  const a = /^(\d+)(?:-([A-Z]))?$/.exec(desde)!, b = /^(\d+)(?:-([A-Z]))?$/.exec(hasta)!;
  if (a[2] && b[2] && a[1] === b[1]) return LETRAS.slice(LETRAS.indexOf(a[2]), LETRAS.indexOf(b[2]) + 1).split('').map((l) => `${a[1]}-${l}`);
  const out: string[] = [];
  for (let n = Number(a[1]); n <= Number(b[1]); n++) out.push(String(n));
  return out;
}

/** Artículos a los que se refiere cada nota. Las que no nombran artículo se resuelven por regla explícita (y si no, falla). */
export function articulosDeNota(nota: NotaAlPie, contenidos: ReadonlyMap<string, string>): string[] {
  const t = nota.texto.replace(/^\d+\s+/, '');
  const rango = /Art[ií]culos\s+(\d+(?:-[A-Z])?)\s+al\s+(\d+(?:-[A-Z])?)/.exec(t);
  if (rango) return expandirRango(rango[1], rango[2]);
  const uno = /^Art[ií]culos?\s+(\d+(?:-[A-Z])?)\b/.exec(t);
  if (uno) return [uno[1]];
  if (/^Se suprime la Direcci[oó]n Nacional de Investigaci[oó]n Criminal/.test(t)) {
    return [...contenidos].filter(([, c]) => /Investigaci[oó]n Criminal|DNIC/.test(c)).map(([n]) => n);
  }
  if (/DERECHO PREMIAL/.test(t)) return expandirRango('402-A', '402-G');
  throw new Error(`nota ${nota.num} sin artículo identificable: ${t.slice(0, 80)}`);
}

// ── Saneamiento ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface Correccion { tipo: 'LLAMADA_EN_ENCABEZADO' | 'LLAMADA_EN_TEXTO' | 'NOTA_ASTERISCO_EXTRAIDA' | 'ASTERISCO_EN_TEXTO' | 'REFLUJO_DE_LINEAS'; detalle: string }

const ES_ITEM = /^(?:\d{1,2}\)|[a-zñ]{1,2}\)|[IVXL]+\.|[-•])\s/;

/** Une líneas cortadas por la maquetación dentro de cada párrafo; conserva párrafos y el inicio de numerales/literales en línea propia. */
export function refluir(texto: string): string {
  return texto.split(/\n{2,}/).map((p) => p.split('\n').map((l) => l.trim()).filter(Boolean)
    .reduce((acc, l) => (acc === '' ? l : ES_ITEM.test(l) ? `${acc}\n${l}` : `${acc} ${l}`), '')).filter(Boolean).join('\n\n');
}

export function sanear(numero: string, crudo: string, notasDelArticulo: ReadonlySet<number>): { contenido: string; correcciones: Correccion[]; asteriscos: string[] } {
  const correcciones: Correccion[] = [];
  const asteriscos: string[] = [];
  // Variantes reales de la edición: «26-A.», «127-A.-16», «219.-A.», «311.50, 51», «9. 1».
  const [base, letra] = numero.split('-');
  const num = letra ? `${base}\\.?-?\\s?${letra}` : base;
  const cab = new RegExp(`^Art[ií]culos?\\s*${num}\\.?-?\\s*((?:\\d{1,2}\\s*,\\s*)*\\d{1,2})?\\s*(?=\\S)`);
  const m = cab.exec(crudo);
  if (!m) throw new Error(`art. ${numero}: no empieza con su encabezado «Artículo ${numero}.»`);
  if (m[1]) {
    const llamadas = m[1].split(',').map((x) => Number(x.trim()));
    const ajenas = llamadas.filter((n) => !notasDelArticulo.has(n));
    if (ajenas.length) throw new Error(`art. ${numero}: número(s) ${ajenas.join(', ')} tras el encabezado que no son notas de este artículo`);
    correcciones.push({ tipo: 'LLAMADA_EN_ENCABEZADO', detalle: `retiradas llamadas de nota ${llamadas.join(', ')} de «${m[0].trim()}»` });
  }
  let t = crudo.slice(m[0].length);
  // Párrafos de nota con asterisco: fuera del cuerpo, a constancia.
  t = t.split(/\n{2,}/).filter((p) => {
    if (!p.trimStart().startsWith('*')) return true;
    const nota = p.replace(/\s+/g, ' ').replace(/^\s*\*\s*/, '').trim();
    asteriscos.push(nota);
    correcciones.push({ tipo: 'NOTA_ASTERISCO_EXTRAIDA', detalle: `nota con asterisco retirada del cuerpo: «${nota.slice(0, 90)}…»` });
    return false;
  }).join('\n\n');
  t = t.replace(/\*(?=[A-ZÁÉÍÓÚÑ])/g, () => { correcciones.push({ tipo: 'ASTERISCO_EN_TEXTO', detalle: 'retirado asterisco de llamada antes de una palabra' }); return ''; });
  t = t.replace(/([;:.)”"])(\d{1,2})(?=\s|$)/gm, (todo, p: string, n: string) => {
    if (!notasDelArticulo.has(Number(n))) return todo;
    correcciones.push({ tipo: 'LLAMADA_EN_TEXTO', detalle: `retirada llamada de nota ${n} tras «${p}»` });
    return p;
  });
  const reflujo = refluir(t);
  if (reflujo !== t.trim()) correcciones.push({ tipo: 'REFLUJO_DE_LINEAS', detalle: `${t.split('\n').length - reflujo.split('\n').length} saltos de línea de maquetación unidos` });
  return { contenido: reflujo.normalize('NFC'), correcciones, asteriscos };
}

/** Comprobaciones fail-hard sobre el contenido ya saneado. Devuelve la lista de problemas (vacía = íntegro). */
export function problemasDeIntegridad(numero: string, contenido: string, esDerogado: boolean): string[] {
  const p: string[] = [];
  if (contenido.length < (esDerogado ? 7 : 20)) p.push(`contenido demasiado corto (${contenido.length})`);
  if (/^Art[ií]culo/i.test(contenido)) p.push('encabezado residual');
  if (/[;:.)”"]\d{1,2}(?=\s|$)/m.test(contenido)) p.push('llamada de nota residual');
  if (/\*/.test(contenido)) p.push('asterisco residual');
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F�\r]|Ã[¡-¿]|Â[ -¿]/.test(contenido)) p.push('caracteres de control o mojibake');
  if (/^\s*\d{1,3}\s*$|-- \d+ of \d+ --|P[áa]gina\s+\d+\s+de\s+\d+/m.test(contenido)) p.push('marca de página');
  if (/\n{3,}| {2,}/.test(contenido)) p.push('espaciado anómalo');
  if (/[a-záéíóúñ]-\s[a-záéíóúñ]/.test(contenido)) p.push('posible palabra partida por guion');
  if (!esDerogado && !ARTS_SIN_CIERRE_VERIFICADOS.has(numero) && !/[.;:)”"»]$/.test(contenido)) p.push('termina sin puntuación de cierre');
  if (esDerogado && !/^Derogad[oa]\.?$/.test(contenido)) p.push('derogado con texto inesperado');
  return p;
}

// ── Clasificación ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const MOTIVO_D1 = 'edición consolidada CEDIJ (Poder Judicial) con reformas integradas; cotejo con La Gaceta pendiente (D1)';
export function clasificar(esDerogado: boolean, constancias: readonly Constancia[]): Clasificacion {
  const tipos = new Set(constancias.map((c) => c.tipo));
  if (esDerogado) {
    const c = constancias.find((x) => x.tipo === 'DEROGACION_TOTAL');
    return { vigencia: 'DEROGADO', rol: 'CONTEXT', motivo: `DEROGADO: ${c ? c.decretos.join(', ') || 'nota de la edición' : 'marcado «Derogado» por la edición'}` };
  }
  if (tipos.has('REFORMA_TACITA')) return { vigencia: 'VIGENTE', rol: 'CONTEXT', motivo: 'REFORMA_TACITA: el texto consolidado no incorpora la reforma tácita anotada; CONTEXT hasta dictamen del CLO (D5)' };
  if (tipos.has('INTERPRETACION_AUTENTICA')) return { vigencia: 'VIGENTE', rol: null, motivo: `PRIMARY elegible con interpretación auténtica vigente anotada; ${MOTIVO_D1}` };
  return { vigencia: 'VIGENTE', rol: null, motivo: `PRIMARY elegible: ${MOTIVO_D1}` };
}

// ── Pipeline ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface ArticuloOla { fila: FilaOla; constancias: Constancia[]; correcciones: Correccion[]; hashFuenteLegacy: string; idLegacy: string; ordinal: number }

export function construirOla(): { articulos: ArticuloOla[]; notas: NotaAlPie[]; pdfSha: string } {
  const pdfSha = sha256(readFileSync(PDF_FUENTE));
  const r = ejecutarPipelineCompleto();
  const contenidos = new Map(r.registros.map((x) => [x.num_articulo, x.contenido]));
  const notasPorArt = new Map<string, Constancia[]>();
  const asignadas = new Set<number>();
  for (const n of r.notas) {
    const texto = n.texto.replace(/^\d+\s+/, '');
    for (const art of articulosDeNota(n, contenidos)) {
      if (!contenidos.has(art)) throw new Error(`nota ${n.num} apunta al art. ${art}, que no existe en la segmentación`);
      asignadas.add(n.num);
      const previas = notasPorArt.get(art) ?? [];
      // La edición repite la misma nota (p. ej. DNIC→DPI, notas 20, 26, 41–45): una sola constancia por texto, con la primera llamada.
      if (!previas.some((c) => c.texto === texto)) notasPorArt.set(art, [...previas, { nota: n.num, tipo: tipificarNota(texto), texto, decretos: decretosDe(texto) }]);
    }
  }
  const sinUso = r.notas.filter((n) => !asignadas.has(n.num));
  if (sinUso.length) throw new Error(`notas sin artículo asignado: ${sinUso.map((n) => n.num).join(', ')}`);

  // Numeración: 1..447 sin huecos ni repetidos.
  const base = r.registros.filter((x) => /^\d+$/.test(x.num_articulo)).map((x) => Number(x.num_articulo));
  if (base.length !== 447 || base.some((n, i) => n !== i + 1)) throw new Error('numeración base distinta de 1..447 consecutivos');

  const problemas: string[] = [];
  const articulos = r.registros.map((reg, i): ArticuloOla => {
    const numero = reg.num_articulo;
    const constancias = aplicarEfectosPosteriores(numero, notasPorArt.get(numero) ?? []);
    const llamadas = new Set(r.notas.filter((n) => articulosDeNota(n, contenidos).includes(numero)).map((n) => n.num));
    const { contenido, correcciones, asteriscos } = sanear(numero, reg.contenido, llamadas);
    for (const a of asteriscos) constancias.push({ nota: null, tipo: 'NOTA_ASTERISCO', texto: a, decretos: decretosDe(a) });
    const esDerogado = !reg.es_norma_vigente;
    for (const pr of problemasDeIntegridad(numero, contenido, esDerogado)) problemas.push(`art. ${numero}: ${pr}`);
    const clasificacion = clasificar(esDerogado, constancias);
    const fila: FilaOla = {
      id: `${CFG.ingestBatch}:${CFG.instrumentoId}:${numero}`,
      coleccion: 'mayalex_normativos', materia: '01_PENAL', contenido, num_articulo: numero, fuente: FUENTE_CANONICA,
      metadata: {
        norm_id: CFG.normId, instrumento_id: CFG.instrumentoId, ingest_batch: CFG.ingestBatch, ola: CFG.ola, ordinal: i + 1, decreto: DECRETO,
        texto_origen: 'PDF_CONSOLIDADO_CEDIJ_SANEADO', edicion_fuente: EDICION_FUENTE, pdf_sha256: pdfSha,
        fragmento_fuente_sha256: reg.metadata.hash_texto_sha256, article_sha256: sha256(contenido),
        constancias, correcciones_saneamiento: correcciones.map((c) => c.tipo),
        sustituye_id_legacy: reg.id, ...(esDerogado ? { derogado_por: reg.metadata.derogado_por } : {}),
      },
      jurisdiccion: 'HN', fuente_tipo: 'codigo', instrumento_id: CFG.instrumentoId, num_articulo_norm: normalizarNumeroArticulo(numero),
      hash_contenido: sha256(contenido), ingest_batch: CFG.ingestBatch, clasificacion,
    };
    return { fila, constancias, correcciones, hashFuenteLegacy: reg.metadata.hash_texto_sha256 as string, idLegacy: reg.id, ordinal: i + 1 };
  });
  if (problemas.length) throw new Error(`integridad: ${problemas.length} problema(s)\n  ${problemas.join('\n  ')}`);
  return { articulos, notas: r.notas, pdfSha };
}

/** Volcado de prod (id|hash_texto_sha256|es_norma_vigente|hash_contenido por línea, envuelto en el JSON del conector) → mapa por id. */
export function leerLegacy(ruta: string): Map<string, { hash: string; vigente: string }> {
  const crudo = readFileSync(ruta, 'utf8');
  const m = /"h\\?":\\?"([\s\S]*?)\\?"\}\]/.exec(crudo);
  const cuerpo = (m ? m[1] : crudo).replace(/\\\\n|\\n/g, '\n');
  const out = new Map<string, { hash: string; vigente: string }>();
  for (const l of cuerpo.split('\n')) {
    const [id, hash, vigente] = l.split('|');
    if (id?.startsWith('mayalex_normativos:cpp_1999_a')) out.set(id, { hash, vigente });
  }
  return out;
}

export async function embeddingsConCache(filas: readonly FilaOla[], rutaCache: string): Promise<Map<string, number[]>> {
  const cache = new Map<string, number[]>();
  if (existsSync(rutaCache)) for (const l of readFileSync(rutaCache, 'utf8').split('\n').filter(Boolean)) { const x = JSON.parse(l); cache.set(`${x.id}|${x.hash}`, x.embedding); }
  const faltan = filas.filter((f) => !cache.has(`${f.id}|${f.hash_contenido}`));
  if (faltan.length) {
    const { pipeline } = await import('@xenova/transformers');
    const extractor = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', { quantized: false } as never);
    let k = 0;
    for (const f of faltan) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = await (extractor as any)(`passage: ${f.contenido}`, { pooling: 'mean', normalize: true });
      cache.set(`${f.id}|${f.hash_contenido}`, Array.from(s.data as Float32Array));
      if (++k % 50 === 0) console.log(`  embeddings ${k}/${faltan.length}`);
    }
    writeFileSync(rutaCache, filas.map((f) => JSON.stringify({ id: f.id, hash: f.hash_contenido, embedding: cache.get(`${f.id}|${f.hash_contenido}`) })).join('\n') + '\n');
  }
  return new Map(filas.map((f) => [f.id, cache.get(`${f.id}|${f.hash_contenido}`)!]));
}

async function main(): Promise<void> {
  const iLegacy = process.argv.indexOf('--legacy');
  const { articulos, notas, pdfSha } = construirOla();
  const filas = articulos.map((a) => a.fila);
  mkdirSync(SALIDA, { recursive: true });
  mkdirSync(EXPEDIENTE_DIR, { recursive: true });

  let legacy: ReturnType<typeof compararLegacy> | null = null;
  if (iLegacy !== -1) legacy = compararLegacy(articulos, leerLegacy(process.argv[iLegacy + 1]));

  const embeddings = process.argv.includes('--sin-embeddings') ? null : await embeddingsConCache(filas, join(SALIDA, 'embeddings_cache.jsonl'));
  writeFileSync(join(SALIDA, 'rows.jsonl'), filas.map((f) => JSON.stringify(f)).join('\n') + '\n');
  const manifiestoArt = {
    instrumento: CFG.normId, ingest_batch: CFG.ingestBatch, pdf_fuente: PDF_FUENTE.split('/').pop(), pdf_sha256: pdfSha,
    texto_sha256: sha256(filas.map((f) => `${f.num_articulo}\n${f.contenido}`).join('\n\n')), notas_al_pie: notas.length,
    conteos: contar(filas), legacy,
    articulos_detalle: articulos.map((a) => ({
      numero: a.fila.num_articulo, ordinal: a.ordinal, sha256: a.fila.hash_contenido, vigencia: a.fila.clasificacion.vigencia,
      rol: a.fila.clasificacion.rol ?? 'PRIMARY', motivo: a.fila.clasificacion.motivo, constancias: a.constancias.map((c) => ({ nota: c.nota, tipo: c.tipo, decretos: c.decretos })),
      correcciones: a.correcciones, id_legacy: a.idLegacy,
    })),
  };
  writeFileSync(join(EXPEDIENTE_DIR, 'manifiesto_articulos.json'), JSON.stringify(manifiestoArt, null, 2) + '\n');
  writeFileSync(join(EXPEDIENTE_DIR, 'constancias.csv'), ['articulo,nota,tipo,decretos,texto',
    ...articulos.flatMap((a) => a.constancias.map((c) => [a.fila.num_articulo, c.nota ?? '*', c.tipo, c.decretos.join(' '), `"${c.texto.replace(/"/g, '""')}"`].join(',')))].join('\n') + '\n');

  if (!embeddings) { console.log('--sin-embeddings: se generó el manifiesto y las constancias; no el paquete SQL.'); return; }
  const { archivos, conteos } = escribirPaquete({ cfg: CFG, filas, embeddings, salida: SALIDA });
  escribirManifiestoYPs1({ cfg: CFG, salida: SALIDA, archivos, conteos, pliegoRel: `${EXPEDIENTE_DIR}/EXPEDIENTE_AUDITORIA_CPP_OLA1.md`, raizRel: '../..',
    extra: { pdf_sha256: pdfSha, texto_sha256: manifiestoArt.texto_sha256, manifiesto_articulos_sha256: sha256(readFileSync(join(EXPEDIENTE_DIR, 'manifiesto_articulos.json'))) } });
  console.log(JSON.stringify({ conteos, legacy: legacy && { ...legacy, distintos: legacy.distintos.length }, archivos: archivos.map((a) => `${a.ruta} ${a.bytes}B ${a.sha256}`) }, null, 2));
}

export function compararLegacy(articulos: readonly ArticuloOla[], legacy: ReadonlyMap<string, { hash: string; vigente: string }>) {
  const distintos: string[] = [];
  let mismoFragmento = 0, mismaVigencia = 0;
  for (const a of articulos) {
    const l = legacy.get(a.idLegacy);
    if (!l) { distintos.push(`${a.fila.num_articulo}: sin fila legacy`); continue; }
    if (l.hash === a.hashFuenteLegacy) mismoFragmento++; else distintos.push(`${a.fila.num_articulo}: fragmento fuente distinto`);
    if ((l.vigente === 'true') === (a.fila.clasificacion.vigencia === 'VIGENTE')) mismaVigencia++;
  }
  return { filas_legacy: legacy.size, mismo_fragmento_fuente: mismoFragmento, misma_vigencia: mismaVigencia, distintos };
}

if (process.argv[1]?.endsWith('ola1-cpp.ts')) main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
