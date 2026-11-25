# Inventario del corpus normativo HN y plan de olas V5

**Corte:** 2026-11-24 · **Bases consultadas (solo lectura, conector Supabase):** staging `aicakncgtuiiuomflkqj` y producción `thgrhueckkjdutjvcufp` · **Escrituras:** 0

> **Actualización 2026-11-25:** las olas firmadas (1 a 7 y 9 a 12) ya están en producción: 7,415 filas V5 y 7,349 legacy ocultas y marcadas. Ver el [acta de cierre](ACTA_CIERRE_OLAS_V5_2026-11-25.md). Este inventario conserva el estado de planificación del 2026-11-24.

## 1. Estado verificado de las bases

| Base | Lotes con `estado_v` | Verificación |
|---|---|---|
| Producción | **360 filas V5**: `A03_CODIGO_NINEZ_01` 302 · `A04_D35_2013_01` 19 · `PILOTO_D284_2013_01` 39 | Consulta directa de hoy. Confirma de forma independiente el cierre comunicado en `STAGING_V4_INVENTARIO_Y_PROMOCION_V5_PARA_FIRMA.md` §7 |
| Staging | Los mismos 3 lotes en **V4** (302 + 19 + 39), visibles y con embedding | Consulta directa de hoy. No hay otros lotes con `ingest_batch` |

El resto de producción es **carga legacy sin estado V**: los instrumentos con identidad de la tabla siguiente, más unas 74 mil filas sin identidad (`doc_<hash>`, ocultas o sin `fuente`) que no forman parte de este inventario. «Legacy» no equivale a V5: esas filas no tienen pliego, constancias ni clasificación PRIMARY/CONTEXT.

## 2. Inventario: fuente disponible frente a lo cargado

Estados: **En Prod V5** (promovido con pliego) · **En Staging** (lote V-gobernado en staging) · **Pendiente** (sin lote V). En los pendientes se indica entre paréntesis lo que ya hay en producción como legacy.

