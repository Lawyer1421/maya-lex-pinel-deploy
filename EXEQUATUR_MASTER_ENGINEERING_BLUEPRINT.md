# EXEQUÁTUR DE NOTARIO — MASTER ENGINEERING BLUEPRINT

**Estado: `DRAFT — PENDING ARCHITECTURE APPROVAL`**

Este es el documento gobernante único. No existen "Claude Blueprint" ni "Cursor Blueprint" alternativos — este archivo concilia ambas fuentes de evidencia contra el repositorio y las bases de datos reales. Ninguna sección de este documento autoriza implementación. `HUMAN_GO` no ha sido otorgado.

**Repo:** `C:\Proyectos\maya-lex-pinel-deploy` · **Branch:** `feature/mayalex-rag-citations-integration` · **HEAD:** `4ce513e771de9cbdc420fcfa30dfe9dc14379855` · **Worktree único confirmado** (`git worktree list` → una sola entrada).

---

## ADVERTENCIA DE PROCEDENCIA — LÉASE ANTES DEL RESTO DEL DOCUMENTO

No pude localizar `CURSOR_EXEQUATUR_BLUEPRINT_REVIEW.md` ni `CURSOR_FRONTEND_ARCHITECTURE_AUDIT.md` en ningún lugar de este equipo: no están en el repo (ninguna rama local o remota, ningún commit, tampoco como untracked — `git status --short` solo muestra `EXEQUATUR_FASE0_BLUEPRINT.md`), no están en `OneDrive/MAYALEXHN.COM`, ni en Escritorio/Documents/Downloads del usuario. Búsqueda de todo el historial de git (`git log --all --name-only | grep -i cursor`) tampoco los encontró en ningún commit de ningún branch, local o remoto.

**No los leí íntegramente porque no existen en ninguna ubicación que pude inspeccionar.** Todo lo atribuido a "Cursor" en este documento proviene de lo que el usuario relató en su mensaje, no de una lectura directa mía del archivo fuente. Lo marco explícitamente como `CURSOR_CLAIM (relayed, source document not located)` en la Matriz de Evidencia, y lo distingo de lo que sí verifiqué yo mismo contra el repo/DB en esta misma sesión. Esto es un hallazgo en sí mismo: `CURSOR_SOURCE_DOCUMENTS_NOT_LOCATED` — ver Sección 41.

No reconstruí ni inventé el contenido de esos documentos. Donde el mensaje del usuario describe un hallazgo específico y verificable de Cursor (p. ej. "existe `FakeEmbeddingProvider` basado en LCG"), lo contrasté directamente contra el código — y en ese caso concreto, lo confirmé.

---

## ADDENDUM FASE 0-C — RECONCILIACIÓN DE BASELINE (2026-09-14, sesión posterior)

**Este addendum corrige y precisa lo anterior; no lo reemplaza.** Detalle completo en `EXEQUATUR_RECONCILIATION_REPORT.md` (mismo directorio). Resumen de lo que cambió:

- **El commit `00b7448` que Cursor citaba SÍ existe** — es `origin/main` actual (`00b74484a9c933c7e8f0ea995b725509e327f098`), confirmado tras ejecutar `git fetch origin --prune` en esta sesión. Mi conclusión anterior ("Cursor inspeccionó un estado de repositorio distinto") queda **corregida**: la explicación real es que mi copia local de `origin/main` estaba desactualizada — 124 commits detrás del remoto real. `BASELINE_ADVANCED` documentado en el reporte de reconciliación.
- **`scripts/ingest-to-supabase.ts` existe, pero solo en el HEAD local de Claude** (`4ce513e`) — nunca se pusheó a `origin/main` ni a ningún branch remoto (commit de introducción `424edfd`, co-autor `Claude Haiku 4.5` de una sesión previa distinta a esta). Cursor, trabajando contra el remoto, no podía haberlo visto. Reclasificado de "diferente estado de repo" a `CLAUDE_LOCAL_VERIFIED` (existe, verificado, pero genuinamente no compartido).
- **`FakeEmbeddingProvider`/LCG (`lib/ingesta-oficial/embeddings.ts`) SÍ está en `origin/main`** (confirmado con `git merge-base --is-ancestor`) — es evidencia compartida real, `CROSS_VERIFIED`.
- **Nuevo hallazgo relevante para ADR-005:** `origin/main` (evidencia compartida, NO vista en mi Fase 0/0-B original) ya tiene un sistema real de feature flags en `lib/flags.ts` — `KNOWN_FLAGS`, tabla `feature_flags`, fail-closed por diseño explícito ("cualquier error de lectura, tabla ausente, fila ausente, o nombre de flag desconocido se trata como DESACTIVADO"). Esto confirma la afirmación de Cursor sobre un "mecanismo fail-closed" que en mi sesión anterior solo pude clasificar como `PARTIALLY_CONFIRMED`. Ahora es `CROSS_VERIFIED`, y la recomendación de ADR-005 se fortalece: **`EXTEND` `lib/flags.ts` añadiendo un flag nuevo a `KNOWN_FLAGS`** (p. ej. `flag_exq_enabled`), no construir un sistema paralelo.
- **`origin/main` tiene una evolución de RAG sustancialmente más avanzada** de la que audité (retrieval en dos etapas con Cohere rerank, exclusión estricta de artículos derogados, identidad estricta de instrumento normativo, y un `REGLAMENTO_NOTARIADO` ya distinguido como instrumento propio — directamente relevante a Exequátur). **Las secciones 2 y 6 de este documento describen mi snapshot local anterior a este fetch, no el `origin/main` actual** — no se re-auditaron los 124 commits en esta sesión; queda como trabajo de seguimiento explícito antes de considerar este Blueprint una descripción completa y vigente de MayaLex (ver Sección 41, Open Questions).
- `CURSOR_SOURCE_DOCUMENTS_NOT_LOCATED` **persiste** — ni siquiera con `origin/main` actualizado existen `CURSOR_EXEQUATUR_BLUEPRINT_REVIEW.md` ni `CURSOR_FRONTEND_ARCHITECTURE_AUDIT.md` en el árbol del repo remoto. Hipótesis más simple: esos documentos, igual que mi Fase 0 original, probablemente nunca se versionaron — existen como salida de conversación de Cursor, no como archivos en git.

