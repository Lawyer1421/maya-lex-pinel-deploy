# A04 — Paquete de revisión offline (Decreto 35-2013, La Gaceta 33,222)

**Estado:** `RECEIVED / SOURCE_HOLD`. Sin incorporación al corpus, sin `--revisado`, sin segmentación para el corpus, sin ingesta, sin V4/V5. Trabajo local; sin push al PR #121 y sin cambios en Supabase, Vercel ni producción. Nada se declara vigente ni oficial.

**Fuente (solo lectura):** PDF íntegro 18,625,608 bytes, 46 páginas, SHA-256 `fbd87f3396e5d0b6601a246008a1ae5bd870841b795d75ac42076245a154f2ff` (verificado de nuevo). Extracto delimitado (págs. 1–46, la 46 solo columna izquierda): `text_sha256 423f965c1cd358896fd18e40f882c4e3e242f9627617d8ef42fc53b3b0d9375b`. La extracción bruta queda sin editar en `../inbox/…/pending-review/` y en `../extractos/`.

## Qué está y qué no está demostrado
| Afirmación | Estado |
|---|---|
| El **orden de lectura** de las págs. 39, 41, 43, 45 quedó corregido | Sí: comparación por página previa/corregida (`comparacion_extraccion_previa_vs_corregida.csv`): mismo multiconjunto de palabras en las 46 páginas; el orden cambia solo en 39, 41, 43 y 45 |
| El conteo idéntico (30,838 palabras) | Control básico; **no** prueba que se conservaran todas las palabras del documento original, ni la adscripción de cada párrafo |
| **Texto jurídico íntegramente cotejado** | **No.** Cotejo palabra por palabra solo de: art. 10 incisos 7)–8) y párrafos finales; listas de los arts. 11 y 14; rótulos 123-F, 207-F; art. 6 (lista); arts. 15–17 (recorte). El resto: verificación estructural (columnas, saltos, secuencia de rótulos), no lectura palabra por palabra |
| Secuencia de los arts. 1–19 | Sí (tabla del informe previo + `cobertura_pagina_columna.csv`, `saltos_columna_pagina.csv`) |

## Resultados por punto
**1. Art. 10, incisos 7) y 8) (p.45 izq).** Recortes a 200 dpi. La lectura visual coincide con la propuesta: 7) «Ser atendida…», 8) «A la protección…», luego los párrafos «Los medios de comunicación…» y «El(la) funcionario(a)…». Texto bruto y transcripción visual están por separado en `registro_correcciones_propuestas.csv` (C01). **Pendiente de revisión del CLO.**

**2. Arts. 11 y 14.** Listas cotejadas completas contra la imagen (art. 14: 324 cifras; tiras a 200 dpi). Única diferencia con el OCR en art. 14: `^34` → **334** (mancha sobre el 3; la secuencia 333–335 la respalda). Art. 11: `57` → **67** (secuencia 62–82; el primer dígito toca el borde recortado). Ambas quedan como **propuesta pendiente CLO**; ninguna cifra quedó irresoluble. Huecos de la lista del art. 14 (cifras no derogadas): 37–46, 49–67, 69–77, 80–93, 234, 248, 250–251, 261, 263–275, 307, 331, 343, 397, 410–426, 428–431 y 434–964; coinciden en el OCR y en mi lectura de la imagen, por lo que son de la fuente (la lectura de la imagen es mía y queda para cotejo humano). Ruido de borde: pág. 45 y 41 con caracteres iniciales recortados **en la imagen** (pérdida de la fuente escaneada, no recuperable: «:ontentivo», «\DOLESCENCIA», «rimera»…); `bordes_escaneo.csv`.

