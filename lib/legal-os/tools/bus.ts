/**
 * lib/legal-os/tools/bus.ts
 * ToolBus: registro e invocación de herramientas con validación, alcances, aprobación, límite de tasa, timeout y auditoría.
 * `invoke` nunca lanza. La auditoría no se puede desactivar: el bus conserva siempre su propio registro y un sumidero externo
 * que falle no altera el resultado.
 */
import { createHash } from 'node:crypto';
import { ProvenanceSchema, ToolError, type AuditRecord, type AuditSink, type ToolContext, type ToolDefinition, type ToolErrorCode, type ToolResult } from './types';

function hashEntrada(x: unknown): string {
  let s: string;
  try {
    s = JSON.stringify(x) ?? 'undefined';
  } catch {
    s = String(x);
  }
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

/** El esquema de salida debe tener `provenance` y comportarse como ProvenanceSchema. */
function tieneProcedencia(def: ToolDefinition): boolean {
  const shape = (def.outputSchema as { shape?: Record<string, { safeParse: (v: unknown) => { success: boolean } }> }).shape;
  const p = shape?.provenance;
  if (!p) return false;
  const ejemplo = { source: 's', tier: 'DERIVED', retrievedAt: '2026-01-01T00:00:00.000Z' };
  return ProvenanceSchema.safeParse(ejemplo).success && p.safeParse(ejemplo).success && !p.safeParse({}).success;
}

export class ToolBus {
  private readonly tools = new Map<string, ToolDefinition>();
  private readonly llamadas = new Map<string, number[]>();
  private readonly registro: AuditRecord[] = [];
  private contador = 0;

  constructor(private readonly sink?: AuditSink) {}

  register(def: ToolDefinition): void {
    if (this.tools.has(def.name)) throw new Error(`herramienta duplicada: ${def.name}`);
    if (def.kind === 'WRITE' && def.requiresApproval !== true) throw new Error(`la herramienta WRITE ${def.name} debe declarar requiresApproval: true`);
    if (!tieneProcedencia(def)) throw new Error(`la herramienta ${def.name} debe exigir provenance en outputSchema`);
    if (!(def.timeoutMs > 0) || !(def.rateLimit.max > 0) || !(def.rateLimit.windowMs > 0)) throw new Error(`límites inválidos en ${def.name}`);
    this.tools.set(def.name, def);
  }

  list(): Array<Pick<ToolDefinition, 'name' | 'description' | 'kind' | 'scopes' | 'timeoutMs' | 'rateLimit' | 'requiresApproval'>> {
    return [...this.tools.values()].map(({ name, description, kind, scopes, timeoutMs, rateLimit, requiresApproval }) => ({ name, description, kind, scopes, timeoutMs, rateLimit, requiresApproval }));
  }

  /** Copia del registro de auditoría interno (siempre activo). */
  auditLog(): readonly AuditRecord[] {
    return this.registro.map((r) => ({ ...r }));
  }

  private auditar(base: Omit<AuditRecord, 'id' | 'at' | 'durationMs' | 'outcome'>, ctx: ToolContext, t0: number, outcome: AuditRecord['outcome']): string {
    const id = `audit-${++this.contador}`;
    const rec: AuditRecord = { ...base, outcome, id, at: new Date(ctx.now()).toISOString(), durationMs: Math.max(0, ctx.now() - t0) };
    this.registro.push(rec);
    try {
      this.sink?.append({ ...rec });
    } catch {
      /* un sumidero que falla no afecta ni apaga la auditoría interna */
    }
    return id;
  }

  async invoke(name: string, input: unknown, ctx: ToolContext): Promise<ToolResult> {
    const t0 = ctx.now();
    const def = this.tools.get(name);
    const base = { tool: name, kind: (def?.kind ?? 'UNKNOWN') as AuditRecord['kind'], subject: ctx.subject, tenant: ctx.tenant ?? null, inputHash: hashEntrada(input), approver: ctx.approval?.approver ?? null };
    const fallo = (code: ToolErrorCode, message: string): ToolResult => ({ ok: false, error: { code, message }, auditId: this.auditar(base, ctx, t0, code) });

    try {
      if (!def) return fallo('UNKNOWN_TOOL', `herramienta desconocida: ${name}`);

      const faltan = def.scopes.filter((s) => !ctx.scopes.includes(s));
      if (faltan.length) return fallo('FORBIDDEN_SCOPE', `faltan alcances: ${faltan.join(', ')}`);

      if (def.kind === 'WRITE' || def.requiresApproval) {
        const a = ctx.approval;
        if (!a || !a.approver.trim() || Number.isNaN(Date.parse(a.approvedAt))) return fallo('APPROVAL_REQUIRED', 'se requiere aprobación humana (aprobador y fecha)');
      }

      const clave = `${ctx.subject}\u0000${def.name}`;
      const ahora = ctx.now();
      const vigentes = (this.llamadas.get(clave) ?? []).filter((t) => ahora - t < def.rateLimit.windowMs);
      if (vigentes.length >= def.rateLimit.max) {
        this.llamadas.set(clave, vigentes);
        return fallo('RATE_LIMITED', 'límite de tasa excedido');
      }
      vigentes.push(ahora);
      this.llamadas.set(clave, vigentes);

      const parsed = def.inputSchema.safeParse(input);
      if (!parsed.success) return fallo('INVALID_INPUT', parsed.error.issues.map((i) => `${i.path.join('.') || '(raíz)'}: ${i.message}`).join('; '));

      const ac = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      let bruto: unknown;
      try {
        bruto = await Promise.race([
          def.handler(parsed.data, { ctx, signal: ac.signal }),
          new Promise<never>((_, rej) => {
            timer = setTimeout(() => {
              ac.abort();
              rej(new ToolError('TIMEOUT', `timeout de ${def.timeoutMs} ms`));
            }, def.timeoutMs);
          }),
        ]);
      } catch (e) {
        if (e instanceof ToolError) return fallo(e.code, e.message);
        return fallo('HANDLER_ERROR', 'error interno de la herramienta');
      } finally {
        if (timer) clearTimeout(timer);
      }

      const salida = def.outputSchema.safeParse(bruto);
      if (!salida.success) return fallo('INVALID_OUTPUT', 'la salida no cumple el esquema (incluida la procedencia)');
      return { ok: true, data: salida.data, auditId: this.auditar(base, ctx, t0, 'OK') };
    } catch {
      return fallo('HANDLER_ERROR', 'error interno del bus');
    }
  }
}
