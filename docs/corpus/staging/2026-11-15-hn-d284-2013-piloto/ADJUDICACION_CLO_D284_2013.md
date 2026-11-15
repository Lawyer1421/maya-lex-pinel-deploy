# Paquete de adjudicación CLO · Decreto 284-2013 (piloto)

**Identidad:** `HN:DECRETO_284_2013` · **Estado:** `CLO_PENDING` (fuente institucional validada: TSC, tier 4) · **V4/V5:** ninguno · **Vigencia:** sin declarar

> Este documento **no aprueba nada**: reúne lo comprobado y deja cada decisión al CLO. Solo los roles `abogado_revisor_senior` o `propietario_despacho` pueden promover V3→V4 y V4→V5 (`lib/ingesta-oficial/estados.ts`), y cada intento queda en `ingestion_audit_log`. Hasta que el CLO apruebe este pliego, toda fila del decreto es solo contexto (`INSTRUMENTO_SIN_PLIEGO_CLO`).

## 0. Procedencia institucional (hecho)

| Dato | Valor |
|---|---|
| URL | <https://www.tsc.gob.hn/web/leyes/Ley_gene_empl_dere_inver.pdf> ([ficha en la Biblioteca del TSC](https://www.tsc.gob.hn/biblioteca/index.php/leyes/566-ley-para-la-generacion-de-empleo-fomento-a-la-iniciativa-empresarial-formalizacion-de-negocios-y-proteccion-a-los-derechos-de-los-inversionistas)) |
| Dominio y registro | `www.tsc.gob.hn`: `VERIFIED`, `OFFICIAL_COMPILATION`, tier 4. El receptor concedió `SOURCE_VALIDATED` |
| Descarga | Manual en navegador, por el propietario, 15-nov-2026 13:39 (hora de Honduras) |
| `bytes_sha256` | `a7eb221fdeff8977ae9cf907f926797b8d45cd7d90dc93ece7e32ee3581edee4` (7,514,264 bytes, 16 páginas) |
| Tipo de PDF | **Escaneo** (Producer «EPSON Scan») con capa de texto OCR. 8 páginas con `/Rotate 180`, ya corregidas por el receptor |
| `text_sha256` (dos columnas) | `7a1fc45e113b3da60efe70286446037192adfdc6856a5582c3a05753dec70d2d` (51,165 caracteres) |
| Candidato | `candidates/PKG_DECRETO_284_2013_REFORMA_AL_CODIGO_DE_COMERCIO@v1.json` · QA sin fallos · hoja `worksheets/…@v1.md` |
| Recibos | `receipts/…194149Z…` `INPUT_REJECTED`: se usó el `pdftotext` de xpdf, no el de Poppler; es un error del entorno, no del documento · `…194203Z…` `RECEIVED`: huella de 17 páginas frente a 16 · `…194332Z…` `CLO_PENDING`: con la revisión declarada |

**Revisión declarada para levantar la huella de páginas:** declaración del propietario (copia del TSC, La Gaceta 33,445 del 5-jun-2014, 16 páginas) más inspección técnica de Claude, que **no es revisión jurídica**. La copia del Drive también tenía 16 páginas, así que la huella de 17 anotada por un tercero no se reproduce en ninguna de las dos.

**La copia del TSC no es la misma que la del Drive** (`ea81bfa6…`, 73,426 bytes): son dos archivos distintos de la misma edición de La Gaceta.

## 1. Identidad (comprobada en el PDF del TSC)

| Dato | Valor | Dónde |
|---|---|---|
| Instrumento | Decreto No. 284-2013: «Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas» | Pág. 1 |
| Publicación | La Gaceta N.º 33,445, Tegucigalpa, 5 de junio de 2014, Sección A | Encabezado de cada página |
| Sanción | «a los ocho días del mes de enero de dos mil catorce» | Pág. 16 (imagen) |
| Ejecútese | «Tegucigalpa, M.D.C., 24 de enero de 2014» | Pág. 16 (imagen) |
| Firmas | Mauricio Oliva Herrera, Rigoberto Chang Castillo, Ángel Darío Banegas Leiva · Porfirio Lobo Sosa · Carlos Borjas Castejón | Pág. 16 (imagen) |
| Vigencia | Art. 39: «a partir del día de su publicación en el Diario Oficial “La Gaceta”» | Pág. 16 (imagen) |

## 2. Efectos normativos que declara el propio texto

