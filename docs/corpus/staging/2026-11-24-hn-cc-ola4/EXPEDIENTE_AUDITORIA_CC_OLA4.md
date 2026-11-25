# Expediente de auditoría · OLA 4 · `HN:CODIGO_CIVIL`

**Estado:** D1–D8 FIRMADAS (2026-11-24, Abg. y Not. Fredy Omar Pinel Flores, CLO; paquete sin regenerar, ver §7)
**Instrumento:** Código Civil de Honduras (Decreto del Poder Ejecutivo del 8 de febrero de 1906, bajo el Decreto 76 de la Asamblea Nacional Constituyente) · lote `OLA4_CC_2014_01`
**Fecha del paquete:** 2026-11-24 · **Generador:** `scripts/olas/ola4-cc.ts` + `scripts/olas/paquete-ola.ts`
**Staging:** `mayalexhn-staging` (`aicakncgtuiiuomflkqj`) · **Producción:** `thgrhueckkjdutjvcufp`

> **Cómo se firma.** El CLO revisa §2–§6 y decide D1–D8 en §7. Para firmar, sustituye en la línea **Estado** el texto `PENDIENTE DE FIRMA` por `D1–D8 FIRMADAS` y completa el bloque de firma de §7. El ejecutor (`scripts/olas/ejecutar-sql.ts`) lee la firma solo en esa línea **Estado** y se niega a correr la visibilidad V4 en staging y cualquier paso de producción si este archivo no está firmado o no cita la huella SHA-256 exacta de cada SQL (§8). Si el CLO modifica una decisión, hay que regenerar el paquete: cambian las huellas y este pliego debe volver a citarlas.

## 1. Fuentes y jerarquía

| Rango | Pieza | Archivo · SHA-256 | Uso |
|---:|---|---|---|
| 1 | **La Gaceta No. 33,222 (6-sep-2013), Decreto 35-2013** | Ya en producción V5 (lote `A04_D35_2013_01`). Se lee de `A04_transcripcion_candidata_v8.txt`; el script exige que cada tramo tenga la huella de la fila V5: art. 14 `c6c97388…0a44`, art. 6 `8fc55528…efa2` | **Art. 14:** lista oficial de los 324 artículos del Código Civil derogados. **Art. 6:** texto oficial de los 11 artículos reformados (37, 234, 271, 434, 511, 516, 559, 960, 963, 972, 973) |
| 2 | **Edición consolidada del Poder Judicial** «CodigoCivil(Actualizado2014).pdf» | 2,068,963 bytes, 423 págs., Word 2010 · `c1ebf3ce42af93e567f733555a7a1fafbd41748a00852c5edf0f6537c1e1cb34` | Texto base. Es la fuente que el CLO eligió para la carga legacy y la que reproduce, byte a byte, las 2,372 filas de producción (§2). Sus 43 notas al pie citan cada decreto |
| 3 | «CODIGO CIVIL (CON REFORMAS).pdf» (compilación CSJ) | 1,845,336 bytes, 518 págs., Word→Ghostscript · `ac7baaaedd02e6b71378087a935bc4e977e74cf77c490a0e4a4c183eabfd1b6c` | Cotejo textual de control (§4) y texto de 1906 de los arts. 307 y 397 (§5) |

**Por qué la compilación CSJ no es la base.** Es el archivo que indicó la instrucción, pero no sirve como texto vigente:
- conserva el texto de 1906 de los 324 artículos que el D.35-2013 derogó;
- no tiene notas al pie;
- trae al final, sin integrarlas, solo seis reformas de 1934 a 2009;
- tiene defectos de numeración: encabezados repetidos (43, 493, 499, 501, 604…) y faltan los de 88, 331, 447, 604, 640, 1617 y 1852.

Usarla como base repetiría el problema que esta ola corrige. Por eso se propone como cotejo (D1).

**Extracción.** El texto base sale del extractor validado `scripts/ingesta-civil.ts`, el mismo de la carga legacy (`pdftotext -layout`). Ese extractor ya retiraba las 43 notas y los pies de página, segmentaba con fail-hard y añadía 16 filas para los arts. 21–36, que la edición no imprime. Sobre esa salida, la OLA 4 aplica el saneamiento de §4 y la jerarquía de fuentes de §5.

**Huellas de reproducción:**
- texto consolidado (concatenación «número⏎contenido» de las 2,372 filas): `6b50b316440685d5d6f0a0c663297c54b4766e8d60f656331c7881b541e18a44`;
- [`manifiesto_articulos.json`](manifiesto_articulos.json): `81372f1240f8d14818ead9e5e9cf47a2378f56008ee84d150eb0521dfbf7da8b`;
- [`constancias.csv`](constancias.csv): `bbda3739f65824fbb32b18796ad88c851322d7b21ccf30d3c3274378e4cff923`.

