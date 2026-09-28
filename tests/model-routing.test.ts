import { describe, expect, it } from 'vitest';
import { CLAUDE_CONFIG, CLAUDE_CONFIG_PENAL } from '@/lib/system-prompt';
import { VALID_MODEL_OVERRIDES } from '@/app/api/chat/route';

/**
 * Fase CI-2A (2026-09-28) — Opus retirado de MayaLex por decisión de
 * producto/costo del fundador (ver docs/cost/MAYALEX_AI_UNIT_ECONOMICS.md).
 * Estas pruebas prueban el comportamiento real, no solo la intención:
 * ningún modo configurado puede resolver a un modelo Opus, y ningún
 * override de cliente (por antiguo, inyectado, o simplemente inválido)
 * puede forzar uno tampoco.
 */

const TODOS_LOS_MODOS = { ...CLAUDE_CONFIG, ...CLAUDE_CONFIG_PENAL };

describe('CI-2A — ningún modo configurado resuelve a Opus', () => {
  it.each(Object.entries(TODOS_LOS_MODOS))('modo "%s" no usa un modelo Opus', (_nombre, config) => {
    expect(config.model.toLowerCase()).not.toContain('opus');
  });

  it('modos sala (Haiku) permanecen sin cambios', () => {
    expect(CLAUDE_CONFIG.sala_ia.model).toBe('claude-haiku-4-5');
    expect(CLAUDE_CONFIG_PENAL.sala_penal.model).toBe('claude-haiku-4-5');
  });

  it('analisis/documento resuelven a Sonnet 5', () => {
    expect(CLAUDE_CONFIG.analisis.model).toBe('claude-sonnet-5');
    expect(CLAUDE_CONFIG.documento.model).toBe('claude-sonnet-5');
  });

  it('analisis_penal/escritos_penales resuelven a Sonnet 5', () => {
    expect(CLAUDE_CONFIG_PENAL.analisis_penal.model).toBe('claude-sonnet-5');
    expect(CLAUDE_CONFIG_PENAL.escritos_penales.model).toBe('claude-sonnet-5');
  });

  it('thinking:{type:"adaptive"} se preserva en todos los modos que antes usaban Opus (compatible con Sonnet 5)', () => {
    expect(CLAUDE_CONFIG.analisis.thinking).toEqual({ type: 'adaptive', display: 'summarized' });
    expect(CLAUDE_CONFIG.documento.thinking).toEqual({ type: 'adaptive', display: 'summarized' });
    expect(CLAUDE_CONFIG_PENAL.analisis_penal.thinking).toEqual({ type: 'adaptive', display: 'summarized' });
    expect(CLAUDE_CONFIG_PENAL.escritos_penales.thinking).toEqual({ type: 'adaptive', display: 'summarized' });
  });

  it('max_tokens no se alteraron en esta fase (solo se documentan para optimización futura)', () => {
    expect(CLAUDE_CONFIG.sala_ia.max_tokens).toBe(800);
    expect(CLAUDE_CONFIG_PENAL.sala_penal.max_tokens).toBe(600);
    expect(CLAUDE_CONFIG.analisis.max_tokens).toBe(4000);
    expect(CLAUDE_CONFIG_PENAL.analisis_penal.max_tokens).toBe(6000);
    expect(CLAUDE_CONFIG.documento.max_tokens).toBe(8000);
    expect(CLAUDE_CONFIG_PENAL.escritos_penales.max_tokens).toBe(10000);
  });
});

describe('CI-2A — override de modelo por el cliente nunca puede forzar Opus', () => {
  it('claude-opus-4-8 NO está en la lista blanca de overrides', () => {
    expect(VALID_MODEL_OVERRIDES.has('claude-opus-4-8')).toBe(false);
  });

  it('ningún valor de la lista blanca es un modelo Opus', () => {
    for (const modelo of VALID_MODEL_OVERRIDES) {
      expect(modelo.toLowerCase()).not.toContain('opus');
    }
  });

  it('claude-sonnet-5 y claude-haiku-4-5 sí están permitidos', () => {
    expect(VALID_MODEL_OVERRIDES.has('claude-sonnet-5')).toBe(true);
    expect(VALID_MODEL_OVERRIDES.has('claude-haiku-4-5')).toBe(true);
  });

  it('un override inválido/Opus, replicando la resolución real de route.ts, cae de forma segura al modelo configurado', () => {
    // Misma expresión que app/api/chat/route.ts: safeModelOverride =
    // modelOverride && VALID_MODEL_OVERRIDES.has(modelOverride) ? modelOverride : null;
    // luego: model = safeModelOverride ?? config.model
    const resolver = (modelOverride: string | null | undefined, configModel: string) => {
      const safe = modelOverride && VALID_MODEL_OVERRIDES.has(modelOverride) ? modelOverride : null;
      return safe ?? configModel;
    };

    expect(resolver('claude-opus-4-8', CLAUDE_CONFIG.analisis.model)).toBe('claude-sonnet-5');
    expect(resolver('claude-opus-4-1-totally-fake', CLAUDE_CONFIG.analisis.model)).toBe('claude-sonnet-5');
    expect(resolver(null, CLAUDE_CONFIG.analisis.model)).toBe('claude-sonnet-5');
    expect(resolver('claude-haiku-4-5', CLAUDE_CONFIG.analisis.model)).toBe('claude-haiku-4-5');
  });
});
