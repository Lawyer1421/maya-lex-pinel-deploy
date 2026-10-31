import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * WAR ROOM FINAL — Tarea 1: fail-closed EN CÓDIGO, no solo en el system
 * prompt. Antes de este cambio, cuando la recuperación devolvía cero
 * fragmentos válidos, el chat igual invocaba al LLM sin contexto RAG — el
 * modelo podía (y lo hizo, en la Prueba 3 del hotfix anterior) responder con
 * un análisis jurídico detallado desde su propio conocimiento paramétrico,
 * sin ningún respaldo documental. Estas pruebas verifican la decisión
 * determinista en app/api/chat/route.ts: si la consulta exige evidencia del
 * corpus y no hay fragmentos válidos, el LLM NUNCA se invoca.
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
    // after() requiere contexto de request real de Next.js — fuera de eso
    // lanza. En la prueba unitaria basta con ejecutar el callback en línea.
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
    checkAndIncrementRateLimit: vi.fn().mockResolvedValue({
      allowed: true, remaining: 2, tier: 'free', resetAt: new Date().toISOString(),
    }),
    RateLimitStoreError: class RateLimitStoreError extends Error { code = 'STORE_ERROR'; },
    esFalloProveedorQueDevuelveCuota: () => false,
    esFalloOpenRouterQueDevuelveCuota: () => false,
    getUserIdentifierVerificado: vi.fn().mockResolvedValue('ip:test'),
    getVerifiedEmail: vi.fn().mockResolvedValue(null),
    getUserIdentifier: vi.fn().mockReturnValue('ip:test'),
    buildUserIdentifierFromEmail: (e: string) => `email:${e.trim().toLowerCase()}`,
  }));

  // flag_rerank OFF por default (Decisión C) — el chat corta por similitud
  // pgvector. Fase 1E.2: `flagsHabilitados` permite que un test específico
  // active flag_official_source_fallback sin afectar el default OFF de todos
  // los demás tests (y de Production/Preview reales -- ver lib/flags.ts).
  vi.doMock('@/lib/flags', () => ({
    isFlagEnabledForUser: vi.fn().mockImplementation(async (flagName: string) => flagsHabilitados.includes(flagName)),
  }));

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

  anthropicCreateMock = vi.fn().mockImplementation(async () => fakeClaudeStream('Respuesta simulada del modelo. El artículo 173 del Código Procesal Penal contiene un texto limpio de prueba.'));
  vi.doMock('@anthropic-ai/sdk', () => {
    class MockAPIError extends Error {}
    class MockAnthropic {
      messages = { create: (...args: unknown[]) => anthropicCreateMock(...args) };
      static APIError = MockAPIError;
    }
    return { default: MockAnthropic };
  });
}

async function mockBuscarRAG(resultado: {
  fragmentos: unknown[]; articulos_encontrados: string[]; backend: 'supabase' | 'disabled'; ambiguo?: boolean;
  error?: string; outcome?: Record<string, unknown>;
}) {
  vi.doMock('@/lib/rag/search', async () => {
    const actual = await vi.importActual<typeof import('@/lib/rag/search')>('@/lib/rag/search');
    return { ...actual, buscarRAG: vi.fn().mockResolvedValue(resultado) };
  });
}

function fakeSupabaseVacio() {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    then: (resolve: (v: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null }),
  };
  return { from: vi.fn(() => chain) };
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
  return raw
    .split('\n\n')
    .filter((chunk) => chunk.startsWith('data: '))
    .map((chunk) => JSON.parse(chunk.slice('data: '.length)));
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

