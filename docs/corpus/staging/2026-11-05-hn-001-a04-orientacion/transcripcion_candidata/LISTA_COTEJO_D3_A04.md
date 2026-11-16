# Lista de cotejo D3 · A04 (Decreto 35-2013, La Gaceta 33,222)

**Regenerada el 2026-11-16 sobre la candidata v2** con [`generar_lista_cotejo_d3.py`](generar_lista_cotejo_d3.py), que se puede reproducir y no corrige nada.

| Texto | Hash (bytes LF) |
|---|---|
| **Candidata v2**: [`A04_transcripcion_candidata_v2.txt`](A04_transcripcion_candidata_v2.txt), con C01–C05 aplicadas | **`25d7cc59fe3542df3d0de666eab4a47e217ef5398fe2bae6920f683168f40685`** |
| Candidata v1 (base): `A04_transcripcion_candidata.txt` | `977f0489225d5cdf058f852b43b0f8af87b5db30f3128828386fcd2c17066355` |
| OCR del PDF del TSC (referencia): paquete `2026-11-16-hn-001-a04-tsc` | `f2c67cb4a019a094cbacb4690323810e7215d0904297483b1a725a4dbb7fca0a` |

**Cómo se hizo la v2.**
- Se aplicaron las 5 correcciones firmadas de [`correcciones_cotejo_c01_c05.json`](correcciones_cotejo_c01_c05.json) con `aplicarCorrecciones` de `tools/corpus/transcripcion-gaceta.ts`: cada texto buscado debe aparecer exactamente una vez. El script es [`aplicar_correcciones_c01_c05.ts`](aplicar_correcciones_c01_c05.ts) y el manifiesto, [`A04_transcripcion_candidata_v2_manifiesto.json`](A04_transcripcion_candidata_v2_manifiesto.json).
- Con respecto a la v1 cambian **5 líneas y nada más**:

| Corrección | Pág. | v1 | v2 |
|---|---:|---|---|
| C04 | 38 | «"ARTÍCULO 123-E- Se prohibe a toda autoridad» | «"ARTÍCULO 123-F.- Se prohíbe a toda autoridad» |
| C05 | 40 | «"ARTÍCULO 207-E- Mientras el(la) deudora) no cumpla» | «"ARTÍCULO 207-F.- Mientras el(la) deudor(a) no cumpla» |
| C01 | 45 | «8) Ala protección» | «8) A la protección» (el orden 7)/8) ya estaba en la v1) |
| C02 | 45 | «66, 57, 68» | «66, 67, 68» |
| C03 | 45 | «333, ^34, 335» | «333, 334, 335» |

- C06 no se modifica: se mantiene la lectura dual.
- **La v2 aún conserva los encabezados de página dentro del texto.** Se quitan en un paso aparte antes de la firma D3, y eso cambiará el hash otra vez.

**Método de la lista.**
1. Se cortan los dos textos por los **19 artículos propios del decreto**, en serie. Los artículos citados de otras leyes no rompen la serie, y se admite el rótulo espaciado «A R T I C U L O 18.-».
2. Se quitan las líneas de encabezado de página.
3. Se comparan **palabra por palabra, conservando los guiones**.

En cada diferencia, «izquierda» es lo que dice el OCR del TSC y «derecha» lo que dice la transcripción; «∅» significa que falta. **Hay que comprobar en la imagen de la página indicada que diga lo de la derecha.** Archivos: [`lista_cotejo_d3_resumen.csv`](lista_cotejo_d3_resumen.csv) y, con las 441 diferencias, [`lista_cotejo_d3_diferencias.csv`](lista_cotejo_d3_diferencias.csv).

## Resumen por artículo (v2)

**Borde derecho: cada una de las 88 líneas cuenta una sola vez.** En las páginas compartidas, cada línea se asigna al artículo según la posición del rótulo del artículo siguiente, medida con `pdftotext -tsv`:
- pág. 27: art. 2 en la columna derecha, y = 476;
- pág. 31: art. 4 en la columna derecha, y = 629.

**Las 2 líneas de la pág. 46 (B87 y B88) no son del D.35-2013:** el acto termina en la columna izquierda de esa página y la derecha es el acto siguiente. Lo confirma su texto: «Régimen de Aportaciones Privadas…».

