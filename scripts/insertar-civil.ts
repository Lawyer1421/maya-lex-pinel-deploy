/**
 * scripts/insertar-civil.ts
 * Genera los 2372 embeddings (intfloat/multilingual-e5-small, 384-dim,
 * prefijo "passage: " -- mismo modelo/normalización que usa el resto del
 * corpus en producción, ver lib/rag/embed.ts) para los artículos ya
 * validados del Código Civil (Decreto del Poder Ejecutivo, 8 de febrero
 * de 1906), y escribe el SQL de staging + movimiento aditivo (SIN DELETE
 * de las filas existentes de materia='02_CIVIL') listo para ejecutar
 * contra `biblioteca_vectores` (thgrhueckkjdutjvcufp).
 *
 * ═══════════════════════════════════════════════════════════════════════
 * CAMBIO DE PROVEEDOR DE EMBEDDING (2026-09-03, instrucción explícita
 * del CLO): la versión anterior de este script llamaba a la API remota
 * de HuggingFace Inference. Tras CUATRO corridas reales abortando con
 * HTTP 402 "depleted your monthly included credits" (en los artículos
 * 179, 178, 176 y 296 de 2372 -- confirmado con el propio dashboard de
 * facturación de HuggingFace: "Usage Cost: $0.00" pese al saldo de $22,
 * es decir, el 402 viene de un cupo mensual incluido separado, no del
 * saldo prepago), se cambia a inferencia LOCAL con '@xenova/transformers'
 * (ONNX Runtime en Node, sin red más allá de la descarga única de los
 * pesos del modelo público la primera vez que corre).
 *
 * EQUIVALENCIA NUMÉRICA VERIFICADA ANTES DE ESTE CAMBIO (no asumida):
 * se comparó, para el mismo texto, el vector devuelto por la API real de
 * HF contra el vector local:
 *   - Con el modelo ONNX CUANTIZADO por defecto (quantized:true, el que
 *     usa @xenova/transformers si no se especifica lo contrario):
 *     cosine similarity = 0.9966 -- ruido de cuantización real, NO
 *     equivalente para un corpus que debe ser comparable por coseno
 *     contra embeddings de producción calculados en precisión completa.
 *   - Con el modelo ONNX en PRECISIÓN COMPLETA (quantized:false):
 *     cosine similarity = 0.9999999999998946, diferencia absoluta máxima
 *     por componente ~6.7e-8 -- equivalente a ruido de punto flotante,
 *     prácticamente bit-idéntico a la API de HF.
 * Por eso este script exige `quantized: false` explícitamente (ver
 * cargarExtractor() más abajo) -- usar el modelo cuantizado por defecto
 * produciría vectores incompatibles con el resto del corpus (indexado
 * vía la API de HF en precisión completa) y con lib/rag/embed.ts en
 * tiempo de consulta.
 *
 * Ya no lee HF_API_TOKEN ni hace ninguna llamada de red para embeddings
 * -- la única red que toca este script es la descarga pública, una sola
 * vez, de los pesos del modelo desde el Hub de HuggingFace (igual que
 * `npm install` descarga paquetes; no es una llamada a producción ni
 * consume ninguna cuota de inferencia).
 *
 * Ejecutar: npx tsx scripts/insertar-civil.ts <ruta-salida.sql>
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { pipeline, type FeatureExtractionPipeline } from '@xenova/transformers';
import {
  ejecutarPipelineCompleto,
  TOTAL_ESPERADO,
  TRUE_ESPERADO,
  FALSE_ESPERADO,
  type RegistroCanonicoCivil,
} from './ingesta-civil';

const EMBED_DIMS = 384;
const MODELO_LOCAL = 'Xenova/multilingual-e5-small';

// Carga perezosa, una sola vez -- los pesos completos (~470MB en fp32)
// se cachean en node_modules/@xenova/transformers/.cache/ tras la primera
// corrida (fuera del repo, no se comitea).
let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;
function cargarExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    console.log(`Cargando ${MODELO_LOCAL} localmente (precisión completa, quantized:false)...`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tipos de @xenova/transformers no exponen la opción quantized en su firma pública
    extractorPromise = pipeline('feature-extraction', MODELO_LOCAL, { quantized: false } as any);
  }
  return extractorPromise;
}

async function embedPassage(texto: string): Promise<number[]> {
  const extractor = await cargarExtractor();
  const salida = await extractor(`passage: ${texto}`, { pooling: 'mean', normalize: true });
  const vec = Array.from(salida.data as Float32Array);
  if (vec.length !== EMBED_DIMS) {
    throw new Error(`embedding local: dims inesperadas (${vec.length} ≠ ${EMBED_DIMS})`);
  }
  return vec;
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
    const embedding = await embedPassage(r.contenido);
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
