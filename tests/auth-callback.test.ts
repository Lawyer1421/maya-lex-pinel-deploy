import { describe, it, expect } from 'vitest';
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
