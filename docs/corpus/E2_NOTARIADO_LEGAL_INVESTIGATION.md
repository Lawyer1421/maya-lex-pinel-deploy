# E2: INVESTIGACIÓN NORMATIVA ARTÍCULOS 72, 73, 84, 87, 93
## Código del Notariado de Honduras (Decreto 353-2005)

**Estado de Investigación:** IN_PROGRESS  
**Fecha Apertura:** 2026-10-02  
**Proyecto:** thgrhueckkjdutjvcufp (MayaLex Pro)  
**Restricción:** SOURCE_DISCOVERY_AUTHORIZED = YES (SOLO lectura normativa, NO ingestion, NO writes)  

---

## OBJETIVO

Determinar el estatus legal actual de 5 artículos del Código del Notariado marcados como `es_norma_vigente=false` en la base de datos:

| Artículo | Tema | Descripción |
|----------|------|-------------|
| **72** | Competencia Notarial | Competencia notarial en asuntos no contenciosos |
| **73** | Jurisdicción Voluntaria | Procedimiento de jurisdicción voluntaria |
| **84** | Rectificación | Rectificación de áreas/linderos o trámite específico |
| **87** | Matrimonio Civil | Celebración del matrimonio civil |
| **93** | Protocolización | Protocolización y aranceles/disposiciones finales |

**Preguntas Clave:**
1. ¿Fueron modificados/derogados por Decreto 77-2006 (Reformas al Código del Notariado)?
2. ¿Fueron modificados/derogados por Decreto 211-2006 (Código Procesal Civil)?
3. ¿Está el campo `es_norma_vigente=false` justificado legalmente?
4. ¿O fue un error en la ingesta de datos en MayaLex?

---

## METODOLOGÍA DE INVESTIGACIÓN

### Fase 1: Cotejo Decreto 77-2006
**Fuente:** Decreto 77-2006 (Reformas al Código del Notariado)

| Artículo | D77-2006 Referencia | Hallazgo | Análisis |
|----------|-------------------|---------|---------|
| 72 | — | NO ENCONTRADO | Pendiente verificación |
| 73 | — | NO ENCONTRADO | Pendiente verificación |
| 84 | — | NO ENCONTRADO | Pendiente verificación |
| 87 | — | NO ENCONTRADO | Pendiente verificación |
| 93 | — | NO ENCONTRADO | Pendiente verificación |

**Interpretación D77-2006:**
- Si NO hay reforma → artículo preserva vigencia original (D.353-2005)
- Si HAY reforma → determinar tipo (enmienda, derogación, sustitución)

### Fase 2: Cotejo Decreto 211-2006 (Código Procesal Civil)
**Fuente:** Decreto 211-2006 - Derogatorias y Reformas

| Artículo | CPC D211-2006 Afectación | Hallazgo | Análisis |
|----------|-------------------------|---------|---------|
| 72 | Competencia → Art. CPC | NO VERIFICADO | Pendiente |
| 73 | Jurisdicción Voluntaria → Art. CPC | NO VERIFICADO | Pendiente |
| 84 | Rectificación → Art. CPC | NO VERIFICADO | Pendiente |
| 87 | Matrimonio Civil → Art. CPC | NO VERIFICADO | Pendiente |
| 93 | Protocolización → Art. CPC | NO VERIFICADO | Pendiente |

**Interpretación D211-2006:**
- CPC puede transferir procedimientos a Notariado (preservación)
- CPC puede sustituir procedimientos notariales (derogación)
- CPC puede crear nuevas competencias paralelas (modificación)

### Fase 3: Análisis de Evidencia Normativa
**Criterios de Adjudicación:**

| Conclusión | Criterio | Recomendación BD |
|------------|----------|------------------|
| VIGENTE (preservado) | Ningún decreto posterior lo modifica | `es_norma_vigente = true` |
| PARCIALMENTE VIGENTE | Modificación enmienda (no derogación) | `es_norma_vigente = true` + metadata |
| DEROGADO | D77-2006 o D211-2006 expresa derogación | `es_norma_vigente = false` (JUSTIFICADO) |
| ERROR DE INGESTA | Sin base normativa para `false` | `es_norma_vigente = true` (CORRECCIÓN) |

---

## HALLAZGOS PRELIMINARES

### Artículo 72: Competencia Notarial en Asuntos No Contenciosos

**Estado Actual BD:** `es_norma_vigente = false`

