# Pliego D5–D8 · OLA 15 · Ley de Garantías Mobiliarias (Decreto No. 182-2009)

**Estado:** D1–D8 FIRMADAS (2026-11-28, Abg. y Not. Fredy Omar Pinel Flores, CLO)

**Lote:** `OLA15_LGM_2016_01` · **Instrumento:** `HN:LEY_GARANTIAS_MOBILIARIAS` · **Fecha de corte:** 2026-11-28
**Generador:** `scripts/olas/ola15-lgm.ts` (sobre `scripts/olas/paquete-ola.ts`) · **Paquete:** `out/ola15-lgm/` (no versionado; se regenera byte a byte)

> **Alcance.** Este pliego autoriza la carga del paquete en staging (V4) y en producción (V5). No cambia ningún texto ni ninguna clasificación ya firmados. Para firmar, el CLO cambia la línea **Estado** por la fórmula `D1–D8 FIRMADAS (fecha, firmante)` y marca §8. El ejecutor (`scripts/olas/ejecutar-sql.ts`) lee la firma **solo** en esa línea y exige que este pliego cite el SHA-256 completo de cada SQL que corre (§3). Hasta entonces **no se escribe en ninguna base de datos**. Los pasos de staging 01–03 (filas ocultas, sin firma) tampoco se ejecutan sin orden del CLO.

## 0. Resumen

- **87 filas:**
  - **86 PRIMARY vigentes**: arts. 1–46 y 48–86 con el texto de 2010 (vigentes desde el **28-jul-2010**, art. 86); art. 47 con el texto del art. 10 del D.50-2016 (vigente desde el **4-jul-2016**).
  - **1 CONTEXT derogada**: el art. 47 de 2010, como antecedente, con `num_articulo_norm` vacío.
- Cada fila lleva **exactamente** la huella de contenido que fija la matriz firmada (`15bece35…`). El generador aborta si una sola difiere.
- **Ensayo PGlite completo:** 30 comprobaciones superadas. «Art. 47» devuelve **solo** el texto de 2016 por las tres rutas: la RPC exacta, la consulta exacta de la aplicación y la búsqueda semántica con solo vigentes. La fila de 2010 queda aislada.
- **Hallazgo nuevo (R7):** la pregunta en lenguaje natural «¿Quién administra el Registro de Garantías Mobiliarias?» no trae el art. 47 entre los 20 primeros resultados semánticos (posición 47 de 87). No afecta a la carga; es un límite del modelo de embeddings (§5).
- **Decisiones que pide este pliego:**
  - D5: clasificación y metadatos, incluidas la materia `02_CIVIL` y la conservación del encabezado «ARTÍCULO N.-»;
  - D6: embeddings y SQL;
  - D7: ensayo y staging;
  - D8: producción y PR de código posterior.

## 1. Antecedentes firmados (no se reabren)

| Pieza | Huella | Estado |
|---|---|---|
| Texto D1 cotejado (`docs/corpus/fase2/ocr/LGM_OLA15_articulado_cotejado.txt`) | `84effbdbe0855e103e606fea191989a6f656413648a64cd05e5992578ebfdba1` | FIRMADA 2026-11-28 |
| Art. 47 de 2016 (`art47_D50-2016.txt`) | archivo `c71439bc41ddec88e3bab8e8535dc3f93bccbaa58d693864d2b3304a04d0d64a`; contenido `ba57fe64b7088ceb1fad5052b5add6b68289c1c4044d6d8d07737d14c9780d46` | FIRMADA 2026-11-28 (reserva R1) |
| Matriz (`matriz_clasificacion.csv`) | `15bece3565e2c5c5db92f37b4e7cb1bf0d0d7ef4c3d31d159dd45dc23bed6cb4` | FIRMADA 2026-11-28 (reserva R2) |

**Lo que aplica el paquete, tal como se firmó:**

