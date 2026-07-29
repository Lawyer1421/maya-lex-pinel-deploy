# Runbook de incidentes y rollback

## Condiciones de rollback automático (post-deploy)

Homepage ≠200 · login roto · variación inexplicada de usuarios/suscripciones · P0 visual
o funcional · 404 en navegación principal · error de entorno · fuga de secreto · llamadas
de pago inesperadas · error persistente de consola · corpus privado accesible.

## Procedimiento

1. `node scripts/harness/rollback-release.mjs` (usa `rollbackTarget` del RELEASE_MANIFEST; ejecuta `vercel rollback` — el alias vuelve al deployment anterior; `main` NO se reescribe).
2. Verificar: `/api/version` == commit anterior; homepage 200; login OK; conteos intactos.
3. Si el problema es de DATOS (no de código): DETENERSE — restauraciones de datos son decisión humana del fundador (condiciones de detención 2/3).
4. STATE→ROLLED_BACK; registrar en RUN_LEDGER.
5. Escribir informe de incidente aquí abajo (cronología UTC, causa raíz, evidencia sanitizada, acción correctiva, prevención).
6. NO re-desplegar producción hasta autorización expresa del fundador; el resto de ramas puede continuar.

## Registro de incidentes

### 2026-07-29 — Credencial Preview inválida (resuelto, sin impacto en producción)
- Los builds de Preview fallaban desde siempre de forma silenciosa; el fallo-duro nuevo lo hizo visible: primero `Headers.set` (whitespace en el valor de la variable), luego `Invalid API key` (clave que no validaba), luego `42501 permission denied` (REVOKE propio de la cuarentena de staging).
- Corrección: saneo de whitespace en código; re-guardado de la variable por el fundador; `GRANT SELECT` a `service_role` en staging (roles públicos siguen bloqueados).
- Prevención: `/api/diagnostico-preview` + log redactado `proyecto_destino` en cada build.
