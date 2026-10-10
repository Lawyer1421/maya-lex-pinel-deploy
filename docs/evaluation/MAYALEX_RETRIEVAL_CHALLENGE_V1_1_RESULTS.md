# MAYALEX — Retrieval Challenge V1.1 — CLO Relevance Hardening: Resultados

**Estado:** READY_FOR_AUDIT, con una regresión abierta documentada (C10) y dos decisiones CLO pendientes.
**Base:** `b10ef8349566b10560514738c48360b86eaa3d6a` (V1, sin cambios).
**Rama:** `eval/retrieval-v4-legal-challenge-v1-1`.
**Alcance:** sólo evaluación. Sin integración en producción, sin PR, sin escrituras en producción o staging.

> Los resultados son de un benchmark sintético sobre un snapshot versionado. No prueban superioridad en producción.
> Proxy léxico-semántico local `CHAR3GRAM_TFIDF_LOCAL_NOT_E5`, no e5.

---

## 1. Qué cambió (sólo overlay de evaluación)

| Módulo | Función |
|---|---|
| `tests/retrieval-eval-v1-1/instrument-intent.ts` | Intención instrumental explícita. "reglamento … notarial" → `REGLAMENTO_NOTARIADO`. La materia nunca sustituye a una clase de instrumento nombrada. |
| `tests/retrieval-eval-v1-1/relevance-v11.ts` | Relevancia V1.1: identidad determinista, artículo único (FAIL) o multi-artículo (UNKNOWN), similitud nunca produce PASS. |
| `tests/retrieval-eval-v1-1/exact-v11.ts` | Resolver exacto tri-estado TRUE → UNKNOWN → FALSE. Sólo evaluación; el resolver de producción no se modifica. |
| `tests/retrieval-eval-v1-1/pipeline-v11.ts` | Overlay sobre `recuperarLab` congelado: recalcula relevancia, reselecciona paquete y evalúa suficiencia. El orden legal del ranking bruto no cambia. |
| `tests/retrieval-eval-v1-1/run-v11.ts` | Ejecuta el mismo challenge de 53 preguntas en modos CA01 y DECLARADO y escribe el delta. |
| `tests/retrieval-eval-v1-1/evaluacion-v11.test.ts` | 17 pruebas focales (intención, relevancia, overlay exacto, paquete D05, congelación). |

**Variantes:** A se mantiene congelada (verificado por prueba contra el artefacto V1). B y C usan la política V1.1.

**Artefactos nuevos:** `docs/evaluation/retrieval-challenge-v1-1.json`. Los artefactos V1 no se sobrescribieron.

---

## 2. Gold

- **GOLD_CASES_UNCHANGED:** sí. 53 preguntas, split 32 TECHNICALLY_VERIFIED / 14 PENDING_LEGAL_VALIDATION / 7 GOLD_SOURCE_INSUFFICIENT.
- **Correcciones de gold:** ninguna.
- `tests/retrieval-eval-v1/` no se modificó.

---

## 3. D05 — ¿se elimina la fuga?

D05: *"Según el reglamento notarial, ¿qué presunción tienen las afirmaciones del notario?"*

| Métrica (CA01) | V1 | V1.1 |
|---|---|---|
| Fuente prohibida (Código) en ranking bruto top-5 de B (CA01 global) | 1 | 1 (sólo en bruto) |
| Fuente prohibida en paquete de C (CA01 global) | 1 | **0** |
| Fuente prohibida en material (PRIMARY/RESTRICTED/SUPPORTING) | — | **0** |

> Las cifras de V1 son globales de CA01; el JSON V1 no desglosa por pregunta en esta tabla. La cifra de V1.1 para D05 proviene de `docs/evaluation/retrieval-challenge-v1-1.json` (`d05`).

- En V1.1 los artículos del Código pasan de PASS a **FAIL `INCOMPATIBLE_INSTRUMENT`**.
- El paquete final sólo contiene artículos del Reglamento como `CONTEXT_ONLY`.
- Sin ID de pregunta codificado: la regla usa la intención instrumental de la consulta.

**DECLARADO:** ninguna fuga en bruto, paquete ni material.

