/**
 * lib/legal-os/policies/model-policy.ts
 * Política de modelos. SOLO se escribe un ID de modelo cuando está verificado en la documentación oficial (ver
 * el registro de verificación oficial de OpenAI del repositorio). El modelo profundo NO está verificado: queda en null y el router degrada a FAST avisando.
 */
import { CONFIG_PROVEEDOR_OPENAI } from '../providers/capabilities';

/** Tarifas Standard verificadas el 2026-10-23 (USD por millón de tokens). Una prueba exige que coincidan con el gateway: Legal OS no importa el gateway (aislamiento). */
export const TARIFAS_FAST = Object.freeze({ inputUsdPerMillion: 0.1, cacheWrite30mUsdPerMillion: 0.125, outputUsdPerMillion: 0.5, minCacheableTokens: 1024, maxInputTokens: 24_000 });

export interface ModelPolicy {
  fast: { modelId: string; verified: boolean };
  deep: { modelId: string | null; verified: boolean };
  /** Techo de coste por consulta por plan, en USD. */
  maxCostUsdPorConsulta: Readonly<Record<'EXPLORAR' | 'ACADEMICO' | 'PREMIUM', number>>;
  /** Planes que pueden usar el modelo profundo. */
  deepPermitidoEn: readonly ('EXPLORAR' | 'ACADEMICO' | 'PREMIUM')[];
}

/** Los techos de coste y el reparto por plan son valores PROPUESTOS por ingeniería; los planes comerciales los fija Fredy. */
export const MODEL_POLICY: Readonly<ModelPolicy> = Object.freeze<ModelPolicy>({
  fast: { modelId: CONFIG_PROVEEDOR_OPENAI.FAST.modelId as string, verified: CONFIG_PROVEEDOR_OPENAI.FAST.verified },
  deep: { modelId: CONFIG_PROVEEDOR_OPENAI.DEEP_REASONING.modelId, verified: CONFIG_PROVEEDOR_OPENAI.DEEP_REASONING.verified },
  maxCostUsdPorConsulta: { EXPLORAR: 0.005, ACADEMICO: 0.02, PREMIUM: 0.1 },
  deepPermitidoEn: ['ACADEMICO', 'PREMIUM'],
});
