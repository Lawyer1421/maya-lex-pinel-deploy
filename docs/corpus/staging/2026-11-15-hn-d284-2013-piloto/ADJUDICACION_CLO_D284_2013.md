# Paquete de adjudicación CLO · Decreto 284-2013 (piloto)

**Identidad:** `HN:DECRETO_284_2013` · **Estado actual:** `SOURCE_HOLD` (copia del Drive del propietario) · **V4/V5:** ninguno · **Vigencia:** sin declarar

> Este documento **no aprueba nada**. Reúne lo comprobado y deja las decisiones para el CLO. El código solo admite promover V3→V4 y V4→V5 a los roles `abogado_revisor_senior` o `propietario_despacho` (`lib/ingesta-oficial/estados.ts`), y cada intento queda en `ingestion_audit_log`. Mientras el CLO no apruebe este pliego, el clasificador bloquea toda fila del decreto como `INSTRUMENTO_SIN_PLIEGO_CLO` (solo contexto, nunca fundamento).

## 0. Requisito previo: procedencia institucional (hoy bloquea)

La copia procesada viene del Drive del propietario, así que `drive.google.com` no acredita nada. Hay una copia institucional en un dominio **verificado** del registro (TSC, `www.tsc.gob.hn`, tier 4, `OFFICIAL_COMPILATION`), y no depende del CEDIJ:

- PDF: <https://www.tsc.gob.hn/web/leyes/Ley_gene_empl_dere_inver.pdf>. Sus encabezados muestran La Gaceta N.º 33,445 del 5-jun-2014.
- Ficha: <https://www.tsc.gob.hn/biblioteca/index.php/leyes/566-ley-para-la-generacion-de-empleo-fomento-a-la-iniciativa-empresarial-formalizacion-de-negocios-y-proteccion-a-los-derechos-de-los-inversionistas>

El registro marca el TSC como `UNSUITABLE_FOR_AUTOMATION`: **una persona** descarga el PDF en el navegador. Pasos:
1. Descargar el PDF desde la URL anterior.
2. `Get-FileHash .\Ley_gene_empl_dere_inver.pdf -Algorithm SHA256` y comparar con la copia ya procesada: `ea81bfa6146f0cb70e275690b19aad19609da794553afe7073ee7df6c97217ae`.
   - **Iguales:** la copia del Drive es byte a byte la del TSC, y todo lo de este pliego aplica sin cambios.
   - **Distintos:** es otra edición. Se procesa la del TSC y este pliego se regenera.
3. Recepción (debe terminar en `CLO_PENDING`; si da `SOURCE_HOLD`, detenerse y avisar):
   ```sh
   npx tsx tools/corpus/receive-pdf.ts .\Ley_gene_empl_dere_inver.pdf --paquete HN-001-A02 \
     --url "https://www.tsc.gob.hn/web/leyes/Ley_gene_empl_dere_inver.pdf" --retriever "Fredy Pinel" \
     --fecha <ISO de la descarga> --metodo MANUAL_BROWSER --lote 2026-11-15-hn-d284-2013-piloto --columnas 2
   ```
   La huella del ejemplar es de 17 páginas y la copia del Drive tenía 16. Si el PDF del TSC difiere, quedará `RECEIVED`. Tras cotejar, se repite con `--revisado "<qué se cotejó>"`.

## 1. Identidad (comprobada en el texto de la copia procesada)

| Dato | Valor | Fuente en el texto |
|---|---|---|
| Instrumento | Decreto 284-2013: «Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas» | Encabezado |
| Publicación | La Gaceta N.º 33,445, 5 de junio de 2014 | Encabezado de página |
| Sanción legislativa | «Dado en … a los ocho días del mes de enero de dos mil catorce» | Cierre |
| Ejecútese | Tegucigalpa, 24 de enero de 2014 | Cierre |
| Vigencia | Art. 39: «a partir del día de su publicación en el Diario Oficial La Gaceta» | Art. 39 |
| `bytes_sha256` | `ea81bfa6146f0cb70e275690b19aad19609da794553afe7073ee7df6c97217ae` | Recibo A02 |
| `text_sha256` | `bcc012db1cb4e821244ed30dfa0035129e8105413440bc7ad9d2b3c9804ffdd1` (dos columnas) | Recalculado el 15-nov: coincide |