**Sobre la métrica de abstención de D05:** en V1 contaba como respuesta correcta porque el paquete tenía material del Código prohibido. En V1.1 abstiene. Es consecuencia de quitar la fuga, no una pérdida de calidad. Ver §8.

### Requisitos de la misión

- **REGLAMENTO_NOTARIAL_ALIAS_RESOLVED:** sí. "reglamento … notarial" → `REGLAMENTO_NOTARIADO` (D05, D06–D10).
- **INSTRUMENT_INTENT_GATE_IMPLEMENTED:** sí.
- **MATERIA_ALONE_PASS con clase explícita:** 0 (CA01 y DECLARADO).
- **CONCEPTUAL_SIMILARITY_MINTS_PASS:** 0. Prueba unitaria incluida.
- **EXACT_UNKNOWN localizados:**
  - CA01: 4 (PRIMARY 0, SUFFICIENT 0, LIMITED 4).
  - DECLARADO: 20 (PRIMARY 0, SUFFICIENT 0, LIMITED 18, ABSTAIN 2).
- **MULTI_ARTICLE_FALSE_REJECTION:** V1 = 1 → V1.1 = 0, en CA01 y DECLARADO (C02, artículo 36 pasa a UNKNOWN).

---

## 4. Resultados globales (53 preguntas, K=5)

### CA01

| Métrica | V1 B | V1.1 B | V1 C | V1.1 C |
|---|---|---|---|---|
| instrumento_hit@1 | 0.822 (37/45) | **0.911** (41/45) | 0.867 (39/45) | **0.978** (44/45) |
| articulo_hit@1 | 0.622 (28/45) | **0.711** (32/45) | 0.644 (29/45) | **0.733** (33/45) |
| primary_pass_recall | 26/41 | 25/41 | 26/41 | 25/41 |
| abstention_correctness | 40/53 | 38/53 | 40/53 | 38/53 |
| MRR | 0.683 | **0.772** | 0.704 | **0.804** |
| empty_result_rate | 0.132 | 0.057 | 0.189 | 0.113 |
| forbidden leakage (paquete) | — | — | 1 | **0** |

### DECLARADO

| Métrica | V1 B | V1.1 B | V1 C | V1.1 C |
|---|---|---|---|---|
| instrumento_hit@1 | 0.333 | **0.778** | 0.356 | **0.800** |
| articulo_hit@1 | 0.222 | **0.667** | 0.222 | **0.667** |
| primary_pass_recall | 0/41 | 0/41 | 0/41 | 0/41 |
| abstention_correctness | 12/53 | 12/53 | 12/53 | 12/53 |
| MRR | 0.282 (12.7/45) | **0.727** (32.7/45) | 0.288 (12.95/45) | **0.736** (33.1/45) |

> En DECLARADO `primary_pass_recall` es 0 en todas las variantes. Es estructural: sin vigencia declarada no hay PRIMARY (§7.1).

---

## 5. Resultados por categoría

### CA01 (B raw / C paquete)

| Categoría | V1 B | V1.1 B | V1 C | V1.1 C |
|---|---|---|---|---|
| A_EXACTA (10) | ih1 1.0, pp 10/10, abs 10/10 | igual | igual | igual |
| B_CONCEPTUAL (10) | ih1 1.0, pp 7/10 | igual | igual | igual |
| C_MULTI_REMISION (10) | ih1 1.0, **pp 7/10, abs 7/10** | **pp 6/10, abs 6/10** | **pp 7/10, abs 7/10** | **pp 6/10, abs 6/10** |
| D_ADVERSARIAL (10) | ih1 0.3, fuga 1 | ih1 **0.7** | ih1 0.5, fuga 1 | ih1 **1.0**, fuga **0** |
| E_EVIDENCIA_INSUF. (7) | abs 7/7 | igual | abs 7/7 | igual |
| F_HISTORICA (6) | ih1 0.8, abs 5/6 | igual | ih1 0.8, abs 5/6 | igual |

La caída en C_MULTI corresponde a C10 (§8). La caída de abstención en D corresponde a D05 (§8).

### DECLARADO (B raw / C paquete)

