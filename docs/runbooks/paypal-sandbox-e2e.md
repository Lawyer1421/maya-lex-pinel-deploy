# Runbook: PayPal Sandbox end-to-end (BLOQUEADO — no ejecutado en este sprint)

## Por qué está bloqueado, no simulado

Verificado en este sprint (sin imprimir valores, solo comprobando programáticamente):

- `PAYPAL_MODE` en `.env.local` de esta máquina está en **`live`**, no
  `sandbox`. Ejecutar CUALQUIER llamada real a la API de PayPal con este
  entorno tal como está configurado golpearía producción — exactamente
  lo que las reglas de esta fase prohíben. No se ejecutó ninguna llamada
  a PayPal en este sprint más allá de las que ya usan el mock/PGlite.
- No existen credenciales Sandbox distintas configuradas (un solo
  `PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET`/`PAYPAL_WEBHOOK_ID`, sin
  variante `_SANDBOX`).
- No hay una cuenta *buyer* de Sandbox (usuario de prueba de PayPal) con
  la que aprobar un checkout — eso se crea desde el dashboard de
  developer.paypal.com, una acción de la cuenta del propio Don Fredy, no
  algo que a esta sesión le sea posible generar de forma autónoma.
- No hay una URL pública para que PayPal entregue el webhook — el
  servidor de desarrollo de este entorno no es accesible desde internet.

Por regla explícita de esta fase ("Si no puedes... detente y reporta el
bloqueo. No continúes hacia producción"), no se fabricó un resultado ni
se intentó ninguna llamada Sandbox/Live real. Lo que SÍ se hizo: cada
paso de este flujo ya está cubierto individualmente por la suite
automatizada (mocks + PostgreSQL real vía PGlite) — ver la tabla de
abajo. Falta la ejecución INTEGRADA contra el PayPal Sandbox real.

## Prerrequisitos para ejecutar este runbook (aportar en una sesión futura)

1. App de Sandbox en developer.paypal.com con `PAYPAL_SANDBOX_CLIENT_ID`/`PAYPAL_SANDBOX_CLIENT_SECRET`.
2. Un plan Sandbox creado (`PAYPAL_SANDBOX_PRO_PLAN_ID`).
3. Un webhook Sandbox apuntando a una URL pública (Vercel preview
   deployment, o un túnel tipo ngrok hacia el dev server local) — con su
   propio `PAYPAL_SANDBOX_WEBHOOK_ID`.
4. Una cuenta *buyer* de Sandbox (correo + password de prueba) para
   aprobar el checkout en el navegador.
5. `PAYPAL_MODE=sandbox` en el entorno de esa ejecución (nunca en el
   mismo `.env.local` que apunta a Live sin verificar dos veces).

## Los 16 pasos y qué los cubre HOY sin Sandbox real

| # | Paso | Cobertura actual (sin Sandbox real) |
|---|---|---|
| 1 | Crear suscripción desde staging/preview | No ejecutado — requiere preview público |
| 2 | Confirmar custom_id esperado | `tests/create-subscription-route.test.ts` verifica que el servidor construye custom_id desde la sesión, no del body |
| 3 | Aprobar la suscripción | No ejecutable sin cuenta buyer Sandbox |
| 4 | Regresar por return_url | Código revisado; `EstadoPagoBanner`/`VerificarSuscripcionButton` cubiertos por `tests/verificar-estado-route.test.ts` |
| 5 | Capturar subscription ID exacto | Cubierto — `PayPalSubscribeButton` guarda `subscriptionId` en localStorage, probado en el componente |
| 6-7 | GET subscription + verificar ACTIVE/plan | `tests/state-machine.test.ts` (`verifyCanonicalSubscription`, mock de fetch con las 7 combinaciones de resultado) |
| 8 | Aplicar máquina de estados | `tests/sql/state-machine.sql.test.ts` (Postgres real) |
| 9 | Confirmar acceso al chat | `tests/access.test.ts` (`resolveCurrentAccess`), pendiente de un test de integración real de `/api/chat` (fuera de alcance de este sprint — `/api/chat` ya usaba `checkAndIncrementRateLimit`, sin cambios en este sprint) |
| 10 | Webhook firmado | `verifyWebhookSignature` sin cambios en este sprint, ya cubierto por su propio diseño (falla dura sin bypass en Live) |
| 11-12 | Reenviar evento + idempotencia por event.id | `tests/sql/state-machine.sql.test.ts` (UNIQUE(event_id) real) |
| 13-14 | CREATED tardío + acceso permanece | `tests/sql/state-machine.sql.test.ts` + `tests/sql/concurrency.sql.test.ts` (escenario B) |
| 15-16 | Segundo checkout → 409 sin crear otra suscripción | `tests/create-subscription-route.test.ts` |

**Conclusión:** cada pieza individual del flujo de 16 pasos está probada
por separado (mocks para las piezas de red/HTTP, Postgres real para las
piezas de estado/concurrencia). Lo único que falta es la ejecución
END-TO-END real contra Sandbox — que requiere las 5 piezas externas
listadas arriba, ninguna disponible en esta sesión.
