# Expediente de auditoría · OLA 2 · `HN:CODIGO_PENAL`

**Estado:** D1–D8 FIRMADAS (2026-11-24, Abg. y Not. Fredy Omar Pinel Flores, CLO)
**Instrumento:** Código Penal de Honduras (Decreto 130-2017) · lote `OLA2_CP_2017_01`
**Fecha del paquete:** 2026-11-24 · **Generador:** `scripts/olas/ola2-cp.ts` + `scripts/olas/paquete-ola.ts`
**Staging:** `mayalexhn-staging` (`aicakncgtuiiuomflkqj`) · **Producción:** `thgrhueckkjdutjvcufp`

> **Cómo se firma.** El CLO revisa §2–§6 y decide D1–D8 en §7. Para firmar, sustituye en la línea **Estado** el texto `PENDIENTE DE FIRMA` por `FIRMADAS` y completa el bloque de firma de §7. El ejecutor (`scripts/olas/ejecutar-sql.ts`) se niega a correr la visibilidad V4 en staging y cualquier paso de producción si este archivo no está firmado o no cita la huella SHA-256 exacta de cada SQL (§8). Si el CLO modifica una decisión, hay que regenerar el paquete: cambian las huellas y este pliego debe volver a citarlas.

## 1. Fuentes: solo La Gaceta

A diferencia de la OLA 1, aquí **no se usa ninguna compilación de terceros**. El texto se arma desde las publicaciones oficiales:

| Pieza | Archivo | SHA-256 | Uso |
|---|---|---|---|
| Texto base | `Decreto_130-2017 CODIGO PENAL.pdf` (1,329,460 bytes, 140 págs., PDF nativo) | `469addb5999a144b94f029a48c4bc5745749f3cbb1c4f5871ae679ab21f50228` | **La Gaceta No. 34,940, 10-may-2019**: el Decreto 130-2017 íntegro, arts. 1–635 |
| Reformas | `Codigo Penal Decreto 130-2017 fusionado actualizad_240904_104613.pdf` (15,306,695 bytes, 176 págs.) | `0f0b2611186d5a39a8f0bbbc524f6f0ca71ae6d5173d1042d312dbe9421329c6` | Solo las págs. 144–176, que son Gacetas nativas: **35,760** (D.93-2021), **36,290** (D.43-2023) y **36,595** (D.59-2024). Las págs. 1–143 son el escaneo de la misma Gaceta 34,940 y no se usan |

**Extracción.** `pdftotext` de xpdf, columna por columna. La Gaceta se compone a dos columnas y el orden interno del PDF de InDesign desordena los párrafos, así que se extrae primero la columna izquierda y luego la derecha de cada página. Se retiran cabeceras, pies y mancheta, y se rehacen los párrafos partidos por salto de página o de columna. Los encabezados LIBRO/TÍTULO/CAPÍTULO/SECCIÓN/DISPOSICIONES salen del cuerpo y pasan a `metadata.ubicacion`.

**Huellas de reproducción:**
- texto consolidado (concatenación «número⏎contenido» de las 638 filas): `39575af082071e2f4d90f97a31dc0c264551916d8762daed6744a26202f23775`;
- [`manifiesto_articulos.json`](manifiesto_articulos.json): `bcd3a2538a3334d64ce73468cc1bf5aa072e8a0ad4dc184780c87446dc51d5e8`;
- [`constancias.csv`](constancias.csv): `bc48a833681bec0092ecfd82fc76467c73bbb548aea85646f2a663725825d852`;
- [`reformas_texto_anterior_y_vigente.md`](reformas_texto_anterior_y_vigente.md), con el texto de 2019 y el consolidado de cada artículo reformado, para cotejo: `d827cf50b838b28d3fe285530b3939c8d71b8f416333890d32380d33734a9c3f`.

Dos ejecuciones dan las mismas huellas.

## 2. Situación actual en producción (solo lectura, 2026-11-24)

Producción tiene **635 filas legacy** del Código Penal: `metadata.norm_id = 'HN_CODIGO_PENAL'`, ids `v2penal:mayalex_normativos:1…635`, cargadas el 2026-07-30, sin `estado_v` ni `instrumento_id`, **las 635 marcadas vigentes** y todas visibles. Comparadas una por una con la Gaceta:

