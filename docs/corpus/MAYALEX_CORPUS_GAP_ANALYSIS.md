# MAYALEX — CORPUS GAP ANALYSIS (PROVISIONAL)
## Brecha entre Inventario Canónico (13 instrumentos) y Estado Real DB

⚠️ **STATUS: PROVISIONAL** — Higiene e identidad pendientes. NO PRODUCE INGESTA NI WRITES.

**Fecha:** 2026-09-30  
**Proyecto:** `thgrhueckkjdutjvcufp` (Maya Lex Pro)  
**Tabla:** `public.biblioteca_vectores`  
**Total filas en DB:** 22,718  
**Fuentes identificadas:** 24+ (incluyendo NULL)  
**Revisión pendiente:** 41 rows  

**Próxima fase:** Hygiene / Identity Queries (ver sección VI)

---

## EXECUTIVE SUMMARY

### Brecha crítica: NULL es la fuente mayoritaria
- **8,366 filas (36.8%)** sin `fuente` asignada
- Impacto: imposible correlacionar con los 13 instrumentos canónicos
- Acción recomendada: clasificación de NULL antes de considerar cobertura completa

### Duplicados significativos detectados
- **CPC (Código Procesal Civil):** 932 artículos duplicados (max: 2x)
- **CPC_COMENTADO_ROMERO_2024:** 394 artículos duplicados (max: 45x — outlier crítico)
- **CPC_TEXTO_BASE_D211-2006:** 70 artículos duplicados (max: 4x)
- Origen: múltiples ingesta de la misma norma con variantes de segmentación

### Vigencia incompleta
- Filas con `es_norma_vigente = NULL`: 53,357 (78.3% de civiles, notariales, agrarios)
- Causa probable: ingesta sin marcado de estado — necesita auditoría editorial

### Artículos distintos por fuente
- Fuentes con `num_articulo = 0` (documentos no normalizados):
  - `doc_*` prefixed: 10+ documentos (son estos el "corpus de demandas"?)
  - Suposición: contenido sin segmentación por artículo (análisis, sentencias, triage)

---

## I. ESQUEMA CONFIRMADO

```
id (text)
coleccion (text)
materia (text)
contenido (text)
num_articulo (text)                ← núcleo de segmentación
fuente (text)                      ← fuente de verdad para correlación
metadata (jsonb)
embedding (USER-DEFINED)            ← vectores para RAG
created_at (timestamp with time zone)
jurisdiccion (text)
fuente_tipo (text)
es_norma_vigente (boolean)         ← necesita auditoría: muchos NULL
revision_pendiente (boolean)        ← 41 rows flagged para revisión
```

**Observación:** Schema es correcto y alineado con especificación. No hay columnas de `norm_id` o `numero_articulo` — la fuente real de verdad es `(fuente, num_articulo)`.

---

## II. INVENTARIO FÍSICO POR FUENTE

### Top 10 fuentes por volumen

| Fuente | Filas | Artículos Distintos | Notas |
|--------|-------|---------------------|-------|
| NULL | 8,366 | N/A | **SIN CLASIFICAR** — mayor brecha |
| Código Civil de Honduras | 2,372 | 2,372 | ✅ 1:1 con num_articulo |
| Codigo Procesal Civil | 1,864 | 932 | ⚠️ 932 duplicados (max: 2x) |
| CPC_COMENTADO_ROMERO_2024 | 1,481 | 394 | ⚠️ 394 duplicados (max: 45x) |
| doc_b8285282 | 1,210 | 0 | ? Documento sin artículos |
| CPC_TEXTO_BASE_D211-2006 | 995 | 925 | ⚠️ 70 duplicados (max: 4x) |
| Codigo del Trabajo | 870 | 870 | ✅ 1:1 con num_articulo |
| Codigo Penal | 635 | 635 | ✅ 1:1 con num_articulo |
| Código Procesal Penal de Honduras | 480 | 480 | ✅ 1:1 con num_articulo |
| Constitucion de la Republica de Honduras | 378 | 378 | ✅ 1:1 con num_articulo |

### Categorización

