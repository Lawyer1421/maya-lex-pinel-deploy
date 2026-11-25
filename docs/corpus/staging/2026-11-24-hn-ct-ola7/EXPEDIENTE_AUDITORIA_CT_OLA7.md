# Expediente de auditoría · OLA 7 · `HN:CODIGO_TRABAJO`

**Estado:** D1–D8 FIRMADAS (2026-11-24, Abg. y Not. Fredy Omar Pinel Flores, CLO)
**Instrumento:** Código del Trabajo de Honduras (Decreto No. 189 de 1959) · lote `OLA7_CT_2023_01`
**Fecha del paquete:** 2026-11-24 · **Generador:** `scripts/olas/ola7-ct.ts` + `scripts/olas/cedij.ts` + `scripts/olas/paquete-ola.ts`
**Staging:** `mayalexhn-staging` (`aicakncgtuiiuomflkqj`) · **Producción:** `thgrhueckkjdutjvcufp`

> **Cómo se firma.** El CLO revisa §2–§6 y decide D1–D8 en §7. Para firmar, sustituye en la línea **Estado** el texto `PENDIENTE DE FIRMA` por la fórmula de firma (D1–D8 y la palabra FIRMADAS) y completa el bloque de firma de §7. El ejecutor (`scripts/olas/ejecutar-sql.ts`) lee la firma solo en esa línea **Estado** y se niega a correr la visibilidad V4 en staging y cualquier paso de producción si este archivo no está firmado o no cita la huella SHA-256 exacta de cada SQL (§8). Si el CLO modifica una decisión, hay que regenerar el paquete: cambian las huellas y este pliego debe volver a citarlas.

## 1. Fuente

| Pieza | Archivo · SHA-256 | Uso |
|---|---|---|
| **Edición consolidada del CEDIJ** «Codigo del Trabajo (mayo 2018).pdf» | 2,658,799 bytes, 271 págs., Word 2019, generado el 23-oct-2023 · `75265ef93f52cbf3486ed00a7e9cec3a65a851d34162ac9e4a66720aee4d08bf` | Texto base. Trae **53 notas al pie** con reformas, interpretaciones auténticas, derogaciones y referencias |
| «Código del trabajo y sus reformas.pdf» (Acrobat, 2003) | 555,154 bytes, 193 págs. · `541b53a31f4f268ad712a9dea7ce6677c14644e267cd928478c4cb584c6dcbea` | **No se usa.** Es la edición de 2003 de la que sale el legacy actual |

**Extracción.** Usa el mismo procedimiento que las OLAS 5 y 6 (`scripts/olas/cedij.ts`). Esta edición tiene particularidades que el script resuelve y prueba:
- llamadas desordenadas: la nota 8, que anota los arts. 32 y 34, se llama antes que la 7;
- llamadas separadas por espacio («Derogado 6», «religiosas; 18») o solas en su línea («26»);
- encabezados con punto («Artículo. 527.», «Artículo. 529.»);
- notas que nombran varios artículos («Artículos 128, 129 y 131 Derogados…»): la constancia se liga a cada artículo nombrado.

**Huellas de reproducción:**
- texto consolidado (concatenación «número⏎contenido» de las 877 filas): `984657d97b74444facb7b999d198d94907a00b999fbd9a067d8e7c825dc0c1cc`;
- [`manifiesto_articulos.json`](manifiesto_articulos.json) y [`constancias.csv`](constancias.csv): huellas en §8.

## 2. Situación actual en producción (solo lectura, 2026-11-24)

Producción tiene **870 filas legacy**:
- `metadata.norm_id = 'HN_CODIGO_TRABAJO'`, ids `v2trabajo:mayalex_normativos:<n>`;
- todas `es_norma_vigente = true` y visibles.

Salen de la **edición de 2003**: 185 filas arrastran marcas «-- N of 193 --».

| Hallazgo en las filas legacy | Filas |
|---|---:|
| Figuran **vigentes pero están derogadas** según la edición (31, 33, 128, 129, 131, 133, 173, 174, 188 y 190 por el D.73-96; 464 por el D.278-2013) | **11** |
| **Faltan**: 60-A y 120-A (adicionados), 117, 406, 476, 657 y 722 | **7** |
| Llevan marcas de página «-- N of 193 --» | 185 |
| Art. 118 vacío (`estado_articulo = SIN_CONTENIDO_VIGENTE`) | 1 |
| Texto idéntico a la edición 2023 | 251 |
| Similitud ≥ 0.95 | 464 |
| Similitud < 0.90: reformas posteriores a 2003, derogados y residuos | 175 |

## 3. Conteo y clasificación propuesta

