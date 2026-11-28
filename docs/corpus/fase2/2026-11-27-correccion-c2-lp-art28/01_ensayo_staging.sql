-- Corrección C2 · ensayo en staging
-- DESTINO EXCLUSIVO: mayalex-staging (aicakncgtuiiuomflkqj). Termina en ROLLBACK: no deja NADA en staging.
-- Fila: OLA12_LP_2007_01:LEY_PROPIEDAD:28 (Ley de Propiedad, art. 28). Solo cambia `metadata`: rol CONTEXT, motivo y constancia del art. 83 del D.182-2009.
-- Generado por scripts/olas/correccion-c2-lp-art28.ts; no editar a mano (la huella está en manifiesto.json y en el dictamen).

-- Staging no tiene la OLA 12 LP: se siembra, dentro de la transacción, la fila exacta de producción (fila_prod_pre.json), se corren
-- 01 y 02 dos veces (idempotencia) y 99 dos veces, y se revierte todo.
BEGIN;
DO $c2$ BEGIN
  IF EXISTS (SELECT 1 FROM public.biblioteca_vectores WHERE id = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28') THEN RAISE EXCEPTION 'C2 ensayo: staging ya tiene la fila; el ensayo exige partir sin ella'; END IF;
  IF to_regclass('public.biblioteca_vectores_c2_lp_art28_backup') IS NOT NULL THEN RAISE EXCEPTION 'C2 ensayo: staging ya tiene el respaldo'; END IF;
END $c2$;
INSERT INTO public.biblioteca_vectores (id, coleccion, materia, contenido, num_articulo, fuente, metadata, embedding, created_at, jurisdiccion, fuente_tipo,
  es_norma_vigente, revision_pendiente, instrumento_id, num_articulo_norm, hash_contenido, ingest_batch, ingested_at) VALUES (
  'OLA12_LP_2007_01:LEY_PROPIEDAD:28', 'mayalex_normativos', '02_CIVIL', $cont$Todos los registros que dependan del Instituto de la Propiedad (IP) funcionan como un Registro Unificado de la Propiedad que incluirá los siguientes:

1) Registro de la propiedad Inmueble: comprenderá los derechos reales constituidos sobre bienes inmuebles, así como los gravámenes y anotaciones preventivas que se constituyan sobre ellos;

2) Registro de la Propiedad Mueble: Comprenderá vehículo y otros así como los gravámenes y anotaciones preventivas que se constituyan sobre bienes muebles;

3) Registro Mercantil: comprenderá las empresas mercantiles bajo la titularidad del comerciantes individuales o sociales, sus hechos o relaciones jurídicas; y, los gravámenes y anotaciones preventivas que se constituyan sobre la empresa o sus elementos;

4) Registro de la Propiedad intelectual: comprenderá la propiedad industrial y los derechos de autor y derechos conexos.

5) Registros Especiales: Comprenderá personas jurídicas Civiles, sentencias concesiones y franquicias otorgadas por el Estado, información cartográfica, información geográfica, patrimonio histórico, patrimonio cultural, patrimonio de la humanidad, áreas protegidas, reservas turísticas y otras que el Instituto de la Propiedad (IP) cree o incorpore; y,

