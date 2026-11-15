/**
 * scripts/ingesta-lote-staging.ts
 * Ingesta por lotes a STAGING de un instrumento ya recibido (PDF + paquete del Tramo A). OFFLINE: no usa red, Supabase ni claves; escribe archivos.
 *
 * Reglas del Titular (2026-11-08): lotes OCULTOS (revision_pendiente = true; buscar_biblioteca_v2 los excluye) y vigencia NULL (R3 no cita un
 * es_norma_vigente nulo). Embedding NULL: lo llena un paso aparte con las claves que gestiona el Titular. Errores NO bloqueantes: lo ambiguo se
 * inserta tal cual, marcado, y se anota en ingest_exceptions.log; la ingesta del documento continúa. Nada de esto declara vigencia ni autoridad.
 *
 * Identidad (multi-jurisdicción v3): el instrumento se pasa como identidad país-calificada ESTRICTA `HN:<INSTRUMENTO>` del catálogo cerrado
 * (lib/legal-retrieval/instrument-ref.ts). Sin prefijo, con otro país o fuera del catálogo, la herramienta se detiene ANTES de escribir nada: las
 * filas se escriben con jurisdiccion = 'HN' y nunca se infiere el país. La columna `instrumento_id` conserva el nombre sin prefijo (lo que espera
 * resolver_articulo_exacto); la identidad completa va en metadata.norm_id, que el CLO coteja con la jurisdicción de la fila.
 *
 * Uso: npx tsx scripts/ingesta-lote-staging.ts <pdf> <paquete.json> <HN:INSTRUMENTO> <ingest_batch> <fuente> <salida_dir> [columnas=1|2] [fuente_tipo=codigo|ley|reglamento|acuerdo]
 * Salida: <salida_dir>/{rows.jsonl, ingest_exceptions.log, REPORTE.md, insert_staging.sql}
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { segmentarArticulos } from '../lib/legal-os/corpus-factory/staging';
import { extraerTextoDosColumnas } from '../tools/corpus/receive-pdf';
import { normalizarNumeroArticulo } from '../lib/legal-retrieval/clo-guards';
import { parsearInstrumentRef, type InstrumentRef } from '../lib/legal-retrieval/instrument-ref';
import type { InstrumentoNormalizado } from '../lib/legal-retrieval/instrument-identity';

const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
const lit = (v: string | null) => (v === null ? 'NULL' : `'${v.replace(/'/g, "''")}'`);

/**
 * Valida la identidad `HN:<INSTRUMENTO>` y devuelve sus partes. Lanza si falta el prefijo, si el país no es HN (esta herramienta solo escribe
 * filas hondureñas) o si el instrumento no está en el catálogo cerrado. Mismo formato estricto que parsearInstrumentRef: no normaliza.
 */
export function validarRefHN(valor: unknown): { ref: InstrumentRef; instrumento: InstrumentoNormalizado } {
  const r = parsearInstrumentRef(valor);
  if (!r.ok) throw new Error(`instrumento inválido ${JSON.stringify(valor)} (${r.motivo}): se exige HN:<INSTRUMENTO> del catálogo cerrado`);
  if (r.pais !== 'HN') throw new Error(`instrumento de otro país ${JSON.stringify(valor)}: esta herramienta solo ingiere filas con jurisdiccion HN`);
  return { ref: r.ref, instrumento: r.instrumento };
}

export interface FilaLote {
  id: string; coleccion: string; materia: string; contenido: string; num_articulo: string; fuente: string; metadata: Record<string, unknown>;
  jurisdiccion: 'HN'; fuente_tipo: 'codigo' | 'ley' | 'reglamento' | 'acuerdo'; es_norma_vigente: null; revision_pendiente: true;
  instrumento_id: string; num_articulo_norm: string | null; hash_contenido: string; ingest_batch: string;
}
export interface Excepcion { articulo: string; codigo: string; detalle: string }