Rutas: `CODIGOS/` = `OneDrive\Email attachments\Documentos\CODIGOS\` · `CLRA/` = `OneDrive\CODIGOS Y LEYES REGLAMENTOS ACUERDOS ETC\` · `S26/` = `CrossDevice\S26 Ultra de Fredy\storage\Download\` · `LAV/` = `OneDrive\COSAS FREDY 2021\MANUAL PREV. LAVADO DE ACTIVOS\`.

| Norma | Archivo fuente | Tamaño | Estado actual | Ola |
|---|---|---:|---|---|
| Código de la Niñez y la Adolescencia (D.73-96 + D.35-2013) · `HN:CODIGO_NINEZ` | Texto canónico v2 (Gaceta 33,222 + consolidado dictaminado); `CODIGOS/Código de la Niñez y la Adolescencia (Actualizado al Nuevo Codigo Penal).pdf` | 1.0 MB | **En Prod V5** (302) | Cerrada |
| Decreto 35-2013 · `HN:DECRETO_35_2013` | Expediente A04 (Gaceta 33,222, TSC/CEDIJ) | — | **En Prod V5** (19) | Cerrada |
| Decreto 284-2013 · `HN:DECRETO_284_2013` | Transcripción cotejada (Gaceta 33,445) | — | **En Prod V5** (39) | Cerrada |
| **Código Procesal Penal (D.9-99-E)** · `HN:CODIGO_PROCESAL_PENAL` | `CODIGOS/Codigo Procesal Penal (2024).pdf` | 1.0 MB | **En Prod V5** (480; 2026-11-24, firmada D1–D8; legacy 480 ocultas) | Cerrada |
| Código Penal (D.130-2017) · `HN:CODIGO_PENAL` | `CLRA/Decreto_130-2017 CODIGO PENAL.pdf` (Gaceta 34,940); Gacetas de reforma 35,760, 36,290 y 36,595 dentro de `CODIGOS/Codigo Penal Decreto 130-2017 fusionado actualizad_240904_104613.pdf` | 1.3 MB / 15.3 MB | **En Prod V5** (638; 2026-11-24, firmada D1–D8; legacy 635 ocultas) | Cerrada |
| Constitución de la República (D.131-1982) · `HN:CONSTITUCION_REPUBLICA` | `SISTEMA_LEGAL_PRINCIPAL/02_EJERCICIO_LEGAL/05_LEYES_Y_CODIGOS/Constitucion de la Republica (actualizada noviembre 2021).pdf` (la de `S26/` sigue ilegible) | 0.6 MB | **OLA 3 firmada el 2026-11-25** ([expediente](staging/2026-11-24-hn-con-ola3/EXPEDIENTE_AUDITORIA_CON_OLA3.md)): 381 = 378 PRIMARY + 3 derogados; corrige la vigencia de 225, 232, 234 y 377 del legacy 2004 | **3** |
| Código Civil (1906) · `HN:CODIGO_CIVIL` | Base: edición PJ «CodigoCivil(Actualizado2014).pdf» (la del legacy); prevalece La Gaceta 33,222 (D.35-2013); `CLRA/CODIGO CIVIL (CON REFORMAS).pdf` (CSJ) solo como cotejo | 2.1 MB | **OLA 4 firmada D1–D8** (2026-11-24; pendiente de ejecución) ([expediente](staging/2026-11-24-hn-cc-ola4/EXPEDIENTE_AUDITORIA_CC_OLA4.md)): 2,372 = 1,992 PRIMARY + 378 derogados + 2 pendientes. Las 371 derogaciones legacy sí citan decreto (315 confirmadas por La Gaceta); hallazgos: 252–260 derogados mostrados vigentes, 307 y 397 derogados sin constar en La Gaceta | **4** |
| Código de Familia (D.76-84) · `HN:CODIGO_FAMILIA` | `CODIGOS/Codigo de Familia (Actualizado con Reformas Ley de Adopciones).pdf` (CEDIJ, oct-2023); prevalece La Gaceta 33,222 (D.35-2013) | 0.7 MB | **OLA 5 firmada D1–D8** (2026-11-24, segunda firma: D5 cerrado por el art. 63 del D.102-2018; pendiente de ejecución) ([expediente](staging/2026-11-24-hn-cf-ola5/EXPEDIENTE_AUDITORIA_CF_OLA5.md)): 379 = 298 PRIMARY + 1 CONTEXT vigente + 80 derogados. De los 330 legacy «no vigentes», 253 son vigentes; faltaban 6 artículos (70-A a 70-D, 122-A, 175-A) | **5** |
| Código Procesal Civil (D.211-2006) · `HN:CODIGO_PROCESAL_CIVIL` | `CODIGOS/Codigo Procesal Civil (2018).pdf` (CEDIJ, feb-2024) | 1.9 MB | **OLA 6 firmada D1–D8** (2026-11-24, nueva firma sobre el paquete corregido; pendiente de ejecución) ([expediente](staging/2026-11-24-hn-cpc-ola6/EXPEDIENTE_AUDITORIA_CPC_OLA6.md)): 932 = 931 PRIMARY + 1 CONTEXT (art. 40, no impreso en la edición). Oculta 3 capas (legacy 932 + espejo 932 + cpc_base 995); conserva el comentario de Romero | **6** |
| Código del Trabajo (D.189-59) · `HN:CODIGO_TRABAJO` | `CODIGOS/Codigo del Trabajo (mayo 2018).pdf` (CEDIJ, oct-2023); el legacy sale de `CLRA/Código del trabajo y sus reformas.pdf` (2003) | 2.7 MB | **OLA 7 firmada D1–D8** (2026-11-24; pendiente de ejecución) ([expediente](staging/2026-11-24-hn-ct-ola7/EXPEDIENTE_AUDITORIA_CT_OLA7.md)): 877 = 863 PRIMARY + 3 CONTEXT (reforma tácita) + 11 derogados; el legacy muestra vigentes 11 derogados y le faltan 7 artículos | **7** |
| Código de Comercio (D.73-50) | `S26/codigo del comercio.pdf` (ilegible, nube); A01 y copias locales = compilación CSJ de 2003 | 1.4 MB | **OLA 8 pausada por el CLO** hasta la edición consolidada del CEDIJ ([dictamen](staging/2026-11-24-hn-com-ola8/DICTAMEN_FUENTE_COMERCIO_OLA8.md)): solo hay la compilación de 2003, anterior al D.284-2013 y demás reformas; 0 filas en producción | **8** |
| Código Tributario (D.170-2016) · `HN:CODIGO_TRIBUTARIO` | `CODIGOS/Codigo Tributario (2024).pdf` (sep-2024) | 1.0 MB | **Paquete OLA 9 firmado D1–D8 (2026-11-24; pendiente de ejecución)** ([expediente](staging/2026-11-24-hn-ctrib-ola9/EXPEDIENTE_AUDITORIA_CTRIB_OLA9.md)): 215 = 214 PRIMARY + 1 CONTEXT (art. 167); el legacy (SAR 2019) no tiene las reformas del D.180-2020 | **9** |
| Código del Notariado (D.353-2005) · `HN:LEY_NOTARIADO` | `CLRA/Codigo-del-Notariado.pdf` (CEDIJ, con D.77-2006) | 0.2 MB | **Paquete OLA 10 firmado D1–D8 (2026-11-24; pendiente de ejecución)** ([expediente](staging/2026-11-24-hn-not-ola10/EXPEDIENTE_AUDITORIA_NOT_OLA10.md)): 94 = 90 PRIMARY + 4 derogados; corrige la vigencia de 11, 27 y 93. Reglamento (111) y D.77-2006 (6) no se tocan | **10** |
| Ley Especial de Adopciones (D.102-2018) · `HN:LEY_ADOPCIONES` | `SISTEMA_LEGAL_PRINCIPAL/…/Ley-Especial-de-Adopciones-DINAF.pdf` (DINAF 2019; el de `S26/` es ilegible) | 1.0 MB | **Paquete OLA 11 firmado D1–D8 (2026-11-24; pendiente de ejecución)** ([expediente](staging/2026-11-24-hn-adop-ola11/EXPEDIENTE_AUDITORIA_ADOP_OLA11.md)): 64 PRIMARY; su art. 63 cierra la revisión D5 de la OLA 5 | **11** |
| Ley de Organización y Atribuciones de los Tribunales · `HN:LEY_ORGANIZACION_TRIBUNALES` | `CLRA/LEY DE ORGANIZACIÓN Y ATRIBUCIONES DE LOS TRIBUNALES (ACTUALIZADA-07).pdf` (CEDIJ 2007) | 0.6 MB | **OLA 12 firmada D1–D8** (2026-11-24; pendiente de ejecución) ([expediente](staging/2026-11-24-hn-loat-ola12/EXPEDIENTE_AUDITORIA_LOAT_OLA12.md)): 264 = 228 PRIMARY + 12 CONTEXT + 24 derogados (194–217) | **12** |
| Ley de la Jurisdicción de lo Contencioso Administrativo | `CLRA/LEY DE JURISDICCIÓN DE LO CONTENCIOSO Y ADMINISTRATIVO.pdf` | 0.4 MB | Pendiente (0 identificadas) | **11** |
| Ley de Propiedad (D.82-2004) · `HN:LEY_PROPIEDAD` | `CLRA/Ley_de_la_Propiedad.pdf` (CSJ 2007); reformas 2009–2012 solo escaneadas | 0.5 MB | **OLA 12 firmada D1–D8** (2026-11-24; pendiente de ejecución) ([expediente](staging/2026-11-24-hn-lp-ola12/EXPEDIENTE_AUDITORIA_LP_OLA12.md)): 142 = 137 PRIMARY + 5 CONTEXT (reformas no integradas) | **12** |
| Ley de Garantías Mobiliarias (D.182-2009) | `S26/…` ilegible; `SISTEMA_LEGAL_PRINCIPAL/…/Ley de Garantias Mobiliarias.pdf` = escaneo sin texto | 5.5 MB | **Bloqueada**: requiere OCR o una edición con texto | **12** |
| Ley Especial contra el Lavado de Activos (D.144-2014) · `HN:LEY_LAVADO_ACTIVOS` | La Gaceta 33,718 (PDF nativo) en `LAV/LEY-APNFDS-Y-LAVADO-DE-ACTIVOS-HONDURAS.pdf`; la copia del inventario es un escaneo | 3.0 MB | **OLA 12 firmada D1–D8** (2026-11-24; pendiente de ejecución) ([expediente](staging/2026-11-24-hn-la-ola12/EXPEDIENTE_AUDITORIA_LA_OLA12.md)): 93 PRIMARY | **12** |
| Ley de Arbitraje y Conciliación | `CLRA/LEY DE ARBITRAJE Y CONCILIACION-repaired.pdf` | 0.1 MB | Pendiente (0 identificadas; archivo «repaired», revisar integridad) | **11** |
| Ley de Transparencia y Acceso a la Información (D.170-2006) | `CLRA/Decreto-170-2006-Ley_de_Transparencia_VersionoficialDiarioLaGaceta.pdf` (Gaceta) | 5.0 MB | Pendiente (0 identificadas) | **11** |
| Ley de Propiedad Industrial | `CLRA/LEY DE PROPIEDAD INDUSTRIAL (actualizada-07).pdf` | 0.5 MB | Pendiente (0 identificadas) | **11** |
| Ley Electoral (D.35-2021) | `CLRA/Ley_Electoral_y_Leyes_Relacionadas_DECRETO_No_35_2021.pdf` | 1.8 MB | Pendiente (0 identificadas) | **11** |
| CAUCA (Código Aduanero Uniforme Centroamericano) | `CLRA/CODIGO DE ADUANA UNIFORME CENTROAMERICANO.pdf` | 1.0 MB | Pendiente (0 identificadas) | **11** |
| Ley sobre Justicia Constitucional (D.244-2003) · `HN:LEY_JUSTICIA_CONSTITUCIONAL` | `Email attachments/Documentos/AMPARO RECURSOS/Ley-Sobre-Justicia-Constitucional.pdf` (CEDIJ 2007) | 0.2 MB | **OLA 12 firmada D1–D8** (2026-11-24; pendiente de ejecución) ([expediente](staging/2026-11-24-hn-ljc-ola12/EXPEDIENTE_AUDITORIA_LJC_OLA12.md)): 124 PRIMARY; sustituye 124 legacy | **12** |
| Reglamentos sectoriales (27 archivos en `CODIGOS/`: penitenciario, fiscalía, ATIC, OABI, APNFD, firmas electrónicas, garantías mobiliarias, tarjetas de crédito, etc.) | `CODIGOS/Reglamento*.pdf`, `Acuerdo 36-2015 …` | 2–25 MB c/u | Pendiente (0 identificados) | **12+** |
| Código Penal de 1983 (derogado) | `CODIGOS/Código Penal de 1983 (octubre 2018 ).pdf` | 1.5 MB | Pendiente; solo histórico/CONTEXT | Histórico |

**Límites del inventario.** Se escanearon el repositorio (`docs/corpus/inbox`, `staging`, `out`) y la carpeta del usuario hasta 6 niveles (PDF/DOCX con nombre normativo). Se excluyeron escritos, actas y material docente. Los DOCX normativos (p. ej., `Codigo del Notariado.-.docx`, `CODIGO PROCESAL CIVIL EXPLICADO CON DEROGATORIAS.docx`) no se listan como fuente por ser versiones editables sin procedencia. Los tamaños son del archivo, no del número de artículos. Solo se han abierto y validado los PDF del CPP (OLA 1) y del Código Penal (OLA 2).

## 3. Criterio del orden de olas

1. **CPP primero:** extractor ya validado y misma fuente que la carga legacy (480/480 hashes iguales), y el saneamiento corrige defectos que hoy están en producción.
2. **Código Penal** después, por su dependencia con el CPP: el D.130-2017 reforma siete artículos del CPP (28, 36, 45, 334, 336, 344 y 432) y añade el 336-A.
3. **Constitución, Civil y Familia:** su legacy está desactualizado o tiene vigencias incoherentes, que es el mayor riesgo de respuesta errónea.
4. **CPC, Trabajo, Comercio y Tributario:** códigos de uso diario. Comercio es la mayor laguna (0 filas).
5. **Notariado y leyes especiales**, y después los reglamentos.

Cada ola reutiliza `scripts/olas/paquete-ola.ts`: el adaptador del instrumento produce las filas clasificadas, y el generador emite los SQL de staging y producción, el manifiesto con huellas y los envoltorios `ejecutar_staging.ps1` / `ejecutar_prod.ps1`. El paquete OLA 1 está en [`staging/2026-11-24-hn-cpp-ola1/EXPEDIENTE_AUDITORIA_CPP_OLA1.md`](staging/2026-11-24-hn-cpp-ola1/EXPEDIENTE_AUDITORIA_CPP_OLA1.md). El paquete OLA 2 está en [`staging/2026-11-24-hn-cp-ola2/EXPEDIENTE_AUDITORIA_CP_OLA2.md`](staging/2026-11-24-hn-cp-ola2/EXPEDIENTE_AUDITORIA_CP_OLA2.md).
