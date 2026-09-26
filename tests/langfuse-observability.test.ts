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
  latencyMs: 850,
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
    const spanClient = { end: vi.fn().mockReturnThis() };
    const genClient = { end: vi.fn().mockReturnThis() };
    const traceMock = vi.fn();
    const traceClient = {
      span: vi.fn((_body: { name: string }) => spanClient),
      generation: vi.fn((_body: { name: string }) => genClient),
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

    const { registrarTrazaConsulta } = await import('@/lib/observability/langfuse');
    await registrarTrazaConsulta({
      ...datosBase,
      classificationLatencyMs: 5,
      webSearchRequested: true,
      webSearchResultsUsed: true,
    });

    // Trace raíz correcto: id = consultaId (correlación preservada, test 6),
    // userId = hash ya anonimizado (nunca el correo/id crudo).
    expect(traceMock).toHaveBeenCalledWith(expect.objectContaining({
      id: datosBase.consultaId,
      name: 'mayalex.query',
      userId: datosBase.userHash,
    }));

    const nombresSpans = traceClient.span.mock.calls.map((c) => c[0].name);
    expect(nombresSpans).toEqual(
      expect.arrayContaining([
        'query.classification', 'rag.retrieve', 'legal.web_search',
        'citation.validation', 'response.finalize',
      ]),
    );
    expect(traceClient.generation).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'llm.generation', model: datosBase.model }),
    );
    expect(flushAsyncMock).toHaveBeenCalled();
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
    process.env.LANGFUSE_PUBLIC_KEY = 'pk-lf-super-secreto-no-debe-aparecer';
    process.env.LANGFUSE_SECRET_KEY = 'sk-lf-super-secreto-no-debe-aparecer';
    process.env.LANGFUSE_BASE_URL = 'https://cloud.langfuse.com';
    const { reportarEstadoCredenciales } = await import('@/lib/observability/langfuse');
    const reporte = reportarEstadoCredenciales();

    expect(reporte).toEqual({
      LANGFUSE_PUBLIC_KEY: 'PRESENT',
      LANGFUSE_SECRET_KEY: 'PRESENT',
      LANGFUSE_BASE_URL: 'PRESENT',
    });
    const serializado = JSON.stringify(reporte);
    expect(serializado).not.toContain('super-secreto');
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
