-- PROPUESTA_NO_APLICADA — NO es una migración y NO se ejecutó. Vive en docs/ a propósito (no entra a supabase/migrations ni a seeds).
-- Aplicarla en Supabase es decisión expresa de Fredy (cambia el tipo de retorno de una función de producción).
--
-- Objetivo (N-2, auditoría del #106): que la recuperación SEMÁNTICA entregue al clasificador CLO el mismo rol y la misma norma desplazada que ya
-- usa la recuperación exacta. Hoy buscar_biblioteca_v2 devuelve solo id, contenido, num_articulo, fuente, fuente_tipo, jurisdiccion,
-- es_norma_vigente y similarity: un artículo con metadata.desplazado_por o metadata.rol <> 'PRIMARY' llega a la ruta semántica sin esa señal.
-- Solo AÑADE una columna de lectura (metadata_clo; la materia NO se devuelve a propósito: la fija la ruta, Anexo 2.5); no cambia filtros, orden ni límite. El TS (mapearFilaSemantica) ya sabe leerlas y es compatible hacia atrás.
--
-- Requisito previo: biblioteca_vectores.metadata jsonb existe (la usa la recuperación exacta).

begin;
drop function if exists public.buscar_biblioteca_v2(vector, text, text, integer, boolean);

create function public.buscar_biblioteca_v2(
  query_embedding vector,
  coleccion_filtro text,
  materia_filtro text default null::text,
  limite integer default 5,
  solo_norma_vigente boolean default false
)
returns table(
  id text, contenido text, num_articulo text, fuente text, fuente_tipo text, jurisdiccion text, es_norma_vigente boolean, similarity double precision,
  metadata_clo jsonb
)
language sql
stable
as $function$
  select b.id, b.contenido, b.num_articulo, b.fuente, b.fuente_tipo, b.jurisdiccion, b.es_norma_vigente,
         1 - (b.embedding <=> query_embedding) as similarity,
         jsonb_build_object(
           'rol', b.metadata->'rol',
           'desplazado_por', b.metadata->'desplazado_por',
           'elegible_primary', b.metadata->'elegible_primary',
           'norm_id', b.metadata->'norm_id',
           'p21', b.metadata->'p21'
         )
  from biblioteca_vectores b
  where b.coleccion = coleccion_filtro
    and (materia_filtro is null or b.materia = materia_filtro)
    and (not solo_norma_vigente or b.es_norma_vigente = true)
    and b.revision_pendiente = false
  order by b.embedding <=> query_embedding
  limit least(limite, 20);
$function$;

-- Conservar los permisos que tenía la función anterior (revisar con \df+ antes de aplicar; ejemplo):
grant execute on function public.buscar_biblioteca_v2(vector, text, text, integer, boolean) to service_role;
commit;

-- ROLLBACK: recrear la definición previa (la de supabase/migrations/20260925055249_revision_pendiente_instrumentos.sql, sin las tres columnas nuevas):
--   drop function public.buscar_biblioteca_v2(vector, text, text, integer, boolean);  -- y volver a ejecutar esa definición.
-- Validación posterior (solo lectura): select id, metadata_clo from buscar_biblioteca_v2(<embedding de prueba>, 'mayalex_normativos', null, 3, false);
