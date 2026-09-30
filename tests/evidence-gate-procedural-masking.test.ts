import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * MISSION M1 follow-up — PROCEDURAL_PASS_CAN_MASK_PRIMARY_INSUFFICIENCY
 * (2026-09-28).
 *
 * app/api/chat/route.ts's ragPromise runs a SECOND, unrelated buscarRAG call
 * against `mayalex_procedimental` whenever ruta==='C' && !esPenal (ver
 * comentario "segunda pasada con procedimental para completar el análisis").
 * Su resultado se concatena a `fragmentos`, pero su `outcome` se descarta --
 * solo el `outcome` de la colección PRINCIPAL se devuelve. La consulta
 * dorada de S. de R.L. (docs/observability/RETRIEVAL_V3_GOLDEN_CASE_SRL_HONDURAS.md)
 * en mode='analisis' cae exactamente en ruta==='C' (sin marcador procedimental
 * ni normativo explícito, MODOS_ANALISIS -> 'C', ver
 * lib/router/clasificar_consulta.ts).
 *
 * Antes de este fix: `evidenciaInsuficiente` en route.ts se calculaba sobre
 * `ragData.fragmentos.length` -- el ARRAY COMBINADO de ambas pasadas. Si la
 * colección principal correctamente resolvía OFFICIAL_FALLBACK_REQUIRED (cero
 * evidencia real) pero la pasada procedimental (una colección pequeña, sin
 * filtro de materia posible para consultas de materia indetectable) aportaba
 * aunque sea UN fragmento irrelevante, el array combinado tenía longitud >=1
 * -> evidenciaInsuficiente=false -> TODO el bloque de abstención/fallback
 * oficial se saltaba por completo, aunque el outcome primario dijera
 * OFFICIAL_FALLBACK_REQUIRED.
 */

const ORIGINAL_ENV = { ...process.env };

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

let anthropicCreateMock: (...args: unknown[]) => Promise<unknown>;

function mockDependenciasComunes(flagsHabilitados: string[] = []) {
  vi.doMock('next/server', async () => {
    const actual = await vi.importActual<typeof import('next/server')>('next/server');
    return { ...actual, after: (fn: () => unknown) => { fn(); } };
  });
  vi.doMock('@/lib/rate-limit', () => ({
    checkAndIncrementRateLimit: vi.fn().mockResolvedValue({
      allowed: true, remaining: 2, tier: 'free', resetAt: new Date().toISOString(),
    }),
    getUserIdentifierVerificado: vi.fn().mockResolvedValue('ip:test'),
    getVerifiedEmail: vi.fn().mockResolvedValue(null),
    getUserIdentifier: vi.fn().mockReturnValue('ip:test'),
    buildUserIdentifierFromEmail: (e: string) => `email:${e.trim().toLowerCase()}`,
  }));
  vi.doMock('@/lib/flags', () => ({
    isFlagEnabledForUser: vi.fn().mockImplementation(async (flagName: string) => flagsHabilitados.includes(flagName)),
  }));
  vi.doMock('@/lib/analytics/logger', () => ({
    logConsulta: vi.fn().mockResolvedValue(undefined),
    hashUsuario: vi.fn().mockReturnValue('hashed'),
  }));
  vi.doMock('@/lib/websearch/tavily', () => ({
    buscarWeb: vi.fn(), formatearContextoWeb: vi.fn().mockReturnValue(''), AVISO_BUSQUEDA_FALLIDA: '',
  }));
  vi.doMock('@/lib/self-learning/buscar-plantilla', () => ({
    buscarPlantilla: vi.fn().mockResolvedValue([]), formatearContextoPlantilla: vi.fn().mockReturnValue(''),
  }));
  anthropicCreateMock = vi.fn().mockImplementation(async () => fakeClaudeStream('Respuesta simulada del modelo.'));
  vi.doMock('@anthropic-ai/sdk', () => {
    class MockAPIError extends Error {}
    class MockAnthropic {
      messages = { create: (...args: unknown[]) => anthropicCreateMock(...args) };
      static APIError = MockAPIError;
    }
    return { default: MockAnthropic };
  });
}

function fakeReq(body: unknown) {
  return { json: async () => body } as any;
}

async function leerSSE(res: Response) {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let raw = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    raw += decoder.decode(value);
  }
  return raw.split('\n\n').filter((c) => c.startsWith('data: ')).map((c) => JSON.parse(c.slice('data: '.length)));
}

