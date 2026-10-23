import { describe, expect, it } from 'vitest';
import { clasificarIntencion } from '@/lib/legal-os/router/intent';
import { resolverJurisdiccion, PAISES } from '@/lib/legal-os/jurisdiction/registry';
import { enrutarModelo, UMBRAL_EXACTO } from '@/lib/legal-os/router/model-router';
import { MODEL_POLICY, type ModelPolicy } from '@/lib/legal-os/policies/model-policy';
import { crearProveedorFalso } from '@/lib/legal-os/providers/provider';
import type { RoutingInput } from '@/lib/legal-os/types';

const base = (texto: string, extra: Partial<RoutingInput> = {}): RoutingInput => ({
  intent: clasificarIntencion(texto), tier: 'ACADEMICO', depth: 'STANDARD', evidenceQuality: 0.8, retrievalConfidence: 0.8, evidenceCount: 3,
  estimatedInputTokens: 2_000, latencyTargetMs: 2_000, ...extra,
});

describe('jurisdicción', () => {
  it('sin mención rige Honduras; la lanzadera es el único país habilitado', () => {
    expect(resolverJurisdiccion('¿Qué dice el artículo 173 del Código Procesal Penal?')).toMatchObject({ estado: 'RESUELTA', jurisdiccion: { country: 'HN' }, explicita: false });
    expect(Object.values(PAISES).filter((p) => p.enabled).map((p) => p.code)).toEqual(['HN']);
  });
  it('otro país habilitado a futuro no se responde con derecho hondureño', () => {
    expect(resolverJurisdiccion('¿Cuál es el plazo de prescripción en Guatemala?')).toEqual({ estado: 'PAIS_NO_HABILITADO', pais: 'GT' });
  });
  it('dos países → ambigua', () => {
    expect(resolverJurisdiccion('Compara el despido en Honduras y Costa Rica')).toMatchObject({ estado: 'AMBIGUA' });
  });
});

describe('intención', () => {
  it('artículo exacto', () => expect(clasificarIntencion('¿Qué dice el artículo 173 del Código Procesal Penal?')).toMatchObject({ task: 'EXACT_LOOKUP', hasExactReference: true, matter: 'penal' }));
  it('redacción de escrito es alto riesgo', () => expect(clasificarIntencion('Redacta una demanda de desahucio')).toMatchObject({ task: 'DRAFTING', risk: 'HIGH' }));
  it('análisis', () => expect(clasificarIntencion('Compara el despido directo e indirecto y sus consecuencias')).toMatchObject({ task: 'ANALYSIS', matter: 'laboral' }));
  it('fuera de alcance', () => expect(clasificarIntencion('Dame una receta de baleadas')).toMatchObject({ task: 'OUT_OF_SCOPE', requiresEvidence: false }));
});

