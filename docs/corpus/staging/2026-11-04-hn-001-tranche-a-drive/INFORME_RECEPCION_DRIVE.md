# Recepción del Tramo A desde Google Drive · 2026-11-04

**Producción: 0 escrituras.** Sin SQL productivo, sin cambios a `biblioteca_vectores`, sin V4/V5, sin vigencia declarada. Ningún candidato es autoritativo (`authoritative: false`, vigencia `UNKNOWN`).

## 1. Procedencia (importante)
Los archivos salen del **Google Drive del propietario**, recuperados por el conector de Drive con el ID exacto. Los hashes de abajo prueban la **integridad de esos bytes**; **no** acreditan que provengan de BCH, SDE, CEDIJ, ENAG ni de La Gaceta oficial, ni que el texto sea auténtico o vigente. La institución de origen queda **pendiente de cotejo**, por eso el dominio registrado es `drive.google.com` (no está en el registro de fuentes oficiales) y todo candidato queda en **`SOURCE_HOLD`**.

## 2. Cuadro comparativo
| | A01 Código de Comercio | A02 Decreto 284-2013 | A03 Código de la Niñez (consolidado) | A04 La Gaceta 33,222 (Decreto 35-2013) |
|---|---|---|---|---|
| Archivo en Drive | `Codigo-del-Comercio.pdf` | `DECRETO_284-2013_LEY_DE_GENERACION_DE_EMPLEO_…pdf` | `Código de la Niñez y la Adolescencia (Actualizado al Nuevo Codigo Penal).pdf` | `Codigo_niñezyadolescencia_2013.pdf` |
| Tamaño (conector = metadatos) | 1,438,733 B | 73,426 B | 1,020,627 B | 18,625,608 B |
| **Bytes obtenidos** | sí (1,438,733) | sí (73,426) | sí (1,020,627) | **NO: el conector rechaza archivos > 10 MB** |
| SHA-256 recalculado | `cd8b55fb…680d8b` | `ea81bfa6…7217ae` | `bd115673…93cb` | no calculable |
| Coincide con el declarado | **sí** | **sí** | **sí** | n/a (`fbd87f33…54f2ff` sin contrastar) |
| Páginas (huella del ejemplar) | 418 (419) | 16 (17) | 107 (sin huella) | n/a |
| Identidad | CONFIRMADA | CONFIRMADA (cita D.51-2011, ley que reforma) | CONFIRMADA | n/a |
| Extracción | lectura simple | **dos columnas** (formato Gaceta) | lectura simple | n/a |
| Artículos segmentados | 1,691 (último: 1714) | 40 (1–39 + 1 cita interna) | 299 | n/a |
| Estado real | **SOURCE_HOLD** | **SOURCE_HOLD** | **SOURCE_HOLD** | **no procesable (bytes no recibidos)** |
| Avisos de QA | numeración con saltos/repetidos (ver §3) | repetido «17» (cita interna) | numeración con saltos/repetidos; artículos casi vacíos | n/a |

Hojas para revisión jurídica: `worksheets/*.md` (una por candidato). Recibos con cada comprobación: `receipts/` (cada intento deja el suyo; la primera pasada de A01 y A02 quedó `RECEIVED` por la diferencia de páginas y se reanudó con `--revisado`; esa revisión es **técnica, hecha por Claude por instrucción del propietario, no jurídica**).

## 3. Lo comprobado en cada documento
**A01 · Código de Comercio.** Encabezado «Congreso Nacional de Honduras · Código de Comercio · Norma º 73-50 · TITULO PRELIMINAR»; texto continuo hasta el artículo 1714, sin página vacía. Las 418 páginas frente a la huella de 419 **no** se resolvieron: las páginas 307–308 son continuas y no se localizó una página faltante. Discrepancias de numeración **registradas, no resueltas** (pueden ser del texto fuente, de la extracción o de la edición): faltan los artículos 417, 1000, 1236–1245 y 1661; hay encabezados repetidos o fuera de orden (14, 29, 43, 347, 418, 500, 504, 509, 556, 1018, 1343, 1345, 1511, 1541, 1643, 1662). Defecto del receptor hallado y corregido en esta rama: no reconocía «Articulo º N» (detectaba **1** artículo y el chequeo salía «ok»).

