import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DOCUMENT_AUTH_ERROR, DOCUMENT_QUOTA_ERROR } from '@/lib/documents/upload-rules';

const getUser = vi.fn();
const resolveAccess = vi.fn();
const getStatus = vi.fn();

async function freshHelper() {
  vi.resetModules();
  vi.doMock('@/lib/rate-limit', () => ({
    getUserIdentifierVerificado: getUser,
    getRateLimitStatus: getStatus,
  }));
  vi.doMock('@/lib/paypal/access', () => ({
    resolveCurrentAccess: resolveAccess,
  }));
  return import('@/lib/paypal/document-analysis');
}

beforeEach(() => {
  vi.clearAllMocks();
  getStatus.mockResolvedValue({ used: 0, limit: 3, tier: 'free', resetAt: '' });
});

describe('resolveDocumentAnalysisAccess', () => {
  it('rechaza identidad por IP — hay que iniciar sesión', async () => {
    getUser.mockResolvedValue('ip:1.2.3.4');
    const { resolveDocumentAnalysisAccess } = await freshHelper();
    const decision = await resolveDocumentAnalysisAccess({} as Request);
    expect(decision).toEqual({
      ok: false,
      status: 401,
      error: DOCUMENT_AUTH_ERROR,
      code: 'AUTH_REQUIRED',
    });
    expect(resolveAccess).not.toHaveBeenCalled();
    expect(getStatus).not.toHaveBeenCalled();
  });

  it('permite Académico autenticado', async () => {
    getUser.mockResolvedValue('email:alumno@ejemplo.com');
    resolveAccess.mockResolvedValue({ canAnalyzeDocuments: true });
    getStatus.mockResolvedValue({ used: 2, limit: 20, tier: 'academico', resetAt: '' });
    const { resolveDocumentAnalysisAccess } = await freshHelper();
    const decision = await resolveDocumentAnalysisAccess({} as Request);
    expect(decision).toEqual({
      ok: true,
      userIdentifier: 'email:alumno@ejemplo.com',
    });
  });

  it('permite free autenticado con cuota restante', async () => {
    getUser.mockResolvedValue('email:free@ejemplo.com');
    resolveAccess.mockResolvedValue({ canAnalyzeDocuments: true });
    getStatus.mockResolvedValue({ used: 1, limit: 3, tier: 'free', resetAt: '' });
    const { resolveDocumentAnalysisAccess } = await freshHelper();
    const decision = await resolveDocumentAnalysisAccess({} as Request);
    expect(decision).toEqual({
      ok: true,
      userIdentifier: 'email:free@ejemplo.com',
    });
  });

  it('permite Profesional autenticado', async () => {
    getUser.mockResolvedValue('email:abogado@ejemplo.com');
    resolveAccess.mockResolvedValue({ canAnalyzeDocuments: true });
    getStatus.mockResolvedValue({ used: 10, limit: 1000, tier: 'pro', resetAt: '' });
    const { resolveDocumentAnalysisAccess } = await freshHelper();
    const decision = await resolveDocumentAnalysisAccess({} as Request);
    expect(decision).toEqual({
      ok: true,
      userIdentifier: 'email:abogado@ejemplo.com',
    });
  });

  it('rechaza con 429 QUOTA_EXCEEDED si la cuota del día ya está agotada (sin incrementar)', async () => {
    getUser.mockResolvedValue('email:free@ejemplo.com');
    resolveAccess.mockResolvedValue({ canAnalyzeDocuments: true });
    getStatus.mockResolvedValue({ used: 3, limit: 3, tier: 'free', resetAt: '' });
    const { resolveDocumentAnalysisAccess } = await freshHelper();
    const decision = await resolveDocumentAnalysisAccess({} as Request);
    expect(decision).toEqual({
      ok: false,
      status: 429,
      error: DOCUMENT_QUOTA_ERROR,
      code: 'QUOTA_EXCEEDED',
    });
    expect(getStatus).toHaveBeenCalledTimes(1);
  });
});
