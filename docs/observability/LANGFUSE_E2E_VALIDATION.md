# Validación end-to-end de Langfuse — `feat/langfuse-observability`

**Fecha:** 2026-09-27
**Fases:** LF-E2E-1, LF-E2E-1A, incidente de calidad de producto (post-LF-E2E-1A)
**Rama:** `feat/langfuse-observability` — aislada, NO es Retrieval V3, no mergeada a `main`
**PR:** [#53](https://github.com/Lawyer1421/maya-lex-pinel-deploy/pull/53) (abierto)

## 1. Deployment

| | |
|---|---|
| Branch HEAD | `4179a0b9a62b7467bea2a799bf057107b5faff0b` (sin cambios de código en ninguna fase de esta validación) |
| Deployment original (obsoleto) | `dpl_8LTxwk6sCM7EeQ9j4hv7vUss5rqP` — `maya-lex-pinel-deploy-63d5bqxt1-...vercel.app`, creado antes de la reparación del env de Supabase de Retrieval-v3 Fase 1E.3C.4; horneaba un anon key inválido |
| Deployment vigente (LF-E2E-1A) | `dpl_GqX6iF8Ku3qyeeK98KS5vTj77UB6` — `maya-lex-pinel-deploy-25rkaj1y1-...vercel.app`, redeploy explícito (`vercel redeploy ... --target preview`, sin commit nuevo), mismo commit `4179a0b`, `READY` |
| Protección | Vercel SSO activo (`302` a `vercel.com/sso-api`) en todo momento — nunca se debilitó ni se eludió |

## 2. Variables de entorno (Preview únicamente)

| Variable | Estado | Scope |
|---|---|---|
| `LANGFUSE_ENABLED` | PRESENT | `preview` |
| `LANGFUSE_PUBLIC_KEY` | PRESENT | `preview` |
| `LANGFUSE_SECRET_KEY` | PRESENT | `preview` |
| `LANGFUSE_BASE_URL` | PRESENT | `preview` |
| `NEXT_PUBLIC_SUPABASE_URL` | PRESENT, reparado en Retrieval-v3 1E.3C.4 (~18h después del deployment original) | `preview` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | PRESENT, mismo repaso | `preview` |

Ninguna variable de Langfuse existe en `target=production` — confirmado en las tres inspecciones (LF-E2E-1, 1A, y esta). Identidad exacta del proyecto de Langfuse (organización/proyecto): **`UNKNOWN`** — no hay tooling en esta sesión capaz de leer el valor cifrado de las credenciales ni de listar proyectos vía API de Langfuse sin exponer una clave.

**Riesgo de región no descartado:** los fixtures de `tests/langfuse-observability.test.ts` usan `https://cloud.langfuse.com` (host **EU**) en vez de `https://us.cloud.langfuse.com` (host **US**, la región que el fundador confirmó para su organización). Esto es evidencia de código, no del valor real de `LANGFUSE_BASE_URL` en Vercel (cifrado, no legible) — se señala como el primer punto a revisar si una traza no aparece.

## 3. Auditoría de privacidad (código, antes de generar tráfico real)

Confirmado por lectura completa de [lib/observability/langfuse.ts](../../lib/observability/langfuse.ts) y su call site en `app/api/chat/route.ts:441-467`:

- `DatosTrazaConsulta` (la única interfaz que puede llegar a Langfuse) **no tiene ningún campo** capaz de portar pregunta cruda, fragmentos RAG, ni respuesta del modelo — ausencia estructural, no solo "no usado".
- `userHash` es `sha256(identificador + sal).slice(0,32)` ([lib/analytics/logger.ts:28-34](../../lib/analytics/logger.ts)) — irreversible, mismo hash que ya usa el logger de analítica.
- El call site solo pasa: modo, tier, proveedor/modelo, ruta de retrieval, conteos (documentos/citas), booleanos (rerank/websearch), conteos de tokens, y ventanas de tiempo reales.

**`PRIVACY_GATE = PASS`** (confirmado por código, no solo por diseño documentado).

## 4. Fail-open

- `getClient()` atrapa cualquier error de inicialización del SDK y retorna `null` sin lanzar.
- `registrarTrazaConsulta()` nunca lanza — su propio `try/catch` interno solo hace `console.warn`.
- Invocada exclusivamente vía `after()` de Next.js — nunca bloquea ni retrasa la respuesta en streaming.
- Timeout de 4000ms en las solicitudes HTTP del propio SDK de Langfuse (`REQUEST_TIMEOUT_MS`).

**`LANGFUSE_FAIL_OPEN = YES`** — confirmado por código y por 17/17 pruebas en `tests/langfuse-observability.test.ts` (incluye casos donde el SDK lanza en cualquier punto).

## 5. Estructura de spans esperada (código real, nada inventado)

```
TRACE mayalex.query
├── query.classification   (solo si el router de retrieval ejecutó)
├── rag.retrieve            (solo si RAG ejecutó realmente)
├── legal.web_search        (solo si se solicitó búsqueda web)
├── llm.generation          (solo si el LLM se invocó; incluye usage: input/output tokens)
├── citation.validation     (siempre)
└── response.finalize       (siempre; punto instantáneo, no intervalo)
```

Nota explícita del propio código: los sub-pasos internos de RAG (exact-match / semantic / rerank) **no son observables** en esta implementación — decisión deliberada de no instrumentar `lib/rag/search.ts` en esta rama. `rerank_used` y `retrieval_strategy` quedan como metadata del span `rag.retrieve`.

## 6. Tests y typecheck (antes de tráfico real)

- `npm run typecheck`: limpio.
- `npx vitest run tests/langfuse-observability.test.ts`: 17/17.
- `npx vitest run` (suite completa de la rama): 59/59 archivos, 552 passed + 1 skipped.

## 7. Intentos de generar la traza — bloqueadores de tooling encontrados

**Opción A (Preview vía sesión del fundador):** requiere pasar la barrera SSO de Vercel — este agente nunca la elude, por diseño.

**Opción B (ejecución local con env de Preview real) — intentada, resultó inviable:** `vercel env pull` **no puede recuperar ningún valor marcado `type: Secret`** en Vercel — escribe `[SENSITIVE]` como placeholder. Esto bloquea `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL`, `LANGFUSE_ENABLED`, `ANTHROPIC_API_KEY`, `TAVILY_API_KEY` — exactamente las credenciales necesarias para una ejecución local real. El archivo placeholder (`.env.preview-test.local`) fue eliminado inmediatamente sin haber contenido ningún valor real. Esta es una protección de plataforma de Vercel, no una limitación de autorización.

**Resultado:** la única vía viable fue que **el propio fundador** generara la consulta sintética desde su sesión autenticada de Vercel — lo cual hizo.

## 8. La consulta sintética ejecutada

Consulta enviada por el fundador contra el Preview de esta rama (post-refresh, LF-E2E-1A):

> "¿Cuáles son los requisitos para constituir una Sociedad de Responsabilidad Limitada en Honduras?"

Genérica, sin datos personales, sin cliente, sin caso — cumple el criterio de "synthetic, non-sensitive legal query" de la Fase LF-E2E-1.

## 9. Evidencia de la traza — PENDIENTE de metadata del fundador

Este agente no tiene acceso a ninguna API o tooling de Langfuse Cloud en esta sesión (no hay MCP de Langfuse cargado, y no se solicitó ni se debe solicitar una clave de API de Langfuse en el chat). Por lo tanto, los siguientes campos requieren que el fundador los confirme desde **Langfuse → su proyecto → Tracing**, buscando la traza `mayalex.query` alrededor de la hora en que se ejecutó la consulta de la Sección 8:

- `TRACE_RECEIVED` = **PENDIENTE**
- ID de traza (no secreto) y timestamp exacto
- `TRACE_STRUCTURE` = **PENDIENTE** — ¿qué spans de la lista de la Sección 5 aparecen realmente?
- `TRACE_PRIVACY` = **PENDIENTE** — confirmar visualmente que ningún span contiene texto de la pregunta, fragmentos, ni la respuesta (solo metadata)
- Latencia de `rag.retrieve` (si existe)
- Latencia de `legal.web_search` (si existe)
- Latencia de `llm.generation` (si existe)
- `TOKEN_OBSERVABILITY` — ¿el span de generación muestra `input`/`output` tokens?
- `COST_OBSERVABILITY` — ¿Langfuse calculó un costo, o aparece en $0 por falta de mapeo de precios del modelo?
- Etiqueta de entorno visible en la traza (`environment`) — el código fija esto a `VERCEL_ENV` (`preview` en Vercel, automático, sin configuración) o `APP_ENVIRONMENT`/`NODE_ENV` como fallback — debería leerse `preview`, nunca `production`.

Esta sección se actualizará en cuanto se disponga de esa confirmación — no se inventa ningún valor mientras tanto.

## 10. PRODUCT QUALITY INCIDENT — Legacy Retrieval / User-Facing Uncertainty

**No es un hallazgo de Langfuse ni de esta rama de observabilidad** — es un hallazgo sobre el comportamiento del **pipeline de retrieval heredado** (`lib/rag/search.ts`, previo a Retrieval V3), expuesto incidentalmente al generar la traza de prueba. Documentado aquí porque ocurrió durante esta validación, pero **no se toca ningún código de esta rama para corregirlo** — la rama Langfuse queda fuera de alcance para esto, tal como exige la directiva.

**Consulta:** requisitos para constituir una S. de R.L. en Honduras.

**Fallas observadas por el fundador en la respuesta visible:**

1. El contexto recuperado por RAG fue de la **Ley sobre Justicia Constitucional** — completamente ajeno a derecho mercantil/notarial. Contaminación de corpus por rama equivocada.
2. La respuesta comenzó con una advertencia extensa exponiendo el fallo de recuperación al usuario, en vez de ir directo a la respuesta legal.
3. A pesar de la falta de evidencia verificada, el modelo continuó dando información sustantiva mercantil desde su memoria paramétrica — exactamente el patrón `NO EVIDENCE + MODEL MEMORY = AUTHORITATIVE LEGAL ANSWER` que Retrieval V3 (Fase 1D, `RetrievalExecutionState`) fue diseñado para prevenir.
4. Marcadores de incertidumbre repetidos e indiscriminados a lo largo de toda la respuesta ("VERIFICAR TEXTO", "aprox.", "según mi conocimiento", "tradicionalmente...") en vez de incertidumbre localizada a la proposición específica que realmente lo requiere.
5. Estado interno de depuración/retrieval filtrado a una UX que debe ser profesional.

**Por qué esto no ocurre (o ya no debería ocurrir) en Retrieval V3:** la Fase 1D introdujo exactamente la distinción `NO_VERIFIED_EVIDENCE` vs `RETRIEVAL_ERROR` vs `OFFICIAL_FALLBACK_REQUIRED`, con abstención determinista cuando la evidencia es insuficiente (`requiereEvidenciaCorpus`, `MENSAJE_ABSTENCION_CORPUS` en `lib/legal-retrieval/evidence-engine.ts`). Este incidente es una demostración en vivo, con una consulta real, de exactamente el defecto que esa arquitectura fue construida para cerrar — pero en la rama heredada, sin esa protección.

**Principio de producto a aplicar cuando se decida integrar** (documentado aquí, no implementado):

1. Empezar directo con la respuesta legal — nunca con "Advertencia previa...", "El contexto recuperado...", "No encontré..." salvo que una limitación legalmente material lo justifique.
2. Evidence-first: evidencia interna → evidencia oficial (fallback) → abstención. Nunca "sin evidencia + memoria del modelo = respuesta autoritativa".
3. Incertidumbre localizada a la proposición exacta ("Pendiente de verificación puntual: cuantía mínima vigente del capital"), nunca marcadores repetidos genéricos.
4. Cero lenguaje de depuración interno visible al usuario (nombres de estados de retrieval, fallos de enrutamiento de corpus, marcadores de confianza crudos).
5. Estructura profesional: conclusión directa → marco legal aplicable → requisitos → procedimiento → consideraciones notariales/prácticas → fuentes verificadas → punto específico sin resolver (solo si aplica).
6. Tono: redacción jurídica hondureña profesional, seguro donde la evidencia lo respalda, preciso donde hay incertidumbre, sin verbosidad defensiva.

**No se modificó ningún código de `feat/langfuse-observability` ni de `lib/rag/search.ts` para atender esto** — ver Sección 11 para el caso de evaluación preparado (no implementado) para Retrieval V3.

## 11. Recomendación

- Mantener la implementación de Langfuse tal como está — arquitectura fail-open y privacy-first ya verificadas por código y por tests; solo falta la confirmación visual del fundador en la UI de Langfuse (Sección 9) para cerrar la prueba end-to-end por completo.
- El incidente de calidad de producto (Sección 10) es una razón adicional, con evidencia real, para priorizar la integración de Retrieval V3 — no para parchear la rama de observabilidad.
- No mezclar ramas: la implementación de Langfuse y Retrieval V3 siguen siendo cambios independientes; la decisión de integrarlos es posterior y explícita.
