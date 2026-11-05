# QA de A01–A03 · discontinuidades, segmentación y correspondencia (Prioridad 2)

**Todo lo que sigue es técnico y queda como PENDIENTE de cotejo jurídico; nada se aprueba ni se declara vigente.** Procedencia: Google Drive del propietario (institución sin acreditar) → los tres candidatos siguen en `SOURCE_HOLD`.

## 0. Defectos del segmentador hallados con los documentos reales (corregidos, con pruebas)
| # | Defecto | Efecto antes | Corrección |
|---|---|---|---|
| 1 | No reconocía «Articulo º N» (A01) | 1 artículo detectado en un código de 1,714; el QA salía «ok» | Reconoce la marca ordinal y el encabezado en línea propia; nuevo aviso `ARTICLES_PLAUSIBLE` |
| 2 | El salto de página (`\f`) no contaba como inicio de línea | Se perdían 15 encabezados que caen al comienzo de una página (A01: 165, 231, 372, 384, 566, 595, 619, 698, 766, 937, 1265, 1432, 1469, 1481, 1628) | `\f` es inicio de línea; «Articulo º N» con cuerpo en la misma línea vale |
| 3 | «…por adición al mismo el⏎Artículo 17-A; todos los cuales…» creaba un artículo (A02: 40 segmentos para 39 artículos) | Cita convertida en artículo independiente | El sufijo de letra sin delimitador propio descarta el número base (el motor ya no retrocede a «17-» + «A») |
| 4 | Las notas al pie del consolidado se tomaban por artículos (A03: 21 «repetidos», 7 «retrocesos») y, cuando no iniciaban línea, quedaban **dentro** del artículo anterior | Duplicados falsos y texto de notas mezclado con artículos | Las notas se extraen antes de segmentar (formas: «Artículo N.», «Artículos del N al M.», «Título/Capítulo…», con inciso, partidas por línea en blanco o salto de página) y se devuelven aparte; lo que sigue a la nota vuelve al artículo anterior |
| 5 | Encabezado repetido sin cuerpo («Articulo º 504» + «Artículo 504.-La letra…») contaba dos veces | 1 repetido y 1 artículo vacío falsos | Se funde en uno |
| 6 | Los artículos «Derogado» se avisaban como «casi vacíos» | Parecían fallos de extracción | Chequeo informativo `DEROGATED_MARKED`; no se declara vigencia ni causa |

## 1. A01 · Código de Comercio (Norma 73-50) — 1,705 artículos, 13 ausentes, 4 repetidos
Texto continuo hasta el art. 1714; 418 páginas; sin páginas vacías. **Sin retrocesos de numeración.** A01 **no trae marcas «Derogado» ni notas de reforma**: es un texto sin anotar.
| Número(s) | Hallazgo | Evidencia | Clasificación (no se resuelve) |
|---|---|---|---|
| **417** | ausente; el **418** aparece dos veces | 416→**418**→**418**→419. El primer «418» (pág. 106) trata la cancelación parcial («Podrá pedirse y deberá de decretarse la cancelación parcial…»); el segundo, las anotaciones preventivas. Cuerpos distintos (40 % de palabras comunes) | **Probable error de numeración en la fuente** (el primer «418» ocupa el lugar del 417) |
| **1000** | ausente | La imagen de la pág. 248 muestra 999 → «Bonos generales» → 1001 | **Ausente en la fuente** (comprobado en la imagen; no es error de extracción) |
| **1236–1245** (10) | ausentes | La imagen de la pág. 308 muestra el cuerpo del 1235, un espacio en blanco y el encabezado 1246; las págs. 307–308 son continuas | **Ausentes en la fuente** (comprobado en la imagen). Puede ser omisión de la copia, derogación sin marca o numeración distinta: lo decide el cotejo |
| **1661** | ausente; el **1662** aparece dos veces | 1660→**1662**→**1662**→1663. El primero («El síndico tendrá los siguientes derechos y obligaciones…») y el segundo («Los acreedores podrán acordar la designación de una intervención…») tienen cuerpos distintos (29 % comunes) | **Probable error de numeración en la fuente** |
| **1511, 1541** | repetidos con cuerpo **idéntico** (sin tildes ni espacios) | 1510→1511→1511→1512; 1540→1541→1541→1542 | **Duplicado en la fuente** (artículo repetido); el segundo del 1541 puede ser una versión con tildes corregidas |
| 504 | encabezado doble | «Articulo º 504» seguido de inmediato por «Artículo 504.-La letra de cambio…» | **Falso positivo de segmentación** (ya fundido) |
**Ninguna de las 13 ausencias se puede atribuir a derogación**: el texto no marca ninguna. **Versión que representa A01:** conserva los arts. 380–383 sin marca de derogación y el art. 14 con la redacción **anterior** a la reforma del Decreto 284-2013 («La escritura constitutiva de toda sociedad mercantil deberá contener» frente a «El Contrato Societario debe contener»). **A01 no incorpora el Decreto 284-2013 en los artículos comparados.** (Comprobado solo en esos artículos.)
**Limitación conocida:** los rótulos estructurales («TITULO PRELIMINAR», «LIBRO…», «CAPITULO…») que preceden a un artículo quedan adosados al final del artículo anterior.