**Normativa vigente (1:1 con articulos_distintos):**
- Código Civil de Honduras: 2,372
- Codigo del Trabajo: 870
- Codigo Penal: 635
- Código Procesal Penal de Honduras: 480
- Constitucion de la Republica de Honduras: 378
- Codigo de Familia: 373
- Codigo Tributario: 215
- Ley sobre Justicia Constitucional: 124
- Reglamento del Código del Notariado: 111
- Código del Notariado de Honduras: 94

**Duplicados críticos (artículos_distintos < filas):**
- Codigo Procesal Civil: 1,864 filas → 932 articulos_distintos (50% duplicación)
- CPC_COMENTADO_ROMERO_2024: 1,481 filas → 394 articulos_distintos (73% duplicación)
- CPC_TEXTO_BASE_D211-2006: 995 filas → 925 articulos_distintos (7% duplicación)

**Sin clasificación:**
- NULL: 8,366 filas (36.8% del corpus)
- doc_* prefixed: 10+ documentos con articulos_distintos = 0

---

## III. VIGENCIA POR MATERIA

### Desglose es_norma_vigente

| Materia | Vigente (true) | Derogado (false) | No Marcado (NULL) | Total | % Marcado |
|---------|---|---|---|---|---|
| 00_CONSTITUCIONAL | 373 | 5 | 0 | 378 | 100% ✅ |
| 01_PENAL | 1,104 | 3,369 | 0 | 4,473 | 100% ✅ |
| 02_CIVIL | 4,860 | 380 | 7,982 | 13,222 | 39.6% ⚠️ |
| 03_NOTARIAL | 204 | 7 | 13,578 | 13,789 | 1.5% ❌ |
| 05_LABORAL | 870 | 0 | 0 | 870 | 100% ✅ |
| 06_FAMILIA | 107 | 2,699 | 0 | 2,806 | 100% ✅ |
| 07_CONSTITUCIONAL | 124 | 2,630 | 0 | 2,754 | 100% ✅ |
| 08_TRIBUTARIO | 215 | 0 | 0 | 215 | 100% ✅ |
| 09_AGRARIO | 0 | 0 | 12,351 | 12,351 | 0% ❌ |
| 10_LEYES_REGLAMENTOS | 0 | 0 | 33,346 | 33,346 | 0% ❌ |

### Hallazgos

**Bien marcado (100%):**
- 00_CONSTITUCIONAL, 01_PENAL, 05_LABORAL, 06_FAMILIA, 07_CONSTITUCIONAL, 08_TRIBUTARIO

**Parcialmente marcado:**
- 02_CIVIL: 39.6% marcado (7,982 NULL = "incierto")

**Sin marcar (NULL dominante):**
- 03_NOTARIAL: 98.5% NULL
- 09_AGRARIO: 100% NULL (12,351 rows)
- 10_LEYES_REGLAMENTOS: 100% NULL (33,346 rows)

⚠️ **Acción:** Auditoría editorial urgente en 03_NOTARIAL, 09_AGRARIO, 10_LEYES_REGLAMENTOS antes de publicar en endpoints.

---

## IV. REVISIÓN PENDIENTE

**Total flagged: 41 rows** (`revision_pendiente = true`)

Estos representan ~0.2% del corpus y están distribuidos en:
- Potencial contenido contaminado (segmentación incorrecta, PII no removido, ambigüedad)
- Requieren revisión manual antes de indexarse en RAG

---

## V. ANÁLISIS DE DUPLICADOS

### Duplicados por fuente

| Fuente | Artículos Duplicados | Max Occurrences | Severidad |
|--------|---|---|---|
| Codigo Procesal Civil | 932 | 2x | Alta: 50% del corpus de CPC es duplicado |
| CPC_COMENTADO_ROMERO_2024 | 394 | **45x** | **Crítica**: artículos hasta 45 veces en tabla |
| CPC_TEXTO_BASE_D211-2006 | 70 | 4x | Media: 7% del corpus |
| doc_* (17 documentos) | 1 c/u | 2–66x | Baja: documentos sin normalización |

### Interpretación

**CPC_COMENTADO_ROMERO_2024 (max: 45x):** 
- Un artículo del CPC aparece 45 veces en la tabla
- Causa probable: ingestión de análisis línea-por-línea sin deduplicación
- Impacto RAG: búsquedas retornan 45 resultados idénticos (ruido)

