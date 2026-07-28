# MAYALEX — Esquema de aprobación V0–V5 (Paquete D)

Código: `lib/ingesta-oficial/estados.ts` (clase `MaquinaEstadosCorpus`). Pruebas: `tests/ingesta-oficial-estados.test.ts` (12 pruebas, todas pasando). Persistencia real (staging): tabla `public.ingestion_audit_log` en `mayalexhn-staging`, RLS habilitado, sin acceso de `anon`/`authenticated` (mismo patrón que `private_instruments_staging`).

## 1. Los 6 estados

| Estado | Nombre | Disponible para |
|---|---|---|
| V0 | Capturado | Nada — recién ingresado |
| V1 | Fuente identificada | Nada |
| V2 | Integridad comprobada | Nada |
| V3 | Vigencia analizada | Respuestas profesionales **solo con advertencia explícita** |
| V4 | Revisión profesional | Beta profesional |
| V5 | Producción | Producción general |

`disponibleParaRespuestasProfesionales(estado)` devuelve `true` únicamente para V4/V5 — V0-V2 quedan excluidos por diseño, no por convención.

## 2. Reglas de transición

- Solo se puede avanzar un nivel a la vez (V0→V1→V2→...) — no se permite saltar directo de V0 a V3, por ejemplo.
- No se permite retroceder mediante `promover()` (un rollback de estado sería una operación distinta, deliberadamente no expuesta por esta función).
- **V3→V4 y V4→V5 requieren un rol autorizado** (`abogado_revisor_senior` o `propietario_despacho`, ver `ROLES_AUTORIZADOS_PROMOCION`). Cualquier otro rol (incluyendo procesos automáticos) es rechazado.

## 3. Auditoría — sin excepciones

Toda llamada a `promover()`, apruebe o rechace, genera un `RegistroAuditoria` con timestamp, `norm_id`, estado origen/destino, actor completo (identificador + rol), resultado y motivo. La clase mantiene este registro en memoria (`obtenerAuditoria()`) y, en el flujo real, cada registro se persiste en `ingestion_audit_log` (staging) — verificado en la demo del Paquete E: 5 intentos de promoción, incluyendo un rechazo por rol no autorizado, quedaron los 5 escritos en la tabla de auditoría real.

## 4. Por qué el corpus actual no puede saltar a V4/V5 todavía

Ninguna materia del corpus legacy llega siquiera a V3 con evidencia completa (falta la columna `fuente` en el 100% de Penal, hay 76.6% de contaminación general). El esquema de aprobación está listo para usarse en cuanto el pipeline de la fuente oficial (Paquete C) produzca candidatos limpios — pero la promoción a V4/V5 seguirá bloqueada para un rol no autorizado incluso entonces, por diseño.
