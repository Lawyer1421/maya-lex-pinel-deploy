# EXEQUÁTUR DE NOTARIO — FASE 0: Auditoría de Integración + Master Engineering Blueprint

**Estado:** PRE-IMPLEMENTACIÓN. Ningún código de Exequátur ha sido escrito. Ninguna migración ha sido ejecutada. Este documento es puramente de discovery y diseño.

**Repo auditado:** `C:\Proyectos\maya-lex-pinel-deploy` (remoto `github.com/Lawyer1421/maya-lex-pinel-deploy`)
**Branch en HEAD al momento de la auditoría:** `feature/mayalex-rag-citations-integration` (working tree limpio, sin cambios sin commitear)
**Fecha:** 2026-09-14
**Método:** 3 agentes de exploración de solo lectura (stack/CI, Supabase/DB/Auth/Pagos, RAG/Corpus/Embeddings) + verificación directa de estructura de repos en disco. Cero escrituras, cero ejecuciones de scripts de ingesta/migración, cero secretos impresos.

**Regla de esta fase:** toda afirmación está etiquetada `VERIFIED` (confirmada leyendo código/config directamente) o `UNVERIFIED_ASSUMPTION` (inferida, proveniente de doc previo no re-confirmado, o dependiente de estado fuera del repo — p.ej. base de datos productiva real). Memoria de sesiones previas ≠ evidencia.

---

## 0. Hallazgo que reencuadra todo lo demás

`notarial-ai-hn` (`C:\Proyectos\notarial-ai-hn`), referenciado en memoria de proyecto como "scaffold aislado de Maya Lex" para infraestructura notarial, **NO EXISTE en este equipo** (`UNVERIFIED_ASSUMPTION` descartada por evidencia negativa — se buscó explícitamente y no aparece bajo `C:\Proyectos`). Tampoco existe ningún directorio, repo o carpeta con "exequátur"/"exequatur" en el nombre en ningún lugar del sistema. **Conclusión: Exequátur de Notario parte de cero — no hay scaffold previo que rescatar ni que auditar aparte de MayaLex mismo.** Si el usuario recuerda haber empezado ese scaffold, probablemente quedó en el laptop anterior (ver migración de entorno documentada en memoria de EduBuddy) y no se ha migrado.

---

## 1. Topología del repo (VERIFIED)

App única Next.js (App Router), no monorepo — un solo `package.json`, un solo `next.config.ts`. Next.js `^16.2.6`, React `^18`. Stack: Supabase (`@supabase/supabase-js ^2.45.0`, `@supabase/ssr`), `@anthropic-ai/sdk ^0.32.1`, `resend`, `zod`, `pdf-parse`, `mammoth`. Sin `@paypal/*` SDK — la integración PayPal es REST hecha a mano.

**Anomalía estructural importante:** existe un **segundo árbol `src/app/`** paralelo a `app/` (raíz). Next.js no fusiona dos raíces `app/` — las rutas bajo `src/app/api/v1/billing/pixelpay/*` y `src/app/api/billing/manual-transfer/*` muy probablemente **no se sirven en producción**, aunque están trackeadas en git. En cambio, `src/lib/supabase/{admin,browser,server}.ts` **sí están vivos** (importados por `lib/supabase.ts` raíz vía alias `@/src/...`). Es decir: `src/` no es basura uniforme — es una mezcla de código muerto (rutas billing paralelas) y código vivo (helpers de Supabase). `DEPRECATION_CANDIDATE` para las rutas PixelPay/manual-transfer, pero **requiere confirmación del dueño del producto antes de tocarlas** — `MAYALEX_FASE0_REMEDIACION_SEGURIDAD.md` ya las marcó explícitamente como "decisión de producto, no técnica."

Estructura de carpetas relevante: `app/` (rutas + `api/`), `components/`, `config/` (routing multi-modelo OpenRouter), `data/` (manifiesto editorial SEO), `lib/` (lógica de servidor: `rag/`, `self-learning/`, `ingesta-oficial/`, `paypal/`, `email/`, `analytics/`, `seo/`), `scripts/` (ingesta, migraciones, auditorías), `supabase/` (SQL crudo + `migrations/`), `tests/` (Vitest, 19 archivos), `src/` (ver arriba).

