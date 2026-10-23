import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * PR-G2 — frontera shadow. Pruebas del despacho fire-and-forget en
 * app/api/chat/route.ts: kill switch, PII gate, aislamiento de la respuesta
 * HTTP y de errores/timeouts. Sin red, sin OpenAI, sin claves.
 */

const RAIZ = join(__dirname, '..');
const ORIGINAL_ENV = { ...process.env };

const FRAGMENTO = {
  id: 'f1', contenido: 'ARTICULO 173.- Texto limpio de prueba.', num_articulo: '173',
  fuente: 'Codigo Procesal Penal', relevancia: 0.95, fuente_tipo: 'codigo',
  jurisdiccion: 'HN', es_norma_vigente: true, hash: 'abcd1234',
};
const PREGUNTA_LIMPIA = 'Explica el artículo 173 del Código Procesal Penal de Honduras';

function fakeClaudeStream(text: string) {
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

function mockDependenciasComunes() {
  vi.doMock('next/server', async () => {
    const actual = await vi.importActual<typeof import('next/server')>('next/server');
    return { ...actual, after: (fn: () => unknown) => { fn(); } };
  });
  const ok = { allowed: true, remaining: 2, tier: 'free', resetAt: '2026-01-01T00:00:00.000Z' };
  vi.doMock('@/lib/rate-limit', () => ({
    checkRateLimit: vi.fn().mockResolvedValue(ok),
    reserveRateLimit: vi.fn().mockResolvedValue(ok),
    incrementRateLimit: vi.fn().mockResolvedValue(undefined),
    releaseRateLimit: vi.fn().mockResolvedValue(undefined),
    checkAndIncrementRateLimit: vi.fn().mockResolvedValue(ok),
    RateLimitStoreError: class RateLimitStoreError extends Error { code = 'STORE_ERROR'; },
    esFalloProveedorQueDevuelveCuota: () => false,
    esFalloOpenRouterQueDevuelveCuota: () => false,
    getUserIdentifierVerificado: vi.fn().mockResolvedValue('ip:test'),
    getVerifiedEmail: vi.fn().mockResolvedValue(null),
    getUserIdentifier: vi.fn().mockReturnValue('ip:test'),
    buildUserIdentifierFromEmail: (e: string) => `email:${e.trim().toLowerCase()}`,
  }));
  vi.doMock('@/lib/flags', () => ({ isFlagEnabledForUser: vi.fn().mockResolvedValue(false) }));
  vi.doMock('@/lib/analytics/logger', () => ({
    logConsulta: vi.fn().mockResolvedValue(undefined),
    hashUsuario: vi.fn().mockReturnValue('hashed'),
  }));
  vi.doMock('@/lib/websearch/tavily', () => ({
    buscarWeb: vi.fn(), formatearContextoWeb: vi.fn().mockReturnValue(''), AVISO_BUSQUEDA_FALLIDA: '',
  }));
  vi.doMock('@/lib/self-learning/buscar-plantilla', () => ({
    buscarPlantilla: vi.fn().mockResolvedValue([]),
    formatearContextoPlantilla: vi.fn().mockReturnValue(''),
  }));
  vi.doMock('@anthropic-ai/sdk', () => {
    class MockAPIError extends Error {}
    class MockAnthropic {
      messages = { create: async () => fakeClaudeStream('Respuesta simulada del modelo.') };
      static APIError = MockAPIError;
    }
    return { default: MockAnthropic };
  });
}

function mockBuscarRAG(fragmentos: unknown[]) {
  vi.doMock('@/lib/rag/search', async () => {
    const actual = await vi.importActual<typeof import('@/lib/rag/search')>('@/lib/rag/search');
    return {
      ...actual,
      buscarRAG: vi.fn().mockResolvedValue({
        fragmentos, articulos_encontrados: fragmentos.length ? ['173'] : [], backend: 'supabase',
        outcome: { state: fragmentos.length ? 'EXACT_SUCCESS' : 'NO_VERIFIED_EVIDENCE', evidenceCount: fragmentos.length, exactAttempted: true, semanticAttempted: false, degraded: false },
      }),
    };
  });
}

function mockShadow(opts: { enabled: boolean; responder?: () => Promise<unknown> }) {
  vi.doMock('@/lib/ai-gateway/shadow/config', () => ({
    SHADOW_GATEWAY_ENABLED: opts.enabled,
    SHADOW_TIMEOUT_MS: 50,
    SHADOW_REGISTRY_MAX: 200,
  }));
  // G3: con presupuesto 0 (valor real) no hay llamada; estas pruebas fijan un presupuesto solo para ejercer el flujo.
  vi.doMock('@/lib/ai-gateway/shadow/shadow-model-config', async (original) => ({ ...(await original<typeof import('@/lib/ai-gateway/shadow/shadow-model-config')>()), SHADOW_BUDGET_USD: 1 }));
  const responder = vi.fn(opts.responder ?? (async () => { throw new Error('sin respuesta grabada'); }));
  vi.doMock('@/lib/ai-gateway/shadow/adaptador-sombra', () => ({
    credencialDisponible: () => true,
    crearAdaptadorSombra: () => ({ modelo: 'gpt-6-luna', responder }),
  }));
  return responder;
}

function fakeReq(pregunta: string) {
  return { json: async () => ({ messages: [{ role: 'user', content: pregunta }], mode: 'analisis_penal' }) } as any;
}

async function textoSSE(res: Response) {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let raw = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    raw += decoder.decode(value);
  }
  return raw;
}