| Art. | Págs. | Tipo | Dif. | Borde: legibles | parciales | ilegibles parciales | Firmadas C01–C06 / otros puntos abiertos |
|---:|---|---|---:|---:|---:|---:|---|
| 1 | 1–27 | texto | 268 | 21 | 39 | 6 | — |
| 2 | 27–28 | texto | 5 | 0 | 1 | 0 | — |
| 3 | 28–31 | texto | 54 | 6 | 0 | 1 | — |
| 4 | 31–36 | texto | 42 | 3 | 0 | 0 | — |
| 5 | 36–41 | texto | 42 | 1 | 3 | 5 | C04 y C05 **aplicadas** |
| 6 | 41–42 | texto | 3 | 0 | 0 | 0 | **Pág. 41: 11 líneas con el carácter inicial ausente**. C06: lectura dual «11»/«511» |
| 7 | 42 | texto | 1 | 0 | 0 | 0 | — |
| 8 | 42–44 | texto | 14 | 0 | 0 | 0 | — |
| 9 | 44 | texto | 3 | 0 | 0 | 0 | — |
| 10 | 44–45 | texto | 5 | 0 | 0 | 0 | C01 **aplicada** |
| 11 | 45 | texto | 1 | 0 | 0 | 0 | C02 **aplicada**. Arts. 134/141: relación pendiente (no cambia el texto) |
| 12 | 45 | texto | 1 | 0 | 0 | 0 | — |
| 13 | 45 | igual | 0 | 0 | 0 | 0 | — |
| 14 | 45 | texto | 1 | 0 | 0 | 0 | C03 **aplicada** |
| 15–16 | 45 | igual | 0 | 0 | 0 | 0 | — |
| 17 | 45–46 | texto | 1 | 0 | 0 | 0 | — |
| 18–19 | 46 | igual | 0 | 0 | 0 | 0 | — |
| **Dentro del acto** | | | **441** | **31** | **43** | **12** | **86 líneas** |
| Fuera del acto (pág. 46, col. der.) | | | | 2 | 0 | 0 | B87, B88 |
| **Total del CSV** | | | | **33** | **43** | **12** | **88** |

**Por qué hay 441 diferencias y no 434:** las 5 correcciones aplicadas ahora aparecen como diferencias frente al OCR, que comparte los errores de la v1 (los arts. 11 y 14 pasan de «igual» a «texto»). Es lo esperado: son justo los cambios que el cotejo debe confirmar en la imagen.

## Pendiente para la revisión D3 (sobre la v2)
1. **Cotejo visual de los 19 artículos**, incluidos los 5 que salen «igual» (13, 15, 16, 18 y 19). Que un artículo salga «igual» no prueba que sea correcto.
2. **Art. 1 (págs. 1–27):** 268 diferencias y la mayor parte del borde derecho (21 legibles, 39 parciales y 6 ilegibles parciales). Es el bloque más largo del cotejo.
3. **Art. 5 (págs. 36–41):** 42 diferencias, con 3 parciales y 5 ilegibles parciales en el borde. Hay que confirmar en la imagen las correcciones C04 y C05 ya aplicadas.
4. **Art. 6 (pág. 41):** las 11 líneas con el carácter inicial ausente y la lectura dual de C06. Requieren un segundo ejemplar o una resolución del CLO (plan, §2.2).
5. **Arts. 2 y 3:** 1 parcial y 1 ilegible parcial en el borde, respectivamente.
6. **Antes de firmar:** quitar los encabezados de página de la v2 y aplicar las resoluciones de la pág. 41 y del borde. La firma D3 se hace sobre el hash que resulte de ese último paso.

## Borde derecho: revisión a resolución nativa
El escaneo incrustado es de **200 ppp en las 46 páginas**; no existe una resolución mayor. Los 19 dudosos se volvieron a recortar a resolución nativa (`recortes_borde_derecho_nativo/`):
- 4 pasaron a legibles: B74, B86, B87 y B88;
- 3 dejan ver más letras: B78, B84 y B85;
- 12 están cortados por el borde después de su primera letra y no se pueden recuperar de este ejemplar.

## Firma del cotejo D3 (cuando la candidata sea definitiva)
«Cotejé la transcripción `<hash final>` contra las 46 páginas del PDF del TSC `fbd87f33…`, incluidos los artículos de la lista anterior, las correcciones firmadas C01–C06 y las resoluciones de la pág. 41 y del borde derecho.»
☐ Conforme ☐ Con correcciones (se regeneran la transcripción y su hash).
