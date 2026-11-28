/**
 * scripts/olas/ola15-lgm.ts
 * OLA 15 · lote 1 — HN:LEY_GARANTIAS_MOBILIARIAS: Ley de Garantías Mobiliarias (Decreto No. 182-2009, La Gaceta No. 32,125 del
 * 28-ene-2010; vigente desde el 28-jul-2010, art. 86), con el art. 47 reformado por el art. 10 del Decreto No. 50-2016 (La Gaceta
 * No. 34,076 del 4-jul-2016, vigente desde su publicación).
 *
 * No hay edición consolidada (CEDIJ) de esta ley: la fuente es el expediente D1–D4 y la matriz FIRMADOS por el CLO el 2026-11-28
 * (docs/corpus/fase2/2026-11-27-hn-lgm-ola15/EXPEDIENTE_D1_D4_LGM_OLA15.md):
 *   - texto D1 cotejado (sha256 84effbdb…), una línea por artículo, del que se corta el encabezado de título/capítulo que cierra cada
 *     artículo (§5.1 del reporte D1; scripts/olas/ola15-lgm-matriz.ts → `cortar`) y se aplica la fe de erratas de los arts. 17, 26, 52, 56;
 *   - art. 47 de 2016 (art47_D50-2016.txt, contenido sha256 ba57fe64…), testigo único del TSC (reserva R1);
 *   - matriz_clasificacion.csv (sha256 15bece35…): este script exige que cada fila que construye tenga EXACTAMENTE la huella de
 *     contenido que la matriz firmada fija para ella, y aborta si no.
 *
 * Salidas: out/ola15-lgm/{rows.jsonl, staging/, prod/, manifiesto_paquete.json, ejecutar_*.ps1} (no versionadas) y, en la carpeta del
 * expediente, manifiesto_articulos.json. No conecta con ninguna base de datos. El pliego que autoriza el paquete es
 * PLIEGO_D5_D8_LGM_OLA15.md (fórmula «D1–D8 FIRMADAS» en su línea **Estado:**).
 *
 * Uso: npx tsx scripts/olas/ola15-lgm.ts [--ensayar]
 *   --ensayar  además, ensayo completo en PGlite EN MEMORIA (pgvector real; nada persiste): staging 01–04 y producción 00–03 y 99, con
 *              idempotencia, controles negativos, postcondiciones y la recuperación de las dos versiones del art. 47.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { contar, escribirManifiestoYPs1, escribirPaquete, type ArchivoPaquete, type Clasificacion, type ConfigOla, type FilaOla } from './paquete-ola';
import { cortar, ENCABEZADO_INICIAL, ENCABEZADOS, FE_DE_ERRATAS, INSTRUMENTO, LOTE, SHA_D1 } from './ola15-lgm-matriz';

const sha256 = (x: string | Buffer): string => createHash('sha256').update(x).digest('hex');

export const DIR = 'docs/corpus/fase2/2026-11-27-hn-lgm-ola15';
export const SALIDA = 'out/ola15-lgm';
export const PLIEGO = 'PLIEGO_D5_D8_LGM_OLA15.md';
const TEXTO_D1 = 'docs/corpus/fase2/ocr/LGM_OLA15_articulado_cotejado.txt';

/** Huellas firmadas el 2026-11-28 (expediente D1–D4, §6 y bloque de firma). */
export const FIRMADAS = {
  matriz: '15bece3565e2c5c5db92f37b4e7cb1bf0d0d7ef4c3d31d159dd45dc23bed6cb4',
  art47Archivo: 'c71439bc41ddec88e3bab8e8535dc3f93bccbaa58d693864d2b3304a04d0d64a',
  art47Contenido: 'ba57fe64b7088ceb1fad5052b5add6b68289c1c4044d6d8d07737d14c9780d46',
  constancias: '66de9c24',
} as const;

/** Testigos (expediente §1). */
export const TESTIGOS = {
  gaceta32125Base: 'dc919517a242bbda548171a7ebecb7dbe20b32af5a909eb784bb8a0f917f758c',
  gaceta32125Tsc: '66270e8d35d3d1ed5561028380baca78cb74f82ff2d8da5f97095c7a3856f267',
  gaceta32125Ccit: '94b687017b5068c8bb1a8535c4c06bca91c52fe209191290ee5cfa67dfff0ce6',
  gaceta34076D50: '201047b5607960ac8a08b4caac95ec25eb5f7fcfdd0909d151cd677cbf62a4ec',
} as const;

export const CFG: ConfigOla = {
  ola: 'OLA15', normId: `HN:${INSTRUMENTO}`, instrumentoId: INSTRUMENTO, ingestBatch: LOTE,
  fechaCorte: '2026-11-28', adjudicacion: `${PLIEGO} (D1–D8)`,
};

/** D5 (propuesta): materia de la fila. No hay materia mercantil en el corpus; la LGM va con la Ley de Propiedad (02_CIVIL). */
export const MATERIA = '02_CIVIL';
export const FUENTE = 'Ley de Garantías Mobiliarias de Honduras (Decreto No. 182-2009)';
export const VIGENTE_DESDE_2010 = '2010-07-28';
export const VIGENTE_DESDE_2016 = '2016-07-04';

const ID = (n: string) => `${LOTE}:${INSTRUMENTO}:${n}`;
export const ID_47 = ID('47');
export const ID_47_HIST = ID('47-TEXTO-2010');

