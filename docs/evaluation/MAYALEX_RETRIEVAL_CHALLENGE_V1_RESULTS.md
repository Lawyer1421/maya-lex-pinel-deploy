# MayaLex — Retrieval Challenge V1: resultados

- **Base:** `a6e6abda44b929882ae77478a0f0fc55efbaa037` (shadow congelada). Diseño: `MAYALEX_RETRIEVAL_CHALLENGE_V1.md`.
- **Datos:** `retrieval-challenge-v1.json` (oro completo, métricas por modo y categoría, taxonomía, fallos por pregunta).
- **Snapshot:** 202 registros, sha256 `48f445627fbe…79d1`. Modo principal **CA01**. Sensibilidad **DECLARADO**.
- **Proxy semántico:** trigramas TF-IDF local, **no e5**. Ver diseño, sección 3.1.

---

## 0. Estado

**BLOCKED para promover V4.** Los artefactos de evaluación están completos, pero el criterio mínimo de seguridad **no se cumple**:

- `FORBIDDEN_SOURCE_LEAKAGE` = **1** en B y en C (caso D05). El criterio exige 0.
- `EXCLUDED_LAYER_LEAKAGE` = 0. Cumplido.

Causa: la consulta D05 no identifica instrumento, pero su materia (`03_NOTARIAL`) aprueba como PRIMARY+PASS todos los artículos del Código con vigencia. El paquete de C queda formado por artículos del Código para una pregunta sobre el Reglamento. Detalle en sección 4.

---

## 1. Resultados globales (CA01, k = 5, n = 53)

| Métrica | A semántica actual | B híbrido raw | C híbrido + paquete |
|---|---|---|---|
| EXPECTED_INSTRUMENT_HIT@1 | 31/45 = 0.689 | 37/45 = 0.822 | **39/45 = 0.867** |
| EXPECTED_INSTRUMENT_HIT@5 | 40/45 = 0.889 | 39/45 = 0.867 | 39/45 = 0.867 |
| EXPECTED_ARTICLE_HIT@1 | 22/45 = 0.489 | 28/45 = 0.622 | **29/45 = 0.644** |
| EXPECTED_ARTICLE_HIT@5 | 33/45 = 0.733 | 35/45 = 0.778 | **36/45 = 0.800** |
| MRR | 0.581 | 0.683 | **0.704** |
| PRIMARY_PASS_RECALL | 23/41 = 0.561 | 26/41 = 0.634 | 26/41 = 0.634 |
| FORBIDDEN_SOURCE_LEAKAGE | 0 | **1** | **1** |
| RELEVANCE_FAIL en evidencia | 27 | 25 | **0** |
| EXCLUDED_LAYER_LEAKAGE | 0 | 0 | 0 |
| DUPLICATE_RATE | 0 | 0 | 0 |
| EMPTY_RESULT_RATE | 0.132 | 0.132 | 0.189 |
| ABSTENTION_CORRECTNESS | 40/53 | 40/53 | 40/53 |
| Latencia media por pregunta | 0.12 ms* | 12.6 ms | 12.6 ms |

\* A no ejecuta léxico ni fusión; su latencia no es comparable.

**Lectura:** C no tiene evidencia `FAIL`. Su vaciado adicional (0.189 frente a 0.132) corresponde a 3 preguntas cuyo top-k bruto solo contenía candidatos `FAIL`. Es el rechazo previsto.

---

## 2. Resultados por categoría

No se colapsa el agregado. Cada categoría tiene n = 5 a 10, así que las diferencias son indicativas, no concluyentes.

| Categoría | n | Variante | Instrumento@1 | Artículo@5 | MRR | Abstención | Fuga prohibida |
|---|---|---|---|---|---|---|---|
| A_EXACTA | 10 | A | 10/10 | 10/10 | 1.000 | 10/10 | 0 |
| | | B | 10/10 | 10/10 | 1.000 | 10/10 | 0 |
| | | C | 10/10 | 10/10 | 1.000 | 10/10 | 0 |
| B_CONCEPTUAL | 10 | A | 5/10 | 7/10 | 0.470 | 7/10 | 0 |
| | | B | 10/10 | 8/10 | 0.617 | 7/10 | 0 |
| | | C | 10/10 | 8/10 | 0.617 | 7/10 | 0 |
| C_MULTI_REMISION_EXCEPCION | 10 | A | 7/10 | 8/10 | 0.412 | 7/10 | 0 |
| | | B | 10/10 | 10/10 | 0.825 | 7/10 | 0 |
| | | C | 10/10 | 10/10 | 0.825 | 7/10 | 0 |
| D_ADVERSARIAL | 10 | A | 5/10 | 4/10 | 0.333 | 4/10 | 0 |
| | | B | **3/10** | 3/10 | **0.233** | 4/10 | **1** |
| | | C | 5/10 | 4/10 | 0.325 | 4/10 | **1** |
| E_EVIDENCIA_INSUFICIENTE | 7 | A/B/C | n/a | n/a | n/a | 7/7 | 0 |
| F_HISTORICA_VIGENCIA_ROL | 6 | A/B/C | 4/5 | 4/5 | 0.800 | 5/6 | 0 |