6) Registro Asociados: comprenderá registros de algún tipo de propiedad que sean manejados por otros entes u órganos de la administración pública tales como el registro de aeronaves a cargo de la Dirección de Aeronáutica Civil y Registro Marítimo que comprende naves, buques y gravámenes sobre los mismos.$cont$, '28', 'Ley de Propiedad de Honduras (Decreto No. 82-2004)', $meta${"ola": "OLA12", "decreto": "82-2004", "norm_id": "HN:LEY_PROPIEDAD", "ordinal": 28, "estado_v": "V5", "vigencia": "TRUE_PRESUNTA", "ubicacion": [], "motivo_rol": "PRIMARY elegible: edición consolidada CEDIJ con reformas integradas; cotejo íntegro con La Gaceta pendiente (D1)", "pdf_sha256": "ecdb725f72985a489643669300edee0f702a610bbb9c454f71daa84a6ce31785", "constancias": [], "adjudicacion": "EXPEDIENTE_AUDITORIA_LP_OLA12.md (D1–D8)", "ingest_batch": "OLA12_LP_2007_01", "texto_origen": "PDF_CONSOLIDADO_CEDIJ_SANEADO", "promocion_ola": "OLA12", "article_sha256": "321e9fe4b86adc6eb6fae55daac7d925b6f1aceb50aa0055bfffa1a6ec20e90b", "edicion_fuente": "Edición de la Corte Suprema de Justicia «Ley_de_la_Propiedad.pdf» (GNU Ghostscript, 12-abr-2007), sin notas al pie.", "instrumento_id": "LEY_PROPIEDAD", "promocion_fecha": "2026-11-24", "revision_pendiente": false, "sustituye_id_legacy": null, "correcciones_saneamiento": ["ENCABEZADO_RETIRADO"]}$meta$::jsonb,
  '[0.064958,-0.01318,-0.049383,-0.108542,0.031044,-0.080469,0.013681,0.088467,0.058512,-0.03466,0.015506,0.063474,0.050923,-0.022742,-0.035121,0.028919,0.059424,-0.045171,-0.012374,-0.032305,0.012909,0.001137,-0.038975,0.071315,0.053256,0.03344,-0.014767,0.021769,0.09148,-0.04417,-0.070575,-0.022007,0.080536,-0.095975,0.064659,-0.010483,-0.049556,-0.031738,0.012778,-0.078776,-0.082037,-0.003847,0.020955,0.039069,0.056127,0.079427,-0.034559,0.059753,-0.034399,-0.040704,-0.076058,0.050835,0.025273,0.080189,0.012364,-0.091685,-0.063159,-0.051407,-0.039414,0.022195,0.07897,-0.035761,0.01818,0.04819,0.042842,0.034372,0.032741,0.024652,-0.050029,-0.048726,-0.093679,0.016913,-0.014463,-0.03858,0.014964,0.004086,0.077757,-0.073389,0.027749,-0.079764,-0.079088,-0.008759,-0.003435,0.043535,-0.007439,0.10457,0.033042,-0.040933,0.071746,-0.01827,0.091515,0.038409,-0.040368,-0.050764,-0.050202,-0.05175,-0.062521,0.076684,0.071141,-0.042426,0.091826,-0.082006,0.01235,-0.099428,-0.046842,0.013542,-0.010069,-0.00383,0.02744,-0.068782,-0.002525,0.005458,0.055942,0.031388,-0.074704,-0.040653,0.017722,-0.082571,0.044563,-0.060494,0.029915,-0.00875,-0.028887,-0.106977,-0.063833,-0.058032,0.040365,0.029534,0.019775,0.020148,-0.019242,0.072159,0.07674,0.091629,0.064578,0.088769,-0.002926,0.029455,-0.020402,-0.046039,-0.076021,0.036326,-0.032866,0.033024,0.020532,0.031219,0.086631,-0.044637,0.051642,-0.071161,0.025344,0.026061,0.040033,0.0666,0.039688,-0.037199,-0.073042,-0.006656,0.04568,0.019617,-0.027732,-0.022077,-0.075876,-0.022285,-0.041864,-0.049144,-0.024632,0.046507,-0.061349,-0.06052,0.008527,0.067337,-0.023707,0.044793,-0.020294,0.082975,-0.066402,0.026554,0.045556,0.021425,0.036736,-0.034972,-0.000687,-0.071147,-0.081371,-0.047945,-0.060728,0.021107,0.005679,-0.053548,-0.000513,0.026927,-0.0718,-0.052273,-0.080987,0.051456,-0.03315,0.039837,0.01255,0.077549,-0.022743,-0.020903,0.096954,0.042852,0.046037,0.029092,-0.043626,0.075637,-0.083244,0.005336,0.004711,-0.01377,-0.022852,0.054157,-0.009348,-0.003654,-0.012924,0.059816,-0.049742,0.026797,0.027343,-0.001935,0.060301,-0.111107,-0.036402,0.033889,0.023676,-0.072806,-0.083385,0.008296,-0.052648,-0.020308,-0.045017,-0.073896,-0.064019,-0.097786,-0.025744,-0.00661,0.074212,-0.031131,-0.042962,0.013969,0.041394,-0.035617,0.064468,-0.029612,-0.028155,0.043022,-0.035223,0.06857,0.05923,-0.066802,-0.055504,-0.028276,-0.018739,0.061859,0.01849,0.077382,-0.071026,0.035965,-0.008697,-0.043652,0.125603,0.037823,0.036868,0.012771,-0.03374,-0.018789,-0.055529,-0.03762,-0.036222,0.012055,0.025848,-0.032316,0.013749,-0.012858,0.010223,0.087371,-0.041913,-0.005583,0.032452,0.0197,0.083976,0.059399,0.079114,-0.038418,0.023878,0.012987,0.014541,-0.024736,-0.040376,-0.058626,0.073262,-0.054176,0.02114,0.068764,0.004689,0.050829,-0.078264,0.043614,0.006808,-0.017869,-0.002492,0.038095,-0.020809,0.071627,0.027585,-0.005754,0.061766,0.047126,0.044553,0.037206,-0.043134,-0.04101,0.063142,0.036331,0.010675,0.028119,-0.093245,-0.058322,-0.063725,-0.034575,0.016467,-0.027472,0.092131,0.054023,0.039208,-0.036607,0.072938,-0.006317,0.053796,-0.049893,-0.0211,0.003947,-0.053089,-0.03218,-0.042117,0.052165,-0.016089,-0.061028,0.067214,0.061731,-0.044282,0.032647,-0.015782,-0.060999,0.043971,-0.067957,-0.023606,0.023034,0.028918,-0.084914,0.010877,0.040102,-0.088499,0.018656,-0.042938,-0.035475,0.068858,0.037059,-0.036955,-0.092236,0.072501,0.056079,0.082558,-0.012952,0.00296,-0.049788,0.023278,-0.060744,0.076145,0.049457,-0.000678,-0.019062,-0.031062,-0.040177,-0.079868,0.055329,-0.064214,-0.079346,0.075789,0.072059,0.081212,0.063991]'::vector, '2026-11-25 13:21:54.169202+00'::timestamptz, 'HN', 'codigo', true, false,
  'LEY_PROPIEDAD', '28', '321e9fe4b86adc6eb6fae55daac7d925b6f1aceb50aa0055bfffa1a6ec20e90b', 'OLA12_LP_2007_01', '2026-11-25 13:21:54.169202+00'::timestamptz);
