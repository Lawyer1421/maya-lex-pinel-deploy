import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Fase 2 de latencia (2026-11-12) — POST simulado (mismo andamiaje que retrieval-post-tres-casos.test.ts). Verifica:
 *  - la ruta rápida (Haiku sin thinking) SOLO para pedir el texto literal de un artículo; el análisis sigue en Sonnet con thinking;
 *  - los estados de progreso (`status`) que el servidor emite mientras retiene la salida para validarla con R3/R4.
 * Sin red ni credenciales.
 */

const ORIGINAL_ENV = { ...process.env };

const FUENTE_CIVIL = 'Código Civil de Honduras (Decreto del Poder Ejecutivo del 8 de febrero de 1906)';
const FUENTE_CPC = 'Codigo Procesal Civil';
const FUENTE_PENAL = 'Codigo Penal';
const cpc424: Fila = {
  id: 'cpc-424', contenido: 'Artículo 424. PROCEDENCIA Y REQUISITOS. 1. Todo proceso judicial comenzará por medio de demanda escrita.',
  num_articulo: '424', fuente: 'Codigo Procesal Civil', fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '02_CIVIL', metadata: null, similarity: 0.9,
};
const FUENTE_COMERCIO = 'Codigo de Comercio (Decreto No. 73-1950, Congreso Nacional de Honduras)';

type Fila = Record<string, unknown>;

const civilDivorcio: Fila = {
  id: 'civil-divorcio', contenido: 'Artículo 1. El matrimonio se disuelve por divorcio en los casos que la ley establece.',
  num_articulo: '1', fuente: FUENTE_CIVIL, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '02_CIVIL', similarity: 0.9,
};
const procesalDivorcio: Fila = {
  id: 'cpc-divorcio', contenido: 'Artículo 5. El procedimiento de divorcio se tramita en juicio oral.',
  num_articulo: '5', fuente: FUENTE_CPC, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '02_CIVIL', similarity: 0.8,
};
const penal173: Fila = {
  id: 'penal-173', contenido: 'ARTICULO 173.- Medidas cautelares del Código Penal.', num_articulo: '173',
  fuente: FUENTE_PENAL, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '01_PENAL', metadata: null,
};
const comercio173: Fila = {
  id: 'comercio-173', contenido: 'ARTICULO 173.- Texto del Código de Comercio.', num_articulo: '173',
  fuente: FUENTE_COMERCIO, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '10_LEYES_REGLAMENTOS', metadata: null,
};

const llamadasModelo: unknown[][] = [];

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

/**
 * Cliente Supabase: la tabla de búsqueda exacta sólo responde a biblioteca_vectores;
 * la RPC semántica devuelve filas según la colección y respeta materia_filtro.
 */
function mockDependencias(tabla: Fila[], rpcFilas: (coleccion: string) => Fila[]) {
  vi.doMock('next/server', async () => {
    const actual = await vi.importActual<typeof import('next/server')>('next/server');
    return { ...actual, after: (fn: () => unknown) => { fn(); } };
  });
  vi.doMock('@/lib/rate-limit', () => ({
    checkRateLimit: vi.fn().mockResolvedValue({
      allowed: true, remaining: 2, tier: 'free', resetAt: new Date().toISOString(),
    }),
    reserveRateLimit: vi.fn().mockResolvedValue({
      allowed: true, remaining: 2, tier: 'free', resetAt: new Date().toISOString(),
    }),
    incrementRateLimit: vi.fn().mockResolvedValue(undefined),
    releaseRateLimit: vi.fn().mockResolvedValue(undefined),
    RateLimitStoreError: class RateLimitStoreError extends Error { code = 'STORE_ERROR'; },
    esFalloProveedorQueDevuelveCuota: () => false,
    esFalloOpenRouterQueDevuelveCuota: () => false,
    checkAndIncrementRateLimit: vi.fn().mockResolvedValue({
      allowed: true, remaining: 2, tier: 'free', resetAt: new Date().toISOString(),
    }),
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
    buscarWeb: vi.fn(),
    formatearContextoWeb: vi.fn().mockReturnValue(''),
    AVISO_BUSQUEDA_FALLIDA: '',
  }));
  vi.doMock('@/lib/self-learning/buscar-plantilla', () => ({
    buscarPlantilla: vi.fn().mockResolvedValue([]),
    formatearContextoPlantilla: vi.fn().mockReturnValue(''),
  }));
  llamadasModelo.length = 0;
  vi.doMock('@anthropic-ai/sdk', () => {
    class MockAPIError extends Error {}
    class MockAnthropic {
      messages = {
        create: async (...args: unknown[]) => {
          llamadasModelo.push(args);
          return fakeClaudeStream('Respuesta simulada del modelo.');
        },
      };
      static APIError = MockAPIError;
    }
    return { default: MockAnthropic };
  });

  const nuevaConsulta = (filas: Fila[]) => {
    const filtros: [string, unknown][] = [];
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn((col: string, val: unknown) => { filtros.push([col, val]); return chain; }),
      then: (resolve: (v: { data: Fila[]; error: null }) => void) =>
        resolve({ data: filas.filter((f) => filtros.every(([c, v]) => !(c in f) || f[c] === v)), error: null }),
    };
    return chain;
  };
  const rpc = vi.fn(async (_n: string, params: Record<string, unknown>) => {
    const materia = params.materia_filtro as string | null;
    const filas = rpcFilas(String(params.coleccion_filtro ?? ''));
    return { data: filas.filter((f) => materia === null || f.materia === materia), error: null };
  });
  vi.doMock('@/lib/supabase', () => ({
    createServerSupabaseClient: () => ({
      from: vi.fn((nombre: string) => nuevaConsulta(nombre === 'biblioteca_vectores' ? tabla : [])),
      rpc,
    }),
  }));
  vi.doMock('@/lib/rag/embed', () => ({ embedQuery: vi.fn().mockResolvedValue(new Array(384).fill(0.01)) }));
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

