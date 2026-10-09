# MayaLex — Retrieval V4: política CLO versionada (V1)

- **Fecha de decisión:** 2026-10-09
- **Autoridad:** CLO (decisión registrada en la conversación de control del 2026-10-09; no está en el repositorio como acta).
- **Base de la rama:** `lab/retrieval-v4-0-a-hybrid`, sobre `main` = `99db5424b387889426388a79e29b5932c168e82f`.
- **Alcance:** sólo laboratorio (`lib/legal-retrieval/lab/`). No es esquema de producción, no modifica corpus, no modifica `buscarRAG`, no modifica el RPC.
- **Cambio de rol:** sólo mediante una nueva adjudicación CLO registrada.

---

## 1. Roles de recuperación

| Capa | Unidades | Rol | Regla |
|---|---|---|---|
| E2 | Código del Notariado, arts. 72, 73, 84, 87, 93 | `CONTEXT` | Nunca PRIMARY. Nunca suficiente por sí sola. |
| E5 | CPC_TEXTO_BASE_D211-2006 | `EXCLUDED` en consulta normal | `CONTEXT` sólo con intención histórica o de texto original explícita. |
| E6 | Ley Especial de Adopciones de Honduras (Decreto 102-2018) | `SECONDARY` | Puede acompañar evidencia PRIMARY. Nunca suficiente por sí sola. |
| Resto | Código HN vigente y confiable | `PRIMARY` | Requiere estado existente y confiable. |
| Resto | Otros | `CONTEXT` | Sin inferir autoridad a partir del texto. |

**Advertencias obligatorias (texto literal):**

- E2: `estado legal no adjudicado; posible derogación por D.77-2006 pendiente de Gaceta 31,091`
- E5: `CPC_TEXTO_BASE_D211-2006: rol temporal no adjudicado; sólo contexto histórico con consulta explícita`
- E6: `estado canónico y completitud no medidos`

**Procedencia de la advertencia E2:** la referencia "Gaceta 31,091" aparece en `docs/corpus/E2_CA01_ADJUDICATION_PROPOSAL_V1.md` (líneas 17–19). El registro CLO no contiene ese número. Se usa el texto de la decisión CLO tal como se recibió.

**Regla vinculante:** mientras E2, E5 o E6 permanezcan `OPEN` en `docs/corpus/MAYALEX_CANONICAL_ADJUDICATION_REGISTER_V1.md`, ninguna unidad de esas capas puede ser `PRIMARY` ni satisfacer suficiencia por sí sola.

**Intención histórica (E5):** exige mención del CPC y un marcador textual explícito (`histórico`, `original`, `anterior`, `temporal`, o frases equivalentes). No se infiere de similitud de embeddings.

---

## 2. Política de ranking: HYBRID

- `LEGAL_CONFIDENCE_SCORE_ALLOWED = NO`.
- Las compuertas jurídicamente materiales son **lexicográficas**. Ningún criterio inferior compensa un nivel superior.
- La aritmética ponderada sólo se usa en el nivel 7, dentro de un mismo nivel legal.

**Orden de las compuertas:**

0. Exclusiones duras y compuertas de rol: `fuente NULL`, containment H2 `doc_*`, `es_norma_vigente=false` en código HN (D6b), unidades de capas abiertas no pueden ser PRIMARY, E5 excluida salvo intención histórica explícita.
1. Identificador exacto más identidad de instrumento.
2. Vigencia, sólo con estado existente confiable. Orden: `TRUE` > `UNKNOWN` > `FALSE`. Esta jerarquía es decisión del laboratorio y requiere ratificación CLO.
3. Relación verificada: neutral (0) mientras no exista capa de relaciones verificadas.
4. Jerarquía normativa: neutral (0) mientras no exista tabla adjudicada por CLO.
5. Jurisdicción y materia.
6. Penalización de espejo o duplicado (mismo `fuente` y `num_articulo`, texto distinto).
7. Sólo si todas las compuertas empatan: `retrieval_order_score`, que combina léxico, semántico y completitud de cita.

**Invariantes de `retrieval_order_score`:** no es confianza jurídica, no es probabilidad de corrección, no es autoridad normativa, no satisface suficiencia legal, no compensa un nivel legal superior.

---

## 3. Puerta de suficiencia (sólo roles de evidencia)

| Situación | Veredicto |
|---|---|
| Hay al menos un PRIMARY | `SUFFICIENT` |
| Sólo CONTEXT o SECONDARY, todos de capas abiertas (E2/E5/E6) | `ABSTAIN` |
| Sólo CONTEXT o SECONDARY, con alguna unidad fuera de capas abiertas | `LIMITED` |
| Sin evidencia | `ABSTAIN` |

Esta puerta no evalúa si la respuesta es jurídicamente correcta.

---

## 4. Containment H2 `doc_*` (sin cambio de producción)

- Política de producción vigente: `fuente LIKE 'doc_%'` (predicado canónico histórico, `docs/corpus/hygiene-identity-queries.sql:42`), aplicado en la ruta semántica antes de la selección final.
- **Procedencia (PR #61):** merge commit `99db5424b387889426388a79e29b5932c168e82f`, "Merge PR #61: contain H2 doc_* layer in semantic retrieval". Según el mensaje del merge: auditoría independiente `PASS_WITH_NOTES`, `auditor-green recommended`, `merge recommended`, 626 pruebas pasadas, typecheck pasado.
- **Limitación conocida, pendiente:** `KNOWN_LIMITATION_SQL_PREFILTER_PENDING`. El RPC puede consumir posiciones del top-20 con filas `doc_*` antes de que la aplicación las excluya.
- **Nota prospectiva de CLO:** si la doctrina llega a ser una capa de recuperación autorizada en el futuro, la pertenencia H2 debe refinarse para que la doctrina no se excluya por accidente. Esta nota no cambia el filtro de producción.

---

## 5. Hallazgos abiertos para decisión CLO (no resueltos aquí)

1. **Suficiencia por léxico débil.** La puerta por rol cuenta cualquier PRIMARY que supere el umbral léxico de 0.2. En la consulta Q20 (texto base sintético) aparecen PRIMARY por coincidencias de 0.2 a 0.4 y la respuesta sale `SUFFICIENT`. La decisión CLO indica "evidencia-role sufficiency only", pero no define un mínimo de relevancia. Pendiente.
2. **E2 con `es_norma_vigente=false`.** El registro CA-01 marca las 7 filas del Notariado (incluidos arts. 72–93) con `es_norma_vigente=false`. La regla D6b de producción las excluye en la ruta semántica antes de que se aplique el rol `CONTEXT`. En el laboratorio, E2 como `CONTEXT` sólo es alcanzable para filas no marcadas como falsas. Esto contradice la intención de la decisión E2. Requiere aclaración CLO.
3. **Empates léxicos.** Las unidades con el mismo puntaje se ordenan alfabéticamente por id. No hay desempate por identidad de instrumento.
4. **Orden de vigencia.** `TRUE > UNKNOWN > FALSE` es decisión del laboratorio y no está ratificada por CLO.
5. **Identificadores de producción.** Los fragmentos de fixture usan cadenas sintéticas para E2, E5 y E6. Las cadenas reales de `fuente` en producción no están verificadas.

---

## 6. Límites de esta política

- No es esquema, ni migración, ni configuración de producción.
- Las cadenas de identidad de las capas abiertas son sintéticas en las fixtures.
- Ningún resultado del benchmark prueba superioridad en producción: `SYNTHETIC_BENCHMARK_DOES_NOT_PROVE_PRODUCTION_SUPERIORITY`.
