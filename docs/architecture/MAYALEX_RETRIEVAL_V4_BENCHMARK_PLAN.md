# MayaLex — Retrieval V4: plan de benchmark

- **Base:** `origin/main` = `c3847d9297b63dc8b45b700ec7fd82d471f0171f`
- **Fecha:** 2026-10-09
- **Estado:** plan. No se ejecutó ninguna consulta, ninguna llamada a modelo ni ningún gasto.
- **Ganador:** no se declara. Ningún resultado existe todavía.

---

## 1. Principios

1. **Preguntas sintéticas o anonimizadas.** Sin narrativas reales de clientes ni expedientes.
2. **Evidencia congelada.** Para cada consulta se recupera la evidencia **una vez**. El paquete congelado se guarda con hash y se entrega idéntico a todas las variantes.
3. **Respuestas esperadas validadas por una persona antes de medir.** El orden de referencia no puede depender del sistema que se evalúa.
4. **Sin ganador antes de tener resultados.** El informe final describe, no recomienda, salvo que los criterios de la sección 6 se cumplan.
5. **Presupuesto explícito.** Ninguna llamada pagada sin autorización previa, con tope en tokens, intentos y gasto, según el protocolo de `feat/model-evaluation-local`.

---

## 2. Conjunto de consultas

24 consultas, 10 categorías. Las respuestas esperadas están pendientes de validación (`PENDIENTE_VALIDACION`). Los números de artículo se marcan `[VERIFICAR]` hasta que el registro CLO o una fuente oficial los confirme.

| ID | Categoría | Consulta sintética | Respuesta esperada | Estado |
|---|---|---|---|---|
| EX-01 | Búsqueda exacta de artículo | ¿Qué dice el artículo [VERIFICAR] del Código Procesal Penal? | Texto del artículo, instrumento correcto | PENDIENTE_VALIDACION |
| EX-02 | Búsqueda exacta de artículo | ¿Qué establece el artículo [VERIFICAR] del Código Procesal Civil? | Texto del artículo, instrumento correcto | PENDIENTE_VALIDACION |
| MA-01 | Interpretación multi-artículo | ¿Cómo se relacionan los artículos [VERIFICAR] y [VERIFICAR] en [instrumento]? | Dos artículos citados, relación explicada solo si consta en el texto | PENDIENTE_VALIDACION |
| MA-02 | Interpretación multi-artículo | ¿Qué requisitos combinados exige [procedimiento] según el instrumento? | Lista citada, sin requisitos inventados | PENDIENTE_VALIDACION |
| RM-01 | Remisiones | ¿Qué implica el artículo [VERIFICAR] que remite a otro artículo? | Artículo remitido recuperado o abstención por insuficiencia | PENDIENTE_VALIDACION |
| RM-02 | Remisiones | ¿Qué ocurre cuando un reglamento remite a su código? | Ambos textos o abstención | PENDIENTE_VALIDACION |
| EXC-01 | Excepciones | ¿Cuál es la regla y cuál la excepción en [institución]? | Regla y excepción en la misma respuesta, cada una citada | PENDIENTE_VALIDACION |
| EXC-02 | Excepciones | ¿Hay un plazo general y una excepción para [acto]? | Ambas citadas | PENDIENTE_VALIDACION |
| JER-01 | Conflicto de jerarquía | ¿Prevalece la ley ordinaria o el reglamento en [materia]? | Jerarquía del corpus o abstención | PENDIENTE_VALIDACION |
| JER-02 | Conflicto de jerarquía | ¿Qué norma prevalece entre dos textos con igual rango? | Abstención explícita | PENDIENTE_VALIDACION |
| NOT-01 | Procedimiento notarial | ¿Qué requisitos formales exige [acto notarial] en Honduras? | Requisitos citados del Código del Notariado vigente | PENDIENTE_VALIDACION |
| NOT-02 | Procedimiento notarial | ¿Qué plazo tiene [trámite notarial]? | Plazo citado o abstención | PENDIENTE_VALIDACION |
| INC-01 | Evidencia incompleta | ¿Cuál es el plazo de prescripción de [delito inexistente en el corpus]? | Abstención | PENDIENTE_VALIDACION |
| INC-02 | Evidencia incompleta | ¿Qué dice el texto oficial de [norma sin texto en el corpus]? | Abstención con motivo | PENDIENTE_VALIDACION |
| FA-01 | Artículo falso | ¿Qué establece el artículo [número inexistente] del [instrumento]? | Abstención; no se inventa texto | PENDIENTE_VALIDACION |
| FA-02 | Artículo falso | Cita el artículo [número inexistente] sobre [materia] | Abstención | PENDIENTE_VALIDACION |
| AMB-01 | Norma ambigua | ¿Qué dice el artículo [VERIFICAR] sin indicar el código? (número presente en dos instrumentos) | Abstención o pregunta de aclaración | PENDIENTE_VALIDACION |
| AMB-02 | Norma ambigua | ¿Qué establece la norma sobre [materia] de forma general? | Lista acotada o aclaración | PENDIENTE_VALIDACION |
| CI-01 | Relación entre instrumentos | ¿Cómo interactúa el Código de Comercio con [instrumento]? | Abstención si Comercio no está verificado | PENDIENTE_VALIDACION |
| CI-02 | Relación entre instrumentos | ¿Qué instrumento regula [acto] cuando hay dos posibles? | Ambos o aclaración | PENDIENTE_VALIDACION |
| CI-03 | Relación entre instrumentos | ¿Qué reformas afectan [artículo] de [instrumento]? | Reformas verificadas o abstención | PENDIENTE_VALIDACION |
| DUP-01 | Duplicado espejo | ¿Qué dice el artículo [VERIFICAR] del procedimiento civil? (texto presente en dos fuentes) | Un solo texto citado, sin duplicado | PENDIENTE_VALIDACION |
| DUP-02 | Duplicado espejo | Texto del artículo [VERIFICAR] de la base CPC | Fuente identificada; sin mezcla de versiones | PENDIENTE_VALIDACION |
| MIX-01 | Mixto | Consulta con artículo exacto y concepto general | Exacto citado + concepto con soporte | PENDIENTE_VALIDACION |