const RESERVA_R2 = 'R2: barrido complementario de reformas en el CEDIJ y el Congreso Nacional pendiente (D4 firmado con esta reserva)';
const RESERVA_R1 = 'R1: texto de 2016 con testigo único (escaneo del TSC de La Gaceta 34,076); segundo testigo (IAIP) no descargable';

/** Constancias (mismo texto que constancias.csv firmado). */
const C47_REFORMA = 'Reformado por el Artículo 10 del Decreto No. 50-2016 (Capítulo IV, Garantías Mobiliarias), publicado en La Gaceta No. 34,076 del 4 de julio de 2016, vigente desde su publicación (art. 12 del D.50-2016). Texto tomado de La Gaceta 34,076; sustituye al de 2010.';
const C47_HIST = 'Texto original de 2010 (La Gaceta 32,125), sustituido por el Artículo 10 del Decreto No. 50-2016 (La Gaceta No. 34,076 del 4 de julio de 2016). Se conserva como antecedente; no es norma vigente.';
const C83 = 'Norma de reforma: adiciona los numerales 2), 5), 7) y 8) del Artículo 28 de la Ley de Propiedad (D.82-2004). Su efecto en la Ley de Propiedad consta en la corrección C2 (fila OLA12_LP_2007_01:LEY_PROPIEDAD:28, CONTEXT vigente).';

/** Ubicación estructural (título y capítulo verificados contra la imagen) de cada artículo. */
export function ubicaciones(): Map<number, string[]> {
  const partes = (v: string) => {
    const t = v.split(' · ');
    const out: { titulo?: string; capitulo?: string } = {};
    for (let i = 0; i < t.length; i += 2) {
      const par = `${t[i]} · ${t[i + 1]}`;
      if (/^TÍTULO /.test(t[i])) out.titulo = par; else if (/^CAPÍTULO /.test(t[i])) out.capitulo = par; else throw new Error(`encabezado irreconocible: ${v}`);
    }
    return out;
  };
  let actual = partes(ENCABEZADO_INICIAL);
  if (!actual.titulo || !actual.capitulo) throw new Error('el encabezado inicial debe traer título y capítulo');
  const mapa = new Map<number, string[]>();
  for (let n = 1; n <= 86; n++) {
    const e = ENCABEZADOS.find((x) => x.desde === n);
    if (e) {
      const p = partes(e.verificado);
      // Un título nuevo abre siempre su capítulo I; un capítulo solo hereda el título vigente.
      if (p.titulo && !p.capitulo) throw new Error(`título sin capítulo: ${e.verificado}`);
      actual = { titulo: p.titulo ?? actual.titulo, capitulo: p.capitulo };
    }
    mapa.set(n, [actual.titulo!, actual.capitulo!]);
  }
  return mapa;
}

const leerLF = (ruta: string) => readFileSync(ruta, 'utf8').replace(/\r\n/g, '\n');

/** Matriz firmada: id → {sha, norm, rol, vigencia}. Verifica su huella (LF). */
function matrizFirmada(): Map<string, { sha: string; num: string; norm: string; rol: string; vigencia: string; esVigente: string }> {
  const bruto = leerLF(join(DIR, 'matriz_clasificacion.csv'));
  if (sha256(bruto) !== FIRMADAS.matriz) throw new Error(`la matriz no es la firmada: ${sha256(bruto)}`);
  const filas = new Map<string, { sha: string; num: string; norm: string; rol: string; vigencia: string; esVigente: string }>();
  for (const l of bruto.trim().split('\n').slice(1)) {
    // Campos simples al principio (articulo,id,num,norm,version,rol,vigencia,es_norma_vigente,"fuente",sha,...): se toma el sha con regex.
    const m = /^(\d+),([^,]+),([^,]+),([^,]*),(?:"[^"]*"|[^,]*),(PRIMARY|CONTEXT),(VIGENTE|DEROGADO),(true|false),(?:"[^"]*"|[^,]*),([0-9a-f]{64}),/.exec(l);
    if (!m) throw new Error(`fila de matriz ilegible: ${l.slice(0, 80)}`);
    filas.set(m[2], { num: m[3], norm: m[4], rol: m[5], vigencia: m[6], esVigente: m[7], sha: m[8] });
  }
  if (filas.size !== 87) throw new Error(`la matriz firmada tiene ${filas.size} filas (≠ 87)`);
  return filas;
}

export interface ArticuloLgm { fila: FilaOla; erratas: string[]; encabezadoCortado: string | null }

