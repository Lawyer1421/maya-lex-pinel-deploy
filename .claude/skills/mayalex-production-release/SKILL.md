---
name: mayalex-production-release
description: Promoción controlada de una rama validada de Maya Lex a producción (mayalexhn.com) con snapshot, tag, merge no-ff, verificación y smoke tests. Solo con todos los gates verdes.
---
# Release a producción
1. Preflight + confirmar STATE=PRODUCTION_READY y QUALITY_GATES.yaml todos verdes.
2. Snapshot: `node scripts/harness/create-release-snapshot.mjs` (commit main, deployment actual, conteos agregados de usuarios/suscripciones SIN PII, tag `pre-<release>-YYYYMMDD-HHMM` pusheado).
3. Merge controlado: rama temporal desde origin/main, `git merge --no-ff <rama-validada>`, verificar `git diff` contra el árbol validado (idealmente vacío), gate final (tsc+test+build).
4. Push del merge a main (`git push origin <temp>:main`) — la integración GitHub–Vercel despliega.
5. Espera READY; verifica /api/version == commit del merge.
6. `node scripts/harness/smoke-production.mjs` — 16 páginas 200, sitemap, /leyes con contenido, auth redirect, consola limpia (browser real), conteos Supabase idénticos al snapshot.
7. Si un gate posterior falla → skill mayalex-rollback inmediatamente.
8. STATE→DEPLOYED→OBSERVING; release notes en RELEASE_MANIFEST.json.
