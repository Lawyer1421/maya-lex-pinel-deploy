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

// Cuántos caracteres tras el propio match bastan para que
// tieneEncabezadoArticulo decida aceptar/rechazar -- esa función solo mira
// UN caracter después del separador (ver lib/rag/search.ts:311), así que
// cualquier ventana holgada es suficiente; 250 dobla el margen del match
// más largo posible (artículo + número de 4 dígitos + letra + separador).
const VENTANA_ENCABEZADO = 250;

// HALLAZGO (2026-09-05, post-mortem del apply de Código de Comercio,
// ~62/1674 filas ya en producción): esta función truncaba ~140 artículos
// reales (≈8.4% del Código de Comercio) cortando su contenido a media
// oración. Causa raíz: PATRON_CANDIDATO no distingue un encabezado real
// ("Articulo 65") de una referencia cruzada DENTRO del cuerpo de OTRO
// artículo ("...a que se refieren los artículos 197 y 198"). La versión
// anterior fijaba el límite `fin` de cada candidato en el índice del
// SIGUIENTE match crudo, sin importar si ese siguiente match terminaba
// siendo aceptado o rechazado -- así que en cuanto el cuerpo de un
// artículo real mencionaba "artículo N" de pasada, el candidato real se
// cortaba ahí mismo, perdiendo el resto de su propio contenido (y ese
// fragmento de referencia cruzada, correctamente rechazado después por
// tieneEncabezadoArticulo, absorbía en su lugar todo lo que faltaba del
// artículo real MÁS el artículo siguiente completo).
//
// Fix: separar en dos pasadas. (1) decidir aceptado/rechazado de cada
// match crudo mirando solo una ventana acotada inmediatamente después de
// su propio índice -- nunca el texto hasta el siguiente match, así que
// una referencia cruzada se evalúa (y se rechaza) con SU PROPIO contexto,
// sin depender de dónde empiece el candidato siguiente. (2) una vez que
// sabemos qué matches son encabezados reales, los límites de cada
// segmento se fijan SOLO entre encabezados aceptados consecutivos -- un
// match rechazado nunca puede partir en dos el contenido de un artículo
// real. Los rechazados se conservan aparte (con su propia ventana corta
// como contenido) únicamente para el reporte de diagnóstico de main(); no
// participan en la segmentación real.
export interface OpcionesSegmentacion {
  // HALLAZGO 3 (post-mortem Código de Comercio, 2026-09-05): tieneEncabezadoArticulo
  // por sí sola es demasiado débil para distinguir un encabezado real de una
  // cita dentro de una oración -- "conforme al artículo 43. Ni la escritura
  // social..." pasa exactamente igual que un encabezado real, porque "Ni"
  // empieza con mayúscula como cualquier oración nueva. Se verificó contra
  // TODA la fuente del Código de Comercio (script de diagnóstico ad-hoc, no
  // versionado) que ESA fuente distingue consistentemente ambos casos por
  // ORTOGRAFÍA, no por posición: cada una de las ~1680 apariciones de
  // encabezado real usa la forma "Articulo" (A mayúscula, SIN tilde en la
  // í) -- mientras que las ~150 citas dentro del cuerpo de otros artículos
  // usan siempre "artículo"/"Artículo"/"artículos"/"Artículos" (con tilde)
  // o, unas pocas veces, "articulo" (minúscula, sin tilde) -- nunca la
  // forma exacta de encabezado. Cero excepciones encontradas en ninguna
  // dirección PARA ESA FUENTE.
  //
  // Esto es una convención tipográfica de ESE documento, no una regla
  // universal -- el propio test suite de este archivo (formato "stub sin
  // punto") ejercita una fuente sintética que usa la forma CON tilde
  // ("Artículo 21 Derogado") como encabezado real legítimo. Por eso esta
  // señal es opt-in (default false, preserva el comportamiento genérico
  // para cualquier fuente nueva) -- cada ingesta-<ley>.ts decide si su
  // propia fuente sigue esta convención, tras verificarlo contra su propio
  // texto (igual que ingesta-comercio.ts lo hizo antes de activarla).
  exigirOrtografiaSinTilde?: boolean;
}

