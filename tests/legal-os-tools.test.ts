import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { CATALOGO, NOMBRES_CATALOGO, SCOPE_DRAFT, SCOPE_LEGAL_READ, ToolBus, ToolError, registrarCatalogo, salidaConProcedencia, type AuditRecord, type ToolContext, type ToolDefinition } from '@/lib/legal-os/tools';

const T0 = Date.parse('2026-10-23T12:00:00Z');
function ctx(extra: Partial<ToolContext> = {}, reloj = { t: T0 }): ToolContext & { reloj: { t: number } } {
  return { subject: 'user-1', scopes: [SCOPE_LEGAL_READ], now: () => reloj.t, reloj, ...extra };
}
const prov = (c: ToolContext) => ({ source: 'test', tier: 1 as const, retrievedAt: new Date(c.now()).toISOString() });

const eco = (over: Partial<ToolDefinition> = {}): ToolDefinition => ({
  name: 'eco', description: 'eco', kind: 'READ', inputSchema: z.object({ x: z.string() }).strict(), outputSchema: salidaConProcedencia({ y: z.string() }),
  scopes: [SCOPE_LEGAL_READ], timeoutMs: 200, rateLimit: { max: 3, windowMs: 1_000 },
  handler: async (i: { x: string }, { ctx: c }) => ({ y: i.x, provenance: prov(c) }), ...over,
});

describe('registro', () => {
  it('rechaza duplicados, WRITE sin requiresApproval, salida sin provenance y límites inválidos', () => {
    const bus = new ToolBus();
    bus.register(eco());
    expect(() => bus.register(eco())).toThrow(/duplicada/);
    expect(() => bus.register(eco({ name: 'w', kind: 'WRITE' }))).toThrow(/requiresApproval/);
    expect(() => bus.register(eco({ name: 'sinprov', outputSchema: z.object({ y: z.string() }) }))).toThrow(/provenance/);
    expect(() => bus.register(eco({ name: 'provfalsa', outputSchema: z.object({ y: z.string(), provenance: z.any() }) }))).toThrow(/provenance/);
    expect(() => bus.register(eco({ name: 'lim', timeoutMs: 0 }))).toThrow(/límites/);
  });
  it('el catálogo registra las 15 herramientas, todas READ, con provenance y alcances', () => {
    const bus = new ToolBus();
    registrarCatalogo(bus);
    expect(NOMBRES_CATALOGO).toEqual(['search_law', 'resolve_article', 'get_law_version', 'search_reforms', 'search_gaceta', 'search_jurisprudence', 'get_case', 'validate_citation', 'build_timeline', 'compare_versions', 'search_treaties', 'search_regulations', 'legal_skill', 'legal_definition', 'draft_from_evidence']);
    expect(bus.list()).toHaveLength(15);
    for (const t of CATALOGO) {
      expect(t.kind).toBe('READ');
      expect(t.scopes.length).toBeGreaterThan(0);
      expect(t.timeoutMs).toBeGreaterThan(0);
      expect(Object.keys((t.outputSchema as z.ZodObject<z.ZodRawShape>).shape)).toContain('provenance');
    }
    expect(CATALOGO.find((t) => t.name === 'draft_from_evidence')!.scopes).toContain(SCOPE_DRAFT);
  });
});

