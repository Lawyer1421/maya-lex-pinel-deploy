# P0: LEY DE ORGANIZACIÓN Y ATRIBUCIONES DE LOS TRIBUNALES (LOAT, 1906)
## Diagnóstico de fuentes e inventario canónico — Fase 2, relevamiento preliminar

**Fase:** P0-LOAT (relevamiento documental)  
**Fecha:** 2026-10-02  
**Proyecto:** thgrhueckkjdutjvcufp (MayaLex Pro)  
**Rama:** `feature/p0-loat-corpus-inventory`  
**Base:** `origin/main` `4d059dc36ec32bc64e003ffbe003be215c044e3b`  
**Production writes:** 0  

Este documento registra lo observado en el repositorio y en fuentes documentales públicas. No es un dictamen CLO cerrado y no autoriza ingesta.

---

## 1. Identidad canónica (no congelada)

| Campo | Valor en este pase | Estado |
|---|---|---|
| Nombre | Ley de Organización y Atribuciones de los Tribunales | Observado |
| Sigla de trabajo | LOAT | Editorial |
| Id ya medido en H5 / backlog | `HN_LEY_ORGANIZACION_TRIBUNALES` | Clave de inventario vigente para la ausencia |
| Alias del triage de gobernanza | `HN_LEY_ORGANIZACION_ATRIBUCIONES_TRIBUNALES` | Alias. No se abre un segundo instrumento |
| Habilitación legislativa | Decreto 76 de la Asamblea Nacional Constituyente, 19 de enero de 1906 | El decreto faculta al Ejecutivo a emitir códigos y leyes. No es el articulado de la LOAT |
| Vigencia inicial del articulado | 1 de marzo de 1906, artículo 264 del texto compilado TSC | Observado en esa compilación |
| Fecha de emisión del articulado | El encabezado leído no trae un "dado" distinto del Decreto 76. Una fuente secundaria IAIP fecha la ley el 8 de febrero de 1906 | `EMISSION_DATE_UNRESOLVED` |
| Gaceta de publicación original | No leída en este pase | `NO_MEDIDO` |
| Presencia física en corpus | 0 candidatos | `ABSENT_VERIFIED` (H5) |

No se equipara la LOAT con el Código de Procedimientos emitido por el Ejecutivo el 8 de febrero de 1906. Comparten la delegación del Decreto 76 y, en una fuente secundaria, el mismo día de emisión. El Código Procesal Civil los trata como cuerpos distintos: su derogatoria nombra al Código de Procedimientos, no a la LOAT.

---

## 2. Línea base documental en el repositorio

Lectura sobre `origin/main` `4d059dc`. No se ejecutó SQL. La medición H5 ya versionada se cita; no se renovó.

### 2.1 Ausencia física ya medida

`docs/corpus/evidence/H5_ALIAS_DISCOVERY_RESULTS.json`

| Campo | Valor |
|---|---|
| `canonical_id` | `HN_LEY_ORGANIZACION_TRIBUNALES` |
| Instrumento | Ley de Organización y Atribuciones de los Tribunales |
| `candidate_matches` | 0 |
| `absence_status` | `ABSENT_VERIFIED` |
| `measurement_status` | `MEDIDO` |
| Ámbito de búsqueda | `fuente` + `metadata::text` |
| Procedencia | production SQL Editor, manual, `production_write: false` |
| `project_ref` | thgrhueckkjdutjvcufp |

Esa ausencia no prueba que el texto no exista fuera de la base. Prueba que esos dos campos no devolvieron candidato.

### 2.2 Dónde aparece la LOAT, sin texto consolidado

| Artefacto | Qué contiene | Qué no contiene |
|---|---|---|
| `docs/corpus/MAYALEX_CORPUS_INGESTION_BACKLOG_V1.md` / `.json` | P0, id `HN_LEY_ORGANIZACION_TRIBUNALES`, siguiente acción histórica `SOURCE_DISCOVERY_PENDING_AUTHORIZATION` | Texto, conteo de artículos, reformas |
| `docs/corpus/MAYALEX_CORPUS_MASTER_INVENTORY_V1.md` / `.json` | Fila `ABSENT_VERIFIED` / `PENDING_SOURCE_DISCOVERY` | Fuente simple adjudicada |
| `docs/corpus/MAYALEX_CORPUS_IDENTITY_ADJUDICATION_V1.md` | Fila de ausencia, 0 coincidencias | Adjudicación de vigencia |
| `docs/corpus/corpus-inventory-v2.json` | `P0_TRIBUNALES: 1` | Articulado |
| `docs/corpus/MAYALEX_CORPUS_GAP_ANALYSIS.md` (Bloque 4) | Pregunta abierta: validar si la fuente es simple o está distribuida en varias leyes | Respuesta |
| `docs/governance/fase1-triage/decretos-tribunales-pendientes.md` | Cola de decretos históricos de reforma o creación de juzgados, id largo de triage. 2 reclasificados por lectura (Decretos 91 y 90); el resto pendiente | Texto base de 1906 |
| `docs/governance/DECISION_LOG.md` (entrada que remite a ese triage) | 30 hallazgos de `HN_LEY_ORGANIZACION_ATRIBUCIONES_TRIBUNALES`, grupo secundario, no resuelto | Cola `HUMAN_LEGAL_REVIEW_QUEUE.jsonl`, que no está en el árbol de `origin/main` |
| Script de ingesta | No hay `scripts/ingesta-loat*` ni equivalente | A diferencia de Comercio (`scripts/ingesta-comercio.ts`), no hay extractor previo |

### 2.3 Cuerpos vecinos ya presentes en inventario (no son la LOAT)