QA del receptor sin bloqueos y con los 39 artículos en secuencia continua. En la hoja de trabajo del 4-nov, el chequeo `FIXTURE` muestra el texto fijo «material sintético/de prueba detectado», pero su resultado es **OK**: significa que **no** es material sintético.

## 2. Efectos normativos que declara el propio texto

| Art. | Verbo | Instrumento afectado | Alcance |
|---|---|---|---|
| 13 | Reforma | Código de Comercio (D.73-50) | Arts. 14, 15, 18, 157, 169, 189, 193, 210, 222, 224, 226 y 228 |
| 14 | Reforma | Código Civil | Arts. 1782 y 1789 |
| 26 | Reforma | Ley para la Promoción y Protección de Inversiones (D.51-2011) | Arts. 21, 40, 42, 43, 44, 45, 46 y 50 |
| 27 | Reforma | Ley de Promoción de la Alianza Público-Privada | Arts. 29 y 34 |
| **28** | **Interpreta** | Ley de Promoción de la Alianza Público-Privada | Art. 31 (**no registrado** en el informe del 4-nov) |
| **29** | **Interpreta** | Ley de Promoción de la Alianza Público-Privada | Art. 35 (**no registrado** en el informe del 4-nov) |
| 37 | Deroga | Código de Comercio (D.73-50) | Arts. 380, 381, 382 y 383 |
| 38 | Deroga | D.51-2011 y sus reformas | Arts. 36, 37, 38, 39 y 54 |
| 39 | Vigencia | — | Desde su publicación en La Gaceta |

**Materia notarial (arts. 15–25):** régimen de ejecución extrajudicial de garantías ante notario (pacto de renuncia al procedimiento judicial, requerimiento, pago, subasta, prelación y la prohibición del art. 25 al notario ante quien se constituyó la garantía). No reforma un artículo concreto: crea un procedimiento. El CLO decide si se registra como relación con el Código del Notariado.

## 3. Los 39 artículos (mismo segmentador que la ingesta; hashes idénticos al candidato)