## 2. Situación actual en producción (solo lectura, 2026-11-24)

Producción tiene **2,372 filas legacy** del Código Civil:
- `metadata.norm_id = 'HN_CODIGO_CIVIL_1906'`, ids `mayalex_normativos:cc_1906_a1…a2372`;
- sin `estado_v` ni `instrumento_id`, `verificado = false`;
- 2,001 marcadas vigentes y 371 derogadas, todas visibles.

**La extracción reproduce el legacy.** La huella agregada de `id|hash_texto_sha256|es_norma_vigente` (orden C) de producción es `f98288055d351e6d9f731a7c91ee3750f759b018786433af840db13b02dd76e6`, y el script exige obtenerla. Solo dos filas se retocaron a mano en producción después de la carga: los arts. 675 y 1280, con cambios de espacios y saltos de línea y el mismo texto. Entran con su huella de producción.

| Hallazgo en las filas legacy | Filas |
|---|---:|
| Figuran **vigentes pero están derogadas** por el art. 14 del D.35-2013: arts. **252 a 260** (la edición PJ omite esa derogación) | **9** |
| Figuran derogadas por el D.35-2013, que **no las lista**: arts. **307 y 397** (§5) | **2** |
| Derogación confirmada contra la lista oficial del D.35-2013 | 315 |
| Derogación por otros decretos (D.211-2006, D.161-2000, D.51-2011, D.69-1937) según nota de la edición, sin cotejo con La Gaceta (reserva 6.1) | 54 |
| Reformados por el D.35-2013 cuyo texto de la edición difiere en detalles del oficial (p. ej. «cónyugue» en el art. 37) | 11 |
| Llevan el encabezado «Artículo N.» dentro del contenido | 2,372 |
| Llevan saltos de línea de maquetación y espacios de justificado | 1,948 |
| Llevan pegado al final el epígrafe de la subdivisión siguiente («II. REGLA RELATIVA A LAS PROFESIONES…») | 6 |

*Corrección al inventario de olas.* El inventario describía las 371 derogaciones legacy como «sin fundamento». No es así: las 371 citan su decreto. 315 se confirman contra La Gaceta, 2 no constan en ella (307 y 397) y 54 provienen de notas de la edición aún sin cotejo.

La OLA 4 **no duplica** el instrumento. Al activar V5, el paso 03 oculta las 2,372 filas legacy (`revision_pendiente = true`, marca `sustituido_por_lote`). No las borra: quedan respaldadas en el paso 00 y la reversión 99 las vuelve a exponer.

## 3. Conteo y clasificación propuesta

| Concepto | Filas |
|---|---:|
| Artículos 1–2372, sin huecos ni repetidos (16 de ellos, 21–36, no impresos por la edición: «Derogado») | 2,372 |
| **PRIMARY** elegibles (vigentes, sin `rol`) | **1,992** |
| CONTEXT derogados confirmados por el art. 14 del D.35-2013 | 315 |
| CONTEXT derogados por el art. 14 del D.35-2013 **que la edición omite** (252–260; conservan su texto de 1906 como antecedente) | 9 |
| CONTEXT derogados por otros decretos según nota de la edición (D.211-2006: 50; D.161-2000: 2; D.51-2011: 1; D.69-1937: 1) | 54 |
| **CONTEXT derogados** (`es_norma_vigente = false`), total | **378** |
| **CONTEXT pendientes** (`es_norma_vigente = NULL`): arts. 307 y 397 (§5) | **2** |

Ningún derogado es PRIMARY: el generador lo prohíbe. Los arts. 553 y 2141 (párrafo derogado por el D.211-2006) son PRIMARY con constancia `DEROGACION_PARCIAL`, igual que en la OLA 1.

## 4. Integridad, saneamiento y cotejo

**Saneamiento determinista**, registrado por fila en `metadata.correcciones_saneamiento`:

| Corrección | Filas |
|---|---:|
| `ENCABEZADO_RETIRADO`: el número va en `num_articulo`. La edición varía el formato («Artículo 126 Derogado», sin punto) | 2,372 |
| `REFLUJO_DE_LINEAS`: se unen las líneas y los párrafos partidos a mitad de oración, y se colapsan los espacios de justificado | 1,948 |
| `TEXTO_OFICIAL_GACETA`: texto del art. 6 del D.35-2013 (§5) | 11 |
| `EPIGRAFE_SIGUIENTE_RETIRADO`: epígrafe de la subdivisión siguiente | 6 |
| `TEXTO_1906_DE_COMPILACION_CSJ`: arts. 307 y 397 (§5) | 2 |
| `PUNTO_FINAL_SEGUN_CSJ`: punto final que la edición omite y la compilación CSJ trae con las mismas palabras | 2 |

