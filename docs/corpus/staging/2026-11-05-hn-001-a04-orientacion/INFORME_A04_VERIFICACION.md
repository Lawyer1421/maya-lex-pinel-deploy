# A04 — Verificación de la extracción (Decreto 35-2013, La Gaceta 33,222)

**Alcance:** solo entorno offline. Sin Supabase, Vercel, SQL ni producción. Estado de incorporación: **RECEIVED / SOURCE_HOLD — lote detenido** (ver «Punto de detención»). Nada se declara vigente ni oficial.

## Fuente (solo lectura)
- Bytes: 18,625,608 · páginas: 46 · SHA-256 del PDF íntegro: `fbd87f3396e5d0b6601a246008a1ae5bd870841b795d75ac42076245a154f2ff` (coincide con el esperado).
- Procedencia: copia del Drive del propietario, recompuesta desde dos ZIP; la institución de origen sigue pendiente de cotejo. El hash prueba bytes, no autenticidad.
- SHA-256 del texto delimitado (págs. 1–46, la 46 solo columna izquierda): `423f965c1cd358896fd18e40f882c4e3e242f9627617d8ef42fc53b3b0d9375b` (sidecar `extractos/HN-001-A04-fbd87f3396e5-423f965c1cd3.json`). La primera extracción (`d93edfa2d1a3…`) queda archivada en `superseded-primera-extraccion/` porque ordenaba mal las columnas de 4 páginas.

## Orientación de las cuatro páginas afectadas
Las páginas **39, 41, 43 y 45** declaran `/Rotate 180` en los metadatos (el resto, 0). `pdftotext -x/-W` recorta en un espacio en el que la mitad izquierda **no** es la izquierda visual en esas páginas. La decisión **no se toma por el metadato**, sino por el contenido: por página se compara cada recorte con la columna izquierda que `pdftotext -layout` lee (líneas de dos segmentos hacia el centro) y se intercambian las mitades si el recorte derecho coincide más. Se hace una sola vez, antes de delimitar y de aplicar «solo columna izquierda» a la última página.

| Pág. | /Rotate | Coincidencias recorte izq. / der. | Decisión |
|---|---|---|---|
| 39 | 180 | 14 / 125 | invertido |
| 41 | 180 | 12 / 66 | invertido |
| 43 | 180 | 20 / 72 | invertido |
| 45 | 180 | 12 / 119 | invertido |
| 1–38, 40, 42, 44, 46 (42 páginas) | 0 | recorte izq. mayor | directo (control) |

Ninguna página quedó «sin evidencia». El registro completo por página está en el sidecar (`orientacion_paginas`). Comprobación de omisiones/duplicaciones: la primera y la segunda extracción tienen el **mismo** multiconjunto de palabras (30,838 en ambas; diferencia 0): solo cambió el orden.

## Secuencia de los artículos 1–19 contra el PDF
Verificada visualmente en las págs. 1, 44, 45 y 46 (imagen del PDF). Los rótulos están tal como figuran en la fuente.

