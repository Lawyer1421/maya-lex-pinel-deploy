-- GAP ANALYSIS QUERIES: 13 instrumentos canónicos vs DB
-- READ ONLY. No INSERT/UPDATE/DELETE.
-- Designed for manual execution in Supabase SQL Editor or psql.
-- Project: thgrhueckkjdutjvcufp (PRODUCTION)

-- Query 1: Total de filas y distribución de norm_ids
SELECT
  COUNT(*) as total_rows,
  COUNT(DISTINCT norm_id) as distinct_norm_ids,
  COUNT(DISTINCT materia) as distinct_materias
FROM biblioteca_vectores;

-- Query 2: Distribución por instrumento canónico (top 15)
SELECT
  norm_id,
  COUNT(*) as row_count,
  COUNT(DISTINCT numero_articulo) as article_count,
  COUNT(CASE WHEN es_norma_vigente = true THEN 1 END) as vigente_count,
  COUNT(CASE WHEN es_norma_vigente = false THEN 1 END) as no_vigente_count,
  COUNT(CASE WHEN es_norma_vigente IS NULL THEN 1 END) as vigencia_null_count,
  COUNT(CASE WHEN revision_pendiente = true THEN 1 END) as revision_pendiente_count
FROM biblioteca_vectores
GROUP BY norm_id
ORDER BY row_count DESC
LIMIT 15;

-- Query 3: norm_ids NO mapeados a los 13 canónicos
-- Canonical norm_ids from corpus-inventory-v2.csv:
-- HN_CODIGO_CIVIL, HN_CODIGO_FAMILIA, HN_DECRETO_102_2018, HN_DECRETO_31_2015,
-- HN_DECRETO_73_96, HN_DECRETO_35_2013, HN_DECRETO_124_92, HN_CPC_D211_2006,
-- HN_CPP_D9_99E, HN_CODIGO_NOTARIADO_D353_2005, HN_RESOLUCION_PCSJ_17_2012,
-- HN_CODIGO_COMERCIO_D73_1950, HN_LEY_ORGANIZACION_TRIBUNALES
SELECT DISTINCT norm_id, COUNT(*) as row_count
FROM biblioteca_vectores
WHERE norm_id NOT IN (
  'HN_CODIGO_CIVIL',
  'HN_CODIGO_FAMILIA',
  'HN_DECRETO_102_2018',
  'HN_DECRETO_31_2015',
  'HN_DECRETO_73_96',
  'HN_DECRETO_35_2013',
  'HN_DECRETO_124_92',
  'HN_CPC_D211_2006',
  'HN_CPP_D9_99E',
  'HN_CODIGO_NOTARIADO_D353_2005',
  'HN_RESOLUCION_PCSJ_17_2012',
  'HN_CODIGO_COMERCIO_D73_1950',
  'HN_LEY_ORGANIZACION_TRIBUNALES'
)
GROUP BY norm_id
ORDER BY norm_id;

-- Query 4: Cobertura de vigencia por instrumento canónico
SELECT
  norm_id,
  es_norma_vigente,
  COUNT(*) as count
FROM biblioteca_vectores
WHERE norm_id IN (
  'HN_CODIGO_CIVIL',
  'HN_CODIGO_FAMILIA',
  'HN_DECRETO_102_2018',
  'HN_DECRETO_31_2015',
  'HN_DECRETO_73_96',
  'HN_DECRETO_35_2013',
  'HN_DECRETO_124_92',
  'HN_CPC_D211_2006',
  'HN_CPP_D9_99E',
  'HN_CODIGO_NOTARIADO_D353_2005',
  'HN_RESOLUCION_PCSJ_17_2012',
  'HN_CODIGO_COMERCIO_D73_1950',
  'HN_LEY_ORGANIZACION_TRIBUNALES'
)
GROUP BY norm_id, es_norma_vigente
ORDER BY norm_id, es_norma_vigente;

-- Query 5: Revisar duplicados por instrumento (artículos repetidos)
WITH dedup_check AS (
  SELECT
    norm_id,
    numero_articulo,
    COUNT(*) as occurrences
  FROM biblioteca_vectores
  WHERE norm_id IN (
    'HN_CODIGO_CIVIL',
    'HN_CODIGO_FAMILIA',
    'HN_DECRETO_102_2018',
    'HN_DECRETO_31_2015',
    'HN_DECRETO_73_96',
    'HN_DECRETO_35_2013',
    'HN_DECRETO_124_92',
    'HN_CPC_D211_2006',
    'HN_CPP_D9_99E',
    'HN_CODIGO_NOTARIADO_D353_2005',
    'HN_RESOLUCION_PCSJ_17_2012',
    'HN_CODIGO_COMERCIO_D73_1950',
    'HN_LEY_ORGANIZACION_TRIBUNALES'
  )
  GROUP BY norm_id, numero_articulo
)
SELECT norm_id, COUNT(*) as duplicated_articles, MAX(occurrences) as max_occurrences
FROM dedup_check
WHERE occurrences > 1
GROUP BY norm_id
ORDER BY norm_id;