export function construir(): ArticuloLgm[] {
  const d1 = leerLF(TEXTO_D1);
  if (sha256(d1) !== SHA_D1) throw new Error(`el texto D1 no es el aprobado: ${sha256(d1)}`);
  const archivo47 = leerLF(join(DIR, 'art47_D50-2016.txt'));
  if (sha256(archivo47) !== FIRMADAS.art47Archivo) throw new Error(`art47_D50-2016.txt no es el firmado: ${sha256(archivo47)}`);
  const texto47 = archivo47.replace(/\n$/, '');
  if (sha256(texto47) !== FIRMADAS.art47Contenido) throw new Error('el contenido del art. 47 de 2016 no es el firmado');
  const textos = cortar(d1.replace(/\n$/, '').split('\n'));
  const ubic = ubicaciones();
  const matriz = matrizFirmada();

  const comun = (n: number, contenido: string, texto_origen: string, pdf: string, extra: Record<string, unknown>) => ({
    norm_id: CFG.normId, instrumento_id: INSTRUMENTO, ingest_batch: LOTE, ola: CFG.ola, ordinal: n, decreto: '182-2009',
    texto_origen, edicion_fuente: 'Sin edición consolidada: texto D1 cotejado de La Gaceta No. 32,125 (tres escaneos: OneDrive, TSC y CCIT) y art. 47 según el art. 10 del D.50-2016 (La Gaceta No. 34,076); expediente D1–D4 y matriz firmados por el CLO el 2026-11-28.',
    pdf_sha256: pdf, article_sha256: sha256(contenido), ubicacion: ubic.get(n), sustituye_id_legacy: null,
    expediente: `${DIR}/EXPEDIENTE_D1_D4_LGM_OLA15.md`, matriz_sha256: FIRMADAS.matriz, texto_d1_sha256: SHA_D1,
    reservas: [RESERVA_R2], ...extra,
  });
  const PRIMARY = (motivo: string): Clasificacion => ({ vigencia: 'VIGENTE', rol: null, motivo });
  const out: ArticuloLgm[] = [];
  for (const [n, t] of textos) {
    const erratas = FE_DE_ERRATAS.filter((f) => f.articulo === n).map((f) => `FE_DE_ERRATAS_PUNTUACION: ${f.imagen}`);
    const enc = ENCABEZADOS.find((e) => e.tras === n) ?? null;
    const correcciones = [...(enc ? [`ENCABEZADO_ESTRUCTURAL_RETIRADO: «${enc.aprobado}» (rige desde el art. ${enc.desde} como «${enc.verificado}»)`] : []), ...erratas];
    const base = (id: string, contenido: string, num: string, norm: string | null, clasificacion: Clasificacion, metadata: Record<string, unknown>): FilaOla => ({
      id, coleccion: 'mayalex_normativos', materia: MATERIA, contenido, num_articulo: num, fuente: FUENTE, metadata,
      jurisdiccion: 'HN', fuente_tipo: 'codigo', instrumento_id: INSTRUMENTO, num_articulo_norm: norm,
      hash_contenido: sha256(contenido), ingest_batch: LOTE, clasificacion,
    });
    if (n === 47) {
      out.push({ erratas: [], encabezadoCortado: null, fila: base(ID_47, texto47, '47', '47',
        PRIMARY('PRIMARY: art. 47 vigente según el art. 10 del D.50-2016 (La Gaceta 34,076, vigente desde el 4-jul-2016); D3/D4 firmados (reservas R1 y R2)'),
        comun(47, texto47, 'GACETA_34076_D50_2016_ART10_COTEJO_IMAGEN', TESTIGOS.gaceta34076D50, {
          vigente_desde: VIGENTE_DESDE_2016, version: 'TEXTO_VIGENTE_D50_2016', version_anterior_id: ID_47_HIST,
          constancias: [{ nota: null, tipo: 'REFORMA', decretos: ['50-2016'], texto: C47_REFORMA }], correcciones_saneamiento: [],
          reservas: [RESERVA_R1, RESERVA_R2],
        })) });
      out.push({ erratas, encabezadoCortado: enc?.aprobado ?? null, fila: base(ID_47_HIST, t, '47', null,
        { vigencia: 'DEROGADO', rol: 'CONTEXT', motivo: 'DEROGADO (sustituido) por el art. 10 del D.50-2016 desde el 4-jul-2016: texto original de 2010 conservado como antecedente, sin num_articulo_norm para que ningún resolvedor por número lo alcance' },
        comun(47, t, 'GACETA_32125_OCR_COTEJADO_D1', TESTIGOS.gaceta32125Base, {
          vigente_desde: VIGENTE_DESDE_2010, derogado_desde: VIGENTE_DESDE_2016, derogado_por: 'D.50-2016', version: 'TEXTO_ORIGINAL_2010_SUSTITUIDO', version_vigente_id: ID_47,
          constancias: [{ nota: null, tipo: 'SUSTITUCION', decretos: ['50-2016'], texto: C47_HIST }], correcciones_saneamiento: correcciones,
        })) });
      continue;
    }
    const constancias = n === 83 ? [{ nota: null, tipo: 'NOTA', decretos: ['82-2004'], texto: C83 }] : [];
    out.push({ erratas, encabezadoCortado: enc?.aprobado ?? null, fila: base(ID(String(n)), t, String(n), String(n),
      PRIMARY(`PRIMARY: texto de 2010 cotejado con tres testigos de La Gaceta 32,125 (D1), vigente desde el 28-jul-2010 (art. 86); D1–D4 y matriz firmados el 2026-11-28 (reserva R2)${erratas.length ? '; fe de erratas de puntuación aprobada' : ''}`),
      comun(n, t, 'GACETA_32125_OCR_COTEJADO_D1', TESTIGOS.gaceta32125Base, { vigente_desde: VIGENTE_DESDE_2010, constancias, correcciones_saneamiento: correcciones })) });
  }

  // Vínculo con la matriz firmada: mismas 87 filas, mismo número, norma, rol, vigencia y huella de contenido.
  if (out.length !== 87) throw new Error(`se construyeron ${out.length} filas (≠ 87)`);
  for (const { fila: f } of out) {
    const m = matriz.get(f.id);
    if (!m) throw new Error(`fila ${f.id} ausente de la matriz firmada`);
    const rol = f.clasificacion.rol ?? 'PRIMARY';
    const ok = m.sha === f.hash_contenido && m.num === f.num_articulo && m.norm === (f.num_articulo_norm ?? '') && m.rol === rol
      && m.vigencia === f.clasificacion.vigencia && m.esVigente === String(f.clasificacion.vigencia === 'VIGENTE');
    if (!ok) throw new Error(`fila ${f.id} no coincide con la matriz firmada (sha ${f.hash_contenido.slice(0, 8)} vs ${m.sha.slice(0, 8)})`);
  }
  return out;
}

