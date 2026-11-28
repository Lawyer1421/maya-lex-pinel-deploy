/**
 * scripts/olas/correccion-c2-lp-art28.ts
 * Corrección C2 · Ley de Propiedad (OLA 12), art. 28: PRIMARY → CONTEXT vigente, con constancia de la reforma por adición del art. 83
 * del D.182-2009 (Ley de Garantías Mobiliarias, La Gaceta 32,125 del 28-ene-2010), no integrada hasta la OLA 15.
 *
 * Genera el paquete en docs/corpus/fase2/2026-11-27-correccion-c2-lp-art28/ (SQL, manifiesto con huellas) a partir de constantes y de
 * `fila_prod_pre.json` (la fila de producción leída en solo lectura). NO se conecta a ninguna base.
 *
 *   npx tsx scripts/olas/correccion-c2-lp-art28.ts             → escribe los SQL y el manifiesto
 *   npx tsx scripts/olas/correccion-c2-lp-art28.ts --ensayar   → además, ensayo en PGlite EN MEMORIA (pgvector real, nada persiste):
 *                                                                  staging (siembra + todo + ROLLBACK) y prod (01, 02, idempotencia, 99)
 *
 * Diseño (los tres SQL de prod y el ensayo de staging comparten los mismos cuerpos):
 *  - 01 respaldo: comprueba que la fila es la auditada (huellas de contenido, de metadata y del resto de columnas), crea
 *    `biblioteca_vectores_c2_lp_art28_backup` solo desde el estado auditado, activa RLS y revoca todo a PUBLIC/anon/authenticated.
 *  - 02 reclasificación: metadata = respaldo || PARCHE. Idempotente: si ya está aplicada no hace nada; si la metadata no es ni la
 *    auditada ni la corregida, aborta. Postcondición: solo cambió `metadata`; huella final = la esperada; el lote sigue con 142 filas y
 *    una CONTEXT más.
 *  - 99 reversión (no la corre el ejecutor; exige su propia firma): metadata = respaldo.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const DIR = 'docs/corpus/fase2/2026-11-27-correccion-c2-lp-art28';
export const PLIEGO = `${DIR}/DICTAMEN_CORRECCION_C2_LP_ART28.md`;
export const ID = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28';
export const LOTE = 'OLA12_LP_2007_01';
export const RESPALDO = 'biblioteca_vectores_c2_lp_art28_backup';
/** Huellas del estado auditado en producción (lectura del 2026-11-27). */
export const PRE = {
  contenido: '321e9fe4b86adc6eb6fae55daac7d925b6f1aceb50aa0055bfffa1a6ec20e90b',
  metadata: 'c1cb8cdc5bf4630593a8ac953f96c8c2888fc0eb2ca3446548bd9a5fe9918c22',
  /** sha256 de (to_jsonb(fila) - metadata - embedding - created_at - ingested_at)::text: columnas cuyo texto no depende de la sesión. */
  resto: '01b860896efa720b2c8d76f2b9c76d7593cb40db0d4a65517e2040e7ffd71983',
  /** sha256 de embedding::text en producción (pgvector 0.8.0). Solo informativo: staging tiene 0.8.2 y el texto podría diferir. */
  embeddingProd: '74ad790c00d6ac8cb79ddb4cd61d93fffc549450cd09f7a813e61a791c89e5ef',
  loteFilas: 142,
  loteContext: 5,
};
/**
 * sha256 de la metadata corregida, (respaldo || PARCHE)::text. jsonb::text es canónico: PGlite reproduce byte a byte la huella previa de
 * producción (PRE.metadata), así que esta también vale allí. El ensayo comprueba que la postcondición de 02 la alcanza.
 */
export const POST_METADATA = 'd804aedc682f22134fc0dc391893572e917ffa43178a7d37f1c07f7c1841d534';

