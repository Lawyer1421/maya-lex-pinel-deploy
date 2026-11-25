# Expediente de auditoría · OLA 10 · `HN:LEY_NOTARIADO`

**Estado:** D1–D8 FIRMADAS (2026-11-24, Abg. y Not. Fredy Omar Pinel Flores, CLO)
**Instrumento:** Código del Notariado de Honduras (Decreto No. 353-2005, La Gaceta No. 30,904 del 17-ene-2006), reformado por el D.77-2006 · lote `OLA10_NOT_2006_01`
**Fecha del paquete:** 2026-11-24 · **Generador:** `scripts/olas/ola10-not.ts` + `scripts/olas/cedij.ts` + `scripts/olas/paquete-ola.ts`
**Staging:** `mayalexhn-staging` (`aicakncgtuiiuomflkqj`) · **Producción:** `thgrhueckkjdutjvcufp`

> **Cómo se firma.** El CLO revisa las secciones 1 a 5 y decide D1–D8 en §6. Para firmar, sustituye en la línea **Estado** el texto `PENDIENTE DE FIRMA` por la fórmula de firma (D1–D8 y la palabra FIRMADAS) y completa el bloque de firma. El ejecutor (`scripts/olas/ejecutar-sql.ts`) lee la firma solo en esa línea **Estado** y se niega a correr la visibilidad V4 en staging y cualquier paso de producción si este archivo no está firmado o no cita la huella SHA-256 exacta de cada SQL (§7). Si el CLO modifica una decisión, hay que regenerar el paquete y volver a citar las huellas.

## 1. Fuente

| Pieza | Archivo · SHA-256 | Uso |
|---|---|---|
| Edición del CEDIJ «Codigo-del-Notariado.pdf» (`CLRA/`) | 206,761 bytes, 34 págs. · `efe971f876fa9b9bc23fad82fc3d669aab864f48dab6169a85f202c1dd2513c8` | Texto base, arts. 1–94. Trae **9 notas al pie**, todas del D.77-2006 (Gaceta 31,091), y el D.77-2006 íntegro como anexo |

**Identificador.** Se usa `HN:LEY_NOTARIADO`, como indicó el CLO, aunque el instrumento se titula «Código del Notariado». La Ley de Notariado de 1930 está derogada por el art. 93.

**Extracción.** `scripts/olas/cedij.ts`. Particularidades de esta edición:
- la cabecera del CEDIJ va en minúsculas y ocupa dos líneas;
- **cinco encabezados escriben la letra «O» por el cero** («ARTÍCULO 2O.-», 3O, 5O, 6O y 9O), que se corrigen como erratas;
- la nota 9, sobre la publicación del D.77-2006, cae en el anexo y no en el articulado.

## 2. Situación actual en producción (solo lectura, 2026-11-24)

**94 filas legacy** `mayalex_normativos:codigo_notariado_2005_a1…a94`. Salen de un «extractor genérico, primera pasada» y tienen `verificado = false`.

| Hallazgo | Filas |
|---|---:|
| **Vigencia errónea**: arts. **11 y 27** figuran no vigentes, pero el D.77-2006 los **reformó**; art. **93** (deroga la Ley de 1930) figura no vigente | **3** |
| Texto con el encabezado «ARTÍCULO N.-», palabras partidas por espacios («s ilencio», «funcio namiento») y restos de notas («Derogado.4 / 4 Ref…») | casi todas |
| Similitud < 0.90 con la edición | 56 |
| Texto idéntico | 0 |

Se conservan visibles, porque son instrumentos distintos:
- las **6 filas del D.77-2006** (`decreto_77_2006_a*`);
- las **111 del Reglamento** (`reglamento_notariado_2012_a*`).

## 3. Conteo y clasificación propuesta

| Concepto | Filas |
|---|---:|
| Artículos 1–94 | 94 |
| **PRIMARY** | **90** |
| **CONTEXT derogados**: arts. 72, 73, 84 y 87 (art. 2 del D.77-2006) | **4** |

**Constancias:**
- reforma de los arts. 11 y 27;
- **derogación parcial** del inciso 11 del art. 12 y del inciso 5 del art. 76;
- derogación de los arts. 72, 73, 84 y 87.

## 4. Cotejo con el D.77-2006

El art. 2 del D.77-2006, ya en producción como `decreto_77_2006_a2`, deroga:
- el Capítulo VI (arts. 72 y 73);
- los arts. 84 y 87;
- el inciso 11 del art. 12 y el inciso 5 del art. 76.

La clasificación coincide con ese texto.

Las notas 4 y 5 de la edición dicen «Reformado» en los arts. 72 y 73, pero esos artículos se imprimen como «Derogado», y así lo dispone el decreto. Prevalece el decreto.

## 5. Reservas

1. **Cotejo con La Gaceta.** No se cotejó con La Gaceta 30,904 el texto base. El script de curación anterior (`scripts/ingesta-notariado.ts`) señalaba dudas en algunos artículos, como el 17. La edición sí trae el art. 17.
2. **Reformas posteriores.** No se verificaron reformas posteriores al D.77-2006.

## 6. Decisiones D1–D8 para firma

