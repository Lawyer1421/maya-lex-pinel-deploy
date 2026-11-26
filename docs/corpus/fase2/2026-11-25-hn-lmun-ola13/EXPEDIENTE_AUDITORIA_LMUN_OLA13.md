# Expediente de auditoría · OLA 13 · lote 2 · `HN:LEY_MUNICIPALIDADES`

**Estado:** D1–D8 FIRMADAS
**Instrumento:** Ley de Municipalidades (Decreto No. 134-90) · lote `OLA13_LMUN_2009_01`
**Fecha del paquete:** 2026-11-25 · **Generador:** `scripts/olas/ola13-lmun.ts` + `scripts/olas/cedij.ts` + `scripts/olas/paquete-ola.ts`
**Staging:** `mayalexhn-staging` (`aicakncgtuiiuomflkqj`) · **Producción:** `thgrhueckkjdutjvcufp`

> **Cómo se firma.** El CLO revisa las secciones 1 a 5 y decide D1–D8 en §6. Para firmar, sustituye en la línea **Estado** el texto `PENDIENTE DE FIRMA` por la fórmula de firma (D1–D8 y la palabra FIRMADAS) y completa el bloque de firma. El ejecutor (`scripts/olas/ejecutar-sql.ts`) lee la firma solo en esa línea **Estado** y se niega a correr la visibilidad V4 en staging y cualquier paso de producción si este archivo no está firmado o no cita la huella SHA-256 exacta de cada SQL (§7). Si el CLO modifica una decisión, hay que regenerar el paquete y volver a citar las huellas.
>
> **Gobernanza de la Fase II.** Ninguna escritura en producción sin esta auditoría, la validación en staging (pasos S1–S4) y la firma expresa del CLO.

## 1. Fuente

| Pieza | Archivo · SHA-256 | Uso |
|---|---|---|
| Edición de la **Asociación de Municipios de Honduras (AMHON)** «LEY DE MUNICIPALIDADES.pdf» (`SISTEMA_LEGAL_PRINCIPAL/02_EJERCICIO_LEGAL/05_LEYES_Y_CODIGOS/`) | 586,828 bytes, 221 págs., Adobe Acrobat 9, 26-oct-2011 · `b711caf62cc5996650e18a4294ed761501b7a9066060dc9555ff34234ec181ee` | **Solo el articulado de la ley** (págs. 1–111): arts. 1–129 más 33 bis. Reformas integradas hasta el D.143-2009, marcadas **en línea** («(Según reforma por Decreto 48-91)», «(Adicionado por Decreto 127-2000)») y **16 notas al pie** |

**Fuera de este lote: el Reglamento General** (Acuerdo No. 018-93), que el mismo PDF trae a continuación (págs. 112–221). El articulado se corta en «Dado en la ciudad de Tegucigalpa…» de la ley, de modo que la numeración del Reglamento (que vuelve a empezar en 1) no colisiona. Queda inventariado aparte como **`OLA13_RLMUN`**.

**No es una edición del CEDIJ.** La edición AMHON imprime **títulos de margen** a la derecha del texto («OBJETO DE LA LEY») y pone las reformas en línea. Por eso tiene extractor y parámetros propios:
- **extracción por coordenadas** (poppler 25.07 con `-bbox-layout`, fijado por ruta): se descartan los bloques que empiezan en x ≥ 430 pt (títulos de margen) y la cabecera (y < 55 pt), y las líneas se reconstruyen por posición. Recortar la página no sirve, porque las notas al pie ocupan todo el ancho; y agrupar por bloques tampoco, porque poppler parte y desordena las líneas justificadas (caso real: «…acciones legales **que en derecho** procedieren» salía como «procedieren. que en derecho»);
- **`marcasEnLinea`** (parámetro nuevo de `cedij.ts`): las 95 marcas de reforma pasan del texto a constancia, igual que una nota al pie;
- **`edicion: 'AMHON'`** (parámetro nuevo): los motivos de clasificación y `texto_origen` dicen AMHON y no CEDIJ.

