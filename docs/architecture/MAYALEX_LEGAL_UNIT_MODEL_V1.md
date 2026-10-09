# MayaLex — Modelo de unidad legal V1

- **Base:** `origin/main` = `c3847d9297b63dc8b45b700ec7fd82d471f0171f`
- **Fecha:** 2026-10-09
- **Estado:** propuesta de diseño. No hay migración, no hay cambio de runtime, no hay ingesta.
- **Regla de evidencia:** esta fase usa sólo código, scripts, migraciones y el registro de adjudicación versionados. No se consultó la base de producción.

---

## 1. Qué corpus está representado en el repositorio

| Fuente de evidencia | Qué muestra sobre la granularidad | Limitación |
|---|---|---|
| `scripts/ingesta-cpp.ts` (≈L280–360, ≈L472) | Segmenta por encabezado `Artículo N` con regex `PATRON_LIMITE_SEGMENTACION`. Valida que el contenido empiece por `Artículo N`. Cada unidad recibe `num_articulo`, `fuente`, `es_norma_vigente`, `fuente_tipo='codigo'` | Sólo código de Procedimiento Penal. No hay evidencia de la misma regla para otros instrumentos |
| `scripts/ingesta-civil.ts`, `ingesta-notariado.ts`, `ingesta-d102-2018.ts`, `ingesta-comercio.ts` | Existen; no se leyeron en detalle en esta fase | Pendiente de inspección |
| `scripts/seed_vectores.py` | Copia filas de ChromaDB a `biblioteca_vectores` leyendo metadatos `articulo`, `fuente`. No define granularidad | Granularidad de los 76.381 chunks legados: NO VERIFICADA |
| `docs/corpus/MAYALEX_CANONICAL_ADJUDICATION_REGISTER_V1.md` | CA-01 (94 filas Notariado, 7 `es_norma_vigente=false`), CA-02 (8.366 filas `fuente IS NULL`), CA-03 (995 filas `CPC_TEXTO_BASE_D211-2006`, 916 artículos solapados con el CPC principal) | Conteos documentales de un corte del 2026-10-01 |
| `lib/legal-retrieval/exact-resolver.ts:436-442` | Exige encabezado del artículo o identidad sin encabezado (allowlist). Si el chunk no tiene encabezado, la ruta exacta lo descarta | Es una defensa en lectura, no una garantía de granularidad |

**Conclusión de la fase 2:** la granularidad correcta sólo está garantizada en el código de ingesta CPP. Para el resto del corpus, la unidad almacenada es desconocida.

---

## 2. Clasificación de riesgos de chunking

Cada riesgo se marca como EVIDENCIADO (hay evidencia en el repo), INFERIDO (razonamiento sobre el diseño, sin medición) o NO VERIFICADO.

### A. ARTICLE_SPLIT_RISK — un artículo partido en varios chunks

- **Descripción:** un artículo largo se fragmenta; el chunk con la parte operativa pierde el encabezado y la ruta exacta no lo acepta.
- **Evidencia:** `exact-resolver.ts:436-442` descarta chunks sin encabezado (salvo allowlist). El semántico no tiene esa protección.
- **Estado:** EVIDENCIADO en lectura. Frecuencia en el corpus legado: NO VERIFICADO.

### B. CROSS_ARTICLE_MERGE_RISK — un chunk contiene dos artículos

- **Descripción:** un chunk mezcla el final de un artículo con el inicio del siguiente. Una cita podría atribuir texto al artículo equivocado.
- **Evidencia:** `ingesta-cpp.ts` corta en cada encabezado (regex con `gm`). Esto mitiga el riesgo para CPP.
- **Estado:** MITIGADO por código en CPP. Riesgo en corpus legado: NO VERIFICADO.

### C. EXCEPTION_SEPARATION_RISK — excepciones separadas de la regla

- **Descripción:** "salvo", "excepto", "no se aplicará" aparecen en un párrafo o artículo distinto de la regla que modifican. Recuperar la regla sin la excepción produce una conclusión incorrecta.
- **Evidencia:** no existe ningún modelo de excepción en `lib/`. Búsqueda de `EXCEPCIONA` sólo aparece en documentación.
- **Estado:** EVIDENCIADO (ausencia de modelo). Frecuencia: INFERIDO alto en derecho procesal.

### D. REMISSION_CONTEXT_RISK — remisiones sin el texto remitido

- **Descripción:** "conforme al artículo X" o "en los términos del párrafo Y". El texto recuperado cita X pero no lo incluye; la respuesta puede afirmar lo que dice X sin evidencia.
- **Evidencia:** no hay relación entre unidades en el esquema (`REMITE_A` no aparece en `lib/`). La ruta semántica sólo recupera X si su embedding es cercano a la consulta.
- **Estado:** EVIDENCIADO (ausencia de relación).

### E. SOURCE_IDENTITY_RISK — unidad sin fuente o con fuente ambigua

- **Descripción:** filas con `fuente IS NULL`, o con `fuente` que no identifica el instrumento. Una cita sin identidad documental no es verificable.
- **Evidencia:**
  - CA-02: 8.366 filas `fuente IS NULL` (registro CLO, no medido aquí).
  - Ruta exacta: exige `fuente_tipo='codigo'` y regex de identidad (`exact-resolver.ts:243-251`).
  - Ruta semántica: excluye `fuente !== null` **después** de la RPC (`semantic-retriever.ts:187`).
- **Estado:** EVIDENCIADO. La asimetría entre rutas es un riesgo de capacidad (filas que consumen el embudo) y de consistencia.