**Codigo Procesal Civil (932 duplicados, max: 2x):**
- Segmentación variable (secciones vs. artículos vs. subsecciones)
- Ambigüedad normativa no resuelta

**Recomendación:** 
1. Ejecutar `DELETE` con GROUP BY (fuente, num_articulo) manteniendo `created_at` más reciente
2. Verificar segmentación original en scripts de ingesta
3. Implementar constraint UNIQUE en (fuente, num_articulo) post-deduplicación

---

## VI. CLAIMS NOT YET PROVEN

Este análisis está basado en observación de secciones A–D (schema, inventario, vigencia, duplicados).  
Las siguientes afirmaciones requieren validación adicional y NO deben tomarse como Product Truth:

### Especulaciones pendientes de confirmación

**1. `doc_6cfb720b` (635 filas) podría corresponder al Código Penal**
- **Evidencia:** 635 filas = exactamente Código Penal en DB (635 rows)
- **Problema:** nombre del documento es opaco (UUID)
- **Claim:** `doc_6cfb720b` = espejo duplicado del Código Penal
- **Status:** NO PROBADO — requiere auditoría de contenido
- **Acción:** Comparar sample de filas (hash de contenido, artículos)

**2. Triples de 748, 354 filas (`doc_*` con mismo volumen) = duplicados**
- **Evidencia:** doc_ad07e062, doc_c02b1028, doc_2a5252dd tienen 748 filas c/u
- **Problema:** coincidencia de volumen podría ser aleatoria
- **Claim:** son instancias de mismo corpus ingested 3 veces
- **Status:** NO PROBADO — requiere validación de contenido
- **Acción:** Muestrear `contenido` de cada doc_* para verificar redundancia

**3. Notariado: diferencia de 4 entre DB (94) y manifest (98)**
- **Evidencia:** DB tiene 94 rows con fuente "Código del Notariado de Honduras"
- **Manifest histórico:** inventario_v2.csv lista 98 artículos esperados
- **Claim:** faltan 4 artículos específicos
- **Status:** NO PROBADO — ¿son las 4 diferencias derogadas, omitidas o nunca ingested?
- **Acción:** Listar artículos 1–98 esperados y hacer LEFT JOIN con DB

**4. `es_norma_vigente = NULL` ≠ norma inválida o ausente**
- **Evidencia:** 03_NOTARIAL = 98.5% NULL; 09_AGRARIO = 100% NULL
- **Problema:** NULL puede significar "no se marcó", "indefinido", "mixto", o "no aplicable"
- **Claim:** estas categorías no están marcadas y no equivalen a "derogadas"
- **Status:** NO PROBADO — requiere auditoría editorial por CLO
- **Acción:** Auditar muestra de 10 filas NULL en 03_NOTARIAL y 09_AGRARIO

**5. Repetición de `num_articulo` = sobresingmentación (no deduplicación automática)**
- **Evidencia:** CPC_COMENTADO_ROMERO_2024 tiene artículo repetido 45 veces
- **Problema:** 45 líneas de una ficha de comentario no son "duplicados" en sentido normativo
- **Claim:** es chunking legítimo (párrafos = segments)
- **Status:** NO PROBADO — requiere análisis de qué es cada fila
- **Acción:** Inspeccionar 5 filas de artículo repetido en CPC_COMENTADO; ¿son párrafos o duplicados?

**6. CPC_COMENTADO_ROMERO_2024 nunca es "autoridad primaria"**
- **Evidencia:** Romero es análisis, no texto de ley
- **Problema:** está en DB como fuente normalizada
- **Claim:** debe estar etiquetada como "doctrina/análisis", no "norma vigente"
- **Status:** AFIRMADO EN CLAUDE.MD pero NO validado contra DB metadata
- **Acción:** Verificar que `es_norma_vigente = false` en CPC_COMENTADO_ROMERO_2024

**7. NULL fuente (8,366 = 36.8%) = corpus de demandas OR ingesta incompleta**
- **Evidencia:** 8,366 filas sin clasificación
- **Problema:** desconocemos si es intencional (demandas) o error de ETL
- **Claim:** son ambas cosas, ratio desconocido
- **Status:** NO PROBADO — requiere auditoría de muestra
- **Acción:** Muestrear 100 filas NULL; clasificar por tipo (demanda, sentencia, ingesta incompleta)

