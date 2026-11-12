-- ═══════════════════════════════════════════════════════════════════════════
-- 20261112000000_stripe_billing_foundation.sql
--
-- Base de facturación agnóstica de proveedor (PayPal + Stripe).
-- ALCANCE: SOLO STAGING. NO aplicar en producción sin aprobación expresa del Titular.
-- Rollback: supabase/rollbacks/20261112000000_stripe_billing_foundation_rollback.sql
--
-- Compatibilidad con producción (verificado 2026-11-12, solo lectura): 13 filas en subscriptions, las 13 con paypal_sub_id DISTINTO,
-- 7 con paypal_payer_id y todos los status dentro de ('pending','trialing','active','cancelled','past_due').
--
--  1. subscriptions: columnas neutras provider / provider_customer_id / provider_subscription_id, con backfill idempotente desde PayPal.
--  2. status: CHECK con los valores que el código ya escribe. «pending» es legítimo (create-subscription lo escribe antes de la aprobación
--     de PayPal; access.ts y duplicate-guard.ts lo leen): se ALINEA el tipo de código, no se cambia el default.
--  3. Historial: subscription_provider_history guarda la fila anterior cada vez que cambia el proveedor o la suscripción vigente.
--  4. Trigger: las columnas neutras se mantienen solas cuando el código de PayPal (sin cambios) escribe paypal_sub_id / paypal_payer_id.
--  5. paypal_apply_event: IDÉNTICA a 20260717020000 más una guarda que impide pisar una suscripción vigente de Stripe.
--  6. stripe_events: idempotencia del webhook (event_id PK), como paypal_events.
--  7. stripe_apply_event: única puerta de escritura de Stripe, atómica, misma auditoría (billing_state_transitions) y el mismo espejo de
--     acceso (queries_log) que PayPal, para que resolveCurrentAccess funcione igual con ambos proveedores.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Columnas neutras + backfill ───────────────────────────────────────────
alter table subscriptions add column if not exists provider text not null default 'paypal';
alter table subscriptions add column if not exists provider_customer_id text;
alter table subscriptions add column if not exists provider_subscription_id text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_provider_check' and conrelid = 'subscriptions'::regclass) then
    alter table subscriptions add constraint subscriptions_provider_check check (provider in ('paypal', 'stripe'));
  end if;
end $$;

-- Idempotente: solo filas PayPal aún sin datos neutros. No toca tier, status ni fechas.
update subscriptions
   set provider_subscription_id = paypal_sub_id,
       provider_customer_id     = paypal_payer_id
 where provider = 'paypal'
   and provider_subscription_id is null
   and provider_customer_id is null
   and (paypal_sub_id is not null or paypal_payer_id is not null);

-- Una misma suscripción del proveedor no puede quedar ligada a dos usuarios.
create unique index if not exists idx_subs_provider_subscription
  on subscriptions (provider, provider_subscription_id)
  where provider_subscription_id is not null;
create index if not exists idx_subs_provider_customer on subscriptions (provider, provider_customer_id);

-- ── 2. Estados válidos (los que el código ya escribe) ────────────────────────
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_status_check' and conrelid = 'subscriptions'::regclass) then
    alter table subscriptions add constraint subscriptions_status_check
      check (status in ('pending', 'trialing', 'active', 'cancelled', 'past_due'));
  end if;
end $$;

-- ── 3. Historial de proveedor / suscripción (append-only) ────────────────────
create table if not exists subscription_provider_history (
  id                        uuid primary key default gen_random_uuid(),
  user_identifier           text not null,
  provider                  text not null,
  provider_customer_id      text,
  provider_subscription_id  text,
  paypal_sub_id             text,
  paypal_payer_id           text,
  tier                      text not null,
  status                    text not null,
  current_period_end        timestamptz,
  replaced_by_provider      text not null,
  replaced_by_subscription  text,
  reason                    text not null,
  recorded_at               timestamptz not null default now()
);
create index if not exists idx_sub_provider_history_user on subscription_provider_history (user_identifier, recorded_at);

alter table subscription_provider_history enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'subscription_provider_history' and policyname = 'service_only_subscription_provider_history') then
    execute $pol$
      create policy "service_only_subscription_provider_history" on subscription_provider_history
        using  ((select auth.role()) = 'service_role')
        with check ((select auth.role()) = 'service_role')
    $pol$;
  end if;
