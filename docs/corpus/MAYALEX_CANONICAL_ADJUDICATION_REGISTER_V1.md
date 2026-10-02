# MAYALEX — CANONICAL ADJUDICATION REGISTER V1
## Unresolved Items from VERIFIED Corpus Identity

**Status:** PARTIAL_CLO_RECORDED  
**Date:** 2026-10-01  
**CLO recorded:** 2026-10-01  
**Project:** thgrhueckkjdutjvcufp (MayaLex Pro)  
**Production Writes:** 0  

---

## GOVERNANCE

**Physical Identity Baseline:** VERIFIED (H1–H5 measurements confirmed)  
**Canonical Adjudication Complete:** NO  
**CLO partial:** closed E1, E3, E4, E7, E8; open E2, E5, E6

Existing gates (preserved):
- Identity Sprint Closed: ❌ NO
- Master Inventory Frozen: ❌ NO
- Source Discovery Authorized: ❌ NO
- Production Ingestion Authorized: ❌ NO

**Critical Note:** The VERIFIED Master Inventory establishes the physical/evidentiary corpus baseline. CLO decisions below are recorded as stated on 2026-10-01. They must NOT invalidate previously verified H1–H5 physical measurements. Do not reopen the Evidence Pack unless new evidence contradicts a measured fact.

---

## CLO ADJUDICATION 2026-10-01

Recorded as stated. `canonical_adjudication_complete` remains false.

| ID | Decision | Text | Status |
|----|----------|------|--------|
| E1 | B | Arts 11 and 27 of D.353-2005 are displaced by D.77-2006; CEDIJ/PR#48 last-occurrence reform rule | CLOSED |
| E2 | C | Arts 72, 73, 84, 87, 93 = LEGAL_STATUS_UNRESOLVED | OPEN |
| E3 | A | es_norma_vigente=false is an operative mark; INGESTED≠VERIFIED≠VIGENTE | CLOSED |
| E4 | C | NULL layer of 8366 rows is excluded from professional retrieval; fail-closed | CLOSED |
| E5 | C | CPC_TEXTO_BASE_D211-2006 remains UNRESOLVED | OPEN |
| E6 | B | D.102-2018 physical presence; canonical status and completeness remain open | OPEN |
| E7 | D | doc_* = EXCLUDED_BY_TYPE; never PRIMARY | CLOSED |
| E8 | A | D.77-2006 rows remain a physical candidate until Gaceta | CLOSED |

E1 and E8 are both recorded. E1 is the legal disposition of articles 11 and 27. E8 keeps the observed D.77-2006 rows as a physical candidate until the Gaceta text. Source discovery stays unauthorized.

---

## CA-01: NOTARIADO_FALSE_ROWS

### Status

| Aspect | Value |
|--------|-------|
| Physical State | PHYSICAL_EVIDENCE_COMPLETE |
| Legal Status | PARTIAL |
| Articles 11 and 27 | B — displaced by D.77-2006 (E1, CLOSED) |
| Articles 72, 73, 84, 87, 93 | LEGAL_STATUS_UNRESOLVED (E2, OPEN) |
| es_norma_vigente=false | Operative mark (E3, CLOSED) |
| D.77-2006 rows | Physical candidate until Gaceta (E8, CLOSED) |

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

- LEGAL_STATUS_UNRESOLVED for articles 72, 73, 84, 87, 93 (E2=C)

### Required Evidence

1. Gaceta text for the Decreto 77-2006 rows. E8 keeps those rows a physical candidate until that text. Discovery is not authorized.
2. Official reform/repeal history for articles 72, 73, 84, 87, 93

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
| Retrieval policy | EXCLUDED from professional retrieval; fail-closed (E4=C, CLOSED) |

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
4. E4 excludes this layer from professional retrieval. It does not authorize deletion or a production write.

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
| Temporal Role | TEMPORAL_ROLE_UNRESOLVED (E5=C, OPEN) |

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
| Completeness | NO_MEDIDO (E6=B, OPEN) |

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
| Retrieval Role | EXCLUDED_BY_TYPE; never PRIMARY (E7=D, CLOSED) |

### Known Evidence

- **Row Count:** 65,776
- **Physical doc_* Sources:** 15,506
- **num_articulo Status:** NULL across entire layer
- **Metadata Fields:** id_documento, instrumento_num, es_fragmento, fecha_detectada, articulo, coleccion, hash_chunk, id_chunk, id
- **Collections:** mayalex_instrumentos, mayalex_normativos

### Unknowns

- Classification of representative document families by metadata
- Document types present (legal instruments, notarial instruments, procedural documents, expediente-like, other)
- Classification of representative document families remains undescribed. The retrieval policy is closed by E7.

### Required Evidence

1. Representative document family sampling and classification
2. Determination of document types present in layer

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
| CA-01 | Notariado False Rows | Physical Evidence Complete / Legal Partial (11–27 closed; 72–93 open) | Legal Vigencia Adjudication | YES |
| CA-02 | Legacy NULL Equivalence | Excluded from professional retrieval (E4) | Corpus Identity Mapping | YES |
| CA-03 | CPC Texto Base Temporal | Base Variant Present / Temporal Unresolved (E5) | Temporal Text Adjudication | YES |
| CA-04 | D102-2018 Canonical | Physical Confirmed / Canon Open (E6) | Legal Status Adjudication | YES |
| CA-05 | doc_* Retrieval Role | EXCLUDED_BY_TYPE (E7) | Retrieval Policy Adjudication | YES |

---

## GOVERNANCE STATEMENT

E2, E5, and E6 remain open, so Master Inventory freeze stays blocked. Closed decisions E1, E3, E4, E7, and E8 do not invalidate the VERIFIED physical baseline established by H1–H5.

These are CLO-level canonical, editorial, and retrieval policy questions, not corpus measurement disputes.

Do not reopen H1–H5 evidence pack unless new production evidence contradicts a directly measured fact.

---

**CANONICAL ADJUDICATION REGISTER V1 STATUS:** PARTIAL_CLO_RECORDED  
**Canonical Adjudication Complete:** NO  
**CLO closed:** E1, E3, E4, E7, E8  
**CLO open:** E2, E5, E6  
**Production Writes:** 0  
**Identity Sprint Closed:** NO  
**Master Inventory Frozen:** NO  
**Source Discovery Authorized:** NO  
**Production Ingestion Authorized:** NO
