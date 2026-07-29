# Maya Lex Autonomous Delivery Harness

Coordina worktrees, agentes, gates, evidencias, despliegues y rollback de Maya Lex.

## Ciclo operativo

INSPECT → PLAN → EXECUTE → TEST → EVALUATE → PREVIEW → VERIFY → PROMOTE → SMOKE TEST → OBSERVE → ROLLBACK OR CONTINUE

## Estados

PLANNED · RUNNING · BLOCKED · IMPLEMENTED · VERIFIED · PREVIEW_READY · PRODUCTION_READY · DEPLOYED · OBSERVING · ROLLED_BACK · COMPLETED

## Archivos

- `STATE.json` — estado global y por fase; fuente de verdad para reanudar cualquier sesión.
- `TASK_QUEUE.json` — cola de tareas con agente responsable.
- `RUN_LEDGER.jsonl` — bitácora append-only de acciones (una línea JSON por evento).
- `FILE_OWNERSHIP.yaml` — propiedad de rutas; dos agentes no editan el mismo dueño a la vez.
- `QUALITY_GATES.yaml` — gates por etapa; obligatorios bloquean.
- `RELEASE_MANIFEST.json` — release actual, snapshots, rollback target, condiciones de rollback.

## Reglas de oro

1. Producción solo por merge controlado a `main` con todos los gates verdes (nunca push directo, nunca force, nunca `vercel --prod` manual — bloqueado por hook).
2. Todo release lleva tag `pre-*`, snapshot agregado sin PII y rollback target verificado.
3. El estado se persiste en estos archivos, no en la memoria de la conversación.
4. Ante condición de detención obligatoria: BLOCKED + reporte; jamás improvisar.
