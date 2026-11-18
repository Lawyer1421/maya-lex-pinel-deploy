# Paquete de adjudicación CLO · Decreto 35-2013 (A04)

**Identidad:** `HN:DECRETO_35_2013` · **Estado:** `CLO_PENDING` (fuente institucional validada: TSC, tier 4) · **PDF oficial:** SHA-256 `FBD87F33…F2FF`, 46 págs. · **D3:** firmado el 16-nov-2026 sobre la v6 `7c8f40f8…` · **D1, D2 y D4–D7:** firmadas el 16-nov-2026 (§7) · **D8:** V3→V4 solo en staging firmada el 17-nov-2026; **V4→V5 (producción) expresamente sin firmar** · **D7, pasos 1–3:** pasos 1 y 2 verificados en staging el 17-nov-2026; paso 3 (parche `55c1991d…`) aplicado en este PR (§6) · **Vigencia:** TRUE_PRESUNTA desde el 6-sep-2013 · **D5:** 11 `CONTEXT` (arts. 1–11) / 8 principales (arts. 12–19)

> Este documento **no aprueba nada**: reúne lo comprobado y deja cada decisión al CLO. Solo los roles `abogado_revisor_senior` o `propietario_despacho` pueden promover V3→V4 y V4→V5 (`lib/ingesta-oficial/estados.ts`), y cada intento queda en `ingestion_audit_log`. Tras fusionar el PR del paso 3 de D7, el bloqueo `INSTRUMENTO_SIN_PLIEGO_CLO` deja de aplicar al decreto; los arts. 1–11 siguen `CONTEXT` por `metadata.rol` (D5). **V4→V5 a producción sigue expresamente sin firmar.**

## 0. Procedencia institucional (hecho)

| Dato | Valor |
|---|---|
| URL | <https://www.tsc.gob.hn/web/leyes/Codigo_niñezyadolescencia_2013.pdf> |
| Dominio y registro | `www.tsc.gob.hn`: `VERIFIED`, `OFFICIAL_COMPILATION`, tier 4. El receptor concedió `SOURCE_VALIDATED` |
| Descarga | Bot Auditor, por orden expresa del CLO: PowerShell `Invoke-WebRequest` en el equipo local del CLO, **16-nov-2026 09:26:55 (hora de Honduras) / 15:26:55 UTC** (`retrieval_method` CURL; ver `00_HOJA_DECISION_CLO.md`, corrección de custodia) |
| `bytes_sha256` | `fbd87f3396e5d0b6601a246008a1ae5bd870841b795d75ac42076245a154f2ff` (18,625,608 bytes, 46 páginas) |
| Tipo de PDF | **Escaneo** a 200 ppp con capa OCR. 4 páginas con `/Rotate 180` (39, 41, 43 y 45) |
| `text_sha256` (dos columnas, págs. 1–46, la 46 solo columna izquierda) | `f2c67cb4a019a094cbacb4690323810e7215d0904297483b1a725a4dbb7fca0a`. **No se ingiere**: el texto es la transcripción de D3 |
| Candidato | `../2026-11-16-hn-001-a04-tsc/candidates/PKG_DECRETO_35_2013_REFORMA_AL_CODIGO_DE_LA_NINEZ@v1.json` · `CLO_PENDING` · QA sin fallos · hoja `worksheets/…@v1.md` |
| Recibos (`../2026-11-16-hn-001-a04-tsc/receipts/`) | `…161141Z…` `RECEIVED` (extracto 1–46 sin revisión declarada) · **`…222718Z…` `CLO_PENDING`**, con la revisión documental del CLO declarada (`--revisado`, 16-nov-2026) |

**No es un segundo ejemplar:** la copia del TSC tiene los mismos bytes que la del Drive del propietario. Ninguna discrepancia que exija otro ejemplar (C06, arts. 134/141, C07) se resuelve con ella.

## 1. Identidad (comprobada en el PDF del TSC)

| Dato | Valor | Dónde |
|---|---|---|
| Instrumento | Decreto No. 35-2013: reformas y adiciones al Código de la Niñez y de la Adolescencia (D.73-96), al Código de Familia (D.76-84), al Código Civil, al Código Penal (D.144-83), al Código Procesal Penal (D.9-99-E) y a la Ley contra la Violencia Doméstica (D.132-97) | Pág. 1 |
| Publicación | La Gaceta N.º 33,222, Tegucigalpa, 6 de septiembre de 2013, Sección A | Encabezado de cada página |
| Sanción | «a los veintisiete días del mes de febrero del año dos mil trece» | Pág. 46 (art. 19) |
| Ejecútese | «Tegucigalpa, M.D.C., 5 de septiembre de 2013» | Pág. 46 |
| Firmas | Mauricio Oliva Herrera, Rigoberto Chang Castillo, Gladis Aurora López Calderón · Porfirio Lobo Sosa · Carlos Áfrico Madrid Hart | Pág. 46 |
| Vigencia | Art. 19: «a partir del día de su publicación en el Diario Oficial "La Gaceta"» | Pág. 46 |

## 2. Efectos normativos que declara el propio texto (los 19 artículos)

