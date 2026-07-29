# Arquitectura del Maya Lex Autonomous Delivery Harness

## Piezas

| Pieza | Ubicación | Función |
|---|---|---|
| Subagentes | `.claude/agents/*.md` | 7 roles con permisos mínimos: release-manager, corpus-acquisition, legal-integrity, frontier-ai, privacy-security, qa-evals, deployment-rollback |
| Skills | `.claude/skills/*/SKILL.md` | 6 procedimientos operativos: preflight, corpus-ingest, legal-verify, preview, production-release, rollback |
| Hook determinista | `.claude/settings.json` → `scripts/harness/guard-git.mjs` | Bloquea (exit 2) force-push, push directo a main, borrado de main, `git config --global`, DROP/TRUNCATE, `vercel --prod` manual y borrados fuera del área de trabajo. Nunca imprime valores sensibles |
| Gates | `harness/QUALITY_GATES.yaml` + `scripts/harness/verify-*.mjs` | Verificaciones ejecutables por etapa (preflight, build, preview, producción, corpus, evals) |
| Estado | `harness/STATE.json`, `TASK_QUEUE.json`, `RUN_LEDGER.jsonl` | Persistencia entre sesiones; cualquier sesión nueva reanuda desde aquí |
| Release | `harness/RELEASE_MANIFEST.json` + `create-release-snapshot.mjs` + `rollback-release.mjs` | Snapshot, tag, rollback target y condiciones de rollback |
| Runbooks | `docs/harness/*.md` | Reglas operativas, incidentes, releases |

## Flujo de release (implementado y ya ejecutado para V2)

```
rama feature → gates build → push rama → Preview READY
→ /api/diagnostico-preview (staging ✓, PayPal ausente ✓)
→ QA 16 páginas (404/consola/axe/overflow/red = 0)
→ snapshot + tag pre-* + conteos agregados sin PII
→ merge --no-ff en rama temporal desde origin/main
→ diff contra árbol validado (debe ser ≈vacío) + gate final
→ push <temporal>:main  (única vía a producción)
→ Vercel deploy → /api/version == merge commit
→ smoke-production.mjs + conteos invariantes
→ OBSERVING · rollback: vercel rollback <target> (alias, nunca force-push)
```

## Aislamiento de trabajo

Worktrees bajo `C:\dev\mayalex-*`, uno por flujo (qa/release, harness, corpus, frontier).
`FILE_OWNERSHIP.yaml` define qué agente puede tocar qué rutas; pagos, auth y migraciones
están en zona protegida (solo release-manager con gates).

## Verificación de entorno (lección aprendida)

Las variables Vercel `sensitive` son de solo-escritura. La única confirmación fiable del
entorno de un deployment es en runtime: `/api/diagnostico-preview` (solo responde en
Preview; veredicto booleano redactado) y el log de build `[articulos-vigentes]
proyecto_destino=<ref redactado>`.
