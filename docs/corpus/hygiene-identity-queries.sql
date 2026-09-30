-- MAYALEX — HYGIENE & IDENTITY SPRINT H1
-- READ-ONLY QUERY PACK (SELECT / WITH ONLY)
-- Purpose: Adjudicate corpus identity claims
--
-- Status: PROVISIONAL
-- No credentials, writes, content retrieval, or ingestion

-- ══════════════════════════════════════════════════════════════════════════
-- H1 — fuente=NULL DISTRIBUTION
-- ══════════════════════════════════════════════════════════════════════════

SELECT
  materia,
  coleccion,
  fuente_tipo,
  es_norma_vigente,
  revision_pendiente,
  COUNT(*) AS null_fuente_rows
FROM biblioteca_vectores
WHERE fuente IS NULL
GROUP BY materia, coleccion, fuente_tipo, es_norma_vigente, revision_pendiente
ORDER BY materia, coleccion, null_fuente_rows DESC;

-- ══════════════════════════════════════════════════════════════════════════
-- H2 — doc_* INVENTORY (Metadata only, no contenido)
-- ══════════════════════════════════════════════════════════════════════════

WITH doc_sources AS (
  SELECT DISTINCT fuente
  FROM biblioteca_vectores
  WHERE fuente LIKE 'doc_%'
)
SELECT
  doc_sources.fuente,
  COUNT(*) AS row_count,
  COUNT(DISTINCT num_articulo) AS distinct_num_articulo,
  MIN(coleccion) AS coleccion_sample,
  MIN(fuente_tipo) AS fuente_tipo_sample,
  MIN(created_at)::date AS earliest_ingestion,
  MAX(created_at)::date AS latest_ingestion,
  COUNT(CASE WHEN es_norma_vigente = true THEN 1 END) AS vigente_count,
  COUNT(CASE WHEN es_norma_vigente = false THEN 1 END) AS false_count,
  COUNT(CASE WHEN es_norma_vigente IS NULL THEN 1 END) AS vigencia_null_count,
  COUNT(CASE WHEN revision_pendiente = true THEN 1 END) AS revision_pending_count
FROM doc_sources
JOIN biblioteca_vectores bv ON bv.fuente = doc_sources.fuente
GROUP BY doc_sources.fuente
ORDER BY row_count DESC;

-- ══════════════════════════════════════════════════════════════════════════
-- H3 — CPC LAYERS (Separate identity measurement, no merge, no deduplication)
-- ══════════════════════════════════════════════════════════════════════════

-- H3.1 — Codigo Procesal Civil
SELECT
  'Codigo Procesal Civil' AS cpc_layer,
  COUNT(*) AS total_rows,
  COUNT(DISTINCT num_articulo) AS distinct_num_articulo,
  COUNT(CASE WHEN es_norma_vigente = true THEN 1 END) AS vigente,
  COUNT(CASE WHEN es_norma_vigente = false THEN 1 END) AS false_count,
  COUNT(CASE WHEN es_norma_vigente IS NULL THEN 1 END) AS vigencia_null,
  MIN(fuente_tipo) AS fuente_tipo,
  MIN(coleccion) AS coleccion
FROM biblioteca_vectores
WHERE fuente = 'Codigo Procesal Civil'
GROUP BY 1;

-- H3.2 — CPC_TEXTO_BASE_D211-2006
SELECT
  'CPC_TEXTO_BASE_D211-2006' AS cpc_layer,
  COUNT(*) AS total_rows,
  COUNT(DISTINCT num_articulo) AS distinct_num_articulo,
  COUNT(CASE WHEN es_norma_vigente = true THEN 1 END) AS vigente,
  COUNT(CASE WHEN es_norma_vigente = false THEN 1 END) AS false_count,
  COUNT(CASE WHEN es_norma_vigente IS NULL THEN 1 END) AS vigencia_null,
  MIN(fuente_tipo) AS fuente_tipo,
  MIN(coleccion) AS coleccion
FROM biblioteca_vectores
WHERE fuente = 'CPC_TEXTO_BASE_D211-2006'
GROUP BY 1;

