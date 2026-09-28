# MayaLex — Unit Economics de IA (Fase CI-0)

**Fecha:** 2026-09-27/28 (trabajo nocturno, para revisión en la mañana)
**Naturaleza:** auditoría de código + diseño. **Cero cambios de comportamiento,
cero cambios de Production, cero cambios de modelo, cero cambios de env.**
Todo lo que sigue está verificado leyendo el código real, no asumido.

## 1. Por qué las consultas ordinarias llegan a Opus — causa raíz confirmada

`lib/system-prompt.ts` — `CLAUDE_CONFIG`/`CLAUDE_CONFIG_PENAL` — es un mapeo
**plano modo→modelo**, sin ninguna señal de complejidad real:

| mode | modelo | max_tokens | thinking | uso típico |
|---|---|---|---|---|
| `sala_ia` | `claude-haiku-4-5` | 800 | — | chat general, sin RAG |
| `sala_penal` | `claude-haiku-4-5` | 600 | — | chat penal rápido |
| **`analisis`** (default) | **`claude-opus-4-8`** | 4000 | `adaptive` | **modo por defecto de toda consulta legal civil/mercantil** |
| `documento` | `claude-opus-4-8` | 8000 | `adaptive` | generación de documentos |
| `analisis_penal` | `claude-opus-4-8` | 6000 | `adaptive` | análisis penal |
| `escritos_penales` | `claude-opus-4-8` | 10000 | `adaptive` | redacción de escritos |

**Hallazgo central:** `mode='analisis'` es literalmente el valor por defecto del
parámetro (`app/api/chat/route.ts`: `const { messages, mode = 'analisis', ... }
= body`). Es decir, **toda consulta legal que no sea chat casual (`sala_ia`)
cae en Opus incondicionalmente**, sin importar si la pregunta es trivial
("¿qué es una S. de R.L.?") o genuinamente compleja (un dictamen
multi-fuente). No existe ninguna señal de enrutamiento por dificultad,
longitud de contexto recuperado, o resultado de retrieval (`EXACT_SUCCESS`
vs `OFFICIAL_FALLBACK_REQUIRED` vs abstención) que hoy influya en la
elección de modelo. Esto es exactamente lo que la Fase CI-0 pedía confirmar.

**Agravante — `thinking: adaptive` está activo en las 4 rutas de Opus, sin
condición.** El "extended thinking" de Anthropic factura sus propios tokens
de razonamiento como parte del output — con un modo `adaptive` sin cap
explícito, el modelo decide cuánto "pensar" en cada respuesta,
independientemente de si la pregunta lo amerita.

## 2. Exposición máxima de tokens (por modo)

`max_tokens` es el TECHO de salida, no lo que necesariamente se genera, pero
define el peor caso posible: **10,000 en `escritos_penales`, 8,000 en
`documento`, 6,000 en `analisis_penal`, 4,000 en `analisis`**. Combinado con
`thinking: adaptive` (tokens de razonamiento adicionales, no acotados por
un presupuesto explícito), el techo real de tokens de salida es más alto
que `max_tokens` en sí.

## 3. Fuentes de tokens del prompt (medido, no estimado)

Tamaño real de cada bloque de `lib/system-prompt.ts` (caracteres → estimado
~4 car./token para español):

| Bloque | Caracteres | Tokens (est.) | Se usa en |
|---|---|---|---|
| `MAYA_LEX_SYSTEM_PROMPT` | 6,545 | ~1,636 | `analisis`, `documento` |
| `MAYA_PENAL_SYSTEM_PROMPT` | 3,071 | ~767 | `analisis_penal`, `escritos_penales` |
| `MAYA_PENAL_MODULES` | 4,005 | ~1,001 | `analisis_penal`, `escritos_penales` |
| `ANEXO_GENERACION_DOCUMENTOS` | 2,005 | ~501 | `documento` |
| `ANEXO_ESCRITOS_PENALES` | 2,328 | ~582 | `escritos_penales` |
| `SALA_IA_SYSTEM_PROMPT` | 2,336 | ~584 | `sala_ia`, `sala_penal` |

System prompt por modo: `analisis`≈1,636 · `documento`≈2,137 ·
`analisis_penal`≈1,768 · `escritos_penales`≈2,350 tokens. Esto es real pero
**no explica por sí solo** los 7,749 tokens de la traza observada — el
resto viene de: historial de conversación completo (ver §4), contexto RAG
(hasta 8 fragmentos en ruta civil C), contexto web (si aplica), y el output
del modelo (potencialmente varios miles de tokens con `max_tokens` hasta
10,000 + thinking adaptive). No se pudo obtener el desglose exacto
input/output de la traza citada porque el prompt original solo dio el
total (7,749) — Langfuse sí captura `usage: {input, output}` por
`llm.generation` (`lib/observability/langfuse.ts`), así que ese desglose
**ya existe y es recuperable** en el propio dashboard de Langfuse.

