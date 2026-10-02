# CA-01: NOTARIADO FALSE ROWS
## Physical Adjudication & Evidence Document V1

**Canonical Adjudication ID:** CA-01  
**Title:** NOTARIADO_FALSE_ROWS_PHYSICAL_EVIDENCE  
**Evidence Type:** Production Query Results  
**Date:** 2026-10-01  
**Project:** thgrhueckkjdutjvcufp (MayaLex Pro)  

---

## EXECUTIVE SUMMARY

Physical evidence for the 7 Código del Notariado rows where `es_norma_vigente=false` has been captured and versioned.

**Physical Identification:** RESOLVED  
**Physical Evidence:** COMPLETE  
**Legal Adjudication:** PENDING (CLO review required)

**False Article Set:** [11, 27, 72, 73, 84, 87, 93]

**Production Writes:** 0  
**Source Discovery Authorized:** NO  
**Legal Conclusions:** NONE INFERRED

---

## PHYSICAL EVIDENCE CAPTURED

### False Article Identifiers

| Article | Source | Vigente | Revision Pending | Verified |
|---------|--------|---------|------------------|----------|
| 11 | Código del Notariado (D.353-2005) | FALSE | FALSE | FALSE |
| 27 | Código del Notariado (D.353-2005) | FALSE | FALSE | FALSE |
| 72 | Código del Notariado (D.353-2005) | FALSE | FALSE | FALSE |
| 73 | Código del Notariado (D.353-2005) | FALSE | FALSE | FALSE |
| 84 | Código del Notariado (D.353-2005) | FALSE | FALSE | FALSE |
| 87 | Código del Notariado (D.353-2005) | FALSE | FALSE | FALSE |
| 93 | Código del Notariado (D.353-2005) | FALSE | FALSE | FALSE |

### Measurements

| Metric | Value | Status |
|--------|-------|--------|
| Physical rows | 7 | MEDIDO |
| Distinct articles | 7 | MEDIDO |
| All in same source | YES | MEDIDO |
| All vigente=false | YES | MEDIDO |
| Revision pending | false (all) | MEDIDO |

### Common Metadata Values

All 7 rows share:

| Field | Value |
|-------|-------|
| norm_id | mayalex_normativos:codigo_notariado_2005 |
| instrumento | Decreto 353-2005 |
| tipo_instrumento | codigo |
| fecha_verificacion | NULL |
| verificado | FALSE |

---

## METADATA ANALYSIS

### Fields PRESENT in All 7 Rows

| Field | Value Status | Measured Value |
|-------|--------------|-----------------|
| fecha_verificacion | MEASURED | NULL |
| hash_texto_sha256 | KEY_PRESENT, VALUES_NO_MEDIDO | — |
| instrumento | MEASURED | Decreto 353-2005 |
| metodo_extraccion | KEY_PRESENT, VALUES_NO_MEDIDO | — |
| norm_id | MEASURED | mayalex_normativos:codigo_notariado_2005 |
| tipo_instrumento | MEASURED | codigo |
| verificado | MEASURED | FALSE |

### Fields ABSENT in All 7 Rows

- decreto
- reforma
- reformado_por
- derogado_por
- vigencia
- estado
- nota
- fuente_oficial
- url
- archivo_src
- fecha
- fecha_detectada

**Interpretation:** Absence of legal-status metadata fields (decreto, reforma, reformado_por, derogado_por, etc.) does NOT establish legal status. Absence is simply absence; no inference applies.

---

## CRITICAL DISTINCTIONS

### 1. Verificado vs. Vigente

**verificado=false** is a VERIFICATION ATTRIBUTE (content validation status), NOT a legal status indicator.

**es_norma_vigente=false** is a database boolean field. Its cause is UNRESOLVED. The presence of this value does NOT by itself establish derogation, amendment, substitution, or current legal invalidity.

These must remain **logically separate**. No legal conclusion may be drawn from either boolean alone.

### 2. Same-Source Variant Check

