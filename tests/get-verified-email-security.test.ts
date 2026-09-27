import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

/**
 * Fase 1E.3C — Preview Auth diagnosis. getVerifiedEmail(req) es la única
 * primitiva que decide qué correo "verificado" ve isFlagEnabledForUser()
 * para el targeting founder-only del canary. Estas pruebas cierran el
 * requisito de la directiva: demostrar que NUNCA confía en un header o
 * cuerpo suministrado por el llamante — solo en un access_token validado
 * server-side contra Supabase Auth (`auth.getUser`).
 */

const ORIGINAL_ENV = { ...process.env };

function fakeSupabaseAuth(getUserImpl: (token: string) => Promise<{ data: { user: { email: string | null } | null }; error: unknown }>) {
  return {
    createServerSupabaseClient: () => ({
      auth: { getUser: getUserImpl },
    }),
  };
}

beforeEach(() => {
  vi.resetModules();
  process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_SUPABASE_URL: 'https://aicakncgtuiiuomflkqj.supabase.co' };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.doUnmock('@/lib/supabase');
  vi.restoreAllMocks();
});

describe('getVerifiedEmail — nunca confía en identidad suministrada por el llamante', () => {
  it('sin header Authorization → null, sin llamar a Supabase', async () => {
    const getUserImpl = vi.fn();
    vi.doMock('@/lib/supabase', () => fakeSupabaseAuth(getUserImpl));
    const { getVerifiedEmail } = await import('@/lib/rate-limit');

    const req = new Request('https://x.test/api/chat', { method: 'POST' });
    const email = await getVerifiedEmail(req);

    expect(email).toBeNull();
    expect(getUserImpl).not.toHaveBeenCalled();
  });

  it('un header X-User-Email falsificado es ignorado por completo — no hay ningún código que lo lea', async () => {
    const getUserImpl = vi.fn();
    vi.doMock('@/lib/supabase', () => fakeSupabaseAuth(getUserImpl));
    const { getVerifiedEmail } = await import('@/lib/rate-limit');

    const req = new Request('https://x.test/api/chat', {
      method: 'POST',
      headers: { 'X-User-Email': 'atacante@evil.com', 'X-User-Id': 'admin' },
    });
    const email = await getVerifiedEmail(req);

    expect(email).toBeNull();
    expect(getUserImpl).not.toHaveBeenCalled();
  });

  it('Authorization presente pero sin prefijo "Bearer " → null, sin llamar a Supabase', async () => {
    const getUserImpl = vi.fn();
    vi.doMock('@/lib/supabase', () => fakeSupabaseAuth(getUserImpl));
    const { getVerifiedEmail } = await import('@/lib/rate-limit');

    const req = new Request('https://x.test/api/chat', {
      headers: { authorization: 'atacante@evil.com' },
    });
    const email = await getVerifiedEmail(req);

    expect(email).toBeNull();
    expect(getUserImpl).not.toHaveBeenCalled();
  });

  it('Bearer token inválido/expirado (Supabase responde error) → null, nunca el correo reclamado', async () => {
    vi.doMock('@/lib/supabase', () => fakeSupabaseAuth(async () => ({
      data: { user: null },
      error: { message: 'invalid JWT' },
    })));
    const { getVerifiedEmail } = await import('@/lib/rate-limit');

    const req = new Request('https://x.test/api/chat', {
      headers: { authorization: 'Bearer token-falsificado-o-robado' },
    });
    const email = await getVerifiedEmail(req);

    expect(email).toBeNull();
  });

  it('Bearer token válido → devuelve el correo verificado por Supabase Auth, normalizado', async () => {
    vi.doMock('@/lib/supabase', () => fakeSupabaseAuth(async (token: string) => {
      expect(token).toBe('token-real-de-sesion');
      return { data: { user: { email: '  Founder@MayaLexHN.com ' } }, error: null };
    }));
    const { getVerifiedEmail } = await import('@/lib/rate-limit');

    const req = new Request('https://x.test/api/chat', {
      headers: { authorization: 'Bearer token-real-de-sesion' },
    });
    const email = await getVerifiedEmail(req);

    expect(email).toBe('founder@mayalexhn.com');
  });

  it('Supabase no configurado (falta NEXT_PUBLIC_SUPABASE_URL) → null, nunca lanza', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const getUserImpl = vi.fn();
    vi.doMock('@/lib/supabase', () => fakeSupabaseAuth(getUserImpl));
    const { getVerifiedEmail } = await import('@/lib/rate-limit');

    const req = new Request('https://x.test/api/chat', {
      headers: { authorization: 'Bearer cualquier-token' },
    });
    const email = await getVerifiedEmail(req);

    expect(email).toBeNull();
    expect(getUserImpl).not.toHaveBeenCalled();
  });

  it('createServerSupabaseClient lanza (Supabase caído / mal configurado) → null, nunca propaga la excepción', async () => {
    vi.doMock('@/lib/supabase', () => ({
      createServerSupabaseClient: () => { throw new Error('Supabase no configurado. Revisa NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY'); },
    }));
    const { getVerifiedEmail } = await import('@/lib/rate-limit');

    const req = new Request('https://x.test/api/chat', {
      headers: { authorization: 'Bearer cualquier-token' },
    });

    await expect(getVerifiedEmail(req)).resolves.toBeNull();
  });
});
