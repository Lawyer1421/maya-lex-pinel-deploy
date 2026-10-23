/**
 * lib/ai-gateway/canary/go-no-go.ts
 * G5-H: contrato GO / NO-GO de activación de un futuro canary. Puro y determinista.
 *
 * Un canary solo puede ejecutarse si TODAS las condiciones son verdaderas Y cada una trae EVIDENCIA (texto no vacío:
 * enlace al dictamen, al comentario de autorización, al reporte de prueba…). Un booleano sin evidencia no cuenta.
 * Si una falla: NO_GO. Este módulo no activa nada; solo decide si sería legítimo pedir la activación.
 */
export const CONDICIONES_CANARY = [
  'FREDY_AUTHORIZATION',
  'CLO_PROVENANCE_PILOT_APPROVED',
  'PRIVACY_RESIDUAL_RISK_ACCEPTED_OR_MITIGATED',
  'OFFICIAL_API_VERIFICATION_CURRENT',
  'BUDGET_GT_ZERO_EXPLICITLY_AUTHORIZED',
  'KILL_SWITCH_EXPLICITLY_AUTHORIZED',
  'PRODUCTION_RESPONSE_INDEPENDENT',
  'NO_PRIVATE_DATA',
  'NO_CORPUS_WRITES',
  'NO_MODEL_AUTHORITY_OVER_LEGAL_VALIDITY',
  'ROLLBACK_TESTED',
] as const;
export type CondicionCanary = (typeof CONDICIONES_CANARY)[number];

export interface EvidenciaCondicion { cumplida: boolean; evidencia: string | null }
export type EntradasGoNoGo = Readonly<Record<CondicionCanary, EvidenciaCondicion>>;

export type DecisionGoNoGo =
  | { decision: 'GO'; razones: [] }
  | { decision: 'NO_GO'; razones: Array<{ condicion: CondicionCanary; motivo: 'NO_CUMPLIDA' | 'SIN_EVIDENCIA' | 'AUSENTE' }> };

export function evaluarGoNoGo(entradas: Partial<Record<CondicionCanary, EvidenciaCondicion>>): DecisionGoNoGo {
  const razones: Array<{ condicion: CondicionCanary; motivo: 'NO_CUMPLIDA' | 'SIN_EVIDENCIA' | 'AUSENTE' }> = [];
  for (const c of CONDICIONES_CANARY) {
    const e = entradas?.[c];
    if (!e) razones.push({ condicion: c, motivo: 'AUSENTE' });
    else if (e.cumplida !== true) razones.push({ condicion: c, motivo: 'NO_CUMPLIDA' });
    else if (typeof e.evidencia !== 'string' || e.evidencia.trim() === '') razones.push({ condicion: c, motivo: 'SIN_EVIDENCIA' });
  }
  return razones.length === 0 ? { decision: 'GO', razones: [] } : { decision: 'NO_GO', razones };
}

export function textoGoNoGo(d: DecisionGoNoGo): string {
  if (d.decision === 'GO') return 'GO — todas las condiciones cumplidas con evidencia.';
  return ['NO-GO', ...d.razones.map((r) => `  - ${r.condicion}: ${r.motivo}`)].join('\n');
}