**A02 · Decreto 284-2013.** Reproducción de **La Gaceta No. 33,445 del 5 de junio de 2014** (Poder Legislativo). Contiene el decreto **íntegro**: considerandos, «Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas», artículos 1 a 39, sanción («Dado en … a los ocho días del mes de enero de dos mil catorce»), firmas (Mauricio Oliva Herrera, Presidente por la Ley; Rigoberto Chang Castillo y Ángel Darío Banegas Leiva, Secretarios), «Por Tanto: Ejecútese. Tegucigalpa, M.D.C., 24 de enero de 2014» y firmas del Ejecutivo (Porfirio Lobo Sosa; Carlos Borjas Castejón). Entrada en vigencia: el **artículo 39** la fija «a partir del día de su publicación en el Diario Oficial La Gaceta». La paginación de 16 vs 17 no se explica con el archivo; el texto está completo. El lector PDF avisó de un error de capa opcional, sin efecto en el texto. La Gaceta es de dos columnas: el orden de lectura simple entrelazaba los artículos; se usó extracción por columnas y queda registrado en el recibo.

**A03 · Código de la Niñez.** Edición **consolidada** («Actualizado al Nuevo Codigo Penal»); metadatos del PDF: «codigo niñez [gaceta]», Microsoft Word 2019, creado el 30-ene-2024. Identidad confirmada (título + D.73-96 + contexto). **No se le atribuye vigencia integral**: es un consolidado de procedencia no acreditada. La numeración segmentada tiene saltos, repetidos y artículos casi vacíos (consolidado con remisiones y numeración propia): requiere QA humano.

**A04 · La Gaceta 33,222.** No se pudo obtener: el conector de Drive responde «File too large for download, over limit of 10 MB» (el archivo pesa 18.6 MB). No se intentó ninguna otra vía. Nota: el título del archivo en Drive es `Codigo_niñezyadolescencia_2013.pdf`, que no indica por sí mismo que sea La Gaceta 33,222; eso se acredita con el texto, que no se ha visto.

## 4. Artículos afectados por el Decreto 284-2013 (solo del texto íntegro comprobado, A02)
| Artículo del decreto | Acto normativo | Instrumento afectado | Artículos afectados |
|---|---|---|---|
| **13** | Reforma | **Código de Comercio** (Decreto Legislativo 73-50 y sus reformas) | **14, 15, 18, 157, 169, 189, 193, 210, 222, 224, 226 y 228** (12; coincide con la lista declarada) |
| **37** | **Deroga** | **Código de Comercio** (Decreto Legislativo 73-50 y sus reformas) | **380, 381, 382 y 383** (4) |
| 14 | Reforma | Código Civil | 1782 y 1789 |
| 26 | Reforma | Ley para la Promoción y Protección de Inversiones (Decreto 51-2011) | 21, 40, 42, 43, 44, 45, 46 y 50 |
| 27 | Reforma | Ley de Promoción de la Alianza Público-Privada | 29 y 34 |
| 38 | Deroga | Decreto Legislativo 51-2011 y sus reformas | 36, 37, 38, 39 y 54 |
| 39 | Vigencia | — | Desde su publicación en La Gaceta |
**Hallazgo:** la lista declarada por el proveedor (12 artículos) **omitía** la **derogación de los artículos 380 a 383** del Código de Comercio (art. 37 del decreto). Solo se registran los verbos normativos hallados (reformar, derogar) en el texto; los artículos 7 y otros citan el Código sin modificarlo. Esto **no** sustituye ninguna versión del Código de Comercio: el texto reformado de cada artículo debe cotejarse y reconstruirse versión por versión con el CLO, no tomarse de una consolidación no verificada.

