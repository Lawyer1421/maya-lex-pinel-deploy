import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULTS_MODO,
  MODELO_HAIKU,
  MODELO_OPUS,
  MODELO_SONNET,
  leerHistoryTurns,
  resolverConfigModo,
  resolverModeloCliente,
  resolverModeloModo,
  soportaThinkingAdaptive,
} from '@/lib/model-config';
import { modelosVisibles } from '@/lib/model-config';

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('resolverModeloModo — defaults y env', () => {
  it('sin env: analisis/documento/penal = Sonnet; sala = Haiku', () => {
    delete process.env.MAYA_MODEL_ANALISIS;
    delete process.env.MAYA_MODEL_SALA_IA;
    expect(resolverModeloModo('analisis')).toBe(MODELO_SONNET);
    expect(resolverModeloModo('documento')).toBe(MODELO_SONNET);
    expect(resolverModeloModo('analisis_penal')).toBe(MODELO_SONNET);
    expect(resolverModeloModo('escritos_penales')).toBe(MODELO_SONNET);
    expect(resolverModeloModo('sala_ia')).toBe(MODELO_HAIKU);
    expect(resolverModeloModo('sala_penal')).toBe(MODELO_HAIKU);
  });

  it('env allowlisted no-Opus sustituye el default', () => {
    process.env.MAYA_MODEL_ANALISIS = MODELO_HAIKU;
    expect(resolverModeloModo('analisis')).toBe(MODELO_HAIKU);
  });

  it('env vacía o inválida cae al default (nunca a Opus)', () => {
    process.env.MAYA_MODEL_ANALISIS = '';
    expect(resolverModeloModo('analisis')).toBe(MODELO_SONNET);
    process.env.MAYA_MODEL_ANALISIS = 'claude-inventado-99';
    expect(resolverModeloModo('analisis')).toBe(MODELO_SONNET);
    expect(resolverModeloModo('analisis')).not.toBe(MODELO_OPUS);
  });

  it('Opus por env se ignora — cae al default del modo', () => {
    process.env.MAYA_MODEL_ANALISIS = MODELO_OPUS;
    expect(resolverModeloModo('analisis')).toBe(MODELO_SONNET);
    process.env.MAYA_MODEL_SALA_IA = MODELO_OPUS;
    expect(resolverModeloModo('sala_ia')).toBe(MODELO_HAIKU);
  });

  it('MAYA_MODEL_<MODO>=opus (cualquier forma) cae al default del modo', () => {
    process.env.MAYA_MODEL_ANALISIS = 'opus';
    expect(resolverModeloModo('analisis')).toBe(MODELO_SONNET);
    process.env.MAYA_MODEL_DOCUMENTO = 'claude-opus-5-5';
    expect(resolverModeloModo('documento')).toBe(MODELO_SONNET);
    process.env.MAYA_MODEL_ANALISIS_PENAL = MODELO_OPUS;
    expect(resolverModeloModo('analisis_penal')).toBe(MODELO_SONNET);
    process.env.MAYA_MODEL_ESCRITOS_PENALES = 'opus';
    expect(resolverModeloModo('escritos_penales')).toBe(MODELO_SONNET);
    process.env.MAYA_MODEL_SALA_IA = 'opus';
    expect(resolverModeloModo('sala_ia')).toBe(MODELO_HAIKU);
    process.env.MAYA_MODEL_SALA_PENAL = 'claude-opus-4-8';
    expect(resolverModeloModo('sala_penal')).toBe(MODELO_HAIKU);
  });

  it('max_tokens y thinking documentados por modo', () => {
    expect(resolverConfigModo('analisis').max_tokens).toBe(2500);
    expect(resolverConfigModo('analisis').thinking).toEqual({
      type: 'adaptive',
      display: 'summarized',
    });
    expect(resolverConfigModo('sala_ia').thinking).toBeUndefined();
    expect(DEFAULTS_MODO.documento.max_tokens).toBeLessThan(8000);
    expect(DEFAULTS_MODO.escritos_penales.max_tokens).toBeLessThan(10000);
  });

  it('env MAYA_MODEL_ANALISIS=Haiku quita thinking adaptive', () => {
    process.env.MAYA_MODEL_ANALISIS = MODELO_HAIKU;
    const cfg = resolverConfigModo('analisis');
    expect(cfg.model).toBe(MODELO_HAIKU);
    expect(cfg.thinking).toBeUndefined();
    expect(soportaThinkingAdaptive(MODELO_HAIKU)).toBe(false);
    expect(soportaThinkingAdaptive(MODELO_SONNET)).toBe(true);
  });
});

describe('resolverModeloCliente — Opus bloqueado para todos', () => {
  it('anónimo o free que pide Opus recibe el modelo del modo', () => {
    expect(resolverModeloCliente('analisis', MODELO_OPUS, null)).toBe(MODELO_SONNET);
    expect(resolverModeloCliente('analisis', MODELO_OPUS, 'free')).toBe(MODELO_SONNET);
    expect(resolverModeloCliente('analisis', MODELO_OPUS, 'academico')).toBe(MODELO_SONNET);
    expect(resolverModeloCliente('analisis', MODELO_OPUS, 'desconocido')).toBe(MODELO_SONNET);
  });

  it('Pro que pide Opus recibe Sonnet (modelo del modo analisis)', () => {
    expect(resolverModeloCliente('analisis', MODELO_OPUS, 'pro')).toBe(MODELO_SONNET);
    expect(resolverModeloCliente('documento', MODELO_OPUS, 'pro')).toBe(MODELO_SONNET);
    expect(resolverModeloCliente('analisis_penal', MODELO_OPUS, 'pro')).toBe(MODELO_SONNET);
    expect(resolverModeloCliente('escritos_penales', MODELO_OPUS, 'pro')).toBe(MODELO_SONNET);
  });

  it('free o Pro que pide Opus o Sonnet en sala recibe Haiku', () => {
    for (const tier of ['free', 'pro', null, 'academico'] as const) {
      expect(resolverModeloCliente('sala_ia', MODELO_OPUS, tier)).toBe(MODELO_HAIKU);
      expect(resolverModeloCliente('sala_ia', MODELO_SONNET, tier)).toBe(MODELO_HAIKU);
      expect(resolverModeloCliente('sala_penal', MODELO_OPUS, tier)).toBe(MODELO_HAIKU);
      expect(resolverModeloCliente('sala_penal', MODELO_SONNET, tier)).toBe(MODELO_HAIKU);
    }
  });

  it('sin override, usa el default del modo', () => {
    expect(resolverModeloCliente('sala_ia', null, 'free')).toBe(MODELO_HAIKU);
    expect(resolverModeloCliente('analisis', undefined, 'free')).toBe(MODELO_SONNET);
  });
});

describe('leerHistoryTurns', () => {
  it('default 10; inválido o <1 cae a 10', () => {
    expect(leerHistoryTurns(undefined)).toBe(10);
    expect(leerHistoryTurns('')).toBe(10);
    expect(leerHistoryTurns('abc')).toBe(10);
    expect(leerHistoryTurns('0')).toBe(10);
    expect(leerHistoryTurns('7')).toBe(7);
  });
});

describe('modelosVisibles — UI', () => {
  it('Opus no visible para nadie, Pro incluido', () => {
    const ids = (tier?: string) => modelosVisibles(tier).map((m) => String(m.id));
    expect(ids(undefined)).not.toContain(MODELO_OPUS);
    expect(ids('free')).not.toContain(MODELO_OPUS);
    expect(ids('pro')).not.toContain(MODELO_OPUS);
  });
});
