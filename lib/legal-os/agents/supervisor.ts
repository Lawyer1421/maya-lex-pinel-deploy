/**
 * lib/legal-os/agents/supervisor.ts
 * Supervisor determinista. Orden: intake → (research ‖ exact ‖ caselaw) → contradiction → citation → drafting → quality.
 * Invariantes: (1) ningún agente fija la validez jurídica; (2) la redacción solo ve ids de evidencia validada;
 * (3) QUALITY puede vetar; (4) cualquier fallo, timeout, violación o presupuesto agotado degrada a ABSTAIN; nunca lanza.
 */
import type { ZodType } from 'zod';
import { CONTRATOS } from './contracts';
import {
  CitationOutput,
  ContradictionOutput,
  DraftingOutput,
  EvidenceOutput,
  IntakeOutput,
  QualityOutput,
  type AgentId,
  type AgentImplementations,
  type AgentTraceEntry,
  type OrchestrationContext,
  type OrchestrationPlan,
  type OrchestrationResult,
  type ToolAccess,
} from './types';

/** Claves que implicarían que un agente declara vigencia/validez. Se rechazan en CUALQUIER nivel de la salida. */
const CLAVES_VALIDEZ = /^(vigen\w*|esvigente|es_norma_vigente|valid|valido|isvalid|legalvalidity|validity|validez|derogad[oa]|abrogad[oa]|status_vigencia|binding|vinculante)$/i;

export function contieneClaveDeValidez(valor: unknown, profundidad = 0): string | null {
  if (profundidad > 8 || valor === null || typeof valor !== 'object') return null;
  if (Array.isArray(valor)) {
    for (const v of valor) {
      const r = contieneClaveDeValidez(v, profundidad + 1);
      if (r) return r;
    }
    return null;
  }
  for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
    if (CLAVES_VALIDEZ.test(k)) return k;
    const r = contieneClaveDeValidez(v, profundidad + 1);
    if (r) return r;
  }
  return null;
}

class Fallo extends Error {
  constructor(
    public readonly estado: AgentTraceEntry['status'],
    msg: string,
  ) {
    super(msg);
  }
}