export function construirLote(p: {
  texto: string; instrumentoRef: string; ingestBatch: string; fuente: string; fuenteTipo: FilaLote['fuente_tipo'];
  meta: Record<string, unknown>; hashesPaquete?: ReadonlyMap<string, string>; materia?: string; coleccion?: string;
}): { filas: FilaLote[]; excepciones: Excepcion[]; resumen: Record<string, number> } {
  // Antes de segmentar: una identidad inválida no produce ninguna fila.
  const { ref, instrumento } = validarRefHN(p.instrumentoRef);
  const seg = segmentarArticulos(p.texto);
  const excepciones: Excepcion[] = [];
  const vistos = new Map<string, number>();
  const filas: FilaLote[] = [];
  let previo: number | null = null;
  let divergentes = 0;
  for (const a of seg.articulos) {
    const k = (vistos.get(a.numero) ?? 0) + 1;
    vistos.set(a.numero, k);
    const marcas: string[] = [];
    if (k > 1) { excepciones.push({ articulo: a.numero, codigo: 'NUMERO_REPETIDO', detalle: `ocurrencia ${k}; ambas se insertan, sin elegir cuál rige` }); marcas.push('NUMERO_REPETIDO'); }
    const n = /^\d+$/.test(a.numero) ? Number(a.numero) : null;
    if (n !== null && previo !== null && n > previo + 1) excepciones.push({ articulo: String(previo + 1) + (n - previo > 2 ? `–${n - 1}` : ''), codigo: 'NUMERO_AUSENTE', detalle: `salto ${previo}→${n} en la fuente` });
    if (n !== null) previo = n;
    const derogado = /^[\s.\-–—:]*(?:\d{1,3}\s+)?Derogad[oa]s?\s*\d{0,3}\.?$/iu.test(a.texto.trim());
    if (derogado) { excepciones.push({ articulo: a.numero, codigo: 'MARCADO_DEROGADO_POR_LA_EDICION', detalle: 'informativo: la edición lo marca «Derogado»; no se declara vigencia ni derogación' }); marcas.push('MARCADO_DEROGADO_POR_LA_EDICION'); }
    else if (a.texto.length < 40) { excepciones.push({ articulo: a.numero, codigo: 'TEXTO_CORTO', detalle: `${a.texto.length} caracteres` }); marcas.push('TEXTO_CORTO'); }
    if (/�|Ã[¡-¿]|Â[ -¿]/.test(a.texto)) { excepciones.push({ articulo: a.numero, codigo: 'RUIDO_CODIFICACION', detalle: 'caracteres de reemplazo o mojibake' }); marcas.push('RUIDO_CODIFICACION'); }
    if (/--\s*\d+\s+of\s+\d+\s*--/.test(a.texto)) marcas.push('MARCA_PAGINA_EN_TEXTO');
    const esperado = p.hashesPaquete?.get(`${a.numero}#${k}`);
    if (esperado && esperado !== a.sha256) { divergentes++; excepciones.push({ articulo: a.numero, codigo: 'HASH_DIVERGE_DEL_PAQUETE', detalle: 'el sha256 del artículo no coincide con el paquete del Tramo A' }); }
    const contenido = a.texto.trim();
    filas.push({
      id: `${p.ingestBatch}:${instrumento}:${a.numero}${k > 1 ? `~dup${k}` : ''}`,
      coleccion: p.coleccion ?? 'mayalex_normativos', materia: p.materia ?? '10_LEYES_REGLAMENTOS', contenido, num_articulo: a.numero, fuente: p.fuente,
      metadata: { ...p.meta, norm_id: ref, instrumento_id: instrumento, ingest_batch: p.ingestBatch, ordinal: a.ordinal, article_sha256: a.sha256, vigencia: 'UNKNOWN', revision_pendiente: true, marcas },
      jurisdiccion: 'HN', fuente_tipo: p.fuenteTipo, es_norma_vigente: null, revision_pendiente: true,
      instrumento_id: instrumento, num_articulo_norm: normalizarNumeroArticulo(a.numero), hash_contenido: sha(contenido), ingest_batch: p.ingestBatch,
    });
  }
  return { filas, excepciones, resumen: { articulos: filas.length, excepciones: excepciones.length, repetidos: [...vistos.values()].filter((v) => v > 1).length, divergentes_del_paquete: divergentes } };
}