describe('invoke', () => {
  it('camino feliz: valida entrada y salida y audita con la entrada hasheada (no cruda)', async () => {
    const bus = new ToolBus();
    bus.register(eco());
    const r = await bus.invoke('eco', { x: 'dato-secreto-del-cliente' }, ctx({ tenant: 't1' }));
    expect(r).toMatchObject({ ok: true, data: { y: 'dato-secreto-del-cliente' } });
    const [a] = bus.auditLog();
    expect(a).toMatchObject({ tool: 'eco', kind: 'READ', subject: 'user-1', tenant: 't1', outcome: 'OK' });
    expect(a.inputHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(a)).not.toContain('dato-secreto-del-cliente');
  });
  it('herramienta desconocida, entrada inválida y alcance faltante: error tipado y auditado, nunca lanza', async () => {
    const bus = new ToolBus();
    bus.register(eco());
    expect(await bus.invoke('nope', {}, ctx())).toMatchObject({ ok: false, error: { code: 'UNKNOWN_TOOL' } });
    expect(await bus.invoke('eco', { x: 1 }, ctx())).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(await bus.invoke('eco', { x: 'a', extra: 1 }, ctx())).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    expect(await bus.invoke('eco', { x: 'a' }, ctx({ scopes: [] }))).toMatchObject({ ok: false, error: { code: 'FORBIDDEN_SCOPE' } });
    expect(bus.auditLog().map((r) => r.outcome)).toEqual(['UNKNOWN_TOOL', 'INVALID_INPUT', 'INVALID_INPUT', 'FORBIDDEN_SCOPE']);
  });
  it('límite de tasa por sujeto+herramienta con reloj inyectable; la ventana se libera', async () => {
    const bus = new ToolBus();
    bus.register(eco());
    const c = ctx();
    for (let i = 0; i < 3; i++) expect((await bus.invoke('eco', { x: 'a' }, c)).ok).toBe(true);
    expect(await bus.invoke('eco', { x: 'a' }, c)).toMatchObject({ ok: false, error: { code: 'RATE_LIMITED' } });
    expect((await bus.invoke('eco', { x: 'a' }, ctx({ subject: 'user-2' }))).ok).toBe(true);
    c.reloj.t += 1_001;
    expect((await bus.invoke('eco', { x: 'a' }, c)).ok).toBe(true);
  });
  it('timeout: aborta la señal y devuelve TIMEOUT', async () => {
    const bus = new ToolBus();
    let abortada = false;
    bus.register(eco({ timeoutMs: 20, handler: (_i, { signal }) => new Promise(() => { signal.addEventListener('abort', () => { abortada = true; }); }) }));
    expect(await bus.invoke('eco', { x: 'a' }, ctx())).toMatchObject({ ok: false, error: { code: 'TIMEOUT' } });
    expect(abortada).toBe(true);
  });
  it('salida inválida (sin provenance) → INVALID_OUTPUT; excepción del handler → HANDLER_ERROR sin filtrar detalles', async () => {
    const bus = new ToolBus();
    bus.register(eco({ name: 'mala', handler: async () => ({ y: 'sin procedencia' }) }));
    bus.register(eco({ name: 'rota', handler: async () => { throw new Error('secreto interno'); } }));
    expect(await bus.invoke('mala', { x: 'a' }, ctx())).toMatchObject({ ok: false, error: { code: 'INVALID_OUTPUT' } });
    const r = await bus.invoke('rota', { x: 'a' }, ctx());
    expect(r).toMatchObject({ ok: false, error: { code: 'HANDLER_ERROR' } });
    expect(JSON.stringify(r)).not.toContain('secreto interno');
  });
  it('un ToolError del handler conserva su código', async () => {
    const bus = new ToolBus();
    bus.register(eco({ handler: async () => { throw new ToolError('NOT_IMPLEMENTED'); } }));
    expect(await bus.invoke('eco', { x: 'a' }, ctx())).toMatchObject({ ok: false, error: { code: 'NOT_IMPLEMENTED' } });
  });
  it('WRITE exige aprobación humana (aprobador y fecha válidos)', async () => {
    const bus = new ToolBus();
    let ejecutada = 0;
    bus.register(eco({ name: 'accion', kind: 'WRITE', requiresApproval: true, handler: async (_i, { ctx: c }) => { ejecutada++; return { y: 'ok', provenance: prov(c) }; } }));
    expect(await bus.invoke('accion', { x: 'a' }, ctx())).toMatchObject({ ok: false, error: { code: 'APPROVAL_REQUIRED' } });
    expect(await bus.invoke('accion', { x: 'a' }, ctx({ approval: { approver: ' ', approvedAt: '2026-10-23' } }))).toMatchObject({ ok: false, error: { code: 'APPROVAL_REQUIRED' } });
    expect(await bus.invoke('accion', { x: 'a' }, ctx({ approval: { approver: 'Fredy', approvedAt: 'no-es-fecha' } }))).toMatchObject({ ok: false, error: { code: 'APPROVAL_REQUIRED' } });
    expect(ejecutada).toBe(0);
    const ok = await bus.invoke('accion', { x: 'a' }, ctx({ approval: { approver: 'Fredy', approvedAt: '2026-10-23T12:00:00Z' } }));
    expect(ok.ok).toBe(true);
    expect(ejecutada).toBe(1);
    expect(bus.auditLog().at(-1)).toMatchObject({ kind: 'WRITE', approver: 'Fredy', outcome: 'OK' });
  });
  it('la auditoría no se puede apagar: un sumidero que falla no altera el resultado ni el registro interno', async () => {
    const copias: AuditRecord[] = [];
    const bus = new ToolBus({ append: (r) => { copias.push(r); throw new Error('sumidero caído'); } });
    bus.register(eco());
    expect((await bus.invoke('eco', { x: 'a' }, ctx())).ok).toBe(true);
    expect(bus.auditLog()).toHaveLength(1);
    expect(copias).toHaveLength(1);
    const copia = bus.auditLog() as AuditRecord[];
    copia[0].outcome = 'RATE_LIMITED';
    expect(bus.auditLog()[0].outcome).toBe('OK');
  });
  it('toda llamada deja exactamente un registro (permitida o denegada)', async () => {
    const bus = new ToolBus();
    bus.register(eco());
    const c = ctx();
    for (let i = 0; i < 5; i++) await bus.invoke('eco', { x: 'a' }, c);
    await bus.invoke('eco', 'no-objeto', c);
    expect(bus.auditLog()).toHaveLength(6);
    expect(new Set(bus.auditLog().map((r) => r.id)).size).toBe(6);
  });
  it('una entrada con referencia circular no hace lanzar al bus', async () => {
    const bus = new ToolBus();
    bus.register(eco());
    const circ: Record<string, unknown> = {};
    circ.self = circ;
    expect(await bus.invoke('eco', circ, ctx())).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
  });
});

