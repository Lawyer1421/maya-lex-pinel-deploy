# MayaLex — Retrieval V4: capa de sombra, selección de evidencia

- **Base congelada:** `1d381126189e1c26c7daa7a192c383f8bb1f7741` (rama `lab/retrieval-v4-0-a-hybrid`, V4.0-A.3). No se modificó.
- **Rama de esta fase:** `lab/retrieval-v4-shadow-evidence-selection`.
- **Alcance:** sólo laboratorio y sombra. Sin integración de producción, sin llamadas a modelos, sin Gemini, sin context caching, sin cambios de RPC, esquema ni corpus. No se ajustó ningún umbral léxico.

---

## 1. Invariante central

**RAW RANKING ≠ EVIDENCE PACKET.**

El ranking bruto puede contener candidatos `PRIMARY`, `SECONDARY` y `CONTEXT`, con relevancia `PASS`, `UNKNOWN` o `FAIL`. El paquete de evidencia se selecciona explícitamente, según elegibilidad legal y probatoria. La selección no se resuelve sumando pesos a rol o relevancia: el orden de cada clase conserva el orden bruto.

Arquitectura:

```
RETRIEVAL → RAW RANKING → EVIDENCE SELECTION → SELECTED EVIDENCE PACKET → SUFFICIENCY → (futuro) LLM
```

---

## 2. Clases de uso del paquete

| Rol | Relevancia | Uso en el paquete | Reserva |
|---|---|---|---|
| PRIMARY | PASS | `MATERIAL` | Primera clase; protegida |
| PRIMARY | UNKNOWN | `RESTRICTED` | Segunda; no cuenta como PRIMARY suficiente |
| PRIMARY | FAIL | Rechazado (`REJECTED_RELEVANCE_FAIL`) | — |
| SECONDARY | PASS | `SUPPORTING` | Tercera |
| SECONDARY | UNKNOWN | `SUPPORTING` sólo si hay un `MATERIAL` seleccionado; si no, `NOT_SELECTED_USEFULNESS` | Tercera, condicionada |
| SECONDARY | FAIL | Rechazado | — |
| CONTEXT | PASS / UNKNOWN | `CONTEXT_ONLY`, sólo con capacidad restante | Última |
| CONTEXT | FAIL | Rechazado | — |
| EXCLUDED | — | Rechazado (`REJECTED_ROLE`); nunca entra | — |

Las políticas CLO se preservan: E2 es `CONTEXT` y nunca `MATERIAL`; E5 es `EXCLUDED` en consulta normal y `CONTEXT` sólo con intención histórica explícita; E6 es `SECONDARY` y nunca `MATERIAL`.

---

## 3. Protección de PRIMARY + PASS

Si el pool bruto contiene al menos un `PRIMARY + PASS`, la selección los toma antes que cualquier otra clase, en orden bruto, hasta `packet_k`. Un `SECONDARY`, `CONTEXT` o `FAIL` con mayor puntuación no puede desplazarlos.

Si `packet_k` es menor que el número de `PRIMARY + PASS`, los restantes quedan como `NOT_SELECTED_CAPACITY`. Ese caso no cuenta como desplazamiento por una clase inferior.

---

## 4. Dos límites distintos

| Límite | Valor en laboratorio | Función |
|---|---|---|
| `raw_candidate_limit` | 50 (`RAW_CANDIDATE_LIMIT_LAB`) | Tamaño máximo del pool bruto |
| `packet_k` | Parámetro de la consulta | Capacidad del paquete de evidencia |

El tope SQL de 20 del RPC (`LIMIT least(limite, 20)`) es un tercer límite, de producción, que no se modifica en esta fase.

---

## 5. Suficiencia sobre el paquete

Orden de evaluación: **primero se selecciona el paquete, después se evalúa la suficiencia sobre ese mismo conjunto.**

Invariante:

**SUFFICIENCY_EVIDENCE_SET == EVIDENCE_PACKET_SET**