**Fail-hard.** El script aborta ante cualquiera de estas condiciones:
- encabezado residual, caracteres de control o mojibake;
- marcas de página o de `www.poderjudicial`;
- espaciado anómalo o contenido demasiado corto;
- un derogado con texto distinto de «Derogado»;
- un artículo vigente sin puntuación de cierre.

Hay 22 artículos que terminan sin punto en las dos ediciones y quedan como excepción verificada: 639, 644, 682, 710, 755, 976, 1036, 1069, 1077, 1136, 1235, 1388, 1394, 1431, 1447, 1456, 1603, 1608, 1684, 1725, 1748 y 2124.

**Cotejo de control con la compilación CSJ.** Coeficiente de Dice sobre bigramas de palabras normalizadas: sin acentos, sin puntuación y sin epígrafes en mayúsculas.

| Resultado | Artículos vigentes |
|---|---:|
| Cotejados | 1,985 |
| Idénticos | 1,534 |
| Similitud ≥ 0.95 | 1,747 |
| Similitud < 0.90 | 102 |
| Sin encabezado en la CSJ (88, 331, 447, 604, 640, 1617, 1852) | 7 |

Las 102 diferencias tienen dos causas:
- **reformas que la CSJ no integra:** 84, 619, 621, 2137, 2154, 2141 y los 11 del D.35-2013;
- **defectos de numeración de la CSJ:** por ejemplo 493, 1038, 1059, 1161 y 1260, donde la CSJ repite o desplaza encabezados.

La lista completa está en `manifiesto_articulos.json` → `cotejo_csj.bajo_090`. El cotejo es informativo y no cambia ningún texto, salvo los 2 puntos finales.

## 5. Decisiones de fuente artículo por artículo

**Arts. 252–260 (derogados por La Gaceta, omitidos por la edición).** La lista oficial del art. 14 del D.35-2013 incluye «… 249, 252, 253, 254, 255, 256, 257, 258, 259, 260, 262 …». La edición PJ conserva su texto de 1906 sin nota, y el legacy los muestra vigentes. Pasan a CONTEXT derogados, con la constancia `DEROGACION_GACETA_OMITIDA_EN_EDICION` y su texto conservado como antecedente.

**Arts. 307 y 397 (derogados por la edición, no por La Gaceta).** Las notas 13 y 14 de la edición extienden la derogación a «los Títulos XIV al XVII … excepto los Artículos 331 y 343». La lista oficial, en cambio, salta «306, 308» y «396, 398»: tampoco deroga el 307 ni el 397. La edición los imprime solo como «Derogado», así que se toma su texto de 1906 de la compilación CSJ. El art. 307 trata del aviso del expósito al Registro del Estado Civil; el art. 397 está en el mismo bloque de títulos. Quedan como **CONTEXT con vigencia NULL** hasta que el CLO dictamine (D5). Pueden estar superados tácitamente por la legislación de registro civil y familia, pero no hay derogación expresa.

**Once artículos reformados por el D.35-2013.** Su texto se toma del art. 6 del D.35-2013 oficial. La similitud con la edición va de 0.905 (973) a 1.000 (234, 511, 963): son diferencias de tipografía y erratas de la edición, no de contenido. Cada fila lleva la constancia `TEXTO_OFICIAL_GACETA` con la huella del texto de la edición que sustituye. El art. 960 conserva la puntuación de La Gaceta («intestada: .»).

**Notas de la edición.** Cada una de las 43 notas se liga a sus artículos según la posición verificada de su llamada (`NOTA_ARTICULOS` en el script). Se tipifican así:
- 372 derogaciones;
- 16 reformas;
- 2 derogaciones parciales (553 y 2141);
- 21 referencias «Véase»: nota 35 al art. 1787, nota 40 al 2307, nota 41 al capítulo de títulos sujetos a inscripción (arts. 2312–2330) y la segunda parte de la nota 37 al 2137.

## 6. Reservas que el CLO debe conocer

1. **Derogaciones sin cotejo con La Gaceta.** Son 54, según la nota de la edición:
   - D.211-2006 (Código Procesal Civil, Gaceta 31,313): arts. 513–515, 517, 1495–1538, 2158 y 2367, más los párrafos derogados de 553 y 2141;
   - D.161-2000 (Ley de Conciliación y Arbitraje, Gaceta 29,404): arts. 2019 y 2020;
   - D.51-2011 (Gaceta 32,568): art. 1565;
   - D.69-1937 (Gaceta 10,148): art. 2322.

   Se proponen como derogados porque los cita la edición oficial del Poder Judicial; queda pendiente el cotejo con cada Gaceta.
