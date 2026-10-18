# Propiedad D.82-2004 — quoted-heading dry-run (opt-in flag)

OCR sha256: `8fd84d0c3928fc3a43710326d61311a067469a657d6778a48854a97485208eed`  
(updated file includes page-14 re-OCR of Art.108 inserted before Art.109)  
Command: `npx tsx scripts/ingestar-ley.ts … --reject-quoted-heading`  
`PRODUCTION_WRITE_AUTHORIZED=NO` · `SQL_APPLIED=NO`

## Art.2 uniqueness + Art.108 recovered

| Mode | Candidatos | Aceptados | Rechazados | Dup gate | Art.2 | Art.108 |
|---|---:|---:|---:|---|---|---|
| default (flag false) | 149 | 141 | 8 | FAIL-HARD `2(x2)` | Propiedad + Impuesto quotation | present |
| `--reject-quoted-heading` | 149 | **140** | 9 | **pass** | **one**: `Las disposiciones de esta Ley…` | **present**: `Los planos de lotificación y urbanización…` |

The extra reject vs flag-false is exactly `«ARTÍCULO 2.- El monto del impuesto de tradición…` (stays inside Art.140). Mid-sentence `Reformar el Artículo 2 de la Ley…` was already rejected.

Guillemet `«` is sufficient to reject a quoted heading; `"` / `“` require reform framing so OCR U+201C on real **Art.49** is kept.

## Observed unique accepted nums

**140 unique** accepted `num_articulo` values. **Do not invent ROW_COUNT fail-hard.** Observed gaps vs 1–142:

| Num | Disposition |
|---|---|
| **108** | **Recovered** — page-14 re-OCR of the same Gaceta scan (technical OCR_MISS). See `propiedad-d82-2004-art108-ocr-gap.md`. |
| **18** | Pre-existing OCR: label is `ARTÍCULO 18,-` (comma, not period), so `PATRON_CANDIDATO` does not match. Body is present. Not invented. |
| **46** | Pre-existing: `ARTICULO 46. es repistradores…` fails uppercase-after-separator (`tieneEncabezadoArticulo`); not invented |

No extra nums. No invented article text. Civil scripts untouched.

## Local execute artifacts (gitignored `out/`, not applied)

Regenerated against the updated OCR (`8fd84d0c…5208eed`) after Art.108 recovery. Xenova/multilingual-e5-small `quantized:false`. **SQL_APPLIED=NO**.

| Artifact | Path | Notes |
|---|---|---|
| SQL | `out/ingesta-propiedad-d82-2004/ingesta.sql` | **140** filas, ~703 KB, staging `stg_ley_propiedad_82_2004`, `INSERT … ON CONFLICT DO NOTHING`, no DELETE |
| Manifest | `out/ingesta-propiedad-d82-2004/ingesta.sql.manifest.json` | `batch_id=mayalex_normativos:ley_propiedad_82_2004__8fd84d0c3928` |
| Execute log | `out/ingesta-propiedad-d82-2004/execute.log` | `[140/140] Art. 139... OK` including `[107/140] Art. 108... OK` |

PR #37 invariants: every row `es_norma_vigente=false`; metadata/manifest `vigencia_state=NO_VERIFICADO`. Unique Art.2 body starts `Las disposiciones de esta Ley…`. Art.108 row is the recovered lotificación text (`sezn` kept). Impuesto quotation lives inside Art.140 only.
