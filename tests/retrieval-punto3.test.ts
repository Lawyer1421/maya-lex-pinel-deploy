import { clasificarIntencionInstrumental } from '@/lib/legal-retrieval/instrument-gate';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Punto 3 del CLO: casos institucionales y nominales. Clasificador y POST simulado
 * (sin red ni credenciales). Verifica el texto enviado al modelo, no su conducta.
 */

const ORIGINAL_ENV = { ...process.env };

type Fila = Record<string, unknown>;

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

const FUENTE_CPP = 'Código Procesal Penal de Honduras (Decreto 9-99-E)';
const FUENTE_CC = 'Código Civil de Honduras (Decreto del Poder Ejecutivo del 8 de febrero de 1906)';
const FUENTE_REGLAMENTO = 'Reglamento del Código del Notariado (Resolución PCSJ-17-2012, Gaceta 32,958 del 26-oct-2012)';
const FUENTE_CN = 'Código del Notariado de Honduras (Decreto 353-2005)';

const cppRecurso: Fila = {
  id: 'cpp-recursos', contenido: 'Artículo 400. Contra las resoluciones judiciales cabe el recurso de apelación ante el tribunal superior.',
  num_articulo: '400', fuente: FUENTE_CPP, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '01_PENAL', similarity: 0.9,
};
const ccDivorcio: Fila = {
  id: 'cc-divorcio', contenido: 'Artículo 1. El matrimonio se disuelve por divorcio, y la resolución de divorcio fija sus efectos.',
  num_articulo: '1', fuente: FUENTE_CC, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '02_CIVIL', similarity: 0.9,
};
const ccAcuerdo: Fila = {
  id: 'cc-acuerdo-organos', contenido: 'Artículo 7. Los acuerdos de los órganos colegiados se adoptan por mayoría de votos.',
  num_articulo: '7', fuente: FUENTE_CC, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '02_CIVIL', similarity: 0.85,
};
const cnArticulo: Fila = {
  id: 'cn-notario', contenido: 'Artículo 1. El notariado es la función pública que ejerce el notario.',
  num_articulo: '1', fuente: FUENTE_CN, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, materia: '03_NOTARIAL', similarity: 0.8,
};
const reglamentoArticulo: Fila = {
  id: 'reg-pcsj-1', contenido: 'Artículo 1. El presente Reglamento desarrolla el Código del Notariado.',
  num_articulo: '1', fuente: FUENTE_REGLAMENTO, fuente_tipo: 'reglamento', jurisdiccion: 'HN', es_norma_vigente: true, materia: '03_NOTARIAL', similarity: 0.9,
};

const INSTITUCIONALES = [
  '¿Qué dice la resolución de la CNBS?',
  '¿Qué dice el acuerdo del Consejo de Ministros?',
  '¿Qué establece el Acuerdo de Paz de Esquipulas?',
];

describe('clasificador — punto 3', () => {
  for (const q of INSTITUCIONALES) {
    it(`institucional/nominal → SPECIFIC_UNRESOLVED: ${q}`, () => {
      const i = clasificarIntencionInstrumental(q);
      expect(i.estado).toBe('SPECIFIC_UNRESOLVED');
      expect(i.identidades).toEqual([]);
    });
  }

  it('PCSJ-17-2012 → SPECIFIC_RESOLVED con REGLAMENTO_NOTARIADO', () => {
    const i = clasificarIntencionInstrumental('¿Qué dice la Resolución PCSJ-17-2012?');
    expect(i.estado).toBe('SPECIFIC_RESOLVED');
    expect(i.identidades).toEqual(['REGLAMENTO_NOTARIADO']);
  });

  // Precedencia: una mención cubierta por una identidad reconocida no genera una
  // referencia pendiente adicional; una referencia distinta sí conserva el conflicto.
  it('Resolución del Código del Notariado → SPECIFIC_RESOLVED [CODIGO_NOTARIADO]', () => {
    for (const q of ['¿Qué dice la resolución del Código del Notariado?', '¿Qué dice la Resolución del Código del Notariado?']) {
      const i = clasificarIntencionInstrumental(q);
      expect(i.estado).toBe('SPECIFIC_RESOLVED');
      expect(i.identidades).toEqual(['CODIGO_NOTARIADO']);
    }
  });

  it('Resolución del Código del Notariado de la CNBS → SPECIFIC_RESOLVED (V2: identidad conservada)', () => {
    const i = clasificarIntencionInstrumental('¿Qué dice la resolución del Código del Notariado de la CNBS?');
    // V2: «CNBS» sin clase de instrumento propia no activa el fixture; se conserva la identidad.
    expect(i.estado).toBe('SPECIFIC_RESOLVED');
    expect(i.identidades).toEqual(['CODIGO_NOTARIADO']);
  });

  it('acuerdo de la junta directiva → NONE', () => {
    expect(clasificarIntencionInstrumental('¿Qué validez tiene un acuerdo de la junta directiva?').estado).toBe('NONE');
  });

  // NAMED sin identidad verificada: 679-2014 no figura en el registro canónico,
  // así que no se resuelve a identidad y se declara ausente.
  it('Acuerdo Ejecutivo 679-2014 → SPECIFIC_UNRESOLVED (sin identidad verificada)', () => {
    const i = clasificarIntencionInstrumental('¿Qué establece el Acuerdo Ejecutivo 679-2014?');
    expect(i.estado).toBe('SPECIFIC_UNRESOLVED');
    expect(i.identidades).toEqual([]);
  });

  it('resolución de la Sala y resolución del juez siguen siendo NONE', () => {
    expect(clasificarIntencionInstrumental('¿Puedo apelar la resolución de la Sala?').estado).toBe('NONE');
    expect(clasificarIntencionInstrumental('¿Cómo impugnar la resolución del juez?').estado).toBe('NONE');
  });
});