2. **Reformas anteriores sin cotejo con La Gaceta:**
   - art. 84 (D.180-89, Gaceta 25,997);
   - arts. 619 y 621 (D.104-1950, Gaceta 14,055);
   - arts. 2137 y 2154 (D.37-90, Gaceta 26,131).

   Se usa el texto integrado por la edición. La compilación CSJ transcribe los decretos 180-89 y 37-90 en su apéndice, pero trunca el art. 84.
3. **Leyes posteriores con efecto posible sobre el Código.** La nota 41 remite a la Ley de Propiedad (D.82-2004) para los arts. 2312–2330, que se proponen PRIMARY con constancia `REFERENCIA`. La edición no los da por derogados. La vigencia de esas reglas del Registro de la Propiedad frente a la Ley de Propiedad conviene dictaminarla aparte. Lo mismo vale para efectos tácitos de leyes de familia y registro civil sobre artículos no listados en el D.35-2013.
4. **Corte temporal.** La edición está actualizada a 2014 y el D.35-2013 es la última reforma cotejada. Las reformas al Código Civil publicadas entre 2014 y 2026 quedan para revisión incremental contra el índice de La Gaceta, como en las OLAS 1 y 2.
5. **Stubs 21–36.** Siguen con contenido «Derogado», igual que el legacy. La CSJ trae su texto de 1906, pero no se usa para no mezclar ediciones en filas derogadas sin necesidad.

## 7. Decisiones D1–D8 para firma

| # | Decisión propuesta | Decisión del CLO |
|---|---|---|
| D1 | Fuente PRIMARY: edición PJ 2014, con prevalencia de La Gaceta 33,222 (D.35-2013) sobre la edición; la compilación CSJ «con reformas» queda solo como cotejo y como fuente del texto de 307 y 397. Con las reservas 6.1–6.4 | ☑ **Aprueba**, incluida la reserva 6.1 (54 derogaciones por otros decretos según nota de la edición, pendientes de cotejo con La Gaceta) |
| D2 | Aceptar el saneamiento y el cotejo de §4 (encabezados retirados, reflujo, 6 epígrafes retirados, 2 puntos finales repuestos, 22 excepciones sin cierre) | ☑ Aprueba |
| D3 | Firma del texto consolidado de 2,372 artículos tal como figura en `manifiesto_articulos.json` (huella del texto en §1) | ☑ Firma |
| D4 | Vigencia: 1,992 `true`, 378 `false` (incluidos 252–260 por La Gaceta) y 2 NULL | ☑ Aprueba |
| D5 | Arts. 307 y 397: CONTEXT con vigencia NULL hasta dictamen; o bien, por dictamen del CLO, vigentes (PRIMARY con el texto de 1906) o derogados tácitamente (CONTEXT `false`) | ☑ **Aprueba.** Arts. 307 y 397 se mantienen como CONTEXT, pendientes de cotejo orgánico con el D.76-84 (Código de Familia) y el D.73-96 (Código de la Niñez y la Adolescencia). Sin regenerar el paquete: quedan con `es_norma_vigente = NULL` (ver registro de la firma) |
| D6 | Constancias por fila en `metadata.constancias` (notas de la edición, texto oficial del D.35-2013, derogación omitida por la edición, derogación no constante en La Gaceta; ver `constancias.csv`) | ☑ Aprueba |
| D7 | Al activar V5, ocultar (sin borrar) las 2,372 filas legacy `mayalex_normativos:cc_1906_a*`, con respaldo previo y reversión 99 | ☑ Aprueba |
| D8 | Autorizar V4 en staging y V5 en producción, exactamente para los SQL y huellas de §8, mediante `ejecutar_staging.ps1` y `ejecutar_prod.ps1` | ☑ Autoriza |

Firma: **aprobado** · Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex) · Fecha: 2026-11-24