-- 01 · Respaldo protegido de la fila auditada (idempotente).
DO $c2$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE id = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28';
  IF n <> 1 THEN RAISE EXCEPTION 'C2: se esperaba 1 fila OLA12_LP_2007_01:LEY_PROPIEDAD:28, hay %', n; END IF;
  PERFORM 1 FROM public.biblioteca_vectores b
   WHERE b.id = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28' AND b.ingest_batch = 'OLA12_LP_2007_01' AND b.es_norma_vigente AND NOT b.revision_pendiente
     AND b.hash_contenido = '321e9fe4b86adc6eb6fae55daac7d925b6f1aceb50aa0055bfffa1a6ec20e90b' AND encode(sha256(convert_to(b.contenido,'UTF8')),'hex') = '321e9fe4b86adc6eb6fae55daac7d925b6f1aceb50aa0055bfffa1a6ec20e90b' AND encode(sha256(convert_to((to_jsonb(b) - 'metadata' - 'embedding' - 'created_at' - 'ingested_at')::text,'UTF8')),'hex') = '01b860896efa720b2c8d76f2b9c76d7593cb40db0d4a65517e2040e7ffd71983';
  IF NOT FOUND THEN RAISE EXCEPTION 'C2: la fila no es la auditada (contenido, lote, vigencia o columnas distintas)'; END IF;
  IF to_regclass('public.biblioteca_vectores_c2_lp_art28_backup') IS NULL THEN
    -- Solo se respalda el estado auditado: nunca una metadata ya corregida ni otra distinta.
    PERFORM 1 FROM public.biblioteca_vectores b WHERE b.id = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28' AND encode(sha256(convert_to(b.metadata::text,'UTF8')),'hex') = 'c1cb8cdc5bf4630593a8ac953f96c8c2888fc0eb2ca3446548bd9a5fe9918c22';
    IF NOT FOUND THEN RAISE EXCEPTION 'C2: no hay respaldo y la metadata actual no es la auditada; no se respalda'; END IF;
    CREATE TABLE public.biblioteca_vectores_c2_lp_art28_backup AS SELECT * FROM public.biblioteca_vectores WHERE id = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28';
    RAISE NOTICE 'C2: respaldo creado (public.biblioteca_vectores_c2_lp_art28_backup)';
  ELSE
    RAISE NOTICE 'C2: el respaldo ya existía; se verifica';
  END IF;
