# EXEQUÁTUR DE NOTARIO — MASTER ENGINEERING BLUEPRINT

**Estado: `DRAFT — PENDING ARCHITECTURE APPROVAL`**

Este es el documento gobernante único. No existen "Claude Blueprint" ni "Cursor Blueprint" alternativos — este archivo concilia ambas fuentes de evidencia contra el repositorio y las bases de datos reales. Ninguna sección de este documento autoriza implementación. `HUMAN_GO` no ha sido otorgado.

**Baseline compartido (`PHASE_0D_SHARED_GIT_IDENTITY = CLOSED`):** `origin/main @ 00b74484a9c933c7e8f0ea995b725509e327f098` (`Lawyer1421/maya-lex-pinel-deploy`). Rama documental: `audit/exequatur-source-reconciliation`. Este es el estado técnico de referencia para toda afirmación de arquitectura de este documento salvo que se marque explícitamente `CLAUDE_LOCAL_HISTORICAL`.

**Worktrees:** checkout principal `C:\Proyectos\maya-lex-pinel-deploy` (branch `feature/mayalex-rag-citations-integration`, HEAD local `4ce513e771de9cbdc420fcfa30dfe9dc14379855`, 5 commits locales nunca pusheados) + worktree de reconciliación `C:\Proyectos\maya-lex-reconciliation` (branch `audit/exequatur-source-reconciliation`, basado en `origin/main`).

---

## ADVERTENCIA DE PROCEDENCIA

No pude localizar `CURSOR_EXEQUATUR_BLUEPRINT_REVIEW.md` ni `CURSOR_FRONTEND_ARCHITECTURE_AUDIT.md` en ningún lugar de este equipo, ni siquiera con `origin/main` ya actualizado a `00b7448` (repo completo, todas las ramas locales/remotas, OneDrive, Escritorio/Documents/Downloads). Todo lo atribuido a "Cursor" en este documento que no cite una evidencia directa mía proviene de lo relatado por el usuario, marcado `CURSOR_CLAIM (relayed)` en la Matriz de Evidencia. Donde el cross-review de Cursor señaló un hallazgo específico y yo pude verificarlo de forma independiente contra `origin/main` o contra las bases Supabase vivas, se marca `CROSS_VERIFIED` y se documenta la evidencia propia.

---

## 1. Executive Summary

MayaLex es una plataforma jurídica en producción (Next.js 16 + Supabase + `@anthropic-ai/sdk`) sobre `origin/main @ 00b7448`, con corpus RAG activo (84,204 chunks verificados en producción vía consulta en vivo), retrieval en dos etapas (recuperación exacta por artículo + búsqueda semántica, con reranking Cohere opcional detrás de un flag), autenticación Supabase con guards a nivel de página, tiers `free/pro/academico/admin`, pagos PayPal maduros, CI real (typecheck + test + gate de auditor humano-en-el-loop), un sistema de feature flags fail-closed en producción (`lib/flags.ts`), y una suite de tests con cobertura sustancial de casos RAG (exclusión de no-vigentes, identidad de instrumento, artículos derogados, anti-inyección de anonimización).

La identidad git compartida quedó cerrada en Fase 0-D: `origin/main @ 00b7448` es el baseline verificado por ambas partes (Claude y Cursor). La causa de la confusión anterior fue `STALE_LOCAL_FETCH` — mi copia local de `origin/main` estaba 124 commits desactualizada, no un repositorio distinto. Este documento corrige el cuerpo para describir `origin/main` tal como es hoy, no el snapshot desactualizado de Fase 0/0-B.

Ninguna de las seis ADR de este documento está `ACCEPTED`. Todas están `PROPOSED` con un estado de bloqueo explícito (ver Sección 38). Exequátur de Notario se integrará como vertical interna sobre esta base, nunca como plataforma separada.

---

## 2. Verified MayaLex Architecture (baseline: `origin/main @ 00b7448`)