## 5. Decreto 35-2013 (Niñez / Familia)
**Pendiente.** No hay bytes de A04; no se registra ninguna relación con los códigos de Familia, Penal o Civil. Cuando el archivo llegue, el Decreto 35-2013 debe delimitarse **hasta su cierre y firma**: según el propietario, comienza en la página 1 y termina en la 46, donde comienza el Decreto 107-2013. `--paginas 1-46` por sí solo incluye el arranque del acto siguiente; hará falta recortar el texto en la página 46 por el cierre y la firma (ver §7).

## 6. Decisiones jurídicas pendientes para V4/V5 (no las toma el agente)
1. **Procedencia institucional** de A01–A03 (¿BCH, SDE, CEDIJ, otra?): sin ella los candidatos permanecen en `SOURCE_HOLD`.
2. **F1 vs F2:** ¿bastan copias institucionales o se exige La Gaceta original?
3. **A01:** 418 vs 419 páginas; los 13 huecos de numeración (417, 1000, 1236–1245, 1661) y los repetidos: ¿origen en el texto fuente, la extracción o la edición? Fecha del Código de Comercio (1950-02-17 vs 1950-05-01).
4. **A02:** confirmar con La Gaceta original la paginación (16 vs 17) y la fecha de publicación (5-jun-2014) como entrada en vigencia (art. 39); reformas posteriores a 2014.
5. **Código de Comercio:** cómo se reconstruyen las versiones de los 12 artículos reformados y de los 4 derogados (380–383) respecto del texto de A01, sin sustituir versiones históricas por una consolidación no verificada.
6. **A03:** si un consolidado de procedencia no acreditada puede usarse y con qué advertencia; reformas posteriores a 2013/2024.
7. **A04:** obtener los bytes (ver §7) y delimitar el Decreto 35-2013 hasta su cierre y firma.
8. Alta de dominios en el registro (`bch.hn`, `sde.gob.hn`, `se.gob.hn`) solo tras verificación humana.

## 7. Cómo desbloquear A04
El conector no entrega archivos > 10 MB. Opciones, a elección del propietario: (a) adjuntar el PDF directamente al chat; (b) depositarlo en un PR en `docs/corpus/inbox/<lote>/files/` con su `SHA256SUMS`; (c) otra ruta autorizada que entregue los bytes **sin modificarlos** (una versión recomprimida cambia el hash y sería otro documento). Con los bytes: hash del PDF íntegro, extracción por columnas, y delimitación del Decreto 35-2013 por rango de páginas más corte por cierre/firma en la página 46, registrada por separado.

---

## English summary (American English)
Three of the four PDFs were retrieved through the Google Drive connector by exact ID, and their SHA-256 values match the declared ones byte for byte (A01 1,438,733 B, A02 73,426 B, A03 1,020,627 B). **A04 could not be retrieved**: the connector refuses files over 10 MB (the file is 18.6 MB). All three received candidates sit at `SOURCE_HOLD` because their institutional provenance is unproven (the source is the owner's Drive, not BCH, SDE, CEDIJ, or ENAG); nothing is authoritative, in force, or promoted. A01 is the Commerce Code through article 1714 (418 pages, one fewer than the reference copy) with unresolved numbering gaps; A02 contains Decree 284-2013 in full, as printed in La Gaceta No. 33,445, with all 39 articles, the enactment date and signatures. From its verified text, Decree 284-2013 **reforms** Commerce Code arts. 14, 15, 18, 157, 169, 189, 193, 210, 222, 224, 226 and 228 (art. 13) and **repeals** arts. 380–383 (art. 37), a repeal missing from the provider's list; it also amends the Civil Code, the investment law, and the public-private partnership law. A03 is a consolidated edition with no integral validity attributed. Two receiver defects found with the real files were fixed: the segmenter missed the "Articulo º N" heading format, and Gaceta two-column pages needed column-aware extraction. Decree 35-2013 is pending A04's bytes.