| Hallazgo en las filas legacy | Filas |
|---|---:|
| Son el **texto original de 2019 sin ninguna reforma** | 635 |
| Figuran **vigentes pero están derogadas** (§3) | **30** |
| Muestran un **texto superado por una reforma** (trata, extorsión, usurpación, contrabando, lavado, usura, desplazamiento forzado, ambientales, personas jurídicas…) | **17** |
| Faltan los artículos adicionados 337-A, 378-A y 587-A (financiamiento al terrorismo) | 3 |
| Llevan pegado el encabezado del capítulo o título siguiente («CAPÍTULO VI CONCURSO APARENTE DE NORMAS») | 146 |
| Llevan marcas «-- N of 140 --» | 138 |
| Llevan **cabeceras de página de la Gaceta en medio del artículo** («La Gaceta · Sección A Acuerdos y Leyes · REPÚBLICA DE HONDURAS…») | 105 |
| Llevan epígrafes con letras espaciadas («P E R S O N A S J U R Í D I C A S») | 61 |
| Incluyen las firmas y la sanción del decreto dentro del art. 635 | 1 |

Las 635 corresponden a la misma Gaceta 34,940: 389 son idénticas al texto de 2019 y 135 lo son salvo residuos de cola. El resto difiere por los residuos de página intercalados.

La OLA 2 **no duplica** el instrumento. Al activar V5, el paso 03 oculta las 635 filas legacy (`revision_pendiente = true`, con la marca `sustituido_por_lote`); no las borra, quedan respaldadas en el paso 00 y la reversión (`99`) las vuelve a exponer.

## 3. Conteo, reformas aplicadas y clasificación propuesta

| Concepto | Filas |
|---|---:|
| Artículos de la Gaceta 34,940, 1–635, sin huecos ni repetidos | 635 |
| Adicionados: 378-A (D.93-2021), 587-A (D.43-2023), 337-A (D.59-2024) | 3 |
| **Total** | **638** |
| PRIMARY elegibles (vigentes, sin `rol`) | **607** |
| CONTEXT vigente: art. 325 (§5) | **1** |
| CONTEXT derogados (`es_norma_vigente = false`) | **30** |
| Vigencia NULL | 0 |

**Reformas aplicadas, en orden cronológico** (tabla `OPERACIONES` del generador, cotejada automáticamente con los números que enumera cada artículo del decreto):

| Decreto · Gaceta | Artículo del decreto | Efecto sobre el Código Penal |
|---|---|---|
| D.93-2021 · 35,760 (1-nov-2021) | 1 | Deroga 102, 103, 104, 105, 106, 176, 182, 225, 263, 275, 309, 317, 337, 346, 368, 397, 403, 411, 417, 430, 434, 437, 444, 469, 511, 569 y 596 (derogación aprobada el 5-nov-2019 que el art. 10 incorpora) |
| | 2 | Deroga 28 y 153 (aprobada el 19-feb-2020) |
| | 3 | Reforma 428 y 429, contrabando (aprobada el 4-mar-2020) |
| | 4 | Reforma 219, 248, 312, 325, 328, 373, 374, 378, 379, 386 y 439 |
| | 5 | Adiciona 378-A (usurpación agravada) |
| | 6 | Deroga 296, 353 y 613 |
| D.43-2023 · 36,290 (25-jul-2023) | 2 | **Deja sin efecto** la derogación de 102 y 444 y la reforma de 439 hechas por el D.93-2021, y les da texto nuevo; adiciona 587-A (financiamiento al terrorismo) |
| | 5 | Renombra el Título XXV: «OTROS DELITOS CONTRA EL ORDEN SOCIOECONOMICO» (solo `metadata.ubicacion`) |
| D.59-2024 · 36,595 (vigente desde 5-jul-2024) | 1 | Reforma 324, 325 y 327; adiciona 337-A (responsabilidad de personas jurídicas en delitos ambientales) |

**Derogados (30), CONTEXT/false:** 28, 103, 104, 105, 106, 153, 176, 182, 225, 263, 275, 296, 309, 317, 337, 346, 353, 368, 397, 403, 411, 417, 430, 434, 437, 469, 511, 569, 596 y 613. Los arts. 102 y 444 **no** están derogados: el D.43-2023 anuló su derogación y les dio texto nuevo. Cada derogado conserva el texto de 2019, para hechos cometidos antes de la derogación, con la constancia del decreto que lo derogó (D4).

## 4. Integridad y saneamiento