END $c2$;
ALTER TABLE public.biblioteca_vectores_c2_lp_art28_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.biblioteca_vectores_c2_lp_art28_backup FROM PUBLIC, anon, authenticated;
DO $c2$ DECLARE n int; rol_bd text; priv text; BEGIN
  SELECT count(*) INTO n FROM public.biblioteca_vectores_c2_lp_art28_backup;
  IF n <> 1 THEN RAISE EXCEPTION 'C2: el respaldo tiene % filas (esperada 1)', n; END IF;
  PERFORM 1 FROM public.biblioteca_vectores_c2_lp_art28_backup r WHERE r.id = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28' AND encode(sha256(convert_to(r.metadata::text,'UTF8')),'hex') = 'c1cb8cdc5bf4630593a8ac953f96c8c2888fc0eb2ca3446548bd9a5fe9918c22'
     AND encode(sha256(convert_to(r.contenido,'UTF8')),'hex') = '321e9fe4b86adc6eb6fae55daac7d925b6f1aceb50aa0055bfffa1a6ec20e90b' AND encode(sha256(convert_to((to_jsonb(r) - 'metadata' - 'embedding' - 'created_at' - 'ingested_at')::text,'UTF8')),'hex') = '01b860896efa720b2c8d76f2b9c76d7593cb40db0d4a65517e2040e7ffd71983';
  IF NOT FOUND THEN RAISE EXCEPTION 'C2: el respaldo no contiene la fila auditada'; END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.biblioteca_vectores_c2_lp_art28_backup'::regclass) THEN RAISE EXCEPTION 'C2: el respaldo no tiene RLS'; END IF;
  FOREACH rol_bd IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    FOREACH priv IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
      IF has_table_privilege(rol_bd, 'public.biblioteca_vectores_c2_lp_art28_backup', priv) THEN RAISE EXCEPTION 'C2: % conserva % sobre el respaldo', rol_bd, priv; END IF;
    END LOOP;
  END LOOP;
  RAISE NOTICE 'C2: respaldo verificado (1 fila auditada, RLS activo, sin privilegios para anon/authenticated)';
END $c2$;
-- 02 · Reclasificación PRIMARY → CONTEXT vigente con constancia (idempotente).
DO $c2$ DECLARE
  parche jsonb := $parche${"rol":"CONTEXT","motivo_rol":"CONTEXT vigente: reformado por adición (numerales 2, 5, 7 y 8) por el art. 83 del D.182-2009, Ley de Garantías Mobiliarias, después de la edición de 2007; el texto de la reforma no está integrado (corrección C2, hasta la OLA 15)","constancias":[{"nota":null,"tipo":"ADICION","texto":"Reformado por adición en sus numerales 2), 5), 7) y 8) por el artículo 83 del Decreto No. 182-2009 (Ley de Garantías Mobiliarias), publicado en La Gaceta No. 32,125 del 28 de enero de 2010. La reforma es posterior a la edición de 2007 que se usa como fuente y su texto no está integrado: el texto que se muestra es el anterior a ella. CONTEXT vigente hasta integrar el texto cotejado junto con la OLA 15.","decretos":["182-2009"]}],"correcciones_clo":[{"id":"C2","fecha":"2026-11-27","pliego":"docs/corpus/fase2/2026-11-27-correccion-c2-lp-art28/DICTAMEN_CORRECCION_C2_LP_ART28.md","rol_anterior":"PRIMARY"}]}$parche$::jsonb;
  bk jsonb; actual jsonb; n int; n_lote int; n_ctx int; n_lote2 int; n_ctx2 int;
BEGIN
  IF to_regclass('public.biblioteca_vectores_c2_lp_art28_backup') IS NULL THEN RAISE EXCEPTION 'C2: falta el respaldo; ejecute 01 primero'; END IF;
  SELECT r.metadata INTO bk FROM public.biblioteca_vectores_c2_lp_art28_backup r WHERE r.id = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28';
  IF bk IS NULL OR encode(sha256(convert_to(bk::text,'UTF8')),'hex') <> 'c1cb8cdc5bf4630593a8ac953f96c8c2888fc0eb2ca3446548bd9a5fe9918c22' THEN RAISE EXCEPTION 'C2: el respaldo no tiene la metadata auditada'; END IF;
  SELECT b.metadata INTO actual FROM public.biblioteca_vectores b WHERE b.id = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28' FOR UPDATE;
  IF actual = bk || parche THEN
    RAISE NOTICE 'C2: ya estaba aplicada; sin cambios';
  ELSIF encode(sha256(convert_to(actual::text,'UTF8')),'hex') = 'c1cb8cdc5bf4630593a8ac953f96c8c2888fc0eb2ca3446548bd9a5fe9918c22' THEN
    SELECT count(*), count(*) FILTER (WHERE metadata->>'rol' = 'CONTEXT') INTO n_lote, n_ctx FROM public.biblioteca_vectores WHERE ingest_batch = 'OLA12_LP_2007_01';
    UPDATE public.biblioteca_vectores SET metadata = bk || parche WHERE id = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28' AND metadata = actual;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'C2: se actualizaron % filas (esperada 1)', n; END IF;
    SELECT count(*), count(*) FILTER (WHERE metadata->>'rol' = 'CONTEXT') INTO n_lote2, n_ctx2 FROM public.biblioteca_vectores WHERE ingest_batch = 'OLA12_LP_2007_01';
    IF n_lote2 <> n_lote OR n_ctx2 <> n_ctx + 1 THEN RAISE EXCEPTION 'C2: lote % → % filas, CONTEXT % → % (esperado igual y +1)', n_lote, n_lote2, n_ctx, n_ctx2; END IF;
    RAISE NOTICE 'C2: aplicada (lote OLA12_LP_2007_01: % filas, CONTEXT % → %)', n_lote2, n_ctx, n_ctx2;
  ELSE
    RAISE EXCEPTION 'C2: la metadata actual no es la auditada ni la corregida (sha %); no se toca', encode(sha256(convert_to(actual::text,'UTF8')),'hex');
  END IF;
  -- Postcondición: solo cambió metadata, y es exactamente respaldo || parche, con la huella esperada.
  PERFORM 1 FROM public.biblioteca_vectores b JOIN public.biblioteca_vectores_c2_lp_art28_backup r USING (id)
   WHERE b.id = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28' AND b.metadata = r.metadata || parche AND (to_jsonb(b) - 'metadata') = (to_jsonb(r) - 'metadata')
     AND encode(sha256(convert_to(b.metadata::text,'UTF8')),'hex') = 'd804aedc682f22134fc0dc391893572e917ffa43178a7d37f1c07f7c1841d534' AND b.metadata->>'rol' = 'CONTEXT' AND b.es_norma_vigente AND NOT b.revision_pendiente;
  IF NOT FOUND THEN RAISE EXCEPTION 'C2: postcondición fallida'; END IF;
  RAISE NOTICE 'C2: postcondición OK (metadata sha d804aedc682f22134fc0dc391893572e917ffa43178a7d37f1c07f7c1841d534)';
