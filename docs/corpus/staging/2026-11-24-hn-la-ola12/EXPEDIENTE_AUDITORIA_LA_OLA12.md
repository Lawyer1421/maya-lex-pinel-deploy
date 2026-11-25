# Expediente de auditoría · OLA 12 · `HN:LEY_LAVADO_ACTIVOS`

**Estado:** D1–D8 FIRMADAS (2026-11-24, Abg. y Not. Fredy Omar Pinel Flores, CLO)
**Instrumento:** Ley Especial contra el Lavado de Activos (Decreto No. 144-2014, La Gaceta No. 33,718 del 30-abr-2015) · lote `OLA12_LA_2015_01`
**Fecha del paquete:** 2026-11-24 · **Generador:** `scripts/olas/ola12-lavado.ts` + `scripts/olas/cedij.ts` + `scripts/olas/paquete-ola.ts`
**Staging:** `mayalexhn-staging` (`aicakncgtuiiuomflkqj`) · **Producción:** `thgrhueckkjdutjvcufp`

> **Cómo se firma.** El CLO revisa las secciones 1 a 5 y decide D1–D8 en §6. Para firmar, sustituye en la línea **Estado** el texto `PENDIENTE DE FIRMA` por la fórmula de firma (D1–D8 y la palabra FIRMADAS) y completa el bloque de firma. El ejecutor (`scripts/olas/ejecutar-sql.ts`) lee la firma solo en esa línea **Estado** y se niega a correr la visibilidad V4 en staging y cualquier paso de producción si este archivo no está firmado o no cita la huella SHA-256 exacta de cada SQL (§7). Si el CLO modifica una decisión, hay que regenerar el paquete y volver a citar las huellas.

## 1. Fuente: La Gaceta

| Pieza | Archivo · SHA-256 | Uso |
|---|---|---|
| **La Gaceta No. 33,718 (30-abr-2015)**, PDF nativo, dentro de la recopilación «LEY-APNFDS-Y-LAVADO-DE-ACTIVOS-HONDURAS.pdf» (`COSAS FREDY 2021/MANUAL PREV. LAVADO DE ACTIVOS/`) | 3,000,903 bytes, 84 págs. · `d04e77c7eb1ec84aa58bce41ef90a9c0839c640a6df7f6745131bc46a196ba60`* | Sección A, págs. A.9–A.34: el D.144-2014 íntegro, arts. 1–93 |

\*Es la huella del archivo de la recopilación. La copia «Ley Especial Contra el Lavado de Activos.pdf» que indicaba el inventario es un **escaneo sin texto**, y las copias del D.45-2002 (ley anterior) también son escaneos.

**Extracción.** La Gaceta va a dos columnas. Cada página se extrae columna por columna, recortando con el `pdftotext` de poppler (columnas en x = 96–384 y 408–696 de 792 pt), y se retiran cabeceras y folios. La recopilación intercala otros documentos, así que el decreto está en las páginas 9–22 y 63–74 del PDF, que suman 26 páginas y coinciden con A.9–A.34.

**Correcciones de segmentación:**
- la remisión interna «Artículo 78 reformado de la Ley Sobre Privación…» dentro del art. 78 no abre otro artículo;
- la sigla «(CNBS).» en renglón propio al final del art. 23 se une a su línea.

## 2. Situación actual en producción

**No hay filas** de esta ley en producción.

## 3. Conteo y clasificación propuesta

93 artículos, **93 PRIMARY**. El art. 92 deroga la Ley Especial sobre el Abandono de Vehículos Automotores (D.245-2002) y la anterior Ley contra el Delito de Lavado de Activos (D.45-2002). El art. 88 reforma el art. 78 de la Ley sobre Privación Definitiva del Dominio.

## 4. Reservas

1. No se verificaron reformas a la ley posteriores a abril de 2015.
2. El mismo número de La Gaceta trae el D.131-2014, Ley para la Regulación de Actividades y Profesiones No Financieras Designadas (APNFD), que queda para una ola posterior.

## 6. Decisiones D1–D8 para firma

| # | Decisión propuesta | Decisión del CLO |
|---|---|---|
| D1 | Fuente PRIMARY: La Gaceta No. 33,718 (D.144-2014), con la reserva 4.1 | ☑ **Aprueba**: La Gaceta 33,718 nativa (D.144-2014) |
| D2 | Aceptar la extracción por columnas y las dos correcciones de §1 | ☑ Aprueba |
| D3 | Firma del texto de 93 artículos (huella en §7) | ☑ Firma |
| D4 | Vigencia: 93 `true` | ☑ **Aprueba**: 93 PRIMARY |
| D5 | Sin decisiones de clasificación pendientes | ☑ Aprueba |
| D6 | Metadatos por fila | ☑ Aprueba |
| D7 | Sin legacy que ocultar | ☑ Aprueba |
| D8 | Autorizar V4 en staging y V5 en producción, exactamente para los SQL y huellas de §7 | ☑ Autoriza |

