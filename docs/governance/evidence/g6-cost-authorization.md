# Paquete de costos para la autorización del primer canary — G6-H

> Generado por `npx tsx scripts/g6-cost-authorization.ts`. Tarifas oficiales revalidadas el 2026-10-23 (fuente: https://developers.openai.com/api/docs/models/gpt-6-luna). El presupuesto real sigue en 0.
> Supuestos (no mediciones): 1–5 fragmentos por consulta, salida mediana 150 tokens; se reemplazan con datos reales del canary.

## Peor caso por consulta (tope duro del código)

Entrada máxima 24,000 tokens + salida máxima 800 tokens, a tarifa de escritura de caché: **0.003400 USD**. Una solicitud mayor no se despacha (el umbral de contexto largo, 272,000 tokens, queda muy lejos).

## Base nominal (tarifa estándar de entrada)

Base NOMINAL, sin aciertos de caché (consultas únicas)

| Consultas | Esperado | p95 | p99 | Peor caso (tope del guard) |
|---:|---:|---:|---:|---:|
| 1 | 0.000225 | 0.000357 | 0.000435 | 0.003400 |
| 5 | 0.001127 | 0.001406 | 0.001540 | 0.017000 |
| 10 | 0.002255 | 0.002651 | 0.002833 | 0.034000 |
| 100 | 0.022546 | 0.023747 | 0.024245 | 0.340000 |
| 1,000 | 0.225461 | 0.229259 | 0.230832 | 3.400000 |
| 10,000 | 2.254607 | 2.266618 | 2.271594 | 34.000000 |

Desglose del esperado (USD):

| Consultas | Entrada sin caché | Entrada en caché | Escritura de caché | Salida | Total |
|---:|---:|---:|---:|---:|---:|
| 1 | 0.000138 | 0.000000 | 0.000000 | 0.000088 | 0.000225 |
| 5 | 0.000690 | 0.000000 | 0.000000 | 0.000438 | 0.001127 |
| 10 | 0.001379 | 0.000000 | 0.000000 | 0.000875 | 0.002255 |
| 100 | 0.013793 | 0.000000 | 0.000000 | 0.008753 | 0.022546 |
| 1,000 | 0.137927 | 0.000000 | 0.000000 | 0.087534 | 0.225461 |
| 10,000 | 1.379267 | 0.000000 | 0.000000 | 0.875340 | 2.254607 |

## Base conservadora (la del guard de presupuesto: escritura de caché 1.25× cuando la entrada es elegible)

Base CONSERVADORA, sin aciertos de caché (consultas únicas)

| Consultas | Esperado | p95 | p99 | Peor caso (tope del guard) |
|---:|---:|---:|---:|---:|
| 1 | 0.000254 | 0.000404 | 0.000486 | 0.003400 |
| 5 | 0.001270 | 0.001601 | 0.001746 | 0.017000 |
| 10 | 0.002541 | 0.003011 | 0.003224 | 0.034000 |
| 100 | 0.025407 | 0.026851 | 0.027449 | 0.340000 |
| 1,000 | 0.254073 | 0.258638 | 0.260530 | 3.400000 |
| 10,000 | 2.540726 | 2.555164 | 2.561145 | 34.000000 |

Desglose del esperado (USD):

| Consultas | Entrada sin caché | Entrada en caché | Escritura de caché | Salida | Total |
|---:|---:|---:|---:|---:|---:|
| 1 | 0.000023 | 0.000000 | 0.000143 | 0.000088 | 0.000254 |
| 5 | 0.000117 | 0.000000 | 0.000715 | 0.000438 | 0.001270 |
| 10 | 0.000235 | 0.000000 | 0.001431 | 0.000875 | 0.002541 |
| 100 | 0.002348 | 0.000000 | 0.014306 | 0.008753 | 0.025407 |
| 1,000 | 0.023479 | 0.000000 | 0.143060 | 0.087534 | 0.254073 |
| 10,000 | 0.234789 | 0.000000 | 1.430597 | 0.875340 | 2.540726 |

## Referencia: base conservadora con la mitad de la entrada servida desde caché

Base CONSERVADORA, 50 % de la entrada servida desde caché

| Consultas | Esperado | p95 | p99 | Peor caso (tope del guard) |
|---:|---:|---:|---:|---:|
| 1 | 0.000166 | 0.000284 | 0.000370 | 0.003400 |
| 5 | 0.000832 | 0.001079 | 0.001206 | 0.017000 |
| 10 | 0.001664 | 0.002008 | 0.002175 | 0.034000 |
| 100 | 0.016644 | 0.017673 | 0.018100 | 0.340000 |
| 1,000 | 0.166445 | 0.169698 | 0.171046 | 3.400000 |
| 10,000 | 1.664447 | 1.674736 | 1.678999 | 34.000000 |

Desglose del esperado (USD):

| Consultas | Entrada sin caché | Entrada en caché | Escritura de caché | Salida | Total |
|---:|---:|---:|---:|---:|---:|
| 1 | 0.000057 | 0.000007 | 0.000015 | 0.000088 | 0.000166 |
| 5 | 0.000284 | 0.000034 | 0.000076 | 0.000438 | 0.000832 |
| 10 | 0.000569 | 0.000069 | 0.000151 | 0.000875 | 0.001664 |
| 100 | 0.005687 | 0.000689 | 0.001514 | 0.008753 | 0.016644 |
| 1,000 | 0.056875 | 0.006894 | 0.015142 | 0.087534 | 0.166445 |
| 10,000 | 0.568746 | 0.068938 | 0.151423 | 0.875340 | 1.664447 |

## Presupuesto duro recomendado para el primer canary

- 5 solicitudes: peor caso 0.017000 USD → presupuesto duro recomendado **0.03 USD** (1.5× el peor caso, redondeado al centavo).
- 10 solicitudes: peor caso 0.034000 USD → presupuesto duro recomendado **0.06 USD** (1.5× el peor caso, redondeado al centavo).

**Es una recomendación.** `SHADOW_BUDGET_USD` y `maxBudgetUsd` siguen en 0; subirlos exige autorización expresa de Fredy y un cambio de código revisado.
