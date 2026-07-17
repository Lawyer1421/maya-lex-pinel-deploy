-- ============================================================
-- Migración: 20260717010000_paypal_state_machine
-- Maya Lex IA — Máquina de estados PayPal (sprint de emergencia)
--
-- Ejecutar en: Supabase SQL Editor  O  scripts/migrate-paypal-state-machine.ts
-- Requiere: supabase/subscriptions.sql ya aplicado (tabla subscriptions,
--           paypal_events, queries_log — no se toca aquí, solo se extiende).
--
-- Corrige el bug confirmado: BILLING.SUBSCRIPTION.CREATED sobrescribía
-- subscriptions.status a 'trialing' incluso cuando el cliente ya estaba
-- 'active', vía un upsert ciego con onConflict:'user_identifier'.
--
-- La regla de oro: check-y-escritura del estado de la suscripción
-- ocurre en UNA sola llamada atómica (esta función, con un advisory lock
-- + SELECT ... FOR UPDATE dentro de la misma transacción implícita del
-- RPC) — nunca como un SELECT desde la API seguido de un UPSERT
-- separado, que es racy entre dos webhooks concurrentes.
--
-- Consumidor: lib/paypal/state-machine.ts → applySubscriptionEvent()
--
-- ── Naturaleza de esta migración ──────────────────────────────
-- 100% ADITIVA: crea 2 tablas nuevas, agrega 1 columna nullable-con-
-- default a paypal_events, y crea/reemplaza 1 función. No modifica ni
-- borra ninguna columna, tabla, fila ni política existente. Segura de
-- aplicar sobre producción sin downtime y sin migrar datos.
--
-- ── Validación posterior (ejecutar tras aplicar) ──────────────
--   select to_regclass('public.billing_duplicate_attempts');       -- no debe ser null
--   select to_regclass('public.billing_verification_attempts');    -- no debe ser null
--   select column_name from information_schema.columns
--     where table_name = 'paypal_events' and column_name = 'requires_reconciliation'; -- 1 fila
--   select proname, prosecdef from pg_proc where proname = 'paypal_apply_event';       -- prosecdef = false (INVOKER)
--   select grantee, privilege_type from information_schema.routine_privileges
--     where routine_name = 'paypal_apply_event';                   -- solo service_role, EXECUTE
--
-- ── Rollback ───────────────────────────────────────────────────
-- Reversible sin pérdida de datos de negocio (las tablas nuevas solo
-- contienen registros de auditoría/rate-limit generados por esta misma
-- migración, no hay backfill de datos preexistentes que perder):
--   drop function if exists paypal_apply_event(text, text, text, text, text, text, boolean, text);
--   drop table if exists billing_duplicate_attempts;
--   drop table if exists billing_verification_attempts;
--   alter table paypal_events drop column if exists requires_reconciliation;
-- Nota: si para cuando se ejecute el rollback ya hay filas reales en
-- billing_duplicate_attempts (intentos de doble suscripción detectados),
-- expórtalas antes de este DROP si se quieren conservar para soporte.
--
-- ── Compatibilidad ────────────────────────────────────────────
-- No cambia la forma de las tablas que ya leen otros consumidores
-- (subscriptions, queries_log) — app/api/chat/route.ts y
-- lib/rate-limit.ts siguen funcionando sin cambios durante y después
-- de aplicar esta migración, incluso antes de desplegar el código de
-- app/api/paypal/webhook/route.ts que la empieza a usar.
-- ============================================================

-- ── Tabla: intentos de doble suscripción detectados ──────────
-- Se llena cuando un evento (CREATED o ACTIVATED) llega referenciando
-- una paypal_sub_id distinta a la que el usuario ya tiene 'active'.
-- Nunca cancela ni reemplaza automáticamente la suscripción activa —
-- solo registra el intento para revisión manual/soporte.
create table if not exists billing_duplicate_attempts (
  id                uuid primary key default gen_random_uuid(),
  user_identifier   text not null,
  active_sub_id     text,
  attempted_sub_id  text,
  event_type        text not null,
  created_at        timestamptz default now()
);

