/**
 * scripts/olas/paquete-ola.ts
 * Generador GENÉRICO de paquetes de ola (ingesta masiva V5). Cada instrumento aporta un adaptador que produce `FilaOla[]` ya clasificadas;
 * este módulo escribe, de forma determinista y OFFLINE (sin red, sin Supabase, sin claves):
 *
 *   staging/01_insert_staging.sql        filas OCULTAS (revision_pendiente=true), vigencia NULL, embedding NULL
 *   staging/02_embeddings_staging.sql    UPDATE de embeddings (solo filas del lote con embedding NULL)
 *   staging/03_verificacion_staging.sql  conteos, SHA-256 e integridad (solo lectura, falla cerrada)
 *   staging/04_visibilidad_v4_staging.sql  V4 según el pliego — SOLO tras la firma D1–D8 del CLO
 *   prod/00_precheck_y_respaldo_prod.sql   snapshot de las filas del instrumento + colisiones de id
 *   prod/01_datos_prod.sql               filas OCULTAS con vector cero temporal (embedding NOT NULL en prod)
 *   prod/02_embeddings_prod.sql          sustituye el vector cero por el real (solo filas ocultas del lote)
 *   prod/03_activacion_v5_prod.sql       activa V5 atómicamente y retira (oculta, no borra) las filas legacy sustituidas
 *   prod/99_reversion_prod.sql           deshace 03 + 01 (solo por orden del CLO)
 *   manifiesto_paquete.json              SHA-256 y bytes de cada SQL, conteos esperados y project ref de cada destino
 *   ejecutar_staging.ps1 / ejecutar_prod.ps1  envoltorios de terminal segura (ver generarPs1)
 *
 * Reglas heredadas de los lotes A03/D35/D284 (promoción V5 del 2026-11-21): mismas 17 columnas de public.biblioteca_vectores, `hash_contenido` =
 * sha256(UTF-8(contenido)), embeddings 384D (Xenova/multilingual-e5-small, «passage: »), PRIMARY = sin `metadata.rol`, CONTEXT = `rol='CONTEXT'`,
 * `metadata.estado_v` V4 (staging) / V5 (producción). Nada aquí ejecuta SQL: el ejecutor es scripts/olas/ejecutar-sql.ts, invocado por el .ps1.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const REF_STAGING = 'aicakncgtuiiuomflkqj';
export const REF_PROD = 'thgrhueckkjdutjvcufp';
export const EMBED_DIMS = 384;

export const sha256 = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
export const lit = (v: string | null) => (v === null ? 'NULL' : `'${v.replace(/'/g, "''")}'`);

export type Vigencia = 'VIGENTE' | 'DEROGADO' | 'PENDIENTE';

/** Clasificación estricta por fila. `rol: null` = PRIMARY elegible; `CONTEXT` = solo contexto. */
export interface Clasificacion { vigencia: Vigencia; rol: 'CONTEXT' | null; motivo: string }

export interface FilaOla {
  id: string; coleccion: string; materia: string; contenido: string; num_articulo: string; fuente: string; metadata: Record<string, unknown>;
  jurisdiccion: 'HN'; fuente_tipo: 'codigo' | 'ley' | 'reglamento' | 'acuerdo'; instrumento_id: string; num_articulo_norm: string | null;
  hash_contenido: string; ingest_batch: string; clasificacion: Clasificacion;
}

export interface ConfigOla {
  ola: string;                 // p. ej. 'OLA1'
  normId: string;              // 'HN:CODIGO_PROCESAL_PENAL'
  instrumentoId: string;       // 'CODIGO_PROCESAL_PENAL'
  ingestBatch: string;         // 'OLA1_CPP_2024_01'
  fechaCorte: string;          // ISO, fecha del paquete
  adjudicacion: string;        // nombre del pliego que el CLO firma
  /** Filas productivas preexistentes que este lote sustituye (se ocultan en 03, no se borran). SQL booleano sobre el alias `b`. */
  legacy?: { condicion: string; esperadas: number; descripcion: string };
}

