-- Corrección C2 · paso 02 · reclasificación
-- DESTINO EXCLUSIVO: mayalex-ia-pinel-hn (producción) (thgrhueckkjdutjvcufp). Solo tras la firma «C2 FIRMADA» del CLO en el dictamen.
-- Fila: OLA12_LP_2007_01:LEY_PROPIEDAD:28 (Ley de Propiedad, art. 28). Solo cambia `metadata`: rol CONTEXT, motivo y constancia del art. 83 del D.182-2009.
-- Generado por scripts/olas/correccion-c2-lp-art28.ts; no editar a mano (la huella está en manifiesto.json y en el dictamen).

BEGIN;
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
COMMIT;
