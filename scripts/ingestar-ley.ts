#!/usr/bin/env node
/**
 * scripts/ingestar-ley.ts
 *
 * Herramienta GENÉRICA de ingesta de una nueva ley/código (código, no
 * ingesta real). A diferencia de ingesta-cpp.ts / ingesta-civil.ts /
 * ingesta-d102-2018.ts (cada uno afinado a mano contra los defectos EXACTOS
 * de su fuente -- notas al pie con formato propio, saltos de página
 * pegados, duplicados de imprenta, etc.), esta herramienta es un extractor
 * genérico de primera pasada: usa la MISMA función de validación de
 * encabezado que ya corre en producción (tieneEncabezadoArticulo, de
 * lib/rag/search.ts) para aceptar o rechazar cada fragmento, pero NO tiene
 * ningún ajuste fino para las peculiaridades de una fuente en particular.
 *
 * ADVERTENCIA DE USO (léase antes de usar con una fuente real): las
 * fuentes que hemos ingerido esta sesión (CPP, Civil) necesitaron cada una
 * entre 3 y 10 correcciones puntuales tras la primera corrida real contra
 * pdftotext -- saltos de página pegados a notas, notas indentadas,
 * duplicados de imprenta, subtítulos con numeral romano sin la palabra
 * "SECCIÓN", etc. Esta herramienta NO reemplaza esa revisión manual --
 * `--dry-run` (el modo por defecto) existe exactamente para que esa
 * revisión ocurra ANTES de generar embeddings o cualquier artefacto,
 * mirando los rechazados y los primeros/últimos artículos aceptados. Si el
 * dry-run muestra muchos rechazos o un conteo que no cuadra con el índice
 * real de la fuente, el fix no es forzar --execute -- es lo mismo que ya
 * hicimos con Civil: diagnosticar contra el texto crudo y ajustar.
 *
 * SEGURIDAD -- por qué --execute NO escribe a producción: este repo es
 * público. Ningún script comiteado en esta sesión (ingesta-cpp.ts,
 * ingesta-civil.ts, insertar-cpp.ts, insertar-civil.ts) ha tenido nunca
 * capacidad de conectarse a Supabase con una llave privilegiada -- ni
 * siquiera insertar-*.ts, que genera embeddings reales: ese solo escribe
 * un .sql local. La ejecución real contra producción siempre ocurrió por
 * fuera del repo (canal MCP de Supabase, o pegando una llave a mano en una
 * sesión interactiva) -- nunca por código versionado. --execute aquí sigue
 * exactamente ese patrón: genera embeddings + un .sql local declarado, no
 * abre ninguna conexión de red hacia Supabase ni lee ningún secreto de
 * service_role.
 *
 * Uso:
 *   npx tsx scripts/ingestar-ley.ts \
 *     --input <ruta.pdf|ruta.txt> \
 *     --coleccion mayalex_normativos \
 *     --materia 01_PENAL \
 *     --fuente "Código X de Honduras (Decreto N-AAAA)" \
 *     --fuente-tipo codigo \
 *     --id-prefix mayalex_normativos:codigo_x_AAAA \
 *     --instrumento "Decreto N-AAAA" \
 *     [--dry-run]              (default: true)
 *     [--execute <salida.sql>] (genera embeddings + .sql local; NO inserta)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tieneEncabezadoArticulo } from '../lib/rag/search';

// ── Whitelist -- requisito #6: no inventar materia/coleccion nuevas sin
// PR de router. Mismos valores confirmados en producción (SELECT DISTINCT
// materia/coleccion FROM biblioteca_vectores, 2026-09-04). Si hace falta
// una materia nueva, eso es un PR aparte que además actualice
// detectarMateriaDesdeTexto/COLECCIONES_CIVIL en lib/rag/search.ts y
// app/api/chat/route.ts -- ver el hallazgo P1 de esta misma sesión sobre
// el CPC: reetiquetar materia sin tocar ese código rompe la búsqueda
// exacta. ──
const MATERIAS_VALIDAS = new Set([
  '00_CONSTITUCIONAL', '01_PENAL', '02_CIVIL', '03_NOTARIAL',
  '05_LABORAL', '06_FAMILIA', '07_CONSTITUCIONAL', '08_TRIBUTARIO',
  '09_AGRARIO', '10_LEYES_REGLAMENTOS',
]);
const COLECCIONES_VALIDAS = new Set([
  'mayalex_normativos', 'mayalex_instrumentos', 'mayalex_procedimental',
]);
const FUENTE_TIPOS_VALIDOS = new Set(['codigo', 'sentencia', 'doctrina']);

const EMBED_DIMS = 384;

export function fallarDuro(motivo: string): never {
  console.error(`\n🛑 FAIL-HARD: ${motivo}\n`);
  process.exit(1);
}

// ── CLI ──────────────────────────────────────────────────────────────────
export interface OpcionesCLI {
  input: string;
  coleccion: string;
  materia: string;
  fuente: string;
  fuenteTipo: string;
  idPrefix: string;
  instrumento?: string;
  jurisdiccion: string;
  dryRun: boolean;
  execute: string | null; // ruta de salida .sql, o null si no se pidió --execute
}

export function parsearArgs(argv: string[]): OpcionesCLI {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const has = (flag: string): boolean => argv.includes(flag);

  const input = get('--input');
  const coleccion = get('--coleccion');
  const materia = get('--materia');
  const fuente = get('--fuente');
  const fuenteTipo = get('--fuente-tipo') ?? 'codigo';
  const idPrefix = get('--id-prefix');
  const jurisdiccion = get('--jurisdiccion') ?? 'HN';
  const executeOut = get('--execute') ?? null;
  const dryRun = !executeOut; // --execute es lo único que saca del modo dry-run

  if (!input) fallarDuro('falta --input <ruta.pdf|ruta.txt>');
  if (!coleccion) fallarDuro('falta --coleccion');
  if (!materia) fallarDuro('falta --materia');
  if (!fuente) fallarDuro('falta --fuente');
  if (!idPrefix) fallarDuro('falta --id-prefix (ej. mayalex_normativos:codigo_x_AAAA)');
  if (!COLECCIONES_VALIDAS.has(coleccion)) {
    fallarDuro(`--coleccion "${coleccion}" no está en la whitelist (${[...COLECCIONES_VALIDAS].join(', ')}) -- no se inventan colecciones nuevas sin PR de router`);
  }
  if (!MATERIAS_VALIDAS.has(materia)) {
    fallarDuro(`--materia "${materia}" no está en la whitelist (${[...MATERIAS_VALIDAS].join(', ')}) -- no se inventan materias nuevas sin PR de router (ver hallazgo P1 sobre el CPC: reetiquetar materia sin tocar detectarMateriaDesdeTexto rompe la búsqueda exacta)`);
  }
  if (!FUENTE_TIPOS_VALIDOS.has(fuenteTipo)) {
    fallarDuro(`--fuente-tipo "${fuenteTipo}" inválido (${[...FUENTE_TIPOS_VALIDOS].join(', ')})`);
  }

  return {
    input, coleccion, materia, fuente, fuenteTipo, idPrefix,
    instrumento: get('--instrumento'),
    jurisdiccion,
    dryRun,
    execute: executeOut,
  };
}

// ── Extracción ───────────────────────────────────────────────────────────
export function extraerTexto(rutaInput: string): string {
  if (rutaInput.toLowerCase().endsWith('.txt')) {
    return readFileSync(rutaInput, 'utf8');
  }
  try {
    return execFileSync('pdftotext', ['-layout', '-enc', 'UTF-8', rutaInput, '-'], {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch (err) {
    fallarDuro(`no se pudo extraer texto de ${rutaInput}: ${(err as Error).message}`);
  }
}

// ── Segmentación genérica ────────────────────────────────────────────────
// Misma familia de terminadores ya verificada contra CPP (".-") y Civil
// (". " y stubs sin punto) -- ver lib/rag/search.ts::tieneEncabezadoArticulo,
// que es la función que decide aceptar/rechazar cada candidato aquí, no
// una copia local del criterio.
const PATRON_CANDIDATO = /art[ií]culos?\s*(\d+[a-z]?)\s*(?:\.-|\.\s+|\s+)/gi;

export interface ChunkCandidato {
  numArticulo: string;
  contenido: string;
  aceptado: boolean;
}

export function segmentarGenerico(textoLimpio: string): ChunkCandidato[] {
  const coincidencias = [...textoLimpio.matchAll(PATRON_CANDIDATO)];
  const candidatos: ChunkCandidato[] = [];
  for (let i = 0; i < coincidencias.length; i++) {
    const m = coincidencias[i];
    const inicio = m.index ?? 0;
    const fin = coincidencias[i + 1]?.index ?? textoLimpio.length;
    const numArticulo = m[1];
    const contenido = textoLimpio.slice(inicio, fin).trim();
    // Única fuente de verdad para "¿es un encabezado real?" -- la misma
    // función que ya filtra en producción, no un criterio local distinto.
    const aceptado = tieneEncabezadoArticulo(contenido, numArticulo);
    candidatos.push({ numArticulo, contenido, aceptado });
  }
  return candidatos;
}

function limpiarRuidoBasico(texto: string): string {
  // Limpieza mínima, genérica (form-feed, líneas de número de página
  // sueltas). NO incluye nada afinado a una fuente concreta (eso es
  // trabajo del propio ingesta-<ley>.ts si esta fuente lo necesita).
  return texto
    .replace(/\f/g, '\n')
    .replace(/^[ \t]*\d{1,4}[ \t]*$/gm, '')
    .replace(/\n{3,}/g, '\n\n');
}

// ── Registro canónico ────────────────────────────────────────────────────
export interface RegistroGenerico {
  id: string;
  fuente: string;
  materia: string;
  num_articulo: string;
  es_norma_vigente: boolean;
  jurisdiccion: string;
  fuente_tipo: string;
  coleccion: string;
  metadata: Record<string, unknown>;
  contenido: string;
}

function sha256(texto: string): string {
  return createHash('sha256').update(texto, 'utf8').digest('hex');
}

export function construirRegistro(c: ChunkCandidato, opts: OpcionesCLI): RegistroGenerico {
  const idSufijo = c.numArticulo.toLowerCase();
  return {
    id: `${opts.idPrefix}_a${idSufijo}`,
    fuente: opts.fuente,
    materia: opts.materia,
    num_articulo: c.numArticulo,
    es_norma_vigente: true, // esta herramienta genérica NO detecta "Derogado" -- revisar a mano si la fuente tiene derogaciones, igual que se hizo con Civil
    jurisdiccion: opts.jurisdiccion,
    fuente_tipo: opts.fuenteTipo,
    coleccion: opts.coleccion,
    metadata: {
      instrumento: opts.instrumento ?? opts.fuente,
      norm_id: opts.idPrefix,
      tipo_instrumento: opts.fuenteTipo,
      metodo_extraccion: 'ingestar-ley.ts (extractor genérico, primera pasada) -- pendiente de verificación manual artículo por artículo, igual que toda fuente anterior de este corpus',
      hash_texto_sha256: sha256(c.contenido),
      verificado: false,
      fecha_verificacion: null,
    },
    contenido: c.contenido,
  };
}

// ── Embeddings locales (solo en modo --execute) ─────────────────────────
// Mismo mecanismo que scripts/insertar-civil.ts: @xenova/transformers,
// quantized:false (verificado bit-idéntico a la API de HF en esa sesión --
// ver PR #20). Prohibido explícitamente: FakeEmbedding, HF Inference API.
async function cargarExtractorEmbeddings() {
  const { pipeline } = await import('@xenova/transformers');
  console.log('Cargando Xenova/multilingual-e5-small localmente (quantized:false)...');
  return pipeline('feature-extraction', 'Xenova/multilingual-e5-small', { quantized: false } as never);
}

async function embedPassage(extractor: unknown, texto: string): Promise<number[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const salida = await (extractor as any)(`passage: ${texto}`, { pooling: 'mean', normalize: true });
  const vec = Array.from(salida.data as Float32Array);
  if (vec.length !== EMBED_DIMS) {
    throw new Error(`embedding local: dims inesperadas (${vec.length} ≠ ${EMBED_DIMS})`);
  }
  return vec as number[];
}

// ── SQL declarado (idéntico patrón a insertar-civil.ts) ────────────────
function sqlStringLiteral(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}
function vectorLiteral(v: number[]): string {
  return `'[${v.map((x) => x.toFixed(6)).join(',')}]'::vector(384)`;
}

function generarSQL(registros: Array<RegistroGenerico & { embedding: number[] }>, stagingTable: string): string {
  let sql = `-- Generado por scripts/ingestar-ley.ts -- NO editar a mano.\n`;
  sql += `-- ${registros.length} filas. NO ejecutado por este script -- revisar y ejecutar por el canal MCP\n`;
  sql += `-- de Supabase ya autenticado, igual que todas las ingestas anteriores de esta sesión.\n\n`;
  sql += `DROP TABLE IF EXISTS ${stagingTable};\n`;
  sql += `CREATE TABLE ${stagingTable} (\n`;
  sql += `  id text PRIMARY KEY,\n  coleccion text,\n  materia text,\n  contenido text,\n`;
  sql += `  num_articulo text,\n  fuente text,\n  metadata jsonb,\n  embedding vector(384),\n`;
  sql += `  jurisdiccion text,\n  fuente_tipo text,\n  es_norma_vigente boolean\n);\n\n`;

  const BATCH = 50;
  for (let i = 0; i < registros.length; i += BATCH) {
    const lote = registros.slice(i, i + BATCH);
    sql += `INSERT INTO ${stagingTable} (id, coleccion, materia, contenido, num_articulo, fuente, metadata, embedding, jurisdiccion, fuente_tipo, es_norma_vigente) VALUES\n`;
    sql += lote
      .map(
        (r) =>
          `  (${sqlStringLiteral(r.id)}, ${sqlStringLiteral(r.coleccion)}, ${sqlStringLiteral(r.materia)}, ${sqlStringLiteral(r.contenido)}, ${sqlStringLiteral(r.num_articulo)}, ${sqlStringLiteral(r.fuente)}, ${sqlStringLiteral(JSON.stringify(r.metadata))}::jsonb, ${vectorLiteral(r.embedding)}, ${sqlStringLiteral(r.jurisdiccion)}, ${sqlStringLiteral(r.fuente_tipo)}, ${r.es_norma_vigente})`,
      )
      .join(',\n');
    sql += ';\n\n';
  }

  // Aditivo puro -- SIN DELETE. Igual que Civil: esta herramienta nunca
  // asume que debe reemplazar nada existente; eso es una decisión humana
  // aparte (ver el propio caso del CPC: relabeling ≠ decisión automática).
  sql += `-- Movimiento aditivo -- SIN DELETE, idempotente por id (ON CONFLICT DO NOTHING:\n`;
  sql += `-- si ya existe un id igual, no se duplica ni se sobreescribe silenciosamente).\n`;
  sql += `DO $$\nDECLARE rc integer;\nBEGIN\n`;
  sql += `  INSERT INTO biblioteca_vectores (id, coleccion, materia, contenido, num_articulo, fuente, metadata, embedding, jurisdiccion, fuente_tipo, es_norma_vigente)\n`;
  sql += `  SELECT id, coleccion, materia, contenido, num_articulo, fuente, metadata, embedding, jurisdiccion, fuente_tipo, es_norma_vigente\n`;
  sql += `  FROM ${stagingTable}\n`;
  sql += `  ON CONFLICT (id) DO NOTHING;\n`;
  sql += `  GET DIAGNOSTICS rc = ROW_COUNT;\n`;
  sql += `  IF rc = 0 THEN\n`;
  sql += `    RAISE NOTICE 'Cero filas insertadas -- probable colisión total de ids con filas ya existentes; revisar antes de asumir éxito';\n`;
  sql += `  END IF;\n`;
  sql += `END $$;\n\n`;
  sql += `DROP TABLE ${stagingTable};\n`;
  return sql;
}

// ── main ─────────────────────────────────────────────────────────────────
async function main() {
  const opts = parsearArgs(process.argv.slice(2));

  console.log(`=== ingestar-ley.ts — ${opts.dryRun ? 'DRY-RUN (solo lectura local, sin embeddings)' : 'EXECUTE (genera embeddings + .sql local, NO inserta a producción)'} ===`);
  console.log(`Fuente: ${opts.input}`);
  console.log(`Coleccion: ${opts.coleccion} | Materia: ${opts.materia} | Fuente_tipo: ${opts.fuenteTipo}\n`);

  const textoCrudo = extraerTexto(opts.input);
  const textoLimpio = limpiarRuidoBasico(textoCrudo);
  const candidatos = segmentarGenerico(textoLimpio);

  const aceptados = candidatos.filter((c) => c.aceptado);
  const rechazados = candidatos.filter((c) => !c.aceptado);

  console.log(`Candidatos totales: ${candidatos.length}`);
  console.log(`Aceptados (pasan tieneEncabezadoArticulo): ${aceptados.length}`);
  console.log(`Rechazados: ${rechazados.length}\n`);

  if (aceptados.length === 0) {
    fallarDuro('cero artículos aceptados -- revisar el formato real de la fuente antes de continuar (ver ADVERTENCIA DE USO en la cabecera de este archivo)');
  }

  // Duplicados de num_articulo -- fail-hard, igual que toda ingesta anterior.
  const vistos = new Map<string, number>();
  for (const a of aceptados) vistos.set(a.numArticulo, (vistos.get(a.numArticulo) ?? 0) + 1);
  const duplicados = [...vistos.entries()].filter(([, n]) => n > 1);
  if (duplicados.length > 0) {
    fallarDuro(`números de artículo duplicados tras la segmentación: ${duplicados.map(([n, c]) => `${n}(x${c})`).join(', ')} -- revisar manualmente, esta herramienta no colapsa duplicados de imprenta automáticamente (a diferencia de ingesta-civil.ts, que sí lo hace tras verificar contenido idéntico)`);
  }

  console.log('=== Muestra: primer y último artículo aceptado ===');
  console.log(`Art. ${aceptados[0].numArticulo}:`, JSON.stringify(aceptados[0].contenido.slice(0, 200)));
  console.log(`Art. ${aceptados[aceptados.length - 1].numArticulo}:`, JSON.stringify(aceptados[aceptados.length - 1].contenido.slice(0, 200)));

  if (rechazados.length > 0) {
    console.log(`\n=== Primeros 10 rechazados (revisar si son ruido real o falsos negativos del extractor) ===`);
    for (const r of rechazados.slice(0, 10)) {
      console.log(`  Art.candidato ${r.numArticulo}: ${JSON.stringify(r.contenido.slice(0, 100))}`);
    }
  }

  const registros = aceptados.map((c) => construirRegistro(c, opts));

  if (opts.dryRun) {
    console.log('\n🔒 DRY-RUN: no se generó ningún embedding, no se escribió ningún artefacto. Revisar los conteos/muestras de arriba antes de correr --execute.');
    return;
  }

  // --execute: embeddings locales + .sql (NO inserta, ver cabecera).
  const extractor = await cargarExtractorEmbeddings();
  const conEmbeddings: Array<RegistroGenerico & { embedding: number[] }> = [];
  let i = 0;
  for (const r of registros) {
    i++;
    process.stdout.write(`[${i}/${registros.length}] Art. ${r.num_articulo}... `);
    const embedding = await embedPassage(extractor, r.contenido);
    console.log('OK');
    conEmbeddings.push({ ...r, embedding });
  }

  const stagingTable = `stg_${opts.idPrefix.split(':')[1]?.replace(/[^a-z0-9_]/gi, '_') ?? 'ingesta_generica'}`;
  const sql = generarSQL(conEmbeddings, stagingTable);
  mkdirSync(dirname(opts.execute!), { recursive: true });
  writeFileSync(opts.execute!, sql, 'utf8');
  console.log(`\n✅ SQL escrito en: ${opts.execute} (${sql.length} caracteres, ${conEmbeddings.length} filas)`);
  console.log('🔒 Este script no ejecutó ningún SQL contra producción -- solo lo escribió a archivo. Aditivo, ON CONFLICT DO NOTHING, sin DELETE.');
}

if (process.argv[1] && process.argv[1].endsWith('ingestar-ley.ts')) {
  main().catch((err) => {
    console.error('FALLÓ:', err);
    process.exit(1);
  });
}
