# Expediente de auditoría · OLA 6 · `HN:CODIGO_PROCESAL_CIVIL`

**Estado:** D1–D8 FIRMADAS (2026-11-24, Abg. y Not. Fredy Omar Pinel Flores, CLO)
**Instrumento:** Código Procesal Civil de Honduras (Decreto No. 211-2006, La Gaceta No. 31,313 del 26-may-2007) · lote `OLA6_CPC_2024_01`
**Fecha del paquete:** 2026-11-24 · **Generador:** `scripts/olas/ola6-cpc.ts` + `scripts/olas/cedij.ts` + `scripts/olas/paquete-ola.ts`
**Staging:** `mayalexhn-staging` (`aicakncgtuiiuomflkqj`) · **Producción:** `thgrhueckkjdutjvcufp`

> **Cómo se firma.** El CLO revisa §2–§6 y decide D1–D8 en §7. Para firmar, sustituye en la línea **Estado** el texto `PENDIENTE DE FIRMA` por la fórmula de firma (D1–D8 y la palabra FIRMADAS) y completa el bloque de firma de §7. El ejecutor (`scripts/olas/ejecutar-sql.ts`) lee la firma solo en esa línea **Estado** y se niega a correr la visibilidad V4 en staging y cualquier paso de producción si este archivo no está firmado o no cita la huella SHA-256 exacta de cada SQL (§8). Si el CLO modifica una decisión, hay que regenerar el paquete: cambian las huellas y este pliego debe volver a citarlas.

## 1. Fuente

| Pieza | Archivo · SHA-256 | Uso |
|---|---|---|
| **Edición consolidada del CEDIJ** «Codigo Procesal Civil (2018).pdf» | 1,875,925 bytes, 303 págs., Word 2019, generado el 29-feb-2024 · `fd872e08e06efc0d5e20ff08f897614796879219d82014514558dafe99eafa65` | Texto base. Incluye el dictamen de la comisión, que se descarta, y el articulado 1–932. Trae **3 notas al pie**: D.21-2015 en los arts. 400 y 783, y D.168-2009 en el art. 932 |

**Extracción.** Usa el mismo procedimiento que la OLA 5 (`scripts/olas/cedij.ts`):
- por página se retiran la cabecera del CEDIJ, el folio y las notas;
- las llamadas de nota se resuelven y se cruzan con el artículo que nombra cada nota;
- los encabezados de estructura pasan a `metadata.ubicacion`.

Los artículos de otros códigos que el CPC transcribe al reformarlos se quedan dentro de su artículo. Son los del Código de Familia en el art. 929 y los arts. 1444 y 2141 del Código Civil en el art. 930. No abren filas propias.

**Huellas de reproducción:**
- texto consolidado (concatenación «número⏎contenido» de las 932 filas): `efa93f0473885bb0f083a6884a9e5c4c6893eff7bf35bc9f2addbc67a3d405c8`;
- [`manifiesto_articulos.json`](manifiesto_articulos.json) y [`constancias.csv`](constancias.csv): huellas en §8.

## 2. Situación actual en producción (solo lectura, 2026-11-24)

El CPC está cargado en **cuatro capas** visibles, que hoy se recuperan duplicadas:

| Capa | Ids | Filas | Observación |
|---|---|---:|---|
| Legacy V2 | `v2civil:mayalex_normativos:1…932` (`norm_id = HN_CODIGO_PROCESAL_CIVIL`) | 932 | Todas `true`. **286** llevan marcas «-- N of 336 --», cabecera del CEDIJ o encabezados del Libro siguiente; las llamadas de nota quedan pegadas al texto («ABREVIADO.1») |
| Espejo | `v2civil:mayalex_procedimental:1…932` | 932 | **Idéntico** a la capa anterior, fila por fila (932/932) |
| Texto base | `mayalex_normativos:cpc_base_a0001_c00…` (sin `norm_id`) | 995 | Fragmentos «Artículo N CPC (D.211-2006) — EPÍGRAFE. …», partidos en trozos `c00`, `c01`… |
| Comentario | `mayalex_normativos:cpc_comentado_*` | 1,481 | Doctrina (Romero Baldelomar, 2024), vigencia NULL. **No se toca** |
| Guía de plazos | `mayalex_procedimental:04_CPC_PLAZOS_*` | 9 | Guía procedimental. **No se toca** |