export const PARCHE = {
  rol: 'CONTEXT',
  motivo_rol: 'CONTEXT vigente: reformado por adición (numerales 2, 5, 7 y 8) por el art. 83 del D.182-2009, Ley de Garantías Mobiliarias, '
    + 'después de la edición de 2007; el texto de la reforma no está integrado (corrección C2, hasta la OLA 15)',
  constancias: [{
    nota: null,
    tipo: 'ADICION',
    texto: 'Reformado por adición en sus numerales 2), 5), 7) y 8) por el artículo 83 del Decreto No. 182-2009 (Ley de Garantías '
      + 'Mobiliarias), publicado en La Gaceta No. 32,125 del 28 de enero de 2010. La reforma es posterior a la edición de 2007 que se usa '
      + 'como fuente y su texto no está integrado: el texto que se muestra es el anterior a ella. CONTEXT vigente hasta integrar el texto '
      + 'cotejado junto con la OLA 15.',
    decretos: ['182-2009'],
  }],
  correcciones_clo: [{ id: 'C2', fecha: '2026-11-27', pliego: PLIEGO, rol_anterior: 'PRIMARY' }],
};

const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
const shaSql = (expr: string) => `encode(sha256(convert_to(${expr},'UTF8')),'hex')`;
const RESTO = (alias: string) => `(to_jsonb(${alias}) - 'metadata' - 'embedding' - 'created_at' - 'ingested_at')::text`;

const CUERPO_01 = (post: string) => `-- 01 · Respaldo protegido de la fila auditada (idempotente).
DO $c2$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE id = '${ID}';
  IF n <> 1 THEN RAISE EXCEPTION 'C2: se esperaba 1 fila ${ID}, hay %', n; END IF;
  PERFORM 1 FROM public.biblioteca_vectores b
   WHERE b.id = '${ID}' AND b.ingest_batch = '${LOTE}' AND b.es_norma_vigente AND NOT b.revision_pendiente
     AND b.hash_contenido = '${PRE.contenido}' AND ${shaSql('b.contenido')} = '${PRE.contenido}' AND ${shaSql(RESTO('b'))} = '${PRE.resto}';
  IF NOT FOUND THEN RAISE EXCEPTION 'C2: la fila no es la auditada (contenido, lote, vigencia o columnas distintas)'; END IF;
  IF to_regclass('public.${RESPALDO}') IS NULL THEN
    -- Solo se respalda el estado auditado: nunca una metadata ya corregida ni otra distinta.
    PERFORM 1 FROM public.biblioteca_vectores b WHERE b.id = '${ID}' AND ${shaSql('b.metadata::text')} = '${PRE.metadata}';
    IF NOT FOUND THEN RAISE EXCEPTION 'C2: no hay respaldo y la metadata actual no es la auditada; no se respalda'; END IF;
    CREATE TABLE public.${RESPALDO} AS SELECT * FROM public.biblioteca_vectores WHERE id = '${ID}';
    RAISE NOTICE 'C2: respaldo creado (public.${RESPALDO})';
  ELSE
    RAISE NOTICE 'C2: el respaldo ya existía; se verifica';
  END IF;
END $c2$;
ALTER TABLE public.${RESPALDO} ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.${RESPALDO} FROM PUBLIC, anon, authenticated;
DO $c2$ DECLARE n int; rol_bd text; priv text; BEGIN
  SELECT count(*) INTO n FROM public.${RESPALDO};
  IF n <> 1 THEN RAISE EXCEPTION 'C2: el respaldo tiene % filas (esperada 1)', n; END IF;
  PERFORM 1 FROM public.${RESPALDO} r WHERE r.id = '${ID}' AND ${shaSql('r.metadata::text')} = '${PRE.metadata}'
     AND ${shaSql('r.contenido')} = '${PRE.contenido}' AND ${shaSql(RESTO('r'))} = '${PRE.resto}';
  IF NOT FOUND THEN RAISE EXCEPTION 'C2: el respaldo no contiene la fila auditada'; END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.${RESPALDO}'::regclass) THEN RAISE EXCEPTION 'C2: el respaldo no tiene RLS'; END IF;
  FOREACH rol_bd IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    FOREACH priv IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
      IF has_table_privilege(rol_bd, 'public.${RESPALDO}', priv) THEN RAISE EXCEPTION 'C2: % conserva % sobre el respaldo', rol_bd, priv; END IF;
    END LOOP;
  END LOOP;
  RAISE NOTICE 'C2: respaldo verificado (1 fila auditada, RLS activo, sin privilegios para anon/authenticated)';
END $c2$;
`;

