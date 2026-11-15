-- Rollback de 20261115000000_multi_jurisdiction_v3.sql: solo elimina v3; buscar_biblioteca_v2 queda intacta.
DROP FUNCTION IF EXISTS public.buscar_biblioteca_v3(vector, text, text, integer, boolean, text);
