# MayaLex — Retrieval Challenge V1 (diseño)

- **Base:** `a6e6abda44b929882ae77478a0f0fc55efbaa037` (shadow congelada). Rama `eval/retrieval-v4-legal-challenge-v1`.
- **Fecha:** 2026-10-09.
- **Alcance:** evaluación de **recuperación**. No evalúa calidad de respuestas del LLM. Sin llamadas a modelos, sin llamadas externas, sin escrituras a Supabase, sin cambios de runtime, RPC, esquema ni corpus.
- **Resultados:** `MAYALEX_RETRIEVAL_CHALLENGE_V1_RESULTS.md`. Oro y resultados en máquina: `retrieval-challenge-v1.json`.

---

## 1. Fuente del snapshot

| Elemento | Valor |
|---|---|
| Artefacto | `docs/governance/exequatur-ingesta-notariado-lote-formal.json` |
| Commit de origen | `ef6c151` ("feat(ingesta): lote formal notariado Carril B (91 + reglamento)") |
| sha256 | `48f445627fbe18d30e70546f86d0ed40618d631ef449409816d68103071679d1` (verificado en carga; cambio invalida el snapshot) |
| Registros | 202: 91 Código del Notariado (D.353-2005) + 111 Reglamento (PCSJ-17-2012) |
| Hash de contenido | Los 202 `contenido_sha256` coinciden con el texto |
| Procedencia | Declarada en el artefacto (Drive, bit-idéntico al PDF oficial de CEDIJ / notarioshonduras.org) |

**Qué no está en el repositorio:** texto verificado de Código Procesal Penal, Código Procesal Civil, Código Civil, Código de Familia, Código de Comercio, LOAT, Decreto 102-2018 (E6) y CPC_TEXTO_BASE (E5). Esas preguntas se marcan `GOLD_SOURCE_INSUFFICIENT`. No se inventa texto.

### 1.1 Dos modos de vigencia (el mismo snapshot de texto)

- **DECLARADO:** el lote declara `vigenciaDeclarada=False` en todos sus registros. Esa marca significa "no declarada", no "derogada". Se mapea a `null` (UNKNOWN). Ningún registro puede ser PRIMARY.
- **CA01:** vigencia adjudicada en el registro CLO (`docs/corpus/MAYALEX_CANONICAL_ADJUDICATION_REGISTER_V1.md`, CA-01): `es_norma_vigente=false` para los artículos 11, 27, 72, 73, 84, 87 y 93 del Código; `true` para los demás del Código. Reglamento sin vigencia documentada → `null`.

Ambos modos son sensibilidad del mismo texto. CA01 es el modo principal porque es el único con evidencia documental de vigencia.

**Discrepancia documentada:** el registro CA-01 reporta 94 filas (87 vigentes, 7 no). El lote contiene 91 (faltan los artículos 17, 21 y 52). Los tres artículos ausentes no están en el snapshot.

---

## 2. Set de preguntas

**53 preguntas**, seis categorías:

| Categoría | N | Qué prueba |
|---|---|---|
| A_EXACTA | 10 | Búsqueda por número de artículo con instrumento nombrado, con variantes de redacción |
| B_CONCEPTUAL | 10 | Preguntas en lenguaje de abogado o estudiante, sin repetir el texto fuente |
| C_MULTI_REMISION_EXCEPCION | 10 | Varios artículos, remisiones y excepciones dentro del texto |
| D_ADVERSARIAL | 10 | Mismo número de artículo en el Código y en el Reglamento, con vocabulario similar |
| E_EVIDENCIA_INSUFICIENTE | 7 | Instrumentos ausentes del snapshot y un artículo inexistente (abstención) |
| F_HISTORICA_VIGENCIA_ROL | 6 | Vigencia, texto original, rol E1/E2 y dependencia de la vigencia adjudicada |

Estado técnico del oro: 32 `TECHNICALLY_VERIFIED`, 14 `PENDING_LEGAL_VALIDATION`, 7 `GOLD_SOURCE_INSUFFICIENT`.

### 2.1 Registro de oro

Cada pregunta tiene: `id`, `categoria`, `pregunta`, `materia`, `expected_instrument`, `expected_articles`, `acceptable_source_ids`, `forbidden_source_ids`, `expected_primary_required`, `expected_secondary_allowed`, `expected_context_allowed`, `expected_abstention`, `legal_validation_status`, `legal_gold` (siempre `false`), `notes`.

- `acceptable_source_ids` y `forbidden_source_ids` se resuelven contra el snapshot. Si un artículo declarado no existe, la carga falla. No hay oro sin fuente.
- `forbidden_source_ids` son los registros del **otro** instrumento con el mismo número. Es la prueba de confusión de instrumento.

### 2.2 Separación técnico / legal

- **TECHNICAL_GOLD:** los ids aceptables existen y su texto corresponde a la pregunta, según revisión de encabezados. Es `TECHNICALLY_VERIFIED`.
- **LEGAL_GOLD:** no está establecido. Ninguna pregunta tiene `legal_gold=true`. Las marcadas `PENDING_LEGAL_VALIDATION` requieren interpretación o decisión CLO.

### 2.3 Preguntas que requieren validación legal

- C01–C10: excepciones, remisiones e interpretación de sanciones y custodia.
- F01–F04: vigencia, texto original y rol E1/E2.

Lista completa en el JSON. Ningún caso queda como legal gold sin revisión de un abogado.

---

## 3. Variantes

Las tres corren sobre el mismo snapshot, la misma pregunta y el mismo proxy semántico.

