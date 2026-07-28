# Runbook de despliegue — Fase 0 (P0-1: RLS en `subscriptions`)

**Estado**: diseñado y probado localmente (PGlite). **No ejecutado contra Supabase real** por regla explícita de esta tarea.

## Procedimiento paso a paso (no ejecutado)

1. **Respaldo verificado**: exportar `subscriptions` completa (vía dashboard de Supabase o `pg_dump` de esa sola tabla) antes de tocar nada. Confirmar el archivo de respaldo existe y tiene el número de filas esperado (6, según la última verificación de esta sesión).
2. **Commit limpio**: la rama `security/baseline-p0-subscriptions` (creada en esta sesión, solo local) debe contener únicamente los archivos de esta Fase 0 — revisados en `MAYALEX_FASE0_REMEDIACION_SEGURIDAD.md` antes de cualquier push.
3. **Rama de seguridad**: ya creada localmente. Push a `origin` requiere autorización explícita adicional (no otorgada en esta tarea).
4. **Preview deployment**: una vez autorizado el push, Vercel generará un Preview automáticamente (patrón ya usado exitosamente en esta sesión para el trabajo de RAG v2 y SEO).
5. **Supabase staging**: `mayalexhn-staging` (proyecto `aicakncgtuiiuomflkqj`) está vacío hoy (verificado en auditorías previas de esta sesión) — debe poblarse con el schema real (`supabase/subscriptions.sql` y las demás migraciones) antes de poder probar ahí.
6. **Datos ficticios**: insertar 3-5 filas de prueba en `subscriptions` de staging con `user_identifier` claramente ficticios (ej. `email:test-qa@ejemplo-no-real.com`) — nunca copiar filas reales de producción a staging sin anonimizar.
7. **Ejecución de la migración en staging**: aplicar `supabase/migrations/20260727000000_enable_rls_subscriptions.sql` contra el proyecto de staging únicamente.
8. **Pruebas RLS en staging**: repetir manualmente los mismos 9 escenarios de `tests/sql/rls-subscriptions.sql.test.ts`, pero contra el Supabase de staging real (con la anon key y una sesión autenticada real de staging), no solo contra PGlite.
9. **Pruebas de PayPal sandbox**: crear una suscripción de prueba en el sandbox de PayPal apuntando al webhook de staging, confirmar que `subscriptions` se actualiza correctamente con RLS activo.
10. **Smoke tests**: login (magic link + Google) en Preview, carga de `/cuenta`, verificación de que el banner de estado de plan se muestra correctamente.
11. **Revisión humana**: el propietario del producto revisa el diff completo y los resultados de staging antes de autorizar el paso 12.
12. **Migración transaccional en producción**: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY; ALTER TABLE ... FORCE ROW LEVEL SECURITY;` dentro de una transacción — ya diseñada así en el archivo de migración.
13. **Verificación inmediata**: repetir el advisor de seguridad de Supabase (`get_advisors`, tipo `security`) contra producción — el hallazgo `policy_exists_rls_disabled` para `subscriptions` debe desaparecer.
14. **Monitoreo**: revisar `vercel logs` de producción los primeros 15-30 minutos buscando cualquier error 500 en `/cuenta` o `/api/paypal/*`.
15. **Rollback**: `ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;` — instantáneo, sin pérdida de datos, ya documentado en el propio archivo de migración.

## Criterios GO / NO-GO

**GO** si, tras el paso 13 en producción:
- El advisor de seguridad ya no reporta `policy_exists_rls_disabled` para `subscriptions`.
- `/cuenta` carga correctamente con una sesión real (verificado manualmente por el propietario).
- El webhook de PayPal procesa un evento real (o de sandbox) sin error en los primeros 15 minutos.

**NO-GO (rollback inmediato)** si:
- Cualquier error 500 en `/cuenta`, `/api/paypal/webhook`, `/api/paypal/create-subscription` o `/api/paypal/verificar-estado`.
- Un usuario real reporta no poder ver su estado de plan.
- El advisor de seguridad muestra un error inesperado nuevo tras el cambio.

## Confirmación de alcance de esta sesión

Ningún paso de este runbook fue ejecutado contra Supabase de producción, staging, ni Vercel — el runbook es exclusivamente el documento de procedimiento solicitado, probado únicamente a nivel de diseño y de pruebas locales con PGlite.