Comprobaciones fail-hard superadas en las 638 filas:
- numeración 1–635 completa;
- `hash_contenido = sha256(UTF-8(contenido))` en cada fila;
- texto en LF y NFC;
- sin caracteres de control, mojibake, cabeceras ni marcas de página;
- sin encabezados estructurales en el cuerpo, letras espaciadas, espacios dobles ni palabras partidas por guion;
- sin elisiones «…» residuales;
- cierre con puntuación, salvo las excepciones verificadas abajo.

**Correcciones de forma** (no cambian palabras; registradas en `metadata.correcciones_saneamiento`):

| Corrección | Artículos |
|---|---|
| Epígrafe con letras espaciadas por la maquetación, recompuesto con el léxico de la propia Gaceta | 102, 106, 115, 122, 303, 330, 347, 387, 406, 418, 422, 531 (lista completa en el manifiesto; p. ej. «S U S P E N S I Ó N D E L P R O C E - DIMIENTO» → «SUSPENSIÓN DEL PROCEDIMIENTO») |
| Encabezado LIBRO/TÍTULO/CAPÍTULO/SECCIÓN/DISPOSICIONES retirado del cuerpo y llevado a `metadata.ubicacion` | todos |
| Punto final del artículo transcrito en un decreto de reforma (el decreto lo pone tras las comillas de cierre) | reformados |

**Se conserva tal cual lo que es de la propia Gaceta:**
- **Sin puntuación de cierre** (verificado en el PDF): arts. 211 (termina en coma), 232, 317 y 521. No se añaden signos.
- **Art. 633** reforma el Código Procesal Penal y transcribe sus artículos con las elisiones «…» de la Gaceta: no son elisiones de esta consolidación.
- **Numeración mixta** «1.» y «2)» en arts. 374 y 378: así la publica el D.93-2021.

## 5. Reformas publicadas con elisiones («…»)

El D.93-2021 publicó varios artículos reformados con partes elididas, que significan «texto sin cambio». El generador las fusiona con el texto vigente unidad por unidad: párrafo o numeral. Falla si una elisión no corresponde a ninguna unidad, y registra qué se tomó del texto anterior, qué sustituyó la reforma y qué quedó omitido sin sustituto. El detalle de cada artículo está en [`reformas_texto_anterior_y_vigente.md`](reformas_texto_anterior_y_vigente.md).

| Art. | Resultado | Propuesta |
|---|---|---|
| 219 Trata | Párrafo 1.º y numerales 1), 2) y 7) nuevos; 3)–6) y los dos párrafos finales («El consentimiento…», «Aún cuando…») vienen del texto anterior; nuevo bloque de agravantes 1)–3). Nada omitido sin sustituto | PRIMARY |
| 312 Agravantes del tráfico de drogas | Numerales 1)–9) del texto anterior; nuevo último párrafo (añade el numeral 9)) | PRIMARY |
| 328 Especies exógenas | La Gaceta solo publica el epígrafe: «EXÓTICAS» pasa a «**EXÓGENAS**»; el cuerpo queda elidido, sin cambios | PRIMARY (D5) |
| 374 Agravantes de la extorsión | Encabezado y numerales 1, 4, 5 y 6 nuevos; 2) y 3) del texto anterior; inhabilitación de 20 a 25 años | PRIMARY |
| 379 Alteración de términos | Párrafo 1.º del texto anterior; añade la pena de 2 a 4 años para predios forestales nacionales o ejidales | PRIMARY |
| **325 Explotación ilegal de recursos naturales** | El D.93-2021 añadió dos párrafos («Las mismas penas… tale, descombre o roture terreno forestal» y «Cuando se ejecuten rosas… se rebajará en un tercio»). El D.59-2024 republica el artículo con párrafo 1.º nuevo, «Las penas a ...» y «A los efectos …», y **no menciona esos dos párrafos**. La consolidación sigue la lectura literal y los omite | **CONTEXT vigente** hasta tu dictamen (D5) |

## 6. Reservas que el CLO debe conocer

