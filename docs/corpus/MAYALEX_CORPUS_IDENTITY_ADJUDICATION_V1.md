# MAYALEX — CORPUS IDENTITY ADJUDICATION V1
## Evidence-Based Analysis of Production Corpus State

**Status:** VERIFIED  
**Date:** 2026-10-01  
**Project:** thgrhueckkjdutjvcufp (MayaLex Pro)  
**Evidence Provenance:** Production SQL Editor (H1–H5 queries)  
**Production Writes:** 0  
**Independent Audit:** Cursor (PASS, SHA 00b2fda)  

---

## EXECUTIVE SUMMARY

H1–H5 hygiene queries have been executed against production biblioteca_vectores table (84,204 rows total). This adjudication document records:

1. **Physical evidence captured** for corpus layer identity
2. **Measurements** vs. speculation (MEDIDO vs. NO_MEDIDO)
3. **Unresolved canonical/legal identity items** requiring CLO decision
4. **Conflicts** with prior inventory narratives
5. **Explicit state gates** — identity sprint remains OPEN; no source discovery authorized; no ingestion authorized

---

## EVIDENCE PROVENANCE

| Item | Value |
|------|-------|
| Project | thgrhueckkjdutjvcufp |
| Source | production SQL Editor |
| Execution Mode | manual read-only SELECT queries supplied by Fredy |
| Evidence Blocks | H1, H2, H3, H4, H5 |
| Transaction Read-Only | NO_MEDIDO |
| Production Writes | 0 |

---

## H1 RESULT: NULL fuente DISTRIBUTION

**Total fuente IS NULL:** 8,366 rows (MEDIDO)

### Composition by Materia + fuente_tipo

| Materia | coleccion | fuente_tipo | es_norma_vigente | rows | Status |
|---------|-----------|-------------|------------------|------|--------|
| 07_CONSTITUCIONAL | mayalex_normativos | NULL | false | 2,623 | MEDIDO |
| 01_PENAL | mayalex_normativos | codigo | false | 2,617 | MEDIDO |
| 06_FAMILIA | mayalex_normativos | NULL | false | 2,369 | MEDIDO |
| 01_PENAL | mayalex_normativos | sentencia | false | 719 | MEDIDO |
| (procedimental) | mayalex_procedimental | (mixed) | false | 32 | MEDIDO |
| 01_PENAL | mayalex_normativos | doctrina | false | 6 | MEDIDO |

### Adjudication

**Layer Type:** LEGACY_NULL_SOURCE_LAYER  
**Identity Traceability:** Available in metadata (archivo_src, materia, sub_tipo)  
**Safe to Delete:** NO  
**Safe to Reingest:** NO  
**Canonical Equivalence:** UNRESOLVED  

**Caveat:** Metadata traceability available but legal identity of each row remains unresolved. Do not claim duplicate identity from row-count matching across doc_* examples.

---

## H2 RESULT: DOC_* EVIDENCE

**Total doc_* rows:** 65,776 (MEDIDO)  
**Physical doc_* sources:** 15,506 (MEDIDO)  
**num_articulo status:** NULL across entire layer (MEDIDO)  
**Distinct articles:** 0 (MEDIDO)  
**vigente_true:** 0 (MEDIDO)  

### Collections

- mayalex_instrumentos
- mayalex_normativos

### Main Materias

- 09_AGRARIO
- 10_LEYES_REGLAMENT
- 03_NOTARIAL

### Adjudication

**Layer Type:** DOCUMENT_INSTRUMENT_LAYER  
**Primary Identity Fields:** metadata.id_documento, metadata.instrumento_num  
**Safe to Delete:** NO  
**Safe to Treat as Articulated Norms:** NO  

**Caveat:** 15,506 physical fuente=doc_* sources observed. Do not claim distinct id_documento count without direct measurement. Traditional metadata fields (titulo, filename, url) not present.

---

## H3 RESULT: CPC IDENTITY (Multiple Layers)

### H3.1 — Codigo Procesal Civil (mayalex_normativos)

| Metric | Value | Status |
|--------|-------|--------|
| rows | 932 | MEDIDO |
| distinct_articles | 932 | MEDIDO |
| vigente_true | 932 | MEDIDO |
| vigente_false | 0 | MEDIDO |
| vigente_null | 0 | MEDIDO |
| Role | PRIMARY_NORMATIVE | — |

### H3.1b — Codigo Procesal Civil (mayalex_procedimental)

| Metric | Value | Status |
|--------|-------|--------|
| rows | 932 | MEDIDO |
| distinct_articles | 932 | MEDIDO |
| vigente_true | 932 | MEDIDO |
| fuente_tipo | codigo | MEDIDO |
| Role | PROCEDURAL_MIRROR | — |

**Note:** Same source appears in both normative and procedural collections (mirrored, not duplicated).

### H3.2 — CPC_TEXTO_BASE_D211-2006

