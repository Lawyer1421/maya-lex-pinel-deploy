# SQL ejecutado en producción (`thgrhueckkjdutjvcufp`)

Copias byte a byte (UTF-8, LF) de los archivos SQL que se corrieron en producción. Sirven para que el repositorio refleje la base real. Este directorio es **evidencia**: no se vuelve a ejecutar. Los ejecutores y las reversiones 99, que no se corrieron, siguen en los paquetes `out/`, que no se versionan.

Verificación al copiar (2026-11-25): cada huella coincide con la del manifiesto que el ejecutor seguro comprobó antes de correr el archivo, y con la que cita el pliego firmado. En la promoción del 2026-11-21, coincide con el inventario de promoción.

`.gitattributes` fija LF: sin él, `core.autocrlf=true` cambiaría las huellas al hacer checkout en Windows.

## 1. Promoción V5 del 2026-11-21 (A03, A04 y piloto D.284-2013)

Pliego: [`STAGING_V4_INVENTARIO_Y_PROMOCION_V5_PARA_FIRMA.md`](../STAGING_V4_INVENTARIO_Y_PROMOCION_V5_PARA_FIRMA.md) §6 y §7.

**Qué consta y qué no:**
- **Constan** `00a_migracion_esquema_prod.sql`, `00_precheck_y_respaldo_prod.sql` y `03_activacion_y_verificacion_v5_prod.sql`. Ambas vías los usan. Evidencia en la base:
  - **`00a`:** el md5 del cuerpo de `resolver_articulo_exacto` (`ec9a0d25…`) y de `buscar_biblioteca_v3` (`96e6ad99…`) coincide exactamente con los de 00a pegados con CRLF. No coincide con `supabase/migrations/20261107010000_*` ni con `20261115000000_*`, así que esas dos RPC de producción **no** corresponden a las migraciones del repositorio.
  - **`00`:** existe `biblioteca_vectores_v5_20261121_backup`.
  - **`03`:** hay 360 filas V5 activas.
