# A04 — Registro del segundo ejemplar (copia con sello CEDIJ)

**Fecha del registro:** 2026-11-18 · **Aportado por:** el Titular (archivo de su respaldo local) · **Vigencia:** SIN DECLARAR · **Producción y staging:** sin cambios.

> Este registro **no aprueba nada** ni modifica la transcripción v6 firmada. Deja constancia del ejemplar y del cotejo. Las decisiones están en `07_HOJA_DECISION_COTEJO_EJEMPLAR2.md`.

## 1. Identidad del archivo

| Campo | Ejemplar 1 (TSC, ya registrado) | **Ejemplar 2 (este registro)** |
|---|---|---|
| SHA-256 | `fbd87f3396e5d0b6601a246008a1ae5bd870841b795d75ac42076245a154f2ff` | **`b5db8bf75ffba91eb79d0878b275527e5be68511e94915dcf7f8b92a4aad34b9`** |
| Tamaño | 18.625.608 bytes | 33.051.155 bytes |
| Páginas | 46 | 46 |
| Productor / creador | EPSON Scan | `MergerPdf.dll` (título interno `PDF41.tmp`, PDF 1.3) |
| Fecha interna | CreationDate 2013-10-28 16:40:39 (hora de América Central) | sin fecha interna; fecha del archivo en disco 2013-10-29 |
| Imágenes | 1700 × 2339 px, 200 ppp, JPEG 2000 | 2480 × 3507 px, 300 ppp, JPEG, RGB |
| Tamaño de página | 612 × 842 pt | 595 × 842 pt (A4) |
| Capa de texto | sí (OCR) | **no** (solo imágenes) |
| Marcas | sin sellos | **sello «Poder Judicial Honduras · Centro Electrónico de Documentación e Información Judicial» (CEDIJ)** en la pág. 1; restos del mismo sello en las págs. 21 y 26 |

**Es un ejemplar distinto:** los bytes, el escaneo (resolución, formato y encuadre) y las marcas son diferentes. Cumple la condición que fijó la firma C01–C06 para el cotejo («bytes distintos de `fbd87f33…`»).

**El PDF no se sube al repositorio.** Sigue la práctica del corpus: se registra por hash. El archivo queda en el equipo del Titular: `Escritorio\backup archivos de pinel\poder especial de represntacion de menores\PDF ALL\Decreto 352013 Reformas Codigo de la Niñez y Adolescencia.pdf(31.5MB).pdf`.

## 2. Procedencia — NO ACREDITADA

- No hay URL de descarga, registro de descarga ni encabezados HTTP. El sello CEDIJ y la fecha de 2013 **sugieren** que es una copia del Centro Electrónico de Documentación del Poder Judicial, pero **no lo prueban**.
- No pasó por `tools/corpus/receive-pdf.ts`. Ese procedimiento exige una URL https y una capa de texto, y rechazaría este archivo como «escaneo sin texto» (`RECEPCION_PDF_TRAMO_A.md` §3.4). Por eso **no se usa como fuente del texto**: sirve **solo para cotejo visual**, con la marca `COTEJO_EJEMPLAR_2`.
- El SHA-256 prueba que los bytes no cambiaron desde que se calculó. **No prueba la autenticidad** de la publicación.

## 3. Portada y correspondencia de páginas

- **Portada (pág. 1):** «La Gaceta · Diario Oficial de la República de Honduras · Año CXXXVI · Tegucigalpa · viernes 6 de septiembre del 2013 · Num. 33,222 · Sección A». En el sumario: «35-2013 · Código de la Niñez y la Adolescencia · A. 1-46». Coincide con el ejemplar 1.
- **Correspondencia 1:1:** la pág. *n* del ejemplar 2 corresponde a la pág. *n* (A. *n*) del ejemplar 1. Se comprobó con el folio impreso de las págs. 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 26, 27, 29, 31, 33, 35, 37, 38, 40, 41, 45 y 46.
- **Márgenes:** en el ejemplar 2, el borde derecho de las páginas impares y el borde izquierdo de la pág. 41 están completos. Son justo los bordes que el escaneo del ejemplar 1 cortó.

## 4. Resultado del cotejo (resumen)

Revisión visual de las imágenes, a 110 ppp y a 200 ppp para la puntuación. **No se usó OCR.**

| Prioridad (`FUENTES_DE_COTEJO.md`) | Resultado en el ejemplar 2 |
|---|---|
| Borde izquierdo de la pág. 41 (P01–P11) | **Legible.** Confirma las lecturas de la v6 («mediante», «se oiga», «comprendidos(as)», «compañero(a)», «verbalmente»). En P01 se ve el **«5»**: la lista del art. 6 dice **«511»** (ver C06). |
| 88 finales del borde derecho | **69 confirman la v6 · 15 resuelven un `[ilegible]` de la v6 · 2 difieren de la v6 · 2 fuera de alcance** (pág. 46, Decreto 107-2013). Detalle: `paquete-revision/cotejo_ejemplar2_borde_derecho_88.csv`. |
| Art. 6 (C06) | Lista introductoria: «Reformar los Artículos 37, 234, 271, 434, / **511**, 516, 559, 960, 963, 972 y 973». Rótulo del cuerpo: «ARTÍCULO 511.-». **Coinciden.** |
| C01–C05 | **Confirmados:** art. 10, incisos 7) y 8) en ese orden (pág. 45); «67» en el art. 11; «334» en el art. 14; «ARTÍCULO 123-F.- Se prohíbe» (pág. 38); «ARTÍCULO 207-F.- Mientras el(la) deudor(a)» (pág. 40). |
| Arts. 134 y 141 (art. 11) | El ejemplar 2 imprime **lo mismo**: «Artículos 134; los literales ch), d), e) y f) del Artículo 141». La frase está en la publicación misma, no es un defecto del escaneo. El cotejo no resuelve la interpretación, que sigue en `INTERPRETACION_PENDIENTE_CLO` (`PASAJES_134_141.md`). |
| C07 (La Gaceta 34,940 / 39,940) | Fuera de este decreto: el ejemplar 2 no lo resuelve. |

## 5. Lo que este registro NO hace

- No cambia la v6, la firma D3, las filas de staging ni producción.
- No acredita la procedencia ni declara vigencia.
- No sustituye la decisión del CLO sobre los 18 puntos de la hoja 07.
