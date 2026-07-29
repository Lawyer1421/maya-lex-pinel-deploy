# Maya Lex — Diferenciación competitiva

**Fecha:** 2026-07-29 · **Regla de este documento:** solo evidencia pública verificable; cada
afirmación sobre terceros lleva su etiqueta epistémica. Nada aquí copia diseño, textos,
marca ni arquitectura de competidores.

## 1. Marco de etiquetas epistémicas

| Etiqueta | Significado |
|---|---|
| **[OBSERVADO]** | Función vista directamente en el producto público del competidor |
| **[DECLARADO]** | Afirmación publicitaria del competidor, no comprobada por nosotros |
| **[COMPROBADO]** | Capacidad verificada técnicamente por nosotros con evidencia reproducible |
| **[NO VERIFICABLE]** | Cifra o afirmación que no puede contrastarse con fuente pública |

Regla: ninguna decisión de producto se justifica con [DECLARADO] o [NO VERIFICABLE] de un
tercero. Este documento se actualiza únicamente cuando exista evidencia nueva con fecha y URL.

## 2. Panorama competitivo (categorías, no imitación)

| Categoría | Ejemplos típicos | Qué ofrecen (etiqueta) | Límite estructural frente a Maya Lex |
|---|---|---|---|
| Bases de datos jurídicas comerciales regionales | agregadores de legislación/jurisprudencia LATAM | Cobertura amplia multi-país **[DECLARADO]**; su profundidad hondureña real está **pendiente de verificación** con evidencia fechada | Cobertura ancha ≠ trazabilidad: rara vez publican hash, decreto de reforma y estado editorial por artículo |
| LLM genéricos (chat de propósito general) | asistentes generales de IA | Redacción y explicación fluidas **[OBSERVADO]** | Sin corpus hondureño verificado, sin procedencia por cita, alucinación de artículos **[COMPROBADO en pruebas internas de esta sesión de auditoría de corpus]** |
| Portales oficiales gratuitos | Poder Judicial, Congreso, ENAG/La Gaceta, TSC | Texto oficial auténtico **[OBSERVADO]** | Sin búsqueda semántica, sin análisis, sin flujo de trabajo profesional |
| Herramientas legaltech de nicho | generadores de escritos, gestores de expedientes | Automatización puntual **[DECLARADO]** | No integran corpus verificado + análisis + flujo completo |

> Tarea permanente del harness (qa-evals-agent): cuando se evalúe un competidor concreto,
> registrar captura fechada + URL en `docs/harness/competencia/` y actualizar esta matriz.
> Prohibido rellenar celdas por suposición.

## 3. Los seis diferenciales de Maya Lex (todos [COMPROBADO] o en construcción con gate)

1. **Trazabilidad por cita**: cada artículo publicable lleva fuente oficial, URL, hash
   SHA-256, decreto, estado editorial V0–V5 y — en jurisprudencia — J0–J5. *Estado: pipeline
   construido y gates ejecutables (`verify-corpus-provenance`, `verify-citations`); corpus P0 en ingesta.*
2. **Honestidad de cobertura como producto**: la página pública de cobertura muestra el
   estado real por materia; el sistema se rehúsa a presentar V2/V3 como norma consolidada.
   *Estado: [COMPROBADO] — en producción hoy.*
3. **34 años de ejercicio real convertidos en flujos** (ver MAYALEX_FOUNDER_EXPERTISE_PRODUCTIZATION.md):
   protocolos notariales, preparación de audiencia, checklists procesales — conocimiento que
   ningún agregador ni LLM genérico posee. *Estado: diseño; es el foso más difícil de copiar.*
4. **Flujo completo de trabajo** investigación→expediente→pruebas→estrategia→redacción→audiencia
   (ver MAYALEX_LEGAL_WORKFLOW_ENGINE.md), no solo búsqueda. *Estado: diseño sobre herramientas ya existentes.*
5. **Privacidad estructural**: documentos privados aislados por arquitectura (GRANT/RLS
   verificados en vivo), jamás en el corpus ni en entrenamiento. *Estado: [COMPROBADO].*
6. **Identidad hondureña auténtica**: español jurídico hondureño, materias y plazos del
   ordenamiento nacional, construido por un abogado y notario en ejercicio en Choluteca.
   *Estado: [COMPROBADO] — es el origen del producto, no una localización.*

## 4. Qué NO perseguir (anti-metas)

- Paridad de features ornamentales con agregadores multi-país.
- Afirmar cobertura "completa" antes de que el pipeline la verifique.
- Copiar UI/UX/textos de terceros.
- Retrasar el lanzamiento por funciones que no aumentan confiabilidad, trazabilidad o utilidad práctica.

## 5. Priorización derivada

`official_legal_library` (trazabilidad) → `document_analysis` (utilidad diaria) →
`official_web_search` (cobertura honesta con jerarquía de fuentes) → flujos del fundador
(diferencial permanente) → voz/Modo Litigante (experiencia de frontera, beta).
