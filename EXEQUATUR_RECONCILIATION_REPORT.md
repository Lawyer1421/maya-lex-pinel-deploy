# EXEQUÁTUR — RECONCILIATION REPORT (Fase 0-C)

**Estado del documento:** evidencia técnica de reconciliación git, no arquitectura. La arquitectura vive en `EXEQUATUR_MASTER_ENGINEERING_BLUEPRINT.md` (`DRAFT — PENDING ARCHITECTURE APPROVAL`).

**Generado:** 2026-09-14, sesión Fase 0-C, tras `git fetch origin --prune` autorizado. Todas las operaciones fueron lectura de git local + un fetch de red (sin escritura a ningún remoto en el momento de este reporte). Ningún archivo productivo modificado. Ninguna migración ejecutada.

---

## GIT IDENTITY

```
remote: origin → https://github.com/Lawyer1421/maya-lex-pinel-deploy.git
branch local activo: feature/mayalex-rag-citations-integration
Claude HEAD (local): 4ce513e771de9cbdc420fcfa30dfe9dc14379855
origin/main (ANTES del fetch de esta sesión, según refs locales obsoletos): 72f762a
origin/main (DESPUÉS del fetch de esta sesión — SHA real actual): 00b74484a9c933c7e8f0ea995b725509e327f098
merge-base(origin/main, Claude HEAD): dcc13408d249396156156190f91ea67c5ad3dcf7
ahead/behind (origin/main...HEAD): 120 ahead (origin/main tiene 120 commits que Claude HEAD no tiene) / 5 behind (Claude HEAD tiene 5 commits que origin/main no tiene)
worktrees: uno solo — C:/Proyectos/maya-lex-pinel-deploy
```

### `BASELINE_ADVANCED` — confirmado

El SHA que Cursor observó (`00b74484a9c933c7e8f0ea995b725509e327f098`) **es exactamente el `origin/main` actual**, confirmado tras el `fetch` de esta sesión. Mis sesiones anteriores (Fase 0, Fase 0-B, y la primera versión de este Blueprint) trabajaron contra un `origin/main` local **desactualizado** (`72f762a`), porque no había ejecutado `git fetch` desde hacía tiempo. Esto **no es un repositorio distinto ni un hash inventado por Cursor** — es, literalmente, mi copia local quedándose atrás del remoto. Corrijo aquí mi conclusión anterior ("Cursor inspeccionó un estado de repositorio distinto") — la explicación correcta y más simple es que Cursor trabajó contra el remoto real y actualizado, y yo no había traído esos cambios.

Entre `72f762a` y `00b7448` hay **124 commits** en `origin/main`, incluyendo (lista no exhaustiva, ver `git log --oneline --reverse 72f762a..00b7448` para la lista completa de 124):

- `752d8d0 feat(flags): Fase 0 de Operación Facultades Completas — infraestructura de feature flags` — **existe un sistema real de feature flags en producción** (`lib/flags.ts`, tabla `feature_flags`, `KNOWN_FLAGS`, fail-closed por diseño). Esto resuelve la evidencia de ADR-005 (ver Master Blueprint).
- `50de52a fix(rag): fail-closed en codigo antes de invocar al LLM` y `a7be9ee fix(rag): RAG_BACKEND ausente no debe apagar el RAG en silencio` — el "mecanismo fail-closed" que Cursor reportó existe realmente en `origin/main`.
- `c6da65a feat(rag): retrieval en dos etapas con Cohere rerank-v3.5` — una capa de reranking que **no estaba en mi auditoría original** (Fase 0/0-B describen un `origin/main` anterior a esto).
- `df18ad6 Agrega REGLAMENTO_NOTARIADO como instrumento normativo distinto de CODIGO_NOTARIADO` — **directamente relevante a Exequátur**: el corpus ya distingue el Reglamento del Notariado como instrumento propio.
- Múltiples commits `docs(governance): ...` documentando actualizaciones de producción a la base normativa (Código Civil, CPP, Constitución, Código Tributario, Código del Trabajo, Código de Comercio) y un flujo de `HUMAN_LEGAL_REVIEW_QUEUE.jsonl` versionado en git — un mecanismo de gobernanza y revisión legal que ya existe y que Exequátur debería estudiar antes de proponer uno nuevo.

**No re-audité estos 124 commits en profundidad en esta sesión** — el alcance de la Fase 0-C es reconciliación de identidad git, no una nueva Fase 0 completa. Esto queda como trabajo de seguimiento explícito (ver Blueprint, Open Questions).

