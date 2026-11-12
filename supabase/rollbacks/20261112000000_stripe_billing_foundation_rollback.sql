-- Rollback de 20261112000000_stripe_billing_foundation.sql (SOLO STAGING).
-- Antes de ejecutarlo: confirmar que NO hay filas con provider = 'stripe' (se perdería el vínculo con Stripe).
-- Restaura paypal_apply_event SIN la guarda de Stripe (versión de 20260717020000).
BEGIN;
drop function if exists stripe_apply_event(text, text, text, text, text, text, text);
drop table if exists stripe_events;
drop trigger if exists trg_subscriptions_sync_provider on subscriptions;
drop function if exists subscriptions_sync_provider();
drop table if exists subscription_provider_history;
alter table subscriptions drop constraint if exists subscriptions_status_check;
drop index if exists idx_subs_provider_customer;
drop index if exists idx_subs_provider_subscription;
alter table subscriptions drop constraint if exists subscriptions_provider_check;
alter table subscriptions drop column if exists provider_subscription_id;
alter table subscriptions drop column if exists provider_customer_id;
alter table subscriptions drop column if exists provider;
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
COMMIT;