- **No consta** cuál de las dos vías de carga se completó: los `01_*`/`02_*` completos o los `ligeros/` para el SQL Editor. Se incluyen ambas.
- **Lo que sí muestra la base (`created_at`):** 150 filas de A03 se crearon el 2026-11-21 a las 20:05:28 UTC. Las 210 restantes (152 de A03, 19 de A04 y 39 del piloto) se crearon el 2026-11-24 entre las 14:30:50 y las 14:30:52 UTC.
- **Discrepancia con el inventario:** §7 del inventario de promoción habla de «81 registros ya existentes», pero la base muestra 150 filas del 2026-11-21.
- El CLO debe confirmar qué vía usó.

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `2026-11-21-promocion-v5/00_precheck_y_respaldo_prod.sql` | 63,746 | `98a39604ccea8d748ae9bc927986f8e410cbb26b4883fc3966bd894cc6493de4` |
| `2026-11-21-promocion-v5/00a_migracion_esquema_prod.sql` | 6,822 | `ed42bba5cff34d092bc6dbc3a4d848b72d0163b7c96d3fd3ffaa30a47f5d0c63` |
| `2026-11-21-promocion-v5/01_promocion_v5_datos.sql` | 302,720 | `1c6d124e7238f579cf0ac8a8362df8182606c92e707ca9a73e36cfe8dac4acf8` |
| `2026-11-21-promocion-v5/01_promocion_v5_datos_parte_2.sql` | 368,847 | `c88d0667b72037e0544ac0c8214bb3cc262ad7447a588ce94887270f80bb4753` |
| `2026-11-21-promocion-v5/01_promocion_v5_datos_parte_3.sql` | 360,777 | `6fb823349f62f6857b63958883febe2611dbb476748a31ba2631de8d7e260c4e` |
| `2026-11-21-promocion-v5/02_promocion_v5_emb_01.sql` | 403,451 | `cae69bfcd469a58926328c6166e8d04902fd404fa5cfdec6d7bdcc94226acd8b` |
| `2026-11-21-promocion-v5/02_promocion_v5_emb_02.sql` | 403,608 | `b85374ea125245d492c6913e9ee728d484850e4446f97cd56568627da6a6d324` |
| `2026-11-21-promocion-v5/02_promocion_v5_emb_03.sql` | 403,683 | `017b1ffe8345b51962355b62feb2f8d666b42436e1626d62cb00794c2914da39` |
| `2026-11-21-promocion-v5/02_promocion_v5_emb_04.sql` | 228,707 | `72f724f95150711c950572fe9ac122485250766f6ebdd8d9e1369b551badde7d` |
| `2026-11-21-promocion-v5/03_activacion_y_verificacion_v5_prod.sql` | 19,371 | `bb20c8ca06514bee065ec6acbdd558552655297d53819c0d3c1f087a24ccddfd` |
| `2026-11-21-promocion-v5/ligeros/01_datos_01.sql` | 128,016 | `817a70ccc81e5dcc2d277560dc1086c0853be066c4c3d31c12720d891e627c15` |
| `2026-11-21-promocion-v5/ligeros/01_datos_02.sql` | 127,098 | `d672ecf8975988ab359e1262e1487b89bf7b51dbb2059fcd3f65f3dfdf34b1b2` |
| `2026-11-21-promocion-v5/ligeros/01_datos_03.sql` | 126,960 | `d22e9bf484ba7c2cd0b9cb574a24f32170a6cc921ac5b852a0c50d298b421171` |
| `2026-11-21-promocion-v5/ligeros/01_datos_04.sql` | 126,923 | `21fa166725ba912ef9979b2eaec08460b44307898470c5719f615e02de3ae141` |
| `2026-11-21-promocion-v5/ligeros/01_datos_05.sql` | 126,392 | `c05e4a05f2b9abd3f20b199124f01cfcf5c9ea5172ec983c31166e31a77ff990` |
| `2026-11-21-promocion-v5/ligeros/01_datos_06.sql` | 125,425 | `20794391143c806371c6ec9b08a9c1419af75a25e123e2468e1ccb4a1311c49f` |
| `2026-11-21-promocion-v5/ligeros/01_datos_07.sql` | 124,447 | `11c5f81c7b5eb7dd79bf3bf4540c433222b9b1767073e882d6d53747d8ef2a9b` |
| `2026-11-21-promocion-v5/ligeros/01_datos_08.sql` | 123,777 | `2d1a0ac78f5c1ee4dcfdc2988afdae790f06c1e32e2d2fdbba6b5e6d9d095d72` |
| `2026-11-21-promocion-v5/ligeros/02_emb_01.sql` | 144,901 | `6cf79312fc4273d03766b11563b29d5a27fdc2b8b5beecf5ae7a5181a2c8b494` |
| `2026-11-21-promocion-v5/ligeros/02_emb_02.sql` | 144,857 | `e005a3cbbde7f06b98e6b91b8b11bd2706b87e6f437b8298769b1035aaf3ec38` |
| `2026-11-21-promocion-v5/ligeros/02_emb_03.sql` | 144,890 | `eb6519578512d0e3b5df4b46018afe8104e293e48efce8e11c365b21c4535324` |
| `2026-11-21-promocion-v5/ligeros/02_emb_04.sql` | 144,866 | `4e42babf599c12778657c1d2594bb2465b27674f90378ad81442250f26f1bb6e` |
| `2026-11-21-promocion-v5/ligeros/02_emb_05.sql` | 144,876 | `2e2502d21b8ff0afd93a2d0d361dcc7b3ab21067c5d817bc1b10123157f8184a` |
| `2026-11-21-promocion-v5/ligeros/02_emb_06.sql` | 144,898 | `a5c242d7f7dbd56fc95de05aa6e07fc54ba8a80ae57f9f4751b7df586ef7c6b7` |
| `2026-11-21-promocion-v5/ligeros/02_emb_07.sql` | 144,851 | `1fd282d6048042e5280c18c61469b15bad62d90ef43d022307e0bba1a95cc9fd` |
| `2026-11-21-promocion-v5/ligeros/02_emb_08.sql` | 144,889 | `2cc09404dfbd0eabb6fcb61ab74af1f725a860c9e35bc50f09c3e5eed0864c40` |
| `2026-11-21-promocion-v5/ligeros/02_emb_09.sql` | 144,820 | `b2cff71dfae84da55baf56a82b33666838b8b3988070d24cd1755036b78f7659` |
| `2026-11-21-promocion-v5/ligeros/02_emb_10.sql` | 145,029 | `2df9b188c5341b05372e21805204d3981dd0bfef165875257bb273b947a55956` |