**Comparación del legacy V2 con la edición**, artículo por artículo, con la misma métrica de similitud de las OLAS 4 y 5:

| Resultado | Artículos |
|---|---:|
| Textos idénticos | 612 |
| Similitud ≥ 0.95 | 783 |
| Similitud < 0.90, por residuos de página o truncamiento | 42 |
| Coinciden en número | 932/932 |
| Coinciden en vigencia | 932/932 |

Dos casos de las 42 diferencias son de fondo: los arts. 929 y 930 están **truncados** en el legacy y les falta el texto de los artículos del Código de Familia y del Código Civil que reforman. La lista completa está en `manifiesto_articulos.json` → `legacy.texto_bajo_090`.

## 3. Conteo y clasificación propuesta

| Concepto | Filas |
|---|---:|
| Artículos 1–932, sin huecos ni repetidos | 932 |
| **PRIMARY** elegibles | **931** |
| **CONTEXT vigente**: art. **40** (sumisión tácita), §5 | **1** |
| CONTEXT derogados | 0 |

Constancias: 3 de reforma, de las notas al pie, y 1 `REVISION_PENDIENTE_CLO`, para el art. 40.

## 4. Integridad y saneamiento

El script aborta ante cualquiera de estas condiciones:
- encabezado residual, caracteres de control o mojibake;
- cabecera, folio o marca de página;
- espaciado anómalo;
- un artículo vigente sin puntuación de cierre.

Los arts. 5, 9, 571, 601 y 826 terminan sin punto en el PDF y quedan como excepción verificada. Las 3 llamadas de nota se retiran del texto y quedan como constancia.

Desde esta versión el script también aborta si el texto de un artículo contiene el encabezado del artículo siguiente. Esa comprobación habría detectado el defecto del art. 420 (§5).

## 5. Art. 40, no impreso en la edición, y corrección del art. 420

**Art. 40 (sumisión tácita).** La edición CEDIJ salta del art. 39 al 41. Se incorpora en su lugar con el texto del legacy V2, del que se retiran la marca de página, el folio y la cabecera del CEDIJ. Lleva la constancia `REVISION_PENDIENTE_CLO` y se propone como **CONTEXT vigente** hasta cotejarlo con La Gaceta 31,313 (D5).

**Art. 420 — corrección después de la firma.** La versión firmada el 2026-11-24 daba por ausente el art. 420 y lo suplía desde el legacy. En realidad la edición sí lo imprime, con el encabezado en mayúsculas: «ARTÍCULO 420.- PROMOCIÓN DE LA CUESTIÓN INCIDENTAL…». El segmentador de entonces no reconocía las mayúsculas, así que el texto del 420 quedaba pegado al final del art. 419. El defecto salió a la luz al adaptar el segmentador para el Código Tributario. Corrección:
- el art. 420 toma el texto de la edición y es **PRIMARY**;
- el art. 419 queda solo con su texto (605 caracteres, antes 1,324).

Ninguna otra fila cambia: se comprobó fila por fila contra el paquete firmado.

## 6. Reservas que el CLO debe conocer