| Art. | Caracteres | sha256 (12) | Comienzo |
|---|---:|---|---|
| 1 | 550 | `dd3fafddf9a1` | - A efecto de facilitar la formalización de las actividades mercantiles por parte de quienes las desempeñan y … |
| 2 | 583 | `a120f7abdf09` | - A las sociedades mercantiles constituidas bajo este régimen les son aplicables las disposiciones del Código … |
| 3 | 803 | `a1c2b57206f7` | - La creación de sociedades mercantiles bajo esta modalidad, se debe hacer a través de un formulario especial … |
| 4 | 656 | `07523bc05213` | - El Registro de las sociedades constituidas bajo esta modalidad debe hacerse en un registro electrónico único… |
| 5 | 874 | `fb2ab402e102` | - Las sociedades mercantiles formadas al amparo de esta Ley pueden ser creadas con un solo socio. El estableci… |
| 6 | 1221 | `ff056e4ca260` | - Las reuniones de asamblea de socios y las de los órganos de administración de estas sociedades mercantiles p… |
| 7 | 868 | `e80cf8f06cac` | - Para efectos de lo estipulado en el Artículo 36 del Código de Comercio, las sociedades mercantiles creadas a… |
| 8 | 954 | `ffe60f8c1a29` | - Cuando así lo estableciere el documento constitutivo de la sociedad, puede dejarse constancia de las reunion… |
| 9 | 516 | `6e12f208dc6c` | - Las tasas registrales y otros cargos deben poder cancelarse al momento de la inscripción en la misma ventani… |
| 10 | 341 | `dea024e129ec` | - Los entes encargados del Registro Mercantil deben crear los mecanismos para que en un plazo no mayor de un (… |
| 11 | 1363 | `2194063c361b` | - El formulario especial debe contener la información necesaria para que en el mismo acto de registro se autor… |
| 12 | 463 | `fbfb028e6cb4` | - El Registro Mercantil debe desarrollar por vía reglamentaria los procedimientos para la modificación, transf… |
| 13 | 13259 | `0a5795807b33` | - Reformar los artículos 14, 15, 18, 157, 169, 189, 193, 210, 222, 224, 226 y 228 del Código de Comercio conte… |
| 14 | 1012 | `cc0828118abc` | - Reformar los Artículos 1782 y 1789 del Código Civil, los cuales deben leer de la siguiente manera: “ARTÍCULO… |
| 15 | 557 | `630bf51fa54f` | - Es lícito el pacto en el que las partes acuerden renunciar al procedimiento judicial para la ejecución de ga… |
| 16 | 971 | `9ffd15704648` | - El Notario encargado de la ejecución deberá verificar que la obligación conste en instrumento público válido… |
| 17 | 837 | `ee6007e77496` | - El requerimiento puede hacerse en una dirección física o electrónica previamente pactada, o en su defecto en… |
| 18 | 1540 | `48e364cee974` | - Cuando el pago se hiciere efectivo ante el Notario en el plazo señalado, éste debe acreditar el mismo y dar … |
| 19 | 339 | `f861eac38350` | - El acta donde conste el requerimiento o notificación por Notario debe inscribirse en el mismo asiento en el … |
| 20 | 769 | `869007c5bd39` | - La venta debe hacerse en pública subasta a favor de quien ofrezca el mejor precio. El acreedor puede partici… |
| 21 | 175 | `7ab991804e2d` | - Las normas para determinar la prioridad y prelación de derechos de los acreedores sobre las garantías son de… |
| 22 | 717 | `3e3980cac2e7` | - Cuando hayan otros acreedores garantizados por los bienes que se ejecutarán, el acreedor interesado en su ej… |
| 23 | 246 | `e7c0d16285fc` | - Cuando hayan varios acreedores éstos pueden ponerse de acuerdo ante un notario sobre la forma en que distrib… |
| 24 | 549 | `d836d73cb71d` | - Cuando no se pueda notificar a los otros acreedores que tengan derechos sobre la misma garantía o éstos no l… |
| 25 | 237 | `66091d05d8de` | - El Notario ante quien se hubiese constituido una garantía no puede participar en la ejecución de la misma. T… |
| 26 | 10024 | `e91f9abf5feb` | - Reformar los Artículos 21, 40, 42, 43, 44, 45, 46 y 50 de la Ley para la Promoción y Protección de Inversion… |
| 27 | 2494 | `0ae2c07d77c8` | - Reformar los Artículos 29 y 34 de la Ley de Promoción de la Alianza Público-Privada contenida en el Decreto … |
| 28 | 492 | `055defc57a40` | - Interpretar el Artículo 31 de la Ley de Promoción de la Alianza Público Privada contenida en el Decreto Legi… |
| 29 | 325 | `6a43d858fca2` | - Interpretar el Artículo 35 de la Ley de Promoción de la Alianza Público-Privada contenida en el Decreto Legi… |
| 30 | 398 | `d5859baaf963` | - En lo procedente, será aplicable al Consejo Nacional de Inversiones y a otras unidades de la administración … |
| 31 | 368 | `4ad0dc3bd2d4` | - Son aplicables a la Ley de Promoción de la Alianza Público Privada contenida en el Decreto Legislativo No. 1… |
| 32 | 243 | `0a91788fcaca` | - Las referencias que en la Ley para la Promoción y Protección de Inversiones se hagan a la Secretaría Técnica… |
| 33 | 891 | `58a59a70f3f6` | - A efectos de dar cumplimiento a lo establecido en los artículos 15, 16 y 29 del Decreto 51-2011 contentivo d… |
| 34 | 754 | `fea7d81daa5f` | - En un plazo no mayor de ciento ochenta (180) días a partir de la entrada en vigencia de la presente Ley, la … |
| 35 | 514 | `7c795fceddd4` | - La certificación autenticada por Notario, emitida por una Institución del Sistema Financiero acreedora, en l… |
| 36 | 246 | `75a36b3c9520` | - Las normas contenidas en la presente Ley deben reglamentarse por la Presidencia de la República a través de … |
| 37 | 209 | `46576aee8afa` | - Derogar los Artículos 380, 381, 382 y 383 del Código de Comercio contenidos en el Decreto Legislativo Número… |
| 38 | 163 | `339b7bbbf8dd` | - Derogar los Artículos 36, 37, 38, 39 y 54 del Decreto Legislativo No. 51-2011 y sus reformas contentivas de … |
| 39 | 612 | `faf5c65e3e66` | - El presente Decreto entrará en vigencia a partir del día de su publicación en el Diario Oficial “La Gaceta”.… |

## 4. Decisiones del CLO (solo una persona; ninguna la toma el código)

| # | Decisión | Opciones | Recomendación técnica |
|---|---|---|---|
| D1 | Procedencia | ☐ Acreditada con la copia del TSC (§0) ☐ No acreditada | Sin D1 no se puede pasar a V4 |
| D2 | Identidad (título, decreto, Gaceta, fechas del §1) | ☐ Confirmada ☐ Rechazada | — |
| D3 | Texto contrastado con el original oficial, no solo con esta extracción | ☐ Sí ☐ Cotejar con otro ejemplar | Comparar los hashes del §0 |
| D4 | Fecha de vigencia | ☐ 5-jun-2014 (publicación en La Gaceta 33,445, art. 39) ☐ Otra: ______ | La fecha de La Gaceta solo es la de vigencia si el CLO confirma que es la de publicación |
| D5 | Art. 13 (13,259 caracteres; contiene el texto de 12 artículos reformados del Código de Comercio) | ☐ Una fila para el art. 13 del decreto ☐ Además, versiones nuevas de esos 12 artículos en el Código de Comercio | Una fila del decreto ahora; las versiones del Código de Comercio son un trabajo aparte (`norma_version`), no se infieren de aquí |
| D6 | Tipo de fuente | ☐ `ley` ☐ Otro: ______ | `ley`: lo admite la ingesta y el CLO lo trata como normativo |
| D7 | Quitar el bloqueo `INSTRUMENTO_SIN_PLIEGO_CLO` del decreto | ☐ Sí, con este pliego ☐ No todavía | Es un cambio de código revisado (`INSTRUMENTOS_SOLO_CONTEXT` en `clo-guards.ts`) y regenera la evidencia G6 |
| D8 | Promoción | ☐ V3→V4 ☐ V4→V5 ☐ Rechazado | Con D1–D7 resueltas |

Nombre: ______________________ · Rol: ☐ abogado_revisor_senior ☐ propietario_despacho · Fecha: ____-__-__

## 5. Qué ocurre después de aprobar (y solo entonces)

1. **Filas, sin escribir en ninguna base:** genera `rows.jsonl` e `insert_staging.sql` con 39 filas ocultas (`revision_pendiente = true`), vigencia NULL y sin embedding.
   ```sh
   npx tsx scripts/ingesta-lote-staging.ts .\Ley_gene_empl_dere_inver.pdf <candidato CLO_PENDING del §0>.json HN:DECRETO_284_2013 \
     PILOTO_D284_2013_01 "Decreto 284-2013, Ley para la Generación de Empleo, Fomento a la Iniciativa Empresarial, Formalización de Negocios y Protección a los Derechos de los Inversionistas (La Gaceta 33,445)" \
     out/piloto-d284-2013 2 ley
   ```
2. **Staging** (`aicakncgtuiiuomflkqj`): el Titular aplica el SQL y un paso aparte llena los embeddings.
3. **Visibilidad y vigencia:** pasar `revision_pendiente` a false y `es_norma_vigente` a TRUE es una escritura aparte, autorizada por el Titular según D4. La ingesta nunca lo hace.
4. **Producción:** requiere una migración revisada y autorización expresa. Nada de este pliego la concede.