| Art. | Verbo | Instrumento afectado | Alcance |
|---|---|---|---|
| 13 | Reforma | Código de Comercio (D.73-50) | Arts. 14, 15, 18, 157, 169, 189, 193, 210, 222, 224, 226 y 228 |
| 14 | Reforma | Código Civil | Arts. 1782 y 1789 |
| 26 | Reforma | Ley para la Promoción y Protección de Inversiones (D.51-2011) | Arts. 21, 40, 42, 43, 44, 45, 46 y 50 |
| 27 | Reforma | Ley de Promoción de la Alianza Público-Privada (D.143-2010) | Arts. 29 y 34 |
| 28 | Interpreta | Ley de Promoción de la Alianza Público-Privada | Art. 31 |
| 29 | Interpreta | Ley de Promoción de la Alianza Público-Privada | Art. 35 |
| 37 | Deroga | Código de Comercio (D.73-50) | Arts. 380, 381, 382 y 383 (imagen, pág. 16) |
| 38 | Deroga | D.51-2011 y sus reformas | Arts. 36, 37, 38, 39 y **54** (imagen, pág. 16; la capa OCR dice «5») |
| 39 | Vigencia | — | Desde su publicación en La Gaceta |

**Materia notarial (arts. 15–25):** régimen de ejecución extrajudicial de garantías ante notario. No reforma un artículo concreto: crea un procedimiento. El CLO decide si se registra como relación con el Código del Notariado.

## 3. Cotejo del texto: la capa OCR del TSC tiene defectos

El texto del PDF del TSC es OCR del escaneo, y **en 28 de 39 artículos omite o altera caracteres** frente a la copia del Drive. Comprobado contra la **imagen** de la pág. 16:
- **Art. 38:** la imagen dice «y 54» y el OCR «y 5».
- **Art. 37:** el OCR pierde la «y» de «382 y 383».
- **Art. 39:** el OCR pierde la «a» de «a partir».

En los tres casos **la copia del Drive coincide con la imagen oficial**. El defecto está en la capa de texto del PDF, no en la extracción: sin recorte por columnas el «4» tampoco aparece.

**Consecuencia:** el texto del TSC acredita la procedencia, pero **no debe cargarse tal cual**. Cargaría, por ejemplo, la derogación del «art. 5» del D.51-2011 en lugar del art. 54.

