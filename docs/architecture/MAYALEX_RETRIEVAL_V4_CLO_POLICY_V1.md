# MayaLex — Retrieval V4: política CLO versionada (V1, V4.0-A.2)

- **Fecha de decisión:** 2026-10-09
- **Autoridad:** CLO. Decisión registrada en la conversación de control; no existe acta en el repositorio.
- **Alcance:** sólo laboratorio (`lib/legal-retrieval/lab/`). No es esquema de producción, no modifica corpus, `buscarRAG`, RPC ni `semantic-retriever` / `exact-resolver`.
- **Cambio de regla:** sólo mediante una nueva adjudicación CLO registrada.

---

## 1. Separación obligatoria

`RETRIEVAL_ROLE ≠ RELEVANCE ≠ SUFFICIENCY`

- **RETRIEVAL_ROLE** (`PRIMARY`, `SECONDARY`, `CONTEXT`, `EXCLUDED`): qué tipo de material es la unidad.
- **RELEVANCE** (`PASS`, `UNKNOWN`, `FAIL`): si la unidad corresponde a la pregunta concreta. Se determina por identidad de instrumento, artículo o materia clasificada. La similitud léxica o semántica nunca produce `PASS`.
- **SUFFICIENCY** (`SUFFICIENT`, `LIMITED`, `ABSTAIN`): si la evidencia permite una respuesta profesional.

Una respuesta puede ser `SUFFICIENT` sólo si se cumplen **todas** estas condiciones:

- **A.** Existe al menos una unidad `PRIMARY` verificada.
- **B.** Esa unidad tiene relevancia `PASS` para la pregunta concreta.
- **C.** Hay evidencia que respalda cada conclusión material. En el laboratorio, esa evidencia es un marcador de soporte validado por una persona. Nunca se infiere de puntuaciones.

Si falta cualquiera: `LIMITED` o `ABSTAIN`. `PRIMARY` por sí solo no crea suficiencia. `CONTEXT`, `SECONDARY` y las capas E2/E5/E6 no se acumulan para fabricar `SUFFICIENT`.

**No se adjudicó ningún umbral numérico de relevancia.** `LEXICAL_MIN_SCORE = 0.2` es una decisión del laboratorio que no ha sido ratificada por CLO.

---

## 2. Roles por capa

| Capa | Unidades | Rol | Regla |
|---|---|---|---|
| E2 | Código del Notariado, arts. 72, 73, 84, 87, 93 | `CONTEXT` | Nunca PRIMARY, SECONDARY ni SUFFICIENT. Excepción a D6b (sección 4). |
| E5 | CPC_TEXTO_BASE_D211-2006 | `EXCLUDED` en consulta normal | `CONTEXT` sólo con intención histórica o de texto original explícita. |
| E6 | Ley Especial de Adopciones de Honduras (Decreto 102-2018) | `SECONDARY` | Puede acompañar PRIMARY verificado. Nunca suficiente por sí solo. |
| Resto | Código HN, vigencia `TRUE`, sin capa abierta | `PRIMARY` | Requiere estado existente y confiable. |
| Resto | Otros, incluida vigencia `UNKNOWN` | `CONTEXT` | Nunca PRIMARY por inferencia. |

**Advertencias obligatorias (texto literal):**

- **E2:** `Estado legal no adjudicado; posible derogación por el Decreto 77-2006, pendiente de verificación con el texto oficial de La Gaceta.`
- **E5:** `CPC_TEXTO_BASE_D211-2006: rol temporal no adjudicado; sólo contexto histórico con consulta explícita`
- **E6:** `Estado canónico y completitud permanecen no resueltos y no medidos.`

**Gaceta 31,091 (procedencia, no autoritativa):** el documento `docs/corpus/E2_CA01_ADJUDICATION_PROPOSAL_V1.md` (líneas 17–19) menciona "La Gaceta 31,091". Esa referencia es histórica, no está verificada y no es autoritativa. No aparece en ninguna advertencia visible al usuario ni en el código de la política.

---

## 3. Intención histórica (E5)

Exige mención del CPC y un marcador textual explícito (`histórico`, `original`, `anterior`, `temporal`, o frases equivalentes). Nunca se infiere de similitud de embeddings.

---

## 4. Excepción E2 a D6b

