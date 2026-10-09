# MayaLex — Ranking jurídico V1

- **Base:** `origin/main` = `c3847d9297b63dc8b45b700ec7fd82d471f0171f`
- **Fecha:** 2026-10-09
- **Estado:** diseño determinista. No implementado. No cambia el orden actual de resultados.

---

## 1. Estado actual del ranking

- El orden de los fragmentos semánticos es **similitud coseno** (`buscar_biblioteca_v2`, `ORDER BY embedding <=> query_embedding`, migración L109).
- `relevancia` = `similarity` de la RPC (`semantic-retriever.ts:96`).
- La fusión con los 3 mejores vigentes (`semantic-retriever.ts:138, 152-156`) es el único componente no semántico, y sólo garantiza presencia, no orden.
- El reranker Cohere, si está activo, reordena por relevancia consulta-documento (`rerank.ts`). Está detrás de `flag_rerank`, que por defecto es `false`.
- La ruta exacta devuelve **un** resultado con `relevancia: 1` (`exact-resolver.ts:458`). No compite con el semántico.

**Conclusión:** hoy la autoridad normativa, la vigencia y la identidad del instrumento no intervienen en el orden. Un fragmento no vigente con alta similitud puede subir.

---

## 2. Principios

1. **La similitud semántica nunca determina el rango por sí sola.** Sólo desempata dentro de un nivel.
2. **No existe una puntuación de confianza única.** Cada criterio es un componente explicable que se guarda en el objeto de evidencia.
3. **Los niveles son ordenados.** Un nivel superior no se compensa con un nivel inferior.
4. **Los criterios duros excluyen; los blandos ordenan.** Un candidato que falla un criterio duro no entra al ranking.
5. **El rango no crea evidencia.** Un fragmento de baja autoridad no se convierte en fundamento sólo por estar bien rankeado.

---

## 3. Criterios duros (exclusión)

Un candidato se descarta si cumple cualquiera de estas condiciones. Todas existen hoy en código, salvo las marcadas.

| Criterio | Fuente en código | Estado |
|---|---|---|
| Artefacto de anonimización sin limpiar | `primitives.ts:25-27`; `semantic-retriever.ts:185` | Existe |
| Código HN confirmado no vigente (D6b) | `semantic-retriever.ts:32-34, 186` | Existe |
| Sin fuente (`fuente IS NULL`) | `semantic-retriever.ts:187` (post-RPC); `search.ts:107` (SQL, ruta exacta) | Existe |
| `revision_pendiente = true` | migración L108; `search.ts:109` | Existe |
| Identidad documental no coincide con el instrumento pedido | `exact-resolver.ts:243-251, 442` | Existe (ruta exacta) |
| Sin encabezado de artículo en ruta exacta | `exact-resolver.ts:439-441` | Existe |
| Tipo `doc_*` (E7) | No existe filtro por tipo en ruta semántica | **Falta** |
| Unidad sin `retrieval_role` válido | No existe el campo | Depende del modelo L1 |

---

## 4. Componentes de ordenación (en orden de prioridad)

Cada nivel se evalúa sólo si el anterior empata. Los niveles no se suman.

### Nivel 1 — Identificador exacto

- **Criterio:** el candidato coincide con el número de artículo **y** con el instrumento solicitado por el usuario.
- **Valor:** `EXACT_MATCH` / `NO_MATCH`.
- **Fuente:** `resolverArticuloExacto`.
- **Nota:** una coincidencia exacta de número sin instrumento no es `EXACT_MATCH` (`search.ts:289-305`).

### Nivel 2 — Relación con el artículo objetivo

- **Criterio:** existe una relación verificada entre el candidato y el artículo objetivo (`REFORMA_A`, `DEROGA`, `SUSTITUYE`, `REMITE_A`, `REGLAMENTA`, `INTERPRETA`, `COMPLEMENTA`, `EXCEPCIONA`).
- **Valor:** tipo de relación + estado de verificación.
- **Regla:** sólo relaciones `VERIFIED` puntúan en este nivel. Las `UNVERIFIED` sólo amplían candidatos (ver `BLUEPRINT.md`, sección 3.4).
- **Depende de:** tabla `legal_relation`. **No existe hoy.**

### Nivel 3 — Autoridad normativa

- **Criterio:** rango del instrumento en la jerarquía normativa.
- **Valor:** entero, mayor = más autoridad.
- **Fuente:** la jerarquía declarada en `lib/system-prompt.ts:133` (sección "JERARQUÍA NORMATIVA — ORDEN DE PRELACIÓN INDEROGABLE"). El contenido de esa sección no se transcribe aquí: debe fijarse en una tabla versionada antes de usarse.
- **Depende de:** `normative_rank` en el modelo L1. **No existe hoy.**
- **Regla:** no se compara autoridad entre instrumentos sin relación de jerarquía declarada. Dos instrumentos del mismo rango empatan.

### Nivel 4 — Estado temporal

Orden fijo, de mayor a menor:

