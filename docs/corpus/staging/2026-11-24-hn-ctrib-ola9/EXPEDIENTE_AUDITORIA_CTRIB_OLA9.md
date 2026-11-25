# Expediente de auditoría · OLA 9 · `HN:CODIGO_TRIBUTARIO`

**Estado:** D1–D8 FIRMADAS (2026-11-24, Abg. y Not. Fredy Omar Pinel Flores, CLO)
**Instrumento:** Código Tributario de Honduras (Decreto No. 170-2016) · lote `OLA9_CTRIB_2024_01`
**Fecha del paquete:** 2026-11-24 · **Generador:** `scripts/olas/ola9-ctrib.ts` + `scripts/olas/cedij.ts` + `scripts/olas/paquete-ola.ts`
**Staging:** `mayalexhn-staging` (`aicakncgtuiiuomflkqj`) · **Producción:** `thgrhueckkjdutjvcufp`

> **Cómo se firma.** El CLO revisa las secciones 1 a 5 y decide D1–D8 en §6. Para firmar, sustituye en la línea **Estado** el texto `PENDIENTE DE FIRMA` por la fórmula de firma (D1–D8 y la palabra FIRMADAS) y completa el bloque de firma. El ejecutor (`scripts/olas/ejecutar-sql.ts`) lee la firma solo en esa línea **Estado** y se niega a correr la visibilidad V4 en staging y cualquier paso de producción si este archivo no está firmado o no cita la huella SHA-256 exacta de cada SQL (§7). Si el CLO modifica una decisión, hay que regenerar el paquete y volver a citar las huellas.

## 1. Fuente

| Pieza | Archivo · SHA-256 | Uso |
|---|---|---|
| Edición consolidada «Codigo Tributario (2024).pdf» (`CODIGOS/`) | 954,806 bytes, 113 págs., Word 2019, generado el 2-sep-2024 · `f0afc853e49abca6aeb60217791abde434c203ad71d13b62b54389ea871911fc` | Texto base, arts. 1–215. Trae **24 notas al pie** |

Las 24 notas se reparten así:
- **16 fe de erratas**, publicadas en La Gaceta 34,347 y otras;
- **5 reformas del D.180-2020**: arts. 88 (numerales 3 a 5), 89, 90, 91 y 93;
- **1 adición del D.170-2019**: art. 70, inciso j);
- **2 notas con interpretación auténtica**: art. 167 (D.25-2017) y art. 213, reformado por el D.32-2017 e interpretado por el D.98-2018.

**Extracción.** `scripts/olas/cedij.ts`, que añade al procedimiento de las OLAS 5 a 7:
- encabezados en mayúsculas («ARTÍCULO N.-»);
- llamadas de nota entre espacios («FORMAS. 14 Las…»);
- un control que impide leer «14.- CÓMPUTO» como art. «14-C».

Además se corrige una errata: «CAPÍTULO ll» por «CAPÍTULO II».

## 2. Situación actual en producción (solo lectura, 2026-11-24)

**215 filas legacy** `mayalex_normativos:tributario_2016_a1…a215`, sin `norm_id`, todas vigentes y visibles. Su fuente declarada es el «Consolidado SAR corte 2019».

| Comparación con la edición 2024 | Artículos |
|---|---:|
| Coinciden en número | 215/215 |
| Coinciden en vigencia | 215/215 |
| Texto idéntico | 120 |
| Similitud ≥ 0.95 | 188 |
| Similitud < 0.90 | 11 |

Las 11 diferencias se explican así:
- **Reformados por el D.180-2020 después del corte del legacy:** arts. 88, 89, 90, 91 y 93. El legacy muestra el texto superado.
- **Otros:** arts. 167, 213, 215, 85, 28 y 42.

## 3. Conteo y clasificación propuesta

| Concepto | Filas |
|---|---:|
| Artículos 1–215 | 215 |
| **PRIMARY** | **214** |
| **CONTEXT vigente**: art. 167 (§4, D5) | **1** |

## 4. Art. 167 (D5)

La nota del art. 167 anota dos cosas:
- la **interpretación auténtica** del D.25-2017, que fija la multa del criterio de oportunidad y la conciliación por remisión al **art. 392-E del Código Penal de 1983**, derogado por el D.130-2017;
- la **derogación de su «último párrafo»** por el Código Penal de 2017 (La Gaceta 34,940, vigente desde el 10-may-2020).

La edición no indica si el texto impreso ya excluye ese párrafo. Se propone **CONTEXT vigente** hasta su dictamen, con constancia `REVISION_PENDIENTE_CLO`.

## 5. Reservas

1. Las fe de erratas y reformas se toman de las notas de la edición, sin cotejo con La Gaceta. Corte: septiembre de 2024.
2. El art. 213 lleva la reforma del D.32-2017 y la interpretación del D.98-2018, que remite también al D.129-2017. Se mantiene PRIMARY con su constancia.

## 6. Decisiones D1–D8 para firma

