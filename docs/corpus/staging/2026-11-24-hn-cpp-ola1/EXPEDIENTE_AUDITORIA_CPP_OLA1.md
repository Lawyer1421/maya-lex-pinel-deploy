# Expediente de auditoría · OLA 1 · `HN:CODIGO_PROCESAL_PENAL`

**Estado:** D1–D8 FIRMADAS (2026-11-24, Abg. y Not. Fredy Omar Pinel Flores, CLO; nueva firma sobre el paquete corregido del art. 274, ver §7)
**Instrumento:** Código Procesal Penal de Honduras (Decreto 9-99-E) · lote `OLA1_CPP_2024_01`
**Fecha del paquete:** 2026-11-24 · **Generador:** `scripts/olas/ola1-cpp.ts` + `scripts/olas/paquete-ola.ts`
**Staging:** `mayalexhn-staging` (`aicakncgtuiiuomflkqj`) · **Producción:** `thgrhueckkjdutjvcufp`

> **Cómo se firma.** El CLO revisa §3–§6 y decide D1–D8 en §7. Para firmar, sustituye en la línea **Estado** el texto `PENDIENTE DE FIRMA` por `FIRMADAS` y completa el bloque de firma de §7. El ejecutor (`scripts/olas/ejecutar-sql.ts`) se niega a correr la visibilidad V4 en staging y cualquier paso de producción si este archivo no está firmado o no cita la huella SHA-256 exacta de cada SQL (§8). Si el CLO modifica una decisión, hay que regenerar el paquete: cambian las huellas y este pliego debe volver a citarlas.

## 1. Fuente

| Campo | Valor |
|---|---|
| Archivo | `Codigo Procesal Penal (2024).pdf` (1,023,361 bytes) |
| SHA-256 del PDF | `71eb53b174b4fdd1af4e08ba084015caf5cd14c459b4277f34533a83bff391a4` |
| Edición | Compilación consolidada del CEDIJ (Poder Judicial), con 78 notas al pie que citan decreto, fecha y Gaceta de cada reforma |
| Extracción | `pdftotext -layout -enc UTF-8` y extractor validado `scripts/ingesta-cpp.ts` (dictamen de cambio de fuente del 2026-09-02) |
| SHA-256 del texto saneado | `db1b6db300bc663f9ade48d499fa6054751ba1439d13ca2134a6e2eeed551833` (concatenación «número⏎contenido» de las 480 filas) |
| Detalle por artículo | [`manifiesto_articulos.json`](manifiesto_articulos.json) (SHA-256 `ef630edb39617a4f14c347f6c64171f5edd85716b21615ae449e007d120a255d`) |
| Constancias | [`constancias.csv`](constancias.csv) (SHA-256 `ced12c6e7165fee8eccedb8d8491919223aadb1335d38b272874360232d4b161`) |

## 2. Situación actual en producción (consulta de solo lectura, 2026-11-24)

- Producción tiene **480 filas legacy** del CPP: `metadata.norm_id = 'HN_CODIGO_PROCESAL_PENAL'`, ids `mayalex_normativos:cpp_1999_a<N>`, sin `estado_v`, `instrumento_id` NULL, 469 vigentes y 11 no vigentes, todas visibles. El stub manual `manual_curado:cpp_honduras:articulo_173` ya no existe.
- Las 480 filas legacy salieron **del mismo PDF y del mismo extractor**: 480/480 coinciden en el SHA-256 del fragmento fuente y 480/480 en la vigencia.
- Esas filas legacy **arrastran los defectos de §4** (llamadas de nota en el texto, nota con asterisco dentro del art. 227, líneas cortadas por la maquetación).
- La OLA 1 **no duplica** el instrumento: al activar V5, el paso 03 oculta las 480 filas legacy (`revision_pendiente = true`, con la marca `sustituido_por_lote`). No las borra y quedan respaldadas en el paso 00. La reversión (`99`) las vuelve a exponer.

## 3. Conteo y clasificación propuesta

| Concepto | Filas |
|---|---:|
| Artículos base 1–447, sin huecos ni repetidos | 447 |
| Artículos bis (26-A, 26-B, 127-A, 127-B, 173-A, 173-B, 219-A, 224-A, 237-A, 237-B, 336-A, 402-A a 402-G y 440-A a 440-O) | 33 |
| **Total** | **480** |
| PRIMARY elegibles (vigentes, sin `rol`) | **468** |
| CONTEXT vigente: art. 227 (reforma tácita no incorporada al texto) | **1** |
| CONTEXT derogados (`es_norma_vigente = false`) | **11** |
| Vigencia NULL | 0 |

