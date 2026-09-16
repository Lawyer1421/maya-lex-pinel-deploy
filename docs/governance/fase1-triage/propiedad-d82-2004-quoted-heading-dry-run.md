# Propiedad D.82-2004 — quoted-heading dry-run (opt-in flag)

OCR sha256: `faf2807a97584c4bdb3d77ff212476386974334fa903eba4a127e0305818f424`  
Command: `npx tsx scripts/ingestar-ley.ts … --reject-quoted-heading` (no `--execute` for this table)  
`PRODUCTION_WRITE_AUTHORIZED=NO` · `SQL_APPLIED=NO`

## Art.2 uniqueness

| Mode | Candidatos | Aceptados | Rechazados | Dup gate | Art.2 accepted |
|---|---:|---:|---:|---|---|
| default (flag false) | 148 | 140 | 8 | FAIL-HARD `2(x2)` | Propiedad body **and** Impuesto Tradición quotation |
| `--reject-quoted-heading` | 148 | **139** | 9 | **pass** (no duplicate nums) | **one**: `Las disposiciones de esta Ley comprenden…` |

The extra reject is exactly `«ARTÍCULO 2.- El monto del impuesto de tradición…` (stays inside Art.140). Mid-sentence `Reformar el Artículo 2 de la Ley…` was already rejected.

First-pass filter that treated any preceding `“` (U+201C) as a quote also dropped real **Art.49** (OCR line-start curly quote, not a legal quotation). Narrowing: guillemet `«` is sufficient; `"` / `“` require reform framing (`deberá leerse así` / `Reformar el Artículo`) within ~200 characters. Art.49 kept.

## Observed unique accepted nums

**139 unique** accepted `num_articulo` values. **Do not invent ROW_COUNT fail-hard.** Observed gaps vs 1–142:

| Num | Disposition |
|---|---|
| **108** | QUEUE_C — heading absent from this OCR (see `propiedad-d82-2004-art108-ocr-gap.md`) |
| **18** | Pre-existing OCR: label is `ARTÍCULO 18,-` (comma, not period), so `PATRON_CANDIDATO` does not match. Body is present. Not invented; out of this PR's quote-filter scope. |
| **46** | Pre-existing: `ARTICULO 46. es repistradores…` fails uppercase-after-separator (`tieneEncabezadoArticulo`); not invented |

No extra nums. No invented article text. Civil scripts untouched.