No hay `.github/workflows/`, no hay `vercel.json` en la raíz → **no hay pipeline CI/CD versionado**; el despliegue es manual vía integración git de Vercel. No hay sistema de feature flags (`grep` de `_ENABLED`, LaunchDarkly/GrowthBook/Unleash: cero resultados) — el único "flag" existente es `RAG_BACKEND` (env var que alterna entre backend Python local y Supabase). No hay i18n (todo el copy está hardcodeado en español). No hay ruta `/admin`. No hay Sentry ni logger estructurado — solo `console.error` disperso y un logger custom de analítica.

---

## 2. Base de datos y RLS (VERIFIED, con una brecha crítica de gobernanza)

**`supabase/migrations/` NO reconstruye el schema completo.** Solo tiene 5 archivos (PayPal state machine ×2, RLS de `subscriptions` preparada-no-ejecutada, `corpus_editorial_status` preparada-no-ejecutada, RPC `buscar_biblioteca_v2` del 13-sep). El schema base (`subscriptions`, `paypal_events`, `conversations`, `biblioteca_vectores`, `biblioteca_penal`, `consultas`, `feedback`) vive en archivos SQL sueltos en `supabase/` (`schema.sql`, `subscriptions.sql`, `vectores.sql`, `analytics.sql`) pensados para pegarse a mano en el SQL Editor de Supabase. **Esto significa que el historial de migraciones en git no es la fuente de verdad del schema productivo real** — cualquier cambio de Exequátur que asuma "aplicar sobre lo que dicen las migraciones" partirá de una base incompleta.

Peor aún: dos tablas (`organizations`, `pending_orders`) existen en los **tipos TypeScript** (`lib/supabase.ts`) pero **no tienen ningún `CREATE TABLE` en ningún archivo del repo**. Esto es drift real entre código y schema versionado — no se puede saber desde el repo si existen en la base productiva.

**RLS:** habilitado en casi todas las tablas con políticas, pero el patrón dominante es "solo `service_role`" (`using (auth.role() = 'service_role')`), no ownership-based (`auth.uid() = user_id`) — porque no hay `auth.users` vinculado; la identidad de usuario es un string libre (`user_identifier`, tipo `"email:{normalizado}"`). La migración que habilita RLS en `subscriptions` **sigue diciendo literalmente "NO EJECUTADA — preparada para revisión humana" en su propio encabezado**, y ninguna migración posterior la reemplaza. `PRODUCTION_RISK_REVIEW_REQUIRED`: no se puede confirmar desde el repo si `subscriptions` tiene RLS activo en producción hoy — es una verificación operativa pendiente, no de código.

**Vector/pgvector:** dos tablas vectoriales de 384 dimensiones que **usan modelos de embedding distintos** (`biblioteca_penal` = `paraphrase-multilingual-MiniLM-L12-v2`, `biblioteca_vectores` = `intfloat/multilingual-e5-small`) — coinciden en dimensión por coincidencia, sus vectores **no son comparables entre sí**. `biblioteca_penal` no tiene ningún caller en el código actual (posible vestigio). `biblioteca_vectores` es la tabla real detrás de `buscarRAG()`.

**Sin Storage buckets, sin Edge Functions, sin cron/jobs versionados** — confirmado por ausencia total en grep/directorios.

---

## 3. Identidad canónica y versionado normativo — `ARCHITECTURE_DECISION_REQUIRED: CANONICAL_LEGAL_IDENTITY`

Esta es la pregunta central de la Sección 7 del prompt maestro, y la respuesta corta es: **no existe identidad estable a nivel de documento/disposición en el corpus curado activo.** `biblioteca_vectores` solo tiene filas de chunk planas (`id = "{coleccion}:{chunk_id}"`, `num_articulo` como columna de texto libre, sin FK a ninguna entidad "disposición"). No hay columna de versión normativa, no hay estado `derogado`, no hay rango de vigencia por fecha.

Existen **tres pipelines de ingesta distintos, con comportamiento de identidad muy diferente**:

