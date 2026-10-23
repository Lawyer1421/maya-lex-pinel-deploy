import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CAPACIDADES, MATRIZ, TIER_TECNICO, indefinidas, limite, puede, rolDeepPermitido } from '@/lib/legal-os/entitlements';
import { MODEL_POLICY } from '@/lib/legal-os/policies/model-policy';

describe('entitlements', () => {
  it('los límites diarios coinciden con los valores por defecto que ya define lib/rate-limit.ts', () => {
    const src = readFileSync(join(__dirname, '..', 'lib', 'rate-limit.ts'), 'utf8');
    expect(src).toMatch(/FREE_LIMIT_DEFAULT = 1;/);
    expect(src).toMatch(/ACADEMICO_TIER_DAILY_LIMIT, 20\)/);
    expect(src).toMatch(/PRO_TIER_DAILY_LIMIT, 1000\)/);
    expect([limite('EXPLORAR', 'daily_questions'), limite('ACADEMICO', 'daily_questions'), limite('PREMIUM', 'daily_questions')]).toEqual([1, 20, 1000]);
  });
  it('todo lo demás es INDEFINIDO (null) y fail-closed: no se inventa nada', () => {
    for (const t of ['EXPLORAR', 'ACADEMICO', 'PREMIUM'] as const) {
      for (const c of CAPACIDADES.filter((x) => x !== 'daily_questions')) {
        expect(limite(t, c), `${t}.${c}`).toBeNull();
        expect(puede(t, c)).toBe(false);
      }
      expect(puede(t, 'daily_questions')).toBe(true);
    }
    expect(indefinidas()).toHaveLength(3 * 7);
  });
  it('toda entrada definida cita su fuente; las indefinidas no', () => {
    for (const t of Object.values(MATRIZ)) for (const e of Object.values(t)) expect(e.valor === null).toBe(e.fuente === null);
  });
  it('mapeo a tiers técnicos sin tocar facturación', () => {
    expect(TIER_TECNICO).toEqual({ EXPLORAR: 'free', ACADEMICO: 'academico', PREMIUM: 'pro' });
  });
  it('DEEP coincide con la política de modelo propuesta', () => {
    for (const t of ['EXPLORAR', 'ACADEMICO', 'PREMIUM'] as const) expect(rolDeepPermitido(t)).toBe(MODEL_POLICY.deepPermitidoEn.includes(t));
  });
  it('solo importa tipos del propio Legal OS (sin gateway, facturación ni módulos de acceso)', () => {
    const f = readFileSync(join(__dirname, '..', 'lib', 'legal-os', 'entitlements', 'index.ts'), 'utf8');
    expect(f.split('\n').filter((l) => /^import /.test(l))).toEqual(["import type { SubscriptionTier } from '../types';"]);
  });
});
