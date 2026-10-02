-- MAYALEX CA-01 NOTARIADO FALSE ROWS
-- Read-Only Evidence Preparation
-- Target: Código del Notariado de Honduras (Decreto 353-2005)
-- Evidence: 7 rows where es_norma_vigente=false (of 94 total)
--
-- SAFETY: All SELECT-only. No INSERT/UPDATE/DELETE/ALTER/CREATE/DROP.
-- No contenido field selection. No legal status inference.
-- Manual execution in production SQL Editor required.

-- ============================================================
-- CA01.1: EXACT 7 FALSE ROWS WITH METADATA-SAFE FIELDS
-- ============================================================
-- Return only metadata-safe fields for the 7 rows where
-- es_norma_vigente=false in Código del Notariado.

SELECT
  id,
  fuente,
  coleccion,
  materia,
  fuente_tipo,
  num_articulo,
  es_norma_vigente,
  revision_pendiente,
  created_at,
  metadata
FROM public.biblioteca_vectores
WHERE fuente = 'Código del Notariado de Honduras (Decreto 353-2005)'
  AND es_norma_vigente = false
ORDER BY
  CASE WHEN num_articulo ~ '^\d+$' THEN (num_articulo::integer) ELSE 999999 END,
  num_articulo;

-- ============================================================
-- CA01.2: METADATA KEYS PRESENT IN THE 7 FALSE ROWS
-- ============================================================
-- Enumerate jsonb metadata keys and occurrence counts
-- for the 7 false rows only.

WITH false_rows AS (
  SELECT
    id,
    num_articulo,
    metadata
  FROM public.biblioteca_vectores
  WHERE fuente = 'Código del Notariado de Honduras (Decreto 353-2005)'
    AND es_norma_vigente = false
)
SELECT
  jsonb_object_keys(metadata) AS metadata_key,
  COUNT(*) AS occurrence_count,
  COUNT(DISTINCT id) AS distinct_rows
FROM false_rows
GROUP BY jsonb_object_keys(metadata)
ORDER BY occurrence_count DESC, metadata_key;

-- ============================================================
-- CA01.3: LEGAL-STATUS FIELDS FROM METADATA (7 FALSE ROWS)
-- ============================================================
-- Extract only legal-status relevant fields from metadata
-- if present. No inference of meaning.

WITH false_rows AS (
  SELECT
    id,
    num_articulo,
    es_norma_vigente,
    metadata
  FROM public.biblioteca_vectores
  WHERE fuente = 'Código del Notariado de Honduras (Decreto 353-2005)'
    AND es_norma_vigente = false
)
SELECT
  id,
  num_articulo,
  es_norma_vigente,
  metadata->>'decreto' AS decreto,
  metadata->>'reforma' AS reforma,
  metadata->>'reformado_por' AS reformado_por,
  metadata->>'derogado_por' AS derogado_por,
  metadata->>'vigencia' AS vigencia,
  metadata->>'estado' AS estado,
  metadata->>'nota' AS nota,
  metadata->>'fuente_oficial' AS fuente_oficial,
  metadata->>'url' AS url,
  metadata->>'archivo_src' AS archivo_src,
  metadata->>'fecha' AS fecha,
  metadata->>'fecha_detectada' AS fecha_detectada
FROM false_rows
ORDER BY
  CASE WHEN num_articulo ~ '^\d+$' THEN (num_articulo::integer) ELSE 999999 END,
  num_articulo;

-- ============================================================
-- CA01.4: DUPLICATE / VARIANT CHECK
-- ============================================================
-- For the 7 num_articulo values, determine whether another
-- row exists under the same fuente with same article number
-- but different vigencia status (variant detection).

WITH false_articles AS (
  SELECT DISTINCT num_articulo
  FROM public.biblioteca_vectores
  WHERE fuente = 'Código del Notariado de Honduras (Decreto 353-2005)'
    AND es_norma_vigente = false
)
SELECT
  num_articulo,
  SUM(CASE WHEN es_norma_vigente = false THEN 1 ELSE 0 END) AS false_rows,
  SUM(CASE WHEN es_norma_vigente = true THEN 1 ELSE 0 END) AS true_rows,
  SUM(CASE WHEN es_norma_vigente IS NULL THEN 1 ELSE 0 END) AS null_rows,
  COUNT(*) AS total_rows
FROM public.biblioteca_vectores
WHERE fuente = 'Código del Notariado de Honduras (Decreto 353-2005)'
  AND num_articulo IN (SELECT num_articulo FROM false_articles)
GROUP BY num_articulo
HAVING COUNT(*) > 1  -- Show only articles with multiple vigencia states
ORDER BY
  CASE WHEN num_articulo ~ '^\d+$' THEN (num_articulo::integer) ELSE 999999 END,
  num_articulo;

-- ============================================================
-- CA01.5: CROSS-SOURCE ARTICLE MATCH
-- ============================================================
-- For the 7 num_articulo values, search exact matches in
-- other known Notariado sources to detect accidental cross-layer
-- confusion. Return source, article, vigencia, metadata keys.

WITH false_articles AS (
  SELECT DISTINCT num_articulo
  FROM public.biblioteca_vectores
  WHERE fuente = 'Código del Notariado de Honduras (Decreto 353-2005)'
    AND es_norma_vigente = false
)
SELECT
  fuente,
  num_articulo,
  es_norma_vigente,
  COUNT(*) AS row_count,
  jsonb_object_keys(metadata) AS metadata_sample_key
FROM public.biblioteca_vectores
WHERE num_articulo IN (SELECT num_articulo FROM false_articles)
  AND fuente IN (
    'Código del Notariado de Honduras (Decreto 353-2005)',
    'Reglamento del Código del Notariado (Resolución PCSJ-17-2012)'
  )
GROUP BY fuente, num_articulo, es_norma_vigente, jsonb_object_keys(metadata)
ORDER BY fuente,
  CASE WHEN num_articulo ~ '^\d+$' THEN (num_articulo::integer) ELSE 999999 END,
  num_articulo;

-- ============================================================
-- CA01.6: REVISION FLAG CHECK
-- ============================================================
-- For the 7 rows return revision_pendiente status and metadata
-- identifiers to determine whether false rows were deliberately
-- editorially settled or remain pending.

WITH false_rows AS (
  SELECT
    id,
    num_articulo,
    es_norma_vigente,
    revision_pendiente,
    metadata
  FROM public.biblioteca_vectores
  WHERE fuente = 'Código del Notariado de Honduras (Decreto 353-2005)'
    AND es_norma_vigente = false
)
SELECT
  id,
  num_articulo,
  es_norma_vigente,
  revision_pendiente,
  metadata->>'revision_status' AS revision_status,
  metadata->>'nota' AS nota,
  metadata->>'archivo_src' AS archivo_src,
  metadata->>'fecha_detectada' AS fecha_detectada,
  created_at
FROM false_rows
ORDER BY
  CASE WHEN num_articulo ~ '^\d+$' THEN (num_articulo::integer) ELSE 999999 END,
  num_articulo;

-- ============================================================
-- END CA-01 QUERY PACK
-- ============================================================
-- These queries identify evidence only.
-- They do NOT adjudicate legal validity.
-- No article may be labeled DEROGADO solely because es_norma_vigente=false.
-- All findings require CLO legal review before classification.
