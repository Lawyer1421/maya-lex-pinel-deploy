/**
 * Ingesta del Código de Comercio de Honduras (Decreto 73-1950).
 *
 * Basado en scripts/ingestar-ley.ts (extractor genérico) pero con
 * resolución EXPLÍCITA de los 27 números de artículo duplicados que la
 * segmentación genérica encontró en la primera corrida real (fail-hard
 * documentado, ver reporte de dry-run 2026-09-05). Decisión editorial de
 * Fredy, no inventada por este script:
 *
 *   1) DEDUPLICAR_IDENTICOS (1511, 1541): las dos ocurrencias son el mismo
 *      texto (1541 solo difiere en acentos OCR) -- se conserva una sola
 *      fila, la de mejor calidad de texto.
 *   2) DESCARTAR_FRAGMENTO (486, 493, 556, 586, 1133, 1251): una de las dos
 *      ocurrencias no es contenido real del artículo -- es una mención de
 *      paso truncada justo antes de un título de CAPITULO/SECCION/
 *      SUBSECCION que coincidió por casualidad con el patrón de
 *      encabezado. Se descarta esa, se conserva el cuerpo real.
 *   3) EXCLUIR_AMBIGUOS (19 números): ambas ocurrencias tienen contenido
 *      legal sustantivo y coherente -- no hay forma de determinar cuál es
 *      el vigente sin revisar el layout visual de la página original
 *      (pdftoppm no disponible en este entorno). Se EXCLUYEN ambas de este
 *      primer .sql -- no se elige ninguna. Quedan como brecha de
 *      numeración pendiente de adjudicación visual (ver reporte al
 *      Auditor).
 *
 * Todo lo demás (extracción, segmentación, encabezado real, metadata,
 * SQL aditivo con ON CONFLICT DO NOTHING, fail-hard) reutiliza EXACTAMENTE
 * la misma lógica ya verificada de ingestar-ley.ts -- nada se relaja.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import {
  extraerTexto,
  segmentarGenerico,
  construirRegistro,
  fallarDuro,
  type OpcionesCLI,
  type ChunkCandidato,
  type RegistroGenerico,
} from './ingestar-ley';

const EMBED_DIMS = 384;

const DEDUPLICAR_IDENTICOS = new Set(['1511', '1541']);
const DESCARTAR_FRAGMENTO = new Set(['486', '493', '556', '586', '1133', '1251']);
const EXCLUIR_AMBIGUOS = new Set([
  '15', '43', '168', '205', '249', '418', '490', '500', '509', '516',
  '522', '534', '634', '750', '868', '1137', '1139', '1343', '1662',
]);

function esFragmentoEncabezado(c: ChunkCandidato): boolean {
  // Las 6 ocurrencias-fragmento identificadas terminan (tras el número y
  // opcional punto) directo en un título de sección, sin cuerpo legal real.
  return /^(SECC\s*ION|SECCION|SUBSECCI[OÓ]N|CAPITULO)\b/i.test(
    c.contenido.replace(/^art[ií]culos?\s*\d+[a-z]?\.?\s*/i, '').trim(),
  );
}

function limpiarRuidoBasico(texto: string): string {
  return texto
    .replace(/\r\n/g, '\n')
    .replace(/\f/g, '\n')
    .replace(/^[ \t]*\d{1,4}[ \t]*$/gm, '')
    .replace(/\n{3,}/g, '\n\n');
}

function resolverDuplicados(aceptados: ChunkCandidato[]): {
  finales: ChunkCandidato[];
  excluidos: string[];
  resumenResolucion: string[];
} {
  const porNumero = new Map<string, ChunkCandidato[]>();
  for (const c of aceptados) {
    const arr = porNumero.get(c.numArticulo) ?? [];
    arr.push(c);
    porNumero.set(c.numArticulo, arr);
  }

  const finales: ChunkCandidato[] = [];
  const excluidos: string[] = [];
  const resumenResolucion: string[] = [];

  for (const [numero, ocurrencias] of porNumero) {
    if (ocurrencias.length === 1) {
      finales.push(ocurrencias[0]);
      continue;
    }
    if (ocurrencias.length !== 2) {
      fallarDuro(`Art.${numero}: ${ocurrencias.length} ocurrencias -- caso no cubierto por la resolución manual (solo se previeron pares de 2)`);
    }

    if (EXCLUIR_AMBIGUOS.has(numero)) {
      excluidos.push(numero);
      resumenResolucion.push(`Art.${numero}: EXCLUIDO (ambiguo, ambas ocurrencias con contenido sustantivo -- pendiente de adjudicación visual)`);
      continue;
    }

    if (DEDUPLICAR_IDENTICOS.has(numero)) {
      const [a, b] = ocurrencias;
      // Conserva la de mejor calidad de texto (más acentos correctos) --
      // para 1511 son idénticas byte a byte, cualquiera sirve; para 1541
      // difieren solo en acentos OCR, se prefiere la variante acentuada.
      const mejor = a.contenido.length >= b.contenido.length && /[áéíóúÁÉÍÓÚ]/.test(a.contenido) ? a : b;
      finales.push(mejor);
      resumenResolucion.push(`Art.${numero}: DEDUPLICADO (2 ocurrencias, mismo contenido salvo variantes OCR de acentuación) -- conservada 1`);
      continue;
    }

    if (DESCARTAR_FRAGMENTO.has(numero)) {
      const [a, b] = ocurrencias;
      const aEsFragmento = esFragmentoEncabezado(a);
      const bEsFragmento = esFragmentoEncabezado(b);
      if (aEsFragmento === bEsFragmento) {
        fallarDuro(`Art.${numero}: se esperaba que exactamente una ocurrencia fuera un fragmento de encabezado (CAPITULO/SECCION) -- la detección automática no coincide con el análisis manual, revisar`);
      }
      finales.push(aEsFragmento ? b : a);
      resumenResolucion.push(`Art.${numero}: fragmento de encabezado descartado, conservado el cuerpo real (${(aEsFragmento ? b : a).contenido.length} chars)`);
      continue;
    }

    fallarDuro(`Art.${numero}: duplicado no clasificado en ninguna de las 3 categorías de la decisión editorial -- no se puede resolver automáticamente`);
  }

  finales.sort((x, y) => parseInt(x.numArticulo, 10) - parseInt(y.numArticulo, 10));
  excluidos.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  return { finales, excluidos, resumenResolucion };
}