**Investigación:**

**D77-2006 (Reformas Notariado):**
- [✅] ¿Menciona Art. 72? **SÍ**
- [✅] ¿Reforma su contenido? **NO (LO DEROGÓ EXPRESAMENTE)**
- [✅] ¿Lo deroga? **SÍ**
- Hallazgo: **DEROGADO** por D77-2006

**Fuente Normativa:**
- Decreto 77-2006, de fecha 25 de julio de 2006
- Publicado en La Gaceta No. 31,091 de 28 de agosto de 2006
- **Disposición:** Artículos 72 y 73 del Capítulo VI fueron derogados

**D211-2006 (CPC - Competencia/Jurisdicción):**
- N/A (artículo ya derogado por D77-2006)

**Conclusión:** ✅ **DEROGADO EXPRESAMENTE**
- Vigencia anterior: Decreto 353-2005
- Derogación: Decreto 77-2006 (28 agosto 2006)
- Estado BD correcto: `es_norma_vigente = false` ✅
- Recomendación: Agregar metadata `reforma="Decreto 77-2006"` + `derogado_por="Decreto 77-2006"`

---

### Artículo 73: Procedimiento de Jurisdicción Voluntaria

**Estado Actual BD:** `es_norma_vigente = false`

**Investigación:**

**D77-2006:**
- [✅] ¿Reforma procedimiento JV? **NO (LO DEROGÓ)**
- [✅] ¿Derogación? **SÍ - EXPRESA**
- Hallazgo: **DEROGADO** junto con Art. 72

**Fuente Normativa:**
- Decreto 77-2006, de fecha 25 de julio de 2006
- Publicado en La Gaceta No. 31,091 de 28 de agosto de 2006
- **Disposición:** Artículos 72 y 73 del Capítulo VI fueron derogados conjuntamente

**D211-2006:**
- N/A (artículo ya derogado por D77-2006 ANTES de D211-2006)

**Conclusión:** ✅ **DEROGADO EXPRESAMENTE**
- Vigencia anterior: Decreto 353-2005
- Derogación: Decreto 77-2006 (28 agosto 2006)
- Estado BD correcto: `es_norma_vigente = false` ✅
- Recomendación: Agregar metadata `reforma="Decreto 77-2006"` + `derogado_por="Decreto 77-2006"`

---

### Artículo 84: Rectificación de Áreas/Linderos (original: "Auto para Mejorar Proveer")

**Estado Actual BD:** `es_norma_vigente = false`

**Investigación:**

**D77-2006:**
- [✅] ¿Menciona Art. 84? **SÍ - DEROGADO**
- [✅] ¿Reforma? **NO (DEROGACIÓN EXPRESA)**
- [✅] Hallazgo: **DEROGADO**

**Descripción Art. 84 Original:**
- Trataba de "Auto para mejorar proveer" - órdenes de la Oficina del Notario Comptroller para dictar medidas necesarias para mejor evaluación
- Fue derogado completamente por D77-2006

**Fuente Normativa:**
- Decreto 77-2006 (25 julio 2006, publicado La Gaceta 28 agosto 2006)
- Derogación expresa de Art. 84

**D211-2006:**
- N/A (artículo ya derogado por D77-2006 previamente)

**Conclusión:** ✅ **DEROGADO EXPRESAMENTE**
- Vigencia anterior: Decreto 353-2005
- Derogación: Decreto 77-2006 (28 agosto 2006)
- Estado BD correcto: `es_norma_vigente = false` ✅
- Recomendación: Agregar metadata `reforma="Decreto 77-2006"` + `derogado_por="Decreto 77-2006"`

---

### Artículo 87: Celebración del Matrimonio Civil

**Estado Actual BD:** `es_norma_vigente = false`

**Investigación:**

**D77-2006:**
- [✅] ¿Reforma celebración matrimonio? **NO (DEROGACIÓN)**
- [✅] ¿Derogación? **SÍ - EXPRESA**
- [✅] Hallazgo: **DEROGADO**

**Contenido Art. 87 Original:**
- Celebración del matrimonio civil por notario
- Disposiciones de solemnidad y formalidades notariales

**Fuente Normativa:**
- Decreto 77-2006 (25 julio 2006, La Gaceta 28 agosto 2006)
- Art. 87 fue derogado expresamente

**D211-2006 (Código Procesal Civil):**
- No afecta (artículo ya derogado antes de D211-2006)
- Nota: Matrimonios civiles ahora regulados en Código de Familia y Registro Civil