- **Encabezados.** Se cortan los 21 encabezados de título y capítulo que cierran un artículo (§5.1 del reporte D1) y se asignan, con el texto verificado en la imagen, como `metadata.ubicacion` del artículo siguiente. Con el encabezado previo al art. 1 son **22 bloques**: 10 títulos y 22 capítulos. *La instrucción del CLO dice «23 encabezados». La matriz firmada y `encabezados_cortados.csv` tienen 22 bloques; el paquete sigue lo firmado.*
- **Los dos residuos del OCR:**
  - tras el art. 79, «CAPÍTULO REGLAS TRANSITORIAS» (sin el «II») se corta y queda como «CAPÍTULO II · REGLAS TRANSITORIAS» desde el art. 80;
  - el «|» final del art. 84 se corta con su encabezado.

  Ningún artículo conserva un encabezado ni un «|» (comprobado sobre las 87 filas).
- **Fe de erratas** en los arts. 17, 26, 52 y 56 (cuatro signos de puntuación), anotada en `metadata.correcciones_saneamiento`.
- **Reservas en cada fila:**
  - R2 (barrido complementario en el CEDIJ y el Congreso Nacional) consta en `metadata.reservas` de las 87 filas;
  - el art. 47 de 2016 añade R1: testigo único del TSC (La Gaceta 34,076).

## 2. El paquete

**Cada fila** (`rows.jsonl`, `a2e4a11e…`):

| Campo | Valor |
|---|---|
| `id` | `OLA15_LGM_2016_01:LEY_GARANTIAS_MOBILIARIAS:<n>`; la histórica, `…:47-TEXTO-2010` |
| `num_articulo` / `num_articulo_norm` | `<n>` / `<n>`; la histórica, «47» / **NULL** |
| `fuente` | «Ley de Garantías Mobiliarias de Honduras (Decreto No. 182-2009)» |
| `fuente_tipo` | `codigo` (como todas las leyes V5; la ruta exacta de la aplicación solo busca `codigo`) |
| `materia` | `02_CIVIL` (propuesta D5) |
| `coleccion` / `jurisdiccion` | `mayalex_normativos` / `HN` |
| `contenido` | el texto firmado, con su encabezado «ARTÍCULO N.-» y su epígrafe (propuesta D5) |
| `metadata` | las mismas claves que la OLA 14 (`norm_id`, `instrumento_id`, `ola`, `ordinal`, `decreto`, `texto_origen`, `edicion_fuente`, `pdf_sha256`, `article_sha256`, `ubicacion`, `constancias`, `correcciones_saneamiento`, `sustituye_id_legacy`) más `vigente_desde`, `expediente`, `matriz_sha256`, `texto_d1_sha256` y `reservas` |

**Las dos versiones del art. 47:**

| | `…:47` (vigente) | `…:47-TEXTO-2010` (histórica) |
|---|---|---|
| Rol / `es_norma_vigente` | PRIMARY / `true` | CONTEXT / `false` |
| `num_articulo_norm` | `47` | NULL |
| `vigente_desde` | `2016-07-04` | `2010-07-28`, con `derogado_desde` `2016-07-04` y `derogado_por` «D.50-2016» |
| Enlace | `version_anterior_id` → la histórica | `version_vigente_id` → la vigente |
| Testigo (`pdf_sha256`) | La Gaceta 34,076 (`201047b5…`) | La Gaceta 32,125 (`dc919517…`) |
| Constancia | `REFORMA 50-2016` | `SUSTITUCION 50-2016` |

**Producción hoy** (consulta de solo lectura, 2026-11-28):
- prod: 0 filas de la LGM (por lote, instrumento, `norm_id` o fuente); el respaldo `biblioteca_vectores_ola15_lgm_2016_01_backup` no existe. Totales: 92,294 filas, 13,062 visibles y 8,090 V5.
- staging: 0 filas de la LGM.
- No hay legacy que ocultar.
- Ningún índice único afecta a `num_articulo_norm`.

**Estado esperado tras P3:** 92,381 filas, 13,149 visibles y 8,177 V5.