| Pipeline | Esquema de ID | ¿Estable ante re-ingesta? |
|---|---|---|
| `scripts/seed_vectores.py` (productor documentado) | `"{coleccion}:{chunk_id_de_chromadb}"` | Depende de un store ChromaDB **fuera de este repo** (`C:\Users\Fredy\OneDrive\...\chroma_mayalex`) — no auditable desde aquí. `ON CONFLICT DO NOTHING` = idempotente pero nunca actualiza contenido/embedding si cambian upstream (queda silenciosamente obsoleto). |
| `scripts/ingestar_cpc_base.py` | `"{prefijo}a{num_articulo:04d}_c{sub:02d}"` — determinístico, basado en contenido | Sí, mientras no cambien `CHUNK_SIZE`/`CHUNK_OVERLAP` fijos. Buen patrón. |
| `scripts/ingest-to-supabase.ts` (el de la ingesta masiva de Honduras, sep-13) | `"HN-" + dígitos extraídos del nombre de archivo, truncado a 8` | **No** — propenso a colisión, sin `ON CONFLICT`, y **solo 1 de cada 100 documentos recibe un embedding real** (los demás llevan un vector dummy `[0.001, ...]` hardcodeado). Esto es un defecto de calidad grave, no solo de identidad. |

Adicionalmente: el commit `4ce513e` ("sanitization completed - 22,724 docs") solo tocó `corpus_honduras_processed.json`, y ese archivo commiteado contiene `"documents": [], "total": 0`. Como `ingest-to-supabase.ts` lee exactamente ese archivo y aborta si está vacío, **la ingesta masiva de 22,724 documentos descrita en los mensajes de commit y en `INGESTA_HONDURAS_STATUS.md`/`EXECUTION_REPORT_HONDURAS.md` aparentemente no ha insertado nada todavía en `biblioteca_vectores`** — esos mismos documentos la marcan como "🟡 PENDIENTE". Esto no es una suposición: es lo que dice el artefacto commiteado.

**Lo bueno:** ya existe, sin usar, exactamente el patrón de identidad de dos niveles que Exequátur necesita:
- `lib/self-learning/schema.sql` — `documentos_aprendizaje.id (uuid)` ← FK ← `vectores_conocimiento.documento_id`, chunk id = `"{documento_id}:{chunk_num}"`. Aplica hoy solo a contenido comunitario, no al corpus curado.
- `lib/ingesta-oficial/estados.ts` — máquina de estados **V0(Capturado)→V1(Fuente identificada)→V2(Integridad comprobada)→V3(Vigencia analizada, usable solo con advertencia explícita)→V4(Revisión profesional)→V5(Producción)**, con promoción V3→V4/V4→V5 restringida por rol (`abogado_revisor_senior`/`propietario_despacho`), 12 tests pasando. Su tabla destino `hn_normas_verificadas_staging` **no existe en ninguna migración de este repo** (puede existir fuera de banda en el proyecto `mayalexhn-staging`, o puede no existir en absoluto — `UNVERIFIED_ASSUMPTION`). Nunca ha promovido contenido real más allá de V0-V2 en la práctica.

**Decisión que debe tomar el supervisor humano / arquitectura (no yo unilateralmente):**
`ARCHITECTURE_DECISION_REQUIRED: CANONICAL_LEGAL_IDENTITY` — ¿Exequátur referencia:
(a) directamente filas de `biblioteca_vectores` por su `id` de chunk actual (frágil — cualquier re-ingesta rompe referencias), o
(b) se construye sobre una capa de identidad estable nueva (`canonical_legal_reference` → `legal_document` → `legal_provision` → `legal_version` → chunk), reutilizando el patrón ya diseñado en `lib/ingesta-oficial/` y `lib/self-learning/` en vez de inventar uno nuevo?

Mi recomendación técnica (no vinculante, para que el humano decida): **(b)**, extendiendo el patrón V0–V5 ya construido y probado en `lib/ingesta-oficial/estados.ts` en vez de duplicarlo — cumple CANON-10 sin tocar la ingesta activa de Honduras, que puede seguir escribiendo a `biblioteca_vectores` exactamente como hoy mientras Exequátur no dependa de sus IDs de chunk como si fueran estables.

---

## 4. Capa RAG / Copiloto — lo que ya funciona bien y puede reutilizarse