---

## 1. Executive Summary

MayaLex es una plataforma jurídica en producción (Next.js 16 + Supabase + Anthropic SDK) con un corpus RAG activo (84,204 chunks verificados en producción vía consulta en vivo), autenticación Supabase, tiers `free/pro/academico/admin`, y pagos PayPal maduros. Exequátur de Notario se integrará como vertical interna, no como plataforma separada.

Esta sesión concilia la Fase 0 + Fase 0-B (mías, verificadas contra repo y bases de datos vivas) con hallazgos relatados de una revisión independiente de Cursor. La reconciliación de las dos discrepancias señaladas (archivo de blueprint "faltante" y pipeline "inexistente") se resuelve con evidencia directa: ambos artefactos **sí existen** en el repositorio actual — la explicación más consistente con la evidencia es que Cursor inspeccionó un estado de repositorio distinto (commit `00b7448`, que no existe en ningún branch local o remoto de este repositorio — ver Sección 3). El hallazgo de `FakeEmbeddingProvider`/LCG de Cursor también se confirma como real, pero corresponde a un archivo distinto (`lib/ingesta-oficial/embeddings.ts`) del que reportó mi Fase 0 (`scripts/ingest-to-supabase.ts`) — **ambos mecanismos de embedding falso coexisten en el repo actual, en dos pipelines distintos**, no son la misma cosa mal identificada por una de las dos partes.

Ninguna de las tres decisiones de arquitectura originales (identidad canónica, contrato de citas, ubicación del contenido pedagógico) se resuelve en este documento como `ACCEPTED` — todas permanecen `PROPOSED`, a la espera de revisión humana.

---

## 2. Verified MayaLex Architecture

Consolidado de Fase 0 + Fase 0-B (repositorio y bases de datos vivas), sin repetir el detalle completo ya entregado en `EXEQUATUR_FASE0_BLUEPRINT.md`:

- **Stack:** Next.js 16 App Router (un solo `app/` raíz, sin monorepo), Supabase (`@supabase/supabase-js`), `@anthropic-ai/sdk`, sin CI/CD versionado, sin sistema de feature flags dedicado.
- **RAG:** `buscarRAG()` (`lib/rag/search.ts:223`) → RPC `buscar_biblioteca_v2` sobre `biblioteca_vectores` (pgvector, e5-small 384-dim). `LIVE_DB_VERIFIED`: 84,204 filas en producción (`maya-lex-ia-pinel-hn`, ref `thgrhueckkjdutjvcufp`), 100% con norma de vector ≈1.0 (embeddings reales, no dummy).
- **Auth/tiers:** Supabase Auth directo, tiers `free/pro/academico/admin` como columna de texto en `subscriptions`/`queries_log`, sin tabla de entitlements formal.
- **Pagos:** PayPal con máquina de estados atómica, probada. Stack paralelo PixelPay bajo `src/` de estatus de producto sin resolver.
- **RLS:** `LIVE_DB_VERIFIED` — habilitado en `subscriptions` y `biblioteca_vectores` en producción, patrón `service_role`-only, sin políticas ownership-based.
- **Identidad canónica legal:** no existe a nivel de documento/disposición en el corpus productivo (`biblioteca_vectores` es plano, solo chunks). Sí existe, sin conectar a producción, en `lib/ingesta-oficial/` (con tablas reales pero solo en staging, `LIVE_DB_VERIFIED`: `hn_normas_verificadas_staging` 44 filas, ninguna promovida más allá de V3-con-advertencia).
- **Frontend autenticado actual (`REPO_VERIFIED` en esta sesión):** `app/chat/page.tsx` y `app/cuenta/page.tsx` existen; no existen `app/investigacion`, `app/corpus`, ni `app/copiloto`. `middleware.ts` es un pass-through no-op (`return NextResponse.next()`), confirmado byte a byte igual en Fase 0 y en esta conciliación.

---

## 3. Trazabilidad de `EXEQUATUR_FASE0_BLUEPRINT.md` — resuelto

```
git status --short  →  ?? EXEQUATUR_FASE0_BLUEPRINT.md
git branch --show-current  →  feature/mayalex-rag-citations-integration
git rev-parse HEAD  →  4ce513e771de9cbdc420fcfa30dfe9dc14379855
git worktree list  →  una sola entrada (C:/Proyectos/maya-lex-pinel-deploy)
```

**El archivo existe, en la ruta absoluta `C:\Proyectos\maya-lex-pinel-deploy\EXEQUATUR_FASE0_BLUEPRINT.md`, untracked, nunca committeado** — exactamente como reporté al crearlo. No se perdió, no fue reconstruido, no cambió de estado entre entonces y ahora.

Verifiqué si el commit `00b7448` que Cursor cita existe en este repositorio: **no existe en ningún branch local ni remoto** (`git for-each-ref` sobre `refs/heads` y `refs/remotes` no lo lista) y **no es un objeto git válido en este repositorio** (`git cat-file -t 00b7448` → `fatal: Not a valid object name`; `git show 00b7448:...` → `fatal: invalid object name`). Esto es evidencia directa de que ese hash no pertenece a la base de objetos de este repositorio.