| Art. | Verbo | Instrumento afectado | Alcance (tal como está impreso) | Págs. |
|---|---|---|---|---|
| 1 | Reforma | Código de la Niñez y de la Adolescencia (D.73-96) | 123 artículos de la lista (1, 5, 20, 21, 32, 96 … 265 y 282), transcritos | 1–27 |
| 2 | Reforma | D.73-96 | Denominaciones de títulos, capítulos y secciones del Libro II | 27–28 |
| 3 | Adiciona | D.73-96 | «23 nuevos artículos» (lista 14 denominaciones: 31-A … 280-A), transcritos | 28–31 |
| 4 | Reforma | Código de Familia (D.76-84) | 28 artículos (11, 16, 23 … 320, 331), transcritos | 31–36 |
| 5 | Adiciona | D.76-84 | «treinta y seis (36) nuevos Artículos» (lista 34 denominaciones: 119-A … 332-A), transcritos | 36–41 |
| 6 | Reforma | Código Civil (Decreto Ejecutivo 76 de 1906) | Arts. 37, 234, 271, 434, «11»/«511» (C06, lectura dual), 516, 559, 960, 963, 972 y 973, transcritos | 41–42 |
| 7 | Reforma | Código Penal (D.144-83) | Título IV del Libro II y art. 147-A, transcritos | 42 |
| 8 | Adiciona | D.144-83 | «ocho (8) nuevos artículos» (lista 9: 147-B … 179-G), transcritos | 42–44 |
| 9 | Reforma (supresión parcial) | Código Procesal Penal (D.9-99-E) | Art. 27, transcrito | 44 |
| 10 | Reforma | Ley contra la Violencia Doméstica (D.132-97) | Art. 23, transcrito | 44–45 |
| 11 | Deroga | D.73-96 | Arts. 62–82; «Artículos 134; los literales ch), d), e) y f) del Artículo 141»; 170 y 171 | 45 |
| 12 | Deroga | D.73-96 | Denominaciones del Título II del Libro II | 45 |
| 13 | Deroga | D.76-84 | Art. 131 | 45 |
| 14 | Deroga | Código Civil (D. Ejecutivo 76 de 1906) | 324 artículos de la lista: 21 … 409 (con los saltos impresos), 427, 432, 433 y 965–970 | 45 |
| 15 | Deroga | D.144-83 (impreso «de fecha 23 de agosto de 1993») | Art. 179-C | 45 |
| 16 | Transitoria | — | Procedimientos y medidas por hechos anteriores: se rigen por la normativa anterior | 45 |
| 17 | Mandato | IHNFA, Ministerio Público, Poder Judicial y demás | Armonizar reglamentos, programas y presupuestos en 180 días | 45–46 |
| 18 | Transitoria | Secretaría de Justicia y Derechos Humanos con el IHNFA | Divulgación masiva en 3 meses | 46 |
| 19 | Vigencia | — | Desde su publicación en La Gaceta; sanción y firmas | 46 |

**Discrepancias impresas** (se cargan tal como están, sin corregir):
- art. 3: dice «23» y lista 14 denominaciones;
- art. 5: dice «36» y lista 34;
- art. 8: dice «ocho (8)» y lista 9;
- art. 15: el D.144-83 aparece con fecha «1993»;
- art. 14: los 16 saltos de numeración ya verificados en el impreso.

No afectan al texto, pero sí a cualquier matriz de reformas que se construya después.

## 3. Transcripción cotejada (D3) — FIRMADA

**Documento oficial al que se liga:** PDF del TSC, SHA-256 `FBD87F3396E5D0B6601A246008A1AE5BD870841B795D75AC42076245A154F2FF`, 46 páginas, La Gaceta N.º 33,222 del 6-sep-2013.

**Transcripción definitiva:** [`transcripcion_candidata/A04_transcripcion_candidata_v6.txt`](transcripcion_candidata/A04_transcripcion_candidata_v6.txt) · 176,506 caracteres · SHA-256 (bytes LF) **`7c8f40f844cc30f28f7bf6448151e995ed2df88bc3050a6f5b252a39709ce084`** · manifiesto `…_v6_manifiesto.json`.

| Paso | Contenido | Firma |
|---|---|---|
| C01–C06 | Hoja de decisión (`00_HOJA_DECISION_CLO.md`); C06 con lectura dual «11»/«511» | 16-nov-2026 |
| Resolución textual | 66 casillas (`03_RESOLUCION_TEXTUAL_A04.md`); B24 rectificada; rangos de la pág. 1 ratificados | 16-nov-2026 |
| Resolución complementaria | 464 casillas G1–G10 (`04_RESOLUCION_COMPLEMENTARIA_A04.md`), sin excepciones; K024, K131, K160, K209, K463 y K464 expresas | 16-nov-2026 |
| **Cotejo D3** | `transcripcion_candidata/LISTA_COTEJO_D3_A04.md`: 19 artículos, 854 diferencias frente al OCR, **15 `[ilegible]`** (arts. 1: 8, 3: 1, 5: 6) | **16-nov-2026, ☒ Conforme** |

- Firmante (texto de `--cotejado-por`): **Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-16 (LISTA_COTEJO_D3_A04.md)**.
- **La ingesta exige este hash exacto** (`--transcripcion-sha256`) y que el PDF sea el del TSC (`fbd87f33…`). Si cambia una sola letra, se detiene.
- Las 15 lagunas `[ilegible]` están en los arts. 1, 3 y 5. Los tres son `CONTEXT` por D5 (Decisión 3 de la resolución textual).