- **Stack:** Next.js 16 App Router (un solo `app/` raíz, sin monorepo), Supabase (`@supabase/supabase-js`), `@anthropic-ai/sdk`.
- **CI:** `EXISTS`. `.github/workflows/ci.yml` (jobs `typecheck` y `test`, requeridos en branch protection de `main` desde 2026-09-06) y `.github/workflows/grokbot-audit.yml` (gate obligatorio: un PR no puede mergearse sin el label `auditor-green`, otorgado por un revisor humano-en-el-loop, "Grokbot"). **`CI HAS EXEQUATUR GATES` es distinto y es `NOT_EXISTING`** — ningún job valida hoy identidad canónica, contrato de citas, ni contenido pedagógico, porque esas entidades no existen todavía.
- **Feature flags:** `EXISTS`. `lib/flags.ts` — `KNOWN_FLAGS` (`flag_corpus_p0`, `flag_corpus_profesional`, `flag_osint`, `flag_expediente`, `flag_voz`, `flag_paywall`, `flag_rerank`), tabla `feature_flags`, `isFlagEnabledForUser(flagName, userEmail)` con allowlist por email, **fail-closed por diseño explícito** (comentario del propio archivo: "cualquier error de lectura, tabla ausente, fila ausente, o nombre de flag desconocido se trata como DESACTIVADO"). Wireado en producción real: `app/api/chat/route.ts` llama `isFlagEnabledForUser('flag_rerank', verifiedEmail)` para decidir si `buscarRAG` invoca el reranking Cohere. **No existen flags específicos de Exequátur** — eso sigue `NOT_EXISTING`, es exactamente el trabajo de ADR-005.
- **RAG:** `lib/rag/search.ts` exporta `buscarRAG()` (retrieval con dos rutas: recuperación exacta por artículo vía `buscarArticuloExacto()`/`detectarArticuloExacto()` con prioridad sobre la semántica, y fallback a búsqueda semántica vectorial vía RPC sobre `biblioteca_vectores`), `detectarInstrumentoDesdeTexto()`/`identidadDocumentalCoincide()` (desambiguación de instrumento normativo — p. ej. no confundir un Código con su Reglamento), `esRegistroNoVigenteExcluido()` (exclusión dura de artículos derogados de la búsqueda semántica), y una constante de abstención (`CORPUS_EVIDENCE_NOT_FOUND`/`MENSAJE_ABSTENCION_CORPUS`) para cuando el sistema decide no responder en vez de arriesgar una cita incorrecta. El reranking (`lib/rag/rerank.ts`, función `rerankearFragmentos()`, Cohere rerank-v3.5) es una Etapa 2 opcional, detrás de `flag_rerank` (OFF por defecto). `LIVE_DB_VERIFIED` (Fase 0-B, consulta directa): 84,204 filas en `biblioteca_vectores` en producción (`maya-lex-ia-pinel-hn`, ref `thgrhueckkjdutjvcufp`), 100% con norma de vector ≈1.0.
- **Auth:** Supabase Auth. **`middleware.ts` es un pass-through no-op** (`return NextResponse.next()`, confirmado idéntico en `origin/main`) — pero esto **no significa que la aplicación carezca de autenticación**: `app/chat/page.tsx` y `app/cuenta/page.tsx` tienen guards explícitos a nivel de página (`supabaseAuth.auth.getUser()` + `redirect('/login')` si no hay sesión). `app/api/chat/route.ts` además soporta un identificador de cuota basado en `email:{correo}` si hay sesión o `ip:` si no la hay (`buildUserIdentifierFromEmail`, comentario explícito en el código: "identidad verificada: email:{correo} si hay sesión, ip: si no"). La distinción correcta: `MIDDLEWARE DOES NOT ENFORCE AUTH` (cierto) ≠ `APPLICATION HAS NO AUTH` (falso).
- **Tiers:** `free/pro/academico/admin` como columna de texto en `subscriptions`/`queries_log`, sin tabla de entitlements formal.
- **Pagos:** PayPal con máquina de estados atómica, probada. Stack paralelo PixelPay bajo `src/` de estatus de producto sin resolver.
- **RLS:** `LIVE_DB_VERIFIED` — habilitado en `subscriptions` y `biblioteca_vectores` en producción, patrón `service_role`-only, sin políticas ownership-based.
- **Tests:** cobertura real y sustancial en `tests/`, incluyendo específicamente RAG: `rag-anonymization-filter`, `rag-articulo-derogado-fallback`, `rag-articulo-exacto` (incluye guardia anti-colisión `REGLAMENTO_NOTARIADO` vs `CODIGO_NOTARIADO`), `rag-backend-default`, `rag-buscarRAG-guardarrail`, `rag-citas-p0-2`, `rag-etiqueta-no-vigente`, `rag-exclusion-no-vigente`, `rag-fuente-null-exclusion`, `rag-rerank-flag`, `rag-rerank`; más auth-callback/redirect, PayPal state-machine/webhook/duplicate-guard, access, SEO. **`NO RAG REGRESSION TESTS` es falso contra `origin/main`** — lo que sí falta es cobertura específica de Exequátur (ver Sección 31).
- **Identidad canónica legal:** sigue sin existir a nivel de documento/disposición en el corpus productivo — `biblioteca_vectores` sigue siendo chunk-primary, incluso con toda la sofisticación de routing/desambiguación de instrumento normativo añadida. Esa sofisticación vive en la capa de *retrieval* (qué buscar y cómo desambiguarlo), no en una capa de *identidad persistente* (un id estable de documento/disposición/versión que sobreviva una revectorización). El patrón más cercano a esa identidad persistente sigue siendo `lib/ingesta-oficial/` (`hn_normas_verificadas_staging.norm_id`), con tablas reales solo en staging (`LIVE_DB_VERIFIED`: 44 filas, ninguna promovida más allá de V3-con-advertencia).
- **`REGLAMENTO_NOTARIADO`:** es un valor del tipo `InstrumentoNormalizado` en `lib/rag/search.ts` (introducido en el commit `df18ad6`), usado exclusivamente para routing/retrieval — distinguir consultas sobre "Reglamento del Código del Notariado" de consultas sobre el "Código del Notariado" mismo, evitando que la búsqueda exacta por artículo confunda ambos instrumentos. **No es** identidad canónica, no es un dictamen jurídico, no es prueba de modalidad del examen, no es contenido pedagógico de Exequátur. Es `LEGAL_AGENT_RELEVANT_SOURCE` en el sentido de que confirma que el corpus distingue este instrumento — nada más se deriva de esto.
- **Frontend autenticado:** `app/chat/page.tsx` y `app/cuenta/page.tsx` — no existen `app/investigacion`, `app/corpus`, ni `app/copiloto`. No existe un App Shell autenticado unificado — la estructura es plana (ver Sección 8/27).

---

## 3. Fase 0-D — Identidad Git Compartida (`CLOSED`)

`PHASE_0D_SHARED_GIT_IDENTITY = CLOSED`, decisión humana aceptada. `origin/main @ 00b74484a9c933c7e8f0ea995b725509e327f098` es el baseline verificado de arquitectura de repositorio. No se vuelve a cuestionar la existencia de este commit.

**Lección de proceso (no arquitectura):** en la sesión de Fase 0-C, `git fetch origin --prune` reveló que mi copia local de `origin/main` estaba en `72f762a`, 124 commits detrás del `origin/main` real (`00b7448`). Lo que en su momento reporté como "el commit `00b7448` no existe en este repositorio" era cierto únicamente contra mis refs locales obsoletos, no contra el remoto real — `STALE_LOCAL_FETCH`, no `UNKNOWN_REPOSITORY_IDENTITY`. Ver `EXEQUATUR_RECONCILIATION_REPORT.md` para el detalle completo de esa reconciliación (124 commits intermedios, incluyendo `lib/flags.ts`, el reranking Cohere, y `REGLAMENTO_NOTARIADO`).

El archivo `EXEQUATUR_FASE0_BLUEPRINT.md` (evidencia histórica de Fase 0/0-B) permanece `untracked` en el checkout principal, nunca committeado a ninguna rama — esto es independiente de la reconciliación de baseline y no representa ninguna pérdida de información; ver `EXEQUATUR_RECONCILIATION_REPORT.md` para su hash y trazabilidad completa.

