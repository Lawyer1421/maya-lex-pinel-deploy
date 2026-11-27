-- OLA13 · HN:REGLAMENTO_LEY_MUNICIPALIDADES · lote OLA13_RLMUN_1993_01 · 2026-11-26
-- DESTINO EXCLUSIVO: mayalex-ia-pinel-hn (producción) (thgrhueckkjdutjvcufp). El ejecutor verifica el project ref y la huella SHA-256 de este archivo antes de correrlo.
-- Snapshot de las filas actuales del instrumento y precheck. Falla si el respaldo ya existe, si el lote ya está en V5 o si las filas legacy no son las esperadas.

BEGIN;
DO $do$ BEGIN IF to_regclass('public.biblioteca_vectores_ola13_rlmun_1993_01_backup') IS NOT NULL THEN RAISE EXCEPTION 'El respaldo biblioteca_vectores_ola13_rlmun_1993_01_backup ya existe: revisar antes de reintentar'; END IF; END $do$;
CREATE TABLE public.biblioteca_vectores_ola13_rlmun_1993_01_backup AS SELECT b.* FROM public.biblioteca_vectores b WHERE b.ingest_batch = 'OLA13_RLMUN_1993_01' OR b.instrumento_id = 'REGLAMENTO_LEY_MUNICIPALIDADES' OR b.metadata->>'norm_id' = 'HN:REGLAMENTO_LEY_MUNICIPALIDADES';
ALTER TABLE public.biblioteca_vectores_ola13_rlmun_1993_01_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.biblioteca_vectores_ola13_rlmun_1993_01_backup FROM anon, authenticated;
DO $do$ DECLARE n int; BEGIN
  SELECT count(*) INTO n FROM public.biblioteca_vectores WHERE ingest_batch = 'OLA13_RLMUN_1993_01' AND metadata->>'estado_v' = 'V5';
  IF n > 0 THEN RAISE EXCEPTION 'El lote ya tiene % filas V5: la ola ya fue promovida', n; END IF;
END $do$;
COMMIT;
SELECT count(*) AS filas_respaldadas FROM public.biblioteca_vectores_ola13_rlmun_1993_01_backup;
