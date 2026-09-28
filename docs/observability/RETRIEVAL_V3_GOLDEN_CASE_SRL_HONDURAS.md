# Caso de evaluación dorado (negativo) para Retrieval V3 — S. de R.L. Honduras

**Fecha:** 2026-09-27
**Estado:** ESPECIFICACIÓN PREPARADA, NO IMPLEMENTADA
**Origen:** incidente de calidad de producto observado en vivo durante la
validación end-to-end de Langfuse (`feat/langfuse-observability`,
`docs/observability/LANGFUSE_E2E_VALIDATION.md`, Sección 10) — el pipeline
de retrieval heredado, no Retrieval V3.

Este documento **no modifica ningún código** de ninguna rama. Es la
especificación de un futuro caso de evaluación (golden test) para el
proyecto Retrieval V3 (`refactor/retrieval-v3-exact-resolver`), preparado
aquí para que su implementación futura no tenga que redescubrir el
contexto ni los criterios de éxito/fallo.

## Consulta

> "¿Cuáles son los requisitos para constituir una Sociedad de
> Responsabilidad Limitada en Honduras?"

Categoría: derecho mercantil/notarial, consulta genérica sin datos
personales — candidata natural para el corpus normativo (Código de
Comercio, Ley de Sociedades Mercantiles o equivalente vigente en
Honduras) y/o el fallback oficial (CEDIJ) si el corpus interno resulta
insuficiente.

## Comportamiento observado (línea base — pipeline heredado, NO Retrieval V3)

- Corpus recuperado: **Ley sobre Justicia Constitucional** — contaminación
  cruzada de materia, evidencia cero relacionada con la consulta.
- Respuesta abrió con una advertencia extensa exponiendo el fallo de
  recuperación al usuario final.
- El modelo continuó respondiendo con contenido mercantil sustantivo desde
  memoria paramétrica, sin evidencia verificada — exactamente el patrón
  `NO EVIDENCE + MODEL MEMORY = AUTHORITATIVE LEGAL ANSWER`.
- Marcadores de incertidumbre repetidos indiscriminadamente ("VERIFICAR
  TEXTO", "aprox.", "según mi conocimiento", "tradicionalmente...").
- Lenguaje de depuración interno (estado de retrieval, fallos de
  enrutamiento) visible en la respuesta al usuario.

## FAIL CONDITIONS (cualquiera de estas invalida el caso)

1. Contaminación de corpus con materia constitucional (o cualquier materia
   ajena a mercantil/notarial) presentada como evidencia relevante.
2. Números de artículo no verificables/sin respaldo en el corpus o en la
   fuente oficial.
3. Montos de capital social sin respaldo verificable.
4. Marcadores de tipo "VERIFICAR"/"VERIFICAR TEXTO" repetidos de forma
   genérica en vez de localizados a una proposición específica.
5. Advertencia de retrieval/estado de depuración visible al usuario antes
   de la respuesta legal.
6. Respuesta fundamentada en memoria del modelo tras un fallo de
   evidencia, presentada como si fuera autoritativa.

## PASS CONDITIONS (todas requeridas)

1. Evidencia mercantil/notarial real — del corpus interno (`ruta` B/C con
   `EXACT_SUCCESS`/`SEMANTIC_SUCCESS`) o, si el corpus interno es
   insuficiente, del fallback oficial CEDIJ (`OFFICIAL_FALLBACK_REQUIRED`
   → `attemptOfficialFallback` → `SOURCE_CONFIRMED`, nunca
   `es_norma_vigente=true` fabricado — ver
   `lib/legal-retrieval/official-sources/fallback-orchestrator.ts`).
2. Fuentes estatutarias verificadas y citables.
3. Respuesta profesional directa — sin advertencia previa salvo limitación
   legalmente material.
4. Incertidumbre localizada únicamente a la proposición específica que
   realmente carece de verificación puntual (si la hay), nunca genérica ni
   repetida.
5. Cero citas alucinadas (ningún número de artículo o instrumento sin
   respaldo verificable en `biblioteca_vectores` o en evidencia oficial
   confirmada).
6. Cero estado de depuración/retrieval interno visible en la respuesta.

## Mapeo a la arquitectura de Retrieval V3 ya existente

Este caso ejercita directamente el contrato ya construido en fases
anteriores de Retrieval V3, sin requerir código nuevo para EXISTIR como
especificación (solo para ejecutarse como test real más adelante):

- `RetrievalExecutionState` (Fase 1D) — el caso debe resolver a
  `EXACT_SUCCESS`/`SEMANTIC_SUCCESS` (evidencia interna suficiente) o a
  `OFFICIAL_FALLBACK_REQUIRED` (evidencia interna insuficiente, fallback
  oficial disponible) — nunca debe llegar a `NO_VERIFIED_EVIDENCE` seguido
  de una respuesta igualmente "autoritativa" generada desde memoria del
  modelo, que es exactamente lo que ocurrió en la línea base heredada.
- `requiereEvidenciaCorpus` / `MENSAJE_ABSTENCION_CORPUS`
  (`lib/legal-retrieval/evidence-engine.ts`) — la abstención determinista
  ya implementada es la que debería haber prevenido el Fallo 3.
- `OfficialFallbackOutcome` / `construirMensajeFallbackOficial`
  (`lib/legal-retrieval/official-sources/fallback-orchestrator.ts`) — ruta
  ya construida para exactamente este escenario (mercantil, ruta B/C).

## Cómo se ejecutaría este caso en el futuro (no implementado en esta fase)

1. Añadir la consulta como fixture en la suite de characterization tests de
   Retrieval V3 (mismo patrón que `tests/retrieval-runtime-contract.test.ts`).
2. Mockear/usar `biblioteca_vectores` de Staging con el corpus mercantil
   real ya ingerido (o su ausencia, para forzar la ruta de fallback oficial)
   y afirmar el `RetrievalExecutionState` resultante.
3. Afirmar que la respuesta final generada (a nivel de integración, no solo
   de retrieval) cumple las PASS CONDITIONS y ninguna FAIL CONDITION —
   esto requiere una capa de evaluación de la respuesta del LLM, no solo
   del retrieval, que hoy no existe y quedaría fuera del alcance de una
   fase de retrieval pura.
4. Registrar el resultado como snapshot dorado: cualquier regresión futura
   que reintroduzca alguna FAIL CONDITION debe romper este test.

## Explícitamente NO hecho en esta fase

- No se implementó ningún test automatizado todavía.
- No se tocó `lib/rag/search.ts`, `feat/langfuse-observability`, ni
  `refactor/retrieval-v3-exact-resolver`.
- No se hizo merge de ninguna rama.
- No se desplegó nada a Production.