---

## 4. `scripts/ingest-to-supabase.ts` — `CLAUDE_LOCAL_HISTORICAL`

```
Procedencia: commit local 424edfd89fffefb1885966472c1367a2948be248 (2026-09-13), autor Fredy Pinel, co-autor Claude Haiku 4.5 (sesión previa distinta a esta serie)
Presencia en origin/main: NO — confirmado ausente en origin/main @ 00b7448 y en todo el historial remoto (git log --all -- scripts/ingest-to-supabase.ts solo devuelve los 5 commits locales)
Presencia en la rama documental audit/exequatur-source-reconciliation: NO — no se incorporó código en el commit documental de Fase 0-C
SHA256 (working tree, idéntico al blob commiteado): ffd3ff72ec9ce688fb1181262f9cd2deb5420931c9783f0a1a1e999a7269e478
```

Este archivo, y los otros 4 scripts del mismo commit (`audit-corpus-honduras.ts`, `ingest-honduras-massive.ts`, `ingest_honduras_py.py`, `sanitize-corpus-contaminated.ts`), son trabajo local genuino, no compartido con `origin/main` ni con Cursor. No es un error de ninguna de las dos partes que Cursor no lo haya visto — es evidencia asimétrica real.

---

## 5. Fallbacks de embedding falso — dos mecanismos, procedencia distinta

| Mecanismo | Archivo | Procedencia | Estado |
|---|---|---|---|
| `FakeEmbeddingProvider` (LCG determinístico) | `lib/ingesta-oficial/embeddings.ts:33-46` | Introducido en `9b48492`, presente en `origin/main @ 00b7448` (confirmado: `git merge-base --is-ancestor 9b48492 origin/main`) | `CROSS_VERIFIED` — documentado en su propio encabezado como no-productivo, exclusivo para pruebas del pipeline `lib/ingesta-oficial/` sin credenciales |
| `new Array(384).fill(0.001)` | `scripts/ingest-to-supabase.ts:89,92` | Introducido en `424edfd`, local-only (Sección 4) | `CLAUDE_LOCAL_HISTORICAL` |

No se combinan estos dos conceptos: son mecanismos distintos, en pipelines distintos, con distinta procedencia compartida/local. **Riesgo: `CONTAINED`, no `MATERIALIZED`.** Fase 0-B verificó contra ambas bases Supabase vivas (`maya-lex-ia-pinel-hn`, `mayalexhn-staging`) que `biblioteca_vectores` tiene 0 filas con la huella `HN-` (exclusiva del script local) y 100% de embeddings con norma real. No hay evidencia live que justifique escalar este riesgo por encima de `CONTAINED`.

---

## 6. Evidence Matrix

| Claim | Source | Evidence | Final Status |
|---|---|---|---|
| `origin/main` identity (`00b7448`) | Fase 0-C/0-D | `git fetch` + `git rev-parse origin/main` → `00b74484a9c933c7e8f0ea995b725509e327f098` | `CROSS_VERIFIED` — baseline cerrado, `HUMAN_DECISION` aceptada |
| `scripts/ingest-to-supabase.ts` existe | Repo (Fase 0-C) | `git log --all -- scripts/ingest-to-supabase.ts` → solo commits locales | `CLAUDE_LOCAL_HISTORICAL` |
| Embedding dummy `[0.001,...]` | Repo (Fase 0-C) | `scripts/ingest-to-supabase.ts:89,92` | `CLAUDE_LOCAL_HISTORICAL` |
| `FakeEmbeddingProvider` (LCG) | Repo (esta sesión) | `lib/ingesta-oficial/embeddings.ts:33-46`, reachable desde `origin/main` | `CROSS_VERIFIED` |
| Sistema de feature flags fail-closed | `origin/main` (esta sesión) | `lib/flags.ts`, wireado en `app/api/chat/route.ts:320` | `CROSS_VERIFIED` |
| CI existe | `origin/main` (esta sesión) | `.github/workflows/ci.yml`, `grokbot-audit.yml` | `CROSS_VERIFIED` |
| CI tiene gates específicos de Exequátur | `origin/main` (esta sesión) | Ningún job referencia identidad canónica/citas/contenido pedagógico | `CROSS_VERIFIED: NOT_EXISTING` (ausencia confirmada, no inferida) |
| Cobertura de tests RAG (derogación, instrumento, rerank, etc.) | `origin/main` (esta sesión) | `ls tests/` → 11 archivos `rag-*` | `CROSS_VERIFIED` |
| Middleware no-op | `origin/main` (esta sesión) | `middleware.ts` idéntico a Fase 0 | `CROSS_VERIFIED` |
| `/chat` y `/cuenta` tienen guard de sesión a nivel de página | `origin/main` (esta sesión) | `app/chat/page.tsx`, `app/cuenta/page.tsx` releídos | `CROSS_VERIFIED` |
| `/api/chat` soporta identificador por IP además de email | `origin/main` (esta sesión) | `app/api/chat/route.ts:245-248` | `CROSS_VERIFIED` |
| RLS activo en `subscriptions` (producción) | Fase 0-B | Consulta SQL en vivo contra `thgrhueckkjdutjvcufp` | `LIVE_DB_VERIFIED` |
| `organizations`/`pending_orders` no existen en ninguna base | Fase 0-B | Consulta SQL en vivo, ambos proyectos | `LIVE_DB_VERIFIED` |
| Producto autenticado concentrado en `/chat` y `/cuenta`, sin App Shell unificado | `origin/main` (esta sesión) + relayed Cursor claim | `ls app/` sobre `origin/main` | `CROSS_VERIFIED` |
| Divergencia visual marketing V2 vs. app/chat | Relayed Cursor claim | No verificable sin inspección visual/capturas | `CURSOR_NOT_YET_VERIFIED` |
| `REGLAMENTO_NOTARIADO` es routing técnico, no identidad canónica ni dictamen jurídico | `origin/main` (esta sesión) | `lib/rag/search.ts` + `tests/rag-articulo-exacto.test.ts` | `CROSS_VERIFIED` |
| Modalidad del examen (oral vs. escrito, Reglamento 2013) | Relayed Cursor claim | No verificable técnicamente | `LEGAL_REVIEW_REQUIRED` |
| Contenido editorial actual vive en Drive | Relayed Cursor claim | No verificado por Claude (sin acceso a Drive) | `CURSOR_NOT_YET_VERIFIED` |
| ¿Cuál proyecto Supabase sirve a mayalexhn.com? | Fase 0-B + esta sesión | `.env.local` con placeholder sin resolver | `UNVERIFIED` (Sección 7) |
| Identidad canónica legal (`legal_document→provision→version→chunk`) completa | `origin/main` (esta sesión) | No existe ninguna cadena de este tipo en el corpus productivo, ni siquiera con la evolución de retrieval verificada | `CROSS_VERIFIED: NOT_EXISTING` |