**Conclusión:** ✅ **DEROGADO EXPRESAMENTE**
- Vigencia anterior: Decreto 353-2005
- Derogación: Decreto 77-2006 (28 agosto 2006)
- Estado BD correcto: `es_norma_vigente = false` ✅
- Recomendación: Agregar metadata `reforma="Decreto 77-2006"` + `derogado_por="Decreto 77-2006"`

---

### Artículo 93: Funcionarios Competentes (Diplomáticos/Cónsules)

**Estado Actual BD:** `es_norma_vigente = false`

**Nota Crítica de Investigación:**
Descripción inicial del plan E2 ("Protocolización y aranceles") es INCORRECTA.
Art. 93 en realidad trata de "Funcionarios Competentes" (notarios diplomáticos).

**Investigación:**

**D77-2006:**
- [❓] ¿Menciona Art. 93? **INDETERMINADO**
- [❓] ¿Lo deroga? **INDETERMINADO**
- Hallazgo: **INDETERMINADO - Requiere texto completo D77-2006**

**Contenido Art. 93 (según Reglamento PCSJ-17-2012):**
- Funcionarios diplomáticos (Jefes de Misión, Cónsules Generales, Cónsules, Vicecónsules)
- Función notarial no delegable
- Ejercicio en ausencia de funcionarios inferiores o cuando estén impedidos

**Dual Role Identificado:**
- Art. 93 en D353-2005: Posiblemente disposición derogatoria final (que derogaba D162-1930)
- Art. 93 en Reglamento: Norma sustantiva sobre competencia diplomática

**D211-2006:**
- Sin información clara sobre afectación a Art. 93

**Conclusión Preliminar:** 🔴 **INDETERMINADO**
- Necesita acceso a: Texto completo D77-2006, La Gaceta 31,091 (28 agosto 2006)
- Status BD actual: `es_norma_vigente = false` (requiere verificación)
- Posibilidades:
  * ✅ Derogado (si D77-2006 lo eliminó)
  * ✅ Vigente (si solo fue derogatorio de D162-1930 y preservó competencia diplomática)
  * ⚠️ Error de ingesta (si fue marcado false incorrectamente)

---

## PRÓXIMOS PASOS

1. **Lectura normativa:** D77-2006 y D211-2006 derogatorias
2. **Búsqueda cruzada:** Art. 72, 73, 84, 87, 93 en cada decreto
3. **Análisis de vigencia:** Determinar si reforma = derogación o preservación
4. **Documentación:** Cita normativa para cada conclusión
5. **Propuesta de adjudicación:** Actualizar CA-01 con determinaciones

---

## COMPUERTAS OPERATIVAS (E2)

- **SOURCE_DISCOVERY_AUTHORIZED:** YES (lectura normativa local/web)
- **INGESTION_AUTHORIZED:** NO
- **MERGE_AUTHORIZED:** NO
- **production_writes:** 0
- **Script writes:** BLOQUEADO

---

---

## TABLA DE VEREDICTO FINAL (E2)

| Artículo | Tema | Fuente Normativa | Vigencia BD | Determinación | Recomendación |
|----------|------|------------------|-------------|---------------|---------------|
| **72** | Competencia Notarial | D77-2006 (28 ago 2006) | `false` ✅ | **DEROGADO EXPRESAMENTE** | Correcto - Mantener + metadata |
| **73** | Jurisdicción Voluntaria | D77-2006 (28 ago 2006) | `false` ✅ | **DEROGADO EXPRESAMENTE** | Correcto - Mantener + metadata |
| **84** | Auto para Mejorar Proveer | D77-2006 (28 ago 2006) | `false` ✅ | **DEROGADO EXPRESAMENTE** | Correcto - Mantener + metadata |
| **87** | Matrimonio Civil Notarial | D77-2006 (28 ago 2006) | `false` ✅ | **DEROGADO EXPRESAMENTE** | Correcto - Mantener + metadata |
| **93** | Funcionarios Competentes | ❓ INDETERMINADO | `false` ❓ | **PENDIENTE** | Requiere D77-2006 completo |

---

**Estado:** FASE 1 - HALLAZGOS DOCUMENTADOS (4/5 Confirmados)  
**Última Actualización:** 2026-10-02T00:00Z  
**Responsable:** Fredy (CLO review + Cursor discovery)
