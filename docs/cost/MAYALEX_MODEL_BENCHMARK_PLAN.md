# MayaLex — Plan de Benchmark de Modelos y Escenarios de Costo (Fase CI-0)

**Naturaleza:** plan de evaluación, NO ejecutado. Ningún benchmark pagado se
corrió en esta fase — ver §4 "no autorizado todavía".

## 1. Las 25-50 Consultas Doradas de MayaLex — diseño de cobertura

Categorías obligatorias (mínimo 2-3 consultas por categoría, no ejecutadas
todavía como suite real):

| Categoría | Objetivo de la prueba | Ejemplo (no exhaustivo) |
|---|---|---|
| Cita exacta | ¿El modelo respeta el texto exacto sin parafrasear de más? | "Artículo 173 CPP" |
| Mercantil | ¿Evita contaminación de materia, usa evidencia real? | S. de R.L. (el caso ya documentado en `docs/observability/RETRIEVAL_V3_GOLDEN_CASE_SRL_HONDURAS.md`) |
| Civil | Síntesis correcta con múltiples artículos | Contratos, obligaciones |
| Penal | Motor de 10 capas — ¿activa solo lo necesario? | Teoría del delito, prueba |
| Procesal | Plazos, recursos, formas | Apelación, casación |
| Notarial | Requisitos de forma | Escritura pública |
| Laboral | Código del Trabajo | Terminación, prestaciones |
| Tributario | Código Tributario (corpus más delgado — ver gap ya documentado) | Obligaciones fiscales |
| Evidencia insuficiente | ¿Abstiene correctamente sin fallback amplio? | Artículo inexistente (ya probado: Art. 9999 CPP) |
| Fallback oficial | ¿CEDIJ se activa y se reporta solo como metadata? | Caso B/E ya documentados en Fase 1E.4 |
| Redacción | Documento largo, formato correcto | Escrito penal, poder notarial |

Este listado reutiliza casos **ya observados y documentados en esta misma
sesión** (Retrieval V3, Fase 1E.4 y el incidente de calidad de producto) —
no hace falta inventar todo desde cero.

## 2. Dimensiones de evaluación (objetivas, no un "ganador" subjetivo)

Por cada modelo candidato × cada consulta dorada:

| Dimensión | Cómo se mide |
|---|---|
| Adherencia a evidencia | ¿Cita solo lo que está en el contexto RAG/oficial recuperado? |
| Corrección de citación | ¿El número de artículo/instrumento citado existe en el corpus/fuente oficial? |
| Tasa de afirmación no soportada | Conteo de afirmaciones sin respaldo verificable en el contexto |
| Corrección de abstención | ¿Se abstiene cuando debe, responde cuando puede? |
| Latencia | Tiempo total y de generación |
| Tokens | Input/output/thinking por separado |
| Costo | Calculado con el precio real del modelo evaluado |

**Ningún ganador general sin evidencia** — el resultado es una tabla
comparativa por dimensión, no un veredicto único. Un modelo puede ganar en
costo y perder en adherencia a evidencia; la decisión de cuál usar por
tier es del fundador, informada por esta tabla.

## 3. Candidatos a evaluar

**Tier FAST:** Claude Haiku 4.5 (`claude-haiku-4-5-20251001`, ya en uso) —
confirmar si basta también para `analisis` simple con `EXACT_SUCCESS`.

**Tier STANDARD:** Claude Sonnet 5 (`claude-sonnet-5`) — candidato principal
para reemplazar el uso indiscriminado de Opus en `analisis`.

**Tier DEEP:** Claude Opus 5.5 (`claude-opus-5-5`) — candidato para
reemplazar `claude-opus-4-8` incluso dentro del mismo tier (generación más
nueva, más barata: $4/$20 vs. presumiblemente más caro el legacy 4.8).

**Candidatos OpenRouter (bajo costo):** DeepSeek V4.1 Flash y Gemini 3.8
Flash aparecen como las opciones más económicas del mercado actual — los
slugs exactos deben confirmarse en vivo contra la API de OpenRouter antes
de cualquier prueba real, no copiarse de este documento sin verificar.

## 4. Autorización de benchmark

**`BENCHMARK_AUTHORIZED = NO`** — no se ejecutó ningún benchmark pagado en
esta fase, conforme a "Run no paid benchmark yet unless explicitly
authorized." Este documento es el plan a ejecutar cuando se autorice.

## 5. Escenarios de economía del tier gratuito

Usando el costo observado **$0.093865/consulta** (traza real citada) como
baseline, y 3 consultas/día/usuario gratuito — **escenarios, no
pronósticos**:

### Gasto DIARIO / MENSUAL (30 días) al costo actual observado ($0.093865/consulta)

| Usuarios activos | Gasto diario | Gasto 30 días |
|---|---|---|
| 100 | $28.16 | $844.79 |
| 1,000 | $281.60 | $8,447.85 |
| 10,000 | $2,815.95 | $84,478.50 |
| 40,000 | $11,263.80 | $337,914.00 |

### Gasto DIARIO / MENSUAL a costos objetivo por consulta

| Usuarios | @ $0.01/consulta (día / 30d) | @ $0.005/consulta (día / 30d) | @ $0.003/consulta (día / 30d) | @ $0.001/consulta (día / 30d) |
|---|---|---|---|---|
| 100 | $3.00 / $90 | $1.50 / $45 | $0.90 / $27 | $0.30 / $9 |
| 1,000 | $30 / $900 | $15 / $450 | $9 / $270 | $3 / $90 |
| 10,000 | $300 / $9,000 | $150 / $4,500 | $90 / $2,700 | $30 / $900 |
| 40,000 | $1,200 / $36,000 | $600 / $18,000 | $360 / $10,800 | $120 / $3,600 |

**Lectura directa:** al costo actual, 10,000 usuarios activos en el tier
gratuito costarían ~$84,479/mes solo en inferencia — insostenible frente a
$9-15/mes de los tiers pagos, incluso con buena conversión. Llegar a
$0.005-0.01/consulta (reducción de ~10-19x frente al baseline observado)
convierte ese mismo escenario en $4,500-$9,000/mes — la meta de "al menos
un orden de magnitud" de la directiva es exactamente el rango que hace la
economía del tier gratuito viable. Estos son escenarios de modelado, no
proyecciones de usuarios reales.

## 6. Experimento más pequeño y seguro para empezar

**No implica cambiar ningún modelo todavía.** El experimento de menor
riesgo y mayor señal:

1. Habilitar prompt caching (§4 del router design) — cero riesgo de
   evidencia, cero cambio de modelo, reducción medible inmediata en la
   porción de system-prompt de cada request.
2. Medir el ahorro real en Langfuse antes/después.
3. Solo después, con datos reales de (1), autorizar el benchmark dorado
   completo (§1-3 de este documento) para decidir el router de tiers.

Este orden evita apostar por un cambio de modelo antes de agotar la
optimización de mayor certeza y menor riesgo.