**Regresión oculta en el agregado.** B supera a A en la suma global (instrumento@1 0.822 frente a 0.689), pero en la categoría D pierde: instrumento@1 cae de 5/10 a 3/10 y el MRR de 0.333 a 0.233. C recupera esa pérdida (5/10 y MRR 0.325). Sin el desglose por categoría, esta regresión no aparece.

---

## 3. Sensibilidad (CA01 y DECLARADO)

| Modo | Tope | Objetivo fuera del pool | Sin PRIMARY+PASS en el pool |
|---|---|---|---|
| CA01 | 20 / 25 / 50 | 6 / 41 (igual en los tres) | 15 / 41 (igual en los tres) |
| DECLARADO | 20 / 25 / 50 | 18 / 41 (igual en los tres) | 41 / 41 |

**RAW_LIMIT_SENSITIVITY: no hay efecto de límite.** Ampliar el tope de 20 a 50 no recupera ningún objetivo. Las pérdidas no son por el tope:

- En CA01, 6 objetivos quedan fuera del pool en cualquier tope. Cinco son casos de identidad (D06, D07, D08, D10 y F06): el exacto se abstiene por instrumento nombrado y no hay fallback semántico. Uno es semántico (D09): el objetivo no entra ni con tope 50.
- En CA01, 15 objetivos no tienen PRIMARY+PASS en el pool. El motivo es el gate de relevancia (sección 5).

**Efecto de la vigencia no declarada (DECLARADO):** sin adjudicación de vigencia, el exacto no recupera ningún artículo del Código ni del Reglamento (0/10 en A). Es el punto ciego descrito en el diseño, sección 9.1.

---

## 4. Fuga de fuente prohibida (criterio de seguridad)

| Caso | Variante | Evidencia | Causa |
|---|---|---|---|
| D05 | B, C | 5 artículos del Código como PRIMARY+PASS; el artículo 9 del Código aparece como material de apoyo | La consulta dice "reglamento notarial", que no coincide con la identidad del Reglamento. Sin instrumento identificado, la materia `03_NOTARIAL` aprueba como PRIMARY+PASS todo artículo del Código con vigencia. |

**Verificación:** `detectarInstrumentoDesdeTexto` devuelve `null` para la consulta D05, y `detectarMateriaSemanticaAmpliada` devuelve `03_NOTARIAL`.

**Consecuencia:** la relevancia por materia, sin instrumento, admite evidencia de un instrumento distinto como material. Es un defecto del diseño del gate. Requiere decisión CLO (sección 7).

**A:** sin fuga de fuente prohibida, pero su lista contiene 27 candidatos `FAIL` sin filtrar.

---

## 5. Taxonomía de fallos (CA01)

| Causa | A | B | C |
|---|---|---|---|
| IDENTITY_MISS | 5 | 5 | 5 |
| RELEVANCE_UNKNOWN_GATE | 3 | 3 | 3 |
| ROLE_REJECTION | 3 | 2 | 2 |
| RAW_LIMIT_LOSS | 4 | 2 | 2 |
| RELEVANCE_REJECTION | 1 | 1 | 1 |
| WRONG_INSTRUMENT | 1 | 1 | 1 |
| SEMANTIC_MISS | 1 | 1 | 1 |
| **Total de fallos** | **18** | **15** | **15** |

**Interpretación de cada causa:**

- **IDENTITY_MISS (5):** artículos 20, 30, 50, 60 y 90 con encabezado `3O`. Defecto de normalización OCR. Además, en el modo DECLARADO este número sube a 21 por la vigencia no declarada del Reglamento.
- **RELEVANCE_UNKNOWN_GATE (3):** el artículo correcto aparece como PRIMARY con relevancia UNKNOWN (ej. B04, C06, C07). La consulta no nombra materia ni instrumento, así que el gate no puede pasar. Son casos de diseño del gate, no de recuperación.
- **ROLE_REJECTION (2–3):** en DECLARADO, todo el Código queda CONTEXT por vigencia nula. En CA01 quedan casos de vigencia o capa abierta.
- **RAW_LIMIT_LOSS (2–4):** el objetivo está en el pool bruto pero fuera del top-5. Solo en A y B. C lo recupera por su paquete.
- **RELEVANCE_REJECTION (1):** C02 (remisión al artículo 12). El artículo 36 queda `FAIL` porque la consulta menciona el 12. El gate usa un solo número de artículo y marca como FAIL los demás objetivos de una pregunta de varios artículos.
- **WRONG_INSTRUMENT (1 en CA01):** B01 en A. En B y C aparece el caso D05, sección 4.
- **SEMANTIC_MISS (1):** D09. El objetivo queda fuera del tope semántico.

