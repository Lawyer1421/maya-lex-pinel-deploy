/**
 * lib/legal-os/corpus-factory/staging.ts
 * Puente de ingestión: OfficialSourcePackage → hash/procedencia → SEGMENTACIÓN → QA → CANDIDATO DE STAGING → CLO_PENDING.
 * Puro y offline: no toca red, base de datos ni el corpus. El candidato NO es autoritativo (`authoritative: false`, vigencia UNKNOWN):
 * pasar de CLO_PENDING a V4/V5 es una decisión humana del CLO (ver pipeline.ts). Descubrir ≠ verificar ≠ staging ≠ producción.
 */
import { createHash } from 'node:crypto';
import { avanzar, type Actor } from './pipeline';
import { importarPaquetes, type ItemImportacion } from './import-package';
import { validarPaquete, type OfficialSourcePackage } from './official-source-package';
import type { InstrumentRecord } from './schema';

export const AUTOMATION: Actor = { kind: 'AUTOMATION', name: 'corpus-staging' };

// ── Segmentación ─────────────────────────────────────────────────────────────

export interface ArticuloSegmentado {
  numero: string;
  ordinal: number;
  texto: string;
  sha256: string;
}

/** Nota al pie de una edición consolidada («Artículo 1. Reformado mediante Decreto 35-2013…»): NO es un artículo. */
export interface NotaAlPie {
  /** Lo que anota la nota: un artículo («21», «31-B»), un rango («62 a 72») o una división («TITULO», «CAPITULO»). */
  referido: string;
  texto: string;
  sha256: string;
}

export interface Segmentacion {
  preambulo: string;
  articulos: ArticuloSegmentado[];
  /** Notas al pie separadas de los artículos (consolidados que anotan sus reformas). */
  notas: NotaAlPie[];
}

const sha = (t: string): string => createHash('sha256').update(t, 'utf8').digest('hex');

/**
 * Un encabezado es «ARTÍCULO N» / «Art. N» al inicio del texto, de una línea o tras un punto/punto y coma/dos puntos, seguido de un
 * delimitador. Una remisión del tipo «conforme al artículo 5 de esta ley» no cumple (minúscula, sin inicio de oración): no parte el texto.
 * También se acepta (extensión compatible) la grafía «Artículo º 5» con la marca ordinal antes del número y el encabezado que ocupa una línea
 * entera sin puntuación («Articulo º 5⏎Los comerciantes…»), como en el Código de Comercio D.73-50 del Congreso Nacional.
 * Una cita como «…por adición el⏎Artículo 17-A; todos los cuales…» NO es encabezado: el sufijo de letra (-A) sin delimitador propio descarta el número base
 * (antes el motor retrocedía y tomaba «17» con el guion de «17-A» como delimitador, creando un artículo falso).
 * Con la marca ordinal ANTES del número («Articulo º 1432 Desde el momento…») el encabezado vale aunque el cuerpo siga en la misma línea.
 * El salto de página (\f, que pdftotext inserta entre páginas) cuenta como inicio de línea: sin esto se perdía todo encabezado que cae al comienzo de una página.
 */
const ENCABEZADO = /(?:^|\n|\f|[.;:]\s+)(?:(?:ART[ÍI]CULO|Art[íi]culo|Art\.)\s+[º°]\s*(\d{1,4}(?:[-.]?[A-Z]\b)?)(?![-.]?[A-Z]\b)|(?:ART[ÍI]CULO|Art[íi]culo|Art\.)\s+(\d{1,4}(?:[-.]?[A-Z]\b)?|[ÚU]NICO|[Úú]nico)(?![-.]?[A-Z]\b)(?:\s*(?:[.\-–—:)]|[º°])|[ \t]*(?=\r?\n)))/gu;

const VERBO_NOTA = '(?:Reformad[oa]s?|Reforma|Adici[oó]n|Adicionad[oa]s?|Derogad[oa]s?|Derogaci[oó]n|Modificad[oa]s?|Fe de erratas)';
/**
 * Inicio de una NOTA al pie de un consolidado: [número de nota] «Artículo N.» y, a continuación (misma línea o tras líneas en blanco), el verbo de la
 * modificación atribuida a un decreto («Reformado mediante Decreto 35-2013…», «Derogado mediante Decreto 130-2017…»). El cuerpo propio de un artículo
 * derogado («Derogado») no cumple: no cita decreto.
 */
