# Inventario de staging V4 y plan de promoción controlada a V5

**Estado:** promoción V5 cerrada según resultado comunicado · **Corte del cierre:** 2026-11-24
**Staging autorizado:** `mayalexhn-staging` · project ref `aicakncgtuiiuomflkqj`
**Producción objetivo:** project ref `thgrhueckkjdutjvcufp`
**Ejecución en producción:** reportada por el usuario; 360 filas activas en V5 y 0 pendientes. No se verificó la base de forma independiente en esta sesión.

## 1. Alcance y calidad de la evidencia

Este inventario reúne los lotes normativos con constancia explícita de V4 en staging en los expedientes revisados y el resultado comunicado por el CLO para A03. **No certifica el inventario completo de `biblioteca_vectores`**: esta sesión no consultó la base de staging y el inventario maestro disponible tiene corte 2026-10-24, anterior a estos cierres. La consulta de solo lectura a producción no pudo establecer conteos (endpoint REST respondió HTTP 401), por lo que el estado previo no quedó verificado independientemente; el resultado posterior comunicado se registra en §7.

La promoción V4→V5 significa producción según [`estados.ts`](../../lib/ingesta-oficial/estados.ts). Las firmas D8 originales autorizaban V3→V4 en staging; la autorización posterior para el alcance exacto de 360 filas queda asentada en §5. El resultado de producción comunicado tras la ejecución se registra en §7.

## 2. Inventario consolidado de lotes V4

| Instrumento / lote | Filas | Estado reportado | Distribución de rol y vigencia | Integridad | Evidencia y límite |
|---|---:|---|---|---|---|
| Código de la Niñez, `HN:CODIGO_NINEZ` · `A03_CODIGO_NINEZ_01` | 302 | V4; 302 visibles | 136 PRIMARY elegibles; 141 CONTEXT vigentes; 24 CONTEXT derogados; 1 CONTEXT con vigencia NULL (art. 21, C07) | 302 embeddings; 302 hashes coincidentes | Resultado comunicado por el CLO el 2026-11-21 tras ejecutar `visibilidad_staging.sql`; no se consultó la base de forma independiente en esta sesión. Los PR #166 y #167 constan fusionados en `main`. |
| Decreto 35-2013 · `A04_D35_2013_01` | 19 | V4; 19 visibles | 8 principales elegibles; 11 CONTEXT (arts. 1–11) | 19 embeddings; hash verificado para las 19 filas tras v8 | Constancias de staging y actualización v8 en [`ADJUDICACION_CLO_D35_2013.md`](staging/2026-11-05-hn-001-a04-orientacion/ADJUDICACION_CLO_D35_2013.md). La D8 original limitaba V4 a staging; la autorización posterior de promoción consta en §5. |
| Decreto 284-2013 · `PILOTO_D284_2013_01` | 39 | V4; 39 visibles | 35 elegibles; 4 CONTEXT (arts. 13, 14, 26 y 27) | 39 embeddings; 39 hashes coincidentes tras normalización LF | Aplicación y verificación documentadas en [`ADJUDICACION_CLO_D284_2013.md`](staging/2026-11-15-hn-d284-2013-piloto/ADJUDICACION_CLO_D284_2013.md). La D8 original limitaba V4 a staging; la autorización posterior de promoción consta en §5. |
| **Subtotal de estos lotes** | **360** | **360 V4 reportadas** | **179 PRIMARY elegibles; 181 CONTEXT** | Ver detalle por lote | Subtotal del conjunto listado; no es un conteo exhaustivo de toda la base. |

