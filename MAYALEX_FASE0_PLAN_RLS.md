# Plan de corrección RLS — `public.subscriptions`

## Hallazgo forense (nuevo en esta sesión, corrige el nivel de urgencia percibido)

`supabase/subscriptions.sql` — el script de schema idempotente de referencia de este proyecto — **ya contiene** `alter table subscriptions enable row level security;`, la política `service_only_subscriptions` completa, y `grant select, insert, update, delete on subscriptions to service_role;` (sin otorgar nada a `anon`/`authenticated`). Es decir: **el equipo ya diseñó correctamente esta protección**. El estado real de producción (verificado con `pg_tables.rowsecurity = false` y el advisor de Supabase) muestra que **esta parte específica del script nunca llegó a aplicarse contra la base real**, o se aplicó una versión anterior del archivo antes de que se agregara la sección de RLS. Esto se confirma porque los `GRANT` a `service_role` sí están presentes en producción exactamente como los define el script, pero el `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` no.

**Conclusión operativa**: esto es un problema de **deriva entre el schema de referencia versionado y el estado real desplegado**, no una omisión de diseño. La corrección no requiere inventar una política nueva — requiere aplicar la parte del script que quedó pendiente.

## Verificación del esquema real (no asumido)

```
Columnas de public.subscriptions (information_schema.columns):
  id                  uuid            NOT NULL
  user_identifier     text            NOT NULL
  paypal_sub_id       text            NULL
  paypal_payer_id     text            NULL
  email               text            NULL
  tier                text            NOT NULL
  status              text            NOT NULL
  current_period_end  timestamptz     NULL
  created_at          timestamptz     NULL
  updated_at          timestamptz     NULL
```

No existe columna `user_id` ni relación a `auth.users`. El identificador de negocio es `user_identifier` (texto, formato `email:{correo normalizado}`, ver `lib/rate-limit.ts:35-37`).

## Política existente (verificada con `pg_policies`, no asumida)

```
policyname: service_only_subscriptions
permissive: PERMISSIVE
roles:      {public}
cmd:        ALL
qual:       (( SELECT auth.role() AS role) = 'service_role'::text)
with_check: (( SELECT auth.role() AS role) = 'service_role'::text)
```

Esta política, **una vez que RLS esté activo**, concede acceso total únicamente a `service_role` — ningún acceso para `anon` ni `authenticated`, ni siquiera a su propia fila.

## Grants de tabla (verificados con `information_schema.role_table_grants`)

| Rol | Privilegios en `subscriptions` |
|---|---|
| `anon` | REFERENCES, TRIGGER, TRUNCATE (**sin SELECT/INSERT/UPDATE/DELETE**) |
| `authenticated` | REFERENCES, TRIGGER, TRUNCATE (**sin SELECT/INSERT/UPDATE/DELETE**) |
| `postgres` | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| `service_role` | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |

**Este es el mismo patrón exacto verificado en `queries_log`** (tabla que sí tiene RLS activo hoy) — confirma que el REVOKE de privilegios amplios a `anon`/`authenticated` fue aplicado de forma consistente en todo el esquema; `subscriptions` es la única tabla donde el paso complementario de activar RLS quedó pendiente.

**Efecto práctico de este hallazgo sobre la severidad**: mientras nadie otorgue accidentalmente `SELECT`/`INSERT`/`UPDATE`/`DELETE` a `anon`/`authenticated` sobre esta tabla, el acceso ya está bloqueado a nivel de GRANT — con o sin RLS. El riesgo real no es "expuesta ahora mismo a cualquiera con la anon key" (como podría interpretarse literalmente del advisor genérico de Supabase), sino **"protegida hoy por una única capa (GRANT revocado), sin la capa de respaldo (RLS) que el resto del esquema sí tiene"** — un solo `GRANT SELECT ... TO anon;` futuro (accidental o de un script mal escrito) expondría la tabla completa sin ningún control adicional. Se mantiene la clasificación P0 porque la corrección es de bajísimo riesgo y costo, y no hay ninguna razón para mantener esta única tabla en un estado más frágil que el resto del esquema.

## Respuestas a las 12 preguntas de la Fase E