export async function orquestar(plan: OrchestrationPlan, impl: AgentImplementations, ctx: OrchestrationContext): Promise<OrchestrationResult> {
  const now = ctx.now ?? Date.now;
  const trace: AgentTraceEntry[] = [];
  let pasos = 0;

  const accesoPara = (agente: AgentId): ToolAccess => ({
    async call(name, input) {
      if (!CONTRATOS[agente].allowedTools.includes(name)) throw new Fallo('VIOLATION', `herramienta ${name} no permitida para ${agente}`);
      if (pasos >= ctx.stepBudget) throw new Fallo('FAILED', 'presupuesto de pasos agotado');
      pasos++;
      return ctx.callTool(name, input);
    },
  });

  async function ejecutar<T>(agente: AgentId, schema: ZodType<T>, correr: (t: ToolAccess) => Promise<unknown>): Promise<T> {
    const t0 = now();
    const timeoutMs = ctx.timeoutMs ?? CONTRATOS[agente].timeoutMs;
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    try {
      const bruto = await Promise.race([
        correr(accesoPara(agente)),
        new Promise<never>((_, rej) => {
          temporizador = setTimeout(() => rej(new Fallo('TIMEOUT', `${agente} excedió ${timeoutMs} ms`)), timeoutMs);
        }),
      ]);
      const clave = contieneClaveDeValidez(bruto);
      if (clave) throw new Fallo('VIOLATION', `${agente} intentó fijar validez jurídica (campo ${clave})`);
      const parsed = schema.safeParse(bruto);
      if (!parsed.success) throw new Fallo('VIOLATION', `${agente} devolvió una salida fuera de contrato`);
      trace.push({ agent: agente, status: 'OK', ms: now() - t0 });
      return parsed.data;
    } catch (e) {
      const f = e instanceof Fallo ? e : new Fallo('FAILED', e instanceof Error ? e.message : 'error');
      trace.push({ agent: agente, status: f.estado, ms: now() - t0, detail: f.message });
      throw f;
    } finally {
      if (temporizador) clearTimeout(temporizador);
    }
  }

  const abstener = (razon: string): OrchestrationResult => ({ decision: 'ABSTAIN', reasons: [razon], draft: null, validatedEvidenceIds: [], stepsUsed: pasos, trace });

  try {
    const intake = await ejecutar('LEGAL_INTAKE', IntakeOutput, (t) => impl.LEGAL_INTAKE({ sanitizedQuestion: plan.sanitizedQuestion }, t));
    if (intake.task === 'OUT_OF_SCOPE') return abstener('fuera de alcance');

    const entrada = { sanitizedQuestion: plan.sanitizedQuestion, intake };
    const resultados = await Promise.allSettled([
      ejecutar('LEGAL_RESEARCH', EvidenceOutput, (t) => impl.LEGAL_RESEARCH(entrada, t)),
      ejecutar('EXACT_LAW', EvidenceOutput, (t) => impl.EXACT_LAW(entrada, t)),
      ejecutar('CASELAW', EvidenceOutput, (t) => impl.CASELAW(entrada, t)),
    ]);
    const fallido = resultados.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
    if (fallido) throw fallido.reason;
    const [investigacion, exacto, jurisprudencia] = resultados.map((r) => (r as PromiseFulfilledResult<EvidenceOutput>).value);
    const candidatos = [...new Set([...exacto.evidenceIds, ...investigacion.evidenceIds, ...jurisprudencia.evidenceIds])];
    if (candidatos.length === 0) return abstener('sin evidencia candidata');

    const contradiccion = await ejecutar('CONTRADICTION', ContradictionOutput, (t) => impl.CONTRADICTION({ candidateIds: candidatos }, t));
    const bloqueantes = (contradiccion.findings ?? []).filter((f) => f.blocking).map((f) => f.evidenceId);

    const citas = await ejecutar('CITATION', CitationOutput, (t) => impl.CITATION({ candidateIds: candidatos, blockingContradictions: bloqueantes }, t));
    if (citas.validatedIds.some((id) => !candidatos.includes(id))) {
      trace.push({ agent: 'CITATION', status: 'VIOLATION', ms: 0, detail: 'validó ids que no eran candidatos' });
      return abstener('CITATION validó ids que no eran candidatos');
    }
    const validados = citas.validatedIds.filter((id) => !bloqueantes.includes(id));
    if (validados.length === 0) return abstener(bloqueantes.length ? 'contradicción bloqueante sobre toda la evidencia' : 'ninguna evidencia superó la validación de citas');

    const borrador = await ejecutar('LEGAL_DRAFTING', DraftingOutput, (t) =>
      impl.LEGAL_DRAFTING({ validatedEvidenceIds: Object.freeze([...validados]), task: intake.task }, t),
    );
    if (borrador.citedIds.length === 0 || borrador.citedIds.some((id) => !validados.includes(id))) {
      trace.push({ agent: 'LEGAL_DRAFTING', status: 'VIOLATION', ms: 0, detail: 'cita vacía o ids no validados' });
      return abstener('el borrador cita evidencia no validada o no cita nada');
    }

    const calidad = await ejecutar('QUALITY', QualityOutput, (t) => impl.QUALITY({ draft: borrador, validatedEvidenceIds: validados, intake }, t));
    if (calidad.verdict === 'VETO') return abstener(`veto de calidad${calidad.reasons?.length ? `: ${calidad.reasons.join('; ')}` : ''}`);

    return { decision: 'ANSWER', reasons: [], draft: borrador, validatedEvidenceIds: validados, stepsUsed: pasos, trace };
  } catch (e) {
    return abstener(e instanceof Fallo ? e.message : 'fallo inesperado');
  }
}