---

## 7. Identidad del Supabase productivo — sin cambios, `UNVERIFIED`

Sin nuevas consultas en esta sesión (fuera de alcance — solo patch documental). `.env.local` sigue conteniendo `NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}`, un placeholder sin resolver. `PRODUCTION_SUPABASE_IDENTITY = UNVERIFIED` hasta que exista evidencia inequívoca y autorizada — no se usa nombre/antigüedad como prueba. No bloquea la conciliación arquitectónica de este documento; sí debe resolverse antes de cualquier migración real.

---

## 8. Current Frontend Architecture (baseline: `origin/main @ 00b7448`)

`app/` contiene, entre otras: `chat/`, `cuenta/`, `login/`, `pricing/`, `demo/`, `leyes/`, `consultas/`, `herramientas/`, `cobertura-juridica/`, `producto/`, `soluciones/`, `recursos/`, `seguridad/`, `fundador/`. El producto autenticado real está en `chat/` y `cuenta/`, cada uno con su propio guard de sesión server-side; el resto son páginas de marketing/SEO. **No existe un App Shell autenticado unificado** capaz de alojar verticales — la estructura es plana, sin navegación compartida entre `/chat`, `/cuenta` y una futura vertical Exequátur. No existen `investigacion/`, `corpus/`, ni `copiloto/`.

`middleware.ts` es un pass-through no-op — confirmado en `origin/main`. Esto significa que no hay una capa centralizada que imponga autenticación a nivel de edge/middleware, **no** que la aplicación carezca de autenticación: `/chat` y `/cuenta` verifican sesión explícitamente en su propio código de página (Sección 2). La autorización real está distribuida por ruta/página, no centralizada — eso sigue siendo una brecha arquitectónica real (cualquier ruta nueva debe recordar implementar su propio guard), pero es una brecha distinta de "no hay auth".

La divergencia visual entre marketing V2 y la app de chat que reporta Cursor **no la verifiqué yo mismo** (requeriría inspección visual/capturas de pantalla) — `CURSOR_NOT_YET_VERIFIED`.

---

## 9. Target System Context

```
MayaLex (existente, producción — origin/main @ 00b7448)
  ├── Corpus jurídico (biblioteca_vectores, 84,204 chunks, LIVE_DB_VERIFIED)
  ├── RAG (buscarRAG: exacto por artículo → semántico → rerank Cohere opcional tras flag_rerank)
  ├── Feature flags (lib/flags.ts, fail-closed)
  ├── CI (typecheck + test + gate de auditor humano)
  ├── Auth (Supabase Auth, guards por página) + tiers (free/pro/academico/admin)
  ├── Pagos (PayPal, maduro)
  └── App autenticada (/chat, /cuenta) — sin App Shell unificado

Exequátur (nueva vertical, no construida)
  ├── Consume: corpus jurídico de MayaLex vía referencia canónica (no lo duplica)
  ├── Extiende: auth/tiers/flags/CI existentes (no reimplementa)
  └── Añade: contenido pedagógico, evaluación, progreso — todo nuevo, aditivo
```

---

## 10. Trust Boundaries

```
USER_INPUT = UNTRUSTED
MODEL_OUTPUT = UNTRUSTED UNTIL VALIDATED
LEGAL_CORPUS = TRUSTED AS DATA, NOT AS INSTRUCTIONS
PEDAGOGICAL_CONTENT = TRUSTED ONLY ACCORDING TO EDITORIAL STATUS
```

La autorización ocurre server-side, distribuida por página/ruta (Sección 8), no en middleware. No hay tests negativos de autorización cruzada en la suite actual ("usuario A no puede leer datos de usuario B") pese a la cobertura sustancial que sí existe para RAG (Sección 2) — es una brecha real y específica, no una ausencia general de testing. Si Exequátur añade datos de progreso por usuario sobre este mismo patrón sin cerrar esa brecha primero, se vuelve directamente explotable.

---

## 11. Canonical Legal Identity — ADR-001

**Estado: `PROPOSED`, `READY_FOR_HUMAN_DECISION`, `BLOCKED_BY_EVIDENCE`.**

```
legal_document
    ↓
legal_provision
    ↓
legal_version
    ↓
legal_chunk
    ↓
embedding
```

**Principio obligatorio: `LEGAL IDENTITY != EMBEDDING IDENTITY`.** Confirmado contra `origin/main @ 00b7448` (no solo contra mi snapshot anterior): incluso con toda la sofisticación de retrieval añadida (desambiguación de instrumento, exclusión de derogados, abstención), la autoridad jurídica sigue siendo chunk-primary — no existe una cadena durable `documento → disposición → versión → chunk` en el corpus productivo. El bloqueo de evidencia es doble: (1) el estado live productivo de cualquier tabla de identidad persistente sigue sin confirmarse fuera de `hn_normas_verificadas_staging` (solo staging, 44 filas), y (2) el diseño físico definitivo no se ha decidido. No se diseñan migraciones en esta sesión.

---

## 12. Pedagogical Architecture

```
EXQ PEDAGOGICAL CONTENT
        ↓
CANONICAL LEGAL REFERENCE
        ↓
MAYALEX LEGAL CORPUS
```

