# Lista de cotejo D3 · A04 (Decreto 35-2013, La Gaceta 33,222): v5 definitiva

**Regenerada el 2026-11-16 sobre la v5 definitiva**, después de la ratificación de los rangos de la pág. 1 y de la rectificación de B24, con [`generar_lista_cotejo_d3.py`](generar_lista_cotejo_d3.py), que se puede reproducir y no corrige nada.

| Texto | SHA-256 (bytes LF) |
|---|---|
| **Transcripción final v5** (lo que se firma en D3): [`A04_transcripcion_candidata_v5.txt`](A04_transcripcion_candidata_v5.txt) | **`fa47cc72000a34c4dc56acc9af4ee53b32cc359f72202e4cddd56e0ca78c5b0e`** |
| OCR del PDF del TSC (referencia): paquete `2026-11-16-hn-001-a04-tsc` | `f2c67cb4a019a094cbacb4690323810e7215d0904297483b1a725a4dbb7fca0a` |
| PDF del TSC | `fbd87f3396e5d0b6601a246008a1ae5bd870841b795d75ac42076245a154f2ff` |

La v5 anterior, `35e16537…`, queda **sustituida**. La cadena v2 → v3 (`f70d874b…`) → v4 (`a81d0571…`) → v5, su conciliación y los rangos ratificados de la pág. 1 están en `../03_RESOLUCION_TEXTUAL_A04.md` §4. La v5 no tiene saltos de página: las páginas de cada artículo se toman de la v3, con los mismos 19 artículos.

**Método.** Se cortan los dos textos por los 19 artículos del decreto, se quitan los encabezados (en la v5 ya no queda ninguno) y se comparan palabra por palabra, conservando los guiones. En cada diferencia, «izquierda» es el OCR del TSC y «derecha» la v5; «∅» significa que falta. **Hay que comprobar en la imagen de la página indicada que diga lo de la derecha.** Las 495 diferencias están en [`lista_cotejo_d3_diferencias.csv`](lista_cotejo_d3_diferencias.csv) y el resumen en [`lista_cotejo_d3_resumen.csv`](lista_cotejo_d3_resumen.csv).

## Resumen por artículo (v5 definitiva)
Cada línea del borde cuenta **una sola vez**: pág. 27, el art. 2 empieza en y = 476; pág. 31, el art. 4 en y = 629.

| Art. | Págs. | Tipo | Dif. | `[ilegible]` | Borde: legibles | parciales | ilegibles parc. | Notas |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | 1–27 | texto | 307 | 8 | 21 | 39 | 6 | — |
| 2 | 27–28 | texto | 6 | 0 | 0 | 1 | 0 | — |
| 3 | 28–31 | texto | 56 | 1 | 6 | 0 | 1 | — |
| 4 | 31–36 | texto | 43 | 0 | 3 | 0 | 0 | — |
| 5 | 36–41 | texto | 50 | 6 | 1 | 3 | 5 | C04 y C05 aplicadas; resolución del 2026-11-16 aplicada |
| 6 | 41–42 | texto | 6 | 0 | 0 | 0 | 0 | C06: lectura dual «11»/«511» (sin cambio); pág. 41 resuelta (LECTURA_POR_CONTEXTO_CLO) |
| 7 | 42 | texto | 1 | 0 | 0 | 0 | 0 | — |
| 8 | 42–44 | texto | 14 | 0 | 0 | 0 | 0 | — |
| 9 | 44 | texto | 3 | 0 | 0 | 0 | 0 | — |
| 10 | 44–45 | texto | 5 | 0 | 0 | 0 | 0 | C01 aplicada |
| 11 | 45 | texto | 1 | 0 | 0 | 0 | 0 | C02 aplicada |
| 12 | 45 | texto | 1 | 0 | 0 | 0 | 0 | — |
| 13 | 45 | igual | 0 | 0 | 0 | 0 | 0 | — |
| 14 | 45 | texto | 1 | 0 | 0 | 0 | 0 | C03 aplicada; saltos de la lista verificados en el impreso |
| 15 | 45 | igual | 0 | 0 | 0 | 0 | 0 | — |
| 16 | 45 | igual | 0 | 0 | 0 | 0 | 0 | — |
| 17 | 45–46 | texto | 1 | 0 | 0 | 0 | 0 | — |
| 18 | 46 | igual | 0 | 0 | 0 | 0 | 0 | — |
| 19 | 46 | igual | 0 | 0 | 0 | 0 | 0 | — |
| **Total** | | | **495** | **15** | **31** | **43** | **12** | Fuera del acto: B87 y B88 (pág. 46, columna derecha) |

**Comprobaciones:** 0 encabezados residuales, 0 ``/``, los 19 artículos en serie y **15 `[ilegible]`** (art. 1: 8, art. 3: 1, art. 5: 6). Que un artículo salga «igual» (13, 15, 16, 18 y 19) no prueba que sea correcto: el cotejo visual cubre los 19.

## Qué comprobar en el cotejo D3
1. **Las 63 resoluciones firmadas** aparecen como diferencias en sus artículos (`correcciones_cotejo_resolucion.json`), incluida **B24 «Niñez y la»** (art. 1, pág. 7), ya rectificada.
2. **Las 15 lagunas** `[ilegible]`, en los arts. 1, 3 y 5. Todos son `CONTEXT` por la Decisión 3.
3. **Pág. 41 (art. 6):** las lecturas por contexto firmadas y la cifra dual «11».
4. **El inicio y el final del texto:** que empiece en «D E C R E T O No. 35-2013» y termine en las firmas del Ejecútese, y que los rangos ratificados de la pág. 1 sean solo cabecera y sumario.

## Firma del cotejo D3
«Cotejé la transcripción `fa47cc72000a34c4dc56acc9af4ee53b32cc359f72202e4cddd56e0ca78c5b0e` contra las 46 páginas del PDF del TSC `fbd87f33…`, incluidas las correcciones firmadas C01–C06, las 63 resoluciones del 16-nov-2026 (con B24 rectificada) y los rangos ratificados de la pág. 1.»
☐ Conforme ☐ Con correcciones (se regeneran la transcripción y su hash).

Firmante: ______________________ · Rol: ☐ abogado_revisor_senior ☐ propietario_despacho · Fecha: ____-__-__
