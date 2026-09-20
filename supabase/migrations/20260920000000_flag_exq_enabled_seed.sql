-- ═══════════════════════════════════════════════════════════════════════════
-- 20260920000000_flag_exq_enabled_seed.sql
-- Exequátur — siembra de la fila del flag de activación.
--
-- ESTADO: PROPUESTA. No aplicada a ningún proyecto Supabase (ni staging ni
-- thgr) al momento de este commit. Solo archivo en el repo.
--
-- CONTEXTO:
--   lib/exequatur/access.ts (Slice 1, PR #40) exige flag_exq_enabled=true
--   además del tier (pro/admin) para conceder acceso. lib/flags.ts ya
--   documenta (líneas 32-38) que sin esta fila sembrada,
--   isFlagEnabledForUser() devuelve false para TODO usuario -- incluido
--   admin -- por diseño fail-closed. Verificado en vivo (solo lectura,
--   2026-09-20): `select * from feature_flags where flag_name =
--   'flag_exq_enabled'` devuelve 0 filas en el proyecto de producción.
--   Resultado: Exequátur es inaccesible para cualquier usuario real hoy,
--   independientemente del estado de Slice 3B (persistencia).
--
--   Esta migración solo crea la fila, APAGADA (R1) -- no activa nada por sí
--   sola. Activar la vertical (enabled=true, o poblar allowed_emails para un
--   grupo controlado) es una decisión posterior y separada del fundador,
--   igual que se hizo para los demás flags de este archivo.
--
-- DEPENDE DE: 20260827000000_feature_flags.sql (tabla public.feature_flags).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

INSERT INTO public.feature_flags (flag_name, enabled, allowed_emails, description)
VALUES
  ('flag_exq_enabled', false, '{}',
   'Exequátur de Notario -- gate completo de la vertical (lib/exequatur/access.ts, Slice 1 PR #40). Default OFF (R1). Activación gradual vía allowed_emails o enabled=true es decisión separada del fundador.')
ON CONFLICT (flag_name) DO NOTHING;

COMMIT;

-- ── VALIDACIÓN POSTERIOR ─────────────────────────────────────────────────
-- SELECT flag_name, enabled, allowed_emails FROM public.feature_flags
--   WHERE flag_name = 'flag_exq_enabled';
--   -> 1 fila, enabled = false, allowed_emails = '{}'

-- ── ROLLBACK ──────────────────────────────────────────────────────────────
-- Fila nueva y aislada; ningún código deja de funcionar si se borra (vuelve
-- al estado actual: fail-closed por ausencia de fila):
--   DELETE FROM public.feature_flags WHERE flag_name = 'flag_exq_enabled';