end $$;
grant select, insert on subscription_provider_history to service_role;

-- ── 4. Trigger: sincroniza columnas neutras y guarda historial ───────────────
create or replace function subscriptions_sync_provider() returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if new.provider = 'paypal' and new.paypal_sub_id is not null then
      new.provider_subscription_id := coalesce(new.provider_subscription_id, new.paypal_sub_id);
      new.provider_customer_id     := coalesce(new.provider_customer_id, new.paypal_payer_id);
    end if;
    return new;
  end if;

  -- El código de PayPal (sin cambios) escribe una suscripción PayPal nueva: PayPal pasa a ser el proveedor vigente.
  if new.paypal_sub_id is not null and new.paypal_sub_id is distinct from old.paypal_sub_id then
    new.provider                 := 'paypal';
    new.provider_subscription_id := new.paypal_sub_id;
    new.provider_customer_id     := coalesce(new.paypal_payer_id, case when old.provider = 'paypal' then old.provider_customer_id end);
  elsif new.provider = 'paypal' and new.paypal_payer_id is distinct from old.paypal_payer_id and new.paypal_payer_id is not null then
    new.provider_customer_id := new.paypal_payer_id;
  end if;

  -- Historial: cambio de proveedor o de suscripción vigente. Nunca se pierde la fila anterior.
  if (new.provider is distinct from old.provider)
     or (old.provider_subscription_id is not null and new.provider_subscription_id is distinct from old.provider_subscription_id) then
    insert into subscription_provider_history (
      user_identifier, provider, provider_customer_id, provider_subscription_id, paypal_sub_id, paypal_payer_id,
      tier, status, current_period_end, replaced_by_provider, replaced_by_subscription, reason
    ) values (
      old.user_identifier, old.provider, old.provider_customer_id, old.provider_subscription_id, old.paypal_sub_id, old.paypal_payer_id,
      old.tier, old.status, old.current_period_end, new.provider, new.provider_subscription_id,
      case when new.provider is distinct from old.provider then 'provider_switch' else 'subscription_replaced' end
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_subscriptions_sync_provider on subscriptions;
create trigger trg_subscriptions_sync_provider
  before insert or update on subscriptions
  for each row execute function subscriptions_sync_provider();

-- ── 5. paypal_apply_event: igual a 20260717020000 + guarda de Stripe ─────────
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
  v_result jsonb;
  v_before_status text;
  v_before_tier text;
begin
  if p_tier not in ('pro', 'academico') then
    raise exception 'paypal_apply_event: tier inválido: %', p_tier;
  end if;
  if p_new_status not in ('trialing', 'active', 'cancelled', 'past_due') then
    raise exception 'paypal_apply_event: status inválido: %', p_new_status;
  end if;

  -- hashtextextended(text, seed) devuelve bigint (64 bits) — mucho menor
  -- probabilidad de colisión entre dos user_identifier distintos que
  -- hashtext (32 bits). El seed 0 es arbitrario pero debe mantenerse
  -- constante: cambiarlo cambiaría qué claves de lock corresponden a
  -- qué usuario, sin afectar corrección (solo estadística de colisión).
  perform pg_advisory_xact_lock(hashtextextended(p_user_identifier, 0));

  select * into v_row from subscriptions where user_identifier = p_user_identifier for update;
  v_before_status := v_row.status;
  v_before_tier := v_row.tier;

  -- Caso A: no existe suscripción local todavía.
  if not found then
    insert into subscriptions (
      user_identifier, paypal_sub_id, paypal_payer_id, email, tier, status, updated_at
    ) values (
      p_user_identifier, p_paypal_sub_id, p_paypal_payer_id, p_email, p_tier, p_new_status, now()
    );
    v_result := jsonb_build_object(
      'applied', true, 'reason', 'created',
      'resulting_status', p_new_status, 'resulting_tier', p_tier, 'resulting_sub_id', p_paypal_sub_id
    );

  -- Caso B: misma suscripción (o fila legada sin paypal_sub_id aún).
  -- Fase Stripe (2026-11-12): una suscripción VIGENTE de Stripe nunca se pisa con un evento de PayPal (p. ej. un ACTIVATED tardío de
  -- una suscripción PayPal anterior al cambio de proveedor, cuya fila ya no conserva paypal_sub_id). Se registra como duplicado.
  elsif coalesce(v_row.provider, 'paypal') = 'stripe' and v_row.status in ('active', 'trialing', 'past_due') then
    insert into billing_duplicate_attempts (user_identifier, active_sub_id, attempted_sub_id, event_type)
    values (p_user_identifier, v_row.provider_subscription_id, p_paypal_sub_id, p_event_type);
    v_result := jsonb_build_object(
      'applied', false, 'reason', 'duplicate_active_subscription',
      'resulting_status', v_row.status, 'resulting_tier', v_row.tier, 'resulting_sub_id', v_row.provider_subscription_id
    );
  elsif v_row.paypal_sub_id is null or v_row.paypal_sub_id = p_paypal_sub_id then
    if p_new_status = 'trialing' and v_row.status in ('active', 'past_due') and not p_grants_access then
      v_result := jsonb_build_object(
        'applied', false, 'reason', 'ignored_no_downgrade',
        'resulting_status', v_row.status, 'resulting_tier', v_row.tier, 'resulting_sub_id', v_row.paypal_sub_id
      );
    else
      update subscriptions set
        paypal_sub_id   = p_paypal_sub_id,
        paypal_payer_id = coalesce(p_paypal_payer_id, paypal_payer_id),
        email           = coalesce(p_email, email),
        tier            = p_tier,
        status          = p_new_status,
        updated_at      = now()
      where user_identifier = p_user_identifier;
      v_result := jsonb_build_object(
        'applied', true, 'reason', 'updated',
        'resulting_status', p_new_status, 'resulting_tier', p_tier, 'resulting_sub_id', p_paypal_sub_id
      );
    end if;

  -- Caso C: suscripción activa distinta — nunca se toca, solo se registra.
  elsif v_row.status = 'active' then
    insert into billing_duplicate_attempts (user_identifier, active_sub_id, attempted_sub_id, event_type)
    values (p_user_identifier, v_row.paypal_sub_id, p_paypal_sub_id, p_event_type);
    v_result := jsonb_build_object(
      'applied', false, 'reason', 'duplicate_active_subscription',
      'resulting_status', v_row.status, 'resulting_tier', v_row.tier, 'resulting_sub_id', v_row.paypal_sub_id
    );

  -- Caso D: suscripción local no activa + nuevo sub_id distinto.
  elsif p_grants_access then
    update subscriptions set
      paypal_sub_id   = p_paypal_sub_id,
      paypal_payer_id = coalesce(p_paypal_payer_id, paypal_payer_id),
      email           = coalesce(p_email, email),
      tier            = p_tier,
      status          = p_new_status,
      updated_at      = now()
    where user_identifier = p_user_identifier;
    v_result := jsonb_build_object(
      'applied', true, 'reason', 'reactivated_new_subscription',
      'resulting_status', p_new_status, 'resulting_tier', p_tier, 'resulting_sub_id', p_paypal_sub_id
    );

  elsif p_new_status = 'trialing' then
    update subscriptions set
      paypal_sub_id   = p_paypal_sub_id,
      paypal_payer_id = coalesce(p_paypal_payer_id, paypal_payer_id),
      email           = coalesce(p_email, email),
      tier            = p_tier,
      status          = 'trialing',
      updated_at      = now()
    where user_identifier = p_user_identifier;
    v_result := jsonb_build_object(
      'applied', true, 'reason', 'new_attempt_registered',
      'resulting_status', 'trialing', 'resulting_tier', p_tier, 'resulting_sub_id', p_paypal_sub_id
    );

  else
    v_result := jsonb_build_object(
      'applied', false, 'reason', 'stale_event_ignored',
      'resulting_status', v_row.status, 'resulting_tier', v_row.tier, 'resulting_sub_id', v_row.paypal_sub_id
    );
  end if;

  -- Escritura atómica de queries_log — SOLO cuando el resultado de esta
  -- MISMA transacción quedó 'active' otorgado (nunca en 'trialing' ni en
  -- ramas no aplicadas). Reemplaza a la antigua syncLegacyPaidAccess()
  -- de TypeScript, que era una segunda llamada/transacción separada.
  if (v_result->>'applied')::boolean and (v_result->>'resulting_status') = 'active' then
    insert into queries_log (user_identifier, query_date, query_count, tier, updated_at)
    values (p_user_identifier, current_date, 0, p_tier, now())
    on conflict (user_identifier, query_date) do update
      set tier = excluded.tier, updated_at = excluded.updated_at;
  end if;

  -- Auditoría — se registra siempre, se haya aplicado o no el cambio.
  insert into billing_state_transitions (
    user_identifier, event_type, before_status, before_tier, after_status, after_tier, applied, reason
  ) values (
    p_user_identifier, p_event_type, v_before_status, v_before_tier,
    v_result->>'resulting_status', v_result->>'resulting_tier',
    (v_result->>'applied')::boolean, v_result->>'reason'
  );

  return v_result;
end;
$$;

-- ── 6. stripe_events (idempotencia del webhook) ──────────────────────────────
create table if not exists stripe_events (
  event_id                 text primary key,
  event_type               text not null,
  provider_created_at      timestamptz,
  received_at              timestamptz not null default now(),
  processing_status        text not null default 'received',
  error_message_sanitized  text
);
create index if not exists idx_stripe_events_received on stripe_events (received_at);

alter table stripe_events enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'stripe_events' and policyname = 'service_only_stripe_events') then
    execute $pol$
      create policy "service_only_stripe_events" on stripe_events
        using  ((select auth.role()) = 'service_role')
        with check ((select auth.role()) = 'service_role')
    $pol$;
  end if;