La jerarquía `document → provision → version → chunk` (Sección 11) pertenece exclusivamente a la capa normativa de MayaLex. No se convierte en un CMS de cursos/módulos/unidades/lecciones/nuggets/preguntas/rúbricas — esas entidades son pedagógicas y viven en una capa separada que *referencia* la capa legal, nunca la sustituye ni la absorbe.

---

## 13. Target Data Model

Puramente conceptual — ninguna de estas tablas existe, ninguna se crea en esta sesión. Capa legal (extiende MayaLex): `legal_document`, `legal_provision`, `legal_version`, `legal_chunk`, `canonical_legal_reference`. Capa pedagógica (nueva, Exequátur): entidades conceptuales tipo módulo/unidad/nugget/pregunta/rúbrica/intento/perfil-de-dominio — nombres físicos no fijados, dependen de ADR-003.

---

## 14. Pedagogical Content Architecture — ADR-003

**Estado: `PROPOSED`, `READY_FOR_HUMAN_DECISION`, `BLOCKED_BY_LEGAL_REVIEW`.** Dirección preferida: **HYBRID** — app/contratos/APIs/UI/schemas en el repo MayaLex; contenido pedagógico en workflow editorial versionado de forma física a decidir (repo separado, pipeline sincronizado, o equivalente); corpus MayaLex permanece como autoridad normativa única. El bloqueo legal se refiere a `EXAM_MODALITY`/`TRIBUNAL_POSITIONING` (Sección 39) — el contenido no puede diseñarse en detalle sin esa resolución.

Contenido editorial actual en Drive (Índice Maestro, capítulos) — relatado por Cursor, `CURSOR_NOT_YET_VERIFIED` por mí. Tratado condicionalmente como `CURRENT_EDITORIAL_SOURCE`, nunca como base de datos productiva futura.

```
Editorial Source (Drive u otro, a confirmar)
        ↓
Versioned Content
        ↓
Schema Validation
        ↓
Legal Reference Validation
        ↓
Content Promotion Gate
        ↓
Product
```

---

## 15. Content Promotion Architecture

Reutiliza el patrón ya diseñado y probado (12 tests) en `lib/ingesta-oficial/estados.ts` (V0→V5), tablas reales en staging (`hn_normas_verificadas_staging`, `ingestion_audit_log`), desconectadas de producción.

```
DEROGADO EXISTS                       → no es motivo de bloqueo (puede existir como histórico)
DEROGADO SERVED AS CURRENT AUTHORITY  → FAIL (esto sí se bloquea)
```

---

## 16. Citation Architecture — ADR-002

**Estado: `PROPOSED`, `READY_FOR_HUMAN_DECISION`, `DEPENDENCY_ON_ADR001`.**

**CURRENT (existe hoy):** las citas se construyen como proyección directa del retrieval — función `construirCitas()` en `app/api/chat/route.ts` — filtrando qué fragmentos son citables (`es_norma_vigente === true`, excluyendo fuentes doctrinales vía `FUENTES_DOCTRINALES`), sin persistir una entidad jurídica durable ni validar estructuralmente que el texto citado por el modelo corresponda al contexto recuperado.

**TARGET (no existe, propuesto):**

```
Retrieval
   ↓
Canonical Legal Reference
   ↓
Deterministic Citation Validator
   ↓
Validated Citation DTO
   ↓
Frontend Citation Component
```

El backend valida; el frontend solo renderiza. No se implementa en esta sesión. Depende de ADR-001 porque un validador determinístico necesita una referencia canónica estable contra la cual validar.

---

## 17. UI de citas — REUSE vs EXTEND vs REPLACE

Cursor recomienda `EXTEND` el componente/chip de citas actual. No verifiqué independientemente la complejidad interna de ese componente. Preferencia por defecto: `EXTEND` si acepta el nuevo Citation DTO (Sección 16) sin deuda excesiva — evaluable solo con inspección directa en fase posterior. No se implementa en esta sesión.

---

## 18. Vigencia Architecture

`origin/main` tiene enforcement de vigencia más maduro de lo que mi Fase 0 original describía: exclusión dura de artículos no vigentes en la búsqueda semántica (`esRegistroNoVigenteExcluido()`, cubierto por `tests/rag-exclusion-no-vigente.test.ts`), fallback explícito a derogación confirmada cuando corresponde (`tests/rag-articulo-derogado-fallback.test.ts`), y etiquetado obligatorio de todo fragmento del contexto RAG (`tests/rag-etiqueta-no-vigente.test.ts` — "ningún fragmento del contexto RAG queda sin etiqueta"). Pese a esto, **sigue sin existir un modelo de vigencia versionado a nivel de identidad canónica** — `es_norma_vigente` sigue siendo un booleano plano en `metadata jsonb`, no un rango de fechas ni un historial de reformas a nivel del corpus productivo (ese concepto sí existe, sin conectar, en `hn_normas_verificadas_staging.reformas`/`derogaciones`). La cuestión de modalidad del examen (Sección 39) es una cuestión legal separada de esta arquitectura de datos — `REGLAMENTO_NOTARIADO` (Sección 2) no la resuelve.

---

## 19. Tribunal Virtual

No queda cancelado por la discrepancia de modalidad del examen — puede servir como entrenamiento/dominio/interrogación/repregunta/explicación jurídica/evaluación estructurada independientemente de si el examen real es oral o escrito. Su nombre, posicionamiento, copy y promesa quedan sujetos a `LEGAL_REVIEW_REQUIRED: TRIBUNAL_POSITIONING` (Sección 39) — **no se resuelve invocando `REGLAMENTO_NOTARIADO`**, que es routing técnico sin relación con la modalidad del examen (Sección 2).

Requiere, antes de construirse: ADR-001 aceptado, ADR-002 aceptado, contenido pedagógico resuelto (ADR-003), rúbricas (Sección 20), evaluation harness (ADR-006), autorización, y posicionamiento legal. Fase posterior, no el primer incremento (Sección 35).

---

## 20. Rubric Architecture

