# MAYALEX — CORPUS INGESTION BACKLOG V1
## Absence-Verified Targets for Source Discovery & Ingestion

**Status:** DRAFT_VERIFIED_ABSENCES_ONLY  
**Date:** 2026-10-01  
**Project:** thgrhueckkjdutjvcufp (MayaLex Pro)  
**Production Writes:** 0  

---

## OVERVIEW

This ingestion backlog contains **only instruments with ABSENT_VERIFIED status from H5** (Decree/Alias Discovery). No source discovery is authorized yet. Each instrument requires explicit authorization before ingestion can proceed.

---

## PRIORITY P0: CRITICAL LEGAL FOUNDATIONS

### 1. Código de Comercio (Decreto 73-1950)

| Item | Value |
|------|-------|
| Canonical ID | HN_CODIGO_COMERCIO_D73_1950 |
| Instrument | Código de Comercio (Decreto 73-1950) |
| Absence Status | ABSENT_VERIFIED |
| Evidence Ref | H5 |
| Searched Fields | fuente, metadata::text |
| Candidate Matches | 0 |
| Priority | P0 |
| Priority Reason | Critical commercial law foundation |
| Next Action | SOURCE_DISCOVERY_PENDING_AUTHORIZATION |

---

### 2. Ley de Organización y Atribuciones de los Tribunales

| Item | Value |
|------|-------|
| Canonical ID | HN_LEY_ORGANIZACION_TRIBUNALES |
| Instrument | Ley de Organización y Atribuciones de los Tribunales |
| Absence Status | ABSENT_VERIFIED |
| Evidence Ref | H5 |
| Searched Fields | fuente, metadata::text |
| Candidate Matches | 0 |
| Priority | P0 |
| Priority Reason | Procedural and jurisdictional foundation |
| Next Action | SOURCE_DISCOVERY_PENDING_AUTHORIZATION |

---

## PRIORITY P1: SPECIALIZED DECREES

### 1. Decreto 31-2015

| Item | Value |
|------|-------|
| Canonical ID | HN_DECRETO_31_2015 |
| Instrument | Decreto 31-2015 |
| Absence Status | ABSENT_VERIFIED |
| Evidence Ref | H5 |
| Searched Fields | fuente, metadata::text |
| Candidate Matches | 0 |
| Priority | P1 |
| Priority Reason | Specialized decree |
| Next Action | SOURCE_DISCOVERY_PENDING_AUTHORIZATION |

---

### 2. Decreto 35-2013

| Item | Value |
|------|-------|
| Canonical ID | HN_DECRETO_35_2013 |
| Instrument | Decreto 35-2013 |
| Absence Status | ABSENT_VERIFIED |
| Evidence Ref | H5 |
| Searched Fields | fuente, metadata::text |
| Candidate Matches | 0 |
| Priority | P1 |
| Priority Reason | Specialized decree |
| Next Action | SOURCE_DISCOVERY_PENDING_AUTHORIZATION |

---

### 3. Decreto 124-92

| Item | Value |
|------|-------|
| Canonical ID | HN_DECRETO_124_92 |
| Instrument | Decreto 124-92 |
| Absence Status | ABSENT_VERIFIED |
| Evidence Ref | H5 |
| Searched Fields | fuente, metadata::text |
| Candidate Matches | 0 |
| Priority | P1 |
| Priority Reason | Specialized decree |
| Next Action | SOURCE_DISCOVERY_PENDING_AUTHORIZATION |

---

### 4. Decreto 284-2013

| Item | Value |
|------|-------|
| Canonical ID | HN_DECRETO_284_2013 |
| Instrument | Decreto 284-2013 |
| Absence Status | ABSENT_VERIFIED |
| Evidence Ref | H5 |
| Searched Fields | fuente, metadata::text |
| Candidate Matches | 0 |
| Priority | P1 |
| Priority Reason | Verified absent target pending legal identity/source reconciliation |
| Next Action | SOURCE_DISCOVERY_PENDING_AUTHORIZATION |

---

### 5. Decreto 73-96 / Código de la Niñez y la Adolescencia

| Item | Value |
|------|-------|
| Canonical ID | HN_DECRETO_73_96 |
| Instrument | Decreto 73-96 |
| Canonical Name | Código de la Niñez y la Adolescencia |
| Absence Status | ABSENT_VERIFIED |
| Evidence Ref | H5 |
| Searched Fields | fuente, metadata::text |
| Candidate Matches | 0 |
| Priority | P1 |
| Priority Reason | Family law foundation |
| Next Action | SOURCE_DISCOVERY_PENDING_AUTHORIZATION |
| Caveat | Preserve canonical legal name; do not treat decree number as orphan |

---

## EDITORIAL RECONCILIATION REQUIRED

### Decreto 102-2018 (NOT in Ingestion Backlog)

| Item | Value |
|------|-------|
| Canonical ID | HN_DECRETO_102_2018 |
| Instrument | Ley Especial de Adopciones de Honduras (Decreto 102-2018) |
| Physical Status | PRESENT |
| Rows | 64 |
| Distinct Articles | 64 |
| Vigente True | 64 |
| Evidence Ref | H5 |
| Canonical Status | UNRESOLVED_CANONICAL_STATUS |
| Reason | Physical presence confirmed by H5; prior inventory may have classified differently. Canonical legal status must be reconciled with CLO before Bloque 4. |
| Next Action | EDITORIAL_RECONCILIATION_WITH_CLO |
| Caveat | **Do NOT add to ingestion backlog**; physical presence already confirmed. No reingestion required for physical coverage. |

---

## STATE GATES

| Gate | Status | Note |
|------|--------|------|
| SOURCE_DISCOVERY_AUTHORIZED | ❌ NO | Only H5 absence verification conducted |
| INGESTION_AUTHORIZED | ❌ NO | Each instrument requires explicit authorization |
| IDENTITY_SPRINT_CLOSED | ❌ NO | Evidence captured; CLO adjudication pending |
| MASTER_INVENTORY_FROZEN | ❌ NO | DRAFT_VERIFIED_BY_EVIDENCE status only |

---

## NOTES

- **The ingestion backlog itself contains only ABSENT_VERIFIED targets.** No source discovery has been authorized yet.
- **Editorial reconciliation section** records Decreto 102-2018 (physical presence already confirmed) and is **NOT part of the ingestion backlog.**
- All absence status: searched via **fuente column** and **metadata::text field**; zero candidates indicates absence from both indexed fields.
- Does not preclude presence under unindexed names or pre-2020 archived formats.

---

**INGESTION BACKLOG V1 STATUS:** DRAFT_VERIFIED_ABSENCES_ONLY  
**Production Writes:** 0  
**No source discovery authorized. No ingestion authorized.**
