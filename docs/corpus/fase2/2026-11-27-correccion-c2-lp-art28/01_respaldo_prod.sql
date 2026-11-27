-- Corrección C2 · paso 01 · respaldo protegido
-- DESTINO EXCLUSIVO: mayalex-ia-pinel-hn (producción) (thgrhueckkjdutjvcufp). Solo tras la firma «C2 FIRMADA» del CLO en el dictamen.
-- Fila: OLA12_LP_2007_01:LEY_PROPIEDAD:28 (Ley de Propiedad, art. 28). Solo cambia `metadata`: rol CONTEXT, motivo y constancia del art. 83 del D.182-2009.
-- Generado por scripts/olas/correccion-c2-lp-art28.ts; no editar a mano (la huella está en manifiesto.json y en el dictamen).

BEGIN;
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
COMMIT;