/** Validación estructural previa a escribir nada. Lanza ante cualquier incoherencia. */
export function validarFilas(cfg: ConfigOla, filas: readonly FilaOla[]): void {
  if (!/^HN:[A-Z0-9_]+$/.test(cfg.normId) || cfg.normId !== `HN:${cfg.instrumentoId}`) throw new Error(`normId/instrumentoId incoherentes: ${cfg.normId} / ${cfg.instrumentoId}`);
  if (!/^[A-Z0-9_]+$/.test(cfg.ingestBatch)) throw new Error(`ingest_batch inválido: ${cfg.ingestBatch}`);
  if (filas.length === 0) throw new Error('lote vacío');
  const ids = new Set<string>();
  const nums = new Set<string>();
  for (const f of filas) {
    if (ids.has(f.id)) throw new Error(`id repetido: ${f.id}`);
    ids.add(f.id);
    if (f.num_articulo_norm && nums.has(f.num_articulo_norm)) throw new Error(`num_articulo_norm repetido: ${f.num_articulo_norm}`);
    if (f.num_articulo_norm) nums.add(f.num_articulo_norm);
    if (f.ingest_batch !== cfg.ingestBatch || f.instrumento_id !== cfg.instrumentoId || f.metadata.norm_id !== cfg.normId) throw new Error(`fila ${f.id}: lote/instrumento/norm_id distinto del paquete`);
    if (sha256(f.contenido) !== f.hash_contenido) throw new Error(`fila ${f.id}: hash_contenido no es sha256(contenido)`);
    if (/\r/.test(f.contenido)) throw new Error(`fila ${f.id}: contenido con CR (se exige LF)`);
    if (f.clasificacion.vigencia === 'DEROGADO' && f.clasificacion.rol !== 'CONTEXT') throw new Error(`fila ${f.id}: un derogado nunca es PRIMARY`);
  }
}

export interface Conteos { total: number; primary: number; contextVigente: number; contextDerogado: number; contextPendiente: number }
export function contar(filas: readonly FilaOla[]): Conteos {
  const c = { total: filas.length, primary: 0, contextVigente: 0, contextDerogado: 0, contextPendiente: 0 };
  for (const { clasificacion: k } of filas) {
    if (k.rol === null) c.primary++;
    else if (k.vigencia === 'VIGENTE') c.contextVigente++;
    else if (k.vigencia === 'DEROGADO') c.contextDerogado++;
    else c.contextPendiente++;
  }
  return c;
}

const vigenteSql = (v: Vigencia) => (v === 'VIGENTE' ? 'true' : v === 'DEROGADO' ? 'false' : 'NULL');
const vigenciaMeta = (v: Vigencia) => (v === 'VIGENTE' ? 'TRUE_PRESUNTA' : v === 'DEROGADO' ? 'DEROGADO' : 'PENDIENTE_CLO');

/** Metadata que se inserta (sin estado_v: oculto hasta la visibilidad V4/V5). */
function metaInsert(f: FilaOla): string {
  return lit(JSON.stringify({ ...f.metadata, clasificacion_propuesta: f.clasificacion, revision_pendiente: true, vigencia: 'UNKNOWN' }));
}

const COLS = 'id,coleccion,materia,contenido,num_articulo,fuente,metadata,embedding,jurisdiccion,fuente_tipo,es_norma_vigente,revision_pendiente,instrumento_id,num_articulo_norm,hash_contenido,ingest_batch,ingested_at';

