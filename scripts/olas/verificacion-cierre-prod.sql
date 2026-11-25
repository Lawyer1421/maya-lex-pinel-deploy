-- scripts/olas/verificacion-cierre-prod.sql
-- Lectura única de cierre (SOLO LECTURA) en producción thgrhueckkjdutjvcufp, tras ejecutar los 12 paquetes firmados
-- (OLAS 3, 4, 5, 6, 7, 9, 10, 11 y OLA 12 LJC, LOAT, LP y LA). Esperado: 7,415 filas V5 visibles con embedding válido
-- (1,478 previas más 5,937 nuevas) y las 7,349 filas legacy sustituidas ocultas, sin borrar.
-- Generado desde los manifiestos de out/*/manifiesto_paquete.json; no modifica nada.

-- 1. Filas V5 por lote frente a lo esperado
WITH esperado(lote, filas) AS (VALUES
    ('A03_CODIGO_NINEZ_01', 302),
    ('A04_D35_2013_01', 19),
    ('PILOTO_D284_2013_01', 39),
    ('OLA1_CPP_2024_01', 480),
    ('OLA2_CP_2017_01', 638),
    ('OLA3_CON_2021_01', 381),
    ('OLA4_CC_2014_01', 2372),
    ('OLA5_CF_2023_01', 379),
    ('OLA6_CPC_2024_01', 932),
    ('OLA7_CT_2023_01', 877),
    ('OLA9_CTRIB_2024_01', 215),
    ('OLA10_NOT_2006_01', 94),
    ('OLA11_ADOP_2019_01', 64),
    ('OLA12_LJC_2007_01', 124),
    ('OLA12_LOAT_2007_01', 264),
    ('OLA12_LP_2007_01', 142),
    ('OLA12_LA_2015_01', 93)
), real AS (
  SELECT ingest_batch AS lote, count(*) AS filas,
    count(*) FILTER (WHERE revision_pendiente = false) AS visibles,
    count(*) FILTER (WHERE embedding IS NOT NULL AND embedding <> array_fill(0::real, ARRAY[384])::vector) AS con_embedding,
    count(*) FILTER (WHERE encode(sha256(convert_to(contenido, 'UTF8')), 'hex') <> hash_contenido) AS hash_distinto
  FROM public.biblioteca_vectores WHERE metadata->>'estado_v' = 'V5' GROUP BY 1
)
SELECT coalesce(e.lote, r.lote) AS lote, e.filas AS esperadas, r.filas, r.visibles, r.con_embedding, r.hash_distinto,
  (e.filas = r.filas AND r.visibles = r.filas AND r.con_embedding = r.filas AND r.hash_distinto = 0) AS ok
FROM esperado e FULL JOIN real r USING (lote)
UNION ALL
SELECT 'TOTAL', (SELECT sum(filas) FROM esperado), sum(r.filas), sum(r.visibles), sum(r.con_embedding), sum(r.hash_distinto),
  sum(r.visibles) = 7415 AND sum(r.con_embedding) = 7415
FROM real r
ORDER BY 1;

-- 2. Legacy sustituido: debe estar oculto (revision_pendiente = true, sustituido_por_lote) y ninguna fila visible
  SELECT 'OLA3_CON_2021_01' AS lote, 378 AS esperadas,
    count(*) FILTER (WHERE b.revision_pendiente = true AND b.metadata->>'sustituido_por_lote' = 'OLA3_CON_2021_01') AS ocultas,
    count(*) FILTER (WHERE b.revision_pendiente = false) AS aun_visibles
  FROM public.biblioteca_vectores b WHERE b.id LIKE 'mayalex_normativos:constitucion_1982_a%'
  UNION ALL
  SELECT 'OLA4_CC_2014_01' AS lote, 2372 AS esperadas,
    count(*) FILTER (WHERE b.revision_pendiente = true AND b.metadata->>'sustituido_por_lote' = 'OLA4_CC_2014_01') AS ocultas,
    count(*) FILTER (WHERE b.revision_pendiente = false) AS aun_visibles
  FROM public.biblioteca_vectores b WHERE b.metadata->>'norm_id' = 'HN_CODIGO_CIVIL_1906' AND b.id LIKE 'mayalex_normativos:cc_1906_a%'
  UNION ALL
  SELECT 'OLA5_CF_2023_01' AS lote, 373 AS esperadas,
    count(*) FILTER (WHERE b.revision_pendiente = true AND b.metadata->>'sustituido_por_lote' = 'OLA5_CF_2023_01') AS ocultas,
    count(*) FILTER (WHERE b.revision_pendiente = false) AS aun_visibles
  FROM public.biblioteca_vectores b WHERE b.metadata->>'norm_id' = 'HN_CODIGO_FAMILIA' AND b.id LIKE 'v2familia:mayalex_normativos:%'
  UNION ALL
  SELECT 'OLA6_CPC_2024_01' AS lote, 2859 AS esperadas,
    count(*) FILTER (WHERE b.revision_pendiente = true AND b.metadata->>'sustituido_por_lote' = 'OLA6_CPC_2024_01') AS ocultas,
    count(*) FILTER (WHERE b.revision_pendiente = false) AS aun_visibles
  FROM public.biblioteca_vectores b WHERE ((b.metadata->>'norm_id' = 'HN_CODIGO_PROCESAL_CIVIL' AND (b.id LIKE 'v2civil:mayalex_normativos:%' OR b.id LIKE 'v2civil:mayalex_procedimental:%')) OR b.id LIKE 'mayalex_normativos:cpc_base_a%')
  UNION ALL
  SELECT 'OLA7_CT_2023_01' AS lote, 870 AS esperadas,
    count(*) FILTER (WHERE b.revision_pendiente = true AND b.metadata->>'sustituido_por_lote' = 'OLA7_CT_2023_01') AS ocultas,
    count(*) FILTER (WHERE b.revision_pendiente = false) AS aun_visibles
  FROM public.biblioteca_vectores b WHERE b.metadata->>'norm_id' = 'HN_CODIGO_TRABAJO' AND b.id LIKE 'v2trabajo:mayalex_normativos:%'
  UNION ALL
  SELECT 'OLA9_CTRIB_2024_01' AS lote, 215 AS esperadas,
    count(*) FILTER (WHERE b.revision_pendiente = true AND b.metadata->>'sustituido_por_lote' = 'OLA9_CTRIB_2024_01') AS ocultas,
    count(*) FILTER (WHERE b.revision_pendiente = false) AS aun_visibles
  FROM public.biblioteca_vectores b WHERE b.id LIKE 'mayalex_normativos:tributario_2016_a%'
  UNION ALL
  SELECT 'OLA10_NOT_2006_01' AS lote, 94 AS esperadas,
    count(*) FILTER (WHERE b.revision_pendiente = true AND b.metadata->>'sustituido_por_lote' = 'OLA10_NOT_2006_01') AS ocultas,
    count(*) FILTER (WHERE b.revision_pendiente = false) AS aun_visibles
  FROM public.biblioteca_vectores b WHERE b.id LIKE 'mayalex_normativos:codigo_notariado_2005_a%'
  UNION ALL
  SELECT 'OLA11_ADOP_2019_01' AS lote, 64 AS esperadas,
    count(*) FILTER (WHERE b.revision_pendiente = true AND b.metadata->>'sustituido_por_lote' = 'OLA11_ADOP_2019_01') AS ocultas,
    count(*) FILTER (WHERE b.revision_pendiente = false) AS aun_visibles
  FROM public.biblioteca_vectores b WHERE b.id LIKE 'mayalex_normativos:adopciones_2018_a%'
  UNION ALL
  SELECT 'OLA12_LJC_2007_01' AS lote, 124 AS esperadas,
    count(*) FILTER (WHERE b.revision_pendiente = true AND b.metadata->>'sustituido_por_lote' = 'OLA12_LJC_2007_01') AS ocultas,
    count(*) FILTER (WHERE b.revision_pendiente = false) AS aun_visibles
  FROM public.biblioteca_vectores b WHERE b.metadata->>'norm_id' = 'HN_LEY_JUSTICIA_CONSTITUCIONAL' AND b.id LIKE 'v2ljc:mayalex_normativos:%'
ORDER BY 1;