export function sqlInsert(filas: readonly FilaLote[], porLote = 50): string[] {
  const out: string[] = [];
  for (let i = 0; i < filas.length; i += porLote) {
    const valores = filas.slice(i, i + porLote).map((f) =>
      `(${lit(f.id)},${lit(f.coleccion)},${lit(f.materia)},${lit(f.contenido)},${lit(f.num_articulo)},${lit(f.fuente)},${lit(JSON.stringify(f.metadata))}::jsonb,NULL,${lit(f.jurisdiccion)},${lit(f.fuente_tipo)},NULL,true,${lit(f.instrumento_id)},${lit(f.num_articulo_norm)},${lit(f.hash_contenido)},${lit(f.ingest_batch)},now())`);
    out.push(`INSERT INTO public.biblioteca_vectores (id,coleccion,materia,contenido,num_articulo,fuente,metadata,embedding,jurisdiccion,fuente_tipo,es_norma_vigente,revision_pendiente,instrumento_id,num_articulo_norm,hash_contenido,ingest_batch,ingested_at) VALUES\n${valores.join(',\n')}\nON CONFLICT (id) DO NOTHING;`);
  }
  return out;
}

export interface NotaAlPie { referido: string; sha256: string; texto: string }

/**
 * Notas al pie (reformas con su número de Gaceta) como registros APARTE. No son norma: su tipo de fuente es `nota_al_pie`, así que el
 * clasificador CLO y la búsqueda exacta (que solo leen `codigo`) nunca las usan como PRIMARY. Vigencia NULL, ocultas, sin embedding.
 */
export function construirNotas(p: { notas: readonly NotaAlPie[]; instrumentoRef: string; ingestBatch: string; fuente: string; meta: Record<string, unknown> }): FilaLote[] {
  const { ref, instrumento } = validarRefHN(p.instrumentoRef);
  return p.notas.map((n, i) => {
    const numero = /^\d+(?:-[A-Z])?$/.test(n.referido) ? n.referido : null;
    const contenido = n.texto.trim();
    return {
      id: `${p.ingestBatch}:${instrumento}:NOTA:${String(i + 1).padStart(3, '0')}`,
      coleccion: 'mayalex_normativos', materia: '10_LEYES_REGLAMENTOS', contenido, num_articulo: numero ?? n.referido, fuente: p.fuente,
      metadata: { ...p.meta, tipo: 'nota_al_pie', referido: n.referido, norm_id: ref, instrumento_id: instrumento, ingest_batch: p.ingestBatch, article_sha256: n.sha256, vigencia: 'UNKNOWN', revision_pendiente: true, no_es_norma: true },
      jurisdiccion: 'HN', fuente_tipo: 'nota_al_pie' as unknown as FilaLote['fuente_tipo'], es_norma_vigente: null, revision_pendiente: true,
      instrumento_id: instrumento, num_articulo_norm: numero ? normalizarNumeroArticulo(numero) : null, hash_contenido: sha(contenido), ingest_batch: p.ingestBatch,
    };
  });
}

/**
 * Procedencia que se graba en cada fila. Antes era fija («Drive del propietario … SOURCE_HOLD») y mal etiquetaba un PDF descargado de una fuente
 * verificada. Ahora sale del estado del candidato; en ningún caso declara verificación, autoridad ni vigencia (eso es V4/V5 del CLO).
 */
export function procedenciaDelPaquete(estado: unknown): string {
  if (estado === 'CLO_PENDING') return 'Fuente validada por el receptor contra el registro de fuentes oficiales (CLO_PENDING); sin V4/V5 ni vigencia declarada';
  if (estado === 'SOURCE_HOLD') return 'Procedencia institucional NO verificada (SOURCE_HOLD): dominio fuera del registro de fuentes oficiales';
  return `Estado del receptor ${typeof estado === 'string' && estado ? estado : 'desconocido'}: procedencia institucional NO verificada`;
}

