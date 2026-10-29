/**
 * G6-E / G6-J — CERTIFICACIÓN de independencia de la respuesta HTTP de producción respecto del shadow.
 *
 * Ejecuta la ruta REAL (app/api/chat/route.ts) con el shadow apagado (línea base) y con el shadow encendido bajo cada modo de fallo, y exige que
 * estado HTTP, tipo de contenido y cuerpo SSE sean IDÉNTICOS byte a byte a la línea base de la misma consulta. Sin red, sin OpenAI, sin claves.
 * Con G6_WRITE_EVIDENCE=1 escribe docs/governance/evidence/g6-production-independence.json (con el SHA-256 del código que ejerció).
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ARCHIVOS_RUTA_Y_SHADOW, hashArchivos } from '@/lib/ai-gateway/canary/evidence-integrity';

const RAIZ = join(__dirname, '..');
const ORIGINAL_ENV = { ...process.env };
const FRAGMENTO = {
  id: 'f1', contenido: 'ARTICULO 173.- Texto limpio de prueba.', num_articulo: '173', fuente: 'Codigo Procesal Penal', relevancia: 0.95,
  fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, hash: 'abcd1234',
};
const PREGUNTA = 'Explica el artículo 173 del Código Procesal Penal de Honduras';
const PREGUNTA_PII = 'Mi correo es juan.perez@example.com, explica el artículo 173 del Código Procesal Penal de Honduras';
const UUID = '00000000-0000-4000-8000-000000000001';

function stream(text: string) {
  async function* gen() {
    yield { type: 'message_start', message: { usage: { input_tokens: 42 } } };
    yield { type: 'content_block_start', content_block: { type: 'text' } };
    yield { type: 'content_block_delta', delta: { type: 'text_delta', text } };
    yield { type: 'content_block_stop' };
    yield { type: 'message_delta', usage: { output_tokens: 7 } };
    yield { type: 'message_stop' };
  }
  return gen();
}

function mocksComunes(retrievalState: string, fragmentos: unknown[], evidenceCount = fragmentos.length) {
  vi.doMock('next/server', async () => ({ ...(await vi.importActual<typeof import('next/server')>('next/server')), after: (fn: () => unknown) => { fn(); } }));
  const ok = { allowed: true, remaining: 2, tier: 'free', resetAt: '2026-01-01T00:00:00.000Z' };
  vi.doMock('@/lib/rate-limit', () => ({
    checkRateLimit: vi.fn().mockResolvedValue(ok), reserveRateLimit: vi.fn().mockResolvedValue(ok), incrementRateLimit: vi.fn().mockResolvedValue(undefined),
    releaseRateLimit: vi.fn().mockResolvedValue(undefined), checkAndIncrementRateLimit: vi.fn().mockResolvedValue(ok),
    RateLimitStoreError: class extends Error { code = 'STORE_ERROR'; }, esFalloProveedorQueDevuelveCuota: () => false, esFalloOpenRouterQueDevuelveCuota: () => false,
    getUserIdentifierVerificado: vi.fn().mockResolvedValue('ip:test'), getVerifiedEmail: vi.fn().mockResolvedValue(null), getUserIdentifier: vi.fn().mockReturnValue('ip:test'),
    buildUserIdentifierFromEmail: (e: string) => `email:${e.trim().toLowerCase()}`,
  }));
  vi.doMock('@/lib/flags', () => ({ isFlagEnabledForUser: vi.fn().mockResolvedValue(false) }));
  vi.doMock('@/lib/analytics/logger', () => ({ logConsulta: vi.fn().mockResolvedValue(undefined), hashUsuario: vi.fn().mockReturnValue('hashed') }));
  vi.doMock('@/lib/websearch/tavily', () => ({ buscarWeb: vi.fn(), formatearContextoWeb: vi.fn().mockReturnValue(''), AVISO_BUSQUEDA_FALLIDA: '' }));
  vi.doMock('@/lib/self-learning/buscar-plantilla', () => ({ buscarPlantilla: vi.fn().mockResolvedValue([]), formatearContextoPlantilla: vi.fn().mockReturnValue('') }));
  vi.doMock('@anthropic-ai/sdk', () => {
    class MockAPIError extends Error {}
    class MockAnthropic { messages = { create: async () => stream('Respuesta simulada del modelo. El artículo 173 del Código Procesal Penal contiene un texto limpio de prueba.') }; static APIError = MockAPIError; }
    return { default: MockAnthropic };
  });
  vi.doMock('@/lib/rag/search', async () => ({
    ...(await vi.importActual<typeof import('@/lib/rag/search')>('@/lib/rag/search')),
    buscarRAG: vi.fn().mockResolvedValue({
      fragmentos, articulos_encontrados: fragmentos.length ? ['173'] : [], backend: 'supabase',
      outcome: { state: retrievalState, evidenceCount, exactAttempted: true, semanticAttempted: false, degraded: false },
    }),
  }));
}

interface Shadow {
  enabled: boolean;
  responder?: () => Promise<unknown>;
  budget?: number;
  provenancePass?: boolean;
  credential?: boolean;
  dispatcherThrows?: boolean;
}

function mockShadow(s: Shadow) {
  vi.doMock('@/lib/ai-gateway/shadow/config', () => ({ SHADOW_GATEWAY_ENABLED: s.enabled, SHADOW_TIMEOUT_MS: 50, SHADOW_REGISTRY_MAX: 200 }));
  vi.doMock('@/lib/ai-gateway/shadow/shadow-model-config', async (original) => ({
    ...(await original<typeof import('@/lib/ai-gateway/shadow/shadow-model-config')>()), SHADOW_BUDGET_USD: s.budget ?? 1,
  }));
  if (s.provenancePass !== false) vi.doMock('@/lib/ai-gateway/shadow/public-provenance', () => ({ evaluarProcedenciaFuerte: () => ({ estado: 'PROVENANCE_PASS' }) }));
  vi.doMock('@/lib/ai-gateway/shadow/adaptador-sombra', () => ({
    credencialDisponible: () => s.credential !== false,
    crearAdaptadorSombra: () => ({ modelo: 'gpt-6-luna', responder: vi.fn(s.responder ?? (async () => { throw new Error('sin respuesta'); })) }),
  }));
  if (s.dispatcherThrows) {
    vi.doMock('@/lib/ai-gateway/shadow/dispatcher', () => ({ despacharShadow: () => { throw new Error('el despachador explotó'); }, esperarDespachos: async () => {}, registroDespachos: () => [] }));
  }
}

async function leer(res: Response) {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let raw = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    raw += dec.decode(value);
  }
  return raw;
}

interface Corrida { status: number; contentType: string | null; cuerpo: string; estados: string[] }

type LegalOsModo = 'off' | 'on' | 'lanza';

async function correr(o: { pregunta?: string; fragmentos?: unknown[]; retrievalState?: string; evidenceCount?: number; shadow: Shadow; legalOs?: LegalOsModo }): Promise<Corrida> {
  vi.resetModules();
  vi.restoreAllMocks();
  vi.doUnmock('@/lib/legal-os/shadow');
  delete process.env.LEGAL_OS_SHADOW;
  if (o.legalOs === 'on') process.env.LEGAL_OS_SHADOW = '1';
  if (o.legalOs === 'lanza') vi.doMock('@/lib/legal-os/shadow', () => ({ despacharLegalOsShadow: () => { throw new Error('el shadow de Legal OS explotó'); } }));
  for (const m of ['pii-gate', 'dispatcher', 'public-provenance', 'adaptador-sombra', 'config', 'shadow-model-config']) vi.doUnmock(`@/lib/ai-gateway/shadow/${m}`);
  vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(UUID);
  const fragmentos = o.fragmentos ?? [FRAGMENTO];
  mocksComunes(o.retrievalState ?? (fragmentos.length ? 'EXACT_SUCCESS' : 'NO_VERIFIED_EVIDENCE'), fragmentos, o.evidenceCount);
  mockShadow(o.shadow);
  const { POST } = await import('@/app/api/chat/route');
  const res = await POST({ json: async () => ({ messages: [{ role: 'user', content: o.pregunta ?? PREGUNTA }], mode: 'analisis_penal' }) } as never);
  const cuerpo = await leer(res);
  const d = await import('@/lib/ai-gateway/shadow/dispatcher');
  await d.esperarDespachos();
  return { status: res.status, contentType: res.headers.get('content-type'), cuerpo, estados: d.registroDespachos().map((r) => r.estado) };
}

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = 'fake-key';
  process.env.LLM_PROVIDER = 'anthropic';
});
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

const RESPUESTA_VALIDA = async () => ({
  rawOutput: { decision: 'ANSWER', claims: [{ claim_id: 'c1', text: 't', citations: [{ chunk_id: 'f1', support: 'DIRECT' }] }], abstention_reason: null },
  usage: { inputTokens: 100, outputTokens: 10 }, latencyMs: 3,
});

interface Escenario { id: string; descripcion: string; run: () => Promise<{ base: Corrida; con: Corrida }>; esperaEstado?: (e: string[]) => boolean }
const sha = (t: string) => createHash('sha256').update(t).digest('hex');

const ESCENARIOS: Escenario[] = [
  { id: 'shadow-respuesta-valida', descripcion: 'El shadow responde bien y concuerda', esperaEstado: (e) => e.includes('COMPLETED'),
    run: async () => ({ base: await correr({ shadow: { enabled: false } }), con: await correr({ shadow: { enabled: true, responder: RESPUESTA_VALIDA } }) }) },
  { id: 'adapter-error', descripcion: 'El adaptador lanza una excepción', esperaEstado: (e) => e.includes('ERROR'),
    run: async () => ({ base: await correr({ shadow: { enabled: false } }), con: await correr({ shadow: { enabled: true, responder: async () => { throw new Error('boom'); } } }) }) },
  { id: 'timeout', descripcion: 'El adaptador nunca responde', esperaEstado: (e) => e.includes('TIMEOUT'),
    run: async () => ({ base: await correr({ shadow: { enabled: false } }), con: await correr({ shadow: { enabled: true, responder: () => new Promise(() => {}) } }) }) },
  { id: 'respuesta-malformada', descripcion: 'El adaptador devuelve algo que no es el esquema', esperaEstado: (e) => e.includes('COMPLETED'),
    run: async () => ({ base: await correr({ shadow: { enabled: false } }), con: await correr({ shadow: { enabled: true, responder: async () => ({ rawOutput: { foo: 'bar' }, usage: { inputTokens: 1, outputTokens: 1 }, latencyMs: 1 }) } }) }) },
  { id: 'fallo-de-citas', descripcion: 'La única claim cita un chunk inexistente', esperaEstado: (e) => e.includes('COMPLETED'),
    run: async () => ({ base: await correr({ shadow: { enabled: false } }), con: await correr({ shadow: { enabled: true, responder: async () => ({ rawOutput: { decision: 'ANSWER', claims: [{ claim_id: 'c1', text: 't', citations: [{ chunk_id: 'x', support: 'DIRECT' }] }], abstention_reason: null }, usage: { inputTokens: 1, outputTokens: 1 }, latencyMs: 1 }) } }) }) },
  { id: 'incidente-de-privacidad', descripcion: 'La pregunta trae un correo: el shadow no se despacha', esperaEstado: (e) => e.includes('SKIPPED_PII'),
    run: async () => ({ base: await correr({ pregunta: PREGUNTA_PII, shadow: { enabled: false } }), con: await correr({ pregunta: PREGUNTA_PII, shadow: { enabled: true, responder: RESPUESTA_VALIDA } }) }) },
  { id: 'procedencia-invalida', descripcion: 'Manifiesto vacío: sin prueba fuerte de procedencia', esperaEstado: (e) => e.includes('SKIPPED_PUBLIC_PROVENANCE'),
    run: async () => ({ base: await correr({ shadow: { enabled: false } }), con: await correr({ shadow: { enabled: true, provenancePass: false, responder: RESPUESTA_VALIDA } }) }) },
  { id: 'presupuesto-cero', descripcion: 'Presupuesto real 0: sin llamada', esperaEstado: (e) => e.includes('SKIPPED_BUDGET'),
    run: async () => ({ base: await correr({ shadow: { enabled: false } }), con: await correr({ shadow: { enabled: true, budget: 0, responder: RESPUESTA_VALIDA } }) }) },
  { id: 'sin-credenciales', descripcion: 'Sin credencial', esperaEstado: (e) => e.includes('SKIPPED_NO_CREDENTIALS'),
    run: async () => ({ base: await correr({ shadow: { enabled: false } }), con: await correr({ shadow: { enabled: true, credential: false, responder: RESPUESTA_VALIDA } }) }) },
  { id: 'despachador-lanza', descripcion: 'despacharShadow lanza de forma síncrona', esperaEstado: () => true,
    run: async () => ({ base: await correr({ shadow: { enabled: false } }), con: await correr({ shadow: { enabled: true, dispatcherThrows: true } }) }) },
  { id: 'abstencion-de-produccion-con-shadow-ANSWER', descripcion: 'Producción se abstiene (sin evidencia verificada) y el shadow diría ANSWER', esperaEstado: (e) => e.includes('COMPLETED'),
    run: async () => ({
      base: await correr({ retrievalState: 'NO_VERIFIED_EVIDENCE', evidenceCount: 0, shadow: { enabled: false } }),
      con: await correr({ retrievalState: 'NO_VERIFIED_EVIDENCE', evidenceCount: 0, shadow: { enabled: true, responder: RESPUESTA_VALIDA } }),
    }) },
  { id: 'legal-os-shadow-encendido', descripcion: 'Legal OS shadow ENCENDIDO (simulado): la respuesta de producción no cambia', esperaEstado: () => true,
    run: async () => ({ base: await correr({ shadow: { enabled: false } }), con: await correr({ shadow: { enabled: false }, legalOs: 'on' }) }) },
  { id: 'legal-os-shadow-lanza', descripcion: 'El despacho de Legal OS lanza de forma síncrona', esperaEstado: () => true,
    run: async () => ({ base: await correr({ shadow: { enabled: false } }), con: await correr({ shadow: { enabled: false }, legalOs: 'lanza' }) }) },
  { id: 'legal-os-shadow-abstencion-de-produccion', descripcion: 'Producción se abstiene y Legal OS shadow está encendido', esperaEstado: () => true,
    run: async () => ({
      base: await correr({ retrievalState: 'NO_VERIFIED_EVIDENCE', evidenceCount: 0, shadow: { enabled: false } }),
      con: await correr({ retrievalState: 'NO_VERIFIED_EVIDENCE', evidenceCount: 0, shadow: { enabled: false }, legalOs: 'on' }),
    }) },
  { id: 'sin-evidencia', descripcion: 'Cero fragmentos: abstención, sin despacho', esperaEstado: (e) => e.includes('SKIPPED_PUBLIC_CORPUS'),
    run: async () => ({ base: await correr({ fragmentos: [], shadow: { enabled: false } }), con: await correr({ fragmentos: [], shadow: { enabled: true, responder: RESPUESTA_VALIDA } }) }) },
];

const resultados: Array<{ id: string; descripcion: string; status: number; contentType: string | null; cuerpoSha256: string; identicoALineaBase: boolean; estadosShadow: string[] }> = [];

describe('G6-E independencia: PRODUCTION_HTTP_RESPONSE_INDEPENDENT', () => {
  for (const e of ESCENARIOS) {
    it(`${e.id}: estado, tipo de contenido y cuerpo son idénticos a la línea base`, async () => {
      const { base, con } = await e.run();
      expect(base.status).toBe(200);
      expect(con.status).toBe(base.status);
      expect(con.contentType).toBe(base.contentType);
      expect(con.cuerpo).toBe(base.cuerpo);
      if (e.esperaEstado) expect(e.esperaEstado(con.estados), `${e.id}: ${con.estados.join(',')}`).toBe(true);
      expect(base.estados).toEqual([]);
      resultados.push({ id: e.id, descripcion: e.descripcion, status: con.status, contentType: con.contentType, cuerpoSha256: sha(con.cuerpo), identicoALineaBase: con.cuerpo === base.cuerpo, estadosShadow: con.estados });
    });
  }

  it('la abstención de producción sigue siendo autoritativa aunque el shadow diga ANSWER', async () => {
    const abst = await correr({ retrievalState: 'NO_VERIFIED_EVIDENCE', evidenceCount: 0, shadow: { enabled: true, responder: RESPUESTA_VALIDA } });
    expect(abst.cuerpo).toContain('CORPUS_EVIDENCE_NOT_FOUND');
    expect(abst.cuerpo).not.toContain('Respuesta simulada del modelo.');
    expect(abst.estados).toContain('COMPLETED'); // el shadow sí corrió y concordó en ANSWER: no cambió nada
    const sinEvidencia = await correr({ fragmentos: [], shadow: { enabled: true, responder: RESPUESTA_VALIDA } });
    expect(sinEvidencia.cuerpo).toContain('CORPUS_EVIDENCE_NOT_FOUND');
  });

  it('la ruta de producción no lee el resultado del shadow: el despacho es una sentencia, sin await ni asignación', () => {
    const ruta = readFileSync(join(RAIZ, 'app', 'api', 'chat', 'route.ts'), 'utf8');
    const llamadas = [...ruta.matchAll(/despacharShadow\(/g)];
    expect(llamadas).toHaveLength(1);
    const antes = ruta.slice(0, llamadas[0].index!).split('\n').at(-1) ?? '';
    expect(antes.trim()).toBe('');
    expect(ruta).not.toMatch(/registroDespachos|esperarDespachos|ShadowGatewayResult|estimatedCostUsd/);
    const legalOs = [...ruta.matchAll(/despacharLegalOsShadow\(/g)];
    expect(legalOs).toHaveLength(1);
    expect((ruta.slice(0, legalOs[0].index!).split('\n').at(-1) ?? '').trim()).toBe('');
  });

  it('Legal OS shadow encendido produce UN registro con los campos de la traza, sin la pregunta cruda, y la respuesta no cambia', async () => {
    const lineas: string[] = [];
    const orig = console.log;
    console.log = (...a: unknown[]) => { lineas.push(a.map(String).join(' ')); };
    try {
      const base = await correr({ shadow: { enabled: false } });
      const con = await correr({ shadow: { enabled: false }, legalOs: 'on' });
      await new Promise((r) => setTimeout(r, 20));
      expect(con.cuerpo).toBe(base.cuerpo);
      const reg = lineas.filter((l) => l.includes('legal_os_shadow'));
      expect(reg).toHaveLength(1);
      const r = JSON.parse(reg[0]).legal_os_shadow;
      for (const k of ['query_id', 'jurisdiction', 'matter', 'skill_id', 'intent', 'risk', 'retrieval_plan', 'exact_resolution', 'retrieved_sources', 'source_tier', 'evidence_status', 'model_route', 'model_id', 'model_called', 'citations', 'citation_validation', 'abstention', 'latency_ms', 'estimated_cost_usd', 'privacy_decision', 'provenance_decision', 'final_shadow_status']) expect(r, k).toHaveProperty(k);
      expect(r.model_called).toBe(false);
      expect(reg[0]).not.toContain('artículo 173 del Código Procesal Penal de Honduras');
    } finally {
      console.log = orig;
    }
  });

  it('lifecycle con after() SIMULADO: el shadow corre DESPUÉS de que la respuesta HTTP terminó y su fallo no puede alcanzarla', async () => {
    vi.resetModules();
    vi.restoreAllMocks();
    for (const m of ['pii-gate', 'dispatcher', 'public-provenance', 'adaptador-sombra', 'config', 'shadow-model-config']) vi.doUnmock(`@/lib/ai-gateway/shadow/${m}`);
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(UUID);
    mocksComunes('EXACT_SUCCESS', [FRAGMENTO]);
    mockShadow({ enabled: true, responder: async () => { throw new Error('falla tardía'); } });
    const { programarShadowDiferido } = await import('@/lib/ai-gateway/shadow/despacho-diferido');
    const d = await import('@/lib/ai-gateway/shadow/dispatcher');
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST({ json: async () => ({ messages: [{ role: 'user', content: PREGUNTA }], mode: 'analisis_penal' }) } as never);
    const cuerpo = await leer(res);
    // La respuesta ya está completa; recién ahora corre la tarea diferida.
    const tareas: Array<() => Promise<void>> = [];
    programarShadowDiferido({ queryId: 'q-lifecycle', pregunta: PREGUNTA, fragmentos: [FRAGMENTO as never], decision: 'ANSWER', retrievalState: 'EXACT_SUCCESS' }, (t) => tareas.push(t));
    expect(d.registroDespachos().filter((r) => r.queryId === 'q-lifecycle')).toEqual([]);
    await expect(tareas[0]()).resolves.toBeUndefined();
    expect(d.registroDespachos().filter((r) => r.queryId === 'q-lifecycle').map((r) => r.estado)).toEqual(['DISPATCHED', 'ERROR']);
    expect(cuerpo).toContain('Respuesta simulada del modelo.');
  });

  it('escribe la evidencia (solo con G6_WRITE_EVIDENCE=1) y la evidencia vigente coincide con el código actual', () => {
    expect(resultados.length).toBe(ESCENARIOS.length);
    const evidencia = {
      PRODUCTION_HTTP_RESPONSE_INDEPENDENT: resultados.every((r) => r.identicoALineaBase && r.status === 200),
      criterio: 'Para cada modo de fallo del shadow, estado HTTP, tipo de contenido y cuerpo SSE de la ruta real son idénticos a la misma consulta con el shadow apagado.',
      escenarios: [...resultados].sort((a, b) => a.id.localeCompare(b.id)),
      codigoHashes: hashArchivos(ARCHIVOS_RUTA_Y_SHADOW),
    };
    const destino = join(RAIZ, 'docs', 'governance', 'evidence', 'g6-production-independence.json');
    if (process.env.G6_WRITE_EVIDENCE === '1') writeFileSync(destino, `${JSON.stringify(evidencia, null, 2)}\n`);
    const guardada = JSON.parse(readFileSync(destino, 'utf8'));
    expect(guardada.PRODUCTION_HTTP_RESPONSE_INDEPENDENT).toBe(true);
    expect(guardada).toEqual(evidencia);
  });
});