**Controles de la extracción:**
- **orden de palabras:** el texto de los 162 artículos aparece, palabra por palabra y en el mismo orden, en la extracción `-layout` de ancho completo (0 diferencias);
- **notas al pie:** las 79 líneas impresas en letra de nota en las págs. de la ley terminan dentro del texto de alguna nota; ninguna quedó en el cuerpo;
- **títulos de margen:** se listaron todas las palabras en mayúsculas con x ≥ 430 pt conservadas; solo «PEAJE» (pág. 83), que entraba en la nota 13 y se retiró.

**Correcciones registradas:**
- la nota 8 (D.124-95) continúa al pie de la pág. 74 sin número, antes de las notas 9 y 10; su continuación («No deberán efectuar ningún pago quienes se encuentren comprendidos en los rangos de excepciones del Artículo 76 reformado…») caía dentro del art. 76 a mitad de frase y se devolvió a la nota 8;
- tres llamadas impresas dentro del paréntesis de la marca («(Interpretado⁷)», ⁱ¹, ¹³) se sacaron del paréntesis;
- la coma que seguía a una marca al inicio del art. 76 («(Según reforma por Decreto 124-95), el Impuesto…») se retiró;
- art. 127: la edición encierra todo el texto derogado en un paréntesis que contiene «(1993)»; se separó la marca;
- art. 44: la edición no imprime punto final («…cumplimiento de dichas disposiciones»).

## 2. Situación actual en producción (solo lectura, 2026-11-25)

**No hay legacy** de esta ley: ningún `norm_id`, prefijo de id ni fuente la identifica. No hay filas que ocultar.

## 3. Conteo y clasificación propuesta

| Concepto | Filas |
|---|---:|
| Artículos 1–129 más 33 bis (12-A, 16-A, 16-B, 20-A a 20-G, 31-A a 31-C, 32-A, 32-B, 37-A, 59-A a 59-G, 67-A a 67-C, 99-A, 122-A a 122-D, 125-A, 127-A) | 162 |
| **PRIMARY** | **159** |
| **CONTEXT derogados** | **3** |

Los tres derogados:
- **art. 31-B:** la edición lo reduce a «(Derogado Según artículo 5 del Decreto 143-2009)»;
- **art. 81** (Impuesto de Tradición de Bienes Inmuebles): «(Derogado según Decreto 48-91)», con título de margen «DEROGADO»; la edición conserva el texto, que queda como antecedente;
- **art. 127:** «(Derogado por Decreto 48-91. …)», mismo caso; texto conservado como antecedente.

Para 81 y 127 la marca no nombra el artículo y el constructor la habría tomado por derogación parcial: la clasificación se fija por dictamen del adaptador (ver D5).

**Constancias:** 111 en 94 artículos (58 de reforma, 33 de adición, 6 de interpretación auténtica, 3 de derogación total, 1 de derogación parcial —nota 16, un párrafo del art. 118— y 10 de referencia). De ellas, 95 vienen de marcas en línea y 16 de notas al pie.

**Derogaciones de numerales impresas en el texto** (sin marca ni nota): p. ej. el numeral 17) del art. 25 dice «Derogado.»; se conservan tal como los imprime la edición, dentro de un artículo PRIMARY.

**`materia`:** `10_LEYES_REGLAMENTOS` (ver D5).

## 4. Notas al pie con disposiciones de otros decretos

Varias notas transcriben artículos de los decretos de reforma que no se integraron al texto de la ley («Según Decreto 143-2009 se estableció lo siguiente: Artículo 4.- …»; D.133-96, D.124-95, D.171-98, D.125-2000). Quedan como **constancias** de los artículos donde cae su llamada, no como artículos de la ley. Las notas 1 y 10 remiten a la Ley Electoral; la 5, a la Ley del Tribunal Superior de Cuentas.

## 5. Reservas

1. **Corte de la edición: 2009–2011.** Integra reformas hasta el D.143-2009. Las reformas posteriores de la Ley de Municipalidades no se encontraron en las carpetas locales y quedan para revisión incremental.
2. **Cotejo con La Gaceta.** La edición AMHON no es la oficial; los decretos de reforma sueltos de la carpeta (124-95, 133-96, 125-2000, 200-2005, 143-2009 e interpretación del art. 91) son escaneos y servirían para un cotejo con OCR.
3. **Nota 2.** La edición advierte que el D.127-2000 adicionó el art. 32-B pero lo redactó como «33-B»; se mantiene como 32-B, igual que la edición.

