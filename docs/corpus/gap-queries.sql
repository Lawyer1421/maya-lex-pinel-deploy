-- GAP ANALYSIS QUERIES: 13 instrumentos canónicos vs DB
-- READ ONLY. Solo SELECT / WITH. Sin credenciales.
-- Project: thgrhueckkjdutjvcufp (PRODUCTION)

-- ══════════════════════════════════════════════════════════════════════════
-- SECCIÓN A — CONFIRMACIÓN DE ESQUEMA REAL
-- ══════════════════════════════════════════════════════════════════════════

SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'biblioteca_vectores'
ORDER BY ordinal_position;

-- ══════════════════════════════════════════════════════════════════════════
-- SECCIÓN B — INVENTARIO FÍSICO REAL DEL CORPUS
-- ══════════════════════════════════════════════════════════════════════════

SELECT
  fuente,
  COUNT(*) AS filas,
  COUNT(DISTINCT num_articulo) AS articulos_distintos
FROM biblioteca_vectores
GROUP BY fuente
ORDER BY filas DESC;

-- ══════════════════════════════════════════════════════════════════════════
-- SECCIÓN C — AGREGADOS
-- ══════════════════════════════════════════════════════════════════════════

SELECT
  materia,
  es_norma_vigente,
  COUNT(*) AS filas
FROM biblioteca_vectores
GROUP BY materia, es_norma_vigente
ORDER BY materia, es_norma_vigente;

SELECT
  COUNT(*) AS revision_pendiente_total
FROM biblioteca_vectores
WHERE revision_pendiente = true;

-- ══════════════════════════════════════════════════════════════════════════
-- SECCIÓN D — ANÁLISIS DE DUPLICADOS (OPCIONAL)
-- ══════════════════════════════════════════════════════════════════════════

-- D.1: Detectar artículos duplicados por fuente
WITH article_counts AS (
  SELECT
    fuente,
    num_articulo,
    COUNT(*) AS occurrences
  FROM biblioteca_vectores
  GROUP BY fuente, num_articulo
)
SELECT
  fuente,
  COUNT(*) AS duplicated_articles,
  MAX(occurrences) AS max_occurrences
FROM article_counts
WHERE occurrences > 1
GROUP BY fuente
ORDER BY fuente;
