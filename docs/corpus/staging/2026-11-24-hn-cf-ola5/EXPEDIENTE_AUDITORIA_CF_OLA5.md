# Expediente de auditoría · OLA 5 · `HN:CODIGO_FAMILIA`

**Estado:** D1–D8 FIRMADAS (2026-11-24, Abg. y Not. Fredy Omar Pinel Flores, CLO; segunda firma, sobre el paquete regenerado con el cierre de D5 por el art. 63 del D.102-2018, ver §7)
**Instrumento:** Código de Familia de Honduras (Decreto No. 76-84, La Gaceta No. 24,394 del 16-ago-1984) · lote `OLA5_CF_2023_01`
**Fecha del paquete:** 2026-11-24 · **Generador:** `scripts/olas/ola5-cf.ts` + `scripts/olas/paquete-ola.ts`
**Staging:** `mayalexhn-staging` (`aicakncgtuiiuomflkqj`) · **Producción:** `thgrhueckkjdutjvcufp`

> **Cómo se firma.** El CLO revisa §2–§6 y decide D1–D8 en §7. Para firmar, sustituye en la línea **Estado** el texto `PENDIENTE DE FIRMA` por `D1–D8 FIRMADAS` y completa el bloque de firma de §7. El ejecutor (`scripts/olas/ejecutar-sql.ts`) lee la firma solo en esa línea **Estado** y se niega a correr la visibilidad V4 en staging y cualquier paso de producción si este archivo no está firmado o no cita la huella SHA-256 exacta de cada SQL (§8). Si el CLO modifica una decisión, hay que regenerar el paquete: cambian las huellas y este pliego debe volver a citarlas.

## 1. Fuentes y jerarquía

| Rango | Pieza | Archivo · SHA-256 | Uso |
|---:|---|---|---|
| 1 | **La Gaceta No. 33,222 (6-sep-2013), Decreto 35-2013** | Ya en producción V5 (lote `A04_D35_2013_01`). Se lee de `A04_transcripcion_candidata_v8.txt` con la huella de cada fila V5: art. 4 `e2668e47…bbd1`, art. 5 `956d3488…bee4`, art. 13 `1eec596d…8dc0` | **Art. 4:** reforma 28 artículos del Código. **Art. 5:** adiciona 34 artículos. **Art. 13:** deroga el art. 131 |
| 2 | **Edición consolidada del CEDIJ** «Codigo de Familia (Actualizado con Reformas Ley de Adopciones).pdf» | 689,345 bytes, 72 págs., Word 2019, generado el 17-oct-2023 · `c0bd8d618d2036a8f2adb2cc7f1ca4a02319db15986d8c1a2371f544a0d89023` | Texto base. Sus **138 notas al pie** citan el decreto y La Gaceta de cada reforma, adición o derogación |

La misma edición está duplicada, con idéntico SHA-256, en `CODIGOS Y LEYES REGLAMENTOS ACUERDOS ETC/… (1).pdf`. Se descartó `Codigo_de_Familia_Honduras.pdf` (OpenOffice, mayo 2007), anterior a las reformas de 2013–2018.

**Extracción** (`pdftotext -layout`), en cuatro pasos:
1. **Página por página.** Se retiran la cabecera del CEDIJ, el folio y el bloque de notas al pie. Cada bloque empieza con el número de nota esperado; algunas páginas lo traen sangrado y otras sin espacio, como «44Artículo».
2. **Llamadas de nota.** Vienen pegadas al número del artículo («Artículo 111.» es el art. 11 con la nota 1), al texto («Derogado.3») o a un epígrafe de título («TÍTULO IV 21»). Se resuelven en orden estricto 1…138, y el proceso falla si alguna queda sin resolver.
3. **Cruce de notas.** Cada nota que nombra su artículo («Artículo 120-A. Derogado…») debe caer en ese mismo artículo, y todas cruzan.
4. **Estructura.** Los encabezados TÍTULO/CAPÍTULO/Sección pasan a `metadata.ubicacion`.