### Firma D3 sobre la v7 — FIRMADA (2026-11-18)

| Campo | Valor |
|---|---|
| Instrumento | `HN:DECRETO_35_2013` · Decreto Legislativo No. 35-2013 · La Gaceta No. 33,222 del 6-sep-2013 |
| Versión aprobada D3 | **v7**: [`transcripcion_candidata/A04_transcripcion_candidata_v7.txt`](transcripcion_candidata/A04_transcripcion_candidata_v7.txt) · 176.391 caracteres · **0 lagunas `[ilegible]`** |
| SHA-256 (bytes LF) | **`460e493db5e97a9dba53345010281dc338642edee525b6cfbc9fee2f3ddab023`** |
| Origen | v6 (`7c8f40f8…`, D3 del 16-nov-2026) + las 18 correcciones del cotejo con el ejemplar 2 (sello CEDIJ, `b5db8bf7…`), firmadas en `07_HOJA_DECISION_COTEJO_EJEMPLAR2.md` |
| Firmante | **Abg. y Not. Fredy Omar Pinel Flores** · rol **propietario_despacho** (CLO / Director Maya Lex) · **2026-11-18** |
| Texto de `--cotejado-por` | `Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-18 sobre la v7 (ADJUDICACION_CLO_D35_2013.md §3)` |

- **Alcance de la firma, según el CLO:** registra la D3 de la v7 en su manifiesto (`…_v7_manifiesto.json`, `estado = TEXTO_DEFINITIVO_FIRMA_D3`) y en este pliego, y prepara el SQL de actualización controlada para `mayalexhn-staging`. El SQL **no se ejecuta** hasta que el CLO lo revise (§6, constancia D3-v7).
- **La v6 conserva su D3 del 16-nov-2026** y sigue siendo el texto cargado en staging hasta que se aplique esa actualización. Producción: V4→V5 **sin firmar**.
- La ingesta con la v7 exige este hash (`--transcripcion-sha256 460e493d…`) y el PDF del TSC (`fbd87f33…`). Con esos datos produjo **19 filas y 0 excepciones**, con los mismos `id` que la v6.

## 4. Decisiones del CLO (solo una persona; ninguna la toma el código)

| # | Decisión | Opciones | Propuesta |
|---|---|---|---|
| D1 | Procedencia | ☒ **Acreditada** (firmado 16-nov-2026, §7) ☐ No acreditada | **Acreditada:** copia del TSC (dominio verificado, tier 4), bytes `fbd87f33…`, descargada por el Bot Auditor por orden del CLO (§0) |
| D2 | Identidad | ☒ **Confirmada** (firmado 16-nov-2026, §7) ☐ Rechazada | **Confirmada:** título, número, Gaceta, sanción, ejecútese y firmas constan en el PDF del TSC (§1) |
| D3 | Texto que se carga | ☒ **(a) Transcripción cotejada v6** — firmada el 16-nov-2026 | — |
| D4 | Vigencia | ☒ **Aprobar la propuesta** (TRUE_PRESUNTA desde el 6-sep-2013, §7) ☐ Visible solo como contexto (`NULL`) ☐ Modificar | Ver §5 |
| D5 | Rol de los 19 artículos | ☒ **Art. 11 también `CONTEXT`** (§7): arts. 1–11 `CONTEXT` (11); arts. 12–19 fuente principal (8) ☐ Modificar | Propuesta original: 10/9; el CLO eligió la alternativa 11/8 |
| D6 | Tipo de fuente | ☒ **`ley`** ☐ Otro | `ley` |
| D7 | Quitar el bloqueo `INSTRUMENTO_SIN_PLIEGO_CLO` | ☒ **Sí, en el orden estricto de D7, solo en staging** (§7) ☐ No todavía | Ingesta en staging → visibilidad en staging → PR de `clo-guards.ts` |
| D8 | Promoción | ☒ **V3→V4 solo en staging** (firmado 17-nov-2026, §7) · **V4→V5 (producción) expresamente sin firmar** | El rótulo V4 de las filas en staging tiene firma expresa en D8 |

## 5. Propuesta para D4 (vigencia)

**Propuesta de declaración:** «El Decreto 35-2013 está vigente desde el 6 de septiembre de 2013, fecha de su publicación en La Gaceta N.º 33,222 (art. 19). No consta reforma ni derogación expresa **del propio decreto** en el registro normativo de MayaLex. Vigencia: **TRUE_PRESUNTA**, sujeta al cotejo del CLO.»