**Cambio en el generador** (`paquete-ola.ts`): admite filas sin `num_articulo_norm` **solo** como CONTEXT derogadas.
- `validarFilas` rechaza cualquier otra combinación.
- Staging 03 cuenta 86 números distintos más 1 fila histórica.
- V4 y V5 comprueban que la fila sin número siga siendo CONTEXT con `false`.
- Si ninguna fila carece de número, el SQL no cambia: la salida es byte a byte la misma, con y sin el cambio, en los 18 paquetes anteriores. Los 4 firmados desde la última modificación del generador (OLA 13 ×3 y OLA 14) reproducen su manifiesto firmado. `verificar-firmadas.ts` da 14/14 idénticas.
- Nueva prueba en `tests/olas-paquete.test.ts` (20/20 en verde).

## 3. Huellas del manifiesto

| Destino | Paso | Archivo | Bytes | SHA-256 | Firma |
|---|---|---|---|---|---|
| staging | 1 | `staging/01_insert_staging.sql` | 244,012 | `48065b42f699c27112935eec470617148466e09e8e55f83c1233891a56456e48` | no |
| staging | 2 | `staging/02_embeddings_staging.sql` | 334,982 | `25fa18edc728697ed646ec81482bd3f8c696f163a8f1425a0984fd13759bfd76` | no |
| staging | 3 | `staging/03_verificacion_staging.sql` | 1,902 | `3dab9426b456a4d73b475b438f9e9a963e34cde428a47a67351d0d13144ef31f` | no |
| staging | 4 | `staging/04_visibilidad_v4_staging.sql` | 10,279 | `ddd91dd37023ec5dd8fd7877f82e754a7bd04efc7348766dbe01d6d3213875fd` | **sí** |
| prod | 0 | `prod/00_precheck_y_respaldo_prod.sql` | 1,486 | `ba97a394f240d26689cabbfdf6103ea84c6090437219f13abb1325d4c3b00255` | **sí** |
| prod | 1 | `prod/01_datos_prod.sql` | 247,336 | `a4ac03c0783448dc924e0c5cfe53369244c3eea59da822d3822943e51120567c` | **sí** |
| prod | 2 | `prod/02_embeddings_prod.sql` | 340,622 | `22cd16bb9e4fe8d0ccbf70ba7ac07afbf7b87fc633e644de03e3e4546e72585f` | **sí** |
| prod | 3 | `prod/03_activacion_v5_prod.sql` | 10,697 | `243f051d27191cf17ade63b95826999671605f8aab2824a57745bd53d27c7a78` | **sí** |
| prod | 99 | `prod/99_reversion_prod.sql` (solo por orden del CLO) | 477 | `d20228df423ec13b9129630d70f37755ccda0a460d06a94a64d00ba2f475e575` | **sí** |

| Otros archivos | SHA-256 |
|---|---|
| `manifiesto_paquete.json` | `6b2b8fa66373c139b50338e7886acc1fa75bc861068f1b109f55370ce3bcb852` |
| `rows.jsonl` | `a2e4a11e384b69050af3758460ad2ed8531b1e998b1e16fc462c562dddd89b79` |
| `manifiesto_articulos.json` (versionado en esta carpeta) | `12c6c9cc1d2a42ded88feb44196afa974c00362412a88baaf322bda942d5612b` |
| Texto del lote (`id` + contenido de las 87 filas) | `a841dce9f0ea29da416ad2254ab88ea7da7ea13c906fe9c60d6ab95efd934bd1` |
| `ejecutar_staging.ps1` | `539eca428b16932833422aa7b71754e01ed99391171f3e19426f1c4f665811f1` |
| `ejecutar_prod.ps1` | `d40d69d4f31e9b6e25ec114a211ee74b590ced3c27718215156ae20ab1c9ca42` |

Dos corridas del generador dieron las mismas huellas.

## 4. Carga: orden, precondiciones y postcondiciones

**Ejecución.** El CLO la hace en su terminal, con los envoltorios `.ps1`:
- la URL de la base se teclea oculta y se borra al terminar;
- hay que teclear el project ref;
- en producción, además, la frase `PROMOVER OLA15_LGM_2016_01 A PROD`.