const ATRIBUCION_NOTA = `${VERBO_NOTA}\\b\\.?[^.\\n]{0,80}?\\b(?:mediante|por)\\s+(?:el\\s+)?Decreto\\b`;
/** Tres formas de nota: «Artículo N.» · «Artículos del N al M.» (rango) · «Título|Capítulo|Libro|Sección» (la nota anota una división). */
const INICIO_NOTA = new RegExp(
  `(?:^|\\n)[ \\t]*(?:\\d{1,3}[ \\t]*\\n*[ \\t]*)?(?:Art[ií]culo[ \\t]+(\\d{1,4}(?:-[A-Z])?(?:[ \\t]+inciso[ \\t]+[a-zñ]{1,2}\\))?)|Art[ií]culos[ \\t]+del[ \\t]+(\\d{1,4})[ \\t]+al[ \\t]+(\\d{1,4})|(T[ií]tulo|Cap[ií]tulo|Libro|Secci[oó]n))\\.?[ \\t]*\\n*[ \\t]*(?=${ATRIBUCION_NOTA})`,
  'giu',
);

/**
 * Separa las notas al pie ANTES de segmentar: cada nota termina en la primera línea en blanco, salto de página, línea que contiene solo el número de la
 * nota siguiente o línea que inicia otra nota/encabezado («4 Artículo 21.»). Se quitan del texto (no contaminan los artículos ni crean artículos falsos) y se devuelven aparte, con su artículo referido.
 */
export function separarNotasAlPie(texto: string): { limpio: string; notas: NotaAlPie[] } {
  const notas: NotaAlPie[] = [];
  let limpio = '';
  let cursor = 0;
  for (const m of texto.matchAll(INICIO_NOTA)) {
    const inicio = m.index ?? 0;
    if (inicio < cursor) continue;
    const desdeVerbo = inicio + m[0].length;
    const resto = texto.slice(desdeVerbo);
    let fin = resto.search(/\n[ \t]*\n|\f|\n[ \t]*\d{1,3}[ \t]*(?:\n|$)|\n[ \t]*(?:\d{1,3}[ \t]+)?Art[ií]culo[ \t]+\d/);
    // Una nota partida por una línea en blanco o un salto de página continúa con «(Diario) Oficial La Gaceta No. …» si aún no cita la Gaceta.
    while (fin >= 0 && !/Gaceta\s+No\.?\s*[\d,.]+/i.test(resto.slice(0, fin))) {
      const continuacion = /^\s*(?:Diario\s+)?Oficial\s+La\s+Gaceta[^\n]*/i.exec(resto.slice(fin));
      if (!continuacion) break;
      fin += continuacion[0].length;
    }
    const cuerpo = (fin >= 0 ? resto.slice(0, fin) : resto).replace(/\s+/g, ' ').trim();
    const referido = m[1] ? m[1].toUpperCase() : m[2] ? `${m[2]} a ${m[3]}` : m[4].normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();
    notas.push({ referido, texto: cuerpo, sha256: sha(`${referido}\n${cuerpo}`) });
    limpio += texto.slice(cursor, inicio) + '\n';
    cursor = desdeVerbo + (fin >= 0 ? fin : resto.length);
  }
  limpio += texto.slice(cursor);
  return { limpio, notas };
}

export function segmentarArticulos(texto: string): Segmentacion {
  const { limpio, notas } = separarNotasAlPie(texto);
  const hallazgos: Array<{ inicio: number; fin: number; numero: string }> = [];
  for (const m of limpio.matchAll(ENCABEZADO)) {
    const inicioEncabezado = (m.index ?? 0) + m[0].search(/ART|Art/);
    hallazgos.push({ inicio: inicioEncabezado, fin: (m.index ?? 0) + m[0].length, numero: (m[1] ?? m[2]).toUpperCase().replace('.', '-') });
  }
  const cuerpos = hallazgos.map((h, i) => limpio.slice(h.fin, i + 1 < hallazgos.length ? hallazgos[i + 1].inicio : limpio.length).trim());
  // Encabezado repetido sin cuerpo: «Articulo º 504» seguido de inmediato por «Artículo 504.-La letra…» es el MISMO artículo, no dos. Se funde en el segundo.
  // (Los repetidos con cuerpo propio NO se tocan: son duplicados o errores de numeración de la fuente y deben verse en el QA.)
  const articulos: ArticuloSegmentado[] = [];
  hallazgos.forEach((h, i) => {
    if (i + 1 < hallazgos.length && hallazgos[i + 1].numero === h.numero && cuerpos[i].length < 15) return;
    articulos.push({ numero: h.numero, ordinal: articulos.length + 1, texto: cuerpos[i], sha256: sha(`${h.numero}\n${cuerpos[i]}`) });
  });
  return { preambulo: limpio.slice(0, hallazgos[0]?.inicio ?? limpio.length).trim(), articulos, notas };
}

