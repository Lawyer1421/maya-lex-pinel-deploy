# G5 — Preparación controlada de un primer canary (OFFLINE)

Estado de partida: `main` en `9c4b348` (PR #86, G4 fusionado). **G5 no activa nada**: `SHADOW_GATEWAY_ENABLED=false`,
`SHADOW_BUDGET_USD=0`, sin API key, sin llamada real a OpenAI, sin SQL/migraciones, sin cambios de Vercel/Supabase,
sin escritura al corpus. La respuesta de producción no cambia: ninguna ruta importa los módulos nuevos.

**Decisión del contrato GO / NO-GO hoy: `NO_GO`** (ver G5-H).

## G5-A — Piloto de manifiesto de procedencia

Flujo offline (`lib/ai-gateway/canary/pilot-manifest.ts`): **candidato → verificación → revisión del CLO → entrada aprobada**.
- `verificarCandidato` lista faltantes y discrepancias contra el fragmento recuperado (id, fuente, artículo, SHA-256 del contenido).
- `registrarRevisionCLO` exige aprobador identificable (una persona; rechaza «Claude», «sistema», etc.), fecha real y URL https del dictamen. No aprueba candidatos incompletos.
- `construirManifiestoEfectivo` incluye SOLO entradas `APPROVED`; todo lo demás queda `PENDING_CLO_APPROVAL` o `REJECTED`, fuera del manifiesto.
- Informe para el CLO: `npx tsx scripts/g5-manifiesto-piloto.ts`.

Candidatos reales (`pilot-candidates.ts`), respaldados solo por la evidencia existente del Golden Set (dictamen CLO 22-oct-2026, issue #78):

| Clave | Instrumento | Gaceta | SHA-256 del PDF | Etapa | Faltan |
|---|---|---|---|---|---|
| `PILOTO-CP-D130-2017-ART-634` | Código Penal D.130-2017, art. 634 | 34,940 | `54f6a412…a132` | `PENDING_CLO_APPROVAL` | id canónico, texto real del artículo (hash), URL oficial, estado V4/V5 |
| `PILOTO-D46-2020-ART-1` | Decreto 46-2020, art. 1 | 35,247 | `60b5b786…bbdb` | `PENDING_CLO_APPROVAL` | ídem |

El dictamen del Golden Set aprueba **casos de prueba**, no entradas del manifiesto; por eso `revisionCLO` es `null` y **no se inventó ninguna aprobación**.
No se rellenó nada que el repositorio no pruebe (URL, id del fragmento, hash de contenido, estado V). Para cerrar el piloto el CLO debe aportar,
por artículo: el id canónico almacenado, el texto exacto aprobado, la URL oficial y su decisión formal. **El manifiesto efectivo sigue vacío (0 entradas).**

## G5-B — Riesgo residual de privacidad

Benchmark adversarial (`tests/privacy/benchmark-adversarial.ts`, 160 casos sintéticos en 13 grupos) con métricas **separadas**
(`npx tsx scripts/g5-privacy-metrics.ts`):

| Métrica | Valor | Denominador |
|---|---|---|
| `requiredRecall` | 100 % | 46 casos exigidos (benchmark G4) |
| `residualMissRate` | **9.38 %** | 15 de 160 adversariales NO detectados |
| `overallMissRate` | **7.28 %** | exigidos + adversariales (15 de 206) |
| `publicFalsePositiveRate` | **5.56 %** | 3 de 54 consultas públicas (incluye las preguntas del Golden Set) |

Lo que sigue pasando (residual real): **nombres en minúscula fuera del diccionario** (12/18) y algunos nombres compuestos en minúscula (3/15), p. ej. «zacarias quiroz».
Un filtro determinista no los elimina. Ojo: el conjunto adversarial lo escribimos nosotros, así que subestima lo que aparecerá con usuarios reales.

Qué se endureció en G5 tras medir: iniciales («J. A. Hernández»), teléfonos fragmentados («9876 - 5432», «9 8 7 6 5 4 3 2»), números mezclados con letras («9 8 siete 6 5 4 3 2», «noventa y ocho 7654»), identificadores judiciales atípicos («rol 2022-0456-PEN», «L-14/22»), placas, y relatos con terceros («mi esposa», «mi vecino»).

Costo de la cautela: los nombres capitalizados raros, extranjeros o con errores los atrapa la etapa E («token capitalizado desconocido»), que **también rechaza preguntas públicas legítimas** (3 falsos positivos, todos de etapa E; la prueba exige que ningún falso positivo venga de las etapas A/B). Es fail-closed: se prefiere perder una consulta a filtrar un nombre.

Los topes (`residualMissRate ≤ 10 %`, `publicFalsePositiveRate ≤ 7 %`) son una línea base de regresión, **no** una aceptación del riesgo: aceptarlo o mitigarlo es decisión de Fredy (condición del contrato G5-H).

## G5-C — Configuración del canary

`lib/ai-gateway/canary/canary-config.ts`: `CANARY_CONFIG` (congelado), `validarCanaryConfig`, `canaryConfigPermiteTrafico` y `crearControlCanary` (condiciones de parada).
Por defecto: `enabled=false`, `maxRequests=0`, `maxBudgetUsd=0`, `allowedManifestEntries=[]`, muestreo `NINGUNA`, todas las paradas activas
(`stopOnFirstPrivacyIncident`, `stopOnFirstProvenanceMismatch`, `stopOnUnexpectedCost` ×2, `stopOnSchemaFailure`, `stopOnAdapterErrorThreshold=1`).
Topes duros: ≤ 50 solicitudes, ≤ 1 USD, ≤ 15 s. El presupuesto efectivo es `min(canary, SHADOW_BUDGET_USD)` = 0 hoy. No lee secretos ni entorno; nada la importa.

## G5-D — Canary dry-run

`npx tsx scripts/g5-dry-run.ts` (módulo `canary/dry-run.ts`). Recorre las mismas compuertas y componentes puros que el dispatcher, en el mismo orden,
con credencial, presupuesto y adaptador **simulados**: privacidad → corpus → procedencia → credencial → breaker → presupuesto → adaptador falso → salida estructurada → validación de citas → métricas → decisión.
Escenarios: `valid`, `no-evidence`, `invalid-provenance`, `pii`, `residual-privacy-risk`, `budget-exhausted`, `malformed-response`, `citation-failure` (parcial) y `citation-failure-total`, `timeout`, `adapter-error`.
Resultado: **todos terminan como se esperaba** (el simulacro es consistente) y la **decisión del canary es NO-GO**. Son dos veredictos distintos y el reporte los muestra por separado.
Nota: en `residual-privacy-risk` el gate deja pasar la pregunta; solo un oráculo del simulacro la detiene. En la vida real nadie lo detectaría: es el riesgo residual.

## G5-E — Verificación previa de OpenAI (sin credenciales)

Registro en `canary/openai-verification.ts` (fuente, fecha, valor, ubicación en el código y estado). **La documentación oficial de OpenAI no fue alcanzable
desde el entorno el 2026-10-23 (DNS)**, así que lo que depende de ella NO está verificado:

| Tema | Estado | Valor / nota | Ubicación en código |
|---|---|---|---|
| `model-availability` | THIRD_PARTY_ONLY | Agregadores listan «GPT-6 Luna»; sin confirmación oficial | `shadow-model-config.ts` |
| `responses-api-syntax` | VERIFIED_LOCAL | Tipos del SDK 7.43.0: `store`, `max_output_tokens`, `text.format json_schema` | `openai-adapter.ts` |
| `structured-outputs` | UNVERIFIED | `strict` existe en el SDK; restricciones del modo estricto sin confirmar | `model-output-schema.ts` |
| `store-false-retention` | UNVERIFIED | Se envía `store:false`; implicaciones de retención sin reconfirmar (no es ZDR) | `openai-adapter.ts` |
| `sdk-version` | VERIFIED_OFFICIAL | npm `latest` = 7.43.0 (instalada y fijada) | `package.json` |
| `node-requirement` | VERIFIED_LOCAL | `engines.node >=22`; `.nvmrc` 22; proyecto Vercel `nodeVersion 24.x` (lectura) | `.nvmrc`, `package.json` |
| `sdk-retries` | VERIFIED_LOCAL | `maxRetries` existe (defecto 2); el adaptador usa 0 | `openai-adapter.ts` |
| `abort-signal` | VERIFIED_LOCAL | `signal?: AbortSignal` en las opciones; se propaga | `openai-adapter.ts`, `dispatcher.ts` |
| `pricing-input` / `-cached-input` / `-output` | THIRD_PARTY_ONLY | 0.10 / 0.01 / 0.50 USD por 1M según terceros; coinciden con la configuración, **no revalidadas en la fuente oficial** | `shadow-model-config.ts` |
| `pricing-batch` | UNVERIFIED | cifras del dictamen CLO 21-oct, sin revalidar; no se usan | `shadow-model-config.ts` |

No se copió ninguna tarifa antigua como verificada. Una persona con acceso a developers.openai.com debe cerrar las entradas pendientes y volver a fecharlas
(la verificación caduca a los 7 días). Mientras tanto la condición `OFFICIAL_API_VERIFICATION_CURRENT` es falsa.

## G5-F — Modelo de ejecución serverless

**Problema:** el despacho shadow es fire-and-forget dentro del manejador; si la función serverless se congela al terminar la respuesta, el trabajo puede cortarse.

| Opción | Fiabilidad | Latencia al usuario | Aislamiento | Costo | Simplicidad | Rollback |
|---|---|---|---|---|---|---|
| **`after()` (Next.js, sobre `waitUntil` en Vercel)** | Buena: extiende la invocación hasta el máximo configurado; corre aunque la respuesta falle | Nula (tras la respuesta) | Buena: errores no llegan a la respuesta | Solo el tiempo extra de la invocación (acotado por el timeout de 5 s) | **Máxima**: ya se usa en esta misma ruta para `logConsulta` | Trivial (quitar el envoltorio o apagar el kill switch) |
| `waitUntil` directo (`@vercel/functions`) | Igual que `after()` | Nula | Igual | Igual | Menor: dependencia extra sin ganancia | Fácil |
| Cola (p. ej. Vercel Queues / QStash) | Alta, con reintentos | Nula | Alta, pero **persiste la pregunta y la evidencia en otro sistema** (más superficie de privacidad) | Servicio extra | Baja | Media |
| Job durable / workflow | Muy alta | Nula | Alta | Mayor | Baja | Media |
| Worker en segundo plano | Alta | Nula | Alta | Infra propia | Muy baja | Difícil |

**Recomendación: `after()`.** Para un shadow de *mejor esfuerzo* (sin reintentos, sin efectos de negocio) la fiabilidad extra de una cola no compensa
la superficie de privacidad ni la complejidad. Condiciones: (1) el timeout del shadow (5 s) debe seguir por debajo del máximo de la función; hoy la ruta no declara
`maxDuration`, y el valor por defecto depende del plan de Vercel: **verificarlo antes de activar**; (2) el despacho debe seguir tragándose todo error; (3) la respuesta
no puede esperar ni depender del shadow.
Fuente consultada: documentación de `after` incluida en el paquete instalado (Next 16.2.6, `node_modules/next/dist/docs/.../after.md`): corre durante la duración máxima
de la ruta, también si la respuesta falla, y en Vercel se apoya en `waitUntil`. La documentación en línea de Vercel no fue alcanzable (DNS).
**Implementado pero NO conectado:** `lib/ai-gateway/shadow/despacho-diferido.ts` (`programarShadowDiferido(params, after)`), que recibe `after` por parámetro. Una prueba garantiza que `app/api/chat/route.ts` no lo importa.
Conectarlo es un cambio de una línea en la ruta que requiere autorización expresa.

## G5-G — Costo y latencia (simulación)

`npx tsx scripts/g5-cost-latency.ts`. Costo con las tarifas centrales (`estimarCostoUsd`); presupuesto real intacto (0). Semilla fija.
Supuestos (no mediciones): 1–5 fragmentos por consulta (mediana 900 caracteres), salida mediana 150 tokens, adaptador mediana 1.4 s / p95 4 s.

| | media | p50 | p95 | p99 | peor caso |
|---|---|---|---|---|---|
| USD por consulta | 0.000226 | 0.000219 | 0.000356 | 0.000439 | 0.001157 |

| Consultas | Esperado | Simulado | Peor caso |
|---|---|---|---|
| 100 | 0.0226 USD | 0.0220 USD | 0.1157 USD |
| 1,000 | 0.2264 USD | 0.2309 USD | 1.1567 USD |
| 10,000 | 2.2644 USD | 2.2589 USD | 11.567 USD |

Latencia (ms): las etapas locales son **medidas** y despreciables (privacidad p50 ≈ 0.02, procedencia ≈ 0.003, evidencia ≈ 0.002, validación ≈ 0.01);
el adaptador (supuesto) domina: total shadow p50 ≈ 1,385, p95 ≈ 3,943, p99 ≈ 6,030; ≈ 2 % de las llamadas excederían el timeout de 5 s (supuesto). La recuperación (≈ 250 ms, supuesto) es de producción y no suma al shadow.

## G5-H — Contrato GO / NO-GO

`canary/go-no-go.ts`: el canary solo puede correr si **las 11 condiciones** son verdaderas **y cada una trae evidencia**; un booleano sin evidencia no cuenta.
`FREDY_AUTHORIZATION`, `CLO_PROVENANCE_PILOT_APPROVED`, `PRIVACY_RESIDUAL_RISK_ACCEPTED_OR_MITIGATED`, `OFFICIAL_API_VERIFICATION_CURRENT`,
`BUDGET_GT_ZERO_EXPLICITLY_AUTHORIZED`, `KILL_SWITCH_EXPLICITLY_AUTHORIZED`, `PRODUCTION_RESPONSE_INDEPENDENT`, `NO_PRIVATE_DATA`, `NO_CORPUS_WRITES`,
`NO_MODEL_AUTHORITY_OVER_LEGAL_VALIDITY`, `ROLLBACK_TESTED`.

`estado-actual.ts` deriva solo lo que el código puede comprobar (presupuesto, kill switch, manifiesto, verificación) y deja lo humano en «no cumplido» sin evidencia.
**Resultado actual: NO_GO, las 11 condiciones sin cumplir.** Las condiciones técnicas (independencia de producción, sin datos privados, sin escrituras al corpus, sin autoridad del modelo)
tienen pruebas en el repositorio, pero deben certificarse con evidencia (enlace a la corrida) en el momento de pedir la activación.

## Bloqueos restantes para un canary
1. Piloto: el CLO debe aportar id canónico, texto exacto, URL oficial y decisión formal de cada artículo (manifiesto vacío).
2. Fredy debe aceptar o exigir mitigación del riesgo residual de privacidad (≈ 9 % de adversariales; nombres en minúscula fuera del diccionario).
3. Verificar contra la documentación oficial de OpenAI: disponibilidad del modelo, Structured Outputs estricto, retención de `store:false`, y las tarifas (entrada, caché, salida).
4. Confirmar el `maxDuration` efectivo de la ruta en Vercel y decidir si se conecta `after()`.
5. Cambios de código revisados de kill switch y presupuesto (hoy `false` y 0), con autorización expresa de Fredy.
6. Probar el rollback y certificar con evidencia las condiciones técnicas del contrato.
