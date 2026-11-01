/**
 * Rate Limiting — MAYA LEX IA PINEL HN
 *
 * Cuotas de consultas por plan:
 *   free      → FREE_TIER_DAILY_LIMIT (default 1), solo diaria
 *   academico → 20 al día y 400 al mes   (lib/plan-limits.ts, sin env)
 *   pro       → 60 al día y 1,200 al mes (lib/plan-limits.ts, sin env; «Premium»)
 * Los límites de los planes de pago viven en lib/plan-limits.ts y se aplican aquí, del lado del servidor. Si la lectura del uso (día o mes) falla,
 * la consulta se BLOQUEA (RateLimitStoreError → 503), nunca se deja pasar.
 * Identificación: IP (sin login) o email: (Supabase Auth)
 * Día = medianoche→medianoche America/Tegucigalpa (UTC-6).
 */

import { esIdentificadorFundador } from '@/lib/founder';
import { createServerSupabaseClient } from '@/lib/supabase';
import { limitesDePlanPago } from '@/lib/plan-limits';

export const TZ_HN = 'America/Tegucigalpa';
export const FREE_DAILY_LIMIT_CODE = 'FREE_DAILY_LIMIT';
export const FREE_LIMIT_DEFAULT = 1;

/** Ausente, NaN o <1 → fallback. Nunca ilimitado. */
export function parseDailyLimit(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return n;
}

function freeLimit(): number {
  return parseDailyLimit(process.env.FREE_TIER_DAILY_LIMIT, FREE_LIMIT_DEFAULT);
}
function mcpLimit(): number {
  return parseDailyLimit(process.env.MCP_TIER_DAILY_LIMIT, 200);
}