export function segmentarGenerico(
  textoLimpio: string,
  opciones: OpcionesSegmentacion = {},
): ChunkCandidato[] {
  const coincidencias = [...textoLimpio.matchAll(PATRON_CANDIDATO)];

  const esOrtografiaDeEncabezado = (matchTexto: string): boolean =>
    !opciones.exigirOrtografiaSinTilde || (/^A/.test(matchTexto) && !/[íÍ]/.test(matchTexto));

  const brutos = coincidencias.map((m) => {
    const inicio = m.index ?? 0;
    const numArticulo = m[1];
    const largoMatch = m[0].length;
    const ventana = textoLimpio.slice(inicio, inicio + VENTANA_ENCABEZADO);
    // Única fuente de verdad para "¿es un encabezado real?" -- la misma
    // función que ya filtra en producción, no un criterio local distinto.
    // Se evalúa contra una ventana corta, NUNCA contra el texto completo
    // hasta el siguiente match (ver hallazgo arriba). Se exige además la
    // ortografía de encabezado cuando la fuente lo pide (hallazgo 3).
    const aceptado = esOrtografiaDeEncabezado(m[0]) && tieneEncabezadoArticulo(ventana, numArticulo);
    return { inicio, numArticulo, aceptado, largoMatch };
  });

  const aceptados = brutos.filter((b) => b.aceptado);

  // HALLAZGO 2 (mismo post-mortem): tieneEncabezadoArticulo también acepta
  // por pura coincidencia una referencia cruzada de UN SOLO número que
  // queda justo pegada, tras un salto de párrafo, al inicio del siguiente
  // encabezado real -- p.ej. "...se estará a lo dispuesto por el Artículo
  // 31.\n\nArticulo 34\n..." (Art.33 citando al 31, un número YA usado
  // antes); el caracter que sigue al "31." es la "A" mayúscula de
  // "Articulo 34", así que el heurístico (que solo mira un caracter) la
  // acepta como si fuera un encabezado propio. Se detecta igual que antes:
  // un candidato "aceptado" cuyo contenido, una vez restado el propio
  // texto del match, no deja NINGÚN cuerpo real -- un artículo real nunca
  // tiene cuerpo vacío. Este chequeo usa una frontera PROVISIONAL (el
  // siguiente aceptado crudo, sin filtrar todavía) -- eso basta para
  // detectar el fantasma, sin importar si ese "siguiente" resulta a su vez
  // ser otro fantasma.
  const esVacio = aceptados.map((b, i) => {
    const finProvisional = aceptados[i + 1]?.inicio ?? textoLimpio.length;
    const cuerpo = textoLimpio.slice(b.inicio, finProvisional).slice(b.largoMatch).trim();
    return cuerpo.length === 0;
  });

  // Corrección clave (sin la cual el hallazgo 2 solo tapaba el síntoma):
  // un fantasma detectado arriba NO puede seguir actuando como frontera
  // para el artículo real que lo precede -- si lo hiciera, ese artículo
  // real perdería igual su propia referencia cruzada final (el "Artículo
  // 31." desaparecería sin dejar rastro en ningún lado, en vez de quedar
  // dentro del cuerpo de Art.33, que es donde realmente pertenece). Por
  // eso las fronteras reales de segmentación se recalculan aquí usando
  // SOLO los encabezados que sobrevivieron ambos filtros (aceptado Y no
  // vacío) -- un fantasma de por medio simplemente se salta, y el
  // artículo anterior se extiende hasta el siguiente encabezado genuino.
  const reales = aceptados.filter((_, i) => !esVacio[i]);
  const candidatos: ChunkCandidato[] = reales.map((b, i) => {
    const fin = reales[i + 1]?.inicio ?? textoLimpio.length;
    const contenido = textoLimpio.slice(b.inicio, fin).trim();
    return { numArticulo: b.numArticulo, contenido, aceptado: true };
  });

  // Diagnóstico solamente -- main() los usa para mostrar "primeros 10
  // rechazados" en el dry-run; su `contenido` aquí es deliberadamente la
  // ventana corta (no el tramo completo hasta el siguiente match real).
  const rechazados: ChunkCandidato[] = brutos
    .filter((b) => !b.aceptado)
    .map((b) => ({
      numArticulo: b.numArticulo,
      contenido: textoLimpio.slice(b.inicio, b.inicio + VENTANA_ENCABEZADO).trim(),
      aceptado: false,
    }));
  const vacios: ChunkCandidato[] = aceptados
    .filter((_, i) => esVacio[i])
    .map((b) => ({
      numArticulo: b.numArticulo,
      contenido: textoLimpio.slice(b.inicio, b.inicio + VENTANA_ENCABEZADO).trim(),
      aceptado: false,
    }));

  return [...candidatos, ...rechazados, ...vacios];
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
