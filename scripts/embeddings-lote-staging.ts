/**
 * scripts/embeddings-lote-staging.ts
 * Embeddings de un lote ya generado por scripts/ingesta-lote-staging.ts (que deja `embedding` NULL a propósito). OFFLINE: el modelo corre
 * localmente; no usa red, Supabase ni claves. Escribe archivos SQL que el Titular aplica en STAGING.
 *
 * Mismo modelo y mismo tratamiento que el corpus y que scripts/ingesta-comercio.ts: Xenova/multilingual-e5-small (quantized:false), prefijo
 * «passage: », pooling mean, normalizado, 384 dimensiones, y la misma guarda contra vectores vacíos o constantes (validarEmbeddingNoDummy).
 * La consulta (lib/rag/embed.ts) usa intfloat/multilingual-e5-small: el mismo modelo.
 *
 * El UPDATE solo toca filas del lote indicado que SIGAN sin embedding (`embedding IS NULL`): reaplicarlo no cambia nada. No toca vigencia,
 * revision_pendiente ni ninguna otra columna.
 *
 * Uso: npx tsx scripts/embeddings-lote-staging.ts <rows.jsonl> <salida_dir>
 * Salida: <salida_dir>/{update_embeddings_staging.sql, verificacion_staging.sql}
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { EMBED_DIMS, validarEmbeddingNoDummy } from './ingestar-ley';

const lit = (v: string) => `'${v.replace(/'/g, "''")}'`;

export interface FilaConEmbedding { id: string; ingest_batch: string; embedding: number[] }

/** SQL de UPDATE idempotente: una sentencia por fila, en una transacción. Valida cada vector antes de escribirlo. */
export function sqlEmbeddings(filas: readonly FilaConEmbedding[]): string {
  const lotes = [...new Set(filas.map((f) => f.ingest_batch))];
  if (lotes.length !== 1) throw new Error(`se esperaba un solo ingest_batch y hay ${lotes.length}`);
  if (new Set(filas.map((f) => f.id)).size !== filas.length) throw new Error('ids repetidos en el lote');
  const sentencias = filas.map((f) => {
    validarEmbeddingNoDummy(f.embedding, EMBED_DIMS);
    const vector = `[${f.embedding.map((x) => x.toFixed(6)).join(',')}]`;
    return `UPDATE public.biblioteca_vectores SET embedding = ${lit(vector)}::vector(${EMBED_DIMS}) WHERE id = ${lit(f.id)} AND ingest_batch = ${lit(f.ingest_batch)} AND embedding IS NULL;`;
  });
  return [
    `-- SOLO STAGING (aicakncgtuiiuomflkqj). Embeddings del lote ${lotes[0]} (${filas.length} filas). Modelo Xenova/multilingual-e5-small, «passage:», ${EMBED_DIMS} dims.`,
    '-- Solo filas del lote que siguen sin embedding: reaplicarlo no cambia nada. No toca vigencia ni revision_pendiente.',
    'BEGIN;',
    ...sentencias,
    'COMMIT;',
    '',
  ].join('\n');
}

/** Consultas de verificación del lote en staging (solo lectura). */
export function sqlVerificacion(ingestBatch: string, esperadas: number): string {
  const b = lit(ingestBatch);
  return [
    `-- SOLO STAGING (aicakncgtuiiuomflkqj). Verificación del lote ${ingestBatch}: se esperan ${esperadas} filas. Solo lectura.`,
    `SELECT count(*) AS filas,`,
    `       count(*) FILTER (WHERE embedding IS NOT NULL) AS con_embedding,`,
    `       count(*) FILTER (WHERE revision_pendiente) AS ocultas,`,
    `       count(*) FILTER (WHERE es_norma_vigente IS NULL) AS vigencia_null,`,
    `       count(*) FILTER (WHERE jurisdiccion = 'HN') AS jurisdiccion_hn,`,
    `       count(*) FILTER (WHERE metadata->>'norm_id' = 'HN:DECRETO_284_2013') AS norm_id_hn,`,
    `       count(DISTINCT num_articulo_norm) AS articulos_distintos`,
    `FROM public.biblioteca_vectores WHERE ingest_batch = ${b};`,
    `-- Esperado: filas=${esperadas}, con_embedding=${esperadas}, ocultas=${esperadas}, vigencia_null=${esperadas}, jurisdiccion_hn=${esperadas}, norm_id_hn=${esperadas}, articulos_distintos=${esperadas}.`,
    '',
    `-- La búsqueda no las devuelve mientras estén ocultas (revision_pendiente = true): debe dar 0.`,
    `SELECT count(*) AS visibles FROM public.biblioteca_vectores WHERE ingest_batch = ${b} AND revision_pendiente = false;`,
    '',
  ].join('\n');
}

async function main(): Promise<void> {
  const [rows, salida] = process.argv.slice(2);
  if (!rows || !salida) throw new Error('uso: ver cabecera del archivo');
  const filas = readFileSync(rows, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as { id: string; ingest_batch: string; contenido: string });
  const { pipeline } = await import('@xenova/transformers');
  const extractor = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', { quantized: false } as never);
  const conEmbedding: FilaConEmbedding[] = [];
  for (const f of filas) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const salidaModelo = await (extractor as any)(`passage: ${f.contenido}`, { pooling: 'mean', normalize: true });
    conEmbedding.push({ id: f.id, ingest_batch: f.ingest_batch, embedding: Array.from(salidaModelo.data as Float32Array) });
  }
  mkdirSync(salida, { recursive: true });
  writeFileSync(join(salida, 'update_embeddings_staging.sql'), sqlEmbeddings(conEmbedding));
  writeFileSync(join(salida, 'verificacion_staging.sql'), sqlVerificacion(filas[0].ingest_batch, filas.length));
  console.log(`embeddings: ${conEmbedding.length} filas · ${EMBED_DIMS} dims · lote ${filas[0].ingest_batch}`);
}

if (process.argv[1]?.endsWith('embeddings-lote-staging.ts')) main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