// ───────────────────────────── ensayo PGlite ─────────────────────────────

const RPC_MIGRACION = 'supabase/migrations/20261125000000_sincronizar_rpc_prod.sql';

/** Las dos RPC tal como están hoy en producción (cuerpo del repo, md5 37735385…/4392a97a…), sin el bloque de precondiciones. */
function rpcsProduccion(): string {
  const sql = leerLF(RPC_MIGRACION);
  // resolver_articulo_exacto cierra con «$$;» y buscar_biblioteca_v3 con «$function$;».
  const funciones = sql.match(/CREATE OR REPLACE FUNCTION[\s\S]*?AS (\$[a-z]*\$)[\s\S]*?\1;/g);
  if (!funciones || funciones.length !== 2) throw new Error('no se hallaron las dos funciones en la migración de sincronización');
  return funciones.join('\n\n');
}

interface Db { exec(sql: string): Promise<unknown>; query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>; close(): Promise<void> }

async function nuevaBase(prod: boolean): Promise<Db> {
  const { PGlite } = await import('@electric-sql/pglite');
  const { vector } = await import('@electric-sql/pglite-pgvector');
  const db = new PGlite({ extensions: { vector } }) as unknown as Db;
  // Como en Supabase: toda tabla nueva de `public` nace con todos los privilegios para anon/authenticated (00 debe revocarlos en el respaldo).
  await db.exec(`CREATE EXTENSION vector; CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
    CREATE TABLE public.biblioteca_vectores (id text PRIMARY KEY, coleccion text NOT NULL, materia text, contenido text NOT NULL, num_articulo text,
      fuente text, metadata jsonb, embedding vector(384) ${prod ? 'NOT NULL' : ''}, created_at timestamptz DEFAULT now(), jurisdiccion text, fuente_tipo text,
      es_norma_vigente boolean, revision_pendiente boolean NOT NULL DEFAULT false, instrumento_id text, num_articulo_norm text,
      hash_contenido text, ingest_batch text, ingested_at timestamptz DEFAULT now(),
      CONSTRAINT chk_fuente_tipo CHECK (fuente_tipo IS NULL OR fuente_tipo = ANY (ARRAY['ley','codigo','sentencia','doctrina','manual','instrumento'])));
    CREATE INDEX idx_biblio_instrumento_articulo ON public.biblioteca_vectores (instrumento_id, num_articulo_norm) WHERE instrumento_id IS NOT NULL;
    ALTER TABLE public.biblioteca_vectores ENABLE ROW LEVEL SECURITY;`);
  await db.exec(rpcsProduccion());
  // Mismo cuerpo que producción (md5 de prosrc verificado en prod tras R1, 2026-11-26).
  const md5 = (await db.query<{ r: string; b: string }>(`SELECT
    (SELECT md5(prosrc) FROM pg_proc WHERE oid = 'public.resolver_articulo_exacto(text, text, integer)'::regprocedure) r,
    (SELECT md5(prosrc) FROM pg_proc WHERE oid = 'public.buscar_biblioteca_v3(vector, text, text, integer, boolean, text)'::regprocedure) b`)).rows[0];
  if (md5.r !== '3773538539da7da81472ab8f9fd9cee5' || md5.b !== '4392a97aebc5ae90860a8ed2caa8124e') throw new Error(`RPC del ensayo distintas de producción: ${JSON.stringify(md5)}`);
  // Filas ajenas de control: otro instrumento con art. 47 y art. 28 vigentes, y una fila legacy oculta. Ningún paso de la ola debe tocarlas.
  const v = (x: number) => `array_fill(${x}::real, ARRAY[384])::vector`;
  await db.exec(`INSERT INTO public.biblioteca_vectores (id, coleccion, materia, contenido, num_articulo, fuente, metadata, embedding, jurisdiccion, fuente_tipo,
      es_norma_vigente, revision_pendiente, instrumento_id, num_articulo_norm, hash_contenido, ingest_batch) VALUES
    ('OLA12_LP_2007_01:LEY_PROPIEDAD:47', 'mayalex_normativos', '02_CIVIL', 'Texto de control del art. 47 de otra ley.', '47', 'Ley de Propiedad de Honduras (Decreto No. 82-2004)', '{"estado_v":"V5","norm_id":"HN:LEY_PROPIEDAD"}', ${v(0.05)}, 'HN', 'codigo', true, false, 'LEY_PROPIEDAD', '47', 'x', 'OLA12_LP_2007_01'),
    ('OLA12_LP_2007_01:LEY_PROPIEDAD:28', 'mayalex_normativos', '02_CIVIL', 'Texto de control del art. 28 de la Ley de Propiedad.', '28', 'Ley de Propiedad de Honduras (Decreto No. 82-2004)', '{"estado_v":"V5","rol":"CONTEXT","norm_id":"HN:LEY_PROPIEDAD"}', ${v(0.04)}, 'HN', 'codigo', true, false, 'LEY_PROPIEDAD', '28', 'y', 'OLA12_LP_2007_01'),
    ('legacy:control:1', 'mayalex_normativos', '02_CIVIL', 'Fila legacy oculta de control.', '47', 'Fuente legacy', NULL, ${v(0.03)}, 'HN', 'codigo', NULL, true, NULL, NULL, NULL, NULL);`);
  return db;
}