describe('POST simulado — punto 3', () => {
  for (const q of INSTITUCIONALES) {
    it(`sin llamada al LLM ni contexto sustituto: ${q}`, async () => {
      mockDependencias([], () => [ccDivorcio, cppRecurso, ccAcuerdo]);
      const { POST } = await import('@/app/api/chat/route');
      const res = await POST(fakeReq({ messages: [{ role: 'user', content: q }], mode: 'analisis' }));
      const eventos = await leerSSE(res);
      const done = eventos.find((e) => e.type === 'done');

      expect(done?.codigo).toBe('CORPUS_EVIDENCE_NOT_FOUND');
      expect(llamadasModelo.length).toBe(0);
    });
  }

  it('Resolución del Código del Notariado: sólo fuentes del Código del Notariado, sin reglamento ni Civil', async () => {
    // El pase procedimental (RUTA_C) consulta otra colección: no debe repetir la norma normativa.
    mockDependencias([], (coleccion) => (coleccion === 'mayalex_procedimental' ? [] : [cnArticulo, reglamentoArticulo, ccDivorcio]));
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(fakeReq({ messages: [{ role: 'user', content: '¿Qué dice la resolución del Código del Notariado?' }], mode: 'analisis' }));
    await leerSSE(res);

    expect(llamadasModelo.length).toBe(1);
    const system = (llamadasModelo[0][0] as { system: string }).system;
    expect(fuentesEnSystem(system)).toEqual([FUENTE_CN]);
  });

  it('PCSJ-17-2012 con sólo el Código del Notariado en el corpus: se declara ausente, no se sustituye', async () => {
    mockDependencias([], () => [cnArticulo, ccDivorcio]);
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(fakeReq({ messages: [{ role: 'user', content: '¿Qué dice la Resolución PCSJ-17-2012?' }], mode: 'analisis' }));
    const eventos = await leerSSE(res);
    const done = eventos.find((e) => e.type === 'done');

    expect(done?.codigo).toBe('CORPUS_EVIDENCE_NOT_FOUND');
    expect(llamadasModelo.length).toBe(0);
  });

  it('PCSJ-17-2012 con el reglamento en el corpus: se usa el reglamento', async () => {
    // El pase procedimental (RUTA_C) consulta otra colección: no debe devolver la norma normativa.
    mockDependencias([], (coleccion) => (coleccion === 'mayalex_procedimental' ? [] : [reglamentoArticulo, cnArticulo]));
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(fakeReq({ messages: [{ role: 'user', content: '¿Qué dice la Resolución PCSJ-17-2012?' }], mode: 'analisis' }));
    await leerSSE(res);

    expect(llamadasModelo.length).toBe(1);
    const system = (llamadasModelo[0][0] as { system: string }).system;
    expect(fuentesEnSystem(system)).toEqual([FUENTE_REGLAMENTO]);
    expect(system).toContain('Usar exclusivamente');
  });

  it('acuerdo de la junta directiva: búsqueda temática con pie de NONE', async () => {
    mockDependencias([], () => [ccAcuerdo]);
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(fakeReq({ messages: [{ role: 'user', content: '¿Qué validez tiene un acuerdo de la junta directiva?' }], mode: 'analisis' }));
    await leerSSE(res);

    expect(llamadasModelo.length).toBe(1);
    const system = (llamadasModelo[0][0] as { system: string }).system;
    expect(fuentesEnSystem(system)).toContain(FUENTE_CC);
    expect(system).toContain('INSTRUCCIÓN (consulta temática)');
    expect(system).not.toContain('Usar exclusivamente');
  });

  it('Acuerdo Ejecutivo 679-2014 no encontrado: se declara ausente, sin fragmentos genéricos', async () => {
    mockDependencias([], () => [cnArticulo, ccDivorcio, cppRecurso]);
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(fakeReq({ messages: [{ role: 'user', content: '¿Qué establece el Acuerdo Ejecutivo 679-2014?' }], mode: 'analisis' }));
    const eventos = await leerSSE(res);
    const done = eventos.find((e) => e.type === 'done');

    expect(done?.codigo).toBe('CORPUS_EVIDENCE_NOT_FOUND');
    expect(llamadasModelo.length).toBe(0);
  });
});
