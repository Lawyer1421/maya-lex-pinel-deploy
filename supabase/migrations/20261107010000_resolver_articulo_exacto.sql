-- ═══════════════════════════════════════════════════════════════════════════
-- 20261107010000_resolver_articulo_exacto.sql
--
-- RPC de SOLO LECTURA: resolución exacta por instrumento + artículo, sin
-- vectores. Sirve de recuperador al puente FIRAC (lib/legal-os/skills/corpus-bridge.ts).
--
-- ALCANCE: SOLO STAGING (aicakncgtuiiuomflkqj). NO aplicar en producción sin
-- aprobación expresa del Titular. Rollback:
--   supabase/rollbacks/20261107010000_resolver_articulo_exacto_rollback.sql
--
-- Garantías:
--   * No modifica buscar_biblioteca_v2 ni datos. Función nueva, STABLE.
--   * Devuelve es_norma_vigente TAL COMO ESTÁ; NO filtra por vigencia ni declara
--     PRIMARY. Esa decisión la toma el código (fragmentoCumpleR3 / clo-guards),
--     que recalcula la clasificación y nunca confía en un valor almacenado.
--   * Excluye revision_pendiente = true (igual que buscar_biblioteca_v2).
--   * Devuelve vacío si instrumento_id / num_articulo_norm no están poblados
--     (hasta que una ingesta revisada los llene). Nunca adivina.
--   * security invoker; EXECUTE solo para service_role.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE OR REPLACE FUNCTION public.resolver_articulo_exacto(
  p_instrumento_id    text,
  p_num_articulo_norm text,
  p_limite            integer DEFAULT 5
)
RETURNS TABLE (
  id               text,
  coleccion        text,
  materia          text,
  contenido        text,
  num_articulo     text,
  fuente           text,
  fuente_tipo      text,
  jurisdiccion     text,
  es_norma_vigente boolean,
  hash_contenido   text,
  ingest_batch     text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT b.id, b.coleccion, b.materia, b.contenido, b.num_articulo, b.fuente,
         b.fuente_tipo, b.jurisdiccion, b.es_norma_vigente, b.hash_contenido, b.ingest_batch
  FROM public.biblioteca_vectores b
  WHERE p_instrumento_id IS NOT NULL
    AND p_num_articulo_norm IS NOT NULL
    AND b.instrumento_id    = p_instrumento_id
    AND b.num_articulo_norm = p_num_articulo_norm
    AND b.revision_pendiente = false
  ORDER BY b.id
  LIMIT least(greatest(coalesce(p_limite, 5), 1), 20);
$$;

REVOKE ALL ON FUNCTION public.resolver_articulo_exacto(text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolver_articulo_exacto(text, text, integer) TO service_role;

COMMIT;
