import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DOCUMENT_AUTH_ERROR, DOCUMENT_PLAN_ERROR } from '@/lib/documents/upload-rules';

const getUser = vi.fn();
const resolveAccess = vi.fn();

async function freshHelper() {
  vi.resetModules();
  vi.doMock('@/lib/rate-limit', () => ({
    getUserIdentifierVerificado: getUser,
  }));
  vi.doMock('@/lib/paypal/access', () => ({
    resolveCurrentAccess: resolveAccess,
  }));
  return import('@/lib/paypal/document-analysis');
}

beforeEach(() => {
  vi.clearAllMocks();
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
  });

  it('rechaza Académico / free aunque esté autenticado', async () => {
    getUser.mockResolvedValue('email:alumno@ejemplo.com');
    resolveAccess.mockResolvedValue({ canAnalyzeDocuments: false });
    const { resolveDocumentAnalysisAccess } = await freshHelper();
    const decision = await resolveDocumentAnalysisAccess({} as Request);
    expect(decision).toEqual({
      ok: false,
      status: 403,
      error: DOCUMENT_PLAN_ERROR,
      code: 'PLAN_REQUIRED',
    });
  });

  it('permite Profesional autenticado (queries_log pro O PayPal active+pro)', async () => {
    getUser.mockResolvedValue('email:abogado@ejemplo.com');
    resolveAccess.mockResolvedValue({ canAnalyzeDocuments: true });
    const { resolveDocumentAnalysisAccess } = await freshHelper();
    const decision = await resolveDocumentAnalysisAccess({} as Request);
    expect(decision).toEqual({
      ok: true,
      userIdentifier: 'email:abogado@ejemplo.com',
    });
  });
});