| Art. | Caracteres (TSC) | sha256 TSC (12) | sha256 Drive (12) | Cotejo del texto | Primera diferencia |
|---|---:|---|---|---|---|
| 1 | 556 | `c1d69e5d4e36` | `dd3fafddf9a1` | **difiere** | TSC «…divisionaumedecapitaluotro…» / Drive «…divisionaumentodecapitaluo…» |
| 2 | 583 | `6124835768c2` | `a120f7abdf09` | **difiere** | TSC «…sconstituidabajoesteregime…» / Drive «…sconstituidasbajoesteregim…» |
| 3 | 807 | `998f25d55ff7` | `a1c2b57206f7` | **difiere** | TSC «…ulariospuedellenarseyprese…» / Drive «…ulariospuedenllenarseypres…» |
| 4 | 664 | `81d643512a92` | `07523bc05213` | **difiere** | TSC «…ctronicounicdenivelnaciona…» / Drive «…ctronicounicodenivelnacion…» |
| 5 | 876 | `0897a736d794` | `fb2ab402e102` | **difiere** | TSC «…esucreacionsdecaracterestr…» / Drive «…esucreacionseradecaractere…» |
| 6 | 1219 | `25aa631f25a3` | `ff056e4ca260` | **difiere** | TSC «…adesociosyladelosorganosde…» / Drive «…adesociosylasdelosorganosd…» |
| 7 | 882 | `e4cd405e9291` | `e80cf8f06cac` | igual | — |
| 8 | 980 | `ffd2359f4dbf` | `ffe60f8c1a29` | **difiere** | TSC «…xtendercopiacualquieradelo…» / Drive «…xtendercopiaacualquieradel…» |
| 9 | 523 | `da76e30873a4` | `6e12f208dc6c` | **difiere** | TSC «…especiefiscaparaacreditarl…» / Drive «…especiefiscalparaacreditar…» |
| 10 | 344 | `dc38b4847cb1` | `dea024e129ec` | igual | — |
| 11 | 1383 | `9feaa92a1ef3` | `2194063c361b` | **difiere** | TSC «…ebecontenerleinformacionne…» / Drive «…ebecontenerlainformacionne…» |
| 12 | 468 | `89ca2336cbe8` | `fbfb028e6cb4` | **difiere** | TSC «…ansformacioniusiondivision…» / Drive «…ansformacionfusiondivision…» |
| 13 | 13490 | `231bd8ba1de6` | `0a5795807b33` | **difiere** | TSC «…uerdosyleyeslpamdc5dejunio…» / Drive «…uerdosyleyesgalpamdc5dejun…» |
| 14 | 1016 | `4e62e731fd1d` | `cc0828118abc` | **difiere** | TSC «…s1782y1789decodigocivillos…» / Drive «…s1782y1789delcodigocivillo…» |
| 15 | 566 | `e14e854cca2a` | `630bf51fa54f` | igual | — |
| 16 | 987 | `f49a20e47e87` | `9ffd15704648` | **difiere** | TSC «…uerdosyleyesigalpamdc5deju…» / Drive «…uerdosyleyesgalpamdc5dejun…» |
| 17 | 849 | `22bfeecf3700` | `ee6007e77496` | **difiere** | TSC «…realizarseunfilmacionenvid…» / Drive «…realizarseunafilmacionenvi…» |
| 18 | 1549 | `a288dd20d480` | `48e364cee974` | **difiere** | TSC «…fectivoanteenotarioenelpla…» / Drive «…fectivoanteelnotarioenelpl…» |
| 19 | 344 | `e90b44e83876` | `f861eac38350` | igual | — |
| 20 | 776 | `5e58a40012ff` | `869007c5bd39` | **difiere** | TSC «…uerdosyleyesalpamdc5dejuni…» / Drive «…uerdosyleyesgalpamdc5dejun…» |
| 21 | 177 | `8adfbcfe534a` | `7ab991804e2d` | **difiere** | TSC «…sgarantiassodeterminadaspo…» / Drive «…sgarantiassondeterminadasp…» |
| 22 | 720 | `b9a1a283b495` | `3e3980cac2e7` | **difiere** | TSC «…reedoreshayaautorizadoelem…» / Drive «…reedoreshayanautorizadoele…» |
| 23 | 240 | `5fb7ddb7512f` | `e7c0d16285fc` | **difiere** | TSC «…creedoresestpuedenponersed…» / Drive «…creedoresestospuedenponers…» |
| 24 | 556 | `ce9cd4765b7b` | `d836d73cb71d` | igual | — |
| 25 | 241 | `17fea2520f3c` | `66091d05d8de` | igual | — |
| 26 | 10177 | `39128f03a6d7` | `e91f9abf5feb` | **difiere** | TSC «…uerdosyleyesigalpamdc5deju…» / Drive «…uerdosyleyesgalpamdc5dejun…» |
| 27 | 2528 | `b64d604e60b1` | `0ae2c07d77c8` | **difiere** | TSC «…uerdosyleyeslpamdc5dejunio…» / Drive «…uerdosyleyesgalpamdc5dejun…» |
| 28 | 500 | `c7e74bac225c` | `055defc57a40` | igual | — |
| 29 | 330 | `137688aa635b` | `6a43d858fca2` | igual | — |
| 30 | 428 | `aa83803261c7` | `d5859baaf963` | **difiere** | TSC «…ablealconsejnacionaldeinve…» / Drive «…ablealconsejonacionaldeinv…» |
| 31 | 373 | `896952961957` | `4ad0dc3bd2d4` | **difiere** | TSC «…depromociondlaalianzapubli…» / Drive «…depromociondelaalianzapubl…» |
| 32 | 258 | `88a906a355ca` | `0a91788fcaca` | **difiere** | TSC «…alasecretariontecnicadelco…» / Drive «…alasecretariatecnicadelcon…» |
| 33 | 903 | `27401f7548d1` | `58a59a70f3f6` | **difiere** | TSC «…mplimientoalestablecidoenl…» / Drive «…mplimientoaloestablecidoen…» |
| 34 | 766 | `27ade9da4bf7` | `fea7d81daa5f` | igual | — |
| 35 | 522 | `38c29d4233cb` | `7c795fceddd4` | igual | — |
| 36 | 250 | `784cfe3a3517` | `75a36b3c9520` | igual | — |
| 37 | 210 | `c1fd7552dd67` | `46576aee8afa` | **difiere** | TSC «…los380381382383delcodigode…» / Drive «…los380381382y383delcodigod…» |
| 38 | 162 | `691a4a847a06` | `339b7bbbf8dd` | **difiere** | TSC «…os36373839y5deldecretolegi…» / Drive «…os36373839y54deldecretoleg…» |
| 39 | 613 | `6e76bd0b9957` | `faf5c65e3e66` | **difiere** | TSC «…raenvigenciapartirdeldiade…» / Drive «…raenvigenciaapartirdeldiad…» |

## 4. Decisiones del CLO (solo una persona; ninguna la toma el código)