**Derogados (11):** art. 223 (D.243-2011); arts. 373 a 380 (Ley sobre Justicia Constitucional, D.244-2003); arts. 418 y 419 (D.195-2004). Cada fila lleva en `metadata.derogado_por` la nota de la edición.

## 4. Integridad y saneamiento (determinista y registrado)

Comprobaciones fail-hard superadas en las 480 filas:
- numeración 1–447 completa y bis exigidos presentes;
- `hash_contenido = sha256(UTF-8(contenido))` en cada fila;
- texto en LF y NFC;
- sin caracteres de control, U+FFFD ni mojibake;
- sin marcas de página, encabezados residuales, llamadas de nota, asteriscos, espacios dobles ni palabras partidas por guion;
- cierre con puntuación, salvo los 11 derogados y el art. 348 (omisión de la propia edición, ya verificada en el extractor).

**Correcciones aplicadas en 14 artículos** (también registradas en `metadata.correcciones_saneamiento` y en el manifiesto):

| Artículo | Corrección |
|---|---|
| 9, 36, 37, 45, 58, 220, 285 | Llamada de nota pegada al encabezado («Artículo 9. 1 …»), retirada |
| 127-A, 127-B, 173-A, 173-B | Llamada de nota pegada tras «.-» («Artículo 127-A.-16 …»), retirada |
| 311 | Llamadas 50 y 51 en el encabezado, retiradas |
| 27 | Llamada 5 tras «3) Derogado;», retirada |
| 227 | Nota con asterisco sobre el Consejo Nacional Electoral (D.200-2018 / D.2-2019) intercalada entre los numerales 2) y 3): sale del cuerpo y pasa a constancia; retirado el asterisco de «*Tribunal Supremo Electoral» |

Además, en 468 artículos se unieron las líneas cortadas por la maquetación del PDF. Se conservan los párrafos y cada numeral o literal en su propia línea. El encabezado «Artículo N.» se retira del contenido, como en A03 (el número va en `num_articulo`). Solo se retiran números confirmados como notas que anotan ese mismo artículo; por ejemplo, el «1,2 y 3» del art. 183 queda intacto.

## 5. Constancias de reformas, derogaciones e interpretaciones

Cada fila lleva en `metadata.constancias` las notas de la edición que la afectan: tipo, número de nota, decretos y texto íntegro.

| Tipo | Constancias | Artículos |
|---|---:|---|
| Reforma | 39 | D.74-2013 (9, 58, 91, 107, 176, 180, 183, 204, 285, 294, 337, 364–366); D.130-2017 (28, 36, 45, 334, 336, 344, 432); D.10-2017 (292, 300, 316, 342); D.195-2004 (414–417); D.22-2015 (237, 277, 311); D.6-2017 (237-A, 237-B, 311); D.14-2006 (26); D.93-2021 (54); D.96-2017 (57); D.98-2017 (37); D.44-2012 (127); D.36-2020 (184) |
| Adición | 41 | 26-A, 219-A (D.14-2006); 26-B, 224-A (D.93-2021); 127-A, 127-B (D.97-2017); 173-A, 173-B (D.98-2017); 237-A, 237-B (D.22-2015); 336-A (D.130-2017); 402-A a 402-G (D.70-2015); 440-A a 440-O (D.74-2013, flagrancia) |
| Derogación total | 11 | Ver §3 |
| Derogación parcial | 2 | 27 num. 3 (D.35-2013), 311 párr. 2.º (D.6-2017). El texto consolidado ya refleja la derogación |
| Interpretación auténtica **sin efecto** | 4 | 217, 219, 220: la interpretación del D.57-2020 quedó sin valor por el art. 1 del D.43-2023; **274**: la interpretación del art. 9 del D.93-2021 quedó derogada por el **art. 4 del D.43-2023** (Gaceta No. 36,290, 25-jul-2023), efecto que la edición CEDIJ no anotó |
| Interpretación auténtica vigente | 0 | — |
| Reforma tácita | 1 | 227 num. 6 (D.412-2002, ratificado por D.154-2007) |
| Cambio institucional | 16 | 175, 203, 209, 213, 279, 280, 281, 283: supresión de la DNIC y creación de la DPI (PCM-063-2015) |
| Nota con asterisco | 1 | 227 (Consejo Nacional Electoral) |

## 6. Reservas que el CLO debe conocer