function sqlInserts(filas: readonly FilaOla[], embedding: string, porLote = 50): string[] {
  const out: string[] = [];
  for (let i = 0; i < filas.length; i += porLote) {
    const valores = filas.slice(i, i + porLote).map((f) =>
      `(${lit(f.id)},${lit(f.coleccion)},${lit(f.materia)},${lit(f.contenido)},${lit(f.num_articulo)},${lit(f.fuente)},${metaInsert(f)}::jsonb,${embedding},'HN',${lit(f.fuente_tipo)},NULL,true,${lit(f.instrumento_id)},${lit(f.num_articulo_norm)},${lit(f.hash_contenido)},${lit(f.ingest_batch)},now())`);
    out.push(`INSERT INTO public.biblioteca_vectores (${COLS}) VALUES\n${valores.join(',\n')}\nON CONFLICT (id) DO NOTHING;`);
  }
  return out;
}

const VECTOR_CERO = `array_fill(0::real, ARRAY[${EMBED_DIMS}])::vector`;

/** Precondición común: el lote tiene exactamente N filas con identidad y SHA-256 correctos. */
function chequeoIdentidad(cfg: ConfigOla, n: number, extra: string, etiqueta: string): string[] {
  return [
    `  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = ${lit(cfg.ingestBatch)} AND metadata->>'norm_id' = ${lit(cfg.normId)}`,
    `    AND instrumento_id = ${lit(cfg.instrumentoId)} AND jurisdiccion = 'HN' AND encode(sha256(convert_to(contenido, 'UTF8')), 'hex') = hash_contenido${extra};`,
    `  IF n <> ${n} THEN RAISE EXCEPTION '${etiqueta}: % filas (esperadas ${n})', n; END IF;`,
  ];
}

/** UPDATE de clasificación agrupado por (vigencia, rol, motivo). */
function sqlClasificar(cfg: ConfigOla, filas: readonly FilaOla[], estadoV: 'V4' | 'V5', extraMeta: string): string[] {
  const grupos = new Map<string, { k: Clasificacion; ids: string[] }>();
  for (const f of filas) {
    const clave = JSON.stringify(f.clasificacion);
    if (!grupos.has(clave)) grupos.set(clave, { k: f.clasificacion, ids: [] });
    grupos.get(clave)!.ids.push(f.id);
  }
  const L: string[] = [];
  for (const { k, ids } of grupos.values()) {
    const rol = k.rol ? `, 'rol', ${lit(k.rol)}` : '';
    L.push(`  UPDATE public.biblioteca_vectores SET revision_pendiente = false, es_norma_vigente = ${vigenteSql(k.vigencia)},`);
    L.push(`    metadata = (metadata - 'rol' - 'clasificacion_propuesta') || jsonb_build_object('estado_v', ${lit(estadoV)}, 'vigencia', ${lit(vigenciaMeta(k.vigencia))}, 'revision_pendiente', false, 'motivo_rol', ${lit(k.motivo)}, 'adjudicacion', ${lit(cfg.adjudicacion)}${rol}${extraMeta})`);
    L.push(`  WHERE ingest_batch = ${lit(cfg.ingestBatch)} AND id IN (${ids.map(lit).join(', ')});`);
  }
  return L;
}

function sqlPostcondiciones(cfg: ConfigOla, c: Conteos, estadoV: 'V4' | 'V5'): string[] {
  const b = lit(cfg.ingestBatch);
  const chk = (cond: string, esperado: number, nombre: string) => [
    `  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = ${b} AND ${cond};`,
    `  IF n <> ${esperado} THEN RAISE EXCEPTION 'postcondición ${nombre} = % (esperado ${esperado})', n; END IF;`,
  ];
  return [
    ...chk(`revision_pendiente = false AND metadata->>'estado_v' = '${estadoV}'`, c.total, `visibles ${estadoV}`),
    ...chk("es_norma_vigente = true AND NOT (metadata ? 'rol')", c.primary, 'PRIMARY vigentes'),
    ...chk("es_norma_vigente = true AND metadata->>'rol' = 'CONTEXT'", c.contextVigente, 'CONTEXT vigentes'),
    ...chk("es_norma_vigente = false AND metadata->>'rol' = 'CONTEXT'", c.contextDerogado, 'CONTEXT derogados'),
    ...chk("es_norma_vigente IS NULL AND metadata->>'rol' = 'CONTEXT'", c.contextPendiente, 'CONTEXT pendientes'),
    ...chk("es_norma_vigente = false AND NOT (metadata ? 'rol')", 0, 'derogados PRIMARY (prohibido)'),
  ];
}