`buscarRAG()` (`lib/rag/search.ts:223`) es el contrato de retrieval real: llama en paralelo a la RPC `buscar_biblioteca_v2` (similitud coseno pgvector, `<=>`) con y sin filtro `solo_norma_vigente`, deduplica por `id`, y filtra fragmentos con artefactos de anonimización sin limpiar. Embeddings vía HuggingFace Inference API, modelo `intfloat/multilingual-e5-small`, 384 dim, prefijo `"query: "`/`"passage: "`.

La defensa contra inyección de instrucciones vía contenido recuperado **ya existe y está bien pensada**: el contexto RAG se inyecta envuelto en banners delimitadores (`── CONTEXTO RECUPERADO ──` ... `── FIN DEL CONTEXTO RAG ──`) más una instrucción de refuerzo, siempre concatenado *después* del system prompt maestro, nunca en los turnos de usuario (`app/api/chat/route.ts:24-27,362`). Es una defensa de framing/delimitador (no estructural — todo es texto plano concatenado en el `system` string), pero es un patrón real y consistente con CANON de este proyecto que Exequátur debería replicar para su propio retrieval pedagógico, no reinventar.

**Lo que falta y es relevante para CANON-2 (el copiloto no inventa):** la validación de citas es solo a nivel de *qué se le permite citar* (`construirCitas()` solo promueve fragmentos con `es_norma_vigente === true`), no a nivel de *verificar que lo que el modelo efectivamente citó en su respuesta corresponde a lo que estaba en el contexto*. No hay post-validación del output. `ARCHITECTURE_DECISION_REQUIRED`: si Exequátur necesita `MUST = 0` citas inválidas aceptadas (Sección 19 del prompt maestro), esa validación estructural del output del modelo **no existe hoy en MayaLex y tendría que diseñarse — no hay un componente existente que extender**, aunque el patrón de wrapping/delimitado de contexto sí es reutilizable como base.

---

## 5. Autenticación, roles/tiers, pagos

Auth: Supabase Auth directo, sin capa custom. Tiers encontrados en código (strings exactos, no inventados): `'free' | 'pro' | 'academico' | 'admin'` — es una columna `tier` en `subscriptions`/`queries_log`, **no** un rol de Postgres ni un claim de `auth.users`; no existe tabla de "entitlements" separada, se chequea ad hoc en código de aplicación (`lib/rate-limit.ts`). No hay matriz `FREE/CORE/EXCLUSIVO/ADMIN_EDITOR/AUDITOR/NOTARIO_FIRMANTE` como la que pide la Sección 15 del prompt maestro — habría que construirla desde cero, mapeando sobre el patrón de `tier` existente en vez de crear un sistema paralelo.

Pagos: PayPal es la integración viva y bien probada (máquina de estados atómica `paypal_apply_event()`/`paypal_apply_downgrade()`, tests de idempotencia, `ON CONFLICT` correcto). El stack paralelo PixelPay/transferencia bancaria bajo `src/` tiene estatus **de producto, no técnico** sin resolver — no asumir que está muerto sin confirmación explícita del dueño del producto.

**Casi todo el acceso a Supabase server-side pasa por el cliente `service_role`** (bypassa RLS por diseño) — patrón consistente en todo el código, no es un descuido puntual. Cualquier endpoint nuevo de Exequátur que use el mismo patrón hereda ese trust boundary: la autorización real vive en el código de la ruta API, no en RLS. Esto es exactamente lo que la Sección 15 del prompt maestro pide probar con tests negativos — hoy **no existen** ese tipo de pruebas negativas de autorización cruzada en `tests/` (los 19 archivos de test cubren PayPal, auth-callback, RAG-anonimización, SEO — ninguno prueba "user A no puede leer datos de user B" o "tier CORE no puede llamar API EXCLUSIVO").

---

## 6. Tabla Delta Architecture

