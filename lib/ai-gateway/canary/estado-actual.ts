/**
 * lib/ai-gateway/canary/estado-actual.ts
 * G5-H: estado REAL de las condiciones del contrato GO/NO-GO, derivado de lo que el repositorio puede comprobar.
 * Lo que solo una persona puede afirmar (autorización de Fredy, aprobación del CLO, aceptación de riesgo, rollback
 * probado) queda NO CUMPLIDO sin evidencia: este código nunca se las atribuye.
 */
import { SHADOW_GATEWAY_ENABLED } from '../shadow/config';
import { SHADOW_BUDGET_USD } from '../shadow/shadow-model-config';
import { MANIFIESTO_PROCEDENCIA_PUBLICA } from '../shadow/public-provenance-manifest';
import { estadoVerificacionOpenAI } from './openai-verification';
import { evaluarGoNoGo, type CondicionCanary, type EvidenciaCondicion } from './go-no-go';

const no = (): EvidenciaCondicion => ({ cumplida: false, evidencia: null });

export function estadoActualGoNoGo(): Record<CondicionCanary, EvidenciaCondicion> {
  const verif = estadoVerificacionOpenAI();
  return {
    FREDY_AUTHORIZATION: no(),
    CLO_PROVENANCE_PILOT_APPROVED: MANIFIESTO_PROCEDENCIA_PUBLICA.length > 0
      ? { cumplida: true, evidencia: `${MANIFIESTO_PROCEDENCIA_PUBLICA.length} entradas en el manifiesto efectivo (con aprobador y fecha)` }
      : no(),
    PRIVACY_RESIDUAL_RISK_ACCEPTED_OR_MITIGATED: no(),
    OFFICIAL_API_VERIFICATION_CURRENT: verif.completa ? { cumplida: true, evidencia: `todas las entradas verificadas y vigentes (desde ${verif.fechaMasAntigua})` } : no(),
    BUDGET_GT_ZERO_EXPLICITLY_AUTHORIZED: SHADOW_BUDGET_USD > 0 ? { cumplida: true, evidencia: `SHADOW_BUDGET_USD=${SHADOW_BUDGET_USD} en código revisado` } : no(),
    KILL_SWITCH_EXPLICITLY_AUTHORIZED: SHADOW_GATEWAY_ENABLED === true ? { cumplida: true, evidencia: 'SHADOW_GATEWAY_ENABLED=true en código revisado' } : no(),
    PRODUCTION_RESPONSE_INDEPENDENT: no(),
    NO_PRIVATE_DATA: no(),
    NO_CORPUS_WRITES: no(),
    NO_MODEL_AUTHORITY_OVER_LEGAL_VALIDITY: no(),
    ROLLBACK_TESTED: no(),
  };
}

export const decisionActualGoNoGo = () => evaluarGoNoGo(estadoActualGoNoGo());
