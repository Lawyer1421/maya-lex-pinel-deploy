# Expediente de auditoría · OLA 11 · `HN:LEY_ADOPCIONES`

**Estado:** D1–D8 FIRMADAS (2026-11-24, Abg. y Not. Fredy Omar Pinel Flores, CLO)
**Instrumento:** Ley Especial de Adopciones de Honduras (Decreto No. 102-2018, La Gaceta No. 34,841 del 10-ene-2019) · lote `OLA11_ADOP_2019_01`
**Fecha del paquete:** 2026-11-24 · **Generador:** `scripts/olas/ola11-adop.ts` + `scripts/olas/cedij.ts` + `scripts/olas/paquete-ola.ts`
**Staging:** `mayalexhn-staging` (`aicakncgtuiiuomflkqj`) · **Producción:** `thgrhueckkjdutjvcufp`

> **Cómo se firma.** El CLO revisa las secciones 1 a 5 y decide D1–D8 en §6. Para firmar, sustituye en la línea **Estado** el texto `PENDIENTE DE FIRMA` por la fórmula de firma (D1–D8 y la palabra FIRMADAS) y completa el bloque de firma. El ejecutor (`scripts/olas/ejecutar-sql.ts`) lee la firma solo en esa línea **Estado** y se niega a correr la visibilidad V4 en staging y cualquier paso de producción si este archivo no está firmado o no cita la huella SHA-256 exacta de cada SQL (§7). Si el CLO modifica una decisión, hay que regenerar el paquete y volver a citar las huellas.

## 1. Fuente

| Pieza | Archivo · SHA-256 | Uso |
|---|---|---|
| Edición oficial de la **DINAF** «Ley-Especial-de-Adopciones-DINAF.pdf» (`SISTEMA_LEGAL_PRINCIPAL/…/Biblioteca_Personal/`), primera edición, agosto de 2019 | 987,569 bytes, 68 págs. · `add2e69ef751b9344004ed6c3316cf04216a44002a483c140df0f775fdecd4a3` | Texto íntegro del D.102-2018, arts. 1–64, sin notas al pie |

El PDF indicado en el inventario (`S26/Ley_de_Adopcion_Honduras.pdf`, en el teléfono) es un marcador de nube ilegible.

**Número de La Gaceta.** La propia edición de la DINAF dice «Publicado en el Diario Oficial La Gaceta núm. **34,841** del 10 [de enero de 2019]». Coincide con la edición CEDIJ del Código de Familia y con el registro del corpus. La resolución del CLO de la OLA 5 citaba 34,820.

**Extracción.** `scripts/olas/cedij.ts`, ajustado a la maquetación de libro de la DINAF:
- se retiran las cabeceras de página («DINAF | 7», «10 | Ley Especial de Adopciones»);
- los rótulos «Capítulo III …» y «Sección I …» pasan a `ubicacion`;
- se unen las palabras partidas con guion al final de línea, en 55 artículos;
- se reune «(DINAF).» con su línea en el art. 58.

El art. 10 termina sin punto en el original.

## 2. Situación actual en producción (solo lectura, 2026-11-24)

**64 filas legacy** `mayalex_normativos:adopciones_2018_a1…a64`, `norm_id = HN_LEY_ESPECIAL_ADOPCIONES`, `verificado = false`. Salen de la **misma edición de la DINAF** (`scripts/ingesta-d102-2018.ts`).

| Comparación | Artículos |
|---|---:|
| Coinciden en número | 64/64 |
| Coinciden en vigencia | 64/64 |
| Similitud ≥ 0.95 (difieren en saltos de línea, guiones y el encabezado «Artículo N.-» dentro del texto) | 63 |
| Similitud 0.889: art. 58, por la línea «(DINAF).» | 1 |

## 3. Conteo y clasificación propuesta

64 artículos, **64 PRIMARY**. No hay notas de reforma.

## 4. Art. 63 y cierre de la revisión D5 de la OLA 5

El art. 63 deroga del Código de Familia («Decreto No. 75-84» en la edición, por el 76-84):
- **(a)** «El Título IV. De la Adopción, con sus correspondientes Capítulos: Capítulo I. De las Disposiciones Generales; y, el Capítulo VI. Del Procedimiento de Adopción»;
- **(b)** una lista de 55 artículos, de 119-B a 184.

Los cuatro artículos que el CLO dejó en CONTEXT vigente en la OLA 5 no están en la lista (b). Su capítulo resulta de la estructura de la edición CEDIJ del Código de Familia:

| Art. | Capítulo del Título IV | Efecto del art. 63 | Propuesta |
|---|---|---|---|
| 122-A | I (Disposiciones Generales, arts. 120–144) | Derogado por (a), Capítulo I | **Derogado** |
| 135 | I | Derogado por (a), Capítulo I | **Derogado** |
| 175-A | VI (Procedimiento de Adopción, arts. 173–180) | Derogado por (a), Capítulo VI | **Derogado** |
| 165 | IV (Efectos comunes de la adopción plena, arts. 160–168) | No consta ni en (a) ni en (b) | Depende de la lectura de (a) |

Para el art. 165 hay dos lecturas de (a):
- si deroga solo los capítulos I y VI, el 165 subsiste;
- si deroga el Título IV entero, el 165 está derogado.

Adoptar esta propuesta exige **regenerar la OLA 5**, que ya está firmada, y firmarla de nuevo. Mientras tanto, los cuatro artículos siguen en CONTEXT, de modo que ninguno se presenta como derecho vigente PRIMARY.

## 5. Reservas

1. La fuente es la edición oficial de la DINAF, no un ejemplar de La Gaceta 34,841, que queda pendiente de cotejo.
2. Es la misma fuente del legacy, así que la mejora es de saneamiento y metadatos, no de contenido.