// ── QA ───────────────────────────────────────────────────────────────────────

export type Severidad = 'BLOCKER' | 'WARNING' | 'INFO';
export interface ChequeoQa {
  id: string;
  severidad: Severidad;
  ok: boolean;
  detalle: string;
}
export interface InformeQa {
  chequeos: ChequeoQa[];
  /** Verdadero si no hay ningún BLOCKER fallido. NO significa «correcto jurídicamente»: solo que el CLO puede revisarlo. */
  apto_para_clo: boolean;
}

const PALABRAS_COMUNES = /\b(de|la|que|el|en|los|las|del|se|por|con|para|una|un)\b/giu;
const TIPOS_ARTICULADOS: ReadonlySet<OfficialSourcePackage['document_type']> = new Set(['LAW', 'DECREE', 'CODE', 'REGULATION']);

export function qaTexto(p: Pick<OfficialSourcePackage, 'extracted_text' | 'text_sha256' | 'document_type' | 'source_domain'>, seg: Segmentacion): InformeQa {
  const t = p.extracted_text;
  const c: ChequeoQa[] = [];
  const add = (id: string, severidad: Severidad, ok: boolean, detalle: string) => c.push({ id, severidad, ok, detalle });

  add('TEXT_NOT_EMPTY', 'BLOCKER', t.trim().length > 0, `${t.trim().length} caracteres`);
  add('HASH_MATCH', 'BLOCKER', sha(t) === p.text_sha256, 'sha256 del texto recalculado contra text_sha256');
  add('ENCODING', 'BLOCKER', !/Ã[¡-¿]|Â[ -¿]|�/.test(t), 'sin mojibake (Ã¡, Â, �)');
  const letras = (t.match(/\p{L}/gu) ?? []).length;
  add('NOT_NOISE', 'BLOCKER', t.length === 0 || letras / t.length >= 0.5, `${t.length ? Math.round((letras / t.length) * 100) : 0} % letras`);
  const palabras = (t.match(/\p{L}+/gu) ?? []).length;
  const comunes = (t.match(PALABRAS_COMUNES) ?? []).length;
  add('LOOKS_SPANISH', 'WARNING', palabras === 0 || (comunes / palabras) * 100 >= 5, `${palabras ? ((comunes / palabras) * 100).toFixed(1) : 0} palabras funcionales por 100`);

  const articulado = TIPOS_ARTICULADOS.has(p.document_type);
  add('ARTICLES_DETECTED', articulado ? 'BLOCKER' : 'INFO', !articulado || seg.articulos.length > 0, `${seg.articulos.length} artículos detectados (tipo ${p.document_type})`);

  // Plausibilidad: un texto largo con muy pocos artículos suele indicar un formato de encabezado que el segmentador no reconoce (no que el
  // instrumento tenga un solo artículo). Aviso para el CLO; no bloquea.
  if (articulado && t.length > 20000 && seg.articulos.length > 0) {
    const promedio = Math.round(t.length / seg.articulos.length);
    add('ARTICLES_PLAUSIBLE', 'WARNING', promedio <= 20000, `${seg.articulos.length} artículos en ${t.length} caracteres (promedio ${promedio} por artículo)${promedio > 20000 ? ': posible formato de encabezado no reconocido' : ''}`);
  }

  const numericos = seg.articulos.map((a) => (/^\d+$/.test(a.numero) ? Number(a.numero) : null));
  const saltos: string[] = [];
  const repetidos: string[] = [];
  const vistos = new Set<string>();
  let previo: number | null = null;
  seg.articulos.forEach((a, i) => {
    if (vistos.has(a.numero)) repetidos.push(a.numero);
    vistos.add(a.numero);
    const n = numericos[i];
    if (n !== null && previo !== null && n !== previo + 1) saltos.push(`${previo}→${n}`);
    if (n !== null) previo = n;
  });
  add('SEQUENCE_CONTINUOUS', 'WARNING', saltos.length === 0, saltos.length ? `saltos: ${saltos.slice(0, 10).join(', ')}${saltos.length > 10 ? ' …' : ''}` : 'numeración continua');
  add('NO_DUPLICATE_NUMBERS', 'WARNING', repetidos.length === 0, repetidos.length ? `repetidos: ${[...new Set(repetidos)].slice(0, 10).join(', ')}` : 'sin repetidos');
  if (seg.notas.length > 0) add('FOOTNOTES_SEPARATED', 'INFO', true, `${seg.notas.length} notas al pie separadas de los artículos (no cuentan como artículos ni como repetidos)`);
  // Un artículo cuyo cuerpo es solo «Derogado» (con o sin número de nota) es un artículo derogado MARCADO así por la edición, no un defecto de extracción.
  const esDerogado = (txt: string): boolean => /^(?:\d{1,3}\s+)?Derogad[oa]s?\s*\d{0,3}\.?$/iu.test(txt.trim());
  const derogados = seg.articulos.filter((a) => a.texto.length < 40 && esDerogado(a.texto)).map((a) => a.numero);
  if (derogados.length > 0) add('DEROGATED_MARKED', 'INFO', true, `${derogados.length} artículos marcados «Derogado» por la propia edición: ${derogados.slice(0, 12).join(', ')}${derogados.length > 12 ? ' …' : ''} (no se declara su vigencia ni su causa)`);
  const vacios = seg.articulos.filter((a) => a.texto.length < 15 && !esDerogado(a.texto)).map((a) => a.numero);
  add('NO_EMPTY_ARTICLES', 'WARNING', vacios.length === 0, vacios.length ? `artículos casi vacíos: ${vacios.slice(0, 10).join(', ')}` : 'ninguno vacío');
  add('NO_PLACEHOLDERS', 'WARNING', !/\[ilegible\]|\(sic\)|\?\?\?|\[…\]/i.test(t), 'sin marcas de ilegibilidad');
  add('FIXTURE', 'INFO', !(p.source_domain.endsWith('.invalid') || /SINT[ÉE]TIC/i.test(t)), 'material sintético/de prueba detectado');
  return { chequeos: c, apto_para_clo: c.every((x) => x.ok || x.severidad !== 'BLOCKER') };
}