describe('catálogo cableado', () => {
  const bus = new ToolBus();
  registrarCatalogo(bus);
  it('resolve_article usa el Exact Resolver y avisa que no verifica vigencia', async () => {
    const r = await bus.invoke('resolve_article', { text: '¿Qué dice el artículo 173 del Código Procesal Penal?' }, ctx());
    expect(r).toMatchObject({ ok: true, data: { resolved: true, articleNumber: '173', note: expect.stringMatching(/no verifica/), provenance: { tier: 'DERIVED' } } });
    const sin = await bus.invoke('resolve_article', { text: 'hola' }, ctx());
    expect(sin).toMatchObject({ ok: true, data: { resolved: false, articleNumber: null } });
  });
  it('validate_citation compara sin IA: verificada, texto distinto y no encontrada', async () => {
    const texto = 'Los notarios son depositarios de la fe pública.';
    expect(await bus.invoke('validate_citation', { citation: 'depositarios de la fe pública', text: texto }, ctx())).toMatchObject({ ok: true, data: { estado: 'verificada' } });
    expect(await bus.invoke('validate_citation', { citation: 'depositarios de la fe privada', text: texto }, ctx())).toMatchObject({ ok: true, data: { estado: 'texto_distinto' } });
    expect(await bus.invoke('validate_citation', { citation: 'x', text: null }, ctx())).toMatchObject({ ok: true, data: { estado: 'no_encontrada' } });
  });
  it('las demás herramientas responden NOT_IMPLEMENTED (no inventan resultados) y valoran alcances', async () => {
    const stubs = NOMBRES_CATALOGO.filter((n) => !['resolve_article', 'validate_citation'].includes(n));
    expect(stubs).toHaveLength(13);
    const entradas: Record<string, unknown> = {
      get_law_version: { instrumentId: 'HN_CODIGO_CIVIL', article: '1', asOf: '2026-10-23' },
      get_case: { caseId: 'x' }, build_timeline: { instrumentId: 'x' }, compare_versions: { instrumentId: 'x', article: '1', fromDate: '2020-01-01', toDate: '2026-01-01' },
      legal_skill: { skillId: 'HN.CIVIL.CONTRACTS.SALE' }, legal_definition: { term: 'prenda' }, draft_from_evidence: { instruction: 'redacta', evidenceIds: ['e1'] },
    };
    for (const n of stubs) {
      const input = entradas[n] ?? { query: 'prenda' };
      const c = ctx({ scopes: [SCOPE_LEGAL_READ, SCOPE_DRAFT] });
      expect(await bus.invoke(n, input, c), n).toMatchObject({ ok: false, error: { code: 'NOT_IMPLEMENTED' } });
    }
    expect(await bus.invoke('draft_from_evidence', entradas.draft_from_evidence, ctx())).toMatchObject({ ok: false, error: { code: 'FORBIDDEN_SCOPE' } });
  });
  it('draft_from_evidence marca su salida como borrador, no asesoría', () => {
    const shape = (CATALOGO.find((t) => t.name === 'draft_from_evidence')!.outputSchema as z.ZodObject<z.ZodRawShape>).shape;
    expect(shape.disclaimer.safeParse('draft, not legal advice').success).toBe(true);
    expect(shape.disclaimer.safeParse('otra cosa').success).toBe(false);
  });
});

describe('aislamiento', () => {
  it('lib/legal-os/tools no importa el gateway, ni red, ni base de datos, ni lee el entorno', () => {
    const dir = join(__dirname, '..', 'lib', 'legal-os', 'tools');
    for (const f of readdirSync(dir)) {
      const src = readFileSync(join(dir, f), 'utf8');
      expect(src, f).not.toMatch(/ai-gateway|\bfetch\s*\(|process\.env|supabase|from ['"]node:(http|https|net)['"]/i);
    }
  });
});
