# Pliego de adjudicación del CLO · `HN:CODIGO_NINEZ` (Código de la Niñez y de la Adolescencia, D. 73-96)

**Estado:** **D1–D8 FIRMADAS** por el CLO el 2026-11-18. · **Bloqueo vigente:** `CODIGO_NINEZ: INSTRUMENTO_SIN_PLIEGO_CLO` en `lib/legal-retrieval/clo-guards.ts` (PR #155). · **Bases:** staging y producción **sin ninguna fila** de este instrumento.

> Propuestas de Claude, no revisión jurídica. Solo `propietario_despacho` o `abogado_revisor_senior` deciden. Nada se carga hasta que D1–D8 estén firmadas, y en el orden de D7.

## 1. Identidad (para D2)

| Campo | Valor | Respaldo |
|---|---|---|
| Instrumento | Código de la Niñez y de la Adolescencia · Decreto No. 73-96 | Texto de 1996 (`15e3875d…`, orientativo) y A03 |
| Aprobación · sanción | Congreso Nacional, 30-may-1996 · Ejecútese, 17-jun-1996 | Firmas en el texto de 1996 (orientativo) |
| Publicación | La Gaceta No. 28,053, 5-sep-1996 | **Dato del manifiesto del proveedor y del Titular; no cotejado** (el `.doc` no cita la Gaceta) |
| Reformas incorporadas | D. 35-2013 (La Gaceta 33,222): 123 reformas, 14 adiciones, 24 derogaciones | v8, D3 firmada |
| Reforma posterior conocida | D. 130-2017 (art. 632, num. 12): derogación del art. 21 | **C07 sin cotejar** |
| Otras actualizaciones | 14 denominaciones de Secretarías de Estado (D. L. 218-96 y reformas de la LGAP, según el dictamen del CLO); 10 + 20 sustituciones JNBS→IHNFA (art. 280-A) | Dictamen del CLO del 2026-11-18 |

## 2. Fuentes del texto (para D1)

| Parte de la v2 | Artículos | Fuente | Procedencia |
|---|---:|---|---|
| Reformados y adicionados por el D. 35-2013 | 137 | v8 de La Gaceta 33,222 (`66919246…`) | **Acreditada:** TSC, D1 del pliego del D. 35-2013 |
| Derogados por el art. 11 del D. 35-2013 | 24 | Marca `[DEROGADO …]` | **Acreditada** (v8) |
| No tocados por el D. 35-2013 | 141 | Consolidado A03 (`bd115673…`), dictaminado por el CLO frente al texto de 1996 | **NO acreditada:** A03 es una copia de Drive (`SOURCE_HOLD`); el texto de 1996 es orientativo (`DISCOVERY_ONLY`) |

## 3. Texto que se carga (D3) — FIRMADA

| Campo | Valor |
|---|---|
| Texto | [`HN_CODIGO_NINEZ_canonico_v2.txt`](HN_CODIGO_NINEZ_canonico_v2.txt) · 302 artículos · 186.882 caracteres |
| SHA-256 (bytes LF) | **`99d911ac26acbdce3f3f0fc1af6e1162de32e3573ce5d791863f53a4b7219d36`** |
| Manifiesto | [`HN_CODIGO_NINEZ_canonico_v2_manifiesto.json`](HN_CODIGO_NINEZ_canonico_v2_manifiesto.json) (`TEXTO_DEFINITIVO_FIRMA_D3`, con fuente, estado, hash y correcciones por artículo) |
| Dictámenes | `../barrido-v7/HOJA_DECISION_A03_DIFIERE_V8.md` (19 artículos y art. 134) · `../canonico-v1/AUDITORIA_NO_TOCADOS_V1.md` (141 artículos) |
| Firmante | **Abg. y Not. Fredy Omar Pinel Flores** · **propietario_despacho** (CLO / Director Maya Lex) · **2026-11-18** |
| Cambios v1 → v2 | Exactamente 19 artículos: 6 correcciones «mantener 1996» (arts. 35, 125 b y c, 156, 159, 275), la fuga de nota del art. 284 y 15 espacios insertados en 13 artículos. No se cambió ninguna letra |
| Pendientes del texto | C07 (art. 21) · preámbulo y rótulos de división (no incluidos) |

## 4. Decisiones del CLO

| # | Decisión | Opciones | Propuesta de Claude |
|---|---|---|---|
| **D1** | Procedencia | ☐ (a) Acreditada para todo · ☑ **(b)** (firmado por el CLO, 2026-11-18) Acreditada solo para los 161 de la v8 (137 + 24); los 141 de A03 como solo contexto hasta descargar el consolidado del CEDIJ (opción B) o La Gaceta 28,053 (opción A) · ☐ (c) No acreditada | **(b).** Hoy los 141 no tienen ninguna fuente oficial acreditada |
| **D2** | Identidad | ☐ Confirmada · ☑ **Confirmada con reserva** (firmado por el CLO, 2026-11-18) (Gaceta 28,053 sin cotejar) · ☐ Rechazada | **Confirmada con reserva** |
| D3 | Texto | ☑ **v2 `99d911ac…`** (firmada el 2026-11-18, con el art. 125 c) | — |
| **D4** | Vigencia | ☑ **`TRUE_PRESUNTA`** (firmado por el CLO, 2026-11-18) para los 277 vigentes; NULL para el art. 21; FALSE para los 24 derogados · ☐ `NULL` (solo contexto) | **`TRUE_PRESUNTA`** para los artículos vigentes; los derogados, `es_norma_vigente = false`. **Límite:** no se buscaron reformas posteriores a 2013, salvo el D. 130-2017 (art. 21) |
| **D5** | Rol | Ver §5 | Ver §5 |
| **D6** | Tipo de fuente | ☑ **`codigo`** (firmado por el CLO, 2026-11-18) · ☐ Otro | **`codigo`** |
| **D7** | Retirar `INSTRUMENTO_SIN_PLIEGO_CLO` | ☑ **Sí, en el orden de D7 y solo en staging** (firmado por el CLO, 2026-11-18): el bloqueo se levanta después de verificar las 302 filas · ☐ No todavía | Ingesta en staging → visibilidad en staging → PR de `clo-guards.ts`, como en el D. 35-2013 |
| **D8** | Promoción | ☑ **V3→V4 solo en staging** (firmado por el CLO, 2026-11-18) (`aicakncgtuiiuomflkqj`); producción, no · ☐ V4→V5 a producción (aparte) | V3→V4 en staging, una vez cargado |

## 5. Reglas de ingesta propuestas (para D5)

| Grupo | Artículos | Se carga | `es_norma_vigente` | Rol | Motivo |
|---|---:|---|---|---|---|
| v8 reformados y adicionados | 136 | Sí | TRUE (`TRUE_PRESUNTA`) | **PRIMARY elegible** (rol vacío) | Texto de La Gaceta 33,222 con D3 |
| Art. 21 | 1 | Sí | NULL | **CONTEXT** (constancia C07) | Derogación posterior por el D. 130-2017 sin cotejar |
| A03 dictaminados | 141 | Sí | TRUE (`TRUE_PRESUNTA`) | **CONTEXT** (D1 b firmada) hasta acreditar La Gaceta 28,053 o el PDF del CEDIJ | La procedencia del texto no está acreditada |
| Derogados (art. 11 del D. 35-2013) | 24 | ☑ **Sí**, con la marca `[DEROGADO …]` (firmado por el CLO, 2026-11-18) · ☐ No | FALSE | CONTEXT | Si se cargan, responden «¿está vigente el art. 134?» sin poder fundar nada. El guard excluye las filas FALSE |
| Notas editoriales de A03 | 153 | **No** | — | — | No son texto normativo |

## 6. Bloqueos técnicos de la ingesta, a resolver antes de D7

1. **Un solo PDF por lote. Resuelto por el CLO (2026-11-18):** la ingesta se hace desde el manifiesto canónico D3 firmado, con `scripts/ingesta-canonico-staging.ts`. La situación de partida era esta: `scripts/ingesta-lote-staging.ts` liga cada transcripción a **un** PDF y exige que su candidato esté en `CLO_PENDING`. La v2 mezcla dos fuentes: v8 (PDF del TSC, candidato del D. 35-2013) y A03 (PDF de Drive, `SOURCE_HOLD`, que no está en este equipo). Opciones:
   - ☐ Recibir el consolidado del CEDIJ con `receive-pdf.ts --url` (dominio verificado). Si es `bd115673…`, el candidato A03 pasa a `CLO_PENDING` y la v2 se liga a él.
   - ☐ Cargar en dos lotes: 161 artículos ligados al PDF del TSC y 141 ligados a A03 cuando se acredite. Hace falta adaptar la ingesta.
   - ☐ Otra decisión del CLO.
2. **Segmentación: comprobada.** La v2 usa encabezados «Artículo N.», el formato de A03. `segmentarArticulos` produce las **302** filas con los mismos `numero` y **los 302 `sha256`** del manifiesto. Con «N.-», el segmentador dejaba «- » al inicio de cada cuerpo; por eso se usa «N.».
3. **Preámbulo y rótulos.** La v2 no los incluye. Si el CLO los quiere en el corpus, se transcriben y cotejan aparte.

## Firma (D1–D8)

**FIRMADO (2026-11-18).** Decide el CLO: **Abg. y Not. Fredy Omar Pinel Flores** · Rol: ☑ **propietario_despacho** · Fecha: **2026-11-18**.

**Decisiones:**
- **D1 (b):** procedencia acreditada para los 161 artículos de la v8 (136 vigentes, el art. 21 y los 24 derogados), con La Gaceta 33,222 (TSC y CEDIJ). Los 141 dictaminados quedan **con reserva documental (CONTEXT)** hasta cotejar La Gaceta 28,053 o el PDF del CEDIJ.
- **D2:** identidad confirmada, con reserva del cotejo histórico de La Gaceta 28,053.
- **D3:** texto firmado, v2 `99d911ac…`, con el art. 125 c) «dieciocho».
- **D4:** `es_norma_vigente` TRUE (`TRUE_PRESUNTA`) para 277 artículos; NULL para el art. 21 (C07); FALSE para los 24 derogados.
- **D5:**

  | Grupo | Artículos | `es_norma_vigente` | Rol |
  |---|---:|---|---|
  | v8 vigentes | 136 | TRUE | **PRIMARY elegible** |
  | Art. 21 | 1 | NULL | CONTEXT |
  | Dictaminados | 141 | TRUE | CONTEXT |
  | Derogados | 24 | FALSE | CONTEXT |
  | Notas editoriales | 153 | — | **No se cargan** |

