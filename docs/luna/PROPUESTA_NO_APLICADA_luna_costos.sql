-- PROPUESTA_NO_APLICADA — NO es una migración. Vive en docs/ a propósito: no se ejecuta, no entra a migrations/ ni a seeds.
-- Contador GLOBAL de costos de Luna (P26). Aplicarlo es decisión del propietario (DDL en Supabase) y requiere su autorización expresa.
-- Sin esto aplicado, Luna falla cerrado en todo entorno salvo LUNA_COST_COUNTER=local_canary_only (cuenta de prueba, NO global).

create table if not exists public.luna_costos_diarios (
  dia            date    not null,                 -- día America/Tegucigalpa
  plan           text    not null check (plan in ('free','academico','premium')),
  gastado_micro  bigint  not null default 0 check (gastado_micro >= 0),
  consultas      bigint  not null default 0,
  actualizado_en timestamptz not null default now(),
  primary key (dia, plan)
);
alter table public.luna_costos_diarios enable row level security;
-- Sin políticas: solo el service role (servidor) accede. Nada de esta tabla llega al navegador.

-- Reserva atómica: suma solo si no excede el tope. Devuelve true/false.
create or replace function public.luna_reservar_costo(p_dia date, p_plan text, p_micro_usd bigint, p_tope_micro_usd bigint)
returns boolean language plpgsql security definer set search_path = public as $$
declare filas int;
begin
  if p_micro_usd < 0 or p_tope_micro_usd <= 0 or p_plan not in ('free','academico','premium') then return false; end if;
  insert into public.luna_costos_diarios (dia, plan) values (p_dia, p_plan) on conflict do nothing;
  update public.luna_costos_diarios
     set gastado_micro = gastado_micro + p_micro_usd, consultas = consultas + 1, actualizado_en = now()
   where dia = p_dia and plan = p_plan and gastado_micro + p_micro_usd <= p_tope_micro_usd;
  get diagnostics filas = row_count;
  return filas = 1;
end $$;

-- Ajuste a costo real (delta puede ser negativo). Nunca deja el acumulado por debajo de 0.
create or replace function public.luna_liquidar_costo(p_dia date, p_plan text, p_delta_micro_usd bigint)
returns void language sql security definer set search_path = public as $$
  update public.luna_costos_diarios
     set gastado_micro = greatest(0, gastado_micro + p_delta_micro_usd), actualizado_en = now()
   where dia = p_dia and plan = p_plan;
$$;

-- ── PERMISOS Y POLÍTICA DE EJECUCIÓN ─────────────────────────────────────────────────────────────────────────────────────────────
-- 1. Las funciones son SECURITY DEFINER con search_path fijo (sin sustitución de objetos) y validan sus argumentos (plan cerrado, montos >= 0, tope > 0).
-- 2. EXECUTE se revoca a PUBLIC, anon y authenticated; se concede SOLO a service_role (el servidor de MayaLex). El navegador nunca llama estas RPC.
-- 3. La tabla tiene RLS activada y NINGUNA política: anon/authenticated no pueden leer ni escribir; service_role la omite por diseño de Supabase.
-- 4. No contiene datos personales ni de clientes: solo día, plan y cifras agregadas.
revoke all on table public.luna_costos_diarios from public, anon, authenticated;
revoke all on function public.luna_reservar_costo(date, text, bigint, bigint) from public, anon, authenticated;
revoke all on function public.luna_liquidar_costo(date, text, bigint) from public, anon, authenticated;
grant execute on function public.luna_reservar_costo(date, text, bigint, bigint) to service_role;
grant execute on function public.luna_liquidar_costo(date, text, bigint) to service_role;
-- Pruebas de concurrencia: tests/sql/luna-costos.sql.test.ts (ejecuta ESTE archivo en una base en memoria, nunca en Supabase).
-- ROLLBACK: docs/luna/PROPUESTA_NO_APLICADA_luna_costos_rollback.sql