Base y límites:
1. **Texto propio:** solo cita decretos anteriores (73-96, 76-84, Decreto Ejecutivo 76 de 1906, 144-83, 9-99-E y 132-97).
2. **Registro de MayaLex:** no hay ninguna reforma ni derogación registrada del D.35-2013 como tal.
3. **Límite:** en esta adjudicación **no se hizo una búsqueda externa nueva** de reformas del propio D.35-2013. La que se hizo para el D.284-2013 no lo cubre. Tampoco se consultó el registro del Congreso Nacional ni La Gaceta posterior a 2013. Por eso la vigencia es «presunta» y no «verificada». Si el CLO no lo acepta, la alternativa es `NULL`: visible, pero todo el decreto solo contexto.
4. **Lo que sí se sabe que cambió después:** textos de los **códigos** reformados, no el decreto.
   - **C07:** el art. 21 de la Niñez, en la versión que transcribe el art. 1, fue derogado por el D.130-2017 (art. 632, num. 12). La Gaceta (34,940 o 39,940) y la fecha de efecto **no están cotejadas**. Ver `paquete-revision/EVENTOS_ARTICULO_21.md`.
   - Por eso los arts. 1–10 son `CONTEXT` (D5), igual que el art. 11 mientras esté pendiente su alcance derogatorio, y **ninguna fila del decreto debe presentarse como texto vigente de los códigos** que reforma.
5. **Disposiciones agotadas:**
   - Los arts. 1–15 son modificatorios o derogatorios, y su efecto quedó incorporado en las leyes afectadas.
   - Los arts. 17 (180 días) y 18 (3 meses) fijan plazos vencidos.
   - El art. 16 rige solo los procesos por hechos anteriores al 6-sep-2013.
   - Todos siguen vigentes como texto del decreto.
6. **En la base:** `es_norma_vigente = true` (la columna es booleana) y, en `metadata`, `vigencia = "TRUE_PRESUNTA"`, `vigencia_desde = "2013-09-06"` y `vigencia_base`. El mismo límite del D.284: `clo-guards.ts` solo lee el booleano.

## 6. Qué ocurre después de aprobar (y solo entonces): orden estricto de D7

**Estado de partida (verificado el 16-nov-2026 con una consulta de solo lectura):** staging no tiene ninguna fila de `HN:DECRETO_35_2013` ni del lote `A04_D35_2013_01`. Producción no se toca.

**Archivos generados** (`out/a04-d35-2013/`, carpeta que no se versiona):
- Con la transcripción v6 y `--serie-correlativa 19`, la ingesta produjo **19 filas y 0 excepciones**.
- El paquete del receptor, que segmenta el OCR con el segmentador general, tiene 18 artículos y no se usa.

```sh
npx tsx scripts/ingesta-lote-staging.ts "C:/Users/fredy/Downloads/Codigo_niñezyadolescencia_2013.pdf" \
  docs/corpus/staging/2026-11-16-hn-001-a04-tsc/candidates/PKG_DECRETO_35_2013_REFORMA_AL_CODIGO_DE_LA_NINEZ@v1.json \
  HN:DECRETO_35_2013 A04_D35_2013_01 \
  "Decreto 35-2013, reformas al Código de la Niñez y de la Adolescencia y a otras leyes (La Gaceta 33,222 del 6-sep-2013)" \
  out/a04-d35-2013 2 ley \
  --transcripcion docs/corpus/staging/2026-11-05-hn-001-a04-orientacion/transcripcion_candidata/A04_transcripcion_candidata_v6.txt \
  --transcripcion-sha256 7c8f40f844cc30f28f7bf6448151e995ed2df88bc3050a6f5b252a39709ce084 \
  --cotejado-por "Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho (CLO / Director Maya Lex), firma D3 del 2026-11-16 (LISTA_COTEJO_D3_A04.md)" \
  --serie-correlativa 19
npx tsx scripts/embeddings-lote-staging.ts out/a04-d35-2013/rows.jsonl out/a04-d35-2013
```

| D7 | Orden | Archivo | SHA-256 | Contenido |
|---|---|---|---|---|
| — | — | `rows.jsonl` | `8e08cca224ab9d9e51526b2742f0c9c60ab0af3aef53254f8e33851728d534ad` | 19 filas, arts. 1–19, texto de la v6, `cotejado_por` del firmante |
| **1. Ingesta** | 1 | `insert_staging.sql` | `684273a82302bb34c8b1b1de5aba164d5fba0ba765665ab41daa3290997e560a` | 1 INSERT de 19 filas, `ON CONFLICT (id) DO NOTHING`: ocultas, vigencia NULL, embedding NULL |
| | 2 | `update_embeddings_staging.sql` | `fdd8e57a267c053b29b88f5b344eb7495fca57f4d8a49bed5d5a1bb2e69345f3` | 19 UPDATE en una transacción. Modelo `Xenova/multilingual-e5-small`, «passage:», 384 dimensiones |
| | 3 | `verificacion_staging.sql` | `4fdfce0ed01db7f32eb871108de39039c39cc709d53932ff12ef3094ff56ff85` | Solo lectura: 19 en todas las columnas (incl. `norm_id = HN:DECRETO_35_2013`) y **0 visibles** |
| **2. Visibilidad** | 4 | `visibilidad_staging.sql` | `597ec161e16d04dbd75ea6bb2b85b322b4fd5ca794cec87c910b80fa208bd999` | Bloque atómico (§7): 19 visibles, `TRUE_PRESUNTA`, V4; **11 `CONTEXT` (arts. 1–11)**; constancias `INTERPRETACION_PENDIENTE_CLO` en los arts. 1 y 11; se aborta si los conteos no son exactos. Incluye la verificación y la reversión. Regenerado el 16-nov-2026 tras la firma (sustituye a `91cc8e06…`, que tenía el reparto 10/9) |
| **3. Código** | 5 | `d7/D7_clo_guards_DECRETO_35_2013.patch` (versionado) | `55c1991d2f07155e8b93c68d5caebcccb747c44742dc0666f6da7f2b2a60239c` | Actualizado al reparto 11/8 (sustituye a `36ec972d…`). Quita `DECRETO_35_2013` de `INSTRUMENTOS_SOLO_CONTEXT` y adapta `tests/d35-2013-catalogo.test.ts`. Se aplica en un PR aparte, **después** de la constancia de visibilidad, con la evidencia G6 regenerada en `C:\wtlf` |

