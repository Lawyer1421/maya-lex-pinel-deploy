import { describe, expect, it } from 'vitest';
import { resolveCommitSha } from '@/lib/observability/version';

describe('resolveCommitSha', () => {
  it('trata cadena vacía como ausente — no devuelve ""', () => {
    expect(
      resolveCommitSha({
        APP_COMMIT_SHA: '',
        VERCEL_GIT_COMMIT_SHA: '',
        NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: '',
      })
    ).toBe('unknown');
  });

  it('prefiere APP_COMMIT_SHA si hay valor', () => {
    expect(
      resolveCommitSha({
        APP_COMMIT_SHA: '  abc123  ',
        VERCEL_GIT_COMMIT_SHA: 'zzzz',
      })
    ).toBe('abc123');
  });

  it('cae a VERCEL_GIT_COMMIT_SHA cuando APP está vacío', () => {
    expect(
      resolveCommitSha({
        APP_COMMIT_SHA: '',
        VERCEL_GIT_COMMIT_SHA: '568bc3943166bd0ee9b1727611d4bf3fa61d9595',
      })
    ).toBe('568bc3943166bd0ee9b1727611d4bf3fa61d9595');
  });
});