/** Ejecuta la ruta y devuelve la respuesta completa (estado, cabeceras relevantes y cuerpo SSE). */
async function correrRuta(pregunta: string, fragmentos: unknown[] = [FRAGMENTO]) {
  const { POST } = await import('@/app/api/chat/route');
  const res = await POST(fakeReq(pregunta));
  const cuerpo = await textoSSE(res);
  const dispatcher = await import('@/lib/ai-gateway/shadow/dispatcher');
  await dispatcher.esperarDespachos();
  return { status: res.status, contentType: res.headers.get('content-type'), cuerpo, registro: dispatcher.registroDespachos() };
}

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  vi.doUnmock('@/lib/ai-gateway/shadow/pii-gate');
  process.env.ANTHROPIC_API_KEY = 'fake-key';
  process.env.LLM_PROVIDER = 'anthropic';
  // El id de consulta viaja en la respuesta; se fija para comparar byte a byte.
  vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001');
  mockDependenciasComunes();
  mockBuscarRAG([FRAGMENTO]);
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('(a) la respuesta HTTP es idéntica byte a byte con shadow encendido o apagado', () => {
  it('apagado vs encendido con adaptador que falla vs encendido con adaptador colgado', async () => {
    mockShadow({ enabled: false });
    const apagado = await correrRuta(PREGUNTA_LIMPIA);
    expect(apagado.cuerpo).toContain('Respuesta simulada del modelo.');
    expect(apagado.registro).toEqual([]);

    vi.resetModules(); mockDependenciasComunes(); mockBuscarRAG([FRAGMENTO]);
    mockShadow({ enabled: true });
    const encendido = await correrRuta(PREGUNTA_LIMPIA);
    expect(encendido.registro.map((r) => r.estado)).toEqual(['DISPATCHED', 'ERROR']);

    vi.resetModules(); mockDependenciasComunes(); mockBuscarRAG([FRAGMENTO]);
    mockShadow({ enabled: true, responder: () => new Promise(() => {}) });
    const colgado = await correrRuta(PREGUNTA_LIMPIA);
    expect(colgado.registro.map((r) => r.estado)).toEqual(['DISPATCHED', 'TIMEOUT']);

    expect(encendido.status).toBe(apagado.status);
    expect(encendido.contentType).toBe(apagado.contentType);
    expect(encendido.cuerpo).toBe(apagado.cuerpo);
    expect(colgado.status).toBe(apagado.status);
    expect(colgado.cuerpo).toBe(apagado.cuerpo);
  });

  it('también idéntica en la rama de abstención (cero fragmentos)', async () => {
    mockBuscarRAG([]);
    mockShadow({ enabled: false });
    const apagado = await correrRuta('Según el corpus, ¿qué garantías tiene el imputado durante la detención?', []);
    vi.resetModules(); mockDependenciasComunes(); mockBuscarRAG([]);
    mockShadow({ enabled: true });
    const encendido = await correrRuta('Según el corpus, ¿qué garantías tiene el imputado durante la detención?', []);
    expect(apagado.cuerpo).toContain('CORPUS_EVIDENCE_NOT_FOUND');
    expect(encendido.cuerpo).toBe(apagado.cuerpo);
    // M1 (auditoría #85): con cero fragmentos no hay evidencia que verificar, así que no hay despacho.
    expect(encendido.registro).toEqual([{ queryId: '00000000-0000-4000-8000-000000000001', estado: 'SKIPPED_PUBLIC_CORPUS', motivo: 'sin_evidencia' }]);
  });
});