const PARCHE_SQL = () => `$parche$${JSON.stringify(PARCHE)}$parche$::jsonb`;

const CUERPO_02 = (post: string) => `-- 02 · Reclasificación PRIMARY → CONTEXT vigente con constancia (idempotente).
DO $c2$ DECLARE
  parche jsonb := ${PARCHE_SQL()};
  bk jsonb; actual jsonb; n int; n_lote int; n_ctx int; n_lote2 int; n_ctx2 int;
BEGIN
  IF to_regclass('public.${RESPALDO}') IS NULL THEN RAISE EXCEPTION 'C2: falta el respaldo; ejecute 01 primero'; END IF;
  SELECT r.metadata INTO bk FROM public.${RESPALDO} r WHERE r.id = '${ID}';
  IF bk IS NULL OR ${shaSql('bk::text')} <> '${PRE.metadata}' THEN RAISE EXCEPTION 'C2: el respaldo no tiene la metadata auditada'; END IF;
  SELECT b.metadata INTO actual FROM public.biblioteca_vectores b WHERE b.id = '${ID}' FOR UPDATE;
  IF actual = bk || parche THEN
    RAISE NOTICE 'C2: ya estaba aplicada; sin cambios';
  ELSIF ${shaSql('actual::text')} = '${PRE.metadata}' THEN
    SELECT count(*), count(*) FILTER (WHERE metadata->>'rol' = 'CONTEXT') INTO n_lote, n_ctx FROM public.biblioteca_vectores WHERE ingest_batch = '${LOTE}';
    UPDATE public.biblioteca_vectores SET metadata = bk || parche WHERE id = '${ID}' AND metadata = actual;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'C2: se actualizaron % filas (esperada 1)', n; END IF;
    SELECT count(*), count(*) FILTER (WHERE metadata->>'rol' = 'CONTEXT') INTO n_lote2, n_ctx2 FROM public.biblioteca_vectores WHERE ingest_batch = '${LOTE}';
    IF n_lote2 <> n_lote OR n_ctx2 <> n_ctx + 1 THEN RAISE EXCEPTION 'C2: lote % → % filas, CONTEXT % → % (esperado igual y +1)', n_lote, n_lote2, n_ctx, n_ctx2; END IF;
    RAISE NOTICE 'C2: aplicada (lote ${LOTE}: % filas, CONTEXT % → %)', n_lote2, n_ctx, n_ctx2;
  ELSE
    RAISE EXCEPTION 'C2: la metadata actual no es la auditada ni la corregida (sha %); no se toca', ${shaSql('actual::text')};
  END IF;
  -- Postcondición: solo cambió metadata, y es exactamente respaldo || parche, con la huella esperada.
  PERFORM 1 FROM public.biblioteca_vectores b JOIN public.${RESPALDO} r USING (id)
   WHERE b.id = '${ID}' AND b.metadata = r.metadata || parche AND (to_jsonb(b) - 'metadata') = (to_jsonb(r) - 'metadata')
     AND ${shaSql('b.metadata::text')} = '${post}' AND b.metadata->>'rol' = 'CONTEXT' AND b.es_norma_vigente AND NOT b.revision_pendiente;
  IF NOT FOUND THEN RAISE EXCEPTION 'C2: postcondición fallida'; END IF;
  RAISE NOTICE 'C2: postcondición OK (metadata sha ${post})';
END $c2$;
`;