describe('POST /api/chat — fail-closed de evidencia de corpus (WAR ROOM FINAL, Tarea 1)', () => {
  it('A. consulta semántica penal + cero fragmentos → abstención determinista, LLM NO invocado', async () => {
    mockDependenciasComunes();
    await mockBuscarRAG({ fragmentos: [], articulos_encontrados: [], backend: 'supabase' });
    const { POST } = await import('@/app/api/chat/route');

    const res = await POST(fakeReq({
      messages: [{ role: 'user', content: 'Explica las medidas cautelares personales aplicables en el proceso penal hondureño.' }],
      mode: 'analisis_penal',
    }));
    const eventos = await leerSSE(res);
    const doneEvt = eventos.find((e) => e.type === 'done');

    expect(doneEvt.citas).toEqual([]);
    expect(doneEvt.codigo).toBe('CORPUS_EVIDENCE_NOT_FOUND');
    expect(anthropicCreateMock).not.toHaveBeenCalled();
  });

  it('B. "según el corpus" + cero fragmentos (modo sala, sin router) → abstención determinista', async () => {
    mockDependenciasComunes();
    await mockBuscarRAG({ fragmentos: [], articulos_encontrados: [], backend: 'supabase' });
    const { POST } = await import('@/app/api/chat/route');

    const res = await POST(fakeReq({
      messages: [{ role: 'user', content: 'Según el corpus, ¿qué garantías tiene el imputado durante la detención?' }],
      mode: 'sala_penal',
    }));
    const eventos = await leerSSE(res);
    const doneEvt = eventos.find((e) => e.type === 'done');

    expect(doneEvt.citas).toEqual([]);
    expect(doneEvt.codigo).toBe('CORPUS_EVIDENCE_NOT_FOUND');
    expect(anthropicCreateMock).not.toHaveBeenCalled();
  });

  it('C. Art. 9999 CPP → abstención, citas vacías, sin embedding semántico posterior', async () => {
    mockDependenciasComunes();
    vi.doMock('@/lib/supabase', () => ({ createServerSupabaseClient: () => fakeSupabaseVacio() }));
    const embedQueryMock = vi.fn().mockResolvedValue(new Array(384).fill(0.01));
    vi.doMock('@/lib/rag/embed', () => ({ embedQuery: embedQueryMock }));
    process.env.RAG_BACKEND = 'supabase';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-key';

    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(fakeReq({
      messages: [{ role: 'user', content: 'Cita el artículo 9999 del Código Procesal Penal de Honduras' }],
      mode: 'analisis_penal',
    }));
    const eventos = await leerSSE(res);
    const doneEvt = eventos.find((e) => e.type === 'done');

    expect(doneEvt.citas).toEqual([]);
    expect(doneEvt.codigo).toBe('CORPUS_EVIDENCE_NOT_FOUND');
    expect(embedQueryMock).not.toHaveBeenCalled();
    expect(anthropicCreateMock).not.toHaveBeenCalled();
  });

  it('D. consulta con fragmentos válidos → flujo normal, LLM invocado, citas preservadas', async () => {
    mockDependenciasComunes();
    const fragmentoValido = {
      id: 'f1', contenido: 'ARTICULO 173.- Texto limpio de prueba.', num_articulo: '173',
      fuente: 'Codigo Procesal Penal', relevancia: 0.95, fuente_tipo: 'codigo',
      jurisdiccion: 'HN', es_norma_vigente: true, hash: 'abcd1234',
    };
    await mockBuscarRAG({ fragmentos: [fragmentoValido], articulos_encontrados: ['173'], backend: 'supabase' });
    const { POST } = await import('@/app/api/chat/route');

    const res = await POST(fakeReq({
      messages: [{ role: 'user', content: 'Explica el artículo 173 del Código Procesal Penal de Honduras' }],
      mode: 'analisis_penal',
    }));
    const eventos = await leerSSE(res);
    const doneEvt = eventos.find((e) => e.type === 'done');

    expect(anthropicCreateMock).toHaveBeenCalled();
    expect(doneEvt.citas).toHaveLength(1);
    expect(doneEvt.citas[0].hash).toBe('abcd1234');
    expect(doneEvt.codigo).toBeUndefined();
  });

  describe('A-2 (decisión CLO): el chat principal aplica R3 igual que Luna, sin ruta de evasión', () => {
    const frag173 = {
      id: 'f1', contenido: 'ARTICULO 173.- Las medidas cautelares personales proceden cuando existan indicios racionales de participación.', num_articulo: '173',
      fuente: 'Codigo Procesal Penal', relevancia: 0.95, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, hash: 'abcd1234',
    };
    const correr = async (respuestaModelo: string) => {
      mockDependenciasComunes();
      anthropicCreateMock = vi.fn().mockImplementation(async () => fakeClaudeStream(respuestaModelo));
      await mockBuscarRAG({ fragmentos: [frag173], articulos_encontrados: ['173'], backend: 'supabase' });
      const { POST } = await import('@/app/api/chat/route');
      const res = await POST(fakeReq({
        messages: [{ role: 'user', content: 'Explica el artículo 173 del Código Procesal Penal de Honduras' }],
        mode: 'analisis_penal',
      }));
      const eventos = await leerSSE(res);
      return { eventos, texto: eventos.filter((e) => e.type === 'text').map((e) => e.text).join(''), done: eventos.find((e) => e.type === 'done') };
    };
    it('respuesta que nombra el instrumento y el artículo y se funda en el fragmento: se entrega con SOLO la cita validada', async () => {
      const { texto, done } = await correr('Según el artículo 173 del Código Procesal Penal, las medidas cautelares personales proceden cuando existan indicios racionales de participación.');
      expect(texto).toContain('medidas cautelares personales proceden');
      expect(done.citas).toHaveLength(1);
      expect(done.codigo).toBeUndefined();
    });
    it('respuesta sin nombrar la fuente: abstención que dice qué falta, sin citas, y la consulta no consume cuota', async () => {
      const { texto, done } = await correr('Las medidas cautelares personales proceden cuando existan indicios racionales de participación del imputado.');
      expect(texto).toContain('Lo que falta para poder responder');
      expect(texto).not.toContain('proceden cuando existan indicios');
      expect(done.citas).toEqual([]);
      expect(done.codigo).toBe('R3_SUFICIENCIA_NO_ACREDITADA');
    });
    it('respuesta que cita el artículo pero afirma algo que el texto no dice: abstención', async () => {
      const { texto, done } = await correr('Según el artículo 173 del Código Procesal Penal, el imputado puede recusar al juez por parcialidad manifiesta.');
      expect(texto).toContain('Lo que falta para poder responder');
      expect(done.codigo).toBe('R3_SUFICIENCIA_NO_ACREDITADA');
    });
  });

  describe('A-2b / D-1 (re-auditoría): R4 en rutas con corpus y retención de la ruta D', () => {
    const frag173 = {
      id: 'f1', contenido: 'ARTICULO 173.- Las medidas cautelares personales proceden cuando existan indicios racionales de participación.', num_articulo: '173',
      fuente: 'Codigo Procesal Penal', relevancia: 0.95, fuente_tipo: 'codigo', jurisdiccion: 'HN', es_norma_vigente: true, hash: 'abcd1234',
    };
    const correr = async (modo: string, pregunta: string, respuestaModelo: string, fragmentos: unknown[] = []) => {
      mockDependenciasComunes();
      anthropicCreateMock = vi.fn().mockImplementation(async () => fakeClaudeStream(respuestaModelo));
      await mockBuscarRAG({ fragmentos, articulos_encontrados: fragmentos.length ? ['173'] : [], backend: 'supabase' });
      const { POST } = await import('@/app/api/chat/route');
      const res = await POST(fakeReq({ messages: [{ role: 'user', content: pregunta }], mode: modo }));
      const eventos = await leerSSE(res);
      return { eventos, texto: eventos.filter((e) => e.type === 'text').map((e) => e.text).join(''), done: eventos.find((e) => e.type === 'done') };
    };
    const valido = 'Según el artículo 173 del Código Procesal Penal, las medidas cautelares personales proceden cuando existan indicios racionales de participación.';

    it('A-2b: un párrafo válido del art. 173 CPP más «el artículo 999 del Código Penal establece la pena de muerte» → abstención, nunca la respuesta', async () => {
      const { texto, done } = await correr('analisis_penal', 'Explica el artículo 173 del Código Procesal Penal de Honduras', `${valido}\n\nEl artículo 999 del Código Penal establece la pena de muerte.`, [frag173]);
      expect(texto).toContain('Lo que falta para poder responder');
      expect(texto).not.toContain('pena de muerte');
      expect(texto).not.toContain('medidas cautelares personales proceden');
      expect(done.codigo).toBe('R3_SUFICIENCIA_NO_ACREDITADA');
      expect(done.citas).toEqual([]);
    });
    it('A-2b: una respuesta con una oración sin respaldo y sin mención de norma sale SIN esa oración', async () => {
      const { texto, done } = await correr('analisis_penal', 'Explica el artículo 173 del Código Procesal Penal de Honduras', `${valido}\n\nAdemás, toda persona merece respeto durante cualquier proceso judicial.`, [frag173]);
      expect(texto).toContain('medidas cautelares personales proceden');
      expect(texto).not.toContain('merece respeto');
      expect(done.citas).toHaveLength(1);
    });
    it('D-1: sala_penal «Según el artículo 173 del CPP…» sin fragmentos → abstención que dice qué falta (no se transmite)', async () => {
      const { texto, done } = await correr('sala_penal', 'Hola, cuéntame sobre la prisión preventiva', 'Según el artículo 173 del CPP, la prisión preventiva procede con indicios racionales de participación.');
      expect(texto).toContain('Lo que falta para poder responder');
      expect(texto).not.toContain('prisión preventiva procede');
      expect(done.codigo).toBe('R3_SUFICIENCIA_NO_ACREDITADA');
      expect(done.citas).toEqual([]);
    });
    it('D-1: sala_penal con una respuesta general sin citas se entrega íntegra', async () => {
      const t = 'En una audiencia conviene llegar con anticipación, llevar los documentos organizados y escuchar con atención.';
      const { texto, done } = await correr('sala_penal', 'Hola, ¿qué consejos me das para una audiencia?', t);
      expect(texto).toBe(t);
      expect(done.codigo).toBeUndefined();
    });
    it.each([
      'Según el Arto. 173, la prisión preventiva procede con indicios racionales de participación.',
      'El plazo para apelar es de tres días contados desde la notificación.',
      'Según el D.L. 130-2017 se regula esa materia de manera especial.',
      'La ley de municipalidades fija el procedimiento para obtener ese permiso.',
    ])('D-1 (auditoría 3): la ruta D se abstiene ante mención normativa sin fragmento: %s', async (respuesta) => {
      const { texto, done } = await correr('sala_penal', 'Hola, cuéntame sobre el tema', respuesta);
      expect(texto).toContain('Lo que falta para poder responder');
      expect(done.codigo).toBe('R3_SUFICIENCIA_NO_ACREDITADA');
      expect(done.citas).toEqual([]);
    });
    it('D-1: la ruta D ya no transmite token a token: el texto llega en un único evento al final', async () => {
      const { eventos } = await correr('sala_ia', 'Hola, ¿cómo estás hoy?', 'Hola, estoy bien. ¿En qué puedo ayudarte hoy con tu consulta?');
      expect(eventos.filter((e) => e.type === 'text')).toHaveLength(1);
    });
  });

  it('E. la abstención no expone reglas internas, system prompt ni configuración', async () => {
    mockDependenciasComunes();
    await mockBuscarRAG({ fragmentos: [], articulos_encontrados: [], backend: 'supabase' });
    const { POST } = await import('@/app/api/chat/route');

    const res = await POST(fakeReq({
      messages: [{ role: 'user', content: 'Según el corpus, explica las medidas cautelares personales en el proceso penal.' }],
      mode: 'analisis_penal',
    }));
    const eventos = await leerSSE(res);
    const textoCompleto = eventos.filter((e) => e.type === 'text').map((e) => e.text).join('');

    const TERMINOS_PROHIBIDOS = [
      /system prompt/i, /prohibici[oó]n(es)? absoluta/i, /\bruta_[abcd]\b/i,
      /CLAUDE_CONFIG/i, /coleccionPrincipal/i, /materiaFiltro/i, /ANTHROPIC_API_KEY/i,
    ];
    for (const re of TERMINOS_PROHIBIDOS) {
      expect(textoCompleto).not.toMatch(re);
    }
    expect(textoCompleto).toContain('No se recuperaron fragmentos verificables del corpus');
  });
});