- **Regla general:** `HN codigo + es_norma_vigente=false → EXCLUDED`.
- **Excepción cerrada:** Código del Notariado, arts. 72, 73, 84, 87, 93, **sólo si la identidad documental del instrumento coincide** (`identidadDocumentalCoincide` con `CODIGO_NOTARIADO`, de producción). El número de artículo solo nunca basta.
- Resultado: `CONTEXT`. Nunca `PRIMARY`, `SECONDARY` ni `SUFFICIENT`.
- **Casos que no reciben la excepción:** el mismo número de artículo en otro instrumento; el Reglamento del Código del Notariado (identidad distinta, excluida por el lookbehind de producción); los artículos 11 y 27, que se rigen por E1 (texto original excluido, texto reformado por D.77-2006 como candidato operativo).
- **Caducidad:** la excepción caduca automáticamente al cerrar E2 (`E2_ABIERTA`).

---

## 5. Política de vigencia

| Valor | Política |
|---|---|
| `TRUE` | Elegible, sujeto a todas las demás compuertas. Es una marca operativa, no `VIGENTE_VERIFICADO`. |
| `UNKNOWN` (null) | Restringido. Neutral. Nunca infiere validez verificada. Puede ser `CONTEXT` o `SECONDARY`. Nunca es el único soporte PRIMARY de una conclusión profesional. |
| `FALSE` | Excluido de la recuperación profesional normal para material normativo (`codigo` o `instrumento`). |

**Alcance de FALSE:** la regla aplica a material normativo. Jurisprudencia y doctrina con vigencia `FALSE` por diseño no se excluyen, como en producción. Pendiente de ratificación CLO.

**Excepciones cerradas a FALSE:** E2 (`CONTEXT`, sección 4) y E5 (`CONTEXT`, sección 3). Ninguna excepción convierte FALSE o UNKNOWN en PRIMARY.

**Canal exacto:** el canal exacto conserva el comportamiento de producción. Un artículo derogado pedido explícitamente por número se devuelve con su etiqueta y con rol `CONTEXT`. Esto es un punto abierto para CLO, porque la regla general excluye FALSE.

---

## 6. Orden de ranking: HYBRID (V4.0-A.3)

Funciones separadas, sin ventaja numérica entre ellas:

- **ROLE** = compuerta de uso permitido de la evidencia (`PRIMARY`, `SECONDARY`, `CONTEXT`, `EXCLUDED`). Controla uso permitido, advertencias y clasificación. No ordena.
- **RELEVANCE** = compuerta de ajuste a la pregunta (`PASS`, `UNKNOWN`, `FAIL`). Es requisito de suficiencia. No ordena.
- **LEGAL_ORDER** = orden lexicográfico, después de las exclusiones duras y de la compuerta de rol.
- **RETRIEVAL_SCORE** = desempate final, sólo cuando todo el orden legal empata.
- **SUFFICIENCY** = decisión independiente sobre la evidencia (sección 7).

`LEGAL_CONFIDENCE_SCORE_ALLOWED = NO`.

**Orden legal (lexicográfico, mayor es mejor):**

1. Identidad exacta (`exact_match`).
2. Vigencia, sólo según el estado existente: `TRUE` > `UNKNOWN` > `FALSE`.
3. Relación verificada: neutral (0). No existe capa de relaciones verificadas.
4. Jerarquía normativa: neutral (0). No existe tabla adjudicada por CLO.
5. Jurisdicción (`HN`).
6. Materia (coincidencia con la materia clasificada de la consulta).
7. Penalización de espejo o duplicado (mismo `fuente` y `num_articulo`, texto distinto).

**Desempate:** `retrieval_order_score` (léxico, semántico y completitud de cita). Sólo ordena cuando todo lo anterior empata.

**Consecuencias verificadas por pruebas:**
- PRIMARY no supera a SECONDARY, ni SECONDARY a CONTEXT, sólo por el rol.
- Una relevancia `PASS` no supera numéricamente a una `UNKNOWN` por sí sola.
- Jurisdicción y materia son campos separados; no hay compensación aritmética.

**Invariantes de `retrieval_order_score`:** no es confianza, no es probabilidad de corrección, no es autoridad, no es validez, no satisface suficiencia, no compensa un nivel legal superior.

**Consecuencia para revisión CLO:** con orden legal empatado, una unidad con relevancia `FAIL` puede quedar encima de una `PASS` si tiene más puntuación de recuperación. La relevancia controla la suficiencia, no el orden de presentación.

