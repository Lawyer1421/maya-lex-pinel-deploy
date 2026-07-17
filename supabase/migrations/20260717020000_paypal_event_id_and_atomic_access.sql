-- ============================================================
-- Migración: 20260717020000_paypal_event_id_and_atomic_access
-- Segunda ronda de la puerta de preproducción — 3 correcciones:
--
-- 1. IDEMPOTENCIA REAL POR webhookEvent.id (no transmission_id)
--    PayPal reenvía la MISMA notificación lógica con un
--    PAYPAL-TRANSMISSION-ID nuevo en cada intento de entrega, pero el
--    campo `id` del body (webhookEvent.id) permanece igual. El esquema
--    anterior, con transmission_id como PRIMARY KEY, NO deduplicaba
--    reintentos reales de PayPal — cada reintento generaba una fila
--    nueva y se reprocesaba. Este es un hallazgo de correctitud, no solo
--    de estilo.
--
-- 2. ESCRITURA ATÓMICA subscriptions + queries_log + auditoría
--    Antes: paypal_apply_event actualizaba subscriptions, y una llamada
--    SEPARADA (syncLegacyPaidAccess) actualizaba queries_log — dos
--    transacciones distintas. Si el proceso caía entre medio, quedaba
--    exactamente el estado "subscriptions=active, queries_log=free" que
--    resolveCurrentAccess ya sabía detectar pero no corregir de raíz.
--    Ahora ambas tablas (+ un registro de auditoría) se escriben dentro
--    de la MISMA función/transacción.
--
-- 3. pg_advisory_xact_lock con hashtextextended (64-bit) en vez de
--    hashtext (32-bit) — reduce drásticamente la probabilidad de colisión
--    entre dos user_identifier distintos que competirían por el mismo
--    lock sin relación real entre ellos (no es un bug de seguridad —
--    hashtext ya era correcto para exclusión mutua del MISMO usuario —
--    es una mejora de eficiencia bajo carga real).
--
-- Prerrequisito: 20260717010000_paypal_state_machine.sql ya aplicado.
-- ============================================================

-- ── 1. paypal_events: event_id como clave de idempotencia ────
-- Migración en el lugar, 100% aditiva y reversible:
--   - se agrega event_id (nullable primero, se rellena, luego NOT NULL)
--   - las filas históricas (solo tenían transmission_id) se backfillean
--     con un event_id sintético, prefijado para que NUNCA pueda
--     colisionar con un event_id real de PayPal (que no usa ese prefijo)
--   - transmission_id deja de ser PK pero se conserva para firma/auditoría
alter table paypal_events add column if not exists event_id text;

update paypal_events
  set event_id = 'legacy-tx:' || transmission_id
  where event_id is null;

alter table paypal_events alter column event_id set not null;

do $$ begin
  if exists (
    select 1 from pg_constraint
    where conname = 'paypal_events_pkey' and conrelid = 'paypal_events'::regclass
  ) then
    alter table paypal_events drop constraint paypal_events_pkey;
  end if;
end $$;

alter table paypal_events add constraint paypal_events_pkey primary key (event_id);

create index if not exists idx_paypal_events_transmission on paypal_events(transmission_id);

alter table paypal_events add column if not exists provider_created_at timestamptz;
alter table paypal_events add column if not exists received_at timestamptz not null default now();
alter table paypal_events add column if not exists processing_status text not null default 'received';
alter table paypal_events add column if not exists error_message_sanitized text;

create index if not exists idx_paypal_events_received on paypal_events(received_at);

-- ── 2. Tabla de auditoría de transiciones de facturación ──────
-- Se llena en CADA llamada a paypal_apply_event/paypal_apply_downgrade
-- (aplicada o no), dentro de la MISMA transacción que la escritura —
-- nunca un log "best effort" separado que pueda perderse.
create table if not exists billing_state_transitions (
  id               uuid primary key default gen_random_uuid(),
  user_identifier  text not null,
  event_type       text not null,
  before_status    text,
  before_tier      text,
  after_status     text not null,
  after_tier       text not null,
  applied          boolean not null,
  reason           text not null,
  created_at       timestamptz not null default now()
);

create index if not exists idx_billing_transitions_user on billing_state_transitions(user_identifier);

alter table billing_state_transitions enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'billing_state_transitions' and policyname = 'service_only_billing_state_transitions'
  ) then
    execute $pol$
      create policy "service_only_billing_state_transitions" on billing_state_transitions
        using  ((select auth.role()) = 'service_role')
        with check ((select auth.role()) = 'service_role')
    $pol$;
  end if;
