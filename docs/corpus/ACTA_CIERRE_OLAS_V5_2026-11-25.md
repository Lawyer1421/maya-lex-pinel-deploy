# Acta de cierre · Ingesta V5 por olas del corpus hondureño

**Fecha:** 2026-11-25 · **Producción:** `thgrhueckkjdutjvcufp` · **Responsable:** Abg. y Not. Fredy Omar Pinel Flores (CLO / Director Maya Lex)

## 1. Estado reportado en producción

Lecturas de solo lectura del 2026-11-25, por el conector Supabase: `scripts/olas/verificacion-cierre-prod.sql`, la comprobación posterior a la corrección C1 y la revisión de respaldos (§4). Esto es lo que esas consultas reportaron; no es una certificación independiente de la base.

| Control | Resultado |
|---|---|
| Filas V5 visibles | **7,415** de 7,415, en 17 lotes, todos exactos |
| Embedding 384D válido (no nulo ni de ceros) | 7,415 |
| Texto que no coincide con `hash_contenido` (SHA-256) | **0** |
| Filas legacy sustituidas ocultas y marcadas con `sustituido_por_lote` | **8,464** de 8,464 (1,115 de las OLAS 1 y 2; 7,349 de los 12 paquetes del 2026-11-25) |
| Filas legacy sustituidas aún visibles | 0 |
| Filas ocultas con `metadata` NULL | 0 |

## 2. Lotes en producción

| Lote | Instrumento | Filas V5 | Legacy oculto | Pliego |
|---|---|---:|---:|---|
| `A03_CODIGO_NINEZ_01`, `A04_D35_2013_01`, `PILOTO_D284_2013_01` | Lotes previos (2026-11-21) | 360 | — | [inventario de promoción](STAGING_V4_INVENTARIO_Y_PROMOCION_V5_PARA_FIRMA.md) |
| `OLA1_CPP_2024_01` | Código Procesal Penal | 480 | 480 | [OLA 1](staging/2026-11-24-hn-cpp-ola1/) |
| `OLA2_CP_2017_01` | Código Penal | 638 | 635 | [OLA 2](staging/2026-11-24-hn-cp-ola2/) |
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
| **Total** | | **7,415** | **8,464** | |

Ninguna fila legacy se borró. Cada ola dejó su respaldo `biblioteca_vectores_<lote>_backup` y su reversión 99 firmada; la reversión no se ha ejecutado.

Los SQL que se corrieron, con sus huellas, están en [`produccion-ejecutada/`](produccion-ejecutada/README.md).

## 3. Quién ejecutó cada ola y cuándo

**Quién.** Lo indica el informe del CLO en la sesión de trabajo. Los `ejecutar_prod.ps1` se conectan con la `DATABASE_URL` que el CLO teclea oculta, y la base no registra a la persona.

**Cuándo.** Es la hora de carga del paso 01 de cada lote, tomada de `created_at`. La base no guarda la hora de los pasos 00, 02 y 03 ni de C1, porque `track_commit_timestamp` está desactivado. Honduras está en UTC−6.