## 2. A02 · Decreto 284-2013 — 39 artículos exactos
Segmenta exactamente los artículos 1 a 39, en orden, sin repetidos, sin notas y sin citas internas como artículos (los textos reproducidos entre comillas, como los artículos reformados 14, 15, 18…, no inician segmento). Contenido, cierre y firmas verificados (ver `INFORME_RECEPCION_DRIVE.md` §3) y matriz de cambios en `MATRIZ_CAMBIOS_INTERINSTRUMENTAL.md`.

## 3. A03 · Código de la Niñez consolidado — 302 artículos, 153 notas, 22 derogados marcados
- **Segmentación limpia:** 302 artículos (1–288 y sus letras: 31-A/B, 100-A, 102-A, 104-A, 147-A–E, 180-A/B, 187-A, 280-A…), **0 repetidos, 0 retrocesos**. Los «repetidos» anteriores eran notas al pie.
- **153 notas al pie** separadas de los artículos y conservadas aparte (`notas_al_pie` del candidato; detalle en `matriz_A03_notas_consolidado.json`): reformas y adiciones atribuidas al **Decreto 35-2013** (27-feb-2013, La Gaceta 33,222, 6-sep-2013), derogaciones (arts. 62–72, 73–82, 134 incisos ch) y d), 170, 171) y **una derogación del art. 21 por el Decreto 130-2017** (Nuevo Código Penal; la propia nota agrega «Vigente a partir del 10 de mayo de 2020»: dato del consolidado, **sin verificar**).
- **22 artículos marcados «Derogado»** por la edición (21, 62–71, 73–81, 170, 171) más los 72 y 82 (con el rótulo de la división siguiente adosado): **coinciden con las notas de derogación**. No se declara su vigencia ni su causa.
- **Notas de la edición pegadas a los números:** el texto trae marcas de nota incrustadas («Artículo 1.1 Para todos…», «Derogado59»). Se conservan tal cual (extracción sin editar); el dígito inicial de algunos cuerpos es un número de nota, no texto normativo.
- **Indicio de procedencia, no acreditación:** el texto lleva el pie «www.poderjudicial.gob.hn» en cada página y los metadatos del PDF dicen «codigo niñez [gaceta]», Microsoft Word 2019, 30-ene-2024. Es consistente con una copia del Poder Judicial, pero **no** prueba su origen ni su actualización.
- **Correspondencia con reformas documentadas:** solo el Decreto 35-2013 y el Decreto 130-2017 aparecen como fuente de cambios. **No consta ninguna reforma posterior** a la fecha de la edición (2024) ni se verificó que el consolidado refleje todas las vigentes; las notas de 5 entradas no traen completa la cita de La Gaceta (187-A, 280-A, 73 a 82, 102, 245).

## 4. Resultado del QA por documento
| | Artículos | Notas | Faltantes | Repetidos | Avisos que quedan |
|---|---|---|---|---|---|
| A01 | 1,705 | 0 | 13 (417, 1000, 1236–1245, 1661) | 4 (418, 1511, 1541, 1662) | SEQUENCE_CONTINUOUS, NO_DUPLICATE_NUMBERS (reflejan discontinuidades **reales** de la fuente) |
| A02 | 39 | 0 | 0 | 0 | ninguno |
| A03 | 302 | 153 | 0 | 0 | ninguno de secuencia; 22 «Derogado» informativos |

## 5. Pruebas de regresión
`tests/corpus-segmentacion-documentos-reales.test.ts` (8 pruebas con los textos reales versionados) y `tests/corpus-segmentacion-formato.test.ts` (fixtures sintéticos reproducibles de cada forma de encabezado y de nota). Fijan lo comprobado; lo dudoso queda como pendiente, no se «arregla» por heurística.

## 6. Decisiones de cotejo pendientes
1. A01: ¿los números ausentes (417, 1000, 1236–1245, 1661) son omisiones de la copia, derogaciones sin marca o numeración distinta? ¿418 y 1662 duplicados son erratas de numeración?; 1511/1541 duplicados.
2. A01: qué versión del Código de Comercio representa la copia (anterior al D.284-2013 en los artículos comparados) y de cuándo es.
3. A03: si el consolidado puede usarse como texto de trabajo sin atribuirle vigencia integral; contrastar sus 153 notas con el texto del Decreto 35-2013 (A04) y con La Gaceta 39,940 (D.130-2017); reformas posteriores.
4. Procedencia institucional de A01–A03 (único requisito para salir de `SOURCE_HOLD`).

---

## English summary (American English)
Real-document testing exposed six segmenter defects, all fixed with regression tests: the "Articulo º N" format (A01 had been counted as 1 article), headings at the top of a page after a form feed (15 lost), a quoted "Artículo 17-A;" that created a 40th article in A02, footnotes of the consolidated Children's Code taken as duplicate articles (and sometimes buried inside the previous article), a doubled heading for article 504, and repealed articles flagged as "empty". A01 now has 1,705 articles with 13 numbers genuinely absent from the source (417, 1000, 1236–1245, 1661; 1000 and 1236–1245 confirmed on the page images) and four repeats (418 and 1662 look like numbering errors; 1511 and 1541 are identical duplicates). A01 keeps the wording **before** Decree 284-2013 in the articles compared and shows no repeal marks. A02 segments into exactly its 39 articles. A03 yields 302 articles, 153 separated footnotes, 22 articles marked "Derogado", and a consistent cross-reference to the repeal notes; its only change sources are Decree 35-2013 and Decree 130-2017. Nothing is promoted or declared in force; all three candidates stay at `SOURCE_HOLD`.
