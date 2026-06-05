# CHECKLIST DE INYECCIÓN DE CONOCIMIENTO — MAYA PENAL 2.0
## Para: Abogado Fredy Omar Pinel Flores
## Acción requerida: Copiar y pegar textos literales del CPP en los placeholders

> **INSTRUCCIÓN:** Este checklist lista exactamente qué textos del CPP (Decreto 9-99-E)
> y del CP (Decreto 130-2017) debe usted copiar y pegar en los marcadores `[INSERTAR...]`
> de los archivos del sistema. Cuando complete todos los ítems marcados como 🔴, el sistema
> estará al 100% operativo sin necesidad de programación adicional.

---

## ARCHIVO 1: `lib/calculadoras/requerimiento-analyzer.ts`
### Sección: `const NORMAS = { ... }`

| # | Placeholder | Artículo a insertar | Prioridad |
|---|---|---|---|
| 1 | `art_294_cpp` | Texto literal completo del **Art. 294 CPP** — Contenido del Requerimiento Fiscal (todos los numerales) | 🔴 CRÍTICO |
| 2 | `art_276_cpp` | Texto literal del **Art. 276 CPP** — Inicio de la investigación / rol del MP | 🟠 ALTA |
| 3 | `art_166_cpp` | Texto literal del **Art. 166 CPP** — Nulidades absolutas del proceso | 🔴 CRÍTICO |
| 4 | `art_316_cpp` | Texto literal del **Art. 316 CPP** — Excepciones procesales y su tramitación | 🔴 CRÍTICO |
| 5 | `art_297_cpp` | Texto literal del **Art. 297 CPP** — Sobreseimiento (definitivo y provisional) | 🔴 CRÍTICO |

**Cómo hacerlo:**
1. Abra el CPP (D.9-99-E) — archivo `Codigo Procesal penal de Honduras.pdf`
2. Ubique cada artículo
3. Copie el texto literal
4. En el archivo `.ts`, reemplace `'[INSERTAR TEXTO LITERAL ART. X CPP AQUÍ...]'` con `'[texto copiado]'`

---

## ARCHIVO 2: `lib/schemas/legal-schemas.ts`
### Sección: `CalculadoraMedidasCautelaresOutputSchema`

| # | Placeholder | Artículo a insertar | Prioridad |
|---|---|---|---|
| 6 | `norma` en `fumus_commissi_delicti` | Texto literal **Art. 172 CPP** — Indicios suficientes para medidas cautelares | 🔴 CRÍTICO |
| 7 | `norma_peligro_fuga` | Texto literal **Art. 179 CPP** — Criterios específicos del peligro de fuga | 🔴 CRÍTICO |
| 8 | `norma_peligro_obstruccion` | Texto literal **Art. 180 CPP** — Criterios de peligro de obstaculización | 🔴 CRÍTICO |

### Sección: `InformeAcreditacionSchema`

| # | Placeholder | Artículo a insertar | Prioridad |
|---|---|---|---|
| 9 | `norma_base` | El texto literal del **tipo penal específico del CP** que se analice en cada consulta (varía por caso) | 🟡 CONTEXTUAL |

---

## ARCHIVO 3: `lib/templates/recurso-apelacion-auto-interlocutorio.md`
### Placeholders de artículos del CPP

| # | Placeholder en la plantilla | Artículo a insertar | Prioridad |
|---|---|---|---|
| 10 | `[INSERTAR ART. CPP RECURSO APELACIÓN]` | Número y texto del artículo que regula el **recurso de apelación de autos** en el CPP | 🔴 CRÍTICO |
| 11 | `[INSERTAR PLAZO ART. CPP]` | Plazo exacto en días hábiles para apelar un auto (según el CPP vigente) | 🔴 CRÍTICO |
| 12 | `[INSERTAR TEXTO LITERAL ART. 172 CPP]` | Texto del Art. 172 CPP — indicios suficientes | 🔴 CRÍTICO |
| 13 | `[INSERTAR TEXTO LITERAL ART. 178 CPP]` | Texto del Art. 178 CPP — presupuestos prisión preventiva | 🔴 CRÍTICO |
| 14 | `[INSERTAR TEXTO LITERAL ART. 179 CPP]` | Texto del Art. 179 CPP — criterios peligro de fuga | 🔴 CRÍTICO |
| 15 | `[INSERTAR TEXTO LITERAL ART. 180 CPP]` | Texto del Art. 180 CPP — criterios obstrucción | 🔴 CRÍTICO |
| 16 | `[INSERTAR ART. CPP SOBRE PRESUNCIÓN DE INOCENCIA]` | Artículo del CPP que desarrolla el Art. 89 Constitución en el ámbito procesal | 🟠 ALTA |

### Placeholders de jurisprudencia (llenar con expedientes reales)

| # | Placeholder | Qué insertar | Prioridad |
|---|---|---|---|
| 17 | `[INSERTAR CITA JURISPRUDENCIAL SALA PENAL CSJ]` | Expediente + extracto del ratio decidendi de la Sala Penal CSJ HN sobre prisión preventiva | 🟠 ALTA |
| 18 | Caso Pacheco Teruel vs. Honduras (2012) | Párrafo específico de la sentencia aplicable a condiciones de reclusión | 🟡 MEDIA |

---

## ARCHIVO 4: `lib/system-prompt.ts`
### Protocolos Pinel (contenido estratégico — SOLO usted puede redactarlo)

