-- SOLO LECTURA. Ejecutar únicamente en mayalexhn-staging (aicakncgtuiiuomflkqj).
-- Lote: A03_CODIGO_NINEZ_01. No ejecutar en producción.
-- Esperado: 302 filas visibles V4; 136 PRIMARY; 141 CONTEXT vigentes;
-- 24 CONTEXT derogados; 1 CONTEXT NULL en art. 21; 302 embeddings y hashes correctos.
SELECT count(*) AS filas,
       count(*) FILTER (WHERE revision_pendiente = false AND metadata->>'estado_v' = 'V4') AS visibles_v4,
       count(*) FILTER (WHERE es_norma_vigente = true AND NOT (metadata ? 'rol')) AS primary_vigentes,
       count(*) FILTER (WHERE es_norma_vigente = true AND metadata->>'rol' = 'CONTEXT') AS context_vigentes,
       count(*) FILTER (WHERE es_norma_vigente = false AND metadata->>'rol' = 'CONTEXT') AS context_derogados,
       count(*) FILTER (WHERE es_norma_vigente IS NULL AND metadata->>'rol' = 'CONTEXT') AS context_null,
       count(*) FILTER (WHERE num_articulo = '21' AND es_norma_vigente IS NULL AND metadata->>'rol' = 'CONTEXT') AS context_null_art21,
       count(*) FILTER (WHERE embedding IS NOT NULL) AS con_embedding,
       count(*) FILTER (WHERE encode(sha256(convert_to(contenido, 'UTF8')), 'hex') = hash_contenido) AS sha_ok,
       count(*) FILTER (WHERE encode(sha256(convert_to(contenido, 'UTF8')), 'hex') IS DISTINCT FROM hash_contenido) AS sha_error
FROM public.biblioteca_vectores
WHERE ingest_batch = 'A03_CODIGO_NINEZ_01';