1. **Cotejo con La Gaceta.** La edición solo anota las reformas del D.21-2015 (arts. 400 y 783) y del D.168-2009 (art. 932, entrada en vigencia). No se cotejaron con La Gaceta el texto base (Gaceta 31,313) ni esas reformas. Tampoco se verificó si hubo reformas posteriores a febrero de 2024.
2. **Capas que se ocultan (D7).** Se proponen ocultar las tres capas normativas: legacy, espejo y texto base, 2,859 filas en total. Se mantienen visibles el comentario doctrinal de Romero y la guía de plazos, que no son texto normativo. Si el CLO prefiere conservar el texto base `cpc_base` visible, hay que regenerar el paquete.
3. **Coherencia con las OLAS 4 y 5.** Los arts. 929 y 930 reforman artículos del Código de Familia (112, 113, 115, 118, 240, 244–248) y del Código Civil (1444, 2141). Esos códigos ya los integran: la OLA 5 anota el D.211-2006 en esos artículos y la OLA 4 trae el 1444 y el 2141 reformados.
4. **Art. 40:** ver §5 (D5).

## 7. Decisiones D1–D8 para firma

| # | Decisión propuesta | Decisión del CLO |
|---|---|---|
| D1 | Fuente PRIMARY: edición CEDIJ (29-feb-2024), con las reservas 6.1 y 6.3 | ☑ **Aprueba** el paquete corregido: 931 PRIMARY (art. 420 recuperado de la edición) y 1 CONTEXT vigente |
| D2 | Aceptar la extracción y el saneamiento de §4 (3 notas resueltas, citas de otros códigos dentro de su artículo, 5 excepciones sin cierre, nuevo control de encabezados tragados) | ☑ Aprueba |
| D3 | Firma del texto consolidado de 932 artículos tal como figura en `manifiesto_articulos.json` (huella del texto en §1) | ☑ Firma |
| D4 | Vigencia: 932 `true` (931 PRIMARY + 1 CONTEXT) | ☑ Aprueba |
| D5 | Art. 40, no impreso en la edición: CONTEXT vigente con el texto del legacy hasta el cotejo con La Gaceta 31,313. El art. 420 pasa a PRIMARY con el texto de la edición (§5) | ☑ **Aprueba**: art. 40 como CONTEXT vigente con el texto de las filas antiguas; art. 420 PRIMARY |
| D6 | Constancias por fila en `metadata.constancias` (ver `constancias.csv`) | ☑ Aprueba |
| D7 | Al activar V5, ocultar (sin borrar) las 2,859 filas de las tres capas normativas legacy (`v2civil:mayalex_normativos:*`, `v2civil:mayalex_procedimental:*`, `mayalex_normativos:cpc_base_a*`), con respaldo previo y reversión 99. No se tocan `cpc_comentado_*` ni la guía de plazos | ☑ **Aprueba**: ocultar las 2,859 filas redundantes de las tres capas; se conservan el comentario de Romero y la guía de plazos |
| D8 | Autorizar V4 en staging y V5 en producción, exactamente para los SQL y huellas de §8, mediante `ejecutar_staging.ps1` y `ejecutar_prod.ps1` | ☑ Autoriza |

Firma: **aprobado** · Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex) · Fecha: 2026-11-24

*Registro de la firma.* El CLO comunicó en la sesión de trabajo del 2026-11-24 la aprobación de D1–D8 sobre el paquete corregido (nueva firma), con determinación expresa sobre D1, D5 y D7. Sustituye la firma anterior, que quedó sin efecto; Claude Code la transcribió aquí por su instrucción. El paquete no se regeneró después: la firma cubre exactamente las huellas de los SQL citadas en este pliego.

*Firma anterior sin efecto.* El 2026-11-24 el CLO aprobó D1–D8 de la versión anterior, con determinación expresa sobre D1 (930 PRIMARY, 2 CONTEXT vigentes), D5 (arts. 40 y 420 desde el legacy) y D7 (ocultar las 2,859 filas de las tres capas). Esa firma cubría huellas que ya no existen, porque la corrección del art. 420 (§5) cambia el texto de los arts. 419 y 420. La decisión D7 se mantiene igual en esta versión. El ejecutor se niega a correr la OLA 6 hasta que el CLO firme de nuevo.

## 8. Paquete SQL y huellas (lo que autoriza D8)

