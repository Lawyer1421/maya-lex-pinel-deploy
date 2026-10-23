/**
 * lib/legal-os/agents/types.ts
 * Contratos de los agentes legales. Autoridad: SOLO PROPONEN. Ningún agente decide la validez jurídica: la fija el corpus + el motor de versiones.
 */
import { z } from 'zod';

export const AGENT_IDS = ['LEGAL_INTAKE', 'LEGAL_RESEARCH', 'EXACT_LAW', 'CASELAW', 'CONTRADICTION', 'CITATION', 'LEGAL_DRAFTING', 'QUALITY'] as const;
export type AgentId = (typeof AGENT_IDS)[number];

export interface AgentContract {
  id: AgentId;
  authority: 'PROPOSE_ONLY';
  /** Herramientas del bus (nombres del catálogo) que este agente puede invocar. Todo lo demás se deniega. */
  allowedTools: readonly string[];
  timeoutMs: number;
}

const ids = z.array(z.string().min(1));

// Salidas: `.strict()` y sin ningún campo de vigencia/validez.
export const IntakeOutput = z
  .object({
    task: z.enum(['EXACT_LOOKUP', 'RESEARCH', 'ANALYSIS', 'DRAFTING', 'DOCUMENT_REVIEW', 'OUT_OF_SCOPE']),
    matter: z.string().nullable(),
    risk: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    requiredEvidence: z.array(z.string()).optional(),
  })
  .strict();
export type IntakeOutput = z.infer<typeof IntakeOutput>;

export const EvidenceOutput = z.object({ evidenceIds: ids }).strict();
export type EvidenceOutput = z.infer<typeof EvidenceOutput>;

export const ContradictionOutput = z
  .object({
    findings: z
      .array(
        z
          .object({
            evidenceId: z.string(),
            kind: z.enum(['REFORM', 'DEROGATION', 'CONFLICT', 'CONSTITUTIONAL_DECISION', 'LATER_JURISPRUDENCE']),
            blocking: z.boolean(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();
export type ContradictionOutput = z.infer<typeof ContradictionOutput>;

export const CitationOutput = z.object({ validatedIds: ids, rejectedIds: ids.optional() }).strict();
export type CitationOutput = z.infer<typeof CitationOutput>;

export const DraftingOutput = z.object({ text: z.string().min(1), citedIds: ids }).strict();
export type DraftingOutput = z.infer<typeof DraftingOutput>;

export const QualityOutput = z.object({ verdict: z.enum(['APPROVE', 'VETO']), reasons: z.array(z.string()).optional() }).strict();
export type QualityOutput = z.infer<typeof QualityOutput>;

/** Entradas. El agente de redacción recibe ÚNICAMENTE ids de evidencia validada, nunca candidatos sin validar. */
export interface IntakeInput {
  sanitizedQuestion: string;
}
export interface ResearchInput {
  sanitizedQuestion: string;
  intake: IntakeOutput;
}
export interface ContradictionInput {
  candidateIds: string[];
}
export interface CitationInput {
  candidateIds: string[];
  blockingContradictions: string[];
}
export interface DraftingInput {
  validatedEvidenceIds: readonly string[];
  task: IntakeOutput['task'];
}
export interface QualityInput {
  draft: DraftingOutput;
  validatedEvidenceIds: readonly string[];
  intake: IntakeOutput;
}

export interface ToolAccess {
  /** Invoca una herramienta del bus. Lanza si no está en la lista del agente o se agotó el presupuesto de pasos. */
  call(name: string, input: unknown): Promise<unknown>;
}

export interface AgentImplementations {
  LEGAL_INTAKE: (i: IntakeInput, t: ToolAccess) => Promise<unknown>;
  LEGAL_RESEARCH: (i: ResearchInput, t: ToolAccess) => Promise<unknown>;
  EXACT_LAW: (i: ResearchInput, t: ToolAccess) => Promise<unknown>;
  CASELAW: (i: ResearchInput, t: ToolAccess) => Promise<unknown>;
  CONTRADICTION: (i: ContradictionInput, t: ToolAccess) => Promise<unknown>;
  CITATION: (i: CitationInput, t: ToolAccess) => Promise<unknown>;
  LEGAL_DRAFTING: (i: DraftingInput, t: ToolAccess) => Promise<unknown>;
  QUALITY: (i: QualityInput, t: ToolAccess) => Promise<unknown>;
}

export interface OrchestrationContext {
  /** Invocador de herramientas ya autorizado (p. ej. el ToolBus). Las listas por agente se aplican ANTES de llamarlo. */
  callTool: (name: string, input: unknown) => Promise<unknown>;
  /** Máximo de invocaciones de herramientas en toda la orquestación. */
  stepBudget: number;
  /** Reloj inyectable (ms). */
  now?: () => number;
  /** Sustituye el timeout por agente del contrato. */
  timeoutMs?: number;
}

export interface OrchestrationPlan {
  queryId: string;
  sanitizedQuestion: string;
}

export interface AgentTraceEntry {
  agent: AgentId;
  status: 'OK' | 'FAILED' | 'TIMEOUT' | 'VIOLATION';
  ms: number;
  detail?: string;
}

export interface OrchestrationResult {
  decision: 'ANSWER' | 'ABSTAIN';
  reasons: string[];
  draft: DraftingOutput | null;
  validatedEvidenceIds: string[];
  stepsUsed: number;
  trace: AgentTraceEntry[];
}