1. **Fuente consolidada, no La Gaceta.** Todas las filas vienen de la compilación CEDIJ. En A03, el texto consolidado no cotejado con La Gaceta se clasificó como CONTEXT (RESERVA_D1_B). Aquí se propone PRIMARY para los 468 vigentes, sobre la base del dictamen de cambio de fuente del 2026-09-02; la decisión es del CLO (D1).
2. **Corte de la edición.** El archivo se titula «(2024)» y su última reforma anotada es el D.43-2023 (julio de 2023). **No se cotejaron** reformas posteriores (2024–2026). *Determinación del CLO (2026-11-24):* se aprueba la reserva temporal del corte julio 2023, con la anotación de que queda pendiente un **cotejo incremental posterior contra La Gaceta (2024–2026)**; si ese cotejo encuentra reformas, se tramitan como un lote nuevo con su propio pliego.
3. **Reforma tácita del art. 227.** El texto aún dice «Tribunal Supremo Electoral» y no incorpora el D.412-2002. Se propone CONTEXT vigente.
4. **Interpretaciones.** Los arts. 217, 219, 220 y 274 conservan una constancia de interpretación **sin efecto**. En el art. 274 la nota de la edición (D.93-2021) se conserva retipificada y se añade la constancia de su derogación por el art. 4 del D.43-2023 (`EFECTOS_POSTERIORES` en `scripts/olas/ola1-cpp.ts`). Los cuatro son PRIMARY con la constancia en metadata.
5. **Cambio DNIC→DPI.** Los 8 artículos que mencionan la DNIC conservan su texto, con la constancia del cambio institucional.
6. **Sustitución de las 480 filas legacy** (§2): se ocultan al activar V5, no se borran.

## 7. Decisiones D1–D8 para firma

| # | Decisión propuesta | Decisión del CLO |
|---|---|---|
| D1 | Aceptar la edición consolidada CEDIJ (SHA-256 del PDF en §1) como fuente PRIMARY de los 468 vigentes, con la reserva de corte de §6.2 (aprobada con cotejo incremental posterior contra La Gaceta 2024–2026) | ☑ **Aprueba.** PRIMARY para los 468 vigentes de la compilación CEDIJ; 1 CONTEXT vigente (art. 227) y 11 CONTEXT derogados |
| D2 | Aceptar el saneamiento de §4 (14 artículos corregidos, 468 con líneas unidas, encabezado retirado) como texto canónico, SHA-256 `db1b6db3…1833` | ☑ Aprueba |
| D3 | Firma del texto canónico de 480 artículos tal como figura en `manifiesto_articulos.json` | ☑ Firma |
| D4 | Vigencia: 469 `true` y 11 `false` (derogados de §3) | ☑ Aprueba |
| D5 | Roles: 468 PRIMARY; CONTEXT para los 11 derogados y para el art. 227 | ☑ Aprueba |
| D6 | Constancias de §5 en `metadata.constancias`, incluida la interpretación sin efecto de los arts. 217, 219, 220 y 274 | ☑ Aprueba, **corregida**: art. 274 «sin efecto (derogada por el art. 4 del Decreto No. 43-2023, Gaceta No. 36,290)» |
| D7 | Al activar V5, ocultar (sin borrar) las 480 filas legacy `mayalex_normativos:cpp_1999_a*`, con respaldo previo y reversión 99 | ☑ Aprueba |
| D8 | Autorizar V4 en staging y V5 en producción, exactamente para los SQL y huellas de §8, mediante `ejecutar_staging.ps1` y `ejecutar_prod.ps1` | ☑ Autoriza |

Firma: **aprobado** · Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex) · Fecha: 2026-11-24

*Registro de la firma.* La aprobación del pliego y las dos determinaciones expresas (D1 y reserva de corte de §6.2) fueron comunicadas por el CLO en la sesión de trabajo del 2026-11-24; Claude Code las transcribió a este pliego por su instrucción. El paquete autorizado es exactamente el listado en §8.

*Corrección y nueva firma (2026-11-24).* Por resolución del CLO, antes de cualquier promoción se reclasificó la constancia del art. 274 como interpretación sin efecto, derogada por el art. 4 del Decreto No. 43-2023 (Gaceta No. 36,290). El texto de los 480 artículos y su SHA-256 no cambian (`db1b6db3…1833`); cambian la metadata del art. 274 y, con ella, las huellas de S1, S4, P1 y P3. El CLO dispuso registrar de una vez su firma sobre el paquete regenerado: **D1–D8 FIRMADAS** sobre las huellas de §8. Las huellas sustituidas, que ya no autorizan nada, eran S1 `55bf9324…f9e45`, S4 `e1b2d71c…4d75`, P1 `7b05d15b…eebee` y P3 `631b5697…8931`.