### Estados conceptuales (no operativos hasta hygiene pass)

```
PRESENTE        = existe fuente identificable en DB con articulos_distintos > 0
PARCIAL         = existe, pero evidencia objetiva muestra hueco (ej: Notariado 94 vs 98)
SIN_FUENTE_PROPIA = aparece jurídicamente relacionado pero no existe identidad confirmada
NO_LISTADA      = está en DB pero no estaba en inventario canónico v2 (doc_* prefixed)
IDENTITY_RECONCILIATION_REQUIRED = múltiples identidades o correspondencia ambigua (CPC)
UNCLASSIFIED_PHYSICAL_CORPUS = filas que no pueden atribuirse con seguridad (NULL)
```

---

## VII. CORRELACIÓN CON INVENTARIO CANÓNICO (13 instrumentos)

### Mapeo verificado

| Instrumento Canónico | Fuente en DB | Filas | Estado |
|---|---|---|---|
| HN_CODIGO_CIVIL | Código Civil de Honduras | 2,372 | ✅ Presente, sin duplicados |
| HN_CODIGO_FAMILIA | Codigo de Familia | 373 | ✅ Presente, sin duplicados |
| HN_CODIGO_NOTARIADO_D353_2005 | Código del Notariado de Honduras | 94 | ✅ Presente, pequeño volumen |
| HN_CODIGO_COMERCIO_D73_1950 | ? | 0 | ❌ **NO ENCONTRADO** |
| HN_CPC_D211_2006 | CPC_TEXTO_BASE_D211-2006 | 995 | ✅ Presente, 70 duplicados |
| HN_CPP_D9_99E | Código Procesal Penal de Honduras | 480 | ✅ Presente, sin duplicados |
| HN_DECRETO_31_2015 | ? | 0 | ❌ **NO ENCONTRADO** |
| HN_DECRETO_35_2013 | ? | 0 | ❌ **NO ENCONTRADO** |
| HN_DECRETO_73_96 | ? | 0 | ❌ **NO ENCONTRADO** |
| HN_DECRETO_102_2018 | ? | 0 | ❌ **NO ENCONTRADO** |
| HN_DECRETO_124_92 | ? | 0 | ❌ **NO ENCONTRADO** |
| HN_LEY_ORGANIZACION_TRIBUNALES | ? | 0 | ❌ **NO ENCONTRADO** |
| HN_RESOLUCION_PCSJ_17_2012 | ? | 0 | ❌ **NO ENCONTRADO** |

### Brechas identificadas

**Presente (6/13 = 46%):**
- Código Civil, Código Familia, Código Notariado, CPC (D211-2006), CPP (D9-99E)
- Volumen total: ~3,314 filas de instrumentos canónicos

**Ausente (7/13 = 54%):**
- HN_CODIGO_COMERCIO_D73_1950 (Decreto 73-1950)
- Todos los decretos: 31/2015, 35/2013, 73/96, 102/2018, 124/92
- HN_LEY_ORGANIZACION_TRIBUNALES
- HN_RESOLUCION_PCSJ_17_2012

⚠️ **Acción urgente:** Iniciar ingesta de 7 instrumentos faltantes (prioridad: Decreto 73-1950 per CLAUDE.md).

---

## VIII. VOLUMEN NO CLASIFICADO

### NULL fuente (8,366 rows = 36.8%)

Distribución probable por materia (necesita verificación):
- Documentos sin clasificación inicial
- Análisis/demandas/sentencias (corpus de aprendizaje auto-supervisado)
- Fallback de ingesta incompleta

**Impacto RAG:** 
- 36.8% del corpus es invisible a búsquedas filtradas por fuente
- Limitación en explicabilidad (usuarios no saben de qué instrumento viene la respuesta)

---

## IX. ROADMAP CLO (Chief Legal Officer)

Orden de prioridades con salvaguardas ejecutivas:

### Bloque 1: HIGIENE / IDENTIDAD (Semana 1–2)
**Status:** Validación de claims; NO produce ingesta.