| Componente | Evidencia actual | Estado | Clasificación | Cambio Exequátur | Riesgo | Dependencias |
|---|---|---|---|---|---|---|
| Next.js App Router (`app/`) | `app/layout.tsx`, `app/page.tsx` | Productivo | REUSE | Nuevas rutas bajo `app/exequatur/*` o similar, namespace propio | Bajo | Ninguna |
| Supabase Auth | `supabase.auth.*` en múltiples rutas | Productivo | REUSE | Ninguno — mismos usuarios | Bajo | Ninguna |
| Tier/entitlement (`tier` column) | `lib/rate-limit.ts`, `lib/supabase.ts` | Productivo, informal | EXTEND | Añadir tiers/roles nuevos (notario, auditor, firmante) sin romper `free/pro/academico/admin` existentes | Medio (falta tabla de entitlements formal) | `subscriptions`, `queries_log` |
| `buscarRAG()` / `buscar_biblioteca_v2` | `lib/rag/search.ts:223`, migración `20260913_add_rpc_buscar_biblioteca_v2.sql` | Productivo, activo (13-sep) | REUSE (como autoridad jurídica, solo lectura) | Exequátur consulta esta capa, nunca la duplica | Medio — depende de que la ingesta activa no rompa el contrato de la RPC | Ingesta Honduras en curso (NO tocar) |
| `biblioteca_vectores` (chunks) | `supabase/vectores.sql:16` | Productivo, en migración activa | DO_NOT_TOUCH (escritura); REUSE (lectura) | Ninguna escritura directa desde Exequátur | Alto si se escribe directo | Pipeline de ingesta paralelo |
| `lib/ingesta-oficial/estados.ts` (V0–V5) | Máquina de estados, 12 tests, desconectada de producción | Diseñado, no conectado | EXTEND | Base natural para el Content Promotion Gate de Exequátur | Bajo (no toca nada vivo) | Ninguna tabla productiva depende de esto hoy |
| `lib/self-learning/schema.sql` (documento→chunk FK) | Tabla `documentos_aprendizaje`/`vectores_conocimiento` | Existe, uso comunitario únicamente | EXTEND (como plantilla de patrón) | Modelo de referencia para identidad canónica de Exequátur | Bajo | Ninguna |
| PayPal state machine | `lib/paypal/`, migraciones `20260717*` | Productivo, probado | REUSE | Ninguno si Exequátur se vende bajo el mismo `subscriptions`/tier | Bajo | — |
| `src/app/api/*/pixelpay/*`, `manual-transfer` | Tracked en git, sin entrypoint confirmado servido | Estatus incierto | DEPRECATION_CANDIDATE (requiere decisión de producto, no técnica) | Ninguno hasta decisión explícita | N/A | — |
| RLS de `subscriptions` | Migración marca "NO EJECUTADA" en su encabezado | Desconocido en producción | DO_NOT_TOUCH sin verificación operativa | Ninguno hasta confirmar estado real | Alto (bloqueador de gobernanza, no de Exequátur en sí) | — |
| Feature flags | No existe sistema | N/A | ADD | Diseñar `EXQ_ENABLED`/`EXQ_COPILOT`/`EXQ_TRIBUNAL` como primer sistema de flags del proyecto (no hay uno que extender) | Bajo | — |
| CI/CD | No existe | N/A | ADD (opcional, fuera de alcance de Fase 0) | — | — | — |
| Middleware de auth | `middleware.ts` es no-op pass-through | Productivo | DO_NOT_TOUCH | Auth se sigue verificando por ruta, igual que hoy | Bajo | — |

---

## 7. Feature flags — propuesta (no implementada)

No existe convención previa que extender (Sección 10 del prompt maestro confirmada: hay que proponer desde cero). Propuesta mínima, consistente con CANON-6 (vertical desacoplable):

- Mecanismo: variables de entorno server-side leídas una sola vez en un módulo `lib/flags.ts` nuevo (mismo patrón ya usado para `RAG_BACKEND`), no un servicio externo — no se justifica traer LaunchDarkly/GrowthBook para un solo feature nuevo.
- Nombres provisionales confirmados como razonables: `EXQ_ENABLED` (kill-switch global), `EXQ_COPILOT`, `EXQ_TRIBUNAL`. Deben poder resolverse en false sin que ninguna ruta de MayaLex existente falle — es decir, ninguna ruta actual debe importar código de Exequátur de forma incondicional.
- No implementar todavía — esto es diseño, la implementación es Fase 1.

---

## 8. Gate de promoción de contenido — diseño, no implementación

