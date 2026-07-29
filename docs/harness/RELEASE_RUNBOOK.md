# Runbook de release a producción

Procedimiento canónico (ejecutado con éxito para V2 el 2026-07-29):

1. **Preflight**: `node scripts/harness/preflight.mjs` en el worktree de la rama.
2. **Gates build**: `npm ci && npx tsc --noEmit && npm test && npm run build` (postbuild de conteo incluido). Si el código cambió desde el último Preview: 2 builds fríos adicionales idénticos.
3. **Preview**: push de la rama → esperar READY (`npx vercel inspect <url> --wait`) → token (`get_access_to_vercel_url`) → `/api/diagnostico-preview` (staging ✓, PayPal ausente) → QA 16 páginas (0 en todos los contadores).
4. **Snapshot**: conteos agregados de producción (SQL solo-lectura, sin PII) → `node scripts/harness/create-release-snapshot.mjs <mainCommit> <deploymentActual> <usuarios> <suscripciones>` → push del tag.
5. **Merge controlado**: `git checkout -b release/<n> origin/main` → `git merge --no-ff origin/<rama>` → `git diff release/<n> origin/<rama> --stat` (≈vacío) → gate final (tsc+test+build).
6. **Promoción**: `git push origin release/<n>:main` (única vía; el hook bloquea cualquier otra). Vercel despliega automáticamente.
7. **Verificación**: `/api/version` == commit del merge → `node scripts/harness/smoke-production.mjs` → conteos Supabase invariantes → consola limpia en navegador real.
8. **Observación**: STATE→OBSERVING; revisar logs 24 h.
9. **Rollback** (si aplica): ver INCIDENT_RUNBOOK.md.

Prohibido en todo el flujo: force-push, rebase destructivo, `vercel --prod`, tocar
usuarios/suscripciones/migraciones, combinar cambios de alto riesgo en un deployment.