## 4. Riesgo de historial de conversación — confirmado, sin mitigar

`components/ChatInterface.tsx:178-181`:
```ts
const history = [
  ...messages.map((m) => ({ role: m.role, content: m.content })),
  { role: 'user', content: apiContent },
];
```
**Se reenvía el historial COMPLETO de la conversación en cada turno, sin
ventana, sin resumen, sin límite.** El turno N de una conversación paga por
el contenido de los N-1 turnos anteriores íntegros, cada vez. Este es un
patrón de costo O(N²) acumulado a lo largo de una conversación larga —
confirmado por código, no una hipótesis.

## 5. Prompt caching — NO habilitado

Búsqueda exhaustiva de `cache_control`/`ephemeral` en todo el código: **cero
resultados**. Anthropic's prompt caching (que da ~90% de descuento en los
tokens de prefijo cacheado dentro de la ventana TTL) **no se usa en
absoluto**, a pesar de que los system prompts (§3) son idénticos byte-a-byte
en cada request del mismo modo. Esta es la optimización de menor riesgo y
mayor retorno inmediato disponible — ver `MAYALEX_MODEL_ROUTER_DESIGN.md`.

## 6. OpenRouter — código muerto, no activo

`config/openrouter_config.ts` y `lib/openrouter/client.ts` existen y
compilan, pero `PROVEEDOR_LLM = process.env.LLM_PROVIDER ?? 'anthropic'` —
sin `LLM_PROVIDER=openrouter` configurado en ningún entorno (confirmado:
nunca apareció en ninguna auditoría de variables de Vercel de esta sesión),
esta rama de código **nunca se ejecuta en producción real**. Los modelos
que configura (`deepseek/deepseek-r1`, `deepseek/deepseek-chat-v3-0324`,
`google/gemini-2.0-flash-001`) son candidatos de bajo costo ya
identificados por una sesión anterior, pero no wireados activamente hoy —
ver la matriz de candidatos en `MAYALEX_MODEL_ROUTER_DESIGN.md`.

## 7. Oportunidades de respuesta sin LLM (zero-LLM)

Ya existen en el código caminos que **no requieren generación de LLM**,
pero hoy todos terminan igual invocando al modelo salvo estos:

- **Abstención estricta por falta de evidencia** (`evidenciaInsuficiente`,
  `MENSAJE_ABSTENCION_CORPUS`) — YA es determinista, sin LLM. ✅ ya
  optimizado.
- **Fallback oficial con solo metadata** (`construirMensajeFallbackOficial`)
  — YA es determinista, sin LLM. ✅ ya optimizado.
- **Errores de configuración/retrieval** (`MENSAJE_CONFIGURACION_NO_DISPONIBLE`,
  `MENSAJE_RETRIEVAL_ERROR`) — YA determinista. ✅ ya optimizado.
- **Aclaración de ruta ambigua** (`ruta==='D'`, `MENSAJE_ACLARACION`) — YA
  determinista, sin LLM. ✅ ya optimizado.
- **Rate limit excedido** — ya devuelve JSON de error sin invocar el modelo.
  ✅ ya optimizado.
- **NO existe todavía:** lookup determinista de artículo exacto cuando
  `EXACT_SUCCESS` ya trajo el texto completo y verbatim del artículo — hoy
  ese caso SIGUE invocando a Opus para "redactar" una respuesta a partir de
  evidencia que ya es 100% el texto legal exacto. Esto es candidato real a
  saltarse el LLM por completo (o degradar a Haiku) cuando la pregunta es
  literalmente "¿qué dice el artículo X?" y el resolver exacto ya trajo el
  texto completo — no hay síntesis real que hacer.

## 8. Recomendación de secuencia (no implementada)

1. **Prompt caching** (más seguro, mayor retorno, cero riesgo de evidencia) — Sección 8 del router design.
2. **Ventana de historial** (segunda mayor fuente de costo confirmada, cero riesgo legal).
3. **Router de complejidad real** (reemplazar el mapeo plano modo→Opus) — mayor impacto pero requiere el benchmark dorado antes de tocar nada.
4. Zero-LLM para `EXACT_SUCCESS` con pregunta literal de "qué dice el artículo".

Nada de esto se implementó en esta fase — ver `MAYALEX_MODEL_ROUTER_DESIGN.md`
para el diseño propuesto y `MAYALEX_MODEL_BENCHMARK_PLAN.md` para cómo
validarlo antes de tocar producción.
