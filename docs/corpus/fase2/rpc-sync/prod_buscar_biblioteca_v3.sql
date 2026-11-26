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
$function$