| Metric | Value | Status |
|--------|-------|--------|
| rows | 995 | MEDIDO |
| distinct_articles | 916 | MEDIDO |
| vigente_true | 995 | MEDIDO |
| Role | BASE_VARIANT | — |
| Temporal Legal Role | UNRESOLVED | — |

**Caveat:** Do not characterize as "pre-reform" without separate evidence.

### H3.3 — CPC_COMENTADO_ROMERO_2024

| Metric | Value | Status |
|--------|-------|--------|
| rows | 1,481 | MEDIDO |
| distinct_articles | 420 | MEDIDO |
| vigente_true | 0 | MEDIDO |
| vigente_false | 0 | MEDIDO |
| vigente_null | 1,481 | MEDIDO |
| Role | SECONDARY_COMMENTARY | — |

### Repetition Patterns

| Layer | Repeated Articles | Max Occurrences | Avg Occurrences | Status |
|-------|-------------------|-----------------|-----------------|--------|
| Codigo Procesal Civil | all (932) | 2 | 2.00 | MEDIDO |
| CPC_COMENTADO_ROMERO_2024 | 394 | 45 | 3.53 | MEDIDO |
| CPC_TEXTO_BASE_D211-2006 | 70 | 4 | 1.09 | MEDIDO |

**Caveat:** Repetition patterns consistent with article segmentation/chunking; legal interpretation remains CLO responsibility.

### Article Overlap

| Intersection | Count | Status |
|-------------|-------|--------|
| Primary ∩ Texto Base | 916 | MEDIDO |
| Primary ∩ Romero | 420 | MEDIDO |
| Three-Way Overlap | 417 | MEDIDO |

---

## H4 RESULT: NOTARIADO COVERAGE

### Código del Notariado de Honduras (Decreto 353-2005)

| Metric | Value | Status |
|--------|-------|--------|
| rows | 94 | MEDIDO |
| distinct_articles | 94 | MEDIDO |
| sequence | 1–94 complete | MEDIDO |
| missing | 0 | MEDIDO |
| repeated | 0 | MEDIDO |
| vigente_true | 87 | MEDIDO |
| vigente_false | 7 | MEDIDO |
| vigente_null | 0 | MEDIDO |
| Physical Status | PRESENT_COMPLETE | MEDIDO |

**Caveat:** Do not claim legal status (derogation/supersession) for es_norma_vigente=false rows without separate evidence.

### Reglamento del Código del Notariado (Resolución PCSJ-17-2012)

| Metric | Value | Status |
|--------|-------|--------|
| rows | 111 | MEDIDO |
| distinct_articles | 111 | MEDIDO |
| sequence | 1–111 complete | MEDIDO |
| repeated | 0 | MEDIDO |
| vigente_true | 111 | MEDIDO |
| vigente_false | 0 | MEDIDO |
| vigente_null | 0 | MEDIDO |
| Physical Status | PRESENT_COMPLETE | MEDIDO |

**Note:** Separate regulatory instrument; no reingestion required for physical coverage.

---

## H5 RESULT: ABSENCE VERIFICATION (Decree/Alias Discovery)

### ABSENT_VERIFIED (zero candidates in fuente + metadata::text)

| Instrument | Decree | Candidates | Status |
|------------|--------|-----------|--------|
| Código de Comercio | D. 73-1950 | 0 | ABSENT_VERIFIED |
| Ley Organización Tribunales | — | 0 | ABSENT_VERIFIED |
| Decreto 31-2015 | D. 31-2015 | 0 | ABSENT_VERIFIED |
| Decreto 35-2013 | D. 35-2013 | 0 | ABSENT_VERIFIED |
| Decreto 124-92 | D. 124-92 | 0 | ABSENT_VERIFIED |
| Decreto 284-2013 | D. 284-2013 | 0 | ABSENT_VERIFIED |
| Decreto 73-96 | D. 73-96 | 0 | ABSENT_VERIFIED |

**Note on Decreto 73-96:** Corresponds to Código de la Niñez y la Adolescencia. Preserve canonical identity; do not treat as orphan decree label.

### PRESENT (Physical DB Presence Confirmed)

| Instrument | Observed DB Source | Rows | Articles | vigente_true | Status |
|------------|-------------------|------|----------|--------------|--------|
| Decreto 102-2018 | Ley Especial de Adopciones de Honduras | 64 | 64 | 64 | PRESENT |

**Caveat:** Physical presence confirmed. Completeness (PRESENT_COMPLETE) not measured. Canonical legal status UNRESOLVED. Prior repo/inventory may characterize D102-2018 differently.

---

## CONFLICTS WITH PRIOR INVENTORY

### 1. CPC Measurements vs. Prior Narrative

**Prior:** "Código Procesal Civil unresolved; distinct counts unknown"  
**Evidence:** Codigo Procesal Civil = 932 distinct (MEDIDO); CPC_TEXTO_BASE_D211-2006 = 916 distinct (MEDIDO); CPC_COMENTADO_ROMERO_2024 = 420 distinct (MEDIDO)  
**Resolution:** Measurements now direct; no inference required.