1. **¿RLS está realmente desactivado?** Sí — verificado con `pg_tables.rowsecurity = false` para `subscriptions`, reconfirmado en esta sesión.
2. **¿Qué roles tienen privilegios sobre la tabla?** Ver tabla de grants arriba — solo `postgres` y `service_role` tienen DML completo.
3. **¿Puede `anon` realizar SELECT?** No, por ausencia de GRANT (verificado). Si en el futuro se le otorgara el GRANT sin que RLS esté activo, sí podría — de ahí la urgencia de cerrar ambas capas.
4. **¿Puede `anon` realizar INSERT/UPDATE/DELETE?** No, por la misma razón.
5. **¿Puede `authenticated` acceder a filas de otros usuarios?** No hoy (sin GRANT). Tras activar RLS con la política actual, tampoco podría acceder ni siquiera a sus propias filas, porque la política es exclusiva de `service_role` — ver diseño más abajo.
6. **¿Qué operaciones necesita legítimamente el frontend?** Ninguna directa — verificado en el código: `/cuenta` (`app/cuenta/page.tsx`) es un Server Component que usa `createServerSupabaseClient()` (service_role), no el cliente de navegador. No existe ningún componente cliente (`'use client'`) que importe `createBrowserSupabaseClient` y consulte `subscriptions` directamente.
7. **¿Qué operaciones deben realizarse exclusivamente en servidor?** Todas — INSERT/UPDATE del webhook de PayPal, SELECT de `resolveCurrentAccess()`, todo vía `service_role`.
8. **¿Qué operaciones necesita el webhook?** INSERT (nueva suscripción) y UPDATE (cambios de estado) — vía `service_role`, ya cubierto por la política existente.
9. **¿Las políticas existentes son correctas?** Sí, correctas y suficientes para el uso real actual del código — no se identificó necesidad de una política adicional de autoservicio.
10. **¿Alguna política utiliza `user_id = auth.uid()` o equivalente?** No, y no debe agregarse una a menos que se implemente primero un flujo de cliente que la necesite (no existe hoy).
11. **¿Existe riesgo de manipular el plan desde el cliente?** No detectado — todas las escrituras a `tier`/`status` ocurren en rutas de servidor (`app/api/paypal/webhook/route.ts`, `app/api/paypal/create-subscription/route.ts`), no hay ningún endpoint que acepte un `tier` arbitrario del cliente sin validación contra PayPal.
12. **¿Existe riesgo de enumeración de suscripciones?** No verificado como explotable directamente hoy por la ausencia de GRANT; se cierra completamente con esta migración al no existir ninguna política que permita a `anon`/`authenticated` ver ni siquiera la existencia de una fila.

## Diseño de la migración

Ver `supabase/migrations/20260727000000_enable_rls_subscriptions.sql` (no ejecutada). Resumen de decisiones:

- **`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`**: activa la barrera de fila con la política ya existente.
- **`ALTER TABLE ... FORCE ROW LEVEL SECURITY`**: adicional, no presente en `supabase/subscriptions.sql` original — se agrega para que ni siquiera el rol propietario de la tabla (`postgres`) bypasee la política sin una razón explícita, consistente con una postura de mínimo privilegio. `service_role` no se ve afectado (accede vía la política, no vía bypass de owner).
- **Sin política de autoservicio nueva**: justificado en la sección "Qué operaciones necesita legítimamente el frontend" — no existe caso de uso real hoy.
- **Reversible**: `DISABLE ROW LEVEL SECURITY` revierte instantáneamente sin tocar ninguna fila.

## Pruebas automatizadas

`tests/sql/rls-subscriptions.sql.test.ts` — **ejecutadas en esta sesión contra Postgres real (PGlite)**, 11/11 passing. Cubre exactamente los 9 escenarios solicitados en la Fase F: `anon` no puede leer, `anon` no puede escribir, usuario A no puede leer usuario B, usuario A no puede cambiar su plan, `service_role` puede operar con normalidad (webhook), idempotencia del rollback, y una prueba explícita que reproduce el estado de riesgo real (GRANT accidental sin RLS) para documentar la condición exacta que esta migración cierra.
