-- ============================================================
-- Maya Lex IA — Suscripciones PayPal + Rate Limiting  (idempotente)
-- Ejecutar en: Supabase SQL Editor  O  npm run migrate:analytics
--
-- Consumidores:
--   app/api/paypal/webhook/route.ts         (subscriptions, paypal_events, queries_log)
--   app/api/paypal/create-subscription/...  (subscriptions — fila 'pending')
--   lib/rate-limit.ts                        (queries_log)
-- ============================================================

-- ── Tabla: subscriptions ─────────────────────────────────────
-- user_identifier UNIQUE es OBLIGATORIO: el webhook y create-subscription
-- hacen upsert con onConflict: 'user_identifier'.
create table if not exists subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  user_identifier     text unique not null,   -- mismo formato que lib/rate-limit.ts
  paypal_sub_id       text,
  paypal_payer_id     text,
  email               text,
  tier                text not null default 'free',      -- free | pro | academico | admin
  status              text not null default 'pending',   -- pending | trialing | active | cancelled | past_due
  current_period_end  timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- El webhook busca por paypal_sub_id en CANCELLED/PAYMENT y en resolverUserIdentifier
create index if not exists idx_subs_paypal_sub on subscriptions(paypal_sub_id);
create index if not exists idx_subs_status      on subscriptions(status);

-- ── Tabla: paypal_events (idempotencia de webhook) ───────────
create table if not exists paypal_events (
  transmission_id  text primary key,
  event_type       text not null,
  processed_at     timestamptz default now()
);

-- TTL manual: PayPal reintenta máx 3 días; limpiar >30 días es seguro
create index if not exists idx_paypal_events_processed on paypal_events(processed_at);

-- ── Tabla: queries_log (rate limiting diario) ────────────────
-- UNIQUE(user_identifier, query_date) es OBLIGATORIO:
-- lib/rate-limit.ts hace upsert con onConflict: 'user_identifier,query_date'.
create table if not exists queries_log (
  id               uuid primary key default gen_random_uuid(),
  user_identifier  text not null,
  query_date       date not null default current_date,
  query_count      integer not null default 0,
  tier             text not null default 'free',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique (user_identifier, query_date)
);

create index if not exists idx_queries_log_user on queries_log(user_identifier);

-- ── RLS: solo service_role (las API routes usan SERVICE_ROLE_KEY) ──
alter table subscriptions enable row level security;
alter table paypal_events  enable row level security;
alter table queries_log    enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'subscriptions' and policyname = 'service_only_subscriptions'
  ) then
    execute $pol$
      create policy "service_only_subscriptions" on subscriptions
        using  ((select auth.role()) = 'service_role')
        with check ((select auth.role()) = 'service_role')
    $pol$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'paypal_events' and policyname = 'service_only_paypal_events'
  ) then
    execute $pol$
      create policy "service_only_paypal_events" on paypal_events
        using  ((select auth.role()) = 'service_role')
        with check ((select auth.role()) = 'service_role')
    $pol$;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'queries_log' and policyname = 'service_only_queries_log'
  ) then
    execute $pol$
      create policy "service_only_queries_log" on queries_log
        using  ((select auth.role()) = 'service_role')
        with check ((select auth.role()) = 'service_role')
    $pol$;
  end if;
end $$;

-- ── Parche para instalaciones previas (columnas nuevas) ──────
-- Si subscriptions ya existía sin la columna email, agregarla.
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'subscriptions' and column_name = 'email'
  ) then
    alter table subscriptions add column email text;
  end if;
end $$;

-- ── Privilegios de tabla (NO confundir con RLS) ───────────────
-- Al crear tablas via conexión SQL directa (psql/pooler) en vez del
-- SQL Editor del dashboard, Supabase no otorga los GRANTs estándar de
-- PostgREST automáticamente. service_role tiene BYPASSRLS=true, pero
-- eso solo omite las POLICIES — el GRANT de tabla sigue siendo exigido.
grant select, insert, update, delete on subscriptions  to service_role;
grant select, insert, update, delete on paypal_events  to service_role;
grant select, insert, update, delete on queries_log    to service_role;