| Categoría | V1 B ih1 | V1.1 B ih1 | V1 C ih1 | V1.1 C ih1 |
|---|---|---|---|---|
| A_EXACTA | 0.0 | **1.0** | 0.0 | **1.0** |
| B_CONCEPTUAL | 0.4 | 0.4 | 0.4 | 0.4 |
| C_MULTI_REMISION | 0.8 | 0.8 | 0.8 | 0.8 |
| D_ADVERSARIAL | 0.3 | **0.9** | 0.4 | **1.0** |
| E_EVIDENCIA_INSUF. | — | — | — | — |
| F_HISTORICA | 0.0 | **0.8** | 0.0 | **0.8** |

Las mejoras de A y F en DECLARADO vienen del overlay exacto UNKNOWN: se localizan por identidad exacta, con rol no PRIMARY.

---

## 6. Transiciones de relevancia V1 → V1.1

Sobre candidatos presentes en ambos pools (53 preguntas):

| Transición | CA01 | DECLARADO |
|---|---|---|
| FAIL → UNKNOWN | 19 | 19 |
| FAIL → PASS | 0 | 0 |
| UNKNOWN → PASS | 0 | 0 |
| PASS → UNKNOWN o FAIL | 26 | 26 |
| UNKNOWN → FAIL | 0 | 0 |
| sin cambio | 608 | 596 |

Las 26 transiciones PASS → no-PASS son materia-sola con clase explícita (D05 y similares). La única pérdida de evidencia aceptable es C10 (§8).

Las transiciones no incluyen candidatos que sólo aparecen en el pool del camino FAST_EXACT.

---

## 7. Fuga por capa

| Capa | CA01 | DECLARADO |
|---|---|---|
| RAW_FORBIDDEN_SOURCE_PRESENCE | 1 | 0 |
| PACKET_FORBIDDEN_SOURCE_LEAKAGE | **0** | **0** |
| MATERIAL_FORBIDDEN_SOURCE_LEAKAGE | **0** | **0** |
| EXCLUDED_LAYER_LEAKAGE | **0** | **0** |

La presencia en bruto (1 en CA01) es el artículo del Código de D05 en el top-5 del ranking bruto. No llega al paquete ni a material.

### 7.1 Límite estructural (no introducido por V1.1)

`rolRecuperacion` (`lib/legal-retrieval/lab/clo-policy.ts`) asigna PRIMARY sólo a `fuente_tipo === 'codigo'` con vigencia TRUE y jurisdicción HN. Los artículos del Reglamento son `CONTEXT` por diseño de la política congelada. Por eso **ninguna pregunta sobre el Reglamento puede llegar a SUFFICIENT**. Esto afecta a D05, D06–D10 y a las preguntas de DECLARADO con Reglamento. Requiere decisión CLO, no cambio en esta misión.

---

## 8. Regresiones y artefactos

### 8.1 C10 — regresión real (CA01, B y C)

- **Pregunta:** "¿Prevalece la nulidad prevista en otras leyes sobre la nulidad de la ley notarial?"
- **Acepta:** `codigo_notariado_2005_a18` (PRIMARY PASS en V1).
- **Causa:** el término genérico "ley" activa la clase `ley`, sin identidad resuelta. Eso desactiva la regla de materia y el artículo 18 queda en UNKNOWN (`NO_SIGNAL`).
- **Efecto:** primary_pass_recall y abstention bajan 1 en C_MULTI (7 → 6). Global B: 26 → 25 y abstención 40 → 38.
- **Por qué no se corrigió aquí:** cambiar la clasificación de "ley" después de ver el resultado sobre el mismo challenge sería ajustar el benchmark a sus propias preguntas. Requiere decisión CLO sobre si "ley notarial" debe resolverse a `CODIGO_NOTARIADO` o tratarse como clase genérica.

### 8.2 D05 — caída de abstención por eliminación de fuga (CA01)

En V1 la abstención de D05 se contaba como correcta porque había material del Código prohibido en el paquete. En V1.1 no hay PRIMARY PASS (el Reglamento es CONTEXT, §7.1), así que abstiene. La métrica pasa de "correcto por motivo indebido" a "incorrecto por límite estructural".

### 8.3 Decisiones CLO pendientes (no regresiones)