**Estado: `PROPOSED`, sin implementación.** Rúbricas versionadas por pregunta: conceptos requeridos/opcionales, errores críticos, referencias canónicas, temas de repregunta — trazable contra pregunta, rúbrica, versión, evidencia y modelo usado.

---

## 21. Preparation/Mastery Model

**Estado: `PROPOSED`.** El "Índice de Preparación Exequátur" mide dominio demostrado dentro del sistema. Nunca presentarlo como probabilidad de aprobación, garantía de aprobación, ni predicción oficial de la CSJ.

---

## 22. Evaluation Harness — ADR-006

**Estado: `PROPOSED`, `READY_FOR_HUMAN_DECISION`, `NEEDS_REVISION`.**

**Corrección respecto a la versión anterior de esta sección:** MayaLex no carece de tests de regresión — `origin/main` tiene 11 archivos de test específicos de RAG (Sección 2) cubriendo derogación, identidad de instrumento, exclusión de no-vigentes, anti-inyección de anonimización, rerank y su flag. `ADR-006 sigue siendo necesario` — pero su función correcta no es "crear testing donde no existe ninguno", sino cerrar la cobertura que **sí falta específicamente para Exequátur**:

- Validación de citas canónicas (depende de ADR-001/002).
- Retrieval pedagógico de Exequátur (no existe hoy, no hay nada que testear todavía).
- Abstención en el dominio pedagógico (el corpus legal ya tiene `MENSAJE_ABSTENCION_CORPUS`; Exequátur necesita su propio criterio de abstención).
- Content promotion gate (Sección 15) aplicado a contenido pedagógico.
- Autorización cruzada entre usuarios (brecha general del repo, Sección 10, que Exequátur heredaría).
- Estabilidad de rúbricas y scoring del Tribunal Virtual.
- Prompt injection/policy específico del flujo pedagógico.
- Golden dataset + retrieval regression, como capa nueva sobre el patrón de test ya validado en `tests/rag-*`, no reemplazándolo.

`NEEDS_REVISION` marca que el alcance original de esta ADR asumía un vacío total de testing que no existe — debe reescribirse antes de someterse a decisión de arquitectura.

---

## 23. Threat Model

- **Inyección de instrucciones vía corpus recuperado:** mitigado con delimitadores de framing en `formatearContextoRAG()` (`lib/rag/search.ts`) — defensa de texto plano, no estructural.
- **Ausencia de autorización cruzada probada:** sin tests negativos de "usuario A no puede leer datos de usuario B" pese a la cobertura sustancial de RAG (Sección 10). Se vuelve explotable en cuanto Exequátur añada datos de progreso por usuario sin corregirlo antes.
- **Sprawl de service-role:** casi todo el acceso server-side a Supabase usa la clave de service-role (bypassa RLS por diseño).
- **Autorización distribuida por página, no centralizada:** `middleware.ts` no impone auth (Sección 8); cada ruta nueva de Exequátur debe implementar su propio guard, con riesgo real de que alguna lo omita — esto es distinto de "no hay auth", pero el riesgo arquitectónico de omisión es real.

---

## 24. Privacy/Data Lifecycle

Mecanismos reales de scrubbing de PII ya existen (`lib/self-learning/moderar.ts`, `lib/ingesta-oficial/validaciones.ts:81-88`) — reutilizables para cualquier dato de usuario que Exequátur capture. No se diseña un pipeline nuevo de PII sin antes evaluar si estos ya cubren el caso.

---

## 25. Observability

No existe Sentry ni logger estructurado — solo `console.error` disperso y un logger custom de analítica. No introducir una tercera solución sin decisión explícita.

---

## 26. SLO/Cost Strategy

No evaluado. El Tribunal Virtual (turnos múltiples, extracción de conceptos, repregunta adaptativa) tendrá un costo de LLM por sesión sustancialmente mayor que el chat actual — debe presupuestarse antes de comprometerse a un modelo de precio.

---

## 27. MayaLex App Shell — ADR-004

**Estado: `PROPOSED`, `READY_FOR_HUMAN_DECISION`.**

```
MayaLex
│
├── Chat / funcionalidad jurídica actual
├── Exequátur
│   ├── Inicio
│   ├── Estudio
│   ├── Preguntas
│   ├── Progreso
│   └── Tribunal (fase posterior)
│
└── Cuenta
```

Confirmado contra `origin/main`: no existe App Shell autenticado unificado hoy — estructura plana `/chat`, `/cuenta`, sin navegación de verticales (Sección 8). Diseño conceptual únicamente; debe minimizar blast radius, sin exigir rediseño total previo del `/chat` existente.

---

## 28. Frontend Integration Strategy

1. **Existing MayaLex stabilization** — `/chat`, `/cuenta`, marketing V2 — fuera del alcance de Exequátur salvo lo estrictamente necesario para alojar el App Shell.
2. **Exequátur integration** — todo lo nuevo, detrás de feature flags (Sección 29), extendiendo componentes existentes donde sea razonable (Sección 17).

---

## 29. Feature Flags — ADR-005

**Estado: `PROPOSED`, `READY_FOR_HUMAN_DECISION`.**

**EXISTING:** `lib/flags.ts` — infraestructura server-side real, `KNOWN_FLAGS`, tabla `feature_flags`, `isFlagEnabledForUser()`, fail-closed-to-OFF por diseño explícito, ya gatea `flag_rerank` en producción (Sección 2). **NOT EXISTING:** ningún flag específico de Exequátur.

Por tanto, ADR-005 debe estudiar **`EXTEND EXISTING INFRASTRUCTURE`**, no `CREATE NEW FLAG SYSTEM`: añadir entradas a `KNOWN_FLAGS` (p. ej. `flag_exq_enabled`, `flag_exq_copilot`, `flag_exq_tribunal`) y sus filas correspondientes en `feature_flags`. Nombres físicos definitivos y la migración que añade las filas quedan pendientes de aprobación de arquitectura. No implementado en esta sesión.

---

## 30. Environment Strategy

`.env.local` sigue con `NEXT_PUBLIC_SUPABASE_URL` como placeholder sin resolver. Cualquier variable nueva de Exequátur debe documentarse en `.env.example`/`.env.local.example` desde el primer commit — ya existe precedente de deuda de documentación (`HF_API_TOKEN`, `RESEND_API_KEY` usadas en código, ausentes de ambos templates).

