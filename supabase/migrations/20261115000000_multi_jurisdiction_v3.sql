-- ═══════════════════════════════════════════════════════════════════════════
-- 20261115000000_multi_jurisdiction_v3.sql
--
-- buscar_biblioteca_v3: búsqueda semántica restringida a UNA jurisdicción.
-- ALCANCE: SOLO STAGING. NO aplicar en producción sin aprobación expresa del Titular.
-- Diseño: docs/retrieval/MULTI_JURISDICTION_V3_TECHNICAL_DESIGN.md (§2).
-- Rollback: supabase/rollbacks/20261115000000_multi_jurisdiction_v3_rollback.sql
--
-- Compatibilidad (NO se modifica nada existente):
--   * buscar_biblioteca_v2 no se toca ni se elimina; sus consumidores siguen igual.
--   * Sin DDL sobre biblioteca_vectores, sin índices, sin escrituras de datos.
--
-- Contrato de jurisdiccion_filtro:
--   * Omitido -> 'HN' (comportamiento por defecto cuando la consulta no menciona país).
--   * NULL, vacío o fuera de ('HN','SV','GT','CR','NI','PA') -> ERROR explícito. Nunca
--     se ejecuta una búsqueda sin filtro ni se sustituye por Honduras. Comparación
--     exacta: 'hn' o ' HN' se rechazan; el llamador normaliza antes.
--   * El filtro se aplica en el WHERE, antes del ORDER BY/LIMIT: una fila de otro país
--     nunca desplaza a una del país pedido, aunque tenga mayor similitud.
--   * Filas con jurisdiccion NULL nunca se devuelven (no se reinterpretan como HN).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE OR REPLACE FUNCTION public.buscar_biblioteca_v3(
  query_embedding vector,
  coleccion_filtro text,
  materia_filtro text DEFAULT NULL::text,
  limite integer DEFAULT 5,
  solo_norma_vigente boolean DEFAULT false,
  jurisdiccion_filtro text DEFAULT 'HN'
)
RETURNS TABLE(id text, contenido text, num_articulo text, fuente text, fuente_tipo text, jurisdiccion text, es_norma_vigente boolean, similarity double precision)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF jurisdiccion_filtro IS NULL OR jurisdiccion_filtro NOT IN ('HN', 'SV', 'GT', 'CR', 'NI', 'PA') THEN
    RAISE EXCEPTION 'buscar_biblioteca_v3: jurisdiccion_filtro inválida: %', coalesce(quote_literal(jurisdiccion_filtro), 'NULL')
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT b.id, b.contenido, b.num_articulo, b.fuente,
         b.fuente_tipo, b.jurisdiccion, b.es_norma_vigente,
         (1 - (b.embedding <=> query_embedding))::double precision AS similarity
  FROM public.biblioteca_vectores b
  WHERE b.coleccion = coleccion_filtro
    AND b.jurisdiccion = jurisdiccion_filtro
    AND (materia_filtro IS NULL OR b.materia = materia_filtro)
    AND (NOT solo_norma_vigente OR b.es_norma_vigente = true)
    AND b.revision_pendiente = false
  ORDER BY b.embedding <=> query_embedding
  LIMIT least(limite, 20);
END;
$function$;

REVOKE ALL ON FUNCTION public.buscar_biblioteca_v3(vector, text, text, integer, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.buscar_biblioteca_v3(vector, text, text, integer, boolean, text) TO service_role;

COMMIT;

-- ── VALIDACIÓN POSTERIOR (staging) ─────────────────────────────────────────
-- select pg_get_functiondef('public.buscar_biblioteca_v3'::regproc);
--   -> debe incluir "AND b.jurisdiccion = jurisdiccion_filtro".
-- select md5(pg_get_functiondef('public.buscar_biblioteca_v2'::regproc));
--   -> debe ser idéntico antes y después de aplicar esta migración.
-- select has_function_privilege('anon', 'public.buscar_biblioteca_v3(vector, text, text, integer, boolean, text)', 'execute');
--   -> false.