**Hallazgo corregido (ver `../transcripcion_candidata/`).** Las 171 líneas de una sola letra del extracto bruto **no son finales de línea desplazados**: son ruido del OCR del borde derecho y de las bandas de encabezado (no figuran como texto en la imagen). Lo que sí ocurre en el borde derecho de las páginas impares es que la imagen corta las letras finales de las líneas (parcialmente visibles) y el OCR las sustituye por signos o las pierde («lo;», «Centro:»). Está inventariado en `inventario_borde_derecho_pagina.csv`; no se propone lectura. La corrección de la fase anterior (C11) queda sustituida por `transcripcion_candidata/`.

**3. Art. 1, págs. 1–27.** Cobertura por página y columna en `cobertura_pagina_columna.csv` (91 filas). Verificación visual: **estructural** en montajes de págs. 1–28 (`vistas_art1/`), más lectura a 200 dpi de los recortes citados; **no** lectura palabra por palabra. Control de adscripción: los 123 artículos que declara el art. 1 aparecen como rótulo citado en el cuerpo (123/123; el 260 lleva viñeta que enmascara el rótulo; no hay duplicados ni citados no declarados) y en orden creciente. En arts. 3, 4, 5, 6, 8 el cruce declarado↔transcrito también cierra, con las excepciones C04–C06 y C09. Bloque editorial de La Gaceta incrustado en p.2 der. (C10). Comparación previa/corregida por página: sin diferencias de contenido; solo el orden en 4 páginas.

**4. Matriz preliminar.** `matriz_preliminar_reformas_derogaciones.csv/.json`: **587 filas**, una por disposición afectada (norma, artículo, tipo de cambio, ubicación página-columna, estado de cotejo, nota A03, observaciones). Columna `vigencia`: «SIN DECLARAR» en todas.

## Cruce con las 153 notas del consolidado A03 (Niñez)
- Reformas (art. 1): A04 declara 123 artículos; A03 tiene nota de 35-2013 para 122 de ellos. **Diferencia: art. 21** (A03 solo registra «Derogado mediante Decreto 130-2017»).
- Adiciones (art. 3): 14 = 14, mismos rótulos.
- Derogaciones (art. 11): A03 registra los rangos 62–72 y 73–82, **«134 inciso ch)» y «134 inciso d)»**, 170 y 171. El decreto deroga el **artículo 134** y los **literales ch), d), e) y f) del artículo 141**. **Diferencia a decidir por el CLO:** A03 atribuye los literales ch) y d) al art. 134 y no tiene nota para el 141.
- 35-2013 aparece además en notas «TITULO»/«MODIFICA (división)» (denominaciones, art. 2 y art. 12); sin cotejo fino en este paquete.

## Discrepancias internas de la fuente (no corregidas)
«23 nuevos artículos» (designa 14); «treinta y seis (36)» (designa 34); «ocho (8)» (designa 9); fecha del Decreto 144-83: 1983 (arts. 7–8) y 1993 (art. 15); art. 6 «Decreto Ejecutivo … 19 de Enero de 1906».

## Decisiones/pendientes para el CLO
1. Aprobar o rechazar C01 (incisos 7/8 del art. 10) y C02–C06 (cifras y rótulos).
2. Resolver la atribución de los literales ch)/d): art. 134 (A03) vs art. 141 (decreto).
3. Art. 21 de la Niñez: reforma de 35-2013 y derogación posterior (130-2017) en A03.
4. Discrepancias numéricas y de fecha de la fuente (C08, C09).
5. Aprobar el descarte de las 171 líneas de ruido y decidir cómo cotejar los finales de línea del borde derecho con otro ejemplar.
6. Procedencia oficial del PDF (SOURCE_HOLD): sigue sin acreditarse.

## Archivos
`recortes/` (PNG a 200 dpi), `vistas_art1/` (montajes), `cobertura_pagina_columna.csv`, `saltos_columna_pagina.csv`, `comparacion_extraccion_previa_vs_corregida.csv`, `bordes_escaneo.csv`, `registro_correcciones_propuestas.csv`, `matriz_preliminar_reformas_derogaciones.csv/.json`.
