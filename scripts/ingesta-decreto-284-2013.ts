/**
 * Ingesta del Decreto Legislativo No. 284-2013 (Ley para la Generación de
 * Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y
 * Protección a los Derechos de los Inversionistas), como instrumento
 * autónomo -- decisión del fundador (2026-09-25): NO es una simple reforma
 * textual de otro código, es una ley formal independiente con sus propios
 * 39 artículos. La ingesta la refleja tal cual, con su propia identidad de
 * instrumento (Decreto 284-2013, La Gaceta No. 33,445).
 *
 * PROBLEMA DE SEGMENTACIÓN (hallazgo 2026-09-25, verificado línea por línea
 * contra el OCR crudo): 4 de los 39 artículos del decreto (13, 14, 26 y 27)
 * REFORMAN otros instrumentos citando el texto nuevo completo, con su
 * propio encabezado "ARTÍCULO N.-" incrustado dentro del cuerpo:
 *
 *   Art.13 -> cita Arts. 14,15,18,157,169,189,193,210,222,224,226,228 del
 *             Código de Comercio (Decreto 73-50)
 *   Art.14 -> cita Arts. 1782 y 1789 del Código Civil
 *   Art.26 -> cita Arts. 21,40,42-46,50 + nuevo Art.17-A de la Ley de
 *             Promoción y Protección de Inversiones (Decreto 51-2011)
 *   Art.27 -> cita Arts. 29 y 34 de la Ley de Promoción de la Alianza
 *             Público-Privada (Decreto 143-2010)
 *
 * Sin corrección, el segmentador genérico (mismo PATRON_CANDIDATO que usa
 * toda esta familia de scripts) toma cada "ARTÍCULO N.-" citado como si
 * fuera un encabezado propio de ESTE documento. De los 24 números citados,
 * 6 colisionan con la numeración real del decreto (14,15,18,21,29,34) y
 * disparan el fail-hard de duplicados -- pero los otros 18 (157, 169, 1782,
 * 17-A, 40, 42-46, 50) NO colisionan (el decreto solo llega hasta el
 * Art.39) y habrían entrado en SILENCIO como si Decreto 284-2013 tuviera
 * un "Artículo 1782" propio -- error de identidad documental, no solo de
 * conteo.
 *
 * FIX: en el OCR, cada cita textual está SIEMPRE precedida por la comilla
 * tipográfica de apertura "“" (verificado con las 24 ocurrencias, cero
 * excepciones -- ningún encabezado real del decreto está precedido por esa
 * comilla). Se elimina el "ARTÍCULO N.-" citado que sigue inmediatamente a
 * esa comilla ANTES de segmentar, dejando el texto reformado como cuerpo
 * final del artículo real (13/14/26/27) que lo introduce -- no se pierde
 * contenido, solo se evita que el sub-encabezado citado compita por su
 * propio número.
 *
 * Reconciliación de vigencia y textos refundidos en Comercio/Civil: diferida
 * a un pliego de gobernanza de vigencia separado (decisión del fundador,
 * 2026-09-25) -- esta ingesta NO toca Comercio ni Civil, solo agrega
 * Decreto 284-2013 como instrumento propio. es_norma_vigente=false por
 * diseño (INGESTION_PIPELINE_CAN_DECLARE_VIGENCIA = NEVER, igual que el
 * resto de esta familia de scripts).
 */
import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { createHash } from 'crypto';
import {
  extraerTexto,
  segmentarGenerico,
  construirRegistro,
  fallarDuro,
  validarEmbeddingNoDummy,
  validarLoteAntesDeSQL,
  validarSQLNoDestructivo,
  generarManifest,
  escribirManifest,
  EMBED_DIMS,
  type OpcionesCLI,
  type RegistroGenerico,
} from './ingestar-ley';

function sha256(texto: string): string {
  return createHash('sha256').update(texto, 'utf8').digest('hex');
}

