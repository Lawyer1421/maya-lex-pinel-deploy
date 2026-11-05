# Conciliación: 250 caracteres solo en el bruto y 2 solo en la candidata

Criterio: caracteres alfanuméricos (letras con tilde y ñ incluidas, dígitos), contados por página sobre el extracto bruto (`text_sha256 423f965c…`) y la candidata (`977f0489…`). Total bruto 146,068; total candidata 145,820; diferencia neta 248 = 250 − 2.

## Los 2 caracteres solo en la candidata
Son dos **«P»**, una en la pág. 43 y otra en la pág. 45, en el encabezado de página «… TEGUCIGAL**P**A, M. D. C., 6 DE SEPTIEMBRE DEL 2013». En el bruto, la media línea izquierda del encabezado termina en «- TEGUCIGAL» y la derecha empieza en «A , M . D. C .», porque el recorte por columnas corta la palabra en el centro de la página (en esas dos páginas, giradas 180°, la «P» cae del otro lado). La candidata asigna cada palabra entera a una columna por su centro, une las palabras de la misma línea base y recupera la «P». Es **texto de encabezado, no jurídico**.

## Los 250 caracteres solo en el bruto
| Clase | Alfanum. | Qué son |
|---|---|---|
| Líneas de 1 carácter | 144 | Líneas sueltas del bruto (de las 171, las alfanuméricas; el resto son signos) |
| Fragmentos de 2–3 caracteres | 49 | Fragmentos como «es», «a,», «ia» en los mismos bloques de ruido |
| Tokens enteros de líneas largas | 3 | Tres letras sueltas dentro de líneas (p. 29 y p. 37) |
| Restos dentro de tokens que difieren | 54 | Caracteres dentro de tokens del bruto que la candidata no repite (tokens de ruido como «Ps&PIII^^», encabezados recortados, retokenización). **No atribuibles token a token: INCIDENCIA ABIERTA.** |
Detalle: `reconciliacion_250_atribucion.csv`, `reconciliacion_caracteres_por_pagina.csv`.

## Corrección a lo dicho antes sobre las 171 líneas
Dije que todas eran ruido. No todas: en esos mismos bloques había **255** caracteres alfanuméricos en líneas cortas, y solo 193 faltan en la candidata. Los 62 restantes coinciden con caracteres de la candidata; **52** de ellos son las letras finales de palabras de la columna izquierda que cruzan la medianera (x = 306 pt) y que el recorte del bruto había cortado y mandado a la columna derecha como líneas sueltas; la candidata las devuelve a su palabra: **61 palabras** (65 caracteres reunidos, 52 alfanuméricos). Los otros 10 coinciden con otros caracteres de la candidata (p. ej. encabezados) y no se atribuyen. Las 61 se verificaron contra la imagen (`hojas/hoja_palabras_reunidas_1/2.jpg`, `palabras_reunidas_61.csv`): todas están completas y legibles en la imagen; en 5 la **puntuación** que aporta el OCR difiere de la imagen (W09, W14, W31, W45, W53): incidencia abierta.
Por eso `lineas_sueltas_171.csv` no puede afirmar «ruido» para cada línea: el OCR emitió esos caracteres fuera del texto de línea y no se puede fijar cuál va con cuál palabra. Decisión propuesta: **descartar las líneas como líneas, reunir los 65 caracteres en sus 61 palabras, y dejar abierto el reparto fino.**

## Dos listas separadas (pendiente de cotejo)
**A. Descartados como ruido de OCR** (193 alfanuméricos + los signos de las 171 líneas): `lineas_sueltas_171.csv` y `reconciliacion_250_atribucion.csv`.
**B. Bloques modificados por coordenadas que aún requieren cotejo:** (i) las 61 palabras reunidas (`palabras_reunidas_61.csv`); (ii) 467 bloques de diferencia, de los que 236 no cambian caracteres (solo unión/reordenación) y 231 sí (`intervenciones_candidata.csv`, `reconciliacion_250_2_por_bloque.csv`); revisados visualmente: los 36 bloques con líneas sueltas y las 61 palabras; el resto sin lectura palabra por palabra.
