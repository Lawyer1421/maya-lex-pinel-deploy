# Suite del sprint de emergencia PayPal

Ejecutar: `npm test`

Cero red real, cero credenciales, cero escrituras a Supabase/PayPal reales.
Todo mockeado con `vi.fn()`/`vi.mock()` y `global.fetch` interceptado.

## Cobertura real vs. limitación conocida

Esta máquina no tiene Docker/Postgres local ni un proyecto Supabase de
staging (solo existe un juego de credenciales, el de producción — ver
auditoría, sección "Información externa necesaria"). Bajo las reglas de
esta fase (no escrituras en producción), **la lógica interna de la
función plpgsql `paypal_apply_event`/`paypal_apply_downgrade`
(supabase/migrations/2026071701_*/2026071702_*) **no se ejecutaba en la
suite original de mocks** — `tests/sql/state-machine.sql.test.ts` la
ejecuta contra Postgres real (PGlite, sin Docker), y
`tests/sql/concurrency.sql.test.ts` va un paso más allá: usa
`@electric-sql/pglite-socket` para exponer esa misma base como servidor
TCP real y conectar DOS clientes `pg` (node-postgres) independientes,
demostrando con timestamps reales que el advisory lock bloquea una
segunda conexión genuina hasta que la primera hace commit/rollback
(escenarios A-E). El único escenario no confirmable en este entorno es
`lock_timeout` (F) — documentado como `it.skip` con la razón exacta en
ese archivo.

Lo que SÍ cubre esta suite:
- Parseo de `custom_id` (formatos nuevo/legado) — `state-machine.test.ts`
- `verifyCanonicalSubscription()` contra un `fetch` mockeado con las
  combinaciones status/plan/custom_id/sub_id — `state-machine.test.ts`
- `syncLegacyPaidAccess()` rechazando cualquier status que no sea
  'active' — `state-machine.test.ts`
- `applySubscriptionEvent()` mapeando correctamente la respuesta jsonb
  de la RPC (snake_case → camelCase) y propagando errores — `state-machine.test.ts`
- La decisión pura de bloqueo de doble suscripción — `duplicate-guard.test.ts`
- Cómo el webhook INTERPRETA cada resultado posible que la RPC puede
  devolver (si sincroniza queries_log o no, si llama a PayPal antes de
  conceder acceso) — `webhook-handler.test.ts`, con
  `lib/paypal/state-machine` mockeado por completo.
- Catálogo de planes — `plans.test.ts`

**Riesgo residual:** un bug dentro del SQL de `paypal_apply_event` que
haga que la rama tomada no coincida con lo documentado no será detectado
por esta suite. Mitigación: smoke test manual en un proyecto Supabase
antes de ir a Live (ver plan de staging en el informe de entregables).