function limpiarCitasIncrustadas(texto: string): string {
  // Quita "ARTÍCULO N.-" (o "N-A.-") cuando sigue inmediatamente a la
  // comilla de apertura -- deja la comilla, quita solo el encabezado citado.
  return texto.replace(/(“)\s*art[ií]culos?\s*\d+[a-z-]*\s*\.-\s*/gi, '$1');
}

function limpiarRuidoBasico(texto: string): string {
  return texto
    .replace(/\r\n/g, '\n')
    .replace(/\f/g, '\n')
    // Artefacto de OCR de este documento: "ARTÍCULO $5.-" (el glifo "5" se
    // leyó como "$5") -- verificado contra el crudo, un solo caso (Art.5).
    // Mismo patrón de fondo que el glifo "º/°" de ingesta-comercio.ts: un
    // caracter espurio entre la palabra y el número, específico de este
    // escaneo.
    .replace(/(art[ií]culos?)\s*\$\s*(\d)/gi, '$1 $2')
    .replace(/^[ \t]*\d{1,4}[ \t]*$/gm, '')
    .replace(/\n{3,}/g, '\n\n');
}

function sqlStringLiteral(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}
function vectorLiteral(v: number[]): string {
  return `'[${v.map((x) => x.toFixed(6)).join(',')}]'::vector(384)`;
}

function generarSQL(registros: Array<RegistroGenerico & { embedding: number[] }>, stagingTable: string): string {
  let sql = `-- Generado por scripts/ingesta-decreto-284-2013.ts -- NO editar a mano.\n`;
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

  sql += `-- Movimiento aditivo -- SIN DELETE, idempotente por id (ON CONFLICT DO NOTHING).\n`;
  sql += `DO $$\nDECLARE rc integer;\nBEGIN\n`;
  sql += `  INSERT INTO biblioteca_vectores (id, coleccion, materia, contenido, num_articulo, fuente, metadata, embedding, jurisdiccion, fuente_tipo, es_norma_vigente)\n`;
  sql += `  SELECT id, coleccion, materia, contenido, num_articulo, fuente, metadata, embedding, jurisdiccion, fuente_tipo, es_norma_vigente\n`;
  sql += `  FROM ${stagingTable}\n`;
  sql += `  ON CONFLICT (id) DO NOTHING;\n`;
  sql += `  GET DIAGNOSTICS rc = ROW_COUNT;\n`;
  sql += `  IF rc != ${registros.length} THEN\n`;
  sql += `    RAISE EXCEPTION 'esperaba % filas insertadas, se insertaron % -- revisar antes de asumir éxito', ${registros.length}, rc;\n`;
  sql += `  END IF;\n`;
  sql += `END $$;\n\n`;
  sql += `DROP TABLE ${stagingTable};\n`;
  return sql;
}

async function cargarExtractorEmbeddings() {
  const { pipeline } = await import('@xenova/transformers');
  console.log('Cargando Xenova/multilingual-e5-small localmente (quantized:false)...');
  return pipeline('feature-extraction', 'Xenova/multilingual-e5-small', { quantized: false } as never);
}

async function embedPassage(extractor: unknown, texto: string): Promise<number[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const salida = await (extractor as any)(`passage: ${texto}`, { pooling: 'mean', normalize: true });
  const vec = Array.from(salida.data as Float32Array) as number[];
  validarEmbeddingNoDummy(vec, EMBED_DIMS);
  return vec;
}