**Nota sobre categorías no cubiertas por el registro:** Comercio (CI-01) está `ABSENT_VERIFIED`; LOAT, E2, E5 y E6 pendientes. Las consultas que dependen de esos materiales deben producir abstención. Si producen respuesta, es un fallo.

---

## 3. Procedimiento

1. **Congelar corpus.** Registrar: commit de `main`, fecha, y hash del conjunto de filas usado. Sin escritura en la base.
2. **Recuperar evidencia una vez por consulta.** Con la variante A (recuperación actual). Guardar: IDs de fragmentos, contenido, `hash`, ruta usada (exacta/semántica/abstención).
3. **Congelar paquete.** Serializar el paquete con hash SHA-256. No se recalcula.
4. **Ejecutar variantes sobre el paquete congelado:**
   - A: recuperación actual + LLM actual.
   - B: recuperación híbrida (shadow) + LLM actual.
   - C: recuperación híbrida + contexto largo (sólo laboratorio, sección 5 del blueprint).
5. **Medir** según la sección 4.
6. **Registrar** respuestas completas, errores y fallos. No descartar casos.

---

## 4. Métricas

| Métrica | Definición | Cómo se mide |
|---|---|---|
| Instrumento correcto | El instrumento citado coincide con el esperado | Comparación con respuesta validada |
| Artículo correcto | El artículo citado coincide con el esperado | Comparación con respuesta validada |
| Precisión de cita | Las citas apuntan a texto que contiene la afirmación | Revisión humana por muestra |
| Afirmaciones sin soporte | Afirmaciones jurídicas sin cita verificable | Revisión humana, contador por respuesta |
| Abstención correcta | En consultas de tipo INC/FA/AMB, la respuesta se abstiene | Clasificación humana |
| Latencia | Tiempo total de recuperación | Medido en la fase de recuperación, sin el LLM |
| TTFT | Tiempo hasta primer token del LLM | Medido en el LLM |
| Tokens totales | Entrada + salida | Según respuesta del proveedor |
| Costo | Según tarifa verificada al momento de ejecutar | Calculado; no estimado de memoria |
| Utilidad del resultado | Escala 1–5 por revisor, con criterio escrito antes de evaluar | Revisión humana, doble ciego si es posible |