Reutilizar `lib/ingesta-oficial/estados.ts` como base conceptual: los estados `INVESTIGACION → BORRADOR → AUDITORIA → CONSOLIDADO → EDICION_FINAL → FIRMADO` de CANON-4 mapean razonablemente sobre V0–V5 ya existente, adaptando roles (`abogado_revisor_senior` → equivalente notarial). El contrato `exq_content_lint` que pide la Sección 20 del prompt maestro **no debe implementarse aún** — solo diseñarse: debe bloquear promoción cuando (a) el contenido citado como autoridad no está `VERIFICADO`, (b) falta referencia normativa obligatoria, (c) una pregunta referencia un nugget inexistente, (d) contenido `DEROGADO` se presenta como vigente, (e) una `VigenciaSheet` expirada se publica como vigente. Como la capa jurídica (`biblioteca_vectores`) no tiene hoy conceptos de vigencia por versión (solo un booleano plano), el gate de Exequátur tendrá que tratar la ausencia de metadata de vigencia como "no verificable" en vez de asumir vigencia por defecto — esto es una decisión de diseño explícita, no un detalle menor.

---

## 9. Secretos — estado, no valores

Reportado solo por nombre de variable, nunca por valor, según `.env.example`/`.env.local.example`:

**CONFIGURED (declaradas en template):** `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `LLM_PROVIDER`, `TAVILY_API_KEY`, `RAG_BACKEND`, `PYTHON_RAG_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `PAYPAL_MODE`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `PAYPAL_PRO_PLAN_ID`, `PAYPAL_ACADEMICO_PLAN_ID`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_DEV_BYPASS_VERIFY`, `NEXT_PUBLIC_APP_URL`, `DEBUG_CLAUDE`, `FREE_TIER_DAILY_LIMIT`, `PRO_TIER_DAILY_LIMIT`.

**MISSING_SECRET (usadas en código, ausentes de ambos templates — brecha de documentación, no confirmación de que falten en el entorno real):**
- `MISSING_SECRET: HF_API_TOKEN` — requerida por `lib/rag/embed.ts` y `lib/self-learning/embed.ts` para el RAG activado el 13-sep. Si Exequátur reutiliza `buscarRAG()`, esta variable es una dependencia dura.
- `MISSING_SECRET: RESEND_API_KEY` — usada en `lib/email/resend.ts`, no documentada en ningún template.

**Nota de higiene (sin reproducir valores):** un agente encontró que `.env.local.example` contiene IDs de plan/webhook de PayPal con forma de valores reales en vez de placeholders obvios. No repito esos valores aquí; recomiendo que el supervisor humano confirme si son de sandbox o de producción antes de asumir que el archivo es seguro para compartir ampliamente.

---

## 10. Lista de decisiones pendientes (no tomadas por mí)

- `ARCHITECTURE_DECISION_REQUIRED: CANONICAL_LEGAL_IDENTITY` — ver Sección 3.
- `ARCHITECTURE_DECISION_REQUIRED: CITATION_OUTPUT_VALIDATION` — construir validación estructural de citas del output del modelo (no existe hoy).
- `ARCHITECTURE_DECISION_REQUIRED: CONTENT_REPO_LOCATION` — ¿contenido pedagógico de Exequátur vive en este mismo repo, en uno separado, o híbrido? Requiere ADR explícito antes de Fase 1 (Sección 21 del prompt maestro).
- `PRODUCTION_RISK_REVIEW_REQUIRED` — confirmar estado real de RLS en `subscriptions` en producción (el repo es inconcluyente).
- `PRODUCTION_RISK_REVIEW_REQUIRED` — confirmar si `organizations`/`pending_orders` existen en la base productiva pese a no tener DDL versionado.
- `PRODUCTION_RISK_REVIEW_REQUIRED` — auditar calidad real de `biblioteca_vectores` para las filas insertadas vía `ingest-to-supabase.ts` (embeddings dummy en ~99% de esas filas, si es que llegó a correr).
- Decisión de producto (no técnica) sobre el destino del stack PixelPay/`src/app/api/v1/billing/*`.
- `LEGAL_REVIEW_REQUIRED` — cómo tratar la ausencia actual de estados de vigencia/derogación granulares al construir el Índice de Preparación y las citas del Tribunal Virtual (CANON-8, CANON-3).

Todo lo anterior requiere `HUMAN_GO` antes de que cualquier migración, feature flag o ruta de Exequátur se active — nada en este documento autoriza activación en producción (CANON-11).

---

## 11. Qué NO se tocó en esta Fase 0

Cero migraciones ejecutadas. Cero escrituras a `biblioteca_vectores` u otra tabla productiva. Cero scripts de ingesta ejecutados (solo leídos). Cero cambios a RLS, triggers, o funciones SQL existentes. Cero secretos impresos o movidos entre repos. La ingesta activa de Honduras no fue interrumpida ni modificada — solo observada.

## 13. Verificación Fase 0-B (extensión de solo lectura, 2026-09-14, post-entrega)

Esta sección se añade sin reescribir las secciones 1-12 para mantener trazabilidad de qué se sabía antes vs. después de verificar contra bases vivas (consultas SQL de solo lectura vía MCP de Supabase, cero escrituras, cero migraciones, cero scripts de ingesta ejecutados).

**Corrección de integridad de la propia auditoría:** la Fase 0 original creó, además de este documento (sin commitear en el repo), dos archivos en el sistema de memoria personal fuera del repo (`project_maya_lex.md`, `project_exequatur_notario.md`) y editó el índice `MEMORY.md` del mismo sistema — ninguno de estos afecta al repo MayaLex. `git status`/`git diff --stat` confirman cero archivos trackeados modificados y cero `UNEXPECTED_CHANGE`.

**Proyectos Supabase identificados:** `maya-lex-ia-pinel-hn` (`thgrhueckkjdutjvcufp`, sin sufijo "staging", creado 2026-06-24 — tratado como producción por convención, `UNVERIFIED_ASSUMPTION` porque `.env.local` tiene `NEXT_PUBLIC_SUPABASE_URL` como placeholder sin resolver, no un valor literal verificable) y `mayalexhn-staging` (`aicakncgtuiiuomflkqj`, creado 2026-07-17).

**`subscriptions` (VERIFIED, consulta en vivo):** RLS **habilitado** (`relrowsecurity=true`) en producción, con policy `service_only_subscriptions` (`ALL`, `qual = auth.role()='service_role'`). Esto **corrige** la Sección 2/10 originales: la migración `20260727000000_enable_rls_subscriptions.sql` dice "NO EJECUTADA" en su propio encabezado, pero el estado real en producción es RLS activo. Conclusión: el encabezado de esa migración es documentación desactualizada, no un reflejo del estado real — no representa un riesgo de producción, representa un riesgo de que el repo mienta sobre su propio estado. No existe en staging.

**`organizations` y `pending_orders` (VERIFIED por ausencia):** no existen en ninguno de los dos proyectos Supabase accesibles. Confirma el schema-drift ya señalado (tipos TypeScript sin DDL correspondiente en ninguna base viva).

**Hallazgo adicional:** `biblioteca_penal` y `conversations` — definidas en `supabase/schema.sql` — **tampoco existen en ninguna de las dos bases**. El SQL que las crea nunca se ejecutó (o fueron eliminadas) en ambos proyectos.

**`hn_normas_verificadas_staging` / `ingestion_audit_log` (VERIFIED, existen solo en staging):** 22 columnas (`norm_id, titulo, tipo, decreto, autoridad, materia, publicacion, entrada_vigor, estado, num_articulo, contenido, fuente, hash, reformas jsonb, derogaciones jsonb, jerarquia, fecha_ingesta, fecha_revision, estado_v, formato_cita, legacy_id, coleccion_legacy_origen`), RLS habilitado, **44 filas reales** de julio 2026 (21 en V2, 20 en V0, 2 en V3 — ambas explícitamente "pendiente_verificación, no verificado contra fuente oficial"). `ingestion_audit_log` existe con RLS pero **0 filas** — el log de auditoría nunca registró una transición. Esto confirma con datos reales, no solo código, que la máquina de estados V0–V5 nunca promovió contenido más allá de V3-con-advertencia.

**Los 22,724 documentos (VERIFIED contra ambas bases vivas):** `biblioteca_vectores` tiene 84,204 filas en producción (`mayalex_instrumentos` 42,378 / `mayalex_normativos` 40,862 / `mayalex_procedimental` 964, fechas 2026-07-14→2026-09-05) y 50 filas en staging (todas `mayalex_normativos`, julio 2026, no relacionadas). **Cero filas con prefijo `HN-`** (huella única de `ingest-to-supabase.ts`) en cualquiera de las dos bases. Cero embeddings dummy exactos detectados; el 100% de las filas de producción tiene norma de vector ≈1.0 (embeddings reales, no defectuosos). Las 84,204 filas de producción coinciden exactamente con las 3 colecciones que migra `seed_vectores.py` desde ChromaDB — ese es el pipeline que realmente pobló producción, no `ingest-to-supabase.ts`. Esto no se infiere solo del JSON vacío (`corpus_honduras_processed.json` con `total:0` tanto en el commit `4ce513e` como en el working tree actual) — se confirma independientemente por ausencia total del identificador `HN-` contra ambas bases vivas. El paso de saneamiento (`sanitize-corpus-contaminated.ts`) opera directamente sobre archivos en disco y pudo haber corrido legítimamente sin tocar ninguna base de datos — son dos afirmaciones distintas que los mensajes de commit mezclan.

**Mapa de pipelines — ver tabla en la respuesta de esta sesión (2026-09-14, extensión de verificación); resumen: `seed_vectores.py` es el único pipeline con evidencia directa de datos en producción; `ingest-to-supabase.ts` tiene 0 evidencia de ejecución exitosa contra cualquier base viva; `ingestar_cpc_base.py` permanece `UNVERIFIED_ASSUMPTION` sobre si sus filas llegaron a producción.**

### Risk Register — actualizado

| Riesgo | Estado previo (Sección 10) | Estado verificado (2026-09-14) |
|---|---|---|
| RLS de `subscriptions` en producción | `PRODUCTION_RISK_REVIEW_REQUIRED` — inconcluyente desde el repo | **RESUELTO**: RLS confirmado activo en producción vía consulta en vivo. Persiste como hallazgo secundario: la migración versionada no refleja el estado real (riesgo de documentación, no de seguridad) |
| Existencia de `organizations`/`pending_orders` en producción | `PRODUCTION_RISK_REVIEW_REQUIRED` | **RESUELTO**: no existen en ninguna base viva accesible. Los tipos TypeScript que las referencian son código muerto o aspiracional |
| Calidad de `biblioteca_vectores` vía `ingest-to-supabase.ts` (embeddings dummy) | Sospecha basada en lectura de código | **RECLASIFICADO — riesgo de integridad de corpus CONTENIDO, no materializado**: el defecto existe en el script pero no ha escrito a ninguna base viva. Recomendación: contención preventiva — no ejecutar `ingest:supabase` contra ninguna base hasta corregir el muestreo de embeddings (actualmente 1/100 real) y añadir `ON CONFLICT`. No se modificó el script en esta auditoría |
| Nuevo — `biblioteca_penal`/`conversations` definidas pero no creadas en ninguna base | No detectado previamente | `ARCHITECTURE_DECISION_REQUIRED`: decidir si esas tablas deben crearse, o si el SQL que las define debe eliminarse por obsoleto |
| Nuevo — identificación de cuál proyecto Supabase es realmente producción | No evaluado | `UNVERIFIED_ASSUMPTION` persiste: `.env.local` no resuelve `NEXT_PUBLIC_SUPABASE_URL` a un valor literal; la identificación de `maya-lex-ia-pinel-hn` como producción se basa en convención de nombre/antigüedad, no en confirmación directa del runtime |

Ninguna de las tres decisiones de arquitectura (identidad canónica, validación de citas, ubicación del contenido pedagógico) fue resuelta en esta extensión — quedan pendientes para revisión conjunta.

## 12. Próximo paso sugerido (para autorización del supervisor, no ejecución automática)

Resolver las tres `ARCHITECTURE_DECISION_REQUIRED` de la Sección 10 (identidad canónica, validación de citas, ubicación del contenido) antes de diseñar el schema físico de tablas `exq_*`. Una vez resueltas, la Fase 1 puede producir: (a) el ADR de identidad canónica, (b) el diseño físico de tablas (sin ejecutar), (c) la matriz de autorización con casos de prueba negativos de la Sección 15, (d) el contrato `exq_content_lint`. Todo eso sigue siendo diseño — la ejecución real de migraciones requiere `HUMAN_GO` explícito.