async function main() {
  const argv = process.argv.slice(2);
  const execIdx = argv.indexOf('--execute');
  const execute = execIdx !== -1 ? argv[execIdx + 1] : null;
  const input = argv[argv.indexOf('--input') + 1];
  if (!input) fallarDuro('--input requerido');

  const opts: OpcionesCLI = {
    input,
    coleccion: 'mayalex_normativos',
    materia: '10_LEYES_REGLAMENTOS',
    fuente: 'Ley para la Generacion de Empleo, Fomento a la Iniciativa Empresarial, Formalizacion de Negocios y Proteccion a los Derechos de los Inversionistas (Decreto Legislativo No. 284-2013, La Gaceta No. 33,445 del 5 de junio de 2014)',
    fuenteTipo: 'codigo',
    idPrefix: 'mayalex_normativos:decreto_284_2013',
    instrumento: 'Decreto 284-2013',
    jurisdiccion: 'HN',
    dryRun: !execute,
    execute,
    // Sin evidencia de encabezados Gaceta con guion espaciado en este
    // decreto -- se deja en el default seguro (false), igual que el resto
    // del código heredado de ingestar-ley.ts antes del opt-in.
    acceptSpacedDashHeading: false,
  };

  console.log(`=== ingesta-decreto-284-2013.ts — ${opts.dryRun ? 'DRY-RUN' : 'EXECUTE'} ===`);

  const textoCrudo = extraerTexto(opts.input);
  const textoSinCitas = limpiarCitasIncrustadas(textoCrudo);
  const textoLimpio = limpiarRuidoBasico(textoSinCitas);
  const candidatos = segmentarGenerico(textoLimpio, {});
  const aceptados = candidatos.filter((c) => c.aceptado);
  const rechazados = candidatos.filter((c) => !c.aceptado);

  console.log(`Candidatos totales: ${candidatos.length}`);
  console.log(`Aceptados (pasan tieneEncabezadoArticulo): ${aceptados.length}`);
  console.log(`Rechazados: ${rechazados.length}\n`);

  const vistos = new Map<string, number>();
  for (const a of aceptados) vistos.set(a.numArticulo, (vistos.get(a.numArticulo) ?? 0) + 1);
  const duplicados = [...vistos.entries()].filter(([, n]) => n > 1);
  if (duplicados.length > 0) {
    fallarDuro(`Quedaron duplicados tras limpiar las citas incrustadas: ${duplicados.map(([n, c]) => `${n}(x${c})`).join(', ')} -- revisar manualmente antes de continuar`);
  }

  const numerosEsperados = Array.from({ length: 39 }, (_, i) => String(i + 1));
  const faltantes = numerosEsperados.filter((n) => !vistos.has(n));
  console.log(`=== Cobertura: ${aceptados.length}/39 artículos esperados del decreto ===`);
  if (faltantes.length > 0) {
    console.log(`Faltantes: ${faltantes.join(', ')}`);
  }

  const muestra = ['1', '13', '14', '26', '27', '37', '38', '39'];
  for (const n of muestra) {
    const f = aceptados.find((x) => x.numArticulo === n);
    console.log(`Art.${n}:`, f ? JSON.stringify(f.contenido.slice(0, 220)) : '(no encontrado)');
  }

  const registros = aceptados.map((c) => construirRegistro(c, opts));
  validarLoteAntesDeSQL(registros);

  if (opts.dryRun) {
    console.log('\n🔒 DRY-RUN: no se generó ningún embedding, no se escribió ningún artefacto.');
    return;
  }

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

  const stagingTable = 'stg_decreto_284_2013';
  const sql = generarSQL(conEmbeddings, stagingTable);
  validarSQLNoDestructivo(sql, stagingTable);
  mkdirSync(dirname(opts.execute!), { recursive: true });
  writeFileSync(opts.execute!, sql, 'utf8');
  console.log(`\n✅ SQL escrito en: ${opts.execute} (${sql.length} caracteres, ${conEmbeddings.length} filas)`);
  console.log('🔒 Este script no ejecutó ningún SQL contra producción -- solo lo escribió a archivo. Aditivo, ON CONFLICT DO NOTHING, sin DELETE.');

  const sourceHash = sha256(textoCrudo);
  const sqlHash = sha256(sql);
  const manifest = generarManifest(registros, opts, {
    sourceHash,
    embeddingModel: 'Xenova/multilingual-e5-small (quantized:false)',
    sqlArtifactPath: opts.execute!,
    sqlArtifactHash: sqlHash,
  });
  const rutaManifest = `${opts.execute}.manifest.json`;
  escribirManifest(manifest, rutaManifest);
  console.log(`📄 Manifest escrito en: ${rutaManifest} (batch_id=${manifest.batch_id})`);
}

main().catch((err) => {
  console.error('FALLÓ:', err);
  process.exit(1);
});