function main(): void {
  const [pdf, paquete, instrumentoRef, ingestBatch, fuente, salida, columnas = '1', tipo = 'codigo'] = process.argv.slice(2);
  if (!pdf || !paquete || !instrumentoRef || !ingestBatch || !fuente || !salida) throw new Error('uso: ver cabecera del archivo');
  // Primero la identidad: con HN:<INSTRUMENTO> inválido no se lee el PDF ni se crea el directorio de salida.
  validarRefHN(instrumentoRef);
  const bytes = readFileSync(pdf);
  let r: { status: number | null; stderr: string; stdout: string };
  if (columnas === '2') {
    const info = spawnSync('pdfinfo', [pdf], { encoding: 'utf8' });
    const paginas = Number(/^Pages:\s+(\d+)/m.exec(info.stdout)?.[1] ?? 0);
    r = { status: 0, stderr: '', stdout: extraerTextoDosColumnas(pdf, 1, paginas, false).texto };
  } else {
    r = spawnSync('pdftotext', ['-enc', 'UTF-8', pdf, '-'], { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
    if (r.status !== 0) throw new Error(`pdftotext falló: ${r.stderr}`);
  }
  const pkg = JSON.parse(readFileSync(paquete, 'utf8'));
  const textoSha = sha(r.stdout);
  const hashes = new Map<string, string>();
  const cont = new Map<string, number>();
  for (const a of pkg.articulos ?? []) { const k = (cont.get(a.numero) ?? 0) + 1; cont.set(a.numero, k); hashes.set(`${a.numero}#${k}`, a.sha256); }
  const meta = { bytes_sha256: sha(bytes), text_sha256: textoSha, paquete: pkg.candidate_id, estado_fuente: pkg.estado, procedencia: procedenciaDelPaquete(pkg.estado), decreto: pkg.identidad?.decree ?? null };
  const lote = construirLote({ texto: r.stdout, instrumentoRef, ingestBatch, fuente, fuenteTipo: tipo as FilaLote['fuente_tipo'], meta, hashesPaquete: hashes });
  mkdirSync(salida, { recursive: true });
  writeFileSync(join(salida, 'rows.jsonl'), lote.filas.map((f) => JSON.stringify(f)).join('\n') + '\n');
  writeFileSync(join(salida, 'ingest_exceptions.log'), lote.excepciones.map((e) => `${e.codigo}\tart.${e.articulo}\t${e.detalle}`).join('\n') + '\n');
  writeFileSync(join(salida, 'insert_staging.sql'), `-- SOLO STAGING (aicakncgtuiiuomflkqj). Lote ${ingestBatch}. Ocultos (revision_pendiente=true), vigencia NULL, embedding NULL.\n${sqlInsert(lote.filas).join('\n\n')}\n`);
  const notas = construirNotas({ notas: pkg.notas_al_pie ?? [], instrumentoRef, ingestBatch: `${ingestBatch}_NOTAS`, fuente, meta });
  if (notas.length > 0) {
    writeFileSync(join(salida, 'notas_rows.jsonl'), notas.map((f) => JSON.stringify(f)).join('\n') + '\n');
    writeFileSync(join(salida, 'notas_insert_staging.sql'), `-- SOLO STAGING. Notas al pie de ${ingestBatch}: registros APARTE, tipo nota_al_pie (no norma), ocultas, vigencia NULL, sin embedding.\n${sqlInsert(notas).join('\n\n')}\n`);
  }
  const porCodigo = new Map<string, number>();
  for (const e of lote.excepciones) porCodigo.set(e.codigo, (porCodigo.get(e.codigo) ?? 0) + 1);
  writeFileSync(join(salida, 'REPORTE.md'), [
    `# Reporte de ingesta · ${ingestBatch} · ${instrumentoRef}`,
    `- procedencia: ${meta.procedencia}`,
    `- bytes_sha256 ${meta.bytes_sha256} ${paquete && pkg.hashes?.bytes_sha256 === meta.bytes_sha256 ? '(coincide con el paquete)' : '(NO coincide con el paquete)'}`,
    `- text_sha256 ${textoSha} ${pkg.hashes?.text_sha256 === textoSha ? '(coincide con el paquete)' : '(difiere del paquete)'}`,
    `- artículos a insertar: ${lote.resumen.articulos} · paquete: ${pkg.articulos?.length ?? '?'}`,
    `- excepciones: ${lote.resumen.excepciones} (${[...porCodigo].map(([k, v]) => `${k}: ${v}`).join(', ')})`,
    `- hashes de artículo que divergen del paquete: ${lote.resumen.divergentes_del_paquete}`,
    `- notas al pie como registros aparte (nota_al_pie, no norma): ${notas.length}`,
  ].join('\n') + '\n');
  console.log(readFileSync(join(salida, 'REPORTE.md'), 'utf8'));
}

if (process.argv[1]?.endsWith('ingesta-lote-staging.ts')) main();
