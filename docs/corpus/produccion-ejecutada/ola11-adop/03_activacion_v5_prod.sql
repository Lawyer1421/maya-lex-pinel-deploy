-- OLA11 · HN:LEY_ADOPCIONES · lote OLA11_ADOP_2019_01 · 2026-11-24
-- DESTINO EXCLUSIVO: mayalex-ia-pinel-hn (producción) (thgrhueckkjdutjvcufp). El ejecutor verifica el project ref y la huella SHA-256 de este archivo antes de correrlo.
-- Activa V5 atómicamente (64 filas: 64 PRIMARY, 0 CONTEXT) y oculta las 64 filas legacy sustituidas (legacy Ley Especial de Adopciones (D.102-2018), ids mayalex_normativos:adopciones_2018_a*).

BEGIN;
DO $do$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'OLA11_ADOP_2019_01' AND metadata->>'norm_id' = 'HN:LEY_ADOPCIONES'
    AND instrumento_id = 'LEY_ADOPCIONES' AND jurisdiccion = 'HN' AND encode(sha256(convert_to(contenido, 'UTF8')), 'hex') = hash_contenido AND revision_pendiente = true AND es_norma_vigente IS NULL AND embedding IS NOT NULL AND embedding <> array_fill(0::real, ARRAY[384])::vector;
  IF n <> 64 THEN RAISE EXCEPTION 'precondición V5: % filas (esperadas 64)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'OLA11_ADOP_2019_01';
  IF n <> 64 THEN RAISE EXCEPTION 'filas extra en el lote: % (esperadas 64)', n; END IF;
  UPDATE public.biblioteca_vectores SET revision_pendiente = false, es_norma_vigente = true,
    metadata = (metadata - 'rol' - 'clasificacion_propuesta') || jsonb_build_object('estado_v', 'V5', 'vigencia', 'TRUE_PRESUNTA', 'revision_pendiente', false, 'motivo_rol', 'PRIMARY elegible: edición consolidada CEDIJ con reformas integradas; cotejo íntegro con La Gaceta pendiente (D1)', 'adjudicacion', 'EXPEDIENTE_AUDITORIA_ADOP_OLA11.md (D1–D8)', 'promocion_fecha', '2026-11-24', 'promocion_ola', 'OLA11')
  WHERE ingest_batch = 'OLA11_ADOP_2019_01' AND id IN ('OLA11_ADOP_2019_01:LEY_ADOPCIONES:1', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:2', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:3', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:4', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:5', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:6', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:7', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:8', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:9', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:10', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:11', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:12', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:13', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:14', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:15', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:16', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:17', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:18', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:19', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:20', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:21', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:22', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:23', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:24', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:25', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:26', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:27', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:28', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:29', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:30', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:31', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:32', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:33', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:34', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:35', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:36', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:37', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:38', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:39', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:40', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:41', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:42', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:43', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:44', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:45', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:46', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:47', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:48', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:49', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:50', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:51', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:52', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:53', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:54', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:55', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:56', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:57', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:58', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:59', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:60', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:61', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:62', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:63', 'OLA11_ADOP_2019_01:LEY_ADOPCIONES:64');
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'OLA11_ADOP_2019_01' AND revision_pendiente = false AND metadata->>'estado_v' = 'V5';
  IF n <> 64 THEN RAISE EXCEPTION 'postcondición visibles V5 = % (esperado 64)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'OLA11_ADOP_2019_01' AND es_norma_vigente = true AND NOT (metadata ? 'rol');
  IF n <> 64 THEN RAISE EXCEPTION 'postcondición PRIMARY vigentes = % (esperado 64)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'OLA11_ADOP_2019_01' AND es_norma_vigente = true AND metadata->>'rol' = 'CONTEXT';
  IF n <> 0 THEN RAISE EXCEPTION 'postcondición CONTEXT vigentes = % (esperado 0)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'OLA11_ADOP_2019_01' AND es_norma_vigente = false AND metadata->>'rol' = 'CONTEXT';
  IF n <> 0 THEN RAISE EXCEPTION 'postcondición CONTEXT derogados = % (esperado 0)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'OLA11_ADOP_2019_01' AND es_norma_vigente IS NULL AND metadata->>'rol' = 'CONTEXT';
  IF n <> 0 THEN RAISE EXCEPTION 'postcondición CONTEXT pendientes = % (esperado 0)', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'OLA11_ADOP_2019_01' AND es_norma_vigente = false AND NOT (metadata ? 'rol');
  IF n <> 0 THEN RAISE EXCEPTION 'postcondición derogados PRIMARY (prohibido) = % (esperado 0)', n; END IF;
  UPDATE public.biblioteca_vectores b SET revision_pendiente = true,
    metadata = b.metadata || jsonb_build_object('sustituido_por_lote', 'OLA11_ADOP_2019_01', 'sustituido_fecha', '2026-11-24', 'revision_pendiente_motivo', 'Sustituida por HN:LEY_ADOPCIONES V5 (OLA11); oculta, no borrada')
  WHERE b.id LIKE 'mayalex_normativos:adopciones_2018_a%' AND b.revision_pendiente = false;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 64 THEN RAISE EXCEPTION 'legacy ocultadas: % (esperadas 64)', n; END IF;
END $do$;
COMMIT;
SELECT count(*) AS filas, count(*) FILTER (WHERE revision_pendiente = false) AS visibles, metadata->>'estado_v' AS estado_v,
  count(*) FILTER (WHERE es_norma_vigente = true AND NOT (metadata ? 'rol')) AS primary_vigentes,
  count(*) FILTER (WHERE metadata->>'rol' = 'CONTEXT') AS context,
  count(*) FILTER (WHERE es_norma_vigente = false) AS derogados,
  count(*) FILTER (WHERE embedding IS NOT NULL) AS con_embedding,
  count(*) FILTER (WHERE encode(sha256(convert_to(contenido, 'UTF8')), 'hex') = hash_contenido) AS sha_ok
FROM public.biblioteca_vectores WHERE ingest_batch = 'OLA11_ADOP_2019_01' GROUP BY metadata->>'estado_v';