1. `VIGENTE_VERIFICADO`
2. `VIGENTE_NO_VERIFICADO` (ingerido, sin verificación de fuente oficial)
3. `REFORMADO_CON_TEXTO_VERIFICADO`
4. `PENDIENTE_ADJUDICACION` (E2, E5, E6 en el registro CLO)
5. `NO_VIGENTE` — nunca llega a este nivel si D6b aplica; se conserva para resolución de conflictos

**Hoy:** sólo existe `es_norma_vigente` (booleano). Los niveles 2–4 se reducen a dos valores. El registro CLO exige distinguir `INGESTED ≠ VERIFIED ≠ VIGENTE` (E3, CLOSED).

### Nivel 5 — Identidad de jurisdicción y materia

- **Criterio binario:** `jurisdiccion = 'HN'` y `materia` coincide con la detectada en la consulta.
- **Fuente:** `detectarMateriaSemanticaAmpliada` (`exact-resolver.ts:129`) y columnas de la base.
- **Nota:** `materia` no se devuelve por la RPC (migración L97). Hoy el filtro se aplica en SQL, no en el ranking.

### Nivel 6 — Completitud de la cita

- **Criterio:** la unidad tiene `instrument_id`, `article_number`, `source_hash` y `source_url` (o el equivalente de la fase actual: `fuente`, `num_articulo`, `hash`).
- **Valor:** `COMPLETA` / `PARCIAL` / `INCOMPLETA`.
- **Regla:** una unidad `INCOMPLETA` no puede ser `PRIMARY` (ver `retrieval_role`). Puede ser contexto.

### Nivel 7 — Coincidencia léxica

- **Criterio:** `ts_rank` sobre `contenido` (cuando exista el canal léxico).
- **Uso:** desempate dentro del mismo nivel 6. No puede subir un candidato sobre un nivel superior.

### Nivel 8 — Similitud semántica

- **Criterio:** `similarity` de `buscar_biblioteca_v2` o `relevancia` de Cohere si el flag está activo.
- **Uso:** desempate final. Nunca determina el orden por encima de los niveles anteriores.

---

## 5. Penalización por duplicado o espejo

- **Clave de duplicado:** `(instrument_id, article_number, source_hash)`.
- **Regla:** dentro de una misma clave se conserva una unidad (la de mayor nivel 4 y 6). Las demás se marcan `MIRROR` y no se citan.
- **Caso conocido:** CA-03 (995 filas `CPC_TEXTO_BASE_D211-2006`, 916 artículos solapados con el CPC principal). Sin esta penalización, ambos textos pueden ocupar el top-k.
- **Hoy:** no existe. La deduplicación actual es por `id` (`semantic-retriever.ts:152-156`).

---

## 6. Cadena de confianza

Cada eslabón se registra en el objeto de evidencia. Un eslabón no verificado no bloquea la respuesta, pero la limita y lo declara.

| Eslabón | Pregunta | Qué se registra | Hoy |
|---|---|---|---|
| **Source trust** | ¿La fuente existe y es identificable? | `fuente`, `fuente_tipo`, `source_hash` | Parcial |
| **Citation trust** | ¿La cita apunta al artículo y texto exactos? | `num_articulo`, encabezado verificado, `hash` | Parcial (encabezado sólo en ruta exacta) |
| **Legal trust** | ¿El texto está vigente y es canónico? | `temporal_status`, `canonical_status` | Booleano |
| **Reasoning trust** | ¿Cada afirmación del modelo cita un eslabón anterior? | IDs de evidencia por afirmación | No existe; las citas son por fragmento |
| **Conclusion trust** | ¿La conclusión es suficiente o hay abstención? | `sufficiency` por subpregunta | `evidenceCount > 0` |

---

## 7. Forma del objeto explicable

```
RankedCandidate {
  unit_id
  retrieval_role            // PRIMARY | SECONDARY | CONTEXT | MIRROR | EXCLUDED
  components {
    exact_match             // NIVEL 1
    relation                // NIVEL 2: tipo + verification
    authority               // NIVEL 3: normative_rank
    temporal_status         // NIVEL 4
    jurisdiction_materia    // NIVEL 5
    citation_completeness   // NIVEL 6
    lexical_rank            // NIVEL 7
    semantic_similarity     // NIVEL 8
  }
  exclusions: string[]      // criterios duros que lo descartaron
  mirror_of?: unit_id
}
```

**Lo que no contiene:** un campo `confidence` o `score` agregado. Si se necesita un resumen para depuración, se calcula en la capa de logs, nunca se expone al modelo ni al usuario como medida de certeza jurídica.

---

## 8. Validación del ranking

- Conjunto de prueba: casos del benchmark (`MAYALEX_RETRIEVAL_V4_BENCHMARK_PLAN.md`), con orden de referencia establecido por revisión humana **antes** de ejecutar cualquier variante.
- Métrica de ranking: posición del artículo correcto en el top-k, por categoría de consulta.
- Prueba de no regresión: los casos ya cubiertos en `tests/rag-*.test.ts` deben seguir pasando.
- No se acepta un cambio de ranking que mejore la similitud media y empeore la posición de un artículo correcto.