/** YYYY-MM-DD del calendario en America/Tegucigalpa. `now` inyectable en tests. */
export function fechaDiaHn(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ_HN,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Próxima medianoche HN (UTC-6, sin DST) como ISO-8601. */
export function resetAtMedianocheHn(now: Date = new Date()): string {
  const dia = fechaDiaHn(now);
  const [y, m, d] = dia.split('-').map((n) => Number.parseInt(n, 10));
  return new Date(Date.UTC(y!, m! - 1, d! + 1, 6, 0, 0, 0)).toISOString();
}

/**
 * Prefijo de la bolsa de rate limit del servidor MCP (PLAN-MCP-SLICE-1 §3.2-bis):
 * `mcp:email:{correo}` cuenta en queries_log por separado del chat, sin migración.
 */
export const MCP_BUCKET_PREFIX = 'mcp:';

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
 * no debe caer al tope gratuito (1) en la primera consulta del día.
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

function limitForTier(tier: UserTier, userIdentifier = ''): number {
  if (tier === 'admin') return 9999;
  // Bolsa MCP: sólo pro tiene cuota propia; el resto no tiene acceso MCP (fail-closed).
  if (userIdentifier.startsWith(MCP_BUCKET_PREFIX)) return tier === 'pro' ? mcpLimit() : 0;
  const pago = limitesDePlanPago(tier);
  if (pago) return pago.diario;
  return freeLimit();
}

/** Límite mensual del tier para esa bolsa, o null si no tiene (free, admin y la bolsa MCP no tienen tope mensual). */
function limiteMensual(tier: UserTier, userIdentifier = ''): number | null {
  if (userIdentifier.startsWith(MCP_BUCKET_PREFIX)) return null;
  return limitesDePlanPago(tier)?.mensual ?? null;
}

/** Primer día del mes calendario HN de `now` (YYYY-MM-01). */
export function inicioMesHn(now: Date = new Date()): string {
  return `${fechaDiaHn(now).slice(0, 8)}01`;
}

/** Medianoche HN del primer día del mes siguiente, ISO-8601 (UTC-6, sin DST). */
export function resetAtMesHn(now: Date = new Date()): string {
  const [y, m] = fechaDiaHn(now).split('-').map((n) => Number.parseInt(n, 10));
  return new Date(Date.UTC(y!, m!, 1, 6, 0, 0, 0)).toISOString();
}

export type DecisionLimite =
  | { allowed: true; remaining: number }
  | { allowed: false; reason: 'daily' | 'monthly' };

/**
 * Decisión pura: ¿cabe una consulta más? `usadoHoy` y `usadoMes` son lo ya consumido (el mes incluye hoy). Primero el límite diario, luego el mensual;
 * `remaining` es lo que queda DESPUÉS de esta consulta, el menor de los dos. Valores de uso inválidos se tratan como límite agotado (fail-closed).
 */
export function decidirLimites(p: { limiteDiario: number; limiteMensual: number | null; usadoHoy: number; usadoMes: number | null }): DecisionLimite {
  if (!Number.isFinite(p.usadoHoy) || p.usadoHoy < 0) return { allowed: false, reason: 'daily' };
  if (p.usadoHoy >= p.limiteDiario) return { allowed: false, reason: 'daily' };
  let remaining = p.limiteDiario - p.usadoHoy - 1;
  if (p.limiteMensual !== null) {
    if (p.usadoMes === null || !Number.isFinite(p.usadoMes) || p.usadoMes < 0) return { allowed: false, reason: 'monthly' };
    if (p.usadoMes >= p.limiteMensual) return { allowed: false, reason: 'monthly' };
    remaining = Math.min(remaining, p.limiteMensual - p.usadoMes - 1);
  }
  return { allowed: true, remaining };
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

/** Identificador de la bolsa MCP para un correo: `mcp:email:{correo}`. */
export function buildMcpIdentifierFromEmail(email: string): string {
  return `${MCP_BUCKET_PREFIX}${buildUserIdentifierFromEmail(email)}`;
}

/**
 * Identificador con el que se busca la suscripción: sin el prefijo `mcp:`.
 * subscriptions guarda `email:{correo}`; con el prefijo el lookup fallaría y
 * degradaría a free a un usuario pro (condición dura del dictamen, §3.2-bis).
 */
export function identificadorDeSuscripcion(userIdentifier: string): string {
  return userIdentifier.startsWith(MCP_BUCKET_PREFIX)
    ? userIdentifier.slice(MCP_BUCKET_PREFIX.length)
    : userIdentifier;
}

export type RateLimitResult =
  | { allowed: true;  remaining: number; tier: UserTier }
  | { allowed: false; remaining: 0;      tier: UserTier; resetAt: string; reason?: 'daily' | 'monthly' | 'contention' };

export class RateLimitStoreError extends Error {
  readonly code: string;
  constructor(message: string, code = 'STORE_ERROR') {
    super(message);
    this.name = 'RateLimitStoreError';
    this.code = code;
  }
}

const PGRST_NO_ROWS = 'PGRST116';
const RESERVE_MAX_ATTEMPTS = 8;

/** 5xx / 529 / timeout del proveedor. Abort del cliente no aplica. */
export function esFalloProveedorQueDevuelveCuota(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { status?: unknown; name?: string; message?: string };
  if (e.name === 'APIUserAbortError' || e.name === 'AbortError') return false;
  if (e.name === 'APIConnectionTimeoutError') return true;
  if (typeof e.status === 'number') return e.status === 529 || e.status >= 500;
  return typeof e.message === 'string' && /timeout/i.test(e.message);
}

/** OpenRouter reporta fallos por mensaje (HTTP 5xx/529, timeout, conexión). */
export function esFalloOpenRouterQueDevuelveCuota(message: string): boolean {
  if (/timeout/i.test(message)) return true;
  if (/Error de conexión/i.test(message)) return true;
  const m = message.match(/HTTP (\d+)/);
  if (!m) return false;
  const s = Number.parseInt(m[1]!, 10);
  return s === 529 || s >= 500;
}

/**
 * Extrae el identificador de usuario de la Request (SIN verificación).
 * Solo IP — el header X-User-ID fue eliminado por suplantable (auditoría #8).
 * Para identidad autenticada usar getUserIdentifierVerificado().
 */
export function getUserIdentifier(req: Request): string {
  const vercel = req.headers.get('x-vercel-forwarded-for');
  if (vercel) return `ip:${vercel.split(',')[0].trim()}`;
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return `ip:${forwarded.split(',')[0].trim()}`;
  const real =
    req.headers.get('x-real-ip') ??
    req.headers.get('cf-connecting-ip');
  if (real) return `ip:${real.split(',')[0].trim()}`;

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
/**
 * Correo VERIFICADO del usuario, o `null`.
 *
 * Valida el `Authorization: Bearer <access_token>` de Supabase Auth
 * server-side (`auth.getUser`) y devuelve el correo normalizado
 * (`trim().toLowerCase()`), o `null` si no hay token válido. Nunca lanza.
 *
 * Es la primitiva sobre la que se construye `getUserIdentifierVerificado()`
 * (rate-limit) y la resolución del flag `flag_rerank` en `/api/chat`.
 */
export async function getVerifiedEmail(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (token && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user?.email) {
        return data.user.email.trim().toLowerCase();
      }
    } catch {
      // Token corrupto o Supabase caído → sin identidad verificada
    }
  }

  return null;
}

export async function getUserIdentifierVerificado(req: Request): Promise<string> {
  const email = await getVerifiedEmail(req);
  return email ? buildUserIdentifierFromEmail(email) : getUserIdentifier(req);
}

/**
 * Verifica si el usuario puede realizar una consulta.
 * Si está dentro del límite, incrementa el contador atómicamente.
 *
 * Estrategia: upsert con ON CONFLICT para evitar race conditions.
 */
async function leerUsoDelDia(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userIdentifier: string,
  today: string,
): Promise<{ query_count: number; tier: unknown } | null> {
  const { data: existing, error } = await supabase
    .from('queries_log')
    .select('query_count, tier')
    .eq('user_identifier', userIdentifier)
    .eq('query_date', today)
    .single();
  if (error && error.code !== PGRST_NO_ROWS) {
    console.error('[RateLimit] lectura queries_log falló', {
      code: error.code,
      message: error.message,
    });
    throw new RateLimitStoreError(
      error.message ?? 'queries_log read failed',
      String(error.code ?? 'STORE_ERROR'),
    );
  }
  return existing ?? null;
}

/**
 * Fecha HN (YYYY-MM-DD) en que existe la suscripción de pago del usuario, o null si no hay dato. No hay una columna «activated_at» (añadirla sería
 * DDL): se usa `subscriptions.created_at`, el primer momento en que la suscripción existe en nuestra base. Sin identidad de suscripción (IP) o sin
 * fila, devuelve null y el conteo mensual usa el inicio del mes (más conservador: cuenta más, nunca menos). Un error de lectura LANZA.
 */
async function leerFechaActivacion(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userIdentifier: string,
): Promise<string | null> {
  const id = identificadorDeSuscripcion(userIdentifier);
  if (id.startsWith('ip:')) return null;
  const { data, error } = await supabase.from('subscriptions').select('created_at').eq('user_identifier', id).maybeSingle();
  if (error) {
    console.error('[RateLimit] lectura de la suscripción falló', { code: error.code, message: error.message });
    throw new RateLimitStoreError(error.message ?? 'subscriptions read failed', String(error.code ?? 'STORE_ERROR'));
  }
  const creada = typeof data?.created_at === 'string' ? new Date(data.created_at) : null;
  return creada && !Number.isNaN(creada.getTime()) ? fechaDiaHn(creada) : null;
}

/**
 * Consultas de PAGO del mes calendario HN (incluye hoy) de una bolsa. Cuenta solo las filas de queries_log con tier de pago (academico / pro) y
 * hechas desde la fecha de activación de la suscripción: las consultas gratis de antes de pagar (o de un periodo sin suscripción) no gastan el tope
 * mensual. Cualquier error de lectura LANZA RateLimitStoreError: sin saber cuánto lleva en el mes, la consulta no pasa.
 */
async function leerUsoDelMes(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userIdentifier: string,
  now: Date,
): Promise<number> {
  const inicioMes = inicioMesHn(now);
  const activacion = await leerFechaActivacion(supabase, userIdentifier);
  const desde = activacion !== null && activacion > inicioMes ? activacion : inicioMes;
  const { data, error } = await supabase
    .from('queries_log')
    .select('query_count, query_date, tier')
    .eq('user_identifier', userIdentifier)
    .gte('query_date', desde)
    .lte('query_date', fechaDiaHn(now));
  if (error || !Array.isArray(data)) {
    console.error('[RateLimit] lectura mensual de queries_log falló', { code: error?.code, message: error?.message });
    throw new RateLimitStoreError(error?.message ?? 'queries_log monthly read failed', String(error?.code ?? 'STORE_ERROR'));
  }
  return (data as { query_count: unknown; query_date?: unknown; tier?: unknown }[]).reduce((n, r) => {
    const esDePago = r.tier === 'academico' || r.tier === 'pro';
    const cuenta = typeof r.query_count === 'number' && r.query_count > 0 ? r.query_count : 0;
    return esDePago ? n + cuenta : n;
  }, 0);
}

function resetSegun(reason: 'daily' | 'monthly' | undefined, now: Date): string {
  return reason === 'monthly' ? resetAtMesHn(now) : resetAtMedianocheHn(now);
}

/**
 * Chequeo sin escribir. `now` inyectable (tests de medianoche HN).
 */
export async function checkRateLimit(
  userIdentifier: string,
  now: Date = new Date(),
): Promise<RateLimitResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn('[RateLimit] Supabase no configurado — modo sin límites');
    return { allowed: true, remaining: 99, tier: 'free' };
  }

  const supabase = createServerSupabaseClient();
  const today = fechaDiaHn(now);
  const existing = await leerUsoDelDia(supabase, userIdentifier, today);
  const tier = await resolveTodayTier(supabase, userIdentifier, existing?.tier);
  const currentCount = existing?.query_count ?? 0;

  if (tier === 'admin') {
    return { allowed: true, remaining: 9999, tier: 'admin' };
  }

  const limit = limitForTier(tier, userIdentifier);
  const limMes = limiteMensual(tier, userIdentifier);
  const usadoMes = limMes === null ? null : await leerUsoDelMes(supabase, userIdentifier, now);
  const decision = decidirLimites({ limiteDiario: limit, limiteMensual: limMes, usadoHoy: currentCount, usadoMes });

  if (!decision.allowed) {
    return { allowed: false, remaining: 0, tier, resetAt: resetSegun(decision.reason, now), reason: decision.reason };
  }

  return { allowed: true, remaining: decision.remaining, tier };
}

