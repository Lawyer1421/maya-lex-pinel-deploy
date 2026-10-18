# Propiedad D.82-2004 — Art.108 OCR miss (technical, recovered)

**Instrument:** Ley de Propiedad, Decreto No. 82-2004 (Gaceta 30,428 — 29 jun 2004)  
**Constraint:** do not invent article text. `PRODUCTION_WRITE_AUTHORIZED=NO`.

## Classification

**OCR_MISS / DETERMINISTIC — not legal ambiguity. QUEUE_A (technical).**  
`LEGAL_REVIEW_REQUIRED = NO`.

Page A.14 of the Gaceta scan (`page-14.png`) contains `ARTÍCULO 108` between 107 and 109. Combined linear OCR of the two-column layout dropped the heading while keeping 107 and 109. Re-OCR of page-14 alone recovered the provision. The recovered text was inserted into the OCR file immediately before `ARTÍCULO 109` (same official page; not a different edition, not invented).

## Recovered text (page-14 re-OCR, verbatim)

```
ARTÍCULO 108.- Los planos de lotificación y urbanización de los
asentamientos humanos regularizados por el Instituto de la Propiedad
(IP) serán remitidos por éste a la corporación municipal correspondiente
para que gratuitamente sezn incorporados en los catastros municipales,
planes reguladores y mapas de zonificación,

Los mismos tendrán la consideración de planos municipales
aprobados.
```

OCR artifact `sezn` (for `sean`) is kept as recovered. No legal rewrite.

## Combined-OCR remnant (not used as the heading)

The interleaved page-13/14 stream still has an orphaned left-column fragment after Art.107 (`(IP) serán remitidos…`) without an `ARTÍCULO 108` label. That remnant is **not** stitched into a heading. The accepted Art.108 row comes only from the recovered page-14 block.

## Disposition

| Item | Value |
|---|---|
| `ocr_missing_label` | **cleared for 108** once the updated OCR is the ingest input |
| Invented heading/body | **No** — page-14 re-OCR of the same Gaceta scan |
| Queue | **QUEUE_A** (technical recovery) |
| Parser change | None required beyond ingesting the updated OCR |

Regression: `tests/ingestar-ley-chunker.test.ts` — recovered Art.108 accepted; missing-heading fixture still does not invent 108.