/**
 * Fase 1D — MAYALEX_RETRIEVAL_RUNTIME_CONTRACT.md. CASE 4/5 de la directiva:
 * cuando el propio sistema no pudo consultar las fuentes (configuración o
 * fallo de infraestructura), el mensaje al usuario debe ser explícitamente
 * distinto de "no se encontró la norma" -- nunca debe sonar a que el derecho
 * no existe cuando en realidad MayaLex no pudo ni intentarlo de forma
 * confiable. CASE 2/3 (cubiertas arriba) conservan el mensaje histórico sin
 * cambio.
 */
describe('POST /api/chat — Fase 1D: CASE 4/5 (fallo de sistema != evidencia cero)', () => {
  it('CASE 4. outcome.state=CONFIGURATION_ERROR -> mensaje distinto de la abstención genérica, código=CONFIGURATION_ERROR', async () => {
    mockDependenciasComunes();
    await mockBuscarRAG({
      fragmentos: [], articulos_encontrados: [], backend: 'disabled',
      outcome: { state: 'CONFIGURATION_ERROR', evidenceCount: 0, exactAttempted: false, semanticAttempted: false, degraded: false, errorCategory: 'CONFIGURATION', errorCode: 'RAG_DISABLED' },
    });
    const { POST } = await import('@/app/api/chat/route');

    const res = await POST(fakeReq({
      messages: [{ role: 'user', content: 'Explica las medidas cautelares personales aplicables en el proceso penal hondureño.' }],
      mode: 'analisis_penal',
    }));
    const eventos = await leerSSE(res);
    const doneEvt = eventos.find((e) => e.type === 'done');
    const textoCompleto = eventos.filter((e) => e.type === 'text').map((e) => e.text).join('');

    expect(textoCompleto).toContain('No fue posible consultar temporalmente la biblioteca jurídica');
    expect(textoCompleto).not.toContain('No se recuperaron fragmentos verificables del corpus');
    expect(doneEvt.codigo).toBe('CONFIGURATION_ERROR');
    expect(anthropicCreateMock).not.toHaveBeenCalled();
  });

  it('CASE 5. outcome.state=RETRIEVAL_ERROR -> mensaje distinto de la abstención genérica, código=RETRIEVAL_ERROR', async () => {
    mockDependenciasComunes();
    await mockBuscarRAG({
      fragmentos: [], articulos_encontrados: [], backend: 'supabase', error: 'Supabase RAG error: connection timeout',
      outcome: { state: 'RETRIEVAL_ERROR', evidenceCount: 0, exactAttempted: false, semanticAttempted: true, degraded: false, errorCategory: 'DATABASE', errorCode: 'DATABASE_RETRIEVAL_FAILED' },
    });
    const { POST } = await import('@/app/api/chat/route');

    const res = await POST(fakeReq({
      messages: [{ role: 'user', content: 'Explica las medidas cautelares personales aplicables en el proceso penal hondureño.' }],
      mode: 'analisis_penal',
    }));
    const eventos = await leerSSE(res);
    const doneEvt = eventos.find((e) => e.type === 'done');
    const textoCompleto = eventos.filter((e) => e.type === 'text').map((e) => e.text).join('');

    expect(textoCompleto).toContain('No fue posible completar la consulta de las fuentes jurídicas');
    expect(textoCompleto).not.toContain('No se recuperaron fragmentos verificables del corpus');
    // El mensaje de error crudo de Supabase NUNCA llega al usuario.
    expect(textoCompleto).not.toContain('connection timeout');
    expect(doneEvt.codigo).toBe('RETRIEVAL_ERROR');
    expect(anthropicCreateMock).not.toHaveBeenCalled();
  });

  it('CASE 2 sigue igual: outcome.state=NO_VERIFIED_EVIDENCE -> mensaje histórico sin cambio (regresión)', async () => {
    mockDependenciasComunes();
    await mockBuscarRAG({
      fragmentos: [], articulos_encontrados: [], backend: 'supabase',
      outcome: { state: 'NO_VERIFIED_EVIDENCE', evidenceCount: 0, exactAttempted: true, semanticAttempted: false, degraded: false },
    });
    const { POST } = await import('@/app/api/chat/route');

    const res = await POST(fakeReq({
      messages: [{ role: 'user', content: 'Cita el artículo 9999 del Código Procesal Penal de Honduras' }],
      mode: 'analisis_penal',
    }));
    const eventos = await leerSSE(res);
    const doneEvt = eventos.find((e) => e.type === 'done');
    const textoCompleto = eventos.filter((e) => e.type === 'text').map((e) => e.text).join('');

    expect(textoCompleto).toContain('No se recuperaron fragmentos verificables del corpus');
    expect(doneEvt.codigo).toBe('CORPUS_EVIDENCE_NOT_FOUND');
  });

  it('I/J. sala_ia y sala_penal con consulta ordinaria (sin "según el corpus") -> NOT_REQUIRED, LLM invocado sin abstención', async () => {
    mockDependenciasComunes();
    // D-1: en la ruta D la respuesta se retiene; una respuesta general sin normas concretas se entrega.
    anthropicCreateMock = vi.fn().mockImplementation(async () => fakeClaudeStream('Una audiencia es el acto en que las partes exponen sus argumentos ante el juez.'));
    // buscarRAG NUNCA debería llamarse para modos sala (usarRouter=false) --
    // se mockea igual, pero el propio test falla si SÍ se invoca de forma
    // inesperada, porque devolvería fragmentos:[] y dispararía abstención.
    await mockBuscarRAG({ fragmentos: [], articulos_encontrados: [], backend: 'disabled' });
    const { POST } = await import('@/app/api/chat/route');

    for (const mode of ['sala_ia', 'sala_penal'] as const) {
      const res = await POST(fakeReq({
        messages: [{ role: 'user', content: 'Hola, ¿me puedes explicar en términos generales qué es una audiencia?' }],
        mode,
      }));
      const eventos = await leerSSE(res);
      const doneEvt = eventos.find((e) => e.type === 'done');
      expect(doneEvt.codigo).toBeUndefined();
    }
    expect(anthropicCreateMock).toHaveBeenCalledTimes(2);
  });
});