const CUERPO_99 = (post: string) => `-- 99 · Reversión: devuelve la metadata del respaldo (idempotente).
DO $c2$ DECLARE
  parche jsonb := ${PARCHE_SQL()};
  bk jsonb; actual jsonb; n int;
BEGIN
  IF to_regclass('public.${RESPALDO}') IS NULL THEN RAISE EXCEPTION 'C2: falta el respaldo; no hay nada que revertir con seguridad'; END IF;
  SELECT r.metadata INTO bk FROM public.${RESPALDO} r WHERE r.id = '${ID}';
  IF bk IS NULL OR ${shaSql('bk::text')} <> '${PRE.metadata}' THEN RAISE EXCEPTION 'C2: el respaldo no tiene la metadata auditada'; END IF;
  SELECT b.metadata INTO actual FROM public.biblioteca_vectores b WHERE b.id = '${ID}' FOR UPDATE;
  IF actual = bk THEN
    RAISE NOTICE 'C2: ya estaba en el estado auditado; sin cambios';
  ELSIF actual = bk || parche AND ${shaSql('actual::text')} = '${post}' THEN
    UPDATE public.biblioteca_vectores SET metadata = bk WHERE id = '${ID}' AND metadata = actual;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'C2: se revirtieron % filas (esperada 1)', n; END IF;
    RAISE NOTICE 'C2: revertida';
  ELSE
    RAISE EXCEPTION 'C2: la metadata actual no es la corregida por C2 ni la auditada; no se toca';
  END IF;
  PERFORM 1 FROM public.biblioteca_vectores b JOIN public.${RESPALDO} r USING (id)
   WHERE b.id = '${ID}' AND to_jsonb(b) = to_jsonb(r) AND ${shaSql('b.metadata::text')} = '${PRE.metadata}';
  IF NOT FOUND THEN RAISE EXCEPTION 'C2: la fila no quedó idéntica al respaldo'; END IF;
END $c2$;
`;

const cabecera = (titulo: string, destino: string) => `-- Corrección C2 · ${titulo}
-- ${destino}
-- Fila: ${ID} (Ley de Propiedad, art. 28). Solo cambia \`metadata\`: rol CONTEXT, motivo y constancia del art. 83 del D.182-2009.
-- Generado por scripts/olas/correccion-c2-lp-art28.ts; no editar a mano (la huella está en manifiesto.json y en el dictamen).
`;

function siembra(): string {
  const f = JSON.parse(readFileSync(join(DIR, 'fila_prod_pre.json'), 'utf8'));
  if (sha(f.contenido) !== PRE.contenido || sha(f.metadata) !== PRE.metadata || sha(f.embedding) !== PRE.embeddingProd) throw new Error('fila_prod_pre.json no coincide con las huellas auditadas');
  const t = (s: string, tag: string) => { if (s.includes(`$${tag}$`)) throw new Error(`el texto contiene $${tag}$`); return `$${tag}$${s}$${tag}$`; };
  return `INSERT INTO public.biblioteca_vectores (id, coleccion, materia, contenido, num_articulo, fuente, metadata, embedding, created_at, jurisdiccion, fuente_tipo,
  es_norma_vigente, revision_pendiente, instrumento_id, num_articulo_norm, hash_contenido, ingest_batch, ingested_at) VALUES (
  '${f.id}', '${f.coleccion}', '${f.materia}', ${t(f.contenido, 'cont')}, '${f.num_articulo}', '${f.fuente}', ${t(f.metadata, 'meta')}::jsonb,
  '${f.embedding}'::vector, '${f.created_at}'::timestamptz, '${f.jurisdiccion}', '${f.fuente_tipo}', ${f.es_norma_vigente}, ${f.revision_pendiente},
  '${f.instrumento_id}', '${f.num_articulo_norm}', '${f.hash_contenido}', '${f.ingest_batch}', '${f.ingested_at}'::timestamptz);
`;
}