**Staging** (`aicakncgtuiiuomflkqj`):
1. **01**: inserta 87 filas **ocultas**, con vigencia NULL y sin embedding. Es idempotente.
2. **02**: escribe los embeddings, solo en filas con embedding NULL.
3. **03**: verificación de solo lectura:
   - 87 filas con SHA-256 correcto y embedding;
   - 86 números distintos;
   - 1 fila histórica sin número.
4. **04** (con firma) aplica la V4.
   - *Precondición:* las 87 filas están ocultas, sin vigencia y con embedding.
   - *Postcondiciones:* 87 visibles V4, 86 PRIMARY vigentes, 1 CONTEXT derogada, 0 derogadas PRIMARY, y la fila sin número sigue siendo CONTEXT con `false`.

**Producción** (`thgrhueckkjdutjvcufp`, todo con firma):
- **00**: crea el respaldo con RLS y sin privilegios para anon/authenticated. Aborta si el respaldo ya existe o si el lote ya está en V5.
- **01**: inserta 87 filas ocultas con vector cero. Aborta si falta el respaldo.
- **02**: sustituye el vector cero por el real.
- **03**: activa la V5 de forma atómica, con las mismas postcondiciones que la V4, más `promocion_fecha` y `promocion_ola`.
- **99**: revierte, borrando el lote. Solo por orden del CLO.

Cualquier fallo revierte la transacción entera.

## 5. Ensayo PGlite (2026-11-28)

**Montaje:**
- PostgreSQL en memoria con pgvector real; nada persiste.
- Tabla con las mismas columnas, la restricción `chk_fuente_tipo` y el índice `(instrumento_id, num_articulo_norm)` de producción.
- Las **dos RPC con el mismo cuerpo que producción** (md5 de `prosrc` `37735385…` / `4392a97a…`, comprobado en el ensayo).
- Filas ajenas de control: un art. 47 y un art. 28 de la Ley de Propiedad y una fila legacy oculta.

Registro completo en `out/ola15-lgm/ensayo_pglite.log`. **30 comprobaciones superadas:**

**Idempotencia y fallo cerrado:**
- staging 01 y 02 repetidos no cambian nada;
- staging 04 repetido aborta sin cambios;
- prod 01 sin respaldo aborta;
- prod 00 repetido aborta (el respaldo ya existe);
- prod 01 y 02 repetidos no cambian nada;
- prod 03 antes de 02 aborta;
- prod 03 con un contenido alterado (art. 47) aborta («precondición V5: 86 filas»);
- prod 03 repetido aborta;
- prod 99 dos veces deja la base como al principio.

Las filas ajenas al lote quedan con huella idéntica en cada fase.

**Postcondiciones**, idénticas en staging V4 y en prod V5:

| Total | Visibles | PRIMARY vigentes | CONTEXT derogadas | Sin número | Números distintos | Con embedding | SHA correcto | Vigentes desde 2010 | Desde 2016 |
|---|---|---|---|---|---|---|---|---|---|
| 87 | 87 | 86 | 1 | 1 | 86 | 87 | 87 | 86 | 1 |

**Respaldo:** 0 filas, RLS activa, sin privilegios para anon/authenticated.

**Las dos versiones del art. 47** (en staging V4 y en prod V5):

1. `resolver_articulo_exacto('LEY_GARANTIAS_MOBILIARIAS', '47')` devuelve **1 fila**, `…:47` (texto de 2016, `ba57fe64…`, vigente). Antes de la V4, con el lote oculto, no devuelve ninguna.
2. Barrido 1–86 por la misma RPC: cada número devuelve exactamente una fila vigente, 86 distintas en total; la de 2010 no sale por ningún número.
3. Consulta exacta de la aplicación (`lib/rag/search.ts`, `num_articulo = '47'`, `fuente_tipo = 'codigo'`, `es_norma_vigente = true`): del lote, solo `…:47`. La de 2010 solo saldría con `es_norma_vigente = false`, paso que el código eliminó por orden del CLO (28-oct-2026).
4. Búsqueda semántica con solo vigentes, en el **peor caso** (consultando con el embedding exacto del texto de 2010): la de 2010 no sale, y el art. 47 de 2016 sale **primero**.
5. Búsqueda semántica sin filtro de vigencia: la de 2010 sale marcada `false`, y el guardián CLO la degrada a CONTEXT con `VIGENCIA_FALSE_EXCLUIDA`. **Falla cerrado.**

