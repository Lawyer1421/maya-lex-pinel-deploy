import { describe, it, expect, vi, afterEach } from 'vitest';
import { sanitizeNextPath } from '@/app/auth/callback/route';

describe('sanitizeNextPath — previene open redirect vía el parámetro next', () => {
  it('null/vacío → /chat por defecto', () => {
    expect(sanitizeNextPath(null)).toBe('/chat');
    expect(sanitizeNextPath('')).toBe('/chat');
  });

  it('ruta interna normal → se conserva', () => {
    expect(sanitizeNextPath('/pricing')).toBe('/pricing');
    expect(sanitizeNextPath('/chat?mode=analisis')).toBe('/chat?mode=analisis');
  });

  it('URL absoluta con esquema → rechazada, cae a /chat', () => {
    expect(sanitizeNextPath('https://evil.com')).toBe('/chat');
    expect(sanitizeNextPath('http://evil.com/phish')).toBe('/chat');
  });

  it('protocolo-relativa (//host) → rechazada, cae a /chat', () => {
    expect(sanitizeNextPath('//evil.com')).toBe('/chat');
    expect(sanitizeNextPath('///evil.com')).toBe('/chat');
  });

  it('sin barra inicial → rechazada, cae a /chat', () => {
    expect(sanitizeNextPath('evil.com')).toBe('/chat');
    expect(sanitizeNextPath('chat')).toBe('/chat');
  });

  it('esquema embebido en medio de la ruta → rechazada', () => {
    expect(sanitizeNextPath('/redirect?to=https://evil.com')).toBe('/chat');
  });
});

describe('GET /auth/callback — sesión ya válida cuando el canje del código falla', () => {
  const montar = async (opts: { code: string | null; exchangeError: boolean; user: boolean; getUserError?: boolean; getUserThrows?: boolean }) => {
    vi.resetModules();
    const exchange = vi.fn(async () => ({ error: opts.exchangeError ? { message: 'PKCE code verifier not found in storage' } : null }));
    const getUser = vi.fn(async () => {
      if (opts.getUserThrows) throw new Error('red');
      return { data: { user: opts.user ? { id: 'u1' } : null }, error: opts.getUserError ? { message: 'invalid' } : null };
    });
    vi.doMock('@/lib/supabase-ssr', () => ({ createSupabaseServerClient: async () => ({ auth: { exchangeCodeForSession: exchange, getUser } }) }));
    const { GET } = await import('@/app/auth/callback/route');
    const q = new URLSearchParams({ next: '/chat' });
    if (opts.code) q.set('code', opts.code);
    const res = await GET(new Request(`https://mayalexhn.com/auth/callback?${q}`) as never);
    return { location: res.headers.get('location'), exchange, getUser };
  };
  afterEach(() => { vi.doUnmock('@/lib/supabase-ssr'); vi.restoreAllMocks(); });

  it('canje correcto → /chat (sin consultar la sesión previa)', async () => {
    const r = await montar({ code: 'abc', exchangeError: false, user: false });
    expect(r.location).toBe('https://mayalexhn.com/chat');
    expect(r.getUser).not.toHaveBeenCalled();
  });
  it('canje falla pero ya hay sesión válida → /chat, no «link inválido»', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await montar({ code: 'abc', exchangeError: true, user: true });
    expect(r.location).toBe('https://mayalexhn.com/chat');
  });
  it('canje falla y NO hay sesión → /login?error=link_invalido', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await montar({ code: 'abc', exchangeError: true, user: false });
    expect(r.location).toBe('https://mayalexhn.com/login?error=link_invalido');
  });
  it('sin código y sin sesión → /login?error=link_invalido; sin código y con sesión → /chat', async () => {
    expect((await montar({ code: null, exchangeError: false, user: false })).location).toBe('https://mayalexhn.com/login?error=link_invalido');
    expect((await montar({ code: null, exchangeError: false, user: true })).location).toBe('https://mayalexhn.com/chat');
  });
  it('getUser devuelve error o lanza → se trata como sin sesión (cierra por defecto)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await montar({ code: 'abc', exchangeError: true, user: true, getUserError: true })).location).toBe('https://mayalexhn.com/login?error=link_invalido');
    expect((await montar({ code: 'abc', exchangeError: true, user: true, getUserThrows: true })).location).toBe('https://mayalexhn.com/login?error=link_invalido');
  });
  it('el destino sigue saneado: un next externo no permite redirigir fuera del sitio', async () => {
    vi.resetModules();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.doMock('@/lib/supabase-ssr', () => ({ createSupabaseServerClient: async () => ({ auth: { exchangeCodeForSession: async () => ({ error: { message: 'x' } }), getUser: async () => ({ data: { user: { id: 'u' } }, error: null }) } }) }));
    const { GET } = await import('@/app/auth/callback/route');
    const res = await GET(new Request('https://mayalexhn.com/auth/callback?code=abc&next=https%3A%2F%2Fevil.com') as never);
    expect(res.headers.get('location')).toBe('https://mayalexhn.com/chat');
  });
});
