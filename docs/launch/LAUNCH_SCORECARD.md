# LAUNCH_SCORECARD

> Generado por `npx tsx scripts/generate-launch-scorecard.ts`. DESIGN_FIXED mide compuertas y enrutamiento con evidencia sintética; NO mide corrección jurídica. LEGAL_CLO_APPROVED sigue vacío. La latencia y el coste son simulados.
> Metas: `PENDING_FREDY` — no se han acordado umbrales; no se inventan.

## Métricas

| Métrica | Valor | n | Denominador | Base | Meta | Estado |
|---|---:|---:|---:|---|---|---|
| Exact legal reference accuracy | n/d (requiere CLO) | 0 | 0 | LEGAL_CLO_APPROVED | PENDING_FREDY | ND_NEEDS_CLO_APPROVED_CASES |
| Retrieval recall | n/d (requiere CLO) | 0 | 0 | LEGAL_CLO_APPROVED | PENDING_FREDY | ND_NEEDS_CLO_APPROVED_CASES |
| Retrieval precision | n/d (requiere CLO) | 0 | 0 | LEGAL_CLO_APPROVED | PENDING_FREDY | ND_NEEDS_CLO_APPROVED_CASES |
| Citation validity (server validation) | 100.0 % | 7 | 7 | DESIGN_FIXED | PENDING_FREDY | MEASURED |
| Version accuracy | n/d (requiere CLO) | 0 | 0 | LEGAL_CLO_APPROVED | PENDING_FREDY | ND_NEEDS_CLO_APPROVED_CASES |
| Abstention accuracy | 100.0 % | 114 | 114 | DESIGN_FIXED | PENDING_FREDY | MEASURED |
| Privacy rejection | 100.0 % | 34 | 34 | DESIGN_FIXED | PENDING_FREDY | MEASURED |
| Provenance rejection | 100.0 % | 21 | 21 | DESIGN_FIXED | PENDING_FREDY | MEASURED |
| Unsupported claim rate | 0.0 % | 7 | 7 | DESIGN_FIXED | PENDING_FREDY | MEASURED |
| Latency p50 (SIMULATED) | 2 | 114 | 114 | SIMULATED | PENDING_FREDY | MEASURED |
| Latency p95 (SIMULATED) | 7 | 114 | 114 | SIMULATED | PENDING_FREDY | MEASURED |
| Estimated cost/query | 0.000017 | 114 | 114 | SIMULATED | PENDING_FREDY | MEASURED |
| Golden Set coverage (legal, CLO-approved / plantillas) | 0.0 % | 0 | 150 | LEGAL_CLO_APPROVED | PENDING_FREDY | MEASURED |
| Core Corpus coverage (verified / Tier A) | 0.0 % | 0 | 16 | CORPUS | PENDING_FREDY | MEASURED |
| Skills selected (shadow) | 100.0 % | 19 | 19 | DESIGN_FIXED | PENDING_FREDY | MEASURED |
| Skills evidence met (shadow) | 100.0 % | 19 | 19 | DESIGN_FIXED | PENDING_FREDY | MEASURED |
| Skills abstain on foreign evidence (shadow) | 100.0 % | 17 | 17 | DESIGN_FIXED | PENDING_FREDY | MEASURED |

### Notas por métrica

- **Exact legal reference accuracy**: Requiere casos LEGAL_CLO_APPROVED (hoy 0); no se puntúa derecho contra expectativas no aprobadas.
- **Retrieval recall**: Requiere casos LEGAL_CLO_APPROVED con artículos exigidos (hoy 0). (sin casos con artículos exigidos)
- **Retrieval precision**: Requiere casos LEGAL_CLO_APPROVED con artículos exigidos (hoy 0).
- **Citation validity (server validation)**: Respuestas entregadas cuyas citas existen todas en la evidencia entregada. Sobre evidencia SINTÉTICA: mide la compuerta, no la corrección jurídica.
- **Version accuracy**: Requiere casos LEGAL_CLO_APPROVED con fecha de versión esperada (hoy 0).
- **Abstention accuracy**: Decisión ANSWER/ABSTAIN igual a la determinada por el diseño, aun con un recuperador adversarial que siempre devuelve evidencia.
- **Privacy rejection**: Privacidad, inyección de prompt, cebo de datos personales, país no habilitado: rechazo antes de recuperar y de llamar al modelo.
- **Provenance rejection**: Decreto citado sin respaldo / instrumento nombrado sin evidencia de ese instrumento: rechazados con su motivo.
- **Unsupported claim rate**: Afirmaciones ENTREGADAS cuyas citas no están en la evidencia (0 por construcción: el servidor descarta el resto). No incluye lo que el modelo propuso y se descartó.
- **Latency p50 (SIMULATED)**: Ticks de un reloj inyectado que avanza 1 por evento de traza. NO son milisegundos de pared ni mide red/modelo reales.
- **Latency p95 (SIMULATED)**: Ídem: ticks simulados.
- **Estimated cost/query**: Media del coste ESTIMADO por el enrutador sobre toda la suite (incluye consultas sin modelo, coste 0); 9 consultas llamaron al modelo falso. No hay llamadas reales.
- **Golden Set coverage (legal, CLO-approved / plantillas)**: 56 plantillas esperan al CLO; 94 están fijadas por diseño (DESIGN_FIXED).
- **Core Corpus coverage (verified / Tier A)**: Verificado 0; en corpus sin verificar 56.3 %; ausente 12.5 %; solo descubierto 31.3 %.
- **Skills selected (shadow)**: Skill de lanzamiento elegida por una pregunta temática representativa (skill_id). Mide cableado, no corrección jurídica.
- **Skills evidence met (shadow)**: Con evidencia sintética del instrumento exigido, se cumple skill_evidence.met.
- **Skills abstain on foreign evidence (shadow)**: Con evidencia de otro instrumento el pipeline se abstiene. 2 skills no exigen instrumento y quedan fuera del denominador.