Como el archivo es y siempre fue *untracked*, es trivialmente cierto que no aparecería en NINGÚN commit de NINGÚN repositorio — eso por sí solo no prueba nada sobre qué repositorio inspeccionó Cursor. Pero el hecho de que `00b7448` no exista aquí en absoluto sí es significativo: sugiere que Cursor trabajó sobre una instancia de repositorio distinta a la que tengo acceso (otro clon, otro checkout local, o un hash mal transcrito) — no que el archivo haya "desaparecido" de este.

**Clasificación:** `BLUEPRINT_ARTIFACT_MISSING` no aplica — el artefacto está presente. El hallazgo correcto es `CURSOR_INSPECTED_DIFFERENT_REPOSITORY_STATE` (commit no reconciliable contra este repo).

---

## 4. Reconciliación del pipeline Honduras — `ingest-to-supabase.ts`

```
git ls-files scripts/ingest-to-supabase.ts  →  scripts/ingest-to-supabase.ts (tracked)
git log --oneline -- scripts/ingest-to-supabase.ts  →  424edfd feat(ingesta): add scripts for massive Honduras corpus ingestion (22K+ docs)
git log -1 --format="%H %ai" -- scripts/ingest-to-supabase.ts  →  424edfd89fffefb1885966472c1367a2948be248 2026-09-13 12:00:28 -0600
git show 00b7448:scripts/ingest-to-supabase.ts  →  fatal: invalid object name '00b7448'
```

El archivo existe, está trackeado, se añadió en el commit `424edfd` (2026-09-13), y sigue presente en el HEAD actual (`4ce513e`) de la rama `feature/mayalex-rag-citations-integration`. Contiene literalmente, en las líneas 89 y 92, `embedding = new Array(384).fill(0.001); // dummy` y `embedding = new Array(384).fill(0.001); // dummy para demo` — releído directamente en esta sesión, no de memoria.

**Clasificación: `CURRENT_REPO_VERIFIED`.** Mi aserción previa era correcta. La explicación más consistente de que Cursor no lo haya encontrado es que su inspección corresponde a un estado de repositorio anterior al 2026-09-13 (o a un branch distinto que no incorpora ese commit) — coherente con que `00b7448` tampoco exista en este repositorio (Sección 3). No hay evidencia de `INCORRECT_PREVIOUS_ASSERTION` de mi parte en este punto.

---

## 5. Embeddings dummy — las dos implementaciones coexisten, no se contradicen

Verificación directa vía `grep` en el repo actual:

| Archivo | Mecanismo | Estado |
|---|---|---|
| `scripts/ingest-to-supabase.ts:89,92` | Literal `new Array(384).fill(0.001)` — vector constante, sin variación | `CURRENT_REPO_VERIFIED` (releído esta sesión) |
| `lib/ingesta-oficial/embeddings.ts:33-46` | Clase `FakeEmbeddingProvider`, generador congruencial lineal (LCG) determinístico por texto, documentado explícitamente en el encabezado del archivo como no-productivo ("Esta fase NO debe conectar un proveedor de embeddings real... solo para probar el pipeline extremo a extremo sin red ni credenciales") | `CURRENT_REPO_VERIFIED` (releído esta sesión) |

Son **dos pipelines distintos, dos archivos distintos, ambos reales en el repo actual**: el primero pertenece a la ingesta masiva de Honduras (fuera de `lib/ingesta-oficial/`); el segundo pertenece deliberadamente al pipeline oficial V0–V5, diseñado para pruebas sin credenciales. Cursor reportó correctamente el segundo; mi Fase 0 reportó correctamente el primero. Ninguna de las dos observaciones es incorrecta — describen archivos diferentes.

**Regla que se mantiene sin cambios:** no declaro que "MayaLex productivo genera 99% embeddings dummy" — mi Fase 0-B ya había verificado contra ambas bases Supabase vivas que `biblioteca_vectores` en producción tiene 0 filas con el prefijo `HN-` (huella exclusiva de `ingest-to-supabase.ts`) y 100% de embeddings con norma real (~1.0). El defecto existe en código pero **no está materializado en ninguna base viva verificada**. Se mantiene la regla preventiva: `NO EJECUTAR PIPELINES DE INGESTA NO VALIDADOS`.

---

## 6. Evidence Matrix

