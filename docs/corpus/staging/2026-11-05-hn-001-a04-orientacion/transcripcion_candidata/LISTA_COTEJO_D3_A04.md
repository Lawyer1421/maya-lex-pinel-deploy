# Lista de cotejo D3 · A04 (Decreto 35-2013, La Gaceta 33,222)

**Generada el 2026-11-16** con [`generar_lista_cotejo_d3.py`](generar_lista_cotejo_d3.py), que se puede reproducir y no corrige nada.

| Texto | Hash |
|---|---|
| Transcripción candidata (lo que se cargará) | `A04_transcripcion_candidata.txt`, SHA-256 **`977f0489…6355`**, calculado sobre los **bytes LF** del blob de git. En un checkout de Windows con `core.autocrlf=true`, el archivo del árbol de trabajo tiene CRLF y da otro hash; el script lo rechaza |
| OCR del PDF del TSC (referencia) | paquete `2026-11-16-hn-001-a04-tsc`, `text_sha256` **`f2c67cb4…7fca0a`** |

**Método.**
1. Se cortan los dos textos por los **19 artículos propios del decreto**, que van en serie del 1 al 19. Los artículos citados de otras leyes («ARTÍCULO 973.-») no rompen la serie, y se admite el rótulo espaciado del escaneo («A R T I C U L O 18.-»).
2. Se quitan las líneas de encabezado de página: «La Gaceta», «REPÚBLICA DE HONDURAS - TEGUC…», «Sección A Acuerdos y Leyes», la fecha, «No. 33,222», «A. 41» y sus variantes partidas.
3. Se comparan **palabra por palabra, conservando los guiones**.

En cada diferencia, «izquierda» es lo que dice el OCR del TSC y «derecha» lo que dice la transcripción; «∅» significa que falta. **Hay que comprobar en la imagen de la página indicada que diga lo de la derecha.**

## Resumen por artículo
Archivos: [`lista_cotejo_d3_resumen.csv`](lista_cotejo_d3_resumen.csv) y, con las 434 diferencias, [`lista_cotejo_d3_diferencias.csv`](lista_cotejo_d3_diferencias.csv).

| Art. | Págs. | Tipo | Dif. | Borde derecho (88) | Correcciones firmadas (C01–C06) |
|---:|---|---|---:|---|---|
| 1 | 1–27 | texto | 268 | 21 legibles · 40 parciales · 6 ilegibles parciales | — |
| 2 | 27–28 | texto | 5 | 1 parcial | — |
| 3 | 28–31 | texto | 54 | 7 legibles · 1 ilegible parcial | — |
| 4 | 31–36 | texto | 42 | 7 legibles | — |
| 5 | 36–41 | texto | 38 | 1 legible · 3 parciales · 5 ilegibles parciales | **C04 y C05: firmadas, sin aplicar a la candidata** |
| 6 | 41–42 | texto | 3 | — (pág. 41: 11 líneas con el carácter inicial ausente) | **C06: lectura dual «11»/«511»** |
| 7 | 42 | texto | 1 | — | — |
| 8 | 42–44 | texto | 14 | — | — |
| 9 | 44 | texto | 3 | — | — |
| 10 | 44–45 | texto | 4 | — | **C01: el orden 7)/8) ya está en la candidata; falta «A la» (dice «8) Ala protección»)** |
| 11 | 45 | **igual** | 0 | — | **C02: firmada, sin aplicar (la candidata dice «57»)** |
| 12 | 45 | texto | 1 | — | — |
| 13 | 45 | igual | 0 | — | — |
| 14 | 45 | **igual** | 0 | — | **C03: firmada, sin aplicar (la candidata dice «^34»)** |
| 15–16 | 45 | igual | 0 | — | — |
| 17 | 45–46 | texto | 1 | 2 legibles | — |
| 18–19 | 46 | igual | 0 | 2 legibles | — |

El borde derecho se cuenta por las páginas de cada artículo: una página compartida cuenta en los dos artículos.

**Clases de las 434 diferencias:**
- 182 palabras que solo están en la candidata y 164 que solo están en el OCR. Casi siempre es la **misma palabra cambiada de sitio** por la reconstrucción geométrica (rótulos «k)», «c)», incisos) o **ruido del escaneo** que la candidata descarta;
- 62 palabras distintas;
- 26 uniones o separaciones.

## Importante
- **Que un artículo salga «igual» no prueba que sea correcto.** Los arts. 11 y 14 salen «igual» y aun así contienen errores **comunes** al OCR y a la candidata («57» y «^34»), que solo se ven en la imagen: son C02 y C03, ya firmadas. Lo mismo pasa con C04 y C05 en el art. 5. **El cotejo visual cubre todo el texto**, incluidos los 7 artículos «igual».
- **Las correcciones firmadas aún no están en la candidata.** C01 («A la»), C02 a C05 y, cuando se resuelvan, la pág. 41 y el borde derecho se aplicarán con `tools/corpus/transcripcion-gaceta.ts`, la única vía para cambiar una palabra del texto base. Al aplicarlas, la candidata y su hash cambian, y la firma de D3 se hace **sobre el hash final**, no sobre `977f0489…`.
- **Art. 1 (págs. 1–27):** concentra el 62 % de las diferencias porque transcribe decenas de artículos reformados del Código de la Niñez.

## Borde derecho: revisión a resolución nativa (2026-11-16)
El escaneo incrustado en el PDF es de **200 ppp en las 46 páginas** (1700 × 2339 px). **No existe una resolución mayor:** renderizar a más ppp solo agranda los mismos píxeles. Los 19 dudosos se volvieron a recortar a resolución nativa, más anchos y sin interpolar (`recortes_borde_derecho_nativo/`), porque los 13 pendientes se habían leído a la escala reducida de la hoja de contacto.

| Antes | Después de la revisión nativa |
|---|---|
| 13 `PENDIENTE_LECTURA` | **4 `LEGIBLE`** (B74 «se», B86 «y», B87 «y», B88 «y») · **3 `PARCIAL_BORDE`** con más letras visibles (B78 «niños(as…», B84 «y l…», B85 «niña(s…») · **6 `ILEGIBLE_PARCIAL`** (B70, B79–B83: solo se ve la primera letra) |
| 6 `ILEGIBLE_PARCIAL` | **Confirmados** (B17, B20, B29, B32, B60, B62): la palabra está cortada por el borde del escaneo tras su primera letra |

**Total de los 88:** 33 legibles · 43 parciales · 12 ilegibles parciales · 0 pendientes. Los 12 ilegibles **no se pueden recuperar de este ejemplar**: requieren un segundo ejemplar o la resolución del CLO (plan, §2.3.4).

## Firma del cotejo D3 (cuando la candidata sea definitiva)
«Cotejé la transcripción `<hash final>` contra las 46 páginas del PDF del TSC `fbd87f33…`, incluidos los artículos de la lista anterior, las correcciones firmadas C01–C06 y las resoluciones de la pág. 41 y del borde derecho.»
☐ Conforme ☐ Con correcciones (se regeneran la transcripción y su hash).
