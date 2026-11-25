-- Blindaje de las tablas de respaldo de las olas V5 · producción thgrhueckkjdutjvcufp · 2026-11-25
-- Ejecutado por Claude Code vía conector Supabase (execute_sql), por instrucción del CLO. No toca datos del corpus.
-- Antes: 14 de 15 respaldos sin RLS; anon y authenticated sin SELECT/INSERT/UPDATE/DELETE, pero con TRUNCATE, REFERENCES,
-- TRIGGER y MAINTAIN (ACL «Dxtm») en los 15. RLS no impide TRUNCATE, por eso además se revocan esos privilegios.
-- service_role y postgres (dueño) conservan su acceso.
BEGIN;
DO $do$
DECLARE t text; n int := 0;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace s ON s.oid = c.relnamespace
           WHERE s.nspname = 'public' AND c.relkind = 'r' AND c.relname LIKE 'biblioteca\_vectores\_%\_backup' ORDER BY 1 LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
    n := n + 1;
  END LOOP;
  IF n <> 15 THEN RAISE EXCEPTION 'respaldos tratados: % (esperados 15)', n; END IF;
END $do$;
COMMIT;
