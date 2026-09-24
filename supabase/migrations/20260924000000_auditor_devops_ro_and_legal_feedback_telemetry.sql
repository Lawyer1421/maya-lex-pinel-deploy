-- ═══════════════════════════════════════════════════════════════════════════
-- 20260924000000_auditor_devops_ro_and_legal_feedback_telemetry.sql
--
-- Refleja en el repo dos objetos creados directamente en el SQL Editor de
-- producción (thgr) que nunca quedaron en una migración: el rol de
-- auditoría de solo lectura `auditor_devops_ro` y la tabla
-- `legal_feedback_telemetry` (telemetría de consultas para el módulo de
-- self-learning -- ver CLAUDE.md §3 / ROADMAP.md). Aplica además la
-- corrección de seguridad señalada en la revisión externa del rol
-- (2026-09-24):
--
--   P1: la vista v_biblio_posible_anon_erronea no tiene security_invoker,
--       corre con los permisos del dueño (postgres) y por eso salta la RLS
--       real de biblioteca_vectores. auditor_devops_ro tenía SELECT sobre
--       ella -> posible acceso a documentos con anonimización fallida
--       (datos personales). Se revoca el acceso amplio del rol y se deja
--       solo lectura de biblioteca_vectores y feature_flags -- ambas hoy
--       devuelven 0 filas por su propia RLS (service_role-only); es
--       intencional, no un bug (ver recomendación del auditor).
--   P1: ALTER DEFAULT PRIVILEGES daba SELECT automático a auditor_devops_ro
--       sobre toda tabla/secuencia NUEVA en public, sin que nadie lo
--       decidiera. Se revoca.
--   P2: auditor_devops_ro no tenía vencimiento. Se fija uno -- renovar según
--       la política de rotación de credenciales de auditoría.
--   P2 adicional (hallazgo propio al preparar esta migración, no reportado
--       por el auditor externo): service_role NO tenía GRANT de tabla
--       alguno (select/insert/update/delete) sobre legal_feedback_telemetry
--       -- solo TRIGGER/TRUNCATE/REFERENCES heredados de los default
--       privileges del schema. La política RLS "Service role has full
--       access to feedback telemetry" ya existía pero era inerte sin el
--       GRANT correspondiente: ningún insert server-side podía llegar a
--       escribir una fila. Se otorga aquí, mismo patrón que
--       lib/self-learning/schema.sql (documentos_aprendizaje,
--       vectores_conocimiento).
--
-- NO toca datos, ni políticas de negocio existentes, ni las tablas de
-- facturación. No incluye la contraseña del rol (ya existe en producción;
-- en un entorno nuevo debe fijarse por fuera de esta migración, vía
-- ALTER ROLE auditor_devops_ro PASSWORD '...' desde un canal seguro, nunca
-- committeada).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── legal_feedback_telemetry ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.legal_feedback_telemetry (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  user_id             uuid,
  session_id          text,
  query_text          text NOT NULL,
  similarity_score    numeric,
  retrieved_articles  jsonb DEFAULT '[]'::jsonb,
  feedback_type       text,
  user_notes          text,
  is_reviewed_by_clo  boolean NOT NULL DEFAULT false,
  clo_review_notes    text,
  metadata            jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.legal_feedback_telemetry ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'legal_feedback_telemetry'
      AND policyname = 'Service role has full access to feedback telemetry'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Service role has full access to feedback telemetry"
        ON public.legal_feedback_telemetry
        FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true)
    $pol$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'legal_feedback_telemetry'
      AND policyname = 'Users can insert their own feedback'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "Users can insert their own feedback"
        ON public.legal_feedback_telemetry
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id OR user_id IS NULL)
    $pol$;
  END IF;
END $$;

-- Corrección: la política de service_role existía pero sin GRANT de tabla
-- era inerte -- ningún insert server-side llegaba a escribirse.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.legal_feedback_telemetry TO service_role;

-- Permisos sobrantes que ni la app ni la API usan (mismo hallazgo del
-- auditor para documentos_aprendizaje/feedback -- la app usa service_role).
REVOKE TRUNCATE, TRIGGER, REFERENCES, MAINTAIN
  ON public.legal_feedback_telemetry, public.documentos_aprendizaje, public.feedback
  FROM anon, authenticated;

-- ── Rol de auditoría de solo lectura: auditor_devops_ro ───────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'auditor_devops_ro') THEN
    CREATE ROLE auditor_devops_ro LOGIN;
  END IF;
END $$;

ALTER ROLE auditor_devops_ro SET default_transaction_read_only = on;

-- Vencimiento -- renovar según la política de rotación de credenciales de
-- auditoría (mismo criterio que los demás tokens de auditoría).
ALTER ROLE auditor_devops_ro VALID UNTIL '2026-10-01 23:59:59-06';

-- P1 (revisión externa 2026-09-24): quitar el acceso amplio a todo public,
-- incluida v_biblio_posible_anon_erronea.
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM auditor_devops_ro;
REVOKE SELECT ON ALL SEQUENCES IN SCHEMA public FROM auditor_devops_ro;

-- P1 (revisión externa 2026-09-24): sin esto, toda tabla/secuencia NUEVA en
-- public le da SELECT automático al rol sin que nadie lo decida.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE SELECT ON TABLES FROM auditor_devops_ro;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE SELECT ON SEQUENCES FROM auditor_devops_ro;

-- Único acceso de lectura que conserva el rol -- ambas hoy devuelven 0 filas
-- por su propia RLS (service_role-only); es intencional, no un bug.
GRANT SELECT ON public.biblioteca_vectores, public.feature_flags TO auditor_devops_ro;

COMMIT;

-- ── VALIDACIÓN POSTERIOR ───────────────────────────────────────────────────
-- 1) select table_name from information_schema.role_table_grants
--      where grantee = 'auditor_devops_ro';
--      -> debe listar SOLO biblioteca_vectores y feature_flags.
-- 2) select rolvaliduntil from pg_roles where rolname = 'auditor_devops_ro';
--      -> 2026-10-01 23:59:59-06.
-- 3) select exists (
--      select 1 from pg_default_acl
--      where defaclacl::text like '%auditor_devops_ro%'
--    ); -> false.
-- 4) select count(*) from public.v_biblio_posible_anon_erronea; -- informativo,
--      NO depende de esta migración (la vista sigue existiendo con el mismo
--      problema de security_invoker; solo se le quitó el acceso al rol de
--      auditoría). Verificado en vivo el 2026-09-24: 24549 filas -- pendiente
--      de escalar a CLO, coincide con el NO-GO del 13-sep sobre mezclar
--      anonimizados con norma de Gaceta.

-- ── ROLLBACK ────────────────────────────────────────────────────────────────
-- REVOKE SELECT ON public.biblioteca_vectores, public.feature_flags FROM auditor_devops_ro;
-- ALTER ROLE auditor_devops_ro VALID UNTIL 'infinity';
-- REVOKE SELECT, INSERT, UPDATE, DELETE ON public.legal_feedback_telemetry FROM service_role;
-- (recrear los grants amplios anteriores del rol NO se recomienda -- eran
-- exactamente el problema que esta migración corrige.)
