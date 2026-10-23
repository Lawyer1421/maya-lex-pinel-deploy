/**
 * lib/legal-os/corpus-factory/import-package.ts
 * Convierte paquetes de fuente oficial VALIDADOS en registros del Corpus Factory (o de jurisprudencia). Puro y offline.
 * Todo registro nace PENDING_VERIFICATION/UNVERIFIED y en la etapa HASH (los hashes ya se comprobaron): V4/V5 son humanos.
 */
import { JurisprudenceRecordSchema, type JurisprudenceRecord } from '../jurisprudence';
import { registrarVersion } from './pipeline';
import { registroVacio, type InstrumentRecord } from './schema';
import { validarPaquete, type MotivoRechazoPaquete, type OfficialSourcePackage, type OpcionesValidacion } from './official-source-package';

export type DestinoImportacion = 'CORPUS_RECORD' | 'JURISPRUDENCE_RECORD';

export interface ItemImportacion {
  archivo: string;
  estado: 'REJECTED' | 'DUPLICATE' | 'IMPORTED_DISCOVERED_UNVERIFIED' | 'IMPORTED_SOURCE_VALIDATED';
  razones: string[];
  destino: DestinoImportacion | null;
  recordId: string | null;
  version: number | null;
}

export interface LoteImportacion {
  items: ItemImportacion[];
  /** Historial append-only de instrumentos (incluye los previos). */
  records: InstrumentRecord[];
  jurisprudencia: JurisprudenceRecord[];
}

/** Identificador estable derivado del nombre del documento (ASCII, mayúsculas). El CLO puede remapearlo al id canónico. */
export function idDesdeNombre(nombre: string): string {
  const base = nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `PKG_${base || 'SIN_NOMBRE'}`;
}

const MATERIA_UNKNOWN = 'UNKNOWN' as const;

function aRegistro(p: OfficialSourcePackage, tier: 1 | 2 | 3 | 4 | 5 | null, validada: boolean): InstrumentRecord {
  return registroVacio({
    id: idDesdeNombre(p.document_name),
    title: p.document_name,
    matter: MATERIA_UNKNOWN,
    decree: p.decree,
    gaceta_number: p.gaceta,
    gaceta_date: p.gaceta_date,
    // Solo una fuente VALIDADA contra el registro conserva la URL como oficial; el descubrimiento la deja en notas.
    official_url: validada ? p.source_url : null,
    pdf_sha256: p.bytes_sha256,
    text_sha256: p.text_sha256,
    source: p.source_domain,
    source_tier: tier,
    verification_state: 'PENDING_VERIFICATION',
    ingestion_state: 'HASH',
    notes: [
      `Importado de paquete externo (retriever=${p.retriever}, método=${p.retrieval_method}, retrieved_at=${p.retrieved_at}).`,
      validada ? 'SOURCE_VALIDATED: dominio verificado en el registro; NO es autoridad hasta CORPUS_QA → CLO → V4/V5.' : `DISCOVERED_UNVERIFIED: ${p.source_url} (solo descubrimiento, no es fuente oficial verificada).`,
      `document_type=${p.document_type}`,
    ],
  });
}

function aJurisprudencia(p: OfficialSourcePackage): JurisprudenceRecord {
  return JurisprudenceRecordSchema.parse({
    id: idDesdeNombre(p.document_name).replace(/^PKG_/, 'JUR_'),
    court: 'UNKNOWN', chamber: 'UNKNOWN', case_number: 'UNKNOWN', date: 'UNKNOWN', matter: MATERIA_UNKNOWN,
    legal_issue: null, ratio: null, holding: null, cited_laws: [], cited_articles: [],
    precedential_status: 'UNKNOWN', precedential_verification: null, public_private_status: 'UNKNOWN',
    source_url: p.source_url, document_hash: p.bytes_sha256, ingestion_state: 'HASH', approvals: [],
  });
}

/**
 * Procesa un lote de paquetes (ya leídos) contra el historial existente. `entradas` son pares {archivo, contenido}.
 * Nunca escribe nada: devuelve el resultado para que el CLI lo guarde.
 */
