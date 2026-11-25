# Acta de cierre · Ingesta V5 por olas del corpus hondureño

**Fecha:** 2026-11-25 · **Producción:** `thgrhueckkjdutjvcufp` · **Responsable:** Abg. y Not. Fredy Omar Pinel Flores (CLO / Director Maya Lex)

## 1. Estado certificado en producción

Lectura única de verificación, solo lectura, el 2026-11-25. Se hizo con `scripts/olas/verificacion-cierre-prod.sql` y la comprobación posterior a la corrección C1.

| Control | Resultado |
|---|---|
| Filas V5 visibles | **7,415** de 7,415, en 17 lotes, todos exactos |
| Embedding 384D válido (no nulo ni de ceros) | 7,415 |
| Texto que no coincide con `hash_contenido` (SHA-256) | **0** |
| Filas legacy sustituidas ocultas y marcadas con `sustituido_por_lote` | **7,349** de 7,349 |
| Filas legacy sustituidas aún visibles | 0 |
| Filas ocultas con `metadata` NULL | 0 |

## 2. Lotes en producción

| Lote | Instrumento | Filas V5 | Legacy oculto | Pliego |
|---|---|---:|---:|---|
| `A03_CODIGO_NINEZ_01`, `A04_D35_2013_01`, `PILOTO_D284_2013_01` | Lotes previos (2026-11-21) | 360 | — | anteriores |
| `OLA1_CPP_2024_01` | Código Procesal Penal | 480 | | [OLA 1](staging/2026-11-24-hn-cpp-ola1/) |
| `OLA2_CP_2017_01` | Código Penal | 638 | | [OLA 2](staging/2026-11-24-hn-cp-ola2/) |
| `OLA3_CON_2021_01` | Constitución de la República | 381 | 378 | [OLA 3](staging/2026-11-24-hn-con-ola3/EXPEDIENTE_AUDITORIA_CON_OLA3.md) |
| `OLA4_CC_2014_01` | Código Civil | 2,372 | 2,372 | [OLA 4](staging/2026-11-24-hn-cc-ola4/) |
| `OLA5_CF_2023_01` | Código de Familia | 379 | 373 | [OLA 5](staging/2026-11-24-hn-cf-ola5/) |
| `OLA6_CPC_2024_01` | Código Procesal Civil | 932 | 2,859 | [OLA 6](staging/2026-11-24-hn-cpc-ola6/) |
| `OLA7_CT_2023_01` | Código del Trabajo | 877 | 870 | [OLA 7](staging/2026-11-24-hn-ct-ola7/) |
| `OLA9_CTRIB_2024_01` | Código Tributario | 215 | 215 | [OLA 9](staging/2026-11-24-hn-ctrib-ola9/) |
| `OLA10_NOT_2006_01` | Código del Notariado | 94 | 94 | [OLA 10](staging/2026-11-24-hn-not-ola10/) |
| `OLA11_ADOP_2019_01` | Ley Especial de Adopciones | 64 | 64 | [OLA 11](staging/2026-11-24-hn-adop-ola11/) |
| `OLA12_LJC_2007_01` | Ley sobre Justicia Constitucional | 124 | 124 | [OLA 12 LJC](staging/2026-11-24-hn-ljc-ola12/) |
| `OLA12_LOAT_2007_01` | Ley de Organización y Atribuciones de los Tribunales | 264 | — | [OLA 12 LOAT](staging/2026-11-24-hn-loat-ola12/) |
| `OLA12_LP_2007_01` | Ley de Propiedad | 142 | — | [OLA 12 LP](staging/2026-11-24-hn-lp-ola12/) |
| `OLA12_LA_2015_01` | Ley Especial contra el Lavado de Activos | 93 | — | [OLA 12 LA](staging/2026-11-24-hn-la-ola12/) |
| **Total** | | **7,415** | **7,349** | |

Las filas legacy de las OLAS 1 y 2 se ocultaron en su propia promoción. Ninguna fila legacy se borró: cada ola dejó su respaldo `biblioteca_vectores_<lote>_backup` y su reversión 99 firmada.

## 3. Incidencia corregida: C1

Las 378 filas legacy de la OLA 3 y las 215 de la OLA 9 tenían `metadata` NULL. Por eso quedaron ocultas sin la marca que usa la reversión 99.

El CLO firmó la corrección C1 ([dictamen](staging/2026-11-25-correccion-marca-legacy/DICTAMEN_CORRECCION_MARCA_LEGACY.md), SQL `853a78b7…4dbe`) y la ejecutó con el ejecutor seguro. La verificación posterior confirma las 593 marcas.

El generador `scripts/olas/paquete-ola.ts` quedó corregido para las olas futuras: usa `coalesce` y comprueba cuántas filas quedan marcadas.

## 4. Pendientes que quedan abiertos

1. **Reserva 4.2 de la OLA 3:** la nota 120 de la edición atribuye al art. 374 una constancia de interpretación que en realidad se refiere al 373 (D.169-86). Falta cotejarla contra La Gaceta.
2. **OLA 8, Código de Comercio:** pausada por el CLO hasta disponer de la edición CEDIJ ([dictamen de fuente](staging/2026-11-24-hn-com-ola8/DICTAMEN_FUENTE_COMERCIO_OLA8.md)).
3. **Ley de Garantías Mobiliarias:** bloqueada; solo hay una versión escaneada y hace falta OCR.
4. **Reformas posteriores al corte de cada edición:** quedan para revisión incremental, según las reservas de cada expediente. Por ejemplo, las reformas constitucionales de 2022 a 2026 y las reformas de 2009 a 2012 de la Ley de Propiedad (D5).

## 5. Herramientas de auditoría

- `scripts/olas/paquete-ola.ts`: genera los paquetes.
- `scripts/olas/ejecutar-sql.ts`: ejecutor seguro. Verifica el project ref, la huella SHA-256 de cada SQL y la firma en la línea **Estado** del pliego.
- `scripts/olas/verificar-firmadas.ts`: control de no regresión del extractor común `cedij.ts`, con el extractor fijado en xpdf 4.06.
- `scripts/olas/verificacion-cierre-prod.sql`: lectura de cierre.
- `docs/corpus/INVENTARIO_OLAS_V5_2026-11-24.md`: inventario de fuentes y olas.