END $c2$;
-- 02 · Reclasificación PRIMARY → CONTEXT vigente con constancia (idempotente).
DO $c2$ DECLARE
  parche jsonb := $parche${"rol":"CONTEXT","motivo_rol":"CONTEXT vigente: reformado por adición (numerales 2, 5, 7 y 8) por el art. 83 del D.182-2009, Ley de Garantías Mobiliarias, después de la edición de 2007; el texto de la reforma no está integrado (corrección C2, hasta la OLA 15)","constancias":[{"nota":null,"tipo":"ADICION","texto":"Reformado por adición en sus numerales 2), 5), 7) y 8) por el artículo 83 del Decreto No. 182-2009 (Ley de Garantías Mobiliarias), publicado en La Gaceta No. 32,125 del 28 de enero de 2010. La reforma es posterior a la edición de 2007 que se usa como fuente y su texto no está integrado: el texto que se muestra es el anterior a ella. CONTEXT vigente hasta integrar el texto cotejado junto con la OLA 15.","decretos":["182-2009"]}],"correcciones_clo":[{"id":"C2","fecha":"2026-11-27","pliego":"docs/corpus/fase2/2026-11-27-correccion-c2-lp-art28/DICTAMEN_CORRECCION_C2_LP_ART28.md","rol_anterior":"PRIMARY"}]}$parche$::jsonb;
  bk jsonb; actual jsonb; n int; n_lote int; n_ctx int; n_lote2 int; n_ctx2 int;