1. **D.61-2024 incompleto (reserva principal; excluido por el CLO en D1, con revisión incremental anotada).** El archivo de reformas trae, en la Gaceta 36,595 (25-jul-2024), el inicio del **Decreto 61-2024**, pero **termina en sus considerandos**. Esos considerandos invocan el derecho a la salud y el acceso al agua (arts. 59 y 145 de la Constitución). No consta qué artículos reforma, así que **no se aplica**. Si reforma el Código Penal, lo más probable es que afecte a los delitos ambientales o contra la salud pública. Recomendación: conseguir la Gaceta 36,595 completa antes de firmar, o firmar con esta reserva y tramitar el D.61-2024 como lote incremental.
2. **Completitud del juego de reformas.** Se aplican las reformas contenidas en el archivo «fusionado» (fechado 04-sep-2024). **No se cotejó** el índice de La Gaceta para descartar otras reformas al Código Penal entre 2019 y 2024 que ese archivo no incluya, ni reformas posteriores a septiembre de 2024.
3. **Art. 325** (§5): la lectura literal suprime los dos párrafos añadidos en 2021. **Dictamen del CLO (D5):** se aprueba esa lectura por sustitución integral del precepto; CONTEXT vigente con constancia de la supresión.
4. **Art. 328** (§5): la reforma visible es solo el epígrafe. **Dictamen del CLO (D5):** PRIMARY con el epígrafe «EXÓGENAS» y el cuerpo de 2019.
5. **Derogados con su texto de 2019** (D4): el contenido es el texto derogado, marcado `es_norma_vigente = false` y CONTEXT, nunca PRIMARY. La alternativa es guardar solo «Derogado».
6. **Hallazgo que afecta a la OLA 1 (ya firmada).** El art. 4 del D.43-2023 (Gaceta 36,290, en este mismo archivo) **deroga el art. 9 del D.93-2021**, que era la interpretación auténtica del art. 274 del CPP. El expediente de la OLA 1 la da por vigente (§5 y D6) porque la edición CEDIJ no lo anotó. No cambia el texto del art. 274; sí su constancia. Se trata aparte (ver el informe al CLO).
7. **Sustitución de las 635 filas legacy** (§2): se ocultan al activar V5, no se borran.

## 7. Decisiones D1–D8 para firma

| # | Decisión propuesta | Decisión del CLO |
|---|---|---|
| D1 | Aceptar como fuente PRIMARY la Gaceta 34,940 más las Gacetas 35,760, 36,290 y 36,595 (SHA-256 en §1), con las reservas 6.1 (D.61-2024) y 6.2 (completitud y corte) | ☑ **Aprueba.** Se excluye el D.61-2024 truncado; el cotejo completo de la Gaceta 36,595 y del índice 2024–2026 queda anotado como revisión incremental |
| D2 | Aceptar la extracción y el saneamiento de §4 (12 epígrafes recompuestos, encabezados a `ubicacion`, excepciones de la Gaceta conservadas) | ☑ Aprueba |
| D3 | Firma del texto consolidado de 638 artículos tal como figura en `manifiesto_articulos.json` (huella del texto en §1) | ☑ Firma |
| D4 | Vigencia: 608 `true` y 30 `false` (§3); los derogados conservan su texto de 2019 como CONTEXT | ☑ Aprueba |
| D5 | Fusión de las reformas con elisiones de §5: 219, 312, 328, 374 y 379 PRIMARY; 325 CONTEXT vigente con la lectura literal | ☑ **Aprueba.** Art. 325: lectura literal por sustitución integral del precepto en el D.59-2024 (Gaceta 36,595), CONTEXT vigente con constancia de la supresión de los dos párrafos del D.93-2021. Art. 328: PRIMARY con el epígrafe «EXÓGENAS» |
| D6 | Constancias de reforma, adición, derogación, anulación y título renombrado en `metadata.constancias` (ver `constancias.csv`) | ☑ Aprueba |
| D7 | Al activar V5, ocultar (sin borrar) las 635 filas legacy `v2penal:mayalex_normativos:*`, con respaldo previo y reversión 99 | ☑ Aprueba |
| D8 | Autorizar V4 en staging y V5 en producción, exactamente para los SQL y huellas de §8, mediante `ejecutar_staging.ps1` y `ejecutar_prod.ps1` | ☑ Autoriza |

Firma: **aprobado** · Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex) · Fecha: 2026-11-24