**Hallazgo (reserva R7).**
- **El hecho:** para la pregunta en lenguaje natural «¿Quién administra el Registro de Garantías Mobiliarias?», con solo vigentes, la de 2010 no sale. Pero el art. 47 de 2016 tampoco está entre los 20 primeros: queda en la posición 47 de 87 del lote. Sin filtro de vigencia, la de 2010 quedaría en la 26.
- **La causa:** con `multilingual-e5-small`, todos los artículos de la LGM puntúan entre 0.83 y 0.85 para esa pregunta, y salen primero los que hablan del Registro (arts. 41, 43 y 42).
- **Lo que no afecta:** a la carga ni al aislamiento de la versión histórica. Quien pregunte por «el art. 47» obtiene el texto vigente.
- **Lo que significa:** la ruta semántica no garantiza ese artículo para esa pregunta. Se propone medirlo en el PR de código D8 y en la evaluación de recuperación, no corregirlo aquí.

**Guardián CLO hoy.** El guardián todavía no reconoce `LEY_GARANTIAS_MOBILIARIAS`: todas las filas de la LGM salen CONTEXT (`SIN_INSTRUMENT_ID`) hasta el PR de código posterior a la carga (R6). Es lo mismo que ocurrió con la OLA 14, y falla cerrado.

## 6. Decisiones D5–D8 (propuestas)

**D5 · Clasificación y metadatos del paquete.**
- 87 filas según la matriz firmada (§1–§2).
- `vigente_desde` 2010-07-28 / 2016-07-04.
- La fila histórica, enlazada con la vigente.
- R2 y R1 constan en la metadata.

Dos puntos que el CLO decide:

- **(a) Materia `02_CIVIL`.** No hay una materia mercantil en el corpus. La LGM queda junto a la Ley de Propiedad, con la que se conecta por su art. 83 y por el Registro. Alternativa: `10_LEYES_REGLAMENTOS`, como la LGAP; cambia los SQL y sus huellas, pero no los textos.
- **(b) Encabezado «ARTÍCULO N.-».** Las filas conservan el encabezado y el epígrafe, porque la matriz firmada fija la huella de **ese** texto. Las olas anteriores lo retiraban. La ruta exacta lo acepta: es su criterio por defecto (`tieneEncabezadoArticulo`). Retirarlo cambiaría las 87 huellas y obligaría a volver a firmar la matriz. **Se recomienda conservarlo.**

**D6 · Embeddings y SQL.**
- Embeddings: 384 dimensiones, `Xenova/multilingual-e5-small` con el prefijo «passage: », normalizados (el generador los valida). Caché en `out/ola15-lgm/embeddings_cache.jsonl`.
- SQL: los 9 archivos de §3, con sus huellas.
- El cambio del generador descrito en §2.

**D7 · Ensayo y staging.**
- Se acepta el ensayo de §5, incluido el hallazgo R7.
- El CLO ejecuta `ejecutar_staging.ps1` (pasos 1–4).
- Después, verificación de solo lectura por Claude Code con las mismas postcondiciones y las comprobaciones 1–4 del art. 47 sobre staging, que se anota como §9 en este pliego.

**D8 · Producción y desbloqueo.**
- Tras §9, el CLO ejecuta `ejecutar_prod.ps1` (pasos 0–3). El paso 99, solo por orden expresa.
- Después: verificación de solo lectura (§10), versionado del SQL ejecutado en `docs/corpus/produccion-ejecutada/` y un PR de código aparte que:
  - registre `LEY_GARANTIAS_MOBILIARIAS` en el catálogo de identidad, el detector, el gate y los guardianes;
  - añada el lote a la verificación de paquetes firmados;
  - cubra los casos de borde del detector pendientes (R6);
  - mida R7.