end $$;
grant select, insert, update on stripe_events to service_role;

-- ── 7. stripe_apply_event: única puerta de escritura de Stripe ───────────────
-- Matriz:
--  · sin fila: cancelled → stale_event_ignored; otro estado → created.
--  · misma suscripción Stripe: cancelled → downgraded (tier free, queries_log free); trialing sobre active/past_due → ignored_no_downgrade;
--    resto → updated.
--  · otra suscripción + cancelled → stale_event_ignored (la cancelación de otra suscripción no toca la vigente).
--  · otra suscripción vigente (status active o past_due, de PayPal o de Stripe) → duplicate_active_subscription: NO se pisa; el usuario debe
--    cancelar la otra primero (no se puede cancelar un cobro de otro proveedor de forma automática y segura).
--  · fila pending / trialing / cancelled → la nueva suscripción Stripe la reemplaza: provider_switched (venía de PayPal) o
--    reactivated_new_subscription; el trigger guarda la fila anterior en subscription_provider_history.
create or replace function stripe_apply_event(
  p_user_identifier   text,
  p_customer_id       text,
  p_subscription_id   text,
  p_email             text,
  p_tier              text,
  p_new_status        text,
  p_event_type        text
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_row subscriptions%rowtype;
  v_result jsonb;
  v_before_status text;
  v_before_tier text;
  v_misma boolean;
begin
  if p_tier not in ('pro', 'academico') then
    raise exception 'stripe_apply_event: tier inválido: %', p_tier;
  end if;
  if p_new_status not in ('trialing', 'active', 'cancelled', 'past_due') then
    raise exception 'stripe_apply_event: status inválido: %', p_new_status;
  end if;
  if p_subscription_id is null or p_subscription_id = '' then
    raise exception 'stripe_apply_event: falta el id de suscripción';
  end if;
  if p_user_identifier is null or p_user_identifier not like 'email:%' then
    raise exception 'stripe_apply_event: identificador de usuario inválido';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_identifier, 0));
  select * into v_row from subscriptions where user_identifier = p_user_identifier for update;
  v_before_status := v_row.status;
  v_before_tier := v_row.tier;

  if not found then
    if p_new_status = 'cancelled' then
      v_result := jsonb_build_object('applied', false, 'reason', 'stale_event_ignored',
        'resulting_status', 'cancelled', 'resulting_tier', 'free', 'resulting_sub_id', p_subscription_id);
    else
      insert into subscriptions (user_identifier, email, tier, status, provider, provider_customer_id, provider_subscription_id, updated_at)
      values (p_user_identifier, p_email, p_tier, p_new_status, 'stripe', p_customer_id, p_subscription_id, now());
      v_result := jsonb_build_object('applied', true, 'reason', 'created',
        'resulting_status', p_new_status, 'resulting_tier', p_tier, 'resulting_sub_id', p_subscription_id);
    end if;
  else
    v_misma := v_row.provider = 'stripe' and v_row.provider_subscription_id = p_subscription_id;
    if v_misma then
      if p_new_status = 'cancelled' then
        update subscriptions set tier = 'free', status = 'cancelled', updated_at = now() where user_identifier = p_user_identifier;
        update queries_log set tier = 'free', updated_at = now() where user_identifier = p_user_identifier;
        v_result := jsonb_build_object('applied', true, 'reason', 'downgraded',
          'resulting_status', 'cancelled', 'resulting_tier', 'free', 'resulting_sub_id', p_subscription_id);
      elsif p_new_status = 'trialing' and v_row.status in ('active', 'past_due') then
        v_result := jsonb_build_object('applied', false, 'reason', 'ignored_no_downgrade',
          'resulting_status', v_row.status, 'resulting_tier', v_row.tier, 'resulting_sub_id', v_row.provider_subscription_id);
      else
        update subscriptions set
          provider_customer_id = coalesce(p_customer_id, provider_customer_id),
          email      = coalesce(p_email, email),
          tier       = p_tier,
          status     = p_new_status,
          updated_at = now()
        where user_identifier = p_user_identifier;
        v_result := jsonb_build_object('applied', true, 'reason', 'updated',
          'resulting_status', p_new_status, 'resulting_tier', p_tier, 'resulting_sub_id', p_subscription_id);
      end if;
    elsif p_new_status = 'cancelled' then
      v_result := jsonb_build_object('applied', false, 'reason', 'stale_event_ignored',
        'resulting_status', v_row.status, 'resulting_tier', v_row.tier,
        'resulting_sub_id', coalesce(v_row.provider_subscription_id, v_row.paypal_sub_id));
    elsif v_row.status in ('active', 'past_due') then
      insert into billing_duplicate_attempts (user_identifier, active_sub_id, attempted_sub_id, event_type)
      values (p_user_identifier, coalesce(v_row.provider_subscription_id, v_row.paypal_sub_id), p_subscription_id, p_event_type);
      v_result := jsonb_build_object('applied', false, 'reason', 'duplicate_active_subscription',
        'resulting_status', v_row.status, 'resulting_tier', v_row.tier,
        'resulting_sub_id', coalesce(v_row.provider_subscription_id, v_row.paypal_sub_id));
    else
      update subscriptions set
        provider                 = 'stripe',
        provider_customer_id     = p_customer_id,
        provider_subscription_id = p_subscription_id,
        paypal_sub_id            = null,
        paypal_payer_id          = null,
        email                    = coalesce(p_email, email),
        tier                     = p_tier,
        status                   = p_new_status,
        updated_at               = now()
      where user_identifier = p_user_identifier;
      v_result := jsonb_build_object('applied', true,
        'reason', case when v_row.provider = 'paypal' then 'provider_switched' else 'reactivated_new_subscription' end,
        'resulting_status', p_new_status, 'resulting_tier', p_tier, 'resulting_sub_id', p_subscription_id);
    end if;
  end if;

  -- Mismo espejo de acceso que PayPal: el gate del chat (resolveCurrentAccess / rate-limit) lee queries_log.
  if (v_result->>'applied')::boolean and (v_result->>'resulting_status') = 'active' then
    insert into queries_log (user_identifier, query_date, query_count, tier, updated_at)
    values (p_user_identifier, current_date, 0, p_tier, now())
    on conflict (user_identifier, query_date) do update
      set tier = excluded.tier, updated_at = excluded.updated_at;
  end if;

  insert into billing_state_transitions (
    user_identifier, event_type, before_status, before_tier, after_status, after_tier, applied, reason
  ) values (
    p_user_identifier, 'stripe:' || p_event_type, v_before_status, v_before_tier,
    v_result->>'resulting_status', v_result->>'resulting_tier',
    (v_result->>'applied')::boolean, v_result->>'reason'
  );
  return v_result;
end;
$$;

revoke all on function stripe_apply_event(text, text, text, text, text, text, text) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function stripe_apply_event(text, text, text, text, text, text, text) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on function stripe_apply_event(text, text, text, text, text, text, text) from authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function stripe_apply_event(text, text, text, text, text, text, text) to service_role';
  end if;
end $$;