export function generar(post: string): Record<string, string> {
  const prod = 'DESTINO EXCLUSIVO: mayalex-ia-pinel-hn (producción) (thgrhueckkjdutjvcufp). Solo tras la firma «C2 FIRMADA» del CLO en el dictamen.';
  return {
    '01_respaldo_prod.sql': `${cabecera('paso 01 · respaldo protegido', prod)}\nBEGIN;\n${CUERPO_01(post)}COMMIT;\n`,
    '02_reclasificar_prod.sql': `${cabecera('paso 02 · reclasificación', prod)}\nBEGIN;\n${CUERPO_02(post)}COMMIT;\n`,
    '99_reversion_prod.sql': `${cabecera('paso 99 · reversión (exige su propia firma; el ejecutor no la corre)', prod)}\nBEGIN;\n${CUERPO_99(post)}COMMIT;\n`,
    '01_ensayo_staging.sql': `${cabecera('ensayo en staging', 'DESTINO EXCLUSIVO: mayalex-staging (aicakncgtuiiuomflkqj). Termina en ROLLBACK: no deja NADA en staging.')}
-- Staging no tiene la OLA 12 LP: se siembra, dentro de la transacción, la fila exacta de producción (fila_prod_pre.json), se corren
-- 01 y 02 dos veces (idempotencia) y 99 dos veces, y se revierte todo.
BEGIN;
DO $c2$ BEGIN
  IF EXISTS (SELECT 1 FROM public.biblioteca_vectores WHERE id = '${ID}') THEN RAISE EXCEPTION 'C2 ensayo: staging ya tiene la fila; el ensayo exige partir sin ella'; END IF;
  IF to_regclass('public.${RESPALDO}') IS NOT NULL THEN RAISE EXCEPTION 'C2 ensayo: staging ya tiene el respaldo'; END IF;
END $c2$;
${siembra()}${CUERPO_01(post)}${CUERPO_02(post)}${CUERPO_02(post)}${CUERPO_01(post)}${CUERPO_99(post)}${CUERPO_99(post)}DO $c2$ BEGIN
  PERFORM 1 FROM public.biblioteca_vectores b WHERE b.id = '${ID}' AND ${shaSql('b.metadata::text')} = '${PRE.metadata}';
  IF NOT FOUND THEN RAISE EXCEPTION 'C2 ensayo: la fila no volvió al estado auditado'; END IF;
  RAISE NOTICE 'C2 ensayo: COMPLETO (01, 02, idempotencia y 99 verificados); se revierte todo con ROLLBACK';
END $c2$;
ROLLBACK;
`,
  };
}

function escribir(post: string): Array<{ ruta: string; bytes: number; sha256: string }> {
  const archivos = generar(post);
  const out: Array<{ ruta: string; bytes: number; sha256: string }> = [];
  for (const [ruta, sql] of Object.entries(archivos)) {
    const buf = Buffer.from(sql, 'utf8');
    writeFileSync(join(DIR, ruta), buf);
    out.push({ ruta, bytes: buf.length, sha256: sha(buf) });
  }
  const h = (r: string) => out.find((x) => x.ruta === r)!;
  const manifiesto = {
    ola: 'CORRECCION_C2', ingest_batch: 'LP_ART28_CONTEXT_D182_2009',
    descripcion: 'Ley de Propiedad art. 28 (OLA12_LP_2007_01): PRIMARY → CONTEXT vigente con constancia del art. 83 del D.182-2009',
    pliego: PLIEGO, firma: 'C2 FIRMADA', refs: { staging: 'aicakncgtuiiuomflkqj', prod: 'thgrhueckkjdutjvcufp' },
    archivos: [
      { ...h('01_ensayo_staging.sql'), destino: 'staging', orden: 1, requiereFirma: false },
      { ...h('01_respaldo_prod.sql'), destino: 'prod', orden: 1, requiereFirma: true },
      { ...h('02_reclasificar_prod.sql'), destino: 'prod', orden: 2, requiereFirma: true },
      { ...h('99_reversion_prod.sql'), destino: 'prod', orden: 99, requiereFirma: true },
    ],
  };
  writeFileSync(join(DIR, 'manifiesto.json'), `${JSON.stringify(manifiesto, null, 2)}\n`);
  return out;
}