| # | Decisión propuesta | Decisión del CLO |
|---|---|---|
| D1 | Fuente PRIMARY: edición consolidada de septiembre de 2024, con la reserva 5.1 | ☑ Aprueba |
| D2 | Aceptar la extracción y el saneamiento de §1 (24 notas resueltas y cruzadas, 1 errata) | ☑ Aprueba |
| D3 | Firma del texto consolidado de 215 artículos (huella en §7) | ☑ Firma |
| D4 | Vigencia: 215 `true` | ☑ Aprueba |
| D5 | Art. 167: CONTEXT vigente hasta dictamen (§4); o PRIMARY por dictamen | ☑ **Aprueba**: art. 167 como CONTEXT vigente, con constancia sobre la remisión al art. 392-E del Código Penal de 1983 |
| D6 | Constancias por fila (16 fe de erratas, 5 reformas, 1 adición, 2 interpretaciones; ver `constancias.csv`) | ☑ Aprueba |
| D7 | Al activar V5, ocultar (sin borrar) las 215 filas legacy `mayalex_normativos:tributario_2016_a*`, con respaldo previo y reversión 99 | ☑ Aprueba |
| D8 | Autorizar V4 en staging y V5 en producción, exactamente para los SQL y huellas de §7 | ☑ Autoriza |

Firma: **aprobado** · Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex) · Fecha: 2026-11-24

*Registro de la firma.* El CLO comunicó en la sesión de trabajo del 2026-11-24 la aprobación de D1–D8, con determinación expresa sobre D5 (art. 167); Claude Code la transcribió aquí por su instrucción. El paquete no se regeneró después: la firma cubre exactamente las huellas de los SQL citadas en este pliego.

## 7. Paquete SQL y huellas (lo que autoriza D8)

Los archivos se generan en `out/ola9-ctrib/` (directorio ignorado por git), de forma reproducible con `npx tsx scripts/olas/ola9-ctrib.ts`.

**Huellas del expediente:**
- texto consolidado: `aba8b10bec73f5dad586ff67ddfff0b243bb2f0bc88eaa05b9ac7510141c7845`;
- `manifiesto_articulos.json`: `547b6fbc7295d8051f73904fbc69223eaaef8e5ebcd384c6b7aaccbc6cecf2f6`;
- `constancias.csv`: `d5a21a67ba5b1d6a61ab268f27faf82a973fbb79fc80c872d1c4d87710b5fc11`.

| Paso | Archivo | Bytes | SHA-256 | Firma |
|---:|---|---:|---|---|
| S1 | `staging/01_insert_staging.sql` | 574,285 | `cf024b8f5c431bd8634cc83875f07810c9beff15d20791bbfbb2e98068cdf3ea` | No (filas ocultas) |
| S2 | `staging/02_embeddings_staging.sql` | 825,164 | `abc4b688fd088b6672b7762e8a355d42e29120b7e2bf97639bbf604516a8944a` | No |
| S3 | `staging/03_verificacion_staging.sql` | 1,652 | `63534392c79fb87a4f3da9461eb4d2ad75aaa85c270cba24710313671ea2eb0e` | No (solo lectura) |
| S4 | `staging/04_visibilidad_v4_staging.sql` | 15,164 | `d102e172d23d6662e30be888be33c94df905a2b53203e438be4fed820f8f0b87` | **Sí** |
| P0 | `prod/00_precheck_y_respaldo_prod.sql` | 1,569 | `ad916a7174ba4460929f2c07dbcd3f14e4a4c4e968c65ac7c3d3943ca74b6e02` | **Sí** |
| P1 | `prod/01_datos_prod.sql` | 582,090 | `7d0c653bcdf90991a7b12673ac7fd963b58f7dee66a89c5dee6f3cb50c79c6e2` | **Sí** |
| P2 | `prod/02_embeddings_prod.sql` | 838,995 | `c0d35972416fa978ab7dfe817de127631d42b7862abec3d04f3be88a4a986134` | **Sí** |
| P3 | `prod/03_activacion_v5_prod.sql` | 16,278 | `eb2ab87642a9d02f046ede2ca9e856b22bc6233523e6c86198be9c2da3d424ea` | **Sí** |
| R | `prod/99_reversion_prod.sql` | 754 | `4d71576f1f784e7d23483f7cc5cae126397085cea9add1682ac5ae3b23e16953` | Solo por orden del CLO; el `.ps1` no lo ejecuta |

**Ensayo en base desechable (2026-11-24).** Se corrió el paquete completo en Postgres 17 con pgvector (PGlite): esquema real de 18 columnas, 215 filas legacy simuladas y una fila V5 ajena.
- **Staging:** S1 y S2 son reaplicables. S3 verifica todas las huellas SHA-256. La repetición de S4 falla cerrada.
- **Producción, antes de activar:** P3 se niega antes de P1/P2. P0 respalda las 215 filas legacy y no sobrescribe un respaldo existente.
- **Activación y reversión:** P3 activa 215 filas V5 (214 PRIMARY, 1 CONTEXT) y oculta exactamente las 215 legacy sin tocar la fila ajena. R restaura las 215 legacy y elimina el lote.

## 8. Ejecución tras la firma

```powershell
pwsh -File out\ola9-ctrib\ejecutar_staging.ps1 -DesdePaso 1 -HastaPaso 3
pwsh -File out\ola9-ctrib\ejecutar_staging.ps1 -DesdePaso 4 -HastaPaso 4
pwsh -File out\ola9-ctrib\ejecutar_prod.ps1
```
