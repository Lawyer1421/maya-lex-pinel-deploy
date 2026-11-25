# Expediente de auditoría · OLA 12 · `HN:LEY_ORGANIZACION_TRIBUNALES`

**Estado:** D1–D8 FIRMADAS (2026-11-24, Abg. y Not. Fredy Omar Pinel Flores, CLO)
**Instrumento:** Ley de Organización y Atribuciones de los Tribunales (Decreto No. 76 de 1906) · lote `OLA12_LOAT_2007_01`
**Fecha del paquete:** 2026-11-24 · **Generador:** `scripts/olas/ola12-leyes.ts loat` + `scripts/olas/cedij.ts` + `scripts/olas/paquete-ola.ts`
**Staging:** `mayalexhn-staging` (`aicakncgtuiiuomflkqj`) · **Producción:** `thgrhueckkjdutjvcufp`

> **Cómo se firma.** El CLO revisa las secciones 1 a 5 y decide D1–D8 en §6. Para firmar, sustituye en la línea **Estado** el texto `PENDIENTE DE FIRMA` por la fórmula de firma (D1–D8 y la palabra FIRMADAS) y completa el bloque de firma. El ejecutor (`scripts/olas/ejecutar-sql.ts`) lee la firma solo en esa línea **Estado** y se niega a correr la visibilidad V4 en staging y cualquier paso de producción si este archivo no está firmado o no cita la huella SHA-256 exacta de cada SQL (§7). Si el CLO modifica una decisión, hay que regenerar el paquete y volver a citar las huellas.

## 1. Fuente

| Pieza | Archivo · SHA-256 | Uso |
|---|---|---|
| Edición del CEDIJ «LEY DE ORGANIZACIÓN Y ATRIBUCIONES DE LOS TRIBUNALES (ACTUALIZADA-07).pdf» (`CLRA/`) | 557,692 bytes, 127 págs., 10-dic-2007 · `77c0ad2ca8f77e76c3c6f941032aa47300d1c30ad9949c611a19ede2167d3c2a` | Arts. 1–264. **98 notas**: las 1–78 anotan el articulado; las 79–98 anotan los decretos de reforma anexos, que no se cargan |

**Particularidades de la edición**, resueltas en el script y verificadas:
- no existe la nota 18: la numeración salta de la 17 a la 19;
- la nota 9 no tiene llamada impresa y se asigna al art. 30, que es el que nombra;
- las notas 33 y 34 empiezan por «1.», y las notas 66 y 70 vienen sangradas;
- el primer párrafo del art. 33 está impreso dos veces;
- hay llamadas encadenadas («Bahía20 21 22.»).

**Arts. 194 a 217.** La edición los imprime en una sola línea, «Artículo 194. AL 217.», y la nota 58 dice que fueron derogados por el art. 84 del D.228-93, Ley del Ministerio Público. Se expanden en 24 filas derogadas, cada una con su constancia.

## 2. Situación actual en producción

**No hay filas** de la LOAT en producción.

## 3. Conteo y clasificación propuesta

| Concepto | Filas |
|---|---:|
| Artículos 1–264 | 264 |
| **PRIMARY** | **228** |
| **CONTEXT vigentes** (26, 27, 34, 40, 74, 75, 116, 147, 233, 234, 236, 248) | **12** |
| **CONTEXT derogados**: arts. 194–217 (art. 84 del D.228-93, Ley del Ministerio Público) | **24** |

Los CONTEXT vigentes se reparten así:
- **Reforma o derogación tácita anotada:** arts. 26 y 40 (D.178-2001); 27 y 34 (unidad monetaria, D.102-1926); 74 y 75 (Constitución de 1982); 116 (Ley de Conciliación y Arbitraje); 147 (Código de Familia); 248 (Ley Orgánica del Colegio de Abogados).
- **Arts. 233, 234 y 236, en la propuesta D5:** sus notas dicen que la Ley de Notariado de 1930 a la que remiten está derogada por el D.353-2005. No dicen que estos artículos de la LOAT lo estén. Se proponen CONTEXT vigentes, no derogados.

## 4. Reservas

1. **Ley de 1906 desbordada por normas posteriores.** La Constitución de 1982, la Ley de la Carrera Judicial, la Ley del Ministerio Público, la Ley Orgánica del Colegio de Abogados y otras han desplazado partes de la LOAT. Las 68 notas de «referencia» lo advierten, pero el texto no se actualizó. Como PRIMARY se proponen los artículos sin anotación de cambio; el CLO puede preferir tratar toda la ley como CONTEXT (D5).
2. **Corte temporal.** La edición es de 2007; las reformas posteriores no están verificadas.

## 6. Decisiones D1–D8 para firma