---

## 31. Testing Strategy

**CURRENT TEST COVERAGE (real, en `origin/main`):** 11 archivos `tests/rag-*` (derogación, instrumento normativo incl. `REGLAMENTO_NOTARIADO`, exclusión de no-vigentes, anti-inyección de anonimización, backend default, guardrail, citas p0-2, rerank + su flag), más auth-callback/redirect, PayPal state-machine/webhook/duplicate-guard/plans, access, SEO (containment/sitemap/metadata), ingesta-oficial (estados/pipeline/validaciones), build-determinism, alerts-socket.

**EXEQUATUR MISSING COVERAGE (lo que debe añadirse, no existe hoy):** validación de citas canónicas, retrieval de Exequátur, abstención pedagógica, content promotion gate, autorización cruzada entre usuarios, scoring del Tribunal Virtual, estabilidad de rúbricas, prompt injection/policy del flujo pedagógico.

Extender la suite Vitest existente, no crear una paralela.

---

## 32. CI/CD Strategy

**`CI EXISTS`:** `.github/workflows/ci.yml` (typecheck + test, requeridos en `main`) y `.github/workflows/grokbot-audit.yml` (gate de auditor humano vía label `auditor-green`), ambos confirmados en `origin/main @ 00b7448`. **`CI HAS EXEQUATUR GATES` es `NOT_EXISTING`** — ningún job valida identidad canónica, contrato de citas, ni contenido pedagógico, porque esas entidades no existen todavía. Cuando existan, deben integrarse a este CI existente, no a uno paralelo.

---

## 33. Backup/Recovery/Rollback

Rollback documentado como comentario SQL dentro de cada archivo de migración (manual, no automatizado) — cualquier migración futura de Exequátur debe seguir el mismo patrón hasta que se decida invertir en un mecanismo automatizado.

---

## 34. SEO/Accessibility

El sistema de contención SEO (`sitemap.ts`/`robots.ts` + `corpus-editorial-status.json`) cubre el corpus legacy de 198 artículos, no cubriría automáticamente páginas de Exequátur. La auditoría de accesibilidad (`MAYALEX_V2_ACCESSIBILITY_FINAL.md`) solo cubrió marketing V2 — `/chat`, `/cuenta` y cualquier futura superficie de Exequátur quedan sin auditoría de accesibilidad confirmada.

---

## 35. Implementation Phases

**Primer incremento evaluado (no implementado en esta sesión):**

```
Canonical Contracts
+
Feature Flag Foundations (extender lib/flags.ts, Sección 29)
+
MayaLex App Shell
+
Exequátur Shell
```

con el flag `flag_exq_enabled`-equivalente en `OFF` en todo momento durante ese incremento. El Tribunal Virtual no es el punto de partida — requiere todo lo anterior más rúbricas, evaluation harness, y posicionamiento legal resuelto (Sección 19).

---

## 36. Ownership Matrix

| Área | Owner | Reviewer |
|---|---|---|
| Backend / DB / RAG / Canonical Identity | `CLAUDE` | `CURSOR` |
| App Shell / Design System / Exequátur Frontend | `CURSOR` | `CLAUDE` |
| Legal Content / Vigencia / Questions | `LEGAL_DOCUMENTARY_AGENT` | `CLAUDE` + `CURSOR` (técnico) |
| Architecture / Security | — | `HUMAN SUPERVISOR` + revisión de seguridad/arquitectura (aprobación final) |

Regla: nunca `OWNER = BOTH` sobre el mismo conjunto de archivos simultáneamente.

---

## 37. Risk Register

| Riesgo | Estado | Fuente |
|---|---|---|
| Migración de RLS en `subscriptions` documentada como "no ejecutada" pero activa en producción | `MATERIALIZED` (riesgo de documentación, no de seguridad) | `LIVE_DB_VERIFIED` |
| `organizations`/`pending_orders` en tipos TS sin tabla real | `CONTAINED` | `LIVE_DB_VERIFIED` |
| `biblioteca_penal`/`conversations` definidas en SQL, no creadas en ninguna base viva | `CONTAINED` | `LIVE_DB_VERIFIED` |
| Embedding dummy en `scripts/ingest-to-supabase.ts` (`CLAUDE_LOCAL_HISTORICAL`) | `CONTAINED` / `NOT_MATERIALIZED` en cualquier base viva | `LIVE_DB_VERIFIED` + `REPO_VERIFIED` |
| Ausencia de tests de autorización cruzada entre usuarios | `POTENTIAL` → `MATERIALIZED` si Exequátur añade datos por usuario sin corregir primero | `REPO_VERIFIED` |
| Autorización distribuida por página, no centralizada (middleware no-op) | `POTENTIAL` | `CROSS_VERIFIED` |
| CI sin gates de Exequátur | `POTENTIAL` (esperado en esta fase, no un defecto) | `CROSS_VERIFIED` |
| Identidad de cuál Supabase es producción | `UNVERIFIED` | Sección 7 |
| Documentos fuente de Cursor no localizables | `UNVERIFIED` (afecta calidad de conciliación, no seguridad del producto) | Ver advertencia inicial |
| Modalidad del examen (oral/escrito) sin resolver | `UNVERIFIED` — legal, no técnico | `LEGAL_REVIEW_REQUIRED` |

---

## 38. ADR Queue

| ADR | Título | Estado |
|---|---|---|
| ADR-001 | Canonical Legal Identity | `PROPOSED`, `READY_FOR_HUMAN_DECISION`, `BLOCKED_BY_EVIDENCE` |
| ADR-002 | Structured Citation Contract | `PROPOSED`, `READY_FOR_HUMAN_DECISION`, `DEPENDENCY_ON_ADR001` |
| ADR-003 | Pedagogical Content Architecture | `PROPOSED`, `READY_FOR_HUMAN_DECISION`, `BLOCKED_BY_LEGAL_REVIEW` |
| ADR-004 | MayaLex App Shell / Vertical Navigation | `PROPOSED`, `READY_FOR_HUMAN_DECISION` |
| ADR-005 | Feature Flag Architecture (extend `lib/flags.ts`) | `PROPOSED`, `READY_FOR_HUMAN_DECISION` |
| ADR-006 | AI Evaluation Architecture | `PROPOSED`, `READY_FOR_HUMAN_DECISION`, `NEEDS_REVISION` |

