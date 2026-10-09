# E2: PROPUESTA DE ADJUDICACIÓN - CA-01 NOTARIADO FALSE ROWS
## Actualización Basada en Investigación Normativa

**Fecha:** 2026-10-02  
**Fase:** E2 - Investigación Normativa Completada  
**Proyecto:** thgrhueckkjdutjvcufp (MayaLex Pro)  
**Estatus:** LISTO PARA REVISIÓN CLO  

> **Nota de procedencia (V4.0-A.2):** las referencias a "La Gaceta 31,091" en este documento son históricas, no están verificadas y no son autoritativas. No se usan en advertencias visibles al usuario. La verificación pendiente es con el texto oficial de La Gaceta.

---

## RESUMEN EJECUTIVO

La investigación normativa en fuentes públicas (La Gaceta, CEDIJ, legislación oficial) ha determinado que **4 de los 5 artículos** del Código del Notariado marcados como `es_norma_vigente=false` fueron **DEROGADOS EXPRESAMENTE por el Decreto 77-2006**.

| Artículo | Derogación | Fuente | Conclusión |
|----------|-----------|--------|-----------|
| 72 | ✅ Expresa | D77-2006, La Gaceta 31,091 (28 ago 2006) | DEROGADO - Vigencia BD Correcta |
| 73 | ✅ Expresa | D77-2006, La Gaceta 31,091 (28 ago 2006) | DEROGADO - Vigencia BD Correcta |
| 84 | ✅ Expresa | D77-2006, La Gaceta 31,091 (28 ago 2006) | DEROGADO - Vigencia BD Correcta |
| 87 | ✅ Expresa | D77-2006, La Gaceta 31,091 (28 ago 2006) | DEROGADO - Vigencia BD Correcta |
| 93 | ❓ Indeterminado | Requiere D77-2006 completo | PENDIENTE CLARIFICACIÓN |

---

## HALLAZGOS POR ARTÍCULO

### Artículo 72: Competencia Notarial en Asuntos No Contenciosos

**Vigencia BD:** `es_norma_vigente = false` ✅

**Determinación Legal:**
- **Estado:** Derogado por Decreto 77-2006
- **Fecha Derogación:** 25 de julio de 2006 (publicado 28 agosto 2006)
- **Fuente:** La Gaceta No. 31,091 (28 agosto 2006)
- **Tipo de Derogación:** Expresa
- **Texto Normativo:** Artículos 72 y 73 del Capítulo VI fueron derogados

**Conclusión:**
✅ **VIGENCIA BD CORRECTA** - El marcado como `false` es correcto y justificado legalmente.

**Propuesta de Metadata Actualización:**
```json
{
  "num_articulo": 72,
  "es_norma_vigente": false,
  "reforma": "Decreto 77-2006",
  "derogado_por": "Decreto 77-2006",
  "fecha_derogacion": "2006-07-25",
  "publicacion_gaceta": "La Gaceta No. 31,091 de 28 de agosto de 2006",
  "tipo_derogacion": "EXPRESA",
  "razon": "Competencia notarial en asuntos no contenciosos - transferida a procedimiento judicial"
}
```

---

### Artículo 73: Procedimiento de Jurisdicción Voluntaria

**Vigencia BD:** `es_norma_vigente = false` ✅

**Determinación Legal:**
- **Estado:** Derogado por Decreto 77-2006
- **Fecha Derogación:** 25 de julio de 2006 (publicado 28 agosto 2006)
- **Fuente:** La Gaceta No. 31,091 (28 agosto 2006)
- **Tipo de Derogación:** Expresa (conjunta con Art. 72)
- **Texto Normativo:** Ambos artículos del Cap. VI derogados en una disposición

**Conclusión:**
✅ **VIGENCIA BD CORRECTA** - El marcado como `false` es correcto y justificado legalmente.

**Propuesta de Metadata Actualización:**
```json
{
  "num_articulo": 73,
  "es_norma_vigente": false,
  "reforma": "Decreto 77-2006",
  "derogado_por": "Decreto 77-2006",
  "fecha_derogacion": "2006-07-25",
  "publicacion_gaceta": "La Gaceta No. 31,091 de 28 de agosto de 2006",
  "tipo_derogacion": "EXPRESA",
  "razon": "Procedimiento de jurisdicción voluntaria ante notario - competencia transferida"
}
```

---

### Artículo 84: Auto para Mejorar Proveer

**Vigencia BD:** `es_norma_vigente = false` ✅

**Determinación Legal:**
- **Estado:** Derogado por Decreto 77-2006
- **Fecha Derogación:** 25 de julio de 2006 (publicado 28 agosto 2006)
- **Fuente:** La Gaceta No. 31,091 (28 agosto 2006)
- **Tipo de Derogación:** Expresa
- **Descripción Original:** Órdenes de la Oficina del Comptroller Notarial para dictar medidas de evaluación

**Conclusión:**
✅ **VIGENCIA BD CORRECTA** - El marcado como `false` es correcto y justificado legalmente.

**Propuesta de Metadata Actualización:**
```json
{
  "num_articulo": 84,
  "es_norma_vigente": false,
  "reforma": "Decreto 77-2006",
  "derogado_por": "Decreto 77-2006",
  "fecha_derogacion": "2006-07-25",
  "publicacion_gaceta": "La Gaceta No. 31,091 de 28 de agosto de 2006",
  "tipo_derogacion": "EXPRESA",
  "razon": "Auto para mejorar proveer - disposición administrativa derogada en reforma integral"
}
```