async function ensayar(post: string): Promise<string> {
  const { PGlite } = await import('@electric-sql/pglite');
  // Dependencia transitiva (vía @electric-sql/pglite-socket): solo para este ensayo local, no para CI.
  const { vector } = await import('@electric-sql/pglite-pgvector');
  const nueva = async () => {
    const db = new PGlite({ extensions: { vector } });
    // Como en Supabase: toda tabla nueva de `public` nace con todos los privilegios para anon/authenticated (por eso 01 los revoca).
    await db.exec(`CREATE EXTENSION vector; CREATE ROLE anon; CREATE ROLE authenticated;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
      CREATE TABLE public.biblioteca_vectores (id text PRIMARY KEY, coleccion text NOT NULL, materia text, contenido text NOT NULL, num_articulo text,
        fuente text, metadata jsonb, embedding vector(384) NOT NULL, created_at timestamptz DEFAULT now(), jurisdiccion text, fuente_tipo text,
        es_norma_vigente boolean, revision_pendiente boolean NOT NULL DEFAULT false, instrumento_id text, num_articulo_norm text,
        hash_contenido text, ingest_batch text, ingested_at timestamptz DEFAULT now());
      ALTER TABLE public.biblioteca_vectores ENABLE ROW LEVEL SECURITY;
      GRANT ALL ON public.biblioteca_vectores TO anon, authenticated;`);
    return db;
  };
  const avisos: string[] = [];
  const correr = async (db: Awaited<ReturnType<typeof nueva>>, sql: string) => { await db.exec(sql); };
  const archivos = generar(post);

  // 1) Staging: tabla con 4 filas del lote para que cuenten los conteos; el ensayo debe terminar sin dejar rastro.
  const st = await nueva();
  const relleno = (n: number, rol: string | null) => `INSERT INTO public.biblioteca_vectores (id, coleccion, contenido, metadata, embedding, ingest_batch)
    VALUES ('${LOTE}:X:${n}', 'c', 'x', '${JSON.stringify(rol ? { rol } : {})}'::jsonb, array_fill(0.1::real, ARRAY[384])::vector, '${LOTE}');`;
  await st.exec(relleno(1, null) + relleno(2, 'CONTEXT'));
  const antes = (await st.query<{ n: number }>('SELECT count(*)::int n FROM public.biblioteca_vectores')).rows[0].n;
  await correr(st, archivos['01_ensayo_staging.sql']);
  const despues = (await st.query<{ n: number }>('SELECT count(*)::int n FROM public.biblioteca_vectores')).rows[0].n;
  const resp = (await st.query<{ r: string | null }>(`SELECT to_regclass('public.${RESPALDO}')::text r`)).rows[0].r;
  if (antes !== despues || resp !== null) throw new Error(`ensayo staging dejó rastro: filas ${antes}→${despues}, respaldo ${resp}`);
  avisos.push(`staging: ensayo completo y revertido (filas ${antes}→${despues}, sin respaldo)`);

  // 2) Prod: siembra persistente en un PGlite nuevo, 01, 02, repetición (idempotencia), 99, repetición; y comprobación del guardián CLO.
  const pr = await nueva();
  const sembrar = archivos['01_ensayo_staging.sql'].match(/INSERT INTO public\.biblioteca_vectores[\s\S]*?\);\n/)![0];
  await pr.exec(sembrar + relleno(1, null) + relleno(2, 'CONTEXT'));
  // Control negativo: sin el REVOKE, el respaldo heredaría los privilegios por defecto y la verificación de 01 debe abortar.
  const sinRevoke = archivos['01_respaldo_prod.sql'].replace(/^REVOKE ALL ON TABLE .*$/m, '');
  let abortoSinRevoke = false;
  try { await pr.exec(sinRevoke); } catch { abortoSinRevoke = true; await pr.exec('ROLLBACK'); }
  if (!abortoSinRevoke) throw new Error('01 sin REVOKE no abortó: la verificación de privilegios no detecta nada');
  avisos.push('01 aborta si el respaldo conserva privilegios de anon/authenticated (control negativo sin REVOKE)');
  await correr(pr, archivos['01_respaldo_prod.sql']);
  await correr(pr, archivos['02_reclasificar_prod.sql']);
  const fila = (await pr.query<{ metadata: Record<string, unknown>; s: string }>(`SELECT metadata, ${shaSql('metadata::text')} s FROM public.biblioteca_vectores WHERE id = '${ID}'`)).rows[0];
  await correr(pr, archivos['02_reclasificar_prod.sql']);
  await correr(pr, archivos['01_respaldo_prod.sql']);
  const { clasificarFragmentoClo } = await import('../../lib/legal-retrieval/clo-guards');
  const f = JSON.parse(readFileSync(join(DIR, 'fila_prod_pre.json'), 'utf8'));
  const c = clasificarFragmentoClo({ id: ID, fuente: f.fuente, fuente_tipo: f.fuente_tipo, jurisdiccion: f.jurisdiccion, num_articulo: '28', es_norma_vigente: true, metadata: fila.metadata });
  const c0 = clasificarFragmentoClo({ id: ID, fuente: f.fuente, fuente_tipo: f.fuente_tipo, jurisdiccion: f.jurisdiccion, num_articulo: '28', es_norma_vigente: true, metadata: JSON.parse(f.metadata) });
  if (c.rol !== 'CONTEXT' || !c.bloqueos.includes('ROL_DECLARADO_CONTEXT') || c0.rol !== 'PRIMARY') throw new Error(`guardián CLO: antes ${c0.rol}, después ${c.rol} [${c.bloqueos.join(', ')}]`);
  avisos.push(`guardián CLO: antes ${c0.rol}, después ${c.rol} (${c.bloqueos.join(', ')})`);
  // Un estado ajeno debe abortar sin tocar nada.
  await pr.exec(`UPDATE public.biblioteca_vectores SET metadata = metadata || '{"x":1}'::jsonb WHERE id = '${ID}'`);
  let abortó = false;
  try { await pr.exec(archivos['02_reclasificar_prod.sql']); } catch { abortó = true; await pr.exec('ROLLBACK'); }
  if (!abortó) throw new Error('02 no abortó ante una metadata ajena');
  await pr.exec(`UPDATE public.biblioteca_vectores SET metadata = metadata - 'x' WHERE id = '${ID}'`);
  avisos.push('02 aborta ante una metadata que no es ni la auditada ni la corregida');
  await correr(pr, archivos['99_reversion_prod.sql']);
  await correr(pr, archivos['99_reversion_prod.sql']);
  const fin = (await pr.query<{ s: string }>(`SELECT ${shaSql('metadata::text')} s FROM public.biblioteca_vectores WHERE id = '${ID}'`)).rows[0].s;
  if (fin !== PRE.metadata) throw new Error(`99 no devolvió la metadata auditada: ${fin}`);
  avisos.push('prod: 01, 02, idempotencia (02 y 01 repetidos) y 99 (dos veces) verificados; la fila vuelve a la huella auditada');
  for (const a of avisos) console.log(`ENSAYO OK · ${a}`);
  return fila.s;
}

if (process.argv[1]?.endsWith('correccion-c2-lp-art28.ts')) {
  (async () => {
    if (process.argv.includes('--ensayar')) {
      const post = await ensayar(POST_METADATA);
      if (post !== POST_METADATA) throw new Error(`huella post del ensayo ${post} ≠ POST_METADATA ${POST_METADATA}`);
      console.log(`ENSAYO OK · huella de la metadata corregida ${post}`);
    }
    for (const a of escribir(POST_METADATA)) console.log(`${a.ruta}  ${a.bytes} bytes  sha256 ${a.sha256}`);
  })().catch((e) => { console.error(`ERROR: ${e instanceof Error ? e.message : e}`); process.exit(1); });
}
