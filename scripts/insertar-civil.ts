/**
 * scripts/insertar-civil.ts
 * Genera los 2372 embeddings (intfloat/multilingual-e5-small, 384-dim,
 * prefijo "passage: " -- mismo modelo/endpoint/normalización que usa el
 * resto del corpus en producción, ver lib/rag/embed.ts) para los
 * artículos ya validados del Código Civil (Decreto del Poder Ejecutivo,
 * 8 de febrero de 1906), y escribe el SQL de staging + movimiento
 * aditivo (SIN DELETE de las filas existentes de materia='02_CIVIL')
 * listo para ejecutar contra `biblioteca_vectores` (thgrhueckkjdutjvcufp).
 *
 * Este script NO tiene credenciales de Supabase y no las necesita -- solo
 * lee HF_API_TOKEN de .env.local (fs puro, nunca dotenv/dotenvx en esta
 * máquina) para llamar a la API de HuggingFace, y escribe un archivo
 * .sql local bajo out/. La ejecución real del SQL contra producción
 * ocurre por separado, a través del canal MCP de Supabase ya
 * autenticado -- este script no abre ninguna conexión a esa base de
 * datos.
 *
 * Ejecutar: npx tsx scripts/insertar-civil.ts <ruta-salida.sql>
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  ejecutarPipelineCompleto,
  TOTAL_ESPERADO,
  TRUE_ESPERADO,
  FALSE_ESPERADO,
  type RegistroCanonicoCivil,
} from './ingesta-civil';

// ── Lectura de .env.local con fs puro (NUNCA dotenv/dotenvx en esta
// máquina -- corrompió secretos en Vercel el 2026-07-09, ver memoria).
// Mismo mecanismo que scripts/insertar-cpp.ts -- no lee ningún secreto de
// Supabase, solo HF_API_TOKEN. ──
function parseEnvFile(ruta: string): Record<string, string> {
  const out: Record<string, string> = {};
  const raw = readFileSync(ruta, 'utf8');
  for (const linea of raw.split('\n')) {
    const t = linea.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    out[key] = val;
  }
  return out;
}

// ── Embedding de documento (passage), mismo endpoint/normalización que
// lib/rag/embed.ts -- ese módulo solo expone embedQuery() (prefijo
// "query: ", trunca a 500 chars, pensado para consultas cortas del
// usuario). Los artículos de este código llegan hasta varios miles de
// caracteres, así que se necesita el lado "passage: " sin ese truncado
// corto. Solo intfloat/multilingual-e5-small -- nada de Cohere. ──
const HF_MODEL_URL =
  'https://router.huggingface.co/hf-inference/models/intfloat/multilingual-e5-small/pipeline/feature-extraction';
const EMBED_DIMS = 384;

function normalizarSalidaHF(data: unknown): number[] {
  let vec: number[];
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('HF Inference: respuesta vacía o inválida');
  }
  if (typeof data[0] === 'number') {
    vec = data as number[];
  } else {
    let tokens = data as number[][] | number[][][];
    if (Array.isArray(tokens[0]) && Array.isArray((tokens[0] as number[][])[0])) {
      tokens = (tokens as number[][][])[0];
    }
    const matriz = tokens as number[][];
    const dims = matriz[0].length;
    vec = new Array(dims).fill(0);
    for (const fila of matriz) for (let i = 0; i < dims; i++) vec[i] += fila[i];
    for (let i = 0; i < dims; i++) vec[i] /= matriz.length;
  }
  if (vec.length !== EMBED_DIMS) {
    throw new Error(`HF Inference: dims inesperadas (${vec.length} ≠ ${EMBED_DIMS})`);
  }
  const norma = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) || 1;
  return vec.map((x) => x / norma);
}

async function embedPassage(texto: string, token: string): Promise<number[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(HF_MODEL_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: `passage: ${texto}`, options: { wait_for_model: true } }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      throw new Error(`HF Inference ${res.status}: ${err.slice(0, 200)}`);
    }
    const data = (await res.json()) as unknown;
    return normalizarSalidaHF(data);
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Generación del SQL de staging + movimiento aditivo ──────────────────
function sqlStringLiteral(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

function vectorLiteral(v: number[]): string {
  return `'[${v.map((x) => x.toFixed(6)).join(',')}]'::vector(384)`;
}

const STAGING_TABLE = 'stg_cc_1906_ingesta';
const BATCH_SIZE = 8;

function generarSQL(registros: Array<RegistroCanonicoCivil & { embedding: number[] }>): string {
  let sql = `-- Generado por scripts/insertar-civil.ts -- NO editar a mano.\n`;
  sql += `-- Código Civil (Decreto del Poder Ejecutivo, 8 de febrero de 1906) -- ${registros.length} filas.\n\n`;
  sql += `DROP TABLE IF EXISTS ${STAGING_TABLE};\n`;
  sql += `CREATE TABLE ${STAGING_TABLE} (\n`;
  sql += `  id text PRIMARY KEY,\n  coleccion text,\n  materia text,\n  contenido text,\n`;
  sql += `  num_articulo text,\n  fuente text,\n  metadata jsonb,\n  embedding vector(384),\n`;
  sql += `  jurisdiccion text,\n  fuente_tipo text,\n  es_norma_vigente boolean\n);\n\n`;

  for (let i = 0; i < registros.length; i += BATCH_SIZE) {
    const lote = registros.slice(i, i + BATCH_SIZE);
    sql += `INSERT INTO ${STAGING_TABLE} (id, coleccion, materia, contenido, num_articulo, fuente, metadata, embedding, jurisdiccion, fuente_tipo, es_norma_vigente) VALUES\n`;
    sql += lote
      .map(
        (r) =>
          `  (${sqlStringLiteral(r.id)}, ${sqlStringLiteral(r.coleccion)}, ${sqlStringLiteral(r.materia)}, ${sqlStringLiteral(r.contenido)}, ${sqlStringLiteral(r.num_articulo)}, ${sqlStringLiteral(r.fuente)}, ${sqlStringLiteral(JSON.stringify(r.metadata))}::jsonb, ${vectorLiteral(r.embedding)}, ${sqlStringLiteral(r.jurisdiccion)}, ${sqlStringLiteral(r.fuente_tipo)}, ${r.es_norma_vigente})`,
      )
      .join(',\n');
    sql += ';\n\n';
  }

  // Movimiento ADITIVO puro -- SIN DELETE. A diferencia de
  // scripts/insertar-cpp.ts (que declara un DELETE del stub manual del
  // Art.173 dentro del mismo bloque), aquí no hay ninguna fila previa que
  // reemplazar, y no está autorizado tocar las filas existentes de
  // materia='02_CIVIL' (CPC mal etiquetado + instrumentos notariales,
  // problema aparte, sin decisión tomada). El DROP TABLE del staging va
  // DESPUÉS de que el bloque DO $$ cierre -- no dentro -- para que la
  // tabla de staging sobreviva si el RAISE EXCEPTION revierte el INSERT,
  // dejando evidencia disponible para diagnóstico.
  sql += `-- Movimiento aditivo staging -> biblioteca_vectores. SIN DELETE.\n`;
  sql += `-- Fail-hard: si insert_count != ${registros.length}, RAISE EXCEPTION revierte\n`;
  sql += `-- el INSERT (ningún UPDATE ni DELETE en ninguna parte de este SQL). El\n`;
  sql += `-- DROP TABLE del staging va DESPUÉS de este bloque, no adentro -- si el\n`;
  sql += `-- bloque aborta, la tabla de staging queda intacta para diagnóstico.\n`;
  sql += `DO $$\nDECLARE rc integer;\nBEGIN\n`;
  sql += `  INSERT INTO biblioteca_vectores (id, coleccion, materia, contenido, num_articulo, fuente, metadata, embedding, jurisdiccion, fuente_tipo, es_norma_vigente)\n`;
  sql += `  SELECT id, coleccion, materia, contenido, num_articulo, fuente, metadata, embedding, jurisdiccion, fuente_tipo, es_norma_vigente\n`;
  sql += `  FROM ${STAGING_TABLE};\n`;
  sql += `  GET DIAGNOSTICS rc = ROW_COUNT;\n`;
  sql += `  IF rc != ${registros.length} THEN\n`;
  sql += `    RAISE EXCEPTION 'Fallo conteo Civil: expected ${registros.length} rows inserted, got %', rc;\n`;
  sql += `  END IF;\nEND $$;\n\n`;
  sql += `DROP TABLE ${STAGING_TABLE};\n`;

  return sql;
}

async function main() {
  const rutaSalida = process.argv[2];
  if (!rutaSalida) {
    console.error('Uso: npx tsx scripts/insertar-civil.ts <ruta-salida.sql>');
    process.exit(1);
  }

  const env = parseEnvFile('.env.local');
  const HF_TOKEN = env.HF_API_TOKEN;
  if (!HF_TOKEN) {
    console.error('HF_API_TOKEN no encontrado en .env.local');
    process.exit(1);
  }

  // Reconstruye el MISMO pipeline ya validado de ingesta-civil.ts (no se
  // retipea ninguna lógica de extracción/segmentación/QC/notas al pie/set
  // de vigencia cerrado).
  const resultado = ejecutarPipelineCompleto();
  const totalTrue = resultado.registros.filter((r) => r.es_norma_vigente).length;
  const totalFalse = resultado.registros.filter((r) => !r.es_norma_vigente).length;
  console.log(
    `Pipeline reconstruido y re-validado: ${resultado.registros.length} registros (${totalTrue} vigentes, ${totalFalse} derogados).\n`,
  );

  if (resultado.registros.length !== TOTAL_ESPERADO) {
    console.error(`FAIL-HARD: se esperaban ${TOTAL_ESPERADO} registros, se generaron ${resultado.registros.length}`);
    process.exit(1);
  }
  if (totalTrue !== TRUE_ESPERADO) {
    console.error(`FAIL-HARD: se esperaban ${TRUE_ESPERADO} vigentes, se generaron ${totalTrue}`);
    process.exit(1);
  }
  if (totalFalse !== FALSE_ESPERADO) {
    console.error(`FAIL-HARD: se esperaban ${FALSE_ESPERADO} derogados, se generaron ${totalFalse}`);
    process.exit(1);
  }

  const registros: Array<RegistroCanonicoCivil & { embedding: number[] }> = [];
  let i = 0;
  for (const r of resultado.registros) {
    i++;
    process.stdout.write(`[${i}/${TOTAL_ESPERADO}] Generando embedding Art. ${r.num_articulo}... `);
    const embedding = await embedPassage(r.contenido, HF_TOKEN);
    if (embedding.length !== EMBED_DIMS) {
      console.error(`\nFAIL-HARD: Art. ${r.num_articulo} produjo ${embedding.length} dims, se esperaban ${EMBED_DIMS}`);
      process.exit(1);
    }
    console.log(`${embedding.length} dims OK`);
    registros.push({ ...r, embedding });
  }

  if (registros.length !== TOTAL_ESPERADO) {
    console.error(`FAIL-HARD: se esperaban ${TOTAL_ESPERADO} registros con embedding, se generaron ${registros.length}`);
    process.exit(1);
  }
  const dimsMalas = registros.filter((r) => r.embedding.length !== EMBED_DIMS);
  if (dimsMalas.length > 0) {
    console.error(`FAIL-HARD: ${dimsMalas.length} registro(s) con dimensión != ${EMBED_DIMS}: ${dimsMalas.map((r) => r.num_articulo).join(', ')}`);
    process.exit(1);
  }

  const sql = generarSQL(registros);
  mkdirSync(dirname(rutaSalida), { recursive: true });
  writeFileSync(rutaSalida, sql, 'utf8');
  console.log(`\n✅ SQL escrito en: ${rutaSalida} (${sql.length} caracteres, ${registros.length} filas, ${BATCH_SIZE}/lote)`);
  console.log('🔒 Este script no ejecutó ningún SQL contra producción -- solo lo escribió a archivo. SQL aditivo puro, SIN DELETE de materia=\'02_CIVIL\'.');
}

main().catch((err) => {
  console.error('FALLÓ:', err);
  process.exit(1);
});
