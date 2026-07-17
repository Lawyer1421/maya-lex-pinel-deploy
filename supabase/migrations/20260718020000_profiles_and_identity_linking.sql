-- ============================================================
-- Migración: 20260718020000_profiles_and_identity_linking
-- Fase 4/5 de la modernización de identidad
--
-- profiles: espejo mínimo de auth.users en el esquema public, creado
-- IDEMPOTENTEMENTE por un trigger en auth.users (se dispara una sola
-- vez por usuario real creado — nunca por callbacks repetidos, porque
-- no está atado al callback sino a la creación real en auth.users).
--
-- identity_link_events: auditoría de intentos de vinculación de
-- identidades (Google ↔ correo/contraseña) — nunca fusiona cuentas
-- automáticamente, solo registra qué pasó.
-- ============================================================

create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  display_name text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_profiles_email on profiles(lower(email));

-- ── Creación idempotente de profile ────────────────────────────
-- Se dispara UNA vez por fila nueva en auth.users (no por login, no por
-- callback repetido) — así se evita el "perfil duplicado si el
-- callback se repite" que pide la Fase 4.
create or replace function handle_new_auth_user() returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- ── Auditoría de vinculación de identidades ────────────────────
-- Se llena cuando alguien intenta iniciar sesión con Google y su correo
-- coincide con una cuenta existente creada por correo/contraseña (o
-- viceversa). NUNCA se fusiona automáticamente solo por esto — cada
-- intento queda registrado para que la aplicación decida (reautenticar,
-- pedir vinculación explícita, o marcar para revisión administrativa).
create table if not exists identity_link_events (
  id                  uuid primary key default gen_random_uuid(),
  existing_user_id    uuid references auth.users(id) on delete set null,
  attempted_provider  text not null,      -- 'google' | 'email'
  attempted_email     text not null,
  email_verified      boolean not null,
  outcome             text not null,      -- ver check constraint
  created_at          timestamptz not null default now(),

  constraint identity_link_outcome_check
    check (outcome in (
      'new_account_created',
      'linked_after_reauth',
      'blocked_unverified_email',
      'blocked_awaiting_manual_link',
      'flagged_duplicate_for_review'
    ))
);

create index if not exists idx_identity_link_events_email on identity_link_events(lower(attempted_email));

-- ── Permisos ────────────────────────────────────────────────────
alter table profiles enable row level security;
alter table identity_link_events enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'service_only_profiles') then
    execute $pol$
      create policy "service_only_profiles" on profiles
        using  ((select auth.role()) = 'service_role')
        with check ((select auth.role()) = 'service_role')
    $pol$;
  end if;
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'read_own_profile') then
    execute $pol$
      create policy "read_own_profile" on profiles
        for select
        using ((select auth.uid()) = id)
    $pol$;
  end if;
  if not exists (select 1 from pg_policies where tablename = 'identity_link_events' and policyname = 'service_only_identity_link_events') then
    execute $pol$
      create policy "service_only_identity_link_events" on identity_link_events
        using  ((select auth.role()) = 'service_role')
        with check ((select auth.role()) = 'service_role')
    $pol$;
  end if;
end $$;

grant select, insert, update, delete on profiles to service_role;
grant select on profiles to authenticated;
grant select, insert, update, delete on identity_link_events to service_role;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on profiles from anon';
    execute 'revoke all on identity_link_events from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on identity_link_events from authenticated';
  end if;
end $$;

-- ============================================================
-- Validación posterior:
--   select to_regclass('public.profiles');
--   select to_regclass('public.identity_link_events');
--   select tgname from pg_trigger where tgrelid = 'auth.users'::regclass;
--   -- debe incluir on_auth_user_created
--
-- Rollback:
--   drop trigger if exists on_auth_user_created on auth.users;
--   drop function if exists handle_new_auth_user();
--   drop table if exists identity_link_events;
--   drop table if exists profiles;
--
-- Compatibilidad: no toca ninguna tabla de facturación. Un usuario que
-- ya exista en auth.users ANTES de esta migración no tendrá fila en
-- profiles automáticamente (el trigger solo dispara en INSERTs nuevos)
-- — requiere un backfill explícito y separado si se quiere profiles
-- para usuarios históricos (no incluido aquí, ver reporte de Fase 3).
-- ============================================================