/** Huella de todo lo que NO es del lote (debe quedar intacto en cada paso). */
async function huellaAjenas(db: Db): Promise<string> {
  const r = await db.query<{ h: string }>(`SELECT md5(coalesce(string_agg(x, E'\\n' ORDER BY x COLLATE "C"), '')) h FROM (
    SELECT id || '|' || contenido || '|' || coalesce(metadata::text, 'NULL') || '|' || revision_pendiente || '|' || coalesce(es_norma_vigente::text, 'NULL') || '|' || coalesce(embedding::text, 'NULL') x
    FROM public.biblioteca_vectores WHERE ingest_batch IS DISTINCT FROM '${LOTE}') s`);
  return r.rows[0].h;
}

/** Huella del lote (para comprobar que un reintento que aborta no cambia nada). */
async function huellaLote(db: Db): Promise<string> {
  const r = await db.query<{ h: string }>(`SELECT md5(coalesce(string_agg(x, E'\\n' ORDER BY x COLLATE "C"), '')) h FROM (
    SELECT id || '|' || hash_contenido || '|' || coalesce(metadata::text, 'NULL') || '|' || revision_pendiente || '|' || coalesce(es_norma_vigente::text, 'NULL') || '|' || coalesce(md5(embedding::text), 'NULL') x
    FROM public.biblioteca_vectores WHERE ingest_batch = '${LOTE}') s`);
  return r.rows[0].h;
}

async function debeFallar(db: Db, sql: string, que: string): Promise<string> {
  const antes = await huellaLote(db);
  try { await db.exec(sql); } catch (e) {
    await db.exec('ROLLBACK');
    if (await huellaLote(db) !== antes) throw new Error(`${que}: abortó pero dejó cambios`);
    return (e as Error).message.split('\n')[0];
  }
  throw new Error(`${que}: debía abortar y no abortó`);
}

const VIGENTES_LGM = `SELECT id FROM public.biblioteca_vectores WHERE num_articulo = $1 AND fuente_tipo = 'codigo' AND es_norma_vigente = $2 AND revision_pendiente = false`;

/** Comprobaciones de recuperación sobre una base con el lote visible (V4 en staging, V5 en producción). */
async function comprobarRecuperacion(db: Db, embeddings: ReadonlyMap<string, number[]>, consulta: number[] | null, log: (s: string) => void, etiqueta: string): Promise<void> {
  const vec = (v: readonly number[]) => `[${v.map((x) => x.toFixed(6)).join(',')}]`;
  // (a) RPC exacta en producción: «art. 47» de la LGM → solo el texto de 2016.
  const r47 = await db.query<{ id: string; hash_contenido: string; es_norma_vigente: boolean }>(`SELECT id, hash_contenido, es_norma_vigente FROM public.resolver_articulo_exacto('${INSTRUMENTO}', '47', 20)`);
  if (r47.rows.length !== 1 || r47.rows[0].id !== ID_47 || r47.rows[0].hash_contenido !== FIRMADAS.art47Contenido || r47.rows[0].es_norma_vigente !== true) throw new Error(`${etiqueta}: resolver_articulo_exacto(47) → ${JSON.stringify(r47.rows)}`);
  log(`${etiqueta} · resolver_articulo_exacto('${INSTRUMENTO}', '47') → 1 fila: ${ID_47} (sha ${FIRMADAS.art47Contenido.slice(0, 8)}…, vigente)`);
  // (b) Cada número 1–86 resuelve a exactamente una fila vigente; la histórica nunca sale.
  const vistos = new Set<string>();
  for (let n = 1; n <= 86; n++) {
    const r = await db.query<{ id: string; es_norma_vigente: boolean }>(`SELECT id, es_norma_vigente FROM public.resolver_articulo_exacto('${INSTRUMENTO}', '${n}', 20)`);
    if (r.rows.length !== 1 || !r.rows[0].es_norma_vigente || r.rows[0].id !== ID(String(n))) throw new Error(`${etiqueta}: art. ${n} → ${JSON.stringify(r.rows)}`);
    vistos.add(r.rows[0].id);
  }
  if (vistos.has(ID_47_HIST) || vistos.size !== 86) throw new Error(`${etiqueta}: barrido 1–86 incoherente`);
  log(`${etiqueta} · barrido 1–86 por la RPC exacta: 86 filas distintas, todas vigentes; la fila de 2010 no sale por ningún número`);
  // (c) Ruta exacta de la aplicación (lib/rag/search.ts, consultarPorVigencia): num_articulo = '47', fuente_tipo 'codigo', vigentes.
  const app = (await db.query<{ id: string }>(VIGENTES_LGM, ['47', true])).rows.map((x) => x.id).filter((x) => x.startsWith(LOTE));
  if (app.length !== 1 || app[0] !== ID_47) throw new Error(`${etiqueta}: consulta de search.ts → ${app.join(', ')}`);
  const appFalse = (await db.query<{ id: string }>(VIGENTES_LGM, ['47', false])).rows.map((x) => x.id);
  log(`${etiqueta} · consulta exacta de search.ts (num_articulo='47', es_norma_vigente=true) → del lote solo ${ID_47}; la de 2010 solo aparecería con es_norma_vigente=false (${appFalse.join(', ')}), paso que search.ts eliminó (CLO 28-oct-2026)`);
  // (d) Semántica: el peor caso es consultar con el embedding exacto del texto de 2010.
  const e2010 = embeddings.get(ID_47_HIST)!;
  const sem = async (q: readonly number[], solo: boolean) => (await db.query<{ id: string; es_norma_vigente: boolean; similarity: number }>(
    `SELECT id, es_norma_vigente, similarity FROM public.buscar_biblioteca_v3('${vec(q)}'::vector, 'mayalex_normativos', NULL, 20, ${solo}, 'HN')`)).rows;
  const sv = await sem(e2010, true);
  if (sv.some((x) => x.id === ID_47_HIST)) throw new Error(`${etiqueta}: la búsqueda semántica con solo vigentes devolvió la fila de 2010`);
  const pos47 = sv.findIndex((x) => x.id === ID_47);
  log(`${etiqueta} · semántica (solo_norma_vigente=true) con el embedding exacto del texto de 2010: la fila de 2010 no sale; el art. 47 vigente sale en la posición ${pos47 + 1} de ${sv.length}`);
  const st = await sem(e2010, false);
  const hist = st.find((x) => x.id === ID_47_HIST);
  if (!hist || hist.es_norma_vigente !== false) throw new Error(`${etiqueta}: sin filtro de vigencia la fila de 2010 debía salir marcada false`);
  const { clasificarFragmentoClo } = await import('../../lib/legal-retrieval/clo-guards');
  const meta = (await db.query<{ metadata: Record<string, unknown> }>(`SELECT metadata FROM public.biblioteca_vectores WHERE id = $1`, [ID_47_HIST])).rows[0].metadata;
  const c = clasificarFragmentoClo({ id: ID_47_HIST, fuente: FUENTE, fuente_tipo: 'codigo', jurisdiccion: 'HN', num_articulo: '47', es_norma_vigente: false, metadata: meta, materia: MATERIA });
  if (c.rol !== 'CONTEXT' || !c.bloqueos.includes('VIGENCIA_FALSE_EXCLUIDA')) throw new Error(`${etiqueta}: guardián CLO sobre la fila de 2010 → ${c.rol} [${c.bloqueos.join(', ')}]`);
  log(`${etiqueta} · semántica sin filtro de vigencia: la fila de 2010 sale marcada es_norma_vigente=false y el guardián CLO la degrada a ${c.rol} [${c.bloqueos.join(', ')}]`);
  if (consulta) {
    const q = await sem(consulta, true);
    if (q.some((x) => x.id === ID_47_HIST)) throw new Error(`${etiqueta}: consulta en lenguaje natural devolvió la fila de 2010`);
    // Posición real en el lote (la RPC devuelve como máximo 20): dato de calidad semántica, no condición de aceptación del paquete.
    const rango = (await db.query<{ id: string }>(`SELECT id FROM public.biblioteca_vectores WHERE ingest_batch = '${LOTE}' AND revision_pendiente = false
      ORDER BY embedding <=> '${vec(consulta)}'::vector`)).rows.map((x) => x.id);
    const p = q.findIndex((x) => x.id === ID_47);
    log(`${etiqueta} · consulta «¿Quién administra el Registro de Garantías Mobiliarias?» (solo vigentes): la de 2010 no sale; el art. 47 de 2016 ${p >= 0 ? `sale en la posición ${p + 1}` : 'NO está entre los 20 primeros'} (posición ${rango.indexOf(ID_47) + 1} de ${rango.length} en el lote; la de 2010 estaría en la ${rango.indexOf(ID_47_HIST) + 1} sin filtro de vigencia) — límite semántico, ver pliego R7`);
  }
}

