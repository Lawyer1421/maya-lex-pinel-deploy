# Expediente de auditoría · OLA 12 · `HN:LEY_JUSTICIA_CONSTITUCIONAL`

**Estado:** D1–D8 FIRMADAS (2026-11-24, Abg. y Not. Fredy Omar Pinel Flores, CLO)
**Instrumento:** Ley sobre Justicia Constitucional de Honduras (Decreto No. 244-2003) · lote `OLA12_LJC_2007_01`
**Fecha del paquete:** 2026-11-24 · **Generador:** `scripts/olas/ola12-leyes.ts ljc` + `scripts/olas/cedij.ts` + `scripts/olas/paquete-ola.ts`
**Staging:** `mayalexhn-staging` (`aicakncgtuiiuomflkqj`) · **Producción:** `thgrhueckkjdutjvcufp`

> **Cómo se firma.** El CLO revisa las secciones 1 a 5 y decide D1–D8 en §6. Para firmar, sustituye en la línea **Estado** el texto `PENDIENTE DE FIRMA` por la fórmula de firma (D1–D8 y la palabra FIRMADAS) y completa el bloque de firma. El ejecutor (`scripts/olas/ejecutar-sql.ts`) lee la firma solo en esa línea **Estado** y se niega a correr la visibilidad V4 en staging y cualquier paso de producción si este archivo no está firmado o no cita la huella SHA-256 exacta de cada SQL (§7). Si el CLO modifica una decisión, hay que regenerar el paquete y volver a citar las huellas.

## 1. Fuente

| Pieza | Archivo · SHA-256 | Uso |
|---|---|---|
| Edición del CEDIJ «Ley-Sobre-Justicia-Constitucional.pdf» (`Email attachments/Documentos/AMPARO RECURSOS/`) | 236,919 bytes, 42 págs., 18-oct-2007 · `1edf2274e2aaad5cc44b95208eb90d4a41f0d608e834e48b106384b62be746e6` | Texto base, arts. 1–124, sin notas al pie |

El art. 46 termina sin punto en el original.

## 2. Situación actual en producción (solo lectura, 2026-11-24)

**124 filas legacy** `v2ljc:mayalex_normativos:1…124` (`HN_LEY_JUSTICIA_CONSTITUCIONAL`, V2), todas vigentes.

| Comparación con la edición | Artículos |
|---|---:|
| Coinciden en número | 124/124 |
| Coinciden en vigencia | 124/124 |
| Texto idéntico | 76 |
| Similitud ≥ 0.95 | 115 |
| Llevan marcas de página «-- N of M --» | 40 |
| Similitud < 0.90 (arts. 123, 124, 68, 82 y 57; en 123 y 124 el legacy arrastra las firmas y la sanción del decreto) | 5 |

## 3. Conteo y clasificación propuesta

124 artículos, **124 PRIMARY**.

## 4. Reservas

1. La edición es de 2007 y no tiene notas. **No se verificaron reformas posteriores a la Ley sobre Justicia Constitucional**, ni el efecto de las reformas constitucionales posteriores sobre la Sala de lo Constitucional. Queda para revisión incremental contra el índice de La Gaceta.
2. Cuando la OLA 3 (Constitución de 2021) esté lista, conviene cotejar las remisiones constitucionales de esta ley.

## 5. Observación

La Constitución actualizada a noviembre de 2021 **sí está disponible** en `SISTEMA_LEGAL_PRINCIPAL/02_EJERCICIO_LEGAL/05_LEYES_Y_CODIGOS/Constitucion de la Republica (actualizada noviembre 2021).pdf` (609,801 bytes, con texto). Eso desbloquea la OLA 3.

## 6. Decisiones D1–D8 para firma

| # | Decisión propuesta | Decisión del CLO |
|---|---|---|
| D1 | Fuente PRIMARY: edición CEDIJ 2007, con la reserva 4.1 | ☑ Aprueba |
| D2 | Aceptar la extracción (1 excepción sin cierre) | ☑ Aprueba |
| D3 | Firma del texto consolidado de 124 artículos (huella en §7) | ☑ Firma |
| D4 | Vigencia: 124 `true` | ☑ **Aprueba**: 124 PRIMARY |
| D5 | Sin decisiones de clasificación pendientes | ☑ Aprueba |
| D6 | Metadatos por fila (sin constancias: la edición no tiene notas) | ☑ Aprueba |
| D7 | Al activar V5, ocultar (sin borrar) las 124 filas legacy `v2ljc:mayalex_normativos:*`, con respaldo previo y reversión 99 | ☑ Aprueba |
| D8 | Autorizar V4 en staging y V5 en producción, exactamente para los SQL y huellas de §7 | ☑ Autoriza |

