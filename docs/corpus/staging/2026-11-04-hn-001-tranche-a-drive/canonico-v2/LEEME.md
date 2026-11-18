# HN:CODIGO_NINEZ · texto canónico v2 (D3 firmada el 2026-11-18)

| Archivo | SHA-256 |
|---|---|
| [`HN_CODIGO_NINEZ_canonico_v2.txt`](HN_CODIGO_NINEZ_canonico_v2.txt) | **`99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36`** (302 artículos, 186.882 caracteres, encabezados «Artículo N.») |
| [`HN_CODIGO_NINEZ_canonico_v2_manifiesto.json`](HN_CODIGO_NINEZ_canonico_v2_manifiesto.json) | `bd4d067d1ff2980db99a7527d21f9f381d996bb0a2d63933e30f7bcaecb2d372` (`TEXTO_DEFINITIVO_FIRMA_D3`) |
| [`ADJUDICACION_CLO_CODIGO_NINEZ.md`](ADJUDICACION_CLO_CODIGO_NINEZ.md) | Pliego D1–D8: D3 firmada; D1, D2 y D4–D8 pendientes; reglas de ingesta propuestas y bloqueos técnicos |
| [`ensamblar_canonico_v2.py`](ensamblar_canonico_v2.py) | Ensamblador determinista desde la v1 (`69760d6a…`) y el texto de 1996 (`44c5fbe1…`, no versionado) |

**Reproducción:**
```sh
python -I docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ensamblar_canonico_v2.py <texto_d73_96.txt> docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2
```

**Cambios frente a la v1:**
- Exactamente 19 artículos cambian.
- 6 correcciones «mantener 1996»: arts. 35, 125 b) y c), 156, 159 y 275.
- Se elimina la fuga de nota al pie del art. 284.
- Se insertan 15 espacios en 13 artículos, en palabras pegadas por la extracción («Despachosde» → «Despachos de»).
- No se cambia ninguna letra. Se comprueba que el texto sin espacios de cada artículo no varía.

**Encabezados:** cambian de «Artículo N.-» a «Artículo N.» para que la ingesta segmente igual que el manifiesto. Así, `segmentarArticulos` reproduce los 302 `sha256`.

**No se carga en ninguna base** hasta la ingesta autorizada en el pliego firmado.
