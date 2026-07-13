/**
 * Rate Limiting — MAYA LEX IA PINEL HN
 *
 * Plan gratuito: FREE_TIER_DAILY_LIMIT consultas/día (default: 3)
 * Plan Pro: ilimitado (PRO_TIER_DAILY_LIMIT = 100 por seguridad)
 * Identificación: IP address (sin login) o user_id (con Supabase Auth)
 */

import { createServerSupabaseClient } from './supabase';

const FREE_LIMIT      = parseInt(process.env.FREE_TIER_DAILY_LIMIT      ?? '3',   10);
const PRO_LIMIT       = parseInt(process.env.PRO_TIER_DAILY_LIMIT       ?? '1000', 10);
const ACADEMICO_LIMIT = parseInt(process.env.ACADEMICO_TIER_DAILY_LIMIT ?? '20',  10);

export type UserTier = 'free' | 'pro' | 'academico' | 'admin';

export type RateLimitResult =
  | { allowed: true;  remaining: number; tier: UserTier }
  | { allowed: false; remaining: 0;      tier: UserTier; resetAt: string };

/**
 * Extrae el identificador de usuario de la Request (SIN verificación).
 * Solo IP — el header X-User-ID fue eliminado por suplantable (auditoría #8).
 * Para identidad autenticada usar getUserIdentifierVerificado().
 */
export function getUserIdentifier(req: Request): string {
  const forwarded =
    req.headers.get('x-forwarded-for') ??
    req.headers.get('x-real-ip') ??
    req.headers.get('cf-connecting-ip');
  if (forwarded) return `ip:${forwarded.split(',')[0].trim()}`;

  return 'ip:unknown';
}

/**
 * Identificador VERIFICADO del usuario.
 *
 * Si la request trae `Authorization: Bearer <access_token>` de Supabase Auth,
 * valida el JWT contra Supabase y devuelve `email:{correo}` — el mismo esquema
 * que usan /cuenta y el webhook PayPal, y estable entre dispositivos/IPs.
 * Un token inválido o ausente degrada a identidad por IP (plan gratuito).
 *
 * Seguridad: el token se VALIDA server-side (auth.getUser) — a diferencia del
 * viejo X-User-ID, no se puede suplantar con un simple header.
 */
export async function getUserIdentifierVerificado(req: Request): Promise<string> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (token && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user?.email) {
        return `email:${data.user.email.toLowerCase()}`;
      }
    } catch {
      // Token corrupto o Supabase caído → degradar a IP sin romper el chat
    }
  }

  return getUserIdentifier(req);
}

/**
 * Verifica si el usuario puede realizar una consulta.
 * Si está dentro del límite, incrementa el contador atómicamente.
 *
 * Estrategia: upsert con ON CONFLICT para evitar race conditions.
 */
export async function checkAndIncrementRateLimit(
  userIdentifier: string
): Promise<RateLimitResult> {
  // Si Supabase no está configurado → modo demo sin límites
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn('[RateLimit] Supabase no configurado — modo sin límites');
    return { allowed: true, remaining: 99, tier: 'free' };
  }

  const supabase = createServerSupabaseClient();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // 1. Buscar registro del día
  const { data: existing } = await supabase
    .from('queries_log')
    .select('query_count, tier')
    .eq('user_identifier', userIdentifier)
    .eq('query_date', today)
    .single();

  const tier = (existing?.tier ?? 'free') as UserTier;
  const currentCount = existing?.query_count ?? 0;

  // Admins nunca tienen límite
  if (tier === 'admin') {
    await incrementCount(supabase, userIdentifier, today, tier, currentCount);
    return { allowed: true, remaining: 9999, tier: 'admin' };
  }

  const limit =
    tier === 'pro'       ? PRO_LIMIT :
    tier === 'academico' ? ACADEMICO_LIMIT :
    FREE_LIMIT;

  if (currentCount >= limit) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return {
      allowed: false,
      remaining: 0,
      tier,
      resetAt: tomorrow.toISOString(),
    };
  }

  // 2. Incrementar contador (upsert)
  await incrementCount(supabase, userIdentifier, today, tier, currentCount);

  return {
    allowed: true,
    remaining: limit - currentCount - 1,
    tier,
  };
}

async function incrementCount(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userIdentifier: string,
  today: string,
  tier: string,
  currentCount: number
) {
  await supabase
    .from('queries_log')
    .upsert(
      {
        user_identifier: userIdentifier,
        query_date: today,
        query_count: currentCount + 1,
        tier,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_identifier,query_date',
        ignoreDuplicates: false,
      }
    );
}

/**
 * Devuelve el estado de uso actual sin incrementar.
 * Útil para mostrar el contador en el UI.
 */
export async function getRateLimitStatus(userIdentifier: string): Promise<{
  used: number;
  limit: number;
  tier: UserTier;
  resetAt: string;
}> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { used: 0, limit: FREE_LIMIT, tier: 'free', resetAt: '' };
  }

  const supabase = createServerSupabaseClient();
  const today = new Date().toISOString().split('T')[0];

  const { data } = await supabase
    .from('queries_log')
    .select('query_count, tier')
    .eq('user_identifier', userIdentifier)
    .eq('query_date', today)
    .single();

  const tier = (data?.tier ?? 'free') as UserTier;
  const used = data?.query_count ?? 0;
  const limit =
    tier === 'admin'     ? 9999 :
    tier === 'pro'       ? PRO_LIMIT :
    tier === 'academico' ? ACADEMICO_LIMIT :
    FREE_LIMIT;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  return { used, limit, tier, resetAt: tomorrow.toISOString() };
}
