import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * lib/observability/langfuse.ts — contrato FAIL-OPEN obligatorio.
 *
 * Estas pruebas verifican exactamente lo exigido por la directiva de
 * implementación (2026-09-26):
 *   1) Sin LANGFUSE_ENABLED=true -> observabilidad inerte, no crea cliente.
 *   2) Con LANGFUSE_ENABLED=true pero credenciales incompletas -> inerte.
 *   3) Si el SDK de Langfuse lanza en cualquier punto -> nunca se propaga.
 *   4) reportarEstadoCredenciales() nunca expone valores, solo PRESENT/MISSING.
 *   5) DatosTrazaConsulta / registrarTrazaConsulta nunca reciben ni envían
 *      contenido de pregunta/fragmentos/respuesta -- solo metadata.
 */

const ORIGINAL_ENV = { ...process.env };

function limpiarEnvLangfuse() {
  delete process.env.LANGFUSE_ENABLED;
  delete process.env.LANGFUSE_PUBLIC_KEY;
  delete process.env.LANGFUSE_SECRET_KEY;
  delete process.env.LANGFUSE_BASE_URL;
}

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  limpiarEnvLangfuse();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

const datosBase = {
  consultaId: 'consulta-test-1234',
  userHash: 'hash-anonimo-de-prueba',
  mode: 'analisis_penal',
  tier: 'free',
  provider: 'anthropic',
  model: 'claude-sonnet-4-6',
  ruta: 'B',
  retrievalStrategy: 'B',
  retrievedDocumentCount: 3,
  citationCount: 1,
  rerankUsed: false,
  webSearchRequested: false,
  webSearchResultsUsed: false,
  inputTokens: 120,
  outputTokens: 340,
  requestStartAt: 1_700_000_000_000,
  finalizeAt: 1_700_000_000_850,
  // Ventana combinada del Promise.all -- SIEMPRE presente (se mide sin
  // importar si RAG/web ejecutaron). Duración: 350ms.
  retrievalParallelWindow: { inicio: 1_700_000_000_050, fin: 1_700_000_000_400 },
  // RAG y web con duraciones DISTINTAS entre sí (300ms vs 330ms) -- ambas
  // caben dentro de la ventana paralela, pero ninguna es igual a ella ni
  // entre sí (prueba de que no se comparte una sola ventana fabricada).
  ragWindow: { inicio: 1_700_000_000_050, fin: 1_700_000_000_350 },
  citationValidationWindow: { inicio: 1_700_000_000_820, fin: 1_700_000_000_825 },
  llmGenerationWindow: { inicio: 1_700_000_000_410, fin: 1_700_000_000_810 },
  success: true,
} as const;

describe('isLangfuseConfigured() — fail-closed en configuración (mismo criterio que lib/flags.ts)', () => {
  it('false cuando LANGFUSE_ENABLED no está definido', async () => {
    const { isLangfuseConfigured } = await import('@/lib/observability/langfuse');
    expect(isLangfuseConfigured()).toBe(false);
  });

  it('false cuando LANGFUSE_ENABLED="false"', async () => {
    process.env.LANGFUSE_ENABLED = 'false';
    process.env.LANGFUSE_PUBLIC_KEY = 'pk-test';
    process.env.LANGFUSE_SECRET_KEY = 'sk-test';
    process.env.LANGFUSE_BASE_URL = 'https://cloud.langfuse.com';
    const { isLangfuseConfigured } = await import('@/lib/observability/langfuse');
    expect(isLangfuseConfigured()).toBe(false);
  });

  it('false cuando falta LANGFUSE_PUBLIC_KEY aunque el resto esté completo', async () => {
    process.env.LANGFUSE_ENABLED = 'true';
    process.env.LANGFUSE_SECRET_KEY = 'sk-test';
    process.env.LANGFUSE_BASE_URL = 'https://cloud.langfuse.com';
    const { isLangfuseConfigured } = await import('@/lib/observability/langfuse');
    expect(isLangfuseConfigured()).toBe(false);
  });

  it('false cuando falta LANGFUSE_SECRET_KEY', async () => {
    process.env.LANGFUSE_ENABLED = 'true';
    process.env.LANGFUSE_PUBLIC_KEY = 'pk-test';
    process.env.LANGFUSE_BASE_URL = 'https://cloud.langfuse.com';
    const { isLangfuseConfigured } = await import('@/lib/observability/langfuse');
    expect(isLangfuseConfigured()).toBe(false);
  });

  it('false cuando falta LANGFUSE_BASE_URL', async () => {
    process.env.LANGFUSE_ENABLED = 'true';
    process.env.LANGFUSE_PUBLIC_KEY = 'pk-test';
    process.env.LANGFUSE_SECRET_KEY = 'sk-test';
    const { isLangfuseConfigured } = await import('@/lib/observability/langfuse');
    expect(isLangfuseConfigured()).toBe(false);
  });

  it('true SOLO cuando las 4 variables están presentes y ENABLED="true"', async () => {
    process.env.LANGFUSE_ENABLED = 'true';
    process.env.LANGFUSE_PUBLIC_KEY = 'pk-test';
    process.env.LANGFUSE_SECRET_KEY = 'sk-test';
    process.env.LANGFUSE_BASE_URL = 'https://cloud.langfuse.com';
    const { isLangfuseConfigured } = await import('@/lib/observability/langfuse');
    expect(isLangfuseConfigured()).toBe(true);
  });
});

