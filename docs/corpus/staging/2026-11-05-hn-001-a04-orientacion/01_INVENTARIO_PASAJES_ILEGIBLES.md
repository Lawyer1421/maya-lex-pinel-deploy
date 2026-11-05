# A04 — Inventario de pasajes ilegibles y lista para cotejar con otro ejemplar oficial

Estado: `RECEIVED / SOURCE_HOLD`. Vigencia: SIN DECLARAR. Marca usada: **ILEGIBLE_EN_ESTE_EJEMPLAR** = el carácter no figura en la imagen de este ejemplar (copia del Drive del propietario); no es un defecto de OCR. La «lectura por contexto» solo orienta al cotejo: **no se adopta** ni se inserta en la candidata.

## Resultado por página
- **Pág. 41 — caracteres ausentes en la imagen: 11 líneas** (el primer carácter está cortado por el borde izquierdo del escaneo).
- **Pág. 45 — ningún carácter ausente en la imagen.** Los 12 inicios de línea raros («:ontentivo», «\DOLESCENCIA», «iel», «rimera», «\o.»…) son errores del OCR: la imagen conserva el texto. Una excepción sin resolver: «Nq.73-96» (la imagen muestra «No.» con un trazo bajo la «o»).
- **Borde derecho (págs. impares):** letras finales de línea cortadas por el borde en la imagen, **parcialmente visibles**; 629 líneas con extremo en el borde, 88 con token final anómalo. Inventario completo, sin lectura propuesta: `transcripcion_candidata/inventario_borde_derecho_pagina.csv`.

## Pasajes que deben cotejarse con otro ejemplar oficial de La Gaceta 33,222 (6-sep-2013)
### A. Pág. 41, columna izquierda — carácter inicial ausente (ILEGIBLE_EN_ESTE_EJEMPLAR)
| id | pág. | y (pt) | OCR | carácter ausente | lectura por contexto (no adoptada) | recorte |
|---|---|---|---|---|---|---|
| P02 | 41 izq | 500 | `íediante Decreto Ejecutivo No.76 de 19 de Enero ` | **m** | mediante | `transcripcion_candidata/recortes_borde_izq/p41_y500.jpg` |
| P04 | 41 izq | 564 | `3 oiga a los(as) parientes de una persona, se en` | **s** | se oiga | `transcripcion_candidata/recortes_borde_izq/p41_y564.jpg` |
| P05 | 41 izq | 582 | `omprendidos(as) en esa denominación su cónyuge o` | **c** | comprendidos | `transcripcion_candidata/recortes_borde_izq/p41_y582.jpg` |
| P06 | 41 izq | 598 | `ompañero(a) de hogar en una unión de hecho debid` | **c** | compañero(a) | `transcripcion_candidata/recortes_borde_izq/p41_y598.jpg` |
| P11 | 41 izq | 746 | `erbalmente, en la forma prescrita por el Código ` | **v** | verbalmente | `transcripcion_candidata/recortes_borde_izq/p41_y746.jpg` |

Hoja de contacto de estos recortes: `transcripcion_candidata/hojas/hoja_borde_izq.jpg`.

### B. Art. 6 — lista introductoria (pág. 41, izq.; fila P01) frente al rótulo del cuerpo (pág. 41, der.)
Ver `00_HOJA_DECISION_CLO.md`, C06. La lista dice «11» (el «5» de «511» está ausente en la imagen); el cuerpo dice «511».

### C. Cotejo recomendado aunque la imagen sea legible
Art. 11 «67» (el OCR dice «57»); art. 14 «334» (el OCR dice «^34»); rótulos 123-F y 207-F; incisos 7) y 8) del art. 10; «Nq.» en el art. 12 (pág. 45); toda la lista de derogaciones del art. 14 (324 cifras).

### D. Borde derecho de las páginas impares
Todas las líneas de `inventario_borde_derecho_pagina.csv`; prioridad: las 88 con token final anómalo.

## Pág. 45 (para constancia: legible en la imagen, error de OCR)
| id | pág. | y (pt) | OCR | nota |
|---|---|---|---|---|
| P12 | 45 izq | 552 | `57, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, ` | La imagen conserva el texto; el OCR leyó mal el inicio de línea. La im |
| P13 | 45 izq | 568 | `Artículos 134; los literales ch), d), e) y f) de` | La imagen conserva el texto; el OCR leyó mal el inicio de línea. |
| P14 | 45 izq | 584 | `171 del Decreto No.73-96 de fecha 30 de Mayo de ` | La imagen conserva el texto; el OCR leyó mal el inicio de línea. |
| P15 | 45 izq | 600 | `:ontentivo del C Ó D I G O D E L A N I Ñ E Z Y L` | La imagen conserva el texto; el OCR leyó mal el inicio de línea. |
| P16 | 45 izq | 616 | `\DOLESCENCIA.` | La imagen conserva el texto; el OCR leyó mal el inicio de línea. |
| P17 | 45 izq | 665 | `leí Decreto Nq.73-96 de fecha 30 de mayo de 1996` | La imagen conserva el texto; el OCR leyó mal el inicio de línea. «Nq.7 |
| P18 | 45 izq | 681 | `iel Código de la Niñez y la Adolescencia, conten` | La imagen conserva el texto; el OCR leyó mal el inicio de línea. |
| P19 | 45 izq | 697 | `Título II del Libro II: Del Capítulo II, las Sec` | La imagen conserva el texto; el OCR leyó mal el inicio de línea. |
| P20 | 45 izq | 713 | `Tercera; los Capítulos I I I y IV; el Capítulo V` | La imagen conserva el texto; el OCR leyó mal el inicio de línea. |
| P21 | 45 izq | 729 | `3 rimera y Segunda; los Capítulos VI y VII.` | La imagen conserva el texto; el OCR leyó mal el inicio de línea. |
| P22 | 45 izq | 776 | `\o. 76-84 de fecha 16 de Agosto de 1984, content` | La imagen conserva el texto; el OCR leyó mal el inicio de línea. |
| P23 | 45 izq | 792 | `CÓDIGO D E FAMILIA.` | La imagen conserva el texto; el OCR leyó mal el inicio de línea. |
