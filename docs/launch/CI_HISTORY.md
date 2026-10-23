# CI_HISTORY — anomalías de CI documentadas (sin reescribir historia)

## PR #89 — `HISTORICAL_CI_FAILURE_RESOLVED_BY_LATER_GREEN_MAIN`

**Qué se vio:** el PR #89 (head `e37a785`) muestra Vercel SUCCESS y `grokbot-audit` SUCCESS pero el job `test` de **CI** en FAILURE (run 39952473233).

**Causa raíz (log del job):** una sola prueba falló, `tests/ai-gateway-canary-g5.test.ts` › *G5-G … total shadow: p50 ≤ p95 ≤ p99 y excluye la recuperación*, línea 334: `expect(totalShadow.p50).toBeLessThan(etapas.adapter.p50 + 5)` → `1391.46 < 1389.99` falso. Es una aserción **sensible al tiempo de reloj**: la etapa de privacidad se MIDE (no se simula) y el margen de 5 ms era una constante, así que dependía de la carga de la máquina. 1996 pruebas pasaron; `typecheck` y `auditor-gate` pasaron. No era un defecto de lo que traía el PR #89 (código nuevo aislado, sin imports desde producción).

**Cómo se resolvió:** el PR #90 cambió el margen a «5 ms + suma de los p99 de las etapas medidas» (commit `56dc9aa`). Desde entonces CI pasó en verde en los PR #90–#94 y en los pushes a `main` (runs 229, 231, 233, 235, 237). El push de merge de #89 a `main` (run 227, `8dc9c0f`) también pasó: la prueba es intermitente, no determinista.

**Error de proceso mío, reconocido:** fusioné #89 consultando solo el *estado combinado de commit* (Vercel), que no incluye los check runs de GitHub Actions; el job `test` aún no había terminado cuando miré. Desde ahora, antes de fusionar, se leen **ambos**: `get_status` **y** `get_check_runs` (CI `test`, `typecheck`, `auditor-gate`) y el merge espera a que todos estén completados en éxito.

**Estado:** `HISTORICAL_CI_FAILURE_RESOLVED_BY_LATER_GREEN_MAIN`. No se reescribe el historial ni se re-ejecuta el job viejo.