**Huellas de reproducción:**
- texto consolidado (concatenación «número⏎contenido» de las 379 filas): `f7642fb1168dccc5fb2b3c0ba0d48de202bb5fd02ccb94e72e509b2c05f562d4`;
- [`manifiesto_articulos.json`](manifiesto_articulos.json): `8c17a8f88d1f037635856a2b360b2989de0b6f789f6c3117e7005b2808787ecb`;
- [`constancias.csv`](constancias.csv): `792a2931706394ee893a700a91111b4c930f6335d936a46a2ff005a11ebe2f48`.

Dos ejecuciones dan las mismas huellas.

## 2. Situación actual en producción (solo lectura, 2026-11-24)

Producción tiene **373 filas legacy** del Código de Familia:
- `metadata.norm_id = 'HN_CODIGO_FAMILIA'`, ids `v2familia:mayalex_normativos:<número>`;
- `estado_editorial = V2`, sin `estado_v`, todas visibles.

| Hallazgo en las filas legacy | Filas |
|---|---:|
| Marcadas `es_norma_vigente = false`, **330 en total**, que se dividen en: | 330 |
| · con `estado_articulo = VIGENTE`; la falta de vigencia **no tiene fundamento** (incoherencia de carga) | 328 |
| · con `estado_articulo = DEROGADO` y fundamento (D.102-2018): 123-A y 123-B | 2 |
| De las 330: **vigentes según la edición** (falsos «no vigentes») | **253** |
| De las 330: derogadas según la edición o La Gaceta | 77 |
| Marcadas vigentes (`true`), todas vigentes según la edición (68, 70, 185–210-A) | 43 |
| Contenido literal «Derogado» con `estado_articulo = VIGENTE` (131, 137, 138, 145–153, 155, 160, 167, 169, 170) | 17 |
| **Faltan** artículos adicionados: 70-A a 70-D (D.31-2015), 122-A (D.35-2013) y 175-A (D.124-92) | **6** |

Así, de los 330 artículos que producción muestra como no vigentes, **253 son derecho vigente** que hoy no se recupera como tal. Los 43 marcados vigentes sí lo son.

La OLA 5 **no duplica** el instrumento. Al activar V5, el paso 03 oculta las 373 filas legacy (`revision_pendiente = true`, marca `sustituido_por_lote`). No las borra: quedan respaldadas en el paso 00 y la reversión 99 las vuelve a exponer.

## 3. Conteo y clasificación propuesta

| Concepto | Filas |
|---|---:|
| Artículos 1–338 más 41 bis (A–H), sin huecos ni repetidos | 379 |
| **PRIMARY** elegibles (vigentes, sin `rol`) | **298** |
| **CONTEXT vigente** por dictamen del CLO (cierre de D5): art. 165 (Capítulo IV del Título IV), con constancia `DICTAMEN_CLO`: la derogación expresa del art. 63 del D.102-2018 solo alcanzó los Capítulos I y VI | **1** |
| CONTEXT derogados por el **D.102-2018** (Gaceta 34,841, 10-ene-2019), según la edición: Título IV de la adopción y conexos | 54 |
| CONTEXT derogados por el **D.73-96** (Código de la Niñez y la Adolescencia, Gaceta 28,053), según la edición | 22 |
| CONTEXT derogado por el **art. 13 del D.35-2013** (Gaceta 33,222), **omitido por la edición**: art. 131 | 1 |
| CONTEXT derogados por el **art. 63, literal a), del D.102-2018** por dictamen del CLO: arts. 122-A y 135 (Capítulo I) y 175-A (Capítulo VI), que la edición imprime como vigentes; se conserva su texto como antecedente | 3 |
| **CONTEXT derogados** (`es_norma_vigente = false`), total | **80** |
| Vigencia NULL | 0 |

**Derogados.** Los 76 que la edición imprime como «Derogado» conservan ese contenido, porque la edición no guarda su texto anterior. El art. 131 conserva el texto que imprime la edición, como antecedente: «La adopción podrá ser simple o plena…».

