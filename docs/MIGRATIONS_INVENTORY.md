# Inventario definitivo de migraciones

**Corrección respecto al informe anterior:** el informe de la Fase 8 de
identidad afirmó "5 migraciones nuevas" pero listó 4 — fue un error de
conteo, no una migración faltante. El número correcto de migraciones
nuevas introducidas por la rama `feat/auth-uuid-google-pro` es **4**.
Las dos primeras de la tabla ya estaban en `main` (mergeadas y aplicadas
a producción como parte del hotfix PayPal) y se listan aquí solo para
dar el contexto completo de la cadena.

## Listado exacto, en orden de aplicación

| # | Ruta | Timestamp | Propósito | SHA-256 | Depende de | Estado |
|---|---|---|---|---|---|---|
| 1 | `supabase/migrations/20260717010000_paypal_state_machine.sql` | 2026-07-17 01:00:00 | RPC `paypal_apply_event`, tabla `billing_duplicate_attempts`, `billing_verification_attempts` | `745a6531acc30b8638aa4edcfd4491539ad1256f28f6ce99bb2972d4b348de93` | `supabase/subscriptions.sql` (schema base) | **Aplicada a producción** (canary autorizado) |
| 2 | `supabase/migrations/20260717020000_paypal_event_id_and_atomic_access.sql` | 2026-07-17 02:00:00 | `paypal_events.event_id` como PK, escritura atómica subscriptions+queries_log+auditoría, `paypal_apply_downgrade`, `billing_state_transitions` | `66b7c4aa30c29fca9b4d635ca9f2856f235945d440b82a6ab495493f36e4a1f9` | #1 | **Aplicada a producción** (canary autorizado) |
| 3 | `supabase/migrations/20260718000000_entitlements.sql` | 2026-07-18 00:00:00 | Tabla `entitlements` + `entitlement_audit_events` + triggers de auditoría | `7eae6a684d7bc9f971b8e276a01c964e5af94cb55c8bffff0702d4f27d04a8bb` | `auth.users` (Supabase nativo) | **NO aplicada** — solo probada contra PGlite |
| 4 | `supabase/migrations/20260718010000_identity_uuid_expand.sql` | 2026-07-18 01:00:00 | `user_id UUID` nullable en subscriptions/queries_log/paypal_events/billing_state_transitions/billing_duplicate_attempts | `5b5df9ae5606094607e3b99a7dfc565aeacd0a994227757fb6755f15019f030b` | #1, #2 (tablas destino ya deben existir) | **NO aplicada** — solo probada contra PGlite |
| 5 | `supabase/migrations/20260718020000_profiles_and_identity_linking.sql` | 2026-07-18 02:00:00 | Tabla `profiles` + trigger idempotente en `auth.users` + `identity_link_events` | `ecaf4696e226f07629fcf0e531a688ee5732258316f632dd32de53e108dffb79` | `auth.users` (Supabase nativo) | **NO aplicada** — solo probada contra PGlite |
| 6 | `supabase/migrations/20260718030000_auth_rate_limits.sql` | 2026-07-18 03:00:00 | Tabla `auth_resend_attempts` (rate limit de reenvío de confirmación) | `30dc7657606c7efa1e386e55c1ddcf2e999998dc49c042c9b473b4701d636ce9` | ninguna | **NO aplicada** — solo probada contra PGlite |

**Migraciones nuevas de esta fase de identidad: #3, #4, #5, #6 → 4 migraciones, no 5.**

## Orden de aplicación obligatorio
`#1 → #2 → #3 → #4 → #5 → #6` (los timestamps ya imponen este orden si se usa cualquier runner que ordene alfabéticamente por nombre de archivo, que es la convención de Supabase CLI).

## Verificación de checksums (reproducible)
```bash
sha256sum supabase/migrations/*.sql
```
Los valores deben coincidir exactamente con la tabla de arriba. Si no coinciden, el archivo fue modificado después de este informe y el inventario debe regenerarse.