## 2. Olas V5 (pasos 00 a 03 de cada paquete)

Cada ola se corrió con su `ejecutar_prod.ps1`, a través de `scripts/olas/ejecutar-sql.ts`. Antes de conectar, el ejecutor comprueba el project ref, la huella de cada SQL y la firma en la línea **Estado** del pliego.


### OLA 1 · Código Procesal Penal · `OLA1_CPP_2024_01`

Pliego: [`EXPEDIENTE_AUDITORIA_CPP_OLA1.md`](../staging/2026-11-24-hn-cpp-ola1/EXPEDIENTE_AUDITORIA_CPP_OLA1.md)

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `ola1-cpp/00_precheck_y_respaldo_prod.sql` | 1,665 | `5fcab209c3611a996c7d27b0ca2d2837a105194c1ea99a936a106206987752e5` |
| `ola1-cpp/01_datos_prod.sql` | 1,125,907 | `8f2dbdc5a9aa0b0854d8a35ccc2a6f5c1d4977288079c0adcedfff9c29e839b2` |
| `ola1-cpp/02_embeddings_prod.sql` | 1,872,394 | `24f73be41461a75b5d6055707a25517e891c9336564a698849486a7a63b6051f` |
| `ola1-cpp/03_activacion_v5_prod.sql` | 28,559 | `c78ee730f85a5ea776f2045381168231dcf294edca64ef84f764b4a4f6b4eb11` |

### OLA 2 · Código Penal · `OLA2_CP_2017_01`

Pliego: [`EXPEDIENTE_AUDITORIA_CP_OLA2.md`](../staging/2026-11-24-hn-cp-ola2/EXPEDIENTE_AUDITORIA_CP_OLA2.md)

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `ola2-cp/00_precheck_y_respaldo_prod.sql` | 1,609 | `0a9de324b303c0a4850f371c216f818146d11d47a5d06eb462e0e78fe99865da` |
| `ola2-cp/01_datos_prod.sql` | 1,684,532 | `7ebc9749d03bd413d547ecfc94ecc912bb9d1deb8c827702672609d273790900` |
| `ola2-cp/02_embeddings_prod.sql` | 2,481,719 | `6699bd8f73ed19141a24b410e353c1043026e70f6560609163e0d356bfe328be` |
| `ola2-cp/03_activacion_v5_prod.sql` | 31,162 | `c46f4e53ced798b4c180189116f2c57741a8af96cd5911bb8583f5175d7325c2` |

### OLA 3 · Constitución · `OLA3_CON_2021_01`

Pliego: [`EXPEDIENTE_AUDITORIA_CON_OLA3.md`](../staging/2026-11-24-hn-con-ola3/EXPEDIENTE_AUDITORIA_CON_OLA3.md)

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `ola3-con/00_precheck_y_respaldo_prod.sql` | 1,574 | `06f5002cb6d8d0f95945c90b77ba9808421fcc280869e3deab355e881cce69ba` |
| `ola3-con/01_datos_prod.sql` | 731,446 | `88f88a9286ad847f30ef1cadeaa8de5a1cf3f5829618cc8539522e4626d5be0b` |
| `ola3-con/02_embeddings_prod.sql` | 1,485,962 | `8fd34e8d8a81532ebfaa1bdeeb3031b73fc398a56985fa9e910193c68e7348bc` |
| `ola3-con/03_activacion_v5_prod.sql` | 26,305 | `b738c4c3e74b8aea108a9b17f4e5ceb9507f8dd9d78ff650f7c57131408d1337` |

### OLA 4 · Código Civil · `OLA4_CC_2014_01`

