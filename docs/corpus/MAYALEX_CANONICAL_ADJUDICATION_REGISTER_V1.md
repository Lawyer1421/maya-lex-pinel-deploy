# MAYALEX — CANONICAL ADJUDICATION REGISTER V1
## Unresolved Items from VERIFIED Corpus Identity

**Status:** PREPARATION_READY  
**Date:** 2026-10-01  
**Project:** thgrhueckkjdutjvcufp (MayaLex Pro)  
**Production Writes:** 0  

---

## GOVERNANCE

**Physical Identity Baseline:** VERIFIED (H1–H5 measurements confirmed)  
**Canonical Adjudication Complete:** NO (5 items remain unresolved)

Existing gates (preserved):
- Identity Sprint Closed: ❌ NO
- Master Inventory Frozen: ❌ NO
- Source Discovery Authorized: ❌ NO
- Production Ingestion Authorized: ❌ NO

**Critical Note:** The VERIFIED Master Inventory establishes the physical/evidentiary corpus baseline. These five unresolved items are canonical/editorial/retrieval questions. They must NOT invalidate previously verified H1–H5 physical measurements. Do not reopen the Evidence Pack unless new evidence contradicts a measured fact.

---

## CA-01: NOTARIADO_FALSE_ROWS

### Status

| Aspect | Value |
|--------|-------|
| Physical State | PHYSICAL_EVIDENCE_COMPLETE |
| Legal Status | LEGAL_STATUS_UNRESOLVED |

### Known Evidence

- **Código del Notariado:** 94 rows measured
- **Vigencia Distribution:** 87 es_norma_vigente=true, 7 es_norma_vigente=false
- **Sequence:** 1–94 complete, no gaps
- **Physical Status:** PRESENT_COMPLETE
- **False Article Set:** [11, 27, 72, 73, 84, 87, 93]
- **All 7 rows:** fuente_tipo=codigo, revision_pendiente=false, verificado=false
- **Metadata Present:** fecha_verificacion, hash_texto_sha256, instrumento, metodo_extraccion, norm_id, tipo_instrumento, verificado
- **Metadata Absent:** decreto, reforma, reformado_por, derogado_por, vigencia, estado, nota, fuente_oficial, url, archivo_src, fecha, fecha_detectada
- **Same-Source Variant Check:** NOT_FOUND (each article appears only once)
- **Cross-Source Observation:** D77-2006 contains articles 11,27 vigente=true; Reglamento contains same numeric identifiers

### Unknowns

- Editorial reason for false status marking
- Legal status cause (derogation, substitution, reform, or other)
- Official reform/repeal history affecting articles 72, 73, 84, 87, 93

### Required Evidence

1. Official source proving legal effect of false status, if any
2. Official text and history affecting Articles 11, 27, 72, 73, 84, 87, 93
3. Verification of Decreto 77-2006 provision text (confirmed D77 may contain Articles 11, 27)
4. Determination of relationship between D77-2006 and Articles 11 and 27 of Decreto 353-2005
5. Current legal status article-by-article from official sources

### Resolution Type

LEGAL_VIGENCIA_ADJUDICATION

### Action Flags

| Flag | Value |
|------|-------|
| Production Write Required | NO |
| Source Discovery Required | YES |
| SQL Measurement Required | YES |
| Legal Review Required | YES |
| Technical Review Required | NO |
| Blocking Master Inventory Freeze | YES |
| Blocking Source Discovery Backlog | NO |

---

## CA-02: LEGACY_NULL_CANONICAL_EQUIVALENCE

### Status

| Aspect | Value |
|--------|-------|
| Layer Type | IDENTIFIABLE_LEGACY_LAYER |
| Canonical Equivalence | CANONICAL_EQUIVALENCE_UNRESOLVED |

### Known Evidence

- **Total Rows:** 8,366 fuente IS NULL
- **Metadata Traceability:** archivo_src present in all 8,366 rows
- **Article Metadata:** articulo present in 8,334 rows (99.6% coverage)
- **Vigencia Status:** All observed groups marked es_norma_vigente=false

### Unknowns

- Canonical instrument mapping for archivo_src values
- Material classification (statute vs. sentence vs. doctrine vs. procedural)
- Overlap patterns with currently named sources

### Required Evidence

1. Mapping archivo_src → canonical instrument where possible
2. Classification by material type (statute/sentence/doctrine/procedural)
3. Identification of overlap with current named sources
4. Retention/deletion recommendation basis

### Resolution Type

CORPUS_IDENTITY_MAPPING

### Action Flags

| Flag | Value |
|------|-------|
| Production Write Required | NO |
| Source Discovery Required | NO |
| SQL Measurement Required | YES |
| Legal Review Required | NO |
| Technical Review Required | YES |
| Blocking Master Inventory Freeze | YES |
| Blocking Source Discovery Backlog | NO |

---

## CA-03: CPC_TEXTO_BASE_TEMPORAL_ROLE

### Status

| Aspect | Value |
|--------|-------|
| Physical Presence | BASE_VARIANT_PRESENT |
| Temporal Role | TEMPORAL_ROLE_UNRESOLVED |

### Known Evidence

- **Instrument:** CPC_TEXTO_BASE_D211-2006
- **Row Count:** 995 rows
- **Distinct Articles:** 916
- **Overlap:** All 916 overlap with main CPC article identifiers
- **Vigencia:** All 995 vigente_true