function sqlConsultaFinal(cfg: ConfigOla): string {
  return [
    `SELECT count(*) AS filas, count(*) FILTER (WHERE revision_pendiente = false) AS visibles, metadata->>'estado_v' AS estado_v,`,
    "  count(*) FILTER (WHERE es_norma_vigente = true AND NOT (metadata ? 'rol')) AS primary_vigentes,",
    "  count(*) FILTER (WHERE metadata->>'rol' = 'CONTEXT') AS context,",
    "  count(*) FILTER (WHERE es_norma_vigente = false) AS derogados,",
    "  count(*) FILTER (WHERE embedding IS NOT NULL) AS con_embedding,",
    "  count(*) FILTER (WHERE encode(sha256(convert_to(contenido, 'UTF8')), 'hex') = hash_contenido) AS sha_ok",
    `FROM public.biblioteca_vectores WHERE ingest_batch = ${lit(cfg.ingestBatch)} GROUP BY metadata->>'estado_v';`,
  ].join('\n');
}

const vectorLit = (v: readonly number[]) => `'[${v.map((x) => x.toFixed(6)).join(',')}]'::vector(${EMBED_DIMS})`;

export function validarVector(v: readonly number[], id: string): void {
  if (v.length !== EMBED_DIMS) throw new Error(`${id}: ${v.length} dims (≠ ${EMBED_DIMS})`);
  if (v.some((x) => !Number.isFinite(x))) throw new Error(`${id}: vector con NaN/Inf`);
  const norma = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  if (Math.abs(norma - 1) > 1e-3) throw new Error(`${id}: vector no normalizado (‖v‖=${norma})`);
  if (new Set(v.map((x) => x.toFixed(6))).size < 10) throw new Error(`${id}: vector constante o degenerado`);
}

export interface ArchivoPaquete { ruta: string; bytes: number; sha256: string; destino: 'staging' | 'prod'; orden: number; requiereFirma: boolean }

