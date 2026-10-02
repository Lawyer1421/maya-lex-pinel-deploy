# MAYALEX — CORPUS GAP ANALYSIS (PROVISIONAL)
## Brecha entre Inventario Canónico (13 instrumentos) y Estado Real DB

⚠️ **STATUS: PROVISIONAL** — Higiene e identidad pendientes. NO PRODUCE INGESTA NI WRITES.

**Fecha:** 2026-09-30  
**Proyecto:** `thgrhueckkjdutjvcufp` (Maya Lex Pro)  
**Tabla:** `public.biblioteca_vectores`  
**Total filas en DB (verificado):** 84,204  
**Fuentes identificadas:** 24+ (incluyendo NULL)  
**Revisión pendiente:** 41 rows  

**Aggregates (verified from production):**
- `fuente IS NULL`: 8,366 filas (9.9% del corpus)
- `es_norma_vigente = true`: 7,857 filas
- `es_norma_vigente = false`: 9,090 filas
- `es_norma_vigente = NULL`: 67,257 filas (79.9% del corpus)

**Próxima fase:** Hygiene / Identity Queries (ver sección VI)

---

## EXECUTIVE SUMMARY

### Corpus composition verified from production
- **Total:** 84,204 rows (confirmed)
- **fuente IS NULL:** 8,366 filas (9.9%)
- **es_norma_vigente = true:** 7,857 (9.3%)
- **es_norma_vigente = false:** 9,090 (10.8%)
- **es_norma_vigente = NULL:** 67,257 (79.9% — requires editorial audit)

### Canonical instruments mapping
- **Status:** PROVISIONAL — pending H5 identity reconciliation
- **Next step:** Execute H5 decree/alias discovery query to resolve presence of 7 instruments

### CPC identity (UNRESOLVED)
- Multiple ingestion layers observed: Codigo Procesal Civil, CPC_TEXTO_BASE_D211-2006, CPC_COMENTADO_ROMERO_2024
- **Status of distinct article counts:** REQUIRES_FURTHER_AUDIT (direct measurement needed)
- **Repeated num_articulo:** May be legitimate chunking (paragraphs) or segmentation variance — NOT adjudicated as "duplication"

### Non-normative corpus (doc_* prefixed)
- Approximately 10+ sources with fuente LIKE 'doc_%' identified
- **Purpose unclear:** UNRESOLVED whether intentional non-normative corpus (demandas/análisis) or incomplete ingestion
- **Action required:** Metadata audit via H2 query

---

## I. ESQUEMA CONFIRMADO

```
id (text)
coleccion (text)
materia (text)
contenido (text)
num_articulo (text)                ← núcleo de segmentación
fuente (text)                      ← fuente de verdad para correlación
metadata (jsonb)
embedding (USER-DEFINED)            ← vectores para RAG
created_at (timestamp with time zone)
jurisdiccion (text)
fuente_tipo (text)
es_norma_vigente (boolean)         ← necesita auditoría: muchos NULL
revision_pendiente (boolean)        ← 41 rows flagged para revisión
```

**Observación:** Schema es correcto y alineado con especificación. No hay columnas de `norm_id` o `numero_articulo` — la fuente real de verdad es `(fuente, num_articulo)`.

---

## II. INVENTARIO FÍSICO POR FUENTE

⚠️ **INCOMPLETE DATA** — Gap Analysis was based on partial TOP-B output from initial SQL Editor queries.
Full inventory requires direct execution of H2 hygiene query.

### Verified from production aggregates:
- **fuente IS NULL:** 8,366 filas
- **Top source by volume:** Will be determined by H2 query execution
- **doc_* prefixed sources:** Approximately 10+ identified; full inventory requires H2

### Key unresolved questions:
- Actual distinct num_articulo count per source (esp. CPC layers)
- Whether sources absent from TOP-B output are truly zero or truncated from view
- Metadata/purpose of doc_* prefixed sources (non-normative corpus vs. incomplete ingestion?)

---

## III. VIGENCIA (es_norma_vigente) DISTRIBUTION

### Verified aggregate from production:
- **es_norma_vigente = true:** 7,857 rows (9.3%)
- **es_norma_vigente = false:** 9,090 rows (10.8%)
- **es_norma_vigente = NULL:** 67,257 rows (79.9%)

### Important note on semantics:
- `es_norma_vigente = false` **does NOT automatically mean "DEROGADO"** (repealed)
- `es_norma_vigente = NULL` **does NOT mean invalid or absent**
- Both require editorial interpretation to determine true legal status
- Do NOT infer legal conclusions from boolean alone

### Distribution by materia:
⚠️ **INCOMPLETE** — Gap Analysis section C.1 used truncated TOP-B output.
Full distribution by materia requires direct execution of H1 hygiene query.