describe('(b) un error o timeout del shadow no afecta la respuesta', () => {
  it('el adaptador lanza: la ruta responde 200 con el cuerpo normal y el registro anota ERROR', async () => {
    mockShadow({ enabled: true, responder: async () => { throw new Error('boom'); } });
    const r = await correrRuta(PREGUNTA_LIMPIA);
    expect(r.status).toBe(200);
    expect(r.cuerpo).toContain('Respuesta simulada del modelo.');
    expect(r.registro.at(-1)).toMatchObject({ estado: 'ERROR', motivo: 'Error' });
  });
  it('el adaptador no responde: la ruta termina sin esperar y el registro anota TIMEOUT', async () => {
    mockShadow({ enabled: true, responder: () => new Promise(() => {}) });
    const { POST } = await import('@/app/api/chat/route');
    const t0 = Date.now();
    const res = await POST(fakeReq(PREGUNTA_LIMPIA));
    const cuerpo = await textoSSE(res);
    expect(Date.now() - t0).toBeLessThan(40); // el timeout del shadow es 50 ms: la ruta no lo esperó
    expect(cuerpo).toContain('Respuesta simulada del modelo.');
    const d = await import('@/lib/ai-gateway/shadow/dispatcher');
    await d.esperarDespachos();
    expect(d.registroDespachos().at(-1)).toMatchObject({ estado: 'TIMEOUT' });
  });
  it('un fallo síncrono dentro del despacho tampoco llega a la respuesta', async () => {
    mockShadow({ enabled: true });
    vi.doMock('@/lib/ai-gateway/shadow/pii-gate', () => ({ detectarPii: () => { throw new Error('pii roto'); } }));
    const r = await correrRuta(PREGUNTA_LIMPIA);
    expect(r.status).toBe(200);
    expect(r.cuerpo).toContain('Respuesta simulada del modelo.');
  });
  it('despacharShadow devuelve undefined: no hay promesa ni resultado que producción pueda esperar', async () => {
    mockShadow({ enabled: true });
    const d = await import('@/lib/ai-gateway/shadow/dispatcher');
    const ret = d.despacharShadow({ queryId: 'q', pregunta: PREGUNTA_LIMPIA, fragmentos: [FRAGMENTO as any], decision: 'ANSWER', retrievalState: 'EXACT_SUCCESS' });
    expect(ret).toBeUndefined();
    await d.esperarDespachos();
  });
});

describe('(c) el PII gate bloquea cada patrón', () => {
  const CASOS: Array<[string, string]> = [
    ['EMAIL', 'Mi correo es juan.perez@example.com, ¿qué dice el artículo 173?'],
    ['IDENTIDAD_RTN', 'Mi DNI 0801-1990-12345 figura en el acta; ¿qué dice el artículo 173?'],
    ['IDENTIDAD_RTN', 'El RTN 08011990123456 de la sociedad, artículo 173'],
    ['IDENTIDAD_RTN', 'Consulto con mi rtn: 1234 y el artículo 173'],
    ['TELEFONO', 'Llámeme al 9876-5432 para el artículo 173'],
    ['TELEFONO', 'Mi celular es +504 3345 6789, artículo 173'],
    ['NOMBRE_CLIENTE', 'Mi cliente Juan Pérez fue detenido; ¿qué dice el artículo 173?'],
    ['NOMBRE_CLIENTE', 'mi cliente la señora María no firmó, artículo 173'],
    ['NOMBRE_CLIENTE', 'MI CLIENTE PEREZ fue detenido, artículo 173'],
    ['EXPEDIENTE_FOLIO', 'En el expediente 2024-00123 consta el artículo 173'],
    ['EXPEDIENTE_FOLIO', 'Según el folio No. 45 del tomo, artículo 173'],
    ['EXPEDIENTE_FOLIO', 'Exp. 77 del juzgado, artículo 173'],
  ];
  for (const [categoria, pregunta] of CASOS) {
    it(`${categoria}: «${pregunta.slice(0, 40)}…» → SKIPPED_PII, el adaptador no se invoca`, async () => {
      const responder = mockShadow({ enabled: true });
      const r = await correrRuta(pregunta);
      expect(r.registro).toEqual([{ queryId: '00000000-0000-4000-8000-000000000001', estado: 'SKIPPED_PII', motivo: categoria }]);
      expect(responder).not.toHaveBeenCalled();
      expect(r.status).toBe(200);
    });
  }
  it('una consulta jurídica pública sin datos personales no se bloquea', async () => {
    const { detectarPii } = await import('@/lib/ai-gateway/shadow/pii-gate');
    for (const q of [
      PREGUNTA_LIMPIA,
      'Explica el artículo 21 del Código del Notariado',
      'Según el Decreto 353-2005, ¿qué exige el artículo 52?',
    ]) expect(detectarPii(q), q).toBeNull();
    // G3: «mi cliente» a secas (sin nombre) también se rechaza.
    expect(detectarPii('mi cliente quiere saber qué dice el artículo 173')).toBe('CLIENTE_O_PARTE');
  });
  it('el registro nunca guarda la pregunta ni el dato detectado', async () => {
    mockShadow({ enabled: true });
    const r = await correrRuta('Mi correo es juan.perez@example.com, ¿qué dice el artículo 173?');
    expect(JSON.stringify(r.registro)).not.toMatch(/juan|example|173/);
  });
});

