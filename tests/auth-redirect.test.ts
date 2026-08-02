import { describe, expect, it } from 'vitest';
import { buildAuthCallbackUrl, sanitizeNextPath } from '../lib/auth/redirect';

describe('buildAuthCallbackUrl — AUTH_CALLBACK_REDIRECT_MISMATCH fix', () => {
  it('conserva el origin real de un Preview — ya NO lo fuerza a mayalexhn.com', () => {
    // Antes del fix, esto forzaba mayalexhn.com y rompía la sesión: el
    // magic link se emite contra Supabase Staging (env vars de Preview)
    // pero el canje corría contra Supabase Producción — proyectos
    // distintos, el código nunca era válido ahí.
    expect(buildAuthCallbackUrl('https://maya-lex-preview.vercel.app', '/chat')).toBe(
      'https://maya-lex-preview.vercel.app/auth/callback?next=%2Fchat'
    );
  });

  it('preserva el origin actual en producción y localhost', () => {
    expect(buildAuthCallbackUrl('https://mayalexhn.com', '/chat')).toBe(
      'https://mayalexhn.com/auth/callback?next=%2Fchat'
    );
    expect(buildAuthCallbackUrl('http://localhost:3000', '/chat')).toBe(
      'http://localhost:3000/auth/callback?next=%2Fchat'
    );
  });

  it('un Preview nunca redirige el callback a producción', () => {
    const url = buildAuthCallbackUrl('https://otro-preview-xyz.vercel.app', '/chat');
    expect(url.startsWith('https://otro-preview-xyz.vercel.app/')).toBe(true);
    expect(url).not.toContain('mayalexhn.com');
  });

  it('origin inválido/ausente cae al fallback de producción (no a /demo, no a un origin arbitrario)', () => {
    expect(buildAuthCallbackUrl('', '/chat')).toBe('https://mayalexhn.com/auth/callback?next=%2Fchat');
    expect(buildAuthCallbackUrl('not-a-url', '/chat')).toBe('https://mayalexhn.com/auth/callback?next=%2Fchat');
  });

  it('next inseguro se sanea antes de construir la URL — nunca se filtra un open redirect', () => {
    expect(buildAuthCallbackUrl('https://mayalexhn.com', '//evil.com')).toBe(
      'https://mayalexhn.com/auth/callback?next=%2Fchat'
    );
    expect(buildAuthCallbackUrl('https://mayalexhn.com', 'https://evil.com')).toBe(
      'https://mayalexhn.com/auth/callback?next=%2Fchat'
    );
  });

  it('/demo nunca es el fallback de autenticación — el único fallback es /chat', () => {
    const casos = [null, undefined, '', 'evil.com', '//evil.com', 'https://evil.com', 'javascript:alert(1)'];
    for (const caso of casos) {
      expect(sanitizeNextPath(caso as string | null | undefined)).not.toBe('/demo');
      expect(sanitizeNextPath(caso as string | null | undefined)).toBe('/chat');
    }
  });
});

describe('sanitizeNextPath — previene open redirect (compartido con /auth/callback)', () => {
  it('rutas internas válidas se conservan', () => {
    expect(sanitizeNextPath('/chat')).toBe('/chat');
    expect(sanitizeNextPath('/pricing')).toBe('/pricing');
    expect(sanitizeNextPath('/leyes/173')).toBe('/leyes/173');
  });

  it('next ausente usa /chat', () => {
    expect(sanitizeNextPath(null)).toBe('/chat');
    expect(sanitizeNextPath(undefined)).toBe('/chat');
    expect(sanitizeNextPath('')).toBe('/chat');
  });
});