/**
 * Reserva atómica ANTES de RAG/Anthropic (CAS).
 * update … eq('query_count', c).select(); si no hay fila, insert/upsert
 * que ignora duplicado. 0 filas afectadas → relee y reaplica el límite.
 */
export async function reserveRateLimit(
  userIdentifier: string,
  now: Date = new Date(),
): Promise<RateLimitResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn('[RateLimit] Supabase no configurado — modo sin límites');
    return { allowed: true, remaining: 99, tier: 'free' };
  }

  const supabase = createServerSupabaseClient();
  const today = fechaDiaHn(now);

  // Plan real del usuario en el último intento: si se agotan los reintentos NO se le responde como si fuera del plan gratis.
  let tierReal: UserTier = 'free';
  for (let attempt = 0; attempt < RESERVE_MAX_ATTEMPTS; attempt++) {
    const existing = await leerUsoDelDia(supabase, userIdentifier, today);
    const tier = await resolveTodayTier(supabase, userIdentifier, existing?.tier);
    tierReal = tier;

    if (tier === 'admin') {
      return { allowed: true, remaining: 9999, tier: 'admin' };
    }

    const limit = limitForTier(tier, userIdentifier);
    const currentCount = existing?.query_count ?? 0;
    // El mes se relee en CADA intento del CAS: si otra consulta concurrente ganó la fila de hoy, este intento ve su incremento.
    const limMes = limiteMensual(tier, userIdentifier);
    const usadoMes = limMes === null ? null : await leerUsoDelMes(supabase, userIdentifier, now);
    const decision = decidirLimites({ limiteDiario: limit, limiteMensual: limMes, usadoHoy: currentCount, usadoMes });

    if (!decision.allowed) {
      return { allowed: false, remaining: 0, tier, resetAt: resetSegun(decision.reason, now), reason: decision.reason };
    }

    const affected = existing
      ? await updateCountCas(supabase, userIdentifier, today, tier, currentCount)
      : await insertCountIgnoreDup(supabase, userIdentifier, today, tier);

    if (affected > 0) {
      return { allowed: true, remaining: decision.remaining, tier };
    }
  }

  // H1: reintentos agotados por contención del CAS. No es un límite de uso: se informa con el plan real y la ruta responde 503 RATE_LIMIT_CONTENTION
  // (reintentable), nunca el 429 de «ya usaste tu consulta gratis».
  return { allowed: false, remaining: 0, tier: tierReal, resetAt: resetAtMedianocheHn(now), reason: 'contention' };
}