Pliego: [`EXPEDIENTE_AUDITORIA_CC_OLA4.md`](../staging/2026-11-24-hn-cc-ola4/EXPEDIENTE_AUDITORIA_CC_OLA4.md)

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `ola4-cc/00_precheck_y_respaldo_prod.sql` | 1,623 | `a3a7f3ae99d448bfbac89d4a5454959426315e57e4712a9c156018d68cf94399` |
| `ola4-cc/01_datos_prod.sql` | 6,060,392 | `edc5b9008e3683277be1938b6a392fa49d37bf7e118c59da0b586677a70b2ff9` |
| `ola4-cc/02_embeddings_prod.sql` | 9,220,325 | `fdf68e370cabb97dc83db6a2bafe4766c36b7f06a4628cd2aced72b3ba1fb930` |
| `ola4-cc/03_activacion_v5_prod.sql` | 96,811 | `5bcbc8dbfcadc24921c2919679fbb997e3463630ea0270a996a158cdedf5d631` |

### OLA 5 · Código de Familia · `OLA5_CF_2023_01`

Pliego: [`EXPEDIENTE_AUDITORIA_CF_OLA5.md`](../staging/2026-11-24-hn-cf-ola5/EXPEDIENTE_AUDITORIA_CF_OLA5.md)

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `ola5-cf/00_precheck_y_respaldo_prod.sql` | 1,623 | `7f721a71ed464a8552e9ccccd7bd5c221c42f1037aa6dfb244405a8a86a55ee0` |
| `ola5-cf/01_datos_prod.sql` | 677,300 | `19f857ac6ca4dcaa245763823b1f9426587ea5f2be8f1dd13d025482ab1b95a8` |
| `ola5-cf/02_embeddings_prod.sql` | 1,474,984 | `0d132b95894db24f5a93fb6d1460e5ba7eaf8b45d9a21e512ed3ebba2cc85115` |
| `ola5-cf/03_activacion_v5_prod.sql` | 24,772 | `def63d883613ccaf2e507e973efc0591d8e3c1e15410f1fced05843860a43f58` |

### OLA 6 · Código Procesal Civil · `OLA6_CPC_2024_01`

Pliego: [`EXPEDIENTE_AUDITORIA_CPC_OLA6.md`](../staging/2026-11-24-hn-cpc-ola6/EXPEDIENTE_AUDITORIA_CPC_OLA6.md)

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `ola6-cpc/00_precheck_y_respaldo_prod.sql` | 1,861 | `fb2716e608062885a7a809ba2c94a9c7939ad3b3830188f8d01b2e4f753d3f60` |
| `ola6-cpc/01_datos_prod.sql` | 1,858,352 | `20aefc16643b6dd7af05d762590edb77e6bcc59b547db57ab2fabc487ff4130b` |
| `ola6-cpc/02_embeddings_prod.sql` | 3,635,380 | `dfda6e0c8b647ffda6286365c6c2606a05c56f7c2d7967a9f7838420fdc3654f` |
| `ola6-cpc/03_activacion_v5_prod.sql` | 48,605 | `81369d9043109aa07402141eeb4e80aff319270f216cafc0b39623964cd67533` |

### OLA 7 · Código del Trabajo · `OLA7_CT_2023_01`

Pliego: [`EXPEDIENTE_AUDITORIA_CT_OLA7.md`](../staging/2026-11-24-hn-ct-ola7/EXPEDIENTE_AUDITORIA_CT_OLA7.md)

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `ola7-ct/00_precheck_y_respaldo_prod.sql` | 1,623 | `59439b98e68b70af6f8389251ae357c99cb0940dfdc6df4fad3e68467539ae09` |
| `ola7-ct/01_datos_prod.sql` | 1,612,384 | `9d09e5242c6249fb1845268b7360d9b333ec56b99cfccdeb67aabc8f338ba4e9` |
| `ola7-ct/02_embeddings_prod.sql` | 3,410,750 | `2d7e8847fd7780821f880f4b67310be0dbbab9a98d8858f6979cb9734e5ac8c2` |
| `ola7-ct/03_activacion_v5_prod.sql` | 41,674 | `505647ca43b83768e9a7bec740a84cb720a1d717dff415720bece74fbd842a55` |

### OLA 9 · Código Tributario · `OLA9_CTRIB_2024_01`

