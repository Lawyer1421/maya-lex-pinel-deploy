# Expediente de auditoría · OLA 3 · `HN:CONSTITUCION_REPUBLICA`

**Estado:** D1–D8 FIRMADAS (2026-11-25, Abg. y Not. Fredy Omar Pinel Flores, CLO)
**Instrumento:** Constitución de la República de Honduras (Decreto No. 131 de 1982, La Gaceta No. 23,612 del 20-ene-1982) · lote `OLA3_CON_2021_01`
**Fecha del paquete:** 2026-11-24 · **Generador:** `scripts/olas/ola3-con.ts` + `scripts/olas/cedij.ts` + `scripts/olas/paquete-ola.ts`
**Staging:** `mayalexhn-staging` (`aicakncgtuiiuomflkqj`) · **Producción:** `thgrhueckkjdutjvcufp`

> **Cómo se firma.** El CLO revisa las secciones 1 a 5 y decide D1–D8 en §6. Para firmar, sustituye en la línea **Estado** el texto `PENDIENTE DE FIRMA` por la fórmula de firma (D1–D8 y la palabra FIRMADAS) y completa el bloque de firma. El ejecutor (`scripts/olas/ejecutar-sql.ts`) lee la firma solo en esa línea **Estado** y se niega a correr la visibilidad V4 en staging y cualquier paso de producción si este archivo no está firmado o no cita la huella SHA-256 exacta de cada SQL (§7). Si el CLO modifica una decisión, hay que regenerar el paquete y volver a citar las huellas.

## 1. Fuente

| Pieza | Archivo · SHA-256 | Uso |
|---|---|---|
| Edición consolidada «Constitucion de la Republica (actualizada noviembre 2021).pdf» (`SISTEMA_LEGAL_PRINCIPAL/02_EJERCICIO_LEGAL/05_LEYES_Y_CODIGOS/`) | 609,801 bytes, 85 págs., Word 2019, 19-may-2023 · `6d6e8e880a33dafd9b6dd8c4ac07291fb77af9ada0456e1b6cf0b0b17d882482` | Texto base: preámbulo (no se carga), arts. 1–379 y los adicionados 43-A y 43-B. Trae **121 notas al pie** con la cita de cada decreto de reforma y de ratificación |

**Sobre la versión.** El título interno del PDF dice «con las Reformas desde 1982 hasta 2004», pero es un resto del documento Word original. El nombre del archivo y las notas confirman que está actualizada a 2021: anotan los D.200-2018 y D.2-2019, y antes los D.237-2012, D.10-2013 y D.231-2012, entre otros.

La copia del teléfono (`S26/…`) sigue ilegible. Esta copia de OneDrive es la misma edición, con texto.

**Extracción.** `scripts/olas/cedij.ts`. Correcciones registradas:
- la fórmula «POR TANTO PUBLIQUESE» del art. 218 estaba partida en un renglón en mayúsculas que se habría perdido como rótulo;
- se retiró un voladito «55» suelto al final del art. 246, porque la nota 55 anota el art. 217;
- la nota 120 repite el texto de la 119 («Artículo 373. Interpretado…») pero su llamada está en el art. 374, así que se excluye del cruce. **El art. 374 lleva, por tanto, una constancia de interpretación que en realidad se refiere al 373.**

## 2. Situación actual en producción (solo lectura, 2026-11-24)

**378 filas legacy** `mayalex_normativos:constitucion_1982_a*`, sin `norm_id`, de fuente «Consolidado TSC corte 2004».

| Hallazgo | Artículos |
|---|---|
| Figuran **derogados pero hoy tienen texto vigente**: 225 (enriquecimiento ilícito, D.150-2007), 232 (Ministerio Público, D.150-2007) y 234 (juicio político, D.231-2012) | **3** |
| Figura **vigente pero está derogado**: 377 (D.262-2000, ratificado por D.38-2001) | **1** |
| **Faltan**: 43-A y 43-B (D.200-2018) y 379 (vigencia de la Constitución) | **3** |
| Similitud < 0.90 con la edición 2021: reformas posteriores a 2004, como las de los D.200-2018, D.237-2012 y D.10-2013, entre otras | 61 |
| Texto idéntico | 246 |
| Similitud ≥ 0.95 | 297 |

## 3. Conteo y clasificación propuesta

| Concepto | Filas |
|---|---:|
| Artículos 1–379 más 43-A y 43-B | 381 |
| **PRIMARY** | **378** |
| **CONTEXT derogados** | **3** |

Los tres derogados son:
- **art. 200:** la edición imprime «Derogado» y sus numerales 1 a 5 «Derogado» (nota 38, D.175-2003);
- **art. 370:** D.268-2002;
- **art. 377:** D.262-2000.

**Constancias:**
- 100 de reforma y 3 de adición, en 83 artículos reformados o adicionados;
- 14 interpretaciones auténticas, en los arts. 23, 90, 122, 160, 164, 208, 217, 229, 274, 309, 313, 365 y 373, más el 374 (ver §1);
- 2 derogaciones totales y 2 parciales.

## 4. Reservas

1. **Cotejo con La Gaceta.** Las reformas y ratificaciones se toman de las notas de la edición, sin cotejo con La Gaceta. Corte: noviembre de 2021. Las reformas constitucionales posteriores, de 2022 a 2026, quedan para revisión incremental.
2. **Artículos pétreos.** Los arts. 373 y 374 (reforma de la Constitución) llevan las interpretaciones del D.169-86. Conviene que el CLO confirme la nota 120 contra La Gaceta.
3. **Ley sobre Justicia Constitucional.** Su ola (OLA 12) ya está firmada. Las remisiones constitucionales de esa ley podrán cotejarse contra esta OLA cuando ambas estén en producción.