async function postcondiciones(db: Db, estado: 'V4' | 'V5', etiqueta: string, log: (s: string) => void): Promise<void> {
  const r = (await db.query<Record<string, number>>(`SELECT count(*)::int total,
      count(*) FILTER (WHERE revision_pendiente = false AND metadata->>'estado_v' = '${estado}')::int visibles,
      count(*) FILTER (WHERE es_norma_vigente = true AND NOT (metadata ? 'rol'))::int primary_vigentes,
      count(*) FILTER (WHERE es_norma_vigente = false AND metadata->>'rol' = 'CONTEXT')::int context_derogados,
      count(*) FILTER (WHERE num_articulo_norm IS NULL)::int sin_norma,
      count(DISTINCT num_articulo_norm)::int normas,
      count(*) FILTER (WHERE embedding IS NOT NULL AND embedding <> array_fill(0::real, ARRAY[384])::vector)::int con_embedding,
      count(*) FILTER (WHERE encode(sha256(convert_to(contenido, 'UTF8')), 'hex') = hash_contenido)::int sha_ok,
      count(*) FILTER (WHERE metadata->>'vigente_desde' = '${VIGENTE_DESDE_2010}')::int desde_2010,
      count(*) FILTER (WHERE metadata->>'vigente_desde' = '${VIGENTE_DESDE_2016}')::int desde_2016
    FROM public.biblioteca_vectores WHERE ingest_batch = '${LOTE}'`)).rows[0];
  const esperado = { total: 87, visibles: 87, primary_vigentes: 86, context_derogados: 1, sin_norma: 1, normas: 86, con_embedding: 87, sha_ok: 87, desde_2010: 86, desde_2016: 1 };
  for (const [k, v] of Object.entries(esperado)) if (r[k] !== v) throw new Error(`${etiqueta}: ${k} = ${r[k]} (esperado ${v})`);
  log(`${etiqueta} · postcondiciones ${estado}: ${Object.entries(r).map(([k, v]) => `${k} ${v}`).join(', ')}`);
}