## 6. Decisiones D1–D8 para firma

| # | Decisión propuesta | Decisión del CLO |
|---|---|---|
| D1 | Fuente PRIMARY: edición AMHON 2011 (reformas hasta el D.143-2009), solo el articulado de la ley, con las reservas 5.1 y 5.2 | ☑ **Aprobada** por el CLO (2026-11-26) |
| D2 | Aceptar la extracción por coordenadas, las marcas en línea como constancias y las correcciones de §1 | ☑ **Aprobada** por el CLO (2026-11-26) |
| D3 | Firma del texto consolidado de 162 artículos (huella en §7) | ☑ **Aprobada** por el CLO (2026-11-26) |
| D4 | Vigencia: 159 `true` y 3 `false` (31-B, 81 y 127) | ☑ **Aprobada** por el CLO (2026-11-26) |
| D5 | Clasificar 81 y 127 como CONTEXT derogados con texto conservado (D.48-91); materia `10_LEYES_REGLAMENTOS` | ☑ **Aprobada** por el CLO (2026-11-25), junto con las reservas de §5 |
| D6 | Constancias por fila (111; ver `constancias.csv`), incluidas las disposiciones de decretos de reforma transcritas en notas (§4) | ☑ **Aprobada** por el CLO (2026-11-26) |
| D7 | Sin legacy que ocultar; el Reglamento General queda fuera, como `OLA13_RLMUN` | ☑ **Aprobada** por el CLO (2026-11-26) |
| D8 | Autorizar V4 en staging y V5 en producción, exactamente para los SQL y huellas de §7 | ☑ **Aprobada** por el CLO (2026-11-26) |

*Aprobación parcial (2026-11-25).* El CLO aprobó D5 y las reservas documentadas, y autorizó los pasos S1–S3 en staging. D1–D4 y D6–D8 quedan para la firma, después de la auditoría de staging (§9).

Firma: **Abg. y Not. Fredy Omar Pinel Flores** (CLO / Director Maya Lex) · Fecha: **2026-11-26** · *Registrada por Claude Code por orden expresa del CLO, tras aprobar la auditoría de staging (§9).*

## 7. Paquete SQL y huellas (lo que autoriza D8)

Los archivos se generan en `out/ola13-lmun/` (directorio ignorado por git), de forma reproducible con `npx tsx scripts/olas/ola13-lmun.ts`. Se comprobó que dos corridas seguidas dan los mismos bytes.

**Huellas del expediente:**
- texto consolidado: `7aec21172922b29aa13d3c61c50a021b995bb6d28bcd5a02b3f8a482eb534d37`;
- PDF fuente: `b711caf62cc5996650e18a4294ed761501b7a9066060dc9555ff34234ec181ee`;
- `manifiesto_articulos.json`: `ee6d32a6edacc92a92828b4aebac9ca87b0dfc66546748f99e8100d0b3253a07`;
- `constancias.csv`: `d99f87a6f01d58bda99a8ce3c74cfaa72ee48bec57210e947fcf7a910fb987ea`.

| Paso | Archivo | Bytes | SHA-256 | Firma |
|---:|---|---:|---|---|
| S1 | `staging/01_insert_staging.sql` | 340,826 | `b38f70460d6b7bfa486b9022c5caa5f2256b4859e149c733537fe89423151e3c` | No (filas ocultas) |
| S2 | `staging/02_embeddings_staging.sql` | 622,291 | `0b7552bf607f8cc48cfa316ba36ccfc8dff2ab58bc7ae9391d01356b3c847466` | No |
| S3 | `staging/03_verificacion_staging.sql` | 1,659 | `8b896583835148e070e354df56609dbaf7eb3782a768bc79b1b79bb5c216a433` | No (solo lectura) |
| S4 | `staging/04_visibilidad_v4_staging.sql` | 14,208 | `ede90702046ed5359a7ba114bef43ae9d81d8b0e248af36dbcbf639b62baf5fb` | **Sí** |
| P0 | `prod/00_precheck_y_respaldo_prod.sql` | 1,477 | `2761d6092531654933840d2b1331e5ede14faf6406f2c52d2dd4a9ca4d83447e` | **Sí** |
| P1 | `prod/01_datos_prod.sql` | 346,776 | `c09ce5a459bea8185a0a06730c84dc03963917239c27f22a44758b598e50c1b9` | **Sí** |
| P2 | `prod/02_embeddings_prod.sql` | 632,730 | `f65a1cc0069db64e839eb21f1b2b0a996db3523a6b95190acff57cf01e51b4e4` | **Sí** |
| P3 | `prod/03_activacion_v5_prod.sql` | 14,799 | `cc4d63233b1ff82577a7fd4b6da86ba053957370a94dc3bf7cdac099c5131694` | **Sí** |
| R | `prod/99_reversion_prod.sql` | 473 | `f1cdb3d1edd2d5d68adce1690bd4ac18bb0c6cfb39915d41689a0962d449972d` | Solo por orden del CLO; el `.ps1` no lo ejecuta |

