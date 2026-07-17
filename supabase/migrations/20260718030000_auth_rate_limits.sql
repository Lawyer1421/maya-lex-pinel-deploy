-- ============================================================
-- Migración: 20260718030000_auth_rate_limits
-- Fase 4 — rate limiting para reenvío de confirmación de correo.
-- 100% aditiva.
-- ============================================================
create table if not exists auth_resend_attempts (
  email_normalized  text primary key,
  last_attempt_at   timestamptz not null default now(),
  attempt_count     integer not null default 1
);

alter table auth_resend_attempts enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'auth_resend_attempts' and policyname = 'service_only_auth_resend_attempts') then
    execute $pol$
      create policy "service_only_auth_resend_attempts" on auth_resend_attempts
        using  ((select auth.role()) = 'service_role')
        with check ((select auth.role()) = 'service_role')
    $pol$;
  end if;
end $$;

grant select, insert, update, delete on auth_resend_attempts to service_role;

-- Rollback: drop table if exists auth_resend_attempts;
