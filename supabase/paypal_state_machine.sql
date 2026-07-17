-- ============================================================
-- Maya Lex IA — Máquina de estados PayPal (sprint de emergencia)
-- Ejecutar en: Supabase SQL Editor  O  npm run migrate:analytics
-- Requiere: supabase/subscriptions.sql ya aplicado (tabla subscriptions)
--
-- Corrige el bug confirmado: BILLING.SUBSCRIPTION.CREATED sobrescribía
-- subscriptions.status a 'trialing' incluso cuando el cliente ya estaba
-- 'active', vía un upsert ciego con onConflict:'user_identifier'.
--
-- La regla de oro: check-y-escritura del estado de la suscripción
-- ocurre en UNA sola llamada atómica (esta función, con SELECT ... FOR
-- UPDATE dentro de la misma transacción implícita del RPC) — nunca como
-- un SELECT desde la API seguido de un UPSERT separado, que es racy
-- entre dos webhooks concurrentes.
--
-- Consumidor: lib/paypal/state-machine.ts → applySubscriptionEvent()
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

  -- Bloquea la fila del usuario (si existe) por el resto de esta transacción.
  -- Un segundo webhook concurrente para el MISMO usuario espera aquí hasta
  -- que esta transacción termine — elimina la ventana de carrera de F1/H13.
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

grant execute on function paypal_apply_event(text, text, text, text, text, text, boolean, text) to service_role;

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
