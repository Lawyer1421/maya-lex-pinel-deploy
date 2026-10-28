# Esquema real de `public.biblioteca_vectores` — propuesta de documentación (PROPUESTA_NO_APLICADA)

> **Estado: PROPUESTA_NO_APLICADA.** Este documento no es una migración, no se ejecutó nada y no hay SQL en
> `supabase/migrations/`. Su único fin es dejar por escrito lo que el código del repo espera de la tabla, porque
> tres columnas (`jurisdiccion`, `fuente_tipo`, `es_norma_vigente`) existen en producción pero **no tienen DDL
> versionado**. Lo que sí está versionado: `supabase/vectores.sql` (tabla base) y
> `supabase/migrations/20260925055249_revision_pendiente_instrumentos.sql` (`revision_pendiente`).
> Fredy confirma tipos y nulabilidad reales corriendo la consulta de solo lectura de abajo en `thgr…` (producción) y `aicak…` (staging);
> solo después se decide si algo de esto se convierte en migración, en un PR aparte.

## 1. Qué hay versionado hoy

| Columna | Tipo | Dónde está definida |
| --- | --- | --- |
| `id` | `text` PK | `supabase/vectores.sql` |
| `coleccion` | `text NOT NULL` | `supabase/vectores.sql` |
| `materia` | `text` | `supabase/vectores.sql` |
| `contenido` | `text NOT NULL` | `supabase/vectores.sql` |
| `num_articulo` | `text` | `supabase/vectores.sql` |
| `fuente` | `text` | `supabase/vectores.sql` |
| `metadata` | `jsonb` | `supabase/vectores.sql` |
| `embedding` | `vector(384) NOT NULL` | `supabase/vectores.sql` |
| `created_at` | `timestamptz DEFAULT now()` | `supabase/vectores.sql` |
| `revision_pendiente` | `boolean NOT NULL DEFAULT false` | `supabase/migrations/20260925055249_revision_pendiente_instrumentos.sql` |
| **`jurisdiccion`** | — | **sin DDL en el repo** |
| **`fuente_tipo`** | — | **sin DDL en el repo** |
| **`es_norma_vigente`** | — | **sin DDL en el repo** |

### 1.1 Lo que `supabase/vectores.sql` ya define: índices, RLS y políticas

`supabase/vectores.sql` no define solo las columnas base; también define, **de forma idempotente**, estos objetos. No hace falta proponerlos de nuevo:

| Objeto | Definición en `supabase/vectores.sql` |
| --- | --- |
| Índice `idx_biblio_coleccion` | `create index if not exists … on biblioteca_vectores(coleccion)` |
| Índice `idx_biblio_materia` | `create index if not exists … on biblioteca_vectores(materia)` |
| Índice HNSW sobre `embedding` | **no** está en el archivo: «lo crea el seeder al final» (`scripts/seed_vectores.py`); confirmar con `pg_indexes` en cada proyecto |
| RLS | `alter table biblioteca_vectores enable row level security` (sin `FORCE`) |
| Política `service_only_biblioteca` | `using ((select auth.role()) = 'service_role') with check ((select auth.role()) = 'service_role')`: solo `service_role` lee y escribe |
| Privilegios | `grant select, insert, update, delete on biblioteca_vectores to service_role` (el comentario del archivo explica que `BYPASSRLS` no sustituye al `GRANT` de tabla) |
| RPC base `buscar_biblioteca` | `security invoker`, `stable`, devuelve 4 columnas (`contenido`, `num_articulo`, `fuente`, `similarity`); `grant execute … to service_role` |