| Claim | Source | Evidence | Claude Position | Cursor Position | Final Status |
|---|---|---|---|---|---|
| `EXEQUATUR_FASE0_BLUEPRINT.md` existe | Repo (esta sesión) | `git status --short` → untracked, presente | Existe, untracked, nunca committeado | No lo encontró en commit `00b7448` | `CROSS_VERIFIED` (ambas observaciones son ciertas simultáneamente; `00b7448` no existe en este repo) |
| `scripts/ingest-to-supabase.ts` existe | Repo (esta sesión) | `git ls-files`, `git log` → tracked, commit `424edfd`, 2026-09-13 | Existe, con embedding dummy literal | No lo encontró | `REPO_VERIFIED` (Claude); `CURSOR_NOT_YET_VERIFIED` contra el HEAD actual |
| Embedding dummy `[0.001,...]` | Repo (esta sesión) | `scripts/ingest-to-supabase.ts:89,92`, releído | Confirmado, literal | No encontrado (buscaba otro archivo) | `REPO_VERIFIED` |
| `FakeEmbeddingProvider` (LCG) | Repo (esta sesión) | `lib/ingesta-oficial/embeddings.ts:33-46`, releído | No reportado en Fase 0 original (no era el foco de esa lectura) | Confirmado por Cursor | `CROSS_VERIFIED` (ahora confirmado por ambas fuentes, en archivos distintos) |
| RLS activo en `subscriptions` (producción) | Fase 0-B (esta sesión, previa) | Consulta SQL en vivo contra `thgrhueckkjdutjvcufp`: `relrowsecurity=true` | Confirmado en vivo | No pudo verificar el mismo entorno | `LIVE_DB_VERIFIED` (Claude); `CURSOR_NOT_YET_VERIFIED` |
| `organizations`/`pending_orders` no existen en ninguna base | Fase 0-B | Consulta SQL en vivo, ambos proyectos | Confirmado, ausentes | No evaluado | `LIVE_DB_VERIFIED` |
| Producto autenticado concentrado en `/chat` y `/cuenta` | Relayed Cursor claim + verificación propia esta sesión | `ls app/` → `chat/page.tsx`, `cuenta/page.tsx` existen; sin `/investigacion`, `/corpus`, `/copiloto` | Confirmado independientemente | Origen del hallazgo | `CROSS_VERIFIED` |
| Divergencia visual marketing V2 vs. app/chat | Relayed Cursor claim | No verificado por Claude (requeriría comparación visual/capturas, fuera de alcance de esta sesión de solo-lectura de código) | No evaluado | Reportado por Cursor | `CURSOR_NOT_YET_VERIFIED` — no lo niego ni lo confirmo |
| Middleware de auth es no-op | Fase 0 + esta sesión | `middleware.ts` completo, releído: `return NextResponse.next()` | Confirmado dos veces | Confirmado por Cursor | `CROSS_VERIFIED` |
| Mecanismo de feature flags "fail-closed" existente | Relayed Cursor claim | `grep -i "fail.?closed"` en todo el repo → 0 resultados literales | No encontré el término exacto; sí existe un patrón de degradación segura (RAG se deshabilita si falta `HF_API_TOKEN` en vez de fallar abierto, `lib/rag/search.ts`) | Reportado por Cursor | `PARTIALLY_CONFIRMED` — el patrón de comportamiento (degradar a deshabilitado ante config faltante) existe en al menos un lugar; no existe un sistema de flags nombrado y genérico |
| Modalidad del examen (oral vs. escrito, Reglamento 2013) | Relayed Cursor claim | No verificable técnicamente — es una cuestión normativa | No tengo posición — fuera de mi competencia | Señaló la contradicción | `LEGAL_REVIEW_REQUIRED` |
| Contenido editorial actual vive en Drive | Relayed Cursor claim | No verificado por Claude (no tengo acceso a Drive en esta sesión) | No evaluado | Reportado por Cursor | `CURSOR_NOT_YET_VERIFIED` — se trata como `CURRENT_EDITORIAL_SOURCE` condicionalmente, no como hecho confirmado por mí |
| ¿Cuál proyecto Supabase sirve a mayalexhn.com? | Fase 0-B + esta sesión | `.env.local` tiene `NEXT_PUBLIC_SUPABASE_URL` como placeholder sin resolver, no un valor literal | No puedo confirmarlo por configuración | No evaluado | `UNVERIFIED_ASSUMPTION: PRODUCTION_SUPABASE_IDENTITY` (ver Sección 7) |

---

## 7. Identidad del Supabase productivo — sigue sin resolverse

Repetí el intento de esta sesión: `.env.local` contiene `NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}` — un placeholder de interpolación sin resolver, no un valor literal. No hay ningún otro archivo de configuración en el repo (`vercel.json`, `next.config.ts`) que fije el proyecto Supabase de forma explícita y legible. No imprimí ni voy a imprimir keys/tokens/passwords/credenciales service-role para intentar deducirlo por huella.

Identifiqué dos proyectos accesibles vía la cuenta Supabase conectada a este entorno: `maya-lex-ia-pinel-hn` (`thgrhueckkjdutjvcufp`, creado 2026-06-24) y `mayalexhn-staging` (`aicakncgtuiiuomflkqj`, creado 2026-07-17). Trato al primero como probable producción por convención de nombre y antigüedad — **explícitamente no es una demostración**, es una inferencia razonable no verificada.

`UNVERIFIED_ASSUMPTION: PRODUCTION_SUPABASE_IDENTITY`. No bloquea la conciliación arquitectónica de este documento, pero **sí debe resolverse antes de cualquier migración real** — cualquier `apply_migration` futuro debe apuntarse contra el proyecto correcto, confirmado, no inferido.

---

## 8. Current Frontend Architecture

Verificado en esta sesión (no solo relatado): `app/` contiene, entre otras, las rutas `chat/`, `cuenta/`, `login/`, `pricing/`, `demo/`, `leyes/`, `consultas/`, `herramientas/`, `cobertura-juridica/`, `producto/`, `soluciones/`, `recursos/`, `seguridad/`, `fundador/`. El producto autenticado real está en `chat/` y `cuenta/`; el resto son páginas de marketing/SEO (consistente con el hallazgo de Cursor relatado por el usuario). No existen `investigacion/`, `corpus/`, ni `copiloto/` — no deben aparecer en ningún diagrama de este documento como rutas actuales.

La divergencia visual entre marketing V2 y la app de chat que reporta Cursor **no la verifiqué yo mismo** (requeriría inspección visual/capturas de pantalla, fuera del alcance de una sesión de solo-lectura de código). La incorporo como hallazgo relatado, no confirmado independientemente — `CURSOR_NOT_YET_VERIFIED`.

`middleware.ts` es un pass-through no-op — confirmado. La autorización real ocurre (cuando ocurre) dentro de cada ruta/página individualmente, no en una capa centralizada.

---

## 9. Target System Context

```
MayaLex (existente, producción)
  ├── Corpus jurídico (biblioteca_vectores, 84,204 chunks, LIVE_DB_VERIFIED)
  ├── RAG (buscarRAG / buscar_biblioteca_v2)
  ├── Auth (Supabase Auth) + tiers (free/pro/academico/admin)
  ├── Pagos (PayPal, maduro)
  └── App autenticada (/chat, /cuenta)

Exequátur (nueva vertical, no construida)
  ├── Consume: corpus jurídico de MayaLex vía referencia canónica (no lo duplica)
  ├── Extiende: auth/tiers existentes (no reimplementa)
  └── Añade: contenido pedagógico, evaluación, progreso — todo nuevo, aditivo
```