export function importarPaquetes(
  entradas: ReadonlyArray<{ archivo: string; contenido: unknown; bytes?: Uint8Array }>,
  existentes: readonly InstrumentRecord[] = [],
  opts: Omit<OpcionesValidacion, 'bytes'> = {},
): LoteImportacion {
  let historial: InstrumentRecord[] = [...existentes];
  const jurisprudencia: JurisprudenceRecord[] = [];
  const hashesVistos = new Set<string>([...historial.map((r) => r.text_sha256).filter((h): h is string => !!h)]);
  const items: ItemImportacion[] = [];

  for (const e of entradas) {
    const r = validarPaquete(e.contenido, { ...opts, bytes: e.bytes });
    if (r.estado === 'REJECTED') {
      items.push({ archivo: e.archivo, estado: 'REJECTED', razones: [...r.razones, ...r.detalle], destino: null, recordId: null, version: null });
      continue;
    }
    const p = r.paquete;
    if (hashesVistos.has(p.text_sha256)) {
      items.push({ archivo: e.archivo, estado: 'DUPLICATE', razones: ['DUPLICADO_EXACTO: text_sha256 ya importado'], destino: null, recordId: null, version: null });
      continue;
    }
    hashesVistos.add(p.text_sha256);
    const validada = r.estado === 'SOURCE_VALIDATED';

    if (p.document_type === 'JUDGMENT') {
      const j = aJurisprudencia(p);
      jurisprudencia.push(j);
      items.push({ archivo: e.archivo, estado: validada ? 'IMPORTED_SOURCE_VALIDATED' : 'IMPORTED_DISCOVERED_UNVERIFIED', razones: [...r.advertencias, 'JUDGMENT: public/private UNKNOWN y precedencia UNKNOWN → no indexable'], destino: 'JURISPRUDENCE_RECORD', recordId: j.id, version: null });
      continue;
    }

    const nuevo = aRegistro(p, r.tierConcedido, validada);
    const mismoId = historial.filter((h) => h.id === nuevo.id);
    const res = registrarVersion(mismoId, nuevo);
    if (!res.ok) {
      items.push({ archivo: e.archivo, estado: res.motivo === 'DUPLICADO_EXACTO' ? 'DUPLICATE' : 'REJECTED', razones: [res.motivo], destino: null, recordId: nuevo.id, version: null });
      continue;
    }
    const agregado = res.valor[res.valor.length - 1];
    // registrarVersion reinicia las versiones posteriores en DISCOVER; aquí el hash ya se validó.
    const final: InstrumentRecord = { ...agregado, ingestion_state: 'HASH', verification_state: 'PENDING_VERIFICATION' };
    historial = [...historial, final];
    items.push({ archivo: e.archivo, estado: validada ? 'IMPORTED_SOURCE_VALIDATED' : 'IMPORTED_DISCOVERED_UNVERIFIED', razones: r.advertencias, destino: 'CORPUS_RECORD', recordId: final.id, version: final.version });
  }
  return { items, records: historial, jurisprudencia };
}

export function informeImportacionMd(l: LoteImportacion): string {
  const c = (e: ItemImportacion['estado']) => l.items.filter((i) => i.estado === e).length;
  const L = [
    '# Informe de importación de paquetes de fuente oficial',
    '',
    `Paquetes: ${l.items.length} · importados (fuente validada): ${c('IMPORTED_SOURCE_VALIDATED')} · importados (solo descubrimiento): ${c('IMPORTED_DISCOVERED_UNVERIFIED')} · duplicados: ${c('DUPLICATE')} · rechazados: ${c('REJECTED')}`,
    '',
    '> Importar NO otorga autoridad. Siguiente: CORPUS_QA → CLO → V4/V5 (humanos). Nada se escribió en ninguna base de datos.',
    '',
    '| Archivo | Estado | Destino | Id | Versión | Notas |',
    '|---|---|---|---|---|---|',
    ...l.items.map((i) => `| ${i.archivo} | ${i.estado} | ${i.destino ?? '—'} | ${i.recordId ?? '—'} | ${i.version ?? '—'} | ${i.razones.join('; ').replace(/\|/g, '/')} |`),
  ];
  return `${L.join('\n')}\n`;
}

export type { MotivoRechazoPaquete };