| # | Decisión | Opciones | Propuesta |
|---|---|---|---|
| D1 | Procedencia | ☐ Acreditada ☐ No acreditada | **Acreditada:** copia del TSC (dominio verificado), bytes `a7eb221f…`, descargada por el propietario (§0) |
| D2 | Identidad | ☐ Confirmada ☐ Rechazada | **Confirmada:** título, número, Gaceta, sanción, ejecútese y firmas constan en el PDF del TSC (§1) |
| D3 | Texto que se carga | ☐ (a) Transcripción cotejada contra las imágenes del TSC, tomando como base el texto de la copia del Drive ☐ (b) Nuevo OCR del PDF del TSC ☐ (c) Texto OCR del TSC tal cual | **(a)**. Se cotejan los 28 artículos marcados «difiere» contra la imagen del TSC. **No (c)**: la capa OCR altera números con efecto jurídico (art. 38). La ingesta hoy toma el texto del PDF que se le pasa: hará falta una opción de «texto cotejado» que conserve la procedencia del TSC (cambio pequeño, aparte) |
| D4 | Vigencia | ☐ Aprobar la propuesta ☐ Modificar: ______ | Ver §5 |
| D5 | Art. 13 (contiene el texto de 12 artículos reformados del Código de Comercio) | ☐ Una fila del decreto ☐ Además, versiones nuevas en el Código de Comercio | Una fila del decreto ahora. Las versiones del Código de Comercio son un trabajo aparte y no se infieren de aquí |
| D6 | Tipo de fuente | ☐ `ley` ☐ Otro: ______ | `ley` |
| D7 | Quitar el bloqueo `INSTRUMENTO_SIN_PLIEGO_CLO` | ☐ Sí ☐ No todavía | Cambio de código revisado con evidencia G6, **después** de cargar el texto de D3 |
| D8 | Promoción | ☐ V3→V4 ☐ V4→V5 ☐ Rechazado | Con D1–D7 resueltas |

Nombre: ______________________ · Rol: ☐ abogado_revisor_senior ☐ propietario_despacho · Fecha: ____-__-__

## 5. Propuesta para D4 (vigencia)

**Propuesta de declaración:** «El Decreto 284-2013 está vigente desde el 5 de junio de 2014, fecha de su publicación en La Gaceta N.º 33,445 (art. 39). No consta reforma ni derogación expresa del propio decreto en el registro normativo de MayaLex ni en la búsqueda de descubrimiento del 15-nov-2026. Vigencia: **TRUE_PRESUNTA**, sujeta al cotejo del CLO.»

Base y límites:
1. **Texto propio:** solo cita decretos anteriores (73-50, 51-2011, 143-2010 y 74-2001). No puede contener reformas posteriores.
2. **Registro de MayaLex:** no hay ninguna reforma ni derogación registrada del D.284-2013.
3. **Decreto 107-2021:** es el **Presupuesto General de Ingresos y Egresos 2022**, publicado el 17-dic-2021 y reformado después por el D.142-2021. **No se encontró que reforme el D.284-2013.** Si existe otra norma con ese número, no apareció.
4. **Decreto 145-2018** (Ley de Apoyo a la Micro y Pequeña Empresa, La Gaceta 34,806 del 28-nov-2018): su art. 3 **remite** al registro en línea del D.284-2013, pero **no lo reforma**, según las fuentes halladas.
5. **Límite:** la búsqueda no consultó el registro de reformas del Congreso Nacional, que no tiene dominio verificado, ni La Gaceta posterior a 2014. Por eso la vigencia es «presunta» y no «verificada».
6. **Disposiciones agotadas:** los arts. 13, 14, 26, 27, 37 y 38 son modificatorios, y su efecto quedó incorporado en las leyes que modifican. Los arts. 10 (un año), 34 (180 días) y 36 (tres meses) fijan plazos ya vencidos. Siguen vigentes como texto del decreto, pero **el art. 13 no es el texto actual de los artículos del Código de Comercio** que reforma: pudieron reformarse después. Ninguna fila del art. 13 debe presentarse como texto vigente del Código de Comercio.

## 6. Qué ocurre después de aprobar (y solo entonces)

1. **Texto según D3:** transcripción cotejada (opción a) y la opción de «texto cotejado» en `scripts/ingesta-lote-staging.ts`.
2. **Filas, sin escribir en ninguna base:** 39 filas ocultas (`revision_pendiente = true`), vigencia NULL y sin embedding. Identidad `HN:DECRETO_284_2013` y fuente «Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)», tipo `ley`.
3. **Staging** (`aicakncgtuiiuomflkqj`): el Titular aplica el SQL y un paso aparte llena los embeddings.
4. **Visibilidad y vigencia** (`revision_pendiente = false`, `es_norma_vigente` según D4): una escritura aparte, autorizada por el Titular.
5. **Producción:** requiere una migración revisada y autorización expresa.
