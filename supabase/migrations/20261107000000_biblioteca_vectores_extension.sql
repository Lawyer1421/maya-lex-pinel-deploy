-- ═══════════════════════════════════════════════════════════════════════════
-- 20261107000000_biblioteca_vectores_extension.sql
--
-- Extensión ADITIVA de public.biblioteca_vectores para la ingesta por artículo
-- exacto y la trazabilidad del puente FIRAC. NO crea tablas paralelas.
--
-- ALCANCE: SOLO STAGING (aicakncgtuiiuomflkqj). NO aplicar en producción sin
-- aprobación expresa del Titular. Rollback:
--   supabase/rollbacks/20261107000000_biblioteca_vectores_extension_rollback.sql
--
-- Compatibilidad con Luna / buscar_biblioteca_v2 (NO se modifica):
--   * Solo ADD COLUMN nullable sin default y CREATE INDEX IF NOT EXISTS.
--   * No cambia es_norma_vigente, revision_pendiente, coleccion ni materia.
--   * No siembra ni actualiza datos: las columnas nuevas quedan NULL hasta que
--     una ingesta revisada las llene.
--   * Las columnas NO declaran vigencia ni clasificación PRIMARY; eso sigue
--     saliendo de es_norma_vigente y del clasificador compartido (clo-guards).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.biblioteca_vectores
  ADD COLUMN IF NOT EXISTS instrumento_id    text,
  ADD COLUMN IF NOT EXISTS num_articulo_norm text,
  ADD COLUMN IF NOT EXISTS hash_contenido    text,
  ADD COLUMN IF NOT EXISTS ingest_batch      text,
  ADD COLUMN IF NOT EXISTS ingested_at       timestamptz;

COMMENT ON COLUMN public.biblioteca_vectores.instrumento_id IS
  'Id normalizado del instrumento (p. ej. CODIGO_NOTARIADO). Metadato de ubicación; no declara vigencia.';
COMMENT ON COLUMN public.biblioteca_vectores.num_articulo_norm IS
  'Número de artículo normalizado (p. ej. 29, 123-A) para resolución exacta. Metadato de ubicación; no declara vigencia.';
COMMENT ON COLUMN public.biblioteca_vectores.hash_contenido IS
  'SHA-256 del contenido al ingestar (integridad; lo recalcula lib/legal-retrieval/primitives.hashFragmento).';
COMMENT ON COLUMN public.biblioteca_vectores.ingest_batch IS
  'Identificador del lote de ingesta / paquete revisado de origen (trazabilidad).';
COMMENT ON COLUMN public.biblioteca_vectores.ingested_at IS
  'Marca de tiempo de la ingesta del lote.';

-- Resolución exacta por instrumento + artículo (parcial: solo filas ya ubicadas).
CREATE INDEX IF NOT EXISTS idx_biblio_instrumento_articulo
  ON public.biblioteca_vectores (instrumento_id, num_articulo_norm)
  WHERE instrumento_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_biblio_ingest_batch
  ON public.biblioteca_vectores (ingest_batch)
  WHERE ingest_batch IS NOT NULL;

-- NO se crea índice HNSW aquí. Probado en staging: con HNSW, buscar_biblioteca_v2
-- (filtro por coleccion/materia aplicado DESPUÉS del escaneo aproximado) devolvió
-- 0 filas donde antes devolvía 20 (cambio de comportamiento para Luna). Un índice
-- vectorial requiere diseño aparte (índices parciales por colección o iterative
-- scan) y aprobación del Titular.

COMMIT;
