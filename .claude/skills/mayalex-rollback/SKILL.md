---
name: mayalex-rollback
description: Rollback automático de producción de Maya Lex al deployment anterior registrado, con verificación e informe de incidente. Usar ante cualquier condición de rollback del RELEASE_MANIFEST.
---
# Rollback
1. Lee RELEASE_MANIFEST.json → rollbackTarget (deployment id anterior verificado como restaurable).
2. `npx vercel rollback <rollbackTarget>` (alias mayalexhn.com vuelve al deployment anterior; el código de main NO se reescribe — jamás force-push para "revertir").
3. Verifica: /api/version == commit anterior; homepage 200; login OK; conteos Supabase intactos.
4. Si el rollback de alias no basta (cambio de datos), DETENTE: restauraciones de datos son decisión humana (detención obligatoria n.º 2/3).
5. Informe de incidente en docs/harness/INCIDENT_RUNBOOK.md (cronología, causa, evidencia sanitizada, acción correctiva).
6. STATE→ROLLED_BACK; no re-desplegar hasta autorización del fundador.
