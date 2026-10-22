/**
 * Validador determinístico de citas (PR-G1). Reglas, sin excepciones ni
 * valores por defecto que dejen pasar una claim dudosa:
 *  - Una claim sin citas se descarta (SIN_CITAS).
 *  - Una claim con algún chunk_id que no está en el evidence de ESA consulta se
 *    descarta entera (CITA_FUERA_DE_EVIDENCIA) y cada cita así cuenta como
 *    cita inválida.
 *  - Si el modelo decidió ANSWER y no queda ninguna claim sustentada, el
 *    resultado es INVALID: no se convierte en respuesta ni en abstención.
 */
import { parsearSalidaModelo } from './model-output-schema';
import { estimarCostoUsd, type ModoTarifa } from './pricing';
import {
  MODELO_GATEWAY,
  crearResultadoSombra,
  type DiscardedClaim,
  type ShadowGatewayInput,
  type ShadowGatewayResult,
  type ValidatedClaim,
} from './types';

export interface SalidaCruda {
  rawOutput: unknown;
  usage: { inputTokens: number; outputTokens: number };
  latencyMs: number;
}

export function validarSalida(
  input: ShadowGatewayInput,
  cruda: SalidaCruda,
  modo: ModoTarifa = 'standard',
): ShadowGatewayResult {
  const usage = {
    inputTokens: cruda.usage.inputTokens,
    outputTokens: cruda.usage.outputTokens,
    estimatedCostUsd: estimarCostoUsd(cruda.usage.inputTokens, cruda.usage.outputTokens, modo),
  };
  const base = { queryId: input.queryId, model: MODELO_GATEWAY, usage, latencyMs: cruda.latencyMs };
  const invalido = (invalidReason: string, extra: Partial<Pick<ShadowGatewayResult, 'discardedClaims' | 'invalidCitations' | 'totalCitations'>> = {}) =>
    crearResultadoSombra({
      ...base,
      status: 'INVALID',
      claims: [],
      discardedClaims: extra.discardedClaims ?? [],
      invalidCitations: extra.invalidCitations ?? 0,
      totalCitations: extra.totalCitations ?? 0,
      abstentionReason: null,
      invalidReason,
    });

  const parseo = parsearSalidaModelo(cruda.rawOutput);
  if (!parseo.ok) return invalido(parseo.motivo);
  const salida = parseo.salida;

  if (salida.decision === 'ABSTAIN') {
    return crearResultadoSombra({
      ...base,
      status: 'ABSTAIN',
      claims: [],
      discardedClaims: [],
      invalidCitations: 0,
      totalCitations: 0,
      abstentionReason: salida.abstention_reason,
      invalidReason: null,
    });
  }

  const evidenceIds = new Set(input.evidence.map((e) => e.chunk_id));
  const claims: ValidatedClaim[] = [];
  const discardedClaims: DiscardedClaim[] = [];
  let invalidCitations = 0;
  let totalCitations = 0;
  for (const c of salida.claims) {
    totalCitations += c.citations.length;
    if (c.citations.length === 0) {
      discardedClaims.push({ claim_id: c.claim_id, motivo: 'SIN_CITAS', chunkIdsInvalidos: [] });
      continue;
    }
    const fuera = c.citations.filter((ct) => !evidenceIds.has(ct.chunk_id)).map((ct) => ct.chunk_id);
    if (fuera.length > 0) {
      invalidCitations += fuera.length;
      discardedClaims.push({ claim_id: c.claim_id, motivo: 'CITA_FUERA_DE_EVIDENCIA', chunkIdsInvalidos: fuera });
      continue;
    }
    claims.push({ claim_id: c.claim_id, text: c.text, citations: c.citations.map((ct) => ({ chunk_id: ct.chunk_id, support: ct.support })) });
  }

  if (claims.length === 0) {
    return invalido('ANSWER sin ninguna claim sustentada en el evidence', { discardedClaims, invalidCitations, totalCitations });
  }
  return crearResultadoSombra({
    ...base,
    status: 'ANSWER',
    claims,
    discardedClaims,
    invalidCitations,
    totalCitations,
    abstentionReason: null,
    invalidReason: null,
  });
}
