# MayaLex — Retrieval V4: estado actual del retrieval

- **Base inspeccionada:** `origin/main` = `c3847d9297b63dc8b45b700ec7fd82d471f0171f`
- **Fecha de inspección:** 2026-10-09
- **Alcance:** lectura de código, migraciones y scripts del repositorio en la base indicada. No se consultó producción, no se ejecutó ninguna query, no se activó ningún flag.
- **Naturaleza:** descripción del comportamiento **en código**. No certifica qué está desplegado, qué flags están activos en la base ni qué corpus está cargado. Esos puntos se marcan como NO VERIFICADO.
- Rama local `main` se encuentra en `6d4a185`, por detrás de `origin/main`. No se modificó.

---

## 1. Ruta de recuperación real

```
POST /api/chat                                  app/api/chat/route.ts
  │  modo: CLAUDE_CONFIG / CLAUDE_CONFIG_PENAL   lib/system-prompt.ts:292-408
  │  ruta: RUTA_A | RUTA_B | RUTA_C | RUTA_D     route.ts:10-13 (cabecera)
  ▼
buscarRAG(consulta, k=5, coleccion, materia)    lib/rag/search.ts:226
  │
  ├─ backend = disabled ─────────────► CONFIGURATION_ERROR          search.ts:235-249
  │
  ├─ backend = supabase
  │    ├─ detectarArticuloExacto(consulta)     exact-resolver.ts:254
  │    │    └─ si hay número de artículo:
  │    │         buscarArticuloExacto → consultarPorVigencia       search.ts:95-150
  │    │           SQL: fuente_tipo='codigo', es_norma_vigente=V,
  │    │                revision_pendiente=false, num_articulo=N
  │    │         resolverArticuloExacto(filas, N, instrumento)     exact-resolver.ts:416
  │    │           filtro anonimización · encabezado del artículo · identidad documental
  │    │           ambiguo ──────────────► NO_VERIFIED_EVIDENCE     search.ts:271-277
  │    │           ≥1 candidato ──────────► EXACT_SUCCESS (1 fragmento)  search.ts:279-287
  │    │           sin candidato y hay materia/instrumento ──► NO_VERIFIED_EVIDENCE  search.ts:298-305
  │    │           sin candidato y número desnudo ──► continúa a semántica
  │    │
  │    └─ buscarEnSupabase(consulta, k, coleccion, materia, rerank)  search.ts:365
  │         semantic-retriever.ts:64
  │         ├─ embedQuery → multilingual-e5-small, 384 dims         lib/rag/embed.ts:16-19, 22
  │         ├─ RPC buscar_biblioteca_v2 ×2 en paralelo              semantic-retriever.ts:126-140
  │         │    (a) limite = max(k, 25)            ← RETRIEVAL_WIDE_K, L125
  │         │    (b) limite = 3, solo_norma_vigente=true
  │         ├─ merge por id (no por num_articulo)                  semantic-retriever.ts:152-156
  │         ├─ filtro anonimización (post-RPC)                     semantic-retriever.ts:185
  │         ├─ filtro D6b no vigente codigo HN (post-RPC)          semantic-retriever.ts:186, def. L32-34
  │         ├─ filtro fuente !== null (post-RPC)                   semantic-retriever.ts:187
  │         └─ seleccionarFinal: rerank OFF → slice(0,k)           semantic-retriever.ts:49, 195
  │
  └─ outcome = buildRetrievalOutcome(...)                          lib/legal-retrieval/retrieval-outcome.ts
  ▼
Gate de evidencia en route.ts
  ├─ rutaCorpusObligatoria = ruta ≠ D && usarRouter                route.ts:426
  ├─ evidenciaPrimariaInsuficiente = outcome.evidenceCount === 0   route.ts:427-429
  ├─ requiereEvidenciaCorpus(query, obligatoria)                   evidence-engine.ts:189
  └─ abstención: mensajes distintos para NO_VERIFIED_EVIDENCE vs CONFIGURATION/RETRIEVAL_ERROR   route.ts:442-447
  ▼
construirCitas(fragmentos) · formatearContextoRAG(resultado)     evidence-engine.ts:79, 108
  ▼
LLM: LLM_PROVIDER (default 'anthropic')                          route.ts:99
     'openrouter' = ruta experimental                            route.ts:572-573
```

**Segunda pasada en RUTA_C civil:** `buscarRAG` se invoca de nuevo sobre `mayalex_procedimental` con `k=3` (`route.ts:329-335`).

**Guardia de producción:** con `RAG_BACKEND=python` y localhost en Vercel, el retrieval se deshabilita (`search.ts:315-325`).

---

## 2. Tabla de los 20 puntos de la fase 1

