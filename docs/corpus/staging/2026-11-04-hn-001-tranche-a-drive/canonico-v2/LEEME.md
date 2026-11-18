# HN:CODIGO_NINEZ · texto canónico v2 (D3 firmada el 2026-11-18)

| Archivo | SHA-256 |
|---|---|
| [`HN_CODIGO_NINEZ_canonico_v2.txt`](HN_CODIGO_NINEZ_canonico_v2.txt) | **`a7bbbfc9c4ca4f0aa4bc6294065ab1886a4c67181b7c74d76b9187fef3b428c5`** (302 artículos, 186.884 caracteres, encabezados «Artículo N.») |
| [`HN_CODIGO_NINEZ_canonico_v2_manifiesto.json`](HN_CODIGO_NINEZ_canonico_v2_manifiesto.json) | `272e21cbf706107f5702c02e83c9cbd4438ebd9dde1fc3ceafebed97c58e0f60` (`TEXTO_DEFINITIVO_FIRMA_D3`) |
| [`ADJUDICACION_CLO_CODIGO_NINEZ.md`](ADJUDICACION_CLO_CODIGO_NINEZ.md) | Pliego D1–D8: D3 firmada; D1, D2 y D4–D8 pendientes; reglas de ingesta propuestas y bloqueos técnicos |
| [`ensamblar_canonico_v2.py`](ensamblar_canonico_v2.py) | Ensamblador determinista desde la v1 (`69760d6a…`) y el texto de 1996 (`44c5fbe1…`, no versionado) |

**Reproducción:**
```sh
python -I docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ensamblar_canonico_v2.py <texto_d73_96.txt> docs/corpus/staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2
```

**Cambios frente a la v1:**
- Exactamente 19 artículos cambian.
- 5 correcciones «mantener 1996»: arts. 35, 125 b), 156, 159 y 275.
- Se elimina la fuga de nota al pie del art. 284.
- Se insertan 15 espacios en 13 artículos, en palabras pegadas por la extracción («Despachosde» → «Despachos de»).
- No se cambia ninguna letra. Se comprueba que el texto sin espacios de cada artículo no varía.

**Encabezados:** cambian de «Artículo N.-» a «Artículo N.» para que la ingesta segmente igual que el manifiesto. Así, `segmentarArticulos` reproduce los 302 `sha256`.

**No se carga en ninguna base** hasta firmar D1, D2 y D4–D8 (ver el pliego).
