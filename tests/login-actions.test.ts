import { describe, expect, it, vi } from 'vitest';
import {
  performMagicLinkSignIn,
  performGoogleSignIn,
  withAuthTimeout,
  AuthTimeoutError,
} from '@/lib/auth/login-actions';

/**
 * Fase 1E.3C.6 — MAGIC_LINK_STALL. Antes de este archivo, /login llamaba a
 * signInWithOtp/signInWithOAuth sin try/catch ni timeout: una excepción o un
 * cuelgue de red dejaba la UI congelada en "Enviando..."/"Redirigiendo..."
 * para siempre. Estas pruebas cubren la lógica pura que ahora concentra ese
 * manejo (independiente del render de React, que este repo no ejercita en
 * tests — ver vitest.config.ts, environment: 'node').
 */

function fakeSupabase(overrides: {
  signInWithOtp?: (...args: unknown[]) => Promise<{ error: { message: string } | null }>;
  signInWithOAuth?: (...args: unknown[]) => Promise<{ error: { message: string } | null }>;
}) {
  return {
    auth: {
      signInWithOtp: overrides.signInWithOtp ?? vi.fn(),
      signInWithOAuth: overrides.signInWithOAuth ?? vi.fn(),
    },
  } as any;
}

describe('withAuthTimeout', () => {
  it('resuelve normalmente si la promesa original resuelve antes del límite', async () => {
    await expect(withAuthTimeout(Promise.resolve('ok'), 50)).resolves.toBe('ok');
  });

  it('rechaza con AuthTimeoutError si la promesa original nunca resuelve', async () => {
    const nuncaResuelve = new Promise(() => {});
    await expect(withAuthTimeout(nuncaResuelve, 20)).rejects.toBeInstanceOf(AuthTimeoutError);
  });

  it('propaga el rechazo original si ocurre antes del timeout', async () => {
    await expect(withAuthTimeout(Promise.reject(new Error('boom')), 50)).rejects.toThrow('boom');
  });
});

describe('performMagicLinkSignIn — A. excepción lanzada, F. éxito', () => {
  it('F. signInWithOtp exitoso → { ok: true }', async () => {
    const supabase = fakeSupabase({ signInWithOtp: vi.fn().mockResolvedValue({ error: null }) });
    const resultado = await performMagicLinkSignIn(supabase, 'abogado@ejemplo.com', 'https://preview.test/auth/callback');
    expect(resultado).toEqual({ ok: true });
  });

  it('Supabase devuelve { error } → ok:false con el mensaje de Supabase', async () => {
    const supabase = fakeSupabase({
      signInWithOtp: vi.fn().mockResolvedValue({ error: { message: 'Rate limit exceeded' } }),
    });
    const resultado = await performMagicLinkSignIn(supabase, 'abogado@ejemplo.com', 'https://preview.test/auth/callback');
    expect(resultado).toEqual({ ok: false, message: 'Rate limit exceeded' });
  });

  it('A. signInWithOtp lanza una excepción → ok:false con mensaje seguro, nunca propaga la excepción', async () => {
    const supabase = fakeSupabase({
      signInWithOtp: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    });
    const resultado = await performMagicLinkSignIn(supabase, 'abogado@ejemplo.com', 'https://preview.test/auth/callback');
    expect(resultado.ok).toBe(false);
    expect(resultado.message).toBeTruthy();
    expect(resultado.message).not.toContain('Failed to fetch'); // no filtra el error interno crudo
  });

  it('E. la llamada nunca resuelve → timeout produce ok:false con mensaje de timeout, no cuelga', async () => {
    const supabase = fakeSupabase({ signInWithOtp: vi.fn().mockReturnValue(new Promise(() => {})) });
    const resultado = await performMagicLinkSignIn(supabase, 'abogado@ejemplo.com', 'https://preview.test/auth/callback', 20);
    expect(resultado.ok).toBe(false);
    expect(resultado.message).toMatch(/tardando|conexión/i);
  });
});

describe('performGoogleSignIn — B. excepción lanzada', () => {
  it('signInWithOAuth exitoso → { ok: true }', async () => {
    const supabase = fakeSupabase({ signInWithOAuth: vi.fn().mockResolvedValue({ error: null }) });
    const resultado = await performGoogleSignIn(supabase, 'https://preview.test/auth/callback');
    expect(resultado).toEqual({ ok: true });
  });

  it('B. signInWithOAuth lanza una excepción → ok:false con mensaje seguro, nunca propaga la excepción', async () => {
    const supabase = fakeSupabase({
      signInWithOAuth: vi.fn().mockRejectedValue(new Error('deleted_client')),
    });
    const resultado = await performGoogleSignIn(supabase, 'https://preview.test/auth/callback');
    expect(resultado.ok).toBe(false);
    expect(resultado.message).toBeTruthy();
    expect(resultado.message).not.toContain('deleted_client'); // no filtra el error interno crudo
  });

  it('timeout produce ok:false sin colgar, igual que el flujo de magic link', async () => {
    const supabase = fakeSupabase({ signInWithOAuth: vi.fn().mockReturnValue(new Promise(() => {})) });
    const resultado = await performGoogleSignIn(supabase, 'https://preview.test/auth/callback', 20);
    expect(resultado.ok).toBe(false);
    expect(resultado.message).toMatch(/tardando|conexión/i);
  });
});