function sqlStringLiteral(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}
function vectorLiteral(v: number[]): string {
  return `'[${v.map((x) => x.toFixed(6)).join(',')}]'::vector(384)`;
}

function generarSQL(registros: Array<RegistroGenerico & { embedding: number[] }>, stagingTable: string): string {
  let sql = `-- Generado por scripts/ingesta-comercio.ts -- NO editar a mano.\n`;
  sql += `-- ${registros.length} filas. NO ejecutado por este script -- revisar y ejecutar por el canal MCP\n`;
  sql += `-- de Supabase ya autenticado, igual que todas las ingestas anteriores de esta sesión.\n`;
  sql += `-- Excluye deliberadamente 19 números de artículo ambiguos (ver DECISION_LOG /\n`;
  sql += `-- reporte al Auditor 2026-09-05) -- brecha de numeración pendiente, no un error.\n\n`;
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
  const vec = Array.from(salida.data as Float32Array);
  if (vec.length !== EMBED_DIMS) {
    throw new Error(`embedding local: dims inesperadas (${vec.length} ≠ ${EMBED_DIMS})`);
  }
  return vec as number[];
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
    fuente: 'Codigo de Comercio (Decreto No. 73-1950, Congreso Nacional de Honduras)',
    fuenteTipo: 'codigo',
    idPrefix: 'mayalex_normativos:codigo_comercio_1950',
    instrumento: 'Decreto 73-1950',
    jurisdiccion: 'HN',
    dryRun: !execute,
    execute,
  };

  console.log(`=== ingesta-comercio.ts — ${opts.dryRun ? 'DRY-RUN' : 'EXECUTE'} ===`);

  const textoCrudo = extraerTexto(opts.input);
  const textoLimpio = limpiarRuidoBasico(textoCrudo);
  const candidatos = segmentarGenerico(textoLimpio);
  const aceptados = candidatos.filter((c) => c.aceptado);
  const rechazados = candidatos.filter((c) => !c.aceptado);

  console.log(`Candidatos totales: ${candidatos.length}`);
  console.log(`Aceptados (pasan tieneEncabezadoArticulo): ${aceptados.length}`);
  console.log(`Rechazados: ${rechazados.length}\n`);

  const { finales, excluidos, resumenResolucion } = resolverDuplicados(aceptados);

  console.log('=== Resolución de duplicados (decisión editorial de Fredy, 2026-09-05) ===');
  resumenResolucion.forEach((l) => console.log('  ' + l));

  console.log(`\n=== Excluidos (categoría 3 -- ambiguos, ${excluidos.length} números) ===`);
  console.log('  ' + excluidos.join(', '));

  const vistosFinal = new Map<string, number>();
  for (const f of finales) vistosFinal.set(f.numArticulo, (vistosFinal.get(f.numArticulo) ?? 0) + 1);
  const dupResidual = [...vistosFinal.entries()].filter(([, n]) => n > 1);
  if (dupResidual.length > 0) {
    fallarDuro(`quedaron duplicados sin resolver tras aplicar las 3 categorías: ${dupResidual.map(([n, c]) => `${n}(x${c})`).join(', ')}`);
  }

  console.log(`\n=== Conjunto final: ${finales.length} artículos (de ${aceptados.length} aceptados, -${excluidos.length} excluidos ambiguos, -2 duplicados de imprenta/fragmentos colapsados) ===`);

  const muestra = ['1', '10', '100'];
  for (const n of muestra) {
    const f = finales.find((x) => x.numArticulo === n);
    console.log(`Art.${n}:`, f ? JSON.stringify(f.contenido.slice(0, 200)) : '(no encontrado)');
  }

  const registros = finales.map((c) => construirRegistro(c, opts));

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

  const stagingTable = 'stg_codigo_comercio_1950';
  const sql = generarSQL(conEmbeddings, stagingTable);
  mkdirSync(dirname(opts.execute!), { recursive: true });
  writeFileSync(opts.execute!, sql, 'utf8');
  console.log(`\n✅ SQL escrito en: ${opts.execute} (${sql.length} caracteres, ${conEmbeddings.length} filas)`);
  console.log('🔒 Este script no ejecutó ningún SQL contra producción -- solo lo escribió a archivo. Aditivo, ON CONFLICT DO NOTHING, sin DELETE.');
}

main().catch((err) => {
  console.error('FALLÓ:', err);
  process.exit(1);
});