// ── Candidato de staging ─────────────────────────────────────────────────────

export type EstadoCandidato = 'QA_FAILED' | 'SOURCE_HOLD' | 'CLO_PENDING';

export interface CandidatoStaging {
  schema_version: 1;
  candidate_id: string;
  destino: 'LEGISLATION';
  estado: EstadoCandidato;
  /** Invariantes de tipo: un candidato nunca es autoridad ni declara vigencia. */
  authoritative: false;
  vigencia: 'UNKNOWN';
  verification: 'PENDING_VERIFICATION';
  fixture: boolean;
  record_id: string;
  version: number;
  source: { url: string; domain: string; tier: number | null; validacion: 'SOURCE_VALIDATED' | 'DISCOVERED_UNVERIFIED'; retriever: string; retrieved_at: string; method: string };
  identidad: { document_name: string; document_type: string; decree: string; gaceta: string; gaceta_date: string };
  hashes: { bytes_sha256: string; text_sha256: string };
  articulos: Array<{ numero: string; ordinal: number; sha256: string; caracteres: number }>;
  /** Notas al pie del consolidado, separadas de los artículos: pendientes de cotejo con las reformas que citan. */
  notas_al_pie: Array<{ referido: string; sha256: string; texto: string }>;
  preambulo_caracteres: number;
  qa: InformeQa;
  siguiente_paso: string;
}

