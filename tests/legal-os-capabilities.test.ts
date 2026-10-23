import { describe, expect, it } from 'vitest';
import {
  CAPABILITIES, CONFIG_PROVEEDOR_OPENAI, REGISTRO_VERIFICADO, assertVerified, configDesdePolitica, esModeloVerificado, resolverCapacidad, type ConfigProveedor,
} from '@/lib/legal-os/providers/capabilities';
import { MODEL_POLICY, type ModelPolicy } from '@/lib/legal-os/policies/model-policy';
import { enrutarModelo } from '@/lib/legal-os/router/model-router';
import { clasificarIntencion } from '@/lib/legal-os/router/intent';
import type { RoutingInput } from '@/lib/legal-os/types';

const sinModelo = { modelId: null, verified: false, verifiedOn: null, source: null };
const base = (extra: Partial<RoutingInput> = {}): RoutingInput => ({
  intent: clasificarIntencion('Compara el despido directo e indirecto y sus consecuencias'), tier: 'PREMIUM', depth: 'DEEP', evidenceQuality: 0.8, retrievalConfidence: 0.8,
  evidenceCount: 3, estimatedInputTokens: 2_000, latencyTargetMs: 2_000, ...extra,
});

describe('capacidades: solo hay un modelo verificado', () => {
  it('las cinco capacidades existen y únicamente FAST tiene modelo verificado (gpt-6-luna)', () => {
    expect([...CAPABILITIES]).toEqual(['FAST', 'STANDARD', 'DEEP_REASONING', 'DOCUMENT', 'CLASSIFIER']);
    for (const c of CAPABILITIES) {
      const m = CONFIG_PROVEEDOR_OPENAI[c];
      if (c === 'FAST') expect(m).toMatchObject({ modelId: 'gpt-6-luna', verified: true, verifiedOn: '2026-10-23' });
      else expect(m).toEqual(sinModelo);
    }
    expect([...REGISTRO_VERIFICADO]).toEqual(['gpt-6-luna']);
  });
  it('degradación segura: DEEP_REASONING/STANDARD/DOCUMENT → FAST con degradedFrom; CLASSIFIER → FAST', () => {
    expect(resolverCapacidad('FAST')).toEqual({ modelId: 'gpt-6-luna', capabilityUsed: 'FAST' });
    for (const c of ['STANDARD', 'DEEP_REASONING', 'DOCUMENT', 'CLASSIFIER'] as const) {
      expect(resolverCapacidad(c)).toEqual({ modelId: 'gpt-6-luna', capabilityUsed: 'FAST', degradedFrom: c });
    }
  });
  it('si ni FAST está verificada, no hay modelo', () => {
    const vacia: ConfigProveedor = { FAST: sinModelo, STANDARD: sinModelo, DEEP_REASONING: sinModelo, DOCUMENT: sinModelo, CLASSIFIER: sinModelo };
    for (const c of CAPABILITIES) expect(resolverCapacidad(c, vacia)).toEqual({ modelId: null, capabilityUsed: null });
  });
  it('con STANDARD verificado, DEEP_REASONING baja a STANDARD (no a FAST)', () => {
    const registro = new Set(['gpt-6-luna', 'modelo-estandar-de-prueba']);
    const cfg: ConfigProveedor = { ...CONFIG_PROVEEDOR_OPENAI, STANDARD: { modelId: 'modelo-estandar-de-prueba', verified: true, verifiedOn: '2026-01-01', source: 'prueba' } };
    expect(resolverCapacidad('DEEP_REASONING', cfg, registro)).toEqual({ modelId: 'modelo-estandar-de-prueba', capabilityUsed: 'STANDARD', degradedFrom: 'DEEP_REASONING' });
  });
});

