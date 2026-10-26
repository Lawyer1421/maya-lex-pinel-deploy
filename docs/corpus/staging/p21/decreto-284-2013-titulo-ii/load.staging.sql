-- TARGET: staging aicakncgtuiiuomflkqj ONLY. NOT APPLIED. NO PRODUCTION.
-- Instrumento: Decreto 284-2013, Título II (arts. 15–25)
-- id_prefix: mayalex_normativos:decreto_284_2013_titulo_ii
-- Estado: BLOCKED_SOURCE_UNREACHABLE + BLOCKED_SCHEMA + EMBEDDINGS_PENDING.
--   * Fuente no descargada/verificada por SHA-256: NO hay filas (no se inventa contenido).
--   * jurisdiccion, fuente_tipo y es_norma_vigente no tienen DDL en supabase/vectores.sql ni en supabase/migrations.
--   * embedding es NOT NULL y no hay embeddings generados localmente.
-- Plantilla: todo el INSERT está COMENTADO. No descomentar sin CLO + verificación de esquema en staging.
-- es_norma_vigente = false en todas las filas.

-- BEGIN;
-- INSERT INTO public.biblioteca_vectores (id, coleccion, materia, contenido, num_articulo, fuente, metadata, embedding, jurisdiccion, fuente_tipo, es_norma_vigente)
-- VALUES
--   -- (filas pendientes: se generan solo tras verificar SHA-256 de la fuente y generar embeddings localmente)
-- ON CONFLICT (id) DO NOTHING;
-- COMMIT;

-- Verificación posterior (comentada):
-- select count(*) from public.biblioteca_vectores where id like 'mayalex_normativos:decreto_284_2013_titulo_ii:%';
-- select num_articulo from public.biblioteca_vectores where id like 'mayalex_normativos:decreto_284_2013_titulo_ii:%' order by 1;