-- H3.3 — CPC_COMENTADO_ROMERO_2024
SELECT
  'CPC_COMENTADO_ROMERO_2024' AS cpc_layer,
  COUNT(*) AS total_rows,
  COUNT(DISTINCT num_articulo) AS distinct_num_articulo,
  COUNT(CASE WHEN es_norma_vigente = true THEN 1 END) AS vigente,
  COUNT(CASE WHEN es_norma_vigente = false THEN 1 END) AS false_count,
  COUNT(CASE WHEN es_norma_vigente IS NULL THEN 1 END) AS vigencia_null,
  MIN(fuente_tipo) AS fuente_tipo,
  MIN(coleccion) AS coleccion
FROM biblioteca_vectores
WHERE fuente = 'CPC_COMENTADO_ROMERO_2024'
GROUP BY 1;

-- H3.4 — Repeated num_articulo count per CPC layer
WITH cpc_layers AS (
  SELECT 'Codigo Procesal Civil' AS layer, fuente FROM biblioteca_vectores WHERE fuente = 'Codigo Procesal Civil'
  UNION ALL
  SELECT 'CPC_TEXTO_BASE_D211-2006', fuente FROM biblioteca_vectores WHERE fuente = 'CPC_TEXTO_BASE_D211-2006'
  UNION ALL
  SELECT 'CPC_COMENTADO_ROMERO_2024', fuente FROM biblioteca_vectores WHERE fuente = 'CPC_COMENTADO_ROMERO_2024'
),
article_occurrence AS (
  SELECT
    cpc_layers.layer,
    bv.num_articulo,
    COUNT(*) AS occurrences
  FROM cpc_layers
  JOIN biblioteca_vectores bv ON bv.fuente = cpc_layers.fuente
  GROUP BY cpc_layers.layer, bv.num_articulo
)
SELECT
  layer,
  COUNT(*) AS articles_with_repetition,
  MAX(occurrences) AS max_occurrences,
  MIN(occurrences) AS min_occurrences,
  AVG(occurrences)::numeric(5,2) AS avg_occurrences
FROM article_occurrence
WHERE occurrences > 1
GROUP BY layer
ORDER BY layer;

-- ══════════════════════════════════════════════════════════════════════════
-- H4 — NOTARIADO RECONCILIATION
-- ══════════════════════════════════════════════════════════════════════════
-- Purpose: Generate ordered num_articulo list for comparison against historical manifest
-- Note: Do NOT assume accepted IDs are 1–98; do NOT conclude count of missing articles

SELECT DISTINCT
  num_articulo
FROM biblioteca_vectores
WHERE fuente = 'Código del Notariado de Honduras'
ORDER BY
  CAST(
    CASE
      WHEN num_articulo ~ '^[0-9]+$' THEN num_articulo::int
      ELSE 999999
    END AS int
  ),
  num_articulo;

-- ══════════════════════════════════════════════════════════════════════════
-- H5 — DECREE / ALIAS DISCOVERY (Metadata search only, no content)
-- ══════════════════════════════════════════════════════════════════════════
-- Discovery match does NOT adjudicate legal identity

SELECT
  fuente,
  COUNT(*) AS row_count,
  COUNT(DISTINCT num_articulo) AS distinct_num_articulo,
  MIN(fuente_tipo) AS fuente_tipo,
  MIN(coleccion) AS coleccion,
  'CANDIDATE_MATCH' AS discovery_status
FROM biblioteca_vectores
WHERE
  fuente ILIKE '%31%2015%'
  OR fuente ILIKE '%35%2013%'
  OR fuente ILIKE '%73%96%'
  OR fuente ILIKE '%102%2018%'
  OR fuente ILIKE '%124%92%'
  OR fuente ILIKE '%284%2013%'
  OR fuente ILIKE '%73%1950%'
  OR fuente ILIKE '%Tribunales%'
GROUP BY fuente
ORDER BY row_count DESC;

-- Alternative: Full source inventory for manual decree search
SELECT DISTINCT
  fuente
FROM biblioteca_vectores
WHERE fuente NOT LIKE 'doc_%' AND fuente IS NOT NULL
ORDER BY fuente;

-- ══════════════════════════════════════════════════════════════════════════
-- END H1–H5 QUERIES
-- ══════════════════════════════════════════════════════════════════════════