| Art. | Inicio (pág., col.) | Fin (pág., col.) | Incidencias |
|---|---|---|---|
| 1 | 1 der | 27 der | Reforma del Código de la Niñez; extensa (págs. 1–27). Sin verificación visual página a página en este informe. |
| 2 | 27 der | 28 izq | — |
| 3 | 28 izq | 31 der | — |
| 4 | 31 der | 36 der | Reforma del Código de Familia. |
| 5 | 36 der | 41 izq | Págs. 39 y 41 giradas (corregido). |
| 6 | 41 izq | 42 izq | Reforma del Código Civil; el rótulo «CÓDIGO PENAL» abre el art. 7. |
| 7 | 42 der | 42 der | Rótulo «CODIGO PENAL». |
| 8 | 42 der | 44 izq | Págs. 43 girada (corregido). |
| 9 | 44 der | 44 der | Rótulo «CODIGO PROCESAL PENAL». |
| 10 | 44 der | 45 izq | **Salto de página y columna** (ver punto de detención). Rótulo «LEY CONTRA LA VIOLENCIA DOMESTICA». |
| 11 | 45 izq | 45 izq | Derogatoria (Código de la Niñez, Decreto 73-96). OCR: borde izquierdo recortado («:ontentivo», «\DOLESCENCIA»); «57» en la lista parece «67». |
| 12 | 45 izq | 45 izq | Derogatoria de denominaciones. OCR: «leí», «iel», «Nq», «rimera», «3» suelto. |
| 13 | 45 izq | 45 izq | Derogatoria (Código de Familia, art. 131). OCR: «\o.» por «No.». |
| 14 | 45 der | 45 der | Derogatoria del Código Civil. Lista numérica larga: «^34» por «334» (OCR). Ver nota. |
| 15 | 45 der | 45 der | Derogatoria del art. 179-C del Código Penal. |
| 16 | 45 der | 45 der | — |
| 17 | 45 der | 45 der | Continúa en la pág. 46 izq (art. 18) sin pérdida. |
| 18 | 46 izq | 46 izq | Transitorio. |
| 19 | 46 izq | 46 izq | Vigencia; seguido de la fecha de emisión, las firmas (incl. GLADIS AURORA LÓPEZ CALDERÓN) y «Por Tanto: Ejecútese». |

**Transiciones 10→11→…→17→18 (págs. 44–46):** art. 10 empieza al pie de la pág. 44 (col. der.), continúa arriba de la pág. 45 (col. izq.; incisos 7 y 8 y el párrafo final); le siguen en esa columna los arts. 11, 12 y 13; la columna derecha de la pág. 45 contiene los arts. 14–17; la pág. 46 (col. izq.) los arts. 18 y 19 y las firmas. El orden extraído coincide con el visual.

## Delimitación (pág. 46)
- Última página solo columna izquierda; el Decreto 107-2013 empieza en la columna derecha de esa página y **no** entró al extracto (entrada efectiva: no). Aparece una vez en el sumario de la pág. 1 («Decretos Nos.: 107-2013, 120-2013…»), contado como mención y no como contaminación.
- Cierre hallado: «Por Tanto: Ejecútese» y «GLADIS AURORA LÓPEZ CALDERÓN».

## Punto de detención (ambigüedad abierta)
**Art. 10 (art. 23 reformado de la Ley contra la Violencia Doméstica), incisos 7) y 8), pág. 45 col. izq. (continuación desde pág. 44 col. der.):** la capa de texto emite el cuerpo del inciso 8 («A la protección del derecho a la intimidad…») **antes** que el del inciso 7 («Ser atendida para dictamen…») y deja los rótulos «8)» y «7)» sueltos y en ese orden, de modo que en el texto extraído «8)» queda pegado al cuerpo del 7 y «7)» al cuerpo del cierre. En la imagen el orden es 7) «Ser atendida…», 8) «A la protección…», y luego los dos párrafos finales («Los medios de comunicación…», «El(la) funcionario(a)…»). La adscripción rótulo-cuerpo **no es fiable en el texto extraído**: requiere cotejo humano y, si procede, una corrección explícita como evento nuevo (no edición silenciosa). Los incisos 1–6 (pág. 44) no tienen este problema. Los arts. 11–17 no se ven afectados.

Por esa ambigüedad el paquete **no** pasa a `--revisado`, no se envía al receptor, no se segmenta para el corpus y no se completa la matriz de reformas/derogaciones en este tramo.

## Otras incidencias (no corregidas)
- Ruido de OCR por el borde recortado del escaneo (págs. 39–45) y letras sueltas marginales (p. ej. «s r d e o» entre los arts. 187-A y 280-A).
- Listas numéricas de derogación (arts. 11 y 14): cualquier uso jurídico exige transcribirlas contra la imagen; no se confía en el OCR.
- «Hondureno» sin tilde y similares: se conservan como figuran.

## Estado separado
- **Extracción:** completada y verificada contra el PDF (orden de columnas y páginas correcto, salvo la adscripción de los incisos 7/8 del art. 10).
- **Incorporación al corpus jurídico:** **no incorporado.** Estado `RECEIVED`, `SOURCE_HOLD`; sin V4/V5, sin receptor, sin CLO_PENDING.