Consecuencias para este documento: (a) la propuesta de las tres columnas **no** toca índices, RLS ni políticas; (b) no hay política para otro rol, de modo que la propuesta de un rol de recuperación limitado (ver `docs/retrieval/CLO_ANEXOS_2_3_INVENTARIO_Y_PROPUESTAS.md` en #106) tendría que **agregar** una política `FOR SELECT`, no reemplazar esta; (c) la función de búsqueda que usa el código (con `id`, `fuente_tipo`, `jurisdiccion` y `es_norma_vigente`) es otra distinta de la de 4 columnas de este archivo: la de `supabase/migrations/20260925055249_revision_pendiente_instrumentos.sql` devuelve 8 columnas y filtra `revision_pendiente`.

## 2. Qué asume el código de las tres columnas faltantes

| Columna | Tipo que usa el código | ¿Nulable? | Evidencia (`archivo:línea`) |
| --- | --- | --- | --- |
| `jurisdiccion` | `text` | sí (`string \| null`) | `lib/legal-retrieval/types.ts:29`; `lib/legal-retrieval/semantic-retriever.ts:99`; `scripts/ingestar-ley.ts:610` (`jurisdiccion text`); función SQL en `supabase/migrations/20260925055249_revision_pendiente_instrumentos.sql:97` (`jurisdiccion text`) |
| `fuente_tipo` | `text` | sí (`string \| null`) | `lib/legal-retrieval/types.ts:28`; `lib/legal-retrieval/semantic-retriever.ts:98`; filtro `.eq('fuente_tipo', 'codigo')` en `lib/rag/search.ts:113`; `scripts/ingestar-ley.ts:610` |
| `es_norma_vigente` | `boolean` | sí (`boolean \| null`) | `lib/legal-retrieval/types.ts:30`; `lib/legal-retrieval/semantic-retriever.ts:100`; `lib/rag/search.ts:114`; `lib/legal-retrieval/semantic-retriever.ts:35` (`=== false`); `lib/seo/articulos-vigentes.ts:80` (`.eq('es_norma_vigente', true)`); función SQL `…revision_pendiente_instrumentos.sql:107` (`b.es_norma_vigente = true`); `scripts/ingestar-ley.ts:610` |

Valores observados en producción (consulta 7, 27-oct-2026): `jurisdiccion` ∈ {`HN`, `ES`, `PE`, `INTERNACIONAL`, NULL};
`fuente_tipo` ∈ {`codigo`, `ley`, `sentencia`, `doctrina`, NULL}. Hay decenas de miles de filas con ambos en NULL (las `doc_*` y otras),
y `es_norma_vigente` también tiene NULL (ver `docs/corpus/MAYALEX_CORPUS_GAP_ANALYSIS.md`). Por eso la propuesta **no** pone `NOT NULL` ni `DEFAULT`.

`es_norma_vigente` es booleano: no puede expresar el estado «UNKNOWN» que usa CLO. `false` y NULL no equivalen a «derogada»; el estado
real de vigencia vive en `metadata.vigencia_state` (p. ej. `NO_VERIFICADO`, `UNKNOWN`). No inferir vigencia legal de este booleano.

## 3. DDL propuesta — PROPUESTA_NO_APLICADA

```sql
-- PROPUESTA_NO_APLICADA — NO ejecutar. Documenta el esquema que el código espera.
-- Idempotente y aditiva: no borra ni modifica filas. Sin NOT NULL ni DEFAULT (hay filas con NULL en producción).
ALTER TABLE public.biblioteca_vectores
  ADD COLUMN IF NOT EXISTS jurisdiccion     text,
  ADD COLUMN IF NOT EXISTS fuente_tipo      text,
  ADD COLUMN IF NOT EXISTS es_norma_vigente boolean;

COMMENT ON COLUMN public.biblioteca_vectores.jurisdiccion IS
  'Código de jurisdicción (HN, ES, PE, INTERNACIONAL). NULL = no clasificada. PROPUESTA_NO_APLICADA.';
COMMENT ON COLUMN public.biblioteca_vectores.fuente_tipo IS
  'Tipo de fuente (codigo, ley, sentencia, doctrina). NULL = no clasificada. PROPUESTA_NO_APLICADA.';
COMMENT ON COLUMN public.biblioteca_vectores.es_norma_vigente IS
  'Booleano heredado. NO prueba vigencia legal: el estado real va en metadata.vigencia_state. NULL = desconocido. PROPUESTA_NO_APLICADA.';
```

Si la consulta del punto 4 muestra tipos distintos (p. ej. `character varying`, o `NOT NULL` en alguna columna), esta propuesta se corrige **antes**
de pensar en una migración; el esquema real manda sobre lo que el código supone.

## 4. Consulta de solo lectura para confirmar el esquema real

Archivo: `docs/schema/biblioteca-vectores-columns-readonly.sql` (solo `SELECT`). Fredy la corre en `thgr…` y en `aicak…` y pega las dos salidas:

```sql
select ordinal_position, column_name, data_type, udt_name,
       character_maximum_length, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'biblioteca_vectores'
order by ordinal_position;
```

Comparar: (a) que existan las tres columnas en ambos proyectos; (b) `data_type`/`is_nullable` coinciden con la tabla del punto 2;
(c) `embedding` es `USER-DEFINED`/`vector` con dimensión 384 (la segunda consulta del archivo lo confirma); (d) `revision_pendiente` existe y es `NOT NULL DEFAULT false`.
Si falta alguna columna en staging, es la causa de `BLOCKED_SCHEMA` en `docs/corpus/staging/p21/`.
