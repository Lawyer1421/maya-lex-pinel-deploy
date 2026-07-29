# MAYA LEX V2 — QA final de la iteración de remediación

**Fecha:** 2026-07-29 · **Rama:** `feature/mayalex-v2-accelerated-relaunch`
**Alcance validado:** los 4 bloqueadores autorizados (13 rutas 404, build determinista, entorno del Preview, accesibilidad).
**Método:** Playwright real (Chromium) sobre el build de producción local (`next build` + `next start`), 16 páginas × 2 viewports; axe-core; verificación de red por request; 3 builds fríos; evidencia cruda en `artifacts/mayalex-v2-remediacion/`.

## 1. Resultados por bloqueador

### Bloqueador 1 — 13 rutas 404 → CERRADO ✅

- 13 rutas nuevas construidas con **1 plantilla + 1 archivo de configuración** (cero duplicación): 6 páginas de producto + `/soluciones/[perfil]` dinámica para 7 perfiles.
- Cada página: título, propuesta de valor, funciones, caso de uso, bloque honesto de cobertura/límites, CTA funcional, nav, footer, responsive, metadatos propios, cero afirmaciones jurídicas no verificadas.
- Auditoría de enlaces: **17 destinos internos únicos, todos HTTP 200, cero 404** (`MAYALEX_V2_LINK_AUDIT_FINAL.csv`).

### Bloqueador 2 — build determinista → CERRADO ✅

- Rutas desde manifest local versionado; contenido con timeout/retry/fallo-duro; verificación postbuild obligatoria (`MAYALEX_V2_BUILD_DETERMINISM.md`).
- **3 builds fríos consecutivos idénticos**: 428/428 páginas, postbuild `✓ 198 /leyes + 198 /consultas + 16 estáticas` en los tres.
- El mecanismo ya demostró su valor en el mundo real: bloqueó el Preview con credencial rota (ver Bloqueador 3).

### Bloqueador 3 — entorno del Preview → CONFIRMADO ✅ (con hallazgo bloqueante nuevo)

- **Confirmado con evidencia directa del runtime de build de Vercel**: el ámbito Preview apunta a `aicak…lkqj` (staging esperado), NO a producción. Cero variables PayPal en ámbito Preview.
- **Hallazgo nuevo:** la `SUPABASE_SERVICE_ROLE_KEY` del ámbito Preview es inválida desde su creación (los "no encontrado" del Preview anterior eran fallos silenciados). Variables `sensitive` = solo el fundador puede re-guardarlas. Detalle e instrucciones en `MAYALEX_V2_PREVIEW_ENV_VERIFIED.md`.

### Bloqueador 4 — accesibilidad → CERRADO ✅

- Contraste CTA: 3.41:1 → **5.28:1** (hover 6.33:1). Heading-order de /pricing corregido.
- **axe: 0 violaciones en las 16 páginas** (`MAYALEX_V2_ACCESSIBILITY_FINAL.md`). Sin afirmar WCAG completo.

## 2. QA transversal de las 16 páginas (local, build de producción)

| Verificación | Resultado |
|---|---|
| Enlaces internos | 17/17 en HTTP 200 — 0 × 404 |
| Overflow horizontal (desktop 1440 + móvil 390) | 0 páginas |
| Violaciones axe | 0 |
| Llamadas a Supabase/PayPal desde el navegador | 0 en las 32 cargas |
| Errores de consola | 0 de ejecución JS; 3 balizas de Google Analytics (`G-50…`) bloqueadas por la red del sandbox local — preexistente (GA se agregó a producción semanas atrás), no es código V2 |
| Metadatos | título + description propios y `h1` único en las 16 páginas (verificado programáticamente) |
| Capturas | 32 PNG (16 páginas × desktop/móvil) en `artifacts/mayalex-v2-remediacion/` |
| Typecheck / tests | `tsc --noEmit` 0 errores · vitest **166 aprobadas / 1 omitida (167)** — 4 pruebas nuevas de determinismo |
| `npm ci` estricto | ejecutado desde lockfile comprometido antes de las validaciones |

## 3. Estado del nuevo Preview — BLOQUEADO POR CREDENCIAL (no por código)

Los builds de Vercel de esta rama fallan **deliberadamente** (fallo-duro) mientras la credencial Supabase del ámbito Preview siga inválida. No hay Preview READY nuevo que mostrar. El desbloqueo es la corrección de ~5 minutos del fundador descrita en `MAYALEX_V2_PREVIEW_ENV_VERIFIED.md`; tras re-guardar la variable y redeployar, el build validará solo (postbuild 198+198+16) y `/api/diagnostico-preview` dará el veredicto runtime completo.

El Preview anterior (`dpl_47x3VnNrswZcRu6w9xhpoXsfyr1b`, commit `df0b131`) sigue disponible para revisión visual de las 3 páginas originales, con las limitaciones ya documentadas.

## 4. GO/NO-GO

- **GO** del código de la iteración: los 4 bloqueadores autorizados están cerrados y validados con evidencia real; la rama está lista para generar su Preview en cuanto la credencial se corrija.
- **NO-GO temporal** para la revisión visual del fundador sobre un Preview nuevo: no existe todavía un deployment READY de esta rama. **Acción única de desbloqueo: re-guardar la(s) variable(s) Supabase del ámbito Preview (fundador) y redeployar.**
- Sin cambios: NO merge, NO PR, NO producción (verificado: `mayalexhn.com` sigue en `dpl_2EDSNygiaUK882PLcG1RhZB7AHaV`, `main` en `6cdc33a`), NO pagos, NO migraciones, NO ingestión de legislación.