| # | Decisión propuesta | Decisión del CLO |
|---|---|---|
| D1 | Fuente PRIMARY: edición CEDIJ 2007, con las reservas 4.1 y 4.2 | ☑ Aprueba |
| D2 | Aceptar la extracción de §1 (nota 18 inexistente, nota 9 sin llamada, art. 33 duplicado, rango 194–217 expandido) | ☑ Aprueba |
| D3 | Firma del texto consolidado de 264 artículos (huella en §7) | ☑ Firma |
| D4 | Vigencia: 240 `true` y 24 `false` | ☑ **Aprueba**: 228 PRIMARY, 12 CONTEXT vigentes y 24 CONTEXT derogados (arts. 194–217) |
| D5 | Arts. 233, 234 y 236: CONTEXT vigentes (materia del Código del Notariado). Alternativa: toda la LOAT como CONTEXT (reserva 4.1) | ☑ **Aprueba la propuesta principal**: arts. 233, 234 y 236 CONTEXT vigentes por sustitución del Código del Notariado; no se adopta la alternativa de toda la LOAT como CONTEXT |
| D6 | Constancias por fila (78 notas del articulado; ver `constancias.csv`) | ☑ Aprueba |
| D7 | Sin legacy que ocultar | ☑ Aprueba |
| D8 | Autorizar V4 en staging y V5 en producción, exactamente para los SQL y huellas de §7 | ☑ Autoriza |

Firma: **aprobado** · Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex) · Fecha: 2026-11-24

*Registro de la firma.* El CLO comunicó en la sesión de trabajo del 2026-11-24 la aprobación de D1–D8, con determinación expresa sobre D4 y D5 (propuesta principal); Claude Code la transcribió aquí por su instrucción. El paquete no se regeneró después: la firma cubre exactamente las huellas de los SQL citadas en este pliego.

## 7. Paquete SQL y huellas (lo que autoriza D8)

Los archivos se generan en `out/ola12-loat/` (directorio ignorado por git), de forma reproducible con `npx tsx scripts/olas/ola12-leyes.ts loat`.

**Huellas del expediente:**
- texto consolidado: `42df72f9c79fdeb9cd588c1273833e175f58961f948d2bcd5dbc0a356c266ca9`;
- `manifiesto_articulos.json`: `c220fb93ea51568f77abdcdd229fffbce3cf306336961e449ef2320f9bc9a268`;
- `constancias.csv`: `592fa86872344b740c940ed52b1c2bcf00eb3b050b6dc93ff7ff47485496f106`.

| Paso | Archivo | Bytes | SHA-256 | Firma |
|---:|---|---:|---|---|
| S1 | `staging/01_insert_staging.sql` | 507,078 | `f080e7b9654067e0c3a78f045f0f982277b22a622a67ec4546aa3dda17628c80` | No (filas ocultas) |
| S2 | `staging/02_embeddings_staging.sql` | 1,015,398 | `afded858d9b3e6c2ddf0882de45f807f9c46cc12a16ac2eebfcde588ed882fe9` | No |
| S3 | `staging/03_verificacion_staging.sql` | 1,683 | `e591f48efe130e5f74ff6f0103654a3eb88aeedc1ba4a91d32ea2bb6ac6da607` | No (solo lectura) |
| S4 | `staging/04_visibilidad_v4_staging.sql` | 21,037 | `71fb0445ed88a56dcaed440eb768fc52246e36b75b6bfd2960a14664cb00deb4` | **Sí** |
| P0 | `prod/00_precheck_y_respaldo_prod.sql` | 1,310 | `14516a5cc199b1acfbdf73daa7252efb1baf530c601b4b7910d25e46e2773f53` | **Sí** |
| P1 | `prod/01_datos_prod.sql` | 516,598 | `78400a2bbf68438d10320b9e890f3f6c2aa239e0b676e34d34737531020bebf1` | **Sí** |
| P2 | `prod/02_embeddings_prod.sql` | 1,032,365 | `f92eff51964746e9caa9905152921dad294825c57511c8cd22dd5e152825729a` | **Sí** |
| P3 | `prod/03_activacion_v5_prod.sql` | 21,629 | `0dc02c071c3ce836ebe17dd797638d61cf2aa981da1a98b57d69c9923b028d81` | **Sí** |
| R | `prod/99_reversion_prod.sql` | 481 | `bb45060870d8dc3ad7ab05ba7d5ea7c11789a5cb5343a983600577fdfc66151d` | Solo por orden del CLO; el `.ps1` no lo ejecuta |

**Ensayo en base desechable (2026-11-24).** Se corrió el paquete completo en Postgres 17 con pgvector (PGlite): esquema real de 18 columnas, sin filas legacy y con una fila V5 ajena.
- **Staging:** S1 y S2 son reaplicables. S3 verifica todas las huellas SHA-256. La repetición de S4 falla cerrada.
- **Producción, antes de activar:** P3 se niega antes de P1/P2. P0 corre sin filas que respaldar.
- **Activación y reversión:** P3 activa 264 filas V5 sin tocar la fila ajena (no hay legacy que ocultar). R elimina el lote.

## 8. Ejecución tras la firma

```powershell
pwsh -File out\ola12-loat\ejecutar_staging.ps1 -DesdePaso 1 -HastaPaso 3
pwsh -File out\ola12-loat\ejecutar_staging.ps1 -DesdePaso 4 -HastaPaso 4
pwsh -File out\ola12-loat\ejecutar_prod.ps1
```