El parche se verificó con `git apply --check` limpio y **50/50** (d35-2013-catalogo y d284-2013-pilot) antes de asentar el paso 3. La evidencia G6 de reversión (`docs/governance/evidence/g6-rollback-evidence.json`) se regeneró sobre bytes LF de `clo-guards.ts` tras aplicar el parche.

### Constancia · D7, paso 1 (ingesta en staging): verificado el 17-nov-2026
- **Aplicado por el CLO** en el SQL Editor de `mayalexhn-staging` (`aicakncgtuiiuomflkqj`), en orden: `insert_staging.sql` (`684273a8…`), `update_embeddings_staging.sql` (`fdd8e57a…`) y `verificacion_staging.sql` (`4fdfce0e…`). El Bot Auditor había verificado antes las tres huellas y que apuntan solo a staging.
- **Verificación independiente de Claude** (consulta de solo lectura sobre `public.biblioteca_vectores`, lote `A04_D35_2013_01`, 17-nov-2026):

| Comprobación | Esperado | Resultado |
|---|---|---|
| Filas · artículos distintos | 19 · 19 | **19 · 19** (1–19, sin huecos) |
| Con embedding (384 dimensiones, mín. y máx.) | 19 | **19** |
| Ocultas (`revision_pendiente = true`) · visibles | 19 · 0 | **19 · 0** |
| `es_norma_vigente` NULL | 19 | **19** |
| `jurisdiccion = 'HN'` · `fuente_tipo = 'ley'` | 19 · 19 | **19 · 19** |
| `metadata.norm_id = 'HN:DECRETO_35_2013'` | 19 | **19** |
| `metadata.transcripcion_sha256` = v6 `7c8f40f8…` | 19 | **19** |
| Con `metadata.rol` o `metadata.estado_v` | 0 | **0** |

- Las 19 filas cumplían la precondición de `visibilidad_staging.sql` (`597ec161…`). El paso 2 quedó asentado a continuación. Producción no se tocó.

### Constancia · D7, paso 2 (visibilidad en staging): verificado el 17-nov-2026
- **Aplicado por el CLO** en el SQL Editor de `mayalexhn-staging` (`aicakncgtuiiuomflkqj`): `visibilidad_staging.sql` con SHA-256 **`597ec161e16d04dbd75ea6bb2b85b322b4fd5ca794cec87c910b80fa208bd999`**, lote `A04_D35_2013_01` (`HN:DECRETO_35_2013`). El bloque de reversión se mantuvo comentado y **no se ejecutó**.
- **Resultado verificado** (post-aplicación, 17-nov-2026):

| Comprobación | Esperado | Resultado |
|---|---|---|
| Filas del lote | 19 | **19** |
| Visibles · ocultas | 19 · 0 | **19 · 0** |
| Vigentes (`es_norma_vigente`) · `TRUE_PRESUNTA` · `estado_v = V4` | 19 · 19 · 19 | **19 · 19 · 19** |
| `rol = CONTEXT` (arts. 1–11) | 11 | **11** (`arts_context`: 1,2,3,4,5,6,7,8,9,10,11) |
| Constancias `INTERPRETACION_PENDIENTE_CLO` | arts. 1 y 11 | **1,11** |
| Con embedding | 19 | **19** |

- Con estos conteos exactos queda habilitado el **paso 3** de D7. **D8 · V4→V5 a producción sigue expresamente sin firmar.** Producción no se tocó.

### Constancia · D7, paso 3 (código — retiro del bloqueo): asentado el 17-nov-2026
- **Parche aplicado:** `d7/D7_clo_guards_DECRETO_35_2013.patch` · SHA-256 **`55c1991d2f07155e8b93c68d5caebcccb747c44742dc0666f6da7f2b2a60239c`** (huella verificada antes de `git apply`).
- **Efecto:** `DECRETO_35_2013` sale de `INSTRUMENTOS_SOLO_CONTEXT` en `lib/legal-retrieval/clo-guards.ts`. Régimen adjudicado D5: arts. **1–11** `CONTEXT` (constancias `INTERPRETACION_PENDIENTE_CLO` en **1 y 11**); arts. **12–19** elegibles PRIMARY si cumplen los demás guardianes.
- **Pruebas:** 50/50 en `tests/d35-2013-catalogo.test.ts` + `tests/d284-2013-pilot.test.ts`; `npm run typecheck` limpio; evidencia G6 regenerada (`g6-rollback-evidence.json`, hash LF de `clo-guards.ts` = `a0a94b7c…`).
- **Límites:** staging V4 del lote `A04_D35_2013_01` (pasos 1–2). **V4→V5 a producción expresamente sin firmar.** Producción no se toca.