/** Escribe todo el paquete y devuelve el manifiesto. `embeddings` debe cubrir exactamente las filas. */
export function escribirPaquete(p: { cfg: ConfigOla; filas: FilaOla[]; embeddings: ReadonlyMap<string, number[]>; salida: string }): { archivos: ArchivoPaquete[]; conteos: Conteos } {
  const { cfg, filas, embeddings, salida } = p;
  validarFilas(cfg, filas);
  if (embeddings.size !== filas.length || filas.some((f) => !embeddings.has(f.id))) throw new Error('los embeddings no cubren exactamente las filas del lote');
  for (const f of filas) validarVector(embeddings.get(f.id)!, f.id);
  const c = contar(filas);
  const b = lit(cfg.ingestBatch);
  const backup = `biblioteca_vectores_${cfg.ingestBatch.toLowerCase()}_backup`;
  const cab = (destino: string, ref: string, texto: string) =>
    `-- ${cfg.ola} · ${cfg.normId} · lote ${cfg.ingestBatch} · ${cfg.fechaCorte}\n-- DESTINO EXCLUSIVO: ${destino} (${ref}). El ejecutor verifica el project ref y la huella SHA-256 de este archivo antes de correrlo.\n-- ${texto}\n`;
  const archivos: Array<Omit<ArchivoPaquete, 'bytes' | 'sha256'> & { sql: string }> = [];
  const add = (ruta: string, destino: 'staging' | 'prod', orden: number, requiereFirma: boolean, sql: string) => archivos.push({ ruta, destino, orden, requiereFirma, sql });

  // ── STAGING ──
  add('staging/01_insert_staging.sql', 'staging', 1, false, [
    cab('mayalexhn-staging', REF_STAGING, `Inserta ${c.total} filas OCULTAS (revision_pendiente=true), vigencia NULL, embedding NULL. Idempotente (ON CONFLICT DO NOTHING).`),
    'BEGIN;', ...sqlInserts(filas, 'NULL'),
    'DO $do$ DECLARE n int; BEGIN', ...chequeoIdentidad(cfg, c.total, '', 'post-insert staging'), 'END $do$;', 'COMMIT;', '',
  ].join('\n'));
  add('staging/02_embeddings_staging.sql', 'staging', 2, false, [
    cab('mayalexhn-staging', REF_STAGING, `Embeddings 384D de las ${c.total} filas. Solo toca filas del lote con embedding NULL: reaplicable.`),
    'BEGIN;',
    ...filas.map((f) => `UPDATE public.biblioteca_vectores SET embedding = ${vectorLit(embeddings.get(f.id)!)} WHERE id = ${lit(f.id)} AND ingest_batch = ${b} AND embedding IS NULL;`),
    'DO $do$ DECLARE n int; BEGIN', ...chequeoIdentidad(cfg, c.total, ' AND embedding IS NOT NULL AND revision_pendiente = true', 'post-embeddings staging'), 'END $do$;',
    'COMMIT;', '',
  ].join('\n'));
  add('staging/03_verificacion_staging.sql', 'staging', 3, false, [
    cab('mayalexhn-staging', REF_STAGING, 'Verificación de solo lectura (falla cerrada): conteo, SHA-256, embeddings, ocultas, num_articulo_norm únicos.'),
    'DO $do$ DECLARE n int; BEGIN',
    ...chequeoIdentidad(cfg, c.total, ' AND embedding IS NOT NULL', 'verificación staging'),
    `  SELECT count(DISTINCT num_articulo_norm) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = ${b};`,
    `  IF n <> ${c.total} THEN RAISE EXCEPTION 'num_articulo_norm distintos: % (esperados ${c.total})', n; END IF;`,
    'END $do$;', sqlConsultaFinal(cfg), '',
  ].join('\n'));
  add('staging/04_visibilidad_v4_staging.sql', 'staging', 4, true, [
    cab('mayalexhn-staging', REF_STAGING, `V4 según el pliego ${cfg.adjudicacion}. NO EJECUTAR antes de la firma D1–D8 del CLO (el .ps1 exige la marca de firma).`),
    'BEGIN;', 'DO $do$ DECLARE n int; BEGIN',
    ...chequeoIdentidad(cfg, c.total, ' AND revision_pendiente = true AND es_norma_vigente IS NULL AND embedding IS NOT NULL', 'precondición V4'),
    ...sqlClasificar(cfg, filas, 'V4', ''),
    ...sqlPostcondiciones(cfg, c, 'V4'),
    'END $do$;', 'COMMIT;', sqlConsultaFinal(cfg), '',
  ].join('\n'));

  // ── PRODUCCIÓN ──
  const legacy = cfg.legacy;
  add('prod/00_precheck_y_respaldo_prod.sql', 'prod', 0, true, [
    cab('mayalex-ia-pinel-hn (producción)', REF_PROD, 'Snapshot de las filas actuales del instrumento y precheck. Falla si el respaldo ya existe, si el lote ya está en V5 o si las filas legacy no son las esperadas.'),
    'BEGIN;',
    `DO $do$ BEGIN IF to_regclass('public.${backup}') IS NOT NULL THEN RAISE EXCEPTION 'El respaldo ${backup} ya existe: revisar antes de reintentar'; END IF; END $do$;`,
    `CREATE TABLE public.${backup} AS SELECT b.* FROM public.biblioteca_vectores b WHERE b.ingest_batch = ${b} OR b.instrumento_id = ${lit(cfg.instrumentoId)} OR b.metadata->>'norm_id' = ${lit(cfg.normId)}${legacy ? ` OR (${legacy.condicion})` : ''};`,
    'DO $do$ DECLARE n int; BEGIN',
    `  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = ${b} AND metadata->>'estado_v' = 'V5';`,
    "  IF n > 0 THEN RAISE EXCEPTION 'El lote ya tiene % filas V5: la ola ya fue promovida', n; END IF;",
    ...(legacy ? [
      `  SELECT count(*) INTO n FROM public.biblioteca_vectores b WHERE ${legacy.condicion};`,
      `  IF n <> ${legacy.esperadas} THEN RAISE EXCEPTION 'Filas legacy a sustituir: % (esperadas ${legacy.esperadas}); no continuar sin revisar', n; END IF;`,
    ] : []),
    'END $do$;', 'COMMIT;',
    `SELECT count(*) AS filas_respaldadas FROM public.${backup};`, '',
  ].join('\n'));
  add('prod/01_datos_prod.sql', 'prod', 1, true, [
    cab('mayalex-ia-pinel-hn (producción)', REF_PROD, `Inserta ${c.total} filas OCULTAS con vector cero temporal (embedding NOT NULL en prod). Acepta filas preexistentes solo si son idénticas.`),
    'BEGIN;',
    `DO $do$ BEGIN IF to_regclass('public.${backup}') IS NULL THEN RAISE EXCEPTION 'Falta el respaldo: ejecute 00 primero'; END IF; END $do$;`,
    ...sqlInserts(filas, VECTOR_CERO),
    'DO $do$ DECLARE n int; BEGIN', ...chequeoIdentidad(cfg, c.total, ' AND revision_pendiente = true AND es_norma_vigente IS NULL', 'post-insert prod (ocultas, hash correcto)'), 'END $do$;',
    'COMMIT;', '',
  ].join('\n'));
  add('prod/02_embeddings_prod.sql', 'prod', 2, true, [
    cab('mayalex-ia-pinel-hn (producción)', REF_PROD, 'Sustituye el vector cero por el embedding real. Solo filas ocultas del lote que conserven el vector cero: reaplicable.'),
    'BEGIN;',
    ...filas.map((f) => `UPDATE public.biblioteca_vectores SET embedding = ${vectorLit(embeddings.get(f.id)!)} WHERE id = ${lit(f.id)} AND ingest_batch = ${b} AND revision_pendiente = true AND embedding = ${VECTOR_CERO};`),
    'DO $do$ DECLARE n int; BEGIN', ...chequeoIdentidad(cfg, c.total, ` AND revision_pendiente = true AND embedding <> ${VECTOR_CERO}`, 'post-embeddings prod'), 'END $do$;',
    'COMMIT;', '',
  ].join('\n'));
  const extraV5 = `, 'promocion_fecha', ${lit(cfg.fechaCorte)}, 'promocion_ola', ${lit(cfg.ola)}`;
  add('prod/03_activacion_v5_prod.sql', 'prod', 3, true, [
    cab('mayalex-ia-pinel-hn (producción)', REF_PROD, `Activa V5 atómicamente (${c.total} filas: ${c.primary} PRIMARY, ${c.contextVigente + c.contextDerogado + c.contextPendiente} CONTEXT)${legacy ? ` y oculta las ${legacy.esperadas} filas legacy sustituidas (${legacy.descripcion})` : ''}.`),
    'BEGIN;', 'DO $do$ DECLARE n int; BEGIN',
    ...chequeoIdentidad(cfg, c.total, ` AND revision_pendiente = true AND es_norma_vigente IS NULL AND embedding IS NOT NULL AND embedding <> ${VECTOR_CERO}`, 'precondición V5'),
    `  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = ${b};`,
    `  IF n <> ${c.total} THEN RAISE EXCEPTION 'filas extra en el lote: % (esperadas ${c.total})', n; END IF;`,
    ...sqlClasificar(cfg, filas, 'V5', extraV5),
    ...sqlPostcondiciones(cfg, c, 'V5'),
    ...(legacy ? [
      `  UPDATE public.biblioteca_vectores b SET revision_pendiente = true,`,
      // coalesce: hay legacy con metadata NULL (Constitución, Tributario) y NULL || jsonb da NULL, lo que borraba la marca que usa la reversión 99.
      `    metadata = coalesce(b.metadata, '{}'::jsonb) || jsonb_build_object('sustituido_por_lote', ${b}, 'sustituido_fecha', ${lit(cfg.fechaCorte)}, 'revision_pendiente_motivo', ${lit(`Sustituida por ${cfg.normId} V5 (${cfg.ola}); oculta, no borrada`)})`,
      `  WHERE ${legacy.condicion} AND b.revision_pendiente = false;`,
      '  GET DIAGNOSTICS n = ROW_COUNT;',
      `  IF n <> ${legacy.esperadas} THEN RAISE EXCEPTION 'legacy ocultadas: % (esperadas ${legacy.esperadas})', n; END IF;`,
      `  SELECT count(*) INTO n FROM public.biblioteca_vectores b WHERE ${legacy.condicion} AND b.revision_pendiente = true AND b.metadata->>'sustituido_por_lote' = ${b};`,
      `  IF n <> ${legacy.esperadas} THEN RAISE EXCEPTION 'legacy marcadas para la reversión: % (esperadas ${legacy.esperadas})', n; END IF;`,
    ] : []),
    'END $do$;', 'COMMIT;', sqlConsultaFinal(cfg), '',
  ].join('\n'));
  add('prod/99_reversion_prod.sql', 'prod', 99, true, [
    cab('mayalex-ia-pinel-hn (producción)', REF_PROD, 'REVERSIÓN — solo por orden expresa del CLO. Re-expone las filas legacy y elimina el lote (no existía antes de esta ola).'),
    'BEGIN;',
    ...(legacy ? [`UPDATE public.biblioteca_vectores b SET revision_pendiente = false, metadata = b.metadata - 'sustituido_por_lote' - 'sustituido_fecha' - 'revision_pendiente_motivo' WHERE ${legacy.condicion} AND b.metadata->>'sustituido_por_lote' = ${b};`] : []),
    `DELETE FROM public.biblioteca_vectores WHERE ingest_batch = ${b};`,
    'COMMIT;', '',
  ].join('\n'));

  const resultado: ArchivoPaquete[] = [];
  for (const a of archivos) {
    const ruta = join(salida, a.ruta);
    mkdirSync(join(ruta, '..'), { recursive: true });
    const buf = Buffer.from(a.sql, 'utf8');
    writeFileSync(ruta, buf);
    resultado.push({ ruta: a.ruta, bytes: buf.length, sha256: sha256(buf), destino: a.destino, orden: a.orden, requiereFirma: a.requiereFirma });
  }
  return { archivos: resultado, conteos: c };
}