## 7. Reservas

| Reserva | Estado |
|---|---|
| R1 · Testigo único del D.50-2016 (IAIP no descargable) | **Abierta.** El art. 47 de 2016 se carga con el testigo del TSC; si el CLO aporta el del IAIP, se coteja antes de P1 |
| R2 · Barrido en el CEDIJ y el Congreso Nacional | **Abierta.** Si aparece otra reforma, se detiene la carga y se reabre la D4 |
| R3 · Dos versiones del art. 47 | **Satisfecha por el ensayo** (§5, comprobaciones 1–5) |
| R4 · Transitorios | **Resuelta** por la firma del 2026-11-28: vigentes según la matriz |
| R5 · Reglamento del Registro (Acuerdo 2074-2010) | Fuera de la OLA 15 |
| R6 · Registro del instrumento en el código | **Abierta.** PR de código posterior a la carga (D8) |
| R7 · Rango semántico del art. 47 ante preguntas en lenguaje natural | **Abierta, aprobada por el CLO (2026-11-28).** Se evalúa **y ajusta** en el PR de código D8: posicionamiento del art. 47 reformado (D.50-2016) en consultas abiertas sin número de artículo. No bloquea la carga |

## 8. Decisiones para firma

| Decisión | Propuesta | Firma |
|---|---|---|
| D5 | Clasificación y metadatos (§6), con materia `02_CIVIL` y el encabezado «ARTÍCULO N.-» conservado | ☑ **Aprobada** por el CLO (2026-11-28): (a) materia `02_CIVIL`, junto a la Ley de Propiedad; (b) se conserva el encabezado «ARTÍCULO N.-» conforme a la matriz firmada (`15bece35…`); se confirman los 22 bloques estructurales (10 títulos y 22 capítulos) de la matriz firmada |
| D6 | Embeddings y SQL, con las huellas de §3 | ☑ **Aprobada** por el CLO (2026-11-28): las 9 huellas SHA-256 de §3 y el manifiesto `6b2b8fa66373c139b50338e7886acc1fa75bc861068f1b109f55370ce3bcb852`; **`prod/99_reversion_prod.sql` queda sin autorizar** |
| D7 | Ensayo de §5 aceptado; staging 1–4 por el CLO y verificación de solo lectura (§9) | ☑ **Aprobada** por el CLO (2026-11-28): se ejecuta **primero solo staging**; Claude Code audita en solo lectura (§9) antes de cualquier paso en producción |
| D8 | Producción 0–3 tras §9; 99 solo por orden; verificación §10 y PR de código posterior | ☑ **Aprobada** por el CLO (2026-11-28), condicionada a §9; filas de la LGM bajo la reserva R6 (CONTEXT) hasta el PR de código, que además evalúa y ajusta R7; reservas R1 y R2 se mantienen |

**Condiciones de ejecución.** La firma habilita técnicamente al ejecutor para los pasos con firma, pero el CLO ordena:

1. ejecutar **solo staging** (pasos 1–4);
2. esperar la auditoría de solo lectura de §9;
3. ejecutar producción (pasos 0–3) solo con su autorización expresa posterior.

El paso 99 no está autorizado. Claude Code no ejecuta SQL en ninguna base: el CLO corre los `.ps1` en su terminal.

Firma: **aprobado** · **Abg. y Not. Fredy Omar Pinel Flores**, CLO / Director Maya Lex · Fecha: **2026-11-28** · *Registrada por Claude Code por orden expresa del CLO. Antes de registrarla se verificó que las 9 huellas de §3 y el manifiesto (`6b2b8fa6…`) coinciden con el paquete regenerado, y que el ejecutor reconoce la fórmula en modo `--simular` (sin conexión).*
