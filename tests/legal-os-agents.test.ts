import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AGENT_IDS, CONTRATOS, contieneClaveDeValidez, orquestar, type AgentImplementations, type OrchestrationContext } from '@/lib/legal-os/agents';
import { NOMBRES_CATALOGO } from '@/lib/legal-os/tools/catalog';

const RAIZ = join(__dirname, '..');
const plan = { queryId: 'q1', sanitizedQuestion: 'pregunta de prueba' };
const ctxBase = (extra: Partial<OrchestrationContext> = {}): OrchestrationContext => ({ callTool: async () => ({ ok: true }), stepBudget: 20, timeoutMs: 200, ...extra });

const buenos = (): AgentImplementations => ({
  LEGAL_INTAKE: async () => ({ task: 'RESEARCH', matter: 'civil', risk: 'LOW', requiredEvidence: [] }),
  LEGAL_RESEARCH: async () => ({ evidenceIds: ['e1', 'e2'] }),
  EXACT_LAW: async () => ({ evidenceIds: ['e1'] }),
  CASELAW: async () => ({ evidenceIds: [] }),
  CONTRADICTION: async () => ({ findings: [] }),
  CITATION: async () => ({ validatedIds: ['e1', 'e2'], rejectedIds: [] }),
  LEGAL_DRAFTING: async (i) => ({ text: 'borrador', citedIds: [...i.validatedEvidenceIds] }),
  QUALITY: async () => ({ verdict: 'APPROVE', reasons: [] }),
});

describe('contratos', () => {
  it('ocho agentes, todos PROPOSE_ONLY, con herramientas que existen en el catálogo', () => {
    expect(AGENT_IDS).toHaveLength(8);
    for (const id of AGENT_IDS) {
      expect(CONTRATOS[id].authority).toBe('PROPOSE_ONLY');
      for (const t of CONTRATOS[id].allowedTools) expect(NOMBRES_CATALOGO, `${id}:${t}`).toContain(t);
    }
  });
  it('autoridad mínima: calidad sin herramientas; citas solo valida; redacción solo redacta', () => {
    expect(CONTRATOS.QUALITY.allowedTools).toEqual([]);
    expect(CONTRATOS.CITATION.allowedTools).toEqual(['validate_citation']);
    expect(CONTRATOS.LEGAL_DRAFTING.allowedTools).toEqual(['draft_from_evidence']);
  });
});