**Derogación parcial.** El último párrafo del art. 16 fue derogado por el D.44-2017. El artículo queda PRIMARY con la constancia `DEROGACION_PARCIAL`, como en las OLAS 1 y 4.

## 4. Integridad y saneamiento

| Corrección (`metadata.correcciones_saneamiento`) | Filas |
|---|---:|
| `ENCABEZADO_RETIRADO`: el número va en `num_articulo` | 379 |
| `LLAMADAS_DE_NOTA_RETIRADAS`: voladitos de nota pegados al número o al texto | 135 |
| `TEXTO_OFICIAL_GACETA`: texto del D.35-2013 (§5) | 37 |
| `FUSION_ELISIONES_GACETA`: art. 238 (§5) | 1 |

**Erratas de numeración de la edición**, corregidas y confirmadas por su propia nota al pie:
- «Artículo 323.47Derogado» es el **art. 133**: la nota 47 dice «Artículo 133. Derogado…»;
- «Artículo 332.55Derogado» es el **art. 142**: la nota 55 dice «Artículo 142. Derogado…»;
- «Artículo 70-A99.» duplica el voladito de la nota 9 y cuenta como una sola llamada.

**Fail-hard.** El script aborta ante cualquiera de estas condiciones:
- encabezado residual, caracteres de control o mojibake;
- cabecera del CEDIJ, folio o resto de nota;
- espaciado anómalo;
- un artículo vigente sin puntuación de cierre.

Los arts. 22, 34, 35 y 271 terminan sin punto en el PDF y quedan como excepción verificada.

## 5. La Gaceta frente a la edición (D.35-2013)

Se usa el texto oficial del D.35-2013 cuando esa es la última reforma del artículo, es decir, cuando la edición no anota un decreto posterior a 2013 ni una derogación parcial. Así se hizo en **37 artículos**, con similitudes entre 0.899 (197-A) y 1.000. Las diferencias son de tipografía y erratas de la edición: espacios en «el (la)», «cónyugue»… Cada fila lleva la constancia `TEXTO_OFICIAL_GACETA` con la huella del texto de la edición que sustituye.

- **Art. 238 (causas de divorcio).** La Gaceta publica la reforma con los numerales 4, 5, 7 y 8 **elididos**, es decir, se mantienen del texto anterior. Se fusiona: los numerales 1, 2, 3 y 6 y el encabezado se toman de La Gaceta, y los elididos de la edición. Así se corrigen dos erratas de la edición: «Son causas **del** divorcio» por «de divorcio» y «con **causa** la ruina» por «causar». La similitud con la edición es 0.979.
- **Art. 216-A.** Adicionado por el D.35-2013, aunque la edición no lo anota; se toma el texto oficial.
- **Art. 332-A.** Se retira una comilla de cierre que la transcripción del decreto deja a mitad del texto.
- **No se usa el texto del D.35-2013** en los artículos que el decreto reformó y luego cambiaron otra vez:
  - 16: el D.44-2017 derogó su último párrafo;
  - 30 y 39: reformados por el D.31-2015;
  - 120, 123, 123-A a 123-H, 134, 157–159, 161 y 163: derogados después por el D.102-2018.

## 6. Reservas que el CLO debe conocer

1. **Derogaciones sin cotejo con La Gaceta.** Son 76 y se proponen como derogados porque los anota la edición oficial del CEDIJ:
   - 54 por el D.102-2018 (Gaceta 34,841);
   - 22 por el D.73-96 (Gaceta 28,053).

   Queda pendiente el cotejo con el texto de esos decretos.
2. **Título IV (De la adopción).** La nota 21 da por derogado el Capítulo I del Título IV por el D.102-2018. Dentro de ese título la edición mantiene vigentes cuatro artículos, que se proponen PRIMARY:
   - **122-A** (niñez indígena y afrodescendiente, D.35-2013);
   - **135** («una adopción no impide otras adopciones posteriores»);
   - **165**;
   - **175-A** (adoptantes extranjeros residentes fuera del país, D.124-92).

   Conviene confirmarlos contra la cláusula derogatoria del D.102-2018 antes de tratarlos como derecho vigente de adopción (D5).