end $$;

grant select, insert, update, delete on billing_state_transitions to service_role;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant select, insert, update on paypal_events to service_role';
  end if;
end $$;

-- ── 3. paypal_apply_event: hashtextextended + escritura atómica ──
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

-- ── 4. paypal_apply_downgrade: CANCELLED/EXPIRED/SUSPENDED atómico ──
-- Reemplaza el patrón de dos UPDATE separados (subscriptions luego
-- queries_log) que usaba el webhook para estos eventos. Ya era
-- razonablemente seguro (cada UPDATE filtra por paypal_sub_id/
-- user_identifier en una sola sentencia), pero no era atómico ENTRE las
-- dos tablas ni dejaba auditoría. Ahora sí, en una sola transacción.
create or replace function paypal_apply_downgrade(
  p_paypal_sub_id text,
  p_new_status    text,
  p_event_type    text
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_row subscriptions%rowtype;
begin
  if p_new_status not in ('cancelled') then
    raise exception 'paypal_apply_downgrade: status inválido: %', p_new_status;
  end if;

  select * into v_row from subscriptions where paypal_sub_id = p_paypal_sub_id for update;
  if not found then
    return jsonb_build_object('applied', false, 'reason', 'no_matching_subscription');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_row.user_identifier, 0));

  update subscriptions set tier = 'free', status = p_new_status, updated_at = now()
    where paypal_sub_id = p_paypal_sub_id;

  update queries_log set tier = 'free', updated_at = now()
    where user_identifier = v_row.user_identifier;

  insert into billing_state_transitions (
    user_identifier, event_type, before_status, before_tier, after_status, after_tier, applied, reason
  ) values (
    v_row.user_identifier, p_event_type, v_row.status, v_row.tier, p_new_status, 'free', true, 'downgraded'
  );

  return jsonb_build_object(
    'applied', true, 'reason', 'downgraded',
    'resulting_status', p_new_status, 'resulting_tier', 'free',
    'resulting_sub_id', p_paypal_sub_id, 'user_identifier', v_row.user_identifier
  );
end;
$$;

-- ── Permisos — igual criterio que antes: solo service_role ───
revoke all on function paypal_apply_event(text, text, text, text, text, text, boolean, text) from public;
revoke all on function paypal_apply_downgrade(text, text, text) from public;

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function paypal_apply_event(text, text, text, text, text, text, boolean, text) from anon';
    execute 'revoke all on function paypal_apply_downgrade(text, text, text) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on function paypal_apply_event(text, text, text, text, text, text, boolean, text) from authenticated';
    execute 'revoke all on function paypal_apply_downgrade(text, text, text) from authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function paypal_apply_event(text, text, text, text, text, text, boolean, text) to service_role';
    execute 'grant execute on function paypal_apply_downgrade(text, text, text) to service_role';
  end if;
end $$;

-- ============================================================
-- Validación posterior:
--   select column_name from information_schema.columns where table_name='paypal_events' and column_name='event_id';
--   select conname from pg_constraint where conrelid='paypal_events'::regclass and contype='p'; -- debe apuntar a event_id
--   select to_regclass('public.billing_state_transitions');
--   select proname from pg_proc where proname = 'paypal_apply_downgrade';
--
-- Rollback (reversible sin pérdida del historial de negocio real —
-- solo se pierde el detalle de auditoría fina agregado aquí):
--   drop function if exists paypal_apply_downgrade(text, text, text);
--   drop table if exists billing_state_transitions;
--   alter table paypal_events drop constraint paypal_events_pkey;
--   alter table paypal_events add constraint paypal_events_pkey primary key (transmission_id);
--   -- (nota: si ya hay filas con event_id real repetido por transmission_id
--   --  nulo/duplicado tras el rollback de código, este PK antiguo puede
--   --  volver a fallar — el rollback de esta migración solo tiene sentido
--   --  acompañado del rollback del código que la usa)
--   alter table paypal_events drop column if exists event_id;
--   alter table paypal_events drop column if exists provider_created_at;
--   alter table paypal_events drop column if exists received_at;
--   alter table paypal_events drop column if exists processing_status;
--   alter table paypal_events drop column if exists error_message_sanitized;
--
-- Compatibilidad: paypal_apply_event mantiene la MISMA firma — el
-- código que ya la llama (webhook, verificar-estado, reconciliación) no
-- necesita cambiar su forma de invocarla, solo dejar de llamar por su
-- cuenta a syncLegacyPaidAccess (ahora redundante, la RPC ya lo hace).
-- ============================================================
