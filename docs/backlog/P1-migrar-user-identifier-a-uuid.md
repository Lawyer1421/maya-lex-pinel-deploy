# P1 — Migrar `userIdentifier` de `email:{correo}` a UUID interno inmutable

**Estado:** backlog, no iniciado. Confirmado en la auditoría de PayPal (jul 2026).

## Problema

`userIdentifier` es hoy `email:{correo}` ([lib/rate-limit.ts](../../lib/rate-limit.ts) →
`buildUserIdentifierFromEmail`), construido a partir de `auth.users.email`
de Supabase. Es la clave usada en `subscriptions.user_identifier`,
`queries_log.user_identifier` y en el `custom_id.u` que viaja a PayPal.

No es un UUID inmutable. Riesgo concreto: si un usuario cambia su correo
en Supabase Auth, su `userIdentifier` cambia con él y toda su
suscripción/historial de uso queda huérfano — el sistema no tiene hoy
ningún mecanismo que detecte o repare esto automáticamente.

## Por qué no se resolvió en el sprint de PayPal (jul 2026)

Es un cambio transversal: toca autenticación, el esquema de las tres
tablas de negocio (`subscriptions`, `queries_log`, más las nuevas
`billing_duplicate_attempts`/`billing_verification_attempts`/
`billing_state_transitions`), todos los endpoints de PayPal, el
rate-limiter y el custom_id empaquetado hacia PayPal. Migrarlo a mitad
de una corrección de emergencia habría sido una refactorización no
relacionada con un blast radius mucho mayor al bug que se estaba
corrigiendo.

## Mitigación aplicada mientras tanto

`buildUserIdentifierFromEmail()` normaliza siempre con `trim()` +
`toLowerCase()` en todos los puntos de entrada nuevos (`/cuenta`,
`verificar-estado`, `create-subscription` vía `getUserIdentifierVerificado`).
Esto cierra la clase de bugs por diferencias de mayúsculas/espacios entre
distintos puntos de entrada, pero NO protege contra un cambio real de
correo.

## Enfoque recomendado para la migración futura

1. Agregar `subscriptions.auth_user_id uuid` (referencia a
   `auth.users.id`), nullable al principio.
2. Backfill: para cada fila existente, resolver `auth_user_id` buscando
   por el correo actual en `auth.users` (best-effort; correos ya
   huérfanos por cambios previos requieren revisión manual — usar
   `billing_duplicate_attempts`/soporte como referencia de casos).
3. Cambiar gradualmente los puntos de lectura (`lib/rate-limit.ts`,
   `lib/paypal/access.ts`, `app/api/paypal/*`) para preferir
   `auth_user_id` cuando esté presente, con `user_identifier` (`email:`)
   como fallback durante la transición.
4. Una vez que el backfill esté completo y verificado, hacer
   `auth_user_id` NOT NULL y evaluar deprecar `user_identifier` como
   clave primaria de negocio (mantenerlo solo como columna de
   auditoría/legado).
5. Reempaquetar `custom_id` hacia PayPal con `auth_user_id` en vez del
   correo.

## Relacionado

Debe hacerse en conjunto con (o inmediatamente antes de) la fase de
Google Sign-In / vinculación de cuentas mencionada en la auditoría
original — ambas tocan el modelo de identidad del usuario.
