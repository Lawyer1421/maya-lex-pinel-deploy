-- ============================================================
-- Migración: 20260718010000_identity_uuid_expand
-- Fase 3 (EXPAND) de la modernización de identidad
--
-- Objetivo final: auth.users.id (UUID que Supabase Auth ya asigna a
-- cada usuario desde su registro) como identidad interna única,
-- reemplazando gradualmente a userIdentifier ('email:{correo}').
--
-- Esta migración es SOLO la fase EXPAND del patrón expand/contract:
-- agrega columnas user_id NULLABLES a las tablas que autorizan o
-- auditan acceso, sin quitar ni renombrar user_identifier todavía.
-- Ninguna escritura existente se rompe. El backfill (llenar estas
-- columnas para las filas ya existentes) es un paso POSTERIOR y
-- separado — ver scripts/backfill-report-identity-uuid.ts para el
-- reporte de qué se podría backfillear y con qué nivel de certeza,
-- SIN ejecutar ningún UPDATE todavía.
--
-- 100% ADITIVA. No aplicada a producción en esta fase (solo probada
-- contra PGlite) — requiere autorización explícita adicional antes de
-- aplicarse contra el Supabase real, igual que las migraciones previas.
-- ============================================================

alter table subscriptions add column if not exists user_id uuid references auth.users(id);
alter table queries_log add column if not exists user_id uuid references auth.users(id);
alter table paypal_events add column if not exists user_id uuid references auth.users(id);
alter table billing_state_transitions add column if not exists user_id uuid references auth.users(id);
alter table billing_duplicate_attempts add column if not exists user_id uuid references auth.users(id);

create index if not exists idx_subscriptions_user_id on subscriptions(user_id);
create index if not exists idx_queries_log_user_id on queries_log(user_id);
create index if not exists idx_paypal_events_user_id on paypal_events(user_id);

-- ============================================================
-- Validación posterior:
--   select column_name from information_schema.columns
--     where table_name = 'subscriptions' and column_name = 'user_id';
--   (repetir para queries_log, paypal_events, billing_state_transitions,
--    billing_duplicate_attempts)
--
-- Rollback (sin pérdida de datos — las columnas nuevas son nullable y
-- no se han backfilleado en esta fase):
--   alter table subscriptions drop column if exists user_id;
--   alter table queries_log drop column if exists user_id;
--   alter table paypal_events drop column if exists user_id;
--   alter table billing_state_transitions drop column if exists user_id;
--   alter table billing_duplicate_attempts drop column if exists user_id;
--
-- Compatibilidad: user_identifier sigue siendo NOT NULL y sigue siendo
-- lo único que lee el código hoy (lib/rate-limit.ts,
-- lib/paypal/access.ts, lib/paypal/state-machine.ts). Nada deja de
-- funcionar por aplicar esta migración — user_id simplemente existe,
-- vacío, hasta que se decida backfillear y cambiar los puntos de
-- lectura (fase CONTRACT, posterior y fuera de alcance de esta
-- entrega).
-- ============================================================
