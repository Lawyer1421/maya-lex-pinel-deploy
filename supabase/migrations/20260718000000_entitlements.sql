-- ============================================================
-- Migración: 20260718000000_entitlements
-- Fase 2 de la modernización de identidad (auth-uuid-google-pro)
--
-- Crea la tabla entitlements: la futura fuente única de "¿este usuario
-- tiene acceso a X?", independiente de CÓMO lo obtuvo (suscripción
-- PayPal, pago único, cortesía manual, contrato institucional, o
-- arrastrado de una migración de datos).
--
-- 100% ADITIVA. No toca subscriptions/queries_log/paypal_events. No
-- crea NINGÚN entitlement todavía — la tabla nace vacía. El backfill
-- desde datos existentes es una decisión operativa posterior y
-- explícitamente fuera de alcance de esta migración (Fase 1 del
-- informe de identidad: "no reconciliar automáticamente").
--
-- user_id referencia auth.users(id) — el UUID que Supabase Auth YA
-- asigna a cada usuario desde su registro. No se genera ningún UUID
-- nuevo aquí: se usa el que ya existe.
-- ============================================================

create table if not exists entitlements (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  entitlement_key   text not null,        -- p.ej. 'pro_access', 'academico_access'
  source_type       text not null,
  source_reference  text,                 -- p.ej. paypal_sub_id, nota manual, contrato
  status            text not null default 'active',
  active_from       timestamptz not null default now(),
  active_until      timestamptz,
  granted_by        uuid references auth.users(id),  -- admin que otorgó manualmente (nullable)
  reason            text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint entitlements_status_check
    check (status in ('active', 'revoked', 'expired')),
  constraint entitlements_source_type_check
    check (source_type in (
      'paypal_subscription', 'paypal_one_time_payment',
      'manual_beta', 'manual_comped', 'institution_contract', 'migration'
    ))
);

create index if not exists idx_entitlements_user_status on entitlements(user_id, status);
create index if not exists idx_entitlements_key on entitlements(entitlement_key);

-- No duplicar un entitlement ACTIVO incompatible: como máximo un
-- entitlement 'active' por (user_id, entitlement_key) a la vez. Si se
-- necesita otorgar un reemplazo, el anterior debe revocarse primero
-- (status='revoked'), nunca coexistir dos 'active' para la misma clave.
create unique index if not exists idx_entitlements_one_active_per_key
  on entitlements(user_id, entitlement_key)
  where status = 'active';

-- ── Auditoría de cambios de entitlement ────────────────────────
create table if not exists entitlement_audit_events (
  id                uuid primary key default gen_random_uuid(),
  entitlement_id    uuid references entitlements(id) on delete set null,
  user_id           uuid not null,
  action            text not null,   -- 'granted' | 'revoked' | 'expired' | 'updated'
  before_status     text,
  after_status      text,
  performed_by      uuid,            -- nullable: null = sistema/automático
  reason            text,
  created_at        timestamptz not null default now(),

  constraint entitlement_audit_action_check
    check (action in ('granted', 'revoked', 'expired', 'updated'))
);

create index if not exists idx_entitlement_audit_user on entitlement_audit_events(user_id);

-- ── Triggers: mantiene updated_at + registra auditoría automáticamente ──
-- Separados a propósito: el mantenimiento de updated_at debe correr
-- BEFORE (para poder modificar NEW), pero el log de auditoría tiene una
-- FK hacia entitlements(id) — esa fila todavía NO EXISTE durante un
-- BEFORE INSERT, así que el log debe correr AFTER (cuando la fila ya
-- está confirmada y la FK puede resolver).
create or replace function entitlements_set_updated_at() returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function entitlements_audit_trigger() returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if TG_OP = 'INSERT' then
    insert into entitlement_audit_events (entitlement_id, user_id, action, before_status, after_status, reason)
    values (new.id, new.user_id, 'granted', null, new.status, new.reason);
    return new;
  elsif TG_OP = 'UPDATE' then
    insert into entitlement_audit_events (entitlement_id, user_id, action, before_status, after_status, reason)
    values (
      new.id, new.user_id,
      case when new.status = 'revoked' and old.status <> 'revoked' then 'revoked'
           when new.status = 'expired' and old.status <> 'expired' then 'expired'
           else 'updated' end,
      old.status, new.status, new.reason
    );
    return new;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_entitlements_audit on entitlements;
drop trigger if exists trg_entitlements_updated_at on entitlements;
drop trigger if exists trg_entitlements_audit_after on entitlements;

create trigger trg_entitlements_updated_at
  before insert or update on entitlements
  for each row execute function entitlements_set_updated_at();

create trigger trg_entitlements_audit_after
  after insert or update on entitlements
  for each row execute function entitlements_audit_trigger();

-- ── Permisos — únicamente backend (service_role) ───────────────
alter table entitlements enable row level security;
alter table entitlement_audit_events enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'entitlements' and policyname = 'service_only_entitlements'
  ) then
    execute $pol$
      create policy "service_only_entitlements" on entitlements
        using  ((select auth.role()) = 'service_role')
        with check ((select auth.role()) = 'service_role')
    $pol$;
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'entitlement_audit_events' and policyname = 'service_only_entitlement_audit_events'
  ) then
    execute $pol$
      create policy "service_only_entitlement_audit_events" on entitlement_audit_events
        using  ((select auth.role()) = 'service_role')
        with check ((select auth.role()) = 'service_role')
    $pol$;
  end if;
end $$;

grant select, insert, update, delete on entitlements to service_role;
grant select, insert, update, delete on entitlement_audit_events to service_role;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on entitlements from anon';
    execute 'revoke all on entitlement_audit_events from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on entitlements from authenticated';
    execute 'revoke all on entitlement_audit_events from authenticated';
  end if;
end $$;

-- ============================================================
-- Validación posterior:
--   select to_regclass('public.entitlements');
--   select to_regclass('public.entitlement_audit_events');
--   select indexname from pg_indexes where tablename = 'entitlements';
--   select conname from pg_constraint where conrelid = 'entitlements'::regclass;
--
-- Rollback (sin pérdida de datos de negocio — la tabla nace vacía en
-- esta migración; solo verificar que no se haya usado en producción
-- antes de revertir si ya se otorgaron entitlements reales):
--   drop trigger if exists trg_entitlements_audit on entitlements;
--   drop function if exists entitlements_audit_trigger();
--   drop table if exists entitlement_audit_events;
--   drop table if exists entitlements;
--
-- Compatibilidad: no modifica subscriptions/queries_log/paypal_events.
-- resolveEntitlement() (lib/entitlements.ts) es aditivo: si no hay fila
-- en entitlements, cae al adaptador legado (resolveCurrentAccess) sin
-- romper nada existente.
-- ============================================================