| # | Punto | Hallazgo en código | Ubicación | Estado |
|---|---|---|---|---|
| 1 | Puntos de entrada | `POST` del chat; modo y ruta llegan en el request | `app/api/chat/route.ts` | VERIFICADO |
| 2 | Router / selección de modo | Rutas A–D declaradas en cabecera; la función que asigna la ruta no se reinspeccionó en detalle en esta fase | `route.ts:10-13` | PARCIAL |
| 3 | Resolver exacto | Búsqueda por `num_articulo` con SQL restrictivo y validación documental | `exact-resolver.ts:254, 416`; `search.ts:95-150` | VERIFICADO |
| 4 | Búsqueda semántica | Dos RPC `buscar_biblioteca_v2` + merge + filtros post-RPC | `semantic-retriever.ts:64-204`; `supabase/migrations/20260925055249_revision_pendiente_instrumentos.sql:90-111` | VERIFICADO |
| 5 | Léxico / full-text | **No existe.** Sin `tsvector`, `ts_rank`, `websearch_to_tsquery`, `pg_trgm` ni BM25 en `lib/`, `scripts/` ni `supabase/` | búsqueda exhaustiva en el repo | VERIFICADO (ausencia) |
| 6 | Merge de resultados | Exacto devuelve **un** fragmento (`slice(0,1)`); semántico fusiona por `id` | `exact-resolver.ts:453`; `semantic-retriever.ts:152-156` | VERIFICADO |
| 7 | Filtrado de evidencia | Anonimización, D6b, `fuente !== null`, `revision_pendiente` (SQL) | `primitives.ts:25-27`; `semantic-retriever.ts:185-187`; migración L108 | VERIFICADO |
| 8 | Construcción de citas | `construirCitas` y `formatearContextoRAG` | `evidence-engine.ts:79, 108` | VERIFICADO |
| 9 | Comportamiento fail-close | Estados explícitos; `NO_VERIFIED_EVIDENCE ≠ RETRIEVAL_FAILED` | `types.ts:54-69`; `route.ts:426-447` | VERIFICADO |
| 10 | Campos de identidad | RPC devuelve `id, contenido, num_articulo, fuente, fuente_tipo, jurisdiccion, es_norma_vigente, similarity`. **No devuelve** `materia`, `metadata` ni instrumento/decreto | migración L97 | VERIFICADO |
| 11 | Vigencia | Campo booleano; `solo_norma_vigente` opcional (default `false`); exclusión D6b en TypeScript | migración L95; `semantic-retriever.ts:32-34` | VERIFICADO |
| 12 | Procedencia | Campo `fuente` (texto) y `hash` = SHA-256 de contenido+num_articulo+fuente | `types.ts:25-31`; `primitives.ts:18` | VERIFICADO (el truncado a 8 hex sólo aparece en comentario, no se verificó en la función) |
| 13 | Flags de rerank | `flag_rerank` por defecto `false`. Sin `COHERE_API_KEY` degrada a similitud | `supabase/migrations/20260906000000_flag_rerank.sql:26-28`; `rerank.ts:25, 62-64`; `flags.ts:72-101` | VERIFICADO en código. Estado en base: NO VERIFICADO |
| 14 | Flag de fallback oficial | `flag_official_source_fallback` se lee en `route.ts:525`. **No hay migración que cree la fila.** Sin fila, `isFlagEnabledForUser` devuelve `false` | `route.ts:525`; `flags.ts:87, 95` | VERIFICADO en código. Estado en base: NO VERIFICADO |
| 15 | Embeddings | `intfloat/multilingual-e5-small`, 384 dims, prefijo `query:`, normalización L2 | `lib/rag/embed.ts:16-19, 22, 69` | VERIFICADO en código. Coherencia con los vectores almacenados: NO VERIFICADO |
| 16 | Estructura de chunk | Ingesta CPP segmenta por encabezado de artículo y valida `Artículo N` al inicio. Los chunks legados (76.381 declarados) se copian desde ChromaDB sin verificar su granularidad | `scripts/ingesta-cpp.ts:288-291, 472`; `scripts/seed_vectores.py:6, 38, 174-185` | PARCIAL |
| 17 | Metadatos por unidad | `num_articulo, fuente, fuente_tipo, jurisdiccion, es_norma_vigente, materia, metadata, revision_pendiente` | `seed_vectores.py:185`; migración L32-33 | VERIFICADO |
| 18 | Uso de identificadores | `num_articulo`: filtro exacto. `fuente`: regex por instrumento (`identidadDocumentalCoincide`), también `metadata.documento_origen`. `decreto`: no es columna ni campo de `FragmentoRAG` | `search.ts:106`; `exact-resolver.ts:243-251`; `types.ts:22-33` | VERIFICADO |
| 19 | Latencia introducida | Llamada remota a HF para el embedding (timeout 12 s); dos RPC en paralelo; exacto antes que semántico; fallback oficial con timeout 8 s | `embed.ts:32`; `semantic-retriever.ts:126`; `official-sources/security.ts:19` | VERIFICADO en código. Medición: NO VERIFICADO |
| 20 | Material legalmente ambiguo | Número desnudo sin instrumento cae a semántica, que **no** filtra por instrumento | `search.ts:289-305` (comentario explícito) | VERIFICADO |