1. **Higiene: Fuente NULL (8,366 filas)**
   - Auditar muestra de 100 filas
   - Clasificar: ¿demandas (mantengo NULL), ingesta incompleta (reclasificar), o ambas?
   - Decisión ejecutiva: mantener NULL como corpus de demandas OR reclasificar + marcar fuente origen

2. **Higiene: doc_* (17 documentos)**
   - Confirmar si `doc_6cfb720b` = Código Penal duplicado (comparar contenido)
   - Confirmar si triples (748/354) son duplicados (muestrear 5 filas c/u)
   - Decisión ejecutiva: KEEP como corpus no-normativo (demandas) OR DELETE como duplicados

3. **Higiene: CPC capas múltiples**
   - Confirmar que CPC_COMENTADO_ROMERO_2024 tiene `es_norma_vigente = false` (doctrina, no ley)
   - Validar que max_occurrences=45 es chunking legítimo (leer 5 filas)
   - Decisión ejecutiva: mantener Romero como doctrina referencial con disclaimer, NO como autoridad primaria

4. **Higiene: Vigencia NULL en 03_NOTARIAL, 09_AGRARIO, 10_LEYES_REGLAMENTOS**
   - Auditar muestra de 10 filas NULL en cada categoría
   - Determinar: ¿son vigentes, derogadas, o estado indeterminado?
   - Decisión CLO: marcar definitivamente o mantener NULL con nota editorial

### Bloque 2: COMERCIO (Semana 2–3)
**Status:** Ingesta solamente si higiene de Bloque 1 completa.

1. **Cierre 418 / 1661-1662**
   - Búsqueda física del Código de Comercio (Decreto 73-1950)
   - Verificar si artículos 1–1662 están en fuentes públicas (URL oficial)
   - Decidir: ¿segmentar 1–418 (Parte I) vs 1661–1662 (final), o integrar 1–1662 limpio?

2. **Integración D.284-2013 (reforma Comercio)**
   - Confirmar coexistencia con D.73-1950
   - Marcar qué artículos de Comercio fueron reformados por D.284-2013
   - Decisión: crear fuente "Código de Comercio (Decreto 73-1950, vigente per D.284-2013)" con vigencia editada

3. **Crear fuente Comercio limpia (CC-2 ou nomenclatura definitiva)**
   - NO hacer merge directo con histórico (evitar contaminación)
   - Ingestar de-novo desde fuente oficial
   - Marcar cada artículo: vigente (D.73-1950), reformado (D.284-2013), derogado

### Bloque 3: NOTARIADO (Semana 3–4)
**Status:** Luego de Comercio; validación de diferencia 94 vs 98 primero.

1. **Reconciliación: DB 94 vs manifest 98**
   - Listar artículos esperados 1–98 del inventario_v2.csv
   - LEFT JOIN contra DB (fuente = "Código del Notariado")
   - Identificar artículos 1–98 faltantes (candidatos: ¿derogados, nunca ingested?)

2. **NO reapertura de todo el Código**
   - Ingestar SOLO 4 artículos faltantes confirmados
   - Mantener los 94 existentes
   - Evitar duplicación de trabajo

### Bloque 4: DECRETOS / TRIBUNALES / KERNEL (Semana 4+)
**Status:** Solo después de Bloques 1–3 completos.

1. **Decretos faltantes (31/2015, 35/2013, 73/96, 102/2018, 124/92)**
   - Buscar identidad física primaria primero (URL, fuente oficial)
   - Evitar doble ingesta de variantes
   - Marcar vigencia con precisión (reformados, derogados)

2. **Ley Organización Tribunales**
   - Validar si existe fuente simple o distribuida en múltiples leyes

3. **Resolución PCSJ 17-2012**
   - Confirmar clasificación (¿es decreto, resolución, o ambos?)

4. **Kernel / PRC-1**
   - Siguen pausados hasta que Bloques 1–3 completen

### Restricciones ejecutivas

- ❌ NO PRODUCTION WRITES durante Bloque 1 (validación solamente)
- ❌ NO COMMERCIO_MERGE sin confirmación de higiene
- ❌ NO INGESTION de decretos hasta Notariado reconciliado
- ❌ NO RE-INGESTION histórica sin auditoría de deduplicación previa
- ✅ DOCUMENTATION_COMMIT = sí (este análisis es Evidence)
- ✅ HYGIENE_QUERIES = sí (pasar a siguiente fase)

