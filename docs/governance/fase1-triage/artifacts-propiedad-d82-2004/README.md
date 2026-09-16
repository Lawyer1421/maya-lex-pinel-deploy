# Propiedad D.82-2004 — local ingest artifacts (not applied)

**SQL_APPLIED=NO** · **PRODUCTION_WRITE_AUTHORIZED=NO**  
These files are provenance for Control Plane `READY_FOR_INGESTION_REVIEW`. They must **not** be executed against Supabase from this PR.

OCR sha256: `8fd84d0c3928fc3a43710326d61311a067469a657d6778a48854a97485208eed`  
`--reject-quoted-heading` · 140 unique accepted rows · Xenova/multilingual-e5-small `quantized:false`

| File | sha256 |
|---|---|
| `ingesta.sql` | `b7a3379ed404e68eae9a6e898255352b5c4700dca8a66b0761fa8835a5bbf592` |
| `ingesta.sql.manifest.json` | `d871f890cdac16dd3c43175f0477f60296e35a191ec735fdec1f3cc5ab27c887` |
| `execute.log` | `7d7e2253ea87744a985fe84b2c0a60bc891a027fa40565d9f496f8dc17c49b01` |

Checks in `ingesta.sql`: unique Art.2 (`…_a2`, body `Las disposiciones de esta Ley…`); Art.108 present (`…_a108`, recovered page-14 lotificación text); 140 `es_norma_vigente=false`; `vigencia_state=NO_VERIFICADO`; no `DELETE`.