## Cobertura del Golden Set

Plantillas: 150 · DESIGN_FIXED (plantillas): 94 · escenarios de pipeline DESIGN_FIXED: 114 · escenarios de política de fuentes: 6 · pendientes de CLO: 56 · LEGAL_CLO_APPROVED: 0.

| Materia | Plantillas | DESIGN_FIXED (plantillas) | Escenarios DESIGN_FIXED adicionales | Pendientes CLO | LEGAL_CLO_APPROVED |
|---|---:|---:|---:|---:|---:|
| Constitutional | 10 | 6 | 0 | 4 | 0 |
| Civil | 10 | 6 | 20 | 4 | 0 |
| CivilProcedure | 10 | 6 | 0 | 4 | 0 |
| Criminal | 10 | 6 | 1 | 4 | 0 |
| CriminalProcedure | 10 | 6 | 1 | 4 | 0 |
| Commercial | 10 | 10 | 1 | 0 | 0 |
| Labor | 10 | 6 | 2 | 4 | 0 |
| Family | 10 | 6 | 1 | 4 | 0 |
| Notarial | 10 | 6 | 0 | 4 | 0 |
| Administrative | 10 | 6 | 0 | 4 | 0 |
| Tax | 10 | 6 | 0 | 4 | 0 |
| Customs | 10 | 6 | 0 | 4 | 0 |
| AML | 10 | 6 | 0 | 4 | 0 |
| Banking | 10 | 6 | 0 | 4 | 0 |
| Property | 10 | 6 | 0 | 4 | 0 |

## Cobertura del corpus núcleo (Tier A)

Instrumentos: 16. AVAILABLE_VERIFIED: 0 · AVAILABLE_PARTIAL: 8 · OUTDATED: 0 · MISSING: 2 · DISCOVERED_UNVERIFIED: 5 · PENDING_CLO: 1.

Detalle en `docs/corpus/LAUNCH_CORE_CORPUS_HN.md`.

## Skills de lanzamiento en sombra

Total 19 · seleccionadas 19 · evidencia cumplida 19 · se abstienen con evidencia ajena 17/17 · OK 17 · sin instrumento exigido 2. Evidencia sintética: mide cableado, no derecho.

| skill_id | Elegida como | Evidencia cumplida | Abstiene (ajena) | Estado |
|---|---|---|---|---|
| HN.ADMINISTRATIVE.APPEAL | HN.ADMINISTRATIVE.APPEAL | sí | n/a | SIN_INSTRUMENTO_EXIGIDO |
| HN.AML.COMPLIANCE | HN.AML.COMPLIANCE | sí | n/a | SIN_INSTRUMENTO_EXIGIDO |
| HN.CIVIL.CONTRACTS | HN.CIVIL.CONTRACTS | sí | sí | OK |
| HN.CIVIL.CONTRACTS.SALE | HN.CIVIL.CONTRACTS.SALE | sí | sí | OK |
| HN.CIVIL.PROPERTY | HN.CIVIL.PROPERTY | sí | sí | OK |
| HN.CIVIL.SUCCESSION | HN.CIVIL.SUCCESSION | sí | sí | OK |
| HN.COMMERCIAL.CONTRACTS | HN.COMMERCIAL.CONTRACTS | sí | sí | OK |
| HN.COMMERCIAL.NEGOTIABLE_INSTRUMENTS | HN.COMMERCIAL.NEGOTIABLE_INSTRUMENTS | sí | sí | OK |
| HN.CONSTITUTIONAL.ARTICLE_LOOKUP | HN.CONSTITUTIONAL.ARTICLE_LOOKUP | sí | sí | OK |
| HN.FAMILY.CHILDREN | HN.FAMILY.CHILDREN | sí | sí | OK |
| HN.FAMILY.DIVORCE | HN.FAMILY.DIVORCE | sí | sí | OK |
| HN.LABOR.TERMINATION | HN.LABOR.TERMINATION | sí | sí | OK |
| HN.NOTARIAL.PUBLIC_DEED | HN.NOTARIAL.PUBLIC_DEED | sí | sí | OK |
| HN.PENAL.ARTICLE_LOOKUP | HN.PENAL.ARTICLE_LOOKUP | sí | sí | OK |
| HN.PENAL.CRIMES.FRAUD | HN.PENAL.CRIMES.FRAUD | sí | sí | OK |
| HN.PENAL.OFFENSE_ANALYSIS | HN.PENAL.OFFENSE_ANALYSIS | sí | sí | OK |
| HN.PROCEDURAL_CIVIL.CLAIM | HN.PROCEDURAL_CIVIL.CLAIM | sí | sí | OK |
| HN.PROCEDURAL_PENAL | HN.PROCEDURAL_PENAL | sí | sí | OK |
| HN.TAX.ARTICLE_LOOKUP | HN.TAX.ARTICLE_LOOKUP | sí | sí | OK |

## Incumplimientos de la suite DESIGN_FIXED: 0

Ninguno.