describe('LegalModelRouter', () => {
  it('consulta exacta con evidencia verificada: sin modelo', () => {
    const r = enrutarModelo(base('¿Qué dice el artículo 173 del Código Procesal Penal?', { evidenceQuality: UMBRAL_EXACTO }));
    expect(r).toMatchObject({ role: 'NONE', abstain: false, estimatedCostUsd: 0 });
  });
  it('sin evidencia: abstención y NUNCA modelo', () => {
    for (const q of [0, 0.2]) {
      const r = enrutarModelo(base('¿Cuál es el plazo para apelar?', { evidenceQuality: q }));
      expect(r).toMatchObject({ role: 'NONE', abstain: true, modelId: null });
    }
    expect(enrutarModelo(base('¿Cuál es el plazo para apelar?', { evidenceCount: 0 })).abstain).toBe(true);
  });
  it('investigación simple: FAST sin razonamiento', () => {
    const r = enrutarModelo(base('¿Qué es la prenda sin desplazamiento?'));
    expect(r).toMatchObject({ role: 'FAST', modelId: MODEL_POLICY.fast.modelId, reasoningEffort: 'none', deepUnavailable: false });
  });
  it('análisis profundo: el modelo profundo NO está verificado → se degrada a FAST y se avisa', () => {
    const r = enrutarModelo(base('Compara el despido directo e indirecto y sus consecuencias', { depth: 'DEEP' }));
    expect(r).toMatchObject({ role: 'FAST', deepUnavailable: true, reasoningEffort: 'medium', stream: true });
    expect(r.reasons.join(' ')).toMatch(/no verificado/);
  });
  it('con un modelo profundo verificado en la política, sube a DEEP solo en planes que lo permiten', () => {
    const politica: ModelPolicy = { ...MODEL_POLICY, deep: { modelId: 'modelo-profundo-de-prueba', verified: true }, maxCostUsdPorConsulta: { EXPLORAR: 1, ACADEMICO: 1, PREMIUM: 1 } };
    const q = 'Compara el despido directo e indirecto y sus consecuencias';
    expect(enrutarModelo(base(q, { depth: 'DEEP', tier: 'PREMIUM' }), politica)).toMatchObject({ role: 'DEEP', modelId: 'modelo-profundo-de-prueba', reasoningEffort: 'high' });
    const exp = enrutarModelo(base(q, { depth: 'DEEP', tier: 'EXPLORAR' }), politica);
    expect(exp.role).toBe('FAST');
    expect(exp.reasons.join(' ')).toMatch(/sin modelo profundo/);
  });
  it('el techo de coste del plan manda: entrada enorme → abstención', () => {
    const estricta: ModelPolicy = { ...MODEL_POLICY, maxCostUsdPorConsulta: { EXPLORAR: 0.001, ACADEMICO: 0.001, PREMIUM: 0.001 } };
    expect(enrutarModelo(base('¿Qué es la hipoteca?', { estimatedInputTokens: 23_000, tier: 'EXPLORAR' }), estricta)).toMatchObject({ role: 'NONE', abstain: true });
    expect(enrutarModelo(base('¿Qué es la hipoteca?', { estimatedInputTokens: 25_000 })).abstain).toBe(true); // por encima del tope duro
  });
  it('fuera de alcance: no llama a modelo', () => {
    expect(enrutarModelo(base('Dame una receta de baleadas'))).toMatchObject({ role: 'NONE', abstain: true });
  });
  it('es determinista (misma entrada, misma salida)', () => {
    const e = base('¿Qué es la prenda sin desplazamiento?');
    expect(enrutarModelo(e)).toEqual(enrutarModelo(e));
  });
});

describe('proveedor falso', () => {
  it('no abre red y devuelve la respuesta inyectada', async () => {
    const p = crearProveedorFalso(() => ({ ok: true }));
    const r = await p.generar({ modelId: 'x', instructions: '', input: 'abcd', maxOutputTokens: 10, reasoningEffort: 'none', outputSchema: {} });
    expect(r.rawOutput).toEqual({ ok: true });
    expect(p.disponible()).toBe(true);
  });
});

describe('aislamiento y deriva', () => {
  it('las tarifas de Legal OS coinciden con las del gateway verificado', async () => {
    const { SHADOW_MODEL_CONFIG } = await import('@/lib/ai-gateway/shadow/shadow-model-config');
    const { estimarCostoConservadorUsd } = await import('@/lib/ai-gateway/shadow/pricing');
    const { TARIFAS_FAST } = await import('@/lib/legal-os/policies/model-policy');
    const { estimarCostoUsd } = await import('@/lib/legal-os/router/model-router');
    const P = SHADOW_MODEL_CONFIG.pricing;
    expect(TARIFAS_FAST).toEqual({ inputUsdPerMillion: P.standard.inputUsdPerMillion, cacheWrite30mUsdPerMillion: P.standard.cacheWrite30mUsdPerMillion, outputUsdPerMillion: P.standard.outputUsdPerMillion, minCacheableTokens: P.minCacheableTokens, maxInputTokens: SHADOW_MODEL_CONFIG.maxInputTokens });
    expect(MODEL_POLICY.fast.modelId).toBe(SHADOW_MODEL_CONFIG.modelId);
    for (const [i, o] of [[100, 50], [1500, 400], [24_000, 800]]) expect(estimarCostoUsd(i, o)).toBeCloseTo(estimarCostoConservadorUsd(i, o), 12);
  });
});