BEGIN
  IF to_regclass('public.biblioteca_vectores_c2_lp_art28_backup') IS NULL THEN RAISE EXCEPTION 'C2: falta el respaldo; ejecute 01 primero'; END IF;
  SELECT r.metadata INTO bk FROM public.biblioteca_vectores_c2_lp_art28_backup r WHERE r.id = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28';
  IF bk IS NULL OR encode(sha256(convert_to(bk::text,'UTF8')),'hex') <> 'c1cb8cdc5bf4630593a8ac953f96c8c2888fc0eb2ca3446548bd9a5fe9918c22' THEN RAISE EXCEPTION 'C2: el respaldo no tiene la metadata auditada'; END IF;
  SELECT b.metadata INTO actual FROM public.biblioteca_vectores b WHERE b.id = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28' FOR UPDATE;
  IF actual = bk || parche THEN
    RAISE NOTICE 'C2: ya estaba aplicada; sin cambios';
  ELSIF encode(sha256(convert_to(actual::text,'UTF8')),'hex') = 'c1cb8cdc5bf4630593a8ac953f96c8c2888fc0eb2ca3446548bd9a5fe9918c22' THEN
    SELECT count(*), count(*) FILTER (WHERE metadata->>'rol' = 'CONTEXT') INTO n_lote, n_ctx FROM public.biblioteca_vectores WHERE ingest_batch = 'OLA12_LP_2007_01';
    UPDATE public.biblioteca_vectores SET metadata = bk || parche WHERE id = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28' AND metadata = actual;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'C2: se actualizaron % filas (esperada 1)', n; END IF;
    SELECT count(*), count(*) FILTER (WHERE metadata->>'rol' = 'CONTEXT') INTO n_lote2, n_ctx2 FROM public.biblioteca_vectores WHERE ingest_batch = 'OLA12_LP_2007_01';
    IF n_lote2 <> n_lote OR n_ctx2 <> n_ctx + 1 THEN RAISE EXCEPTION 'C2: lote % → % filas, CONTEXT % → % (esperado igual y +1)', n_lote, n_lote2, n_ctx, n_ctx2; END IF;
    RAISE NOTICE 'C2: aplicada (lote OLA12_LP_2007_01: % filas, CONTEXT % → %)', n_lote2, n_ctx, n_ctx2;
  ELSE
    RAISE EXCEPTION 'C2: la metadata actual no es la auditada ni la corregida (sha %); no se toca', encode(sha256(convert_to(actual::text,'UTF8')),'hex');
  END IF;
  -- Postcondición: solo cambió metadata, y es exactamente respaldo || parche, con la huella esperada.
  PERFORM 1 FROM public.biblioteca_vectores b JOIN public.biblioteca_vectores_c2_lp_art28_backup r USING (id)
   WHERE b.id = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28' AND b.metadata = r.metadata || parche AND (to_jsonb(b) - 'metadata') = (to_jsonb(r) - 'metadata')
     AND encode(sha256(convert_to(b.metadata::text,'UTF8')),'hex') = 'd804aedc682f22134fc0dc391893572e917ffa43178a7d37f1c07f7c1841d534' AND b.metadata->>'rol' = 'CONTEXT' AND b.es_norma_vigente AND NOT b.revision_pendiente;
  IF NOT FOUND THEN RAISE EXCEPTION 'C2: postcondición fallida'; END IF;
  RAISE NOTICE 'C2: postcondición OK (metadata sha d804aedc682f22134fc0dc391893572e917ffa43178a7d37f1c07f7c1841d534)';
END $c2$;
-- 01 · Respaldo protegido de la fila auditada (idempotente).
DO $c2$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE id = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28';
  IF n <> 1 THEN RAISE EXCEPTION 'C2: se esperaba 1 fila OLA12_LP_2007_01:LEY_PROPIEDAD:28, hay %', n; END IF;
  PERFORM 1 FROM public.biblioteca_vectores b
   WHERE b.id = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28' AND b.ingest_batch = 'OLA12_LP_2007_01' AND b.es_norma_vigente AND NOT b.revision_pendiente
     AND b.hash_contenido = '321e9fe4b86adc6eb6fae55daac7d925b6f1aceb50aa0055bfffa1a6ec20e90b' AND encode(sha256(convert_to(b.contenido,'UTF8')),'hex') = '321e9fe4b86adc6eb6fae55daac7d925b6f1aceb50aa0055bfffa1a6ec20e90b' AND encode(sha256(convert_to((to_jsonb(b) - 'metadata' - 'embedding' - 'created_at' - 'ingested_at')::text,'UTF8')),'hex') = '01b860896efa720b2c8d76f2b9c76d7593cb40db0d4a65517e2040e7ffd71983';
  IF NOT FOUND THEN RAISE EXCEPTION 'C2: la fila no es la auditada (contenido, lote, vigencia o columnas distintas)'; END IF;
  IF to_regclass('public.biblioteca_vectores_c2_lp_art28_backup') IS NULL THEN
    -- Solo se respalda el estado auditado: nunca una metadata ya corregida ni otra distinta.
    PERFORM 1 FROM public.biblioteca_vectores b WHERE b.id = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28' AND encode(sha256(convert_to(b.metadata::text,'UTF8')),'hex') = 'c1cb8cdc5bf4630593a8ac953f96c8c2888fc0eb2ca3446548bd9a5fe9918c22';
    IF NOT FOUND THEN RAISE EXCEPTION 'C2: no hay respaldo y la metadata actual no es la auditada; no se respalda'; END IF;
    CREATE TABLE public.biblioteca_vectores_c2_lp_art28_backup AS SELECT * FROM public.biblioteca_vectores WHERE id = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28';
    RAISE NOTICE 'C2: respaldo creado (public.biblioteca_vectores_c2_lp_art28_backup)';
  ELSE
    RAISE NOTICE 'C2: el respaldo ya existía; se verifica';
  END IF;