Firma: **aprobado** · Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex) · Fecha: 2026-11-24

*Registro de la firma.* El CLO comunicó en la sesión de trabajo del 2026-11-24 la aprobación de D1–D8, con determinación expresa sobre D4 (124 PRIMARY); Claude Code la transcribió aquí por su instrucción. El paquete no se regeneró después: la firma cubre exactamente las huellas de los SQL citadas en este pliego.

## 7. Paquete SQL y huellas (lo que autoriza D8)

Los archivos se generan en `out/ola12-ljc/` (directorio ignorado por git), de forma reproducible con `npx tsx scripts/olas/ola12-leyes.ts ljc`.

**Huellas del expediente:**
- texto consolidado: `f848fefb8497c511fb9e0e17d9b2488d210050165fb40bd66187c7bbf622e988`;
- `manifiesto_articulos.json`: `c9d7f1378c06c78cf55f143a831d2d2ee25fbdb377d5930c6239fa3532509482`;
- `constancias.csv`: `8f9c669286ebb0f5e25f1f8d2736f94e3d2062d4bf54c857f0ebbdfa0e2dc5c6`.

| Paso | Archivo | Bytes | SHA-256 | Firma |
|---:|---|---:|---|---|
| S1 | `staging/01_insert_staging.sql` | 224,873 | `8f3927869d1b454971c1abb73fa01b7a931f407f768b132815434b6298435c7e` | No (filas ocultas) |
| S2 | `staging/02_embeddings_staging.sql` | 477,290 | `6ab61bf50d45d72154392888654eff4c28b53dfc0282c9f4982675b27131b7a0` | No |
| S3 | `staging/03_verificacion_staging.sql` | 1,679 | `1280e1c00bca74c9433d752077578319c701624aecadccc295fdff4db5aaffb6` | No (solo lectura) |
| S4 | `staging/04_visibilidad_v4_staging.sql` | 10,078 | `da4f55c57964ec9bd202c213ca7e93ae8f402f4d2e38988ad5d360db112dd465` | **Sí** |
| P0 | `prod/00_precheck_y_respaldo_prod.sql` | 1,695 | `12703cf334d3aaef299f951ab85384b679bc1e7e253a33222099835043ac36c8` | **Sí** |
| P1 | `prod/01_datos_prod.sql` | 229,492 | `408e511edea805dcf38d1237b81462909b99df6e82d670b0a99b7f50e2b50c04` | **Sí** |
| P2 | `prod/02_embeddings_prod.sql` | 485,297 | `0c6a1661b20c1da87f78f82c273015d6ecf9d39e557093ddca48e11575811d12` | **Sí** |
| P3 | `prod/03_activacion_v5_prod.sql` | 10,999 | `ec880fd71cda1d66f4c39ab6767cf725c8e08959d154faeea71ce18ee4c2f1a5` | **Sí** |
| R | `prod/99_reversion_prod.sql` | 813 | `12bf21e209f1aad7a114bad8dba72f430b3eafd332fc58fd6f60bf4e1b25f762` | Solo por orden del CLO; el `.ps1` no lo ejecuta |

**Ensayo en base desechable (2026-11-24).** Se corrió el paquete completo en Postgres 17 con pgvector (PGlite): esquema real de 18 columnas, 124 filas legacy simuladas y una fila V5 ajena.
- **Staging:** S1 y S2 son reaplicables. S3 verifica todas las huellas SHA-256. La repetición de S4 falla cerrada.
- **Producción, antes de activar:** P3 se niega antes de P1/P2. P0 respalda las 124 filas legacy y no sobrescribe un respaldo existente.
- **Activación y reversión:** P3 activa 124 filas V5 y oculta exactamente las 124 legacy sin tocar la fila ajena. R restaura las 124 legacy y elimina el lote.

## 8. Ejecución tras la firma

```powershell
pwsh -File out\ola12-ljc\ejecutar_staging.ps1 -DesdePaso 1 -HastaPaso 3
pwsh -File out\ola12-ljc\ejecutar_staging.ps1 -DesdePaso 4 -HastaPaso 4
pwsh -File out\ola12-ljc\ejecutar_prod.ps1
```
