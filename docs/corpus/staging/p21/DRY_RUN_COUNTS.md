# P21 — DRY_RUN_COUNTS (staging `aicakncgtuiiuomflkqj`; NO APLICADO)

Estado global: **ningún dry-run se pudo ejecutar**. Las cuatro fuentes siguen sin ser alcanzables desde el entorno
(`curl` → `CONNECT tunnel failed, response 403`, 2026-10-26). Sin bytes no hay SHA-256 recalculado, así que ningún
instrumento llega a `READY_FOR_STAGING_REVIEW`. Todo conteo es `NO_VERIFICADO`; no se inventó ninguno.

## Descarga y verificación de SHA-256

| Fuente | Resultado | SHA-256 esperado | SHA-256 obtenido |
| --- | --- | --- | --- |
| A Código de Comercio (BCH) | 403 — ABORTADA | `57c42a07…f74a` | NO_VERIFICADO |
| B1 Gaceta 33,801 (Drive) | 403 — ABORTADA | `8ec5d27b…68f7` | NO_VERIFICADO |
| B2 COTEJO-D59-2015-literal.md (Drive) | 403 — ABORTADA | `7bbe492e…25e6` | NO_VERIFICADO |
| C Gaceta 33,445 (ENAG) | 403 — ABORTADA | `3b42a1f9…a4cb` | NO_VERIFICADO |
| D Ley de Garantías Mobiliarias (TSC) | 403 — ABORTADA | `66270e8d…f267` | NO_VERIFICADO |

Reintento: `node tools/corpus/p21-verify-sources.mjs <dir>` (solo HTTP público; sin BD, sin variables de entorno). Nota: ese
script usa `fetch` de Node, que no pasa por el proxy del entorno; en este entorno el intento dio `ENOTFOUND`.

## Esperado vs obtenido

| Instrumento | Estado | Artículos esperados | Candidatos / aceptados / rechazados / finales / excluidos |
| --- | --- | --- | --- |
| Código de Comercio (Decreto 73-50) | BLOCKED_SOURCE_UNREACHABLE | excluidos 418 y 1662 (brecha); resto NO_VERIFICADO | NO_VERIFICADO |
| Código del Notariado (D.59-2015) | BLOCKED_SOURCE_UNREACHABLE | 72, 72-A, 73 (CONTEXT; 72-A PENDING_CLO) | NO_VERIFICADO |
| D.284-2013 Título II | BLOCKED_SOURCE_UNREACHABLE | 15..25 (11) | NO_VERIFICADO |
| Ley de Garantías Mobiliarias D.182-2009 | BLOCKED_SOURCE_UNREACHABLE (previsto NEEDS_TEXT_LAYER) | sin filas | n/a |

SHA-256 de cada `load.staging.sql`: los archivos son plantillas con el INSERT comentado y sin filas; su hash se calcula con
`sha256sum docs/corpus/staging/p21/*/load.staging.sql`.

## Brecha de esquema (BLOCKED_SCHEMA + EMBEDDINGS_PENDING)

Columnas que usa el INSERT de `load.staging.sql` y dónde están definidas en el repo:

| Columna | `supabase/vectores.sql` | `supabase/migrations/` |
| --- | --- | --- |
| `id` | sí (PK) | — |
| `coleccion`, `materia`, `contenido`, `num_articulo`, `fuente`, `metadata` | sí | — |
| `embedding` (`vector(384) NOT NULL`) | sí | — |
| `created_at` | sí | — |
| `revision_pendiente` (no usada por el INSERT) | no | sí (`20260925055249_revision_pendiente_instrumentos.sql`) |
| **`jurisdiccion`** | **no** | **no** (solo referenciada en una función) |
| **`fuente_tipo`** | **no** | **no** (solo referenciada en una función) |
| **`es_norma_vigente`** | **no** | **no** (solo referenciada en una función) |

Consecuencia (confirmada por CLO): el INSERT va **comentado** y marcado `BLOCKED_SCHEMA`; además `embedding` es `NOT NULL` y
no hay embeddings locales: `EMBEDDINGS_PENDING`. No se creó ninguna migración. Las tres columnas existen en producción
según auditorías previas, pero su DDL no está versionado en el repo; el cierre correcto es que Fredy/CLO decidan cómo
versionarlo, fuera de este PR.
