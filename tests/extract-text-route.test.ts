import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DOCUMENT_AUTH_ERROR, DOCUMENT_QUOTA_ERROR, DOCUMENT_SIZE_ERROR } from '@/lib/documents/upload-rules';

const resolveAccess = vi.fn();

function fakeFile(name: string, content: string, size?: number): File {
  const file = new File([content], name, { type: 'text/plain' });
  if (typeof size === 'number') {
    Object.defineProperty(file, 'size', { value: size });
  }
  return file;
}

function fakeReq(file: File | null, formDataThrows = false) {
  return {
    formData: async () => {
      if (formDataThrows) throw new Error('bad body');
      const fd = new FormData();
      if (file) fd.append('file', file);
      return fd;
    },
    headers: { get: () => null },
  } as any;
}

async function freshRoute() {
  vi.resetModules();
  vi.doMock('@/lib/paypal/document-analysis', () => ({
    resolveDocumentAnalysisAccess: resolveAccess,
  }));
  return import('@/app/api/extract-text/route');
}

beforeEach(() => {
  vi.clearAllMocks();
  resolveAccess.mockResolvedValue({ ok: true, userIdentifier: 'email:x@y.com' });
});

describe('POST /api/extract-text — gate de sesión, cuota y archivo', () => {
  it('401 AUTH_REQUIRED si no hay sesión', async () => {
    resolveAccess.mockResolvedValue({
      ok: false, status: 401, error: DOCUMENT_AUTH_ERROR, code: 'AUTH_REQUIRED',
    });
    const { POST } = await freshRoute();
    const res = await POST(fakeReq(fakeFile('a.txt', 'hola')));
    const data = await res.json();
    expect(res.status).toBe(401);
    expect(data.code).toBe('AUTH_REQUIRED');
    expect(data.error).toBe(DOCUMENT_AUTH_ERROR);
  });

  it('429 QUOTA_EXCEEDED si el helper reporta cuota agotada (no incrementa aquí)', async () => {
    resolveAccess.mockResolvedValue({
      ok: false, status: 429, error: DOCUMENT_QUOTA_ERROR, code: 'QUOTA_EXCEEDED',
    });
    const { POST } = await freshRoute();
    const res = await POST(fakeReq(fakeFile('a.txt', 'hola')));
    const data = await res.json();
    expect(res.status).toBe(429);
    expect(data.code).toBe('QUOTA_EXCEEDED');
    expect(data.error).toBe(DOCUMENT_QUOTA_ERROR);
  });

  it('400 FILE_FORMAT si la extensión no es PDF/DOCX/TXT', async () => {
    const { POST } = await freshRoute();
    const res = await POST(fakeReq(fakeFile('scan.png', 'xx')));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.code).toBe('FILE_FORMAT');
    expect(data.error).toMatch(/png/i);
  });

  it('413 FILE_TOO_LARGE si supera 4 MB', async () => {
    const { POST } = await freshRoute();
    const res = await POST(fakeReq(fakeFile('grande.txt', 'x', 4 * 1024 * 1024 + 1)));
    const data = await res.json();
    expect(res.status).toBe(413);
    expect(data.code).toBe('FILE_TOO_LARGE');
    expect(data.error).toBe(DOCUMENT_SIZE_ERROR);
  });

  it('usuario autenticado (cualquier plan) puede extraer un TXT', async () => {
    const { POST } = await freshRoute();
    const res = await POST(fakeReq(fakeFile('notas.txt', 'Artículo 294 CPP')));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.text).toContain('Artículo 294');
    expect(data.filename).toBe('notas.txt');
  });
});
