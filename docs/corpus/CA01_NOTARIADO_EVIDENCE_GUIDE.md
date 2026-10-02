# CA-01: NOTARIADO FALSE ROWS
## Evidence Guide & Query Pack Reference

**Canonical Adjudication ID:** CA-01  
**Title:** NOTARIADO_FALSE_ROWS  
**Status:** PREPARATION_READY  
**Date:** 2026-10-01  

---

## OBJECTIVE

Prepare read-only evidence needed to adjudicate the legal status of 7 rows in Código del Notariado de Honduras (Decreto 353-2005) where `es_norma_vigente=false`.

**Known verified state:**
- Total rows: 94
- Distinct articles: 94
- Physical sequence: 1–94 complete
- Vigente distribution: 87 true, 7 false, 0 null

**Unresolved:**
- Exact seven num_articulo values of false rows
- Metadata/source fields for those rows
- Legal basis for vigence status (derogation, substitution, reform, or other)

---

## QUERIES OVERVIEW

Query pack: `ca01-notariado-false-rows.sql`

Six read-only SELECT queries to identify evidence in sequence.

| Query | Label | Purpose |
|-------|-------|---------|
| CA01.1 | Exact 7 False Rows | Identify the 7 rows with metadata-safe fields |
| CA01.2 | Metadata Keys | Enumerate jsonb keys present in those 7 rows |
| CA01.3 | Legal-Status Fields | Extract legal-status relevant metadata fields |
| CA01.4 | Duplicate/Variant Check | Detect multiple vigencia states for same article |
| CA01.5 | Cross-Source Article Match | Check other Notariado sources for same articles |
| CA01.6 | Revision Flag Check | Determine editorial settlement status |

---

## EXECUTION INSTRUCTIONS

1. **Access:** Production SQL Editor (read-only credentials)
2. **Run in order:** CA01.1 → CA01.2 → CA01.3 → CA01.4 → CA01.5 → CA01.6
3. **Do NOT:** modify; infer legal meaning; mark DEROGADO; change corpus

### CA01.1: Exact 7 False Rows

**Purpose:** Identify the 7 rows where es_norma_vigente=false.

**Output:** 7 rows with:
- id, fuente, coleccion, materia, fuente_tipo
- num_articulo (article numbers for the 7 false rows)
- es_norma_vigente (will be false for all)
- revision_pendiente, created_at, metadata

**Action:** Note the exact seven num_articulo values.

---

### CA01.2: Metadata Keys

**Purpose:** Enumerate all jsonb keys present in metadata for the 7 false rows.

**Output:** Key names with occurrence counts across the 7 rows.

**Action:** Identify which metadata fields are populated (not NULL) for these rows. Focus on keys like: decreto, reforma, reformado_por, derogado_por, vigencia, estado, nota, archivo_src.

---

### CA01.3: Legal-Status Fields

**Purpose:** Extract legal-status relevant fields from metadata if present.

**Output:** For each of the 7 rows, display:
- num_articulo
- es_norma_vigente (false)
- decreto, reforma, reformado_por, derogado_por (if present)
- vigencia, estado, nota (if present)
- fuente_oficial, url, archivo_src (if present)
- fecha, fecha_detectada (if present)

**Action:** Do NOT infer meaning from NULL values. Note which fields are populated and which are empty for each article.

---

### CA01.4: Duplicate/Variant Check

**Purpose:** For the 7 num_articulo values, detect whether the same article appears elsewhere in the same fuente with different vigencia status (indicating variant rows rather than deletion).

**Output:** Only articles with multiple vigencia states:
- num_articulo
- false_rows (count where vigente=false)
- true_rows (count where vigente=true)
- null_rows (count where vigente=null)
- total_rows (sum)

**Action:** If an article appears with both true and false, it may represent superseded or edited variants, not necessarily derogation.

---

### CA01.5: Cross-Source Article Match

**Purpose:** Check whether these 7 articles appear in other known Notariado sources (Decreto 353-2005 and Resolución PCSJ-17-2012).

**Output:** For matching articles across sources:
- fuente name
- num_articulo
- es_norma_vigente
- row_count per source/article/vigencia combination
- sample metadata keys

**Action:** Identify whether false rows in one source have counterparts (true or null) in other Notariado sources. Confusion across sources should be detected.

---

### CA01.6: Revision Flag Check

**Purpose:** Determine whether the 7 false rows have revision_pendiente flag set or metadata indicating editorial settlement.

**Output:** For each of the 7 rows:
- id
- num_articulo
- es_norma_vigente (false)
- revision_pendiente (flag status)
- revision_status, nota, archivo_src (if present)
- fecha_detectada, created_at

**Action:** Check revision_pendiente flag. If true, row remains under editorial review. If false or null, check nota/revision_status for notes on why false was set.

---

## CRITICAL CONSTRAINTS

✓ **All queries are SELECT only.** No INSERT, UPDATE, DELETE, ALTER, CREATE, DROP, TRUNCATE, or function calls.

✓ **No contenido field selected.** Queries work only with metadata-safe fields.

✓ **No legal status inference.** Queries identify evidence only. Do NOT conclude DEROGADO, REFORMADO, or other legal classifications solely from es_norma_vigente=false.

✓ **No production writes.** All operations are read-only.

---

## FINDINGS INTERPRETATION

These queries provide evidence for CLO legal review. They do NOT constitute legal adjudication.

**Possible findings:**

1. **Revision flag set (true):** Article remains under editorial review. Defer to CLO editorial process.
2. **Metadata fields present (reforma, derogado_por, etc.):** Specific legal event documented. Forward to CLO with source citation.
3. **Variant rows detected (CA01.4):** Same article exists with vigente=true elsewhere in same source. May represent alternative edition, not deletion.
4. **Cross-source confusion (CA01.5):** Same article appears with different vigence in another Notariado source. Requires reconciliation, not assumption.
5. **No metadata (all null):** Vigence status set without documented reason. Request source documentation from CLO.

---

## NEXT STEPS

1. Execute all 6 queries in production SQL Editor
2. Document findings in a results file
3. Forward results to CLO for legal status adjudication
4. CLO determines: DEROGADO, REFORMADO, SUSTITUTED, CURRENT_WITH_CLARIFICATION, or UNKNOWN
5. Update canonical register with CLO determination
6. Update Master Inventory if needed

---

## SAFETY VERIFICATION

- SQL read-only: ✓
- No contenido: ✓
- No legal inference: ✓
- No production writes: ✓

---

**Query Pack:** ca01-notariado-false-rows.sql  
**Status:** PREPARATION_READY  
**Production Writes:** 0  
**Manual Execution Required:** YES