export async function ensayar(sqlDe: (ruta: string) => string, embeddings: ReadonlyMap<string, number[]>, consulta: number[] | null): Promise<string[]> {
  const log: string[] = [];
  const L = (s: string) => { log.push(s); console.log(`ENSAYO OK · ${s}`); };

  // ── STAGING ──
  const st = await nuevaBase(false);
  const ajenasSt = await huellaAjenas(st);
  await st.exec(sqlDe('staging/01_insert_staging.sql'));
  const tras01 = await huellaLote(st);
  await st.exec(sqlDe('staging/01_insert_staging.sql'));
  if (await huellaLote(st) !== tras01) throw new Error('staging 01 repetido cambió el lote');
  L('staging 01 ×2: 87 filas ocultas; la repetición no cambia nada (ON CONFLICT DO NOTHING)');
  await st.exec(sqlDe('staging/02_embeddings_staging.sql'));
  const tras02 = await huellaLote(st);
  await st.exec(sqlDe('staging/02_embeddings_staging.sql'));
  if (await huellaLote(st) !== tras02) throw new Error('staging 02 repetido cambió el lote');
  L('staging 02 ×2: 87 embeddings; la repetición no cambia nada (solo filas con embedding NULL)');
  await st.exec(sqlDe('staging/03_verificacion_staging.sql'));
  L('staging 03: verificación de solo lectura superada (86 números normalizados distintos + 1 fila histórica sin número)');
  // Antes de V4 el lote está oculto: ni la RPC exacta ni la semántica lo ven.
  const oculto = await st.query(`SELECT * FROM public.resolver_articulo_exacto('${INSTRUMENTO}', '47', 20)`);
  if (oculto.rows.length !== 0) throw new Error('el lote oculto ya resuelve por la RPC exacta');
  L('staging antes de V4: resolver_articulo_exacto(47) → 0 filas (lote oculto)');
  await st.exec(sqlDe('staging/04_visibilidad_v4_staging.sql'));
  await postcondiciones(st, 'V4', 'staging 04', L);
  L(`staging 04 repetido aborta sin cambios: «${await debeFallar(st, sqlDe('staging/04_visibilidad_v4_staging.sql'), 'staging 04 repetido')}»`);
  await comprobarRecuperacion(st, embeddings, consulta, L, 'staging V4');
  if (await huellaAjenas(st) !== ajenasSt) throw new Error('staging: se tocaron filas ajenas al lote');
  L('staging: filas ajenas al lote intactas (huella idéntica)');
  await st.close();

  // ── PRODUCCIÓN ──
  const pr = await nuevaBase(true);
  const ajenasPr = await huellaAjenas(pr);
  L(`prod 01 sin respaldo aborta: «${await debeFallar(pr, sqlDe('prod/01_datos_prod.sql'), 'prod 01 sin 00')}»`);
  await pr.exec(sqlDe('prod/00_precheck_y_respaldo_prod.sql'));
  const bk = `biblioteca_vectores_${LOTE.toLowerCase()}_backup`;
  const priv = (await pr.query<{ rls: boolean; anon: boolean; auth: boolean; n: number }>(`SELECT c.relrowsecurity rls,
      has_table_privilege('anon', 'public.${bk}', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') anon,
      has_table_privilege('authenticated', 'public.${bk}', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') auth,
      (SELECT count(*)::int FROM public.${bk}) n FROM pg_class c WHERE c.relname = '${bk}'`)).rows[0];
  if (!priv.rls || priv.anon || priv.auth || priv.n !== 0) throw new Error(`respaldo mal blindado: ${JSON.stringify(priv)}`);
  L(`prod 00: respaldo ${bk} con ${priv.n} filas (no hay filas previas de la LGM), RLS activa, sin privilegios para anon/authenticated`);
  L(`prod 00 repetido aborta sin cambios: «${await debeFallar(pr, sqlDe('prod/00_precheck_y_respaldo_prod.sql'), 'prod 00 repetido')}»`);
  await pr.exec(sqlDe('prod/01_datos_prod.sql'));
  const p01 = await huellaLote(pr);
  await pr.exec(sqlDe('prod/01_datos_prod.sql'));
  if (await huellaLote(pr) !== p01) throw new Error('prod 01 repetido cambió el lote');
  L('prod 01 ×2: 87 filas ocultas con vector cero; la repetición no cambia nada');
  L(`prod 03 antes de 02 aborta sin cambios: «${await debeFallar(pr, sqlDe('prod/03_activacion_v5_prod.sql'), 'prod 03 sin embeddings')}»`);
  await pr.exec(sqlDe('prod/02_embeddings_prod.sql'));
  const p02 = await huellaLote(pr);
  await pr.exec(sqlDe('prod/02_embeddings_prod.sql'));
  if (await huellaLote(pr) !== p02) throw new Error('prod 02 repetido cambió el lote');
  L('prod 02 ×2: vector cero sustituido en las 87 filas; la repetición no cambia nada');
  // Control negativo: un contenido alterado después de cargar debe impedir la activación.
  await pr.exec(`UPDATE public.biblioteca_vectores SET contenido = contenido || ' ' WHERE id = '${ID_47}'`);
  L(`prod 03 con un contenido alterado (art. 47) aborta sin cambios: «${await debeFallar(pr, sqlDe('prod/03_activacion_v5_prod.sql'), 'prod 03 con contenido alterado')}»`);
  await pr.exec(`UPDATE public.biblioteca_vectores SET contenido = left(contenido, -1) WHERE id = '${ID_47}'`);
  await pr.exec(sqlDe('prod/03_activacion_v5_prod.sql'));
  await postcondiciones(pr, 'V5', 'prod 03', L);
  L(`prod 03 repetido aborta sin cambios: «${await debeFallar(pr, sqlDe('prod/03_activacion_v5_prod.sql'), 'prod 03 repetido')}»`);
  await comprobarRecuperacion(pr, embeddings, consulta, L, 'prod V5');
  if (await huellaAjenas(pr) !== ajenasPr) throw new Error('prod: se tocaron filas ajenas al lote');
  L('prod: filas ajenas al lote intactas tras 00–03 (huella idéntica)');
  await pr.exec(sqlDe('prod/99_reversion_prod.sql'));
  await pr.exec(sqlDe('prod/99_reversion_prod.sql'));
  const quedan = (await pr.query<{ n: number }>(`SELECT count(*)::int n FROM public.biblioteca_vectores WHERE ingest_batch = '${LOTE}'`)).rows[0].n;
  if (quedan !== 0 || await huellaAjenas(pr) !== ajenasPr) throw new Error('99 no dejó la base como estaba');
  L('prod 99 ×2: el lote desaparece y las filas ajenas quedan idénticas al estado inicial');
  await pr.close();
  return log;
}