3. **Reformas posteriores a 2013 sin cotejo con La Gaceta:**
   - D.31-2015: arts. 30, 39, 68 y 70, y adición de 70-A a 70-D;
   - D.44-2017: último párrafo del art. 16;
   - D.211-2006 (Código Procesal Civil): arts. 112, 113, 115, 118, 240 y 244–248;
   - D.124-92: art. 175-A.

   Se usa el texto integrado por la edición.
4. **Art. 332.** La edición anota «Reformado mediante Decreto 35-2013», pero el art. 4 del D.35-2013 no lo lista: reforma el 331 y adiciona el 332-A. Se conserva el texto de la edición; probablemente la nota es errata de la edición.
5. **Corte temporal.** La edición está actualizada a octubre de 2023. Las reformas publicadas entre 2023 y 2026 quedan para revisión incremental contra el índice de La Gaceta.

## 7. Decisiones D1–D8 para firma

| # | Decisión propuesta | Decisión del CLO |
|---|---|---|
| D1 | Fuente PRIMARY: edición CEDIJ 2023, con prevalencia de La Gaceta 33,222 (D.35-2013) sobre la edición; con las reservas 6.1, 6.3 y 6.5 | ☑ Aprueba |
| D2 | Aceptar la extracción y el saneamiento de §4 (138 notas resueltas y cruzadas, 2 erratas de numeración, estructura a `ubicacion`, 4 excepciones sin cierre) | ☑ Aprueba |
| D3 | Firma del texto consolidado de 379 artículos tal como figura en `manifiesto_articulos.json` (huella del texto en §1) | ☑ Firma |
| D4 | Vigencia: 299 `true` (298 PRIMARY + 1 CONTEXT) y 80 `false` (§3); corrige las 253 filas legacy vigentes marcadas como no vigentes e incorpora los 6 artículos ausentes | ☑ Aprueba |
| D5 | Arts. 122-A, 135, 165 y 175-A del Título IV, frente a la cláusula derogatoria del D.102-2018 (reserva 6.2) | ☑ **Resuelve** conforme al art. 63 del D.102-2018 (Gaceta 34,841): **122-A y 135** (Capítulo I) y **175-A** (Capítulo VI) CONTEXT derogados; **165** (Capítulo IV) CONTEXT vigente, con constancia de que la derogación expresa solo alcanzó los Capítulos I y VI. Paquete regenerado: 298 PRIMARY, 1 CONTEXT vigente, 80 CONTEXT derogados |
| D6 | Constancias por fila en `metadata.constancias` (138 notas de la edición, texto oficial del D.35-2013, derogación del art. 131 omitida por la edición; ver `constancias.csv`) | ☑ Aprueba |
| D7 | Al activar V5, ocultar (sin borrar) las 373 filas legacy `v2familia:mayalex_normativos:*`, con respaldo previo y reversión 99 | ☑ Aprueba |
| D8 | Autorizar V4 en staging y V5 en producción, exactamente para los SQL y huellas de §8, mediante `ejecutar_staging.ps1` y `ejecutar_prod.ps1` | ☑ Autoriza |

Firma: **aprobado** · Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex) · Fecha: 2026-11-24

*Registro de la firma.* El 2026-11-24 el CLO aprobó primero D1–D8 con un D5 provisional: los cuatro artículos como CONTEXT vigente, pendientes de cotejo. Con el art. 63 del D.102-2018, leído en la OLA 11, cerró después el D5 con la resolución que consta en la tabla y ordenó regenerar el paquete y registrar una nueva firma. Claude Code la transcribió aquí por su instrucción.

Respecto de la primera firma:
- el texto no cambia (huella `f7642fb1…62d4`);
- cambian la clasificación y las constancias de los cuatro artículos y las huellas de S1, S4, P1 y P3;
- la primera firma queda sustituida por esta.

El número de La Gaceta del D.102-2018 quedó confirmado como 34,841 por tres fuentes: la edición CEDIJ, el registro del corpus y la edición oficial de la DINAF. La firma cubre exactamente las huellas de §8.