/** Devuelve una reserva (aclaración, abstención, 5xx/timeout del proveedor). */
export async function releaseRateLimit(
  userIdentifier: string,
  now: Date = new Date(),
): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
  const supabase = createServerSupabaseClient();
  const today = fechaDiaHn(now);

  for (let attempt = 0; attempt < RESERVE_MAX_ATTEMPTS; attempt++) {
    const existing = await leerUsoDelDia(supabase, userIdentifier, today);
    const currentCount = existing?.query_count ?? 0;
    if (!existing || currentCount <= 0) return;
    const affected = await updateCountCas(
      supabase,
      userIdentifier,
      today,
      typeof existing.tier === 'string' ? existing.tier : 'free',
      currentCount,
      currentCount - 1,
    );
    if (affected > 0) return;
  }
}

/** Reserva (misma CAS que el chat). El segundo arg se ignora: el tier se resuelve. */
export async function incrementRateLimit(
  userIdentifier: string,
  _tier?: UserTier,
  now: Date = new Date(),
): Promise<void> {
  await reserveRateLimit(userIdentifier, now);
}

/**
 * Reserva atómica (bolsa MCP y callers legacy).
 * El chat usa reserveRateLimit + releaseRateLimit.
 */
export async function checkAndIncrementRateLimit(
  userIdentifier: string,
  now: Date = new Date(),
): Promise<RateLimitResult> {
  return reserveRateLimit(userIdentifier, now);
}