`git ls-tree -r --name-only origin/main | grep -i "cursor\|exequatur\|ingest-to-supabase"` → **sin resultados**. Ni `CURSOR_EXEQUATUR_BLUEPRINT_REVIEW.md`, ni `CURSOR_FRONTEND_ARCHITECTURE_AUDIT.md`, ni `scripts/ingest-to-supabase.ts` existen en `origin/main`, ni siquiera con el fetch actualizado. La hipótesis más simple ahora: los documentos de Cursor, igual que mi `EXEQUATUR_FASE0_BLUEPRINT.md` original, probablemente nunca se escribieron a disco/git — existen como salida de conversación de Cursor, no como archivos versionados. Sigue siendo `CURSOR_SOURCE_DOCUMENTS_NOT_LOCATED` — no lo doy por resuelto, lo doy por mejor explicado.

---

## LOCAL COMMITS (exclusivos de Claude HEAD frente a `origin/main` actual)

| Commit | Purpose | Shared (en origin) | Classification | Recommendation |
|---|---|---|---|---|
| `8a4ec41` feat(rag): activate Supabase pgvector backend with RPC v2 | Activa RPC `buscar_biblioteca_v2` local | NO | `REQUIRES_REVIEW` | `origin/main` tiene su propia evolución de RAG (Cohere rerank, `buscarArticuloExacto`) — antes de portar esto, comparar si ya existe una solución equivalente o superior en `origin/main` |
| `424edfd` feat(ingesta): add scripts for massive Honduras corpus ingestion (22K+ docs) | Introduce los 5 scripts de ingesta Honduras, incl. `ingest-to-supabase.ts` (co-autor: `Claude Haiku 4.5`, sesión previa distinta a esta) | NO | `INGESTION_WORK` | No portar sin decisión explícita — contiene el defecto de embeddings dummy (Sección INGEST abajo) |
| `70aa580` docs: add Honduras corpus ingestion status report | Documentación de estado | NO | `DOCUMENTATION_ONLY` | Conservar como evidencia histórica; no es código |
| `2381be3` build: configure ingestion scripts + add execution report | Config + reporte de ejecución | NO | `DOCUMENTATION_ONLY` / `INGESTION_WORK` mixto | Igual que arriba |
| `4ce513e` chore: sanitization completed - 22,724 docs scanned, 661 contaminated | Resultado del paso de saneamiento (autor: Fredy Pinel directamente) | NO | `INGESTION_WORK` | El JSON resultante está vacío (`total:0`) — ver Fase 0-B; no representa datos reales listos para producción |

Ningún commit local se clasifica `KEEP_CANDIDATE`, `OBSOLETE` ni `UNRELATED` en esta pasada — todos requieren revisión humana antes de decidir su destino (portar, descartar, o mantener como rama de referencia histórica únicamente).

---

## INGEST