| Concepto | Filas |
|---|---:|
| Artículos 1–875 más 60-A y 120-A | 877 |
| **PRIMARY** elegibles | **863** |
| **CONTEXT vigentes** por reforma tácita anotada (arts. **35**, **383** y **548**), mismo criterio de la OLA 1 | **3** |
| **CONTEXT derogados**: 10 por el D.73-96 (Código de la Niñez) y 1 por el D.278-2013 | **11** |

**Constancias:**
- 22 de reforma y 1 de adición (120-A, D.150-2008);
- **12 interpretaciones auténticas**, que se conservan en `metadata.constancias` con el texto de la interpretación: arts. 4, 17, 104, 105, 113, 123, 272, 273, 322, 325, 339 y 344;
- 11 de derogación y 1 de derogación parcial (art. 95, numeral 16, D.255-2002);
- 3 de reforma tácita;
- 9 referencias: remisiones al Código de la Niñez, a la Constitución y al Código de Procedimientos Civiles, y una fe de erratas de La Gaceta en el art. 277.

## 4. Integridad y saneamiento

El script aborta ante cualquiera de estas condiciones:
- encabezado residual, caracteres de control o mojibake;
- cabecera, folio o marca de página;
- espaciado anómalo;
- un artículo vigente sin puntuación de cierre.

Hay 9 artículos que terminan sin punto en el PDF y quedan como excepción verificada: 32 («Párrafo tercero Derogado»), 45, 353, 454 (tabla de valuación de incapacidades), 492, 500, 784, 791 y 874 (lista de decretos derogados).

## 5. Reformas tácitas (D5)

| Art. | Nota de la edición |
|---|---|
| 35 | Reformado tácitamente al derogarse el art. 33 por el Código de la Niñez y la Adolescencia (D.73-96) |
| 383 | Reformado tácitamente por el Decreto No. 103, Ley del Salario Mínimo (Gaceta 20,390) |
| 548 | Reformado tácitamente por el D.268-2002, Ley Orgánica del Tribunal Superior de Cuentas |

El texto no incorpora esas reformas. Se proponen CONTEXT vigentes hasta su dictamen, como el art. 227 en la OLA 1.

## 6. Reservas que el CLO debe conocer

1. **Cotejo con La Gaceta.** Las reformas, interpretaciones y derogaciones se toman de las notas de la edición CEDIJ, sin cotejo con La Gaceta. Van de 1960 a 2013: D.275-1960, D.96-1961, D.462-1977, D.32-2003, D.150-2008, D.278-2013, entre otros. La edición está cortada a octubre de 2023, y las reformas posteriores quedan para revisión incremental.
2. **Parte procesal.** Los arts. 665 a 874 remiten al «Código de Procedimientos», sustituido por el Código Procesal Civil, cuyo art. 931 entiende hechas a él esas remisiones. La edición lo anota en algunos artículos («Véase Nuevo Código Procesal Civil»). En el art. 784 esa anotación está dentro del texto, tal como la imprime la edición.
3. **Art. 118.** El legacy lo tiene vacío. La edición trae su texto, que entra como PRIMARY.

## 7. Decisiones D1–D8 para firma

| # | Decisión propuesta | Decisión del CLO |
|---|---|---|
| D1 | Fuente PRIMARY: edición CEDIJ (23-oct-2023), con las reservas 6.1 y 6.2; no se usa la edición de 2003 del legacy | ☑ **Aprueba**: edición CEDIJ (23-oct-2023); 863 PRIMARY, 3 CONTEXT vigentes y 11 CONTEXT derogados |
| D2 | Aceptar la extracción y el saneamiento de §1 y §4 (53 notas resueltas y cruzadas, 9 excepciones sin cierre) | ☑ Aprueba |
| D3 | Firma del texto consolidado de 877 artículos tal como figura en `manifiesto_articulos.json` (huella del texto en §1) | ☑ Firma |
| D4 | Vigencia: 866 `true` y 11 `false`; corrige las 11 derogaciones que el legacy muestra vigentes e incorpora los 7 artículos ausentes | ☑ Aprueba |
| D5 | Arts. 35, 383 y 548 (reforma tácita): CONTEXT vigentes hasta dictamen; o PRIMARY por dictamen | ☑ **Aprueba**: arts. 35, 383 y 548 como CONTEXT vigentes por reforma tácita |
| D6 | Constancias por fila en `metadata.constancias`, incluidas las 12 interpretaciones auténticas (ver `constancias.csv`) | ☑ **Aprueba**, incluidas las 12 interpretaciones auténticas como constancias |
| D7 | Al activar V5, ocultar (sin borrar) las 870 filas legacy `v2trabajo:mayalex_normativos:*`, con respaldo previo y reversión 99 | ☑ Aprueba |
| D8 | Autorizar V4 en staging y V5 en producción, exactamente para los SQL y huellas de §8, mediante `ejecutar_staging.ps1` y `ejecutar_prod.ps1` | ☑ Autoriza |

