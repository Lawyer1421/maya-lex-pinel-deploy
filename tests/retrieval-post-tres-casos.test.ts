import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * POST simulado con los tres casos de cierre. Se capturan el system prompt que
 * llegaría al modelo y el evento final con sus citas. Se comprueba que la
 * evidencia enviada (system) y la citada (done.citas) coinciden. Sin red ni
 * credenciales. Verifica el texto enviado, no la conducta de un modelo real.
 */

const ORIGINAL_ENV = { ...process.env };

const FUENTE_CIVIL = 'Código Civil de Honduras (Decreto del Poder Ejecutivo del 8 de febrero de 1906)';
const FUENTE_CPC = 'Codigo Procesal Civil';
const FUENTE_PENAL = 'Codigo Penal';
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

/** Fuentes que el system prompt enviado muestra como "Fuente documental". */
function fuentesEnSystem(system: string): string[] {
  return [...system.matchAll(/^Fuente documental: (.+)$/gm)].map((m) => m[1]);
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

describe('POST simulado — tres casos de cierre', () => {
  it('1. NONE con pase procedimental: el system prompt enviado contiene la evidencia principal y la procedimental, y coincide con lo citado', async () => {
    mockDependencias([], (coleccion) => (coleccion.includes('procedimental') ? [procesalDivorcio] : [civilDivorcio]));
    const { POST } = await import('@/app/api/chat/route');

    const res = await POST(fakeReq({
      messages: [{ role: 'user', content: 'Según la ley sobre el divorcio, ¿qué procede?' }],
      mode: 'analisis',
    }));
    const eventos = await leerSSE(res);
    const done = eventos.find((e) => e.type === 'done');

    expect(llamadasModelo.length).toBe(1);
    const system = (llamadasModelo[0][0] as { system: string }).system;
    const enviadas = fuentesEnSystem(system);
    expect(system).toContain('CONSULTA TEMÁTICA');
    expect(enviadas).toContain(FUENTE_CIVIL);
    expect(enviadas).toContain(FUENTE_CPC); // pase procedimental (RUTA C)
    expect(enviadas.some((f) => /divorcio/i.test(f))).toBe(false);
    // Lo citado es lo enviado
    for (const cita of done.citas as { fuente: string }[]) expect(enviadas).toContain(cita.fuente);
  });

  it('2. instrumento específico con evidencia: "Según el Código Civil" envía su fuente real, sin aviso temático', async () => {
    mockDependencias([], () => [civilDivorcio]);
    const { POST } = await import('@/app/api/chat/route');

    const res = await POST(fakeReq({
      messages: [{ role: 'user', content: 'Según el Código Civil, ¿qué dispone sobre el divorcio?' }],
      mode: 'analisis',
    }));
    const eventos = await leerSSE(res);
    const done = eventos.find((e) => e.type === 'done');

    expect(llamadasModelo.length).toBe(1);
    const system = (llamadasModelo[0][0] as { system: string }).system;
    expect(system).not.toContain('CONSULTA TEMÁTICA');
    expect(fuentesEnSystem(system)).toEqual([FUENTE_CIVIL]);
    // SPECIFIC conserva su pie original
    expect(system).toContain('Usar exclusivamente');
    for (const cita of done.citas as { fuente: string }[]) expect(fuentesEnSystem(system)).toContain(cita.fuente);
  });

  it('3. comparación de artículos con ambos instrumentos: el system prompt envía el artículo de cada uno', async () => {
    mockDependencias([penal173, comercio173], () => []);
    const { POST } = await import('@/app/api/chat/route');

    const res = await POST(fakeReq({
      messages: [{ role: 'user', content: 'Artículo 173 del Código Penal y del Código de Comercio' }],
      mode: 'analisis',
    }));
    const eventos = await leerSSE(res);
    const done = eventos.find((e) => e.type === 'done');

    expect(llamadasModelo.length).toBe(1);
    const system = (llamadasModelo[0][0] as { system: string }).system;
    const enviadas = fuentesEnSystem(system);
    expect(enviadas).toContain(FUENTE_PENAL);
    expect(enviadas).toContain(FUENTE_COMERCIO);
    for (const cita of done.citas as { fuente: string }[]) expect(enviadas).toContain(cita.fuente);
  });

  it('3b. comparación con un artículo sólo en uno de los instrumentos: no se completa, no se llama al modelo', async () => {
    const comercio12 = { ...comercio173, id: 'comercio-12', num_articulo: '12', contenido: 'Artículo 12. Texto.' };
    mockDependencias([penal173], () => [comercio12]);
    const { POST } = await import('@/app/api/chat/route');

    const res = await POST(fakeReq({
      messages: [{ role: 'user', content: 'Artículo 173 del Código Penal y del Código de Comercio' }],
      mode: 'analisis',
    }));
    const eventos = await leerSSE(res);
    const done = eventos.find((e) => e.type === 'done');

    expect(done.codigo).toBe('CORPUS_EVIDENCE_NOT_FOUND');
    expect(llamadasModelo.length).toBe(0);
  });
  it('4. identificador verificado sin nombre: ninguna fuente incompatible llega al modelo ni a las citas', async () => {
    const codigoPenal = { ...penal173, id: 'penal-decreto', contenido: 'Artículo 1. Principio de legalidad del Código Penal.', num_articulo: '1' };
    mockDependencias([], () => [civilDivorcio, codigoPenal]);
    const { POST } = await import('@/app/api/chat/route');

    const res = await POST(fakeReq({
      messages: [{ role: 'user', content: 'Según el decreto 130-2017, ¿qué dispone?' }],
      mode: 'analisis',
    }));
    const eventos = await leerSSE(res);
    const done = eventos.find((e) => e.type === 'done');

    expect(llamadasModelo.length).toBe(1);
    const system = (llamadasModelo[0][0] as { system: string }).system;
    const enviadas = fuentesEnSystem(system);
    expect(enviadas).toContain(FUENTE_PENAL);
    expect(enviadas.some((f) => f === FUENTE_CIVIL)).toBe(false);
    expect(system).not.toMatch(/Fuente documental: Código Civil/);
    for (const cita of done.citas as { fuente: string }[]) {
      expect(cita.fuente).not.toBe(FUENTE_CIVIL);
      expect(enviadas).toContain(cita.fuente);
    }
  });
});