async function embeddingConsulta(texto: string, cache: string): Promise<number[]> {
  if (existsSync(cache)) { const c = JSON.parse(readFileSync(cache, 'utf8')); if (c.texto === texto) return c.embedding; }
  const { pipeline } = await import('@xenova/transformers');
  const extractor = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', { quantized: false } as never);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = await (extractor as any)(`query: ${texto}`, { pooling: 'mean', normalize: true });
  const embedding = Array.from(s.data as Float32Array);
  writeFileSync(cache, JSON.stringify({ texto, embedding }) + '\n');
  return embedding;
}

if (process.argv[1]?.endsWith('ola15-lgm.ts')) {
  (async () => {
    const articulos = construir();
    const filas = articulos.map((a) => a.fila);
    mkdirSync(SALIDA, { recursive: true });
    const { embeddingsConCache } = await import('./ola1-cpp');
    const embeddings = await embeddingsConCache(filas, join(SALIDA, 'embeddings_cache.jsonl'));
    writeFileSync(join(SALIDA, 'rows.jsonl'), filas.map((f) => JSON.stringify(f)).join('\n') + '\n');
    const manifiestoArt = {
      instrumento: CFG.normId, ingest_batch: LOTE, texto_d1_sha256: SHA_D1, matriz_sha256: FIRMADAS.matriz, art47_d50_2016_sha256: FIRMADAS.art47Contenido,
      testigos: TESTIGOS, materia: MATERIA, fuente: FUENTE,
      texto_sha256: sha256(filas.map((f) => `${f.id}\n${f.contenido}`).join('\n\n')),
      conteos: contar(filas),
      articulos_detalle: articulos.map(({ fila: f, erratas, encabezadoCortado }) => ({
        id: f.id, numero: f.num_articulo, num_articulo_norm: f.num_articulo_norm, sha256: f.hash_contenido, vigencia: f.clasificacion.vigencia,
        rol: f.clasificacion.rol ?? 'PRIMARY', vigente_desde: f.metadata.vigente_desde, ubicacion: f.metadata.ubicacion,
        constancias: (f.metadata.constancias as Array<{ tipo: string; decretos: string[] }>).map((c) => ({ tipo: c.tipo, decretos: c.decretos })),
        encabezado_cortado: encabezadoCortado, fe_de_erratas: erratas.length > 0,
      })),
    };
    const rutaMA = join(DIR, 'manifiesto_articulos.json');
    writeFileSync(rutaMA, JSON.stringify(manifiestoArt, null, 2) + '\n');
    const { archivos, conteos } = escribirPaquete({ cfg: CFG, filas, embeddings, salida: SALIDA });
    escribirManifiestoYPs1({ cfg: CFG, salida: SALIDA, archivos, conteos, pliegoRel: `${DIR}/${PLIEGO}`, raizRel: '../..',
      extra: { texto_d1_sha256: SHA_D1, matriz_sha256: FIRMADAS.matriz, art47_sha256: FIRMADAS.art47Contenido, texto_sha256: manifiestoArt.texto_sha256,
        manifiesto_articulos_sha256: sha256(readFileSync(rutaMA)), rows_jsonl_sha256: sha256(readFileSync(join(SALIDA, 'rows.jsonl'))) } });
    const manifiesto = readFileSync(join(SALIDA, 'manifiesto_paquete.json'));
    console.log(JSON.stringify({ conteos, texto_sha256: manifiestoArt.texto_sha256, manifiesto_articulos_sha256: sha256(readFileSync(rutaMA)),
      manifiesto_paquete_sha256: sha256(manifiesto), rows_jsonl_sha256: sha256(readFileSync(join(SALIDA, 'rows.jsonl'))),
      archivos: archivos.map((a: ArchivoPaquete) => `${a.ruta} ${a.bytes}B ${a.sha256}`) }, null, 2));
    if (process.argv.includes('--ensayar')) {
      const consulta = await embeddingConsulta('¿Quién administra el Registro de Garantías Mobiliarias?', join(SALIDA, 'consulta_cache.json'));
      const log = await ensayar((ruta) => readFileSync(join(SALIDA, ruta), 'utf8'), embeddings, consulta);
      writeFileSync(join(SALIDA, 'ensayo_pglite.log'), log.map((l) => `ENSAYO OK · ${l}`).join('\n') + '\n');
      console.log(`ensayo completo: ${log.length} comprobaciones superadas`);
    }
  })().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
}