| # | Decisión propuesta | Decisión del CLO |
|---|---|---|
| D1 | Fuente PRIMARY: edición CEDIJ con el D.77-2006, con las reservas 5.1 y 5.2 | ☑ Aprueba |
| D2 | Aceptar la extracción de §1 (5 erratas «O» por cero, nota 9 fuera del articulado) | ☑ Aprueba |
| D3 | Firma del texto consolidado de 94 artículos (huella en §7) | ☑ Firma |
| D4 | Vigencia: 90 `true` y 4 `false`; corrige la vigencia errónea de los arts. 11, 27 y 93 del legacy | ☑ **Aprueba**: 90 PRIMARY y 4 CONTEXT derogados por el D.77-2006 |
| D5 | `norm_id` `HN:LEY_NOTARIADO` para el Código del Notariado | ☑ Aprueba |
| D6 | Constancias por fila (ver `constancias.csv`) | ☑ Aprueba |
| D7 | Al activar V5, ocultar (sin borrar) las 94 filas legacy `mayalex_normativos:codigo_notariado_2005_a*`; el D.77-2006 y el Reglamento no se tocan | ☑ Aprueba |
| D8 | Autorizar V4 en staging y V5 en producción, exactamente para los SQL y huellas de §7 | ☑ Autoriza |

Firma: **aprobado** · Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex) · Fecha: 2026-11-24

*Registro de la firma.* El CLO comunicó en la sesión de trabajo del 2026-11-24 la aprobación de D1–D8, con determinación expresa sobre D4 (90 PRIMARY y 4 CONTEXT derogados por el D.77-2006); Claude Code la transcribió aquí por su instrucción. El paquete no se regeneró después: la firma cubre exactamente las huellas de los SQL citadas en este pliego.

## 7. Paquete SQL y huellas (lo que autoriza D8)

Los archivos se generan en `out/ola10-not/` (directorio ignorado por git), de forma reproducible con `npx tsx scripts/olas/ola10-not.ts`.

**Huellas del expediente:**
- texto consolidado: `48548fcf6b1f9c91f088bf9670474ab320c066e7d3ec9dcc7c270054c757954e`;
- `manifiesto_articulos.json`: `ff829dab7ce3ee879a449d92e9dc07ff35acac568c0442a4c90415313f9a28f0`;
- `constancias.csv`: `c154eb5e277a5629a054abbd8a04f31e8ed7483779abed896cfd810039394d98`.

| Paso | Archivo | Bytes | SHA-256 | Firma |
|---:|---|---:|---|---|
| S1 | `staging/01_insert_staging.sql` | 164,870 | `d4dd4e67033096c3b4d348c55136e9b3d8e48e26a990d1f1a12d28c5196e1b90` | No (filas ocultas) |
| S2 | `staging/02_embeddings_staging.sql` | 360,372 | `bd1901cdd2b5c21aa1ffc7d17cf58f0f9cd61b5124c152c7a669a3434f6827b5` | No |
| S3 | `staging/03_verificacion_staging.sql` | 1,633 | `b030345f2fe2657036aca7e3740a908bdbaea8a9902f45b4a44b81941a84f0d7` | No (solo lectura) |
| S4 | `staging/04_visibilidad_v4_staging.sql` | 9,145 | `c854a11275f79d94a5d3c0daf44e3f42b0b68a65e234edd826386d5cfa20d59e` | **Sí** |
| P0 | `prod/00_precheck_y_respaldo_prod.sql` | 1,561 | `26a22ce489b69183a13dfd84450ec70bc533562a141f3e03eb3737b544c1fbd3` | **Sí** |
| P1 | `prod/01_datos_prod.sql` | 168,439 | `c8aa74fa1df6e7e25479f7f9d84356cc5d00a27ac26c6c056a957ba47f6fc57f` | **Sí** |
| P2 | `prod/02_embeddings_prod.sql` | 366,460 | `0b92cac06d58eca96adef2a76ffbb2de31d39397a323636c8b5c895976b3c1fa` | **Sí** |
| P3 | `prod/03_activacion_v5_prod.sql` | 10,252 | `c0c0db6f369809be2cb76b95e5db0788b97ebec0149a78fed7d0e02bbf8bdc4e` | **Sí** |
| R | `prod/99_reversion_prod.sql` | 754 | `94515ac04a20a9cc1c215dc1a7eac06b924acd565cbef436f94d03ba8731d828` | Solo por orden del CLO; el `.ps1` no lo ejecuta |

**Ensayo en base desechable (2026-11-24).** Se corrió el paquete completo en Postgres 17 con pgvector (PGlite): esquema real de 18 columnas, 94 filas legacy simuladas y una fila V5 ajena.
- **Staging:** S1 y S2 son reaplicables. S3 verifica todas las huellas SHA-256. La repetición de S4 falla cerrada.
- **Producción, antes de activar:** P3 se niega antes de P1/P2. P0 respalda las 94 filas legacy y no sobrescribe un respaldo existente.
- **Activación y reversión:** P3 activa 94 filas V5 (90 PRIMARY, 4 CONTEXT derogados) y oculta exactamente las 94 legacy sin tocar la fila ajena. R restaura las 94 legacy y elimina el lote.

## 8. Ejecución tras la firma

```powershell
pwsh -File out\ola10-not\ejecutar_staging.ps1 -DesdePaso 1 -HastaPaso 3
pwsh -File out\ola10-not\ejecutar_staging.ps1 -DesdePaso 4 -HastaPaso 4
pwsh -File out\ola10-not\ejecutar_prod.ps1
```
