# MayaLex — Diseño de Router de Modelos y Control de Costos (Fase CI-0)

**Naturaleza:** diseño candidato, NO implementado. Cero cambios de código,
cero cambios de modelo, cero cambios de entorno en esta fase.

## 1. Precios de referencia (verificados vía búsqueda, septiembre 2026)

**Anthropic directo** ([fuente](https://www.sentra.app/articles/claude-api-pricing), [fuente](https://www.finout.io/blog/anthropic-api-pricing)):

| Modelo | Input /M | Output /M | Cache hit (~10% input) |
|---|---|---|---|
| Claude Opus 5.5 (lanzado 2026-09-22) | $4 | $20 | ~$0.40/M |
| Claude Opus 5 | $5 | $25 | ~$0.50/M |
| Claude Sonnet 5 | $2 | $10 | ~$0.20/M |
| Claude Haiku 4.5 | $1 | $5 | ~$0.10/M |

**Batch API:** 50% de descuento en ambas direcciones (no aplicable a chat en
vivo, sí a benchmarks/regeneración masiva).

**Hallazgo crítico independiente de cualquier rediseño de router:** el
código actual usa `claude-opus-4-8` y `claude-sonnet-4-6` — **generación
4.x**, no la 5.x actual. Los IDs de modelo vigentes son `claude-opus-5-5`,
`claude-sonnet-5`, `claude-haiku-4-5-20251001` (Haiku 4.5 ya es lo que el
código usa, con alias `claude-haiku-4-5`). **Opus 5.5 ($4/$20) es más
barato que lo que casi con certeza cuesta hoy la generación 4.8 heredada**
(los modelos legacy no bajan de precio, normalmente se congelan o suben en
relación al catálogo activo). Esto es una ganancia potencial **independiente**
de cualquier trabajo de enrutamiento por complejidad — simplemente
actualizar la generación de modelo dentro del mismo tier (Opus→Opus,
Sonnet→Sonnet) ya podría reducir costo sin ningún cambio de arquitectura.
**No implementado — requiere el benchmark dorado (§ ver
`MAYALEX_MODEL_BENCHMARK_PLAN.md`) antes de cualquier cambio real,
conforme a "NO model switch yet".**

**OpenRouter** ([fuente](https://openrouter.ai/deepseek), [fuente](https://betonai.net/openrouter-pricing-2026-complete-guide-to-every-model-tier-and-hidden-cost/)):
los slugs hardcodeados en `config/openrouter_config.ts`
(`deepseek/deepseek-r1`, `deepseek/deepseek-chat-v3-0324`,
`google/gemini-2.0-flash-001`) están **superados** — DeepSeek ya tiene V4.1
Flash (~$0.04-0.15/M input, $0.60-1.20/M output según proveedor/hora) y
Google tiene Gemini 3.8 Flash ($0.75/$3.75/M hasta fin de 2026). **No
copio aquí un slug exacto nuevo como si fuera definitivo** — los
identificadores exactos de OpenRouter deben verificarse en vivo contra
`GET https://openrouter.ai/api/v1/models` antes de escribir cualquier
config, para no hornear un string que ya haya cambiado otra vez para
cuando esto se implemente.

## 2. Router candidato por tiers (diseño, no implementado)

```
TIER FAST   → Haiku 4.5 (ya en uso para sala_ia/sala_penal — correcto, no tocar)
TIER STANDARD → Sonnet 5 (candidato — NO existe hoy en el código, todo lo
                que no es "sala" salta directo a Opus)
TIER DEEP   → Opus 5.5 (reservado para lo que genuinamente lo amerite)
```

**Señales de enrutamiento propuestas** (no implementadas) — la complejidad
debe justificarse por la tarea/evidencia, no por el nombre del modo:

| Señal | Sugiere |
|---|---|
| `retrievalState === 'EXACT_SUCCESS'` + pregunta literal ("¿qué dice el artículo X?") | Posible respuesta determinista sin LLM, o Haiku para solo reformatear |
| `retrievalState === 'SEMANTIC_SUCCESS'`, pregunta directa, sin multi-artículo | TIER STANDARD (Sonnet 5) |
| `retrievalState === 'OFFICIAL_FALLBACK_REQUIRED'` o multi-fuente/multi-artículo | TIER STANDARD o DEEP según cantidad de fuentes a sintetizar |
| `mode === 'escritos_penales'` o `'documento'` (generación larga real) | TIER DEEP — redacción formal larga sí justifica Opus |
| `mode === 'analisis_penal'` con Motor de 10 capas activado (múltiples módulos) | TIER DEEP si el enrutador penal activa >N módulos; TIER STANDARD si activa 1-2 |
| Longitud de la pregunta + ausencia de evidencia (abstención) | Sin LLM — ya optimizado |

**Principio explícito:** `mode='analisis'` (el default) **no debe** mapear
a Opus incondicionalmente — debe mapear a **Sonnet 5 por defecto**, con
escalamiento a Opus solo cuando las señales de la tabla lo justifiquen.
Esto es exactamente lo que la Fase CI-0 pidió diseñar, no implementar.

## 3. Presupuesto de tokens por producto (candidato, sin hornear valores)

| Tier de producto | Contexto/output sugerido | Justificación |
|---|---|---|
| FREE (Explorar) | Output acotado (~1,500-2,000 tokens), sin `thinking` o `thinking` mínimo | 3 consultas/día — el costo por consulta debe ser predecible y bajo |
| ACADÉMICO ($9/mes) | Moderado (~4,000 tokens output, thinking adaptive limitado) | Uso más frecuente, aún no debe subsidiar redacción larga ilimitada |
| PREMIUM ($15/mes) | Mayor (hasta el `max_tokens` actual por modo) | Tier que ya paga por profundidad |
| Redacción de documentos | Quota/presupuesto separado, no compartido con el límite diario de consultas | Un documento largo no debe consumir la misma cuota que una pregunta corta |

**No se fijan valores exactos aquí** — requieren medición real contra el
benchmark dorado antes de convertirse en límites hard-coded, tal como pide
la directiva.

## 4. Prompt caching (diseño, no implementado)

Bloques candidatos a `cache_control: {type: 'ephemeral'}` (estables,
idénticos entre requests del mismo modo):

- `MAYA_LEX_SYSTEM_PROMPT` (analisis, documento)
- `FULL_MAYA_PENAL_PROMPT` = `MAYA_PENAL_SYSTEM_PROMPT` + `MAYA_PENAL_MODULES` (analisis_penal, escritos_penales)
- `SALA_IA_SYSTEM_PROMPT` (sala_ia, sala_penal)
- `ANEXO_GENERACION_DOCUMENTOS` / `ANEXO_ESCRITOS_PENALES` (anexos fijos)

Estos bloques representan ~1,600-2,350 tokens por request (§3 del
documento de unit economics) que hoy se pagan a precio completo en CADA
turno de CADA conversación. Con cache hit (~10% del costo de input), el
ahorro en esta porción específica sería de ~90% — sin tocar RAG ni
historial (que sí cambian por request y no son cacheables de la misma
forma). Implementación real: envolver el bloque de system prompt en el
formato de bloques de contenido de Anthropic con `cache_control`, mismo
prompt exacto byte-a-byte entre requests para maximizar hit rate. **No
implementado en esta fase.**

## 5. Compresión de historial (diseño, no implementado)

Confirmado: `components/ChatInterface.tsx` reenvía el array `messages`
completo sin ventana. Diseño candidato:

1. **Ventana de mensajes recientes**: enviar solo los últimos N turnos
   completos (ej. 6-10 mensajes) en vez de la conversación entera.
2. **Resumen estructurado**: para conversaciones más largas que la
   ventana, mantener un resumen server-side (o client-side) de "hechos
   legales establecidos" + "artículos/evidencia ya citada" en vez de
   reenviar la prosa completa de turnos antiguos.
3. **Referencias de evidencia, no texto repetido**: si un artículo ya se
   citó en un turno anterior, referenciar su ID en vez de reinyectar el
   texto completo de nuevo en el contexto RAG de cada turno subsiguiente.

Ninguna de las tres implementada — requieren decidir dónde vive el estado
(cliente vs. servidor) sin romper el flujo de streaming actual.

## 6. Presupuesto de contexto RAG (diseño, no implementado)

Estado actual confirmado: `buscarRAG(..., limite=5, ...)` para la
colección principal, más `limite=3` adicional en ruta C civil
(procedimental) — hasta 8 fragmentos por request, sin cap explícito de
TOKENS (solo de cantidad de fragmentos). Diseño candidato:

- Presupuesto de tokens explícito para el bloque RAG completo (no solo
  conteo de fragmentos) — truncar o resumir si se excede.
- Deduplicación de fragmentos con alta similitud entre sí antes de
  inyectar (evitar pagar dos veces por el mismo artículo si aparece en
  ambas pasadas RAG+procedimental).
- Metadata (materia, fuente, artículo) fuera del bloque de prompt cuando
  sea posible — mantenerla en la capa de citas (`construirCitas`) en vez
  de duplicarla dentro del texto que ve el modelo.

## 7. Guardrails comerciales (diseño, no implementado)

| Nivel | Control propuesto |
|---|---|
| Por consulta | Techo de costo estimado antes de invocar (rechazar/degradar si el prompt ensamblado ya excede un umbral) |
| Por usuario/día | Ya existe `checkAndIncrementRateLimit` por CONTEO de consultas — falta un techo de COSTO acumulado, no solo de cantidad |
| Por tier/mes | Presupuesto de costo total por tier, no solo cuota de consultas |
| Por modelo | Alertar/bloquear si un modelo específico consume desproporcionadamente el presupuesto |
| Global diario | Kill switch: si el gasto diario total cruza un umbral, degradar automáticamente TIER DEEP→STANDARD para nuevas consultas (nunca cortar el servicio de golpe) |

**Kill switch / degradación elegante:** ante presupuesto excedido, la
respuesta correcta es degradar de modelo (Opus→Sonnet, o desactivar
`thinking`), nunca fallar la consulta ni comprometer el gate de evidencia
fail-closed ya existente — el ahorro de costo nunca debe convertirse en
una respuesta sin respaldo documental.

## 8. Langfuse como observabilidad de costo (diseño, no implementado)

Dimensiones adicionales requeridas por trace (todas metadata, cero
contenido crudo — mismo contrato de privacidad ya vigente en
`lib/observability/langfuse.ts`):

`provider, model, tier, ruta, mode, input_tokens, output_tokens, cost,
latency_ms, retrieval_outcome_state`

La mayoría de estos campos **ya existen** en `DatosTrazaConsulta` — lo que
falta es (a) que el motor de costo calcule `cost` explícitamente en vez de
dejarlo implícito en el `usage` crudo, y (b) dashboards en el propio
Langfuse (no en este repo) para: costo/consulta, costo/tier, costo/modelo,
p50/p95 de latencia, distribución de tokens, frecuencia de fallback
oficial. Esto es configuración de Langfuse Cloud, no código nuevo de
MayaLex — se documenta aquí como requisito, no como tarea de este repo.

## 9. Qué NO se tocó en esta fase

Ningún modelo cambiado. Ninguna variable de entorno tocada. Ningún cambio
de comportamiento de retrieval, evidencia, o fallback oficial. Este
documento es enteramente propositivo.