```
Path: scripts/ingest-to-supabase.ts
Status: TRACKED_CURRENT (tracked y presente en Claude HEAD local 4ce513e; NO presente en origin/main ni en ningún branch remoto — ver git log --all -- scripts/ingest-to-supabase.ts, único resultado son los 5 commits locales ya listados)
Commit de introducción: 424edfd89fffefb1885966472c1367a2948be248 (2026-09-13, autor Fredy Pinel, co-autor Claude Haiku 4.5)
SHA256 (working tree, idéntico al blob commiteado en 4ce513e): ffd3ff72ec9ce688fb1181262f9cd2deb5420931c9783f0a1a1e999a7269e478
Entry point: función async ingestToSupabase(), invocada al final del archivo — ejecutable vía `npm run ingest:supabase`
Capacidad de escribir Supabase: SÍ — llama a supabase.from('biblioteca_vectores').insert(batch) (líneas 117-119 y 144-146), usando createServerSupabaseClient() (cliente service-role)
Mecanismo de embeddings: embedQuery() de lib/rag/embed.ts para 1 de cada 100 documentos (i % 100 === 0); el resto recibe new Array(384).fill(0.001)
Fallback dummy: EXISTE LITERALMENTE, líneas 89 y 92, comentado explícitamente `// dummy` y `// dummy para demo` en el propio código fuente
```

No se ejecutó el archivo en esta sesión ni en ninguna anterior de esta serie. No se corrigió. No se incorporó al commit documental de esta Fase 0-C.

**Reconciliado con evidencia compartida:** Cursor no pudo haber visto este archivo trabajando contra `origin/main` — nunca se pushó. No es un caso de `INCORRECT_PREVIOUS_ASSERTION` de ninguna de las dos partes; es un caso de evidencia genuinamente asimétrica (trabajo local no compartido).

---

## FAKE EMBEDDINGS — reconciliación final

| Mecanismo | Archivo | Procedencia | Estado |
|---|---|---|---|
| `FakeEmbeddingProvider` (LCG determinístico) | `lib/ingesta-oficial/embeddings.ts:33-46` | Introducido en `9b48492`, **reachable desde `origin/main` actual** (confirmado: `git merge-base --is-ancestor 9b48492 origin/main` → sí) | `CROSS_VERIFIED` — Cursor lo vio porque está en el remoto compartido; yo lo confirmé releyendo el archivo. Documentado en su propio encabezado como no-productivo, exclusivo para pruebas del pipeline `lib/ingesta-oficial/` sin credenciales |
| `new Array(384).fill(0.001)` | `scripts/ingest-to-supabase.ts:89,92` | Introducido en `424edfd`, **local-only, nunca pusheado** | `CLAUDE_LOCAL_VERIFIED` — Cursor no pudo verlo por la razón anterior, no por error de observación |

Ambos mecanismos son reales, coexisten, y describen pipelines distintos. Ninguna de las dos observaciones originales (mía o de Cursor, tal como me fue relatada) era incorrecta — cada una describía correctamente lo que tenía delante.

**Riesgo permanece `CONTAINED`:** sin cambios respecto a Fase 0-B — 0 filas con huella `HN-` en cualquiera de las dos bases Supabase vivas verificadas (`maya-lex-ia-pinel-hn`, `mayalexhn-staging`). No hay evidencia directa nueva que justifique escalar este riesgo.

---

## BLUEPRINTS

| Archivo | Ruta | Tracked | Hash (SHA-256) | Tamaño | Última modificación | Estado |
|---|---|---|---|---|---|---|
| `EXEQUATUR_FASE0_BLUEPRINT.md` | `C:\Proyectos\maya-lex-pinel-deploy\EXEQUATUR_FASE0_BLUEPRINT.md` | Untracked (confirmado: `git ls-files --error-unmatch` falla) | `1572e1321707ac3fc34cf66040e949fe73bc92eab7d81dbd0c1629c88066733b` | 30,465 bytes | 2026-09-14 13:08 | Existe, íntegro, preservado sin cambios en esta sesión |
| `EXEQUATUR_MASTER_ENGINEERING_BLUEPRINT.md` | `C:\Proyectos\maya-lex-pinel-deploy\EXEQUATUR_MASTER_ENGINEERING_BLUEPRINT.md` | Untracked | `8911a7c1c52c3042ce75b8e28549d0c2165bb525f4d4fc55d1a0e30e23e6ebf1` | 38,872 bytes (antes de la actualización de esta sesión) | 2026-09-14 18:48 | Actualizado en esta sesión con la reconciliación de baseline — ver el propio archivo para el addendum |

Ninguno de los dos se reconstruyó desde cero ni se recuperó de una pérdida — ambos estuvieron presentes y accesibles durante toda la serie de sesiones. La procedencia de ambos es 100% esta serie de conversaciones (Claude), no Cursor ni ningún otro agente.

---

## CONFLICTOS CLAUDE / CURSOR — resueltos

1. **"El blueprint de Claude no existe"** → resuelto: existe, siempre fue untracked, es trivialmente invisible en cualquier commit de cualquier repositorio por diseño (untracked). No relacionado con `BASELINE_ADVANCED`.
2. **"`ingest-to-supabase.ts` no existe"** → resuelto: existe en el HEAD local de Claude, nunca se pusheó a `origin/main` ni a ningún branch remoto — evidencia asimétrica, no observación incorrecta.
3. **"Fake embeddings: LCG vs. `[0.001,...]`"** → resuelto: son dos archivos distintos, ambos reales, ambos coexisten en el repo local actual; uno es compartido (`origin/main`), el otro es local-only.
4. **Commit `00b7448` "no existe"** → resuelto: sí existe — es el `origin/main` actual. Mi fetch anterior estaba desactualizado.

## QUÉ DEBE CONSERVARSE

- Ambos documentos Blueprint (Fase 0 + Master), como evidencia y como documento gobernante respectivamente.
- El registro completo de los 5 commits locales de Claude (no se descartan ni se pierden — quedan identificados, con SHA, listos para que un humano decida su destino).

## QUÉ REQUIERE REVISIÓN

- Los 5 commits locales exclusivos de Claude (tabla arriba) — decisión humana sobre portar, descartar, o mantener como referencia.
- Los 124 commits de avance de `origin/main` — requieren una nueva pasada de auditoría (fuera del alcance de esta Fase 0-C) antes de que el Master Blueprint pueda considerarse una descripción completa y vigente de MayaLex.
- La identidad del proyecto Supabase productivo — sigue `UNVERIFIED_ASSUMPTION: PRODUCTION_SUPABASE_IDENTITY`, sin cambios.

## QUÉ NO DEBE PORTARSE

- `scripts/ingest-to-supabase.ts` tal como está — contiene el defecto de embeddings dummy documentado; no debe mezclarse a `origin/main` sin corrección y revisión.
- Ningún archivo de código de los 5 commits locales se incluye en el commit documental de esta Fase 0-C.
