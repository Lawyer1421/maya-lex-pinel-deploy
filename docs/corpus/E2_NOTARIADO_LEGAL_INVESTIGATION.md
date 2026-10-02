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
- [ ] ¿Menciona Art. 72?
- [ ] ¿Reforma su contenido?
- [ ] ¿Lo deroga?
- Hallazgo: PENDIENTE

**D211-2006 (CPC - Competencia/Jurisdicción):**
- [ ] ¿Asume competencia en asuntos no contenciosos?
- [ ] ¿Preserva competencia notarial?
- [ ] ¿Modifica jurisdicción voluntaria?
- Hallazgo: PENDIENTE

**Conclusión Preliminar:** SIN DETERMINAR

---

### Artículo 73: Procedimiento de Jurisdicción Voluntaria

**Estado Actual BD:** `es_norma_vigente = false`

**Investigación:**

**D77-2006:**
- [ ] ¿Reforma procedimiento JV?
- [ ] ¿Derogación?
- Hallazgo: PENDIENTE

**D211-2006:**
- [ ] ¿Capítulo de Jurisdicción Voluntaria?
- [ ] ¿Sustituye procedimiento del Notariado?
- [ ] ¿Preserva o transfiere competencia?
- Hallazgo: PENDIENTE

**Conclusión Preliminar:** SIN DETERMINAR

---

### Artículo 84: Rectificación de Áreas/Linderos

**Estado Actual BD:** `es_norma_vigente = false`

**Investigación:**

**D77-2006:**
- [ ] ¿Menciona rectificación/linderos?
- [ ] ¿Reforma?
- Hallazgo: PENDIENTE

**D211-2006:**
- [ ] ¿Traslada rectificación a procedimiento judicial?
- [ ] ¿Preserva procedimiento notarial?
- Hallazgo: PENDIENTE

**Conclusión Preliminar:** SIN DETERMINAR

---

### Artículo 87: Celebración del Matrimonio Civil

**Estado Actual BD:** `es_norma_vigente = false`

**Investigación:**

**D77-2006:**
- [ ] ¿Reforma celebración matrimonio?
- [ ] ¿Derogación?
- Hallazgo: PENDIENTE

**D211-2006:**
- [ ] ¿Regulación de matrimonio civil?
- [ ] ¿Competencia registral vs. notarial?
- Hallazgo: PENDIENTE

**Conclusión Preliminar:** SIN DETERMINAR

---

### Artículo 93: Protocolización y Aranceles

**Estado Actual BD:** `es_norma_vigente = false`

**Investigación:**

**D77-2006:**
- [ ] ¿Reforma aranceles?
- [ ] ¿Protocolización?
- Hallazgo: PENDIENTE

**D211-2006:**
- [ ] ¿Regulación de aranceles notariales?
- [ ] ¿Protocolización procesal?
- Hallazgo: PENDIENTE

**Conclusión Preliminar:** SIN DETERMINAR

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

**Estado:** FASE 1 - INVESTIGACIÓN EN CURSO  
**Última Actualización:** 2026-10-02T00:00Z  
**Responsable:** Fredy (CLO review + Cursor discovery)