Firma: **aprobado** · Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex) · Fecha: 2026-11-24

*Registro de la firma.* El CLO comunicó en la sesión de trabajo del 2026-11-24 la aprobación de D1–D8, con determinación expresa sobre D1, D5 y D6 (interpretaciones auténticas); Claude Code la transcribió aquí por su instrucción. El paquete no se regeneró: la firma cubre exactamente las huellas de §8.

## 8. Paquete SQL y huellas (lo que autoriza D8)

Los archivos se generan en `out/ola7-ct/` (directorio ignorado por git), de forma reproducible con `npx tsx scripts/olas/ola7-ct.ts`. Huellas del expediente: `manifiesto_articulos.json` `7a77643c8ac5e0a7084436cd572308fb1f6064dc31c7ebdb8d2483d9fdbcfad9`; `constancias.csv` `f21a777a34bf04f3f0f5cf05437734fac3e3f97872a7ab220bd144f33a36d7a7`.

| Paso | Archivo | Bytes | SHA-256 | Firma |
|---:|---|---:|---|---|
| S1 | `staging/01_insert_staging.sql` | 1,581,412 | `a35bd983a9c8bf90c46ea48d3425e6376a2c9f21bf2ec1d979d72e348c5b082a` | No (filas ocultas) |
| S2 | `staging/02_embeddings_staging.sql` | 3,354,551 | `189942b7b8c1e32aa35ac046677238acf41d24150c82dafb2838b2708f5da36f` | No |
| S3 | `staging/03_verificacion_staging.sql` | 1,631 | `5b61d4398a41720407ee7c091c68e377efe30565cb912aecc44964f6276cc5c5` | No (solo lectura) |
| S4 | `staging/04_visibilidad_v4_staging.sql` | 40,363 | `bc80b8a4e56b3e95d27613a63e5085497d73523e5f0a69d09bb048b39e7a4d17` | **Sí** |
| P0 | `prod/00_precheck_y_respaldo_prod.sql` | 1,623 | `59439b98e68b70af6f8389251ae357c99cb0940dfdc6df4fad3e68467539ae09` | **Sí** |
| P1 | `prod/01_datos_prod.sql` | 1,612,384 | `9d09e5242c6249fb1845268b7360d9b333ec56b99cfccdeb67aabc8f338ba4e9` | **Sí** |
| P2 | `prod/02_embeddings_prod.sql` | 3,410,750 | `2d7e8847fd7780821f880f4b67310be0dbbab9a98d8858f6979cb9734e5ac8c2` | **Sí** |
| P3 | `prod/03_activacion_v5_prod.sql` | 41,674 | `505647ca43b83768e9a7bec740a84cb720a1d717dff415720bece74fbd842a55` | **Sí** |
| R | `prod/99_reversion_prod.sql` | 784 | `f0032530daa30d08016d015a55552a5bf4fc4fe16eaf2118291c3015a37714f7` | Solo por orden del CLO; el `.ps1` no lo ejecuta |

**Ensayo en base desechable (2026-11-24).** Se corrió el paquete completo en Postgres 17 con pgvector (PGlite): esquema real de 18 columnas, 870 filas legacy simuladas y una fila V5 ajena.
- **Staging:** S1 y S2 son reaplicables. S3 da 877/877 SHA-256. S4 deja 863 PRIMARY, 14 CONTEXT y 11 derogados en V4, y su repetición falla cerrada.
- **Producción, antes de activar:** P3 se niega antes de P1/P2. P0 respalda 870 filas y no sobrescribe un respaldo existente. P1 y P2 son reaplicables.
- **Activación y reversión:** P3 activa 877 filas V5 (863 PRIMARY, 3 CONTEXT vigentes, 11 CONTEXT derogados) y oculta exactamente las 870 legacy sin tocar la fila ajena. R restaura las 870 legacy y elimina el lote.

## 9. Ejecución tras la firma

```powershell
pwsh -File out\ola7-ct\ejecutar_staging.ps1 -DesdePaso 1 -HastaPaso 3
pwsh -File out\ola7-ct\ejecutar_staging.ps1 -DesdePaso 4 -HastaPaso 4
pwsh -File out\ola7-ct\ejecutar_prod.ps1
```

Las salvaguardas son las de las olas anteriores:
- el project ref y la frase se teclean;
- `DATABASE_URL` se pide oculta y se borra en `finally`;
- se verifican la URL, las huellas y la firma (solo en la línea **Estado**);
- identidad de la base: producción debe tener los 360 V5 del 2026-11-21.