### Constancia · D3-v7: actualización de staging PREPARADA, NO APLICADA (2026-11-18)
- **Generación** (carpeta `out/`, no versionada):
  1. Ingesta con la v7, con el mismo comando del §6 y la v7, su hash y la firma D3 de la v7, en `out/a04-d35-2013-v7/`: 19 filas, 0 excepciones.
  2. Embeddings con `scripts/embeddings-lote-staging.ts`.
  3. SQL con [`d3v7/generar_actualizacion_v7_staging.py`](d3v7/generar_actualizacion_v7_staging.py) (`python -I`, determinista).

| Archivo | SHA-256 | Contenido |
|---|---|---|
| `out/a04-d35-2013-v7/rows.jsonl` · `update_embeddings_staging.sql` | `be5003aa1ea1b6b91b1432e5ea5d01a057b6bd4b9fcc86980863c6cdad4e2c20` · `e8f5db3199be3330fc78a3d1b49f530f47e366cff651900b69e802062a7fd861` | 19 filas v7, mismos `id` que la v6 |
| **`out/a04-d35-2013-v7/actualizacion_v7_staging.sql`** | **`0de36a7ca6b484bd8ecbed9d2486136ce8a414bb6d2868a85fc1b00640221c76`** | Bloque atómico (`DO`) con precondición y postcondición. Ver el detalle debajo de la tabla. |
| `out/a04-d35-2013-v7/reversion_v7_a_v6_staging.sql` | `47d0b9662fd99d3b8e0f85cff1d6d637fa63f65f1e7d986bd473d51657f35bd3` | Vuelta exacta a la v6 (texto, hashes, embeddings y claves). **Solo por orden del CLO.** |

**Qué hace `actualizacion_v7_staging.sql`:**
- **Arts. 1, 3, 5 y 6:** pasan al texto v7. Cambian `contenido`, `hash_contenido`, `article_sha256` y `embedding`.
- **Las 19 filas:** cambian solo `transcripcion_sha256`, `text_sha256` y `cotejado_por`, y se agregan `transcripcion_anterior_sha256` y `transcripcion_version = v7`. **No toca** visibilidad, vigencia, `rol`, `estado_v`, constancias ni `es_norma_vigente`.

- **Qué cambia y qué no (comprobado al generar):**
  - El texto solo cambia en los arts. 1, 3, 5 y 6 del decreto, que contienen las 18 correcciones.
  - En los otros 15 artículos el texto es idéntico al de la v6, igual que su embedding.
  - En los arts. 1, 3 y 5 el embedding también sale idéntico: el modelo e5-small lee los primeros 512 tokens y las correcciones caen más adelante. **Solo cambia el embedding del art. 6.**
  - Los textos incrustados en los dos SQL cumplen `sha256(contenido) = hash_contenido`.
- **Precondición verificada en staging** (consulta de solo lectura, 2026-11-18):

| Comprobación | Esperado | Resultado |
|---|---|---|
| Filas del lote | 19 | **19** |
| En v6, visibles, vigentes, V4, con embedding | 19 | **19** |
| `CONTEXT` | 11 | **11** |
| Texto v6 en los arts. 1, 3, 5 y 6 (`hash_contenido`) | 4 | **4** |
| Constancias `INTERPRETACION_PENDIENTE_CLO` (arts. 1 y 11) | 2 | **2** |
| `TRUE_PRESUNTA` | 19 | **19** |

- **Pendiente:** revisión del CLO y aplicación en el SQL Editor de `mayalexhn-staging`. Después, una verificación independiente de Claude (la consulta del final del SQL: 19 · 19 · 4 · 19 · 11 · 2). **Producción no se toca. V4→V5 sigue sin firmar.**
- La resolución de los puntos (a)–(d) de los arts. 134 y 141 (`paquete-revision/PASAJES_134_141.md`) **no está en este SQL**. Si el CLO la firma, va en un bloque aparte, generado y revisado por separado.

### Resolución del CLO sobre el art. 11 (arts. 134 y 141 del D. 73-96) — FIRMADA (2026-11-18)
- **Firma:** Abg. y Not. Fredy Omar Pinel Flores, propietario_despacho, 2026-11-18. El texto completo está en `paquete-revision/PASAJES_134_141.md` §6.
- **Decisiones:**
  - (a) Los literales ch) y d) pertenecen al **art. 141**; las notas 23 y 24 de A03 son un error editorial.
  - (b) Los literales e) y f) quedaron **derogados del art. 141**.
  - (c) «Artículos 134» **deroga íntegramente el art. 134**; el delito de explotación económica pasa al art. 179-F del Código Penal por el art. 8 del decreto.
  - (d) Para este pliego **basta** La Gaceta 33,222 (TSC y CEDIJ) con la fuente orientativa del D. 73-96. **El cotejo con La Gaceta 28,053 queda para D1–D2 de `HN:CODIGO_NINEZ`.**
- **D5 no cambia:** el art. 11 sigue `CONTEXT` y el reparto sigue siendo 11/8. La constancia del art. 1 (C07) sigue pendiente.

