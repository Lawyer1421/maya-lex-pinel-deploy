/**
 * lib/legal-os/tools/types.ts
 * Contratos del bus de herramientas de Legal OS. Es el sustrato común de un futuro servidor MCP y de una app de ChatGPT:
 * herramientas tipadas, con alcances, límites, auditoría y procedencia. Este módulo no abre red ni importa el gateway.
 */
import { z } from 'zod';

/** Toda salida de una herramienta cita su procedencia. `tier` 1–5 = nivel de fuente oficial; 'DERIVED' = cálculo local sin fuente propia. */
export const ProvenanceSchema = z
  .object({
    source: z.string().min(1),
    tier: z.union([z.number().int().min(1).max(5), z.literal('DERIVED')]),
    retrievedAt: z.string().datetime(),
    hash: z.string().min(8).optional(),
  })
  .strict();
export type Provenance = z.infer<typeof ProvenanceSchema>;

/** Construye un esquema de salida que EXIGE `provenance`. */
export function salidaConProcedencia<S extends z.ZodRawShape>(shape: S) {
  return z.object({ ...shape, provenance: ProvenanceSchema }).strict();
}

export type ToolKind = 'READ' | 'WRITE';

export type ToolErrorCode =
  | 'UNKNOWN_TOOL'
  | 'INVALID_INPUT'
  | 'FORBIDDEN_SCOPE'
  | 'APPROVAL_REQUIRED'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'HANDLER_ERROR'
  | 'INVALID_OUTPUT'
  | 'NOT_IMPLEMENTED';

export class ToolError extends Error {
  constructor(readonly code: ToolErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'ToolError';
  }
}

/** Aprobación humana explícita para herramientas de escritura/acción. */
export interface Approval {
  approver: string;
  /** Fecha ISO de la aprobación. */
  approvedAt: string;
}

export interface ToolContext {
  subject: string;
  scopes: readonly string[];
  tenant?: string;
  /** Reloj inyectable (ms desde epoch). */
  now: () => number;
  approval?: Approval;
}

export interface HandlerContext {
  ctx: ToolContext;
  signal: AbortSignal;
}

export interface ToolDefinition<I extends z.ZodTypeAny = z.ZodTypeAny, O extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  kind: ToolKind;
  inputSchema: I;
  /** Debe ser un objeto con `provenance` (ver `salidaConProcedencia`). */
  outputSchema: O;
  /** Alcances necesarios (todos). */
  scopes: readonly string[];
  timeoutMs: number;
  rateLimit: { max: number; windowMs: number };
  /** Obligatorio (true) en herramientas WRITE. */
  requiresApproval?: boolean;
  handler: (input: z.infer<I>, h: HandlerContext) => Promise<unknown>;
}

export type ToolResult =
  | { ok: true; data: unknown; auditId: string }
  | { ok: false; error: { code: ToolErrorCode; message: string }; auditId: string };

export interface AuditRecord {
  id: string;
  at: string;
  tool: string;
  kind: ToolKind | 'UNKNOWN';
  subject: string;
  tenant: string | null;
  /** SHA-256 de la entrada; nunca la entrada cruda. */
  inputHash: string;
  /** 'OK' o el código de error. */
  outcome: 'OK' | ToolErrorCode;
  durationMs: number;
  approver: string | null;
}

export interface AuditSink {
  append(record: AuditRecord): void;
}
