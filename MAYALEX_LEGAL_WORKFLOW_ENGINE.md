# Maya Lex Legal Workflow Engine

**Tesis:** el diferencial de Maya Lex no es "buscar leyes" sino acompañar el **flujo completo
de trabajo** del profesional hondureño. Este documento define el motor de flujos que une las
herramientas existentes en una cadena coherente.

## 1. El flujo canónico

```
INVESTIGACIÓN → EXPEDIENTE → PRUEBAS → ESTRATEGIA → REDACCIÓN → AUDIENCIA
```

Cada etapa consume la salida de la anterior y toda afirmación jurídica arrastra su cita
(norma + estado editorial + hash) desde el corpus verificado.

## 2. Etapas y componentes

| Etapa | Qué hace | Componente (existente → futuro) |
|---|---|---|
| **Investigación** | Pregunta jurídica → normas aplicables con estado de verificación + jurisprudencia (J-states) + búsqueda web oficial con jerarquía de fuentes | Chat/RAG actual → Banco Jurídico + browser jurídico (F4.4) |
| **Expediente** | Carpeta de caso: hechos, partes, documentos privados (aislados), cronología | Nuevo: `expedientes` por usuario/tenant con RLS |
| **Pruebas** | Inventario probatorio: qué prueba sostiene qué hecho, estado de obtención, cadena de custodia | Análisis documental (F4.3) alimenta el inventario |
| **Estrategia** | Teoría del caso, fortalezas/debilidades, riesgos, plazos calculados, decisiones pendientes | Herramienta de estrategia actual + checklists del fundador |
| **Redacción** | Borradores desde plantillas anotadas del fundador, con hechos del expediente y citas del corpus | Generador de escritos actual + modelos anotados |
| **Audiencia** | Guion de audiencia, objeciones probables, preguntas, resumen de bolsillo; a futuro Modo Litigante en vivo | Preparación estática primero; live detrás de flag beta |

## 3. Reglas del motor

1. **Cita obligatoria**: ninguna salida del motor afirma derecho sin fuente del corpus
   (V4/V5 para afirmaciones categóricas; V2/V3 solo con advertencia visible).
2. **Privacidad por construcción**: el expediente es privado por usuario/tenant (RLS);
   nada del expediente entra al corpus público ni a entrenamiento.
3. **Trazabilidad hacia atrás**: desde el escrito final se puede navegar a la estrategia,
   a la prueba, al hecho y a la norma que lo sostienen.
4. **El abogado decide**: el motor propone y estructura; cada salida es un borrador con
   puntos de decisión explícitos, nunca "la respuesta".
5. **Plazos con responsabilidad**: los cómputos de plazo muestran la regla aplicada y su
   fuente, con advertencia de verificación — nunca un número sin fundamento.

## 4. Implementación por fases (alineada con F4/F5)

- **W1** (con `document_analysis`): expediente mínimo (hechos+documentos+cronología) — el
  análisis documental guarda su salida en el expediente en vez de perderse en el chat.
- **W2** (con biblioteca privada): inventario de pruebas + vínculo hecho↔prueba.
- **W3**: estrategia estructurada con checklists del fundador (primer artefacto productizado).
- **W4**: redacción conectada (plantilla + expediente + citas).
- **W5** (beta): preparación de audiencia; Modo Litigante live al final, tras estabilidad.

Cada W entra por el ciclo estándar del harness (BRANCH→TEST→PREVIEW→SECURITY→EVAL→
MERGE→PRODUCTION→SMOKE→OBSERVATION) como release pequeña y reversible.

## 5. Métrica de éxito

Tiempo de "caso nuevo → primer borrador defendible": objetivo < 1 hora con trazabilidad
completa, frente a una jornada típica sin la plataforma.