- **A — semántica actual:** exacto de producción (`resolverExactoLab`). Si el instrumento está nombrado y el exacto no coincide, se abstiene, como `buscarRAG`. Si no, similitud semántica con exclusiones duras. Sin orden legal ni paquete.
- **B — V4 híbrido raw:** `recuperarLab` en modo `HYBRID`. Top-k del ranking bruto.
- **C — V4 híbrido + selección de evidencia:** la misma ejecución, evaluada sobre el paquete (`packet_k = 5`).

### 3.1 Proxy semántico (no es e5)

El modelo de producción (`multilingual-e5-small`) requiere llamadas externas. Esta evaluación no las hace. Se usa un coseno TF-IDF de trigramas de caracteres, calculado localmente (`NOMBRE_PROXY = CHAR3GRAM_TFIDF_LOCAL_NOT_E5`).

Consecuencia: la columna "semántica" mide un proxy, no el modelo de producción. Los resultados no representan la calidad de e5 en el corpus real.

---

## 4. Métricas

- EXPECTED_INSTRUMENT_HIT@1 y @5, EXPECTED_ARTICLE_HIT@1 y @5, MRR.
- PRIMARY_PASS_RECALL (sobre preguntas con PRIMARY requerido y oro técnico).
- FORBIDDEN_SOURCE_LEAKAGE: ids prohibidos presentes en la evidencia de la variante.
- RELEVANCE_FAIL_LEAKAGE, EXCLUDED_LAYER_LEAKAGE.
- DUPLICATE_RATE, EMPTY_RESULT_RATE, EVIDENCE_PACKET_EMPTY_RATE.
- ABSTENTION_CORRECTNESS: se predice abstención si no hay PRIMARY con relevancia PASS en la evidencia.
- Latencia por etapa.

Todas se reportan por categoría. El agregado global no se usa solo.

---

## 5. Taxonomía de fallos

Una causa por fallo, por prioridad fija:

1. `CORPUS_GAP`: respuesta con evidencia en una pregunta sin fuente en el snapshot.
2. `WRONG_INSTRUMENT`: el primer resultado es un instrumento equivocado con el mismo número.
3. `IDENTITY_MISS`: el exacto se abstiene por identidad de instrumento y el objetivo existe en el snapshot.
4. `RELEVANCE_REJECTION`: el objetivo está en el pool con relevancia `FAIL`.
5. `ROLE_REJECTION`: el objetivo está excluido, o es CONTEXT/SECONDARY donde se requiere PRIMARY.
6. `RAW_LIMIT_LOSS`: el objetivo está en el pool bruto pero fuera del top-k o de la capacidad del paquete.
7. `SEMANTIC_MISS`: el objetivo queda fuera del tope semántico.
8. `LEXICAL_MISS`: el objetivo está fuera de la lista léxica.
9. `MIRROR_DUPLICATE`: duplicados en la evidencia.
10. `RELEVANCE_UNKNOWN_GATE`: **extensión de esta evaluación.** El artículo correcto es PRIMARY con relevancia `UNKNOWN`. La pregunta no nombra materia ni instrumento, así que el gate no puede pasar.
11. `GOLD_AMBIGUOUS`, `OTHER`.

`RELEVANCE_UNKNOWN_GATE` no está en la lista original de la misión. Se agregó porque separa un problema de diseño del gate de una falla de recuperación. Se documenta como extensión.

---

## 6. Sensibilidad al límite bruto (simulación)

Se simulan topes de 20, 25 y 50 para el tope semántico y el pool bruto, sin tocar el RPC. Se miden dos cosas por separado:

- Objetivo ausente del pool bruto.
- Ausencia de PRIMARY con relevancia `PASS` en el pool.

Medir solo la segunda confunde el límite con el gate de relevancia. Por eso se separan.

---

## 7. Políticas X e Y (simulación, sin mutar el baseline)

- **X** (congelada): MATERIAL → RESTRICTED (PRIMARY+UNKNOWN) → SUPPORTING (SECONDARY+PASS) → CONTEXT.
- **Y**: SECONDARY+PASS antes que PRIMARY+UNKNOWN.

X se verifica igual a la selección congelada en todas las preguntas. Y no altera el baseline.

---

## 8. Casos de FALSE exacto

Se rastrean por separado: artículos con `es_norma_vigente=false` localizados por número en el canal exacto. Política de producción: **PENDIENTE**. No se resuelve aquí.

---

## 9. Hallazgos de datos (no de algoritmo)

1. **Ceguera del exacto a la vigencia nula.** El resolvedor exacto de producción filtra con `es_norma_vigente = true` o `= false`. Un registro con vigencia `null` nunca se encuentra por número. Todo el Reglamento (vigencia no documentada) queda fuera del exacto. Este es el hallazgo de mayor impacto de la evaluación.
2. **Encabezados con letra O.** Los artículos 20, 30, 50, 60 y 90 aparecen como `ARTÍCULO 3O`, `2O`, `5O`, `6O` y `9O` en el texto. El resolvedor exige el encabezado del artículo, no lo reconoce y se abstiene. Como el instrumento está nombrado, la búsqueda semántica no se ejecuta, y ningún canal recupera el artículo. Es un defecto de normalización OCR. Afecta la pregunta F06.
3. **Marcas de derogación en el texto.** Los artículos 72, 73, 84 y 87 llevan "Derogado" en su propio texto. Sostiene la advertencia E2; no basta para adjudicar vigencia.
4. **Remisiones y excepciones presentes.** Artículo 13 (excepción de mandamiento judicial), 36 (remisión al artículo 12, numeral 9), 65 (excepción del acreedor), 78 (excepto la docencia), entre otras. Se usan en la categoría C.

---

## 10. Límites declarados

- Corpus pequeño (202 registros, un solo instrumento con texto disponible en el repositorio).
- Proxy semántico local, no e5.
- Oro técnico verificado por revisión de encabezados y texto, no por un abogado.
- No es evidencia de superioridad de ningún variante. Ver resultados.