## 6. Decisiones D1–D8 para firma

| # | Decisión propuesta | Decisión del CLO |
|---|---|---|
| D1 | Fuente PRIMARY: edición oficial de la DINAF (2019), con la reserva 5.1 | ☑ Aprueba |
| D2 | Aceptar la extracción y el saneamiento de §1 | ☑ Aprueba |
| D3 | Firma del texto consolidado de 64 artículos (huella en §7) | ☑ Firma |
| D4 | Vigencia: 64 `true` | ☑ **Aprueba**: 64 PRIMARY (La Gaceta 34,841) |
| D5 | Resolver la revisión D5 de la OLA 5 con el art. 63 (§4): 122-A, 135 y 175-A derogados; 165 según la lectura que adopte el CLO. Exige regenerar y volver a firmar la OLA 5 | ☑ **Resuelto** en la OLA 5 (segunda firma): 122-A, 135 y 175-A derogados; 165 CONTEXT vigente |
| D6 | Constancias y metadatos por fila (ver `constancias.csv`) | ☑ Aprueba |
| D7 | Al activar V5, ocultar (sin borrar) las 64 filas legacy `mayalex_normativos:adopciones_2018_a*`, con respaldo previo y reversión 99 | ☑ Aprueba |
| D8 | Autorizar V4 en staging y V5 en producción, exactamente para los SQL y huellas de §7 | ☑ Autoriza |

Firma: **aprobado** · Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex) · Fecha: 2026-11-24

*Registro de la firma.* El CLO comunicó en la sesión de trabajo del 2026-11-24 la aprobación de D1–D8, con determinación expresa sobre D4 (64 PRIMARY, Gaceta 34,841); el D5 quedó resuelto en la OLA 5; Claude Code la transcribió aquí por su instrucción. El paquete no se regeneró después: la firma cubre exactamente las huellas de los SQL citadas en este pliego.

## 7. Paquete SQL y huellas (lo que autoriza D8)

Los archivos se generan en `out/ola11-adop/` (directorio ignorado por git), de forma reproducible con `npx tsx scripts/olas/ola11-adop.ts`.

**Huellas del expediente:**
- texto consolidado: `079e3d594ba3a50aeedbf702e0c20031bf5691ad7ca728cfd07bf3e7c4be9899`;
- `manifiesto_articulos.json`: `21a0fcc9196f7280fe4daceab0f8c53767851ac1e89e9986e391b0b2c1751672`;
- `constancias.csv`: `8f9c669286ebb0f5e25f1f8d2736f94e3d2062d4bf54c857f0ebbdfa0e2dc5c6`.

| Paso | Archivo | Bytes | SHA-256 | Firma |
|---:|---|---:|---|---|
| S1 | `staging/01_insert_staging.sql` | 150,320 | `fddc2ce918c69ea00a828942b97f03506a1b1b79f86a626385ec41649db73324` | No (filas ocultas) |
| S2 | `staging/02_embeddings_staging.sql` | 245,995 | `5d4bb29c6158c2c9a76d37c28db2b63de768b2694f66bd173a95855ef5f0cba1` | No |
| S3 | `staging/03_verificacion_staging.sql` | 1,640 | `1e07e199de53db234c750e581a3a3f6c748967493b6f9a90245318da33357ece` | No (solo lectura) |
| S4 | `staging/04_visibilidad_v4_staging.sql` | 6,132 | `47383bfdc1f902680f7dc69f961e6bef34e90efd047aaedb4c1f4cf51261e349` | **Sí** |
| P0 | `prod/00_precheck_y_respaldo_prod.sql` | 1,559 | `d19695d2b69693b7673900744a83f2a216ad4824c3c9c7afa021a5e55ea1205f` | **Sí** |
| P1 | `prod/01_datos_prod.sql` | 152,840 | `d00d1fd4c3b8ed03c7eb3fec3bf84e401aeb3ff01bf91631a0a1af0d705a1314` | **Sí** |
| P2 | `prod/02_embeddings_prod.sql` | 250,163 | `2b8497df29f25d2658870f006a75008432d0bef144ab9aa1443f85af885e9282` | **Sí** |
| P3 | `prod/03_activacion_v5_prod.sql` | 6,998 | `1a613f7bd6ca55eb695d15bb8c3fb5685c65b639e4a98c534496d592a8a7b4fb` | **Sí** |
| R | `prod/99_reversion_prod.sql` | 752 | `d88d887fa11cd5031dd0008dbdf8d62b7d8917de43fcb7c43b4d1e9d3902ae8b` | Solo por orden del CLO; el `.ps1` no lo ejecuta |

**Ensayo en base desechable (2026-11-24).** Se corrió el paquete completo en Postgres 17 con pgvector (PGlite): esquema real de 18 columnas, 64 filas legacy simuladas y una fila V5 ajena.
- **Staging:** S1 y S2 son reaplicables. S3 verifica todas las huellas SHA-256. La repetición de S4 falla cerrada.
- **Producción, antes de activar:** P3 se niega antes de P1/P2. P0 respalda las 64 filas legacy y no sobrescribe un respaldo existente.
- **Activación y reversión:** P3 activa 64 filas V5 (64 PRIMARY) y oculta exactamente las 64 legacy sin tocar la fila ajena. R restaura las 64 legacy y elimina el lote.

## 8. Ejecución tras la firma

```powershell
pwsh -File out\ola11-adop\ejecutar_staging.ps1 -DesdePaso 1 -HastaPaso 3
pwsh -File out\ola11-adop\ejecutar_staging.ps1 -DesdePaso 4 -HastaPaso 4
pwsh -File out\ola11-adop\ejecutar_prod.ps1
```