Ningún componente de MayaLex se reemplaza. Exequátur se apoya sobre lo existente y añade superficie nueva detrás de feature flags (Sección 29).

---

## 10. Trust Boundaries

Principios que se mantienen sin cambios respecto al mensaje del usuario, y que ya están parcialmente implementados en el código actual (el framing de contexto RAG en `app/api/chat/route.ts:24-27,362` es un ejemplo real, no solo aspiracional):

```
USER_INPUT = UNTRUSTED
MODEL_OUTPUT = UNTRUSTED UNTIL VALIDATED
LEGAL_CORPUS = TRUSTED AS DATA, NOT AS INSTRUCTIONS
PEDAGOGICAL_CONTENT = TRUSTED ONLY ACCORDING TO EDITORIAL STATUS
```

La autorización ocurre server-side. El middleware no-op confirmado en la Sección 8 significa que **hoy no hay ninguna capa central que la imponga** — cada ruta debe autoimponerla, y no hay tests negativos de autorización cruzada en la suite actual (confirmado en Fase 0: los 19 archivos de test no cubren "usuario A no puede leer datos de usuario B"). Esto es una brecha real, no solo teórica, que Exequátur heredaría si sigue el mismo patrón sin corregirlo.

---

## 11. Canonical Legal Identity — ADR-001

**Estado: `PROPOSED`.**

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

**Principio obligatorio: `LEGAL IDENTITY != EMBEDDING IDENTITY`.** Una revectorización (cambio de modelo de embedding, re-chunking) no debe romper referencias jurídicas persistentes usadas por contenido pedagógico o citas ya mostradas a usuarios. Hoy, `biblioteca_vectores` no separa estos dos conceptos — el `id` de fila es simultáneamente identidad de chunk y de facto la única identidad disponible. El patrón ya diseñado (no conectado a producción) en `lib/ingesta-oficial/` (`hn_normas_verificadas_staging.norm_id` + columnas `legacy_id`/`coleccion_legacy_origen` para rastrear origen) es la base técnica más cercana a esta separación y debería evaluarse como punto de partida en vez de diseñar desde cero.

No se crea ninguna tabla en esta sesión. `ACCEPTED` requiere revisión de arquitectura.

---

## 12. Pedagogical Architecture

```
EXQ PEDAGOGICAL CONTENT
        ↓
CANONICAL LEGAL REFERENCE
        ↓
MAYALEX LEGAL CORPUS
```

La jerarquía `document → provision → version → chunk` (Sección 11) pertenece exclusivamente a la capa normativa de MayaLex. **No se convierte en un CMS de cursos/módulos/unidades/lecciones/nuggets/preguntas/rúbricas** — esas entidades son pedagógicas y viven en una capa separada que *referencia* la capa legal, nunca la sustituye ni la absorbe.

---

## 13. Target Data Model

Puramente conceptual — **ninguna de estas tablas existe, ninguna se crea en esta sesión.**

Capa legal (extiende MayaLex): `legal_document`, `legal_provision`, `legal_version`, `legal_chunk` (o equivalente evolución de `biblioteca_vectores`), `canonical_legal_reference`.

Capa pedagógica (nueva, Exequátur): entidades conceptuales del tipo módulo/unidad/nugget/pregunta/rúbrica/intento/perfil-de-dominio — nombres físicos deliberadamente no fijados aquí; dependen de la ADR-003 (Sección 14) y de si el contenido vive en este repo, en uno separado, o híbrido.

---

## 14. Pedagogical Content Architecture — ADR-003

**Estado: `PROPOSED`.** Dirección preferida tras la relación de hallazgos de Cursor: **HYBRID**.

- **Repo MayaLex:** aplicación, contratos, APIs, integración, UI, schemas técnicos, validators.
- **Contenido pedagógico:** workflow editorial versionado, forma física a decidir después — puede vivir en un repositorio de contenido separado, un pipeline sincronizado desde fuente editorial, o un sistema equivalente.
- **Corpus MayaLex:** permanece como autoridad normativa única, sin duplicarse.

Cursor relata que el contenido pedagógico actual vive en Drive (Índice Maestro, capítulos, material editorial) — **no lo verifiqué yo mismo** (sin acceso a Drive en esta sesión). Lo trato condicionalmente como `CURRENT_EDITORIAL_SOURCE` si se confirma, nunca como la base de datos productiva futura. El pipeline que estas fuentes deberán atravesar antes de convertirse en producto:

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

Reutiliza el patrón ya diseñado y probado (12 tests) en `lib/ingesta-oficial/estados.ts` (V0→V5), con sus tablas reales confirmadas en staging (`hn_normas_verificadas_staging`, `ingestion_audit_log`) aunque desconectadas de producción.

Regla explícita, sin excepción:

```
DEROGADO EXISTS           → no es motivo de bloqueo (puede existir como histórico)
DEROGADO SERVED AS CURRENT AUTHORITY → FAIL (esto sí se bloquea)
```

El gate bloquea la **promoción indebida**, no la existencia de contenido en estados borrador/pendiente/histórico/derogado.

---

## 16. Citation Architecture — ADR-002

**Estado: `PROPOSED`.**

Cursor confirma (relatado) que las citas actuales se construyen como proyección del retrieval — `construirCitas()` en `app/api/chat/route.ts:160-178` (verificado en Fase 0, releído esta sesión de forma indirecta vía grep previo) — y no constituyen una entidad jurídica durable. Esto es consistente con mi hallazgo original: no existe validación estructural del *output* del modelo contra el contexto recuperado, solo filtrado de qué fragmentos son citables.

Dirección conciliada:

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