describe('supervisor', () => {
  it('camino feliz: ANSWER con solo evidencia validada y trazas en el orden esperado', async () => {
    const r = await orquestar(plan, buenos(), ctxBase());
    expect(r.decision).toBe('ANSWER');
    expect(r.validatedEvidenceIds).toEqual(['e1', 'e2']);
    expect(r.draft?.citedIds).toEqual(['e1', 'e2']);
    const orden = r.trace.map((t) => t.agent);
    expect(orden[0]).toBe('LEGAL_INTAKE');
    expect(orden.slice(-4)).toEqual(['CONTRADICTION', 'CITATION', 'LEGAL_DRAFTING', 'QUALITY']);
    expect(new Set(orden.slice(1, 4))).toEqual(new Set(['LEGAL_RESEARCH', 'EXACT_LAW', 'CASELAW']));
  });
  it('QUALITY puede vetar → ABSTAIN', async () => {
    const r = await orquestar(plan, { ...buenos(), QUALITY: async () => ({ verdict: 'VETO', reasons: ['cita débil'] }) }, ctxBase());
    expect(r).toMatchObject({ decision: 'ABSTAIN', draft: null });
    expect(r.reasons[0]).toMatch(/veto/);
  });
  it('un agente no puede fijar validez jurídica (en ningún nivel) → ABSTAIN con VIOLATION', async () => {
    for (const salida of [{ evidenceIds: ['e1'], vigente: true }, { evidenceIds: ['e1'], nota: { esVigente: true } }, { evidenceIds: [{ legalValidity: 'x' }] }]) {
      const r = await orquestar(plan, { ...buenos(), EXACT_LAW: async () => salida }, ctxBase());
      expect(r.decision).toBe('ABSTAIN');
      expect(r.trace.some((t) => t.status === 'VIOLATION')).toBe(true);
    }
    expect(contieneClaveDeValidez({ a: [{ b: { vigente: 1 } }] })).toBe('vigente');
    expect(contieneClaveDeValidez({ evidenceIds: ['x'] })).toBeNull();
  });
  it('la redacción recibe SOLO ids validados (no candidatos sin validar)', async () => {
    let visto: readonly string[] = [];
    const impl: AgentImplementations = { ...buenos(), CITATION: async () => ({ validatedIds: ['e1'], rejectedIds: ['e2'] }), LEGAL_DRAFTING: async (i) => { visto = i.validatedEvidenceIds; return { text: 't', citedIds: ['e1'] }; } };
    const r = await orquestar(plan, impl, ctxBase());
    expect(visto).toEqual(['e1']);
    expect(r.decision).toBe('ANSWER');
  });
  it('si el borrador cita un id no validado → ABSTAIN', async () => {
    const r = await orquestar(plan, { ...buenos(), CITATION: async () => ({ validatedIds: ['e1'], rejectedIds: ['e2'] }), LEGAL_DRAFTING: async () => ({ text: 't', citedIds: ['e2'] }) }, ctxBase());
    expect(r.decision).toBe('ABSTAIN');
  });
  it('si CITATION valida un id que nunca fue candidato → ABSTAIN', async () => {
    const r = await orquestar(plan, { ...buenos(), CITATION: async () => ({ validatedIds: ['inventado'], rejectedIds: [] }) }, ctxBase());
    expect(r.decision).toBe('ABSTAIN');
  });
  it('contradicción bloqueante excluye esa evidencia; si es toda, ABSTAIN', async () => {
    const parcial = await orquestar(plan, { ...buenos(), CONTRADICTION: async () => ({ findings: [{ evidenceId: 'e2', kind: 'DEROGATION', blocking: true }] }) }, ctxBase());
    expect(parcial.validatedEvidenceIds).toEqual(['e1']);
    const total = await orquestar(plan, { ...buenos(), CONTRADICTION: async () => ({ findings: [{ evidenceId: 'e1', kind: 'REFORM', blocking: true }, { evidenceId: 'e2', kind: 'CONFLICT', blocking: true }] }) }, ctxBase());
    expect(total.decision).toBe('ABSTAIN');
  });
  it('sin evidencia candidata o fuera de alcance → ABSTAIN sin llamar al resto', async () => {
    const sin = await orquestar(plan, { ...buenos(), LEGAL_RESEARCH: async () => ({ evidenceIds: [] }), EXACT_LAW: async () => ({ evidenceIds: [] }) }, ctxBase());
    expect(sin.decision).toBe('ABSTAIN');
    const fuera = await orquestar(plan, { ...buenos(), LEGAL_INTAKE: async () => ({ task: 'OUT_OF_SCOPE', matter: null, risk: 'LOW', requiredEvidence: [] }) }, ctxBase());
    expect(fuera.decision).toBe('ABSTAIN');
    expect(fuera.trace).toHaveLength(1);
  });
  it('allowlist por agente: una herramienta ajena se deniega y degrada a ABSTAIN', async () => {
    const llamadas: string[] = [];
    const impl: AgentImplementations = { ...buenos(), QUALITY: async (_i, t) => { await t.call('search_law', {}); return { verdict: 'APPROVE', reasons: [] }; } };
    const r = await orquestar(plan, impl, ctxBase({ callTool: async (n) => { llamadas.push(n); return {}; } }));
    expect(r.decision).toBe('ABSTAIN');
    expect(llamadas).toEqual([]);
    expect(r.trace.find((t) => t.agent === 'QUALITY')?.status).toBe('VIOLATION');
  });
  it('presupuesto de pasos: el excedente falla y se abstiene', async () => {
    const impl: AgentImplementations = { ...buenos(), EXACT_LAW: async (_i, t) => { await t.call('resolve_article', {}); await t.call('resolve_article', {}); return { evidenceIds: ['e1'] }; } };
    const r = await orquestar(plan, impl, ctxBase({ stepBudget: 1 }));
    expect(r.decision).toBe('ABSTAIN');
    expect(r.stepsUsed).toBe(1);
  });
  it('timeout y excepciones degradan a ABSTAIN y nunca lanzan', async () => {
    const lento = await orquestar(plan, { ...buenos(), CITATION: () => new Promise(() => {}) }, ctxBase({ timeoutMs: 20 }));
    expect(lento.decision).toBe('ABSTAIN');
    expect(lento.trace.find((t) => t.agent === 'CITATION')?.status).toBe('TIMEOUT');
    const roto = await orquestar(plan, { ...buenos(), LEGAL_INTAKE: async () => { throw new Error('boom'); } }, ctxBase());
    expect(roto.decision).toBe('ABSTAIN');
    const basura = await orquestar(plan, { ...buenos(), QUALITY: async () => ({ verdict: 'TAL_VEZ' }) }, ctxBase());
    expect(basura.decision).toBe('ABSTAIN');
  });
});

describe('aislamiento del módulo', () => {
  it('no importa el gateway ni abre red, ni lee entorno', () => {
    const dir = join(RAIZ, 'lib', 'legal-os', 'agents');
    const re = new RegExp([String.raw`\bfetch\s*\(`, 'XMLHttpRequest', String.raw`process\.env`, 'node:http', 'node:fs', 'ai-' + 'gateway'].join('|'));
    for (const f of readdirSync(dir)) expect(readFileSync(join(dir, f), 'utf8'), f).not.toMatch(re);
  });
});