Los archivos se generan en `out/ola6-cpc/` (directorio ignorado por git), de forma reproducible con `npx tsx scripts/olas/ola6-cpc.ts`. Huellas del expediente: `manifiesto_articulos.json` `5aba71d798731c741482b258451371ae960e567de3d0045cbbaf881d7c73397d`; `constancias.csv` `3a436ed1716ef933c935c699a45c4b36c54a1ce5784bede045d9d49c647ebd49`.

| Paso | Archivo | Bytes | SHA-256 | Firma |
|---:|---|---:|---|---|
| S1 | `staging/01_insert_staging.sql` | 1,825,454 | `eba62e7686141cff62a997680e1d8e65bc13685a4872dce69482ce836f3bab77` | No (filas ocultas) |
| S2 | `staging/02_embeddings_staging.sql` | 3,575,661 | `aa7c2312d8780f3d7056cda98f10187da297c8a9d81788167b34a578e81a4074` | No |
| S3 | `staging/03_verificacion_staging.sql` | 1,656 | `1dc566740f4aceb1218549eab2fa2aeb6d28a6e2fd4105ab5594424858a062f5` | No (solo lectura) |
| S4 | `staging/04_visibilidad_v4_staging.sql` | 47,388 | `f494ae1f1cb52aa786d90aff3b1bed31ea02f727133faea4f514cad0035e6120` | **Sí** |
| P0 | `prod/00_precheck_y_respaldo_prod.sql` | 1,861 | `fb2716e608062885a7a809ba2c94a9c7939ad3b3830188f8d01b2e4f753d3f60` | **Sí** |
| P1 | `prod/01_datos_prod.sql` | 1,858,352 | `20aefc16643b6dd7af05d762590edb77e6bcc59b547db57ab2fabc487ff4130b` | **Sí** |
| P2 | `prod/02_embeddings_prod.sql` | 3,635,380 | `dfda6e0c8b647ffda6286365c6c2606a05c56f7c2d7967a9f7838420fdc3654f` | **Sí** |
| P3 | `prod/03_activacion_v5_prod.sql` | 48,605 | `81369d9043109aa07402141eeb4e80aff319270f216cafc0b39623964cd67533` | **Sí** |
| R | `prod/99_reversion_prod.sql` | 898 | `b139727d7ec9ff97ef19988ced5d33749c0f4b335507fed4e408178e7b5d36ea` | Solo por orden del CLO; el `.ps1` no lo ejecuta |

**Ensayo en base desechable (2026-11-24).** Se corrió el paquete completo en Postgres 17 con pgvector (PGlite): esquema real de 18 columnas, las tres capas legacy simuladas (932 + 932 + 995), una fila del comentario de Romero y una fila V5 ajena.
- **Staging:** S1 y S2 son reaplicables. S3 da 932/932 SHA-256. S4 deja 931 PRIMARY y 1 CONTEXT en V4, y su repetición falla cerrada.
- **Producción, antes de activar:** P3 se niega antes de P1/P2. P0 respalda 2,859 filas y no sobrescribe un respaldo existente. P1 y P2 son reaplicables.
- **Activación y reversión:** P3 activa 932 filas V5 y oculta exactamente las 2,859 de las tres capas. **No toca el comentario de Romero ni la fila ajena.** R restaura las tres capas y elimina el lote.

## 9. Ejecución tras la firma

```powershell
pwsh -File out\ola6-cpc\ejecutar_staging.ps1 -DesdePaso 1 -HastaPaso 3
pwsh -File out\ola6-cpc\ejecutar_staging.ps1 -DesdePaso 4 -HastaPaso 4
pwsh -File out\ola6-cpc\ejecutar_prod.ps1
```

Las salvaguardas son las de las olas anteriores:
- el project ref y la frase se teclean;
- `DATABASE_URL` se pide oculta y se borra en `finally`;
- se verifican la URL, las huellas y la firma (solo en la línea **Estado**);
- identidad de la base: producción debe tener los 360 V5 del 2026-11-21.
