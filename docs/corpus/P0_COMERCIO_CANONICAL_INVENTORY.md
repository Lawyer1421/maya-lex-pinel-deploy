# P0: CÓDIGO DE COMERCIO (DECRETO 73-1950)
## Diagnóstico de Fuentes e Inventario Canónico

**Fase:** P0 - Prioridad Crítica (Commercial Law Foundation)  
**Fecha:** 2026-10-02  
**Proyecto:** thgrhueckkjdutjvcufp (MayaLex Pro)  
**Estado:** SOURCE_DISCOVERY_AUTHORIZED = YES  
**Production Writes:** 0  

---

## 1. LÍNEA BASE DOCUMENTAL EN REPOSITORIO

### Status de Archivos Existentes

**✅ Script de Ingesta Previo:**
- **Ubicación:** `scripts/ingesta-comercio.ts`
- **Tipo:** TypeScript - Extractor y segmentador de artículos
- **Estado:** Disponible (NO ejecutado en esta sesión)
- **Última Modificación:** Anterior a 2026-10-02

**❌ Archivos Independientes del Código de Comercio:**
- No existen archivos JSON, Markdown o SQL independientes del Comercio en `docs/corpus/`
- El Comercio aparece registrado SOLO en:
  * `MAYALEX_CORPUS_INGESTION_BACKLOG_V1.json/md` (como P0 ABSENT_VERIFIED)
  * `corpus-inventory-v2.json` (como P0_COMERCIO: 1 instrumento)

### Conteo de Artículos Base

**Artículos Procesados por Script Anterior:**
```
Total original:     1,674 artículos
Recuperados post-fix: +17 (bug segmentación)
Subtotal:           1,691 artículos

Resoluciones editoriales aplicadas:
- Deduplicar idénticos: -1 (art. 1541, conservar 1511)
- Ambiguos genuinos excluidos: -2 (arts. 418, 1662)
  
Estimado final: ~1,688 artículos únicos canonicalizables
```

**Ambigüedad Documentada:**
- Arts. 418 y 1662: Duplicado genuine de imprenta (Código 1950 original)
- Ambas ocurrencias tienen contenido sustantivo distinto
- Requiere revisión visual de fuente original para adjudicación

---

## 2. MAPEO DE REFORMAS ESTRUCTURALES CLAVE

### 2.1 Ley del Mercado de Valores

**Status en Corpus:** PENDIENTE INVESTIGACIÓN

**Relevancia para Comercio:**
- Afecta Títulos/Valores en Comercio (Libro V presumiblemente)
- Define valores/instrumentos financieros
- Posibles derogaciones/reformas de artículos comerciales

**Datos Conocidos:**
- Decreto específico: PENDIENTE IDENTIFICACIÓN
- Fecha reforma: PENDIENTE

**Acción Requerida:**
- [ ] Identificar decreto/ley vigente de Mercado de Valores
- [ ] Cotejar artículos comerciales afectados
- [ ] Documentar derogaciones/modificaciones

---

### 2.2 Ley de Garantías Mobiliarias (Decreto 182-2009)

**Status en Corpus:** PENDIENTE INVESTIGACIÓN

**Relevancia para Comercio:**
- **Desplaza:** Prenda mercantil (tradicional en Comercio)
- **Sustituye:** Capítulo de prendas/garantías en Código Comercio
- **Impacto:** Artículos sobre garantías, prenda comercial, hipoteca mercantil

**Datos Conocidos:**
- Decreto: 182-2009
- Tipo: Reforma integral de garantías mobiliarias
- Vigencia: Posterior a 2009

**Acción Requerida:**
- [ ] Verificar artículos de Comercio derogados/reformados por D182-2009
- [ ] Identificar capítulos de prendas afectados
- [ ] Documentar transiciones a Garantías Mobiliarias

---

### 2.3 Reformas Societarias

**Status en Corpus:** PENDIENTE INVESTIGACIÓN

**Temas Conocidos a Mapear:**
- Acciones al portador (posible derogación/restricción)
- Capital mínimo (modificaciones)
- Microempresas (nuevas figuras)
- Sociedades unipersonales (nuevas formas)
- Régimen de cooperativas (si aplica)

**Decretos/Leyes Relacionadas Potenciales:**
- Código de Comercio Reforma (posterior a 1950)
- Ley de Microempresas y Pequeñas Empresas (DECRETO TBD)
- Leyes de Cooperativas (DECRETO TBD)