- **D6:** `codigo`.
- **D7:** ingesta en staging → visibilidad → `clo-guards.ts` (se levanta `INSTRUMENTO_SIN_PLIEGO_CLO` una vez verificadas las 302 filas).
- **D8:** V3→V4 en `mayalexhn-staging`. Producción, no.

**Ingesta:** el CLO autoriza cargar desde el manifiesto canónico D3 firmado, con fuentes mixtas acreditadas por este pliego. No se exige un único PDF en `CLO_PENDING`. Ver el §6.

## 7. Constancia · ingesta en staging PREPARADA (2026-11-18)
- **Herramienta:** [`scripts/ingesta-canonico-staging.ts`](../../../../../scripts/ingesta-canonico-staging.ts), nueva y con pruebas en `tests/ingesta-canonico-staging.test.ts`. Ingiere desde el texto canónico D3 y este pliego firmado, sin un PDF único en `CLO_PENDING`. Se detiene si:
  - el texto no tiene el hash del manifiesto y de la firma D3;
  - el pliego no está firmado o no cita ese hash;
  - algún artículo segmentado no tiene el número y el `sha256` del manifiesto.
- **Lote `A03_CODIGO_NINEZ_01`** (`out/a03-codigo-ninez/`, no versionado):
  - 302 filas; 302 `sha256` iguales al manifiesto; 0 excepciones;
  - embeddings `Xenova/multilingual-e5-small` (384 dimensiones), con el mismo tratamiento que los demás lotes.

