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

export interface Segmentacion {
  preambulo: string;
  articulos: ArticuloSegmentado[];
}

const sha = (t: string): string => createHash('sha256').update(t, 'utf8').digest('hex');

/**
 * Un encabezado es «ARTÍCULO N» / «Art. N» al inicio del texto, de una línea o tras un punto/punto y coma/dos puntos, seguido de un
 * delimitador. Una remisión del tipo «conforme al artículo 5 de esta ley» no cumple (minúscula, sin inicio de oración): no parte el texto.
 */
const ENCABEZADO = /(?:^|\n|[.;:]\s+)(ART[ÍI]CULO|Art[íi]culo|Art\.)\s+(\d{1,4}(?:[-.]?[A-Z]\b)?|[ÚU]NICO|[Úú]nico)\s*(?:[.\-–—:)]|[º°])/gu;

export function segmentarArticulos(texto: string): Segmentacion {
  const hallazgos: Array<{ inicio: number; fin: number; numero: string }> = [];
  for (const m of texto.matchAll(ENCABEZADO)) {
    const inicioEncabezado = (m.index ?? 0) + m[0].search(/ART|Art/);
    hallazgos.push({ inicio: inicioEncabezado, fin: (m.index ?? 0) + m[0].length, numero: m[2].toUpperCase().replace('.', '-') });
  }
  const articulos: ArticuloSegmentado[] = hallazgos.map((h, i) => {
    const cuerpo = texto.slice(h.fin, i + 1 < hallazgos.length ? hallazgos[i + 1].inicio : texto.length).trim();
    return { numero: h.numero, ordinal: i + 1, texto: cuerpo, sha256: sha(`${h.numero}\n${cuerpo}`) };
  });
  return { preambulo: texto.slice(0, hallazgos[0]?.inicio ?? texto.length).trim(), articulos };
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
  const vacios = seg.articulos.filter((a) => a.texto.length < 15).map((a) => a.numero);
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