### Key observation:
67,257 rows (79.9%) have `es_norma_vigente = NULL` → requires CLO editorial audit to determine:
- Are these legitimately unmarked, indeterminate, secondary reglations, or error?
- Should they be marked definitively or remain NULL by design?

---

## IV. REVISIÓN PENDIENTE

**Total flagged: 41 rows** (`revision_pendiente = true`)

These rows represent 0.05% of corpus.
Purpose: Editorial/content quality audit required before RAG indexing.

---

## V. REPEATED num_articulo ANALYSIS

### Observation (UNRESOLVED):
Multiple ingestion layers of CPC identified with varying num_articulo distributions.
Repeated `num_articulo` values within single source may indicate:
- Legitimate chunking (paragraphs of multi-paragraph articles)
- Segmentation variance between ingestion batches

**Status:** REQUIRES_FURTHER_AUDIT via H3 query (no content retrieval)

### Repeated num_articulo interpretation:
- May represent legitimate chunking (paragraphs), segmentation variance, or data quality issue
- CLO must adjudicate after H3 identity/repetition measurements

---

## VI. CLAIM STATUS MODEL

All unresolved statements classified as:
- **CONFIRMED** — verified against production data
- **REFUTED** — contradicted by production data
- **PARTIALLY_CONFIRMED** — some evidence present but not complete
- **REQUIRES_FURTHER_AUDIT** — data available but needs direct measurement
- **UNRESOLVED** — insufficient information to adjudicate

### Claims awaiting validation via H1–H5 queries

**1. `doc_6cfb720b` (635 rows) = Código Penal duplicate?**
- **Status:** UNRESOLVED
- **Why:** Row count coincidence does not confirm identity
- **Validation:** H2 query → compare metadata, materia, coleccion, num_articulo range

**2. Triples (748, 354 filas) = unintended duplicates?**
- **Status:** UNRESOLVED
- **Why:** Volume coincidence is suggestive but not conclusive
- **Validation:** H2 query → examine doc_ad07e062, doc_c02b1028, doc_2a5252dd metadata

**3. Notariado: Reconcile observed vs historical manifest**
- **Status:** REQUIRES_FURTHER_AUDIT
- **Observation:** 94 num_articulo observed in production; 111 rows (Reglamento del Código del Notariado also observed separately)
- **Task:** H4 query → generate ordered list of 94 num_articulo; compare against 98/108 accepted IDs in historical manifest
- **Note:** Do NOT assume missing count; reconciliation determines if any accepted IDs are absent from DB

**4. CPC identity / repeated num_articulo (max 45x) = chunking or error?**
- **Status:** REQUIRES_FURTHER_AUDIT
- **Why:** Legitimate segmentation variance vs. duplication error not yet determined
- **Validation:** H3 query → measure distinct num_articulo + repetition distribution per layer

**5. CPC_COMENTADO_ROMERO_2024 = doctrina (es_norma_vigente should = false)?**
- **Status:** REQUIRES_FURTHER_AUDIT (asserted in CLAUDE.md, needs DB validation)
- **Validation:** H3.3 query → verify es_norma_vigente distribution for Romero

**6. Missing Decrees (31/2015, 35/2013, 73/96, 102/2018, 124/92, 73/1950, etc.)**
- **Status:** REQUIRES_FURTHER_AUDIT
- **Why:** TOP-B output was truncated; sources may exist under different aliases
- **Validation:** H5 query → search fuente/metadata for candidate matches (ILIKE, no legal adjudication)

**7. NULL fuente (8,366 = 9.9%) = intentional (demandas) or ingestion error?**
- **Status:** UNRESOLVED
- **Why:** Purpose not documented; requires identity/metadata reconciliation
- **Validation:** H1 query → NULL distribution by materia, coleccion, fuente_tipo

### Legal status model (SEMANTIC, not technical)

⚠️ **IMPORTANT:** Do NOT infer legal status solely from es_norma_vigente boolean.

```
es_norma_vigente = true   → Marked as current/valid; requires editorial confirmation
es_norma_vigente = false  → Marked as not-current; requires audit (derogated? superseded? archived?)
es_norma_vigente = NULL   → Unmarked; status unknown; requires CLO editorial determination
```

---

## VII. CANONICAL INSTRUMENTS MAPPING (PROVISIONAL)

⚠️ **BASIS:** Initial TOP-B query output (truncated view; full inventory via H2 query).

### Tentative mapping (REQUIRES_FURTHER_AUDIT)