**Ensayo en base desechable (2026-11-25).** Se corrió el paquete completo en PGlite (Postgres con pgvector): esquema real de 18 columnas, roles `anon`/`authenticated`/`service_role` y una fila V5 ajena.
- **Staging:** S1 y S2 son reaplicables. S3 verifica todas las huellas SHA-256. La repetición de S4 falla cerrada.
- **Producción, antes de activar:** P3 se niega antes de P1/P2. P0 crea el respaldo (vacío: no hay legacy) **con RLS y sin privilegios para `anon`/`authenticated`**, y no sobrescribe un respaldo existente.
- **Activación y reversión:** P3 activa 162 filas V5 (159 PRIMARY, 3 CONTEXT derogados). R elimina el lote y deja intacta la fila ajena.

## 8. Ejecución tras la firma

```powershell
pwsh -File out\ola13-lmun\ejecutar_staging.ps1 -DesdePaso 1 -HastaPaso 3
pwsh -File out\ola13-lmun\ejecutar_staging.ps1 -DesdePaso 4 -HastaPaso 4
pwsh -File out\ola13-lmun\ejecutar_prod.ps1
```

Después de S3, Claude Code verifica staging en solo lectura antes de S4; después de P3, verifica producción en solo lectura.

## 9. Auditoría de staging (pasos S1–S3)

**Lectura de verificación (2026-11-26, solo lectura, staging `aicakncgtuiiuomflkqj`), después de que el CLO corriera `ejecutar_staging.ps1 -DesdePaso 1 -HastaPaso 3` (162 filas cargadas ocultas). Resultado: conforme.**

| Control | Esperado | Observado | |
|---|---|---|---|
| Huellas SHA-256 en disco de S1–S4, P0–P3 y R | §7 | 9 de 9 idénticas | ✔ |
| Filas del lote `OLA13_LMUN_2009_01` | 162 | 162 (162 `id` y 162 `num_articulo_norm` distintos) | ✔ |
| Ocultas (`revision_pendiente = true`) | 162 | 162; **0** filas de la OLA 13 visibles | ✔ |
| `es_norma_vigente` | `NULL` hasta V4 | 162 `NULL` | ✔ |
| `sha256(contenido) = hash_contenido = metadata.article_sha256` | 162 | 162 | ✔ |
| Huella del lote (md5 de `id\|hash_contenido`, orden C) frente a `rows.jsonl` | `6b262be4fb3f87aa4454527faacb912a` | idéntica | ✔ |
| Embeddings | 162 de 384D | 162 de 384D; las sumas de control de la 1.ª y la 384.ª componente (9.1460 y 10.3079) coinciden con S2 | ✔ |
| `instrumento_id` / `norm_id` / jurisdicción / colección / materia | únicos | `LEY_MUNICIPALIDADES` / `HN:LEY_MUNICIPALIDADES` / `HN` / `mayalex_normativos` / `10_LEYES_REGLAMENTOS` (D5) | ✔ |
| Clasificación propuesta | 159 VIGENTE; 3 CONTEXT derogados (31-B, 81, 127) | 159; CONTEXT exactamente en 31-B, 81 y 127 (D4/D5); sin `estado_v` ni `rol` todavía (los asigna S4) | ✔ |
| Constancias en `metadata` | 111 | 111 | ✔ |
| Legacy u otras filas del mismo instrumento o `norm_id` | 0 | 0; el Reglamento (`OLA13_RLMUN`) no está cargado | ✔ |
| Las RPC no exponen el lote oculto | 0 | `buscar_biblioteca_v3`: 0 filas de la OLA 13 | ✔ |