### 2. Notariado 94 vs. 98/108 Narrative

**Prior:** "94 observed; manifest may accept 98 or 108; reconciliation pending"  
**Evidence:** H4 confirms sequence 1–94, complete, no gaps. Second source (Reglamento) independent: 1–111, complete.  
**Resolution:** Prior reconciliation narrative superseded by evidence of physical continuity.

### 3. Decreto 102-2018 Legal Status

**Prior:** Possibly characterized as derogated or secondary  
**Evidence:** Physical presence confirmed; 64 rows, vigente_true=64  
**Resolution:** Legal/canonical status remains UNRESOLVED; defer to CLO. Physical presence is PRESENT (not PRESENT_COMPLETE, completeness not measured).

### 4. Decreto 73-96 Identity

**Prior:** Possibly listed as orphan or unexplained decree  
**Evidence:** H5 absence verified; canonical name is Código de la Niñez y la Adolescencia  
**Resolution:** Preserve canonical identity note; absence in current corpus is ABSENT_VERIFIED.

---

## MEDIDO vs. NO_MEDIDO MATRIX

| Item | Metric | Status | Evidence |
|------|--------|--------|----------|
| H1 NULL layer | Total rows | MEDIDO | 8,366 |
| H1 NULL layer | Distribution by materia + fuente_tipo | MEDIDO | H1_NULL_SOURCE_RESULTS.json |
| H2 doc_* layer | Total rows | MEDIDO | 65,776 |
| H2 doc_* layer | Physical sources | MEDIDO | 15,506 |
| H2 doc_* layer | Distinct id_documento | NO_MEDIDO | Not directly measured |
| H3.1 Codigo Procesal Civil | Distinct articles | MEDIDO | 932 |
| H3.2 CPC Texto Base | Distinct articles | MEDIDO | 916 |
| H3.3 CPC Romero | Distinct articles | MEDIDO | 420 |
| H4 Notariado | Sequence completeness | MEDIDO | 1–94, no gaps |
| H4 Reglamento | Sequence completeness | MEDIDO | 1–111, no gaps |
| H5 Decrees (7 items) | Absence | MEDIDO | 0 candidates each |
| H5 Decreto 102 | Physical presence | MEDIDO | 64 rows |
| H5 Decreto 102 | Completeness | NO_MEDIDO | Not directly measured |
| Codigo Civil | Distinct articles | NO_MEDIDO | MEDIDO_PREVIO (2,372 rows) |
| All prior measured | Row counts | MEDIDO_PREVIO | Committed in prior version |

---

## UNRESOLVED ITEMS REQUIRING CLO DECISION

1. **Legal status of 7 es_norma_vigente=false Notariado rows:** Derogated? Superseded? Archived? Evidence provides only boolean; legal interpretation required.

2. **Canonical equivalence of H1 NULL layer (8,366 rows):** Metadata available but legal identity of each row unresolved. Require CLO adjudication before retention/deletion decision.

3. **CPC_TEXTO_BASE_D211-2006 temporal legal role:** Is it "pre-reform" baseline or contemporary secondary source? Evidence provides technical dates only.

4. **Decreto 102-2018 canonical status:** Evidence shows physical presence (64 rows, all vigente). Prior inventory may have classified differently. CLO must reconcile.

5. **doc_* layer (65,776 rows) legal status:** Is this intentional non-normative corpus (demandas/análisis) or incomplete ingestion? Metadata traceability available; legal interpretation required.

---

## STATE GATES (EXPLICIT)

| Gate | Status | Reason |
|------|--------|--------|
| IDENTITY_SPRINT_CLOSED | NO | Evidence captured; CLO adjudication pending |
| MASTER_INVENTORY_FROZEN | NO | VERIFIED status only (not frozen pending CLO adjudication) |
| SOURCE_DISCOVERY_AUTHORIZED | NO | Only H5 absence verification conducted; no new source search authorized |
| PRODUCTION_INGESTION_AUTHORIZED | NO | Bloque 1 hygiene adjudication incomplete |

---

## NEXT STEPS

1. **Bloque 1 CLO Review:** CLO to adjudicate unresolved legal/canonical items
2. **Evidence-Bound Master Inventory:** MAYALEX_CORPUS_MASTER_INVENTORY_V1 (DRAFT status, published simultaneously)
3. **Ingestion Backlog:** MAYALEX_CORPUS_INGESTION_BACKLOG_V1 (DRAFT, absent-verified items only)
4. **Bloque 2–4:** Await Bloque 1 approval before proceeding to Comercio, Notariado edge-filling, Decretos phases

---

**IDENTITY ADJUDICATION DOCUMENT ENDS**  
**Status:** VERIFIED  
**Production Writes:** 0  
**No source discovery authorized. No ingestion authorized. Identity sprint remains open.**
