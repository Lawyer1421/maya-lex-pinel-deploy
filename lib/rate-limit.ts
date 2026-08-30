/**
 * Rate Limiting — MAYA LEX IA PINEL HN
 *
 * Los planes self-serve se diferencian SOLO por cuota diaria:
 *   free      → FREE_TIER_DAILY_LIMIT      (default 3)
 *   academico → ACADEMICO_TIER_DAILY_LIMIT (default 20)
 *   pro       → PRO_TIER_DAILY_LIMIT       (default 1000)
 * Identificación: IP (sin login) o email: (Supabase Auth)
 */

import { createServerSupabaseClient } from '@/lib/supabase';

const FREE_LIMIT      = parseInt(process.env.FREE_TIER_DAILY_LIMIT      ?? '3',   10);
const PRO_LIMIT       = parseInt(process.env.PRO_TIER_DAILY_LIMIT       ?? '1000', 10);
const ACADEMICO_LIMIT = parseInt(process.env.ACADEMICO_TIER_DAILY_LIMIT ?? '20',  10);

export type UserTier = 'free' | 'pro' | 'academico' | 'admin';

const PAID_TIERS: ReadonlySet<UserTier> = new Set(['pro', 'academico', 'admin']);

function isUserTier(value: unknown): value is UserTier {
  return value === 'free' || value === 'pro' || value === 'academico' || value === 'admin';
}

/**
 * Tier que debe escribirse / usarse cuando NO hay fila de queries_log hoy.
 *
 * Si subscriptions.status === 'active' y el tier es academico / pro / admin,
 * usar ESE tier de facturación — no defaultar a 'free'. Un PayPal activo
 * no debe caer al tope gratuito (~3) en la primera consulta del día.
 * Free autenticado y anónimo (IP) siguen en 'free'.
 *
 * No lee auth.users ni el resto de la fila de pago: solo tier + status.
 */
export function resolveTierForNewDay(params: {
  subscriptionStatus: string | null | undefined;
  subscriptionTier: string | null | undefined;
}): UserTier {
  if (params.subscriptionStatus === 'active' && isUserTier(params.subscriptionTier) && PAID_TIERS.has(params.subscriptionTier)) {
    return params.subscriptionTier;
  }
  return 'free';
}

function limitForTier(tier: UserTier): number {
  if (tier === 'admin') return 9999;
  if (tier === 'pro') return PRO_LIMIT;
  if (tier === 'academico') return ACADEMICO_LIMIT;
  return FREE_LIMIT;
}

/**
 * Única función que construye el user_identifier a partir de un correo.
 * SIEMPRE trim + lowercase — sin esto, "Ana@X.com" y "ana@x.com " (con
 * espacio) generarían dos filas DISTINTAS en subscriptions/queries_log
 * para la misma persona, dependiendo de qué punto de entrada (login,
 * webhook, Mi Cuenta) haya capturado el correo. Todo el código que arma
 * `email:${...}` a mano debe usar esta función en su lugar.
 *
 * Riesgo conocido (no resuelto en este sprint — ver backlog P1
 * migrate-user-identifier-to-uuid): si el usuario cambia su correo en
 * Supabase Auth, este identificador cambia con él y la suscripción
 * existente queda huérfana (no vinculada al nuevo user_identifier). La
 * migración a un UUID interno inmutable (auth.users.id) elimina este
 * riesgo de raíz; mientras tanto, no existe una mitigación automática de
 * cambio de correo en el código — es responsabilidad operativa detectar
 * este caso manualmente si un cliente reporta pérdida de acceso tras
 * cambiar su correo.
 */
export function buildUserIdentifierFromEmail(email: string): string {
  return `email:${email.trim().toLowerCase()}`;
}

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
        return buildUserIdentifierFromEmail(data.user.email);
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

  const tier = await resolveTodayTier(supabase, userIdentifier, existing?.tier);
  const currentCount = existing?.query_count ?? 0;

  // Admins nunca tienen límite
  if (tier === 'admin') {
    await incrementCount(supabase, userIdentifier, today, tier, currentCount);
    return { allowed: true, remaining: 9999, tier: 'admin' };
  }

  const limit = limitForTier(tier);

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

/**
 * Si ya hay queries_log.tier hoy, ese es el gate.
 * Si no hay fila (día nuevo), heredar de subscriptions.active + academico/pro/admin.
 */
async function resolveTodayTier(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userIdentifier: string,
  existingTier: unknown
): Promise<UserTier> {
  if (isUserTier(existingTier)) return existingTier;
  if (userIdentifier.startsWith('ip:')) return 'free';

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('tier, status')
    .eq('user_identifier', userIdentifier)
    .maybeSingle();

  return resolveTierForNewDay({
    subscriptionStatus: sub?.status,
    subscriptionTier: sub?.tier,
  });
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

  const tier = await resolveTodayTier(supabase, userIdentifier, data?.tier);
  const used = data?.query_count ?? 0;
  const limit = limitForTier(tier);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  return { used, limit, tier, resetAt: tomorrow.toISOString() };
}