/**
 * Tier de la bolsa MCP para un correo verificado, con la misma fuente que usa
 * checkAndIncrementRateLimit para `mcp:email:{correo}`: la fila de hoy en
 * queries_log de esa bolsa si existe; si no, subscriptions (sin el prefijo
 * `mcp:`) pasada por resolveTierForNewDay. No depende de la fila del chat.
 * Fail-closed: sin Supabase configurado o ante cualquier error -> 'free'.
 * No incrementa nada.
 */
export async function resolverTierMcp(email: string): Promise<UserTier> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return 'free';
  try {
    const supabase = createServerSupabaseClient();
    const identificador = buildMcpIdentifierFromEmail(email);
    const today = fechaDiaHn();
    const { data: existing, error } = await supabase
      .from('queries_log')
      .select('tier')
      .eq('user_identifier', identificador)
      .eq('query_date', today)
      .maybeSingle();
    if (error) return 'free';
    return await resolveTodayTier(supabase, identificador, existing?.tier);
  } catch {
    return 'free';
  }
}

/**
 * Tier de pago en queries_log se respeta (no se pisa).
 * Si la fila de hoy es 'free' o no hay fila, se consulta subscriptions:
 * un PayPal activo tras gastar la consulta gratis (p. ej. 19:00 HN) no
 * debe quedar bloqueado porque paypal_apply_event escribe current_date UTC.
 * Identidad por IP nunca mira subscriptions.
 */