## 8. Paquete SQL y huellas (lo que autoriza D8)

Los archivos se generan en `out/ola5-cf/` (directorio ignorado por git), de forma reproducible con `npx tsx scripts/olas/ola5-cf.ts`.

| Paso | Archivo | Bytes | SHA-256 | Firma |
|---:|---|---:|---|---|
| S1 | `staging/01_insert_staging.sql` | 663,758 | `f13291280fbaa37037e4c44b8c54af8ad82d6ca0dd5450ffc02b24deccf21f7e` | No (filas ocultas) |
| S2 | `staging/02_embeddings_staging.sql` | 1,450,657 | `972e38270a2b10893a561e1ac56bb133fdbc1fb1fa3f31b969b7f61e2fa7dead` | No |
| S3 | `staging/03_verificacion_staging.sql` | 1,631 | `b56a65235c64e8aea115e90fcfe02614cc6bb96c0924b7117b18961908593ef4` | No (solo lectura) |
| S4 | `staging/04_visibilidad_v4_staging.sql` | 23,299 | `6ea73455931be5bc7002339991897b9570f5d547d4ab184e41a17c1ae829143d` | **Sí** |
| P0 | `prod/00_precheck_y_respaldo_prod.sql` | 1,623 | `7f721a71ed464a8552e9ccccd7bd5c221c42f1037aa6dfb244405a8a86a55ee0` | **Sí** |
| P1 | `prod/01_datos_prod.sql` | 677,300 | `19f857ac6ca4dcaa245763823b1f9426587ea5f2be8f1dd13d025482ab1b95a8` | **Sí** |
| P2 | `prod/02_embeddings_prod.sql` | 1,474,984 | `0d132b95894db24f5a93fb6d1460e5ba7eaf8b45d9a21e512ed3ebba2cc85115` | **Sí** |
| P3 | `prod/03_activacion_v5_prod.sql` | 24,772 | `def63d883613ccaf2e507e973efc0591d8e3c1e15410f1fced05843860a43f58` | **Sí** |
| R | `prod/99_reversion_prod.sql` | 784 | `5afe50dcb2e6bfcd80dc8b844e106e8aba801daf2129db83204393cb1bb10c80` | Solo por orden del CLO; el `.ps1` no lo ejecuta |

**Ensayo en base desechable (2026-11-24).** Se corrió el paquete completo en Postgres 17 con pgvector (PGlite): esquema real de 18 columnas, 373 filas legacy simuladas y una fila V5 ajena.
- **Staging:** S1 y S2 son reaplicables. S3 da 379/379 SHA-256. S4 deja 298 PRIMARY, 81 CONTEXT y 80 derogados en V4, y su repetición falla cerrada.
- **Producción, antes de activar:** P3 se niega antes de P1/P2. P0 respalda 373 filas y no sobrescribe un respaldo existente. P1 y P2 son reaplicables.
- **Activación y reversión:** P3 activa 379 filas V5 (298 PRIMARY, 1 CONTEXT vigente, 80 CONTEXT derogados) y oculta exactamente las 373 legacy sin tocar la fila ajena. R restaura las 373 legacy y elimina el lote.

## 9. Ejecución tras la firma

```powershell
# Staging: filas ocultas, embeddings, verificación (sin firma) y V4 (con firma)
pwsh -File out\ola5-cf\ejecutar_staging.ps1 -DesdePaso 1 -HastaPaso 3
pwsh -File out\ola5-cf\ejecutar_staging.ps1 -DesdePaso 4 -HastaPaso 4
# Producción: respaldo, datos ocultos, embeddings, activación V5
pwsh -File out\ola5-cf\ejecutar_prod.ps1
```

Las salvaguardas son las de las OLAS 1, 2 y 4:
- el project ref y la frase se teclean;
- `DATABASE_URL` se pide oculta y se borra en `finally`;
- se verifican la URL, las huellas y la firma;
- identidad de la base: producción debe tener los 360 V5 del 2026-11-21.
