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
    AND b.instrumento_id    = p_instrumento_id
    AND b.num_articulo_norm = p_num_articulo_norm
    AND b.revision_pendiente = false
  ORDER BY b.id
  LIMIT least(greatest(coalesce(p_limite, 5), 1), 20);
$function$