*Registro de la firma.* El CLO comunicó en la sesión de trabajo del 2026-11-24 la aprobación del pliego y sus determinaciones expresas sobre D1 (exclusión del D.61-2024 y revisión incremental) y D5 (arts. 325 y 328); Claude Code las transcribió aquí por su instrucción. Para dejar constancia de esas determinaciones en la metadata, se regeneró el paquete antes de firmar: el art. 325 lleva dos constancias `SUPRESION_POR_SUSTITUCION` y el motivo del dictamen; el art. 328, la constancia `EPIGRAFE_REFORMADO` y el motivo del dictamen. El texto y los conteos no cambian (huella del texto `39575af0…3775`; 607 PRIMARY, 30 CONTEXT derogados, 1 CONTEXT vigente). La firma cubre exactamente las huellas de §8.

## 8. Paquete SQL y huellas (lo que autoriza D8)

Los archivos se generan en `out/ola2-cp/` (directorio ignorado por git), de forma reproducible con `npx tsx scripts/olas/ola2-cp.ts`. El volcado legacy de comparación está en `out/ola2-cp/legacy_prod.jsonl`.

| Paso | Archivo | Bytes | SHA-256 | Firma |
|---:|---|---:|---|---|
| S1 | `staging/01_insert_staging.sql` | 1,661,925 | `00ff1d5d4c70ceb13fa1ddf81366d4657705c2c9393e74133e381c6e8adf9938` | No (filas ocultas) |
| S2 | `staging/02_embeddings_staging.sql` | 2,440,816 | `c8fb0e6326197fa58154be632341ebc0e3f473bcf903c2251bf1d465012c8be8` | No |
| S3 | `staging/03_verificacion_staging.sql` | 1,625 | `ae98dd6f8766647a7c7220b270aec6bf333aa9ed1171286d33dd2c3ca64f3554` | No (solo lectura) |
| S4 | `staging/04_visibilidad_v4_staging.sql` | 29,840 | `770f96e57526d5759859d731926ebf96cd889f6c66ae3f2daab8f87c224a9ef8` | **Sí** |
| P0 | `prod/00_precheck_y_respaldo_prod.sql` | 1,609 | `0a9de324b303c0a4850f371c216f818146d11d47a5d06eb462e0e78fe99865da` | **Sí** |
| P1 | `prod/01_datos_prod.sql` | 1,684,532 | `7ebc9749d03bd413d547ecfc94ecc912bb9d1deb8c827702672609d273790900` | **Sí** |
| P2 | `prod/02_embeddings_prod.sql` | 2,481,719 | `6699bd8f73ed19141a24b410e353c1043026e70f6560609163e0d356bfe328be` | **Sí** |
| P3 | `prod/03_activacion_v5_prod.sql` | 31,162 | `c46f4e53ced798b4c180189116f2c57741a8af96cd5911bb8583f5175d7325c2` | **Sí** |
| R | `prod/99_reversion_prod.sql` | 778 | `66fa71807f92036e52c959d39680d636cbaf026586842b81159940268fe166a6` | Solo por orden del CLO; el `.ps1` no lo ejecuta |

**Ensayo en base desechable (2026-11-24).** Paquete completo en Postgres 17 con pgvector (PGlite), con el esquema real de 18 columnas, 635 filas legacy simuladas y una fila V5 ajena. Resultados:
- S1 y S2 son reaplicables; S3 da 638/638 SHA-256; S4 deja 607 PRIMARY, 31 CONTEXT y 30 derogados en V4, y su repetición falla cerrada;
- P3 se niega antes de P1/P2; P0 respalda 635 filas y no sobrescribe un respaldo existente; P1 y P2 son reaplicables;
- P3 activa 638 filas V5 y oculta exactamente las 635 legacy sin tocar la fila ajena; R restaura las 635 legacy y elimina el lote.

## 9. Ejecución tras la firma

```powershell
# Staging: filas ocultas, embeddings, verificación (sin firma) y V4 (con firma)
pwsh -File out\ola2-cp\ejecutar_staging.ps1 -DesdePaso 1 -HastaPaso 3
pwsh -File out\ola2-cp\ejecutar_staging.ps1 -DesdePaso 4 -HastaPaso 4
# Producción: respaldo, datos ocultos, embeddings, activación V5
pwsh -File out\ola2-cp\ejecutar_prod.ps1
```

Las salvaguardas de los `.ps1` y del ejecutor son las de la OLA 1:
- ref y frase tecleados;
- `DATABASE_URL` oculta y borrada en `finally`;
- verificación de la URL, de las huellas y de la firma;
- identidad de la base: producción debe tener los 360 V5 del 2026-11-21.
