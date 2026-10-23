# CANARY_GO_PACKAGE — primer canary real de OpenAI (PREPARADO, **NO EJECUTADO**)

> **Este documento no activa nada.** Describe el paquete exacto que Fredy tendría que autorizar para `CANARY_GO`. Hoy: `SHADOW_GATEWAY_ENABLED=false`, `SHADOW_BUDGET_USD=0`, `CANARY_CONFIG` en `enabled=false / maxRequests=0 / maxBudgetUsd=0`, manifiesto de procedencia efectivo con 0 entradas, y **no hay `OPENAI_API_KEY` en este trabajo**. Estado del Authorization Pack: `NOT_READY_FOR_FREDY_DECISION` (12/15) — ver `docs/governance/evidence/g6-authorization-pack.md`.

## 1. Alcance (todo debe cumplirse a la vez)
| Restricción | Valor |
|---|---|
| Solicitudes | **5–8 como máximo** (propuesta: 8 = `MAX_SOLICITUDES_PROPUESTAS`) |
| Contenido | solo preguntas **públicas, abstractas**, de la lista blanca del Golden Set, **aprobadas por el CLO** |
| Corpus | solo fragmentos con procedencia fuerte (manifiesto aprobado por el CLO); capa `doc_*` y doctrina excluidas |
| Prohibido | archivos, nombres de clientes, hechos privados, herramienta web, MCP externo, subida de documentos, tools, agents, file search |
| Modelo | **uno solo, verificado**: `gpt-6-luna` (verificación oficial del 2026-10-23; caduca a los 7 días: repetir antes del canary) |
| Solicitud | `store:false`, `reasoning.effort=none`, Structured Outputs **estricto**, citas obligatorias; `store:false` **no es ZDR** (MayaLex no declara ZDR) |
| Presupuesto duro | **≈ 0.05 USD** (`presupuestoRecomendadoUsd(8)` = 0.05; peor caso por consulta 0.0034 USD). Revalidar si cambian las tarifas verificadas |
| Tiempo | `timeoutMs` 8 s con `AbortSignal`; el shadow nunca espera la respuesta HTTP |

## 2. Paradas inmediatas (ya implementadas y ensayadas: `g6-rollback-evidence.json`, 8 disparadores)
Primer incidente de privacidad · primera discrepancia de procedencia · costo inesperado (>2× lo estimado) · fallo de esquema · 2 errores del adaptador (error, timeout o breaker abierto) · parada manual. Tras una parada **no se reanuda**; el estado seguro es el actual.

## 3. Precondiciones y su estado hoy
| # | Precondición | Estado | Responsable |
|---|---|---|---|
| 1 | Verificación oficial de OpenAI vigente (≤ 7 días) | MET (2026-10-23; repetir) | agente |
| 2 | Piloto de procedencia aprobado por el CLO (id canónico, texto exacto almacenado, URL oficial, V4/V5, decisión formal con nombre/fecha) | **NOT MET** (0/2) | CLO |
| 3 | Manifiesto efectivo > 0 (último paso del flujo, solo tras 2) | **NOT MET** (0) | CLO / Fredy |
| 4 | Casos del Golden Set `LEGAL_CLO_APPROVED` para la lista blanca | **NOT MET** (0) | CLO |
| 5 | Certificación serverless: Fluid Compute / `maxDuration` confirmado | **NOT MET** (8/9) | admin de Vercel |
| 6 | Privacidad: envolvente cerrada (0/841 privados aceptados) | MET | agente |
| 7 | Independencia de la respuesta HTTP (15 escenarios idénticos byte a byte) | MET | agente |
| 8 | Rollback ensayado (8 disparadores) y kill switch probado | MET (límite: el kill switch es una constante de código; apagar = revertir y redesplegar) | agente |
| 9 | Costos 1/5/10/100/1,000/10,000 y presupuesto recomendado | MET (`g6-cost-authorization.md`) | agente |
| 10 | Sin datos privados ni escrituras al corpus | MET | agente |

## 4. Qué tendría que autorizar Fredy, EXPLÍCITAMENTE y por separado
1. Cambiar la constante `SHADOW_GATEWAY_ENABLED` a `true` (PR revisado) **solo para** el canary.
2. `SHADOW_BUDGET_USD` y `CANARY_CONFIG.maxBudgetUsd` a ≈ 0.05; `maxRequests` 5–8; `sampleStrategy` = lista blanca con los ids aprobados por el CLO; `allowedManifestEntries` con las entradas aprobadas.
3. Crear el secreto `OPENAI_API_KEY` en Vercel (solo Preview al principio). El agente no lee ni escribe secretos.
4. Encender el entorno (Preview) del canary y su ventana de tiempo.
5. La decisión final `CANARY_GO` (o `CANARY_NO_GO`).

## 5. Cómo se mide el resultado (sin afirmar corrección jurídica)
Por solicitud: estado final del despacho, validación de citas (todas dentro de la evidencia entregada), costo real vs estimado, latencia, y concordancia con la respuesta de producción (que sigue siendo la autoridad). Se compara contra la línea base de `LAUNCH_SCORECARD.md`. El canary **no** promueve nada ni cambia la respuesta HTTP.

## 6. Brecha de ingeniería conocida (no bloquea la autorización, sí la ejecución)
El canary real usaría el **adaptador OpenAI del gateway** (`lib/ai-gateway/shadow/openai-adapter.ts`), que ya existe y está ensayado con adaptadores falsos. El **pipeline de Legal OS** usa hoy un proveedor simulado y **no** tiene un proveedor OpenAI propio (a propósito: Legal OS no importa el gateway). Para que Legal OS ejecute el canary hará falta un proveedor real que implemente `LegalModelProvider` y reutilice las compuertas de privacidad/procedencia del gateway; eso se construirá solo después de una autorización y quedaría detrás del mismo kill switch.

## 7. Qué NO cambia
Pagos, RLS, autenticación, esquema de base de datos, corpus, lógica de validez jurídica y la respuesta HTTP de producción.