export function construirCandidato(p: OfficialSourcePackage, rec: InstrumentRecord, validacion: 'SOURCE_VALIDATED' | 'DISCOVERED_UNVERIFIED'): { candidato: CandidatoStaging; segmentacion: Segmentacion } {
  const segmentacion = segmentarArticulos(p.extracted_text);
  const qa = qaTexto(p, segmentacion);
  const fixture = !qa.chequeos.find((x) => x.id === 'FIXTURE')!.ok;
  const estado: EstadoCandidato = !qa.apto_para_clo ? 'QA_FAILED' : validacion !== 'SOURCE_VALIDATED' ? 'SOURCE_HOLD' : 'CLO_PENDING';
  const siguiente: Record<EstadoCandidato, string> = {
    QA_FAILED: 'Corregir el paquete (ver chequeos BLOCKER) y reenviarlo; no llega al CLO.',
    SOURCE_HOLD: 'La fuente no está en el registro de fuentes oficiales verificadas: verificar el dominio (registro) antes de que el CLO adjudique el texto.',
    CLO_PENDING: 'Entregar la hoja de verificación al CLO. Solo una persona puede pasar a V4/V5 con aprobación registrada.',
  };
  return {
    segmentacion,
    candidato: {
      schema_version: 1,
      candidate_id: `${rec.id}@v${rec.version}`,
      destino: 'LEGISLATION',
      estado,
      authoritative: false,
      vigencia: 'UNKNOWN',
      verification: 'PENDING_VERIFICATION',
      fixture,
      record_id: rec.id,
      version: rec.version,
      source: { url: p.source_url, domain: p.source_domain, tier: rec.source_tier, validacion, retriever: p.retriever, retrieved_at: p.retrieved_at, method: p.retrieval_method },
      identidad: { document_name: p.document_name, document_type: p.document_type, decree: p.decree, gaceta: p.gaceta, gaceta_date: p.gaceta_date },
      hashes: { bytes_sha256: p.bytes_sha256, text_sha256: p.text_sha256 },
      articulos: segmentacion.articulos.map((a) => ({ numero: a.numero, ordinal: a.ordinal, sha256: a.sha256, caracteres: a.texto.length })),
      notas_al_pie: segmentacion.notas.map((n) => ({ referido: n.referido, sha256: n.sha256, texto: n.texto })),
      preambulo_caracteres: segmentacion.preambulo.length,
      qa,
      siguiente_paso: siguiente[estado],
    },
  };
}

/** Hoja de verificación para el CLO. No contiene decisión: las casillas quedan vacías y el CLO firma con nombre y fecha. */
export function hojaClo(c: CandidatoStaging): string {
  const L = [
    `# Hoja de verificación CLO — ${c.identidad.document_name} (${c.candidate_id})`,
    '',
    `> **ESTADO: ${c.estado}${c.fixture ? ' · MATERIAL DE PRUEBA (FIXTURE)' : ''}.** Esta hoja no aprueba nada. \`authoritative: false\` · vigencia: UNKNOWN · verificación: PENDING_VERIFICATION.`,
    '',
    '## 1. Procedencia (a confirmar por el CLO)',
    `- URL: ${c.source.url} · dominio: ${c.source.domain} · validación de dominio: **${c.source.validacion}** · tier concedido: ${c.source.tier ?? '—'}`,
    `- Obtenido por: ${c.source.retriever} (${c.source.method}) el ${c.source.retrieved_at}`,
    `- Decreto: ${c.identidad.decree} · Gaceta: ${c.identidad.gaceta} · Fecha de Gaceta: ${c.identidad.gaceta_date}  _(UNKNOWN = el paquete no lo aportó; no se infiere)_`,
    `- sha256 del archivo original: \`${c.hashes.bytes_sha256}\``,
    `- sha256 del texto: \`${c.hashes.text_sha256}\``,
    '',
    '## 2. Chequeos automáticos de QA',
    '| Chequeo | Severidad | Resultado | Detalle |',
    '|---|---|---|---|',
    ...c.qa.chequeos.map((x) => `| ${x.id} | ${x.severidad} | ${x.ok ? 'OK' : 'FALLA'} | ${x.detalle.replace(/\|/g, '/')} |`),
    '',
    `## 3. Estructura detectada: ${c.articulos.length} artículos`,
    c.articulos.length ? `Primero: ${c.articulos[0].numero} · último: ${c.articulos[c.articulos.length - 1].numero}. (Tabla completa en el JSON del candidato.)` : 'Ninguno.',
    ...(c.notas_al_pie?.length ? [`Notas al pie del consolidado separadas de los artículos: ${c.notas_al_pie.length} (en el JSON del candidato; el CLO las coteja con las reformas que citan).`] : []),
    '',
    '## 4. Decisión del CLO (solo una persona)',
    '- [ ] Identidad del instrumento confirmada (título, decreto, Gaceta, fecha)',
    '- [ ] Texto contrastado con el original oficial (no solo con este extracto)',
    '- [ ] Reformas y derogaciones registradas (o declaradas desconocidas)',
    '- [ ] V4   - [ ] V5   - [ ] RECHAZADO',
    '',
    'Nombre: ______________________   Fecha: ____-__-__   Enlace de la decisión: ______________________',
    '',
    `**Siguiente paso:** ${c.siguiente_paso}`,
  ];
  return `${L.join('\n')}\n`;
}

// ── Lote ─────────────────────────────────────────────────────────────────────

export interface ItemLote {
  archivo: string;
  importacion: ItemImportacion['estado'];
  destino: ItemImportacion['destino'];
  candidato: CandidatoStaging | null;
  /** Para jurisprudencia: nunca entra al flujo de legislación. */
  jurisprudencia_id: string | null;
  razones: string[];
}