END $c2$;
ALTER TABLE public.biblioteca_vectores_c2_lp_art28_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.biblioteca_vectores_c2_lp_art28_backup FROM PUBLIC, anon, authenticated;
DO $c2$ DECLARE n int; rol_bd text; priv text; BEGIN
  SELECT count(*) INTO n FROM public.biblioteca_vectores_c2_lp_art28_backup;
  IF n <> 1 THEN RAISE EXCEPTION 'C2: el respaldo tiene % filas (esperada 1)', n; END IF;
  PERFORM 1 FROM public.biblioteca_vectores_c2_lp_art28_backup r WHERE r.id = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28' AND encode(sha256(convert_to(r.metadata::text,'UTF8')),'hex') = 'c1cb8cdc5bf4630593a8ac953f96c8c2888fc0eb2ca3446548bd9a5fe9918c22'
     AND encode(sha256(convert_to(r.contenido,'UTF8')),'hex') = '321e9fe4b86adc6eb6fae55daac7d925b6f1aceb50aa0055bfffa1a6ec20e90b' AND encode(sha256(convert_to((to_jsonb(r) - 'metadata' - 'embedding' - 'created_at' - 'ingested_at')::text,'UTF8')),'hex') = '01b860896efa720b2c8d76f2b9c76d7593cb40db0d4a65517e2040e7ffd71983';
  IF NOT FOUND THEN RAISE EXCEPTION 'C2: el respaldo no contiene la fila auditada'; END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.biblioteca_vectores_c2_lp_art28_backup'::regclass) THEN RAISE EXCEPTION 'C2: el respaldo no tiene RLS'; END IF;
  FOREACH rol_bd IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    FOREACH priv IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
      IF has_table_privilege(rol_bd, 'public.biblioteca_vectores_c2_lp_art28_backup', priv) THEN RAISE EXCEPTION 'C2: % conserva % sobre el respaldo', rol_bd, priv; END IF;
    END LOOP;
  END LOOP;
  RAISE NOTICE 'C2: respaldo verificado (1 fila auditada, RLS activo, sin privilegios para anon/authenticated)';
END $c2$;
-- 99 · Reversión: devuelve la metadata del respaldo (idempotente).
DO $c2$ DECLARE
  parche jsonb := $parche${"rol":"CONTEXT","motivo_rol":"CONTEXT vigente: reformado por adición (numerales 2, 5, 7 y 8) por el art. 83 del D.182-2009, Ley de Garantías Mobiliarias, después de la edición de 2007; el texto de la reforma no está integrado (corrección C2, hasta la OLA 15)","constancias":[{"nota":null,"tipo":"ADICION","texto":"Reformado por adición en sus numerales 2), 5), 7) y 8) por el artículo 83 del Decreto No. 182-2009 (Ley de Garantías Mobiliarias), publicado en La Gaceta No. 32,125 del 28 de enero de 2010. La reforma es posterior a la edición de 2007 que se usa como fuente y su texto no está integrado: el texto que se muestra es el anterior a ella. CONTEXT vigente hasta integrar el texto cotejado junto con la OLA 15.","decretos":["182-2009"]}],"correcciones_clo":[{"id":"C2","fecha":"2026-11-27","pliego":"docs/corpus/fase2/2026-11-27-correccion-c2-lp-art28/DICTAMEN_CORRECCION_C2_LP_ART28.md","rol_anterior":"PRIMARY"}]}$parche$::jsonb;
  bk jsonb; actual jsonb; n int;
BEGIN
  IF to_regclass('public.biblioteca_vectores_c2_lp_art28_backup') IS NULL THEN RAISE EXCEPTION 'C2: falta el respaldo; no hay nada que revertir con seguridad'; END IF;
  SELECT r.metadata INTO bk FROM public.biblioteca_vectores_c2_lp_art28_backup r WHERE r.id = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28';
  IF bk IS NULL OR encode(sha256(convert_to(bk::text,'UTF8')),'hex') <> 'c1cb8cdc5bf4630593a8ac953f96c8c2888fc0eb2ca3446548bd9a5fe9918c22' THEN RAISE EXCEPTION 'C2: el respaldo no tiene la metadata auditada'; END IF;
  SELECT b.metadata INTO actual FROM public.biblioteca_vectores b WHERE b.id = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28' FOR UPDATE;
  IF actual = bk THEN
    RAISE NOTICE 'C2: ya estaba en el estado auditado; sin cambios';
  ELSIF actual = bk || parche AND encode(sha256(convert_to(actual::text,'UTF8')),'hex') = 'd804aedc682f22134fc0dc391893572e917ffa43178a7d37f1c07f7c1841d534' THEN
    UPDATE public.biblioteca_vectores SET metadata = bk WHERE id = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28' AND metadata = actual;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'C2: se revirtieron % filas (esperada 1)', n; END IF;
    RAISE NOTICE 'C2: revertida';
  ELSE
    RAISE EXCEPTION 'C2: la metadata actual no es la corregida por C2 ni la auditada; no se toca';
  END IF;
  PERFORM 1 FROM public.biblioteca_vectores b JOIN public.biblioteca_vectores_c2_lp_art28_backup r USING (id)
   WHERE b.id = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28' AND to_jsonb(b) = to_jsonb(r) AND encode(sha256(convert_to(b.metadata::text,'UTF8')),'hex') = 'c1cb8cdc5bf4630593a8ac953f96c8c2888fc0eb2ca3446548bd9a5fe9918c22';
  IF NOT FOUND THEN RAISE EXCEPTION 'C2: la fila no quedó idéntica al respaldo'; END IF;
