# G6 — Paquete de autorización del primer canary (preparación, offline)

**Alcance.** Este documento resume G6-A…J. Todo es preparación y evidencia reproducible; **nada activa el canary, el shadow ni el presupuesto**.
Valores reales en el repositorio: `SHADOW_GATEWAY_ENABLED=false`, `SHADOW_BUDGET_USD=0`, `enabled=false`, `maxRequests=0`, `maxBudgetUsd=0`, `sampleStrategy=NINGUNA`, manifiesto efectivo con 0 entradas.

**Decisión del paquete:** `NOT_READY_FOR_FREDY_DECISION` (12/15 condiciones MET). Bloqueos, ninguno cerrable por el agente:

| Bloqueo | Responsable | Qué falta |
|---|---|---|
| `CLO_PILOT_APPROVED` | CLO | Id canónico, texto exacto almacenado, URL oficial, estado V4/V5 y decisión formal (nombre, fecha, enlace) por artículo |
| `EFFECTIVE_MANIFEST_GT_ZERO` | CLO / Fredy | El último paso (aprobada → manifiesto efectivo) solo con aprobación humana y autorización expresa |
| `SERVERLESS_CERTIFIED` | Administrador de Vercel | Confirmar Fluid Compute / `maxDuration` en el panel (la API de solo lectura no lo expone) o autorizar un `export const maxDuration` explícito |

## G6-A — Verificación oficial de OpenAI
`lib/ai-gateway/canary/openai-verification.ts`: 18 entradas VERIFIED con valor, URL oficial, fecha (2026-10-23), método y ubicación en el código. Caduca a los 7 días (`VERIFICACION_MAX_DIAS`). Prueba de deriva contra `tests/fixtures/openai-official-2026-10-23.json`.
Hallazgos corregidos: (1) el adaptador no fijaba `reasoning`; el modelo razona en `medium` por defecto → ahora `reasoning.effort = none`; (2) la escritura de caché cuesta 1.25× → reserva y liquidación del presupuesto usan esa cota superior.
**`store:false` no es ZDR.** ZDR es un control de organización; MayaLex **no** se declara ZDR (`ESTADO_ZDR_MAYALEX.approved=false`). Los registros de monitoreo de abuso se conservan hasta 30 días por defecto.

## G6-B — Paquete del piloto para el CLO
`docs/governance/evidence/g6-clo-pilot-pack.md` (CP D.130-2017 art. 634 y D.46-2020 art. 1; 16 datos por candidato). Todo lo no respaldado por el repositorio queda `PENDING_VERIFICATION`; ningún candidato está aprobado. Flujo: candidate → verification → CLO review → approval → effective manifest (último paso **no ejecutado**).

## G6-C — Privacidad, ronda 2 (sin LLM externo)
Seis métricas separadas (`docs/governance/evidence/g6-privacy-metrics.json`): requiredRecall 1.0 (98), residualMissRate 0 (637 adversariales), overallMissRate 0, publicFalsePositiveRate 0 (84), privateDocumentRecall 1.0 (92), publicNamedEntityFalsePositiveRate 0 (43).
**Esas cifras están afinadas contra sus propios conjuntos; no son «100 % de privacidad».** La estimación honesta de generalización es el holdout 3, que no se tocó: **6/39 privados no detectados (15.4 %)**, falsos positivos públicos 6.7 %. El riesgo residual del gate general existe y está cuantificado.

## G6-D — Envolvente de privacidad del primer canary
`first-canary-envelope.ts`: lista blanca de vocabulario cerrado, falla cerrado. 0/841 casos privados aceptados; 7/8 preguntas del Golden Set elegibles. El primer canary **no depende** del gate general: lo acota la envolvente.

## G6-E — Certificación serverless
`serverless-certification.ts`: 8/9 puntos VERIFIED. **NOT_VERIFIED: `max-duration`** (Fluid Compute no confirmable). `after()` **no** se conectó al shadow; `PRODUCTION_HTTP_RESPONSE_INDEPENDENT = TRUE` con 12 escenarios idénticos a la línea base (`g6-production-independence.json`). Único cambio en la ruta: `try/catch` alrededor de `despacharShadow`.

## G6-F — Rollback
`g6-rollback-evidence.json`: 8 disparadores (adaptador, privacidad, procedencia, esquema, costo, timeout, circuit breaker, kill manual) detienen, no reanudan y devuelven al estado seguro. **Límite conocido:** el kill switch es una constante de código; apagar en un despliegue real = revertir/promover el despliegue anterior, no un interruptor en caliente.

## G6-G — Envolvente propuesta (no aplicada)
`canary-proposal.ts`: 8 solicitudes máx., lista blanca vacía hasta que el CLO apruebe, presupuesto duro recomendado 0.05 USD, paradas inmediatas, sin tools/web/archivos/agents, `store:false`, esquema estricto, citas obligatorias. Verificada contra el cuerpo real de la solicitud.

## G6-H — Costos
`g6-cost-authorization.md`: 1/5/10/100/1,000/10,000 consultas, esperado/p95/p99/peor caso, sin caché/con caché/salida. Peor caso por consulta 0.0034 USD (tope duro 24,000 + 800 tokens). Supuestos, no mediciones.

## G6-I — Paquete
`g6-authorization-pack.{md,json}` (generado con `--as-of 2026-10-23`). Contrato de activación (G5-H) sigue en NO_GO. READY no activaría nada: solo habilita a Fredy a emitir `CANARY_GO` / `CANARY_NO_GO`.

## G6-J — Integración sintética
`synthetic-canary.ts` + `tests/canary-authorization-g6.test.ts`: adaptador falso, manifiesto sintético, presupuesto simulado, fallos inyectados, ciclo de vida diferido, parada y rollback. Sin red, sin credenciales.

## Reproducir
```
npx tsx scripts/g6-authorization-pack.ts --as-of 2026-10-23
npx tsx scripts/g6-privacy-metrics.ts --write-json
G6_WRITE_EVIDENCE=1 npx vitest run tests/rollback-rehearsal-g6.test.ts tests/production-independence-g6.test.ts
```
Si cambia un archivo de código que la evidencia hashea, esa evidencia deja de ser vigente y el paquete vuelve a NOT_READY hasta regenerarla.
