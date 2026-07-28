-- ═══════════════════════════════════════════════════════════════════════════
-- 20260727000000_enable_rls_subscriptions.sql
-- Fase 0 de remediación — P0-1: activar RLS en public.subscriptions
--
-- NO EJECUTADA — preparada para revisión humana y aplicación posterior en
-- staging antes de producción. Ver MAYALEX_FASE0_PLAN_RLS.md para el análisis
-- completo que respalda cada decisión de este archivo.
--
-- CONTEXTO VERIFICADO (no asumido) antes de escribir esta migración:
--   - Esquema real de subscriptions (information_schema.columns):
--     id uuid NOT NULL, user_identifier text NOT NULL, paypal_sub_id text,
--     paypal_payer_id text, email text, tier text NOT NULL, status text
--     NOT NULL, current_period_end timestamptz, created_at timestamptz,
--     updated_at timestamptz. NO existe columna user_id ni relación directa
--     a auth.users — el identificador de negocio es user_identifier (text,
--     formato "email:{correo normalizado}", ver lib/rate-limit.ts:35-37).
--   - Política ya existente (pg_policies): service_only_subscriptions,
--     PERMISSIVE, roles={public}, cmd=ALL,
--     qual = with_check = (auth.role() = 'service_role').
--     Esta política, una vez que RLS esté activo, permite TODAS las
--     operaciones únicamente a service_role — cero acceso para anon o
--     authenticated, incluso a su propia fila.
--   - Grants de tabla (information_schema.role_table_grants): anon y
--     authenticated NO tienen SELECT/INSERT/UPDATE/DELETE sobre esta tabla
--     — solo REFERENCES/TRIGGER/TRUNCATE. Solo postgres y service_role
--     tienen los privilegios DML completos. Este es el MISMO patrón exacto
--     verificado en queries_log (tabla ya con RLS activo), confirmando que
--     es un patrón deliberado aplicado a todo el esquema — subscriptions es
--     la única tabla donde el paso de "activar RLS" quedó pendiente pese a
--     que el paso de "revocar grants amplios" sí se aplicó igual que en las
--     demás.
--   - Código de aplicación que consulta subscriptions (verificado en esta
--     sesión): lib/paypal/access.ts (resolveCurrentAccess, vía
--     createServerSupabaseClient = service_role), app/cuenta/page.tsx
--     (Server Component, misma vía), app/api/paypal/webhook/route.ts,
--     app/api/paypal/create-subscription/route.ts,
--     app/api/paypal/verificar-estado/route.ts — TODOS usan
--     createServerSupabaseClient() (service_role), NINGUNO usa el cliente
--     de navegador (createBrowserSupabaseClient) para leer o escribir esta
--     tabla. No existe hoy ningún flujo que requiera que un usuario
--     autenticado lea su propia fila directamente vía el SDK de cliente.
--
-- DECISIÓN DE DISEÑO: dado que ningún código de cliente necesita acceso
-- directo, esta migración NO agrega una política nueva de "lectura propia"
-- — habría sido superficie de ataque innecesaria sin caso de uso real.
-- Si en el futuro se necesita que /cuenta lea vía cliente en vez de Server
-- Component, se debe agregar esa política en una migración separada,
-- diseñada y probada específicamente para ese caso.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── VALIDACIONES PREVIAS (deben ejecutarse y confirmarse ANTES del cambio) ──
-- 1. Confirmar que la política service_only_subscriptions sigue existiendo
--    y con la misma definición documentada arriba:
--      SELECT policyname, qual, with_check FROM pg_policies
--      WHERE tablename = 'subscriptions';
-- 2. Confirmar que RLS sigue deshabilitado (para no aplicar dos veces sin
--    necesidad, aunque ENABLE ROW LEVEL SECURITY es idempotente):
--      SELECT rowsecurity FROM pg_tables WHERE tablename = 'subscriptions';
-- 3. Confirmar en un entorno de staging (no en producción) que, tras el
--    cambio, una consulta autenticada con service_role sigue funcionando:
--      -- ejecutar con las credenciales de service_role de STAGING
--      SELECT count(*) FROM public.subscriptions;

BEGIN;

-- Activar RLS. Con la política existente ya restringida a service_role,
-- esto pasa la tabla de "sin ninguna barrera de fila" a "cero acceso para
-- anon/authenticated, acceso total solo para service_role" — coherente con
-- cómo el código de la aplicación ya la usa hoy.
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Forzar RLS también para el propietario de la tabla (postgres), por
-- consistencia con el resto del esquema — evita que un acceso con el rol
-- postgres directo bypasee la política sin querer. No afecta a service_role,
-- que sigue funcionando vía la política existente, no vía bypass de owner.
ALTER TABLE public.subscriptions FORCE ROW LEVEL SECURITY;

COMMIT;

-- ── VALIDACIONES POSTERIORES (ejecutar inmediatamente después, en staging) ──
-- 1. Confirmar que RLS quedó activo:
--      SELECT rowsecurity, forcerowsecurity FROM pg_tables
--      WHERE tablename = 'subscriptions'; -- debe devolver true, true
-- 2. Confirmar que una consulta con la anon key falla (0 filas o error de
--    permisos) — ejecutar desde un cliente autenticado como anon, NUNCA
--    como service_role, y NUNCA contra producción sin autorización:
--      SELECT * FROM public.subscriptions; -- debe fallar o devolver 0 filas
-- 3. Confirmar que /cuenta y el webhook de PayPal (que usan service_role)
--    siguen funcionando normalmente — smoke test manual en Preview/staging.

-- ── PROCEDIMIENTO DE ROLLBACK (si algo falla tras aplicar) ──────────────────
-- BEGIN;
-- ALTER TABLE public.subscriptions NO FORCE ROW LEVEL SECURITY;
-- ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;
-- COMMIT;
-- Reversible en segundos, sin pérdida de datos en ningún escenario — no
-- toca ninguna fila, solo el flag de seguridad de la tabla.