export interface ResultadoLote {
  items: ItemLote[];
  records: InstrumentRecord[];
  candidatos: CandidatoStaging[];
  hojas: Record<string, string>;
}

/** Avanza el registro con el actor AUTOMATION hasta el paso que la automatización puede dar (QA, y HUMAN_VERIFICATION solo si CLO_PENDING). */
function avanzarHasta(rec: InstrumentRecord, meta: EstadoCandidato): InstrumentRecord {
  const ruta: InstrumentRecord['ingestion_state'][] = ['DUPLICATE_CHECK', 'EXTRACT', 'NORMALIZE', 'SEGMENT', 'ARTICLE_DETECTION', 'METADATA', 'REFORM_LINKING', 'VALIDITY_CANDIDATE', 'QA'];
  if (meta === 'CLO_PENDING') ruta.push('HUMAN_VERIFICATION');
  let cur = rec;
  for (const paso of ruta) {
    const r = avanzar(cur, paso, AUTOMATION);
    if (!r.ok) break;
    cur = r.valor;
  }
  return cur;
}

export function procesarLote(entradas: ReadonlyArray<{ archivo: string; contenido: unknown }>, existentes: readonly InstrumentRecord[] = [], opts: { now?: Date } = {}): ResultadoLote {
  const lote = importarPaquetes(entradas, existentes, opts);
  const records = [...lote.records];
  const items: ItemLote[] = [];
  const candidatos: CandidatoStaging[] = [];
  const hojas: Record<string, string> = {};

  lote.items.forEach((it, i) => {
    const base: ItemLote = { archivo: it.archivo, importacion: it.estado, destino: it.destino, candidato: null, jurisprudencia_id: null, razones: it.razones };
    if (it.destino === 'JURISPRUDENCE_RECORD') {
      items.push({ ...base, jurisprudencia_id: it.recordId, razones: [...it.razones, 'Jurisprudencia: corpus separado; faltan tribunal/sala/caso/fecha/estado público, que completa una persona.'] });
      return;
    }
    if (it.destino !== 'CORPUS_RECORD' || !it.recordId || it.version === null) {
      items.push(base);
      return;
    }
    const v = validarPaquete(entradas[i].contenido, opts);
    if (v.estado === 'REJECTED') {
      items.push(base);
      return;
    }
    const idx = records.findIndex((r) => r.id === it.recordId && r.version === it.version);
    if (idx < 0) {
      items.push(base);
      return;
    }
    const { candidato } = construirCandidato(v.paquete, records[idx], v.estado);
    records[idx] = avanzarHasta({ ...records[idx], notes: [...records[idx].notes, `STAGING: ${candidato.estado}`] }, candidato.estado);
    candidatos.push(candidato);
    hojas[candidato.candidate_id] = hojaClo(candidato);
    items.push({ ...base, candidato });
  });
  return { items, records, candidatos, hojas };
}

export function informeLoteMd(r: ResultadoLote): string {
  const n = (e: EstadoCandidato) => r.candidatos.filter((c) => c.estado === e).length;
  const L = [
    '# Informe de lote de staging',
    '',
    `Paquetes: ${r.items.length} · CLO_PENDING: ${n('CLO_PENDING')} · SOURCE_HOLD: ${n('SOURCE_HOLD')} · QA_FAILED: ${n('QA_FAILED')} · jurisprudencia (corpus aparte): ${r.items.filter((i) => i.destino === 'JURISPRUDENCE_RECORD').length} · rechazados: ${r.items.filter((i) => i.importacion === 'REJECTED').length} · duplicados: ${r.items.filter((i) => i.importacion === 'DUPLICATE').length}`,
    '',
    '> Ningún candidato es autoridad ni queda verificado. CLO_PENDING = listo para que una persona lo adjudique. Nada se escribió en bases de datos ni en el corpus.',
    '',
    '| Archivo | Importación | Estado | Artículos | Notas |',
    '|---|---|---|---:|---|',
    ...r.items.map((i) => `| ${i.archivo} | ${i.importacion} | ${i.candidato?.estado ?? (i.destino === 'JURISPRUDENCE_RECORD' ? 'JURISPRUDENCIA' : '—')} | ${i.candidato?.articulos.length ?? '—'} | ${i.razones.join('; ').replace(/\|/g, '/')} |`),
  ];
  return `${L.join('\n')}\n`;
}