Para A03, el pliego está en [`ADJUDICACION_CLO_CODIGO_NINEZ.md`](staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/ADJUDICACION_CLO_CODIGO_NINEZ.md); los verificadores de pre y post visibilidad son [`verificacion_staging.sql`](../../out/a03-codigo-ninez/verificacion_staging.sql) y [`verificacion_post_visibilidad.sql`](staging/2026-11-04-hn-001-tranche-a-drive/canonico-v2/verificacion_post_visibilidad.sql). El expediente de firma D1–D8 y el cambio de guard se fusionaron en `main` (#166 y después #167).

### Fuera del subtotal

- La recepción TSC `HN-001-A04` de 18 artículos tiene estado `CLO_PENDING` en su informe y **no** se cuenta como V4: [`BATCH_REPORT.md`](staging/2026-11-16-hn-001-a04-tsc/BATCH_REPORT.md).
- El informe del receptor Drive HN-001-A03 y el del piloto inicial HN-001-A02 reflejan estados de recepción previos, no reemplazan las constancias posteriores de los lotes canónicos V4.
- La auditoría maestra de 2026-10-24 registró cero V4 y no consultó staging; no debe usarse como corte actual: [`MAYALEX_CORPUS_MASTER_INVENTORY_HN.md`](MAYALEX_CORPUS_MASTER_INVENTORY_HN.md).

## 3. Decisiones y dependencias antes de producción

Los siguientes puntos conservan el registro de los controles definidos antes de la ejecución; el resultado de cierre informado se resume en §7.

1. **Expediente de código cerrado.** Los PR #166 y #167 se fusionaron en `main` en el orden de dependencia solicitado, después de checks CI verdes. No se eludieron las protecciones de rama.
2. **Congelar un snapshot de staging**, solo lectura, apuntando y verificando explícitamente `aicakncgtuiiuomflkqj`. Incluir todos los lotes V4, `ingest_batch`, `norm_id`, ids, versión/fuente canónica, vigencia, rol, embeddings, hashes y discrepancias. Conciliar diferencias con el inventario de la sección 2 y registrar fecha y responsable.
3. **Completar QA del alcance V5.** La autorización de alcance está registrada en §5; revisar por instrumento procedencia, versión canónica, vigencia, derogaciones, excepciones CONTEXT, conflictos de IDs y cambios posteriores antes de ejecutar. Mantener el art. 21 de A03 y las filas CONTEXT/derogadas en sus roles adjudicados.
4. **Preparar una migración de alcance cerrado**, sin copiar toda la base de staging. Para cada lote aprobado: inventariar previamente colisiones en producción; derivar el SQL determinista de la fuente/manifiesto firmados; limitar cada operación a los ids/lotes aprobados; comprobar precondiciones, duplicados, constraints, embeddings y hashes; documentar SHA-256 del SQL, plan de reversión y resultado de ensayo en un clon desechable.
5. **Revisión independiente y preflight de producción.** Revisión técnica de SQL, RLS/permisos, respaldo recuperable/PITR, ventana, monitorización, rollback ensayado y responsables. Verificar el project ref de destino `thgrhueckkjdutjvcufp` inmediatamente antes de ejecutar. Si cualquier condición difiere, abortar.
6. **Autorización y revisión del artefacto.** La autorización de alcance fue comunicada el 2026-11-21 y se registra en §5. Antes de cualquier ejecución, revisar las huellas SHA-256 de §6, confirmar manualmente el project ref en el SQL Editor, comprobar el respaldo/PITR recuperable y definir ventana y rollback.
7. **Aplicación y cierre.** El usuario informó que la ejecución terminó con 360 filas activas en V5 y 0 pendientes; el registro de cierre está en §7. Los conteos de producción no se verificaron de forma independiente en esta sesión.

## 4. Condiciones de no-go

- Falta de snapshot exhaustivo de staging o discrepancia no resuelta con el inventario.
- Huella de artefacto distinta, project ref no confirmado, conflicto de ID, respaldo insuficiente o resultado de precheck distinto del esperado.
- Hash inválido, fila duplicada/conflictiva, embeddings ausentes o roles/vigencia distintos de lo adjudicado.
- Project ref distinto del destino autorizado, respaldo no restaurable o rollback no ensayado.
- Intento de tratar el subtotal de 360 filas como inventario completo o de promover conjuntamente filas no incluidas en el alcance firmado.

## 5. Registro de autorización comunicada

El 2026-11-21 se recibió en esta sesión la siguiente instrucción atribuida al CLO, Abg. y Not. Fredy Omar Pinel Flores: **autoriza formalmente el cierre y la promoción controlada V4→V5 a producción (`thgrhueckkjdutjvcufp`) de los paquetes auditados y cerrados en staging**, así como la auditoría urgente de Luna y el inicio del siguiente bloque de leyes.

Se registra como autorización escrita comunicada por el usuario para el alcance exacto de los tres lotes de §2 (302 + 19 + 39 = 360 filas), con preservación de la distribución PRIMARY/CONTEXT y de la reserva C07. Esta constancia no es una firma criptográfica independiente. El estado previo de producción no pudo verificarse mediante la consulta REST de solo lectura; el resultado comunicado después de la ejecución se consigna en §7.

## 6. Artefactos V5 de promoción y sus verificaciones offline

Fuentes verificadas offline: 360 IDs únicos; 360/360 `sha256(UTF8(contenido)) = hash_contenido`; cobertura exacta de 360 UPDATE de embeddings. El reparto A03 coincide con el pliego (136 PRIMARY vigentes, 141 CONTEXT vigentes, 24 CONTEXT derogados, 1 CONTEXT NULL). **Esto valida los archivos locales, no el estado de la base destino.** Cada archivo está en UTF-8/LF y por debajo de 450 KB.

Para compatibilizar el esquema productivo reportado, `embedding` conserva su restricción `NOT NULL`: los INSERT usan `array_fill(0::real, ARRAY[384])::vector` como marcador temporal, con `revision_pendiente = true`. Los bloques 02 escriben los vectores reales; la transacción 03 rechaza cualquier vector cero antes de activar V5. Los INSERT son `ON CONFLICT DO NOTHING`, por lo que no sobrescriben filas productivas preexistentes.

Orden exacto de ejecución:

1. [`00a_migracion_esquema_prod.sql`](../../out/promocion-v5-2026-11-21/00a_migracion_esquema_prod.sql) valida el esquema base y agrega idempotentemente las cinco columnas, dos índices y las RPC `resolver_articulo_exacto` y `buscar_biblioteca_v3`. No elimina ni actualiza filas; conserva `embedding NOT NULL`. Tiene `lock_timeout` y aborta si el tipo/dimensión de `embedding` o `revision_pendiente` no coincide.
2. [`00_precheck_y_respaldo_prod.sql`](../../out/promocion-v5-2026-11-21/00_precheck_y_respaldo_prod.sql) crea un snapshot de las filas actuales de los tres instrumentos y detiene el flujo ante colisiones de ID con contenido o identidad distintos. El SQL no puede detectar el project ref de la conexión; hay que comprobar `thgrhueckkjdutjvcufp` en la interfaz antes de ejecutarlo. El CTAS es un respaldo de filas, no sustituye PITR ni una prueba de restauración.
3. [`01_promocion_v5_datos.sql`](../../out/promocion-v5-2026-11-21/01_promocion_v5_datos.sql), [`01_promocion_v5_datos_parte_2.sql`](../../out/promocion-v5-2026-11-21/01_promocion_v5_datos_parte_2.sql) y [`01_promocion_v5_datos_parte_3.sql`](../../out/promocion-v5-2026-11-21/01_promocion_v5_datos_parte_3.sql), en orden, cargan los registros ocultos. La última parte comprueba los 360 conteos y hashes.
4. [`02_promocion_v5_emb_01.sql`](../../out/promocion-v5-2026-11-21/02_promocion_v5_emb_01.sql), [`02_promocion_v5_emb_02.sql`](../../out/promocion-v5-2026-11-21/02_promocion_v5_emb_02.sql), [`02_promocion_v5_emb_03.sql`](../../out/promocion-v5-2026-11-21/02_promocion_v5_emb_03.sql) y [`02_promocion_v5_emb_04.sql`](../../out/promocion-v5-2026-11-21/02_promocion_v5_emb_04.sql), en orden, aplican 101 + 101 + 101 + 57 embeddings.
5. [`03_activacion_y_verificacion_v5_prod.sql`](../../out/promocion-v5-2026-11-21/03_activacion_y_verificacion_v5_prod.sql) activa V5 de forma atómica solo si los 360 registros están presentes, ocultos, vectorizados con valor no cero y con SHA-256 correcto; verifica conteos exactos por lote e instrumento.

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `00a_migracion_esquema_prod.sql` | 6,822 | `ed42bba5cff34d092bc6dbc3a4d848b72d0163b7c96d3fd3ffaa30a47f5d0c63` |
| `00_precheck_y_respaldo_prod.sql` | 63,746 | `98a39604ccea8d748ae9bc927986f8e410cbb26b4883fc3966bd894cc6493de4` |
| `01_promocion_v5_datos.sql` | 302,720 | `1c6d124e7238f579cf0ac8a8362df8182606c92e707ca9a73e36cfe8dac4acf8` |
| `01_promocion_v5_datos_parte_2.sql` | 368,847 | `c88d0667b72037e0544ac0c8214bb3cc262ad7447a588ce94887270f80bb4753` |
| `01_promocion_v5_datos_parte_3.sql` | 360,777 | `6fb823349f62f6857b63958883febe2611dbb476748a31ba2631de8d7e260c4e` |
| `02_promocion_v5_emb_01.sql` | 403,451 | `cae69bfcd469a58926328c6166e8d04902fd404fa5cfdec6d7bdcc94226acd8b` |
| `02_promocion_v5_emb_02.sql` | 403,608 | `b85374ea125245d492c6913e9ee728d484850e4446f97cd56568627da6a6d324` |
| `02_promocion_v5_emb_03.sql` | 403,683 | `017b1ffe8345b51962355b62feb2f8d666b42436e1626d62cb00794c2914da39` |
| `02_promocion_v5_emb_04.sql` | 228,707 | `72f724f95150711c950572fe9ac122485250766f6ebdd8d9e1369b551badde7d` |
| `03_activacion_y_verificacion_v5_prod.sql` | 19,371 | `bb20c8ca06514bee065ec6acbdd558552655297d53819c0d3c1f087a24ccddfd` |

## 7. Cierre de promoción V5 en producción

El 2026-11-24, el usuario informó que ejecutó `ejecutar_v5_prod.ps1` y que la consulta final devolvió **360 filas activas en V5**: 302 de `A03_CODIGO_NINEZ_01`, 19 de `A04_D35_2013_01` y 39 de `PILOTO_D284_2013_01`, con **0 pendientes**. Este registro documenta el resultado comunicado; no constituye una verificación independiente de la base productiva ni acredita detalles adicionales de respaldo, hashes o restauración.

Con ese resultado comunicado, se registra cerrada la promoción V5 para el alcance de estos tres lotes. Se retiró el script temporal `out/promocion-v5-2026-11-21/ejecutar_v5_prod.ps1`; los SQL de promoción y sus hashes de §6 se conservan como evidencia del paquete.

### Alternativa para el SQL Editor web: scripts ligeros

Debido a la truncación observada al ejecutar el primer archivo de datos, **usar esta secuencia en lugar de los archivos `01_promocion_v5_datos*.sql` y `02_promocion_v5_emb_*.sql` de la tabla anterior**. No volver a pegar el archivo truncado. Los 81 registros ya existentes se aceptan solo si su identidad, contenido, SHA-256, estado oculto y vector marcador coinciden; de lo contrario, cada bloque de datos aborta. Ejecutar los ocho `01_datos` en orden, luego los diez `02_emb` en orden, y finalmente el mismo [script 03 de activación/verificación](../../out/promocion-v5-2026-11-21/03_activacion_y_verificacion_v5_prod.sql). Los bloques 02 solo sustituyen el vector cero de filas ocultas y se pueden reintentar.

Los `01_datos` tienen como máximo 50 filas y 128,016 bytes (el primer archivo contiene menos filas por el tamaño de un artículo); los `02_emb` tienen 36 UPDATE cada uno y como máximo 145,029 bytes.

| Archivo | Filas / UPDATE | Bytes | SHA-256 |
|---|---:|---:|---|
| `ligeros/01_datos_01.sql` | 12 | 128,016 | `817a70ccc81e5dcc2d277560dc1086c0853be066c4c3d31c12720d891e627c15` |
| `ligeros/01_datos_02.sql` | 49 | 127,098 | `d672ecf8975988ab359e1262e1487b89bf7b51dbb2059fcd3f65f3dfdf34b1b2` |
| `ligeros/01_datos_03.sql` | 49 | 126,960 | `d22e9bf484ba7c2cd0b9cb574a24f32170a6cc921ac5b852a0c50d298b421171` |
| `ligeros/01_datos_04.sql` | 50 | 126,923 | `21fa166725ba912ef9979b2eaec08460b44307898470c5719f615e02de3ae141` |
| `ligeros/01_datos_05.sql` | 50 | 126,392 | `c05e4a05f2b9abd3f20b199124f01cfcf5c9ea5172ec983c31166e31a77ff990` |
| `ligeros/01_datos_06.sql` | 50 | 125,425 | `20794391143c806371c6ec9b08a9c1419af75a25e123e2468e1ccb4a1311c49f` |
| `ligeros/01_datos_07.sql` | 50 | 124,447 | `11c5f81c7b5eb7dd79bf3bf4540c433222b9b1767073e882d6d53747d8ef2a9b` |
| `ligeros/01_datos_08.sql` | 50 | 123,777 | `2d1a0ac78f5c1ee4dcfdc2988afdae790f06c1e32e2d2fdbba6b5e6d9d095d72` |
| `ligeros/02_emb_01.sql` | 36 | 144,901 | `6cf79312fc4273d03766b11563b29d5a27fdc2b8b5beecf5ae7a5181a2c8b494` |
| `ligeros/02_emb_02.sql` | 36 | 144,857 | `e005a3cbbde7f06b98e6b91b8b11bd2706b87e6f437b8298769b1035aaf3ec38` |
| `ligeros/02_emb_03.sql` | 36 | 144,890 | `eb6519578512d0e3b5df4b46018afe8104e293e48efce8e11c365b21c4535324` |
| `ligeros/02_emb_04.sql` | 36 | 144,866 | `4e42babf599c12778657c1d2594bb2465b27674f90378ad81442250f26f1bb6e` |
| `ligeros/02_emb_05.sql` | 36 | 144,876 | `2e2502d21b8ff0afd93a2d0d361dcc7b3ab21067c5d817bc1b10123157f8184a` |
| `ligeros/02_emb_06.sql` | 36 | 144,898 | `a5c242d7f7dbd56fc95de05aa6e07fc54ba8a80ae57f9f4751b7df586ef7c6b7` |
| `ligeros/02_emb_07.sql` | 36 | 144,851 | `1fd282d6048042e5280c18c61469b15bad62d90ef43d022307e0bba1a95cc9fd` |
| `ligeros/02_emb_08.sql` | 36 | 144,889 | `2cc09404dfbd0eabb6fcb61ab74af1f725a860c9e35bc50f09c3e5eed0864c40` |
| `ligeros/02_emb_09.sql` | 36 | 144,820 | `b2cff71dfae84da55baf56a82b33666838b8b3988070d24cd1755036b78f7659` |
| `ligeros/02_emb_10.sql` | 36 | 145,029 | `2df9b188c5341b05372e21805204d3981dd0bfef165875257bb273b947a55956` |
