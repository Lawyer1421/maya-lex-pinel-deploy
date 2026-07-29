# Reglas operativas del harness

## Siempre

1. Preflight antes de todo (rama + secretos + estado global).
2. Estado persistido tras cada fase (STATE.json, TASK_QUEUE.json, RUN_LEDGER.jsonl, CURRENT_STATE.md).
3. Trabajo solo bajo `C:\dev\mayalex-*` y el checkout oficial verificado.
4. Medir, no estimar: Playwright/axe/builds reales; los números provienen de ejecuciones.
5. Conteos de usuarios/suscripciones siempre agregados y sin PII.
6. Logs y commits sanitizados: jamás valores de credenciales, PII o consultas jurídicas completas.

## Nunca

1. Force-push, rebase destructivo, push directo a main, `vercel --prod` manual (bloqueados por hook).
2. DROP/TRUNCATE o eliminación masiva (condición de detención obligatoria).
3. Rotar/revelar/reconstruir credenciales (solo el fundador; variables sensitive son de solo-escritura).
4. Publicar corpus sin procedencia completa (source record + hash + URL oficial).
5. Declarar V4/V5 o publicar contribuciones sin revisión humana registrada.
6. Usar cuarentena o instrumentos privados para responder consultas.
7. Combinar en un deployment: migración irreversible + cambio de proveedor + rediseño + pagos + función de alto riesgo.

## Detención obligatoria (BLOCKED + reporte)

Credenciales, DROP/TRUNCATE, riesgo a usuarios/pagos/documentos, facturación de
proveedores, divergencia producción↔GitHub↔Vercel, fuente jurídica de autenticidad
indeterminable, datos privados en corpus público, P0 no auto-reversible.

## No detenerse por

Decisiones normales de implementación, errores de compilación corregibles, fallos
transitorios de red, reintentos, creación de pruebas, cambios internos reversibles,
selección entre componentes equivalentes.