import { textoDeSystem } from '@/lib/system-prompt';

/** Fuentes que el system prompt enviado muestra como "Fuente documental". */
function fuentesEnSystem(system: unknown): string[] {
  return [...textoDeSystem(system as never).matchAll(/^Fuente documental: (.+)$/gm)].map((m) => m[1]);
}

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  process.env.ANTHROPIC_API_KEY = 'fake-key';
  process.env.LLM_PROVIDER = 'anthropic';
  process.env.RAG_BACKEND = 'supabase';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});


import { MODELO_HAIKU, MODELO_SONNET, aplicarRutaRapida, clasificarConsultaRapida } from '@/lib/model-config';

describe('clasificarConsultaRapida', () => {
  it.each([
    ['¿Qué dice el artículo 424 del Código Procesal Civil?', 'TEXTO_LITERAL'],
    ['que dice el art. 70 del codigo de comercio', 'TEXTO_LITERAL'],
    ['Transcríbeme el artículo 29 del Código del Notariado', 'TEXTO_LITERAL'],
    ['Hola', 'SALUDO'],
    ['Buenos días', 'SALUDO'],
    ['muchas gracias!', 'SALUDO'],
  ])('rápida: %s → %s', (q, esperado) => expect(clasificarConsultaRapida(q)).toBe(esperado));

  it.each([
    '¿Cuáles son los requisitos esenciales de una demanda ordinaria?',
    '¿Qué dice el artículo 424 y cómo aplica a mi caso?',
    '¿Qué dice el artículo 424 y el 425 del CPC?',
    '¿Qué dice el artículo 424? explica sus requisitos',
    'Compara el artículo 424 con el 425',
    'Hola, ¿qué plazo tengo para apelar?',
    'Hola necesito ayuda con un contrato',
    'Redacta una demanda de divorcio',
    '',
  ])('NO rápida: %s', (q) => expect(clasificarConsultaRapida(q)).toBeNull());

  it('solo en modos de análisis y sin override del cliente', () => {
    const base = { pregunta: 'Qué dice el artículo 424 del CPC', modeloEfectivo: MODELO_SONNET, maxTokens: 2500 };
    expect(aplicarRutaRapida({ ...base, mode: 'analisis', overrideCliente: null })).toEqual({ modelo: MODELO_HAIKU, maxTokens: 800, rutaRapida: 'TEXTO_LITERAL' });
    expect(aplicarRutaRapida({ ...base, mode: 'documento', overrideCliente: null }).modelo).toBe(MODELO_SONNET);
    expect(aplicarRutaRapida({ ...base, mode: 'analisis', overrideCliente: MODELO_SONNET }).modelo).toBe(MODELO_SONNET);
  });
});

describe('POST simulado — ruta rápida y estados de progreso', () => {
  it('texto literal de un artículo → Haiku, sin thinking, tope 800', async () => {
    mockDependencias([cpc424], () => [cpc424]);
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(fakeReq({ messages: [{ role: 'user', content: '¿Qué dice el artículo 424 del Código Procesal Civil?' }], mode: 'analisis' }));
    await leerSSE(res);
    expect(llamadasModelo.length).toBe(1);
    const params = llamadasModelo[0][0] as { model: string; max_tokens: number; thinking?: unknown };
    expect(params.model).toBe(MODELO_HAIKU);
    expect(params.thinking).toBeUndefined();
    expect(params.max_tokens).toBeLessThanOrEqual(800);
  });

  it('consulta de análisis → sigue en Sonnet con thinking', async () => {
    mockDependencias([], (coleccion) => (coleccion.includes('procedimental') ? [procesalDivorcio] : [civilDivorcio]));
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(fakeReq({ messages: [{ role: 'user', content: 'Según la ley sobre el divorcio, ¿qué procede?' }], mode: 'analisis' }));
    await leerSSE(res);
    const params = llamadasModelo[0][0] as { model: string; thinking?: unknown };
    expect(params.model).toBe(MODELO_SONNET);
    expect(params.thinking).toBeDefined();
  });

  it('emite «redactando» antes de la salida y «verificando» antes del texto validado', async () => {
    mockDependencias([], (coleccion) => (coleccion.includes('procedimental') ? [procesalDivorcio] : [civilDivorcio]));
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(fakeReq({ messages: [{ role: 'user', content: 'Según la ley sobre el divorcio, ¿qué procede?' }], mode: 'analisis' }));
    const eventos = await leerSSE(res);
    const tipos = eventos.map((e) => (e.type === 'status' ? `status:${e.etapa}` : e.type));
    const iRedactando = tipos.indexOf('status:redactando');
    const iVerificando = tipos.indexOf('status:verificando');
    const iTexto = tipos.indexOf('text');
    expect(iRedactando).toBeGreaterThanOrEqual(0);
    expect(iVerificando).toBeGreaterThan(iRedactando);
    expect(iTexto).toBeGreaterThan(iVerificando);
    expect(eventos.filter((e) => e.type === 'status').every((e) => typeof e.texto === 'string' && e.texto.length > 0)).toBe(true);
    expect(tipos.at(-1)).toBe('done');
  });
});