describe('(d) con el kill switch apagado hay cero despachos', () => {
  it('ni registro ni invocación del adaptador, con consulta limpia o con PII', async () => {
    const responder = mockShadow({ enabled: false });
    const limpia = await correrRuta(PREGUNTA_LIMPIA);
    const conPii = await correrRuta('Mi correo es juan.perez@example.com, artículo 173');
    expect(limpia.registro).toEqual([]);
    expect(conPii.registro).toEqual([]);
    expect(responder).not.toHaveBeenCalled();
  });
  it('el valor por defecto del código es false y la constante no lee el entorno', () => {
    const fuente = readFileSync(join(RAIZ, 'lib', 'ai-gateway', 'shadow', 'config.ts'), 'utf8');
    expect(fuente).toMatch(/SHADOW_GATEWAY_ENABLED: boolean = false;/);
    expect(fuente).not.toMatch(/process\.env/);
  });
  it('sólo el valor booleano true enciende el despacho', async () => {
    vi.doMock('@/lib/ai-gateway/shadow/config', () => ({ SHADOW_GATEWAY_ENABLED: 'true', SHADOW_TIMEOUT_MS: 50, SHADOW_REGISTRY_MAX: 200 }));
    const d = await import('@/lib/ai-gateway/shadow/dispatcher');
    d.despacharShadow({ queryId: 'q', pregunta: PREGUNTA_LIMPIA, fragmentos: [], decision: 'ANSWER', retrievalState: 'EXACT_SUCCESS' });
    expect(d.registroDespachos()).toEqual([]);
  });
});

describe('(f) el guard de red cubre los archivos de G2 y G3', () => {
  it('ningún archivo de shadow abre red ni lee claves, salvo la excepción acotada del adaptador (ver tests/ai-gateway-shadow-g3.test.ts)', () => {
    const GUARD_RED = new RegExp([
      String.raw`\bfetch\s*\(`, 'XMLHttpRequest', 'OPENAI_API_KEY', String.raw`process\.env`, '@supabase',
      String.raw`(?:from|import|require)\s*\(?\s*['"](?:openai|axios|undici|(?:node:)?https?)['"]`,
    ].join('|'));
    const dir = join(RAIZ, 'lib', 'ai-gateway', 'shadow');
    const nuevos = ['config.ts', 'pii-gate.ts', 'privacy-gate.ts', 'public-corpus-gate.ts', 'evidence-classification.ts', 'budget-guard.ts', 'circuit-breaker.ts', 'shadow-model-config.ts', 'adaptador-sombra.ts', 'dispatcher.ts'];
    for (const n of nuevos) {
      expect(statSync(join(dir, n)).isFile()).toBe(true);
      expect(readFileSync(join(dir, n), 'utf8'), n).not.toMatch(GUARD_RED);
    }
    // Solo openai-adapter.ts lleva «openai» en el nombre.
    const conOpenai = readdirSync(dir).filter((f) => /openai/i.test(f));
    expect(conOpenai).toEqual(['openai-adapter.ts']);
  });
});