| Lote | Ejecutó | Carga (paso 01), UTC | Hora de Honduras |
|---|---|---|---|
| `A03_CODIGO_NINEZ_01` (150 filas, arts. 1 a 145 con sus bis) | CLO, SQL Editor: `01_promocion_v5_datos.sql` completo, en una transacción | 2026-11-21 20:05:28 | 2026-11-21 14:05 |
| `A03` (152), `A04_D35_2013_01` (19) y `PILOTO_D284_2013_01` (39) | CLO, vía `ligeros/` (`01_datos_01` a `08`, ocho transacciones) | 2026-11-24 14:30:50 a 14:30:52 | 2026-11-24 08:30 |
| `OLA1_CPP_2024_01` | CLO, `out/ola1-cpp/ejecutar_prod.ps1` | 2026-11-24 22:10:15 | 2026-11-24 16:10 |
| `OLA2_CP_2017_01` | CLO, `out/ola2-cp/ejecutar_prod.ps1` | 2026-11-24 22:19:21 | 2026-11-24 16:19 |
| `OLA3_CON_2021_01` | CLO, `out/ola3-con/ejecutar_prod.ps1` | 2026-11-25 12:50:15 | 2026-11-25 06:50 |
| `OLA4_CC_2014_01` | CLO, `out/ola4-cc/ejecutar_prod.ps1` | 2026-11-25 12:54:43 | 2026-11-25 06:54 |
| `OLA5_CF_2023_01` | CLO, `out/ola5-cf/ejecutar_prod.ps1` | 2026-11-25 12:59:01 | 2026-11-25 06:59 |
| `OLA6_CPC_2024_01` | CLO, `out/ola6-cpc/ejecutar_prod.ps1` | 2026-11-25 13:02:24 | 2026-11-25 07:02 |
| `OLA7_CT_2023_01` | CLO, `out/ola7-ct/ejecutar_prod.ps1` | 2026-11-25 13:05:53 | 2026-11-25 07:05 |
| `OLA9_CTRIB_2024_01` | CLO, `out/ola9-ctrib/ejecutar_prod.ps1` | 2026-11-25 13:08:54 | 2026-11-25 07:08 |
| `OLA10_NOT_2006_01` | CLO, `out/ola10-not/ejecutar_prod.ps1` | 2026-11-25 13:11:34 | 2026-11-25 07:11 |
| `OLA11_ADOP_2019_01` | CLO, `out/ola11-adop/ejecutar_prod.ps1` | 2026-11-25 13:14:05 | 2026-11-25 07:14 |
| `OLA12_LJC_2007_01` | CLO, `out/ola12-ljc/ejecutar_prod.ps1` | 2026-11-25 13:16:17 | 2026-11-25 07:16 |
| `OLA12_LOAT_2007_01` | CLO, `out/ola12-loat/ejecutar_prod.ps1` | 2026-11-25 13:19:28 | 2026-11-25 07:19 |
| `OLA12_LP_2007_01` | CLO, `out/ola12-lp/ejecutar_prod.ps1` | 2026-11-25 13:21:54 | 2026-11-25 07:21 |
| `OLA12_LA_2015_01` | CLO, `out/ola12-la/ejecutar_prod.ps1` | 2026-11-25 14:37:37 | 2026-11-25 08:37 |
| Corrección C1 (marcas OLA 3 y OLA 9) | CLO, `ejecutar_prod.ps1` del dictamen C1 | no registrada | — |
| Blindaje de respaldos (§4) | Claude Code, conector Supabase, por instrucción del CLO | no registrada (2026-11-25) | — |

### Nota sobre la promoción del 2026-11-21 (lotes A03, A04 y piloto D.284-2013)

Esta jornada corresponde a los tres lotes previos, no a las OLAS 1 y 2: esas se cargaron el 2026-11-24 a las 16:10 y 16:19, hora de Honduras, y sus 1,115 filas legacy ocultas no intervienen aquí. El CLO confirmó el 2026-11-25 que usó la vía `ligeros/`. La base lo corrobora, en lectura del 2026-11-25:

- **2026-11-21 a las 20:05:28 UTC:** una sola transacción insertó exactamente las 150 filas del archivo completo `01_promocion_v5_datos.sql`, que son los arts. 1 a 145 de A03 con sus bis. Ese archivo, el del intento que se creyó truncado, llegó a confirmarse entero.
- **2026-11-24:** hubo 8 transacciones entre las 14:30:50 y las 14:30:52 UTC. Coinciden una a una con `ligeros/01_datos_01` a `08`: las filas nuevas de cada una (2, 32, 27, 27, 31, 29, 31 y 31) y sus ids son exactamente las de cada archivo, descontadas las 150 ya presentes. Esas 150 las saltó `ON CONFLICT DO NOTHING`.
- **Embeddings:** que se cargaran con `ligeros/02_emb_*` es lo que reporta el CLO. La base no lo puede confirmar, porque no guarda la hora de los UPDATE de `embedding` (no hay `updated_at` y `track_commit_timestamp` está desactivado).

**«81» frente a 150.** El inventario de promoción (§7) habla de «81 registros ya existentes», pero en la base había 150. La diferencia de 69 no corresponde a derogados ni CONTEXT ni a otro lote de esa jornada:

- **No es una selección:** las 150 filas tienen la mezcla normal del código. Son 24 PRIMARY vigentes, 103 CONTEXT vigentes, 22 CONTEXT derogados y 1 CONTEXT sin vigencia.
- **No pudo haber un estado intermedio de 81:** las 150 entraron en una sola transacción atómica, así que nunca existió en la base un estado con 81 filas de ese archivo.
- **Conclusión:** la cifra de 81 se anotó mal en el inventario. La correcta es 150.
- **Sin efecto en el resultado:** las 360 filas del lote quedaron activas con hash correcto.

## 4. Incidencias corregidas

**C1 · marca de sustitución.** Las 378 filas legacy de la OLA 3 y las 215 de la OLA 9 tenían `metadata` NULL, y quedaron ocultas sin la marca que usa la reversión 99. El CLO firmó la corrección C1 ([dictamen](staging/2026-11-25-correccion-marca-legacy/DICTAMEN_CORRECCION_MARCA_LEGACY.md), SQL `853a78b7…4dbe`) y la ejecutó con el ejecutor seguro. La verificación posterior confirma las 593 marcas. El generador `scripts/olas/paquete-ola.ts` quedó corregido: usa `coalesce` y comprueba cuántas filas quedan marcadas.

**Blindaje de respaldos.** Revisión del 2026-11-25 de las 15 tablas `public.biblioteca_vectores_*_backup`.

- **Antes:** 14 tenían RLS desactivado; solo la del 2026-11-21 lo tenía activo. `anon` y `authenticated` no podían leer ni escribir filas en ninguna. Sí tenían `TRUNCATE`, `REFERENCES`, `TRIGGER` y `MAINTAIN` en las 15, y RLS no impide `TRUNCATE`.
- **Corrección:** [`2026-11-25_blindaje_respaldos_prod.sql`](produccion-ejecutada/2026-11-25_blindaje_respaldos_prod.sql) activó RLS sin políticas y revocó todos los privilegios de `anon` y `authenticated`.
- **Después:** las 15 tienen RLS activo, 0 políticas y ningún privilegio para `anon` ni `authenticated`. Solo conservan acceso `postgres`, que es el dueño, y `service_role`. Las 7,415 filas V5 siguen visibles.
- **Olas futuras:** el paso 00 de `paquete-ola.ts` ya crea el respaldo así.

## 5. Pendientes que quedan abiertos

1. **Reserva 4.2 de la OLA 3:** la nota 120 de la edición atribuye al art. 374 una constancia de interpretación que en realidad se refiere al 373 (D.169-86). Falta cotejarla contra La Gaceta.
2. **OLA 8, Código de Comercio:** pausada por el CLO hasta disponer de la edición CEDIJ ([dictamen de fuente](staging/2026-11-24-hn-com-ola8/DICTAMEN_FUENTE_COMERCIO_OLA8.md)).
3. **Ley de Garantías Mobiliarias:** bloqueada; solo hay una versión escaneada y hace falta OCR.
4. **Reformas posteriores al corte de cada edición:** quedan para revisión incremental, según las reservas de cada expediente. Por ejemplo, las reformas constitucionales de 2022 a 2026 y las reformas de 2009 a 2012 de la Ley de Propiedad (D5).

## 6. Herramientas de auditoría

- `scripts/olas/paquete-ola.ts`: genera los paquetes.
- `scripts/olas/ejecutar-sql.ts`: ejecutor seguro. Verifica el project ref, la huella SHA-256 de cada SQL y la firma en la línea **Estado** del pliego.
- `scripts/olas/verificar-firmadas.ts`: control de no regresión del extractor común `cedij.ts`, con el extractor fijado en xpdf 4.06.
- `scripts/olas/verificacion-cierre-prod.sql`: lectura de cierre.
- `docs/corpus/produccion-ejecutada/`: copia de los SQL ejecutados en producción, con sus huellas.
- `docs/corpus/INVENTARIO_OLAS_V5_2026-11-24.md`: inventario de fuentes y olas.
