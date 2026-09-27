import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

/**
 * Fase 1E.3C — Preview Auth diagnosis. Cubre la parte de /auth/callback que
 * las pruebas existentes de sanitizeNextPath (tests/auth-callback.test.ts,
 * tests/auth-redirect.test.ts) no ejercitan: el propio handler GET, el
 * intercambio de código por sesión (exchangeCodeForSession) y su manejo de
 * fallos — sin fugar el detalle del error de Supabase al cliente.
 */

function fakeRequest(url: string): NextRequest {
  return { url } as unknown as NextRequest;
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.doUnmock('@/lib/supabase-ssr');
  vi.restoreAllMocks();
});

describe('/auth/callback GET — intercambio de sesión', () => {
  it('sin parámetro code → redirige a /login?error=link_invalido en el mismo origin, sin llamar a Supabase', async () => {
    const exchangeMock = vi.fn();
    vi.doMock('@/lib/supabase-ssr', () => ({
      createSupabaseServerClient: async () => ({ auth: { exchangeCodeForSession: exchangeMock } }),
    }));
    const { GET } = await import('@/app/auth/callback/route');

    const res = await GET(fakeRequest('https://preview-abc.vercel.app/auth/callback?next=/chat'));

    expect(exchangeMock).not.toHaveBeenCalled();
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.headers.get('location')).toBe('https://preview-abc.vercel.app/login?error=link_invalido');
  });

  it('code presente pero exchangeCodeForSession falla → redirige a login genérico, sin fugar el mensaje de error de Supabase', async () => {
    vi.doMock('@/lib/supabase-ssr', () => ({
      createSupabaseServerClient: async () => ({
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({
            error: { message: 'PKCE code verifier mismatch — proyecto Supabase distinto al que emitió el enlace' },
          }),
        },
      }),
    }));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { GET } = await import('@/app/auth/callback/route');

    const res = await GET(fakeRequest('https://preview-abc.vercel.app/auth/callback?code=un-codigo&next=/chat'));

    const location = res.headers.get('location') ?? '';
    expect(location).toBe('https://preview-abc.vercel.app/login?error=link_invalido');
    expect(location).not.toContain('PKCE');
    expect(location).not.toContain('proyecto Supabase');
    // El detalle sí se registra server-side para diagnóstico, nunca en la respuesta al cliente.
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('code presente y exchange exitoso → redirige al mismo origin + next saneado (nunca a un origin distinto)', async () => {
    vi.doMock('@/lib/supabase-ssr', () => ({
      createSupabaseServerClient: async () => ({
        auth: { exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }) },
      }),
    }));
    const { GET } = await import('@/app/auth/callback/route');

    const res = await GET(fakeRequest('https://preview-abc.vercel.app/auth/callback?code=valido&next=/pricing'));

    expect(res.headers.get('location')).toBe('https://preview-abc.vercel.app/pricing');
  });

  it('exchange exitoso pero next apunta a un origin externo → el open redirect se rechaza, cae a /chat en el origin real', async () => {
    vi.doMock('@/lib/supabase-ssr', () => ({
      createSupabaseServerClient: async () => ({
        auth: { exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }) },
      }),
    }));
    const { GET } = await import('@/app/auth/callback/route');

    const res = await GET(fakeRequest('https://preview-abc.vercel.app/auth/callback?code=valido&next=https://evil.com'));

    expect(res.headers.get('location')).toBe('https://preview-abc.vercel.app/chat');
  });
});
