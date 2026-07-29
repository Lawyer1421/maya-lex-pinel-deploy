---
name: mayalex-preflight
description: Verificación previa a cualquier operación del harness de Maya Lex — rama correcta, árbol limpio, sin secretos en staged, estado del harness coherente. Ejecutar antes de commit, merge, deploy o ingesta.
---
# Preflight de Maya Lex
1. `node scripts/harness/verify-branch.mjs` — confirma que NO estás en main y que la rama coincide con la tarea en harness/TASK_QUEUE.json.
2. `node scripts/harness/verify-secrets.mjs` — escanea el diff staged por patrones de secretos (JWT, sk-, claves PEM, URLs con credenciales). Bloquea si encuentra algo.
3. `git status --short` — el árbol no debe tener cambios tracked ajenos a la tarea actual (FILE_OWNERSHIP.yaml).
4. Lee harness/STATE.json: si la fase actual es BLOCKED o ROLLED_BACK, detente y reporta en vez de continuar.
5. Registra el resultado en harness/RUN_LEDGER.jsonl (`{"ts","fase","accion":"preflight","resultado"}`).