El backend valida; el frontend solo renderiza. No se implementa en esta sesión.

---

## 17. UI de citas — REUSE vs EXTEND vs REPLACE

Cursor recomienda (relatado) `EXTEND` el componente/chip de citas actual en vez de duplicarlo. No tengo evidencia propia sobre la complejidad interna de ese componente (no lo inspeccioné a nivel de props/estado en esta sesión), así que no puedo confirmar independientemente que `EXTEND` sea técnicamente trivial — pero la preferencia por defecto de este Blueprint es `EXTEND` si el componente puede aceptar el nuevo Citation DTO (Sección 16) sin deuda excesiva, evaluable solo con inspección directa del componente en una fase posterior. No se implementa en esta sesión.

---

## 18. Vigencia Architecture

Hoy `es_norma_vigente` es un booleano plano dentro de `metadata jsonb` en `biblioteca_vectores` (`LIVE_DB_VERIFIED` indirectamente vía Fase 0 — columna confirmada en el schema). No hay rango de fechas de vigencia, no hay historial de reformas a nivel del corpus productivo (sí existe ese concepto, sin conectar, en `hn_normas_verificadas_staging.reformas`/`derogaciones` jsonb). Cualquier extensión de vigencia para Exequátur debe construirse sobre ese patrón ya diseñado, no reinventar uno paralelo. La cuestión de modalidad del examen (Sección 19/38) es una cuestión legal separada de esta arquitectura de datos.

---

## 19. Tribunal Virtual

**No queda cancelado.** La discrepancia sobre modalidad del examen (oral/escrito, Reglamento 2013 — `LEGAL_REVIEW_REQUIRED`, Sección 38) no elimina el concepto: puede servir como entrenamiento, dominio, interrogación, repreguntas, explicación jurídica, evaluación estructurada — independientemente de si el examen real es oral o escrito. Lo que sí queda sujeto a revisión jurídica es su **nombre, posicionamiento, copy y promesa** frente al usuario.

Requiere, antes de construirse: identidad canónica (Sección 11, `ACCEPTED`), citas (Sección 16, `ACCEPTED`), contenido (Sección 14, resuelto), rúbricas (Sección 20), evaluation harness (Sección 22), autorización (Sección 21 del blueprint original / matriz de este documento), y posicionamiento legal. Es una fase posterior, no el primer incremento (Sección 35).

---

## 20. Rubric Architecture

**Estado: `PROPOSED`, sin implementación.** Contrato conceptual (repetido del prompt maestro original, no re-derivado con evidencia nueva porque no existe nada de esto en el repo actual): rúbricas versionadas por pregunta, con conceptos requeridos/opcionales, errores críticos, referencias canónicas y temas de repregunta — todo trazable contra pregunta, rúbrica, versión, evidencia y modelo usado.

---

## 21. Preparation/Mastery Model

**Estado: `PROPOSED`.** El "Índice de Preparación Exequátur" mide dominio demostrado dentro del sistema. Regla de integridad comercial que se mantiene: nunca presentarlo como probabilidad de aprobación, garantía de aprobación, ni predicción oficial de la CSJ.

---

## 22. Evaluation Harness — ADR-006

**Estado: `PROPOSED`.** Debe gobernar: golden dataset, retrieval regression, citation validation, abstention, policy, prompt injection, y posteriormente Tribunal/rúbricas. No existe ningún harness de este tipo en el repo actual (confirmado por ausencia en Fase 0 — sin Sentry, sin dataset de referencia, sin tests de regresión de retrieval).

---

## 23. Threat Model

Riesgos concretos ya identificables desde el código actual, no hipotéticos:

- **Inyección de instrucciones vía corpus recuperado:** parcialmente mitigado hoy (delimitadores de framing en `lib/rag/search.ts:285-310`), pero es una defensa de texto plano, no estructural — Exequátur debe replicar el patrón, no asumir que es infalible.
- **Ausencia de autorización cruzada probada:** sin tests negativos de "usuario A no puede leer datos de usuario B" en la suite actual (Sección 10). Si Exequátur añade datos de progreso por usuario, este vacío se vuelve directamente explotable si no se corrige antes.
- **Sprawl de service-role:** casi todo el acceso server-side a Supabase usa la clave de service-role (bypassa RLS por diseño) — cualquier endpoint nuevo de Exequátur que copie el patrón hereda ese trust boundary amplio.
- **Middleware no-op:** sin capa central de autenticación — cada ruta nueva de Exequátur debe implementar su propio chequeo, con riesgo real de que alguna lo omita.

---

## 24. Privacy/Data Lifecycle

Ya existen mecanismos reales de scrubbing de PII (`lib/self-learning/moderar.ts`, `lib/ingesta-oficial/validaciones.ts:81-88`) — reutilizables como patrón para cualquier dato de usuario que Exequátur capture (respuestas de exámenes, transcripciones de audio del Tribunal Virtual en fase posterior). No se diseña un pipeline nuevo de PII sin antes evaluar si estos ya cubren el caso.

---

## 25. Observability

No existe Sentry ni logger estructurado en el repo (confirmado por ausencia, Fase 0). Solo `console.error` disperso y un logger custom de analítica. Exequátur no debe introducir una tercera solución de observabilidad sin decisión explícita — extender el logger de analítica existente es la opción de menor blast radius, a evaluar en fase posterior.

---

## 26. SLO/Cost Strategy

No evaluado — no hay datos de costo/latencia de producción disponibles en esta sesión de solo-lectura de código. Nota de diseño para fase posterior: el Tribunal Virtual (turnos múltiples, extracción de conceptos, repregunta adaptativa) tendrá un costo de LLM por sesión sustancialmente mayor que el chat actual de una sola pasada — debe presupuestarse antes de comprometerse a un modelo de precio para esa función.

---

