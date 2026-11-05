# Transcripción candidata A04 (separada del extracto bruto)

**No oficial. No sustituye al extracto bruto.** El bruto sigue intacto (`../extractos/…423f965c1cd3.json` y `../../../inbox/2026-11-05-hn-001-a04-orientacion/pending-review/`; text_sha256 `423f965c1cd358896fd18e40f882c4e3e242f9627617d8ef42fc53b3b0d9375b`). Estado `RECEIVED / SOURCE_HOLD`; vigencia SIN DECLARAR.

`A04_transcripcion_candidata.txt` — SHA-256 `977f0489225d5cdf058f852b43b0f8af87b5db30f3128828386fcd2c17066355` (UTF-8, páginas separadas por `\f`, 46 páginas; en la 46 solo la columna izquierda).

## Cómo se construyó
Reconstrucción **geométrica** con las coordenadas de las palabras del propio texto del PDF (`pdftotext -tsv`): cada palabra va a la columna en que cae su centro (en las págs. giradas 180° se pasa al espacio visual), y las palabras de una misma línea base se unen. Efecto: los rótulos («7)», «a)», «1)») vuelven a su cuerpo; se desechan las líneas sueltas de ruido. **No se inserta ni se corrige ningún carácter:** los tokens del OCR se conservan tal cual («lo;», «Centro:», «:ontentivo»…).

## Qué son las 171 líneas señaladas (hallazgo)
No son texto del decreto. Son ruido del OCR del borde derecho y de las bandas oscuras de encabezado del escaneo (19 páginas), en 36 bloques del extracto bruto. Revisión visual: todas las hojas de bloques (`hojas/hoja_sueltas_1…3.jpg`) muestran en esas zonas bordes de imagen, bandas o letras finales cortadas por el borde, sin un glifo propio que corresponda a cada carácter. La posición exacta de cada carácter no es recuperable porque el OCR lo emitió fuera del texto de línea; por eso se registra **por línea** (`lineas_sueltas_171.csv`: página, columna, texto bruto, decisión, recorte del bloque) y **por bloque** (`intervenciones_candidata.csv`, 467 bloques de diferencia, de los cuales 36 contienen esas líneas).
Con las 171 líneas se descartaron también fragmentos de 2–3 caracteres del mismo ruido: en total hay 250 caracteres alfanuméricos solo en el bruto (0.17 %) y 2 solo en la candidata (`reconciliacion_caracteres_por_pagina.csv`).

## Alcance de la verificación visual
- **Revisadas contra la imagen:** los 36 bloques con líneas sueltas; los 23 inicios de línea de las págs. 41 y 45; los incisos 7)–8); las listas de los arts. 11 y 14; los rótulos 123-F, 207-F, 511.
- **No revisados palabra por palabra:** los otros 431 bloques (uniones de rótulos y de líneas por coordenadas, encabezados y pies, retokenización) ni el resto del texto.
- **Borde derecho de páginas impares:** 629 líneas con el extremo pegado al borde; las letras finales están cortadas en la imagen y el OCR las sustituyó. No se propone lectura (`inventario_borde_derecho_pagina.csv`).

## Archivos
`A04_transcripcion_candidata.txt` · `intervenciones_candidata.csv` · `lineas_sueltas_171.csv` · `pasajes_a_cotejar_otro_ejemplar.csv` · `inventario_borde_derecho_pagina.csv` · `reconciliacion_caracteres_por_pagina.csv` · `hojas/` · `recortes_bloques/` · `recortes_borde_izq/`.