Ninguna `ACCEPTED`.

## 39. LEGAL_REVIEW_REQUIRED

- `EXAM_MODALITY` — oral vs. escrito, norma/artículo/vigencia/reformas aplicables al Reglamento de 2013, práctica y convocatoria actuales. **No se resuelve con `REGLAMENTO_NOTARIADO`** (Sección 2/18) — ese hallazgo es routing técnico, no evidencia jurídica de modalidad.
- `TRIBUNAL_POSITIONING` — nombre/copy/promesa del "Tribunal Virtual", dependiente de la resolución anterior.
- Granularidad de vigencia normativa suficiente para el Índice de Preparación (Sección 21) sin sobre-prometer.

## 40. DO_NOT_TOUCH

- Cualquier migración/escritura contra `subscriptions`, `biblioteca_vectores`, `feature_flags`, o cualquier tabla productiva real.
- El pipeline activo de ingesta de Honduras (Sección 4) — observar, no modificar ni ejecutar.
- La máquina de estados PayPal (`lib/paypal/`) — productiva y probada, fuera de alcance de Exequátur.
- `middleware.ts` y `lib/flags.ts` — no modificar sin revisión de arquitectura/seguridad completa primero.
- `.github/workflows/ci.yml` y `grokbot-audit.yml` — no modificar gates existentes; los gates de Exequátur se añaden, no reemplazan.

## 41. Open Questions

- `CURSOR_SOURCE_DOCUMENTS_NOT_LOCATED` — sigue sin resolverse incluso con `origin/main` actualizado.
- `UNVERIFIED_ASSUMPTION: PRODUCTION_SUPABASE_IDENTITY` (Sección 7).
- ¿El stack PixelPay bajo `src/` se mantiene, se remueve, o se documenta como legado? (Decisión de producto, no técnica.)
- ¿`biblioteca_penal`/`conversations` deben crearse finalmente, o el SQL que las define debe eliminarse por obsoleto?
- Los 124 commits entre el `origin/main` anterior (`72f762a`) y el actual (`00b7448`) incluyen mucho más que lo cubierto en este patch (gobernanza de corpus, dossiers legales, múltiples instrumentos normativos nuevos) — no se re-auditó en profundidad; queda como trabajo de seguimiento antes de considerar este Blueprint una descripción arquitectónica completa.

## 42. Exact Next Step

**`CURSOR VERIFY BLUEPRINT PATCH`** — que Cursor confirme que las correcciones de este patch (identidad git, feature flags, RAG, CI, tests, auth/middleware, App Shell, `REGLAMENTO_NOTARIADO`) describen correctamente `origin/main @ 00b7448`, antes de que este documento avance a revisión de arquitectura/seguridad.

---

## Historical Audit Corrections

Tabla de correcciones aplicadas en Fase 0-E, para trazabilidad — la única fuente de verdad vigente es el cuerpo del documento arriba, esta tabla es registro histórico, no una capa adicional de verdad paralela.

| Incorrect/Outdated Claim (versión anterior del Blueprint) | Corrected Reality | Evidence |
|---|---|---|
| "El commit `00b7448` no existe en ningún branch local o remoto de este repositorio" | `00b7448` es `origin/main` actual; mi fetch local estaba desactualizado (`STALE_LOCAL_FETCH`) | `git fetch` + `git rev-parse origin/main` en Fase 0-C |
| "Sin sistema de feature flags dedicado" / flags "fail-closed" solo `PARTIALLY_CONFIRMED` | `lib/flags.ts` existe, es real, fail-closed por diseño, wireado en producción (`flag_rerank`) | `git show origin/main:lib/flags.ts`, `app/api/chat/route.ts:320` |
| "No existe ningún pipeline versionado (`.github/workflows/` ausente)" | `.github/workflows/ci.yml` y `grokbot-audit.yml` existen y son gates requeridos en `main` | Lectura directa de ambos archivos en `origin/main` |
| "No existe ningún harness de este tipo... sin tests de regresión de retrieval" | 11 archivos de test RAG existen y cubren derogación, instrumento, rerank, anti-inyección | `ls tests/` sobre `origin/main` |
| "`buscarRAG()` (`lib/rag/search.ts:223`)" y descripción de una sola etapa semántica | `buscarRAG` vive en el mismo archivo pero la implementación actual tiene retrieval en dos rutas (exacta + semántica) más reranking Cohere opcional tras `flag_rerank`; número de línea no es la referencia estable — se documenta por función | Lectura de `lib/rag/search.ts` en `origin/main` |
| Implícito: middleware no-op interpretado como ausencia general de autorización | `/chat` y `/cuenta` tienen guards de sesión explícitos a nivel de página; `middleware does not enforce auth` ≠ `application has no auth` | `app/chat/page.tsx`, `app/cuenta/page.tsx` en `origin/main` |
| `REGLAMENTO_NOTARIADO` mencionado sin clasificación técnica explícita, riesgo de leerse como señal jurídica | Es un valor de routing/retrieval (`InstrumentoNormalizado`) en `lib/rag/search.ts`, sin relación con identidad canónica ni modalidad del examen | `lib/rag/search.ts`, `tests/rag-articulo-exacto.test.ts` en `origin/main` |

---

## Git status (Fase 0-E)

```
Checkout principal: C:\Proyectos\maya-lex-pinel-deploy — branch feature/mayalex-rag-citations-integration, sin cambios de código
Worktree de reconciliación: C:\Proyectos\maya-lex-reconciliation — branch audit/exequatur-source-reconciliation, basado en origin/main @ 00b7448
```

Único cambio de esta sesión: corrección del cuerpo de este documento (sin código, sin migraciones, sin escrituras productivas).