**Likely present (based on TOP-B matches):**
- HN_CODIGO_CIVIL → "Código Civil de Honduras"
- HN_CODIGO_FAMILIA → "Codigo de Familia"
- HN_CODIGO_NOTARIADO_D353_2005 → "Código del Notariado de Honduras"
- HN_CPC_D211_2006 → "CPC_TEXTO_BASE_D211-2006" (also: Codigo Procesal Civil, CPC_COMENTADO_ROMERO_2024 as aliases/variants)
- HN_CPP_D9_99E → "Código Procesal Penal de Honduras"

**Unconfirmed absent (TOP-B truncation; may exist under different name):**
- HN_CODIGO_COMERCIO_D73_1950
- HN_DECRETO_31_2015, 35_2013, 73_96, 102_2018, 124_92
- HN_LEY_ORGANIZACION_TRIBUNALES

**Observed (physical DB presence confirmed, subject to reconciliation):**
- HN_RESOLUCION_PCSJ_17_2012 → Reglamento del Código del Notariado
  - DB state: 111 rows / 111 distinct num_articulo observed in production
  - Physical presence: confirmed
  - Canonical legal-identity equivalence: remains subject to H4 identity reconciliation

**How to resolve:** H5 query → search metadata for decree aliases and candidate names.

### IMPORTANT CAVEAT:
Absence from TOP-B output does NOT confirm nonexistence. Must execute H5 discovery before adjudicating presence/absence of any instrument.

---

## VIII. UNCLASSIFIED PHYSICAL CORPUS

### NULL fuente (8,366 rows = 9.9% of total)

Purpose UNRESOLVED: Could be
- Intentional non-normative corpus (demandas, análisis, sentencias)
- Incomplete ingestion (sources dropped or not assigned)
- Composite/mixed sources pending classification

**Distribution by metadata:** Requires H1 query execution

**Impact:** 
- 9.9% of corpus invisible to fuente-filtered searches
- Affects explainability if used in RAG responses

---

## IX. ROADMAP CLO (Chief Legal Officer)

Orden de prioridades con salvaguardas ejecutivas:

### Bloque 1: HIGIENE / IDENTIDAD (Semana 1–2)
**Status:** Validación de claims; NO produce ingesta.

1. **Higiene: Fuente NULL (8,366 filas)**
   - Execute H1 query: NULL distribution by materia, coleccion, fuente_tipo, vigencia
   - CLO determines: maintain as intentional corpus OR reclassify to known instruments

2. **Higiene: doc_* (17 documentos)**
   - Audit metadata of all doc_* sources (H2 query results)
   - Determine if doc_* sources represent intentional non-normative corpus (demandas/análisis) or incomplete ingestion
   - CLO decision: maintain as separate corpus OR reclassify to known instruments

3. **Higiene: CPC capas múltiples**
   - Validate CPC_COMENTADO_ROMERO_2024 es_norma_vigente distribution (H3.3 query)
   - Measure repeated num_articulo counts and max occurrences per layer (H3.4 query)
   - CLO decision: designate Romero as reference/commentary (not primary law) in metadata

4. **Higiene: Vigencia NULL distribution**
   - Execute H1 query: NULL vigencia breakdown by materia
   - CLO determines: mark definitively OR maintain NULL with editorial note

### Bloque 2: COMERCIO (Semana 2–3)
**Status:** Ingesta solamente si higiene de Bloque 1 completa.

1. **Cierre 418 / 1661-1662**
   - Búsqueda física del Código de Comercio (Decreto 73-1950)
   - Verificar si artículos 1–1662 están en fuentes públicas (URL oficial)
   - Decidir: ¿segmentar 1–418 (Parte I) vs 1661–1662 (final), o integrar 1–1662 limpio?

2. **Integración D.284-2013 (reforma Comercio)**
   - Confirmar coexistencia con D.73-1950
   - Marcar qué artículos de Comercio fueron reformados por D.284-2013
   - Decisión: crear fuente "Código de Comercio (Decreto 73-1950, vigente per D.284-2013)" con vigencia editada

3. **Crear fuente Comercio limpia (CC-2 ou nomenclatura definitiva)**
   - NO hacer merge directo con histórico (evitar contaminación)
   - Ingestar de-novo desde fuente oficial
   - Marcar cada artículo: vigente (D.73-1950), reformado (D.284-2013), derogado

### Bloque 3: NOTARIADO (Semana 3–4)
**Status:** Luego de Comercio; validación de identidad 94 vs historical manifest primero.

1. **Reconciliación: DB 94 num_articulo vs historical accepted IDs**
   - Execute H4 query → generate ordered list of 94 num_articulo observed in DB
   - Compare against historical manifest (98? 108? confirm exact scope)
   - Identify article IDs that are accepted in manifest but absent in DB (if any)
   - **Do NOT assume count of missing articles until comparison complete**