**Acción Requerida:**
- [ ] Identificar reformas societarias posteriores a 1950
- [ ] Listar artículos comerciales afectados
- [ ] Determinar vigencia/derogación

---

## 3. IDENTIFICACIÓN DE ARTÍCULOS DEROGADOS/DESPLAZADOS

### Candidatos Iniciales para Adjudicación

| Artículo | Descripción | Reforma Conocida | Status | Evidencia Requerida |
|----------|-------------|------------------|--------|-------------------|
| 418 | AMBIGÜEDAD PRIMARIA | Duplicado imprenta 1950 | ⚠️ AMBIGUO | Revisión visual fuente |
| 1662 | AMBIGÜEDAD SECUNDARIA | Duplicado imprenta 1950 | ⚠️ AMBIGUO | Revisión visual fuente |
| TBD | Prenda mercantil (Libro V) | D182-2009 Garantías | ❓ POSIBLEMENTE DEROGADO | Cotejo D182-2009 |
| TBD | Valores/Títulos (Libro V) | Ley Mercado Valores | ❓ POSIBLEMENTE REFORMADO | Identificar ley vigente |
| TBD | Capital mínimo sociedades | Reforma societaria | ❓ POSIBLEMENTE REFORMADO | Identificar reforma |
| TBD | Acciones al portador | Reforma post-1950 | ❓ POSIBLEMENTE DEROGADO | Cotejo legis. moderna |

---

## 4. MARCO PARA PRÓXIMA INVESTIGACIÓN (FASE DISCOVERY)

### Búsquedas Prioritarias

**PRIORITARIOS (P0):**

1. **Decreto 182-2009 (Garantías Mobiliarias)**
   - Verificar derogaciones explícitas de Comercio
   - Identificar artículos sobre prenda mercantil desplazados
   - Documentar vigencia/no vigencia

2. **Ley de Mercado de Valores (Honduras vigente)**
   - Identificar decreto/ley
   - Cotejar títulos/valores en Comercio
   - Determinar reformas estructurales

3. **Reformas Societarias Post-1950**
   - Microempresas (decreto)
   - Sociedades unipersonales (decreto)
   - Capital mínimo (cambios)
   - Acciones al portador (restricciones/derogaciones)

**SECUNDARIOS (Contingente):**

4. Cooperativas y otras formas asociativas
5. Cambios en procedimientos mercantiles (CPC D211-2006)
6. Reforma fiscal/tributaria que afecte comercio

---

## 5. NOTAS DE INGESTA ANTERIOR

### Script Anterior: Resoluciones Editoriales Explícitas

De `scripts/ingesta-comercio.ts`:

**DEDUPLICAR_IDENTICOS:**
```
Artículos: 1511, 1541
Resolución: Conservar 1511 (mejor calidad texto)
Descartar: 1541 (texto idéntico, solo dif. OCR)
```

**DESCARTAR_FRAGMENTO:**
```
Artículos: 486, 493, 556, 586, 1133, 1251
Status: YA RESUELTO por fix de segmentación
Acción: Ninguna (solo fragmentos truncados)
```

**EXCLUIR_AMBIGUOS (GENUINOS):**
```
Artículos: 418, 1662
Causa: Duplicado de imprenta (1950 original)
Status: Requiere adjudicación visual
Acción: MANTENER EXCLUIDOS hasta revisión
```

---

## 6. ESTADO DE COMPUERTAS

- ✅ **SOURCE_DISCOVERY_AUTHORIZED** = true (investigación en curso)
- ❌ **INGESTION_AUTHORIZED** = false
- ❌ **MERGE_AUTHORIZED** = false
- **production_writes** = 0

---

## 7. PRÓXIMOS PASOS (FASE 2: E2-COMERCIO)

1. **Búsqueda normativa:** D182-2009, Ley Mercado Valores, reformas societarias
2. **Cotejo de artículos:** Mapear derogaciones/reformas específicas
3. **Adjudicación:** Determinar vigencia por artículo derogado
4. **Resolución artículos ambiguos:** 418, 1662 (visual review)
5. **Propuesta de canonicalización:** Documentar estado legal de Comercio completo

---

**Estado:** DIAGNÓSTICO PRELIMINAR - FASE 1 COMPLETADA  
**Próxima Fase:** E2-COMERCIO (investigación normativa profunda)  
**Responsable:** Fredy (CLO review) + Cursor (SOURCE_DISCOVERY)  
**Compuertas Preservadas:** NO WRITES, NO INGESTION