*Registro de la firma.* El CLO comunicó en la sesión de trabajo del 2026-11-24 la aprobación de D1–D8, con determinación expresa sobre D1, D5 y la reserva 6.1, y ordenó firmar **sin regenerar el paquete**. Claude Code transcribió las decisiones por su instrucción. En el paquete firmado, los arts. 307 y 397 son CONTEXT con `es_norma_vigente = NULL` (vigencia `PENDIENTE_CLO`): no son PRIMARY ni se presentan como derogados. Si el CLO quiere que figuren con vigencia `true`, hay que regenerar el paquete y volver a firmar sobre las nuevas huellas. La firma cubre exactamente las huellas de §8 (texto `6b50b316…8a44`; 1,992 PRIMARY, 378 CONTEXT derogados, 2 CONTEXT pendientes). *Confirmación del CLO (2026-11-24):* se mantiene el paquete firmado sin regenerar, con los arts. 307 y 397 en CONTEXT y vigencia NULL, pendientes de cotejo.

## 8. Paquete SQL y huellas (lo que autoriza D8)

Los archivos se generan en `out/ola4-cc/` (directorio ignorado por git), de forma reproducible con `npx tsx scripts/olas/ola4-cc.ts`.

| Paso | Archivo | Bytes | SHA-256 | Firma |
|---:|---|---:|---|---|
| S1 | `staging/01_insert_staging.sql` | 5,977,095 | `e1642f491862dd6fc0fa513651bc42da06bde741da1edc4cacbd3f465d1571d6` | No (filas ocultas) |
| S2 | `staging/02_embeddings_staging.sql` | 9,068,447 | `7225df565306c212033df1109b995e8ca0d1a8bf9cf9060b310fccfabcdbace3` | No |
| S3 | `staging/03_verificacion_staging.sql` | 1,629 | `581e9c6ad1285569afab6621e7c11ad5abe3ac4f6486a9e7a680eddc1aaa0447` | No (solo lectura) |
| S4 | `staging/04_visibilidad_v4_staging.sql` | 95,314 | `8b9b69573b787c42137211e0ab5387af578c05f1b6674030d9a01cf1e578f232` | **Sí** |
| P0 | `prod/00_precheck_y_respaldo_prod.sql` | 1,623 | `a3a7f3ae99d448bfbac89d4a5454959426315e57e4712a9c156018d68cf94399` | **Sí** |
| P1 | `prod/01_datos_prod.sql` | 6,060,392 | `edc5b9008e3683277be1938b6a392fa49d37bf7e118c59da0b586677a70b2ff9` | **Sí** |
| P2 | `prod/02_embeddings_prod.sql` | 9,220,325 | `fdf68e370cabb97dc83db6a2bafe4766c36b7f06a4628cd2aced72b3ba1fb930` | **Sí** |
| P3 | `prod/03_activacion_v5_prod.sql` | 96,811 | `5bcbc8dbfcadc24921c2919679fbb997e3463630ea0270a996a158cdedf5d631` | **Sí** |
| R | `prod/99_reversion_prod.sql` | 784 | `df7972d71eaf0debe18e84c6fbc501f1e0fca32b658bc1d24c6059fcaf189e91` | Solo por orden del CLO; el `.ps1` no lo ejecuta |

**Ensayo en base desechable (2026-11-24).** Se corrió el paquete completo en Postgres 17 con pgvector (PGlite): esquema real de 18 columnas, 2,372 filas legacy simuladas y una fila V5 ajena.
- **Staging:** S1 y S2 son reaplicables. S3 da 2,372/2,372 SHA-256. S4 deja 1,992 PRIMARY, 380 CONTEXT y 378 derogados en V4, y su repetición falla cerrada.
- **Producción, antes de activar:** P3 se niega antes de P1/P2. P0 respalda 2,372 filas y no sobrescribe un respaldo existente. P1 y P2 son reaplicables.
- **Activación y reversión:** P3 activa 2,372 filas V5 (1,992 `true`, 378 `false`, 2 NULL) y oculta exactamente las 2,372 legacy sin tocar la fila ajena. R restaura las 2,372 legacy y elimina el lote.

## 9. Ejecución tras la firma

```powershell
# Staging: filas ocultas, embeddings, verificación (sin firma) y V4 (con firma)
pwsh -File out\ola4-cc\ejecutar_staging.ps1 -DesdePaso 1 -HastaPaso 3
pwsh -File out\ola4-cc\ejecutar_staging.ps1 -DesdePaso 4 -HastaPaso 4
# Producción: respaldo, datos ocultos, embeddings, activación V5
pwsh -File out\ola4-cc\ejecutar_prod.ps1
```

Las salvaguardas son las de las OLAS 1 y 2:
- el project ref y la frase se teclean;
- `DATABASE_URL` se pide oculta y se borra en `finally`;
- se verifican la URL, las huellas y la firma;
- identidad de la base: producción debe tener los 360 V5 del 2026-11-21.

Los SQL de datos y embeddings pesan de 6 a 9 MB por archivo; el ejecutor los envía como una sola transacción por paso.
