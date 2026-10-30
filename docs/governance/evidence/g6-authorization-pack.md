# CANARY_AUTHORIZATION_PACK — G6-I

## Decisión: `NOT_READY_FOR_FREDY_DECISION`

READY_FOR_FREDY_DECISION NO activa nada: solo habilita que Fredy emita CANARY_GO o CANARY_NO_GO. El contrato de activación sigue en NO_GO mientras Fredy no autorice, el presupuesto sea 0 y el kill switch esté apagado.

Valores reales: SHADOW_GATEWAY_ENABLED=false · SHADOW_BUDGET_USD=0 · enabled=false · maxRequests=0 · maxBudgetUsd=0 · sampleStrategy=NINGUNA

Condiciones: 12/15 MET.

| Condición | Estado | Responsable | Evidencia |
|---|---|---|---|
| OPENAI_OFFICIAL_VERIFICATION_CURRENT | MET | CLAUDE_CODE | lib/ai-gateway/canary/openai-verification.ts: 0 pendientes, vigente=true, más antigua 2026-10-23 |
| CLO_PILOT_APPROVED | NOT_MET | CLO | 0/2 candidatos APPROVED; el resto PENDING_CLO_APPROVAL (docs/governance/evidence/g6-clo-pilot-pack.md) |
| EFFECTIVE_MANIFEST_GT_ZERO | NOT_MET | CLO | MANIFIESTO_PROCEDENCIA_PUBLICA.length = 0 |
| PRIVACY_METRICS_CURRENT | MET | CLAUDE_CODE | docs/governance/evidence/g6-privacy-metrics.json (hashes del gate y de los benchmarks) |
| FIRST_CANARY_PRIVACY_POLICY_SATISFIED | MET | CLAUDE_CODE | 0/841 privados aceptados; 7/8 preguntas del Golden Set elegibles |
| RESIDUAL_RISK_QUANTIFIED | MET | CLAUDE_CODE | holdout 3: 6/39 privados no detectados (15.4 %); el primer canary NO depende de este gate: lo acota la envolvente |
| SERVERLESS_CERTIFIED | NOT_MET | ADMIN_VERCEL | 8/9 puntos VERIFIED (lib/ai-gateway/canary/serverless-certification.ts) |
| ROLLBACK_TESTED | MET | CLAUDE_CODE | docs/governance/evidence/g6-rollback-evidence.json |
| KILL_SWITCH_TESTED | MET | CLAUDE_CODE | g6-rollback-evidence.json → killSwitchProbado; rollback = revertir y redesplegar (no hay interruptor en caliente) |
| BUDGET_PROPOSAL_COMPLETE | MET | CLAUDE_CODE | 8 solicitudes máx., presupuesto duro recomendado 0.05 USD; docs/governance/evidence/g6-cost-authorization.md |
| PRODUCTION_INDEPENDENCE_DEMONSTRATED | MET | CLAUDE_CODE | 15 escenarios idénticos a la línea base (docs/governance/evidence/g6-production-independence.json) |
| NO_PRIVATE_DATA | MET | CLAUDE_CODE | Envolvente del primer canary (vocabulario cerrado) + privacyGate PASS; 0 casos privados aceptados. |
| NO_PRIVATE_CORPUS | MET | CLAUDE_CODE | Gate estructural (rechaza doc_*, doctrina y fuentes no «codigo») + manifiesto de procedencia por fragmento aprobado. |
| NO_CORPUS_WRITES | MET | CLAUDE_CODE | Escaneo de lib/ai-gateway/**: 0 archivos con patrones de escritura o de cliente de base de datos |
| MODEL_ZERO_AUTHORITY_OVER_LEGAL_VALIDITY | MET | CLAUDE_CODE | El esquema de salida no tiene campos de vigencia/validez/rol; producción ABSTAIN es autoritativa (g6-production-independence.json). |

## Bloqueos

- **CLO_PILOT_APPROVED** (CLO): Aportar id canónico, texto exacto, URL oficial y estado V4/V5 por artículo, y registrar la decisión formal del CLO (nombre, fecha, enlace).
- **EFFECTIVE_MANIFEST_GT_ZERO** (CLO): Pasar el último paso (entrada aprobada → manifiesto efectivo) solo tras la aprobación humana válida y con autorización.
- **SERVERLESS_CERTIFIED** (ADMIN_VERCEL): max-duration: La API de solo lectura no expone si Fluid Compute está activo en este proyecto, así que la duración disponible (300 s con Fluid) no está confirmada. Cerrarlo: ver el interruptor en el panel de Vercel, o autorizar un export const maxDuration explícito en la ruta.

## Contrato de activación (G5-H)

NO_GO — condiciones sin cumplir: FREDY_AUTHORIZATION, CLO_PROVENANCE_PILOT_APPROVED, PRIVACY_RESIDUAL_RISK_ACCEPTED_OR_MITIGATED, BUDGET_GT_ZERO_EXPLICITLY_AUTHORIZED, KILL_SWITCH_EXPLICITLY_AUTHORIZED, PRODUCTION_RESPONSE_INDEPENDENT, NO_PRIVATE_DATA, NO_CORPUS_WRITES, NO_MODEL_AUTHORITY_OVER_LEGAL_VALIDITY, ROLLBACK_TESTED