### Unknowns

- Source provenance and edition/date
- Comparison against primary CPC (original vs. reforms vs. variants)
- Whether differences reflect original text, reforms, segmentation, or editorial variant

### Required Evidence

1. Source provenance documentation
2. Edition/date metadata clarification
3. Comparison against primary CPC text
4. Temporal legal role determination (baseline, reform, variant, commentary, other)

### Resolution Type

TEMPORAL_TEXT_ADJUDICATION

### Action Flags

| Flag | Value |
|------|-------|
| Production Write Required | NO |
| Source Discovery Required | YES |
| SQL Measurement Required | NO |
| Legal Review Required | YES |
| Technical Review Required | NO |
| Blocking Master Inventory Freeze | YES |
| Blocking Source Discovery Backlog | NO |

---

## CA-04: D102_2018_CANONICAL_STATUS

### Status

| Aspect | Value |
|--------|-------|
| Physical Presence | PHYSICAL_PRESENCE_CONFIRMED |
| Canonical Legal Status | CANONICAL_LEGAL_STATUS_UNRESOLVED |

### Known Evidence

- **Instrument:** Ley Especial de Adopciones de Honduras (Decreto 102-2018)
- **Rows:** 64
- **Distinct Articles:** 64
- **Vigente True:** 64
- **Physical Status:** PRESENT
- **Completeness Status:** NO_MEDIDO (not measured)
- **Conflict:** Prior repository/inventory may characterize legal status differently

### Unknowns

- Official primary legal source and decree identity
- Amendment/repeal history
- Current legal status
- Relationship with any later legislation

### Required Evidence

1. Official primary legal source document
2. Publication date and decree number verification
3. Amendment and repeal history
4. Relationship with subsequent legislation

### Resolution Type

LEGAL_STATUS_ADJUDICATION

### Action Flags

| Flag | Value |
|------|-------|
| Production Write Required | NO |
| Source Discovery Required | YES |
| SQL Measurement Required | NO |
| Legal Review Required | YES |
| Technical Review Required | NO |
| Blocking Master Inventory Freeze | YES |
| Blocking Source Discovery Backlog | NO |

---

## CA-05: DOC_STAR_RETRIEVAL_ROLE

### Status

| Aspect | Value |
|--------|-------|
| Layer Type | DOCUMENT_INSTRUMENT_LAYER_CONFIRMED |
| Retrieval Role | RETRIEVAL_ROLE_UNRESOLVED |

### Known Evidence

- **Row Count:** 65,776
- **Physical doc_* Sources:** 15,506
- **num_articulo Status:** NULL across entire layer
- **Metadata Fields:** id_documento, instrumento_num, es_fragmento, fecha_detectada, articulo, coleccion, hash_chunk, id_chunk, id
- **Collections:** mayalex_instrumentos, mayalex_normativos

### Unknowns

- Classification of representative document families by metadata
- Document types present (legal instruments, notarial instruments, procedural documents, expediente-like, other)
- Retrieval policy definition (PRIMARY, COMPLEMENTARY, CONTEXT_ONLY, EXCLUDED_BY_TYPE)

### Required Evidence

1. Representative document family sampling and classification
2. Determination of document types present in layer
3. Definition of retrieval policy for use cases (PRIMARY, COMPLEMENTARY, CONTEXT_ONLY, EXCLUDED)

### Resolution Type

RETRIEVAL_POLICY_ADJUDICATION

### Action Flags

| Flag | Value |
|------|-------|
| Production Write Required | NO |
| Source Discovery Required | NO |
| SQL Measurement Required | YES |
| Legal Review Required | NO |
| Technical Review Required | YES |
| Blocking Master Inventory Freeze | YES |
| Blocking Source Discovery Backlog | NO |

---

## SUMMARY

| Item | Title | Status | Resolution Type | Blocking Inventory |
|------|-------|--------|-----------------|-------------------|
| CA-01 | Notariado False Rows | Physical Measured / Legal Unresolved | Legal Vigencia Adjudication | YES |
| CA-02 | Legacy NULL Equivalence | Identifiable Layer / Equivalence Unresolved | Corpus Identity Mapping | YES |
| CA-03 | CPC Texto Base Temporal | Base Variant Present / Temporal Unresolved | Temporal Text Adjudication | YES |
| CA-04 | D102-2018 Canonical | Physical Confirmed / Legal Unresolved | Legal Status Adjudication | YES |
| CA-05 | doc_* Retrieval Role | Layer Confirmed / Retrieval Policy Unresolved | Retrieval Policy Adjudication | YES |

---

## GOVERNANCE STATEMENT

All five canonical adjudication items block Master Inventory freeze pending resolution, but do NOT invalidate the VERIFIED physical/evidentiary baseline established by H1–H5 measurements.

These are CLO-level canonical, editorial, and retrieval policy questions, not corpus measurement disputes.

Do not reopen H1–H5 evidence pack unless new production evidence contradicts a directly measured fact.

---

**CANONICAL ADJUDICATION REGISTER V1 STATUS:** PREPARATION_READY  
**Production Writes:** 0  
**Identity Sprint Closed:** NO  
**Master Inventory Frozen:** NO  
**Source Discovery Authorized:** NO  
**Production Ingestion Authorized:** NO