Pliego: [`EXPEDIENTE_AUDITORIA_CTRIB_OLA9.md`](../staging/2026-11-24-hn-ctrib-ola9/EXPEDIENTE_AUDITORIA_CTRIB_OLA9.md)

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `ola9-ctrib/00_precheck_y_respaldo_prod.sql` | 1,569 | `ad916a7174ba4460929f2c07dbcd3f14e4a4c4e968c65ac7c3d3943ca74b6e02` |
| `ola9-ctrib/01_datos_prod.sql` | 582,090 | `7d0c653bcdf90991a7b12673ac7fd963b58f7dee66a89c5dee6f3cb50c79c6e2` |
| `ola9-ctrib/02_embeddings_prod.sql` | 838,995 | `c0d35972416fa978ab7dfe817de127631d42b7862abec3d04f3be88a4a986134` |
| `ola9-ctrib/03_activacion_v5_prod.sql` | 16,278 | `eb2ab87642a9d02f046ede2ca9e856b22bc6233523e6c86198be9c2da3d424ea` |

### OLA 10 · Código del Notariado · `OLA10_NOT_2006_01`

Pliego: [`EXPEDIENTE_AUDITORIA_NOT_OLA10.md`](../staging/2026-11-24-hn-not-ola10/EXPEDIENTE_AUDITORIA_NOT_OLA10.md)

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `ola10-not/00_precheck_y_respaldo_prod.sql` | 1,561 | `26a22ce489b69183a13dfd84450ec70bc533562a141f3e03eb3737b544c1fbd3` |
| `ola10-not/01_datos_prod.sql` | 168,439 | `c8aa74fa1df6e7e25479f7f9d84356cc5d00a27ac26c6c056a957ba47f6fc57f` |
| `ola10-not/02_embeddings_prod.sql` | 366,460 | `0b92cac06d58eca96adef2a76ffbb2de31d39397a323636c8b5c895976b3c1fa` |
| `ola10-not/03_activacion_v5_prod.sql` | 10,252 | `c0c0db6f369809be2cb76b95e5db0788b97ebec0149a78fed7d0e02bbf8bdc4e` |

### OLA 11 · Ley Especial de Adopciones · `OLA11_ADOP_2019_01`

Pliego: [`EXPEDIENTE_AUDITORIA_ADOP_OLA11.md`](../staging/2026-11-24-hn-adop-ola11/EXPEDIENTE_AUDITORIA_ADOP_OLA11.md)

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `ola11-adop/00_precheck_y_respaldo_prod.sql` | 1,559 | `d19695d2b69693b7673900744a83f2a216ad4824c3c9c7afa021a5e55ea1205f` |
| `ola11-adop/01_datos_prod.sql` | 152,840 | `d00d1fd4c3b8ed03c7eb3fec3bf84e401aeb3ff01bf91631a0a1af0d705a1314` |
| `ola11-adop/02_embeddings_prod.sql` | 250,163 | `2b8497df29f25d2658870f006a75008432d0bef144ab9aa1443f85af885e9282` |
| `ola11-adop/03_activacion_v5_prod.sql` | 6,998 | `1a613f7bd6ca55eb695d15bb8c3fb5685c65b639e4a98c534496d592a8a7b4fb` |

### OLA 12 · Ley sobre Justicia Constitucional · `OLA12_LJC_2007_01`

Pliego: [`EXPEDIENTE_AUDITORIA_LJC_OLA12.md`](../staging/2026-11-24-hn-ljc-ola12/EXPEDIENTE_AUDITORIA_LJC_OLA12.md)

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `ola12-ljc/00_precheck_y_respaldo_prod.sql` | 1,695 | `12703cf334d3aaef299f951ab85384b679bc1e7e253a33222099835043ac36c8` |
| `ola12-ljc/01_datos_prod.sql` | 229,492 | `408e511edea805dcf38d1237b81462909b99df6e82d670b0a99b7f50e2b50c04` |
| `ola12-ljc/02_embeddings_prod.sql` | 485,297 | `0c6a1661b20c1da87f78f82c273015d6ecf9d39e557093ddca48e11575811d12` |
| `ola12-ljc/03_activacion_v5_prod.sql` | 10,999 | `ec880fd71cda1d66f4c39ab6767cf725c8e08959d154faeea71ce18ee4c2f1a5` |

### OLA 12 · Ley de Organización y Atribuciones de los Tribunales · `OLA12_LOAT_2007_01`

