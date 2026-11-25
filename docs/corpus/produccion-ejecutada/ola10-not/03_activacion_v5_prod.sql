-- OLA10 · HN:LEY_NOTARIADO · lote OLA10_NOT_2006_01 · 2026-11-24
-- DESTINO EXCLUSIVO: mayalex-ia-pinel-hn (producción) (thgrhueckkjdutjvcufp). El ejecutor verifica el project ref y la huella SHA-256 de este archivo antes de correrlo.
-- Activa V5 atómicamente (94 filas: 90 PRIMARY, 4 CONTEXT) y oculta las 94 filas legacy sustituidas (legacy Código del Notariado (D.353-2005), ids mayalex_normativos:codigo_notariado_2005_a*).

BEGIN;
DO $do$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'OLA10_NOT_2006_01' AND metadata->>'norm_id' = 'HN:LEY_NOTARIADO'
    AND instrumento_id = 'LEY_NOTARIADO' AND jurisdiccion = 'HN' AND encode(sha256(convert_to(contenido, 'UTF8')), 'hex') = hash_contenido AND revision_pendiente = true AND es_norma_vigente IS NULL AND embedding IS NOT NULL AND embedding <> array_fill(0::real, ARRAY[384])::vector;
  IF n <> 94 THEN RAISE EXCEPTION 'precondición V5: % filas (esperadas 94)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'OLA10_NOT_2006_01';
  IF n <> 94 THEN RAISE EXCEPTION 'filas extra en el lote: % (esperadas 94)', n; END IF;
  UPDATE public.biblioteca_vectores SET revision_pendiente = false, es_norma_vigente = true,
    metadata = (metadata - 'rol' - 'clasificacion_propuesta') || jsonb_build_object('estado_v', 'V5', 'vigencia', 'TRUE_PRESUNTA', 'revision_pendiente', false, 'motivo_rol', 'PRIMARY elegible: edición consolidada CEDIJ con reformas integradas; cotejo íntegro con La Gaceta pendiente (D1)', 'adjudicacion', 'EXPEDIENTE_AUDITORIA_NOT_OLA10.md (D1–D8)', 'promocion_fecha', '2026-11-24', 'promocion_ola', 'OLA10')
  WHERE ingest_batch = 'OLA10_NOT_2006_01' AND id IN ('OLA10_NOT_2006_01:LEY_NOTARIADO:1', 'OLA10_NOT_2006_01:LEY_NOTARIADO:2', 'OLA10_NOT_2006_01:LEY_NOTARIADO:3', 'OLA10_NOT_2006_01:LEY_NOTARIADO:4', 'OLA10_NOT_2006_01:LEY_NOTARIADO:5', 'OLA10_NOT_2006_01:LEY_NOTARIADO:6', 'OLA10_NOT_2006_01:LEY_NOTARIADO:7', 'OLA10_NOT_2006_01:LEY_NOTARIADO:8', 'OLA10_NOT_2006_01:LEY_NOTARIADO:9', 'OLA10_NOT_2006_01:LEY_NOTARIADO:10', 'OLA10_NOT_2006_01:LEY_NOTARIADO:13', 'OLA10_NOT_2006_01:LEY_NOTARIADO:14', 'OLA10_NOT_2006_01:LEY_NOTARIADO:15', 'OLA10_NOT_2006_01:LEY_NOTARIADO:16', 'OLA10_NOT_2006_01:LEY_NOTARIADO:17', 'OLA10_NOT_2006_01:LEY_NOTARIADO:18', 'OLA10_NOT_2006_01:LEY_NOTARIADO:19', 'OLA10_NOT_2006_01:LEY_NOTARIADO:20', 'OLA10_NOT_2006_01:LEY_NOTARIADO:21', 'OLA10_NOT_2006_01:LEY_NOTARIADO:22', 'OLA10_NOT_2006_01:LEY_NOTARIADO:23', 'OLA10_NOT_2006_01:LEY_NOTARIADO:24', 'OLA10_NOT_2006_01:LEY_NOTARIADO:25', 'OLA10_NOT_2006_01:LEY_NOTARIADO:26', 'OLA10_NOT_2006_01:LEY_NOTARIADO:28', 'OLA10_NOT_2006_01:LEY_NOTARIADO:29', 'OLA10_NOT_2006_01:LEY_NOTARIADO:30', 'OLA10_NOT_2006_01:LEY_NOTARIADO:31', 'OLA10_NOT_2006_01:LEY_NOTARIADO:32', 'OLA10_NOT_2006_01:LEY_NOTARIADO:33', 'OLA10_NOT_2006_01:LEY_NOTARIADO:34', 'OLA10_NOT_2006_01:LEY_NOTARIADO:35', 'OLA10_NOT_2006_01:LEY_NOTARIADO:36', 'OLA10_NOT_2006_01:LEY_NOTARIADO:37', 'OLA10_NOT_2006_01:LEY_NOTARIADO:38', 'OLA10_NOT_2006_01:LEY_NOTARIADO:39', 'OLA10_NOT_2006_01:LEY_NOTARIADO:40', 'OLA10_NOT_2006_01:LEY_NOTARIADO:41', 'OLA10_NOT_2006_01:LEY_NOTARIADO:42', 'OLA10_NOT_2006_01:LEY_NOTARIADO:43', 'OLA10_NOT_2006_01:LEY_NOTARIADO:44', 'OLA10_NOT_2006_01:LEY_NOTARIADO:45', 'OLA10_NOT_2006_01:LEY_NOTARIADO:46', 'OLA10_NOT_2006_01:LEY_NOTARIADO:47', 'OLA10_NOT_2006_01:LEY_NOTARIADO:48', 'OLA10_NOT_2006_01:LEY_NOTARIADO:49', 'OLA10_NOT_2006_01:LEY_NOTARIADO:50', 'OLA10_NOT_2006_01:LEY_NOTARIADO:51', 'OLA10_NOT_2006_01:LEY_NOTARIADO:52', 'OLA10_NOT_2006_01:LEY_NOTARIADO:53', 'OLA10_NOT_2006_01:LEY_NOTARIADO:54', 'OLA10_NOT_2006_01:LEY_NOTARIADO:55', 'OLA10_NOT_2006_01:LEY_NOTARIADO:56', 'OLA10_NOT_2006_01:LEY_NOTARIADO:57', 'OLA10_NOT_2006_01:LEY_NOTARIADO:58', 'OLA10_NOT_2006_01:LEY_NOTARIADO:59', 'OLA10_NOT_2006_01:LEY_NOTARIADO:60', 'OLA10_NOT_2006_01:LEY_NOTARIADO:61', 'OLA10_NOT_2006_01:LEY_NOTARIADO:62', 'OLA10_NOT_2006_01:LEY_NOTARIADO:63', 'OLA10_NOT_2006_01:LEY_NOTARIADO:64', 'OLA10_NOT_2006_01:LEY_NOTARIADO:65', 'OLA10_NOT_2006_01:LEY_NOTARIADO:66', 'OLA10_NOT_2006_01:LEY_NOTARIADO:67', 'OLA10_NOT_2006_01:LEY_NOTARIADO:68', 'OLA10_NOT_2006_01:LEY_NOTARIADO:69', 'OLA10_NOT_2006_01:LEY_NOTARIADO:70', 'OLA10_NOT_2006_01:LEY_NOTARIADO:71', 'OLA10_NOT_2006_01:LEY_NOTARIADO:74', 'OLA10_NOT_2006_01:LEY_NOTARIADO:75', 'OLA10_NOT_2006_01:LEY_NOTARIADO:77', 'OLA10_NOT_2006_01:LEY_NOTARIADO:78', 'OLA10_NOT_2006_01:LEY_NOTARIADO:79', 'OLA10_NOT_2006_01:LEY_NOTARIADO:80', 'OLA10_NOT_2006_01:LEY_NOTARIADO:81', 'OLA10_NOT_2006_01:LEY_NOTARIADO:82', 'OLA10_NOT_2006_01:LEY_NOTARIADO:83', 'OLA10_NOT_2006_01:LEY_NOTARIADO:85', 'OLA10_NOT_2006_01:LEY_NOTARIADO:86', 'OLA10_NOT_2006_01:LEY_NOTARIADO:88', 'OLA10_NOT_2006_01:LEY_NOTARIADO:89', 'OLA10_NOT_2006_01:LEY_NOTARIADO:90', 'OLA10_NOT_2006_01:LEY_NOTARIADO:91', 'OLA10_NOT_2006_01:LEY_NOTARIADO:92', 'OLA10_NOT_2006_01:LEY_NOTARIADO:93', 'OLA10_NOT_2006_01:LEY_NOTARIADO:94');
  UPDATE public.biblioteca_vectores SET revision_pendiente = false, es_norma_vigente = true,
    metadata = (metadata - 'rol' - 'clasificacion_propuesta') || jsonb_build_object('estado_v', 'V5', 'vigencia', 'TRUE_PRESUNTA', 'revision_pendiente', false, 'motivo_rol', 'PRIMARY elegible (reforma integrada): edición consolidada CEDIJ con reformas integradas; cotejo íntegro con La Gaceta pendiente (D1)', 'adjudicacion', 'EXPEDIENTE_AUDITORIA_NOT_OLA10.md (D1–D8)', 'promocion_fecha', '2026-11-24', 'promocion_ola', 'OLA10')
  WHERE ingest_batch = 'OLA10_NOT_2006_01' AND id IN ('OLA10_NOT_2006_01:LEY_NOTARIADO:11', 'OLA10_NOT_2006_01:LEY_NOTARIADO:27');
  UPDATE public.biblioteca_vectores SET revision_pendiente = false, es_norma_vigente = true,
    metadata = (metadata - 'rol' - 'clasificacion_propuesta') || jsonb_build_object('estado_v', 'V5', 'vigencia', 'TRUE_PRESUNTA', 'revision_pendiente', false, 'motivo_rol', 'PRIMARY elegible (derogación parcial anotada): edición consolidada CEDIJ con reformas integradas; cotejo íntegro con La Gaceta pendiente (D1)', 'adjudicacion', 'EXPEDIENTE_AUDITORIA_NOT_OLA10.md (D1–D8)', 'promocion_fecha', '2026-11-24', 'promocion_ola', 'OLA10')
  WHERE ingest_batch = 'OLA10_NOT_2006_01' AND id IN ('OLA10_NOT_2006_01:LEY_NOTARIADO:12', 'OLA10_NOT_2006_01:LEY_NOTARIADO:76');
  UPDATE public.biblioteca_vectores SET revision_pendiente = false, es_norma_vigente = false,
    metadata = (metadata - 'rol' - 'clasificacion_propuesta') || jsonb_build_object('estado_v', 'V5', 'vigencia', 'DEROGADO', 'revision_pendiente', false, 'motivo_rol', 'DEROGADO según la edición CEDIJ; cotejo con La Gaceta pendiente (D1)', 'adjudicacion', 'EXPEDIENTE_AUDITORIA_NOT_OLA10.md (D1–D8)', 'rol', 'CONTEXT', 'promocion_fecha', '2026-11-24', 'promocion_ola', 'OLA10')
  WHERE ingest_batch = 'OLA10_NOT_2006_01' AND id IN ('OLA10_NOT_2006_01:LEY_NOTARIADO:72', 'OLA10_NOT_2006_01:LEY_NOTARIADO:73');
  UPDATE public.biblioteca_vectores SET revision_pendiente = false, es_norma_vigente = false,
    metadata = (metadata - 'rol' - 'clasificacion_propuesta') || jsonb_build_object('estado_v', 'V5', 'vigencia', 'DEROGADO', 'revision_pendiente', false, 'motivo_rol', 'DEROGADO por D.77-2006 según la edición CEDIJ; cotejo con La Gaceta pendiente (D1)', 'adjudicacion', 'EXPEDIENTE_AUDITORIA_NOT_OLA10.md (D1–D8)', 'rol', 'CONTEXT', 'promocion_fecha', '2026-11-24', 'promocion_ola', 'OLA10')
  WHERE ingest_batch = 'OLA10_NOT_2006_01' AND id IN ('OLA10_NOT_2006_01:LEY_NOTARIADO:84', 'OLA10_NOT_2006_01:LEY_NOTARIADO:87');
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'OLA10_NOT_2006_01' AND revision_pendiente = false AND metadata->>'estado_v' = 'V5';
  IF n <> 94 THEN RAISE EXCEPTION 'postcondición visibles V5 = % (esperado 94)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'OLA10_NOT_2006_01' AND es_norma_vigente = true AND NOT (metadata ? 'rol');
  IF n <> 90 THEN RAISE EXCEPTION 'postcondición PRIMARY vigentes = % (esperado 90)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'OLA10_NOT_2006_01' AND es_norma_vigente = true AND metadata->>'rol' = 'CONTEXT';
  IF n <> 0 THEN RAISE EXCEPTION 'postcondición CONTEXT vigentes = % (esperado 0)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'OLA10_NOT_2006_01' AND es_norma_vigente = false AND metadata->>'rol' = 'CONTEXT';
  IF n <> 4 THEN RAISE EXCEPTION 'postcondición CONTEXT derogados = % (esperado 4)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'OLA10_NOT_2006_01' AND es_norma_vigente IS NULL AND metadata->>'rol' = 'CONTEXT';
  IF n <> 0 THEN RAISE EXCEPTION 'postcondición CONTEXT pendientes = % (esperado 0)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'OLA10_NOT_2006_01' AND es_norma_vigente = false AND NOT (metadata ? 'rol');
  IF n <> 0 THEN RAISE EXCEPTION 'postcondición derogados PRIMARY (prohibido) = % (esperado 0)', n; END IF;
  UPDATE public.biblioteca_vectores b SET revision_pendiente = true,
    metadata = b.metadata || jsonb_build_object('sustituido_por_lote', 'OLA10_NOT_2006_01', 'sustituido_fecha', '2026-11-24', 'revision_pendiente_motivo', 'Sustituida por HN:LEY_NOTARIADO V5 (OLA10); oculta, no borrada')
  WHERE b.id LIKE 'mayalex_normativos:codigo_notariado_2005_a%' AND b.revision_pendiente = false;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 94 THEN RAISE EXCEPTION 'legacy ocultadas: % (esperadas 94)', n; END IF;
END $do$;
COMMIT;
SELECT count(*) AS filas, count(*) FILTER (WHERE revision_pendiente = false) AS visibles, metadata->>'estado_v' AS estado_v,
  count(*) FILTER (WHERE es_norma_vigente = true AND NOT (metadata ? 'rol')) AS primary_vigentes,
  count(*) FILTER (WHERE metadata->>'rol' = 'CONTEXT') AS context,
  count(*) FILTER (WHERE es_norma_vigente = false) AS derogados,
  count(*) FILTER (WHERE embedding IS NOT NULL) AS con_embedding,
  count(*) FILTER (WHERE encode(sha256(convert_to(contenido, 'UTF8')), 'hex') = hash_contenido) AS sha_ok
FROM public.biblioteca_vectores WHERE ingest_batch = 'OLA10_NOT_2006_01' GROUP BY metadata->>'estado_v';