---

## 3. Hallazgos que contradicen o matizan la documentación previa

| Afirmación previa | Corrección con evidencia | Fuente |
|---|---|---|
| `RETRIEVAL_WIDE_K = 25` implica 25 candidatos | La RPC aplica `LIMIT least(limite, 20)`. **El máximo efectivo por llamada es 20**, no 25 | `semantic-retriever.ts:125`; migración L110 |
| Las filas `fuente IS NULL` se excluyen de la búsqueda | Ruta **exacta**: exclusión en SQL por `fuente_tipo='codigo'`. Ruta **semántica**: exclusión **después** de la RPC (`fuente !== null`), así que esas filas ocupan posiciones del embudo ancho | `search.ts:107`; `semantic-retriever.ts:187` |
| La exclusión `doc_*` (E7) se aplica en retrieval | **No hay filtro por tipo `doc_*` en el código.** Sólo existe la lista de 41 IDs con `revision_pendiente=true`. La ruta semántica no filtra por `fuente_tipo`. Ver sección 4 | `grep` sobre `lib/`: sin coincidencias de `doc_` |
| La migración de 41 filas ya está en producción | Lo afirma el comentario de la migración (L9). **No verificado** en la base | migración L4-9 |
| `flag_rerank` existe en producción | La migración crea la fila con `enabled=false`. Estado real en la base: NO VERIFICADO | migración 20260906 L26-28 |
| El rerank Cohere funciona | Código presente; sin `COHERE_API_KEY` cae a `slice`. No hay evidencia de ejecución real | `rerank.ts:62-64` |
| Corpus de 76.381 chunks | Cifra documental en comentarios (`seed_vectores.py:6`, `vectores.sql`). **No medida** en esta fase | sin consulta a base |

---

## 4. Exclusiones: dónde se aplican realmente

| Exclusión | Ruta exacta | Ruta semántica | Mecanismo | Alcance verificado |
|---|---|---|---|---|
| `revision_pendiente = true` | SQL (`search.ts:109`) | SQL en RPC (migración L108) | Columna booleana | 41 IDs listados en la migración; tabla de lista no verificada en base |
| `fuente IS NULL` (E4, 8.366 filas declaradas) | SQL implícita (`fuente_tipo='codigo'`) | **Post-RPC** (`semantic-retriever.ts:187`) | Filtro en código | El conteo 8.366 viene del registro CLO; no medido aquí |
| `doc_*` (E7) | Implícita, sólo si no es `codigo` | **Ninguna** salvo `revision_pendiente` | — | **Parcial.** Registro declara `EXCLUDED_BY_TYPE`; el código no tiene ese filtro |
| Anonimización sin limpiar | Post-filtro (`exact-resolver.ts:437`) | Post-filtro (`semantic-retriever.ts:185`) | `contieneArtefactoAnonimizacion` | Patrón regex, `primitives.ts:25` |
| No vigente código HN (D6b) | Vía `es_norma_vigente=false` en SQL | Post-filtro (`semantic-retriever.ts:186`) | Función compartida | Verificado en código |

---

## 5. Riesgos de colección y configuración

- `buscarRAG` declara por defecto `coleccion = 'cpp_honduras'` (`search.ts:229`). El corpus usa `mayalex_normativos`, `mayalex_procedimental` y `mayalex_instrumentos` (`seed_vectores.py:36`). Hoy el route siempre pasa colección explícita (`route.ts:160-170, 311`); un caller futuro que omita el argumento consultaría una colección inexistente. **Siguiente comprobación:** listar callers de `buscarRAG`.
- `RAG_BACKEND`: el valor por defecto existe como test (`tests/rag-backend-default.test.ts`), pero no se leyó en esta fase. El valor configurado en Vercel: NO VERIFICADO.
- El fallback oficial (CEDIJ) y el rerank son rutas de código con flag. Ninguna evidencia en el repo muestra que estén activas.

---

## 6. Qué no se puede afirmar con esta evidencia

- Cuántos chunks están almacenados, elegibles y realmente recuperados en producción.
- Qué flags están activos en la base.
- Si la migración de 41 filas está aplicada.
- Latencia real de cada etapa.
- Calidad jurídica de los resultados.

Estos puntos requieren la comprobación indicada en `MAYALEX_RETRIEVAL_V4_ROADMAP.md`, fase V4.0.