**Estatus de jurisprudencia y doctrina:** `NON_NORMATIVE_STATUS_MODEL=PENDING`. `es_norma_vigente` no se usa para inferir validez precedencial ni autoridad doctrinal. Requiere un modelo de estatus específico por tipo de fuente.

---

## 7. Puerta de suficiencia

| Situación | Veredicto |
|---|---|
| Sin candidatos | `ABSTAIN` (SIN_EVIDENCIA) |
| Todos los candidatos con relevancia `FAIL` | `ABSTAIN` (SOLO_RELEVANCIA_FALLIDA) |
| Sólo capas abiertas (E2/E5/E6) | `ABSTAIN` (SOLO_CAPAS_ABIERTAS) |
| Sin PRIMARY con relevancia `PASS` | `LIMITED` (SIN_PRIMARY_RELEVANTE) |
| PRIMARY con relevancia `PASS`, sin soporte validado | `LIMITED` (PRIMARY_PASS_SIN_SOPORTE_VALIDADO) |
| PRIMARY con relevancia `PASS` y soporte validado | `SUFFICIENT` |

Con las fixtures actuales ninguna consulta tiene soporte validado, así que el laboratorio **no produce `SUFFICIENT` en ningún caso real**. La única ruta a `SUFFICIENT` es el marcador explícito en las pruebas.

---

## 8. Containment H2 `doc_*` (sin cambio de producción)

- Política de producción: `fuente LIKE 'doc_%'` (predicado canónico histórico, `docs/corpus/hygiene-identity-queries.sql:42`), aplicado en la ruta semántica antes de la selección final.
- **Procedencia (PR #61):** merge commit `99db5424b387889426388a79e29b5932c168e82f`, "Merge PR #61: contain H2 doc_* layer in semantic retrieval". Según el mensaje del merge: auditoría independiente `PASS_WITH_NOTES`, `auditor-green recommended`, `merge recommended`, 626 pruebas pasadas, typecheck pasado.
- **Limitación conocida pendiente:** `KNOWN_LIMITATION_SQL_PREFILTER_PENDING`. El RPC puede consumir posiciones del top-20 con filas `doc_*` antes de que la aplicación las excluya.
- **Nota prospectiva de CLO:** si la doctrina llega a ser una capa de recuperación autorizada, la pertenencia H2 debe refinarse para que la doctrina no se excluya por accidente. Esta nota no cambia el filtro de producción.

---

## 9. Correcciones de implementación registradas en V4.0-A.2

- **Identidad de Notariado:** la versión anterior usaba un regex propio que no excluía el Reglamento del Código del Notariado. Ahora se usa la identidad documental de producción.
- **Deduplicación:** la clave de duplicado era sólo el `hash` (contenido, número, fuente) y colapsaba filas con vigencia distinta, ocultando una diferencia jurídica. Ahora la clave incluye tipo, jurisdicción, vigencia y materia. Regresión cubierta en pruebas.

---

## 10. Hallazgos abiertos para decisión CLO

1. **Alcance de FALSE:** aplicado a material normativo (`codigo`, `instrumento`); jurisprudencia y doctrina no se excluyen. Ratificar.
2. **Canal exacto y FALSE:** el artículo derogado pedido explícitamente por número sigue devolviéndose con etiqueta, como en producción. Ratificar o cambiar.
3. **Orden de vigencia** `TRUE > UNKNOWN > FALSE`: decisión del laboratorio, no ratificada.
4. **Soporte validado:** no existe todavía un mecanismo de validación de soporte. Sin él, `SUFFICIENT` es inalcanzable en la práctica.
5. **Identificadores de producción:** las cadenas de `fuente` para E2, E5 y E6 son sintéticas en las fixtures. Las cadenas reales no están verificadas.
6. **Desempate léxico alfabético:** empates léxicos se ordenan por id.
7. **Umbral léxico de 0.2:** no adjudicado por CLO. No se ajustó en esta fase.

---

## 11. Límites de esta política

- `NON_NORMATIVE_STATUS_MODEL=PENDING`.

- No es esquema, ni migración, ni configuración de producción.
- Las cadenas de identidad de capas abiertas son sintéticas en las fixtures.
- Ningún resultado del benchmark prueba superioridad en producción: `SYNTHETIC_BENCHMARK_DOES_NOT_PROVE_PRODUCTION_SUPERIORITY`.
- No se adjudicó ningún umbral numérico de relevancia.