/**
 * Envoltorio PowerShell de terminal segura para un destino. Garantías:
 *  · DATABASE_URL se pide con Read-Host -AsSecureString (no se ve en pantalla ni queda en el historial) y solo vive en $env del proceso;
 *  · se exige teclear el project ref del destino y, para producción o pasos con firma, la frase de confirmación;
 *  · el ejecutor Node verifica que la URL apunte al ref esperado y que cada SQL tenga la huella del manifiesto antes de correrlo;
 *  · en `finally` se borran $env:DATABASE_URL, las variables de sesión y se libera el BSTR, aunque falle cualquier paso.
 */
export function generarPs1(p: { cfg: ConfigOla; destino: 'staging' | 'prod'; manifiestoRel: string; raizRel: string; pasos: readonly ArchivoPaquete[] }): string {
  const ref = p.destino === 'prod' ? REF_PROD : REF_STAGING;
  const frase = `PROMOVER ${p.cfg.ingestBatch} A ${p.destino.toUpperCase()}`;
  const lista = p.pasos.map((a) => `#   ${a.orden}. ${a.ruta}  (sha256 ${a.sha256.slice(0, 16)}…)${a.requiereFirma ? '  [requiere firma CLO]' : ''}`).join('\n');
  return `# ejecutar_${p.destino}.ps1 — ${p.cfg.ola} · ${p.cfg.normId} · lote ${p.cfg.ingestBatch}
# Generado por scripts/olas/paquete-ola.ts. NO EDITAR: el manifiesto fija la huella de cada SQL.
# Destino exclusivo: ${ref}
# Pasos:
${lista}
#
# Uso (se sitúa solo en la raíz del repo):  pwsh -File <ruta>\\ejecutar_${p.destino}.ps1 [-DesdePaso N] [-HastaPaso M]
param([int]$DesdePaso = 0, [int]$HastaPaso = 98)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$manifiesto = Join-Path $PSScriptRoot '${p.manifiestoRel}'
$raiz = (Resolve-Path (Join-Path $PSScriptRoot '${p.raizRel}')).Path
Push-Location $raiz
$bstr = [IntPtr]::Zero
$secreto = $null
try {
  Write-Host '== ${p.cfg.ola} · ${p.cfg.normId} → ${p.destino.toUpperCase()} (${ref}) ==' -ForegroundColor Cyan
  $refTecleado = Read-Host 'Teclee el project ref de destino para confirmar'
  if ($refTecleado -ne '${ref}') { throw 'Project ref no coincide. Abortado sin conectar.' }
  if ($DesdePaso -le 4 -and $HastaPaso -ge 4 -or '${p.destino}' -eq 'prod') {
    $confirmacion = Read-Host 'Escriba exactamente: ${frase}'
    if ($confirmacion -cne '${frase}') { throw 'Frase de confirmación incorrecta. Abortado sin conectar.' }
  }
  $secreto = Read-Host 'DATABASE_URL (entrada oculta)' -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secreto)
  $env:DATABASE_URL = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  npx --no-install tsx scripts/olas/ejecutar-sql.ts --manifiesto $manifiesto --destino ${p.destino} --ref ${ref} --desde $DesdePaso --hasta $HastaPaso
  if ($LASTEXITCODE -ne 0) { throw "El ejecutor terminó con código $LASTEXITCODE (la transacción fallida se revirtió)." }
  Write-Host 'OK: pasos completados.' -ForegroundColor Green
}
finally {
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
  if ($bstr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
  if ($secreto) { $secreto.Dispose() }
  Remove-Variable secreto, bstr, refTecleado, confirmacion -ErrorAction SilentlyContinue
  [GC]::Collect()
  Pop-Location
  Write-Host 'Variables de sesión borradas.' -ForegroundColor DarkGray
}
`;
}

