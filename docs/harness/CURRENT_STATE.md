# Estado actual — 2026-07-29

## Producción

- **Maya Lex V2 DESPLEGADA** en https://mayalexhn.com — merge `72f762a` (READY 47s).
- Tag de restauración: `pre-mayalex-v2-production-20260729-0525`; rollback target `dpl_7CJ65VaWFEggAhkEYbT7SZfQA1Aq`.
- Smoke: 16 páginas 200, `/chat` y `/cuenta` 307 (auth intacta), sitemap 62, `/leyes/11` "norma verificada", 0 errores de consola (navegador real), 0 llamadas PayPal en páginas públicas.
- Usuarios/suscripciones invariantes pre/post: 69 / 6 (2 pro/active, 2 pro/trialing, 2 academico/trialing).
- Estado global: **OBSERVING**.

## Ramas vivas

| Rama | Worktree | Estado |
|---|---|---|
| `main` | checkout OneDrive (no editar) | 72f762a en producción |
| `feature/mayalex-v2-accelerated-relaunch` | — | fusionada; conservar hasta cerrar observación |
| `chore/mayalex-delivery-harness` | `C:\dev\mayalex-harness` | harness IMPLEMENTED (este árbol) |
| `feature/mayalex-official-corpus-p0` | `C:\dev\mayalex-corpus` | por crear (F2) |
| `feature/mayalex-frontier-capabilities` | `C:\dev\mayalex-frontier` | PLANNED (F4) |

## Cómo reanudar desde otra sesión

1. Leer `harness/STATE.json` y `harness/TASK_QUEUE.json` de esta rama.
2. Verificar producción: `node scripts/harness/smoke-production.mjs`.
3. Tomar la primera tarea PLANNED de la cola respetando `FILE_OWNERSHIP.yaml`.
4. Preflight antes de cualquier commit.

## Gobernanza económica (activa desde 2026-07-29)

- Fable 5 solo para: arquitectura, P0/P1, seguridad, privacidad crítica, vigencia jurídica compleja, decisiones de producción y rollback.
- Sonnet: ejecutor principal (código, ingesta, integración, pruebas, Preview, gateway, docs).
- Haiku: inventarios, clasificación, metadatos, logs filtrados, dedup, índices.
- Ver `harness/MODEL_ROUTING.yaml`, `COST_POLICY.yaml`, `COMMAND_CACHE.json`, `CONTEXT_MANIFEST.json`, `ARTIFACT_INDEX.json`, `AI_BUDGETS_BY_PLAN.yaml`.
- Suite y build completos SOLO antes de Preview/merge/producción/cierre; durante implementación: módulo modificado + typecheck incremental.

## Riesgos abiertos

- La anon key del ámbito Preview reporta ausente en runtime (`anonKeyPresente:false`) — sin impacto en páginas públicas (usan service role server-side); revisar si algún flujo de Preview requiere cliente browser de Supabase.
- Tap targets del menú móvil de navegación (no footer) quedaron en ~36px — dentro de umbral funcional, mejorable.
- Observación post-release: revisar Vercel logs/analytics en las primeras 24 h.
