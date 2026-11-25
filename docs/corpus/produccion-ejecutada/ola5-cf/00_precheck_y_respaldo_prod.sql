-- OLA5 · HN:CODIGO_FAMILIA · lote OLA5_CF_2023_01 · 2026-11-24
-- DESTINO EXCLUSIVO: mayalex-ia-pinel-hn (producción) (thgrhueckkjdutjvcufp). El ejecutor verifica el project ref y la huella SHA-256 de este archivo antes de correrlo.
-- Snapshot de las filas actuales del instrumento y precheck. Falla si el respaldo ya existe, si el lote ya está en V5 o si las filas legacy no son las esperadas.

BEGIN;
DO $do$ BEGIN IF to_regclass('public.biblioteca_vectores_ola5_cf_2023_01_backup') IS NOT NULL THEN RAISE EXCEPTION 'El respaldo biblioteca_vectores_ola5_cf_2023_01_backup ya existe: revisar antes de reintentar'; END IF; END $do$;
CREATE TABLE public.biblioteca_vectores_ola5_cf_2023_01_backup AS SELECT b.* FROM public.biblioteca_vectores b WHERE b.ingest_batch = 'OLA5_CF_2023_01' OR b.instrumento_id = 'CODIGO_FAMILIA' OR b.metadata->>'norm_id' = 'HN:CODIGO_FAMILIA' OR (b.metadata->>'norm_id' = 'HN_CODIGO_FAMILIA' AND b.id LIKE 'v2familia:mayalex_normativos:%');
DO $do$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'OLA5_CF_2023_01' AND metadata->>'estado_v' = 'V5';
  IF n > 0 THEN RAISE EXCEPTION 'El lote ya tiene % filas V5: la ola ya fue promovida', n; END IF;
  SELECT count(*) INTO n FROM public.biblioteca_vectores b WHERE b.metadata->>'norm_id' = 'HN_CODIGO_FAMILIA' AND b.id LIKE 'v2familia:mayalex_normativos:%';
  IF n <> 373 THEN RAISE EXCEPTION 'Filas legacy a sustituir: % (esperadas 373); no continuar sin revisar', n; END IF;
END $do$;
COMMIT;
SELECT count(*) AS filas_respaldadas FROM public.biblioteca_vectores_ola5_cf_2023_01_backup;