| Archivo (`out/a04-d35-2013-v7/`) | SHA-256 | Contenido |
|---|---|---|
| `actualizacion_v7_staging_compacta.sql` | `903450869220726f673ce51010e9b6c006365744a22fa85616ac9d0ff4052b43` | **Mismo efecto** que `actualizacion_v7_staging.sql` (`0de36a7c…`), con las mismas precondiciones y postcondiciones. Ver la nota debajo de la tabla. |
| `resolucion_art11_staging.sql` | `d17191e721da0ae0c210db9135bb44ff4c38d39043b31812d91d3b223ca4a1a0` | Exige la v7 aplicada en las 19 filas. En el art. 11: `INTERPRETACION_PENDIENTE_CLO` → `interpretacion_estado = RESUELTO_CLO_2026_11_18`, con el resumen de la resolución (se conserva el texto anterior) y `motivo_rol = DISPOSICION_DEROGATORIA…`. Postcondición: 1 pendiente (art. 1), 1 resuelta (art. 11), 11 `CONTEXT`. Incluye la verificación final y la reversión, comentada. |

**Sobre la variante compacta:**
- **Qué hace:** en lugar de incrustar el texto íntegro (167 KB), aplica en la base las 18 sustituciones firmadas sobre el texto v6 ya cargado. Después se **aborta** si el `sha256(contenido)` que calcula Postgres no es el `hash_contenido` de la v7.
- **Por qué existe:** el archivo completo no cabe de forma fiable en una llamada de la herramienta de Supabase.
- **Verificación local:** las 18 sustituciones están una vez cada una en su fila y reproducen byte a byte el texto v7 de los arts. 1, 3, 5 y 6.

## 7. Hoja de firma D1, D2 y D4–D8 (D3 ya firmado)

> Propuestas técnicas de Claude (no son revisión jurídica). **Las casillas marcadas (☒) son las firmadas por el CLO el 16-nov-2026, salvo D8 · V3→V4 solo en staging, firmada el 17-nov-2026.**

### D1 · Procedencia
**Propuesta:** acreditada (§0).
☒ **Acreditada.** Procedencia oficial institucional del TSC: `www.tsc.gob.hn`, `FBD87F3396E5D0B6601A246008A1AE5BD870841B795D75AC42076245A154F2FF`, tier 4, descarga del 2026-11-16 09:26:55 CST / 15:26:55 UTC ☐ No acreditada

### D2 · Identidad
**Propuesta:** confirmada (§1).
☒ **Confirmada** ☐ Rechazada

### D4 · Vigencia
**Propuesta:** la declaración del §5, **TRUE_PRESUNTA desde el 6-sep-2013** (art. 19), con `es_norma_vigente = true` en las 19 filas.
☒ **Aprobar la propuesta** (`TRUE_PRESUNTA` desde el 6-sep-2013, La Gaceta 33,222), con la constancia del §5 de que no se efectuó búsqueda externa posterior de reformas del propio decreto ☐ Visible solo como contexto (`NULL`) ☐ Modificar: ______

### D5 · Reparto de los 19 artículos
**Propuesta:** una fila por artículo del decreto (19). No se crean versiones nuevas de los códigos; eso es un trabajo aparte, con su propio pliego.

| Rol | Arts. | Motivo |
|---|---|---|
| **`CONTEXT`** (`metadata.rol = "CONTEXT"`, `motivo_rol = "DISPOSICION_MODIFICATORIA"`) — **10** | **1, 2, 3, 4, 5, 6, 7, 8, 9, 10** | Reproducen texto reformado o adicionado de otras leyes: Niñez (1, 2, 3), Familia (4, 5), Código Civil (6), Código Penal (7, 8), Código Procesal Penal (9), Ley contra la Violencia Doméstica (10). Ese texto pudo cambiar después (C07) y no debe citarse como texto vigente de esas leyes. Las 15 lagunas están aquí (arts. 1, 3 y 5) |
| **Fuente principal del decreto** (elegibles PRIMARY si cumplen los demás guardianes) — **9** | **11, 12, 13, 14, 15** | Derogatorias propias y autónomas: el decreto decide la derogación. No transcriben texto ajeno |
| | **16, 17, 18, 19** | Transitoria procesal, mandato de armonización, divulgación y vigencia, con sanción y firmas |

**Constancias `INTERPRETACION_PENDIENTE_CLO`** (en `metadata.interpretacion_pendiente_clo`; no cambian el rol):
- **Art. 11 · arts. 134/141 del D.73-96.** El texto se carga tal como está impreso. El alcance de «Artículos 134; los literales ch), d), e) y f) del Artículo 141» queda pendiente: el 141 reformado solo tiene a), b) y c), y el consolidado A03 anota ch) y d) en el 134 (`paquete-revision/PASAJES_134_141.md`). La relación `DEROGA` no se aplica a ninguna versión del Código de la Niñez hasta la decisión del CLO.
- **Art. 1 · C07 (art. 21 de la Niñez).** Derogación posterior por el D.130-2017 (art. 632, num. 12). La Gaceta 34,940 o 39,940 y la fecha de efecto siguen sin cotejar. El art. 1 ya es `CONTEXT`.

**Alternativa para el art. 11:** si el CLO prefiere que una derogación de alcance dudoso no sea citable como fundamento, el art. 11 pasa a `CONTEXT`. Quedarían 11 `CONTEXT` y 8 principales, y en el SQL cambian el `IN (...)` y el conteo de 10 a 11.

