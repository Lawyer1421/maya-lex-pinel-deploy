import { describe, expect, it } from 'vitest';
import { buildAuthCallbackUrl } from '../lib/auth/redirect';

describe('buildAuthCallbackUrl', () => {
  it('uses the configured production URL for preview hosts', () => {
    expect(buildAuthCallbackUrl('https://maya-lex-preview.vercel.app', '/chat')).toBe(
      'https://mayalexhn.com/auth/callback?next=%2Fchat'
    );
  });

  it('preserves the current origin on production and localhost', () => {
    expect(buildAuthCallbackUrl('https://mayalexhn.com', '/chat')).toBe(
      'https://mayalexhn.com/auth/callback?next=%2Fchat'
    );
    expect(buildAuthCallbackUrl('http://localhost:3000', '/chat')).toBe(
      'http://localhost:3000/auth/callback?next=%2Fchat'
    );
  });
});