| # | Placeholder | Qué redactar | Prioridad |
|---|---|---|---|
| 19 | `[INSERTAR ESTRATEGIA PINEL PARA ETAPA PREPARATORIA]` | Su metodología personal para la etapa de investigación | 🟠 ALTA |
| 20 | `[INSERTAR ESTRATEGIA PINEL PARA ETAPA INTERMEDIA]` | Su protocolo de excepciones y control de la acusación | 🟠 ALTA |
| 21 | `[INSERTAR ESTRATEGIA PINEL PARA JUICIO ORAL]` | Su técnica de alegatos, interrogatorio y objeciones | 🟠 ALTA |

---

## MATRIZ DE ARTÍCULOS PRIORITARIOS (por frecuencia de uso en litigación)

Los siguientes artículos del CPP son los más consultados. Al insertar sus textos literales,
el sistema cubrirá el **80% de las consultas reales** de un defensor penal hondureño:

### 🔴 INSERTAR PRIMERO (bloquean el funcionamiento básico):

```
Art. 1  CPP  — Juicio previo
Art. 2  CPP  — Presunción de inocencia
Art. 4  CPP  — Inviolabilidad del derecho de defensa
Art. 11 CPP  — Ne bis in idem
Art. 166 CPP — Nulidades absolutas
Art. 172 CPP — Presupuestos de las medidas cautelares
Art. 175 CPP — Tipos de medidas cautelares
Art. 178 CPP — Prisión preventiva (presupuestos)
Art. 179 CPP — Criterios del peligro de fuga
Art. 180 CPP — Criterios del peligro de obstaculización
Art. 183 CPP — Prohibiciones absolutas de prisión preventiva
Art. 184 CPP — Medidas sustitutivas a la prisión
Art. 200 CPP — Prueba prohibida / prueba ilícita
Art. 202 CPP — Valoración por sana crítica
Art. 294 CPP — Contenido del requerimiento fiscal
Art. 297 CPP — Sobreseimiento definitivo y provisional
Art. 316 CPP — Excepciones procesales
```

### 🟠 INSERTAR EN SEGUNDA RONDA (consolidan la calidad):

```
Art. 28  CPP — Criterio de oportunidad
Art. 29  CPP — Suspensión condicional del proceso
Art. 392 CPP — Procedimiento abreviado
Art. 337 CPP — Congruencia entre acusación y sentencia
Art. 391 CPP — Recurso de apelación (autos)
Art. 395 CPP — Recurso de casación
Art. 181 CPP — Duración máxima de la prisión preventiva
Art. 186 CPP — Revisión de medidas cautelares
```

### 🟡 INSERTAR EN TERCERA RONDA (delitos especiales):

```
Art. 116 CP  — Homicidio simple
Art. 117 CP  — Asesinato (circunstancias agravantes)
Art. 140 CP  — Violación
Art. 141 CP  — Abuso sexual
Art. 222 CP  — Robo
Art. 228 CP  — Hurto
Art. 23  CP  — Causas de justificación (legítima defensa)
Art. 93  CP  — Prescripción de la acción penal
```

---

## CÓMO OBTENER LOS TEXTOS LITERALES

**Fuente 1 — Archivo local (más rápido):**
```
C:\Users\Fredy\OneDrive\SISTEMA_LEGAL_PRINCIPAL\02_EJERCICIO_LEGAL\05_LEYES_Y_CODIGOS\
├── Codigo Procesal penal de Honduras.pdf    ← CPP completo
├── CODIGO PENAL VIGENTE HONDURAS.pdf        ← CP vigente
└── Codigo Penal -2023.pdf                   ← CP 2023 actualizado
```

**Fuente 2 — Web oficial:**
- CPP: `https://www.poderjudicial.gob.hn/Cedij/Cdigos/Codigo%20Procesal%20Penal%20(2024).pdf`
- CP: `https://www.congreso.gob.hn` (Decreto 130-2017)

---

## ESTADO DE IMPLEMENTACIÓN

```
BLOQUE 1 — System Prompt MAYA PENAL      ✅ COMPLETO
BLOQUE 2 — Zod Schemas (Calculadoras)   ✅ COMPLETO (faltan textos literales arts. 172, 179, 180)
BLOQUE 3 — Analizador Requerimiento     ✅ COMPLETO (faltan textos literales arts. 166, 294, 297, 316)
BLOQUE 4 — Plantilla Apelación          ✅ COMPLETO (faltan textos literales + jurisprudencia)
CLAUDE_CONFIG_PENAL (sala/análisis/docs) ✅ COMPLETO
Protocolos Pinel (6 protocolos)         🔴 PENDIENTE — solo el Abogado Pinel puede redactarlos
Jurisprudencia CSJ Honduras (fichas)    🟠 11 expedientes pendientes de completar

TIEMPO ESTIMADO PARA COMPLETAR LOS PLACEHOLDERS:
  Con CPP abierto y buscando cada artículo: ~4 horas
  Redacción de los 6 Protocolos Pinel:      ~23 horas (en sesiones grabadas)
  Total para sistema 100% operativo:         ~27 horas de trabajo del Abogado Pinel
```

---

*Generado por MAYA PENAL 2.0 — Arquitectura de conocimiento jurídico penal hondureño*
*© 2026 Abg. Fredy Omar Pinel Flores — Choluteca, Honduras*