**Límite (el mismo del D.284):** la marca `rol` la lee el resolutor exacto. En la ruta semántica solo surte efecto si la RPC devuelve `metadata_clo` (propuesta no aplicada).

☐ Aprobar (arts. 1–10 `CONTEXT`; 11–19 del decreto; constancias en los arts. 1 y 11) ☒ **Aprobar con el art. 11 también `CONTEXT`** ☐ Modificar: ______

**Reparto firmado:**
- **11 `CONTEXT`:** arts. 1–10, que reforman o adicionan el Código de la Niñez, el de Familia, el Civil, el Penal, el Procesal Penal y la Ley contra la Violencia Doméstica, **más el art. 11**. Este queda como contexto mientras esté pendiente el contraste derogatorio de los arts. 134 y 141 del D.73-96 (`INTERPRETACION_PENDIENTE_CLO`). La constancia C07 va en el art. 1.
- **8 fuente principal del decreto:** arts. 12–19, que son derogaciones propias y disposiciones transitorias, de armonización, de divulgación y de vigencia.

### D6 · Tipo de fuente
**Propuesta:** `ley`, que ya tienen las 19 filas.
☒ **`ley`** ☐ Otro: ______

### D7 · Quitar el bloqueo `INSTRUMENTO_SIN_PLIEGO_CLO`
**Propuesta:** sí, en tres tiempos y en este orden estricto (§6):
1. **Ingesta en staging:** archivos 1–3; la verificación debe dar 19/19 y 0 visibles.
2. **Visibilidad en staging:** archivo 4, con su constancia registrada en este pliego.
3. **Cambio de código:** PR con el parche de `clo-guards.ts`, las pruebas y la evidencia G6.

Hasta que ese PR se fusione y se despliegue, las filas visibles siguen siendo solo contexto.
☒ **Sí, en el orden estricto de D7, únicamente en `mayalexhn-staging` (V4):**
1. `insert_staging.sql`, los embeddings y la verificación, que debe dar 19 filas ocultas.
2. `visibilidad_staging.sql`, que debe verificar 19 visibles, 11 `CONTEXT` y 2 constancias.
3. Por último, el parche de `clo-guards.ts`.

☐ No todavía

### D8 · Promoción
**Propuesta:** **V3→V4** (revisión profesional) con D1–D7 resueltas. En las filas: `metadata.estado_v = "V4"` y `metadata.adjudicacion = "ADJUDICACION_CLO_D35_2013 §7"`. **V4→V5** (producción) **no** se firma en esta hoja: requiere una migración revisada hacia producción y una autorización expresa aparte.
☒ **V3→V4 solo en staging** (`mayalexhn-staging`, `aicakncgtuiiuomflkqj`) — firmado expresamente por **Abg. y Not. Fredy Omar Pinel Flores**, rol ☒ **propietario_despacho** (CLO / Director Maya Lex), **2026-11-17** · ☐ **V4→V5 a producción: expresamente sin firmar** ☐ Rechazado
> El 16-nov-2026 el CLO firmó D1, D2 y D4–D7 y dejó D8 sin firmar. El 17-nov-2026, por recomendación del Bot Auditor y para evitar cualquier ambigüedad futura, firmó expresamente la promoción **V3→V4 solo en staging**, que es el `estado_v = "V4"` que graba `visibilidad_staging.sql`. **V4→V5 hacia producción sigue expresamente sin firmar** y requiere una migración revisada y una autorización aparte. El texto de `adjudicado_por` en las filas conserva la fecha de la firma del pliego (2026-11-16); la firma de D8 consta aquí.

### Firma
«Como CLO/Director, adjudico el Decreto 35-2013 (`HN:DECRETO_35_2013`) según las casillas marcadas en D1, D2 y D4–D8 de esta hoja, y autorizo la ingesta y la escritura de visibilidad **solo en staging** (`aicakncgtuiiuomflkqj`), en el orden de D7.»

Nombre: **Abg. y Not. Fredy Omar Pinel Flores** · Rol: ☐ abogado_revisor_senior ☒ **propietario_despacho** (CLO / Director Maya Lex) · Fecha: **2026-11-16**

**FIRMADO (16-nov-2026):** el Titular aprobó y firmó expresamente:
- D1 y D2;
- D4, con la constancia del §5;
- D5, con el art. 11 también `CONTEXT`: 11 de contexto y 8 principales;
- D6;
- D7, en orden estricto y solo en staging.

D3 ya estaba firmado sobre la v6 `7c8f40f8…`, con 176,506 caracteres, 19 artículos en serie, 15 lagunas `[ilegible]` y los 16 saltos impresos del art. 14. **D8 (V4→V5) queda expresamente sin firmar.** Producción no se toca.

**FIRMADO (17-nov-2026):** el Titular firmó expresamente **D8 · V3→V4 solo en staging** (Abg. y Not. Fredy Omar Pinel Flores, `propietario_despacho`). **V4→V5 a producción sigue expresamente sin firmar.**

Texto previsto de `adjudicado_por` en las filas: **Abg. y Not. Fredy Omar Pinel Flores — propietario_despacho (CLO / Director Maya Lex) — 2026-11-16**