async function resolveTodayTier(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userIdentifier: string,
  existingTier: unknown
): Promise<UserTier> {
  // Fundador (lib/founder.ts): siempre 'admin' (activo, sin tope de consultas), sin depender de queries_log ni de subscriptions.
  if (esIdentificadorFundador(userIdentifier)) return 'admin';
  if (isUserTier(existingTier) && existingTier !== 'free') return existingTier;
  const idSuscripcion = identificadorDeSuscripcion(userIdentifier);
  if (idSuscripcion.startsWith('ip:')) return 'free';

  const { data: sub, error } = await supabase
    .from('subscriptions')
    .select('tier, status')
    .eq('user_identifier', idSuscripcion)
    .maybeSingle();
  // Error de lectura de la suscripción: no se hereda ningún tier de pago.
  if (error) return 'free';

  return resolveTierForNewDay({
    subscriptionStatus: sub?.status,
    subscriptionTier: sub?.tier,
  });
}

async function updateCountCas(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userIdentifier: string,
  today: string,
  tier: string,
  expectedCount: number,
  nextCount = expectedCount + 1,
): Promise<number> {
  const { data, error } = await supabase
    .from('queries_log')
    .update({
      query_count: nextCount,
      tier,
      updated_at: new Date().toISOString(),
    })
    .eq('user_identifier', userIdentifier)
    .eq('query_date', today)
    .eq('query_count', expectedCount)
    .select('query_count');

  if (error) {
    console.error('[RateLimit] update queries_log falló', {
      code: error.code,
      message: error.message,
    });
    throw new RateLimitStoreError(
      error.message ?? 'queries_log update failed',
      String(error.code ?? 'STORE_ERROR'),
    );
  }
  return Array.isArray(data) ? data.length : 0;
}

async function insertCountIgnoreDup(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userIdentifier: string,
  today: string,
  tier: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('queries_log')
    .upsert(
      {
        user_identifier: userIdentifier,
        query_date: today,
        query_count: 1,
        tier,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_identifier,query_date',
        ignoreDuplicates: true,
      },
    )
    .select('query_count');

  if (error) {
    console.error('[RateLimit] upsert queries_log falló', {
      code: error.code,
      message: error.message,
    });
    throw new RateLimitStoreError(
      error.message ?? 'queries_log upsert failed',
      String(error.code ?? 'STORE_ERROR'),
    );
  }
  return Array.isArray(data) ? data.length : 0;
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
  /** Solo planes de pago: consultas del mes y tope mensual (undefined si no hay tope mensual o no se pudo leer). */
  usedMonth?: number;
  limitMonth?: number;
}> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { used: 0, limit: freeLimit(), tier: 'free', resetAt: '' };
  }

  const supabase = createServerSupabaseClient();
  const now = new Date();
  const today = fechaDiaHn(now);

  const { data } = await supabase
    .from('queries_log')
    .select('query_count, tier')
    .eq('user_identifier', userIdentifier)
    .eq('query_date', today)
    .single();

  const tier = await resolveTodayTier(supabase, userIdentifier, data?.tier);
  const used = data?.query_count ?? 0;
  const limit = limitForTier(tier, userIdentifier);

  const limMes = limiteMensual(tier, userIdentifier);
  if (limMes !== null) {
    try {
      const usedMonth = await leerUsoDelMes(supabase, userIdentifier, now);
      return { used, limit, tier, resetAt: resetAtMedianocheHn(now), usedMonth, limitMonth: limMes };
    } catch {
      // Solo informativo: el bloqueo real ocurre en reserveRateLimit.
    }
  }
  return { used, limit, tier, resetAt: resetAtMedianocheHn(now) };
}