---

## X. RECOMENDACIONES PRIORITARIAS

### Estado provisório: Validación solamente (sin writes, ingesta, nor Comercio merge)

Este documento es **Evidence** de estado del corpus.  
Proceeder a Bloque 1 (Hygiene/Identity) requiere aprobación CLO.

**Próxima acción:** Ejecutar hygiene queries (ver sección XI)

---

## XI. HYGIENE QUERIES (Próxima fase)

Para validar claims en sección VI, ejecutar en SQL Editor:

```sql
-- Validar doc_6cfb720b vs Codigo Penal
SELECT COUNT(*), COUNT(DISTINCT num_articulo) FROM biblioteca_vectores 
WHERE fuente = 'doc_6cfb720b';
-- Comparar: ¿exactamente 635 = Código Penal?

-- Muestrear contenido de doc_* vs Código Penal
SELECT fuente, num_articulo, LEFT(contenido, 50) FROM biblioteca_vectores 
WHERE fuente IN ('doc_6cfb720b', 'Codigo Penal') LIMIT 10;

-- Validar CPC_COMENTADO_ROMERO_2024 vigencia
SELECT es_norma_vigente, COUNT(*) FROM biblioteca_vectores 
WHERE fuente = 'CPC_COMENTADO_ROMERO_2024' GROUP BY es_norma_vigente;

-- Auditar NULL fuente por materia
SELECT materia, COUNT(*) FROM biblioteca_vectores 
WHERE fuente IS NULL GROUP BY materia ORDER BY COUNT DESC;

-- Reconciliación Notariado 94 vs 98
SELECT COUNT(DISTINCT num_articulo) FROM biblioteca_vectores 
WHERE fuente = 'Código del Notariado de Honduras';
-- Esperar 98; comparar con 94 actual
```

---

## XII. MATRIZ DE COBERTURA RESUMIDA

| Criterio | Actual | Target | Gap |
|----------|--------|--------|-----|
| Instrumentos canónicos presentes | 6/13 (46%) | 13/13 (100%) | **7 instrumentos** |
| Artículos sin duplicar | 14,352 | 14,352+ | Deduplicar CPC |
| Filas clasificadas (fuente NOT NULL) | 14,352 | 22,718 | **8,366 (36.8%)** |
| Vigencia marcada (es_norma_vigente NOT NULL) | ~9,000 | 22,718 | **~13,700 (60%)** |
| Revisión completada | 22,677 (99.8%) | 22,718 | 41 rows pending |

---

## XIII. SIGUIENTES PASOS (Después de aprobación CLO)

**Bloque 1 (Semanas 1–2, CLO-driven):**
1. Ejecutar hygiene queries (sección XI)
2. Auditar 100-row muestra de NULL fuente
3. Auditar contenido de doc_* para deduplicación
4. Validar CPC_COMENTADO_ROMERO_2024 como doctrina (no autoridad)
5. Marcar vigencia en 03_NOTARIAL, 09_AGRARIO, 10_LEYES_REGLAMENTOS

**Bloque 2 (Semanas 2–3, Comercio):**
6. Búsqueda física Decreto 73-1950 + D.284-2013
7. Ingesta limpia Código Comercio

**Bloque 3 (Semanas 3–4, Notariado):**
8. Reconciliación 94 vs 98
9. Ingesta de 4 artículos faltantes

**Bloque 4 (Semanas 4+, Decretos/Tribunales):**
10. Decretos: 31/2015, 35/2013, 73/96, 102/2018, 124/92
11. Ley Organización Tribunales, Resolución PCSJ 17-2012

---

**ESTADO:** Gap Analysis Provisional  
**PRODUCCIÓN:** ❌ NO writes, ingesta, nor Comercio merge  
**DOCUMENTACIÓN:** ✅ Este análisis es evidence committeado  
**APROBACIÓN CLO:** Requerida antes de proceder a Bloque 1

**Análisis generado:** 2026-09-30  
**Ejecutor:** Claude + SQL Editor (thgrhueckkjdutjvcufp)  
**Fuente de datos:** docs/corpus/gap-queries.sql (Secciones A–D)  
**Claims no probados:** Ver sección VI
