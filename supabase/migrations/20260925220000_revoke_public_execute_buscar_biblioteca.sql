-- ═══════════════════════════════════════════════════════════════════════════
-- 20260925220000_revoke_public_execute_buscar_biblioteca.sql
--
-- PROPUESTA -- NO APLICADA (ni en staging ni en producción) al momento de
-- escribir este archivo. Sometida a revisión del fundador y del auditor
-- DevOps antes de ejecutarse. Ver docs/governance/DECISION_LOG.md para el
-- diagnóstico completo que la respalda.
--
-- Hallazgo (auditor DevOps, 2026-09-25, P1 de permisos): las funciones RPC
-- buscar_biblioteca y buscar_biblioteca_v2 tienen EXECUTE otorgado a PUBLIC
-- -- confirmado empíricamente en producción (thgrhueckkjdutjvcufp):
--   - buscar_biblioteca: ACL explícito incluye "=X" (PUBLIC).
--   - buscar_biblioteca_v2: proacl NULL -- nunca se tocó desde su creación,
--     por lo que aplica el default de Postgres (EXECUTE a PUBLIC en toda
--     función nueva, salvo revocación explícita).
--
-- Impacto real verificado: NINGUNO. Ambas funciones son SECURITY INVOKER
-- (prosecdef=false) -- corren con los privilegios de quien llama, no del
-- dueño. biblioteca_vectores tiene RLS activa (service_only_biblioteca,
-- exige auth.role()='service_role') y anon/authenticated no tienen SELECT
-- de tabla en absoluto. Cualquier llamada a estas RPC como anon/authenticated
-- devuelve 0 filas hoy. Este cambio es defensa en profundidad / principio de
-- menor privilegio, no una corrección de una fuga activa.
--
-- Único consumidor real en la app: lib/rag/search.ts (buscarEnSupabase),
-- vía createServerSupabaseClient() -- SUPABASE_SERVICE_ROLE_KEY, siempre
-- server-side. Ningún cliente browser/anon invoca estas funciones (ver
-- diagnóstico completo en el chat / decision log).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

REVOKE EXECUTE ON FUNCTION public.buscar_biblioteca(vector, text, text, integer)
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.buscar_biblioteca_v2(vector, text, text, integer, boolean)
  FROM PUBLIC, anon, authenticated;

-- service_role es el único consumidor real -- se reafirma explícitamente
-- (ya lo tenía buscar_biblioteca desde supabase/vectores.sql; se agrega
-- aquí también para buscar_biblioteca_v2, que nunca lo tuvo de forma
-- explícita).
GRANT EXECUTE ON FUNCTION public.buscar_biblioteca(vector, text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.buscar_biblioteca_v2(vector, text, text, integer, boolean) TO service_role;

COMMIT;

-- ── VALIDACIÓN POSTERIOR ───────────────────────────────────────────────────
-- select p.proname, pg_get_function_identity_arguments(p.oid), p.proacl::text
-- from pg_proc p join pg_namespace n on n.oid=p.pronamespace
-- where n.nspname='public' and p.proname in ('buscar_biblioteca','buscar_biblioteca_v2');
--   -> proacl no debe contener "=X" (PUBLIC) ni "anon=" ni "authenticated=";
--      solo debe listar postgres y service_role con X.

-- ── ROLLBACK ────────────────────────────────────────────────────────────────
-- GRANT EXECUTE ON FUNCTION public.buscar_biblioteca(vector, text, text, integer) TO PUBLIC;
-- GRANT EXECUTE ON FUNCTION public.buscar_biblioteca_v2(vector, text, text, integer, boolean) TO PUBLIC;

-- ── FUERA DE ALCANCE DE ESTA PROPUESTA (mencionado para constancia) ────────
-- buscar_biblioteca_penal (definida en supabase/schema.sql) no existe hoy en
-- la base de producción (verificado: 0 filas en pg_proc) y no tiene ningún
-- call site en el código actual -- probablemente nunca se aplicó a
-- producción, o fue reemplazada por buscar_biblioteca/_v2. No se toca en
-- esta migración; si se confirma que es un artefacto muerto del repo, su
-- limpieza es una decisión separada (borrar el archivo, no una migración).