export function escribirManifiestoYPs1(p: { cfg: ConfigOla; salida: string; pliegoRel: string; raizRel: string; archivos: ArchivoPaquete[]; conteos: Conteos; extra?: Record<string, unknown> }): void {
  const manifiesto = {
    ola: p.cfg.ola, norm_id: p.cfg.normId, ingest_batch: p.cfg.ingestBatch, fecha_corte: p.cfg.fechaCorte, adjudicacion: p.cfg.adjudicacion,
    refs: { staging: REF_STAGING, prod: REF_PROD }, conteos: p.conteos, legacy: p.cfg.legacy ?? null,
    // Pasos con requiereFirma: el ejecutor exige que este pliego contenga «D1–D8 FIRMADAS» y cite el sha256 completo de cada SQL que corre.
    pliego: p.pliegoRel,
    archivos: p.archivos, ...p.extra,
  };
  writeFileSync(join(p.salida, 'manifiesto_paquete.json'), JSON.stringify(manifiesto, null, 2) + '\n');
  for (const destino of ['staging', 'prod'] as const) {
    const pasos = p.archivos.filter((a) => a.destino === destino && a.orden !== 99).sort((x, y) => x.orden - y.orden);
    writeFileSync(join(p.salida, `ejecutar_${destino}.ps1`), generarPs1({ cfg: p.cfg, destino, manifiestoRel: 'manifiesto_paquete.json', raizRel: p.raizRel, pasos }));
  }
}