Firma: **aprobado** · Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex) · Fecha: 2026-11-24

*Registro de la firma.* El CLO comunicó en la sesión de trabajo del 2026-11-24 la aprobación de D1–D8, con determinación expresa sobre D1 y D4; Claude Code la transcribió aquí por su instrucción. El paquete no se regeneró después: la firma cubre exactamente las huellas de los SQL citadas en este pliego.

## 7. Paquete SQL y huellas (lo que autoriza D8)

Los archivos se generan en `out/ola12-la/` (directorio ignorado por git), de forma reproducible con `npx tsx scripts/olas/ola12-lavado.ts`.

**Huellas del expediente:**
- texto consolidado: `538acf3968b2f21193e3cc1de33aea813365cff1a3579b083245367ab845fba2`;
- `manifiesto_articulos.json`: `3ac926babf9f7a97ba8ee5807d8588f987adbd6d5407eef7e66b0465c96a62c1`;
- `constancias.csv`: `8f9c669286ebb0f5e25f1f8d2736f94e3d2062d4bf54c857f0ebbdfa0e2dc5c6`.

| Paso | Archivo | Bytes | SHA-256 | Firma |
|---:|---|---:|---|---|
| S1 | `staging/01_insert_staging.sql` | 224,301 | `e979ede9ae54bfb4ee4d86b8ba05941be2eb7c2c673911ffc0dcc226c583a25a` | No (filas ocultas) |
| S2 | `staging/02_embeddings_staging.sql` | 357,215 | `2e9bb377e93165647c9beac628f582cafaf9a136100aac55836e31d69589becf` | No |
| S3 | `staging/03_verificacion_staging.sql` | 1,644 | `1c6070fd652049468ba494d6b2cbf408fbd704113f543b51c583425afab62275` | No (solo lectura) |
| S4 | `staging/04_visibilidad_v4_staging.sql` | 7,466 | `36d9e1cb5e3f131b0972f8241c6616a4fa4ff12cad62effadb157be42ab1d63f` | **Sí** |
| P0 | `prod/00_precheck_y_respaldo_prod.sql` | 1,269 | `31ae9c2bc7db53b6daf41e7b065cd8f6b95b1bbf10875bd360ddb9c0268929bb` | **Sí** |
| P1 | `prod/01_datos_prod.sql` | 227,834 | `c7e9f19e4f34e4b69388493bc2d5da30cde024eafc70c2030fb74fd438b723c4` | **Sí** |
| P2 | `prod/02_embeddings_prod.sql` | 363,239 | `23d8f5b48d1a80df7d1c0bd35fe7aaec67ceb08d4338cf0daaad5299e47f4b5a` | **Sí** |
| P3 | `prod/03_activacion_v5_prod.sql` | 7,699 | `91bbe381d44ab3ea974dd657d11372815fb6e9c5e074843b41e52e80d7073fab` | **Sí** |
| R | `prod/99_reversion_prod.sql` | 468 | `40fe7be08179c705fe2f59b7381ad9772be480dfeac4c1c937fe6cf96c5bb4c7` | Solo por orden del CLO; el `.ps1` no lo ejecuta |

**Ensayo en base desechable (2026-11-24).** Se corrió el paquete completo en Postgres 17 con pgvector (PGlite): esquema real de 18 columnas, sin filas legacy y con una fila V5 ajena.
- **Staging:** S1 y S2 son reaplicables. S3 verifica todas las huellas SHA-256. La repetición de S4 falla cerrada.
- **Producción, antes de activar:** P3 se niega antes de P1/P2. P0 corre sin filas que respaldar.
- **Activación y reversión:** P3 activa 93 filas V5 sin tocar la fila ajena (no hay legacy que ocultar). R elimina el lote.

## 8. Ejecución tras la firma

```powershell
pwsh -File out\ola12-la\ejecutar_staging.ps1 -DesdePaso 1 -HastaPaso 3
pwsh -File out\ola12-la\ejecutar_staging.ps1 -DesdePaso 4 -HastaPaso 4
pwsh -File out\ola12-la\ejecutar_prod.ps1
```