1. **F03 (CA01):** el artículo 27, EXACT_FALSE, entra al paquete como `CONTEXT_ONLY` con relevancia PASS. No es material ni PRIMARY; veredicto LIMITED. Decidir si un artículo derogado debe mostrarse como contexto o excluirse.
2. **F01 (DECLARADO):** el artículo 11 de UNKNOWN recibe PASS por `EXACT_IDENTITY` como CONTEXT. Sigue siendo no material. Confirmar si la identidad exacta debe bastar para PASS en evaluación.

### 8.4 Multi-artículo

- V1 falsos rechazos: 1 (C02, artículo 36) → V1.1: 0. Transición FAIL → UNKNOWN, rol PRIMARY, sin PASS.
- UNKNOWN → PASS en multi-artículo: 1 (F01, DECLARADO; §8.3-2). Sin cambio en CA01.

---

## 9. Conteos de control

| Control | Valor |
|---|---|
| Preguntas | 53 |
| Oro modificado | No |
| Cambios en `lib/` | No |
| Cambios en RPC / esquema / corpus | No |
| Cambios en artefactos V1 | No |
| EXACT_UNKNOWN en PRIMARY | 0 |
| EXACT_UNKNOWN SUFFICIENT | 0 |
| Escrituras en producción / staging | 0 |
| Llamadas externas | 0 |

### Hashes de módulos congelados (sin cambios)

- `lib/legal-retrieval/lab/evidence-selection.ts`: `9c2c548a4958e5f37c7e30bf1abf11586c10f5f8145f3d208027286e61261835`
- `lib/legal-retrieval/lab/shadow.ts`: `e518bb4e3003b9ee1f813eb9b728d312ba33d2d494a6ed04a4d076da0a948bd9`

---

## 10. Verificación

- `npx tsc --noEmit`: **exit 0**.
- `npx vitest run tests/retrieval-eval-v1-1 tests/retrieval-eval-v1`: **44/44** (17 V1.1 + 27 V1).
- `npx vitest run` (suite completa, una ejecución): **780 pasan, 45 omitidas**. **4 archivos fallan por timeout de hooks PGlite** (`beforeAll` a 10 s bajo carga); `tests/sql` pasa al correrse sola (5/5 archivos, 49 pruebas). Los archivos fallidos no están tocados por este cambio.

---

## 11. Pendiente para auditoría

1. Decidir sobre "ley notarial" y el caso C10 (§8.1).
2. Decidir la visibilidad de artículos FALSE en el paquete (§8.3-1).
3. Confirmar identidad exacta como PASS para UNKNOWN en evaluación (§8.3-2).
4. Revisar `rolRecuperacion` para el Reglamento (§7.1). Es el límite que impide SUFFICIENT en todo el Reglamento.
5. Los timeouts PGlite de la suite completa son de carga; conviene revisar `hookTimeout` en `tests/sql`.

---

## 12. Nota de reproducibilidad (V1.1.1)

- **Pins obsoletos heredados de V1.** El SHA256 del lote y el de `shadow.ts` se calcularon sobre bytes con CRLF (checkout Windows con `core.autocrlf=true`). El blob en git tiene LF, así que el hash dependía de la plataforma.
- **El contenido no cambió.** El lote entró en `ef6c151` y `shadow.ts` en `a6e6abd`; ninguno cambió después. Normalizados a LF, los hashes coinciden con los blobs.
- **Pins actualizados:** `SHA256_ARTEFACTO` → `5b2870755310330038cb46a3ba7c7d9900c4e99e8b031e62e4bc1a43f33b7995`; hash de `shadow.ts` → `5ec53c469bd46786c37315c73aab41d9ab274f5c36de93e3a99f709066198f47`. El pin de `evidence-selection.ts` (`9c2c548…`) no cambió.
- **Cálculo del hash:** `sha256Normalizado` en `tests/retrieval-eval-v1/snapshot.ts`, con normalización CRLF→LF. Es necesario para que la validación pase tanto en checkout CRLF como LF.
- **Resultados:** regenerar el harness reproduce todas las métricas, filas, transiciones y conteos de fuga. Sólo cambia el campo `sha256` del snapshot.
- **Artefactos no reescritos.** `retrieval-challenge-v1-1.json` y `retrieval-challenge-v1.json` conservan `48f445…` como hash del checkout de autoría.
- **Sin cambios de oro ni de evaluación.** Ningún resultado histórico de V1 fue modificado.
