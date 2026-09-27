import type { createSupabaseBrowserClient } from '@/lib/supabase-browser';

/**
 * Antes de este archivo, /login llamaba a signInWithOtp/signInWithOAuth sin
 * try/catch ni timeout: cualquier excepción (red, CORS, lo que sea) dejaba
 * el botón en "Enviando..."/"Redirigiendo..." para siempre, sin mensaje de
 * error y sin forma de reintentar salvo recargar la página
 * (MAGIC_LINK_STALL, 2026-09-27). Estas funciones puras concentran el
 * try/catch/finally y el timeout una sola vez para que /login no pueda
 * volver a colgarse en silencio.
 */

type SupabaseBrowserClient = ReturnType<typeof createSupabaseBrowserClient>;

export interface AuthActionResult {
  ok: boolean;
  message?: string;
}

export class AuthTimeoutError extends Error {
  constructor() {
    super('AUTH_TIMEOUT');
    this.name = 'AuthTimeoutError';
  }
}

// 15s: suficiente para tolerar una red lenta o un envío de correo síncrono
// del lado de Supabase, sin dejar al usuario esperando casi un minuto ante
// un fallo real. No hay una llamada real observada que tarde más de unos
// segundos en condiciones normales.
export const AUTH_ACTION_TIMEOUT_MS = 15_000;

const MENSAJE_AUTH_TIMEOUT =
  'La solicitud está tardando demasiado. Verifique su conexión e intente de nuevo.';
const MENSAJE_AUTH_ERROR_GENERICO =
  'No se pudo completar el inicio de sesión. Intente de nuevo.';

/**
 * Corre `promise` con un límite de tiempo. Si `promise` nunca resuelve,
 * rechaza con AuthTimeoutError en vez de dejar al llamador esperando para
 * siempre. No cancela la solicitud subyacente (signInWithOtp/signInWithOAuth
 * no exponen un AbortSignal) — solo deja de esperarla.
 */
export async function withAuthTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AuthTimeoutError()), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

function mensajeSeguro(err: unknown): string {
  if (err instanceof AuthTimeoutError) return MENSAJE_AUTH_TIMEOUT;
  return MENSAJE_AUTH_ERROR_GENERICO;
}

export async function performMagicLinkSignIn(
  supabase: SupabaseBrowserClient,
  email: string,
  callbackUrl: string,
  timeoutMs: number = AUTH_ACTION_TIMEOUT_MS,
): Promise<AuthActionResult> {
  try {
    const { error } = await withAuthTimeout(
      supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: callbackUrl } }),
      timeoutMs,
    );
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, message: mensajeSeguro(err) };
  }
}

export async function performGoogleSignIn(
  supabase: SupabaseBrowserClient,
  callbackUrl: string,
  timeoutMs: number = AUTH_ACTION_TIMEOUT_MS,
): Promise<AuthActionResult> {
  try {
    const { error } = await withAuthTimeout(
      supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callbackUrl } }),
      timeoutMs,
    );
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, message: mensajeSeguro(err) };
  }
}