## 27. MayaLex App Shell — ADR-004

**Estado: `PROPOSED`.**

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

Diseño conceptual únicamente. Debe resolver cómo MayaLex pasa de su estructura autenticada actual (rutas planas `/chat`, `/cuenta`, sin navegación de verticales) a una que pueda alojar verticales — minimizando blast radius, sin exigir un rediseño total previo del `/chat` existente.

---

## 28. Frontend Integration Strategy

Dos pistas de trabajo explícitamente separadas, para que Exequátur no se convierta en excusa para reescribir el frontend existente:

1. **Existing MayaLex stabilization** — cualquier trabajo sobre `/chat`, `/cuenta`, marketing V2 — fuera del alcance de la integración de Exequátur salvo que sea estrictamente necesario para alojar el App Shell (Sección 27).
2. **Exequátur integration** — todo lo nuevo, detrás de feature flags (Sección 29), extendiendo componentes existentes donde sea razonable (Sección 17) en vez de duplicar.

---

## 29. Feature Flags — ADR-005

**Estado: `PROPOSED`.**

**[CORREGIDO en Fase 0-C, ver Addendum al inicio del documento]** La evaluación original de esta sección se hizo contra un `origin/main` local desactualizado (72f762a) y concluyó "0 resultados literales" para `fail-closed`. Tras `git fetch` en la sesión de reconciliación, `origin/main` actual (`00b7448`) **sí contiene un sistema real de feature flags**: `lib/flags.ts`, introducido en el commit `752d8d0 feat(flags): Fase 0 de Operación Facultades Completas`. Contenido verificado directamente (`git show origin/main:lib/flags.ts`): exporta `KNOWN_FLAGS` (`flag_corpus_p0`, `flag_corpus_profesional`, `flag_osint`, `flag_expediente`, `flag_voz`, `flag_paywall`, `flag_rerank`), respaldado por una tabla `feature_flags`, con `isFlagEnabledForUser(flagName, userEmail)` que soporta allowlist por email. El propio encabezado del archivo declara explícitamente: *"Fail-closed por diseño: cualquier error de lectura, tabla ausente, fila ausente, o nombre de flag desconocido se trata como DESACTIVADO."*

**Clasificación de la afirmación de Cursor: `CROSS_VERIFIED`** (corregido desde `PARTIALLY_CONFIRMED`). Recomendación de ADR-005 revisada: **`EXTEND` `lib/flags.ts`** añadiendo entradas a `KNOWN_FLAGS` (p. ej. `flag_exq_enabled`, `flag_exq_copilot`, `flag_exq_tribunal`) y su fila correspondiente en la tabla `feature_flags`, en vez de construir un módulo nuevo — hay un sistema real, probado en producción (ya gatea `flag_rerank` para el reranking Cohere), que cumple exactamente los requisitos de fail-closed que se buscaban. Nombres físicos definitivos y la migración que añade las filas a `feature_flags` quedan pendientes de aprobación de arquitectura — no implementado en esta sesión.

---

## 30. Environment Strategy

Hallazgo de Fase 0-B que sigue vigente: `.env.local` tiene `NEXT_PUBLIC_SUPABASE_URL` como placeholder sin resolver. Cualquier variable nueva de Exequátur (`EXQ_ENABLED`, etc.) debe documentarse en `.env.example`/`.env.local.example` desde el primer commit — ya existe precedente de deuda de documentación de variables (`HF_API_TOKEN`, `RESEND_API_KEY` usadas en código pero ausentes de ambos templates, Fase 0 Sección 9).

---

## 31. Testing Strategy

Extender la suite Vitest existente (19 archivos), no crear una paralela. Brecha concreta a cerrar antes de exponer cualquier superficie nueva de Exequátur: tests negativos de autorización cruzada (Sección 10/23), inexistentes hoy para ningún feature del repo.

---

## 32. CI/CD Strategy

No existe ningún pipeline versionado (`.github/workflows/` ausente, sin `vercel.json`). Fuera del núcleo de esta conciliación — se registra como `ADD` opcional en la Delta Architecture, no como bloqueador de las decisiones de Exequátur.

---

## 33. Backup/Recovery/Rollback

El patrón existente es rollback documentado como comentario SQL dentro de cada archivo de migración (manual, no automatizado) — cualquier migración futura de Exequátur debe seguir el mismo patrón hasta que se decida invertir en un mecanismo automatizado, decisión que excede el alcance de esta conciliación.

---

## 34. SEO/Accessibility

El sistema de contención SEO (`sitemap.ts`/`robots.ts` + `corpus-editorial-status.json`) cubre el corpus legacy de 198 artículos, no el corpus de Honduras ni cubriría automáticamente páginas de Exequátur — cualquier página pública de Exequátur debe pasar por el mismo mecanismo de gating, no uno nuevo. La auditoría de accesibilidad (`MAYALEX_V2_ACCESSIBILITY_FINAL.md`) solo cubrió páginas de marketing V2 — `/chat`, `/cuenta` y cualquier futura superficie de Exequátur quedan sin auditoría de accesibilidad confirmada.

---

## 35. Implementation Phases

**Primer incremento evaluado (no implementado en esta sesión):**

```
Canonical Contracts
+
Feature Flag Foundations
+
MayaLex App Shell
+
Exequátur Shell
```

con `EXQ_ENABLED = OFF` en todo momento durante ese incremento. El Tribunal Virtual **no** es el punto de partida — requiere todo lo anterior más rúbricas, evaluation harness, y posicionamiento legal resuelto (Sección 19).

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