Sirven como contexto de desplazamiento. Este pase no los remeasure.

| Id de inventario | Instrumento | Estado de inventario |
|---|---|---|
| `HN_CPC_PRIMARY_NORMATIVO` y capas hermanas | Código Procesal Civil (Decreto 211-2006), cuatro capas | `PRESENT`. El rol temporal de `HN_CPC_TEXTO_BASE_D211_2006` sigue `UNRESOLVED` (E5) |
| `HN_LEY_JUSTICIA_CONSTITUCIONAL` | Ley sobre Justicia Constitucional | `PRESENT`, 124 / 124, `MEDIDO_PREVIO` |

---

## 3. Fuente documental pública usada en este relevamiento

Compilación PDF del Tribunal Superior de Cuentas:

`https://www.tsc.gob.hn/web/leyes/Ley%20de%20Organizaci%C3%B3n%20y%20Atribuciones%20de%20los%20Tribunales%20(07).pdf`

Estructura observada, no segmentada:

1. Decreto 76 de 19 de enero de 1906 (delegación al Ejecutivo).
2. Ley de Organización y Atribuciones de los Tribunales, Título I a Título XVIII.
3. El articulado propio leído cierra en el artículo 264: la ley rige el 1 de marzo de 1906 y deroga la Ley de Organización y Atribuciones de los Tribunales entonces vigente.
4. El mismo PDF sigue con notas editoriales de actualización y con decretos de reforma o de creación de juzgados anexos. Hay repetición de numeración. Por eso el conteo de artículos únicos queda `NO_MEDIDO`.
5. No es una fe de erratas del Congreso ni una Gaceta de 1906. Es una compilación administrativa con notas. Las notas no se elevan a derogación expresa.

Respuesta preliminar a la pregunta del Bloque 4 ("fuente simple o distribuida"): la fuente pública disponible es **distribuida**. El núcleo es el articulado de 1906; la vigencia operativa está repartida entre notas de la compilación, decretos anexos y leyes posteriores que no forman parte del PDF.

---

## 4. Mapa de desplazamiento (candidatos, no adjudicados)

Cada fila es una hipótesis de trabajo. Ninguna autoriza marcar `es_norma_vigente` ni ingerir.

| Eje | Fuente leída | Efecto observado sobre la LOAT | Estado |
|---|---|---|---|
| CPC, Decreto 211-2006 | PDF TSC del Código Procesal Civil, arts. 919, 921 y 931 | El art. 921 deroga rangos del Código de Procedimientos del 8 de febrero de 1906. No nombra la LOAT. El art. 931 reenvía las remisiones a ese código, salvo jurisdicción voluntaria, al CPC | Desplazamiento por remisión, posible. Derogación expresa de la LOAT: no observada |
| Carrera judicial / Consejo / CSJ | Notas de la compilación TSC de la LOAT; Constitución art. 313 citada ahí; Gaceta reproducida en fuente periodística del 20 de febrero de 2026 | Las notas remiten nombramientos al art. 26 de una "Ley de la Carrera Judicial" y la creación de juzgados al art. 313 constitucional. El decreto de esa ley no está numerado en las notas leídas | `UNRESOLVED` |
| Justicia constitucional, Decreto 244-2003 | PDF TSC de la Ley sobre Justicia Constitucional, art. 123 | Deroga la Ley de Amparo de 14 de abril de 1936, artículos puntuales del Código de Procedimientos y una cláusula residual. No nombra la LOAT | Cotejo artículo por artículo pendiente |
| Juzgados de competencia especial | Búsqueda de los nombres en la compilación TSC de la LOAT | Sin coincidencias para violencia doméstica, niñez, extorsión, privación de dominio ni jurisdicción nacional | Instrumentos de creación `NO_MEDIDO` |

El detalle normativo está en `docs/corpus/P0_LOAT_LEGAL_ADJUDICATION.md`.

---

## 5. Decretos históricos ya vistos en el triage (no reabiertos)

`decretos-tribunales-pendientes.md` no es el texto de 1906. Conserva una cola distinta:

- Reclasificados por lectura directa, según ese archivo: Decreto 91 (art. 254, inciso 5) y Decreto 90 (art. 78, inciso 4).
- Enriquecidos y aún con revisión legal pendiente, según ese archivo: Decretos 11, 8, 54, 102 y 38. El Decreto 11 tiene advertencia de homonimia numérica. El Decreto 54 tiene una inconsistencia de fecha de Gaceta ya detectada.
- Sin investigación posterior registrada ahí: Decreto 88 y creaciones de juzgado (Decretos 30, 15, 40, 41, 2 y 22).

Este relevamiento no los adjudica de nuevo y no los convierte en ingesta.

---

## 6. Compuertas

```
SOURCE_DISCOVERY_AUTHORIZED  = true   (solo fuentes documentales de la LOAT)
INGESTION_AUTHORIZED         = false
MERGE_AUTHORIZED             = false
production_writes            = 0
```

---

## 7. Siguiente cotejo documental (sin ingesta)

1. Separar, sobre la compilación TSC, el articulado de 1906 de los decretos anexos y fijar el conteo único.
2. Cotejar artículo por artículo las remisiones de la LOAT al Código de Procedimientos frente al art. 931 del CPC.
3. Identificar el decreto de la Ley de la Carrera Judicial citada en las notas, y mantener separado el Decreto 219-2011.
4. Listar artículos de la LOAT que todavía enuncian amparo, exhibición personal o inconstitucionalidad, y contrastarlos con el art. 123 del Decreto 244-2003.
5. Localizar el instrumento de creación de cada jurisdicción especial nombrada en la directiva. Hasta entonces permanecen `NO_MEDIDO`.