/**
 * Fase 1E.2 — MAYALEX_RETRIEVAL_RUNTIME_CONTRACT.md / directiva "OFFICIAL
 * FALLBACK RUNTIME WIRING". Tests A/B del matrix de la directiva, a nivel de
 * ruta completa (POST real) -- la decisión pura ya está cubierta
 * exhaustivamente en tests/official-fallback-orchestrator.test.ts (C-L).
 * Aquí solo se prueba que route.ts efectivamente respeta el flag y usa el
 * mensaje/código correctos end-to-end.
 */
describe('POST /api/chat — Fase 1E.2: wiring de fallback oficial (tests A/B)', () => {
  const FORM_PAGE_HTML = `<html><body>
    <input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="VS1" />
    <input type="hidden" name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="G1" />
    <input type="hidden" name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="EV1" />
  </body></html>`;
  const RESULTS_HTML_CON_FILAS = `<table id="ContentPlaceHolder1_dgvDocumentos">
    <tr><th>ID</th><th>Nombre</th><th>Fecha</th><th></th></tr>
    <tr><td>9144</td><td>Código Penal Decreto 130-2017</td><td>18/1/2018</td><td><a href="Anexos/uuidCodigoPenal.pdf">Previsualizar</a></td></tr>
  </table>`;

  function htmlResponse(body: string, status = 200, headers: Record<string, string> = { 'content-type': 'text/html' }) {
    return new Response(body, { status, headers });
  }

  it('A. flag OFF + OFFICIAL_FALLBACK_REQUIRED -> abstención actual preservada, CERO llamada de red externa', async () => {
    mockDependenciasComunes(); // sin flags habilitados -- default real de Production/Preview
    await mockBuscarRAG({
      fragmentos: [], articulos_encontrados: [], backend: 'supabase',
      outcome: { state: 'OFFICIAL_FALLBACK_REQUIRED', evidenceCount: 0, exactAttempted: false, semanticAttempted: true, degraded: false },
    });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(fakeReq({
      messages: [{ role: 'user', content: 'Explícame los presupuestos para imponer una medida cautelar penal en Honduras.' }],
      mode: 'analisis_penal',
    }));
    const eventos = await leerSSE(res);
    const doneEvt = eventos.find((e) => e.type === 'done');
    const textoCompleto = eventos.filter((e) => e.type === 'text').map((e) => e.text).join('');

    expect(textoCompleto).toContain('No se recuperaron fragmentos verificables del corpus');
    expect(doneEvt.codigo).toBe('CORPUS_EVIDENCE_NOT_FOUND');
    expect(anthropicCreateMock).not.toHaveBeenCalled();
    // Invariante central del test A: con el flag apagado, CEDIJ nunca se
    // consulta -- cero peticiones de red, sin importar el estado de retrieval.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('B. flag ON + OFFICIAL_FALLBACK_REQUIRED + CEDIJ SUCCESS -> metadata oficial reconocida, mensaje distinto', async () => {
    mockDependenciasComunes(['flag_official_source_fallback']);
    await mockBuscarRAG({
      fragmentos: [], articulos_encontrados: [], backend: 'supabase',
      outcome: { state: 'OFFICIAL_FALLBACK_REQUIRED', evidenceCount: 0, exactAttempted: false, semanticAttempted: true, degraded: false },
    });
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(htmlResponse(FORM_PAGE_HTML))
      .mockResolvedValueOnce(htmlResponse(RESULTS_HTML_CON_FILAS)));

    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(fakeReq({
      messages: [{ role: 'user', content: 'Explícame los presupuestos para imponer una medida cautelar penal en Honduras.' }],
      mode: 'analisis_penal',
    }));
    const eventos = await leerSSE(res);
    const doneEvt = eventos.find((e) => e.type === 'done');
    const textoCompleto = eventos.filter((e) => e.type === 'text').map((e) => e.text).join('');

    expect(textoCompleto).toContain('MayaLex localizó una fuente oficial relacionada en CEDIJ');
    expect(textoCompleto).toContain('Código Penal Decreto 130-2017');
    expect(textoCompleto).not.toContain('No se recuperaron fragmentos verificables del corpus');
    expect(textoCompleto).not.toContain('NORMA VIGENTE HONDURAS');
    expect(doneEvt.codigo).toBe('OFFICIAL_SOURCE_FOUND_METADATA_ONLY');
    expect(anthropicCreateMock).not.toHaveBeenCalled();
  });
});
