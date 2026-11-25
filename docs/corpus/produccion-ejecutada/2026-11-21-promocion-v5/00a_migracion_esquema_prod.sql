-- Migracion aditiva de esquema para la promocion V5.
-- DESTINO EXCLUSIVO: mayalexhn-prod | Supabase project ref thgrhueckkjdutjvcufp
-- Confirmar manualmente el project ref antes de ejecutar. Esta migracion no modifica filas existentes.
-- Ejecutar antes de 00_precheck_y_respaldo_prod.sql.
-- embedding permanece NOT NULL: 01 usa vector cero temporal en filas ocultas y 02 lo reemplaza.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '5min';
SELECT pg_advisory_xact_lock(hashtext('mayalexhn-prod:promocion-v5-schema-2026-11-21'));

DO $preflight$
BEGIN
  IF to_regclass('public.biblioteca_vectores') IS NULL THEN
    RAISE EXCEPTION 'No existe public.biblioteca_vectores; abortando sin cambios.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'public.biblioteca_vectores'::regclass
      AND attname = 'embedding' AND NOT attisdropped
      AND format_type(atttypid, atttypmod) = 'vector(384)'
      AND attnotnull
  ) THEN
    RAISE EXCEPTION 'Se esperaba embedding vector(384) NOT NULL; revise el esquema antes de continuar.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'public.biblioteca_vectores'::regclass
      AND attname = 'revision_pendiente' AND NOT attisdropped
      AND atttypid = 'boolean'::regtype AND attnotnull
  ) THEN
    RAISE EXCEPTION 'Falta revision_pendiente boolean NOT NULL; no se puede garantizar la carga oculta.';
  END IF;
END
$preflight$;

ALTER TABLE public.biblioteca_vectores
  ADD COLUMN IF NOT EXISTS instrumento_id text,
  ADD COLUMN IF NOT EXISTS num_articulo_norm text,
  ADD COLUMN IF NOT EXISTS hash_contenido text,
  ADD COLUMN IF NOT EXISTS ingest_batch text,
  ADD COLUMN IF NOT EXISTS ingested_at timestamptz;

DO $schema_check$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('instrumento_id', 'text'),
      ('num_articulo_norm', 'text'),
      ('hash_contenido', 'text'),
      ('ingest_batch', 'text'),
      ('ingested_at', 'timestamp with time zone')
    ) AS expected(column_name, formatted_type)
    LEFT JOIN pg_attribute a
      ON a.attrelid = 'public.biblioteca_vectores'::regclass
     AND a.attname = expected.column_name
     AND NOT a.attisdropped
    WHERE a.attname IS NULL
       OR format_type(a.atttypid, a.atttypmod) <> expected.formatted_type
  ) THEN
    RAISE EXCEPTION 'Las columnas de ingesta no tienen el tipo esperado; abortando.';
  END IF;
END
$schema_check$;

COMMENT ON COLUMN public.biblioteca_vectores.instrumento_id IS
  'Id normalizado del instrumento; metadato de ubicacion, no declara vigencia.';
COMMENT ON COLUMN public.biblioteca_vectores.num_articulo_norm IS
  'Numero de articulo normalizado para resolucion exacta.';
COMMENT ON COLUMN public.biblioteca_vectores.hash_contenido IS
  'SHA-256 del contenido UTF-8 registrado durante la ingesta.';
COMMENT ON COLUMN public.biblioteca_vectores.ingest_batch IS
  'Identificador del lote de ingesta para trazabilidad.';
COMMENT ON COLUMN public.biblioteca_vectores.ingested_at IS
  'Marca de tiempo de la ingesta del lote.';

CREATE INDEX IF NOT EXISTS idx_biblio_instrumento_articulo
  ON public.biblioteca_vectores (instrumento_id, num_articulo_norm)
  WHERE instrumento_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_biblio_ingest_batch
  ON public.biblioteca_vectores (ingest_batch)
  WHERE ingest_batch IS NOT NULL;

CREATE OR REPLACE FUNCTION public.resolver_articulo_exacto(
  p_instrumento_id text,
  p_num_articulo_norm text,
  p_limite integer DEFAULT 5
)
RETURNS TABLE (
  id text, coleccion text, materia text, contenido text, num_articulo text,
  fuente text, fuente_tipo text, jurisdiccion text, es_norma_vigente boolean,
  hash_contenido text, ingest_batch text
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
    AND b.instrumento_id = p_instrumento_id
    AND b.num_articulo_norm = p_num_articulo_norm
    AND b.revision_pendiente = false
  ORDER BY b.id
  LIMIT least(greatest(coalesce(p_limite, 5), 1), 20);
$$;
REVOKE ALL ON FUNCTION public.resolver_articulo_exacto(text, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolver_articulo_exacto(text, text, integer)
  TO service_role;

CREATE OR REPLACE FUNCTION public.buscar_biblioteca_v3(
  query_embedding vector,
  coleccion_filtro text,
  materia_filtro text DEFAULT NULL::text,
  limite integer DEFAULT 5,
  solo_norma_vigente boolean DEFAULT false,
  jurisdiccion_filtro text DEFAULT 'HN'
)
RETURNS TABLE (
  id text, contenido text, num_articulo text, fuente text, fuente_tipo text,
  jurisdiccion text, es_norma_vigente boolean, similarity double precision
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
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
REVOKE ALL ON FUNCTION public.buscar_biblioteca_v3(vector, text, text, integer, boolean, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.buscar_biblioteca_v3(vector, text, text, integer, boolean, text)
  TO service_role;

COMMIT;

-- Validacion posterior, de solo lectura:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='biblioteca_vectores'
--   AND column_name IN ('instrumento_id','num_articulo_norm','hash_contenido','ingest_batch','ingested_at');
-- SELECT to_regclass('public.idx_biblio_instrumento_articulo'),
--        to_regclass('public.idx_biblio_ingest_batch');
-- SELECT has_function_privilege('anon',
--   'public.buscar_biblioteca_v3(vector,text,text,integer,boolean,text)','execute'); -- false