Contexto de staging: 728 filas en total = 410 visibles + 318 ocultas, que son exactamente las 162 de este lote y las 156 de `OLA13_LPA_2014_01`.

**Precondición de S4:** se cumple (162 filas ocultas, vigencia `NULL`, con embedding y huella correcta). El lote queda apto para la firma D1–D8 y el paso S4.

## 10. Verificación de V4 en staging (paso S4)

**Lectura de verificación (2026-11-26, solo lectura, staging `aicakncgtuiiuomflkqj`), después de que el CLO corriera S4 tras la firma D1–D8. Resultado: conforme.**

- **Visibilidad y clasificación:** 162 de 162 filas visibles y en `V4`; 159 PRIMARY vigentes (`TRUE_PRESUNTA`) y 3 CONTEXT derogados (`DEROGADO`), exactamente 31-B, 81 y 127 (D4/D5); 0 derogados PRIMARY y 0 con vigencia `NULL`; `clasificacion_propuesta` retirada; `adjudicacion` = D1–D8 en las 162.
- **Huellas:** `sha256(contenido) = hash_contenido = article_sha256` en 162 de 162. La huella del lote (`6b262be4…`) y las sumas de control de los embeddings (9.1460 / 10.3079) no cambiaron desde S3. Las 111 constancias siguen intactas.
- **RPC sincronizadas:**
  - `buscar_biblioteca_v3` devuelve los arts. 25 y 81 como primer resultado de su propio embedding (similitud 1.0000);
  - con `solo_norma_vigente = true` excluye 31-B, 81 y 127, y sin ese filtro devuelve el 81;
  - `resolver_articulo_exacto` resuelve 127 (`es_norma_vigente = false`) y 32-B (vigente).
- **Producción, solo lectura antes de P0:** 0 filas del lote, del instrumento o del `norm_id`; no existe el respaldo `biblioteca_vectores_ola13_lmun_2009_01_backup`. Línea base: 91,619 filas, 12,387 visibles y 7,415 V5.

## 11. Cierre: verificación en producción (pasos P0–P3)

**Lectura de verificación (2026-11-26, solo lectura, producción `thgrhueckkjdutjvcufp`), después de que el CLO corriera R1 y `ejecutar_prod.ps1 -DesdePaso 0 -HastaPaso 3`. Resultado: conforme. Lote cerrado en V5.**

- **Lote:** 162 de 162 filas visibles y en `V5`; 159 PRIMARY vigentes (`TRUE_PRESUNTA`) y 3 CONTEXT derogados (`DEROGADO`), exactamente 31-B, 81 y 127; 0 derogados PRIMARY y 0 con vigencia `NULL`; 162 `num_articulo_norm` distintos; materia `10_LEYES_REGLAMENTOS`.
- **Huellas:** `sha256(contenido) = hash_contenido = article_sha256` en 162 de 162. La huella del lote (`6b262be4fb3f87aa4454527faacb912a`) y las sumas de control de los embeddings (9.1460 / 10.3079) son idénticas a las de staging. 111 constancias.
- **Respaldo P0:** `biblioteca_vectores_ola13_lmun_2009_01_backup` tiene 0 filas (no había legacy) y RLS activo. Su ACL es `{postgres=arwdDxtm/postgres,service_role=Dxtm/postgres}`: ningún privilegio para `anon` ni `authenticated`.
- **RPC:**
  - `buscar_biblioteca_v3` devuelve los arts. 25 y 81 como primer resultado de su propio embedding (similitud 1.0000);
  - con `solo_norma_vigente = true` excluye 31-B, 81 y 127, y sin ese filtro devuelve el 81;
  - `resolver_articulo_exacto` resuelve el 127 (`es_norma_vigente = false`) y el 32-B (vigente).
- **Totales de producción:** 91,937 filas, 12,705 visibles y 7,733 V5, contando los dos lotes de la OLA 13.
- **Reversión:** no se ejecutó. `prod/99_reversion_prod.sql` (`f1cdb3d1…`) queda disponible solo por orden del CLO.
