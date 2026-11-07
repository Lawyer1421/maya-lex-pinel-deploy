-- Rollback de 20261107000000_biblioteca_vectores_extension.sql (solo staging).
-- Solo elimina lo añadido por esa migración; no toca datos existentes.
BEGIN;
DROP INDEX IF EXISTS public.idx_biblio_ingest_batch;
DROP INDEX IF EXISTS public.idx_biblio_instrumento_articulo;
ALTER TABLE public.biblioteca_vectores
  DROP COLUMN IF EXISTS ingested_at,
  DROP COLUMN IF EXISTS ingest_batch,
  DROP COLUMN IF EXISTS hash_contenido,
  DROP COLUMN IF EXISTS num_articulo_norm,
  DROP COLUMN IF EXISTS instrumento_id;
COMMIT;