describe('capacidades: imposible obtener un ID que no esté en el registro verificado', () => {
  it('una configuración que declara «verified» un ID ajeno al registro NO lo entrega (se degrada)', () => {
    const inyectada: ConfigProveedor = { ...CONFIG_PROVEEDOR_OPENAI, DEEP_REASONING: { modelId: 'modelo-inventado-9', verified: true, verifiedOn: '2026-10-23', source: 'x' } };
    expect(resolverCapacidad('DEEP_REASONING', inyectada)).toEqual({ modelId: 'gpt-6-luna', capabilityUsed: 'FAST', degradedFrom: 'DEEP_REASONING' });
    const todaInyectada: ConfigProveedor = { FAST: { modelId: 'otro', verified: true, verifiedOn: null, source: null }, STANDARD: sinModelo, DEEP_REASONING: sinModelo, DOCUMENT: sinModelo, CLASSIFIER: sinModelo };
    expect(resolverCapacidad('FAST', todaInyectada).modelId).toBeNull();
  });
  it('cadenas arbitrarias (inyección, vacías, no string) no son verificadas y assertVerified lanza', () => {
    for (const x of ['', 'gpt-6-luna ', 'GPT-6-LUNA', 'gpt-6-luna; drop', '__proto__', 'constructor', 'gpt-6', null, undefined, 42, {}, ['gpt-6-luna']]) {
      expect(esModeloVerificado(x), String(x)).toBe(false);
      expect(() => assertVerified(x), String(x)).toThrow(/modelo no verificado/);
    }
    expect(() => assertVerified('gpt-6-luna')).not.toThrow();
  });
  it('el registro verificado global no se puede ampliar desde fuera (congelado)', () => {
    expect(() => (REGISTRO_VERIFICADO as Set<string>).add('otro')).toThrow();
    expect(REGISTRO_VERIFICADO.has('otro')).toBe(false);
  });
  it('el MODEL_POLICY por defecto solo contiene IDs del registro verificado', () => {
    assertVerified(MODEL_POLICY.fast.modelId);
    expect(MODEL_POLICY.deep).toEqual({ modelId: null, verified: false });
  });
});

describe('el enrutador usa capacidades', () => {
  it('DEEP sin modelo verificado → FAST + deepUnavailable + aviso (comportamiento previo)', () => {
    const r = enrutarModelo(base());
    expect(r).toMatchObject({ role: 'FAST', modelId: 'gpt-6-luna', deepUnavailable: true, reasoningEffort: 'medium' });
    expect(r.reasons.join(' ')).toMatch(/no verificado/);
  });
  it('si la política no tiene ningún modelo verificado, el enrutador se abstiene y no entrega ID', () => {
    const sin: ModelPolicy = { ...MODEL_POLICY, fast: { modelId: 'gpt-6-luna', verified: false }, deep: { modelId: null, verified: false } };
    expect(enrutarModelo(base({ depth: 'STANDARD' }), sin)).toMatchObject({ role: 'NONE', abstain: true, modelId: null });
  });
  it('un modelo profundo marcado verificado por la política se usa en planes permitidos; configDesdePolitica lo refleja', () => {
    const p: ModelPolicy = { ...MODEL_POLICY, deep: { modelId: 'profundo-de-prueba', verified: true }, maxCostUsdPorConsulta: { EXPLORAR: 1, ACADEMICO: 1, PREMIUM: 1 } };
    expect(configDesdePolitica(p).config.DEEP_REASONING.modelId).toBe('profundo-de-prueba');
    expect(enrutarModelo(base(), p)).toMatchObject({ role: 'DEEP', modelId: 'profundo-de-prueba', deepUnavailable: false });
  });
  it('umbralEvidencia de la skill sube el mínimo: evidencia 0.5 pasa con el global (0.4) pero no con 0.6', () => {
    const q = base({ depth: 'STANDARD', intent: clasificarIntencion('¿Qué es la hipoteca?'), evidenceQuality: 0.5 });
    expect(enrutarModelo(q).abstain).toBe(false);
    expect(enrutarModelo({ ...q, umbralEvidencia: 0.6 }).abstain).toBe(true);
    expect(enrutarModelo({ ...q, evidenceQuality: 0.3, umbralEvidencia: 0.2 }).abstain).toBe(false);
  });
});