create index if not exists idx_dup_attempts_user on billing_duplicate_attempts(user_identifier);

alter table billing_duplicate_attempts enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'billing_duplicate_attempts' and policyname = 'service_only_billing_duplicate_attempts'
  ) then
    execute $pol$
      create policy "service_only_billing_duplicate_attempts" on billing_duplicate_attempts
        using  ((select auth.role()) = 'service_role')
        with check ((select auth.role()) = 'service_role')
    $pol$;
  end if;
end $$;

grant select, insert, update, delete on billing_duplicate_attempts to service_role;

-- ── paypal_events: marca de "no se pudo resolver con seguridad" ──
-- Usado por PAYMENT.SALE.COMPLETED/INVOICE.PAYMENT_SUCCEEDED cuando el
-- evento no trae suficiente información para identificar la suscripción
-- de forma segura. No concede acceso; genera alerta operativa (log).
alter table paypal_events add column if not exists requires_reconciliation boolean not null default false;

-- ============================================================
-- RPC: paypal_apply_event
--
-- Implementa la matriz de la auditoría (sección 9) para eventos que
-- PUEDEN otorgar o mantener acceso: BILLING.SUBSCRIPTION.CREATED,
-- BILLING.SUBSCRIPTION.ACTIVATED (verificado) y
-- PAYMENT.SALE.COMPLETED/INVOICE.PAYMENT_SUCCEEDED (verificado).
--
-- Los eventos de degradación (CANCELLED/EXPIRED/SUSPENDED/PAYMENT_FAILED)
-- NO pasan por aquí: ya son atómicos hoy porque filtran por
-- paypal_sub_id en un único UPDATE (si la suscripción ya rotó a otro
-- id, el filtro simplemente no matchea ninguna fila — no hay carrera
-- que resolver ahí). Ver app/api/paypal/webhook/route.ts.
--
-- p_grants_access: true SOLO cuando el llamador (state-machine.ts) ya
-- verificó la suscripción contra el recurso canónico de PayPal (GET
-- /v1/billing/subscriptions/{id}) y confirmó status=ACTIVE, plan_id
-- permitido y custom_id perteneciente al usuario. Para CREATED
-- siempre es false.
--
-- Devuelve jsonb: {applied, reason, resulting_status, resulting_tier,
-- resulting_sub_id}. "reason" documenta qué rama de la matriz se tomó,
-- para que el caller decida si debe sincronizar queries_log.
--
-- ── Concurrencia: por qué hay un advisory lock ANTES del SELECT ──
-- `SELECT ... FOR UPDATE` únicamente bloquea filas que YA EXISTEN. Si
-- dos webhooks CREATED concurrentes llegan para un usuario que TODAVÍA
-- no tiene fila en subscriptions, ambos ejecutan el SELECT, ambos
-- obtienen "not found" (no hay fila que bloquear), y ambos intentarían
-- el INSERT del Caso A — el segundo fallaría por la restricción
-- UNIQUE(user_identifier), pero como una excepción de Postgres sin
-- manejar (no como una rama controlada de la matriz).
-- pg_advisory_xact_lock() cierra este hueco: es un lock lógico sobre un
-- entero derivado del user_identifier, tomado ANTES de mirar si la fila
-- existe, y se libera automáticamente al terminar la transacción (commit
-- o rollback) del RPC. Un segundo call para el MISMO user_identifier
-- (exista o no la fila todavía) espera aquí — no en el SELECT — antes
-- de decidir nada. Ver tests/sql/concurrency.test.ts para la prueba
-- contra PostgreSQL real (PGlite) del Caso A concurrente.
-- ============================================================
create or replace function paypal_apply_event(
  p_user_identifier text,
  p_paypal_sub_id    text,
  p_paypal_payer_id  text,
  p_email            text,
  p_tier             text,
  p_new_status       text,
  p_grants_access    boolean,
  p_event_type       text
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_row subscriptions%rowtype;
begin
  if p_tier not in ('pro', 'academico') then
    raise exception 'paypal_apply_event: tier inválido: %', p_tier;
  end if;
  if p_new_status not in ('trialing', 'active', 'cancelled', 'past_due') then
    raise exception 'paypal_apply_event: status inválido: %', p_new_status;
  end if;

  -- Serializa TODAS las llamadas concurrentes para este user_identifier,
  -- exista o no la fila todavía (ver nota de concurrencia arriba).
  -- hashtext() es determinista: el mismo user_identifier siempre produce
  -- la misma clave de lock, sin importar el proceso/conexión que llame.
  perform pg_advisory_xact_lock(hashtext(p_user_identifier));

  -- Con el advisory lock ya tomado, esto además bloquea la fila (si
  -- existe) por el resto de esta transacción — defensa en profundidad,
  -- redundante con el advisory lock para el caso "fila existe" pero
  -- necesaria para que el snapshot de v_row sea el más reciente.
  select * into v_row from subscriptions where user_identifier = p_user_identifier for update;

  -- Caso A: no existe suscripción local todavía.
  if not found then
    insert into subscriptions (
      user_identifier, paypal_sub_id, paypal_payer_id, email, tier, status, updated_at
    ) values (
      p_user_identifier, p_paypal_sub_id, p_paypal_payer_id, p_email, p_tier, p_new_status, now()
    );
    return jsonb_build_object(
      'applied', true, 'reason', 'created',
      'resulting_status', p_new_status, 'resulting_tier', p_tier, 'resulting_sub_id', p_paypal_sub_id
    );
  end if;

  -- Caso B: misma suscripción (o la fila local aún no tiene paypal_sub_id
  -- asignado — p.ej. una fila legada). Nunca degradar active/past_due a
  -- trialing con un CREATED tardío/duplicado de la MISMA suscripción.
  if v_row.paypal_sub_id is null or v_row.paypal_sub_id = p_paypal_sub_id then
    if p_new_status = 'trialing' and v_row.status in ('active', 'past_due') and not p_grants_access then
      return jsonb_build_object(
        'applied', false, 'reason', 'ignored_no_downgrade',
        'resulting_status', v_row.status, 'resulting_tier', v_row.tier, 'resulting_sub_id', v_row.paypal_sub_id
      );
    end if;

    update subscriptions set
      paypal_sub_id   = p_paypal_sub_id,
      paypal_payer_id = coalesce(p_paypal_payer_id, paypal_payer_id),
      email           = coalesce(p_email, email),
      tier            = p_tier,
      status          = p_new_status,
      updated_at      = now()
    where user_identifier = p_user_identifier;

    return jsonb_build_object(
      'applied', true, 'reason', 'updated',
      'resulting_status', p_new_status, 'resulting_tier', p_tier, 'resulting_sub_id', p_paypal_sub_id
    );
  end if;

  -- A partir de aquí: existe una suscripción local con OTRO paypal_sub_id.

  -- Caso C: la suscripción activa actual es de un id distinto — nunca la
  -- tocamos ni la reemplazamos automáticamente, sin importar si el evento
  -- entrante es CREATED o un ACTIVATED ya verificado. Solo se registra
  -- para revisión (soporte decide manualmente cuál es la suscripción real).
  if v_row.status = 'active' then
    insert into billing_duplicate_attempts (user_identifier, active_sub_id, attempted_sub_id, event_type)
    values (p_user_identifier, v_row.paypal_sub_id, p_paypal_sub_id, p_event_type);

    return jsonb_build_object(
      'applied', false, 'reason', 'duplicate_active_subscription',
      'resulting_status', v_row.status, 'resulting_tier', v_row.tier, 'resulting_sub_id', v_row.paypal_sub_id
    );
  end if;

  -- Caso D: la suscripción local existente NO está activa (pending,
  -- trialing, cancelled, past_due) y el nuevo evento trae un sub_id
  -- distinto — es un nuevo intento de pago (reintento tras cancelación,
  -- o el usuario nunca completó el primero).
  if p_grants_access then
    -- El nuevo intento ya fue verificado como ACTIVE en PayPal: adoptarlo.
    update subscriptions set
      paypal_sub_id   = p_paypal_sub_id,
      paypal_payer_id = coalesce(p_paypal_payer_id, paypal_payer_id),
      email           = coalesce(p_email, email),
      tier            = p_tier,
      status          = p_new_status,
      updated_at      = now()
    where user_identifier = p_user_identifier;

    return jsonb_build_object(
      'applied', true, 'reason', 'reactivated_new_subscription',
      'resulting_status', p_new_status, 'resulting_tier', p_tier, 'resulting_sub_id', p_paypal_sub_id
    );
  end if;

  if p_new_status = 'trialing' then
    -- Registrar el nuevo intento pendiente, SIN conceder acceso.
    update subscriptions set
      paypal_sub_id   = p_paypal_sub_id,
      paypal_payer_id = coalesce(p_paypal_payer_id, paypal_payer_id),
      email           = coalesce(p_email, email),
      tier            = p_tier,
      status          = 'trialing',
      updated_at      = now()
    where user_identifier = p_user_identifier;

    return jsonb_build_object(
      'applied', true, 'reason', 'new_attempt_registered',
      'resulting_status', 'trialing', 'resulting_tier', p_tier, 'resulting_sub_id', p_paypal_sub_id
    );
  end if;

  -- Evento no otorgante (p.ej. un PAYMENT.SALE.COMPLETED sin verificar
  -- para un sub_id que ya no es el vigente) referenciando un intento que
  -- ya fue reemplazado — se ignora, no se pisa el estado actual.
  return jsonb_build_object(
    'applied', false, 'reason', 'stale_event_ignored',
    'resulting_status', v_row.status, 'resulting_tier', v_row.tier, 'resulting_sub_id', v_row.paypal_sub_id
  );
end;
$$;

-- ── Permisos de la RPC — solo el backend puede ejecutarla ─────
-- IMPORTANTE: Postgres otorga EXECUTE a PUBLIC automáticamente al crear
-- una función (a diferencia de las tablas, que no otorgan nada a PUBLIC
-- por defecto). Sin el REVOKE explícito de abajo, cualquier cliente con
-- la anon key o un usuario autenticado normal podría invocar esta RPC
-- de facturación directamente via PostgREST. RLS en las tablas ofrece
-- una segunda capa (la función es SECURITY INVOKER, así que corre con
-- los privilegios del rol que llama — un INSERT/UPDATE de 'anon' sería
-- rechazado por las políticas "service_only_*"), pero no hay que
-- depender solo de esa segunda capa: se revoca el EXECUTE mismo.
revoke all on function paypal_apply_event(text, text, text, text, text, text, boolean, text) from public;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function paypal_apply_event(text, text, text, text, text, text, boolean, text) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on function paypal_apply_event(text, text, text, text, text, text, boolean, text) from authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function paypal_apply_event(text, text, text, text, text, text, boolean, text) to service_role';
  end if;
end $$;

-- ── Rate limiting de /api/paypal/verificar-estado ─────────────
-- Endpoint de usuario (no admin) — un cliente impaciente reintentando
-- cada segundo no debe poder martillar la API de PayPal ni la RPC.
create table if not exists billing_verification_attempts (
  user_identifier   text primary key,
  last_attempt_at   timestamptz not null default now(),
  attempt_count     integer not null default 1
);

alter table billing_verification_attempts enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'billing_verification_attempts' and policyname = 'service_only_billing_verification_attempts'
  ) then
    execute $pol$
      create policy "service_only_billing_verification_attempts" on billing_verification_attempts
        using  ((select auth.role()) = 'service_role')
        with check ((select auth.role()) = 'service_role')
    $pol$;
  end if;
end $$;

grant select, insert, update, delete on billing_verification_attempts to service_role;