| Riesgo | Severidad de evidencia | Fuente |
|---|---|---|
| Migración de RLS en `subscriptions` documentada como "no ejecutada" pero activa en producción | `MATERIALIZED` (como riesgo de documentación, no de seguridad — la seguridad real está bien) | `LIVE_DB_VERIFIED`, Fase 0-B |
| `organizations`/`pending_orders` en tipos TS sin tabla real | `CONTAINED` (código muerto/aspiracional, no accedido en runtime si nunca se consulta) | `LIVE_DB_VERIFIED` |
| `biblioteca_penal`/`conversations` definidas en SQL, no creadas en ninguna base viva | `CONTAINED` — nadie puede estar escribiendo/leyendo de una tabla que no existe; el riesgo es de código muerto, no de datos | `LIVE_DB_VERIFIED` |
| Embedding dummy en `ingest-to-supabase.ts` | `CONTAINED` — el defecto existe en código pero 0 filas con esa huella en cualquier base viva | `LIVE_DB_VERIFIED` + `REPO_VERIFIED` |
| Ausencia de tests de autorización cruzada | `POTENTIAL` — se convierte en `MATERIALIZED` en el momento en que Exequátur añada datos de progreso por usuario sin corregir esto primero | `REPO_VERIFIED` |
| Middleware no-op / autorización dispersa por ruta | `POTENTIAL` — riesgo arquitectónico, no incidente confirmado | `REPO_VERIFIED`, `CROSS_VERIFIED` con Cursor |
| Identidad de cuál Supabase es producción | `UNVERIFIED` | Ver Sección 7 |
| Documentos fuente de Cursor no localizables | `UNVERIFIED` (afecta la calidad de esta conciliación, no la seguridad del producto) | Ver advertencia inicial |
| Modalidad del examen (oral/escrito) sin resolver | `UNVERIFIED` — legal, no técnico | Relayed Cursor claim |

No se inflaron severidades: los riesgos de datos (embeddings dummy, tablas fantasma) están `CONTAINED` porque la evidencia en vivo así lo confirma, no porque se asuma optimismo.

---

## 38. ADR Queue

| ADR | Título | Estado |
|---|---|---|
| ADR-001 | Canonical Legal Identity | `PROPOSED` |
| ADR-002 | Structured Citation Contract | `PROPOSED` |
| ADR-003 | Pedagogical Content Architecture | `PROPOSED` |
| ADR-004 | MayaLex App Shell / Vertical Navigation | `PROPOSED` |
| ADR-005 | Feature Flag Architecture | `PROPOSED` |
| ADR-006 | AI Evaluation Architecture | `PROPOSED` |

Ninguna `ACCEPTED`.

## 39. LEGAL_REVIEW_REQUIRED

- `EXAM_MODALITY` — oral vs. escrito, norma/artículo/vigencia/reformas aplicables al Reglamento de 2013, práctica y convocatoria actuales. No resuelto por conocimiento general ni inferencia técnica.
- Posicionamiento/nombre/copy/promesa del "Tribunal Virtual" — pendiente de la resolución anterior.
- Granularidad de vigencia normativa suficiente para el Índice de Preparación (Sección 21) sin sobre-prometer.

## 40. DO_NOT_TOUCH

- Cualquier migración/escritura contra `subscriptions`, `biblioteca_vectores`, o cualquier tabla productiva real.
- El pipeline activo de ingesta de Honduras (`scripts/ingest-honduras-massive.ts`, `scripts/sanitize-corpus-contaminated.ts`, `scripts/ingest-to-supabase.ts`) — observar, no modificar ni ejecutar.
- La máquina de estados PayPal (`lib/paypal/`, migraciones `20260717*`) — productiva y probada, fuera de alcance de Exequátur.
- `middleware.ts` — no cambiar auth sin una revisión de límites de autorización completa primero (Sección 10/23).

## 41. Open Questions

- `CURSOR_SOURCE_DOCUMENTS_NOT_LOCATED`: ¿dónde están físicamente `CURSOR_EXEQUATUR_BLUEPRINT_REVIEW.md` y `CURSOR_FRONTEND_ARCHITECTURE_AUDIT.md`? Necesito la ruta exacta (o el contenido pegado/adjunto) para leerlos íntegramente y elevar sus hallazgos de `CURSOR_CLAIM (relayed)` a evidencia directamente verificada por mí.
- ¿Qué repositorio/checkout corresponde al commit `00b7448` que Cursor cita? No existe en este repositorio.
- `UNVERIFIED_ASSUMPTION: PRODUCTION_SUPABASE_IDENTITY` (Sección 7).
- ¿El stack PixelPay bajo `src/` se mantiene, se remueve, o se documenta como legado? (Decisión de producto, no técnica — señalada desde Fase 0.)
- ¿`biblioteca_penal`/`conversations` deben crearse finalmente, o el SQL que las define debe eliminarse por obsoleto? (No se recrea ni se elimina nada sin decisión explícita.)

## 42. Exact Next Step

**Conseguir acceso directo a `CURSOR_EXEQUATUR_BLUEPRINT_REVIEW.md` y `CURSOR_FRONTEND_ARCHITECTURE_AUDIT.md`** (ruta exacta, o pegados/adjuntos en el chat) antes de someter este Blueprint a revisión de arquitectura — es la única acción que, si no se resuelve, deja permanentemente débil la Matriz de Evidencia (Sección 6) en los puntos marcados `CURSOR_CLAIM (relayed)` en vez de `CROSS_VERIFIED`.

---

## Git status final

```
git status --short  →  ?? EXEQUATUR_FASE0_BLUEPRINT.md
                        ?? EXEQUATUR_MASTER_ENGINEERING_BLUEPRINT.md
git branch --show-current  →  feature/mayalex-rag-citations-integration
git rev-parse HEAD  →  4ce513e771de9cbdc420fcfa30dfe9dc14379855
```

Único cambio en el repo durante esta sesión: la creación de este documento (untracked, sin commit). Ningún código modificado, ninguna migración ejecutada, ninguna escritura productiva.