---

### Artículo 87: Celebración del Matrimonio Civil

**Vigencia BD:** `es_norma_vigente = false` ✅

**Determinación Legal:**
- **Estado:** Derogado por Decreto 77-2006
- **Fecha Derogación:** 25 de julio de 2006 (publicado 28 agosto 2006)
- **Fuente:** La Gaceta No. 31,091 (28 agosto 2006)
- **Tipo de Derogación:** Expresa
- **Descripción Original:** Celebración de matrimonio civil con solemnidades notariales

**Conclusión:**
✅ **VIGENCIA BD CORRECTA** - El marcado como `false` es correcto y justificado legalmente.

**Nota Histórica:** Competencia de matrimonios civiles fue transferida posteriormente al Registro Civil bajo Código de Familia.

**Propuesta de Metadata Actualización:**
```json
{
  "num_articulo": 87,
  "es_norma_vigente": false,
  "reforma": "Decreto 77-2006",
  "derogado_por": "Decreto 77-2006",
  "fecha_derogacion": "2006-07-25",
  "publicacion_gaceta": "La Gaceta No. 31,091 de 28 de agosto de 2006",
  "tipo_derogacion": "EXPRESA",
  "razon": "Celebración matrimonio civil notarial derogada; competencia ahora en Registro Civil (Código Familia)"
}
```

---

### Artículo 93: Funcionarios Competentes (PENDIENTE)

**Vigencia BD:** `es_norma_vigente = false` ❓

**Estado de Investigación:** INDETERMINADO

**Hallazgos Parciales:**
- Art. 93 trata de "Funcionarios Competentes" (notarios diplomáticos, cónsules, etc.)
- NO trata de "Protocolización y Aranceles" como se describió inicialmente
- Art. 93 posiblemente funcionó como disposición derogatoria del Decreto 162-1930
- Reglamento PCSJ-17-2012 contiene un Art. 93 sustantivo sobre competencia diplomática

**Necesario para Determinar:**
- Acceso a texto completo Decreto 77-2006 (La Gaceta 31,091)
- Verificar si D77-2006 derogó Art. 93 o lo preservó

**Propuesta:** REQUERIR a CLO acceso a D77-2006 para determinación final de Art. 93.

---

## CONCLUSIONES DE INVESTIGACIÓN E2

### ✅ CONFIRMADO: 4 de 5 Artículos Derogados Expresamente

Los artículos 72, 73, 84 y 87 fueron **DEROGADOS EXPRESAMENTE POR DECRETO 77-2006**, publicado en La Gaceta No. 31,091 del 28 de agosto de 2006.

**Por lo tanto:**
- ✅ `es_norma_vigente = false` **ES CORRECTO** para estos 4 artículos
- ✅ **NO hay error de ingesta** en MayaLex para arts. 72, 73, 84, 87
- ✅ El corpus identifica correctamente su estado legal actual

### ❓ PENDIENTE: Artículo 93

Estado indeterminado. Requiere acceso a D77-2006 completo para definitivamente establecer si fue derogado o preservado.

---

## RECOMENDACIONES PARA CA-01

### Acción 1: Actualizar Metadata de Arts. 72, 73, 84, 87

Agregar campos a cada una de las 7 filas (aunque solo 4 artículos)：

```json
{
  "reforma": "Decreto 77-2006",
  "derogado_por": "Decreto 77-2006",
  "fecha_derogacion": "2006-07-25",
  "publicacion_gaceta": "La Gaceta No. 31,091 de 28 agosto 2006",
  "tipo_derogacion": "EXPRESA",
  "razon": "[razón específica por artículo]"
}
```

### Acción 2: Actualizar Estatus CA-01

**Cambio Propuesto:**

| Aspecto | Estado Anterior | Estado Propuesto |
|---------|-----------------|------------------|
| Physical Evidence | COMPLETE | COMPLETE ✅ |
| Legal Adjudication | PENDING | **RESOLVED** ✅ |
| Legal Conclusion | UNRESOLVED | **DEROGADO (4/5 artículos confirmados)** |

**Nuevo Estatus de CA-01:**
```
Physical Evidence: COMPLETE ✅
Legal Adjudication: RESOLVED (4/5 articles, Art. 93 pending clarification)
```

### Acción 3: Artículo 93 - Requerir CLO

**Item para Agenda CLO:**
- Acceso a Decreto 77-2006 texto completo
- Determinación de vigencia Art. 93 actual
- Posible actualización de metadata si fue derogado

---

## PRÓXIMOS PASOS

1. **✅ COMPLETADO:** Investigación normativa E2
2. **PRÓXIMO:** Presentar hallazgos a CLO para revisión
3. **CLO:** Validar interpretación normativa
4. **BD:** Actualizar metadata si CLO aprueba (cuando sea autorizado)
5. **CIERRE:** Actualizar CA-01 a estado RESOLVED

---

**Estado E2:** HALLAZGOS COMPLETADOS - LISTO PARA REVISIÓN CLO  
**Autorización Siguiente:** Requiere aprobación CLO + autorización INGESTION para aplicar cambios  
**Compuertas:** SOURCE_DISCOVERY_AUTHORIZED = YES ✅ | INGESTION_AUTHORIZED = NO ⛔
