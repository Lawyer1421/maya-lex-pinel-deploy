import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as aprendizaje from '@/lib/legal-os/learning';
import { avanzar, clasificarSenal, nuevoItem, proponerCasoEval, SIGNAL_KINDS, type Actor, type ItemAprendizaje } from '@/lib/legal-os/learning';

const RAIZ = join(__dirname, '..');
const base = { id: 's1', kind: 'ABSTENTION', at: '2026-10-23T12:00:00Z', queryHash: 'a1b2c3d4e5f60718', country: 'HN', matter: 'Civil', reasonCode: 'NO_VERIFIED_EVIDENCE' };
const humano: Actor = { kind: 'HUMAN', name: 'Revisor' };
const ci: Actor = { kind: 'CI', name: 'github-actions' };
const auto: Actor = { kind: 'AUTOMATION', name: 'bot' };

describe('señales', () => {
  it('clasifica de forma determinista las diez clases', () => {
    for (const kind of SIGNAL_KINDS) {
      const c = clasificarSenal({ ...base, kind, reasonCode: null, feedback: kind === 'USER_FEEDBACK' ? 'DOWN' : null, metrics: { latencyMs: 9000, costUsd: 0.05, confidence: 0.2, occurrences: 20 } });
      expect(['P0', 'P1', 'P2']).toContain(c.priority);
      expect(c.suggestedAction).toBeTruthy();
    }
    expect(clasificarSenal({ ...base, kind: 'CITATION_FAILURE' })).toMatchObject({ priority: 'P0', category: 'CITATION' });
    expect(clasificarSenal(base)).toMatchObject({ category: 'RETRIEVAL', priority: 'P1', suggestedAction: 'REVIEW_CORPUS_GAP' });
  });
  it('rechaza texto crudo: queryHash debe ser huella y no se admiten campos extra', () => {
    expect(() => clasificarSenal({ ...base, queryHash: '¿Qué dice el artículo 173?' })).toThrow();
    expect(() => clasificarSenal({ ...base, question: '¿Qué dice el artículo 173?' })).toThrow();
    expect(() => clasificarSenal({ ...base, reasonCode: 'texto libre con espacios' })).toThrow();
  });
  it('la propuesta de caso NUNCA trae pregunta ni respuesta esperada y queda pendiente del CLO', () => {
    const p = proponerCasoEval(base);
    expect(p).toMatchObject({ review_state: 'PENDING_CLO_REVIEW', question: null, expected: null, matter: 'Civil', signalIds: ['s1'] });
    expect(JSON.stringify(p)).not.toMatch(/ANSWER|ABSTAIN|art[ií]culo/i);
    expect(p.source_of_expectation).toBe('learning-loop:s1');
  });
});

describe('pipeline', () => {
  const hasta = (destino: ItemAprendizaje['state']): ItemAprendizaje => {
    let it = nuevoItem('i1', ['s1'], auto, '2026-10-23');
    const pasos: Array<[ItemAprendizaje['state'], Actor, object]> = [
      ['LOG', auto, {}], ['CLASSIFY', auto, {}], ['CREATE_EVAL_CASE', auto, { proposalId: 'PROP-1' }], ['PROPOSE_IMPROVEMENT', auto, {}],
      ['TEST', ci, { testResult: { suite: 'evals', passed: true } }], ['APPROVAL', humano, { approvalDate: '2026-10-24' }], ['DEPLOY', humano, {}],
    ];
    for (const [d, a, ev] of pasos) {
      if (it.state === destino) break;
      const r = avanzar(it, d, a, ev);
      if (!r.ok) throw new Error(r.error);
      it = r.item;
    }
    return it;
  };
  it('recorre los ocho estados con los actores correctos', () => {
    const f = hasta('DEPLOY');
    expect(f.state).toBe('DEPLOY');
    expect(f.approval).toEqual({ approver: 'Revisor', kind: 'HUMAN', date: '2026-10-24' });
    expect(f.history.map((h) => h.state)).toHaveLength(8);
  });
  it('solo avanza un paso', () => {
    expect(avanzar(nuevoItem('i', [], auto, 'x'), 'CLASSIFY', auto)).toMatchObject({ ok: false });
    expect(avanzar(hasta('CLASSIFY'), 'LOG', auto)).toMatchObject({ ok: false });
  });
  it('una automatización o el modelo NUNCA aprueban ni despliegan', () => {
    const t = hasta('TEST');
    for (const a of [auto, { kind: 'MODEL' as const, name: 'gpt' }]) expect(avanzar(t, 'APPROVAL', a, { approvalDate: '2026-10-24' })).toMatchObject({ ok: false });
    const ap = hasta('APPROVAL');
    for (const a of [auto, { kind: 'MODEL' as const, name: 'gpt' }]) expect(avanzar(ap, 'DEPLOY', a)).toMatchObject({ ok: false });
    expect(avanzar(ap, 'DEPLOY', ci)).toMatchObject({ ok: true });
  });
  it('APPROVAL exige fecha y pruebas aprobadas; TEST exige resultado aprobado', () => {
    expect(avanzar(hasta('TEST'), 'APPROVAL', humano, {})).toMatchObject({ ok: false });
    expect(avanzar(hasta('PROPOSE_IMPROVEMENT'), 'TEST', ci, { testResult: { suite: 'evals', passed: false } })).toMatchObject({ ok: false });
    expect(avanzar(hasta('PROPOSE_IMPROVEMENT'), 'TEST', ci, {})).toMatchObject({ ok: false });
  });
  it('el item es inmutable', () => {
    const it = hasta('LOG');
    expect(() => { (it as { state: string }).state = 'DEPLOY'; }).toThrow();
  });
});

describe('el módulo solo observa y propone', () => {
  it('no exporta ninguna función que aplique cambios y no toca fs, red, entorno ni el gateway', () => {
    expect(Object.keys(aprendizaje).sort()).toEqual(['ESTADOS_APRENDIZAJE', 'SIGNAL_KINDS', 'Signal', 'UMBRAL_CONFIANZA', 'UMBRAL_COSTO_USD', 'UMBRAL_FRECUENCIA', 'UMBRAL_LATENCIA_MS', 'avanzar', 'clasificarSenal', 'nuevoItem', 'proponerCasoEval']);
    const dir = join(RAIZ, 'lib', 'legal-os', 'learning');
    const re = new RegExp([String.raw`\bfetch\s*\(`, 'XMLHttpRequest', String.raw`process\.env`, 'node:http', 'node:fs', 'supabase', 'ai-' + 'gateway'].join('|'), 'i');
    for (const f of readdirSync(dir)) expect(readFileSync(join(dir, f), 'utf8'), f).not.toMatch(re);
  });
});