**Query CA01.4 Result:** NOT_FOUND

For each of the 7 articles (11, 27, 72, 73, 84, 87, 93):
- false_rows: 1
- true_rows: 0
- null_rows: 0
- total_rows: 1

**Interpretation:** Each article appears only once in Código del Notariado. No parallel variants detected (no same article with different vigencia states).

**Adjudication Implication:** Single false row per article does NOT establish derogation, substitution, or amendment within the same source.

### 3. Cross-Source Numeric Match

**Observed in Decreto 77-2006 (Reformas al Código del Notariado):**
- Article 11: 1 row, es_norma_vigente=true
- Article 27: 1 row, es_norma_vigente=true
- Articles 72, 73, 84, 87, 93: NOT FOUND

**Observed in Reglamento del Código del Notariado (PCSJ-17-2012):**
- All seven numeric identifiers (11, 27, 72, 73, 84, 87, 93) present

**Critical Rule:** Same num_articulo across different legal instruments does NOT establish legal identity, amendment, replacement, or derogation.

- Article 11 of Reglamento ≠ Article 11 of Código del Notariado
- Article 11 of Decreto 77-2006 (if present) represents a separate legal provision

**These are PHYSICAL_LEGAL_RELATION_CANDIDATES only. Their normative relationship remains UNRESOLVED.**

---

## ADJUDICATION STATUS

### Physical Layer

| Aspect | Status |
|--------|--------|
| Physical Identification | RESOLVED |
| Physical Evidence Complete | YES |
| Same-Source Variant Found | NO |
| Metadata Legal-Status Fields Present | NO |

### Editorial/Legal Layer

| Aspect | Status |
|--------|--------|
| Editorial Reason for False | UNRESOLVED |
| Legal Status Cause | UNRESOLVED |
| Legal Adjudication | PENDING |

---

## NEXT REQUIRED LEGAL EVIDENCE

For CLO review and legal adjudication:

1. **Verify official text** of Decreto 77-2006 (Reformas al Código del Notariado)
2. **Determine whether D77-2006** provisions expressly amend Articles 11 and/or 27 of Decreto 353-2005
3. **Identify official reform/repeal history** affecting Articles 72, 73, 84, 87, 93
4. **Determine present legal text/status** article-by-article
5. **Preserve distinction** between:
   - Original provision (Decreto 353-2005)
   - Modifying provision (if any)
   - Current consolidated legal rule

**Note:** No source discovery is authorized in this mission. All legal findings require explicit CLO review.

---

## GOVERNANCE

**Physical Evidence Status:** COMPLETE  
**Legal Adjudication Status:** PENDING  

**Preserved Gates:**
- PHYSICAL_IDENTITY_BASELINE_VERIFIED: YES
- CA01_PHYSICAL_EVIDENCE_COMPLETE: YES
- CA01_LEGAL_ADJUDICATION_COMPLETE: NO
- CANONICAL_ADJUDICATION_COMPLETE: NO
- IDENTITY_SPRINT_CLOSED: NO
- MASTER_INVENTORY_FROZEN: NO
- SOURCE_DISCOVERY_AUTHORIZED: NO
- PRODUCTION_INGESTION_AUTHORIZED: NO
- PRODUCTION_WRITES: 0

**Legal Conclusions:** NONE INFERRED

---

## EVIDENCE FILES

- **Query Pack:** docs/corpus/ca01-notariado-false-rows.sql
- **Query Results (JSON):** docs/corpus/evidence/CA01_NOTARIADO_FALSE_ROWS_RESULTS.json
- **Evidence Guide:** docs/corpus/CA01_NOTARIADO_EVIDENCE_GUIDE.md
- **This Document:** docs/corpus/CA01_NOTARIADO_PHYSICAL_ADJUDICATION_V1.md

---

**CA-01 PHYSICAL ADJUDICATION STATUS:** COMPLETE  
**Production Writes:** 0  
**Source Discovery:** NO  
**Legal Adjudication:** PENDING CLO REVIEW
