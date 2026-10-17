-- Rollback de 20261016000000_norma_version.sql (sólo staging).
-- No se elimina la extensión btree_gist: otras tablas pueden depender de ella.
BEGIN;
DROP TABLE IF EXISTS public.norma_version;
COMMIT;