Pliego: [`EXPEDIENTE_AUDITORIA_LOAT_OLA12.md`](../staging/2026-11-24-hn-loat-ola12/EXPEDIENTE_AUDITORIA_LOAT_OLA12.md)

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `ola12-loat/00_precheck_y_respaldo_prod.sql` | 1,310 | `14516a5cc199b1acfbdf73daa7252efb1baf530c601b4b7910d25e46e2773f53` |
| `ola12-loat/01_datos_prod.sql` | 516,598 | `78400a2bbf68438d10320b9e890f3f6c2aa239e0b676e34d34737531020bebf1` |
| `ola12-loat/02_embeddings_prod.sql` | 1,032,365 | `f92eff51964746e9caa9905152921dad294825c57511c8cd22dd5e152825729a` |
| `ola12-loat/03_activacion_v5_prod.sql` | 21,629 | `0dc02c071c3ce836ebe17dd797638d61cf2aa981da1a98b57d69c9923b028d81` |

### OLA 12 · Ley de Propiedad · `OLA12_LP_2007_01`

Pliego: [`EXPEDIENTE_AUDITORIA_LP_OLA12.md`](../staging/2026-11-24-hn-lp-ola12/EXPEDIENTE_AUDITORIA_LP_OLA12.md)

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `ola12-lp/00_precheck_y_respaldo_prod.sql` | 1,254 | `7e42729b8f6af5de7185c417cda9abf38ef8f5e2d3bab5f53d4a8eb7002b7357` |
| `ola12-lp/01_datos_prod.sql` | 247,088 | `f2bb547b9884d667f305859477829b85050f479d67f45ae0514fb5e929e9d527` |
| `ola12-lp/02_embeddings_prod.sql` | 553,308 | `f92e6ebc95b604a9059fbbb76494e3308d8e13281cce4b7e67b3b8329fc3ed3b` |
| `ola12-lp/03_activacion_v5_prod.sql` | 10,853 | `bcd8fe62e1650d77d7f7ed3311224e39f2b3e86b5f7e9cc538fbabc9689d8354` |

### OLA 12 · Ley Especial contra el Lavado de Activos · `OLA12_LA_2015_01`

Pliego: [`EXPEDIENTE_AUDITORIA_LA_OLA12.md`](../staging/2026-11-24-hn-la-ola12/EXPEDIENTE_AUDITORIA_LA_OLA12.md)

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `ola12-la/00_precheck_y_respaldo_prod.sql` | 1,269 | `31ae9c2bc7db53b6daf41e7b065cd8f6b95b1bbf10875bd360ddb9c0268929bb` |
| `ola12-la/01_datos_prod.sql` | 227,834 | `c7e9f19e4f34e4b69388493bc2d5da30cde024eafc70c2030fb74fd438b723c4` |
| `ola12-la/02_embeddings_prod.sql` | 363,239 | `23d8f5b48d1a80df7d1c0bd35fe7aaec67ceb08d4338cf0daaad5299e47f4b5a` |
| `ola12-la/03_activacion_v5_prod.sql` | 7,699 | `91bbe381d44ab3ea974dd657d11372815fb6e9c5e074843b41e52e80d7073fab` |

## 3. Correcciones posteriores

| Archivo | Bytes | SHA-256 | Ejecución |
|---|---:|---|---|
| [`01_marcar_legacy_ola3_ola9_prod.sql`](../staging/2026-11-25-correccion-marca-legacy/01_marcar_legacy_ola3_ola9_prod.sql) | 2,144 | `853a78b72959f90debe6761662b8657aa1644edea7c44f49fe8e245380ed4dbe` | CLO, con su `ejecutar_prod.ps1` (dictamen C1 firmado). La base no registra la hora. |
| [`2026-11-25_blindaje_respaldos_prod.sql`](2026-11-25_blindaje_respaldos_prod.sql) | 1,071 | `a1603e85ccdad706919f2966aaac128dadeedb76ca9562b85dde5c3d81d9752a` | Claude Code, vía conector Supabase (`execute_sql`), por instrucción del CLO, el 2026-11-25. Se envió el bloque `BEGIN … COMMIT` de este archivo, sin las líneas de comentario del encabezado; la huella es la del archivo completo. |
