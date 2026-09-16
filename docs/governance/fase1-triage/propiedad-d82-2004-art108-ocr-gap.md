# Propiedad D.82-2004 — Art.108 OCR gap (QUEUE_C, fail-closed)

**Instrument:** Ley de Propiedad, Decreto No. 82-2004 (Gaceta 30,428 — 29 jun 2004)  
**OCR:** `propiedad-d82-2004.ocr.txt` (tesseract spa+eng psm6, two-column Gaceta scan)  
**Constraint:** do not invent article text. `PRODUCTION_WRITE_AUTHORIZED=NO`.

## Classification

**QUEUE_C — OCR heading absent; legal reconstruction required to fill the gap.**

The linear OCR stream has **zero** occurrences of the token `108` and **zero** matches of `ARTÍCULO 108` / `Artículo 108`. The skip is 107 → remnant body → 109 on the left column of page-13, interleaved with Arts. 110–112 on the right column.

This is **not** a deterministic label repair (no garbled `1O8` / `I08` / `10 8` heading exists to rewrite). Filling the provision would require:

1. Asserting that the orphaned left-column remnant belongs to Art. 108 (layout interpretation of a two-column Gaceta page).
2. Reconstructing the lost prefix of that remnant. The OCR fragment begins mid-phrase: `(IP) serán remitidos por éste a la corporación municipal correspondiente…`

Both steps invent provision identity and/or wording that is **not present** in this OCR. Fail-closed: **do not stitch**.

## Evidence from this OCR (verbatim vicinity)

After `ARTÍCULO 107.- Para resolver cualquier disputa entre los pobladores… reconozcan como válidos.` the stream continues:

```
(IP) serán remitidos por éste a la corporación municipal correspondiente
para que gratuitamente sean incorporados en los catastros municipales,
planes reguladores y mapas de zonificación. ARTÍCULO 111.- …
Los mismos tendrán la consideración de planos municipales
aprobados.
ARTÍCULO 109.- Los planos que prepare el Instituto de ‘a Propiedad
```

- No heading characters for 108.
- Right-column bleed (`ARTÍCULO 111`, procedure numerals, `TÍTULO VI`) sits *inside* the same lines.
- Assigning the remnant to 108 is a human/legal layout call, not a regex.

## External corroboration (not ingested)

TSC PDF `https://www.tsc.gob.hn/web/leyes/Ley-de-la-Propiedad.pdf` (and secondary aggregators) indicate a real Art. 108 exists in this instrument, about planos de lotificación/urbanización remitted by the Instituto de la Propiedad. That confirms the skip is a **gap in this OCR**, not a skip in the statute numbering.

**That external wording is not copied into this corpus.** Using it would mix a different digital edition into the Gaceta-scan identity of this ingest.

## Disposition

| Item | Value |
|---|---|
| `ocr_missing_label` | `[108]` |
| Technical fix in `segmentarGenerico` | **None** (nothing to match) |
| Invented heading/body | **Forbidden** |
| Queue | **QUEUE_C** (human legal/layout reconstruction from the Gaceta page or a same-edition re-OCR) |
| Prep impact | Art.2 FAIL-HARD is independent (quoted Impuesto Tradición substitute). Art.108 remains a documented unique-number gap after the quoted-heading filter. |

Regression: `tests/ingestar-ley-chunker.test.ts` — “Art.108 OCR gap (fail-closed, no invented heading)”.