### F. DUPLICATE_MIRROR_RISK — mismo texto en dos fuentes

- **Descripción:** el mismo artículo aparece en dos instrumentos o dos ediciones. Ocupa dos posiciones del top-k y la respuesta puede citar cualquiera.
- **Evidencia:**
  - CA-03: 995 filas de `CPC_TEXTO_BASE_D211-2006`; los 916 artículos distintos solapan con el CPC principal (registro CLO).
  - Deduplicación en semántico: sólo por `id` (`semantic-retriever.ts:152-156`). Dos filas con igual `num_articulo` y texto distinto no se unifican.
  - `hashFragmento` incluye `fuente`, así que filas idénticas de fuentes distintas no colisionan, pero tampoco se deduplican.
- **Estado:** EVIDENCIADO. El impacto en respuestas: NO VERIFICADO.

---

## 3. Modelo canónico propuesto: LegalUnit

Forma sugerida por el encargo, con la correspondencia al estado actual.

| Campo | Tipo propuesto | Existe hoy | Dónde | Notas |
|---|---|---|---|---|
| `jurisdiction` | string | Sí (`jurisdiccion`) | `biblioteca_vectores` | Ya se filtra con `'HN'` en D6b |
| `instrument_id` | string | **No** | — | Hoy sólo hay `fuente` (texto libre) |
| `instrument_title` | string | Parcial | `fuente` | En ingesta CPP, `fuente` = `FUENTE_CANONICA` (`ingesta-cpp.ts:561`) y la edición va aparte (`EDICION_FUENTE`, L545). Formato en el resto del corpus: NO VERIFICADO |
| `decree_number` | string | **No** | — | Aparece sólo en texto de CA-01 y en `archivo_src` (legado) |
| `source_type` | enum | Sí (`fuente_tipo`) | `biblioteca_vectores` | Verificado en código: `codigo` (`ingesta-cpp.ts:566`). Otros valores: NO VERIFICADO. Nulo en legado (CA-02) |
| `normative_rank` | enum | **No** | — | Ver `MAYALEX_LEGAL_RANKING_V1.md` |
| `materia` | string | Sí | `biblioteca_vectores.materia` | No se devuelve en la RPC (migración L97) |
| `article_number` | string | Sí (`num_articulo`) | `biblioteca_vectores` | Bis en formato `26-A` según ingesta CPP (`ingesta-cpp.ts:401-410`). Formato del resto del corpus: NO VERIFICADO |
| `article_parent` | string | **No** | — | Necesario para `LIBRO/TÍTULO/CAPÍTULO` |
| `section` | string | **No** | — | Los encabezados estructurales se detectan en ingesta (`ingesta-cpp.ts:288`) pero no se guardan como campo |
| `paragraph` | int | **No** | — | |
| `inciso` | string | **No** | — | |
| `numeral` | string | **No** | — | |
| `text` | string | Sí (`contenido`) | `biblioteca_vectores` | |
| `source_url` | string | Parcial | `metadata` JSON | No verificado para todas las filas |
| `source_hash` | string | Parcial | `metadata.hash_texto_sha256` (CA-01) | Sólo verificado en el conjunto CA-01 |
| `temporal_status` | enum | Parcial | `es_norma_vigente` (booleano) | Booleano insuficiente: no distingue `derogado`, `reformado`, `pendiente` |
| `canonical_status` | enum | **No** | Registro CLO (fuera de la base) | El registro usa `LEGAL_STATUS_UNRESOLVED`, `PARTIAL`, etc. No está en la tabla |
| `retrieval_role` | enum | **No** | — | Propuesta: `PRIMARY`, `SECONDARY`, `DOCTRINE`, `EXCLUDED`, `CANDIDATE` |

**Observaciones de diseño:**

1. `es_norma_vigente` no basta. El registro CLO distingue `INGESTED ≠ VERIFIED ≠ VIGENTE` (E3, CLOSED). La base tiene un solo booleano para tres estados.
2. `canonical_status` vive fuera de la base. Para que el retrieval lo use, debe materializarse como columna **o** como tabla de referencia versionada. Cualquiera de las dos es un cambio de esquema, fuera de esta fase.
3. `retrieval_role` reemplaza exclusiones dispersas (`revision_pendiente`, `fuente IS NULL`, `doc_*`) por un único campo auditable. Hoy esas exclusiones están en tres lugares distintos (ver `CURRENT_STATE.md`, sección 4).

---

## 4. Riesgo de sobreingeniería

El modelo completo no debe implementarse de una vez. El orden recomendado:

1. **Primero, medir.** Consulta de solo lectura que cuente filas por `fuente IS NULL`, `fuente_tipo`, `es_norma_vigente`, `revision_pendiente`, y por `num_articulo` duplicado dentro de un mismo `fuente`. Requiere acceso de lectura vigente.
2. **Después, canonizar identidad.** `instrument_id` y `decree_number` como tabla de referencia, poblada desde el registro CLO, sin tocar `biblioteca_vectores`.
3. **Por último, relaciones y estado.** Sólo cuando la identidad sea estable.

---

## 5. Lo que este modelo no resuelve

- Calidad de la extracción de texto desde PDF o DOCX (no se evaluó).
- Versiones históricas de un artículo (no hay tabla de versiones).
- Texto de Gaceta: el registro CLO (E8) mantiene filas D.77-2006 como candidato físico hasta tener el texto oficial. Este modelo no lo cierra.