| Paso (D7) | Archivo | SHA-256 | Contenido |
|---|---|---|---|
| 1 | `insert_staging.sql` | `a12ef145feec065fb7590917c82e011514212a4e1213adf90f213a7e3c4319e7` | 302 filas ocultas, vigencia NULL, embedding NULL. Al final normaliza `\r\n`→`\n` (por si el editor convierte el archivo) |
| 2 | `update_embeddings_staging.sql` | `65354cad24f3a060b43ebc4f88932ad60db5bdff99c6650ea6e53177fbd921f4` | 302 embeddings |
| 3 | `verificacion_staging.sql` | `cc0b153739c4dda28c7e65aea7de39d7a365e7a5d3e87414f78bbe136eaab58f` | Solo lectura: 302 en todas las columnas y 0 visibles |
| 4 | `visibilidad_staging.sql` | `d5e3a544595dcd81c721fe88bdf2520fc9ddeafe82bbdf438acac7bcf2958775` | Bloque atómico, reglas D4/D5. Ver el detalle debajo de la tabla |

**Qué hace `visibilidad_staging.sql`:**
- **Precondición:** 302 filas ocultas, con embedding y con `sha256(contenido) = hash_contenido`.
- **Resultado esperado:**
  - 136 con `es_norma_vigente` TRUE y sin rol (PRIMARY elegibles);
  - 141 con TRUE y `CONTEXT` (`RESERVA_D1_B`);
  - 24 con FALSE y `CONTEXT` (derogados);
  - 1 con NULL y `CONTEXT` (art. 21, con constancia C07).
- Las 302 quedan en V4.

- **Estado previo de staging** (solo lectura, 2026-11-18): 0 filas del lote, 0 filas con `instrumento_id = CODIGO_NINEZ` o `norm_id = HN:CODIGO_NINEZ`.
- **Por qué los pasos 1 y 2 no los ejecuta Claude:** pesan 660 KB y 1,16 MB, y no caben de forma fiable en una llamada de la herramienta de Supabase. Los aplica el CLO en el SQL Editor de `mayalexhn-staging`, como en la carga del D. 35-2013. Claude verifica, aplica el paso 4 (8 KB) y deja preparado el PR de `clo-guards.ts`, que es el tercer tiempo de D7.