La implementación lo cumple por construcción: `evidenciaSuficiencia` es la lista de ids del paquete. Las pruebas lo verifican en todos los casos.

Consecuencia documentada: un PRIMARY con soporte validado fuera del top-k entra al paquete por la protección de la sección 3, así que la suficiencia antes y después coincide. Con `packet_k ≥ 1`, la evidencia que puede volver `SUFFICIENT` siempre está en el paquete.

Sin soporte validado no hay `SUFFICIENT`. Las fixtures actuales no tienen soporte validado, así que el laboratorio no produce `SUFFICIENT` salvo en las pruebas con marcador explícito.

---

## 6. Diagnósticos internos

Cada candidato del ranking bruto recibe exactamente una razón:

- `SELECTED_PRIMARY`
- `SELECTED_SECONDARY`
- `SELECTED_CONTEXT`
- `REJECTED_RELEVANCE_FAIL`
- `REJECTED_ROLE`
- `NOT_SELECTED_CAPACITY`
- `NOT_SELECTED_USEFULNESS`

Son metadatos internos de depuración. No se exponen al usuario.

---

## 7. Pendientes sin resolver en esta fase

- `EXACT_FALSE_PRODUCTION_POLICY = PENDING`. Un artículo `FALSE` pedido por número se localiza por el canal exacto, pero queda como `CONTEXT_ONLY` y no crea suficiencia. La política final de producción no se resuelve aquí.
- `NON_NORMATIVE_STATUS_MODEL = PENDING`. Jurisprudencia y doctrina no reciben validez precedencial ni doctrinal a partir de `es_norma_vigente`.
- Un `EXCLUDED` nunca entra al paquete; tampoco se rehabilita por similitud.
- En la ruta exacta, cuando el exacto resuelve, el pool bruto contiene un único candidato, como en producción. La protección de PRIMARY + PASS no aplica entre candidatos exactos y semánticos en ese caso.

---

## 8. Harness de sombra: métricas

Comparación sobre el mismo corpus, las mismas consultas y los mismos candidatos brutos:

- **A** = top-k del ranking bruto (comportamiento V4.0).
- **B** = paquete de evidencia seleccionado.

Corridas: 23 consultas del laboratorio V4.0-A (k=5) y 14 casos adversariales sintéticos (37 corridas en total).

| Métrica | Resultado |
|---|---|
| `PRIMARY_PASS_DISPLACED` | 0 |
| `RELEVANCE_FAIL_IN_MATERIAL_PACKET` | 0 |
| `EXCLUDED_IN_PACKET` | 0 |
| `SUFFICIENCY_EVIDENCE_SET_MATCHES_PACKET` | sí |
| PRIMARY + PASS en top-k (A) → en paquete (B) | 7 → 10 |
| Tasa de contexto en top-k (A) → paquete (B) | 0.347 → 0.323 |
| Tasa de secundario en top-k (A) → paquete (B) | 0.083 → 0.046 |
| Diversidad media de fuentes (A) → (B) | 1.70 → 1.54 |
| Tasa de paquete vacío (A) → (B) | 0.135 → 0.162 |
| Suficiencia en pool vs en paquete: desacuerdos | 0 |
| Reproducibilidad | sí |

**Sobre la tasa de paquete vacío:** el aumento proviene de un único caso, C06, en el que todo el top-k bruto es `FAIL`. Es el rechazo previsto por la política, no una regresión.

**Invariante de los resultados:** `SHADOW_RESULTS_DO_NOT_PROVE_PRODUCTION_BENEFIT`. Las consultas, los casos y los corpus son sintéticos y fueron diseñados junto con el algoritmo. Estos números no son evidencia de calidad en producción.

---

## 9. Límites declarados

- El corpus y las consultas son sintéticos. No hay validación jurídica de las respuestas esperadas.
- Ningún resultado de sombra autoriza integración en producción.
- No se ejecutó ninguna llamada a modelo. No se comparan modelos en esta fase.