## 8. Paquete SQL y huellas (lo que autoriza D8)

Los archivos se generan en `out/ola1-cpp/` (directorio ignorado por git; reproducible con `npx tsx scripts/olas/ola1-cpp.ts --legacy <volcado>`). La generación es determinista: dos ejecuciones con la misma fuente producen las mismas huellas.

| Paso | Archivo | Bytes | SHA-256 | Firma |
|---:|---|---:|---|---|
| S1 | `staging/01_insert_staging.sql` | 1,108,829 | `8de559da19ac8dff27cc6ead638b40383edbaba1a732d0b76f205cae0ee14802` | No (filas ocultas) |
| S2 | `staging/02_embeddings_staging.sql` | 1,841,603 | `39758f6eed374a4a8be96058b071a8ec709d3fdf73a2baa485c63cb445b838b7` | No |
| S3 | `staging/03_verificacion_staging.sql` | 1,656 | `76fe372b6259cd7a3ccd995cf2570815acd35dcd20495cc2c3a6c8d246fcdbc6` | No (solo lectura) |
| S4 | `staging/04_visibilidad_v4_staging.sql` | 27,404 | `fb553b853aa67dc42981c5dbca2667a1f3134c0d43ff889085caba80adaf88b2` | **Sí** |
| P0 | `prod/00_precheck_y_respaldo_prod.sql` | 1,665 | `5fcab209c3611a996c7d27b0ca2d2837a105194c1ea99a936a106206987752e5` | **Sí** |
| P1 | `prod/01_datos_prod.sql` | 1,125,907 | `8f2dbdc5a9aa0b0854d8a35ccc2a6f5c1d4977288079c0adcedfff9c29e839b2` | **Sí** |
| P2 | `prod/02_embeddings_prod.sql` | 1,872,394 | `24f73be41461a75b5d6055707a25517e891c9336564a698849486a7a63b6051f` | **Sí** |
| P3 | `prod/03_activacion_v5_prod.sql` | 28,559 | `c78ee730f85a5ea776f2045381168231dcf294edca64ef84f764b4a4f6b4eb11` | **Sí** |
| R | `prod/99_reversion_prod.sql` | 801 | `2ac30778b2dbcd229d8f72d0d736efc39fa292f4a03b6d7be8c3ba693eed662c` | Solo por orden del CLO; el `.ps1` no lo ejecuta |

**Ensayo en base desechable (2026-11-24).** El paquete completo se ensayó en un Postgres 17 con pgvector (PGlite), usando el esquema real de las 18 columnas: `embedding` NULLable en staging y `NOT NULL` en producción, más 480 filas legacy simuladas. Resultados:
- S1 y S2 son reaplicables; S3 da 480/480 SHA-256; S4 deja 468 PRIMARY, 12 CONTEXT y 11 derogados en V4, y su repetición falla cerrada;
- P3 se niega antes de P1/P2; P0 no sobrescribe un respaldo existente; P1 y P2 son reaplicables;
- P3 activa 480 filas V5 y oculta exactamente las 480 legacy sin tocar otras filas V5; R restaura las 480 legacy y elimina el lote.

## 9. Ejecución tras la firma

```powershell
# Staging: filas ocultas, embeddings, verificación (sin firma) y V4 (con firma)
pwsh -File out\ola1-cpp\ejecutar_staging.ps1 -DesdePaso 1 -HastaPaso 3
pwsh -File out\ola1-cpp\ejecutar_staging.ps1 -DesdePaso 4 -HastaPaso 4
# Producción: respaldo, datos ocultos, embeddings, activación V5
pwsh -File out\ola1-cpp\ejecutar_prod.ps1
```

Antes de conectar, cada `.ps1` hace lo siguiente:
- pide teclear el project ref y la frase de confirmación;
- lee `DATABASE_URL` con entrada oculta, sin eco ni historial;
- en el bloque `finally` borra `DATABASE_URL`, el BSTR y las variables de sesión, aunque falle cualquier paso.

El ejecutor, a su vez:
- comprueba que la URL apunta al ref del destino y no al otro;
- verifica la huella de cada SQL y la firma de este pliego;
- ya conectado, confirma la identidad de la base: producción debe tener los 360 V5 del 2026-11-21 y staging, 0.

Cada SQL es una transacción que falla cerrada.