**Regla de costo:** ninguna tarifa se toma de este documento. Se verifica en la fuente oficial del proveedor en el momento de ejecutar.

---

## 5. Tamaño muestral y límites

- 24 consultas. Con esa cantidad, una diferencia de una o dos respuestas no es significativa.
- Se reporta el número exacto de casos por categoría, no porcentajes sin denominador.
- Los resultados por categoría son exploratorios. No sustentan una conclusión general.

---

## 6. Criterios para decidir (no para declarar ganador)

Una variante puede pasar a shadow si, sobre el mismo paquete congelado:

- No empeora la instrumento correcto ni el artículo correcto en ninguna categoría.
- No aumenta las afirmaciones sin soporte.
- Mantiene o mejora la abstención en las categorías INC, FA y AMB.
- Su latencia de recuperación no supera el límite definido en el roadmap.

Si alguna condición falla, la variante no avanza, aunque tenga mejor utilidad.

---

## 7. Entregables del benchmark

- Conjunto de consultas con respuestas validadas (`PENDIENTE_VALIDACION` → `VALIDADO`), firmado por la persona que valida.
- Paquetes congelados con hash.
- Respuestas completas por variante.
- Tabla de métricas por categoría con denominadores.
- Lista de casos con fallo, sin resumir.

---

## 8. Protocolos separados en V4.0-A (implementado)

Implementación: `lib/legal-retrieval/lab/benchmark.ts`. Fixtures: `tests/retrieval-v4-0-a/fixtures/corpus-v1.ts`.

- **Benchmark A (calidad de recuperación):** A1 semántico-solo, A2 léxico-solo (`lexical-lab`), A3 híbrido. Cada variante recupera sus propios candidatos sobre el mismo corpus. No hay paquete congelado en A.
- **Benchmark B (calidad de modelo):** recuperación una vez por consulta (A3), paquete con sha256, mismo paquete para todas las variantes. V4.0-A no realiza llamadas a modelos: costo, tokens y latencia quedan en `null`.
- **Corpus y consultas sintéticos:** 23 consultas, 22 categorías, incluidos casos CLO (E2, E5, E6), casos adversariales de alta similitud negativa y casos de estrés del tope RPC. Las respuestas esperadas están `PENDIENTE_VALIDACION_JURIDICA`.
- **Métricas:** además de recall y acierto de artículo, se reporta `primera_posicion_relevante` por variante, y el conteo de consultas adversariales. No hay campo de ganador.
- **Invariante:** `SYNTHETIC_BENCHMARK_DOES_NOT_PROVE_PRODUCTION_SUPERIORITY`. Se expone en el resultado del benchmark.
- **Advertencia de interpretación:** el corpus y las consultas se diseñaron junto con el algoritmo. Un resultado perfecto de A3 en esta fixture no demuestra superioridad sobre producción; sólo verifica que el harness mide lo que dice medir.
- **Límite declarado:** A1 emula el tope de 20 de la RPC. En Q17, 20 `doc_*` ocupan el tope y A1 pierde la fuente relevante; A3 la recupera por vía léxica. La limitación SQL sigue pendiente (`KNOWN_LIMITATION_SQL_PREFILTER_PENDING`).