---

## 6. Políticas X e Y (simulación)

- **X** (congelada) es idéntica a la selección congelada en las 53 preguntas.
- **Y** produce el mismo paquete que X en las 53.
- Ninguna pregunta tiene a la vez PRIMARY+UNKNOWN y SECONDARY+PASS. Con este snapshot las políticas **no son discriminables**.

Para evaluar X frente a Y hace falta evidencia SECONDARY (E6, Decreto 102-2018), que no tiene texto en el repositorio. Esa decisión queda pendiente.

---

## 7. Casos de FALSE exacto

| Pregunta | Artículo | `es_norma_vigente` en CA01 | Resultado en C |
|---|---|---|---|
| F01 | 11 | false | CONTEXT / PASS |
| F02 | 72 | false | CONTEXT / PASS (E2) |
| F03 | 27 | false | CONTEXT / PASS |
| F04 | 84 | false | CONTEXT / PASS (E2) |

Ninguno llega como PRIMARY ni como material. Ninguno crea suficiencia. **EXACT_FALSE_PRODUCTION_POLICY = PENDING.** No se resuelve aquí.

---

## 8. Latencia por etapa (B y C, media por pregunta)

| Etapa | Media (ms) |
|---|---|
| Exacto | 0.012 |
| Léxico (adaptador lab, sobre 202 registros) | 12.021 |
| Semántico (proxy) | 0.042 |
| Fusión | 0.098 |
| Deduplicación | 0.017 |
| Ranking | 0.220 |
| Selección de paquete (la pipeline la calcula en B y en C) | 0.026 |
| Total | 12.603 |

El léxico domina con 95% del tiempo. Es el adaptador de laboratorio (token por token), no un índice. No es una medida de rendimiento de producción.

Son cifras locales sobre 202 registros. No representan latencia de producción.

---

## 9. Decisiones que requiere el CLO

1. **Materia sin instrumento (D05).** ¿Debe la relevancia por materia dar PASS cuando la consulta nombra un instrumento distinto, o cuando el instrumento no se identifica? Hoy da PASS, y eso habilitó material de instrumento equivocado.
2. **Exacto y vigencia nula.** Ningún artículo con vigencia nula se recupera por número. ¿Debe el exacto considerar vigencia nula, o la vigencia del Reglamento debe adjudicarse?
3. **RELEVANCE_UNKNOWN_GATE.** Las preguntas conceptuales sin materia no pueden pasar a PASS. ¿Es aceptable que la evidencia quede LIMITED o ABSTAIN en esos casos?
4. **Preguntas de varios artículos.** ¿Cómo debe calcularse la relevancia cuando la consulta menciona un artículo que es remisión y no el objetivo?
5. **Vigencia del Código.** Confirmar los artículos 17, 21 y 52 (ausentes del lote) y la discrepancia entre 87 vigentes (CA-01) y 84 (lote).
6. **Normalización OCR de encabezados `3O`.** Corrección de datos. No se aplicó.
7. **Política X frente a Y.** Requiere evidencia E6 con texto.
8. **Caso E2 con vigencia falsa.** Si la excepción D6b se aplica sólo a identidad de instrumento y artículo, ¿es correcto que el resto de la capa E2 quede excluida?

---

## 10. Validación legal pendiente

- **Oro técnico:** 32 `TECHNICALLY_VERIFIED`.
- **Pendiente de abogado:** 14 (C01–C10, F01–F04). Ver JSON.
- **Fuente insuficiente:** 7 (E01, E02, E04–E07, F05). Abstención técnica, sin respuesta jurídica establecida.
- **Ningún caso es legal gold.** `legal_gold=false` en todo el set.

---

## 11. Verificaciones

- Snapshot: sha256 verificado en carga. Mismo snapshot para A, B y C.
- Oro: resolución determinista. Todos los ids aceptables existen en el snapshot.
- Taxonomía: determinista.
- Simulación de límites: monótona.
- X idéntica a la selección congelada; simular Y no muta el baseline.
- Archivos congelados de la capa de sombra (`evidence-selection.ts`, `shadow.ts`): sin cambios respecto a la base (sha256 verificado).
- Único cambio en código compartido: `pipeline.ts`, con un parámetro opcional `semanticCap` cuyo valor por defecto es el mismo de antes.

---

## 12. Lo que estos resultados no son

- No son evidencia de superioridad de B ni de C sobre A. Los números por categoría son de n = 5 a 10.
- No son evidencia de calidad de producción. El proxy no es e5 y el corpus es pequeño.
- No son validación legal. Ningún oro está validado por un abogado.
- No establecen ningún umbral de éxito. Los criterios de seguridad son mínimos: fuga prohibida = 0 y fuga de capa excluida = 0.
