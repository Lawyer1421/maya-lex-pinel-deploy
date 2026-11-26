-- ═══════════════════════════════════════════════════════════════════════════
-- 20261125000000_sincronizar_rpc_prod.sql
--
-- Sincroniza public.resolver_articulo_exacto y public.buscar_biblioteca_v3 con
-- el contrato del repositorio (20261107010000 y 20261115000000), que es el que
-- ya tiene staging. Producción tiene la variante que entró con
-- 00a_migracion_esquema_prod.sql (2026-11-21); diff en docs/corpus/fase2/rpc-sync/.
--
-- Único cambio de comportamiento: el mensaje de error de buscar_biblioteca_v3
-- pasa de «invalida» a «inválida», como exige tests/sql/buscar-biblioteca-v3.sql.test.ts.
-- El resto es formato: saltos de línea, CRLF, el alias AS similarity (que RETURN
-- QUERY ignora) y espacios de alineación. Firma, volatilidad, search_path y
-- permisos son idénticos.
--
-- ALCANCE: staging primero; producción solo con DICTAMEN_SYNC_RPC.md firmado
-- («R1 FIRMADA»), por medio de scripts/olas/ejecutar-sql.ts. No usar
-- `supabase db push` en producción: su historial de migraciones termina en
-- 20261102132346 e intentaría aplicar migraciones que allí nunca se registraron.
-- Rollback: supabase/rollbacks/20261125000000_sincronizar_rpc_prod_rollback.sql
--
-- Falla cerrado: aborta si cualquiera de las dos funciones no está ni en la
-- variante 00a ni en la del repo (md5 de prosrc). Es idempotente: sobre una base
-- que ya tiene la variante del repo, la reescribe igual.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

DO $pre$
DECLARE r text; b text;
BEGIN
  SELECT md5(prosrc) INTO r FROM pg_proc WHERE oid = 'public.resolver_articulo_exacto(text, text, integer)'::regprocedure;
  SELECT md5(prosrc) INTO b FROM pg_proc WHERE oid = 'public.buscar_biblioteca_v3(vector, text, text, integer, boolean, text)'::regprocedure;
  -- 00a CRLF (producción hoy) · 00a LF (tras el rollback) · repo LF · repo CRLF
  IF r NOT IN ('ec9a0d2562ef350d28f7b5e317838bb4', 'dc95a7ea16bf1d75b0da7b02baa01da4', '3773538539da7da81472ab8f9fd9cee5', '84b9803c05ed9aaff0c94274e0552ca9') THEN
    RAISE EXCEPTION 'resolver_articulo_exacto en estado desconocido (md5 prosrc %): revisar antes de sincronizar', r;
  END IF;
  IF b NOT IN ('96e6ad9994e2cac5bff0c08b37369ba7', '373dad5848de9007b5becc99178e7d44', '4392a97aebc5ae90860a8ed2caa8124e', 'df4381e86356e59ab2b52a61d5ff5a60') THEN
    RAISE EXCEPTION 'buscar_biblioteca_v3 en estado desconocido (md5 prosrc %): revisar antes de sincronizar', b;
  END IF;
END
$pre$;

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

REVOKE ALL ON FUNCTION public.resolver_articulo_exacto(text, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolver_articulo_exacto(text, text, integer) TO service_role;
REVOKE ALL ON FUNCTION public.buscar_biblioteca_v3(vector, text, text, integer, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.buscar_biblioteca_v3(vector, text, text, integer, boolean, text) TO service_role;

DO $post$
BEGIN
  IF (SELECT md5(prosrc) FROM pg_proc WHERE oid = 'public.resolver_articulo_exacto(text, text, integer)'::regprocedure) <> '3773538539da7da81472ab8f9fd9cee5' THEN
    RAISE EXCEPTION 'postcondición: resolver_articulo_exacto no quedó con el cuerpo del repo';
  END IF;
  IF (SELECT md5(prosrc) FROM pg_proc WHERE oid = 'public.buscar_biblioteca_v3(vector, text, text, integer, boolean, text)'::regprocedure) <> '4392a97aebc5ae90860a8ed2caa8124e' THEN
    RAISE EXCEPTION 'postcondición: buscar_biblioteca_v3 no quedó con el cuerpo del repo';
  END IF;
  IF has_function_privilege('anon', 'public.buscar_biblioteca_v3(vector, text, text, integer, boolean, text)', 'execute')
     OR has_function_privilege('authenticated', 'public.resolver_articulo_exacto(text, text, integer)', 'execute') THEN
    RAISE EXCEPTION 'postcondición: anon/authenticated no deben poder ejecutar las RPC';
  END IF;
END
$post$;

COMMIT;
