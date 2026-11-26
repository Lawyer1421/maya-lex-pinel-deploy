-- Rollback de 20261125000000_sincronizar_rpc_prod.sql: restituye en producción la variante
-- que entró con 00a_migracion_esquema_prod.sql (2026-11-21), es decir, el mensaje «invalida»
-- sin tilde y su formato. Se escribe en LF: funcionalmente es idéntica a la de 00a, pero el
-- md5 de prosrc difiere del original (ec9a0d25… / 96e6ad99…), que estaba en CRLF.
-- Solo por orden expresa del CLO.

BEGIN;

CREATE OR REPLACE FUNCTION public.resolver_articulo_exacto(p_instrumento_id text, p_num_articulo_norm text, p_limite integer DEFAULT 5)
 RETURNS TABLE(id text, coleccion text, materia text, contenido text, num_articulo text, fuente text, fuente_tipo text, jurisdiccion text, es_norma_vigente boolean, hash_contenido text, ingest_batch text)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT b.id, b.coleccion, b.materia, b.contenido, b.num_articulo, b.fuente,
         b.fuente_tipo, b.jurisdiccion, b.es_norma_vigente, b.hash_contenido, b.ingest_batch
  FROM public.biblioteca_vectores b
  WHERE p_instrumento_id IS NOT NULL
    AND p_num_articulo_norm IS NOT NULL
    AND b.instrumento_id = p_instrumento_id
    AND b.num_articulo_norm = p_num_articulo_norm
    AND b.revision_pendiente = false
  ORDER BY b.id
  LIMIT least(greatest(coalesce(p_limite, 5), 1), 20);
$function$;

CREATE OR REPLACE FUNCTION public.buscar_biblioteca_v3(query_embedding vector, coleccion_filtro text, materia_filtro text DEFAULT NULL::text, limite integer DEFAULT 5, solo_norma_vigente boolean DEFAULT false, jurisdiccion_filtro text DEFAULT 'HN'::text)
 RETURNS TABLE(id text, contenido text, num_articulo text, fuente text, fuente_tipo text, jurisdiccion text, es_norma_vigente boolean, similarity double precision)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF jurisdiccion_filtro IS NULL
     OR jurisdiccion_filtro NOT IN ('HN', 'SV', 'GT', 'CR', 'NI', 'PA') THEN
    RAISE EXCEPTION 'buscar_biblioteca_v3: jurisdiccion_filtro invalida: %',
      coalesce(quote_literal(jurisdiccion_filtro), 'NULL')
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT b.id, b.contenido, b.num_articulo, b.fuente, b.fuente_tipo,
         b.jurisdiccion, b.es_norma_vigente,
         (1 - (b.embedding <=> query_embedding))::double precision
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

REVOKE ALL ON FUNCTION public.resolver_articulo_exacto(text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolver_articulo_exacto(text, text, integer) TO service_role;
REVOKE ALL ON FUNCTION public.buscar_biblioteca_v3(vector, text, text, integer, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.buscar_biblioteca_v3(vector, text, text, integer, boolean, text) TO service_role;

COMMIT;