2. **Ingest ONLY articles confirmed missing by reconciliation**
   - NO reopening entire Código del Notariado
   - Ingest ONLY article IDs identified as missing by H4 vs. manifest comparison
   - Preserve existing 94; avoid redundant ingestion
   - **Note:** Reglamento del Código del Notariado already observed: 111 rows / 111 distinct num_articulo in DB; may be separate instrument or consolidation

### Bloque 4: DECRETOS / TRIBUNALES / KERNEL (Semana 4+)
**Status:** Solo después de Bloques 1–3 completos.

1. **Decretos faltantes (31/2015, 35/2013, 73/96, 102/2018, 124/92)**
   - Buscar identidad física primaria primero (URL, fuente oficial)
   - Evitar doble ingesta de variantes
   - Marcar vigencia con precisión (reformados, derogados)

2. **Ley Organización Tribunales**
   - Validar si existe fuente simple o distribuida en múltiples leyes

3. **Resolución PCSJ 17-2012**
   - Confirmar clasificación (¿es decreto, resolución, o ambos?)

4. **Kernel / PRC-1**
   - Siguen pausados hasta que Bloques 1–3 completen

### Restricciones ejecutivas

- ❌ NO PRODUCTION WRITES durante Bloque 1 (validación solamente)
- ❌ NO COMMERCIO_MERGE sin confirmación de higiene
- ❌ NO INGESTION de decretos hasta Notariado reconciliado
- ❌ NO RE-INGESTION histórica sin auditoría de deduplicación previa
- ✅ DOCUMENTATION_COMMIT = sí (este análisis es Evidence)
- ✅ HYGIENE_QUERIES = sí (pasar a siguiente fase)

---

## X. RECOMENDACIONES PRIORITARIAS

### Estado provisório: Validación solamente (sin writes, ingesta, nor Comercio merge)

Este documento es **Evidence** de estado del corpus.  
Proceeder a Bloque 1 (Hygiene/Identity) requiere aprobación CLO.

**Próxima acción:** Ejecutar hygiene queries (ver sección XI)

---

## XI. HYGIENE QUERIES (Próxima fase)

Execute in SQL Editor via [docs/corpus/hygiene-identity-queries.sql](docs/corpus/hygiene-identity-queries.sql):

- **H1:** NULL fuente distribution (by materia, coleccion, fuente_tipo, vigencia, revision_pendiente)
- **H2:** doc_* inventory (metadata, row/articulo counts)
- **H3:** CPC layer identity (distinct num_articulo counts, repetition distribution, es_norma_vigente)
- **H4:** Notariado reconciliation (ordered num_articulo list for comparison vs manifest)
- **H5:** Decree/alias discovery (metadata search for missing instruments)

---

## XII. CORPUS COMPOSITION SUMMARY (VERIFIED)

| Metric | Verified Value | Status |
|--------|---|---|
| **Total rows in biblioteca_vectores** | 84,204 | ✅ Confirmed |
| **fuente IS NULL** | 8,366 (9.9%) | ✅ Confirmed |
| **es_norma_vigente = true** | 7,857 (9.3%) | ✅ Confirmed |
| **es_norma_vigente = false** | 9,090 (10.8%) | ✅ Confirmed |
| **es_norma_vigente = NULL** | 67,257 (79.9%) | ✅ Confirmed |
| **revision_pendiente = true** | 41 | ✅ Confirmed |
| **Canonical instruments present** | 5–7 (UNRESOLVED) | ⚠️ Requires H5 verification |
| **doc_* prefixed sources** | ~10+ | ⏳ Full inventory via H2 |
| **CPC identity layers** | 3 observed | ⏳ Distinct counts via H3 |
| **Notariado num_articulo** | 94 observed | ⏳ vs manifest via H4 |

---

## XIII. NEXT PHASE: H1–H5 HYGIENE QUERIES

Execute in SQL Editor:
- H1: NULL fuente distribution
- H2: doc_* inventory audit
- H3: CPC layer identity (distinct num_articulo, repeated article analysis)
- H4: Notariado reconciliation (ordered num_articulo list)
- H5: Decree/alias discovery (metadata search only)

Results → adjudicate claims in section VI → CLO decision.

---

**ESTADO:** Gap Analysis Provisional (evidence-based; unresolved claims clearly marked)
**PRODUCCIÓN:** ❌ NO writes, ingesta, nor Comercio merge
**DOCUMENTACIÓN:** ✅ Committed as evidence
**APROBACIÓN CLO:** Required before Bloque 1 (based on H1–H5 findings)

**Análisis generado:** 2026-09-30  
**Ejecutor:** Claude + SQL Editor (thgrhueckkjdutjvcufp)  
**Fuente de datos:** docs/corpus/gap-queries.sql (Secciones A–D)  
**Claims no probados:** Ver sección VI
