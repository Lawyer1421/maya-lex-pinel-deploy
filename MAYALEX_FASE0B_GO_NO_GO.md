# Decisión GO / NO-GO — preparación de Preview (Fase 0B)

| Criterio GO | Estado | Evidencia |
|---|---|---|
| `src/` está versionado | ✅ Cumplido | Commit `012c9fc0e193b08348ae14d4caf87edcf5cfb233` |
| El repositorio está limpio | ⚠️ Parcial | `src/` recuperado; **el refactor de `lib/supabase*.ts`/`ChatInterface.tsx` que depende de `src/` sigue sin commitear**, fuera del alcance explícito de esta Fase 0B (que solo pedía recuperar `src/`, sin mezclar con correcciones funcionales) |
| Build fuera de OneDrive exitoso | ✅ Cumplido | `MAYALEX_FASE0B_CLEAN_BUILD.md` — 29.1s, sin errores fatales |
| Tests pasan | ✅ Cumplido | 93 passed + 1 skipped (12 archivos, rama de seguridad) |
| No existen secretos en git | ✅ Cumplido | Verificado en Fase 0 y reverificado en Fase 0B, ambos commits |
| Migración pasa en Supabase no productivo | ✅ Cumplido | `MAYALEX_FASE0B_SUPABASE_STAGING_RLS.md` — staging real, no solo PGlite |
| Autenticación funciona | ⚠️ No verificado en esta fase | Requiere sesión de navegador real contra un Preview desplegado — fuera del alcance de esta sesión de terminal |
| Lectura de planes funciona | ⚠️ Parcialmente verificado | Verificado a nivel SQL (`service_role` puede leer/escribir con RLS activo); no verificado end-to-end vía `/cuenta` con sesión real |
| Webhook sandbox funciona | ❌ No probado en esta fase | No se ejecutó ninguna prueba contra el sandbox de PayPal en esta sesión |
| Aislamiento entre usuarios funciona | ✅ Cumplido | `MAYALEX_FASE0B_SUPABASE_STAGING_RLS.md` — usuario A no puede leer/escribir la fila de usuario B, confirmado en Supabase real |
| Rollback seguro está documentado | ✅ Cumplido | Migración actualizada — desactivar RLS queda como último recurso explícitamente advertido, no como procedimiento principal |

## Criterios NO-GO — verificación explícita de cada uno

| Condición NO-GO | ¿Se cumple? |
|---|---|
| El build no es reproducible | No — es reproducible, confirmado en `C:\dev\mayalex-validation` |
| Existen archivos fuente fuera de git | No para `src/` (ya recuperado); **sí existen modificaciones sin commitear a archivos ya rastreados**, que es una condición distinta y menos severa |
| Aparecen secretos | No |
| Usuario A puede leer a usuario B | No — confirmado bloqueado |
| El frontend deja de reconocer el plan | No verificado — no confirmado ni refutado |
| El webhook falla | No verificado — no confirmado ni refutado |
| La migración exige desactivar RLS para recuperar funcionalidad | No — el rollback documentado no depende de eso como primer recurso |
| No puede reconstruirse el deployment | No — reconstruible, confirmado con el build limpio |

## Decisión

**GO CONDICIONAL para preparar Preview** — ninguna condición de NO-GO se cumple de forma confirmada, y los criterios de GO más críticos (repositorio libre de secretos, build reproducible, aislamiento RLS entre usuarios verificado contra Supabase real, rollback seguro documentado) están cumplidos con evidencia directa.

**Condición para el GO pleno**: los 3 puntos marcados ⚠️/❌ (autenticación real, lectura de plan vía `/cuenta`, webhook de PayPal en sandbox) no bloquean la preparación de un Preview — **son exactamente lo que un Preview real permite validar** (igual que se hizo en fases anteriores de esta sesión para el fix de RAG v2 y el SEO programático: primero Preview, luego validación manual con sesión real del propietario, luego autorización explícita de merge). No se recomienda declarar GO pleno para producción hasta completar esas 3 verificaciones en un Preview real.

**No se realizó push ni se creó ningún Preview en esta sesión** — esta decisión es de preparación, no de ejecución.
