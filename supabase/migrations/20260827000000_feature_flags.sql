-- ═══════════════════════════════════════════════════════════════════════════
-- 20260827000000_feature_flags.sql
-- Operación "Facultades Completas" — Fase 0: infraestructura de feature flags
--
-- Prerrequisito de R1 (toda capacidad nueva sale detrás de flag, default OFF)
-- y R2 (kill switch editable sin redeploy). Ver decision log:
-- docs/governance/DECISION_LOG.md, entrada 2026-08-27 (D1).
--
-- DISEÑO:
--   - Lectura y escritura únicamente vía service_role (mismo patrón que
--     subscriptions, queries_log, paypal_events, etc. — ver
--     20260727000000_enable_rls_subscriptions.sql para el precedente).
--   - Sin política de lectura para anon/authenticated: la decisión de "¿este
--     usuario ve esta feature?" se resuelve SIEMPRE server-side (Server
--     Component o Route Handler con createServerSupabaseClient), nunca
--     exponiendo la fila completa (que incluye la allowlist de correos
--     admin) al cliente.
--   - allowed_emails vacío = el flag, si está enabled, aplica a todos los
--     usuarios (activación amplia posterior). allowed_emails con contenido =
--     solo esos correos ven la feature aunque enabled=true (R3: grupo
--     controlado).
--   - Fail-closed por diseño en el código que la consume (lib/flags.ts):
--     cualquier error de lectura, fila ausente, o flag desconocido se trata
--     como DESACTIVADO — nunca como activado por defecto.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS public.feature_flags (
  flag_name      text PRIMARY KEY,
  enabled        boolean NOT NULL DEFAULT false,
  allowed_emails text[] NOT NULL DEFAULT '{}',
  description    text,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  updated_by     text
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'feature_flags' AND policyname = 'service_only_feature_flags'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "service_only_feature_flags" ON public.feature_flags
        USING ((SELECT auth.role()) = 'service_role')
        WITH CHECK ((SELECT auth.role()) = 'service_role')
    $pol$;
  END IF;
END $$;

-- Semilla: los 6 flags de la Operación Facultades Completas, todos OFF por
-- defecto (R1). Insertar solo si no existen -- no pisar un estado ya
-- configurado por una re-ejecución accidental de esta migración.
INSERT INTO public.feature_flags (flag_name, enabled, allowed_emails, description)
VALUES
  ('flag_corpus_p0', false, '{}', 'Fase 1 -- corpus normativo oficial (feature/mayalex-official-corpus-p0)'),
  ('flag_corpus_profesional', false, '{}', 'Fase 2 -- corpus profesional anonimizado (capa de patrones, Opción B)'),
  ('flag_osint', false, '{}', 'Fase 3 -- lib/osint + /internal/osint-lab'),
  ('flag_expediente', false, '{}', 'Fase 4a -- Expediente Privado (case_documents, bucket privado)'),
  ('flag_voz', false, '{}', 'Fase 4b -- Voz MVP (Web Speech API)'),
  ('flag_paywall', false, '{}', 'Fase 4c -- QuotaPaywall (modal de límite de cuota)')
ON CONFLICT (flag_name) DO NOTHING;

COMMIT;

-- ── VALIDACIÓN POSTERIOR ─────────────────────────────────────────────────
-- SELECT flag_name, enabled, allowed_emails FROM public.feature_flags
--   ORDER BY flag_name; -- deben existir las 6 filas, todas enabled=false

-- ── ROLLBACK ──────────────────────────────────────────────────────────────
-- Tabla nueva y aislada, sin ningún código de producción leyéndola todavía
-- en este commit -- DROP TABLE es seguro si algo sale mal:
--   DROP TABLE IF EXISTS public.feature_flags;