const QUERY_DORADA_SRL = '¿Cuáles son los requisitos para constituir una Sociedad de Responsabilidad Limitada en Honduras?';

/**
 * Mock diferenciado por colección: la colección PRINCIPAL (cualquiera que no
 * sea 'mayalex_procedimental') resuelve OFFICIAL_FALLBACK_REQUIRED con cero
 * evidencia real -- exactamente lo que produce la búsqueda semántica ya
 * corregida (Fase EG-1) para una consulta mercantil sin corpus dedicado. La
 * colección 'mayalex_procedimental' (segunda pasada, ruta C civil) devuelve
 * UN fragmento irrelevante -- simula el caso real: esa colección es pequeña,
 * y para materias sin cobertura en detectarMateriaSemanticaAmpliada
 * (mercantil SÍ tiene sentinel, pero aquí se simula el peor caso, una materia
 * sin ningún filtro posible) puede devolver cualquier cosa por similitud pura.
 */
function mockBuscarRAGDiferenciado() {
  vi.doMock('@/lib/rag/search', async () => {
    const actual = await vi.importActual<typeof import('@/lib/rag/search')>('@/lib/rag/search');
    const buscarRAG = vi.fn().mockImplementation(async (_consulta: string, _k: number, coleccion: string) => {
      if (coleccion === 'mayalex_procedimental') {
        return {
          fragmentos: [{
            id: 'proc-1', contenido: 'Fragmento procedimental irrelevante para la consulta mercantil.',
            num_articulo: null, fuente: 'Ley de Procedimientos Administrativos', relevancia: 0.4,
            fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, hash: 'proc1',
          }],
          articulos_encontrados: [],
          backend: 'supabase',
          outcome: { state: 'SEMANTIC_SUCCESS', evidenceCount: 1, exactAttempted: false, semanticAttempted: true, degraded: false },
        };
      }
      // Colección principal: cero evidencia real, correctamente resuelta a
      // OFFICIAL_FALLBACK_REQUIRED (comportamiento ya corregido en EG-1).
      return {
        fragmentos: [],
        articulos_encontrados: [],
        backend: 'supabase',
        outcome: { state: 'OFFICIAL_FALLBACK_REQUIRED', evidenceCount: 0, exactAttempted: false, semanticAttempted: true, degraded: false },
      };
    });
    return { ...actual, buscarRAG };
  });
}

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  process.env.ANTHROPIC_API_KEY = 'fake-key';
  process.env.LLM_PROVIDER = 'anthropic';
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

describe('PROCEDURAL_PASS_CAN_MASK_PRIMARY_INSUFFICIENCY', () => {
  it('consulta dorada S. de R.L., mode=analisis (ruta C) -> primario OFFICIAL_FALLBACK_REQUIRED, procedural aporta 1 fragmento -> el fallback SIGUE siendo alcanzable (LLM no invocado sin evidencia, o fallback intentado)', async () => {
    mockDependenciasComunes(['flag_official_source_fallback']);
    mockBuscarRAGDiferenciado();
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(fakeReq({
      messages: [{ role: 'user', content: QUERY_DORADA_SRL }],
      mode: 'analisis',
    }));
    const eventos = await leerSSE(res);
    const doneEvt = eventos.find((e) => e.type === 'done');
    const textoCompleto = eventos.filter((e) => e.type === 'text').map((e) => e.text).join('');

    // INVARIANTE: el modelo NUNCA debe responder con contenido mercantil
    // "autoritativo" generado desde su propia memoria cuando la colección
    // principal no encontró evidencia real -- exactamente el FAIL CONDITION 6
    // del caso dorado. Si esto falla, el LLM fue invocado normalmente pese a
    // evidencia insuficiente -- la pasada procedimental enmascaró la
    // insuficiencia primaria.
    expect(anthropicCreateMock).not.toHaveBeenCalled();
    expect(doneEvt.codigo).not.toBeUndefined();
    expect(textoCompleto).not.toBe('Respuesta simulada del modelo.');
    // "fallback reached": con flag_official_source_fallback ON y
    // OFFICIAL_FALLBACK_REQUIRED como estado primario, attemptOfficialFallback
    // debe intentarse de verdad (llamada de red real a CEDIJ) -- no basta con
    // que el LLM no se haya invocado, eso también pasaría si el sistema
    // simplemente abstuviera sin intentar el fallback en absoluto.
    expect(fetchMock).toHaveBeenCalled();
  });
});
