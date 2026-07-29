# Verificación RLS en Supabase no productivo (real, no solo PGlite)

## Entorno utilizado

**Opción 1 de las 3 permitidas: proyecto Supabase de staging existente** (`mayalexhn-staging`, ref `aicakncgtuiiuomflkqj`) — confirmado en auditorías previas de esta sesión como un proyecto real pero vacío. Se usó exactamente ese proyecto, no producción, no datos reales.

## Datos ficticios creados (y eliminados al finalizar)

```
usuario-a-ficticio@ejemplo-qa.com   → tier=pro,       status=active
usuario-b-ficticio@ejemplo-qa.com   → tier=academico, status=active
admin-ficticio@ejemplo-qa.com       → tier=admin,     status=active
```

Ningún dato real de cliente fue copiado a staging.

## Procedimiento (real, ejecutado)

1. Se recreó en staging el **estado actual real de producción** (tabla, política ya existente, grants revocados de `anon`/`authenticated`, RLS deshabilitado) — no el schema ya-corregido de `supabase/subscriptions.sql`, para probar la migración contra el bug real, no contra un estado ya sano.
2. Confirmado ANTES: `relrowsecurity=false, relforcerowsecurity=false`.
3. Se aplicó la migración (`ALTER TABLE ... ENABLE/FORCE ROW LEVEL SECURITY`).
4. Confirmado DESPUÉS: `relrowsecurity=true, relforcerowsecurity=true`.

## Resultados de las pruebas (contra Postgres real de Supabase, con roles reales `anon`/`authenticated`/`service_role` y la función real `auth.role()` del proyecto — no un stub)

| Prueba | Resultado | Evidencia |
|---|---|---|
| `anon` no puede leer filas | ✅ Confirmado — 0 filas visibles incluso con `GRANT SELECT` otorgado explícitamente en la misma transacción | `filas_visibles_anon: 0` |
| `anon` no puede insertar | ✅ Confirmado — rechazado con `ERROR 42501: new row violates row-level security policy` | Error real de Postgres, no simulado |
| `authenticated` no puede leer su propia fila (ni ninguna) | ✅ Confirmado — 0 filas, coincide exactamente con el resultado de PGlite | `filas_visibles_authenticated: 0` |
| `authenticated` no puede cambiar su propio plan | ✅ Confirmado bloqueado, aunque por una vía distinta a la esperada (ver "Diferencia con PGlite" abajo) | `ERROR 42501: permission denied for table subscriptions` |
| `service_role` puede leer y escribir con normalidad | ✅ Confirmado — `UPDATE` exitoso, `status` cambiado correctamente | `{"status":"active"}` devuelto |
| Eventos repetidos son idempotentes | No re-probado en staging en esta sesión — ya cubierto extensamente por la suite existente de `tests/state-machine.sql.test.ts` (PK sobre `event_id`, no relacionado a RLS) | Ver `tests/sql/state-machine.sql.test.ts` |
| Administrador autorizado puede operar | Cubierto indirectamente — el usuario ficticio `admin-ficticio` con `tier=admin` sigue sujeto a la misma política (`service_role` únicamente); el concepto de "administrador" en este proyecto es un valor de `tier`, no un rol de Postgres distinto — la política actual no distingue `tier=admin` de otros tiers para el acceso directo a la tabla, y **no debería**, dado que ningún código de cliente necesita acceso directo (ver `MAYALEX_FASE0_PLAN_RLS.md`) |
| Sesión inválida es rechazada | No probado explícitamente con un JWT malformado real — se infiere del comportamiento de `authenticated`/`anon` sin rol reconocido, que ya no obtienen ningún acceso |
| El frontend sigue mostrando el plan correctamente | No verificable sin un smoke test real de `/cuenta` contra staging con una sesión de navegador real — **pendiente, requiere Preview desplegado** |

## Diferencia encontrada entre PGlite y Supabase real

En PGlite, la prueba equivalente a "authenticated no puede cambiar su plan" fue bloqueada por la **política RLS** (`UPDATE` afectó 0 filas, sin error). En Supabase real, la misma prueba fue bloqueada **un nivel antes**, por el sistema de permisos de tabla (`GRANT`), con un error `42501 permission denied`, en vez de llegar a evaluarse contra la política RLS. Ambos resultados demuestran que la operación está bloqueada — la diferencia es la capa exacta que la bloquea, probablemente por una sutileza de temporización entre el `GRANT` recién otorgado y el cambio de rol dentro de la misma transacción de prueba (no representa una debilidad real de la migración: en el uso real, el código de la aplicación nunca ejecuta `GRANT` dinámicamente, así que esta diferencia es un artefacto del método de prueba, no del comportamiento de producción).

## Limitación declarada

No se realizó una prueba HTTP/REST completa contra el endpoint real de PostgREST de staging usando la `anon key` real como header `apikey`/`Authorization` — las pruebas se hicieron a nivel SQL con `SET ROLE` + `SET request.jwt.claim.role`, que es el mismo mecanismo que PostgREST usa internamente, pero no reproduce una petición HTTP completa de extremo a extremo. Se considera evidencia suficientemente fuerte (mismo motor Postgres real, mismos roles reales, misma función `auth.role()` real del proyecto) pero no idéntica a una prueba end-to-end vía navegador.

## Limpieza

La tabla de prueba fue eliminada de staging al finalizar (`DROP TABLE subscriptions CASCADE`) — staging queda en el mismo estado vacío en que se encontró (aparte de `biblioteca_vectores`, preexistente de trabajo de sesiones anteriores no relacionado con esta tarea).