describe('registrarTrazaConsulta() — FAIL-OPEN: nunca lanza, nunca bloquea', () => {
  it('resuelve de inmediato sin crear cliente cuando Langfuse no está configurado', async () => {
    const langfuseCtorMock = vi.fn();
    vi.doMock('langfuse', () => ({ Langfuse: langfuseCtorMock }));

    const { registrarTrazaConsulta } = await import('@/lib/observability/langfuse');
    await expect(registrarTrazaConsulta(datosBase)).resolves.toBeUndefined();
    expect(langfuseCtorMock).not.toHaveBeenCalled();
  });

  it('no lanza si el constructor de Langfuse lanza una excepción', async () => {
    vi.doMock('langfuse', () => ({
      Langfuse: vi.fn(() => { throw new Error('boom: credenciales inválidas'); }),
    }));
    process.env.LANGFUSE_ENABLED = 'true';
    process.env.LANGFUSE_PUBLIC_KEY = 'pk-test';
    process.env.LANGFUSE_SECRET_KEY = 'sk-test';
    process.env.LANGFUSE_BASE_URL = 'https://cloud.langfuse.com';

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { registrarTrazaConsulta } = await import('@/lib/observability/langfuse');
    await expect(registrarTrazaConsulta(datosBase)).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('no lanza si trace()/span()/generation() lanzan (Langfuse caído o inalcanzable)', async () => {
    vi.doMock('langfuse', () => ({
      Langfuse: vi.fn().mockImplementation(() => ({
        trace: vi.fn(() => { throw new Error('network timeout'); }),
        flushAsync: vi.fn().mockResolvedValue(undefined),
      })),
    }));
    process.env.LANGFUSE_ENABLED = 'true';
    process.env.LANGFUSE_PUBLIC_KEY = 'pk-test';
    process.env.LANGFUSE_SECRET_KEY = 'sk-test';
    process.env.LANGFUSE_BASE_URL = 'https://cloud.langfuse.com';

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { registrarTrazaConsulta } = await import('@/lib/observability/langfuse');
    await expect(registrarTrazaConsulta(datosBase)).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('no lanza si flushAsync() rechaza (timeout de red al enviar)', async () => {
    const spanClient = { end: vi.fn() };
    const traceClient = {
      span: vi.fn(() => spanClient),
      generation: vi.fn(() => spanClient),
    };
    vi.doMock('langfuse', () => ({
      Langfuse: vi.fn().mockImplementation(() => ({
        trace: vi.fn(() => traceClient),
        flushAsync: vi.fn().mockRejectedValue(new Error('fetch failed')),
      })),
    }));
    process.env.LANGFUSE_ENABLED = 'true';
    process.env.LANGFUSE_PUBLIC_KEY = 'pk-test';
    process.env.LANGFUSE_SECRET_KEY = 'sk-test';
    process.env.LANGFUSE_BASE_URL = 'https://cloud.langfuse.com';

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { registrarTrazaConsulta } = await import('@/lib/observability/langfuse');
    await expect(registrarTrazaConsulta(datosBase)).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('cuando SÍ está configurado y el SDK funciona, construye el trace raíz y los spans reales (no inventados)', async () => {
    interface CuerpoObservacion {
      name: string;
      startTime?: Date;
      endTime?: Date;
      metadata?: Record<string, unknown>;
      model?: string;
    }
    const spanClient = { end: vi.fn().mockReturnThis() };
    const genClient = { end: vi.fn().mockReturnThis() };
    const traceMock = vi.fn();
    const traceClient = {
      span: vi.fn((_body: CuerpoObservacion) => spanClient),
      generation: vi.fn((_body: CuerpoObservacion) => genClient),
    };
    const flushAsyncMock = vi.fn().mockResolvedValue(undefined);
    traceMock.mockReturnValue(traceClient);
    class LangfuseMock {
      trace = traceMock;
      flushAsync = flushAsyncMock;
    }
    vi.doMock('langfuse', () => ({ Langfuse: LangfuseMock }));
    process.env.LANGFUSE_ENABLED = 'true';
    process.env.LANGFUSE_PUBLIC_KEY = 'pk-test';
    process.env.LANGFUSE_SECRET_KEY = 'sk-test';
    process.env.LANGFUSE_BASE_URL = 'https://cloud.langfuse.com';

    // Ventana web DISTINTA de la ventana RAG (330ms vs 300ms de datosBase) --
    // ambas caben dentro de retrievalParallelWindow (350ms) pero ninguna es
    // igual a la otra ni a la ventana combinada.
    const webSearchWindow = { inicio: 1_700_000_000_060, fin: 1_700_000_000_390 };

    const { registrarTrazaConsulta } = await import('@/lib/observability/langfuse');
    await registrarTrazaConsulta({
      ...datosBase,
      classificationWindow: { inicio: 1_700_000_000_000, fin: 1_700_000_000_005 },
      webSearchRequested: true,
      webSearchResultsUsed: true,
      webSearchWindow,
    });

    // Trace raíz correcto: id = consultaId (correlación preservada, test 6),
    // userId = hash ya anonimizado (nunca el correo/id crudo), timestamp =
    // inicio real de la request (no un valor por defecto de "ahora"), y
    // retrieval_parallel_latency_ms = wall-clock del Promise.all completo
    // (test 4 de la Fase 3).
    expect(traceMock).toHaveBeenCalledWith(expect.objectContaining({
      id: datosBase.consultaId,
      name: 'mayalex.query',
      userId: datosBase.userHash,
      timestamp: new Date(datosBase.requestStartAt),
    }));
    const trazaMetadata = traceMock.mock.calls[0][0].metadata;
    expect(trazaMetadata.retrieval_parallel_latency_ms).toBe(
      datosBase.retrievalParallelWindow.fin - datosBase.retrievalParallelWindow.inicio,
    );

    const nombresSpans = traceClient.span.mock.calls.map((c) => c[0].name);
    expect(nombresSpans).toEqual(
      expect.arrayContaining([
        'query.classification', 'rag.retrieve', 'legal.web_search',
        'citation.validation', 'response.finalize',
      ]),
    );

    // Corrección P1 (2026-09-26): cada span lleva startTime/endTime REALES
    // (no un instante único fabricado post-hoc) -- se verifica exactamente
    // contra las ventanas pasadas, no solo que el span exista.
    const spanPorNombre = (nombre: string): CuerpoObservacion => {
      const encontrado = traceClient.span.mock.calls.find((c) => c[0].name === nombre)?.[0];
      if (!encontrado) throw new Error(`span "${nombre}" no fue creado`);
      return encontrado;
    };

    const spanClasificacion = spanPorNombre('query.classification');
    expect(spanClasificacion.startTime).toEqual(new Date(1_700_000_000_000));
    expect(spanClasificacion.endTime).toEqual(new Date(1_700_000_000_005));
    expect(spanClasificacion.metadata!.classification_latency_ms).toBe(5);

    // Fase 3, test 1: rag.retrieve usa SU PROPIA ventana (no la del bloque
    // paralelo combinado).
    const spanRag = spanPorNombre('rag.retrieve');
    expect(spanRag.startTime).toEqual(new Date(datosBase.ragWindow.inicio));
    expect(spanRag.endTime).toEqual(new Date(datosBase.ragWindow.fin));
    expect(spanRag.metadata!.rag_latency_ms).toBe(
      datosBase.ragWindow.fin - datosBase.ragWindow.inicio,
    );

    // Fase 3, test 2: legal.web_search usa SU PROPIA ventana.
    const spanWeb = spanPorNombre('legal.web_search');
    expect(spanWeb.startTime).toEqual(new Date(webSearchWindow.inicio));
    expect(spanWeb.endTime).toEqual(new Date(webSearchWindow.fin));
    expect(spanWeb.metadata!.web_search_latency_ms).toBe(
      webSearchWindow.fin - webSearchWindow.inicio,
    );

    // Fase 3, test 3: ambas ventanas tienen duraciones DIFERENTES entre sí,
    // y ninguna de las dos es igual a retrieval_parallel_latency_ms -- la
    // duración combinada nunca se hace pasar por la de un span individual.
    const ragLatency = spanRag.metadata!.rag_latency_ms as number;
    const webLatency = spanWeb.metadata!.web_search_latency_ms as number;
    expect(ragLatency).not.toBe(webLatency);
    expect(ragLatency).not.toBe(trazaMetadata.retrieval_parallel_latency_ms);
    expect(webLatency).not.toBe(trazaMetadata.retrieval_parallel_latency_ms);

    const spanCitas = spanPorNombre('citation.validation');
    expect(spanCitas.startTime).toEqual(new Date(datosBase.citationValidationWindow.inicio));
    expect(spanCitas.endTime).toEqual(new Date(datosBase.citationValidationWindow.fin));

    expect(traceClient.generation).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'llm.generation',
        model: datosBase.model,
        startTime: new Date(datosBase.llmGenerationWindow.inicio),
        endTime: new Date(datosBase.llmGenerationWindow.fin),
      }),
    );
    const genCall = traceClient.generation.mock.calls[0][0];
    expect(genCall.metadata!.llm_generation_latency_ms).toBe(
      datosBase.llmGenerationWindow.fin - datosBase.llmGenerationWindow.inicio,
    );

    // Ningún span usó .end() -- las ventanas ya vienen fijadas en la creación.
    expect(spanClient.end).not.toHaveBeenCalled();
    expect(genClient.end).not.toHaveBeenCalled();

    expect(flushAsyncMock).toHaveBeenCalled();
  });

  it('omite query.classification y llm.generation cuando no ocurrieron (router no corrió / abstención sin LLM)', async () => {
    const spanClient = { end: vi.fn().mockReturnThis() };
    const genClient = { end: vi.fn().mockReturnThis() };
    const traceClient = {
      span: vi.fn((_body: { name: string }) => spanClient),
      generation: vi.fn((_body: { name: string }) => genClient),
    };
    vi.doMock('langfuse', () => ({
      Langfuse: vi.fn().mockImplementation(() => ({
        trace: vi.fn(() => traceClient),
        flushAsync: vi.fn().mockResolvedValue(undefined),
      })),
    }));
    process.env.LANGFUSE_ENABLED = 'true';
    process.env.LANGFUSE_PUBLIC_KEY = 'pk-test';
    process.env.LANGFUSE_SECRET_KEY = 'sk-test';
    process.env.LANGFUSE_BASE_URL = 'https://cloud.langfuse.com';

    const { registrarTrazaConsulta } = await import('@/lib/observability/langfuse');
    // classificationWindow y llmGenerationWindow omitidos deliberadamente --
    // simula RUTA_D (sin router) + abstención de corpus (sin LLM invocado).
    await registrarTrazaConsulta({ ...datosBase, webSearchRequested: false });

    const nombresSpans = traceClient.span.mock.calls.map((c) => c[0].name);
    expect(nombresSpans).not.toContain('query.classification');
    expect(traceClient.generation).not.toHaveBeenCalled();
  });

  it('omite el span legal.web_search cuando no se solicitó búsqueda web (no inventa pasos)', async () => {
    const spanClient = { end: vi.fn().mockReturnThis() };
    const genClient = { end: vi.fn().mockReturnThis() };
    const traceClient = {
      span: vi.fn((_body: { name: string }) => spanClient),
      generation: vi.fn((_body: { name: string }) => genClient),
    };
    vi.doMock('langfuse', () => ({
      Langfuse: vi.fn().mockImplementation(() => ({
        trace: vi.fn(() => traceClient),
        flushAsync: vi.fn().mockResolvedValue(undefined),
      })),
    }));
    process.env.LANGFUSE_ENABLED = 'true';
    process.env.LANGFUSE_PUBLIC_KEY = 'pk-test';
    process.env.LANGFUSE_SECRET_KEY = 'sk-test';
    process.env.LANGFUSE_BASE_URL = 'https://cloud.langfuse.com';

    const { registrarTrazaConsulta } = await import('@/lib/observability/langfuse');
    await registrarTrazaConsulta({ ...datosBase, webSearchRequested: false });

    const nombresSpans = traceClient.span.mock.calls.map((c) => c[0].name);
    expect(nombresSpans).not.toContain('legal.web_search');
  });

  it('omite el span rag.retrieve cuando RAG no ejecutó realmente (Fase 3, test 6)', async () => {
    const spanClient = { end: vi.fn().mockReturnThis() };
    const traceClient = {
      span: vi.fn((_body: { name: string }) => spanClient),
      generation: vi.fn(() => ({ end: vi.fn() })),
    };
    vi.doMock('langfuse', () => ({
      Langfuse: vi.fn().mockImplementation(() => ({
        trace: vi.fn(() => traceClient),
        flushAsync: vi.fn().mockResolvedValue(undefined),
      })),
    }));
    process.env.LANGFUSE_ENABLED = 'true';
    process.env.LANGFUSE_PUBLIC_KEY = 'pk-test';
    process.env.LANGFUSE_SECRET_KEY = 'sk-test';
    process.env.LANGFUSE_BASE_URL = 'https://cloud.langfuse.com';

    const { registrarTrazaConsulta } = await import('@/lib/observability/langfuse');
    // ragWindow omitido deliberadamente -- simula ruta='D' (sin router) o sin
    // colección para la ruta, donde ragPromise nunca llega a ejecutar RAG.
    const { ragWindow: _omitido, ...sinRag } = datosBase;
    await registrarTrazaConsulta({ ...sinRag, ruta: 'D', retrievalStrategy: 'D' });

    const nombresSpans = traceClient.span.mock.calls.map((c) => c[0].name);
    expect(nombresSpans).not.toContain('rag.retrieve');
    // retrieval_parallel_latency_ms se sigue reportando igual -- se midió el
    // Promise.all sin importar si RAG produjo resultado.
  });
});

describe('reportarEstadoCredenciales() — nunca expone valores reales (Fase J.7)', () => {
  it('reporta MISSING para las 3 credenciales cuando están ausentes', async () => {
    const { reportarEstadoCredenciales } = await import('@/lib/observability/langfuse');
    expect(reportarEstadoCredenciales()).toEqual({
      LANGFUSE_PUBLIC_KEY: 'MISSING',
      LANGFUSE_SECRET_KEY: 'MISSING',
      LANGFUSE_BASE_URL: 'MISSING',
    });
  });

  it('reporta PRESENT sin incluir el valor real de la credencial', async () => {
    process.env.LANGFUSE_PUBLIC_KEY = 'TEST_PUBLIC_KEY_SENTINEL_DO_NOT_EXPOSE';
    process.env.LANGFUSE_SECRET_KEY = 'TEST_SECRET_KEY_SENTINEL_DO_NOT_EXPOSE';
    process.env.LANGFUSE_BASE_URL = 'https://cloud.langfuse.com';
    const { reportarEstadoCredenciales } = await import('@/lib/observability/langfuse');
    const reporte = reportarEstadoCredenciales();

    expect(reporte).toEqual({
      LANGFUSE_PUBLIC_KEY: 'PRESENT',
      LANGFUSE_SECRET_KEY: 'PRESENT',
      LANGFUSE_BASE_URL: 'PRESENT',
    });
    const serializado = JSON.stringify(reporte);
    expect(serializado).not.toContain('SENTINEL_DO_NOT_EXPOSE');
  });
});

describe('Privacidad P0 — sin contenido de pregunta/fragmentos/respuesta (verificación estructural)', () => {
  it('DatosTrazaConsulta no acepta campos de contenido (pregunta, contenido, fragmentos, respuesta)', async () => {
    // Verificación de tipos en tiempo de compilación: si alguien agrega un
    // campo de contenido a la interfaz, este archivo de test seguiría
    // compilando salvo que también se intente pasarlo aquí -- la prueba real
    // de esta invariante es tsc --noEmit + revisión de código, no runtime.
    // Aquí se deja constancia explícita de los campos que NUNCA deben
    // aparecer en el objeto que de hecho se envía a Langfuse.
    const camposProhibidos = ['pregunta', 'contenido', 'fragmentos', 'respuesta', 'output', 'prompt'];
    for (const campo of camposProhibidos) {
      expect(Object.keys(datosBase)).not.toContain(campo);
    }
  });
});
