-- Rollback de 20261107010000_resolver_articulo_exacto.sql (solo staging).
DROP FUNCTION IF EXISTS public.resolver_articulo_exacto(text, text, integer);