END $c2$;
-- 99 · Reversión: devuelve la metadata del respaldo (idempotente).
DO $c2$ DECLARE
  parche jsonb := $parche${"rol":"CONTEXT","motivo_rol":"CONTEXT vigente: reformado por adición (numerales 2, 5, 7 y 8) por el art. 83 del D.182-2009, Ley de Garantías Mobiliarias, después de la edición de 2007; el texto de la reforma no está integrado (corrección C2, hasta la OLA 15)","constancias":[{"nota":null,"tipo":"ADICION","texto":"Reformado por adición en sus numerales 2), 5), 7) y 8) por el artículo 83 del Decreto No. 182-2009 (Ley de Garantías Mobiliarias), publicado en La Gaceta No. 32,125 del 28 de enero de 2010. La reforma es posterior a la edición de 2007 que se usa como fuente y su texto no está integrado: el texto que se muestra es el anterior a ella. CONTEXT vigente hasta integrar el texto cotejado junto con la OLA 15.","decretos":["182-2009"]}],"correcciones_clo":[{"id":"C2","fecha":"2026-11-27","pliego":"docs/corpus/fase2/2026-11-27-correccion-c2-lp-art28/DICTAMEN_CORRECCION_C2_LP_ART28.md","rol_anterior":"PRIMARY"}]}$parche$::jsonb;
  bk jsonb; actual jsonb; n int;
BEGIN
  IF to_regclass('public.biblioteca_vectores_c2_lp_art28_backup') IS NULL THEN RAISE EXCEPTION 'C2: falta el respaldo; no hay nada que revertir con seguridad'; END IF;
  SELECT r.metadata INTO bk FROM public.biblioteca_vectores_c2_lp_art28_backup r WHERE r.id = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28';
  IF bk IS NULL OR encode(sha256(convert_to(bk::text,'UTF8')),'hex') <> 'c1cb8cdc5bf4630593a8ac953f96c8c2888fc0eb2ca3446548bd9a5fe9918c22' THEN RAISE EXCEPTION 'C2: el respaldo no tiene la metadata auditada'; END IF;
  SELECT b.metadata INTO actual FROM public.biblioteca_vectores b WHERE b.id = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28' FOR UPDATE;
  IF actual = bk THEN
    RAISE NOTICE 'C2: ya estaba en el estado auditado; sin cambios';
  ELSIF actual = bk || parche AND encode(sha256(convert_to(actual::text,'UTF8')),'hex') = 'd804aedc682f22134fc0dc391893572e917ffa43178a7d37f1c07f7c1841d534' THEN
    UPDATE public.biblioteca_vectores SET metadata = bk WHERE id = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28' AND metadata = actual;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'C2: se revirtieron % filas (esperada 1)', n; END IF;
    RAISE NOTICE 'C2: revertida';
  ELSE
    RAISE EXCEPTION 'C2: la metadata actual no es la corregida por C2 ni la auditada; no se toca';
  END IF;
  PERFORM 1 FROM public.biblioteca_vectores b JOIN public.biblioteca_vectores_c2_lp_art28_backup r USING (id)
   WHERE b.id = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28' AND to_jsonb(b) = to_jsonb(r) AND encode(sha256(convert_to(b.metadata::text,'UTF8')),'hex') = 'c1cb8cdc5bf4630593a8ac953f96c8c2888fc0eb2ca3446548bd9a5fe9918c22';
  IF NOT FOUND THEN RAISE EXCEPTION 'C2: la fila no quedó idéntica al respaldo'; END IF;
END $c2$;
DO $c2$ BEGIN
  PERFORM 1 FROM public.biblioteca_vectores b WHERE b.id = 'OLA12_LP_2007_01:LEY_PROPIEDAD:28' AND encode(sha256(convert_to(b.metadata::text,'UTF8')),'hex') = 'c1cb8cdc5bf4630593a8ac953f96c8c2888fc0eb2ca3446548bd9a5fe9918c22';
  IF NOT FOUND THEN RAISE EXCEPTION 'C2 ensayo: la fila no volvió al estado auditado'; END IF;
  RAISE NOTICE 'C2 ensayo: COMPLETO (01, 02, idempotencia y 99 verificados); se revierte todo con ROLLBACK';
END $c2$;
ROLLBACK;