## 6. Decisiones D1–D8 para firma

| # | Decisión propuesta | Decisión del CLO |
|---|---|---|
| D1 | Fuente PRIMARY: edición consolidada a noviembre de 2021, con las reservas 4.1 y 4.2 | ☑ Aprueba |
| D2 | Aceptar la extracción y las tres correcciones de §1 (arts. 218 y 246, nota 120) | ☑ Aprueba |
| D3 | Firma del texto consolidado de 381 artículos (huella en §7) | ☑ Firma |
| D4 | Vigencia: 378 `true` y 3 `false`; corrige la vigencia de 225, 232, 234 y 377 e incorpora 43-A, 43-B y 379 | ☑ **Aprueba**: 378 PRIMARY y 3 CONTEXT derogados (200, 370 y 377) |
| D5 | Sin decisiones de clasificación pendientes; nota 120 según la reserva 4.2 | ☑ **Aprueba**: la reserva 4.2 sobre la nota 120 (arts. 373/374) queda anotada para cotejo posterior contra La Gaceta |
| D6 | Constancias por fila (121 notas; ver `constancias.csv`) | ☑ Aprueba |
| D7 | Al activar V5, ocultar (sin borrar) las 378 filas legacy `mayalex_normativos:constitucion_1982_a*`, con respaldo previo y reversión 99 | ☑ Aprueba |
| D8 | Autorizar V4 en staging y V5 en producción, exactamente para los SQL y huellas de §7 | ☑ Autoriza, sin regenerar el paquete |

Firma: **aprobado** · Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex) · Fecha: 2026-11-25

*Registro de la firma.* El CLO comunicó en la sesión de trabajo del 2026-11-25 la aprobación de D1–D8, con determinación expresa sobre D4, D5 y D8. Claude Code la transcribió aquí por su instrucción. El paquete no se regeneró: la firma cubre exactamente las huellas de los SQL citadas en este pliego.

## 7. Paquete SQL y huellas (lo que autoriza D8)

Los archivos se generan en `out/ola3-con/` (directorio ignorado por git), de forma reproducible con `npx tsx scripts/olas/ola3-con.ts`.

**Huellas del expediente:**
- texto consolidado: `0c7106d8121cce263d29e6178d4aae7100f105c20bd659ace014e7b18e453ebe`;
- `manifiesto_articulos.json`: `d2d68455efe5e1fc9f7f4c911212e9a05bc39b469f4a1307f6beee375ccb76a1`;
- `constancias.csv`: `2099ce70fe5c2e64f056c816e5c49c515cc72050690ec7eab799aa405300a1a4`.

| Paso | Archivo | Bytes | SHA-256 | Firma |
|---:|---|---:|---|---|
| S1 | `staging/01_insert_staging.sql` | 717,833 | `c4a84c981b3b108cf2f4a01cabd547de77ff2c4204c83e6a304795a75641899d` | No (filas ocultas) |
| S2 | `staging/02_embeddings_staging.sql` | 1,461,507 | `c8d9a8d77d78d88ca7631eeee3b2b0a158474b2588477c17c92bc4477414437e` | No |
| S3 | `staging/03_verificacion_staging.sql` | 1,659 | `ee58b9960c850cb725916ccd723f673304d62498ad01a1f8d1a68a9b7a2ca5b3` | No (solo lectura) |
| S4 | `staging/04_visibilidad_v4_staging.sql` | 25,015 | `b224e00815bbaf6f5c5c51b5d9cabc9b5f3dcdd9c90ca9d1b22a5efa2447c3d0` | **Sí** |
| P0 | `prod/00_precheck_y_respaldo_prod.sql` | 1,574 | `06f5002cb6d8d0f95945c90b77ba9808421fcc280869e3deab355e881cce69ba` | **Sí** |
| P1 | `prod/01_datos_prod.sql` | 731,446 | `88f88a9286ad847f30ef1cadeaa8de5a1cf3f5829618cc8539522e4626d5be0b` | **Sí** |
| P2 | `prod/02_embeddings_prod.sql` | 1,485,962 | `8fd34e8d8a81532ebfaa1bdeeb3031b73fc398a56985fa9e910193c68e7348bc` | **Sí** |
| P3 | `prod/03_activacion_v5_prod.sql` | 26,305 | `b738c4c3e74b8aea108a9b17f4e5ceb9507f8dd9d78ff650f7c57131408d1337` | **Sí** |
| R | `prod/99_reversion_prod.sql` | 755 | `9c1eb5f97e3a361e8adf4d2ec0ebbb328dd57fb8373c1649cd8ebc4fb6140d28` | Solo por orden del CLO; el `.ps1` no lo ejecuta |

**Ensayo en base desechable (2026-11-24).** Se corrió el paquete completo en Postgres 17 con pgvector (PGlite): esquema real de 18 columnas, 378 filas legacy simuladas y una fila V5 ajena.
- **Staging:** S1 y S2 son reaplicables. S3 verifica todas las huellas SHA-256. La repetición de S4 falla cerrada.
- **Producción, antes de activar:** P3 se niega antes de P1/P2. P0 respalda las 378 filas legacy y no sobrescribe un respaldo existente.
- **Activación y reversión:** P3 activa 381 filas V5 (378 PRIMARY, 3 CONTEXT derogados) y oculta exactamente las 378 legacy sin tocar la fila ajena. R restaura las 378 legacy y elimina el lote.

## 8. Ejecución tras la firma

```powershell
pwsh -File out\ola3-con\ejecutar_staging.ps1 -DesdePaso 1 -HastaPaso 3
pwsh -File out\ola3-con\ejecutar_staging.ps1 -DesdePaso 4 -HastaPaso 4
pwsh -File out\ola3-con\ejecutar_prod.ps1
```
